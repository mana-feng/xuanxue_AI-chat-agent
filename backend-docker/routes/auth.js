/**
 * Authentication routes
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { getDatabase } = require('../db');
const { generateRefreshToken, hashRefreshToken } = require('../utils/token');
const { formatMySQLDateTime } = require('../utils/time');
const config = require('../config');
const SecurityUtils = require('../security');
const { authLimiter, refreshLimiter } = require('../config/rateLimit');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db = getDatabase();

const JWT_SECRET = config.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = config.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_DAYS = config.REFRESH_TOKEN_EXPIRES_DAYS;
const cookieSecure = process.env.COOKIE_SECURE === 'true';

function isH5Request(req) {
	return Boolean(req.headers.origin || req.headers['user-agent']?.includes('Mozilla'));
}

function setRefreshCookie(res, refreshToken) {
	res.cookie('refresh_token', refreshToken, {
		httpOnly: true,
		secure: cookieSecure,
		sameSite: 'lax',
		maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
	});
}

function clearRefreshCookie(res) {
	res.clearCookie('refresh_token', {
		httpOnly: true,
		secure: cookieSecure,
		sameSite: 'lax',
	});
}

function signAccessToken(userId, signatureKey) {
	return jwt.sign({ uid: userId, sk: signatureKey }, JWT_SECRET, {
		algorithm: 'HS256',
		expiresIn: ACCESS_TOKEN_EXPIRES_IN,
	});
}

async function persistRefreshToken(userId, refreshToken, deviceId) {
	const refreshTokenHash = hashRefreshToken(refreshToken);
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
	await db.run(
		'INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
		[userId, refreshTokenHash, deviceId, formatMySQLDateTime(expiresAt)]
	);
}

/**
 * Register
 */
router.post('/register', authLimiter, async (req, res) => {
	const { email, username, password, device_id } = req.body || {};

	if (!email || !password || !username) {
		return res.status(400).json({ error: 'Missing email, username, or password' });
	}

	const deviceIdRaw = device_id || `${req.ip || 'unknown'}-${req.headers['user-agent'] || 'ua'}`;
	const sanitizedDeviceId = SecurityUtils.sanitizeString(String(deviceIdRaw), { maxLength: 255 });

	const trimmedEmail = SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase();
	if (!SecurityUtils.isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: 'Invalid email format' });
	}

	const usernameValidation = SecurityUtils.validateUsername(username);
	if (!usernameValidation.valid) {
		return res.status(400).json({ error: usernameValidation.error });
	}
	const trimmedUsername = usernameValidation.sanitized;

	const passwordValidation = SecurityUtils.validatePassword(password);
	if (!passwordValidation.valid) {
		return res.status(400).json({ error: passwordValidation.error });
	}

	try {
		const existed = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [
			trimmedEmail,
			trimmedUsername,
		]);
		if (existed) {
			return res.status(409).json({ error: 'Email or username already in use' });
		}

		const passwordHash = await bcrypt.hash(String(password), 10);
		const result = await db.run(
			'INSERT INTO users (email, username, password_hash, created_at) VALUES (?, ?, ?, NOW())',
			[trimmedEmail, trimmedUsername, passwordHash]
		);
		const userId = result.lastID;

		const signatureKey = crypto.randomBytes(32).toString('hex');
		const accessToken = signAccessToken(userId, signatureKey);
		const refreshToken = generateRefreshToken();

		await persistRefreshToken(userId, refreshToken, sanitizedDeviceId);

		const h5 = isH5Request(req);
		if (h5) {
			setRefreshCookie(res, refreshToken);
		}

		return res.json({
			access_token: accessToken,
			refresh_token: h5 ? undefined : refreshToken,
			user: {
				id: userId,
				email: trimmedEmail,
				username: trimmedUsername,
				role: 'user',
			},
		});
	} catch (err) {
		console.error('Register failed:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

/**
 * Login
 */
router.post('/login', authLimiter, async (req, res) => {
	const { identifier, email, password, device_id } = req.body || {};
	const rawIdentifier = identifier || email;

	if (!rawIdentifier || !password) {
		return res.status(400).json({ error: 'Missing account or password' });
	}
	if (!device_id) {
		return res.status(400).json({ error: 'Missing device id' });
	}

	const trimmedIdentifier = SecurityUtils.sanitizeString(String(rawIdentifier), {
		maxLength: 255,
	}).trim();
	const emailCandidate = trimmedIdentifier.toLowerCase();
	const sanitizedDeviceId = SecurityUtils.sanitizeString(String(device_id), { maxLength: 255 });

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
			return res.status(401).json({ error: 'Invalid account or password' });
		}

		const matched = await bcrypt.compare(String(password), row.password_hash);
		if (!matched) {
			return res.status(401).json({ error: 'Invalid account or password' });
		}

		const signatureKey = crypto.randomBytes(32).toString('hex');
		const accessToken = signAccessToken(row.id, signatureKey);
		const refreshToken = generateRefreshToken();
		await persistRefreshToken(row.id, refreshToken, sanitizedDeviceId);

		const h5 = isH5Request(req);
		if (h5) {
			setRefreshCookie(res, refreshToken);
		}

		return res.json({
			access_token: accessToken,
			refresh_token: h5 ? undefined : refreshToken,
			user: {
				id: row.id,
				email: row.email,
				username: row.username || null,
				role: row.role || 'user',
			},
		});
	} catch (err) {
		console.error('Login failed:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

/**
 * Get current user
 */
router.get('/me', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const row = await db.get('SELECT id, email, username, role FROM users WHERE id = ?', [userId]);
		if (!row) {
			return res.status(401).json({ error: 'User not found or deleted' });
		}
		return res.json({
			id: row.id,
			email: row.email,
			username: row.username || null,
			role: row.role || 'user',
		});
	} catch (err) {
		console.error('Load current user failed:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

/**
 * Legacy login endpoint compatibility
 */
router.post('/login-old', async (req, res) => {
	req.url = '/api/auth/login';
	router.handle(req, res);
});

/**
 * Refresh token
 */
router.post('/refresh', refreshLimiter, async (req, res) => {
	const authHeader = req.headers.authorization || '';
	const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

	const refresh_token =
		req.cookies?.refresh_token ||
		req.body?.refresh_token ||
		req.headers['x-refresh-token'] ||
		bearerToken;
	const device_id = req.headers['x-device-id'] || req.body?.device_id || req.cookies?.device_id;

	if (!refresh_token) {
		return res.status(400).json({ error: 'Missing refresh token' });
	}

	const sanitizedDeviceId = device_id
		? SecurityUtils.sanitizeString(String(device_id), { maxLength: 255 })
		: null;
	const refreshTokenHash = hashRefreshToken(refresh_token);

	try {
		let tokenRow;
		if (sanitizedDeviceId) {
			tokenRow = await db.get(
				'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ? AND device_id = ?',
				[refreshTokenHash, sanitizedDeviceId]
			);
		} else {
			tokenRow = await db.get(
				'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ? ORDER BY created_at DESC',
				[refreshTokenHash]
			);
		}

		if (!tokenRow) {
			return res.status(401).json({ error: 'Invalid refresh token' });
		}
		if (tokenRow.revoked_at) {
			return res.status(401).json({ error: 'Refresh token revoked' });
		}
		if (new Date(tokenRow.expires_at) < new Date()) {
			return res.status(401).json({ error: 'Refresh token expired' });
		}

		const userRow = await db.get('SELECT id, role FROM users WHERE id = ?', [tokenRow.user_id]);
		if (!userRow) {
			return res.status(401).json({ error: 'User not found' });
		}

		await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [tokenRow.id]);

		const signatureKey = crypto.randomBytes(32).toString('hex');
		const accessToken = signAccessToken(userRow.id, signatureKey);
		const newRefreshToken = generateRefreshToken();
		await persistRefreshToken(userRow.id, newRefreshToken, sanitizedDeviceId);

		if (isH5Request(req)) {
			setRefreshCookie(res, newRefreshToken);
		}

		return res.json({
			access_token: accessToken,
			refresh_token: isH5Request(req) ? undefined : newRefreshToken,
		});
	} catch (err) {
		console.error('Refresh token failed:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

/**
 * Logout
 */
router.post('/logout', async (req, res) => {
	const authHeader = req.headers.authorization || '';
	const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	const refresh_token =
		req.cookies?.refresh_token ||
		req.body?.refresh_token ||
		req.headers['x-refresh-token'] ||
		bearerToken;
	const deviceIdFromHeader = req.headers['x-device-id'];

	if (!refresh_token) {
		clearRefreshCookie(res);
		return res.json({ success: true });
	}

	try {
		const refreshTokenHash = hashRefreshToken(refresh_token);
		const sanitizedDeviceId = deviceIdFromHeader
			? SecurityUtils.sanitizeString(String(deviceIdFromHeader), { maxLength: 255 })
			: null;

		if (sanitizedDeviceId) {
			await db.run(
				'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND device_id = ?',
				[refreshTokenHash, sanitizedDeviceId]
			);
		} else {
			await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [
				refreshTokenHash,
			]);
		}

		clearRefreshCookie(res);
		return res.json({ success: true });
	} catch (err) {
		console.error('Logout failed:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

module.exports = router;
