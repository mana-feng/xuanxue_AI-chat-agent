/**
 * 认证中间件
 */
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db');
const config = require('../config');

/**
 * 用户认证中间件
 */
function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: '未登录' });
	}

	try {
		const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
		req.user = { id: decoded.uid, signatureKey: decoded.sk || null };
		next();
	} catch (e) {
		if (e.name === 'TokenExpiredError') {
			return res.status(401).json({ error: '登录已失效，请重新登录' });
		}
		return res.status(401).json({ error: '登录已失效，请重新登录' });
	}
}

/**
 * 管理员鉴权中间件
 */
async function adminMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: '未登录' });
	}

	try {
		const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
		const userId = decoded.uid;

		const db = getDatabase();
		// 查询用户角色
		const row = await db.get('SELECT role FROM users WHERE id = ?', [userId]);

		if (!row || row.role !== 'admin') {
			return res.status(403).json({ error: '需要管理员权限' });
		}

		req.user = { id: userId, signatureKey: decoded.sk || null };
		next();
	} catch (e) {
		if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
			return res.status(401).json({ error: '登录已失效，请重新登录' });
		}
		console.error('管理员鉴权失败:', e);
		return res.status(500).json({ error: '服务器错误' });
	}
}

module.exports = {
	authMiddleware,
	adminMiddleware,
};

