/**
 * 应用配置
 * 统一通过环境变量管理配置
 */

function normalizeSecret(value) {
	if (typeof value !== 'string') return '';
	return value.trim();
}

function isInsecureSecret(secret) {
	if (!secret) return true;
	if (secret === 'change_this_to_a_secure_random_string_in_production') return true;
	if (secret.length < 32) return true;
	return false;
}

function requireSecureSecret(name, value) {
	const secret = normalizeSecret(value);
	if (!isInsecureSecret(secret)) return secret;

	const allowInsecure =
		String(process.env.ALLOW_INSECURE_SECRETS || '').toLowerCase() === 'true';

	const env = String(process.env.NODE_ENV || '').toLowerCase();
	const message = `${name} 未正确设置（至少 32 位且不能使用默认占位值）。请在生产环境配置安全的随机字符串。`;
	if (env === 'production' && !allowInsecure) {
		throw new Error(message);
	}
	console.warn(`⚠️  ${message}`);
	return secret;
}

module.exports = {
	// 端口配置
	PORT: process.env.PORT ? Number(process.env.PORT) : undefined,

	// 数据库主机
	DB_HOST: process.env.DB_HOST,

	// HTTPS 配置
	HTTPS_ENABLED: String(process.env.HTTPS_ENABLED || '').toLowerCase() === 'true',
	HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH,
	HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH,

	// 安全：JWT 密钥
	JWT_SECRET: requireSecureSecret('JWT_SECRET', process.env.JWT_SECRET),

	// 安全：Token 过期时间
	ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
	REFRESH_TOKEN_EXPIRES_DAYS: process.env.REFRESH_TOKEN_EXPIRES_DAYS
		? Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS)
		: undefined,

	// CORS 跨域设置
	CORS_ORIGINS: process.env.CORS_ORIGINS
		? process.env.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
		: [],

	// 安全：API 签名密钥
	API_SIGNATURE_SECRET:
		process.env.API_SIGNATURE_DISABLED === 'true'
			? normalizeSecret(process.env.API_SIGNATURE_SECRET)
			: requireSecureSecret('API_SIGNATURE_SECRET', process.env.API_SIGNATURE_SECRET),

	// API 签名有效期(毫秒)
	API_SIGNATURE_TIMESTAMP_WINDOW: process.env.API_SIGNATURE_TIMESTAMP_WINDOW
		? Number(process.env.API_SIGNATURE_TIMESTAMP_WINDOW)
		: undefined,

	// Redis（用于多实例 nonce 防重放）
	REDIS_URL: process.env.REDIS_URL,
	REDIS_PREFIX: process.env.REDIS_PREFIX ? String(process.env.REDIS_PREFIX).trim() : 'bazi',

	// 请求大小限制
	REQUEST_SIZE_LIMIT: process.env.REQUEST_SIZE_LIMIT
		? Number(process.env.REQUEST_SIZE_LIMIT)
		: undefined,

	// CSP 内容安全策略连接源
	CSP_CONNECT_SRC: process.env.CSP_CONNECT_SRC,

	// CSP fine-grained switches (production default should be strict)
	CSP_ALLOW_UNSAFE_INLINE: process.env.CSP_ALLOW_UNSAFE_INLINE,
	CSP_ALLOW_UNSAFE_EVAL: process.env.CSP_ALLOW_UNSAFE_EVAL,
};
