const express = require('express');
const router = express.Router();

const { getDatabase } = require('../db');
const { safeJsonParse } = require('../utils/helpers');
const { authMiddleware } = require('../middleware/auth');
const { apiSignatureMiddleware } = require('../middleware/api-signature');
const { sanitizeErrorForLog } = require('../utils/error-sanitizer');
const SecurityUtils = require('../security');

const db = getDatabase();

const TYPE_TABLE_MAP = {
	bazi: 'bazi_records',
	liuyao: 'liuyao_records',
	ziwei: 'ziwei_records',
};

function normalizeChartType(inputType) {
	return Object.prototype.hasOwnProperty.call(TYPE_TABLE_MAP, inputType) ? inputType : 'bazi';
}

function serializeRawPayload(rawPayload) {
	if (!rawPayload) {
		return null;
	}

	if (typeof rawPayload === 'string') {
		if (rawPayload.length > 1000000) {
			throw new Error('RAW_PAYLOAD_TOO_LARGE');
		}
		return rawPayload;
	}

	const payloadStr = JSON.stringify(rawPayload);
	if (payloadStr.length > 1000000) {
		throw new Error('RAW_PAYLOAD_TOO_LARGE');
	}
	return payloadStr;
}

function resolveTitle(type, rowName, rawPayload) {
	let title = rowName || '未命名排盘';

	if (type === 'liuyao' && rawPayload) {
		const payloadTitle = rawPayload.options?.title || rawPayload.profile?.title;
		if (payloadTitle) {
			title = payloadTitle;
		}
	}

	if (type === 'ziwei' && rawPayload) {
		const payloadTitle = rawPayload.user?.realname;
		if (payloadTitle) {
			title = payloadTitle;
		}
	}

	return title;
}

router.post('/', authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const userId = req.user.id;
	const { name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缺少出生时间 birthDatetime' });
	}

	const sanitizedName = name
		? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
		: null;
	const validatedGender = SecurityUtils.validateGender(gender);
	const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
	const sanitizedCalendarType = calendarType
		? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
		: null;

	if (!validatedDateTime) {
		return res.status(400).json({ error: '出生时间格式不正确' });
	}

	let rawPayloadJson = null;
	try {
		rawPayloadJson = serializeRawPayload(rawPayload);
	} catch (error) {
		if (error.message === 'RAW_PAYLOAD_TOO_LARGE') {
			return res.status(400).json({ error: '数据过大，无法保存' });
		}
		return res.status(400).json({ error: '数据格式错误，无法保存' });
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
			calendarType: sanitizedCalendarType,
			updated: false,
		});
	} catch (err) {
		console.error('保存八字记录失败:', sanitizeErrorForLog(err));
		if (
			err.message &&
			(err.message.includes('UNIQUE constraint') || err.message.includes('Duplicate entry'))
		) {
			return res.status(409).json({ error: '记录已存在，如需更新请使用编辑功能' });
		}
		return res.status(500).json({ error: '保存失败，请稍后重试' });
	}
});

router.put('/:id', authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const userId = req.user.id;
	const recordId = SecurityUtils.validateId(req.params.id);

	if (!recordId) {
		return res.status(400).json({ error: '无效的记录ID' });
	}

	const { name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缺少出生时间 birthDatetime' });
	}

	const sanitizedName = name
		? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
		: null;
	const validatedGender = SecurityUtils.validateGender(gender);
	const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
	const sanitizedCalendarType = calendarType
		? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
		: null;

	if (!validatedDateTime) {
		return res.status(400).json({ error: '出生时间格式不正确' });
	}

	let rawPayloadJson = null;
	try {
		rawPayloadJson = serializeRawPayload(rawPayload);
	} catch (error) {
		if (error.message === 'RAW_PAYLOAD_TOO_LARGE') {
			return res.status(400).json({ error: '数据过大，无法保存' });
		}
		return res.status(400).json({ error: '数据格式错误，无法保存' });
	}

	try {
		const recordRow = await db.get(
			'SELECT id, user_id FROM bazi_records WHERE id = ? AND user_id = ?',
			[recordId, userId],
		);
		if (!recordRow) {
			return res.status(404).json({ error: '记录不存在或无权访问' });
		}

		const result = await db.run(
			'UPDATE bazi_records SET name = ?, gender = ?, birth_datetime = ?, calendar_type = ?, raw_payload = ? WHERE id = ? AND user_id = ?',
			[
				sanitizedName,
				validatedGender,
				validatedDateTime,
				sanitizedCalendarType,
				rawPayloadJson,
				recordId,
				userId,
			],
		);

		if (result.changes === 0) {
			return res.status(404).json({ error: '记录不存在或无权访问' });
		}

		return res.json({
			id: recordId,
			user_id: userId,
			name,
			gender: validatedGender,
			birthDatetime: validatedDateTime,
			calendarType: sanitizedCalendarType,
			updated: true,
		});
	} catch (err) {
		console.error('更新八字记录失败:', sanitizeErrorForLog(err));
		return res.status(500).json({ error: '更新失败，请稍后重试' });
	}
});

router.get('/charts', authMiddleware, async (req, res) => {
	const userId = req.user.id;
	const searchKeyword = SecurityUtils.sanitizeSearchKeyword(req.query.keyword || '');
	const genderFilter = SecurityUtils.validateGender(req.query.gender);
	const type = normalizeChartType(String(req.query.type || 'bazi'));
	const tableName = TYPE_TABLE_MAP[type];
	const allowedSortFields = ['created_at', 'name', 'birth_datetime'];
	const sort = SecurityUtils.validateSort(req.query.sortBy, req.query.sortOrder, allowedSortFields);

	let sql =
		`SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM ${tableName} WHERE user_id = ?`;
	const params = [userId];

	if (searchKeyword) {
		sql += ' AND name LIKE ?';
		params.push('%' + searchKeyword + '%');
	}

	if (genderFilter !== null && genderFilter !== undefined) {
		sql += ' AND gender = ?';
		params.push(genderFilter);
	}

	const orderByField =
		sort.sortBy === 'name'
			? 'name'
			: sort.sortBy === 'birth_datetime'
				? 'birth_datetime'
				: 'created_at';
	sql += ` ORDER BY ${orderByField} ${sort.sortOrder}`;

	try {
		const rows = await db.all(sql, params);
		const list =
			rows?.map((r) => {
				const rawPayload = r.rawPayload ? safeJsonParse(r.rawPayload) : null;
				return {
					id: r.id,
					title: resolveTitle(type, r.name, rawPayload),
					gender: r.gender,
					birthDatetime: r.birthDatetime,
					calendarType: r.calendarType,
					rawPayload,
					createdAt: r.createdAt,
					type,
				};
			}) || [];

		res.json({
			list,
			total: list.length,
			hasMore: false,
		});
	} catch (err) {
		console.error('查询排盘记录失败:', sanitizeErrorForLog(err));
		return res.status(500).json({ error: '查询失败' });
	}
});

router.delete('/charts/:id', authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const userId = req.user.id;
	const type = normalizeChartType(String(req.query.type || 'bazi'));
	const tableName = TYPE_TABLE_MAP[type];
	const id = SecurityUtils.validateId(req.params.id);

	if (!id) {
		return res.status(400).json({ error: '缺少或无效的记录 id' });
	}

	try {
		const result = await db.run(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`, [id, userId]);

		if (result.changes === 0) {
			return res.status(404).json({ error: '记录不存在或无权访问' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('删除排盘记录失败:', sanitizeErrorForLog(err));
		return res.status(500).json({ error: '删除失败' });
	}
});

router.get('/', authMiddleware, async (req, res) => {
	const userId = req.user.id;

	try {
		const rows = await db.all(
			'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM bazi_records WHERE user_id = ? ORDER BY created_at DESC',
			[userId],
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
		console.error('查询八字记录失败:', sanitizeErrorForLog(err));
		return res.status(500).json({ error: '查询失败' });
	}
});

module.exports = router;
