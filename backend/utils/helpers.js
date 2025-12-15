/**
 * 辅助工具函数
 */

/**
 * 安全地解析 JSON
 */
function safeJsonParse(text) {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

/**
 * 生成验证码
 */
function generateVerificationCode() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
	safeJsonParse,
	generateVerificationCode,
};

