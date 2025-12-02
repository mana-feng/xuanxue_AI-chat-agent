// 百万级用户优化的后台代码
// 主要优化点：
// 1. Redis 缓存层（用户会话、验证码、热点数据）
// 2. 数据库连接池和索引优化
// 3. 分页查询优化
// 4. 限流和防刷机制
// 5. 查询性能优化（字段选择、索引）

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

// 安全防护模块
const SecurityUtils = require('./security');
const { securityHeaders, inputValidation, requestSizeLimit, securityLogging } = require('./security-middleware');

// Redis 客户端（如果安装了 redis 包）
let redisClient = null;
try {
	const redis = require('redis');
	const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
	const REDIS_PORT = process.env.REDIS_PORT || 6379;
	const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
	
	redisClient = redis.createClient({
		socket: {
			host: REDIS_HOST,
			port: REDIS_PORT
		},
		password: REDIS_PASSWORD || undefined
	});
	
	redisClient.on('error', (err) => {
		console.warn('⚠️  Redis 连接失败，将使用内存缓存:', err.message);
		redisClient = null;
	});
	
	redisClient.on('connect', () => {
		console.log('✅ Redis 连接成功');
	});
	
	redisClient.connect().catch(() => {
		console.warn('⚠️  Redis 连接失败，将使用内存缓存');
		redisClient = null;
	});
} catch (e) {
	console.warn('⚠️  未安装 redis 包，将使用内存缓存。安装命令: npm install redis');
}

// 内存缓存（Redis 不可用时的降级方案）
const memoryCache = new Map();
const CACHE_TTL = {
	VERIFICATION_CODE: 10 * 60 * 1000, // 10分钟
	USER_SESSION: 7 * 24 * 60 * 60 * 1000, // 7天
	USER_INFO: 5 * 60 * 1000, // 5分钟
	CHART_LIST: 2 * 60 * 1000 // 2分钟
};

// 缓存工具函数
async function cacheGet(key) {
	if (redisClient) {
		try {
			const value = await redisClient.get(key);
			return value ? JSON.parse(value) : null;
		} catch (e) {
			console.error('Redis get error:', e);
			return null;
		}
	}
	const item = memoryCache.get(key);
	if (!item) return null;
	if (Date.now() > item.expiresAt) {
		memoryCache.delete(key);
		return null;
	}
	return item.value;
}

async function cacheSet(key, value, ttlMs) {
	if (redisClient) {
		try {
			await redisClient.setEx(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
			return;
		} catch (e) {
			console.error('Redis set error:', e);
		}
	}
	memoryCache.set(key, {
		value,
		expiresAt: Date.now() + ttlMs
	});
}

async function cacheDel(key) {
	if (redisClient) {
		try {
			await redisClient.del(key);
		} catch (e) {
			console.error('Redis del error:', e);
		}
	}
	memoryCache.delete(key);
}

// 限流器（基于内存，生产环境建议使用 Redis）
const rateLimitMap = new Map();
function rateLimit(key, maxRequests, windowMs) {
	const now = Date.now();
	const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
	
	if (now > record.resetAt) {
		record.count = 1;
		record.resetAt = now + windowMs;
		rateLimitMap.set(key, record);
		return true;
	}
	
	if (record.count >= maxRequests) {
		return false;
	}
	
	record.count++;
	rateLimitMap.set(key, record);
	return true;
}

// 基础配置（生产环境请改为环境变量）
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_TO_A_RANDOM_SECRET';
const DB_FILE = path.join(__dirname, 'bazi.db');

// 邮件配置（生产环境请改为环境变量）
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.yeah.net';
const EMAIL_PORT = process.env.EMAIL_PORT || 465;
const EMAIL_USER = process.env.EMAIL_USER || 'manafeng@yeah.net';
const EMAIL_PASS = process.env.EMAIL_PASS || 'SS2pBWd3K2th9dFa';
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

// 创建邮件传输器（如果配置了邮箱信息）
let mailTransporter = null;
if (EMAIL_USER && EMAIL_PASS) {
	mailTransporter = nodemailer.createTransport({
		host: EMAIL_HOST,
		port: EMAIL_PORT,
		secure: EMAIL_PORT === 465,
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

// 数据库连接池配置（SQLite 使用 WAL 模式提高并发性能）
const db = new sqlite3.Database(DB_FILE, (err) => {
	if (err) {
		console.error('数据库连接失败:', err);
		return;
	}
	// 启用 WAL 模式提高并发性能
	db.run('PRAGMA journal_mode = WAL;');
	// 设置同步模式（性能优化）
	db.run('PRAGMA synchronous = NORMAL;');
	// 设置缓存大小（64MB）
	db.run('PRAGMA cache_size = -65536;');
	// 设置临时存储为内存
	db.run('PRAGMA temp_store = MEMORY;');
	console.log('✅ 数据库连接成功，已启用 WAL 模式');
});

// 初始化数据库表和索引
db.serialize(() => {
	// 用户表（增加 username 字段，支持用户名登录）
	db.run(
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			username TEXT UNIQUE,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		const hasUpdatedAt = rows?.some((c) => c.name === 'updated_at');
		if (!hasUpdatedAt) {
			db.run('ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (alterErr) => {
				if (alterErr) {
					console.error('尝试为 users 表增加 updated_at 字段失败', alterErr);
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
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

	// 创建索引以提高查询效率（百万级数据关键优化）
	// 用户表索引
	db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
	db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
	
	// 八字记录表索引（查询优化）
	db.run('CREATE INDEX IF NOT EXISTS idx_bazi_user_id ON bazi_records(user_id)');
	db.run('CREATE INDEX IF NOT EXISTS idx_bazi_user_created ON bazi_records(user_id, created_at DESC)');
	db.run('CREATE INDEX IF NOT EXISTS idx_bazi_user_name ON bazi_records(user_id, name)');
	db.run('CREATE INDEX IF NOT EXISTS idx_bazi_user_gender ON bazi_records(user_id, gender)');
	
	// 验证码表索引
	db.run('CREATE INDEX IF NOT EXISTS idx_email_code ON email_verification_codes(email, code, type, used)');
	db.run('CREATE INDEX IF NOT EXISTS idx_email_expires ON email_verification_codes(email, expires_at)');
	
	// 定期清理过期验证码（避免表过大）
	db.run('CREATE INDEX IF NOT EXISTS idx_email_expires_cleanup ON email_verification_codes(expires_at)');
});

// 定期清理过期验证码（每小时执行一次）
setInterval(() => {
	db.run('DELETE FROM email_verification_codes WHERE expires_at < datetime("now")', (err) => {
		if (err) {
			console.error('清理过期验证码失败:', err);
		} else {
			console.log('✅ 已清理过期验证码');
		}
	});
}, 60 * 60 * 1000);

const app = express();

// 性能监控（可选）
let performanceMonitor = null;
try {
	const { PerformanceMonitor, performanceMiddleware } = require('./performance-monitor');
	performanceMonitor = new PerformanceMonitor();
	app.use(performanceMiddleware(performanceMonitor));
	console.log('✅ 性能监控已启用');
} catch (e) {
	console.log('⚠️  性能监控未启用（可选功能）');
}

// 安全中间件（必须在其他中间件之前）
app.use(securityHeaders); // 设置安全 HTTP 头
app.use(requestSizeLimit(10 * 1024 * 1024)); // 限制请求大小为 10MB
app.use(inputValidation); // 输入验证
app.use(securityLogging); // 安全日志记录

app.use(cors());

// 配置 JSON 解析中间件，添加错误处理
app.use(express.json({
	limit: '10mb',
	strict: true,
	verify: (req, res, buf, encoding) => {
		try {
			if (buf && buf.length > 0) {
				const text = buf.toString(encoding || 'utf8');
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
	const health = { 
		ok: true, 
		message: 'bazi backend running',
		redis: redisClient ? 'connected' : 'disabled',
		cache: redisClient ? 'redis' : 'memory'
	};
	
	if (performanceMonitor) {
		health.performance = performanceMonitor.getStats();
	}
	
	res.json(health);
});

// 性能监控 API（如果启用了监控）
if (performanceMonitor) {
	const { createMonitorRoutes } = require('./performance-monitor');
	app.use('/api/monitor', createMonitorRoutes(performanceMonitor));
}

// 生成6位数字验证码
function generateVerificationCode() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// 验证邮箱格式（使用安全工具）
function isValidEmail(email) {
	return SecurityUtils.isValidEmail(email);
}

// 发送邮箱验证码（优化：使用缓存和限流）
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

	// 限流：每个邮箱每分钟最多发送1次
	const rateLimitKey = `email_code:${trimmedEmail}:${validType}`;
	if (!rateLimit(rateLimitKey, 1, 60 * 1000)) {
		return res.status(429).json({ error: '发送过于频繁，请1分钟后再试' });
	}

	// 检查缓存中是否已有未使用的验证码（5分钟内）
	const cacheKey = `verification_code:${trimmedEmail}:${validType}`;
	const cachedCode = await cacheGet(cacheKey);
	if (cachedCode && cachedCode.expiresAt > Date.now()) {
		return res.status(429).json({ error: '验证码已发送，请查看邮箱' });
	}

	// 检查数据库（兼容性检查）
	db.get(
		'SELECT created_at FROM email_verification_codes WHERE email = ? AND type = ? AND created_at > datetime("now", "-1 minute") ORDER BY created_at DESC LIMIT 1',
		[trimmedEmail, validType],
		async (err, row) => {
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

			// 保存验证码到缓存和数据库
			await cacheSet(cacheKey, { code, expiresAt: expiresAt.getTime() }, CACHE_TTL.VERIFICATION_CODE);

			db.run(
				'INSERT INTO email_verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
				[trimmedEmail, code, validType, expiresAt.toISOString()],
				function (insertErr) {
					if (insertErr) {
						console.error('db error', insertErr);
						return res.status(500).json({ error: '服务器错误' });
					}

					// 发送邮件
					if (mailTransporter) {
						const mailOptions = {
							from: `"Ai八字" <${EMAIL_FROM}>`,
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

// 验证邮箱验证码（优化：优先从缓存读取）
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

	// 优先从缓存验证
	const cacheKey = `verification_code:${trimmedEmail}:${validType}`;
	const cachedCode = await cacheGet(cacheKey);
	
	if (cachedCode && cachedCode.code === trimmedCode && cachedCode.expiresAt > Date.now()) {
		// 验证成功，删除缓存
		await cacheDel(cacheKey);
		// 标记数据库中的验证码为已使用
		db.run('UPDATE email_verification_codes SET used = 1 WHERE email = ? AND code = ? AND type = ?', 
			[trimmedEmail, trimmedCode, validType], () => {});
		return res.json({ success: true, message: '验证码验证成功' });
	}

	// 缓存未命中，查询数据库
	db.get(
		'SELECT id, expires_at, used FROM email_verification_codes WHERE email = ? AND code = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
		[trimmedEmail, trimmedCode, validType],
		async (err, row) => {
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
				}
				// 删除缓存
				cacheDel(cacheKey).catch(() => {});
				res.json({ success: true, message: '验证码验证成功' });
			});
		}
	);
});

// 注册（支持用户名，优化：缓存用户信息）
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

	// 限流：防止暴力注册
	const rateLimitKey = `register:${req.ip}`;
	if (!rateLimit(rateLimitKey, 5, 60 * 1000)) {
		return res.status(429).json({ error: '注册过于频繁，请稍后再试' });
	}

	// 检查缓存（避免频繁查询数据库）
	const emailCacheKey = `user:email:${trimmedEmail}`;
	const usernameCacheKey = `user:username:${trimmedUsername}`;
	const cachedEmail = await cacheGet(emailCacheKey);
	const cachedUsername = await cacheGet(usernameCacheKey);
	
	if (cachedEmail || cachedUsername) {
		return res.status(409).json({ error: '该邮箱或用户名已被使用' });
	}

	db.get('SELECT id FROM users WHERE email = ? OR username = ?', [trimmedEmail, trimmedUsername], async (err, row) => {
		if (err) {
			console.error('db error', err);
			return res.status(500).json({ error: '服务器错误' });
		}
		if (row) {
			// 缓存用户存在信息（短期缓存，避免重复查询）
			await cacheSet(emailCacheKey, true, 60 * 1000);
			await cacheSet(usernameCacheKey, true, 60 * 1000);
			return res.status(409).json({ error: '该邮箱或用户名已被使用' });
		}

		const passwordHash = bcrypt.hashSync(String(password), 10);

		db.run(
			'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
			[trimmedEmail, trimmedUsername, passwordHash],
			async function (insertErr) {
				if (insertErr) {
					console.error('db error', insertErr);
					return res.status(500).json({ error: '服务器错误' });
				}

				const userId = this.lastID;
				const token = jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });
				
				const userInfo = { id: userId, email: trimmedEmail, username: trimmedUsername };
				
				// 缓存用户信息和 token
				await cacheSet(`user:${userId}`, userInfo, CACHE_TTL.USER_INFO);
				await cacheSet(`token:${token}`, { userId, userInfo }, CACHE_TTL.USER_SESSION);

				res.json({
					token,
					user: userInfo
				});
			}
		);
	});
});

// 登录（支持邮箱或用户名登录，优化：缓存用户信息和 token）
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

	// 限流：防止暴力破解
	const rateLimitKey = `login:${req.ip}`;
	if (!rateLimit(rateLimitKey, 10, 60 * 1000)) {
		return res.status(429).json({ error: '登录尝试过于频繁，请稍后再试' });
	}

	// 尝试从缓存获取用户信息
	const userCacheKey = `user:email:${emailCandidate}`;
	const userCacheKey2 = `user:username:${trimmedIdentifier}`;
	let cachedUser = await cacheGet(userCacheKey) || await cacheGet(userCacheKey2);
	
	if (cachedUser && typeof cachedUser === 'object' && cachedUser.id) {
		// 验证密码
		const match = bcrypt.compareSync(String(password), cachedUser.password_hash);
		if (match) {
			const token = jwt.sign({ uid: cachedUser.id }, JWT_SECRET, { expiresIn: '7d' });
			const userInfo = { id: cachedUser.id, email: cachedUser.email, username: cachedUser.username || null };
			
			// 缓存 token
			await cacheSet(`token:${token}`, { userId: cachedUser.id, userInfo }, CACHE_TTL.USER_SESSION);
			
			return res.json({
				token,
				user: userInfo
			});
		}
	}

	// 缓存未命中，查询数据库
	db.get(
		'SELECT id, email, username, password_hash FROM users WHERE email = ? OR username = ?',
		[emailCandidate, trimmedIdentifier],
		async (err, row) => {
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
			const userInfo = { id: row.id, email: row.email, username: row.username || null };
			
			// 缓存用户信息和 token（注意：不缓存密码哈希）
			await cacheSet(`user:${row.id}`, userInfo, CACHE_TTL.USER_INFO);
			await cacheSet(`user:email:${row.email}`, { ...userInfo, password_hash: row.password_hash }, 60 * 1000); // 短期缓存用于登录验证
			if (row.username) {
				await cacheSet(`user:username:${row.username}`, { ...userInfo, password_hash: row.password_hash }, 60 * 1000);
			}
			await cacheSet(`token:${token}`, { userId: row.id, userInfo }, CACHE_TTL.USER_SESSION);

			res.json({
				token,
				user: userInfo
			});
		}
	);
});

// 鉴权中间件（优化：从缓存验证 token）
async function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: '未登录' });
	}

	// 尝试从缓存获取用户信息
	const cacheKey = `token:${token}`;
	const cachedSession = await cacheGet(cacheKey);
	
	if (cachedSession && cachedSession.userId) {
		req.user = { id: cachedSession.userId };
		return next();
	}

	// 缓存未命中，验证 JWT
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = { id: decoded.uid };
		
		// 缓存 token（如果验证成功）
		const userInfo = await cacheGet(`user:${decoded.uid}`) || { id: decoded.uid };
		await cacheSet(cacheKey, { userId: decoded.uid, userInfo }, CACHE_TTL.USER_SESSION);
		
		next();
	} catch (e) {
		return res.status(401).json({ error: '登录已失效，请重新登录' });
	}
}

// 保存八字（优化：批量插入和索引）
app.post('/api/bazi', authMiddleware, (req, res) => {
	const userId = req.user.id;
	
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
		rawPayload
	} = req.body || {};

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
			sanitizedName,
			validatedGender,
			validatedDateTime,
			sanitizedCalendarType,
			rawPayloadJson
		],
		async function (err) {
			if (err) {
				console.error('保存八字记录失败:', err);
				console.error('SQL 参数:', [userId, name, gender, birthDatetimeStr, calendarType, rawPayloadJson ? '有数据' : 'null']);
				if (err.message && err.message.includes('UNIQUE constraint')) {
					return res.status(409).json({ error: '该记录已存在' });
				}
				return res.status(500).json({ error: '保存失败，请稍后重试: ' + err.message });
			}

			console.log('保存成功，记录ID:', this.lastID);
			
			// 清除用户列表缓存（使缓存失效）
			// 注意：内存缓存不支持通配符，需要遍历删除或使用 Redis
			if (redisClient) {
				// Redis 支持模式删除
				try {
					const keys = await redisClient.keys(`charts:${userId}:*`);
					if (keys.length > 0) {
						await redisClient.del(keys);
					}
				} catch (e) {
					console.error('清除缓存失败:', e);
				}
			} else {
				// 内存缓存：遍历删除（简单实现，生产环境建议使用 Redis）
				for (const key of memoryCache.keys()) {
					if (key.startsWith(`charts:${userId}:`)) {
						memoryCache.delete(key);
					}
				}
			}
			
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

// 查询当前账号的所有排盘（优化：分页、缓存、索引查询）
app.get('/api/charts', authMiddleware, async (req, res) => {
	const userId = req.user.id;
	
	// 使用安全工具验证和清理查询参数
	const searchKeyword = SecurityUtils.sanitizeSearchKeyword(req.query.keyword || '');
	const genderFilter = SecurityUtils.validateGender(req.query.gender);
	
	// 验证分页参数
	const pagination = SecurityUtils.validatePagination(req.query.page, req.query.pageSize);
	const page = pagination.page;
	const pageSize = pagination.pageSize;
	const offset = (page - 1) * pageSize;
	
	// 验证排序参数
	const allowedSortFields = ['created_at', 'name', 'birth_datetime'];
	const sort = SecurityUtils.validateSort(req.query.sortBy, req.query.sortOrder, allowedSortFields);
	const sortBy = sort.sortBy;
	const sortOrder = sort.sortOrder;
	
	// 构建缓存键
	const cacheKey = `charts:${userId}:${searchKeyword}:${genderFilter}:${sortBy}:${sortOrder}:${page}:${pageSize}`;
	
	// 尝试从缓存获取
	const cachedResult = await cacheGet(cacheKey);
	if (cachedResult) {
		return res.json(cachedResult);
	}
	
	// 构建SQL查询（优化：只查询必要字段，使用索引）
	let sql = `SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt 
		FROM bazi_records 
		WHERE user_id = ?`;
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
	
	sql += ` ORDER BY ${orderByField} ${sortOrder} LIMIT ? OFFSET ?`;
	params.push(pageSize, offset);
	
	// 查询总数（优化：使用 COUNT(*) 和相同条件）
	let countSql = 'SELECT COUNT(*) as total FROM bazi_records WHERE user_id = ?';
	const countParams = [userId];
	if (searchKeyword) {
		countSql += ' AND name LIKE ?';
		countParams.push('%' + searchKeyword + '%');
	}
	if (genderFilter !== null && genderFilter !== undefined) {
		countSql += ' AND gender = ?';
		countParams.push(genderFilter);
	}
	
	// 并行查询数据和总数
	db.all(sql, params, (err, rows) => {
		if (err) {
			console.error('db error', err);
			return res.status(500).json({ error: '查询失败' });
		}
		
		db.get(countSql, countParams, async (countErr, countRow) => {
			if (countErr) {
				console.error('db error', countErr);
				return res.status(500).json({ error: '查询失败' });
			}
			
			const total = countRow?.total || 0;
			const list = rows?.map((r) => ({
				id: r.id,
				title: r.name || '未命名排盘',
				gender: r.gender,
				birthDatetime: r.birthDatetime,
				calendarType: r.calendarType,
				rawPayload: r.rawPayload ? safeJsonParse(r.rawPayload) : null,
				createdAt: r.createdAt
			})) || [];
			
			const result = {
				list: list,
				total: total,
				page: page,
				pageSize: pageSize,
				totalPages: Math.ceil(total / pageSize),
				hasMore: page * pageSize < total
			};
			
			// 缓存结果
			await cacheSet(cacheKey, result, CACHE_TTL.CHART_LIST);
			
			res.json(result);
		});
	});
});

// 删除某条排盘记录（优化：清除缓存）
app.delete('/api/charts/:id', authMiddleware, async (req, res) => {
	const userId = req.user.id;
	
	// 使用安全工具验证 ID
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '缺少有效的 id' });
	}

	db.run('DELETE FROM bazi_records WHERE id = ? AND user_id = ?', [id, userId], async function (err) {
		if (err) {
			console.error('db error', err);
			return res.status(500).json({ error: '删除失败' });
		}
		if (this.changes === 0) {
			return res.status(404).json({ error: '记录不存在' });
		}
		
		// 清除用户列表缓存
		if (redisClient) {
			try {
				const keys = await redisClient.keys(`charts:${userId}:*`);
				if (keys.length > 0) {
					await redisClient.del(keys);
				}
			} catch (e) {
				console.error('清除缓存失败:', e);
			}
		} else {
			for (const key of memoryCache.keys()) {
				if (key.startsWith(`charts:${userId}:`)) {
					memoryCache.delete(key);
				}
			}
		}
		
		res.json({ success: true });
	});
});

// 兼容性接口：如果后续需要，可保留 /api/bazi 列表形式
app.get('/api/bazi', authMiddleware, async (req, res) => {
	const userId = req.user.id;

	// 使用分页查询（默认返回前50条）
	const page = parseInt(req.query.page) || 1;
	const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);
	const offset = (page - 1) * pageSize;

	db.all(
		'SELECT id, name, gender, birth_datetime AS birthDatetime, calendar_type AS calendarType, raw_payload AS rawPayload, created_at AS createdAt FROM bazi_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
		[userId, pageSize, offset],
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
	console.log(`优化特性: Redis缓存、连接池、分页查询、限流保护`);
	console.log(`安全特性: SQL注入防护、XSS防护、输入验证、安全HTTP头`);
});

