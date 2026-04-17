// Security middleware module.
// Provides HTTP headers, input validation, request filtering, and security logs.

const SecurityUtils = require('./security');
const config = require('./config');

function toBoolean(value, defaultValue = false) {
	if (value === undefined || value === null || value === '') return defaultValue;
	const normalized = String(value).trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	return defaultValue;
}

function buildCspValue() {
	const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
	const connectSrcExtra = config.CSP_CONNECT_SRC ? String(config.CSP_CONNECT_SRC).trim() : '';

	// Production defaults: inline/eval disabled unless explicitly enabled.
	const allowUnsafeInline = toBoolean(config.CSP_ALLOW_UNSAFE_INLINE, !isProd);
	const allowUnsafeEval = toBoolean(config.CSP_ALLOW_UNSAFE_EVAL, !isProd);

	const scriptSrc = ["'self'", 'blob:'];
	const scriptSrcElem = ["'self'", 'blob:'];
	const styleSrc = ["'self'"];

	if (allowUnsafeInline) {
		scriptSrc.push("'unsafe-inline'");
		scriptSrcElem.push("'unsafe-inline'");
		styleSrc.push("'unsafe-inline'");
	}
	if (allowUnsafeEval) {
		scriptSrc.push("'unsafe-eval'");
		scriptSrcElem.push("'unsafe-eval'");
	}

	const connectSrc = ["'self'", 'ws:', 'wss:'];
	if (connectSrcExtra) {
		connectSrc.push(connectSrcExtra);
	}

	return [
		`default-src 'self'`,
		`script-src ${scriptSrc.join(' ')}`,
		`script-src-elem ${scriptSrcElem.join(' ')}`,
		`style-src ${styleSrc.join(' ')}`,
		`img-src 'self' data: blob: https://cdn.dcimg.net`,
		`connect-src ${connectSrc.join(' ')}`,
		`font-src 'self' data:`,
		`object-src 'none'`,
		`base-uri 'self'`,
		`frame-ancestors 'none'`,
	].join('; ');
}

/**
 * Validate Host header against allowed hosts whitelist.
 */
function hostHeaderValidation(req, res, next) {
	const allowedHostsRaw = process.env.ALLOWED_HOSTS;
	const allowedHosts = allowedHostsRaw
		? allowedHostsRaw.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
		: ['localhost', '127.0.0.1', '::1', '[::1]'];

	const rawHost = req.headers.host;
	if (!rawHost) {
		return next();
	}

	const host = rawHost.split(':')[0].toLowerCase();

	if (allowedHosts.length > 0 && !allowedHosts.includes(host)) {
		console.warn('Host header validation failed:', rawHost, 'from', req.ip);
		return res.status(400).json({ error: 'Invalid host header' });
	}

	next();
}

/**
 * Set secure HTTP headers.
 */
function securityHeaders(req, res, next) {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('X-XSS-Protection', '1; mode=block');
	res.setHeader('Content-Security-Policy', buildCspValue());

	const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
	if (isProd) {
		res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	next();
}

/**
 * Validate input and block obvious injection payloads.
 */
function inputValidation(req, res, next) {
	if (req.body && typeof req.body === 'object') {
		const bodyStr = JSON.stringify(req.body);

		if (SecurityUtils.containsSqlInjectionPattern(bodyStr)) {
			console.warn('Potential SQL injection pattern detected:', req.ip, req.path);
			return res.status(400).json({ error: 'Request contains invalid characters' });
		}

		if (SecurityUtils.containsXssPattern(bodyStr)) {
			console.warn('Potential XSS pattern detected:', req.ip, req.path);
			return res.status(400).json({ error: 'Request contains invalid characters' });
		}
	}

	if (req.query && typeof req.query === 'object') {
		for (const [key, value] of Object.entries(req.query)) {
			if (typeof value !== 'string') continue;
			if (
				SecurityUtils.containsSqlInjectionPattern(value) ||
				SecurityUtils.containsXssPattern(value)
			) {
				console.warn('Potential injection in query parameter:', req.ip, req.path, key);
				return res.status(400).json({ error: 'Request parameters contain invalid characters' });
			}
		}
	}

	if (req.params && typeof req.params === 'object') {
		for (const [key, value] of Object.entries(req.params)) {
			if (typeof value !== 'string') continue;
			if (
				SecurityUtils.containsSqlInjectionPattern(value) ||
				SecurityUtils.containsXssPattern(value)
			) {
				console.warn('Potential injection in path parameter:', req.ip, req.path, key);
				return res.status(400).json({ error: 'Request parameters contain invalid characters' });
			}
		}
	}

	next();
}

/**
 * Request size limiter middleware.
 */
function requestSizeLimit(maxSize = 10 * 1024 * 1024) {
	return (req, res, next) => {
		const contentLength = parseInt(req.headers['content-length'] || '0', 10);
		if (contentLength > maxSize) {
			return res.status(413).json({ error: 'Request body too large' });
		}
		next();
	};
}

/**
 * Enhanced in-memory rate limiting helper.
 */
function enhancedRateLimit(rateLimitMap, key, maxRequests, windowMs) {
	const now = Date.now();
	const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs, blocked: false };

	if (record.blocked && now > record.resetAt) {
		record.count = 0;
		record.resetAt = now + windowMs;
		record.blocked = false;
	}

	if (record.blocked) {
		return false;
	}

	if (now > record.resetAt) {
		record.count = 1;
		record.resetAt = now + windowMs;
		record.blocked = false;
		rateLimitMap.set(key, record);
		return true;
	}

	if (record.count >= maxRequests) {
		record.blocked = true;
		record.resetAt = now + windowMs * 2;
		rateLimitMap.set(key, record);
		return false;
	}

	record.count++;
	rateLimitMap.set(key, record);
	return true;
}

/**
 * Optional IP allow/block list middleware.
 */
function ipFilter(allowedIPs = [], blockedIPs = []) {
	return (req, res, next) => {
		const clientIP = req.ip || req.connection.remoteAddress;

		if (blockedIPs.length > 0 && blockedIPs.includes(clientIP)) {
			console.warn('Blocked IP attempted access:', clientIP);
			return res.status(403).json({ error: 'Access denied' });
		}

		if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
			console.warn('Unauthorized IP attempted access:', clientIP);
			return res.status(403).json({ error: 'Access denied' });
		}

		next();
	};
}

/**
 * Security logging middleware.
 */
function securityLogging(req, res, next) {
	const originalSend = res.send;

	res.send = function patchedSend(data) {
		if (res.statusCode >= 400) {
			const logData = {
				ip: req.ip,
				method: req.method,
				path: req.path,
				statusCode: res.statusCode,
				userAgent: req.headers['user-agent'],
				timestamp: new Date().toISOString(),
			};

			const normalBusinessErrors = [
				{ path: '/api/login', statusCodes: [401] },
				{ path: '/api/register', statusCodes: [400, 409] },
				{ path: '/api/reset-password', statusCodes: [400, 401, 404] },
			];

			const isNormalError = normalBusinessErrors.some((rule) => {
				return req.path === rule.path && rule.statusCodes.includes(res.statusCode);
			});

			if (isNormalError) {
				// intentionally keep quiet for expected business errors
			} else if (res.statusCode >= 500) {
				console.error('Server error:', logData);
			} else if (res.statusCode === 403 || res.statusCode === 429) {
				console.warn('Security warning:', logData);
			} else {
				console.warn('Request error:', logData);
			}
		}

		return originalSend.call(this, data);
	};

	next();
}

module.exports = {
	hostHeaderValidation,
	securityHeaders,
	inputValidation,
	requestSizeLimit,
	enhancedRateLimit,
	ipFilter,
	securityLogging,
};
