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
  `raw_payload` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT NULL,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_bazi_records_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
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

-- 应用配置表（用于存储配置信息）
CREATE TABLE IF NOT EXISTS `app_config` (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  `updated_at` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建默认管理员账号
-- username: manafeng
-- password: manafeng
-- 如果账号已存在则忽略（使用 INSERT IGNORE）
INSERT IGNORE INTO `users` (`email`, `username`, `password_hash`, `role`, `created_at`) 
VALUES (
  'manafeng@admin.local',
  'manafeng',
  '$2a$10$dLqhM.TmLP1ocaiys7XiFO9FtumrK0Kn8o7m49fpjq273uXVqXdLa',
  'admin',
  NOW()
);
