-- MySQL 数据库初始化脚本
-- 兼容 MySQL 5.5+ / MariaDB 10.0+
-- 执行方式: mysql -u root -p < init-mysql.sql

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `bazi_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `bazi_app`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `username` VARCHAR(50) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) DEFAULT 'user',
  `created_at` DATETIME DEFAULT NULL,
  UNIQUE KEY `idx_email` (`email`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 八字记录表
CREATE TABLE IF NOT EXISTS `bazi_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `gender` VARCHAR(10) DEFAULT NULL,
  `birth_datetime` VARCHAR(50) DEFAULT NULL,
  `calendar_type` VARCHAR(20) DEFAULT NULL,
  `raw_payload` MEDIUMTEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT NULL,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_bazi_records_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 六爻记录表
CREATE TABLE IF NOT EXISTS `liuyao_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `gender` VARCHAR(10) DEFAULT NULL,
  `birth_datetime` VARCHAR(50) DEFAULT NULL,
  `calendar_type` VARCHAR(20) DEFAULT NULL,
  `raw_payload` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT NULL,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_liuyao_records_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 邮箱验证码表
CREATE TABLE IF NOT EXISTS `email_verification_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT NULL,
  KEY `idx_email_code` (`email`, `code`, `type`, `used`),
  KEY `idx_email_expires` (`email`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 邮箱服务配置历史表
CREATE TABLE IF NOT EXISTS `email_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `host` VARCHAR(200) NOT NULL COMMENT 'SMTP 主机',
  `port` INT NOT NULL COMMENT 'SMTP 端口',
  `user` VARCHAR(200) NOT NULL COMMENT '邮箱账号',
  `pass` TEXT NOT NULL COMMENT '邮箱密码/授权码',
  `from` VARCHAR(200) NOT NULL COMMENT '发件邮箱地址',
  `from_name` VARCHAR(200) DEFAULT NULL COMMENT '发件人名称',
  `is_active` TINYINT(1) DEFAULT 0 COMMENT '是否当前使用',
  `created_at` DATETIME DEFAULT NULL,
  `updated_at` DATETIME DEFAULT NULL,
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 大模型配置历史表
CREATE TABLE IF NOT EXISTS `llm_models` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '模型配置名称',
  `provider` VARCHAR(50) NOT NULL COMMENT '供应商：openai/anthropic/deepseek/qwen/gemini',
  `base_url` VARCHAR(500) NOT NULL COMMENT 'API Base URL',
  `api_key` VARCHAR(500) NOT NULL COMMENT 'API Key',
  `model` VARCHAR(100) NOT NULL COMMENT '模型名称',
  `extra` TEXT DEFAULT NULL COMMENT '额外参数（JSON）',
  `is_active` TINYINT(1) DEFAULT 0 COMMENT '是否当前激活',
  `created_at` DATETIME DEFAULT NULL,
  `updated_at` DATETIME DEFAULT NULL,
  KEY `idx_provider` (`provider`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 应用配置表（用于存储配置信息）
CREATE TABLE IF NOT EXISTS `app_config` (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  `updated_at` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh Token 表（用于存储 refresh token，支持双 Token 认证）
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL COMMENT 'refresh token 的 hash 值',
  `device_id` VARCHAR(255) NOT NULL COMMENT '设备ID',
  `expires_at` DATETIME NOT NULL COMMENT '过期时间',
  `revoked_at` DATETIME DEFAULT NULL COMMENT '撤销时间',
  `created_at` DATETIME DEFAULT NULL,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户LLM聊天额度表
CREATE TABLE IF NOT EXISTS `user_llm_quotas` (
  `user_id` INT NOT NULL PRIMARY KEY,
  `daily_limit` INT DEFAULT 2 COMMENT '每日限制次数',
  `per_minute_limit` INT DEFAULT 1 COMMENT '每分钟限制次数',
  `daily_token_limit` INT DEFAULT 0 COMMENT '每日Token限制（0表示不限制）',
  `remaining_daily_count` INT DEFAULT 2 COMMENT '当日剩余次数',
  `remaining_token` INT DEFAULT 0 COMMENT '当日剩余Token',
  `updated_at` DATETIME DEFAULT NULL COMMENT '上次更新时间，用于重置每日额度',
  CONSTRAINT `fk_user_llm_quotas_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI使用记录表（记录用户AI解答的使用情况）
CREATE TABLE IF NOT EXISTS `llm_usage_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `tokens_used` INT DEFAULT 0 COMMENT '本次使用的token数量',
  `created_at` DATETIME DEFAULT NULL,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_date` (`user_id`, `created_at`),
  CONSTRAINT `fk_llm_usage_records_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 公告表
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建默认管理员账号
-- ⚠️ 安全提示：此处的密码 hash 仅用于初始化，生产环境应通过环境变量配置
-- 推荐方式：在 .env 文件中配置 ADMIN_USERNAME、ADMIN_EMAIL、ADMIN_PASSWORD
-- 后端服务启动时会自动从环境变量读取并创建管理员账号（如果不存在）
-- 
-- 如果通过 SQL 脚本创建，账号信息如下：
-- username: manafeng
-- email: manafeng@126.com
-- password: [请通过环境变量 ADMIN_PASSWORD 配置，或手动修改此 hash]
-- 
-- 如果账号已存在则忽略（使用 INSERT IGNORE）
-- 注意：此处的 hash 是示例值，实际部署时应使用环境变量配置的密码生成的 hash
INSERT IGNORE INTO `users` (`email`, `username`, `password_hash`, `role`, `created_at`) 
VALUES (
  'manafeng@126.com',
  'manafeng',
  '$2a$10$/6A36X.518ihLAdYg/E9g.ewqM90fpF4isvb6SjycrlKg2sQwq6EO',
  'admin',
  NOW()
);
