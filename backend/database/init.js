/**
 * 数据库初始化
 */
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');

/**
 * 初始化数据库表结构
 */
async function initTables() {
	const db = getDatabase();
	
	// 用户表（兼容旧版本 MySQL，不使用 DEFAULT CURRENT_TIMESTAMP）
	await db.run(
		`CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			email VARCHAR(255) NOT NULL,
			username VARCHAR(50) DEFAULT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role VARCHAR(20) DEFAULT 'user',
			created_at DATETIME DEFAULT NULL,
			UNIQUE KEY idx_email (email),
			UNIQUE KEY idx_username (username)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 八字记录表
	await db.run(
		`CREATE TABLE IF NOT EXISTS bazi_records (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			name VARCHAR(100) DEFAULT NULL,
			gender VARCHAR(10) DEFAULT NULL,
			birth_datetime VARCHAR(50) DEFAULT NULL,
			calendar_type VARCHAR(20) DEFAULT NULL,
			raw_payload TEXT DEFAULT NULL,
			created_at DATETIME DEFAULT NULL,
			KEY idx_user_id (user_id),
			KEY idx_created_at (created_at),
			CONSTRAINT fk_bazi_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 邮箱验证码表
	await db.run(
		`CREATE TABLE IF NOT EXISTS email_verification_codes (
			id INT AUTO_INCREMENT PRIMARY KEY,
			email VARCHAR(255) NOT NULL,
			code VARCHAR(10) NOT NULL,
			type VARCHAR(20) DEFAULT 'register',
			expires_at DATETIME NOT NULL,
			used TINYINT(1) DEFAULT 0,
			created_at DATETIME DEFAULT NULL,
			KEY idx_email (email),
			KEY idx_expires_at (expires_at),
			KEY idx_type (type)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// Refresh Token 表
	await db.run(
		`CREATE TABLE IF NOT EXISTS refresh_tokens (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			token_hash VARCHAR(255) NOT NULL,
			device_id VARCHAR(255) DEFAULT NULL,
			expires_at DATETIME NOT NULL,
			revoked_at DATETIME DEFAULT NULL,
			created_at DATETIME DEFAULT NULL,
			KEY idx_user_id (user_id),
			KEY idx_token_hash (token_hash),
			KEY idx_expires_at (expires_at),
			CONSTRAINT fk_refresh_tokens_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// LLM 使用记录表
	await db.run(
		`CREATE TABLE IF NOT EXISTS llm_usage_records (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			tokens_used INT DEFAULT 0,
			created_at DATETIME DEFAULT NULL,
			KEY idx_user_id (user_id),
			KEY idx_created_at (created_at),
			CONSTRAINT fk_llm_usage_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 用户 LLM 额度表
	await db.run(
		`CREATE TABLE IF NOT EXISTS user_llm_quotas (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			per_minute_limit INT DEFAULT 1 COMMENT '每分钟限制（固定为1）',
			remaining_count INT DEFAULT 0 COMMENT '剩余次数',
			remaining_token INT DEFAULT 0 COMMENT '剩余Token',
			updated_at DATETIME DEFAULT NULL,
			UNIQUE KEY idx_user_id (user_id),
			CONSTRAINT fk_user_llm_quotas_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 初始化配置表
	await ConfigService.initTable(db);
}

module.exports = {
	initTables,
};

