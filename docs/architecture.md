# Architecture & Conventions

本项目采用前后端同仓（近似 monorepo）的布局，目标是分层清晰、依赖方向明确、易于维护与扩展。

## 顶层目录

```
repo/
  frontend/           # uni-app / Vue3 客户端
  backend/            # 后端服务（待后续细化模块化）
  docs/               # 文档
  scripts/            # 辅助脚本（预留）
  .editorconfig
  .eslintrc.*         # 统一代码规范
  .prettierrc
  RESTRUCTURE_PLAN.md # 重构计划与路线
```

## 前端分层（frontend/src）

```
src/
  assets/             # 静态资源
  components/         # 通用 UI 组件（无业务耦合）
  features/           # 业务域聚合（如 liuyao）
    liuyao/
      *.ts            # 六爻算法/数据
      data/           # 卦辞等静态数据
      index.ts        # barrel 导出
  pages/              # 路由页面（薄层，组合 feature 与 UI）
  services/           # API 调用封装（待逐步抽离）
  store/              # 全局 Pinia store
  styles/             # 全局样式、主题
  types/              # 通用类型声明（统一出口）
  utils/              # 纯工具函数（无业务副作用）
  config/             # 配置、常量
```

### 依赖方向

- `components/` 不依赖具体业务域（features）。
- `features/<x>/` 可依赖 `services/ utils/ types/ config/ store`，跨 feature 需通过公共层。
- `pages/` 仅做组合与路由，不放核心业务逻辑。
- `utils/` 纯函数，不反向依赖业务。

## 命名与导出

- 目录/文件统一使用 `kebab-case` 或业务约定的简洁命名。
- 每个 feature 提供 `index.ts` barrel 导出。
- types 目录提供 `types/index.ts` 统一出口。
- 使用 `@/` 路径别名，避免深层相对路径。

## 环境与配置

- `.env.example` 提供示例；真实变量放本地 `.env`（已在 .gitignore 中忽略）。
- 启动前优先检查必要环境变量（逐步引入 schema 校验）。

## 测试与构建

- 前端：`npm install && npm run build`（位于 `frontend/`）。
- 后端：后续在 `backend/` 补充模块化与构建脚本。

## 约束

- 不跨层乱引用（UI 直接依赖底层实现），保持边界清晰。
- 删除前确认未引用；合并/迁移后保证能编译。
