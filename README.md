# AI-xuanxue（mana玄学AI）

工业级可维护的玄学排盘项目（前后端同仓，前端 uni-app/Vue3，后端 Node）。目标是分层清晰、依赖可控、快速启动。

## 目录速览

```
.
├─ frontend/          # 客户端（uni-app / Vue3）
├─ backend/           # 服务端（待进一步模块化）
├─ docs/              # 文档（架构、开发指南）
├─ scripts/           # 辅助脚本（预留）
└─ RESTRUCTURE_PLAN.md
```

前端关键分层（frontend/src）：

- `pages/` 路由页面（薄层）
- `components/` 通用组件
- `features/` 业务域聚合（如 `liuyao` 算法与数据）
- `services/` API 封装（逐步抽离中）
- `store/` Pinia 状态
- `utils/` 纯工具
- `styles/` 全局样式
- `types/` 类型出口

更多细节：`docs/architecture.md`。

## 快速开始

### 环境

- Node.js 18+
- npm（项目使用 npm 锁）

### 前端

```bash
cd frontend
npm install
npm run dev   # 开发
npm run build # 构建
```

环境变量：复制根部 `.env.example` 为 `.env`（或 `frontend/.env`），按需修改 `VITE_API_BASE_URL` 等。

### 后端

代码位于 `backend/`，请参考其中说明（后续会补充模块化与文档）。

## 规范与配置

- 统一的 `.editorconfig`、`.eslintrc.*`、`.prettierrc` 位于仓库根。
- 环境变量示例：`.env.example`。
- 目录/文件命名保持简洁、统一，尽量使用 `@/` 别名代替深层相对路径。

## 文档

- `RESTRUCTURE_PLAN.md` 重构计划与迁移路线。
- `docs/architecture.md` 分层与依赖方向、命名规范。
- `docs/dev.md` 本地开发与常见问题。

## 状态与后续

当前已开始按业务域聚合（如 `features/liuyao`），后续将逐步完成：

- 按 feature 抽取服务/组件
- 统一 API 封装与 env 校验
- 清理历史重复目录（根 `liuyao/` 计划废弃）

保持小步提交，任何阶段可通过 git revert 回滚。
