/**
 * 额度管理服务
 */
const { getDatabase } = require('../db');

/**
 * 记录LLM使用情况
 * @param {number} userId - 用户ID
 * @param {number} tokensUsed - 使用的token数量
 */
async function recordLLMUsage(userId, tokensUsed = 0) {
	try {
		const db = getDatabase();
		// 记录使用情况
		await db.run(
			'INSERT INTO llm_usage_records (user_id, tokens_used, created_at) VALUES (?, ?, NOW())',
			[userId, tokensUsed]
		);

		// 更新用户额度（减少剩余次数和token）
		await db.run(
			`UPDATE user_llm_quotas 
			SET remaining_count = GREATEST(0, remaining_count - 1),
				remaining_token = GREATEST(0, remaining_token - ?),
				updated_at = NOW()
			WHERE user_id = ?`,
			[tokensUsed, userId]
		);
	} catch (err) {
		console.error('记录LLM使用情况失败:', err);
		// 不抛出错误，避免影响主流程
	}
}

/**
 * 检查用户LLM额度
 * @param {number} userId - 用户ID
 * @returns {Promise<{allowed: boolean, reason?: string, usage?: object}>}
 */
async function checkLLMQuota(userId) {
	try {
		const db = getDatabase();
		// 获取或创建用户额度记录
		let quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [userId]);
		
		if (!quota) {
			// 如果不存在，创建默认额度记录（per_minute_limit 固定为1）
			await db.run(
				`INSERT INTO user_llm_quotas 
				(user_id, per_minute_limit, remaining_count, remaining_token, updated_at) 
				VALUES (?, 1, 0, 0, NOW())`,
				[userId]
			);
			quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [userId]);
		}

		// 确保字段有值
		if (quota.per_minute_limit === null || quota.per_minute_limit === undefined) {
			quota.per_minute_limit = 1;
		}
		if (quota.remaining_count === null || quota.remaining_count === undefined) {
			quota.remaining_count = 0;
		}
		if (quota.remaining_token === null || quota.remaining_token === undefined) {
			quota.remaining_token = 0;
		}

		// 检查剩余次数（如果没有剩余次数，不允许使用）
		if (quota.remaining_count <= 0) {
			return {
				allowed: false,
				reason: '剩余次数已用完',
				usage: {
					remainingCount: quota.remaining_count,
					remainingToken: quota.remaining_token
				}
			};
		}

		// 额度充足，允许使用
		return {
			allowed: true,
			usage: {
				remainingCount: quota.remaining_count,
				remainingToken: quota.remaining_token
			}
		};
	} catch (err) {
		console.error('检查LLM额度失败:', err);
		// 出错时默认允许，避免影响正常使用
		return {
			allowed: true,
			usage: {}
		};
	}
}

module.exports = {
	recordLLMUsage,
	checkLLMQuota,
};

