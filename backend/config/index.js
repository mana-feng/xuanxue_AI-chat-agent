/**
 * 应用配置
 * 仅加载单一配置文件 .env（生产配置）
 */
const path = require('path');

const envFile = path.join(__dirname, '../.env');
require('dotenv').config({ path: envFile });

module.exports = {
	PORT: Number(process.env.PORT) || 3001,
	JWT_SECRET: (() => {
		if (!process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET 未配置，请在 backend/.env 中设置');
		}
		return process.env.JWT_SECRET;
	})(),
	ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '30m',
	REFRESH_TOKEN_EXPIRES_DAYS: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 15,
	CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean),
	// API 签名密钥（用于防重放攻击，必须设置）
	API_SIGNATURE_SECRET: (() => {
		if (!process.env.API_SIGNATURE_SECRET) {
			throw new Error('API_SIGNATURE_SECRET 未配置，请在 backend/.env 中设置');
		}
		return process.env.API_SIGNATURE_SECRET;
	})(),
	// API 签名时间戳有效期（毫秒）
	API_SIGNATURE_TIMESTAMP_WINDOW: Number(process.env.API_SIGNATURE_TIMESTAMP_WINDOW) || 5 * 60 * 1000,
	// 请求体大小限制（字节）
	REQUEST_SIZE_LIMIT: Number(process.env.REQUEST_SIZE_LIMIT) || 10 * 1024 * 1024,
	// CSP 连接源
	CSP_CONNECT_SRC: process.env.CSP_CONNECT_SRC || 'http://localhost:3001',
};

