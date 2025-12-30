/**
 * 应用配置
 * 统一通过环境变量 (.env) 管理配置
 */
const path = require('path');
const envFile = path.join(__dirname, '../.env');
require('dotenv').config({ path: envFile });

module.exports = {
    // 端口配置
    PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
    
    // 数据库主机
    DB_HOST: process.env.DB_HOST,

    // 安全：JWT 密钥
    JWT_SECRET: process.env.JWT_SECRET,
    
    // 安全：Token 过期时间
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_EXPIRES_DAYS: process.env.REFRESH_TOKEN_EXPIRES_DAYS ? Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) : undefined,
    
    // CORS 跨域设置
    CORS_ORIGINS: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
        
    // 安全：API 签名密钥
    API_SIGNATURE_SECRET: process.env.API_SIGNATURE_SECRET,
    
    // API 签名有效期 (毫秒)
    API_SIGNATURE_TIMESTAMP_WINDOW: process.env.API_SIGNATURE_TIMESTAMP_WINDOW ? Number(process.env.API_SIGNATURE_TIMESTAMP_WINDOW) : undefined,
    
    // 请求大小限制
    REQUEST_SIZE_LIMIT: process.env.REQUEST_SIZE_LIMIT ? Number(process.env.REQUEST_SIZE_LIMIT) : undefined,
    
    // CSP 内容安全策略连接源
    CSP_CONNECT_SRC: process.env.CSP_CONNECT_SRC,
};
