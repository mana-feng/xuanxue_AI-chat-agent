# MySQL 连接问题排查

## 错误信息

```
创建数据库失败: Access denied for user 'root'@'localhost' (using password: NO)
MySQL 连接失败: Access denied for user 'root'@'localhost' (using password: NO)
```

## 问题原因

这个错误表示：
1. **密码未配置**: `DB_PASS` 环境变量未设置或为空
2. **`.env` 文件不存在**: 项目根目录缺少 `.env` 文件
3. **密码错误**: `.env` 文件中的密码与实际 MySQL root 密码不匹配

## 解决方案

### 方案 1: 创建 `.env` 文件

在项目根目录创建 `.env` 文件，内容如下：

```env
# Backend server
PORT=3001
JWT_SECRET=your_jwt_secret_here

# Database configuration
# MySQL 配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=bazi_app
```

**重要**: 将 `your_mysql_password` 替换为你的实际 MySQL root 密码。

### 方案 2: 检查 MySQL 密码

#### Windows (MySQL)
```bash
# 如果忘记了 MySQL root 密码，可以重置
# 1. 停止 MySQL 服务
net stop MySQL

# 2. 以跳过权限表的方式启动 MySQL
mysqld --skip-grant-tables

# 3. 在另一个命令行窗口连接 MySQL
mysql -u root

# 4. 重置密码
USE mysql;
UPDATE user SET authentication_string=PASSWORD('new_password') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;

# 5. 重启 MySQL 服务
net start MySQL
```

#### Linux/Mac
```bash
# 停止 MySQL
sudo systemctl stop mysql
# 或
sudo service mysql stop

# 以安全模式启动
sudo mysqld_safe --skip-grant-tables &

# 连接并重置密码
mysql -u root
USE mysql;
UPDATE user SET authentication_string=PASSWORD('new_password') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;

# 重启 MySQL
sudo systemctl start mysql
```

### 方案 3: 使用其他 MySQL 用户

如果不想使用 root 用户，可以创建专用用户：

```sql
-- 连接到 MySQL
mysql -u root -p

-- 创建新用户和数据库
CREATE DATABASE IF NOT EXISTS bazi_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bazi_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON bazi_app.* TO 'bazi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

然后在 `.env` 文件中使用新用户：

```env
DB_USER=bazi_user
DB_PASS=your_password
DB_NAME=bazi_app
```

## 验证配置

### 1. 检查 `.env` 文件

确保 `.env` 文件在项目根目录，且包含以下配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=你的MySQL密码
DB_NAME=bazi_app
```

### 2. 测试 MySQL 连接

使用命令行测试连接：

```bash
mysql -u root -p
# 输入密码，如果成功连接则说明密码正确
```

### 3. 检查环境变量加载

在 `server/db.js` 中添加调试输出（临时）：

```javascript
console.log('DB_CONFIG:', {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password ? '***' : '(empty)',
    database: DB_CONFIG.database
});
```

## 常见问题

### Q1: `.env` 文件在哪里？

**A**: `.env` 文件应该在项目根目录，与 `package.json` 同级。

```
项目根目录/
├── .env          ← 这里
├── package.json
├── server/
└── src/
```

### Q2: 如何确认 MySQL 服务正在运行？

**Windows**:
```bash
net start | findstr MySQL
```

**Linux/Mac**:
```bash
sudo systemctl status mysql
# 或
sudo service mysql status
```

### Q3: 密码包含特殊字符怎么办？

如果密码包含特殊字符（如 `@`, `#`, `$` 等），在 `.env` 文件中需要用引号包裹：

```env
DB_PASS="your@password#123"
```

### Q4: 如何确认密码是否正确？

使用命令行测试：

```bash
mysql -u root -p
# 输入密码，如果连接成功则密码正确
```

### Q5: 忘记 MySQL root 密码怎么办？

参考上面的"重置 MySQL 密码"部分。

## 配置检查清单

- [ ] `.env` 文件存在于项目根目录
- [ ] `.env` 文件包含 `DB_PASS` 配置
- [ ] `DB_PASS` 的值不为空
- [ ] `DB_PASS` 的值与 MySQL root 密码匹配
- [ ] MySQL 服务正在运行
- [ ] 可以使用 `mysql -u root -p` 连接 MySQL

## 下一步

配置完成后，重启服务器：

```bash
npm run dev:server
```

如果仍有问题，检查服务器启动日志中的详细错误信息。

