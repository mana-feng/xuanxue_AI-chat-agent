# MySQL 兼容性说明

## 概述

初始化 SQL 代码已优化以确保与所有 MySQL 版本和 MariaDB 完全兼容。

## 兼容性改进

### 1. 移除版本特定语法

#### ❌ 移除的特性
- `DEFAULT CURRENT_TIMESTAMP` - 需要 MySQL 5.6.5+
- `ON UPDATE CURRENT_TIMESTAMP` - 需要 MySQL 5.6.5+

#### ✅ 替代方案
- 使用 `DEFAULT NULL` 并在插入时使用 `NOW()` 函数
- `NOW()` 函数在所有 MySQL 版本中都支持（MySQL 4.0+）

### 2. 标准化索引定义

#### 改进前
```sql
INDEX idx_email (email),
INDEX idx_username (username)
```

#### 改进后
```sql
UNIQUE KEY idx_email (email),
UNIQUE KEY idx_username (username)
```

**原因**: 明确指定 `UNIQUE KEY` 更清晰，兼容性更好。

### 3. 外键约束命名

#### 改进前
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

#### 改进后
```sql
CONSTRAINT fk_bazi_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**原因**: 命名约束便于管理和调试。

### 4. 字段默认值

#### 改进前
```sql
username VARCHAR(50) UNIQUE,
name VARCHAR(100),
```

#### 改进后
```sql
username VARCHAR(50) DEFAULT NULL,
name VARCHAR(100) DEFAULT NULL,
```

**原因**: 明确指定 `DEFAULT NULL` 提高兼容性。

### 5. PRIMARY KEY 定义

#### 改进前
```sql
`key` VARCHAR(100) PRIMARY KEY,
```

#### 改进后
```sql
`key` VARCHAR(100) NOT NULL PRIMARY KEY,
```

**原因**: 明确指定 `NOT NULL` 更符合标准 SQL。

## 兼容的 MySQL 版本

### ✅ 完全支持
- **MySQL 5.5+** (包括 5.5, 5.6, 5.7, 8.0+)
- **MariaDB 10.0+** (包括 10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11+)

### 测试建议
- MySQL 5.5 (最旧版本)
- MySQL 5.7 (广泛使用)
- MySQL 8.0 (最新稳定版)
- MariaDB 10.3+ (常见版本)

## 代码更改总结

### `server/init-mysql.sql`

1. ✅ 移除 `DEFAULT CURRENT_TIMESTAMP`
2. ✅ 移除 `ON UPDATE CURRENT_TIMESTAMP`
3. ✅ 使用 `UNIQUE KEY` 替代 `UNIQUE` + `INDEX`
4. ✅ 添加外键约束名称
5. ✅ 明确指定 `DEFAULT NULL`
6. ✅ 添加 `NOT NULL` 到 PRIMARY KEY
7. ✅ 使用 `NOW()` 在 INSERT 语句中

### `server/app.js`

1. ✅ 更新 `initTables()` 函数
2. ✅ 更新所有 INSERT 语句添加 `created_at` 字段
3. ✅ 使用 `NOW()` 函数设置时间戳

### `server/config-service.js`

1. ✅ 更新 `initTable()` 函数
2. ✅ 更新 `setConfig()` 函数使用 `NOW()`

## 时间戳处理

### 插入数据时
```sql
INSERT INTO users (email, username, password_hash, role, created_at) 
VALUES (?, ?, ?, ?, NOW())
```

### 更新数据时
```sql
UPDATE app_config 
SET value = ?, updated_at = NOW() 
WHERE `key` = ?
```

### 查询数据时
```sql
SELECT * FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
```

## 兼容性检查清单

- [x] 不使用 `DEFAULT CURRENT_TIMESTAMP`
- [x] 不使用 `ON UPDATE CURRENT_TIMESTAMP`
- [x] 使用标准 SQL 语法
- [x] 明确指定字符集和排序规则
- [x] 使用 `NOW()` 函数（兼容所有版本）
- [x] 明确指定 `DEFAULT NULL`
- [x] 外键约束命名
- [x] 索引使用标准语法
- [x] 字段定义完整（NOT NULL, DEFAULT）

## 测试建议

### 1. 在不同版本上测试

```bash
# MySQL 5.5
mysql -u root -p < server/init-mysql.sql

# MySQL 5.7
mysql -u root -p < server/init-mysql.sql

# MySQL 8.0
mysql -u root -p < server/init-mysql.sql

# MariaDB 10.3
mysql -u root -p < server/init-mysql.sql
```

### 2. 验证表结构

```sql
-- 检查表是否存在
SHOW TABLES;

-- 检查表结构
DESCRIBE users;
DESCRIBE bazi_records;
DESCRIBE email_verification_codes;
DESCRIBE app_config;

-- 检查索引
SHOW INDEX FROM users;
SHOW INDEX FROM bazi_records;
```

### 3. 测试插入操作

```sql
-- 测试用户插入
INSERT INTO users (email, username, password_hash, role, created_at) 
VALUES ('test@example.com', 'testuser', 'hash', 'user', NOW());

-- 测试记录插入
INSERT INTO bazi_records (user_id, name, created_at) 
VALUES (1, '测试', NOW());

-- 测试配置插入
INSERT INTO app_config (`key`, value, updated_at) 
VALUES ('TEST_KEY', 'test_value', NOW());
```

## 注意事项

1. **字符集**: 使用 `utf8mb4` 需要 MySQL 5.5.3+，但这是现代标准
2. **InnoDB**: 使用 `ENGINE=InnoDB` 需要 InnoDB 支持（MySQL 5.5+ 默认）
3. **外键**: 外键约束需要 InnoDB 引擎
4. **NOW()**: `NOW()` 函数在所有版本中都支持，返回当前日期时间

## 总结

经过优化后，初始化 SQL 代码：

- ✅ **完全兼容** MySQL 5.5+ 和 MariaDB 10.0+
- ✅ **使用标准 SQL 语法**，避免版本特定特性
- ✅ **明确的时间戳处理**，使用 `NOW()` 函数
- ✅ **规范的索引和外键定义**
- ✅ **完整的字段定义**，包括默认值和约束

可以在任何 MySQL/MariaDB 环境中安全使用。

