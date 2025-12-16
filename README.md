# mana玄学AI - 八字排盘系统

基于 uni-app 的 Web、App、微信小程序三端应用，采用**完全独立的前后端分离架构**。

## 📖 项目简介

mana玄学AI 是一个专业的八字排盘系统，支持多端部署（Web、App、微信小程序），提供完整的八字排盘、分析、记录管理等功能。项目采用前后端完全分离的架构，前端使用 uni-app 框架，后端使用 Node.js + Express，数据存储在 MySQL 数据库中。

### 核心特性

- ✅ **多端支持**：一套代码，支持 Web、App、微信小程序
- ✅ **八字排盘**：完整的八字排盘计算和分析功能
- ✅ **用户系统**：JWT 双 Token 认证机制，支持注册、登录、邮箱验证
- ✅ **数据管理**：排盘记录保存、查询、导出功能
- ✅ **AI 聊天**：集成多种大语言模型，提供 AI 解读功能
- ✅ **管理员后台**：完整的后台管理系统
- ✅ **安全防护**：SQL注入防护、XSS防护、API签名验证等

## 🏗️ 项目架构

### 独立项目结构

本项目采用**完全前后端分离**的架构，前后端完全独立，仅通过 API 通信：

```
AI-xuanxue/
├── frontend/          # 前端项目（完全独立）
│   ├── src/          # 前端源代码
│   ├── package.json  # 前端依赖
│   └── ...
│
├── backend/          # 后端项目（完全独立）
│   ├── app.js        # 后端入口
│   ├── routes/       # API路由
│   ├── package.json  # 后端依赖
│   └── ...
│
└── docs/             # 项目文档
```

### 数据流向

```
前端项目 (frontend/)
    ↓ HTTP/HTTPS API
后端项目 (backend/)
    ↓ SQL 查询
MySQL 数据库
```

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 16.x
- **MySQL**: >= 5.7 或 >= 8.0
- **npm**: >= 7.x

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd AI-xuanxue
```

#### 2. 安装依赖

**方式一：使用统一脚本（推荐）**

```bash
npm run install:all
```

**方式二：分别安装**

```bash
# 安装后端依赖
cd backend
npm install
cd ..

# 安装前端依赖
cd frontend
npm install
cd ..
```

#### 3. 配置环境变量

**后端配置**

```bash
cd backend

# 复制环境变量示例文件
cp env.example .env

# 编辑 .env 文件，配置以下内容：
# - DB_PASS: 数据库密码（必须修改）
# - JWT_SECRET: JWT密钥（必须修改为强随机字符串，至少32位）
# - CORS_ORIGINS: 前端域名（如果部署H5）
```

**前端配置**

```bash
cd frontend

# 复制环境变量示例文件
cp .env.example .env.dev

# 编辑 .env.dev 文件，配置后端API地址：
# VITE_API_BASE_URL=http://localhost:3001
```

> 📝 **详细配置说明**：请参考 [环境变量配置说明](./docs/环境变量配置说明.md)

#### 4. 初始化数据库

```bash
cd backend

# 确保 MySQL 服务已启动
# 编辑 .env 文件中的数据库配置

# 启动后端服务（会自动创建数据库和表）
npm start
```

#### 5. 启动开发服务器

**方式一：使用启动脚本（Windows）**

```bash
# 在项目根目录执行
start-dev.bat
```

**方式二：手动启动**

```bash
# 终端1 - 启动后端
cd backend
npm start

# 终端2 - 启动前端（H5）
cd frontend
npm run dev:h5
```

#### 6. 访问应用

- **前端 H5**: http://localhost:3000
- **后端 API**: http://localhost:3001

## 📱 多端开发

### H5 开发

```bash
cd frontend
npm run dev:h5
```

### 微信小程序开发

```bash
cd frontend
npm run dev:mp-weixin
```

然后在微信开发者工具中打开 `frontend/dist/dev/mp-weixin` 目录。

### App 开发

```bash
cd frontend
npm run dev:app
```

## 🛠️ 构建部署

### 前端构建

```bash
cd frontend

# H5 构建
npm run build:h5

# 微信小程序构建
npm run build:mp-weixin

# App 构建
npm run build:app
```

### 后端部署

```bash
cd backend
npm start
```

> 📝 **详细部署指南**：请参考 [部署指南](./docs/部署指南.md)

## 📁 项目结构

```
AI-xuanxue/
├── frontend/              # 前端项目（uni-app）
│   ├── src/              # 源代码
│   │   ├── api/         # API调用封装
│   │   ├── pages/       # 页面
│   │   ├── components/  # 组件
│   │   ├── store/       # 状态管理（Pinia）
│   │   ├── utils/       # 工具函数
│   │   └── config/      # 配置文件
│   ├── dist/            # 构建产物
│   ├── package.json     # 前端依赖
│   └── vite.config.ts   # Vite 配置
│
├── backend/             # 后端项目（Node.js + Express）
│   ├── app.js           # 主应用入口
│   ├── routes/          # API路由
│   ├── middleware/      # 中间件
│   ├── services/        # 业务服务
│   ├── utils/           # 工具函数
│   ├── database/       # 数据库初始化
│   ├── websocket/       # WebSocket服务
│   ├── package.json     # 后端依赖
│   └── .env             # 环境变量（不提交到Git）
│
└── docs/                # 项目文档
    ├── API接口文档.md
    ├── 部署指南.md
    ├── 安全架构说明.md
    └── ...
```

> 📝 **详细结构说明**：请参考 [项目结构说明](./docs/项目结构说明.md)

## 🎯 主要功能

### 用户功能

- ✅ 八字排盘计算（年、月、日、时四柱）
- ✅ 排盘结果查看和保存
- ✅ 历史记录查询和管理
- ✅ 排盘数据导出（JSON格式）
- ✅ 用户注册/登录（邮箱验证）
- ✅ AI 聊天解读功能

### 管理员功能

- ✅ 用户管理
- ✅ 排盘记录管理
- ✅ 邮箱服务配置
- ✅ 大语言模型配置
- ✅ AI 额度管理

## 🛡️ 安全特性

- ✅ **SQL注入防护**：使用参数化查询
- ✅ **XSS防护**：输入验证和输出转义
- ✅ **密码加密**：使用 bcrypt 加密存储
- ✅ **JWT认证**：双 Token 机制（Access Token + Refresh Token）
- ✅ **API签名**：防重放攻击
- ✅ **CORS配置**：跨域请求控制
- ✅ **请求限流**：防止恶意请求
- ✅ **输入验证**：严格的参数验证

> 📝 **详细安全说明**：请参考 [安全架构说明](./docs/安全架构说明.md)

## 🛠️ 技术栈

### 前端

- **框架**: uni-app 3.x
- **语言**: TypeScript
- **UI框架**: Vue 3 + Pinia
- **构建工具**: Vite
- **UI组件**: TMUI

### 后端

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: MySQL
- **认证**: JWT (jsonwebtoken)
- **加密**: bcryptjs
- **WebSocket**: ws

## 📚 文档目录

所有详细文档都在 `docs/` 目录中：

- [API接口文档](./docs/API接口文档.md) - 完整的 API 接口说明
- [部署指南](./docs/部署指南.md) - 前后端部署流程
- [部署配置清单](./docs/部署配置清单.md) - 部署前配置检查清单
- [安全架构说明](./docs/安全架构说明.md) - 安全架构和防护措施
- [环境变量配置说明](./docs/环境变量配置说明.md) - 环境变量配置指南
- [项目结构说明](./docs/项目结构说明.md) - 项目结构详细说明
- [API签名强制模式说明](./docs/API签名强制模式说明.md) - API签名机制说明

## 🔧 开发规范

### 前后端分离原则

- ✅ 前端项目完全独立，不包含后端代码
- ✅ 后端项目完全独立，不包含前端代码
- ✅ 前后端仅通过 HTTP/HTTPS API 通信
- ✅ 配置文件完全分离
- ✅ 可以独立部署到不同服务器

### 代码规范

- ✅ 使用 TypeScript（前端）
- ✅ 遵循 ESLint 规范
- ✅ 使用 Prettier 格式化
- ✅ 环境变量配置，不硬编码
- ✅ 敏感信息不提交到Git

## 🐛 常见问题

### 1. 数据库连接失败

- 检查 MySQL 服务是否启动
- 检查 `.env` 文件中的数据库配置是否正确
- 检查数据库用户权限

### 2. 前端无法连接后端

- 检查后端服务是否启动（默认端口 3001）
- 检查 `frontend/.env.dev` 中的 `VITE_API_BASE_URL` 配置
- 检查 CORS 配置

### 3. 小程序编译失败

- 检查是否安装了 uni-app CLI
- 检查 `manifest.json` 配置是否正确
- 参考 [uni-app 官方文档](https://uniapp.dcloud.net.cn/)


