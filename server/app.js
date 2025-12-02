// 所有后台代码集中在本文件下，使用 SQLite 作为存储

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

// 基础配置（生产环境请改为环境变量）
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_TO_A_RANDOM_SECRET';
const DB_FILE = path.join(__dirname, 'bazi.db');

// 邮件配置（生产环境请改为环境变量）
const EMAIL_HOST = process.env.EMAIL_HOST || '';
const EMAIL_PORT = process.env.EMAIL_PORT || ;
const EMAIL_USER = process.env.EMAIL_USER || ''; // 发送邮件的邮箱账号
const EMAIL_PASS = process.env.EMAIL_PASS || ''; // 邮箱授权码（不是登录密码）
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER; // 发件人显示名称

// 创建邮件传输器（如果配置了邮箱信息）
let mailTransporter = null;
if (EMAIL_USER && EMAIL_PASS) {
	mailTransporter = nodemailer.createTransport({
		host: EMAIL_HOST,
		port: EMAIL_PORT,
		secure: EMAIL_PORT === 465, // true for 465 (SSL), false for other ports
		auth: {
			user: EMAIL_USER,
			pass: EMAIL_PASS
		}
	});
} else {
	console.warn('⚠️  未配置邮箱信息，验证码功能将无法发送邮件。请设置环境变量 EMAIL_USER 和 EMAIL_PASS');
}

// 确保 server 目录存在
if (!fs.existsSync(path.dirname(DB_FILE))) {
	fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// 初始化数据库
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
	// 用户表（增加 username 字段，支持用户名登录）
	db.run(
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			username TEXT UNIQUE,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`
	);

	// 兼容老版本：如果之前已经创建过 users 表但没有 username 字段，这里尝试动态增加一列
	db.all('PRAGMA table_info(users)', (err, rows) => {
		if (err) {
			console.error('检查 users 表结构失败', err);
			return;
		}
		const hasUsername = rows?.some((c) => c.name === 'username');
		if (!hasUsername) {
			db.run('ALTER TABLE users ADD COLUMN username TEXT UNIQUE', (alterErr) => {
				if (alterErr) {
					console.error('尝试为 users 表增加 username 字段失败', alterErr);
				}
			});
		}
	});

	// 八字记录表
	db.run(
		`CREATE TABLE IF NOT EXISTS bazi_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT,
			gender TEXT,
			birth_datetime TEXT,
			calendar_type TEXT,
			raw_payload TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`
	);

	// 邮箱验证码表
	db.run(
		`CREATE TABLE IF NOT EXISTS email_verification_codes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			code TEXT NOT NULL,
			type TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			used INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`
	);

	// 创建索引以提高查询效率
	db.run('CREATE INDEX IF NOT EXISTS idx_email_code ON email_verification_codes(email, code, type, used)');
	db.run('CREATE INDEX IF NOT EXISTS idx_email_expires ON email_verification_codes(email, expires_at)');
});

const app = express();

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

// 验证邮箱格式
function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// 发送邮箱验证码
app.post('/api/email/send-code', (req, res) => {
	const { email, type = 'register' } = req.body || {};

	if (!email) {
		return res.status(400).json({ error: '缺少邮箱地址' });
	}

	const trimmedEmail = String(email).trim().toLowerCase();

	if (!isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: '邮箱格式不正确' });
	}

	// 检查是否在1分钟内已发送过验证码（防止频繁发送）
	db.get(
		'SELECT created_at FROM email_verification_codes WHERE email = ? AND type = ? AND created_at > datetime("now", "-1 minute") ORDER BY created_at DESC LIMIT 1',
		[trimmedEmail, type],
		(err, row) => {
			if (err) {
				console.error('db error', err);
				return res.status(500).json({ error: '服务器错误' });
			}
			if (row) {
				return res.status(429).json({ error: '发送过于频繁，请1分钟后再试' });
			}

			// 生成验证码
			const code = generateVerificationCode();
			const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

			// 保存验证码到数据库
			db.run(
				'INSERT INTO email_verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
				[trimmedEmail, code, type, expiresAt.toISOString()],
				function (insertErr) {
					if (insertErr) {
						console.error('db error', insertErr);
						return res.status(500).json({ error: '服务器错误' });
					}

					// 发送邮件
					if (mailTransporter) {
						const mailOptions = {
							from: `"八字排盘" <${EMAIL_FROM}>`,
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
					} else {
						// 开发环境：如果没有配置邮件服务，直接返回验证码（仅用于测试）
						console.log(`[开发模式] 邮箱 ${trimmedEmail} 的验证码: ${code}`);
						res.json({
							success: true,
							message: '验证码已生成（开发模式，请查看服务器日志）',
							code: code // 仅开发环境返回，生产环境应删除此行
						});
					}
				}
			);
		}
	);
});

// 验证邮箱验证码
app.post('/api/email/verify-code', (req, res) => {
	const { email, code, type = 'register' } = req.body || {};

	if (!email || !code) {
		return res.status(400).json({ error: '缺少邮箱或验证码' });
	}

	const trimmedEmail = String(email).trim().toLowerCase();
	const trimmedCode = String(code).trim();

	// 查询验证码
	db.get(
		'SELECT id, expires_at, used FROM email_verification_codes WHERE email = ? AND code = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
		[trimmedEmail, trimmedCode, type],
		(err, row) => {
			if (err) {
				console.error('db error', err);
				return res.status(500).json({ error: '服务器错误' });
			}

			if (!row) {
				return res.status(400).json({ error: '验证码错误' });
			}

			// 检查是否已使用
			if (row.used === 1) {
				return res.status(400).json({ error: '验证码已使用' });
			}

			// 检查是否过期
			const expiresAt = new Date(row.expires_at);
			if (expiresAt < new Date()) {
				return res.status(400).json({ error: '验证码已过期' });
			}

			// 标记验证码为已使用
			db.run('UPDATE email_verification_codes SET used = 1 WHERE id = ?', [row.id], (updateErr) => {
				if (updateErr) {
					console.error('db error', updateErr);
					// 即使更新失败，也返回成功（验证码已验证）
				}
				res.json({ success: true, message: '验证码验证成功' });
			});
		}
	);
});

// 注册（支持用户名）
app.post('/api/register', (req, res) => {
	const { email, username, password } = req.body || {};

	if (!email || !password || !username) {
		return res.status(400).json({ error: '缺少 email、username 或 password' });
	}

	const trimmedEmail = String(email).trim().toLowerCase();
	const trimmedUsername = String(username).trim();

	if (trimmedUsername.length < 2) {
		return res.status(400).json({ error: '用户名长度不能少于 2 个字符' });
	}

	db.get('SELECT id FROM users WHERE email = ? OR username = ?', [trimmedEmail, trimmedUsername], (err, row) => {
		if (err) {
			console.error('db error', err);
			return res.status(500).json({ error: '服务器错误' });
		}
		if (row) {
			return res.status(409).json({ error: '该邮箱或用户名已被使用' });
		}

		const passwordHash = bcrypt.hashSync(String(password), 10);

		db.run(
			'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
			[trimmedEmail, trimmedUsername, passwordHash],
			function (insertErr) {
				if (insertErr) {
					console.error('db error', insertErr);
					return res.status(500).json({ error: '服务器错误' });
				}

				const userId = this.lastID;
				const token = jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });

				res.json({
					token,
					user: { id: userId, email: trimmedEmail, username: trimmedUsername }
				});
			}
		);
	});
});

// 登录（支持邮箱或用户名登录）
app.post('/api/login', (req, res) => {
	const { identifier, email, password } = req.body || {};

	const rawIdentifier = identifier || email;

	if (!rawIdentifier || !password) {
		return res.status(400).json({ error: '缺少登录账号或密码' });
	}

	const trimmedIdentifier = String(rawIdentifier).trim();
	const emailCandidate = trimmedIdentifier.toLowerCase();

	db.get(
		'SELECT id, email, username, password_hash FROM users WHERE email = ? OR username = ?',
		[emailCandidate, trimmedIdentifier],
		(err, row) => {
			if (err) {
				console.error('db error', err);
				return res.status(500).json({ error: '服务器错误' });
			}
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
				user: { id: row.id, email: row.email, username: row.username || null }
			});
		}
	);
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

// 保存八字
app.post('/api/bazi', authMiddleware, (req, res) => {
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

	// 尝试序列化 rawPayload
	let rawPayloadJson = null;
	if (rawPayload) {
		try {
			rawPayloadJson = JSON.stringify(rawPayload);
			console.log('rawPayload 序列化成功，长度:', rawPayloadJson.length);
		} catch (e) {
			console.error('序列化 rawPayload 失败:', e, 'rawPayload:', rawPayload);
			return res.status(400).json({ error: '数据格式错误，无法保存: ' + e.message });
		}
	}

	// 转换时间戳为字符串（如果是数字时间戳，转换为 ISO 字符串）
	let birthDatetimeStr = null;
	if (typeof birthDatetime === 'number') {
		birthDatetimeStr = new Date(birthDatetime).toISOString();
	} else {
		birthDatetimeStr = String(birthDatetime);
	}

	console.log('准备插入数据:', {
		userId,
		name,
		gender,
		birthDatetimeStr,
		calendarType,
		rawPayloadLength: rawPayloadJson ? rawPayloadJson.length : 0
	});

	const insertSql =
		'INSERT INTO bazi_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload) VALUES (?, ?, ?, ?, ?, ?)';

	db.run(
		insertSql,
		[
			userId,
			name || null,
			gender !== undefined && gender !== null ? String(gender) : null,
			birthDatetimeStr,
			calendarType || null,
			rawPayloadJson
		],
		function (err) {
			if (err) {
				console.error('保存八字记录失败:', err);
				console.error('SQL 参数:', [userId, name, gender, birthDatetimeStr, calendarType, rawPayloadJson ? '有数据' : 'null']);
				// 如果是唯一约束冲突，返回更友好的错误信息
				if (err.message && err.message.includes('UNIQUE constraint')) {
					return res.status(409).json({ error: '该记录已存在' });
				}
				return res.status(500).json({ error: '保存失败，请稍后重试: ' + err.message });
			}

			console.log('保存成功，记录ID:', this.lastID);
			res.json({
				id: this.lastID,
				user_id: userId,
				name,
				gender,
				birthDatetime: birthDatetimeStr,
				calendarType
			});
		}
	);
});

// 查询当前账号的所有排盘（供 /pages/history/list 使用）
app.get('/api/charts', authMiddleware, (req, res) => {
	const userId = req.user.id;
	
	// 获取查询参数
	const searchKeyword = req.query.keyword || ''; // 搜索关键词（姓名）
	const genderFilter = req.query.gender; // 性别筛选：'0' 或 '1'
	const sortBy = req.query.sortBy || 'created_at'; // 排序字段：'created_at' 或 'name'
	const sortOrder = req.query.sortOrder || 'DESC'; // 排序方向：'ASC' 或 'DESC'
	
	// 构建SQL查询
	let sql = 'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM bazi_records WHERE user_id = ?';
	const params = [userId];
	
	// 添加搜索条件
	if (searchKeyword) {
		sql += ' AND name LIKE ?';
		params.push('%' + searchKeyword + '%');
	}
	
	// 添加性别筛选
	if (genderFilter !== undefined && genderFilter !== null && genderFilter !== '') {
		sql += ' AND gender = ?';
		params.push(genderFilter);
	}
	
	// 添加排序
	const validSortFields = ['created_at', 'name', 'birth_datetime'];
	const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
	const validSortOrders = ['ASC', 'DESC'];
	const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
	
	// 处理排序字段映射
	let orderByField = sortField;
	if (sortField === 'name') {
		orderByField = 'name';
	} else if (sortField === 'birth_datetime') {
		orderByField = 'birth_datetime';
	} else {
		orderByField = 'created_at';
	}
	
	sql += ` ORDER BY ${orderByField} ${order}`;

	db.all(sql, params, (err, rows) => {
		if (err) {
			console.error('db error', err);
			return res.status(500).json({ error: '查询失败' });
		}

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
	});
});

// 删除某条排盘记录
app.delete('/api/charts/:id', authMiddleware, (req, res) => {
	const userId = req.user.id;
	const id = Number(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '缺少有效的 id' });
	}

	db.run('DELETE FROM bazi_records WHERE id = ? AND user_id = ?', [id, userId], function (err) {
		if (err) {
			console.error('db error', err);
			return res.status(500).json({ error: '删除失败' });
		}
		if (this.changes === 0) {
			return res.status(404).json({ error: '记录不存在' });
		}
		res.json({ success: true });
	});
});

// 兼容性接口：如果后续需要，可保留 /api/bazi 列表形式
app.get('/api/bazi', authMiddleware, (req, res) => {
	const userId = req.user.id;

	db.all(
		'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM bazi_records WHERE user_id = ? ORDER BY created_at DESC',
		[userId],
		(err, rows) => {
			if (err) {
				console.error('db error', err);
				return res.status(500).json({ error: '查询失败' });
			}

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
		}
	);
});

function safeJsonParse(text) {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

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

app.listen(PORT, () => {
	console.log(`Bazi backend listening on http://localhost:${PORT}`);
});


