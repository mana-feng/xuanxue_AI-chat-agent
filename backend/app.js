/**
 * 后端主入口文件
 * 仅支持 MySQL
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const https = require('https');
const net = require('net');
const { initDatabase, getDatabase, autoInitMySQLTables } = require('./db');
const ConfigService = require('./config-service');
const { initTables } = require('./database/init');
const { loadEmailConfig } = require('./services/email');
const { initWebSocketServer } = require('./websocket/server');
const config = require('./config');
const responseWrapper = require('./middleware/response-wrapper');

// 安全防护模块
const SecurityUtils = require('./security');
const {
	securityHeaders,
	inputValidation,
	requestSizeLimit,
	securityLogging,
} = require('./security-middleware');

const PORT = config.PORT;
const CORS_ORIGINS = config.CORS_ORIGINS;
const DEV_PROXY_FRONTEND = process.env.DEV_PROXY_FRONTEND === 'true';
const FRONTEND_DEV_HOST = process.env.FRONTEND_DEV_HOST || 'localhost';
const FRONTEND_DEV_PORT = process.env.FRONTEND_DEV_PORT ? Number(process.env.FRONTEND_DEV_PORT) : 3000;

if (!process.env.JWT_SECRET) {
	console.warn('⚠️  JWT_SECRET 未设置，正在使用默认值。请在生产环境配置安全的随机字符串。');
}

const app = express();

// 安全中间件（必须在其他中间件之前）
app.use(securityHeaders);
app.use(requestSizeLimit(config.REQUEST_SIZE_LIMIT));
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
			// 2. 处理有 origin 的请求（主要是 H5 浏览器请求）
			// 2.1 微信小程序的特殊 origin，直接允许
			if (origin.includes('servicewechat.com') || origin.includes('weixin.qq.com')) {
				return callback(null, true);
			}
			// 2.2 如果配置了 CORS_ORIGINS，检查是否在允许列表中（主要用于 H5）
			if (CORS_ORIGINS.length > 0) {
				if (CORS_ORIGINS.includes(origin)) {
					return callback(null, origin);
				} else {
					console.warn(`CORS 拒绝来源: ${origin}，允许的域名: ${CORS_ORIGINS.join(', ')}`);
					return callback(new Error('Not allowed by CORS'));
				}
			}
			// 2.3 如果没有配置 CORS_ORIGINS，允许所有来源（不推荐，但为了兼容性保留）
			console.warn('⚠️  生产环境未配置 CORS_ORIGINS，允许所有来源（不推荐）');
			return callback(null, origin);
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		// 包含大小写两种写法以兼容部分客户端发送的小写 header
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-Device-Id',
			'X-Timestamp',
			'X-Nonce',
			'X-Signature',
			'X-Refresh-Token',
			'x-device-id',
			'x-timestamp',
			'x-nonce',
			'x-signature',
			'x-refresh-token',
		],
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

// 统一响应格式
app.use(responseWrapper);

/**
 * 启动服务器
 */
async function bootstrap() {
	try {
		let skipDb = process.env.SKIP_DB === 'true';
		let dbUnavailableMessage = '';

		// 启动前先检测端口占用，避免 EADDRINUSE 直接抛出未处理错误
		await ensurePortAvailable(PORT);

		let baziRouter = null;
		const indexRouter = require('./routes/index');
		app.use('/api', indexRouter);

		if (!skipDb) {
			try {
				await initDatabase();
				const db = getDatabase();

				if (db.pool) {
					await autoInitMySQLTables(db.pool);
				}

				await initTables();
				await ConfigService.initTable(db);
				await loadEmailConfig();
			} catch (e) {
				skipDb = true;
				dbUnavailableMessage = e?.message ? String(e.message) : 'MySQL 不可用';
				console.warn(`⚠️  MySQL 不可用，后端将以降级模式启动（仅提供基础接口）。原因: ${dbUnavailableMessage}`);
			}
		}

		if (!skipDb) {
			const authRouter = require('./routes/auth');
			const emailRouter = require('./routes/email');
			baziRouter = require('./routes/bazi');
			const liuyaoRouter = require('./routes/liuyao');
			const llmRouter = require('./routes/llm');
			const adminRouter = require('./routes/admin');
			const announcementRouter = require('./routes/announcement');

			app.use('/api/auth', authRouter);
			app.use('/api/email', emailRouter);
			app.use('/api/bazi', baziRouter);
			app.use('/api/liuyao', liuyaoRouter);
			app.use('/api/llm', llmRouter);
			app.use('/api/admin', adminRouter);
			app.use('/api/announcements', announcementRouter);
			app.use('/api/charts', (req, res, next) => {
				req.url = '/charts' + (req.url === '/' ? '' : req.url);
				return baziRouter(req, res, next);
			});
		} else {
			app.use('/api', (req, res, next) => {
				if (req.path === '/health' || req.path === '/config/bootstrap') return next();
				return res.status(503).json({
					success: false,
					error: '数据库不可用',
					message: dbUnavailableMessage || '数据库不可用',
				});
			});
		}

		if (DEV_PROXY_FRONTEND) {
			app.use((req, res, next) => {
				if (req.path.startsWith('/api')) return next();

				const proxyReq = http.request(
					{
						hostname: FRONTEND_DEV_HOST,
						port: FRONTEND_DEV_PORT,
						path: req.originalUrl,
						method: req.method,
						headers: {
							...req.headers,
							host: `${FRONTEND_DEV_HOST}:${FRONTEND_DEV_PORT}`,
						},
					},
					(proxyRes) => {
						res.statusCode = proxyRes.statusCode || 502;
						for (const [key, value] of Object.entries(proxyRes.headers)) {
							if (value === undefined) continue;
							res.setHeader(key, value);
						}
						proxyRes.pipe(res);
					}
				);

				proxyReq.on('error', (e) => {
					res.status(502).json({ error: `前端代理失败: ${e.message}` });
				});

				proxyReq.end();
			});
		}

		// 兼容旧接口（重定向到新接口）
		app.post('/api/login', (req, res) => {
			req.url = '/api/auth/login';
			app._router.handle(req, res);
		});

		// Admin UI (H5 build) static hosting (Merged on same port)
		const adminUiPath = path.join(__dirname, 'admin-ui', 'dist', 'build', 'h5');
		
		if (fs.existsSync(adminUiPath)) {
			console.log(`Serving Admin UI from ${adminUiPath}`);
			// 启用 gzip 压缩 (for static assets)
			const compression = require('compression');
			app.use(compression());

			// 静态文件服务
			app.use(express.static(adminUiPath));
			
			// SPA 路由回退到 index.html
			app.get('*', (req, res, next) => {
				// 如果是 API 请求，跳过（交给后面的 404 处理）
				if (req.path.startsWith('/api')) {
					return next();
				}
				res.sendFile(path.join(adminUiPath, 'index.html'));
			});
		} else {
			console.warn('Admin UI build not found. Run admin-ui build to enable Admin UI.');
		}

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

		const httpsKeyPath = path.join(__dirname, '..', 'cert', 'localhost-key.pem');
		const httpsCertPath = path.join(__dirname, '..', 'cert', 'localhost.pem');
		const certAvailable = fs.existsSync(httpsKeyPath) && fs.existsSync(httpsCertPath);
		const useHttps = certAvailable;

		const server = useHttps
			? https.createServer(
					{
						key: fs.readFileSync(httpsKeyPath),
						cert: fs.readFileSync(httpsCertPath),
					},
					app
				)
			: http.createServer(app);

		// 监听底层错误，提供更明确的提示
		server.on('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				console.error(`端口 ${PORT} 已被占用。请关闭占用进程或设置环境变量 PORT 指定其他端口。`);
				process.exit(1);
			}
			console.error('服务器错误:', err);
			process.exit(1);
		});

		// 初始化 WebSocket 服务器
		if (!skipDb) {
			initWebSocketServer(server);
		}

		if (DEV_PROXY_FRONTEND) {
			server.on('upgrade', (req, socket, head) => {
				if (req.url && req.url.startsWith('/api/llm/chat/ws')) {
					return;
				}

				const targetSocket = net.connect(FRONTEND_DEV_PORT, FRONTEND_DEV_HOST, () => {
					const headers = Object.entries(req.headers)
						.filter(([k]) => k.toLowerCase() !== 'host')
						.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
						.join('\r\n');

					targetSocket.write(
						`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\nhost: ${FRONTEND_DEV_HOST}:${FRONTEND_DEV_PORT}\r\n\r\n`
					);
					if (head && head.length > 0) {
						targetSocket.write(head);
					}
					socket.pipe(targetSocket).pipe(socket);
				});

				targetSocket.on('error', () => {
					socket.destroy();
				});
			});
		}

		// 启动服务器
		server.listen(PORT, () => {
			console.log(`Bazi backend listening on ${useHttps ? 'https' : 'http'}://localhost:${PORT}`);
		});
	} catch (err) {
		console.error('服务器启动失败，原因:', err.message || err);
		process.exit(1);
	}
}

/**
 * 检测端口是否可用，不可用时给出友好提示并退出
 * @param {number} port
 */
function ensurePortAvailable(port) {
	return new Promise((resolve, reject) => {
		const tester = net
			.createServer()
			.once('error', (err) => {
				if (err.code === 'EADDRINUSE') {
					console.error(`端口 ${port} 已被占用。请关闭占用进程或设置环境变量 PORT 指定其他端口。`);
					process.exit(1);
				}
				reject(err);
			})
			.once('listening', () => {
				tester.close(resolve);
			})
			.listen(port, '0.0.0.0');
	});
}

bootstrap();
