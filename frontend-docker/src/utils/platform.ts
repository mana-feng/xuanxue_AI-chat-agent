
/**
 * 平台相关工具函数
 */

/**
 * 获取系统信息（兼容新旧 API）
 * 解决 wx.getSystemInfoSync 废弃警告
 */
export function getSystemInfo(): UniApp.GetSystemInfoResult {
	// #ifdef MP-WEIXIN
	// 尝试使用新版 API
	if (uni.getWindowInfo && uni.getAppBaseInfo && uni.getDeviceInfo && uni.getSystemSetting && uni.getAppAuthorizeSetting) {
		try {
			const windowInfo = uni.getWindowInfo();
			const appBaseInfo = uni.getAppBaseInfo();
			const deviceInfo = uni.getDeviceInfo();
			const systemSetting = uni.getSystemSetting();
			const appAuthorizeSetting = uni.getAppAuthorizeSetting();

			// 构造兼容旧版 API 的返回值
			// 注意：这里需要根据实际使用的字段进行映射
			// GetSystemInfoResult 类型定义可能与新 API 返回值不完全一致，需要断言或手动构造
			return {
				...windowInfo,
				...appBaseInfo,
				...deviceInfo,
				...systemSetting,
				...appAuthorizeSetting,
				// 补充一些常见字段的兼容
				// 比如 safeArea 在 windowInfo 中
				// platform 在 deviceInfo 中
				// system 在 deviceInfo 中
				// SDKVersion 在 appBaseInfo 中
				// windowWidth, windowHeight 在 windowInfo 中
				// statusBarHeight 在 windowInfo 中
			} as unknown as UniApp.GetSystemInfoResult;
		} catch (e) {
			console.warn('获取新版系统信息失败，降级使用 getSystemInfoSync', e);
			return uni.getSystemInfoSync();
		}
	}
	// #endif

	// 其他平台或不支持新 API 的环境继续使用 getSystemInfoSync
	return uni.getSystemInfoSync();
}
