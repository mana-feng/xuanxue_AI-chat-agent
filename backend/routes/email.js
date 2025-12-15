/**
 * 邮箱路由
 */
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const { formatMySQLDateTime } = require('../utils/time');
const { generateVerificationCode } = require('../utils/helpers');
const { sendVerificationCode, getEmailConfig } = require('../services/email');
const SecurityUtils = require('../security');
const { strictLimiter } = require('../config/rateLimit');

const db = getDatabase();

/**
 * 发送邮箱验证码
 */
router.post('/send-code', strictLimiter, async (req, res) => {
	const { email, type = 'register' } = req.body || {};

	if (!email) {
		return res.status(400).json({ error: '缺少邮箱地址' });
	}

	// 使用安全工具清理和验证邮箱
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), {
		maxLength: 255,
	}).toLowerCase();

	if (!SecurityUtils.isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: '邮箱格式不正确' });
	}

	// 验证类型参数
	const validType = SecurityUtils.sanitizeString(String(type), { maxLength: 20 });
	if (!['register', 'login', 'reset'].includes(validType)) {
		return res.status(400).json({ error: '无效的验证码类型' });
	}

	const emailConfig = getEmailConfig();
	if (!emailConfig.configured) {
		return res.status(503).json({ error: '邮件服务未配置，请联系管理员' });
	}

	try {
		// 检查是否在1分钟内已发送过验证码（防止频繁发送）
		const row = await db.get(
			`SELECT created_at FROM email_verification_codes WHERE email = ? AND type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE) ORDER BY created_at DESC LIMIT 1`,
			[trimmedEmail, validType]
		);

		if (row) {
			return res.status(429).json({ error: '发送过于频繁，请1分钟后再试' });
		}

		// 生成验证码
		const code = generateVerificationCode();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

		// 保存验证码到数据库
		await db.run(
			'INSERT INTO email_verification_codes (email, code, type, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
			[trimmedEmail, code, validType, formatMySQLDateTime(expiresAt)]
		);

		// 发送邮件
		await sendVerificationCode(trimmedEmail, code);

		res.json({ success: true, message: '验证码已发送到您的邮箱' });
	} catch (err) {
		console.error('发送验证码失败:', err);
		if (err.message === '邮件服务未配置') {
			return res.status(503).json({ error: '邮件服务未配置，请联系管理员' });
		}
		return res.status(500).json({ error: '服务器错误' });
	}
});

/**
 * 验证邮箱验证码
 */
router.post('/verify-code', async (req, res) => {
	const { email, code, type = 'register' } = req.body || {};

	if (!email || !code) {
		return res.status(400).json({ error: '缺少邮箱或验证码' });
	}

	// 使用安全工具清理和验证输入
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), {
		maxLength: 255,
	}).toLowerCase();
	const trimmedCode = SecurityUtils.sanitizeString(String(code), { maxLength: 10 });

	// 验证验证码格式
	if (!SecurityUtils.validateVerificationCode(trimmedCode)) {
		return res.status(400).json({ error: '验证码格式不正确' });
	}

	if (!SecurityUtils.isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: '邮箱格式不正确' });
	}

	// 验证类型参数
	const validType = SecurityUtils.sanitizeString(String(type), { maxLength: 20 });
	if (!['register', 'login', 'reset'].includes(validType)) {
		return res.status(400).json({ error: '无效的验证码类型' });
	}

	try {
		// 查询验证码
		const row = await db.get(
			'SELECT id, expires_at, used FROM email_verification_codes WHERE email = ? AND code = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
			[trimmedEmail, trimmedCode, validType]
		);

		if (!row) {
			return res.status(400).json({ error: '验证码错误' });
		}

		// 检查是否已使用
		if (row.used === 1 || row.used === true) {
			return res.status(400).json({ error: '验证码已使用' });
		}

		// 检查是否过期
		const expiresAt = new Date(row.expires_at);
		if (expiresAt < new Date()) {
			return res.status(400).json({ error: '验证码已过期' });
		}

		// 标记验证码为已使用
		try {
			await db.run('UPDATE email_verification_codes SET used = 1 WHERE id = ?', [row.id]);
		} catch (updateErr) {
			console.error('更新验证码状态失败:', updateErr);
			// 即使更新失败，也返回成功（验证码已验证）
		}

		res.json({ success: true, message: '验证码验证成功' });
	} catch (err) {
		console.error('验证验证码失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

module.exports = router;

