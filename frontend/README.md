# 八字排盘系统 - 前端应用

独立的前端项目，基于 uni-app 开发，支持 Web、App、微信小程序三端。

## 项目结构

```
frontend/
├── src/                    # 源代码
│   ├── api/                # API调用封装
│   ├── pages/              # 页面
│   ├── components/         # 组件
│   ├── store/              # 状态管理
│   ├── config/             # 配置文件（仅API地址）
│   └── utils/              # 工具函数
├── scripts/                # 脚本
├── package.json            # 依赖配置
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 配置环境变量

复制示例文件并修改：

```bash
cp env.example .env.development
```

编辑 `.env.development` 文件，配置后端API地址：

```env
# 后端API基础地址
# 开发环境示例：http://localhost:3001
VITE_API_BASE_URL=http://localhost:3001
```

**重要提示**：前端配置文件中不要包含任何数据库信息、JWT密钥等敏感信息。前端仅需要知道后端API的地址。

### 3. 启动开发服务器

```bash
# H5
npm run dev:h5

# 微信小程序
npm run dev:mp-weixin

# App
npm run dev:app
```

## 构建

```bash
# H5
npm run build:h5

# 微信小程序
npm run build:mp-weixin

# App
npm run build:app
```

## API 对接

前端通过 HTTP API 与后端通信，API 地址通过环境变量 `VITE_API_BASE_URL` 配置。

详细 API 文档请参考：[API 接口文档](../docs/API接口文档.md)

### 主要功能

- ✅ 八字排盘计算
- ✅ 用户注册/登录（JWT双Token机制）
- ✅ 八字记录保存和查询
- ✅ 管理员后台
- ✅ 邮箱验证码
- ✅ AI聊天功能（支持多种LLM）
- ✅ 多端支持（Web、App、微信小程序）

## 技术栈

- uni-app 3.x
- Vue 3
- TypeScript
- Pinia
- Vite

## 安全特性

- ✅ 前端不存储密码等敏感信息
- ✅ 仅通过 API 与后端通信
- ✅ JWT Token 认证
- ✅ 输入验证和 XSS 防护

## 许可证

ISC

