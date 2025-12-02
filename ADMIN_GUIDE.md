# 管理员后台使用指南

## 功能概述

管理员后台系统提供了以下功能：

1. **数据统计**：查看总用户数、总记录数、今日新增等统计数据
2. **用户管理**：查看、搜索、修改用户角色、删除用户
3. **记录管理**：查看、搜索、删除所有用户的八字排盘记录

## 访问方式

1. 启动后端服务器（`node server/app.js`）
2. 在浏览器或应用中访问：`/pages/admin/login`
3. 使用管理员账号登录

## 创建第一个管理员账号

### 方法一：通过数据库直接设置（推荐）

1. 使用SQLite工具打开 `server/bazi.db`
2. 找到 `users` 表
3. 找到要设置为管理员的用户记录
4. 将 `role` 字段的值改为 `admin`
5. 保存并关闭数据库

### 方法二：通过代码创建

在 `server/app.js` 启动后，可以通过SQL命令设置：

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 方法三：通过管理员后台设置

1. 先通过方法一或方法二创建一个管理员账号
2. 使用该管理员账号登录后台
3. 在"用户管理"页面中，可以将其他用户设置为管理员

## 管理员权限说明

- **管理员（admin）**：可以访问所有管理员后台功能
- **普通用户（user）**：只能使用普通功能，无法访问管理员后台

## 安全注意事项

1. **不要删除自己的管理员权限**：系统会阻止管理员修改自己的角色
2. **不要删除自己的账号**：系统会阻止管理员删除自己的账号
3. **谨慎删除用户**：删除用户会同时删除该用户的所有八字记录，此操作不可恢复
4. **保护管理员账号**：建议使用强密码，并定期更换

## API接口说明

所有管理员API都需要在请求头中携带有效的管理员token：

```
Authorization: Bearer <your-admin-token>
```

### 主要接口

- `GET /api/admin/stats` - 获取统计数据
- `GET /api/admin/users` - 获取用户列表（支持分页和搜索）
- `GET /api/admin/users/:id` - 获取用户详情
- `PUT /api/admin/users/:id/role` - 更新用户角色
- `DELETE /api/admin/users/:id` - 删除用户
- `GET /api/admin/records` - 获取记录列表（支持分页和搜索）
- `DELETE /api/admin/records/:id` - 删除记录

## 页面路由

- `/pages/admin/login` - 管理员登录页
- `/pages/admin/dashboard` - 管理员后台首页（数据统计）
- `/pages/admin/users` - 用户管理页
- `/pages/admin/records` - 记录管理页

## 故障排查

### 无法登录管理员后台

1. 检查账号的 `role` 字段是否为 `admin`
2. 检查后端服务器是否正常运行
3. 检查网络连接是否正常

### 提示"需要管理员权限"

1. 确认当前登录账号的 `role` 字段为 `admin`
2. 尝试重新登录
3. 检查token是否过期（默认7天有效期）

### 统计数据不显示

1. 检查后端API是否正常响应
2. 查看浏览器控制台的错误信息
3. 确认数据库连接正常

## 开发说明

### 数据库结构变更

系统会自动检测并添加 `role` 字段到 `users` 表。如果表已存在但没有 `role` 字段，系统会在启动时自动添加，默认值为 `user`。

### 扩展功能

如需添加更多管理员功能，可以：

1. 在 `server/app.js` 中添加新的API接口（使用 `adminMiddleware`）
2. 在 `src/api/admin.ts` 中添加对应的API调用函数
3. 在 `src/pages/admin/` 目录下创建新的管理页面

