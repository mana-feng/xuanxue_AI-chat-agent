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

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64Url: string): Uint8Array {
	const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized + '==='.slice((normalized.length + 3) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveAesGcmKey(purpose: string, salt: Uint8Array): Promise<CryptoKey> {
	const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
	if (!cryptoObj?.subtle) {
		throw new Error('当前环境不支持加密');
	}
	const { getDeviceId } = await import('@/utils/device');
	const material = `${purpose}:${getDeviceId()}`;
	const encoder = new TextEncoder();
	const keyMaterial = await cryptoObj.subtle.importKey('raw', encoder.encode(material), 'PBKDF2', false, ['deriveKey']);
	return cryptoObj.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: toArrayBuffer(salt),
			iterations: 100000,
			hash: 'SHA-256',
		},
		keyMaterial,
		{
			name: 'AES-GCM',
			length: 256,
		},
		false,
		['encrypt', 'decrypt']
	);
}

export async function encryptJsonAesGcm(value: any, purpose: string): Promise<string> {
	const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
	if (!cryptoObj?.subtle || !cryptoObj.getRandomValues) {
		return JSON.stringify({ v: 0, alg: 'none', data: value });
	}
	const iv = cryptoObj.getRandomValues(new Uint8Array(12));
	const salt = cryptoObj.getRandomValues(new Uint8Array(16));
	const key = await deriveAesGcmKey(purpose, salt);
	const plaintext = new TextEncoder().encode(JSON.stringify(value));
	const ct = await cryptoObj.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(plaintext));
	return JSON.stringify({
		v: 1,
		alg: 'AES-GCM',
		iv: bytesToBase64Url(iv),
		salt: bytesToBase64Url(salt),
		ct: bytesToBase64Url(new Uint8Array(ct)),
	});
}

export async function decryptJsonAesGcm(text: string, purpose: string): Promise<any> {
	const payload = JSON.parse(text);
	if (payload?.v === 0 && payload?.alg === 'none' && 'data' in payload) {
		return payload.data;
	}
	if (payload?.v !== 1 || payload?.alg !== 'AES-GCM' || !payload?.iv || !payload?.salt || !payload?.ct) {
		return payload;
	}
	const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
	if (!cryptoObj?.subtle) {
		throw new Error('当前环境不支持解密');
	}
	const iv = base64UrlToBytes(String(payload.iv));
	const salt = base64UrlToBytes(String(payload.salt));
	const ct = base64UrlToBytes(String(payload.ct));
	const key = await deriveAesGcmKey(purpose, salt);
	const pt = await cryptoObj.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(ct));
	const decoded = new TextDecoder().decode(pt);
	return JSON.parse(decoded);
}

type IDBValue = any;

function openKvDb(): Promise<IDBDatabase> {
	if (typeof indexedDB === 'undefined') {
		return Promise.reject(new Error('indexedDB not supported'));
	}
	return new Promise((resolve, reject) => {
		const req = indexedDB.open('ai_xuanxue_kv', 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('kv')) {
				db.createObjectStore('kv');
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function idbSetItem<T = IDBValue>(key: string, value: T): Promise<void> {
	const db = await openKvDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction('kv', 'readwrite');
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.objectStore('kv').put(value as any, key);
	});
	db.close();
}

export async function idbGetItem<T = IDBValue>(key: string): Promise<T | null> {
	const db = await openKvDb();
	const result = await new Promise<T | null>((resolve, reject) => {
		const tx = db.transaction('kv', 'readonly');
		const req = tx.objectStore('kv').get(key);
		req.onsuccess = () => resolve((req.result as T) ?? null);
		req.onerror = () => reject(req.error);
	});
	db.close();
	return result;
}
