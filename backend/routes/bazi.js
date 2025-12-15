/**
 * 八字记录路由
 * 
 * 重要说明：
 * 1. 排盘计算完全在前端完成，使用 lunar-javascript 库
 * 2. 后端只负责数据存储、验证和查询，不进行任何排盘计算
 * 3. 前端发送的 rawPayload 是已计算好的排盘结果，后端只负责存储
 * 4. 所有敏感数据都经过安全验证和清理
 */
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const { safeJsonParse } = require('../utils/helpers');
const { authMiddleware } = require('../middleware/auth');
const SecurityUtils = require('../security');
const { apiSignatureMiddleware } = require('../middleware/api-signature');

const db = getDatabase();

/**
 * 创建八字记录
 * 注意：排盘计算在前端完成，这里只存储结果
 */
router.post('/', authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const userId = req.user.id;
	const {
		name,
		gender,
		birthDatetime,
		calendarType,
		rawPayload,
	} = req.body || {};

	if (birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缺少出生时间 birthDatetime' });
	}

	const sanitizedName = name
		? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
		: null;
	const validatedGender = SecurityUtils.validateGender(gender);
	const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);

	if (!validatedDateTime) {
		return res.status(400).json({ error: '出生时间格式不正确' });
	}

	const sanitizedCalendarType = calendarType
		? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
		: null;
	
	let rawPayloadJson = null;
	if (rawPayload) {
		try {
			const payloadStr = JSON.stringify(rawPayload);
			if (payloadStr.length > 1000000) {
				return res.status(400).json({ error: '数据过大，无法保存' });
			}
			rawPayloadJson = payloadStr;
		} catch (e) {
			console.error('序列化 rawPayload 失败:', e);
			return res.status(400).json({ error: '数据格式错误，无法保存: ' + e.message });
		}
	}

	const insertSql =
		'INSERT INTO bazi_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';

	try {
		const result = await db.run(insertSql, [
			userId,
			sanitizedName,
			validatedGender,
			validatedDateTime,
			sanitizedCalendarType,
			rawPayloadJson,
		]);
		
		res.json({
			id: result.lastID,
			user_id: userId,
			name,
			gender: validatedGender,
			birthDatetime: validatedDateTime,
			calendarType,
			updated: false,
		});
	} catch (err) {
		console.error('保存八字记录失败:', err);
		if (
			err.message &&
			(err.message.includes('UNIQUE constraint') || err.message.includes('Duplicate entry'))
		) {
			return res.status(409).json({ 
				error: '记录已存在，如需更新请使用编辑功能'
			});
		}
		return res.status(500).json({ error: '保存失败，请稍后重试: ' + err.message });
	}
});

/**
 * 更新八字记录
 * 注意：排盘计算在前端完成，这里只更新存储的结果
 */
router.put('/:id', authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const userId = req.user.id;
	const recordId = SecurityUtils.validateId(req.params.id);
	
	if (!recordId) {
		return res.status(400).json({ error: '无效的记录ID' });
	}

	const {
		name,
		gender,
		birthDatetime,
		calendarType,
		rawPayload,
	} = req.body || {};

	// 检查必要字段
	if (birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缺少出生时间 birthDatetime' });
	}

	const sanitizedName = name
		? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
		: null;
	const validatedGender = SecurityUtils.validateGender(gender);
	const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);

	if (!validatedDateTime) {
		return res.status(400).json({ error: '出生时间格式不正确' });
	}

	const sanitizedCalendarType = calendarType
		? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
		: null;

	// 安全地序列化 rawPayload
	let rawPayloadJson = null;
	if (rawPayload) {
		try {
			const payloadStr = JSON.stringify(rawPayload);
			if (payloadStr.length > 1000000) {
				return res.status(400).json({ error: '数据过大，无法保存' });
			}
			rawPayloadJson = payloadStr;
		} catch (e) {
			return res.status(400).json({ error: '数据格式错误，无法保存: ' + e.message });
		}
	}

	try {
		const recordRow = await db.get(
			'SELECT id, user_id FROM bazi_records WHERE id = ? AND user_id = ?',
			[recordId, userId]
		);

		if (!recordRow) {
			return res.status(404).json({ error: '记录不存在或无权访问' });
		}

		// 构建更新字段
		const updateFields = [];
		const updateValues = [];
		
		updateFields.push('name = ?');
		updateValues.push(sanitizedName);
		
		updateFields.push('gender = ?');
		updateValues.push(validatedGender);
		
		updateFields.push('birth_datetime = ?');
		updateValues.push(validatedDateTime);
		
		updateFields.push('calendar_type = ?');
		updateValues.push(sanitizedCalendarType);
		
		updateFields.push('raw_payload = ?');
		updateValues.push(rawPayloadJson);
		
		updateValues.push(recordId, userId);

		const updateSql = `UPDATE bazi_records 
			SET ${updateFields.join(', ')}
			WHERE id = ? AND user_id = ?`;

		const result = await db.run(updateSql, updateValues);

		if (result.changes === 0) {
			return res.status(404).json({ error: '记录不存在或无权访问' });
		}

		return res.json({
			id: recordId,
			user_id: userId,
			name,
			gender: validatedGender,
			birthDatetime: validatedDateTime,
			calendarType,
			updated: true,
		});
	} catch (err) {
		console.error('更新记录失败:', err);
		return res.status(500).json({ error: '更新失败，请稍后重试: ' + err.message });
	}
});

/**
 * 获取八字记录列表（图表列表）
 */
router.get('/charts', authMiddleware, async (req, res) => {
	const userId = req.user.id;
	const searchKeyword = SecurityUtils.sanitizeSearchKeyword(req.query.keyword || '');
	const genderFilter = SecurityUtils.validateGender(req.query.gender);

	const allowedSortFields = ['created_at', 'name', 'birth_datetime'];
	const sort = SecurityUtils.validateSort(req.query.sortBy, req.query.sortOrder, allowedSortFields);
	const sortBy = sort.sortBy;
	const sortOrder = sort.sortOrder;

	let sql =
		'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM bazi_records WHERE user_id = ?';
	const params = [userId];

	if (searchKeyword) {
		sql += ' AND name LIKE ?';
		params.push('%' + searchKeyword + '%');
	}

	if (genderFilter !== null && genderFilter !== undefined) {
		sql += ' AND gender = ?';
		params.push(genderFilter);
	}
	let orderByField = sortBy;
	if (sortBy === 'name') {
		orderByField = 'name';
	} else if (sortBy === 'birth_datetime') {
		orderByField = 'birth_datetime';
	} else {
		orderByField = 'created_at';
	}

	sql += ` ORDER BY ${orderByField} ${sortOrder}`;

	try {
		const rows = await db.all(sql, params);

		const list =
			rows?.map((r) => ({
				id: r.id,
				title: r.name || '未命名排盘',
				gender: r.gender,
				birthDatetime: r.birthDatetime,
				calendarType: r.calendarType,
				rawPayload: r.rawPayload ? safeJsonParse(r.rawPayload) : null,
				createdAt: r.createdAt,
			})) || [];

		// 返回列表和统计信息
		res.json({
			list: list,
			total: list.length,
			hasMore: false,
		});
	} catch (err) {
		console.error('查询失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

/**
 * 删除八字记录
 */
router.delete('/charts/:id', authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const userId = req.user.id;

	// 使用安全工具验证 ID
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '缺少有效的 id' });
	}

	try {
		const result = await db.run('DELETE FROM bazi_records WHERE id = ? AND user_id = ?', [
			id,
			userId,
		]);

		if (result.changes === 0) {
			return res.status(404).json({ error: '记录不存在或无权限删除' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('删除失败:', err);
		return res.status(500).json({ error: '删除失败' });
	}
});

/**
 * 获取八字记录列表
 */
router.get('/', authMiddleware, async (req, res) => {
	const userId = req.user.id;

	try {
		const rows = await db.all(
			'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM bazi_records WHERE user_id = ? ORDER BY created_at DESC',
			[userId]
		);

		const list =
			rows?.map((r) => ({
				id: r.id,
				title: r.name || '未命名排盘',
				gender: r.gender,
				birthDatetime: r.birthDatetime,
				calendarType: r.calendarType,
				rawPayload: r.rawPayload ? safeJsonParse(r.rawPayload) : null,
				createdAt: r.createdAt,
			})) || [];

		res.json({ list });
	} catch (err) {
		console.error('查询失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

module.exports = router;

