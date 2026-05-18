const DEFAULT_TTL = 15 * 24 * 60 * 60 * 1000;

interface Payload<T> {
	value: T;
	expiresAt: number;
}

function encode<T>(data: Payload<T>): string {
	const text = JSON.stringify(data);
	return btoa(unescape(encodeURIComponent(text)));
}

function decode<T>(encoded: string): Payload<T> | null {
	try {
		const text = decodeURIComponent(escape(atob(encoded)));
		return JSON.parse(text);
	} catch {
		return null;
	}
}

export function setPersistentItem<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL) {
	const payload: Payload<T> = {
		value,
		expiresAt: Date.now() + ttlMs,
	};
	const encoded = encode(payload);
	uni.setStorageSync(key, encoded);
}

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

export function removePersistentItem(key: string) {
	uni.removeStorageSync(key);
}

export const setSecureItem = setPersistentItem;
export const getSecureItem = getPersistentItem;
export const removeSecureItem = removePersistentItem;

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
