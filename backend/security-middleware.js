// 安全中间件模块
// 提供 HTTP 安全头、输入验证、请求过滤等功能

const SecurityUtils = require('./security');
const config = require('./config');

/**
 * 设置安全 HTTP 头
 */
function securityHeaders(req, res, next) {
	// 防止 XSS 攻击
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('X-XSS-Protection', '1; mode=block');

	// 内容安全策略（完整版，包含 frame-ancestors）
	const connectSrcExtra = config.CSP_CONNECT_SRC ? String(config.CSP_CONNECT_SRC) : '';
	res.setHeader(
		'Content-Security-Policy',
		"default-src 'self'; " +
			"script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.statcounter.com; " +
			"script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.statcounter.com; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: blob: https://cdn.dcimg.net https://c.statcounter.com; " +
			`connect-src 'self' ${connectSrcExtra} https://c.statcounter.com https://www.statcounter.com ws: wss:; ` +
			"font-src 'self' data:; " +
			"object-src 'none'; " +
			"base-uri 'self'; " +
			"frame-ancestors 'none'"
	);

	// 严格传输安全（HTTPS）
	// res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

	// 引用策略
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

	next();
}

/**
 * 输入验证中间件
 * 检查请求体中的潜在注入攻击
 */
function inputValidation(req, res, next) {
	// 检查请求体
	if (req.body && typeof req.body === 'object') {
		const bodyStr = JSON.stringify(req.body);

		// 检查 SQL 注入模式
		if (SecurityUtils.containsSqlInjectionPattern(bodyStr)) {
			console.warn('检测到潜在的 SQL 注入攻击:', req.ip, req.path);
			return res.status(400).json({ error: '请求包含非法字符' });
		}

		// 检查 XSS 模式
		if (SecurityUtils.containsXssPattern(bodyStr)) {
			console.warn('检测到潜在的 XSS 攻击:', req.ip, req.path);
			return res.status(400).json({ error: '请求包含非法字符' });
		}
	}

	// 检查查询参数
	if (req.query && typeof req.query === 'object') {
		for (const [key, value] of Object.entries(req.query)) {
			if (typeof value === 'string') {
				if (
					SecurityUtils.containsSqlInjectionPattern(value) ||
					SecurityUtils.containsXssPattern(value)
				) {
					console.warn('检测到潜在的注入攻击（查询参数）:', req.ip, req.path, key);
					return res.status(400).json({ error: '请求参数包含非法字符' });
				}
			}
		}
	}

	// 检查路径参数
	if (req.params && typeof req.params === 'object') {
		for (const [key, value] of Object.entries(req.params)) {
			if (typeof value === 'string') {
				if (
					SecurityUtils.containsSqlInjectionPattern(value) ||
					SecurityUtils.containsXssPattern(value)
				) {
					console.warn('检测到潜在的注入攻击（路径参数）:', req.ip, req.path, key);
					return res.status(400).json({ error: '请求参数包含非法字符' });
				}
			}
		}
	}

	next();
}

/**
 * 请求大小限制中间件
 */
function requestSizeLimit(maxSize = 10 * 1024 * 1024) {
	// 默认 10MB
	return (req, res, next) => {
		const contentLength = parseInt(req.headers['content-length'] || '0');

		if (contentLength > maxSize) {
			return res.status(413).json({ error: '请求体过大' });
		}

		next();
	};
}

/**
 * 请求频率限制（增强版）
 */
function enhancedRateLimit(rateLimitMap, key, maxRequests, windowMs) {
	const now = Date.now();
	const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs, blocked: false };

	// 如果被阻止，检查是否已过阻止期
	if (record.blocked && now > record.resetAt) {
		record.count = 0;
		record.resetAt = now + windowMs;
		record.blocked = false;
	}

	// 如果被阻止，直接拒绝
	if (record.blocked) {
		return false;
	}

	// 重置计数器
	if (now > record.resetAt) {
		record.count = 1;
		record.resetAt = now + windowMs;
		record.blocked = false;
		rateLimitMap.set(key, record);
		return true;
	}

	// 检查是否超过限制
	if (record.count >= maxRequests) {
		// 超过限制，阻止一段时间
		record.blocked = true;
		record.resetAt = now + windowMs * 2; // 阻止时间为窗口的2倍
		rateLimitMap.set(key, record);
		return false;
	}

	record.count++;
	rateLimitMap.set(key, record);
	return true;
}

/**
 * IP 白名单/黑名单中间件（可选）
 */
function ipFilter(allowedIPs = [], blockedIPs = []) {
	return (req, res, next) => {
		const clientIP = req.ip || req.connection.remoteAddress;

		// 检查黑名单
		if (blockedIPs.length > 0 && blockedIPs.includes(clientIP)) {
			console.warn('被阻止的 IP 尝试访问:', clientIP);
			return res.status(403).json({ error: '访问被拒绝' });
		}

		// 检查白名单（如果设置了白名单）
		if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
			console.warn('未授权的 IP 尝试访问:', clientIP);
			return res.status(403).json({ error: '访问被拒绝' });
		}

		next();
	};
}

/**
 * 日志记录中间件（记录可疑请求）
 */
function securityLogging(req, res, next) {
	const originalSend = res.send;

	res.send = function (data) {
		// 记录错误响应
		if (res.statusCode >= 400) {
			const logData = {
				ip: req.ip,
				method: req.method,
				path: req.path,
				statusCode: res.statusCode,
				userAgent: req.headers['user-agent'],
				timestamp: new Date().toISOString(),
			};

			// 定义正常业务错误的路径和状态码组合（不记录为安全警告）
			const normalBusinessErrors = [
				{ path: '/api/login', statusCodes: [401] }, // 登录失败是正常业务
				{ path: '/api/register', statusCodes: [400, 409] }, // 注册失败是正常业务
				{ path: '/api/reset-password', statusCodes: [400, 401, 404] }, // 密码重置失败是正常业务
			];

			// 检查是否是正常业务错误
			const isNormalError = normalBusinessErrors.some((rule) => {
				return req.path === rule.path && rule.statusCodes.includes(res.statusCode);
			});

			if (isNormalError) {
				// 正常业务错误，使用 info 级别记录（可选，也可以不记录）
				// console.log('业务错误:', logData);
			} else if (res.statusCode >= 500) {
				// 服务器错误，使用 error 级别
				console.error('服务器错误:', logData);
			} else if (res.statusCode === 403 || res.statusCode === 429) {
				// 真正的安全威胁：禁止访问或频率限制
				console.warn('安全警告:', logData);
			} else if (res.statusCode >= 400) {
				// 其他客户端错误，使用 warn 但标记为一般错误
				console.warn('请求错误:', logData);
			}
		}

		return originalSend.call(this, data);
	};

	next();
}

module.exports = {
	securityHeaders,
	inputValidation,
	requestSizeLimit,
	enhancedRateLimit,
	ipFilter,
	securityLogging,
};
