/**
 * 后端主入口文件
 * 仅支持 MySQL
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { initDatabase, getDatabase, autoInitMySQLTables } = require('./db');
const ConfigService = require('./config-service');
const { initTables } = require('./database/init');
const { loadEmailConfig } = require('./services/email');
const { initWebSocketServer } = require('./websocket/server');
const config = require('./config');

// 安全防护模块
const SecurityUtils = require('./security');
const {
	securityHeaders,
	inputValidation,
	requestSizeLimit,
	securityLogging,
} = require('./security-middleware');

// 路由
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const emailRouter = require('./routes/email');
const baziRouter = require('./routes/bazi');
const llmRouter = require('./routes/llm');
const adminRouter = require('./routes/admin');

const PORT = config.PORT;
const CORS_ORIGINS = config.CORS_ORIGINS;

if (!process.env.JWT_SECRET) {
	console.warn('⚠️  JWT_SECRET 未设置，正在使用默认值。请在生产环境配置安全的随机字符串。');
}

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// 安全中间件（必须在其他中间件之前）
app.use(securityHeaders);
app.use(requestSizeLimit(10 * 1024 * 1024));
app.use(inputValidation);
app.use(securityLogging);

// Cookie 解析中间件（用于 H5 场景的 refresh token）
app.use(cookieParser());

// 跨域配置：支持 H5、小程序、App 多端
app.use(
	cors({
		origin: function (origin, callback) {
			// 1. 如果没有 origin（App、部分小程序请求、同源请求、Postman 等），直接允许
			if (!origin) {
				return callback(null, true);
			}

			// 2. 开发环境：允许所有来源（方便开发调试）
			if (process.env.NODE_ENV !== 'production') {
				return callback(null, origin);
			}

			// 3. 生产环境：处理有 origin 的请求（主要是 H5 浏览器请求）
			// 3.1 微信小程序的特殊 origin，直接允许
			if (origin.includes('servicewechat.com') || origin.includes('weixin.qq.com')) {
				return callback(null, true);
			}

			// 3.2 如果配置了 CORS_ORIGINS，检查是否在允许列表中（主要用于 H5）
			if (CORS_ORIGINS.length > 0) {
				if (CORS_ORIGINS.includes(origin)) {
					return callback(null, origin);
				} else {
					console.warn(`CORS 拒绝来源: ${origin}，允许的域名: ${CORS_ORIGINS.join(', ')}`);
					return callback(new Error('Not allowed by CORS'));
				}
			}

			// 3.3 如果没有配置 CORS_ORIGINS，允许所有来源（不推荐，但为了兼容性保留）
			console.warn('⚠️  生产环境未配置 CORS_ORIGINS，允许所有来源（不推荐）');
			return callback(null, origin);
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
		exposedHeaders: ['Content-Type'],
		optionsSuccessStatus: 200,
	})
);

// 配置 JSON 解析中间件，添加错误处理
app.use(
	express.json({
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
		},
	})
);

// 路由
app.use('/api', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/email', emailRouter);
app.use('/api/bazi', baziRouter);
app.use('/api/llm', llmRouter);
app.use('/api/admin', adminRouter);

// 兼容旧接口（重定向到新接口）
app.post('/api/login', (req, res) => {
	req.url = '/api/auth/login';
	app._router.handle(req, res);
});

// 404处理（必须在所有路由之后，错误处理之前）
app.use((req, res) => {
	res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
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

/**
 * 启动服务器
 */
async function bootstrap() {
	try {
		// 初始化数据库连接
		await initDatabase();
		const db = getDatabase();

		if (db.pool) {
			await autoInitMySQLTables(db.pool);
		}

		// 初始化数据库表
		await initTables();
		await ConfigService.initTable(db);
		
		// 加载邮件配置
		await loadEmailConfig();

		// 创建 HTTP 服务器
		const server = http.createServer(app);

		// 初始化 WebSocket 服务器
		initWebSocketServer(server);

		// 启动服务器
		server.listen(PORT, () => {
			console.log(`Bazi backend listening on http://localhost:${PORT}`);
		});
	} catch (err) {
		console.error('服务器启动失败，原因:', err.message || err);
		process.exit(1);
	}
}

bootstrap();
