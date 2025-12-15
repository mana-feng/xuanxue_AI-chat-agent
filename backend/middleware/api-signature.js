/**
 * API 签名验证中间件
 * 用于验证请求签名，防止请求被篡改和重放攻击
 * 
 * 注意：此中间件主要用于敏感操作（POST/PUT/DELETE）
 * GET 请求通常不需要签名验证（因为不修改数据）
 * 
 * 强制模式：所有使用此中间件的路由都必须提供有效的签名
 */

const { verifySignature, extractSignatureInfo } = require('../utils/api-signature');

/**
 * API 签名验证中间件（强制模式）
 * 所有使用此中间件的请求都必须提供有效的签名，否则请求将被拒绝
 */
function apiSignatureMiddleware() {
	return (req, res, next) => {
		// 只对 POST/PUT/DELETE 请求进行签名验证
		if (req.method === 'GET' || req.method === 'OPTIONS') {
			return next();
		}

		try {
			const { params, timestamp, nonce, signature } = extractSignatureInfo(req);

			// 强制要求签名信息
			if (!signature || !timestamp || !nonce) {
				return res.status(400).json({ 
					error: '缺少签名信息，请求被拒绝。请确保请求包含 X-Timestamp、X-Nonce 和 X-Signature 请求头' 
				});
			}

			// 验证签名
			const verification = verifySignature(params, timestamp, nonce, signature);
			if (!verification.valid) {
				console.warn('签名验证失败:', verification.error, req.path);
				return res.status(401).json({ 
					error: verification.error || '签名验证失败' 
				});
			}

			// 验证通过，继续处理
			next();
		} catch (error) {
			console.error('签名验证中间件错误:', error);
			return res.status(500).json({ error: '签名验证失败' });
		}
	};
}

module.exports = {
	apiSignatureMiddleware,
};

