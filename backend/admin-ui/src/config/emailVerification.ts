/**
 * 邮箱验证码工具方法
 */

import { request } from '@/services/api/index';

export interface SendCodeResult {
	success: boolean;
	message: string;
	code?: string; // 仅开发环境返回
}

export interface VerifyCodeResult {
	success: boolean;
	message: string;
}

/**
 * 发送邮箱验证码
 * @param email 邮箱地址
 * @param type 验证码类型，默认为 'register'
 * @returns Promise<SendCodeResult>
 */
export async function sendEmailVerificationCode(
	email: string,
	type: 'register' | 'login' | 'reset' = 'register'
): Promise<SendCodeResult> {
	if (!email || !email.trim()) {
		throw new Error('请输入邮箱地址');
	}

	// 简单的邮箱格式验证
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email.trim())) {
		throw new Error('邮箱格式不正确');
	}

	const res = await request('/api/email/send-code', {
		method: 'POST',
		data: {
			email: email.trim().toLowerCase(),
			type,
		},
	});

	if (!res.success) {
		throw new Error(res.message || res.error || '发送验证码失败，请稍后重试');
	}

	return {
		success: true,
		message: res.message || '验证码已发送到您的邮箱',
		code: (res.data as any)?.code,
	};
}

/**
 * 验证邮箱验证码
 * @param email 邮箱地址
 * @param code 验证码
 * @param type 验证码类型，默认为 'register'
 * @returns Promise<VerifyCodeResult>
 */
export async function verifyEmailCode(
	email: string,
	code: string,
	type: 'register' | 'login' | 'reset' = 'register'
): Promise<VerifyCodeResult> {
	if (!email || !email.trim()) {
		throw new Error('请输入邮箱地址');
	}

	if (!code || !code.trim()) {
		throw new Error('请输入验证码');
	}

	const res = await request('/api/email/verify-code', {
		method: 'POST',
		data: {
			email: email.trim().toLowerCase(),
			code: code.trim(),
			type,
		},
	});

	if (!res.success) {
		throw new Error(res.message || res.error || '验证码验证失败');
	}

	return {
		success: true,
		message: res.message || '验证码验证成功',
	};
}
