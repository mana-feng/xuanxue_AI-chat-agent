// 所有后台代码集中在本文件下，仅支持 MySQL

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { initDatabase, getDatabase, autoInitMySQLTables } = require('./db');
const ConfigService = require('./config-service');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 安全防护模块
const SecurityUtils = require('./security');
const { securityHeaders, inputValidation, requestSizeLimit, securityLogging } = require('./security-middleware');

// 基础配置（生产环境请改为环境变量）
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_TO_A_RANDOM_SECRET';

if (!process.env.JWT_SECRET) {
	console.warn('⚠️  JWT_SECRET 未设置，正在使用默认值。请在生产环境配置安全的随机字符串。');
}

// 数据库实例（将在初始化后设置）
let db = null;

// 邮件配置通过数据库明文存储加载（不再从环境变量读取邮箱信息）
let mailTransporter = null;
let emailConfig = {
	host: '',
	port: 0,
	user: '',
	pass: '',
	from: '',
	fromName: ''
};
let emailConfigured = false;

/**
 * 将 Date 对象转换为 MySQL DATETIME 格式 (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - JavaScript Date 对象
 * @returns {string} MySQL DATETIME 格式字符串
 */
function formatMySQLDateTime(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 加载邮箱配置并初始化邮件传输器
 */
async function loadEmailConfig() {
	try {
		emailConfig = await ConfigService.getEmailConfig(db);
		emailConfigured = await ConfigService.isEmailConfigValid(db);
		
		if (!emailConfigured) {
			console.warn('⚠️  邮件配置未完成，邮箱验证码将不可用。请在后台管理中配置邮箱服务。');
			mailTransporter = null;
			return;
		}

		// 创建邮件传输器
		mailTransporter = nodemailer.createTransport({
			host: emailConfig.host,
			port: emailConfig.port,
			secure: emailConfig.port === 465, // 465 端口使用 SSL
			auth: {
				user: emailConfig.user,
				pass: emailConfig.pass
			},
			// 连接超时设置
			connectionTimeout: 10000,
			// 调试选项（生产环境可关闭）
			debug: process.env.NODE_ENV === 'development',
			logger: process.env.NODE_ENV === 'development'
		});

		// 验证连接（异步，不阻塞启动）
		mailTransporter.verify().then(() => {
			console.log('✓ 邮件配置已从数据库加载，SMTP 连接验证成功');
		}).catch((verifyError) => {
			console.warn('⚠️  SMTP 连接验证失败:', verifyError.message);
			console.warn('   邮件服务可能无法正常工作，请检查配置');
		});
	} catch (error) {
		console.error('加载邮件配置失败:', error.message);
		emailConfigured = false;
		mailTransporter = null;
	}
}

/**
 * 确保默认管理员账号存在
 */
async function ensureAdminAccount() {
	try {
		const adminUsername = 'manafeng';
		const adminEmail = 'manafeng@admin.local';
		
		// 检查管理员账号是否已存在
		const existingAdmin = await db.get(
			'SELECT id FROM users WHERE username = ? OR email = ?',
			[adminUsername, adminEmail]
		);
		
		if (!existingAdmin) {
			// 创建管理员账号
			const passwordHash = bcrypt.hashSync('manafeng', 10);
			await db.run(
				'INSERT INTO users (email, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())',
				[adminEmail, adminUsername, passwordHash, 'admin']
			);
			console.log('✓ 默认管理员账号已创建');
			console.log(`   用户名: ${adminUsername}`);
			console.log(`   密码: manafeng`);
			console.log(`   邮箱: ${adminEmail}`);
		} else {
			console.log('✓ 默认管理员账号已存在');
		}
	} catch (err) {
		console.warn('⚠️  创建默认管理员账号失败:', err.message);
		// 不阻止服务器启动
	}
}

/**
 * 初始化数据库表结构
 */
async function initTables() {
	// 用户表（兼容旧版本 MySQL，不使用 DEFAULT CURRENT_TIMESTAMP）
	await db.run(
		`CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			email VARCHAR(255) NOT NULL,
			username VARCHAR(50) DEFAULT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role VARCHAR(20) DEFAULT 'user',
			created_at DATETIME DEFAULT NULL,
			UNIQUE KEY idx_email (email),
			UNIQUE KEY idx_username (username)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 八字记录表
	await db.run(
		`CREATE TABLE IF NOT EXISTS bazi_records (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			name VARCHAR(100) DEFAULT NULL,
			gender VARCHAR(10) DEFAULT NULL,
			birth_datetime VARCHAR(50) DEFAULT NULL,
			calendar_type VARCHAR(20) DEFAULT NULL,
			raw_payload TEXT DEFAULT NULL,
			created_at DATETIME DEFAULT NULL,
			KEY idx_user_id (user_id),
			KEY idx_created_at (created_at),
			CONSTRAINT fk_bazi_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 邮箱验证码表
	await db.run(
		`CREATE TABLE IF NOT EXISTS email_verification_codes (
			id INT AUTO_INCREMENT PRIMARY KEY,
			email VARCHAR(255) NOT NULL,
			code VARCHAR(10) NOT NULL,
			type VARCHAR(20) NOT NULL,
			expires_at DATETIME NOT NULL,
			used TINYINT(1) DEFAULT 0,
			created_at DATETIME DEFAULT NULL,
			KEY idx_email_code (email, code, type, used),
			KEY idx_email_expires (email, expires_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);
}

const app = express();

// 安全中间件（必须在其他中间件之前）
app.use(securityHeaders); // 设置安全 HTTP 头
app.use(requestSizeLimit(10 * 1024 * 1024)); // 限制请求大小为 10MB
app.use(inputValidation); // 输入验证
app.use(securityLogging); // 安全日志记录

app.use(cors());

// 配置 JSON 解析中间件，添加错误处理
app.use(express.json({
	limit: '10mb', // 增加限制以支持较大的 payload
	strict: true, // 只接受数组和对象
	verify: (req, res, buf, encoding) => {
		// 验证请求体格式
		try {
			if (buf && buf.length > 0) {
				const text = buf.toString(encoding || 'utf8');
				// 如果已经是对象字符串，说明有问题
				if (text === '[object Object]') {
					throw new Error('Invalid request body format');
				}
			}
		} catch (e) {
			console.error('请求体验证失败:', e);
		}
	}
}));

// 添加原始请求体日志中间件（用于调试）
app.use((req, res, next) => {
	if (req.method === 'POST' && req.path === '/api/bazi') {
		// 记录原始请求信息
		const contentType = req.headers['content-type'] || '';
		console.log('收到请求:', {
			method: req.method,
			path: req.path,
			contentType: contentType,
			contentLength: req.headers['content-length']
		});
	}
	next();
});

// 简单健康检查
app.get('/api/health', (req, res) => {
	res.json({ ok: true, message: 'bazi backend running' });
});

// 生成6位数字验证码
function generateVerificationCode() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送邮箱验证码
app.post('/api/email/send-code', async (req, res) => {
	const { email, type = 'register' } = req.body || {};

	if (!email) {
		return res.status(400).json({ error: '缺少邮箱地址' });
	}

	// 使用安全工具清理和验证邮箱
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase();

	if (!SecurityUtils.isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: '邮箱格式不正确' });
	}

	// 验证类型参数
	const validType = SecurityUtils.sanitizeString(String(type), { maxLength: 20 });
	if (!['register', 'login', 'reset'].includes(validType)) {
		return res.status(400).json({ error: '无效的验证码类型' });
	}

	if (!emailConfigured || !mailTransporter) {
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
		const displayFrom = emailConfig.fromName
			? `"${emailConfig.fromName}" <${emailConfig.from}>`
			: `<${emailConfig.from}>`;
		const mailOptions = {
			from: displayFrom,
			to: trimmedEmail,
			subject: '邮箱验证码',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">邮箱验证码</h2>
					<p style="color: #666; font-size: 14px;">您的验证码是：</p>
					<div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
						<span style="font-size: 32px; font-weight: bold; color: #409EFF; letter-spacing: 5px;">${code}</span>
					</div>
					<p style="color: #999; font-size: 12px;">验证码有效期为10分钟，请勿泄露给他人。</p>
					<p style="color: #999; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
				</div>
			`
		};

		mailTransporter.sendMail(mailOptions, (mailErr) => {
			if (mailErr) {
				console.error('邮件发送失败:', mailErr);
				return res.status(500).json({ error: '邮件发送失败，请稍后重试' });
			}
			res.json({ success: true, message: '验证码已发送到您的邮箱' });
		});
	} catch (err) {
		console.error('发送验证码失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

// 验证邮箱验证码
app.post('/api/email/verify-code', async (req, res) => {
	const { email, code, type = 'register' } = req.body || {};

	if (!email || !code) {
		return res.status(400).json({ error: '缺少邮箱或验证码' });
	}

	// 使用安全工具清理和验证输入
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase();
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

// 注册（支持用户名）
app.post('/api/register', async (req, res) => {
	const { email, username, password } = req.body || {};

	if (!email || !password || !username) {
		return res.status(400).json({ error: '缺少 email、username 或 password' });
	}

	// 使用安全工具验证和清理输入
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase();
	
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

	try {
		const row = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [trimmedEmail, trimmedUsername]);
		
		if (row) {
			return res.status(409).json({ error: '该邮箱或用户名已被使用' });
		}

		const passwordHash = bcrypt.hashSync(String(password), 10);

		const result = await db.run(
			'INSERT INTO users (email, username, password_hash, created_at) VALUES (?, ?, ?, NOW())',
			[trimmedEmail, trimmedUsername, passwordHash]
		);

		const userId = result.lastID;
		const token = jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });

		res.json({
			token,
			user: { 
				id: userId, 
				email: trimmedEmail, 
				username: trimmedUsername,
				role: 'user' // 新注册用户默认为普通用户
			}
		});
	} catch (err) {
		console.error('注册失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

// 登录（支持邮箱或用户名登录）
app.post('/api/login', async (req, res) => {
	const { identifier, email, password } = req.body || {};

	const rawIdentifier = identifier || email;

	if (!rawIdentifier || !password) {
		return res.status(400).json({ error: '缺少登录账号或密码' });
	}

	// 使用安全工具清理输入
	const trimmedIdentifier = SecurityUtils.sanitizeString(String(rawIdentifier), { maxLength: 255 }).trim();
	const emailCandidate = trimmedIdentifier.toLowerCase();

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

		const token = jwt.sign({ uid: row.id }, JWT_SECRET, { expiresIn: '7d' });
		res.json({
			token,
			user: { 
				id: row.id, 
				email: row.email, 
				username: row.username || null,
				role: row.role || 'user'
			}
		});
	} catch (err) {
		console.error('登录失败:', err);
		return res.status(500).json({ error: '服务器错误' });
	}
});

// 鉴权中间件
function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: '未登录' });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = { id: decoded.uid };
		next();
	} catch (e) {
		return res.status(401).json({ error: '登录已失效，请重新登录' });
	}
}

// 管理员鉴权中间件
async function adminMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: '未登录' });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		const userId = decoded.uid;
		
		// 查询用户角色
		const row = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
		
		if (!row || row.role !== 'admin') {
			return res.status(403).json({ error: '需要管理员权限' });
		}
		
		req.user = { id: userId };
		next();
	} catch (e) {
		if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
			return res.status(401).json({ error: '登录已失效，请重新登录' });
		}
		console.error('管理员鉴权失败:', e);
		return res.status(500).json({ error: '服务器错误' });
	}
}

// 保存八字
app.post('/api/bazi', authMiddleware, async (req, res) => {
	const userId = req.user.id;
	
	// 添加日志查看接收到的数据
	console.log('收到保存八字请求:', {
		userId,
		body: req.body,
		bodyType: typeof req.body,
		bodyKeys: req.body ? Object.keys(req.body) : []
	});

	const {
		name,
		gender,
		birthDatetime,
		calendarType,
		rawPayload // 可以直接把前端算出来的所有八字数据塞进来
	} = req.body || {};

	// 检查必要字段
	if (birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		console.error('缺少出生时间 birthDatetime:', { birthDatetime, type: typeof birthDatetime });
		return res.status(400).json({ error: '缺少出生时间 birthDatetime' });
	}

	// 使用安全工具验证和清理输入
	const sanitizedName = name ? SecurityUtils.sanitizeString(String(name), { maxLength: 100 }) : null;
	const validatedGender = SecurityUtils.validateGender(gender);
	const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
	
	if (!validatedDateTime) {
		return res.status(400).json({ error: '出生时间格式不正确' });
	}

	const sanitizedCalendarType = calendarType ? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 }) : null;

	// 安全地序列化 rawPayload
	let rawPayloadJson = null;
	if (rawPayload) {
		try {
			const payloadStr = JSON.stringify(rawPayload);
			// 检查 JSON 大小
			if (payloadStr.length > 1000000) { // 1MB 限制
				return res.status(400).json({ error: '数据过大，无法保存' });
			}
			rawPayloadJson = payloadStr;
			console.log('rawPayload 序列化成功，长度:', rawPayloadJson.length);
		} catch (e) {
			console.error('序列化 rawPayload 失败:', e, 'rawPayload:', rawPayload);
			return res.status(400).json({ error: '数据格式错误，无法保存: ' + e.message });
		}
	}

	console.log('准备插入数据:', {
		userId,
		name,
		gender,
		birthDatetime: validatedDateTime,
		calendarType,
		rawPayloadLength: rawPayloadJson ? rawPayloadJson.length : 0
	});

	const insertSql =
		'INSERT INTO bazi_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';

	try {
		const result = await db.run(
			insertSql,
			[
				userId,
				sanitizedName,
				validatedGender,
				validatedDateTime,
				sanitizedCalendarType,
				rawPayloadJson
			]
		);

		console.log('保存成功，记录ID:', result.lastID);
		res.json({
			id: result.lastID,
			user_id: userId,
			name,
			gender,
			birthDatetime: validatedDateTime,
			calendarType
		});
	} catch (err) {
		console.error('保存八字记录失败:', err);
		console.error('SQL 参数:', [userId, name, gender, validatedDateTime, calendarType, rawPayloadJson ? '有数据' : 'null']);
		// 如果是唯一约束冲突，返回更友好的错误信息
		if (err.message && (err.message.includes('UNIQUE constraint') || err.message.includes('Duplicate entry'))) {
			return res.status(409).json({ error: '该记录已存在' });
		}
		return res.status(500).json({ error: '保存失败，请稍后重试: ' + err.message });
	}
});

// 查询当前账号的所有排盘（供 /pages/history/list 使用）
app.get('/api/charts', authMiddleware, async (req, res) => {
	const userId = req.user.id;
	
	// 使用安全工具验证和清理查询参数
	const searchKeyword = SecurityUtils.sanitizeSearchKeyword(req.query.keyword || '');
	const genderFilter = SecurityUtils.validateGender(req.query.gender);
	
	// 验证排序参数
	const allowedSortFields = ['created_at', 'name', 'birth_datetime'];
	const sort = SecurityUtils.validateSort(req.query.sortBy, req.query.sortOrder, allowedSortFields);
	const sortBy = sort.sortBy;
	const sortOrder = sort.sortOrder;
	
	// 构建SQL查询
	let sql = 'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM bazi_records WHERE user_id = ?';
	const params = [userId];
	
	// 添加搜索条件（已清理）
	if (searchKeyword) {
		sql += ' AND name LIKE ?';
		params.push('%' + searchKeyword + '%');
	}
	
	// 添加性别筛选（已验证）
	if (genderFilter !== null && genderFilter !== undefined) {
		sql += ' AND gender = ?';
		params.push(genderFilter);
	}
	
	// 添加排序（已验证）
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
				createdAt: r.createdAt
			})) || [];

		// 返回列表和统计信息
		res.json({
			list: list,
			total: list.length,
			hasMore: false // 暂时不支持分页
		});
	} catch (err) {
		console.error('查询失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

// 删除某条排盘记录
app.delete('/api/charts/:id', authMiddleware, async (req, res) => {
	const userId = req.user.id;
	
	// 使用安全工具验证 ID
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '缺少有效的 id' });
	}

	try {
		const result = await db.run('DELETE FROM bazi_records WHERE id = ? AND user_id = ?', [id, userId]);
		
		if (result.changes === 0) {
			return res.status(404).json({ error: '记录不存在或无权限删除' });
		}
		
		res.json({ success: true });
	} catch (err) {
		console.error('删除失败:', err);
		return res.status(500).json({ error: '删除失败' });
	}
});

// 兼容性接口：如果后续需要，可保留 /api/bazi 列表形式
app.get('/api/bazi', authMiddleware, async (req, res) => {
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
				createdAt: r.createdAt
			})) || [];

		res.json({ list });
	} catch (err) {
		console.error('查询失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

function safeJsonParse(text) {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

// ==================== 管理员后台API ====================

// 管理邮箱配置（仅管理员），数据加密存储在 DB，不暴露密码
app.get('/api/admin/email-config', adminMiddleware, async (req, res) => {
	try {
		const cfg = await ConfigService.getEmailConfig(db);
		const configured = await ConfigService.isEmailConfigValid(db);
		res.json({
			configured,
			host: cfg.host || '',
			port: cfg.port || 0,
			user: cfg.user || '',
			from: cfg.from || '',
			fromName: cfg.fromName || ''
			// 不返回 pass（密码）
		});
	} catch (e) {
		console.error('获取邮件配置失败:', e);
		res.status(500).json({ error: '获取邮件配置失败' });
	}
});

app.put('/api/admin/email-config', adminMiddleware, async (req, res) => {
	const { host, port, user, pass, from, fromName } = req.body || {};
	
	try {
		// 清理和验证输入
		const sanitizedHost = SecurityUtils.sanitizeString(String(host || ''), { maxLength: 200 }).trim();
		const sanitizedUser = SecurityUtils.sanitizeString(String(user || ''), { maxLength: 200 }).trim();
		const sanitizedFrom = SecurityUtils.sanitizeString(String(from || ''), { maxLength: 200 }).trim();
		const sanitizedFromName = fromName ? SecurityUtils.sanitizeString(String(fromName), { maxLength: 200, allowSpecialChars: true }).trim() : '';
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
			// 提供了新密码，使用新密码
			finalPass = String(pass).trim();
		} else {
			// 未提供密码，检查是否已有密码
			const existingPass = await ConfigService.getConfig(db, 'EMAIL_PASS');
			if (!existingPass) {
				return res.status(400).json({ error: '首次配置必须填写密码/授权码' });
			}
			// 使用已有密码
			finalPass = existingPass;
		}

		// 使用新的批量设置方法
		await ConfigService.setEmailConfig(db, {
			host: sanitizedHost,
			port: portNum,
			user: sanitizedUser,
			pass: finalPass, // 总是传递密码（新密码或已有密码）
			from: sanitizedFrom,
			fromName: sanitizedFromName
		});

		// 重新加载配置
		await loadEmailConfig();

		res.json({ success: true, message: '邮箱配置已保存' });
	} catch (e) {
		console.error('更新邮件配置失败:', e);
		res.status(500).json({ error: '更新邮件配置失败' });
	}
});

// 获取统计数据
app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
	const queries = {
		totalUsers: 'SELECT COUNT(*) as count FROM users',
		totalRecords: 'SELECT COUNT(*) as count FROM bazi_records',
		todayUsers: `SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()`,
		todayRecords: `SELECT COUNT(*) as count FROM bazi_records WHERE DATE(created_at) = CURDATE()`,
		adminUsers: "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
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

// 获取用户列表
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
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
		// 先获取总数
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		// 再获取列表
		const rows = await db.all(query, queryParams);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize)
		});
	} catch (err) {
		console.error('查询用户列表失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

// 创建用户（管理员）- 必须在 /api/admin/users/:id 之前
app.post('/api/admin/users', adminMiddleware, async (req, res) => {
	console.log('POST /api/admin/users - 收到请求');
	console.log('请求体:', req.body);
	const { email, username, password, role = 'user' } = req.body || {};

	if (!email || !password) {
		return res.status(400).json({ error: '缺少 email 或 password' });
	}

	// 使用安全工具验证和清理输入
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase();
	
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
				role: role
			}
		});
	} catch (err) {
		console.error('创建用户失败:', err);
		return res.status(500).json({ error: '创建失败' });
	}
});

// 获取用户详情
app.get('/api/admin/users/:id', adminMiddleware, async (req, res) => {
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

		// 获取该用户的八字记录数
		try {
			const countRow = await db.get(
				'SELECT COUNT(*) as count FROM bazi_records WHERE user_id = ?',
				[id]
			);
			res.json({
				...row,
				recordCount: countRow?.count || 0
			});
		} catch (countErr) {
			console.error('查询用户记录数失败:', countErr);
			res.json({
				...row,
				recordCount: 0
			});
		}
	} catch (err) {
		console.error('查询用户详情失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

// 更新用户信息（管理员）
app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
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
			const trimmedEmail = SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase();
			if (!SecurityUtils.isValidEmail(trimmedEmail)) {
				return res.status(400).json({ error: '邮箱格式不正确' });
			}
			updates.push('email = ?');
			params.push(trimmedEmail);
		}

		// 更新用户名
		if (username !== undefined) {
			if (username === null || username === '') {
				// 允许清空用户名
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

		// 检查邮箱和用户名是否冲突（如果有更新）
		const checkConditions = [];
		const checkParams = [];
		
		if (email !== undefined) {
			checkConditions.push('email = ?');
			checkParams.push(SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase());
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

		// 执行更新
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

// 更新用户角色
app.put('/api/admin/users/:id/role', adminMiddleware, async (req, res) => {
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

// 删除用户
app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
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

// 获取八字记录列表（管理员）
app.get('/api/admin/records', adminMiddleware, async (req, res) => {
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
		// 先获取总数
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		// 再获取列表
		const rows = await db.all(query, queryParams);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize)
		});
	} catch (err) {
		console.error('查询记录列表失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

// 获取八字记录详情（管理员）
app.get('/api/admin/records/:id', adminMiddleware, async (req, res) => {
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
			);
		
		if (!row) {
			return res.status(404).json({ error: '记录不存在' });
		}

		// 解析 rawPayload
		let rawPayload = null;
		if (row.rawPayload) {
			try {
				rawPayload = JSON.parse(row.rawPayload);
			} catch (e) {
				console.error('解析 rawPayload 失败:', e);
			}
		}

		res.json({
			...row,
			rawPayload
		});
	} catch (err) {
		console.error('查询记录详情失败:', err);
		return res.status(500).json({ error: '查询失败' });
	}
});

// 创建八字记录（管理员）
app.post('/api/admin/records', adminMiddleware, async (req, res) => {
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
		const sanitizedName = name ? SecurityUtils.sanitizeString(String(name), { maxLength: 100 }) : null;
		const validatedGender = SecurityUtils.validateGender(gender);
		const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
		
		if (!validatedDateTime) {
			return res.status(400).json({ error: '出生时间格式不正确' });
		}

		const sanitizedCalendarType = calendarType ? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 }) : null;

		// 安全地序列化 rawPayload
		let rawPayloadJson = null;
		if (rawPayload) {
			try {
				const payloadStr = JSON.stringify(rawPayload);
				if (payloadStr.length > 1000000) { // 1MB 限制
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

		const result = await db.run(
			insertSql,
			[userId, sanitizedName, validatedGender, validatedDateTime, sanitizedCalendarType, rawPayloadJson]
		);

		res.json({
			success: true,
			record: {
				id: result.lastID,
				userId,
				name: sanitizedName,
				gender: validatedGender,
				birthDatetime: validatedDateTime,
				calendarType: sanitizedCalendarType
			}
		});
	} catch (err) {
		console.error('创建记录失败:', err);
		return res.status(500).json({ error: '创建失败' });
	}
});

// 更新八字记录（管理员）
app.put('/api/admin/records/:id', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '无效的记录ID' });
	}

	try {
		// 先查询记录是否存在
		const recordRow = await db.get('SELECT id, user_id FROM bazi_records WHERE id = ?', [id]);
		
		if (!recordRow) {
			return res.status(404).json({ error: '记录不存在' });
		}

		// 如果更新 userId，验证用户是否存在
		if (userId !== undefined && userId !== recordRow.user_id) {
			const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
			
			if (!userRow) {
				return res.status(404).json({ error: '用户不存在' });
			}
		}

		const updates = [];
		const params = [];

		// 更新用户ID
		if (userId !== undefined) {
			updates.push('user_id = ?');
			params.push(userId);
		}

		// 更新姓名
		if (name !== undefined) {
			if (name === null || name === '') {
				updates.push('name = NULL');
			} else {
				updates.push('name = ?');
				params.push(SecurityUtils.sanitizeString(String(name), { maxLength: 100 }));
			}
		}

		// 更新性别
		if (gender !== undefined) {
			const validatedGender = SecurityUtils.validateGender(gender);
			updates.push('gender = ?');
			params.push(validatedGender);
		}

		// 更新出生时间
		if (birthDatetime !== undefined) {
			const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
			if (!validatedDateTime) {
				return res.status(400).json({ error: '出生时间格式不正确' });
			}
			updates.push('birth_datetime = ?');
			params.push(validatedDateTime);
		}

		// 更新历法类型
		if (calendarType !== undefined) {
			if (calendarType === null || calendarType === '') {
				updates.push('calendar_type = NULL');
			} else {
				updates.push('calendar_type = ?');
				params.push(SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 }));
			}
		}

		// 更新 rawPayload
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

// 删除八字记录（管理员）
app.delete('/api/admin/records/:id', adminMiddleware, async (req, res) => {
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

// 404处理（必须在所有路由之后，错误处理之前）
app.use((req, res) => {
	console.log('404 - 未找到路由:', req.method, req.path);
	res.status(404).json({ error: '接口不存在' });
});

// 添加错误处理中间件来捕获 body-parser 错误（必须在所有路由之后）
app.use((err, req, res, next) => {
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		console.error('JSON 解析错误:', err.message);
		console.error('请求路径:', req.path);
		console.error('请求方法:', req.method);
		console.error('请求头 Content-Type:', req.headers['content-type']);
		console.error('请求体类型:', typeof req.body);
		console.error('请求体预览:', req.body ? String(req.body).substring(0, 200) : '无');
		return res.status(400).json({ error: '请求数据格式错误: ' + err.message });
	}
	next(err);
});

async function bootstrap() {
	try {
		// 初始化数据库连接
		await initDatabase();
		db = getDatabase();
		console.log('✓ 使用数据库类型: MYSQL');
		
		// MySQL 自动初始化（如果表不存在）
		if (db.pool) {
			await autoInitMySQLTables(db.pool);
		}
		
		// 初始化表结构（兼容性创建，如果表已存在则跳过）
		await initTables();
		console.log('✓ 数据库表结构初始化完成');
		
		// 初始化配置表
		await ConfigService.initTable(db);
		await loadEmailConfig();
		
		// 确保默认管理员账号存在
		await ensureAdminAccount();

		const server = app.listen(PORT, () => {
			console.log(`Bazi backend listening on http://localhost:${PORT}`);
			console.log(`安全特性: SQL注入防护、XSS防护、输入验证、安全HTTP头`);
		});

		// 处理端口占用错误
		server.on('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				console.error(`❌ 端口 ${PORT} 已被占用，请先停止占用该端口的进程`);
				console.error(`   可以使用以下命令查找并停止进程:`);
				console.error(`   netstat -ano | findstr :${PORT}`);
				console.error(`   taskkill /PID <进程ID> /F`);
				process.exit(1);
			} else {
				console.error('服务器启动失败:', err);
				process.exit(1);
			}
		});
	} catch (err) {
		console.error('服务器启动失败，原因:', err.message || err);
		process.exit(1);
	}
}

bootstrap();
