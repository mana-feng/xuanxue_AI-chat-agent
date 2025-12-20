# 开发指南

## 环境准备

1. Node.js 推荐 18+。
2. 安装 pnpm/npm 任选其一（仓库当前使用 npm 锁）。
3. 复制 `.env.example` 为 `.env`，按需填写。

## 前端（frontend）

```bash
cd frontend
npm install
npm run dev   # 开发
npm run build # 生产构建
```

### 路由与分层

- 页面在 `src/pages/`，尽量保持“薄页面”。
- 业务逻辑放 `src/features/<domain>/`，可复用组件在 `src/components/`。
- 统一使用 `@/` 别名。

## 后端（backend）

- 代码位于 `backend/`，后续按 modules 分层；启动/构建命令请参考 backend 内 README（待补充）。

## 代码规范

- 根目录提供 `.editorconfig`、`.eslintrc.*`、`.prettierrc`。
- 推荐在 IDE 中开启 ESLint/Prettier 保存格式化。

## 常见问题

- 依赖安装慢：尝试切换国内镜像（如 `npm config set registry https://registry.npmmirror.com`）。
- 环境变量缺失：确认 `.env` 已复制自 `.env.example` 并填写正确。
- 构建失败：先清理 `node_modules`、`dist/unpackage` 后重装依赖，再执行 `npm run build`。
