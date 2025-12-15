/**
 * 速率限制配置示例文件
 * 复制此文件为 config/rateLimit.js 并修改配置
 */

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

// 速率限制 key：使用官方 ipKeyGenerator 兼容 IPv6，再叠加设备ID
const rateKey = (req) => {
	const ipKey = ipKeyGenerator(req);
	return `${ipKey}-${req.headers['x-device-id'] || 'nodevice'}`;
};

// 认证接口速率限制（登录、注册等）
const authLimiter = rateLimit({
	windowMs: 60 * 1000, // 时间窗口：1分钟
	max: 10, // 最大请求数：10次/分钟
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

// 严格速率限制（发送验证码等敏感操作）
const strictLimiter = rateLimit({
	windowMs: 60 * 1000, // 时间窗口：1分钟
	max: 5, // 最大请求数：5次/分钟
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

// 刷新 Token 速率限制
const refreshLimiter = rateLimit({
	windowMs: 60 * 1000, // 时间窗口：1分钟
	max: 20, // 最大请求数：20次/分钟
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

module.exports = {
	authLimiter,
	strictLimiter,
	refreshLimiter,
};

