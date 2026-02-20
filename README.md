# AI Xuanxue Workspace

`AI-xuanxue` 是一个包含后端 API、用户前端、管理端的完整工作区，主要用于玄学排盘（八字/六爻/紫微）与相关账号、记录、AI 配额管理能力。

## 1. 项目结构

```text
.
├─ backend-docker/             # Node.js + Express 后端
│  ├─ routes/                  # API 路由（auth/bazi/liuyao/ziwei/admin/llm/...）
│  ├─ admin-ui/                # 管理端（uni-app H5）
│  ├─ init-mysql.sql           # MySQL 初始化脚本
│  ├─ .env*.example            # 后端环境变量模板
│  └─ Dockerfile
├─ frontend-docker/            # 用户前端（uni-app）
│  ├─ src/pages/               # 用户端页面
│  ├─ Dockerfile
│  └─ nginx.conf
├─ docker-compose.deploy.example.yml  # 部署模板（推荐从这里复制）
├─ docker-compose.deploy.yml          # 实际部署文件（已在 .gitignore 中忽略）
└─ package.json                # 根级 Docker 快捷命令
```

## 2. 服务架构与端口

- `backend`：后端 API 服务，容器内端口 `3000`
- `frontend`：用户前端，映射端口 `3000:3000`
- `admin-ui`：管理端前端，映射端口 `3001:3001`
- `db`：MySQL 8.0，数据卷 `db_data`

部署模式下，`frontend` 和 `admin-ui` 通过 nginx 反代访问 `backend:3000` 的 `/api` 与 WebSocket 路径。

## 3. 功能概览

### 3.1 后端 API（`backend-docker`）

- 认证与会话：注册、登录、刷新令牌、退出
- 排盘记录：八字/六爻/紫微记录的增删改查
- 系统能力：健康检查、前端 bootstrap 配置
- AI 能力：LLM 配置、调用与配额管理
- 管理能力：用户管理、记录管理、公告、邮件配置、统计等

### 3.2 用户前端（`frontend-docker`）

- 用户登录与鉴权
- 八字、六爻、紫微相关页面
- 历史记录、设置、聊天页面

### 3.3 管理端（`backend-docker/admin-ui`）

- 管理员登录
- 用户与记录管理
- LLM 模型、配额、公告、邮件、统计配置

## 4. 运行方式

## 4.1 推荐：Docker 部署

1. 复制模板为真实部署文件：

```bash
cp docker-compose.deploy.example.yml docker-compose.deploy.yml
```

PowerShell:

```powershell
Copy-Item docker-compose.deploy.example.yml docker-compose.deploy.yml
```

2. 编辑 `docker-compose.deploy.yml`，至少替换以下占位符：

- 镜像地址：`x-images`
- 数据库密码：`DB_PASS`、`MYSQL_ROOT_PASSWORD`
- 安全密钥：`JWT_SECRET`、`API_SIGNATURE_SECRET`
- 管理员账号：`ADMIN_EMAIL`、`ADMIN_PASSWORD`
- 域名与 CORS：`CORS_ORIGINS`

3. 启动部署：

```bash
docker compose -f docker-compose.deploy.yml pull backend frontend admin-ui db
docker compose -f docker-compose.deploy.yml up -d --pull always --force-recreate backend frontend admin-ui db
```

4. 访问地址：

- 用户端：`http://<host>:3000`
- 管理端：`http://<host>:3001`

## 4.2 本地开发（不走 Docker 全量部署）

### 4.2.1 后端

```bash
cd backend-docker
npm install
cp .env.development.example .env
npm run dev
```

注意：

- 如果你没有本地证书文件，建议将 `.env` 中 `HTTPS_ENABLED=false`，否则后端会按 HTTPS 配置启动并要求证书。
- 后端依赖 MySQL，请确保数据库可用且 `.env` 中数据库参数正确。

### 4.2.2 用户前端

```bash
cd frontend-docker
npm install
npm run dev:h5
```

说明：

- 前端使用 Vite/uni-app 的环境变量机制，可按需创建本地 `.env` 文件。
- 默认开发端口为 `3000`，API 代理目标可通过 `VITE_API_PROXY_TARGET` 覆盖。

### 4.2.3 管理端

```bash
cd backend-docker/admin-ui
npm install
cp .env.development.example .env
npm run dev:h5
```

默认开发端口为 `3002`，可通过 `VITE_DEV_PORT` 调整。

## 5. 环境变量与安全策略

仓库已配置为仅保留模板：

- 会忽略所有真实 `.env` 文件
- 仅保留 `*.env.example` / `*.env.development.example` / `*.env.production.example`
- 会忽略真实 `docker-compose.deploy.yml`，保留 `docker-compose.deploy.example.yml`

关键建议：

- 生产环境必须替换所有 `CHANGE_ME_*` 和 `replace_with_*` 占位值
- `JWT_SECRET` 与 `API_SIGNATURE_SECRET` 建议使用高强度随机字符串（至少 32 字符，建议更长）
- 不要将真实密钥、密码、证书提交到仓库

## 6. 数据库初始化

- 部署模式下，`db` 服务会挂载 `backend-docker/init-mysql.sql` 到 `/docker-entrypoint-initdb.d/init.sql`
- 首次启动 MySQL 容器时会自动初始化数据库与基础表
- 持久化卷：`db_data`

## 7. 常用命令

根目录（`package.json`）：

```bash
npm run docker:up
npm run docker:pull-up
```

说明：

- `docker:up` / `docker:pull-up` 依赖 `docker-compose.deploy.yml`，请先由 example 复制生成。
- 当前 `docker:push` 脚本指向 `./scripts/push-dockerhub.ps1`，但该脚本在当前仓库中不存在；执行前请先补齐脚本或调整命令。

子项目命令：

- 后端：`backend-docker/package.json`
- 用户前端：`frontend-docker/package.json`
- 管理端：`backend-docker/admin-ui/package.json`

## 8. 故障排查

- 启动失败并提示找不到 `docker-compose.deploy.yml`：
  - 先从 `docker-compose.deploy.example.yml` 复制生成真实部署文件。
- 后端本地启动失败（证书相关）：
  - 检查 `HTTPS_ENABLED` 与证书路径，或直接在本地将 `HTTPS_ENABLED=false`。
- 前端/管理端无法请求 API：
  - 检查 `VITE_API_PROXY_TARGET`、`VITE_API_BASE_URL` 与后端实际地址是否一致。
- 登录后接口签名错误：
  - 确认前端与后端 `API_SIGNATURE_SECRET` 一致，且 `API_SIGNATURE_DISABLED` 配置符合预期。

