/**
 * 应用配置
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

module.exports = {
	PORT: Number(process.env.PORT) || 3001,
	JWT_SECRET: process.env.JWT_SECRET || 'CHANGE_ME_TO_A_RANDOM_SECRET',
	ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '30m',
	REFRESH_TOKEN_EXPIRES_DAYS: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 15,
	CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean),
	// API 签名密钥（用于防重放攻击，必须设置）
	API_SIGNATURE_SECRET: process.env.API_SIGNATURE_SECRET || process.env.JWT_SECRET,
};

