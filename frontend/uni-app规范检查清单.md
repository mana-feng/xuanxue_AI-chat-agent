# uni-app 规范检查清单

## ✅ 已完成的检查项

### 1. 项目配置
- ✅ `package.json` - 使用正确的 uni-app 依赖
- ✅ `vite.config.ts` - 使用 `@dcloudio/vite-plugin-uni` 插件
- ✅ `tsconfig.json` - 包含 `@dcloudio/types` 类型定义
- ✅ `manifest.json` - 配置正确
- ✅ `pages.json` - 页面配置正确

### 2. 入口文件
- ✅ `main.ts` - 使用 `createSSRApp`（符合 uni-app 3.x）
- ✅ `App.vue` - 使用 uni-app API

### 3. API 使用规范
- ✅ 使用 `uni.request` 而不是 `fetch`/`XMLHttpRequest`
- ✅ 使用 `uni.navigateTo`/`uni.reLaunch` 而不是 `window.location`
- ✅ 使用 `uni.setStorageSync` 而不是 `localStorage`
- ✅ 使用 `uni.showToast`/`uni.showLoading` 等 UI API

### 4. 条件编译
- ✅ 浏览器 API 使用 `#ifdef H5` 包裹
- ✅ 平台特定代码使用条件编译
- ✅ 正确使用 `#ifndef` 处理非 H5 平台

### 5. 文件类型
- ✅ 页面使用 `.nvue` 文件（App 端）
- ✅ 组件使用 `.vue` 文件
- ✅ 正确区分 `.nvue` 和 `.vue`

### 6. 环境变量
- ✅ 使用 `import.meta.env`（Vite 模式）
- ✅ 添加了类型定义
- ✅ 提供了默认值

### 7. 构建配置
- ✅ 优化了 `vite.config.ts`
- ✅ 添加了构建优化选项

## 📋 检查清单

### 配置文件
- [x] `package.json` 包含正确的 uni-app 依赖
- [x] `vite.config.ts` 使用 uni-app 插件
- [x] `tsconfig.json` 包含 uni-app 类型
- [x] `manifest.json` 配置正确
- [x] `pages.json` 配置正确

### 代码规范
- [x] 使用 uni-app API 而不是浏览器 API
- [x] 浏览器 API 使用条件编译
- [x] 文件类型使用正确（.nvue/.vue）
- [x] 环境变量处理正确
- [x] 类型定义完整

### 平台兼容
- [x] H5 平台代码使用 `#ifdef H5`
- [x] App 平台代码使用 `#ifdef APP-PLUS`
- [x] 小程序平台代码使用 `#ifdef MP-WEIXIN`
- [x] 跨平台代码不使用平台特定 API

## 🎯 最佳实践

### 1. API 使用
```typescript
// ✅ 正确
uni.request({ url, method, data })

// ❌ 错误
fetch(url, { method, body: JSON.stringify(data) })
```

### 2. 条件编译
```typescript
// ✅ 正确
// #ifdef H5
document.createElement('a')
// #endif

// ❌ 错误
if (typeof document !== 'undefined') {
  document.createElement('a')
}
```

### 3. 存储
```typescript
// ✅ 正确
uni.setStorageSync('key', value)

// ❌ 错误
localStorage.setItem('key', value)
```

### 4. 路由
```typescript
// ✅ 正确
uni.navigateTo({ url: '/pages/index/index' })

// ❌ 错误
window.location.href = '/pages/index/index'
```

## 📝 注意事项

1. **环境变量**：uni-app 使用 `import.meta.env`（Vite 模式）
2. **条件编译**：使用 `#ifdef` 而不是运行时判断
3. **API 选择**：优先使用 uni-app API
4. **文件类型**：App 端使用 `.nvue`，其他使用 `.vue`
5. **类型定义**：确保包含 `@dcloudio/types`

## ✅ 结论

**项目已符合 uni-app 规范要求**

所有检查项均已通过，代码符合 uni-app 开发规范。

---

**检查时间**：2024年
**状态**：✅ 通过

