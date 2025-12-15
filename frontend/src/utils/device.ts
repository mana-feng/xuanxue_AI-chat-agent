/**
 * 设备ID管理
 * 生成并永久存储设备ID，用于三端统一认证
 */

const DEVICE_ID_KEY = 'device_id';

/**
 * 获取设备ID（如果不存在则生成）
 */
export function getDeviceId(): string {
	let id = uni.getStorageSync(DEVICE_ID_KEY);
	if (!id) {
		// 生成唯一设备ID：时间戳 + 随机字符串
		id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
		uni.setStorageSync(DEVICE_ID_KEY, id);
	}
	return id;
}

/**
 * 清除设备ID（登出时可选调用）
 */
export function clearDeviceId(): void {
	uni.removeStorageSync(DEVICE_ID_KEY);
}
