# API 接口文档

本文档描述了八字排盘系统后端 API 的所有接口。

## 基础信息

- **Base URL**: 由环境变量 `VITE_API_BASE_URL` 配置（前端）或 `PORT` 配置（后端）
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **认证方式**: JWT Bearer Token（部分接口需要）

## 认证机制

### JWT 双 Token 机制

- **Access Token**: 短期有效（默认 30 分钟），用于 API 请求认证
- **Refresh Token**: 长期有效（默认 15 天），用于刷新 Access Token

### 请求头

需要认证的接口需要在请求头中携带：

```
Authorization: Bearer <access_token>
X-Device-Id: <device_id>
```

## 接口列表

### 1. 健康检查

**GET** `/api/health`

检查后端服务是否正常运行。

**响应示例**:
```json
{
  "ok": true,
  "message": "bazi backend running"
}
```

---

### 2. 用户认证

#### 2.1 用户注册

**POST** `/api/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "device_id": "device-id-123"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "role": "user"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh-token-string"
}
```

#### 2.2 用户登录

**POST** `/api/auth/login`

**请求体**:
```json
{
  "identifier": "user@example.com",  // 支持邮箱或用户名
  "password": "password123",
  "device_id": "device-id-123"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "role": "user"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh-token-string"
}
```

#### 2.3 刷新 Token

**POST** `/api/auth/refresh`

**请求体** (App/小程序):
```json
{
  "refresh_token": "refresh-token-string",
  "device_id": "device-id-123"
}
```

**请求** (H5): Refresh Token 通过 Cookie 传递，只需传递 `device_id`。

**响应示例**:
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "new-refresh-token-string"  // 可选，如果返回了新的 refresh_token
}
```

#### 2.4 用户登出

**POST** `/api/auth/logout`

**请求头**: 需要认证

**请求体** (App/小程序):
```json
{
  "refresh_token": "refresh-token-string",
  "device_id": "device-id-123"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 3. 邮箱验证

#### 3.1 发送验证码

**POST** `/api/email/send-code`

**请求体**:
```json
{
  "email": "user@example.com",
  "type": "register"  // "register" 或 "reset"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

#### 3.2 验证验证码

**POST** `/api/email/verify-code`

**请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "type": "register"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "验证码正确"
}
```

---

### 4. 八字记录

#### 4.1 保存八字记录

**POST** `/api/bazi`

**请求头**: 需要认证

**请求体**:
```json
{
  "name": "张三",
  "gender": "male",
  "birth_datetime": "1990-01-01 12:00:00",
  "calendar_type": "solar",
  "raw_payload": "{...}"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "保存成功",
  "id": 1
}
```

#### 4.2 获取八字记录列表

**GET** `/api/bazi`

**请求头**: 需要认证

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "张三",
      "gender": "male",
      "birth_datetime": "1990-01-01 12:00:00",
      "calendar_type": "solar",
      "created_at": "2024-01-01 12:00:00"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20
}
```

#### 4.3 获取八字记录详情

**GET** `/api/bazi/:id`

**请求头**: 需要认证

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "gender": "male",
    "birth_datetime": "1990-01-01 12:00:00",
    "calendar_type": "solar",
    "raw_payload": "{...}",
    "created_at": "2024-01-01 12:00:00"
  }
}
```

#### 4.4 删除八字记录

**DELETE** `/api/bazi/:id`

**请求头**: 需要认证

**响应示例**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 5. 管理员接口

所有管理员接口都需要 `admin` 角色权限。

#### 5.1 获取用户列表

**GET** `/api/admin/users`

**请求头**: 需要认证（管理员）

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）

#### 5.2 获取八字记录列表（管理员）

**GET** `/api/admin/records`

**请求头**: 需要认证（管理员）

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）

#### 5.3 获取邮箱配置

**GET** `/api/admin/email-config`

**请求头**: 需要认证（管理员）

#### 5.4 更新邮箱配置

**POST** `/api/admin/email-config`

**请求头**: 需要认证（管理员）

**请求体**:
```json
{
  "host": "smtp.example.com",
  "port": 465,
  "user": "user@example.com",
  "pass": "password",
  "from": "user@example.com",
  "fromName": "八字排盘系统"
}
```

#### 5.5 获取 LLM 配置

**GET** `/api/admin/llm-config`

**请求头**: 需要认证（管理员）

#### 5.6 更新 LLM 配置

**POST** `/api/admin/llm-config`

**请求头**: 需要认证（管理员）

**请求体**:
```json
{
  "provider": "openai",
  "base_url": "https://api.openai.com/v1/chat/completions",
  "api_key": "sk-...",
  "model": "gpt-3.5-turbo",
  "extra": "{}"
}
```

---

### 6. WebSocket 聊天接口

**WS** `/ws/chat`

用于 AI 聊天功能的 WebSocket 连接。

**连接参数**:
- 需要在连接时传递 `access_token` 作为查询参数或请求头

**消息格式**:
```json
{
  "type": "message",
  "content": "用户消息内容"
}
```

**响应格式**:
```json
{
  "type": "message",
  "content": "AI 回复内容",
  "done": false  // 是否完成
}
```

---

## 错误响应

所有接口在出错时都会返回统一的错误格式：

```json
{
  "success": false,
  "error": "错误信息",
  "message": "详细错误描述"
}
```

### 常见错误码

- `400`: 请求参数错误
- `401`: 未授权（Token 无效或过期）
- `403`: 权限不足
- `404`: 资源不存在
- `429`: 请求频率过高
- `500`: 服务器内部错误

---

## 请求频率限制

- **认证接口** (`/api/auth/*`): 每分钟最多 10 次
- **严格限制接口** (`/api/email/send-code`): 每分钟最多 5 次
- **刷新 Token** (`/api/auth/refresh`): 每分钟最多 20 次
- **其他接口**: 无特殊限制

---

## 注意事项

1. 所有需要认证的接口都需要在请求头中携带 `Authorization: Bearer <access_token>`
2. 所有请求都应该携带 `X-Device-Id` 请求头
3. H5 场景下，Refresh Token 通过 HttpOnly Cookie 传递
4. App/小程序场景下，Refresh Token 通过请求体传递
5. 生产环境建议配置 CORS 白名单，限制允许的前端域名

