# MySQL 初始化说明

## 概述

项目在启动时会自动完成 MySQL 数据库的初始化，包括创建数据库、创建表结构、初始化配置表等。

## 初始化流程

### 1. 服务器启动流程 (`bootstrap()`)

```javascript
async function bootstrap() {
    // 1. 初始化数据库连接
    await initDatabase();
    db = getDatabase();
    
    // 2. MySQL 自动初始化（如果表不存在）
    if (db.pool) {
        await autoInitMySQLTables(db.pool);
    }
    
    // 3. 初始化表结构（兼容性创建）
    await initTables();
    
    // 4. 初始化配置表
    await ConfigService.initTable(db);
    
    // 5. 加载邮箱配置
    await loadEmailConfig();
    
    // 6. 确保管理员账号存在
    await ensureAdminAccount();
}
```

### 2. 数据库连接初始化 (`initDatabase()`)

**位置**: `server/db.js`

**功能**:
1. **确保数据库存在** (`ensureDatabaseExists()`)
   - 创建数据库（如果不存在）
   - 数据库名: `bazi_app`（从环境变量 `DB_NAME` 读取）
   - 字符集: `utf8mb4`
   - 排序规则: `utf8mb4_unicode_ci`

2. **创建连接池**
   - 使用 `mysql2/promise` 创建连接池
   - 连接配置从环境变量读取：
     - `DB_HOST`: 数据库主机（默认: localhost）
     - `DB_PORT`: 端口（默认: 3306）
     - `DB_USER`: 用户名（默认: root）
     - `DB_PASS`: 密码
     - `DB_NAME`: 数据库名（默认: bazi_app）

3. **测试连接**
   - 获取连接并立即释放，验证连接成功

### 3. 自动初始化表结构 (`autoInitMySQLTables()`)

**位置**: `server/db.js`

**功能**:
1. **检查表是否存在**
   - 查询 `information_schema.tables` 检查 `users` 表是否存在
   - 如果表不存在，说明数据库未初始化

2. **执行初始化脚本**
   - 如果 `users` 表不存在，执行 `server/init-mysql.sql` 脚本
   - 脚本会自动创建所有必要的表结构

3. **错误处理**
   - 忽略 "表已存在"、"索引已存在" 等错误
   - 其他错误会记录警告但不阻止启动

### 4. 初始化脚本 (`init-mysql.sql`)

**位置**: `server/init-mysql.sql`

**创建的表**:

#### a) `users` - 用户表
```sql
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `username` VARCHAR(50) UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) DEFAULT 'user',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### b) `bazi_records` - 八字记录表
```sql
CREATE TABLE IF NOT EXISTS `bazi_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100),
  `gender` VARCHAR(10),
  `birth_datetime` VARCHAR(50),
  `calendar_type` VARCHAR(20),
  `raw_payload` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### c) `email_verification_codes` - 邮箱验证码表
```sql
CREATE TABLE IF NOT EXISTS `email_verification_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_code` (`email`, `code`, `type`, `used`),
  INDEX `idx_email_expires` (`email`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### d) `app_config` - 应用配置表
```sql
CREATE TABLE IF NOT EXISTS `app_config` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**默认管理员账号**:
```sql
INSERT IGNORE INTO `users` (`email`, `username`, `password_hash`, `role`) 
VALUES (
  'manafeng@admin.local',
  'manafeng',
  '$2a$10$dLqhM.TmLP1ocaiys7XiFO9FtumrK0Kn8o7m49fpjq273uXVqXdLa',
  'admin'
);
```
- 用户名: `manafeng`
- 密码: `manafeng`
- 邮箱: `manafeng@admin.local`
- 角色: `admin`

### 5. 兼容性表创建 (`initTables()`)

**位置**: `server/app.js`

**功能**:
- 如果自动初始化脚本未执行（表已存在），使用代码方式创建表
- 确保所有表结构都存在
- 使用 `CREATE TABLE IF NOT EXISTS`，不会覆盖现有表

**创建的表**:
- `users`
- `bazi_records`
- `email_verification_codes`

### 6. 配置表初始化 (`ConfigService.initTable()`)

**位置**: `server/config-service.js`

**功能**:
- 创建 `app_config` 表（如果不存在）
- 用于存储加密的配置信息（如邮箱配置）

**表结构**:
```sql
CREATE TABLE IF NOT EXISTS app_config (
  `key` VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### 7. 管理员账号确保 (`ensureAdminAccount()`)

**位置**: `server/app.js`

**功能**:
- 检查默认管理员账号是否存在
- 如果不存在，自动创建
- 用户名: `manafeng`
- 密码: `manafeng`（使用 bcrypt 加密）

## 初始化顺序

```
1. initDatabase()
   ├─ ensureDatabaseExists()      # 创建数据库
   ├─ 创建连接池
   └─ 测试连接

2. autoInitMySQLTables()
   ├─ 检查 users 表是否存在
   ├─ 如果不存在，执行 init-mysql.sql
   └─ 创建所有表和默认管理员账号

3. initTables()
   └─ 兼容性创建表（如果脚本未执行）

4. ConfigService.initTable()
   └─ 创建 app_config 表

5. loadEmailConfig()
   └─ 从 app_config 表加载邮箱配置

6. ensureAdminAccount()
   └─ 确保管理员账号存在
```

## 环境变量配置

在 `.env` 文件中配置：

```env
# MySQL 配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=bazi_app
```

## 初始化特点

### ✅ 自动化
- 无需手动创建数据库和表
- 服务器启动时自动完成初始化

### ✅ 幂等性
- 使用 `IF NOT EXISTS` 确保重复执行不会出错
- 使用 `INSERT IGNORE` 避免重复插入管理员账号

### ✅ 容错性
- 忽略 "表已存在" 等错误
- 如果初始化脚本不存在，使用代码方式创建表

### ✅ 安全性
- 默认管理员账号密码使用 bcrypt 加密
- 配置信息使用 AES-256-GCM 加密存储

## 手动初始化（可选）

如果需要手动执行初始化脚本：

```bash
mysql -u root -p < server/init-mysql.sql
```

或者连接到 MySQL 后执行：

```sql
SOURCE server/init-mysql.sql;
```

## 注意事项

1. **数据库权限**
   - 确保 MySQL 用户有创建数据库的权限
   - 确保有创建表的权限

2. **字符集**
   - 数据库和表都使用 `utf8mb4` 字符集
   - 支持完整的 Unicode 字符（包括 emoji）

3. **默认管理员账号**
   - 首次启动后会自动创建
   - 建议首次登录后修改密码
   - 如果账号已存在，不会重复创建

4. **表结构更新**
   - 如果表已存在，不会自动更新表结构
   - 需要手动执行 ALTER TABLE 语句

5. **初始化脚本**
   - `init-mysql.sql` 会被自动执行（如果表不存在）
   - 也可以手动执行进行初始化

## 日志输出

初始化过程中的日志输出：

```
✓ 数据库 bazi_app 已确保存在
✓ MySQL 数据库连接成功
检测到 MySQL 数据库未初始化，正在执行初始化脚本...
正在执行 MySQL 初始化脚本: F:\github\AI-xuanxue\server\init-mysql.sql
将执行 X 条 SQL 语句
✓ MySQL 初始化脚本执行完成
✓ MySQL 数据库表结构已自动初始化
✓ 默认管理员账号已创建
   用户名: manafeng
   密码: manafeng
   邮箱: manafeng@admin.local
```

或者如果表已存在：

```
✓ 数据库 bazi_app 已确保存在
✓ MySQL 数据库连接成功
✓ MySQL 数据库表已存在，跳过初始化
✓ 默认管理员账号已存在
```

## 总结

MySQL 初始化是完全自动化的，包括：

1. ✅ 自动创建数据库
2. ✅ 自动创建表结构
3. ✅ 自动创建默认管理员账号
4. ✅ 自动初始化配置表
5. ✅ 自动加载邮箱配置

只需确保 MySQL 服务运行并配置好环境变量，服务器启动时会自动完成所有初始化工作。

