/**
 * 定时任务调度服务
 */
const cron = require('node-cron');
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');

let resetTask = null;

/**
 * 初始化定时任务
 */
async function initScheduler() {
    console.log('初始化定时任务调度器...');
    await reloadScheduler();
    console.log('定时任务调度器初始化完成');
}

/**
 * 重新加载定时任务配置
 */
async function reloadScheduler() {
    try {
        if (resetTask) {
            console.log('停止现有定时任务...');
            resetTask.stop();
            resetTask = null;
        }

        const db = getDatabase();
        if (!db) {
            console.warn('数据库未连接，无法加载定时任务配置');
            return;
        }

        const config = await ConfigService.getQuotaResetConfig(db);
        
        if (!config.enabled) {
            console.log('每日额度重置任务已禁用');
            return;
        }

        // 解析时间 HH:mm
        const [hourStr, minuteStr] = (config.time || '00:00').split(':');
        const hour = parseInt(hourStr) || 0;
        const minute = parseInt(minuteStr) || 0;
        
        // 构建 cron 表达式
        const cronExpression = `${minute} ${hour} * * *`;
        const targetCount = Number.isFinite(config.target) ? config.target : 2;
        const timezone = config.timezone || 'Asia/Shanghai';

        console.log(`配置每日额度重置任务: ${cronExpression} (时区: ${timezone}, 重置为: ${targetCount})`);

        resetTask = cron.schedule(cronExpression, async () => {
            console.log('开始执行每日额度重置任务...');
            try {
                // 重新获取 DB 实例以防断开
                const currentDb = getDatabase();
                if (!currentDb) return;

                const result = await currentDb.run(
                    `UPDATE user_llm_quotas
                     SET remaining_daily_count = ?, updated_at = NOW()
                     WHERE remaining_daily_count IS NULL OR remaining_daily_count < ?`,
                    [targetCount, targetCount]
                );
                console.log(`每日额度重置完成。受影响行数: ${result.changes || 0}`);
            } catch (error) {
                console.error('每日额度重置任务执行失败:', error);
            }
        }, {
            timezone: timezone
        });
    } catch (err) {
        console.error('重新加载定时任务失败:', err);
    }
}

module.exports = {
    initScheduler,
    reloadScheduler
};
