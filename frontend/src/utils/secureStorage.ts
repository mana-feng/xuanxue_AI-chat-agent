const DEFAULT_TTL = 15 * 24 * 60 * 60 * 1000; // 15 天

interface Payload<T> {
	value: T;
	expiresAt: number;
}

// 简单的 Base64 编码（仅用于本地缓存，非敏感数据）
// 注意：前端不存储密码等敏感信息，只存储缓存数据（姓名、出生时间等）
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

export function setSecureItem<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL) {
	const payload: Payload<T> = {
		value,
		expiresAt: Date.now() + ttlMs,
	};
	const encoded = encode(payload);
	uni.setStorageSync(key, encoded);
}

export function getSecureItem<T>(key: string): T | null {
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

export function removeSecureItem(key: string) {
	uni.removeStorageSync(key);
}
