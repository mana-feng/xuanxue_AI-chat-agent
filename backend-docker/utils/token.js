/**
 * Token 工具函数
 */
const crypto = require('crypto');

/**
 * 生成随机 refresh token
 */
function generateRefreshToken() {
	return crypto.randomBytes(64).toString('hex');
}

/**
 * 计算 refresh token 的 hash（用于存储）
 */
function hashRefreshToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
	generateRefreshToken,
	hashRefreshToken,
};

