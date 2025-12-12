import CryptoJS from 'crypto-js';

const DEFAULT_TTL = 15 * 24 * 60 * 60 * 1000; // 15 天
const SECRET = 'local-cache-secret-v1'; // 本地加密密钥
interface Payload<T> {
	value: T;
	expiresAt: number;
}

function encrypt<T>(data: Payload<T>): string {
	const text = JSON.stringify(data);
	return CryptoJS.AES.encrypt(text, SECRET).toString();
}

function decrypt<T>(cipher: string): Payload<T> | null {
	try {
		const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
		const text = bytes.toString(CryptoJS.enc.Utf8);
		if (!text) return null;
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
	const cipher = encrypt(payload);
	uni.setStorageSync(key, cipher);
}

export function getSecureItem<T>(key: string): T | null {
	const cipher = uni.getStorageSync(key);
	if (!cipher) return null;
	const payload = decrypt<T>(cipher);
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
