/**
 * Backend entry point
 * MySQL only
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const net = require('net');

const { initDatabase, getDatabase, autoInitMySQLTables } = require('./db');
const ConfigService = require('./config-service');
const { initTables } = require('./database/init');
const { initScheduler } = require('./services/scheduler');
const { loadEmailConfig } = require('./services/email');
const { initWebSocketServer } = require('./websocket/server');
const config = require('./config');
const responseWrapper = require('./middleware/response-wrapper');
const {
	normalizeStatusCode,
	resolvePublicErrorMessage,
	sanitizeErrorForLog,
} = require('./utils/error-sanitizer');
const { getErrorCode } = require('./utils/response');

const {
	securityHeaders,
	inputValidation,
	requestSizeLimit,
	securityLogging,
} = require('./security-middleware');

const PORT = config.PORT;
const CORS_ORIGINS = config.CORS_ORIGINS;
const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const HTTPS_ENABLED = Boolean(config.HTTPS_ENABLED);
const HTTPS_CERT_PATH = config.HTTPS_CERT_PATH;
const HTTPS_KEY_PATH = config.HTTPS_KEY_PATH;
const TRUST_PROXY = process.env.TRUST_PROXY;

function isLocalDevOrigin(origin) {
	if (!origin || typeof origin !== 'string') return false;
	try {
		const url = new URL(origin);
		if (!['http:', 'https:'].includes(url.protocol)) return false;
		const host = (url.hostname || '').toLowerCase();
		return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
	} catch (e) {
		return false;
	}
}

function resolveCertPath(inputPath, fallbackRelativePath) {
	if (typeof inputPath === 'string' && inputPath.trim()) {
		const raw = inputPath.trim();
		return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
	}
	return path.join(__dirname, fallbackRelativePath);
}

function resolveTrustProxySetting(rawValue, isProd) {
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return isProd ? 1 : false;
	}

	const normalized = String(rawValue).trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;

	const asNumber = Number(normalized);
	if (Number.isFinite(asNumber) && asNumber >= 0) {
		return asNumber;
	}

	return String(rawValue);
}

const app = express();
app.set('trust proxy', resolveTrustProxySetting(TRUST_PROXY, IS_PROD));

// Security middlewares
app.use(securityHeaders);
app.use(requestSizeLimit(config.REQUEST_SIZE_LIMIT));
app.use(inputValidation);
app.use(securityLogging);

// For refresh token cookie in browser flow
app.use(cookieParser());

// CORS for H5 / mini program / App
app.use(
	cors({
		origin(origin, callback) {
			// App, server-to-server and same-origin cases may not send Origin
			if (!origin) {
				return callback(null, true);
			}

			if (!IS_PROD && isLocalDevOrigin(origin)) {
				return callback(null, origin);
			}

			// Wechat mini program origins
			if (origin.includes('servicewechat.com') || origin.includes('weixin.qq.com')) {
				return callback(null, true);
			}

			if (CORS_ORIGINS.length > 0) {
				if (CORS_ORIGINS.includes(origin)) {
					return callback(null, origin);
				}
				console.warn(
					`CORS reject origin: ${origin}. allowed=${CORS_ORIGINS.join(', ')}`
				);
				return callback(null, false);
			}

			if (IS_PROD) {
				console.error(
					`CORS misconfigured: CORS_ORIGINS is empty in production. reject origin=${origin}`
				);
				return callback(null, false);
			}

			console.warn(`CORS_ORIGINS empty in development, allow origin=${origin}`);
			return callback(null, origin);
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
				console.error('Request body verify failed:', e);
			}
		},
	})
);

app.use(responseWrapper);

async function bootstrap() {
	try {
		let skipDb = process.env.SKIP_DB === 'true';
		let dbUnavailableMessage = '';

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
				initScheduler();
			} catch (e) {
				skipDb = true;
				dbUnavailableMessage = e?.message ? String(e.message) : 'MySQL unavailable';
				console.warn(
					`MySQL unavailable. backend starts in degraded mode. reason=${dbUnavailableMessage}`
				);
			}
		}

		if (!skipDb) {
			const authRouter = require('./routes/auth');
			const emailRouter = require('./routes/email');
			baziRouter = require('./routes/bazi');
			const liuyaoRouter = require('./routes/liuyao');
			const ziweiRouter = require('./routes/ziwei');
			const llmRouter = require('./routes/llm');
			const adminRouter = require('./routes/admin');
			const announcementRouter = require('./routes/announcement');

			app.use('/api/auth', authRouter);
			app.use('/api/email', emailRouter);
			app.use('/api/bazi', baziRouter);
			app.use('/api/liuyao', liuyaoRouter);
			app.use('/api/ziwei', ziweiRouter);
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
					error: 'Database unavailable',
					message: dbUnavailableMessage || 'Database unavailable',
				});
			});
		}

		app.post('/api/login', (req, res) => {
			req.url = '/api/auth/login';
			app._router.handle(req, res);
		});

		app.use((req, res) => {
			res.status(404).json({ error: 'Not found' });
		});

		app.use((err, req, res, next) => {
			if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
				console.error('JSON parse error:', sanitizeErrorForLog(err));
				console.error('path:', req.path);
				console.error('method:', req.method);
				console.error('content-type:', req.headers['content-type']);
				return res.status(400).json({ error: '请求 JSON 格式不正确' });
			}
			return next(err);
		});

		app.use((err, req, res, next) => {
			if (res.headersSent) {
				return next(err);
			}

			const statusCode = normalizeStatusCode(err?.statusCode || err?.status || 500);
			const code = typeof err?.code === 'string' && err.code ? err.code : getErrorCode(statusCode);
			const message = resolvePublicErrorMessage({
				statusCode,
				rawMessage: err?.publicMessage || err?.message || 'Request failed',
			});

			console.error('Unhandled server error:', {
				path: req.path,
				method: req.method,
				statusCode,
				code,
				...sanitizeErrorForLog(err),
			});

			return res.status(statusCode).json({ error: message, code });
		});

		let server;
		let isHttps = false;
		try {
			const certPath = resolveCertPath(HTTPS_CERT_PATH, '../cert/localhost.pem');
			const keyPath = resolveCertPath(HTTPS_KEY_PATH, '../cert/localhost-key.pem');
			const hasCertFiles = fs.existsSync(certPath) && fs.existsSync(keyPath);
			const shouldUseHttps = HTTPS_ENABLED || hasCertFiles;

			if (shouldUseHttps && hasCertFiles) {
				const options = {
					key: fs.readFileSync(keyPath),
					cert: fs.readFileSync(certPath),
				};
				server = https.createServer(options, app);
				isHttps = true;
				console.log(`HTTPS enabled. cert=${certPath}, key=${keyPath}`);
			} else if (HTTPS_ENABLED && !hasCertFiles) {
				throw new Error(
					`HTTPS_ENABLED=true but certificate files are missing. cert=${certPath}, key=${keyPath}`
				);
			} else {
				server = http.createServer(app);
				console.log('HTTPS not enabled; using HTTP.');
			}
		} catch (e) {
			if (HTTPS_ENABLED) {
				console.error('HTTPS initialization failed:', e);
				throw e;
			}
			console.error('Failed to load HTTPS certificate, fallback to HTTP:', e);
			server = http.createServer(app);
		}

		server.on('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				console.error(`Port ${PORT} is already in use.`);
				process.exit(1);
			}
			console.error('Server error:', err);
			process.exit(1);
		});

		if (!skipDb) {
			initWebSocketServer(server);
		}

		server.listen(PORT, () => {
			const protocol = isHttps ? 'https' : 'http';
			console.log(`Bazi backend listening on ${protocol}://0.0.0.0:${PORT}`);
		});
	} catch (err) {
		console.error('Failed to bootstrap server:', err.message || err);
		process.exit(1);
	}
}

function ensurePortAvailable(port) {
	return new Promise((resolve, reject) => {
		const tester = net
			.createServer()
			.once('error', (err) => {
				if (err.code === 'EADDRINUSE') {
					console.error(`Port ${port} is already in use.`);
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
