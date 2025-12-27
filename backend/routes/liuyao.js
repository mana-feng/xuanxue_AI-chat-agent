/**
 * 六爻记录路由
 * 
 * 重要说明：
 * 1. 排盘计算完全在前端完成
 * 2. 后端只负责数据存储、验证和查询
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
 * 创建六爻记录
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
		return res.status(400).json({ error: '缺少起卦时间 birthDatetime' });
	}

	if (!rawPayload) {
		console.warn('保存六爻记录失败: 缺少 rawPayload', JSON.stringify(req.body));
		return res.status(400).json({ error: '缺少排盘数据 rawPayload' });
	}

	const sanitizedName = name
		? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
		: null;
	const validatedGender = SecurityUtils.validateGender(gender);
	const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);

	if (!validatedDateTime) {
		return res.status(400).json({ error: '起卦时间格式不正确' });
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
		'INSERT INTO liuyao_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';

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
		console.error('保存六爻记录失败:', err);
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
 * 更新六爻记录
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
		return res.status(400).json({ error: '缺少起卦时间 birthDatetime' });
	}

	const sanitizedName = name
		? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
		: null;
	const validatedGender = SecurityUtils.validateGender(gender);
	const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);

	if (!validatedDateTime) {
		return res.status(400).json({ error: '起卦时间格式不正确' });
	}

	const sanitizedCalendarType = calendarType
		? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
		: null;

	// 安全地序列化 rawPayload
	let rawPayloadJson = undefined;
	if (rawPayload !== undefined) {
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
		} else {
			// 如果显式传递了 null，则清空
			rawPayloadJson = null;
		}
	}

	try {
		const recordRow = await db.get(
			'SELECT id, user_id FROM liuyao_records WHERE id = ? AND user_id = ?',
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
		
		if (rawPayloadJson !== undefined) {
			updateFields.push('raw_payload = ?');
			updateValues.push(rawPayloadJson);
		}
		
		updateValues.push(recordId, userId);

		const updateSql = `UPDATE liuyao_records 
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
 * 获取六爻记录列表（供独立接口调用）
 */
router.get('/', authMiddleware, async (req, res) => {
	const userId = req.user.id;

	try {
		const rows = await db.all(
			'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM liuyao_records WHERE user_id = ? ORDER BY created_at DESC',
			[userId]
		);

		const list =
			rows?.map((r) => {
				const rawPayload = r.rawPayload ? safeJsonParse(r.rawPayload) : null;
				
				// 尝试从 rawPayload 中获取更准确的标题
				let title = r.name || '未命名排盘';
				if (rawPayload) {
					// 优先使用 payload 中的标题
					const payloadTitle = rawPayload.options?.title || rawPayload.profile?.title;
					if (payloadTitle) {
						title = payloadTitle;
					}
				}

				return {
					id: r.id,
					title: title,
					gender: r.gender,
					birthDatetime: r.birthDatetime,
					calendarType: r.calendarType,
					rawPayload: rawPayload,
					createdAt: r.createdAt,
				};
			}) || [];

		res.json({ list });
	} catch (err) {
		console.error('查询失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

module.exports = router;
