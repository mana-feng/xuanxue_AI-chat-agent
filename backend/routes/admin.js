/**
 * 管理员路由
 * 注意：所有管理员操作都是敏感操作，建议添加API签名验证
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');
const { adminMiddleware } = require('../middleware/auth');
const { reloadEmailConfig } = require('../services/email');
const SecurityUtils = require('../security');
const { apiSignatureMiddleware } = require('../middleware/api-signature');

const db = getDatabase();

/**
 * 获取邮箱配置
 */
router.get('/email-config', adminMiddleware, async (req, res) => {
	try {
		const cfg = await ConfigService.getEmailConfig(db);
		const configured = await ConfigService.isEmailConfigValid(db);
		res.json({
			configured,
			host: cfg.host || '',
			port: cfg.port || 0,
			user: cfg.user || '',
			from: cfg.from || '',
			fromName: cfg.fromName || '',
		});
	} catch (e) {
		console.error('获取邮件配置失败:', e);
		res.status(500).json({ error: '获取邮件配置失败' });
	}
});

/**
 * 更新邮箱配置
 */
router.put('/email-config', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { host, port, user, pass, from, fromName } = req.body || {};

	try {
		// 清理和验证输入
		const sanitizedHost = SecurityUtils.sanitizeString(String(host || ''), {
			maxLength: 200,
		}).trim();
		const sanitizedUser = SecurityUtils.sanitizeString(String(user || ''), {
			maxLength: 200,
		}).trim();
		const sanitizedFrom = SecurityUtils.sanitizeString(String(from || ''), {
			maxLength: 200,
		}).trim();
		const sanitizedFromName = fromName
			? SecurityUtils.sanitizeString(String(fromName), {
					maxLength: 200,
					allowSpecialChars: true,
				}).trim()
			: '';
		const portNum = Number(port);

		// 验证必填项
		if (!sanitizedHost) {
			return res.status(400).json({ error: 'SMTP 服务器地址不能为空' });
		}
		if (!sanitizedUser) {
			return res.status(400).json({ error: '邮箱账号不能为空' });
		}
		if (Number.isNaN(portNum) || portNum <= 0 || portNum > 65535) {
			return res.status(400).json({ error: '端口号无效（1-65535）' });
		}
		if (!sanitizedFrom || !SecurityUtils.isValidEmail(sanitizedFrom)) {
			return res.status(400).json({ error: '发件人邮箱格式不正确' });
		}

		// 密码处理：如果提供则更新，否则检查是否已有密码
		let finalPass = null;
		if (pass && String(pass).trim()) {
			finalPass = String(pass).trim();
		} else {
			const existingPass = await ConfigService.getConfig(db, 'EMAIL_PASS');
			if (!existingPass) {
				return res.status(400).json({ error: '首次配置必须填写密码/授权码' });
			}
			finalPass = existingPass;
		}

		// 使用新的批量设置方法
		await ConfigService.setEmailConfig(db, {
			host: sanitizedHost,
			port: portNum,
			user: sanitizedUser,
			pass: finalPass,
			from: sanitizedFrom,
			fromName: sanitizedFromName,
		});

		// 重新加载配置
		await reloadEmailConfig();

		res.json({ success: true, message: '邮箱配置已保存' });
	} catch (e) {
		console.error('更新邮件配置失败:', e);
		res.status(500).json({ error: '更新邮件配置失败' });
	}
});

/**
 * 获取 LLM 配置
 */
router.get('/llm-config', adminMiddleware, async (req, res) => {
	try {
		const cfg = await ConfigService.getLLMConfig(db);
		// 尝试从历史记录中获取当前激活的模型名称
		try {
			const models = await ConfigService.getLLMModels(db);
			const activeModel = models.find(m => m.is_active === 1);
			if (activeModel) {
				cfg.name = activeModel.name;
			}
		} catch (e) {
			console.warn('获取模型名称失败:', e.message);
		}
		res.json(cfg);
	} catch (e) {
		console.error('获取 LLM 配置失败:', e);
		res.status(500).json({ error: '获取配置失败' });
	}
});

/**
 * 保存 LLM 配置
 */
router.put('/llm-config', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { provider, baseUrl, apiKey, model, extra, name } = req.body || {};
	try {
		await ConfigService.setLLMConfig(db, {
			provider,
			baseUrl,
			apiKey,
			model,
			extra: extra !== undefined && extra !== null ? String(extra) : '',
			name,
		});
		res.json({ success: true });
	} catch (e) {
		console.error('保存 LLM 配置失败:', e);
		res.status(400).json({ error: e.message || '保存失败' });
	}
});

/**
 * 获取所有历史模型配置
 */
router.get('/llm-models', adminMiddleware, async (req, res) => {
	try {
		const models = await ConfigService.getLLMModels(db);
		res.json({ success: true, data: models });
	} catch (e) {
		console.error('获取模型历史失败:', e);
		res.status(500).json({ error: '获取模型历史失败' });
	}
});

/**
 * 切换激活的模型配置
 */
router.post('/llm-models/:id/activate', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	try {
		const modelId = parseInt(req.params.id, 10);
		if (!modelId || isNaN(modelId)) {
			return res.status(400).json({ error: '无效的模型 ID' });
		}
		await ConfigService.activateLLMModel(db, modelId);
		res.json({ success: true, message: '模型已切换' });
	} catch (e) {
		console.error('切换模型失败:', e);
		res.status(500).json({ error: e.message || '切换模型失败' });
	}
});

/**
 * 获取统计数据
 */
router.get('/stats', adminMiddleware, async (req, res) => {
	const queries = {
		totalUsers: 'SELECT COUNT(*) as count FROM users',
		totalRecords: 'SELECT COUNT(*) as count FROM bazi_records',
		todayUsers: `SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()`,
		todayRecords: `SELECT COUNT(*) as count FROM bazi_records WHERE DATE(created_at) = CURDATE()`,
		adminUsers: "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
	};

	try {
		const results = {};
		const promises = Object.keys(queries).map(async (key) => {
			try {
				const row = await db.get(queries[key], []);
				results[key] = row?.count || 0;
			} catch (err) {
				console.error(`查询 ${key} 失败:`, err);
				results[key] = 0;
			}
		});

		await Promise.all(promises);
		res.json(results);
	} catch (err) {
		console.error('获取统计数据失败:', err);
		return res.status(500).json({ error: '获取统计数据失败' });
	}
});

/**
 * 获取用户列表
 */
router.get('/users', adminMiddleware, async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const pageSize = parseInt(req.query.pageSize) || 20;
	const offset = (page - 1) * pageSize;
	const search = req.query.search || '';

	let query = `
		SELECT 
			u.id, 
			u.email, 
			u.username, 
			u.role, 
			u.created_at,
			COUNT(b.id) as recordCount
		FROM users u
		LEFT JOIN bazi_records b ON u.id = b.user_id
	`;
	let countQuery = 'SELECT COUNT(*) as count FROM users';
	const params = [];
	const groupBy = ' GROUP BY u.id';

	if (search) {
		query += ' WHERE u.email LIKE ? OR u.username LIKE ?';
		countQuery += ' WHERE email LIKE ? OR username LIKE ?';
		const searchPattern = `%${search}%`;
		params.push(searchPattern, searchPattern);
	}

	query += groupBy + ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
	const queryParams = [...params, pageSize, offset];
	const countParams = params;

	try {
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		const rows = await db.all(query, queryParams);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('查询用户列表失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

/**
 * 获取用户AI额度列表
 */
router.get('/users-quotas', adminMiddleware, async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const pageSize = parseInt(req.query.pageSize) || 20;
	const offset = (page - 1) * pageSize;
	const search = req.query.search || '';

	let query = `
		SELECT 
			u.id as userId,
			u.email,
			u.username,
			COALESCE(q.remaining_count, 0) as remainingCount,
			COALESCE(q.remaining_token, 0) as remainingToken,
			q.updated_at as updatedAt
		FROM users u
		LEFT JOIN user_llm_quotas q ON u.id = q.user_id
	`;
	let countQuery = 'SELECT COUNT(*) as count FROM users';
	const params = [];

	if (search) {
		query += ' WHERE u.email LIKE ? OR u.username LIKE ?';
		countQuery += ' WHERE email LIKE ? OR username LIKE ?';
		const searchPattern = `%${search}%`;
		params.push(searchPattern, searchPattern);
	}

	query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
	const queryParams = [...params, pageSize, offset];
	const countParams = params;

	try {
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		const rows = await db.all(query, queryParams);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('查询用户额度列表失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

/**
 * 获取指定用户AI额度
 */
router.get('/users/:id/quota', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '无效的用户ID' });
	}

	try {
		const user = await db.get('SELECT id, email, username FROM users WHERE id = ?', [id]);
		if (!user) {
			return res.status(404).json({ error: '用户不存在' });
		}

		const quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [id]);

		res.json({
			userId: user.id,
			email: user.email,
			username: user.username,
			remainingCount: quota?.remaining_count || 0,
			remainingToken: quota?.remaining_token || 0,
			updatedAt: quota?.updated_at || null,
		});
	} catch (err) {
		console.error('查询用户额度失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

/**
 * 设置指定用户AI额度
 */
router.put('/users/:id/quota', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '无效的用户ID' });
	}

	const { 
		remainingCount,
		remainingToken
	} = req.body || {};

	try {
		const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
		if (!user) {
			return res.status(404).json({ error: '用户不存在' });
		}

		// 检查是否已存在额度记录
		const existing = await db.get('SELECT user_id FROM user_llm_quotas WHERE user_id = ?', [id]);

		if (existing) {
			// 更新现有记录
			if (remainingCount === undefined && remainingToken === undefined) {
				return res.status(400).json({ error: '没有提供要更新的字段' });
			}

			const updateFields = [];
			const updateValues = [];

			if (remainingCount !== undefined) {
				updateFields.push('remaining_count = ?');
				updateValues.push(remainingCount);
			}
			if (remainingToken !== undefined) {
				updateFields.push('remaining_token = ?');
				updateValues.push(remainingToken);
			}

			updateFields.push('per_minute_limit = 1');
			updateFields.push('updated_at = NOW()');
			updateValues.push(id);

			await db.run(
				`UPDATE user_llm_quotas 
				SET ${updateFields.join(', ')} 
				WHERE user_id = ?`,
				updateValues
			);
		} else {
			// 创建新记录
			await db.run(
				`INSERT INTO user_llm_quotas 
				(user_id, per_minute_limit, remaining_count, remaining_token, updated_at) 
				VALUES (?, 1, ?, ?, NOW())`,
				[
					id,
					remainingCount !== undefined ? remainingCount : 0,
					remainingToken !== undefined ? remainingToken : 0,
				]
			);
		}

		res.json({ success: true, message: '额度更新成功' });
	} catch (err) {
		console.error('更新用户额度失败:', err);
		return res.status(500).json({ error: '更新失败' });
	}
});

/**
 * 创建用户
 */
router.post('/users', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { email, username, password, role = 'user' } = req.body || {};

	if (!email || !password) {
		return res.status(400).json({ error: '缺少 email 或 password' });
	}

	// 使用安全工具验证和清理输入
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), {
		maxLength: 255,
	}).toLowerCase();

	if (!SecurityUtils.isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: '邮箱格式不正确' });
	}

	// 验证用户名（如果提供）
	let trimmedUsername = null;
	if (username) {
		const usernameValidation = SecurityUtils.validateUsername(username);
		if (!usernameValidation.valid) {
			return res.status(400).json({ error: usernameValidation.error });
		}
		trimmedUsername = usernameValidation.sanitized;
	}

	// 验证密码
	const passwordValidation = SecurityUtils.validatePassword(password);
	if (!passwordValidation.valid) {
		return res.status(400).json({ error: passwordValidation.error });
	}

	// 验证角色
	if (role !== 'user' && role !== 'admin') {
		return res.status(400).json({ error: '无效的角色，必须是 user 或 admin' });
	}

	// 检查邮箱或用户名是否已存在
	const checkQuery = trimmedUsername
		? 'SELECT id FROM users WHERE email = ? OR username = ?'
		: 'SELECT id FROM users WHERE email = ?';
	const checkParams = trimmedUsername ? [trimmedEmail, trimmedUsername] : [trimmedEmail];

	try {
		const row = await db.get(checkQuery, checkParams);

		if (row) {
			return res.status(409).json({ error: '该邮箱或用户名已被使用' });
		}

		const passwordHash = bcrypt.hashSync(String(password), 10);

		const insertQuery = trimmedUsername
			? 'INSERT INTO users (email, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())'
			: 'INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, NOW())';
		const insertParams = trimmedUsername
			? [trimmedEmail, trimmedUsername, passwordHash, role]
			: [trimmedEmail, passwordHash, role];

		const result = await db.run(insertQuery, insertParams);

		res.json({
			success: true,
			user: {
				id: result.lastID,
				email: trimmedEmail,
				username: trimmedUsername,
				role: role,
			},
		});
	} catch (err) {
		console.error('创建用户失败:', err);
		return res.status(500).json({ error: '创建失败' });
	}
});

/**
 * 获取用户详情
 */
router.get('/users/:id', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '无效的用户ID' });
	}

	try {
		const row = await db.get(
			'SELECT id, email, username, role, created_at FROM users WHERE id = ?',
			[id]
		);

		if (!row) {
			return res.status(404).json({ error: '用户不存在' });
		}

		try {
			const countRow = await db.get(
				'SELECT COUNT(*) as count FROM bazi_records WHERE user_id = ?',
				[id]
			);
			res.json({
				...row,
				recordCount: countRow?.count || 0,
			});
		} catch (countErr) {
			console.error('查询用户记录数失败:', countErr);
			res.json({
				...row,
				recordCount: 0,
			});
		}
	} catch (err) {
		console.error('查询用户详情失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

/**
 * 更新用户信息
 */
router.put('/users/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { email, username, password, role } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '无效的用户ID' });
	}

	// 不能修改自己的角色
	if (role && req.user.id === id && role !== 'admin') {
		return res.status(400).json({ error: '不能修改自己的角色' });
	}

	try {
		// 先查询用户是否存在
		const userRow = await db.get('SELECT id, email, username, role FROM users WHERE id = ?', [id]);

		if (!userRow) {
			return res.status(404).json({ error: '用户不存在' });
		}

		// 验证和准备更新数据
		const updates = [];
		const params = [];

		// 更新邮箱
		if (email !== undefined) {
			const trimmedEmail = SecurityUtils.sanitizeString(String(email), {
				maxLength: 255,
			}).toLowerCase();
			if (!SecurityUtils.isValidEmail(trimmedEmail)) {
				return res.status(400).json({ error: '邮箱格式不正确' });
			}
			updates.push('email = ?');
			params.push(trimmedEmail);
		}

		// 更新用户名
		if (username !== undefined) {
			if (username === null || username === '') {
				updates.push('username = NULL');
			} else {
				const usernameValidation = SecurityUtils.validateUsername(username);
				if (!usernameValidation.valid) {
					return res.status(400).json({ error: usernameValidation.error });
				}
				updates.push('username = ?');
				params.push(usernameValidation.sanitized);
			}
		}

		// 更新密码
		if (password !== undefined && password !== null && password !== '') {
			const passwordValidation = SecurityUtils.validatePassword(password);
			if (!passwordValidation.valid) {
				return res.status(400).json({ error: passwordValidation.error });
			}
			const passwordHash = bcrypt.hashSync(String(password), 10);
			updates.push('password_hash = ?');
			params.push(passwordHash);
		}

		// 更新角色
		if (role !== undefined) {
			if (role !== 'user' && role !== 'admin') {
				return res.status(400).json({ error: '无效的角色，必须是 user 或 admin' });
			}
			updates.push('role = ?');
			params.push(role);
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: '没有要更新的字段' });
		}

		// 检查邮箱和用户名是否冲突
		const checkConditions = [];
		const checkParams = [];

		if (email !== undefined) {
			checkConditions.push('email = ?');
			checkParams.push(
				SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase()
			);
		}
		if (username !== undefined && username !== null && username !== '') {
			const usernameValidation = SecurityUtils.validateUsername(username);
			if (usernameValidation.valid) {
				checkConditions.push('username = ?');
				checkParams.push(usernameValidation.sanitized);
			}
		}

		if (checkConditions.length > 0) {
			checkParams.push(id);
			const checkQuery = `SELECT id FROM users WHERE (${checkConditions.join(' OR ')}) AND id != ?`;
			const checkRow = await db.get(checkQuery, checkParams);

			if (checkRow) {
				return res.status(409).json({ error: '该邮箱或用户名已被使用' });
			}
		}

		params.push(id);
		const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
		const result = await db.run(updateQuery, params);

		if (result.changes === 0) {
			return res.status(404).json({ error: '用户不存在' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('更新用户失败:', err);
		return res.status(500).json({ error: '更新失败' });
	}
});

/**
 * 更新用户角色
 */
router.put('/users/:id/role', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { role } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '无效的用户ID' });
	}

	if (!role || (role !== 'user' && role !== 'admin')) {
		return res.status(400).json({ error: '无效的角色，必须是 user 或 admin' });
	}

	// 不能修改自己的角色
	if (req.user.id === id) {
		return res.status(400).json({ error: '不能修改自己的角色' });
	}

	try {
		const result = await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);

		if (result.changes === 0) {
			return res.status(404).json({ error: '用户不存在' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('更新用户角色失败:', err);
		return res.status(500).json({ error: '更新失败' });
	}
});

/**
 * 删除用户
 */
router.delete('/users/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '无效的用户ID' });
	}

	// 不能删除自己
	if (req.user.id === id) {
		return res.status(400).json({ error: '不能删除自己' });
	}

	try {
		// 先删除该用户的所有八字记录
		await db.run('DELETE FROM bazi_records WHERE user_id = ?', [id]);

		// 再删除用户
		const result = await db.run('DELETE FROM users WHERE id = ?', [id]);

		if (result.changes === 0) {
			return res.status(404).json({ error: '用户不存在' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('删除用户失败:', err);
		return res.status(500).json({ error: '删除失败' });
	}
});

/**
 * 获取八字记录列表
 */
router.get('/records', adminMiddleware, async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const pageSize = parseInt(req.query.pageSize) || 20;
	const offset = (page - 1) * pageSize;
	const userId = req.query.userId ? parseInt(req.query.userId) : null;
	const search = req.query.search || '';

	let query = `
		SELECT 
			r.id, 
			r.name, 
			r.gender, 
			r.birth_datetime AS birthDatetime, 
			r.calendar_type AS calendarType,
			r.created_at AS createdAt,
			u.id AS userId,
			u.email AS userEmail,
			u.username AS userUsername
		FROM bazi_records r
		LEFT JOIN users u ON r.user_id = u.id
	`;
	let countQuery = 'SELECT COUNT(*) as count FROM bazi_records r';
	const params = [];
	const conditions = [];

	if (userId) {
		conditions.push('r.user_id = ?');
		params.push(userId);
	}

	if (search) {
		conditions.push('(r.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)');
		const searchPattern = `%${search}%`;
		params.push(searchPattern, searchPattern, searchPattern);
	}

	if (conditions.length > 0) {
		const whereClause = ' WHERE ' + conditions.join(' AND ');
		query += whereClause;
		countQuery += whereClause;
	}

	query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
	const queryParams = [...params, pageSize, offset];
	const countParams = params;

	try {
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		const rows = await db.all(query, queryParams);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('查询记录列表失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

/**
 * 获取八字记录详情
 */
router.get('/records/:id', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '无效的记录ID' });
	}

	try {
		const row = await db.get(
			`SELECT 
				r.id, 
				r.name, 
				r.gender, 
				r.birth_datetime AS birthDatetime,
				r.calendar_type AS calendarType,
				r.raw_payload AS rawPayload,
				r.created_at AS createdAt,
				u.id AS userId,
				u.email AS userEmail,
				u.username AS userUsername
			FROM bazi_records r
			LEFT JOIN users u ON r.user_id = u.id
			WHERE r.id = ?`,
			[id]
		);

		if (!row) {
			return res.status(404).json({ error: '记录不存在' });
		}

		let parsedPayload = null;
		if (row.rawPayload) {
			try {
				if (typeof row.rawPayload === 'string') {
					parsedPayload = JSON.parse(row.rawPayload);
				} else {
					parsedPayload = row.rawPayload;
				}
			} catch (e) {
				console.error('解析 rawPayload 失败:', e);
				parsedPayload = row.rawPayload;
			}
		}

		res.json({
			id: row.id,
			name: row.name,
			gender: row.gender,
			birthDatetime: row.birthDatetime,
			calendarType: row.calendarType,
			createdAt: row.createdAt,
			userId: row.userId,
			userEmail: row.userEmail,
			userUsername: row.userUsername,
			rawPayload: parsedPayload,
		});
	} catch (err) {
		console.error('查询记录详情失败:', err);
		if (err.code === 'ER_MALFORMED_PACKET') {
			console.error('数据包错误，可能是查询结果过大或连接问题');
			return res.status(500).json({
				error: '查询失败：数据包错误，请检查数据库连接或联系管理员',
			});
		}
		return res.status(500).json({ error: '查询失败' });
	}
});

/**
 * 创建八字记录
 */
router.post('/records', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (!userId || birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缺少 userId 或 birthDatetime' });
	}

	try {
		// 验证用户是否存在
		const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);

		if (!userRow) {
			return res.status(404).json({ error: '用户不存在' });
		}

		// 使用安全工具验证和清理输入
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
				console.error('序列化 rawPayload 失败:', e);
				return res.status(400).json({ error: '数据格式错误，无法保存: ' + e.message });
			}
		}

		const insertSql =
			'INSERT INTO bazi_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';

		const result = await db.run(insertSql, [
			userId,
			sanitizedName,
			validatedGender,
			validatedDateTime,
			sanitizedCalendarType,
			rawPayloadJson,
		]);

		res.json({
			success: true,
			record: {
				id: result.lastID,
				userId,
				name: sanitizedName,
				gender: validatedGender,
				birthDatetime: validatedDateTime,
				calendarType: sanitizedCalendarType,
			},
		});
	} catch (err) {
		console.error('创建记录失败:', err);
		return res.status(500).json({ error: '创建失败' });
	}
});

/**
 * 更新八字记录
 */
router.put('/records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '无效的记录ID' });
	}

	try {
		const recordRow = await db.get('SELECT id, user_id FROM bazi_records WHERE id = ?', [id]);

		if (!recordRow) {
			return res.status(404).json({ error: '记录不存在' });
		}

		if (userId !== undefined && userId !== recordRow.user_id) {
			const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);

			if (!userRow) {
				return res.status(404).json({ error: '用户不存在' });
			}
		}

		const updates = [];
		const params = [];

		if (userId !== undefined) {
			updates.push('user_id = ?');
			params.push(userId);
		}

		if (name !== undefined) {
			if (name === null || name === '') {
				updates.push('name = NULL');
			} else {
				updates.push('name = ?');
				params.push(SecurityUtils.sanitizeString(String(name), { maxLength: 100 }));
			}
		}

		if (gender !== undefined) {
			const validatedGender = SecurityUtils.validateGender(gender);
			updates.push('gender = ?');
			params.push(validatedGender);
		}

		if (birthDatetime !== undefined) {
			const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
			if (!validatedDateTime) {
				return res.status(400).json({ error: '出生时间格式不正确' });
			}
			updates.push('birth_datetime = ?');
			params.push(validatedDateTime);
		}

		if (calendarType !== undefined) {
			if (calendarType === null || calendarType === '') {
				updates.push('calendar_type = NULL');
			} else {
				updates.push('calendar_type = ?');
				params.push(SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 }));
			}
		}

		if (rawPayload !== undefined) {
			if (rawPayload === null) {
				updates.push('raw_payload = NULL');
			} else {
				try {
					const payloadStr = JSON.stringify(rawPayload);
					if (payloadStr.length > 1000000) {
						return res.status(400).json({ error: '数据过大，无法保存' });
					}
					updates.push('raw_payload = ?');
					params.push(payloadStr);
				} catch (e) {
					return res.status(400).json({ error: '数据格式错误: ' + e.message });
				}
			}
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: '没有要更新的字段' });
		}

		params.push(id);
		const updateQuery = `UPDATE bazi_records SET ${updates.join(', ')} WHERE id = ?`;
		const result = await db.run(updateQuery, params);

		if (result.changes === 0) {
			return res.status(404).json({ error: '记录不存在' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('更新记录失败:', err);
		return res.status(500).json({ error: '更新失败' });
	}
});

/**
 * 删除八字记录
 */
router.delete('/records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '无效的记录ID' });
	}

	try {
		const result = await db.run('DELETE FROM bazi_records WHERE id = ?', [id]);
		if (result.changes === 0) {
			return res.status(404).json({ error: '记录不存在' });
		}
		res.json({ success: true });
	} catch (err) {
		console.error('删除记录失败:', err);
		return res.status(500).json({ error: '删除失败' });
	}
});

module.exports = router;

