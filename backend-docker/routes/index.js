/**
 * 基础路由
 */
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');

// 健康检查
router.get('/health', (req, res) => {
	res.json({ ok: true, message: 'bazi backend running' });
});

// 前端启动配置接口（返回运行时配置）
router.get('/config/bootstrap', async (req, res) => {
	let db;
	try {
		db = getDatabase();
	} catch (e) {
		// 数据库未初始化，忽略
	}

	let analyticsSnippet = '';
	if (db) {
		try {
			analyticsSnippet = await ConfigService.getAnalyticsSnippet(db);
		} catch (e) {
			console.warn('加载统计代码失败，使用空配置:', e.message);
			analyticsSnippet = '';
		}
	}

	res.json({
		success: true,
		data: {
			version: '1.0.0',
			features: {
				emailVerification: true,
				llmChat: true,
				adminPanel: true,
			},
			analyticsSnippet,
		},
	});
});

module.exports = router;

