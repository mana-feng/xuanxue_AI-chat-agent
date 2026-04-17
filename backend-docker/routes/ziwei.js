/**
 * 紫微记录路由
 *
 * 重要说明：
 * 1. 排盘计算完全在前端完成
 * 2. 后端只负责数据存储、验证和查询
 * 3. 前端发送的 rawPayload 是已计算好的排盘结果，后端只负责存储
 */
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const { safeJsonParse } = require('../utils/helpers');
const { authMiddleware } = require('../middleware/auth');
const { apiSignatureMiddleware } = require('../middleware/api-signature');
const { sanitizeErrorForLog } = require('../utils/error-sanitizer');
const SecurityUtils = require('../security');

const db = getDatabase();

/**
 * 创建紫微记录
 */
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

	if (!validatedDateTime) {
		return res.status(400).json({ error: '出生时间格式不正确' });
	}

	const sanitizedCalendarType = calendarType
		? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
		: null;

	let rawPayloadJson = null;
	if (rawPayload) {
		if (typeof rawPayload === 'string') {
			rawPayloadJson = rawPayload;
		} else {
			try {
				const payloadStr = JSON.stringify(rawPayload);
				if (payloadStr.length > 1000000) {
					return res.status(400).json({ error: '数据过大，无法保存' });
				}
				rawPayloadJson = payloadStr;
			} catch (e) {
				console.error('序列化 rawPayload 失败:', sanitizeErrorForLog(e));
				return res.status(400).json({ error: '数据格式错误，无法保存' });
			}
		}
	}

	try {
		const result = await db.run(
			'INSERT INTO ziwei_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
			[userId, sanitizedName, validatedGender, validatedDateTime, sanitizedCalendarType, rawPayloadJson],
		);

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
		console.error('保存紫微记录失败:', sanitizeErrorForLog(err));
		return res.status(500).json({ error: '保存失败，请稍后重试' });
	}
});

/**
 * 更新紫微记录
 */
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

	if (!validatedDateTime) {
		return res.status(400).json({ error: '出生时间格式不正确' });
	}

	const sanitizedCalendarType = calendarType
		? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
		: null;

	let rawPayloadJson = null;
	if (rawPayload) {
		if (typeof rawPayload === 'string') {
			rawPayloadJson = rawPayload;
		} else {
			try {
				const payloadStr = JSON.stringify(rawPayload);
				if (payloadStr.length > 1000000) {
					return res.status(400).json({ error: '数据过大，无法保存' });
				}
				rawPayloadJson = payloadStr;
			} catch (e) {
				return res.status(400).json({ error: '数据格式错误，无法保存' });
			}
		}
	}

	try {
		const recordRow = await db.get(
			'SELECT id, user_id FROM ziwei_records WHERE id = ? AND user_id = ?',
			[recordId, userId],
		);
		if (!recordRow) {
			return res.status(404).json({ error: '记录不存在或无权访问' });
		}

		const result = await db.run(
			'UPDATE ziwei_records SET name = ?, gender = ?, birth_datetime = ?, calendar_type = ?, raw_payload = ? WHERE id = ? AND user_id = ?',
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
		console.error('更新紫微记录失败:', sanitizeErrorForLog(err));
		return res.status(500).json({ error: '更新失败，请稍后重试' });
	}
});

/**
 * 获取紫微记录列表
 */
router.get('/', authMiddleware, async (req, res) => {
	const userId = req.user.id;

	try {
		const rows = await db.all(
			'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM ziwei_records WHERE user_id = ? ORDER BY created_at DESC',
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
		console.error('查询紫微记录失败:', sanitizeErrorForLog(err));
		return res.status(500).json({ error: '查询失败' });
	}
});

module.exports = router;
