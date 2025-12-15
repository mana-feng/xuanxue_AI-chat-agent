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

const refreshLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

module.exports = {
	authLimiter,
	strictLimiter,
	refreshLimiter,
};

