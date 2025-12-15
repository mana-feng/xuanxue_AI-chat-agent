# AI-xuanxue 八字排盘系统

基于 uni-app 的 Web、App、微信小程序三端应用，采用**完全独立的前后端分离架构**。

## 项目架构

### 独立项目结构

本项目已拆分为**两个完全独立的项目**，仅通过 API 和配置文件对接：

- **前端项目** (`frontend/`): uni-app 应用，支持 Web、App、微信小程序
  - 独立的 `package.json` 和依赖管理
  - 仅通过 HTTP API 与后端通信
  - 不包含任何数据库连接信息
  - 不存储敏感信息（密码、密钥等）

- **后端项目** (`backend/`): Node.js + Express API 服务
  - 独立的 `package.json` 和依赖管理
  - 提供 RESTful API 和 WebSocket 服务
  - 所有数据存储在 MySQL 数据库
  - 处理用户认证、数据存储等业务逻辑

### 数据流向

```
前端项目 (frontend/)
    ↓ HTTP/HTTPS API (通过 VITE_API_BASE_URL 配置)
后端项目 (backend/)
    ↓ SQL 查询
MySQL 数据库
```

## 快速开始

### 开发环境

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd AI-xuanxue
   ```

2. **安装依赖**

   可以分别安装，或使用根目录的统一脚本：
   ```bash
   # 方式1：分别安装
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   
   # 方式2：使用统一脚本（推荐）
   npm run install:all
   ```

3. **配置环境变量**
   
   ```bash
   # 后端配置
   cd backend
   cp env.example .env
   # 编辑 .env，配置数据库和JWT密钥
   
   # 前端配置
   cd ../frontend
   cp env.example .env.development
   # 编辑 .env.development，配置后端API地址（如 http://localhost:3001）
   ```

4. **启动服务**

   可以使用启动脚本或手动启动：
   ```bash
   # 方式1：使用启动脚本（Windows）
   start-dev.bat
   
   # 方式2：手动启动
   # 终端1 - 启动后端
   cd backend
   npm start
   
   # 终端2 - 启动前端
   cd frontend
   npm run dev:h5
   ```

### 项目分离说明

详细的项目分离说明和迁移指南请参考：

- 📝 [项目分离说明](./docs/项目分离说明.md) - 项目拆分说明和迁移指南
- 📝 [API接口文档](./docs/API接口文档.md) - 完整的 API 接口文档

## 部署指南

### 前后端分离部署

详细的前后端分离部署指南请参考：

- 📝 [部署指南](./docs/部署指南.md) - 完整的前后端部署流程说明

### 配置文件说明

#### 前端配置（`.env.production`）

前端配置文件中**仅需要**后端API地址：

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

**前端配置文件中不要包含**：
- ❌ 数据库连接信息
- ❌ JWT密钥
- ❌ 任何敏感信息

#### 后端配置（`.env`）

后端配置文件中包含服务器和数据库配置：

```env
PORT=3001
JWT_SECRET=your_random_secret_key
CORS_ORIGINS=https://your-frontend-domain.com

DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=bazi_app
```

## 项目结构

```
AI-xuanxue/
├── frontend/              # 前端独立项目（完全隔离）
│   ├── src/               # 前端源代码
│   │   ├── api/           # API调用封装
│   │   ├── pages/         # 页面
│   │   ├── components/    # 组件
│   │   ├── store/         # 状态管理
│   │   └── config/        # 配置文件（仅API地址）
│   ├── dist/              # 构建产物
│   ├── unpackage/         # uni-app 打包产物
│   ├── scripts/           # 构建脚本
│   ├── package.json       # 前端依赖
│   ├── vite.config.ts     # Vite 配置
│   ├── androidPrivacy.json # Android隐私配置
│   └── README.md          # 前端说明文档
│
├── backend/               # 后端独立项目（完全隔离）
│   ├── app.js            # 主应用文件
│   ├── db.js             # 数据库连接
│   ├── routes/           # API路由
│   ├── middleware/       # 中间件
│   ├── services/         # 业务服务
│   ├── package.json       # 后端依赖
│   └── README.md          # 后端说明文档
│
├── docs/                  # 项目文档
│   ├── API接口文档.md     # API 接口说明
│   ├── 部署指南.md        # 部署流程说明
│   ├── 安全架构说明.md    # 安全架构
│   └── ...                # 其他文档
│
├── package.json           # 根目录统一管理脚本
├── start-dev.bat          # 开发环境启动脚本（Windows）
├── stop-dev.bat           # 停止服务脚本（Windows）
├── 项目结构说明.md        # 项目结构详细说明
└── README.md              # 本文件
```

**详细结构说明请参考**：[项目结构说明.md](./项目结构说明.md)

## 功能特性

- ✅ 八字排盘计算
- ✅ 用户注册/登录（JWT双Token机制）
- ✅ 八字记录保存和查询
- ✅ 管理员后台
- ✅ 邮箱验证码
- ✅ AI聊天功能（支持多种LLM）
- ✅ 多端支持（Web、App、微信小程序）

## 技术栈

### 前端
- uni-app 3.x
- Vue 3
- TypeScript
- Pinia
- Vite

### 后端
- Node.js
- Express.js
- MySQL
- JWT认证
- WebSocket

## 安全特性

- ✅ SQL注入防护
- ✅ XSS防护
- ✅ 输入验证
- ✅ 密码加密存储（bcrypt）
- ✅ JWT Token认证
- ✅ CORS配置
- ✅ 请求频率限制

## 开发规范

- **前端项目**：`frontend/` 目录，独立开发和部署
- **后端项目**：`backend/` 目录，独立开发和部署
- **配置文件**：使用环境变量，不要硬编码
- **敏感信息**：不要提交到Git仓库
- **API对接**：仅通过 HTTP API 和配置文件对接

## 独立项目说明

每个项目都有独立的 README 文档：

- [前端项目说明](./frontend/README.md) - 前端项目详细说明
- [后端项目说明](./backend/README.md) - 后端项目详细说明
- [项目结构说明](./项目结构说明.md) - 项目结构详细说明

## 许可证

ISC

## 相关文档

- [项目分离说明](./docs/项目分离说明.md) - 项目拆分说明和迁移指南
- [API接口文档](./docs/API接口文档.md) - 完整的 API 接口文档
- [部署指南](./docs/部署指南.md) - 完整的前后端部署流程说明

