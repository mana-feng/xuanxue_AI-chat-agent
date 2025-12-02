/**
 * 邮箱验证码相关API
 */

import { request } from '@/api/index';

export interface SendCodeParams {
	email: string;
	type: 'register' | 'login' | 'reset';
}

export interface VerifyCodeParams {
	email: string;
	code: string;
	type: 'register' | 'login' | 'reset';
}

export interface SendCodeResponse {
	success: boolean;
	message: string;
	code?: string; // 仅开发环境返回
}

export interface VerifyCodeResponse {
	success: boolean;
	message: string;
}

/**
 * 发送邮箱验证码
 */
export function sendEmailCode(params: SendCodeParams) {
	return request<SendCodeResponse>('/api/email/send-code', {
		method: 'POST',
		data: params
	});
}

/**
 * 验证邮箱验证码
 */
export function verifyEmailCode(params: VerifyCodeParams) {
	return request<VerifyCodeResponse>('/api/email/verify-code', {
		method: 'POST',
		data: params
	});
}

