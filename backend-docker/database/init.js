/**
 * 数据库初始化
 */
const { getDatabase } = require('../db');
const bcrypt = require('bcryptjs');
const ConfigService = require('../config-service');

function normalizeBootstrapAdminConfig() {
	const rawUsername = typeof process.env.ADMIN_USERNAME === 'string' ? process.env.ADMIN_USERNAME.trim() : '';
	const rawEmail = typeof process.env.ADMIN_EMAIL === 'string' ? process.env.ADMIN_EMAIL.trim() : '';
	const rawPassword = typeof process.env.ADMIN_PASSWORD === 'string' ? process.env.ADMIN_PASSWORD.trim() : '';

	if (!rawPassword || (!rawUsername && !rawEmail)) {
		return null;
	}

	let username = rawUsername;
	let email = rawEmail;

	// Backward compatibility: some local envs used ADMIN_EMAIL as a login identifier.
	if (!username && email && !email.includes('@')) {
		username = email;
		email = `${email}@local.admin`;
	}

	if (!email && username) {
		email = `${username}@local.admin`;
	}

	if (!username && email) {
		username = email.split('@')[0];
	}

	return {
		username: username.slice(0, 50),
		email: email.slice(0, 255),
		password: rawPassword,
	};
}

async function ensureBootstrapAdmin(db) {
	const adminConfig = normalizeBootstrapAdminConfig();
	if (!adminConfig) {
		return;
	}

	const existingByEmail = await db.get('SELECT id, email, username, role FROM users WHERE email = ?', [
		adminConfig.email,
	]);
	const existingByUsername = adminConfig.username
		? await db.get('SELECT id, email, username, role FROM users WHERE username = ?', [
				adminConfig.username,
			])
		: null;

	if (
		existingByEmail &&
		existingByUsername &&
		Number(existingByEmail.id) !== Number(existingByUsername.id)
	) {
		throw new Error(
			`管理员环境变量冲突：email=${adminConfig.email} 与 username=${adminConfig.username} 指向不同用户`
		);
	}

	let targetUser = existingByEmail || existingByUsername;
	if (!targetUser) {
		const adminUsers = await db.all("SELECT id, email, username FROM users WHERE role = 'admin' ORDER BY id");
		if (adminUsers.length === 1) {
			targetUser = adminUsers[0];
		}
	}

	const passwordHash = await bcrypt.hash(String(adminConfig.password), 10);

	if (targetUser) {
		await db.run(
			'UPDATE users SET email = ?, username = ?, password_hash = ?, role = ?, created_at = COALESCE(created_at, NOW()) WHERE id = ?',
			[adminConfig.email, adminConfig.username || null, passwordHash, 'admin', targetUser.id]
		);
		console.log(`✓ 管理员账号已同步: ${adminConfig.username || adminConfig.email}`);
		return;
	}

	await db.run(
		'INSERT INTO users (email, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())',
		[adminConfig.email, adminConfig.username || null, passwordHash, 'admin']
	);
	console.log(`✓ 管理员账号已创建: ${adminConfig.username || adminConfig.email}`);
}

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

async function ensureAnalyticsVisitorsSchema(db) {
	const rows = await db.all(
		"SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'analytics_visitors'"
	);
	const existing = new Set((rows || []).map((r) => String(r.name)));

	const newColumns = [
		{ name: 'visitor_id', sql: "VARCHAR(64) NOT NULL DEFAULT '' COMMENT '访客主键 ID'" },
		{ name: 'pvid', sql: "VARCHAR(64) NOT NULL DEFAULT '' COMMENT '前端永久访客 ID'" },
		{ name: 'ip_hash', sql: "CHAR(64) NOT NULL DEFAULT '' COMMENT 'IP 哈希值'" },
		{ name: 'ip_encrypted', sql: "TEXT COMMENT 'IP 加密密文'" },
		{ name: 'ip', sql: "VARCHAR(45) NOT NULL DEFAULT '' COMMENT 'IP 地址'" },
	];

	for (const col of newColumns) {
		if (!existing.has(col.name)) {
			try {
				await db.run(`ALTER TABLE analytics_visitors ADD COLUMN ${col.name} ${col.sql}`);
				console.log(`  ✓ analytics_visitors 添加列：${col.name}`);
			} catch (e) {
				console.warn(`  ⚠ analytics_visitors 添加列失败 ${col.name}:`, e.message);
			}
		}
	}
}

async function ensurePageStatsSchema(db) {
	const rows = await db.all(
		"SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'page_stats'"
	);
	const existing = new Set((rows || []).map((r) => String(r.name)));

	const newColumns = [
		{ name: 'visitor_id', sql: "VARCHAR(64) NOT NULL DEFAULT '' COMMENT '访客主键ID'" },
		{ name: 'ip_hash', sql: "CHAR(64) NOT NULL DEFAULT '' COMMENT 'IP哈希值'" },
		{ name: 'ip_encrypted', sql: "TEXT COMMENT 'IP加密密文'" },
		{ name: 'visit_sequence', sql: "INT UNSIGNED DEFAULT 1 COMMENT '访客第几次访问页'" },
		{ name: 'session_page_index', sql: "INT UNSIGNED DEFAULT 1 COMMENT '会话内页面序号'" },
		{ name: 'session_started_at', sql: "DATETIME DEFAULT NULL COMMENT '会话开始时间'" },
		{ name: 'last_activity_at', sql: "DATETIME DEFAULT NULL COMMENT '最后活跃时间'" },
		{ name: 'viewport_width', sql: "INT DEFAULT 0 COMMENT '视口宽度'" },
		{ name: 'viewport_height', sql: "INT DEFAULT 0 COMMENT '视口高度'" },
		{ name: 'browser', sql: "VARCHAR(50) NOT NULL DEFAULT '' COMMENT '浏览器'" },
		{ name: 'browser_version', sql: "VARCHAR(20) NOT NULL DEFAULT '' COMMENT '浏览器版本'" },
		{ name: 'os', sql: "VARCHAR(50) NOT NULL DEFAULT '' COMMENT '操作系统'" },
		{ name: 'os_version', sql: "VARCHAR(20) NOT NULL DEFAULT '' COMMENT '系统版本'" },
		{ name: 'charset', sql: "VARCHAR(30) NOT NULL DEFAULT '' COMMENT '字符编码'" },
		{ name: 'color_depth', sql: "TINYINT UNSIGNED DEFAULT 24 COMMENT '颜色深度'" },
		{ name: 'pixel_ratio', sql: "FLOAT DEFAULT 1 COMMENT '设备像素比'" },
		{ name: 'touch_support', sql: "TINYINT(1) DEFAULT 0 COMMENT '触摸支持'" },
		{ name: 'connection_type', sql: "VARCHAR(20) NOT NULL DEFAULT '' COMMENT '网络类型'" },
		{ name: 'downlink_speed', sql: "FLOAT DEFAULT 0 COMMENT '下载速度Mbps'" },
		{ name: 'timezone', sql: "VARCHAR(100) NOT NULL DEFAULT '' COMMENT '时区'" },
		{ name: 'load_time', sql: "INT DEFAULT 0 COMMENT '页面加载时间ms'" },
		{ name: 'dom_content_loaded_time', sql: "INT DEFAULT 0 COMMENT 'DCL时间ms'" },
		{ name: 'fcp_time', sql: "INT DEFAULT 0 COMMENT '首次内容绘制时间ms'" },
		{ name: 'is_entry_page', sql: "TINYINT(1) DEFAULT 0 COMMENT '是否会话入口页'" },
		{ name: 'utm_source', sql: "VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'UTM来源'" },
		{ name: 'utm_medium', sql: "VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'UTM媒介'" },
		{ name: 'utm_campaign', sql: "VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'UTM活动'" },
		{ name: 'utm_term', sql: "VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'UTM关键词'" },
		{ name: 'utm_content', sql: "VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'UTM内容'" },
		{ name: 'referrer_type', sql: "VARCHAR(20) NOT NULL DEFAULT '' COMMENT '来源类型direct/search/social等'" },
		{ name: 'search_engine', sql: "VARCHAR(30) NOT NULL DEFAULT '' COMMENT '搜索引擎'" },
		{ name: 'search_keyword', sql: "VARCHAR(255) NOT NULL DEFAULT '' COMMENT '搜索关键词'" },
		{ name: 'country', sql: "VARCHAR(100) NOT NULL DEFAULT '' COMMENT '国家'" },
		{ name: 'region', sql: "VARCHAR(100) NOT NULL DEFAULT '' COMMENT '省份/地区'" },
		{ name: 'city', sql: "VARCHAR(100) NOT NULL DEFAULT '' COMMENT '城市'" },
		{ name: 'isp', sql: "VARCHAR(100) NOT NULL DEFAULT '' COMMENT '运营商/ISP'" },
		{ name: 'is_new_visitor', sql: "TINYINT(1) DEFAULT 1 COMMENT '是否新访客'" },
		{ name: 'session_duration', sql: "INT DEFAULT 0 COMMENT '会话时长秒'" },
		{ name: 'query_string', sql: "VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '查询字符串'" },
		{ name: 'title', sql: "VARCHAR(512) NOT NULL DEFAULT '' COMMENT '页面标题'" },
		{ name: 'user_agent', sql: "TEXT COMMENT 'User Agent'" },
		{ name: 'is_logged_in', sql: "TINYINT(1) DEFAULT 0 COMMENT '是否登录用户'" },
		{ name: 'username', sql: "VARCHAR(100) DEFAULT NULL COMMENT '用户名'" },
	];

	for (const col of newColumns) {
		if (!existing.has(col.name)) {
			try {
				await db.run(`ALTER TABLE page_stats ADD COLUMN ${col.name} ${col.sql}`);
				console.log(`  ✓ page_stats 添加列: ${col.name}`);
			} catch (e) {
				console.warn(`  ⚠ page_stats 添加列失败 ${col.name}:`, e.message);
			}
		}
	}

	const newIndexes = [
		{ name: 'idx_browser', col: 'browser' },
		{ name: 'idx_os', col: 'os' },
		{ name: 'idx_country', col: 'country' },
		{ name: 'idx_referrer_type', col: 'referrer_type' },
		{ name: 'idx_visit_date', col: 'visit_date' },
		{ name: 'idx_visitor_id', col: 'visitor_id' },
		{ name: 'idx_last_activity_at', col: 'last_activity_at' },
		{ name: 'idx_page_stats_created_at', col: 'created_at' },
		{ name: 'idx_page_stats_visit_date_created_at', col: 'visit_date, created_at' },
		{ name: 'idx_page_stats_visit_date_session_id', col: 'visit_date, session_id' },
		{ name: 'idx_page_stats_visit_date_pvid', col: 'visit_date, pvid' },
		{ name: 'idx_page_stats_is_entry_page_pathname', col: 'is_entry_page, pathname' },
		{ name: 'idx_page_stats_visit_hour', col: 'visit_hour' },
		{ name: 'idx_page_stats_day_of_week', col: 'day_of_week' },
		{ name: 'idx_page_stats_search_engine', col: 'search_engine' },
		{ name: 'idx_page_stats_timezone', col: 'timezone' },
		{ name: 'idx_page_stats_language', col: 'language' },
		{ name: 'idx_page_stats_device_browser', col: 'device_type, browser' },
		{ name: 'idx_page_stats_device_os', col: 'device_type, os' },
	];

	for (const idx of newIndexes) {
		try {
			const existing = await db.get(
				"SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'page_stats' AND index_name = ?",
				[idx.name]
			);
			if (!existing || existing.cnt === 0) {
				await db.run(`CREATE INDEX ${idx.name} ON page_stats (${idx.col})`);
			}
		} catch (e) {
			// ignore index creation errors (e.g., index already exists)
		}
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
	await ensureBootstrapAdmin(db);

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

	// 访客表（Matomo-lite Phase 1）
	await db.run(
		`CREATE TABLE IF NOT EXISTS analytics_visitors (
			visitor_id VARCHAR(64) NOT NULL PRIMARY KEY,
			pvid VARCHAR(64) NOT NULL DEFAULT '' COMMENT '前端永久访客 ID',
			ip_hash CHAR(64) NOT NULL DEFAULT '' COMMENT 'IP 哈希值',
			ip_encrypted TEXT COMMENT 'IP 加密密文',
			first_seen_at DATETIME DEFAULT NULL,
			last_seen_at DATETIME DEFAULT NULL,
			first_page_url TEXT,
			last_page_url TEXT,
			entry_pathname VARCHAR(512) NOT NULL DEFAULT '/',
			last_pathname VARCHAR(512) NOT NULL DEFAULT '/',
			referrer TEXT,
			referrer_type VARCHAR(20) NOT NULL DEFAULT '',
			search_engine VARCHAR(30) NOT NULL DEFAULT '',
			search_keyword VARCHAR(255) NOT NULL DEFAULT '',
			utm_source VARCHAR(100) NOT NULL DEFAULT '',
			utm_medium VARCHAR(50) NOT NULL DEFAULT '',
			utm_campaign VARCHAR(200) NOT NULL DEFAULT '',
			utm_term VARCHAR(200) NOT NULL DEFAULT '',
			utm_content VARCHAR(200) NOT NULL DEFAULT '',
			ip VARCHAR(45) NOT NULL DEFAULT '',
			country VARCHAR(100) NOT NULL DEFAULT '',
			region VARCHAR(100) NOT NULL DEFAULT '',
			city VARCHAR(100) NOT NULL DEFAULT '',
			isp VARCHAR(100) NOT NULL DEFAULT '',
			language VARCHAR(20) NOT NULL DEFAULT '',
			timezone VARCHAR(100) NOT NULL DEFAULT '',
			user_agent TEXT,
			device_type VARCHAR(20) NOT NULL DEFAULT 'desktop',
			browser VARCHAR(50) NOT NULL DEFAULT '',
			browser_version VARCHAR(20) NOT NULL DEFAULT '',
			os VARCHAR(50) NOT NULL DEFAULT '',
			os_version VARCHAR(20) NOT NULL DEFAULT '',
			visit_count INT UNSIGNED NOT NULL DEFAULT 0,
			session_count INT UNSIGNED NOT NULL DEFAULT 0,
			pageview_count INT UNSIGNED NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			UNIQUE KEY idx_pvid (pvid),
			KEY idx_last_seen_at (last_seen_at),
			KEY idx_entry_pathname (entry_pathname),
			KEY idx_last_pathname (last_pathname)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 会话表（Matomo-lite Phase 1）
	await db.run(
		`CREATE TABLE IF NOT EXISTS analytics_sessions (
			session_id VARCHAR(64) NOT NULL PRIMARY KEY,
			visitor_id VARCHAR(64) NOT NULL,
			ip_hash CHAR(64) NOT NULL DEFAULT '' COMMENT 'IP 哈希值',
			ip_encrypted TEXT COMMENT 'IP 加密密文',
			pvid VARCHAR(64) NOT NULL DEFAULT '',
			started_at DATETIME DEFAULT NULL,
			last_activity_at DATETIME DEFAULT NULL,
			ended_at DATETIME DEFAULT NULL,
			landing_page_url TEXT,
			landing_pathname VARCHAR(512) NOT NULL DEFAULT '/',
			exit_page_url TEXT,
			exit_pathname VARCHAR(512) NOT NULL DEFAULT '/',
			referrer TEXT,
			referrer_type VARCHAR(20) NOT NULL DEFAULT '',
			search_engine VARCHAR(30) NOT NULL DEFAULT '',
			search_keyword VARCHAR(255) NOT NULL DEFAULT '',
			utm_source VARCHAR(100) NOT NULL DEFAULT '',
			utm_medium VARCHAR(50) NOT NULL DEFAULT '',
			utm_campaign VARCHAR(200) NOT NULL DEFAULT '',
			utm_term VARCHAR(200) NOT NULL DEFAULT '',
			utm_content VARCHAR(200) NOT NULL DEFAULT '',
			ip VARCHAR(45) NOT NULL DEFAULT '',
			country VARCHAR(100) NOT NULL DEFAULT '',
			region VARCHAR(100) NOT NULL DEFAULT '',
			city VARCHAR(100) NOT NULL DEFAULT '',
			isp VARCHAR(100) NOT NULL DEFAULT '',
			language VARCHAR(20) NOT NULL DEFAULT '',
			timezone VARCHAR(100) NOT NULL DEFAULT '',
			device_type VARCHAR(20) NOT NULL DEFAULT 'desktop',
			browser VARCHAR(50) NOT NULL DEFAULT '',
			browser_version VARCHAR(20) NOT NULL DEFAULT '',
			os VARCHAR(50) NOT NULL DEFAULT '',
			os_version VARCHAR(20) NOT NULL DEFAULT '',
			entry_page_id BIGINT DEFAULT NULL,
			last_pageview_id BIGINT DEFAULT NULL,
			pageview_count INT UNSIGNED NOT NULL DEFAULT 0,
			duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
			is_bounce TINYINT(1) NOT NULL DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			KEY idx_visitor_id (visitor_id),
			KEY idx_started_at (started_at),
			KEY idx_last_activity_at (last_activity_at),
			KEY idx_landing_pathname (landing_pathname)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);

	// 页面访问统计表
	await db.run(
		`CREATE TABLE IF NOT EXISTS page_stats (
			id BIGINT AUTO_INCREMENT PRIMARY KEY,
			visitor_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '访客主键 ID',
			pvid VARCHAR(64) NOT NULL DEFAULT '' COMMENT '永久访客 ID',
			session_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '会话 ID',
			url TEXT NOT NULL COMMENT '完整 URL',
			pathname VARCHAR(512) NOT NULL DEFAULT '/' COMMENT '路径名',
			query_string VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '查询字符串',
			referrer TEXT COMMENT '来源 URL',
			title VARCHAR(512) NOT NULL DEFAULT '' COMMENT '页面标题',
			user_agent TEXT COMMENT 'User Agent',
			screen_width INT DEFAULT 0 COMMENT '屏幕宽度',
			screen_height INT DEFAULT 0 COMMENT '屏幕高度',
			viewport_width INT DEFAULT 0 COMMENT '视口宽度',
			viewport_height INT DEFAULT 0 COMMENT '视口高度',
			device_type VARCHAR(20) NOT NULL DEFAULT 'desktop' COMMENT '设备类型',
			is_mobile TINYINT(1) DEFAULT 0 COMMENT '是否移动设备',
			browser VARCHAR(50) NOT NULL DEFAULT '' COMMENT '浏览器',
			browser_version VARCHAR(20) NOT NULL DEFAULT '' COMMENT '浏览器版本',
			os VARCHAR(50) NOT NULL DEFAULT '' COMMENT '操作系统',
			os_version VARCHAR(20) NOT NULL DEFAULT '' COMMENT '系统版本',
			language VARCHAR(20) NOT NULL DEFAULT '' COMMENT '语言',
			charset VARCHAR(30) NOT NULL DEFAULT '' COMMENT '字符编码',
			color_depth TINYINT UNSIGNED DEFAULT 24 COMMENT '颜色深度',
			pixel_ratio FLOAT DEFAULT 1 COMMENT '设备像素比',
			touch_support TINYINT(1) DEFAULT 0 COMMENT '触摸支持',
			connection_type VARCHAR(20) NOT NULL DEFAULT '' COMMENT '网络类型',
			downlink_speed FLOAT DEFAULT 0 COMMENT '下载速度 Mbps',
			ip VARCHAR(45) NOT NULL DEFAULT '' COMMENT 'IP 地址',
			ip_hash CHAR(64) NOT NULL DEFAULT '' COMMENT 'IP 哈希值',
			ip_encrypted TEXT COMMENT 'IP 加密密文',
			timezone VARCHAR(100) NOT NULL DEFAULT '' COMMENT '时区',
			visit_hour INT DEFAULT 0 COMMENT '访问小时 (0-23)',
			day_of_week INT DEFAULT 0 COMMENT '星期几 (0-6)',
			visit_date DATE NOT NULL COMMENT '访问日期',
			visit_sequence INT UNSIGNED DEFAULT 1 COMMENT '访客第几次访问页',
			session_page_index INT UNSIGNED DEFAULT 1 COMMENT '会话内页面序号',
			session_started_at DATETIME DEFAULT NULL COMMENT '会话开始时间',
			last_activity_at DATETIME DEFAULT NULL COMMENT '最后活跃时间',
			is_logged_in TINYINT(1) DEFAULT 0 COMMENT '是否登录用户',
			username VARCHAR(100) DEFAULT NULL COMMENT '用户名',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			KEY idx_visitor_id (visitor_id),
			KEY idx_pvid (pvid),
			KEY idx_session_id (session_id),
			KEY idx_pathname (pathname),
			KEY idx_visit_date (visit_date),
			KEY idx_device_type (device_type),
			KEY idx_is_mobile (is_mobile),
			KEY idx_browser (browser),
			KEY idx_os (os),
			KEY idx_referrer (referrer(255)),
			KEY idx_is_logged_in (is_logged_in)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);
	await ensureAnalyticsVisitorsSchema(db);
	await ensurePageStatsSchema(db);
}

module.exports = {
	initTables,
};
