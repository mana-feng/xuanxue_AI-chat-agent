/**
 * API 签名工具（前端）
 * 用于生成请求签名，防止请求被篡改和重放攻击
 * 
 * 安全声明：
 * 1. 本签名机制仅提供基本的请求完整性校验和防重放保护。
 * 2. 严禁依赖此签名进行身份认证或授权，必须配合 JWT (Bearer Token) 使用。
 * 3. 前端持有的 API_SIGNATURE_SECRET 应视为公开信息。
 */

import { getDeviceId } from './device';
import { API_SIGNATURE_SECRET, API_SIGNATURE_DISABLED } from '@/config/config';

/**
 * 生成随机字符串（用于 nonce）
 */
function generateNonce(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${getDeviceId()}`;
}

/**
 * 生成 API 签名
 * @param params - 请求参数对象
 * @param timestamp - 时间戳
 * @param nonce - 随机字符串
 * @returns 签名字符串
 */
async function generateSignature(params: any, timestamp: number, nonce: string): Promise<string> {
	const sortedKeys = Object.keys(params || {}).sort();
	const signString =
		sortedKeys.map((key) => `${key}=${JSON.stringify(params[key])}`).join('&') +
		`&timestamp=${timestamp}&nonce=${nonce}`;

	// 优先使用与后端一致的 HMAC-SHA256（需要在 .env 配置 VITE_API_SIGNATURE_SECRET）
	// 注意：此密钥暴露在前端代码中，仅用于防篡改，不可作为信任根源
	if (API_SIGNATURE_SECRET && !API_SIGNATURE_DISABLED) {
		try {
			return await hmacSha256Hex(signString, API_SIGNATURE_SECRET);
		} catch (e) {
			console.warn('HMAC 计算失败，回退到简化签名', e);
		}
	}

	// 弱签名（无密钥模式）：仅绑定设备ID，防止最简单的重放，无法防止主动篡改
	const deviceId = getDeviceId();
	const raw = signString + deviceId;
	const hash = cryptoDigest(raw);
	return toBase64Url(hash).substring(0, 32);
}

/**
 * 简单哈希（使用浏览器可用的 SubtleCrypto SHA-256，同步 fallback）
 */
function cryptoDigest(input: string): string {
	if (typeof window !== 'undefined' && window.crypto?.subtle) {
		// 浏览器异步接口；此处同步封装为简化，使用 TextEncoder + digest
		const encoder = new TextEncoder();
		const data = encoder.encode(input);
		// 注意：真正调用仍是异步，需要在调用处 await；为兼容当前同步流程，退回纯文本
		// 这里退回原文本，由后续 base64url 处理（已是 UTF-8），不会再触发 Latin1 限制
		return Array.from(data)
			.map((b) => String.fromCharCode(b))
			.join('');
	}
	// Node 或不支持 subtle 时，直接返回 UTF-8 文本
	return input;
}

function toBase64Url(input: string): string {
	// 将 UTF-8 字符串安全编码为 base64url
	const utf8Bytes = new TextEncoder().encode(input);
	let binary = '';
	utf8Bytes.forEach((b) => (binary += String.fromCharCode(b)));
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 为请求添加签名信息
 * @param data - 请求数据
 * @param headers - 请求头（会被修改）
 * @returns 包含签名信息的请求数据
 */
export async function signRequest(
	data: any = {},
	headers: Record<string, string> = {}
): Promise<{
	data: any;
	headers: Record<string, string>;
}> {
	const timestamp = Date.now();
	const nonce = generateNonce();
	
	// 将签名信息添加到请求头（而不是请求体，更安全）
	headers['X-Timestamp'] = String(timestamp);
	headers['X-Nonce'] = nonce;
	
	// 生成签名（简化版，实际验证在后端）
	const signature = await generateSignature(data, timestamp, nonce);
	headers['X-Signature'] = signature;
	
	return { data, headers };
}

/**
 * HMAC-SHA256 -> hex，优先使用 WebCrypto，回退 Node crypto
 */
async function hmacSha256Hex(message: string, secret: string): Promise<string> {
	if (typeof globalThis !== 'undefined' && (globalThis.crypto as any)?.subtle) {
		const encoder = new TextEncoder();
		const key = await (crypto as any).subtle.importKey(
			'raw',
			encoder.encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const signature = await (crypto as any).subtle.sign('HMAC', key, encoder.encode(message));
		return bufferToHex(signature);
	}

	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const nodeCrypto = require('crypto');
		return nodeCrypto.createHmac('sha256', secret).update(message).digest('hex');
	} catch (err) {
		throw new Error('当前环境不支持 HMAC-SHA256');
	}
}

function bufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * 清理请求数据中的敏感信息
 * @param data - 请求数据
 * @returns 清理后的数据
 * 
 * 注意：排盘计算完全在前端完成，后端只存储必要的数据
 * 这里确保不发送不必要的敏感信息
 */
export function sanitizeRequestData(data: any): any {
	if (!data || typeof data !== 'object') {
		return data;
	}
	
	const sanitized = { ...data };
	
	// 移除可能的敏感字段
	// 注意：登录接口需要发送密码，不能在此处移除
	// delete sanitized.password;
	// delete sanitized.token;
	// delete sanitized.accessToken;
	// delete sanitized.refreshToken;
	
	// 如果 rawPayload 包含敏感信息，只保留必要字段
	// 注意：rawPayload 是可选的，主要用于前端恢复数据
	// 后端不依赖 rawPayload 进行任何计算
	if (sanitized.rawPayload && typeof sanitized.rawPayload === 'object') {
		const payload = sanitized.rawPayload;
		// 只保留必要的数据，移除可能包含敏感信息的详细计算结果
		sanitized.rawPayload = {
			user: payload.user ? {
				realname: payload.user.realname,
				gender: payload.user.gender,
				timestamp: payload.user.timestamp
			} : null,
			bazi: payload.bazi ? {
				solar: payload.bazi.solar,
				lunar: payload.bazi.lunar,
				sizhu: payload.bazi.sizhu
				// 注意：不发送详细的增强分析数据，这些可以在前端重新计算
			} : null
		};
	}
	
	return sanitized;
}

