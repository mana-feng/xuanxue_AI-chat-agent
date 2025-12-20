# RESTRUCTURE_PLAN

> 目标：在不改动对外功能与接口的前提下，构建工业级可维护的目录与分层。采用小步迁移、随时可回滚的策略。当前仅规划，不包含迁移动作记录。

## Phase A 现状地图与痛点

- 仓库结构
  - `frontend/`：uni-app/Vue3 前端（含 pages、components、store、utils、styles、assets 等），存在构建产物 `dist/`、`unpackage/`、`node_modules/`。
  - `backend/`：后端代码（待深入整理）。
  - `liuyao/`：独立的六爻逻辑副本（算法、数据、页面示例），与前端 `src/utils/liuyao/` 重复，计划后续删除。
  - `docs/`：文档。
  - 根部配置：`.eslintrc.cjs`、`.prettierrc`、`.editorconfig`、`package*.json` 等。
- 问题/痛点
  - **重复代码**：根目录 `liuyao/` 与前端 `src/utils/liuyao/` 重复，易漂移。
  - **分层缺失**：前端缺少按 feature/服务的清晰分层，业务逻辑散落在 `pages/` 与 `utils/`。
  - **产物混放**：`dist/`、`node_modules/`、`unpackage/` 等构建输出和日志位于仓库内，需规范忽略。
  - **配置分散**：前后端缺少统一的 env 示例和校验；ESLint/Prettier 尚未集中。
  - **命名/导出不统一**：缺少 barrel 导出与统一的命名规则；相对路径层级较深。
  - **依赖版本差异**：前端 `lunar-javascript` 已升至 `^1.7.7`，需保证锁定；后端依赖未梳理。

## Phase B 目标结构与依赖规则

采用近似 monorepo 结构（保留现有 apps），明确依赖方向。允许根据实际情况微调，但保持职责清晰。

```
repo/
  apps/
    frontend/                  # 现有前端迁入此处（保持 uni-app/Vue3）
      src/
        assets/
        components/            # 通用 UI 组件（无业务耦合）
        features/              # 按业务域拆分（例如 bazi、liuyao、user、admin 等）
          <feature>/
            components/        # 业务专属组件
            services/          # 调用 API / 业务逻辑
            store/             # 该域的 pinia（或 hooks）
            types.ts
            index.ts           # barrel 导出
        pages/                 # 路由页（薄层，聚合 feature）
        services/              # 跨域 API client / 请求封装
        store/                 # 全局 store（如 appConfig、user）
        utils/                 # 纯工具函数，无业务副作用
        styles/                # 全局样式与主题
        types/                 # 通用类型，提供 barrel `index.ts`
        constants/
        config/                # 配置、环境变量读取
      tests/
      package.json
      vite.config.* / uni 配置
    backend/                   # 保留现有后端（按模块拆分）
      src/
        modules/               # 业务模块（controller/service/repo）
        common/                # 中间件、异常、日志
        config/                # env schema、配置加载
        routes/
        utils/
        types/
      package.json
  packages/
    shared/                    # 前后端可共享的无环境依赖 types/utils（若有需求）
      src/
        types/
        utils/
      package.json
  docs/                        # 架构、开发、运维文档
  infra/                       # 部署、CI、容器等（若后续需要）
  scripts/                     # 脚本与检查
  .editorconfig
  .eslintrc.*
  .prettierrc
  README.md
```

### 依赖方向（必须落地）
- `components/` 不依赖业务域（features）。
- `features/<x>/` 允许依赖 `services/ utils/ types/ constants/ config/ store`，跨 feature 通过公共层或明确接口。
- `services/` 负责对接 API，统一错误/超时/token 注入；页面/feature 通过 services 获取数据。
- `utils/` 纯函数，无副作用，不能反向依赖业务。
- `shared/`（如创建）不得依赖 uni-app/node 专属 API。

## Phase C 迁移步骤（小步迭代，每步可回滚）

1. **规划与文档**：
   - 添加/完善 `RESTRUCTURE_PLAN.md`（本文件）与 `docs/architecture.md`、`docs/dev.md` 初稿。
   - README 增补当前结构说明与启动命令。

2. **前端目录重组（保持可编译）**：
   - 将现有 `frontend/src` 内业务按 feature 拆分（bazi、liuyao、user/admin 等），但可先创建 `features/` 容器，逐模块迁移。
   - 抽取公共 API 请求封装到 `services/`，保留原接口签名；修正 import。
   - 将业务专属组件放入对应 feature 的 `components/`；通用组件留在 `components/`。
   - 整理 `store/`：全局 store 保留在 `store/`，业务 store 可放 feature 内或导入后由全局注册；增加 `store/index.ts` barrel。
   - 整理 `types/` 与 `constants/`：建立 barrel `types/index.ts`。
   - 统一使用 `@/` 别名减少深层相对路径。

3. **去重与清理**：
   - 确认前端 `src/utils/liuyao` 已覆盖根 `liuyao/` 功能与数据后，删除根 `liuyao/`（先记录理由：未被引用、前端有完整实现）。
   - 清理构建产物/日志：更新 `.gitignore`（dist、node_modules、unpackage、日志）。

4. **配置与规范**：
   - 统一 ESLint/Prettier/EditorConfig：在根放置最小可行配置，前后端复用（如需子项目覆盖可保留局部配置）。
   - 环境变量：提供 `.env.example`；在前端/后端启动时增加 env 校验（最小 schema）。

5. **文档更新**：
   - 更新 `README.md`：目录说明、install/build/dev/test、常见问题。
   - `docs/architecture.md`：分层、依赖方向、命名规范、路径别名。
   - `docs/dev.md`：开发启动流程、环境变量说明、构建/测试命令。

6. **验证**：
   - 每个迁移阶段运行构建/基础测试（前端：`npm run build`；后端同理），确保可回滚。

## 风险与回滚
- 风险：移动文件导致路径错、构建失败；删除重复目录误删；环境变量校验导致启动失败。
- 缓解：
  - 每次移动后立即修正 import 并跑 `npm run build`（前端），后端同理。
  - 删除根 `liuyao/` 前确认无引用；如有引用则改为指向前端 utils。
  - Env 校验以“警告+默认”方式渐进，引入时提供 `.env.example`。
- 回滚：
  - 保持小步提交，任意阶段可通过 git revert 回退。
  - 迁移顺序：先文档/结构壳子，再逐模块迁移，最后清理与规范。
