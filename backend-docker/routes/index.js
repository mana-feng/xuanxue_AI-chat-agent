/**
 * 基础路由
 */
const express = require('express');
const router = express.Router();

// 健康检查
router.get('/health', (req, res) => {
	res.json({ ok: true, message: 'bazi backend running' });
});

// 前端启动配置接口（返回运行时配置）
router.get('/config/bootstrap', async (req, res) => {
	res.json({
		success: true,
		data: {
			version: '1.0.0',
			features: {
				emailVerification: true,
				llmChat: true,
				adminPanel: true,
			},
		},
	});
});

module.exports = router;

