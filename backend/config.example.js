/**
 * 后端配置示例文件
 * 复制此文件为 config/index.js 并修改配置
 * 
 * 注意：实际配置从环境变量读取，此文件仅作为参考
 */

module.exports = {
	// 服务器端口
	PORT: 3001,
	
	// JWT 密钥（必须修改为随机字符串，建议使用32位以上）
	JWT_SECRET: 'please_change_me_to_a_random_secret_key_at_least_32_chars',
	
	// Access Token 有效期（默认 30 分钟）
	ACCESS_TOKEN_EXPIRES_IN: '30m',
	
	// Refresh Token 有效期（默认 15 天）
	REFRESH_TOKEN_EXPIRES_DAYS: 15,
	
	// CORS 允许的来源（主要用于 H5 浏览器端）
	// 多个域名用逗号分隔，例如：https://your-frontend.com,https://h5.your-frontend.com
	// 如果只部署小程序或 App，可以留空
	// 如果同时部署 H5，生产环境建议配置具体的前端域名
	CORS_ORIGINS: [
		'https://your-frontend-domain.com',
		'https://h5.your-frontend-domain.com'
	],
};

