/**
 * 速率限制配置
 */
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

// 速率限制 key：使用官方 ipKeyGenerator 兼容 IPv6，再叠加设备ID
const rateKey = (req) => {
	const ipKey = ipKeyGenerator(req);
	return `${ipKey}-${req.headers['x-device-id'] || 'nodevice'}`;
};

const authLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

const strictLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

const isProd = process.env.NODE_ENV === 'production';

const refreshLimiter = rateLimit({
	windowMs: 60 * 1000,
	// 适当放宽刷新频率，避免连续请求时触发 429 导致登录态恢复失败
	max: 200,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

const llmLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

module.exports = {
	authLimiter,
	strictLimiter,
	refreshLimiter,
	llmLimiter,
};

