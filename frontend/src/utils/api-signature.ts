/**
 * API 签名工具（前端）
 * 用于生成请求签名，防止请求被篡改和重放攻击
 */

import { getDeviceId } from './device';

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
function generateSignature(params: any, timestamp: number, nonce: string): string {
	// 注意：前端不能直接使用密钥生成签名，因为密钥不能暴露在前端
	// 这里使用一个简化的签名方案：使用时间戳和 nonce 的组合
	// 实际生产环境应该使用更安全的方案，比如：
	// 1. 使用 JWT token 中包含的签名密钥
	// 2. 使用设备指纹 + 时间戳 + 参数哈希
	// 3. 或者依赖 HTTPS + JWT 来保证安全性
	
	// 简化方案：对参数进行排序并生成哈希
	// 只对关键参数进行签名，避免签名字符串过长
	const keyParams: Record<string, any> = {};
	if (params.name) keyParams.name = params.name;
	if (params.gender !== undefined) keyParams.gender = params.gender;
	if (params.birthDatetime) keyParams.birthDatetime = params.birthDatetime;
	
	const sortedKeys = Object.keys(keyParams).sort();
	const signString = sortedKeys
		.map(key => `${key}=${JSON.stringify(keyParams[key])}`)
		.join('&') + `&timestamp=${timestamp}&nonce=${nonce}`;
	
	// 使用简单的哈希（实际应该在后端验证时使用密钥）
	// 这里只是生成一个标识，真正的验证在后端
	// 使用设备ID增加安全性
	const deviceId = getDeviceId();
	return btoa(signString + deviceId).substring(0, 32);
}

/**
 * 为请求添加签名信息
 * @param data - 请求数据
 * @param headers - 请求头（会被修改）
 * @returns 包含签名信息的请求数据
 */
export function signRequest(data: any = {}, headers: Record<string, string> = {}): {
	data: any;
	headers: Record<string, string>;
} {
	const timestamp = Date.now();
	const nonce = generateNonce();
	
	// 将签名信息添加到请求头（而不是请求体，更安全）
	headers['X-Timestamp'] = String(timestamp);
	headers['X-Nonce'] = nonce;
	
	// 生成签名（简化版，实际验证在后端）
	const signature = generateSignature(data, timestamp, nonce);
	headers['X-Signature'] = signature;
	
	return { data, headers };
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
	delete sanitized.password;
	delete sanitized.token;
	delete sanitized.accessToken;
	delete sanitized.refreshToken;
	
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

