/**
 * 数据库初始化
 */
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');

async function ensureUserLlmQuotasSchema(db) {
	const rows = await db.all(
		"SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'user_llm_quotas'"
	);
	const existing = new Set((rows || []).map((r) => String(r.name)));

	if (!existing.has('remaining_daily_count')) {
		await db.run('ALTER TABLE user_llm_quotas ADD COLUMN remaining_daily_count INT DEFAULT NULL');
		existing.add('remaining_daily_count');
	}
	if (!existing.has('daily_limit')) {
		await db.run('ALTER TABLE user_llm_quotas ADD COLUMN daily_limit INT DEFAULT NULL');
		existing.add('daily_limit');
	}
	if (!existing.has('daily_token_limit')) {
		await db.run('ALTER TABLE user_llm_quotas ADD COLUMN daily_token_limit INT DEFAULT NULL');
		existing.add('daily_token_limit');
	}
	if (!existing.has('per_minute_limit')) {
		await db.run('ALTER TABLE user_llm_quotas ADD COLUMN per_minute_limit INT DEFAULT 1');
		existing.add('per_minute_limit');
	}
	if (!existing.has('remaining_token')) {
		await db.run('ALTER TABLE user_llm_quotas ADD COLUMN remaining_token INT DEFAULT 0');
		existing.add('remaining_token');
	}
	if (!existing.has('updated_at')) {
		await db.run('ALTER TABLE user_llm_quotas ADD COLUMN updated_at DATETIME DEFAULT NULL');
		existing.add('updated_at');
	}

	if (existing.has('remaining_count') && existing.has('remaining_daily_count')) {
		await db.run(
			'UPDATE user_llm_quotas SET remaining_daily_count = remaining_count WHERE remaining_daily_count IS NULL'
		);
	}
	if (existing.has('remaining_daily_count')) {
		await db.run('UPDATE user_llm_quotas SET remaining_daily_count = 2 WHERE remaining_daily_count IS NULL');
	}
	if (existing.has('daily_limit')) {
		await db.run('UPDATE user_llm_quotas SET daily_limit = 2 WHERE daily_limit IS NULL');
	}
	if (existing.has('daily_token_limit')) {
		await db.run('UPDATE user_llm_quotas SET daily_token_limit = 0 WHERE daily_token_limit IS NULL');
	}
}

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

	// 六爻记录表
	await db.run(
		`CREATE TABLE IF NOT EXISTS liuyao_records (
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
			CONSTRAINT fk_liuyao_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 紫微记录表
	await db.run(
		`CREATE TABLE IF NOT EXISTS ziwei_records (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			name VARCHAR(100) DEFAULT NULL,
			gender VARCHAR(10) DEFAULT NULL,
			birth_datetime VARCHAR(50) DEFAULT NULL,
			calendar_type VARCHAR(20) DEFAULT NULL,
			raw_payload MEDIUMTEXT DEFAULT NULL,
			created_at DATETIME DEFAULT NULL,
			KEY idx_user_id (user_id),
			KEY idx_created_at (created_at),
			CONSTRAINT fk_ziwei_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
			user_id INT NOT NULL PRIMARY KEY,
			daily_limit INT DEFAULT 2 COMMENT '每日限制次数',
			per_minute_limit INT DEFAULT 1 COMMENT '每分钟限制（固定为1）',
			daily_token_limit INT DEFAULT 0 COMMENT '每日Token限制（0表示不限制）',
			remaining_daily_count INT DEFAULT 2 COMMENT '当日剩余次数',
			remaining_token INT DEFAULT 0 COMMENT '当日剩余Token',
			updated_at DATETIME DEFAULT NULL,
			CONSTRAINT fk_user_llm_quotas_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);
	await ensureUserLlmQuotasSchema(db);

	// 初始化配置表
	await ConfigService.initTable(db);

	// 公告表
	await db.run(
		`CREATE TABLE IF NOT EXISTS announcements (
			id INT AUTO_INCREMENT PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			expires_at DATETIME DEFAULT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);
}

module.exports = {
	initTables,
};
