/**
 * 本地持久化存储工具 (Persistent Storage)
 * 
 * 注意：
 * 1. 此工具仅用于存储非敏感的缓存数据（如用户偏好、非敏感的历史记录）。
 * 2. 数据仅进行 Base64 编码，**未加密**。
 * 3. 请勿使用此工具存储密码、私钥或高敏感度的个人隐私信息。
 * 4. 对于 Access Token / Refresh Token，请使用 tokenStore.ts 管理。
 */

const DEFAULT_TTL = 15 * 24 * 60 * 60 * 1000; // 15 天

interface Payload<T> {
	value: T;
	expiresAt: number;
}

// 简单的 Base64 编码（仅用于防直接阅读，不具备安全性）
function encode<T>(data: Payload<T>): string {
	const text = JSON.stringify(data);
	return btoa(unescape(encodeURIComponent(text)));
}

function decode<T>(encoded: string): Payload<T> | null {
	try {
		const text = decodeURIComponent(escape(atob(encoded)));
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

/**
 * 存储数据（带过期时间）
 * @param key 键名
 * @param value 数据
 * @param ttlMs 过期时间（毫秒），默认 15 天
 */
export function setPersistentItem<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL) {
	const payload: Payload<T> = {
		value,
		expiresAt: Date.now() + ttlMs,
	};
	const encoded = encode(payload);
	uni.setStorageSync(key, encoded);
}

/**
 * 读取数据（自动检查过期）
 * @param key 键名
 */
export function getPersistentItem<T>(key: string): T | null {
	const encoded = uni.getStorageSync(key);
	if (!encoded) return null;
	const payload = decode<T>(encoded);
	if (!payload) {
		uni.removeStorageSync(key);
		return null;
	}
	if (payload.expiresAt && payload.expiresAt < Date.now()) {
		uni.removeStorageSync(key);
		return null;
	}
	return payload.value;
}

/**
 * 移除数据
 * @param key 键名
 */
export function removePersistentItem(key: string) {
	uni.removeStorageSync(key);
}

// 兼容旧名称导出（建议逐步迁移到新名称）
export const setSecureItem = setPersistentItem;
export const getSecureItem = getPersistentItem;
export const removeSecureItem = removePersistentItem;
