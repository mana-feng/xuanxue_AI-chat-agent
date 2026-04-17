# 玄学AI Chat & Agent

基于 AI Agent 的玄学排盘系统，支持八字/六爻/紫微排盘。

## 项目结构

```
.
├── backend-docker/          # Node.js + Express 后端
│   ├── routes/             # API 路由
│   ├── services/           # 业务服务
│   ├── middleware/         # 中间件
│   ├── security.js         # 安全防护工具
│   ├── security-middleware.js  # 安全中间件
│   ├── admin-ui/           # 管理端前端
│   └── .env.example        # 环境变量模板
├── frontend-docker/        # 用户前端 (uni-app)
│   ├── src/
│   │   ├── features/agent/ # Agent 核心逻辑
│   │   ├── pages/         # 页面组件
│   │   └── store/         # 状态管理
│   └── Dockerfile
└── docker-compose.deploy.example.yml  # 部署配置模板
```

## 前置要求

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **MySQL** 8.0+
- **Docker & Docker Compose**（可选，用于容器化部署）

## 快速开始

### 本地开发

**后端**

```bash
cd backend-docker
npm install
cp .env.example .env
# 编辑 .env 填写必要配置
npm run dev
```

**用户前端**

```bash
cd frontend-docker
npm install
npm run dev:h5
```

**管理端**

```bash
cd backend-docker/admin-ui
npm install
npm run dev:h5
```


访问：

- 用户端：<http://localhost:3000>
- 管理端：[http://localhost:3002](http://localhost:3001)

## 核心功能

- **八字排盘**：四柱排盘、十神分析、大运流年
- **六爻排盘**：时间起卦、手动起卦、卦象分析
- **紫微斗数**：命盘生成、十二宫位、星曜分析
- **AI Agent**：自然语言交互、智能排盘调度
- **管理系统**：用户管理、记录管理、LLM 配置

## 界面预览

### AI Agent

|               排盘 Agent 首页               |                 Agent 对话                |
| :-------------------------------------: | :-------------------------------------: |
| ![Agent 首页](screenshots/agent-home.png) | ![Agent 对话](screenshots/agent-chat.png) |

### 八字排盘

|                  排盘输入                 |                  排盘结果                  |
| :-----------------------------------: | :------------------------------------: |
| ![八字排盘输入](screenshots/chart.png) | ![八字排盘结果](screenshots/bazi-result.png) |

|                   增强分析                   |                  大运流年                 |
| :--------------------------------------: | :-----------------------------------: |
| ![八字增强分析](screenshots/bazi-analysis.png) | ![八字大运流年](screenshots/bazi-dayun.png) |

### 紫微斗数

![紫微命盘](screenshots/ziwei.png)

### 六爻排盘

![六爻卦象](screenshots/liuyao.png)

## 安全特性

### 全局防护

- Host 头部注入防护（Nginx + 后端双重验证）
- CORS 白名单验证
- SQL 注入防护
- XSS 防护
- 请求速率限制
- Content Security Policy (CSP)
- 输入验证与清理
- API 请求签名验证

### 聊天界面防护

- **WebSocket 身份认证**：JWT Token 验证，无效或过期 Token 立即断开连接
- **消息频率限制**：每用户每分钟最多 5 条消息，防止滥用
- **额度管控**：每次对话前检查用户 LLM 额度，超额自动拒绝
- **输入验证**：严格校验消息格式（JSON 解析、数组类型检查）
- **错误信息脱敏**：服务端错误经脱敏处理后返回，防止敏感信息泄露
- **LLM 响应清理**：自动剥离 Ollama 思考块等内部标记，过滤 HTML 标签
- **安全日志记录**：记录 4xx/5xx 请求但过滤正常业务错误，便于安全审计

## 技术栈

- **后端**: Node.js, Express, MySQL
- **前端**: Vue 3, TypeScript, uni-app
- **AI**: 多模型适配 (Gemini, Ollama, Anthropic)
- **部署**: Docker, Docker Compose
- **安全**: 多层安全防护中间件

## 环境变量配置

本项目使用 `.env` 文件管理敏感配置。各模块的 `.env` 文件**不会被提交到仓库**，需自行从 `.env.example` 复制并填写：

```bash
# 后端
cd backend-docker
cp .env.example .env
# 编辑 .env，至少配置 JWT_SECRET、API_SIGNATURE_SECRET、数据库密码

# 前端
cd frontend-docker
cp .env.example .env
# 编辑 .env，配置 API_SIGNATURE_SECRET

# 管理端
cd backend-docker/admin-ui
cp .env.example .env
# 编辑 .env，配置 API_SIGNATURE_SECRET
```

详细配置项请参考各目录下的 `.env.example` 文件中的注释说明。

## Docker 部署

```bash
# 复制部署配置
cp docker-compose.deploy.example.yml docker-compose.deploy.yml

# 编辑 docker-compose.deploy.yml，替换所有 CHANGE_ME 值
# 包括数据库密码、JWT_SECRET、API_SIGNATURE_SECRET 等

# 拉取镜像并启动
docker compose -f docker-compose.deploy.yml pull
docker compose -f docker-compose.deploy.yml up -d
```

访问：
- 用户端：`http://localhost:3000`
- 管理端：`http://localhost:3002`

## 免责声明

本项目所有内容**仅供娱乐与学习研究**，不构成任何专业建议。玄学文化源远流长，请勿过度依赖或迷信。生活中的重要决策，请结合实际情况理性判断。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- **Bug 反馈**：请附上问题描述、复现步骤、平台信息及截图
- **功能建议**：请说明使用场景和期望效果
- **代码贡献**：请保持代码风格一致，提交前运行 lint 检查

## 许可证

本项目采用 GNU Affero General Public License v3.0 (AGPL-3.0) 许可证。

## 鸣谢

- [toon-format/toon](https://github.com/toon-format/toon) - Token-Oriented Object Notation
- [axbug/8Char-Uni-App](https://github.com/axbug/8Char-Uni-App) - 基于 Uni-APP 的八字排盘工具
