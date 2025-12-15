# API签名强制模式说明

## 概述

API签名验证已改为**强制模式**，所有使用签名验证的路由都必须提供有效的签名，否则请求将被拒绝。

## 变更说明

### 之前（可选模式）
- 支持可选和强制两种模式
- 通过 `REQUIRE_API_SIGNATURE` 环境变量控制
- 开发环境默认不强制，只记录警告

### 现在（强制模式）
- **所有使用签名验证的路由都强制要求有效签名**
- 移除了可选模式和相关配置
- 缺少签名或签名验证失败会直接拒绝请求

## 影响范围

### 后端路由
以下路由现在都强制要求签名：

1. **八字记录路由** (`/api/bazi`)
   - POST - 创建记录
   - PUT - 更新记录
   - DELETE - 删除记录

2. **LLM路由** (`/api/llm`)
   - POST /chat - 聊天接口

3. **认证路由** (`/api/auth`)
   - POST /register - 注册
   - POST /refresh - 刷新Token

4. **管理员路由** (`/api/admin`)
   - 所有 POST/PUT/DELETE 操作

### 前端请求
- 所有通过 `request()` 函数发送的 `needAuth && (POST/PUT/DELETE)` 请求都会自动添加签名
- 前端必须确保签名正确生成和发送

## 配置要求

### 必须设置的环境变量

```bash
# API签名密钥（必须设置）
API_SIGNATURE_SECRET=<强随机字符串，至少32位>
```

**注意**：
- 如果不设置 `API_SIGNATURE_SECRET`，将使用 `JWT_SECRET` 作为签名密钥
- 生产环境**强烈建议**单独设置 `API_SIGNATURE_SECRET`，且应该与 `JWT_SECRET` 不同

### 已移除的配置

以下配置项已移除，不再需要：
- ~~`REQUIRE_API_SIGNATURE`~~ - 已移除，现在始终强制

## 错误处理

### 缺少签名信息
```json
{
  "error": "缺少签名信息，请求被拒绝。请确保请求包含 X-Timestamp、X-Nonce 和 X-Signature 请求头"
}
```
HTTP状态码：400

### 签名验证失败
```json
{
  "error": "签名验证失败"  // 或 "请求已过期" / "请求重复"
}
```
HTTP状态码：401

### 时间戳过期
```json
{
  "error": "请求已过期"
}
```
HTTP状态码：401

### 重放攻击
```json
{
  "error": "请求重复"
}
```
HTTP状态码：401

## 前端实现

前端已自动为所有需要认证的 POST/PUT/DELETE 请求添加签名：

```typescript
// frontend/src/api/index.ts
// 自动为 needAuth && (POST/PUT/DELETE) 请求添加签名
if (needAuth && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
  const signed = signRequest(sanitizedData, requestHeaders);
  Object.assign(requestHeaders, signed.headers);
}
```

签名信息会自动添加到请求头：
- `X-Timestamp`: 时间戳
- `X-Nonce`: 随机数
- `X-Signature`: 签名

## 测试建议

### 功能测试
1. ✅ 测试带签名的请求是否正常处理
2. ✅ 测试缺少签名的请求（应该返回 400 错误）
3. ✅ 测试签名验证失败的请求（应该返回 401 错误）
4. ✅ 测试重放攻击（使用相同的 nonce 应该返回 401 错误）
5. ✅ 测试过期请求（时间戳超过5分钟应该返回 401 错误）

### 开发环境测试
- 确保前端正确生成和发送签名
- 确保后端正确验证签名
- 测试各种错误场景

## 迁移指南

### 从可选模式迁移

如果你之前使用的是可选模式，现在需要：

1. **移除环境变量**：
   ```bash
   # 删除这行（如果存在）
   # REQUIRE_API_SIGNATURE=true
   ```

2. **确保设置签名密钥**：
   ```bash
   # 必须设置
   API_SIGNATURE_SECRET=<强随机字符串>
   ```

3. **验证前端签名**：
   - 确保前端正确生成和发送签名
   - 检查请求头是否包含 `X-Timestamp`、`X-Nonce` 和 `X-Signature`

4. **测试所有API**：
   - 测试所有使用签名验证的路由
   - 确保没有遗漏的请求

## 注意事项

1. **前端必须**：前端必须为所有需要认证的 POST/PUT/DELETE 请求添加签名
2. **密钥安全**：`API_SIGNATURE_SECRET` 必须使用强随机字符串，不要泄露
3. **时间同步**：确保服务器时间准确，时间戳验证窗口为5分钟
4. **错误处理**：前端应该正确处理签名验证失败的错误

## 总结

✅ **API签名验证已改为强制模式**
- 所有使用签名验证的路由都强制要求有效签名
- 移除了可选模式和相关配置
- 提高了安全性，确保所有敏感操作都受到保护

---

**更新时间**：2024年
**版本**：v2.0（强制模式）

