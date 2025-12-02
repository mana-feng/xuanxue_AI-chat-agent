# 前端项目结构说明

## 目录结构

```
src/
├── api/                    # API接口管理
│   ├── index.ts           # 统一请求方法
│   ├── auth.ts            # 认证相关API
│   ├── bazi.ts            # 八字排盘相关API
│   ├── email.ts           # 邮箱验证码相关API
│   └── types.ts           # API类型定义
│
├── assets/                 # 静态资源
│   ├── fonts/             # 字体文件
│   ├── icons/             # 图标文件
│   └── images/            # 图片文件
│
├── components/             # 组件目录
│   ├── business/          # 业务组件（原yxbug-cn）
│   │   ├── yx-detail-table/
│   │   ├── yx-friend/
│   │   ├── yx-nav-header/
│   │   ├── yx-top-header/
│   │   ├── yx-yun-scroll-list/
│   │   └── yxn-pillar-picker/
│   └── common/            # 通用组件（预留）
│
├── composables/           # 组合式函数（预留）
│
├── config/                # 配置文件（原common）
│   ├── config.ts          # 应用配置
│   └── emailVerification.ts # 邮箱验证工具
│
├── constants/             # 常量定义（原theme）
│   └── index.ts           # 主题常量
│
├── hooks/                 # 自定义Hooks（预留）
│
├── layouts/               # 布局组件（预留）
│
├── libs/                  # 第三方库
│   └── tmui/              # TMUI组件库（原tmui）
│
├── pages/                 # 页面目录
│   ├── auth/              # 认证页面
│   ├── history/           # 历史记录页面
│   └── index/             # 首页
│
├── router/                # 路由配置
│   └── index.ts
│
├── store/                 # 状态管理（Pinia）
│   ├── bazi.ts            # 八字数据store
│   ├── user.ts            # 用户数据store
│   └── yun.ts             # 运程数据store
│
├── styles/                # 样式文件
│   └── uni.scss           # uni-app全局样式（原uni.scss）
│
├── types/                 # TypeScript类型定义
│   └── lunar-javascript.d.ts
│
├── utils/                 # 工具函数（原tool）
│   ├── bazi-enhanced.ts  # 八字增强分析工具
│   └── utils.ts           # 通用工具函数
│
├── App.vue                # 应用根组件
├── main.ts                # 应用入口文件
├── pages.json             # 页面配置
└── manifest.json          # 应用清单
```

## 路径别名

项目使用 `@/` 作为 `src/` 的别名，所有导入路径都应使用 `@/` 前缀。

### 常用路径示例

- `@/api` - API接口
- `@/assets` - 静态资源
- `@/components` - 组件
- `@/config` - 配置文件
- `@/constants` - 常量
- `@/libs` - 第三方库
- `@/store` - 状态管理
- `@/utils` - 工具函数
- `@/types` - 类型定义

## 代码规范

### API调用

统一使用 `src/api/` 目录下的API方法，避免在页面中直接使用 `uni.request`。

```typescript
// ✅ 推荐
import { login } from '@/api/auth';
await login({ identifier: 'email', password: 'password' });

// ❌ 不推荐
uni.request({ url: API_BASE_URL + '/api/login', ... });
```

### 组件导入

- 业务组件：`@/components/business/`
- 通用组件：`@/components/common/`
- UI库组件：通过 `pages.json` 的 `easycom` 自动导入

### 工具函数

统一放在 `@/utils/` 目录下，按功能模块划分文件。

### 类型定义

- API类型：`@/api/types.ts`
- 业务类型：`@/types/` 目录
- 组件Props类型：与组件文件同目录

## 重构说明

本次重构将项目结构调整为工业级标准：

1. **目录重命名**：
   - `common` → `config`（配置文件）
   - `tool` → `utils`（工具函数）
   - `theme` → `constants`（常量定义）
   - `static` → `assets`（静态资源）

2. **目录重组**：
   - `yxbug-cn` → `components/business`（业务组件）
   - `tmui` → `libs/tmui`（第三方库）

3. **新增目录**：
   - `api/` - 统一API管理
   - `composables/` - 组合式函数（预留）
   - `hooks/` - 自定义Hooks（预留）
   - `layouts/` - 布局组件（预留）

4. **路径更新**：
   - 所有文件中的导入路径已更新
   - `pages.json` 中的组件路径已更新
   - `App.vue` 中的样式路径已更新

