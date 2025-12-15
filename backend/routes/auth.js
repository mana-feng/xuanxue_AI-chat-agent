/**
 * 认证路由
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db');
const { generateRefreshToken, hashRefreshToken } = require('../utils/token');
const { formatMySQLDateTime } = require('../utils/time');
const config = require('../config');
const SecurityUtils = require('../security');
const { authLimiter, refreshLimiter } = require('../config/rateLimit');
const { apiSignatureMiddleware } = require('../middleware/api-signature');

const db = getDatabase();
const JWT_SECRET = config.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = config.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_DAYS = config.REFRESH_TOKEN_EXPIRES_DAYS;

/**
 * 注册接口
 * 注意：公开接口，但为了安全也要求签名验证
 */
router.post('/register', authLimiter, apiSignatureMiddleware(), async (req, res) => {
	const { email, username, password, device_id } = req.body || {};

	if (!email || !password || !username) {
		return res.status(400).json({ error: '缺少 email、username 或 password' });
	}

	if (!device_id) {
		return res.status(400).json({ error: '缺少设备ID' });
	}

	// 使用安全工具验证和清理输入
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), {
		maxLength: 255,
	}).toLowerCase();

	if (!SecurityUtils.isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: '邮箱格式不正确' });
	}

	// 验证用户名
	const usernameValidation = SecurityUtils.validateUsername(username);
	if (!usernameValidation.valid) {
		return res.status(400).json({ error: usernameValidation.error });
	}
	const trimmedUsername = usernameValidation.sanitized;

	// 验证密码
	const passwordValidation = SecurityUtils.validatePassword(password);
	if (!passwordValidation.valid) {
		return res.status(400).json({ error: passwordValidation.error });
	}

	const sanitizedDeviceId = SecurityUtils.sanitizeString(String(device_id), { maxLength: 255 });

	try {
		const row = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [
			trimmedEmail,
			trimmedUsername,
		]);

		if (row) {
			return res.status(409).json({ error: '该邮箱或用户名已被使用' });
		}

		const passwordHash = bcrypt.hashSync(String(password), 10);

		const result = await db.run(
			'INSERT INTO users (email, username, password_hash, created_at) VALUES (?, ?, ?, NOW())',
			[trimmedEmail, trimmedUsername, passwordHash]
		);

		const userId = result.lastID;

		// 生成 access token（短期，30分钟）
		const access_token = jwt.sign({ uid: userId }, JWT_SECRET, {
			expiresIn: ACCESS_TOKEN_EXPIRES_IN,
		});

		// 生成 refresh token（长期，15天）
		const refresh_token = generateRefreshToken();
		const refresh_token_hash = hashRefreshToken(refresh_token);
		const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

		// 保存 refresh token 到数据库
		await db.run(
			'INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
			[userId, refresh_token_hash, sanitizedDeviceId, formatMySQLDateTime(expires_at)]
		);

		// H5 场景：设置 refresh token 为 HttpOnly Cookie
		const isH5 = req.headers.origin || req.headers['user-agent']?.includes('Mozilla');
		if (isH5) {
			res.cookie('refresh_token', refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
			});
		}

		res.json({
			access_token,
			refresh_token: isH5 ? undefined : refresh_token,
			user: {
				id: userId,
				email: trimmedEmail,
				username: trimmedUsername,
				role: 'user',
			},
		});
	} catch (err) {
		console.error('注册失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

/**
 * 登录接口
 */
router.post('/login', authLimiter, async (req, res) => {
	const { identifier, email, password, device_id } = req.body || {};

	const rawIdentifier = identifier || email;

	if (!rawIdentifier || !password) {
		return res.status(400).json({ error: '缺少登录账号或密码' });
	}

	if (!device_id) {
		return res.status(400).json({ error: '缺少设备ID' });
	}

	// 使用安全工具清理输入
	const trimmedIdentifier = SecurityUtils.sanitizeString(String(rawIdentifier), {
		maxLength: 255,
	}).trim();
	const emailCandidate = trimmedIdentifier.toLowerCase();
	const sanitizedDeviceId = SecurityUtils.sanitizeString(String(device_id), { maxLength: 255 });

	// 验证密码
	const passwordValidation = SecurityUtils.validatePassword(password);
	if (!passwordValidation.valid) {
		return res.status(400).json({ error: passwordValidation.error });
	}

	try {
		const row = await db.get(
			'SELECT id, email, username, password_hash, role FROM users WHERE email = ? OR username = ?',
			[emailCandidate, trimmedIdentifier]
		);

		if (!row) {
			return res.status(401).json({ error: '账号或密码错误' });
		}

		const match = bcrypt.compareSync(String(password), row.password_hash);
		if (!match) {
			return res.status(401).json({ error: '账号或密码错误' });
		}

		// 生成 access token（短期，30分钟）
		const access_token = jwt.sign({ uid: row.id }, JWT_SECRET, {
			expiresIn: ACCESS_TOKEN_EXPIRES_IN,
		});

		// 生成 refresh token（长期，15天）
		const refresh_token = generateRefreshToken();
		const refresh_token_hash = hashRefreshToken(refresh_token);
		const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

		// 保存 refresh token 到数据库
		await db.run(
			'INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
			[row.id, refresh_token_hash, sanitizedDeviceId, formatMySQLDateTime(expires_at)]
		);

		// H5 场景：设置 refresh token 为 HttpOnly Cookie
		const isH5 = req.headers.origin || req.headers['user-agent']?.includes('Mozilla');
		if (isH5) {
			res.cookie('refresh_token', refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
			});
		}

		res.json({
			access_token,
			refresh_token: isH5 ? undefined : refresh_token,
			user: {
				id: row.id,
				email: row.email,
				username: row.username || null,
				role: row.role || 'user',
			},
		});
	} catch (err) {
		console.error('登录失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

/**
 * 兼容旧接口（重定向到新接口）
 */
router.post('/login-old', async (req, res) => {
	req.url = '/api/auth/login';
	router.handle(req, res);
});

/**
 * Refresh Token 接口
 */
/**
 * 刷新Token接口
 * 注意：敏感操作，强制签名验证
 */
router.post('/refresh', refreshLimiter, apiSignatureMiddleware(), async (req, res) => {
	// H5 场景：从 cookie 读取 refresh_token；App/小程序：从 body 读取
	const refresh_token = req.cookies?.refresh_token || req.body?.refresh_token;
	const device_id = req.headers['x-device-id'] || req.body?.device_id;

	if (!refresh_token) {
		return res.status(400).json({ error: '缺少 refresh_token' });
	}

	if (!device_id) {
		return res.status(400).json({ error: '缺少设备ID' });
	}

	const refresh_token_hash = hashRefreshToken(refresh_token);
	const sanitizedDeviceId = SecurityUtils.sanitizeString(String(device_id), { maxLength: 255 });

	try {
		// 查找 refresh token
		const tokenRow = await db.get(
			'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ? AND device_id = ?',
			[refresh_token_hash, sanitizedDeviceId]
		);

		if (!tokenRow) {
			return res.status(401).json({ error: '无效的 refresh token' });
		}

		// 检查是否已撤销
		if (tokenRow.revoked_at) {
			return res.status(401).json({ error: 'refresh token 已撤销' });
		}

		// 检查是否过期
		const expiresAt = new Date(tokenRow.expires_at);
		if (expiresAt < new Date()) {
			return res.status(401).json({ error: 'refresh token 已过期' });
		}

		// 获取用户信息
		const userRow = await db.get('SELECT id, role FROM users WHERE id = ?', [tokenRow.user_id]);
		if (!userRow) {
			return res.status(401).json({ error: '用户不存在' });
		}

		// 撤销旧的 refresh token
		await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [tokenRow.id]);

		// 生成新的 access token
		const access_token = jwt.sign({ uid: userRow.id }, JWT_SECRET, {
			expiresIn: ACCESS_TOKEN_EXPIRES_IN,
		});

		// 生成新的 refresh token（轮换机制）
		const new_refresh_token = generateRefreshToken();
		const new_refresh_token_hash = hashRefreshToken(new_refresh_token);
		const new_expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

		// 保存新的 refresh token
		await db.run(
			'INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
			[userRow.id, new_refresh_token_hash, sanitizedDeviceId, formatMySQLDateTime(new_expires_at)]
		);

		// H5 场景：设置新的 refresh token 为 HttpOnly Cookie
		const isH5 = req.headers.origin || req.headers['user-agent']?.includes('Mozilla');
		if (isH5) {
			res.cookie('refresh_token', new_refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
			});
		}

		res.json({
			access_token,
			refresh_token: isH5 ? undefined : new_refresh_token,
		});
	} catch (err) {
		console.error('刷新 token 失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

/**
 * 登出接口
 */
router.post('/logout', async (req, res) => {
	// H5 场景：从 cookie 读取 refresh_token；App/小程序：从 body 读取
	const refresh_token = req.cookies?.refresh_token || req.body?.refresh_token;
	const deviceIdFromHeader = req.headers['x-device-id'];

	if (!refresh_token && !deviceIdFromHeader) {
		// 如果没有提供 refresh_token，返回成功（前端已清除）
		// H5 场景：清除 cookie
		res.clearCookie('refresh_token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
		});
		return res.json({ success: true });
	}

	try {
		if (refresh_token) {
			const refresh_token_hash = hashRefreshToken(refresh_token);
			const sanitizedDeviceId = deviceIdFromHeader
				? SecurityUtils.sanitizeString(String(deviceIdFromHeader), { maxLength: 255 })
				: null;

			// 撤销指定的 refresh token
			if (sanitizedDeviceId) {
				await db.run(
					'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND device_id = ?',
					[refresh_token_hash, sanitizedDeviceId]
				);
			} else {
				await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [
					refresh_token_hash,
				]);
			}
		} else if (deviceIdFromHeader) {
			// 如果没有 refresh_token，但提供了 device_id，撤销该设备的所有 token
			const sanitizedDeviceId = SecurityUtils.sanitizeString(String(deviceIdFromHeader), {
				maxLength: 255,
			});
			await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE device_id = ?', [
				sanitizedDeviceId,
			]);
		}

		// H5 场景：清除 cookie
		res.clearCookie('refresh_token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
		});

		res.json({ success: true });
	} catch (err) {
		console.error('登出失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

module.exports = router;

