/**
 * API 签名工具
 * 用于防止请求被篡改和重放攻击
 */

const crypto = require('crypto');
const config = require('../config');

// API 签名密钥（应该从环境变量读取）
const API_SIGNATURE_SECRET = process.env.API_SIGNATURE_SECRET || config.API_SIGNATURE_SECRET || config.JWT_SECRET;

// 请求时间戳有效期（从环境变量读取，默认5分钟）
const TIMESTAMP_VALID_WINDOW = config.API_SIGNATURE_TIMESTAMP_WINDOW || 5 * 60 * 1000;

// 存储已使用的 nonce（防重放）
// 生产环境应该使用 Redis 等持久化存储
const usedNonces = new Map();

// 清理过期的 nonce（每10分钟清理一次）
setInterval(() => {
	const now = Date.now();
	for (const [nonce, timestamp] of usedNonces.entries()) {
		if (now - timestamp > TIMESTAMP_VALID_WINDOW) {
			usedNonces.delete(nonce);
		}
	}
}, 10 * 60 * 1000);

/**
 * 生成 API 签名
 * @param {Object} params - 请求参数
 * @param {number} timestamp - 时间戳
 * @param {string} nonce - 随机字符串
 * @returns {string} 签名
 */
function generateSignature(params, timestamp, nonce) {
	// 1. 将参数按 key 排序
	const sortedKeys = Object.keys(params).sort();
	
	// 2. 构建签名字符串：key1=value1&key2=value2&timestamp=xxx&nonce=xxx
	const signString = sortedKeys
		.map(key => `${key}=${JSON.stringify(params[key])}`)
		.join('&') + `&timestamp=${timestamp}&nonce=${nonce}`;
	
	// 3. 使用 HMAC-SHA256 生成签名
	const signature = crypto
		.createHmac('sha256', API_SIGNATURE_SECRET)
		.update(signString)
		.digest('hex');
	
	return signature;
}

/**
 * 验证 API 签名
 * @param {Object} params - 请求参数
 * @param {number} timestamp - 时间戳
 * @param {string} nonce - 随机字符串
 * @param {string} receivedSignature - 接收到的签名
 * @returns {Object} { valid: boolean, error?: string }
 */
function verifySignature(params, timestamp, nonce, receivedSignature) {
	// 1. 检查时间戳是否在有效窗口内
	const now = Date.now();
	if (Math.abs(now - timestamp) > TIMESTAMP_VALID_WINDOW) {
		return { valid: false, error: '请求已过期' };
	}
	
	// 2. 检查 nonce 是否已使用（防重放）
	if (usedNonces.has(nonce)) {
		return { valid: false, error: '请求重复' };
	}
	
	// 3. 生成签名并比较
	const expectedSignature = generateSignature(params, timestamp, nonce);
	if (expectedSignature !== receivedSignature) {
		return { valid: false, error: '签名验证失败' };
	}
	
	// 4. 记录已使用的 nonce
	usedNonces.set(nonce, timestamp);
	
	return { valid: true };
}

/**
 * 从请求中提取签名信息
 * @param {Object} req - Express 请求对象
 * @returns {Object} { params, timestamp, nonce, signature }
 */
function extractSignatureInfo(req) {
	const headers = req.headers || {};
	const body = req.body || {};
	
	// 从请求头或请求体中提取签名信息
	const timestamp = parseInt(headers['x-timestamp'] || body.timestamp || '0');
	const nonce = headers['x-nonce'] || body.nonce || '';
	const signature = headers['x-signature'] || body.signature || '';
	
	// 从请求体中移除签名相关字段，得到实际参数
	const params = { ...body };
	delete params.timestamp;
	delete params.nonce;
	delete params.signature;
	
	return { params, timestamp, nonce, signature };
}

module.exports = {
	generateSignature,
	verifySignature,
	extractSignatureInfo,
	TIMESTAMP_VALID_WINDOW,
};

