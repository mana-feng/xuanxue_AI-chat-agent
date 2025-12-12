# Android 应用打包指南

本文档说明如何将 uni-app 项目打包为 Android APK 应用。

## 快速开始

### 使用一键构建脚本

1. **运行构建脚本**
   ```bash
   build-android.bat
   ```
   脚本会自动：
   - 检查并安装依赖
   - 构建项目
   - 输出构建结果位置

2. **使用 HBuilderX 打包**
   - 打开 HBuilderX
   - 导入项目
   - 发行 → 原生 App-云打包 → Android

### 手动构建

```bash
# 1. 安装依赖（如果未安装）
npm install

# 2. 构建项目
npm run build:app

# 3. 构建产物在 dist/dev/app-android 目录
```

---

## 方式一：使用 HBuilderX 云打包（推荐）

这是最简单的方式，无需配置 Android 开发环境。

### 前置要求

1. 下载并安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)
2. 注册 DCloud 开发者账号（用于云打包）

### 打包步骤

1. **打开项目**
   - 启动 HBuilderX
   - 文件 → 导入 → 从本地目录导入
   - 选择项目根目录 `F:\github\AI-xuanxue`

2. **配置应用信息**
   - 打开 `src/manifest.json`
   - 配置应用基本信息：
     - `appid`: 在 DCloud 控制台创建应用后获取
     - `name`: 应用名称（已配置为"八字排盘"）
     - `versionName`: 版本号（当前：1.0.0）
     - `versionCode`: 版本代码（当前：1.0.0）

3. **配置 Android 打包参数**
   - 在 `manifest.json` → `app-plus` → `distribute` → `android` 中配置：
     - 应用包名（package）
     - 应用签名（可选，首次打包会自动生成）
     - 应用图标和启动页
     - 权限配置（已配置基础权限）

4. **执行云打包**
   - 在 HBuilderX 中：发行 → 原生 App-云打包
   - 选择 Android 平台
   - 选择打包类型（测试版/正式版）
   - 填写打包信息
   - 点击打包
   - 等待打包完成，下载 APK

### 注意事项

- 云打包有免费次数限制，超出后需要付费
- 打包需要一定时间（通常 5-15 分钟）
- 首次打包建议使用测试证书

---

## 方式二：使用 CLI 构建 + Android Studio 本地打包

适合需要自定义打包配置或频繁打包的场景。

### 前置要求

1. **安装 Android Studio**
   - 下载 [Android Studio](https://developer.android.com/studio)
   - 安装 Android SDK（API Level 30+）
   - 配置环境变量：
     - `ANDROID_HOME`: Android SDK 路径
     - 将 `%ANDROID_HOME%\platform-tools` 添加到 PATH

2. **安装 Java JDK**
   - 安装 JDK 8 或更高版本
   - 配置 `JAVA_HOME` 环境变量

3. **安装 uni-app CLI**
   ```bash
   npm install -g @dcloudio/uvm
   uvm
   ```

### 打包步骤

1. **构建项目**
   ```bash
   npm run build:app
   ```
   构建产物会输出到 `dist/dev/app-android` 目录

2. **使用 Android Studio 打包**
   - 打开 Android Studio
   - 导入项目：选择 `dist/dev/app-android` 目录
   - 等待 Gradle 同步完成
   - Build → Generate Signed Bundle / APK
   - 选择 APK，配置签名
   - 选择构建类型（Debug/Release）
   - 完成打包，APK 位于 `app/build/outputs/apk/`

### 注意事项

- 需要配置 Android 开发环境，相对复杂
- 适合需要深度定制的场景
- 首次配置可能需要较长时间

---

## 方式三：使用 uni-app CLI 直接打包（实验性）

uni-app CLI 3.x 支持直接打包，但需要完整配置 Android 环境。

### 步骤

1. **确保环境配置正确**
   ```bash
   # 检查 Java
   java -version
   
   # 检查 Android SDK
   echo %ANDROID_HOME%
   ```

2. **构建并打包**
   ```bash
   npm run build:app
   ```

3. **使用 Android SDK 工具打包**
   - 进入构建输出目录
   - 使用 `gradlew` 或 Android Studio 打包

---

## 当前项目配置检查

### 已配置项

✅ **manifest.json 配置**
- 应用名称：八字排盘
- Android 权限已配置
- 启动页配置
- nvue 编译配置

✅ **package.json 脚本**
- `build:app`: 构建 App 版本
- `dev:app`: 开发模式运行 App

### 需要补充的配置

⚠️ **manifest.json 中需要配置：**
- `appid`: 在 DCloud 控制台创建应用后获取
- Android 包名（package）
- 应用图标和启动页图片
- 应用签名（正式发布时）

### 配置文件位置

- `src/manifest.json`: 应用配置文件
- `src/androidPrivacy.json`: Android 隐私政策配置
- `package.json`: 构建脚本配置

---

## 推荐方案

**对于首次打包，强烈推荐使用方式一（HBuilderX 云打包）**：
- ✅ 无需配置复杂环境
- ✅ 操作简单直观
- ✅ 自动处理签名和配置
- ✅ 适合快速验证和测试

**对于需要频繁打包或深度定制，推荐方式二（本地打包）**：
- ✅ 无打包次数限制
- ✅ 可完全自定义配置
- ✅ 适合 CI/CD 集成

---

## 常见问题

### Q1: 打包后应用无法联网？
A: 检查 `manifest.json` 中的网络权限配置，确保已添加：
```json
"<uses-permission android:name=\"android.permission.INTERNET\"/>"
"<uses-permission android:name=\"android.permission.ACCESS_NETWORK_STATE\"/>"
```

### Q2: 打包后应用闪退？
A: 
1. 检查是否有未捕获的 JavaScript 错误
2. 查看 Android 日志：`adb logcat`
3. 确认所有依赖已正确打包

### Q3: 如何更新应用版本？
A: 修改 `manifest.json` 中的 `versionName` 和 `versionCode`，然后重新打包。

### Q4: 如何配置应用图标？
A: 在 HBuilderX 中：manifest.json → App图标配置，上传图标文件。

---

## 相关资源

- [uni-app 官方文档](https://uniapp.dcloud.net.cn/)
- [HBuilderX 下载](https://www.dcloud.io/hbuilderx.html)
- [DCloud 开发者中心](https://dev.dcloud.net.cn/)
- [Android 打包常见问题](https://uniapp.dcloud.net.cn/tutorial/app-android-build.html)

