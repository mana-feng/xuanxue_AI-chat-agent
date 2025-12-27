/**
 * 公告公共接口
 */
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const db = getDatabase();

// 获取有效公告（未过期或未设置过期时间），按更新时间倒序
router.get('/', async (req, res) => {
	try {
		const onlyMeta = String(req.query.onlyMeta || '').toLowerCase() === 'true';
		const now = new Date();
		let rows;
		if (onlyMeta) {
			rows = await db.all(
				`SELECT id, updated_at AS updatedAt
				 FROM announcements
				 WHERE expires_at IS NULL OR expires_at > ?
				 ORDER BY updated_at DESC`,
				[now]
			);
			return res.json({ success: true, data: { meta: rows || [] } });
		} else {
			rows = await db.all(
				`SELECT id, title, content, expires_at AS expiresAt, updated_at AS updatedAt, created_at AS createdAt
				 FROM announcements
				 WHERE expires_at IS NULL OR expires_at > ?
				 ORDER BY updated_at DESC`,
				[now]
			);
			res.json({
				success: true,
				data: {
					list: rows || [],
					updatedAt: rows?.[0]?.updatedAt || null,
				}
			});
		}
	} catch (err) {
		console.error('获取公告失败:', err);
		return res.status(500).json({ error: '获取公告失败' });
	}
});

module.exports = router;

