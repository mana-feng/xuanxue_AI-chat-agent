/**
 * 邮箱验证码工具方法
 */

import { API_BASE_URL } from '@/config/config';

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
export function sendEmailVerificationCode(
	email: string,
	type: 'register' | 'login' | 'reset' = 'register'
): Promise<SendCodeResult> {
	return new Promise((resolve, reject) => {
		if (!email || !email.trim()) {
			reject({ success: false, message: '请输入邮箱地址' });
			return;
		}

		// 简单的邮箱格式验证
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			reject({ success: false, message: '邮箱格式不正确' });
			return;
		}

		uni.request({
			url: API_BASE_URL + '/api/email/send-code',
			method: 'POST',
			data: {
				email: email.trim().toLowerCase(),
				type,
			},
			success(res: any) {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data);
				} else {
					reject({
						success: false,
						message: res.data?.error || '发送验证码失败，请稍后重试',
					});
				}
			},
			fail() {
				reject({
					success: false,
					message: '网络错误，请检查后端是否已启动',
				});
			},
		});
	});
}

/**
 * 验证邮箱验证码
 * @param email 邮箱地址
 * @param code 验证码
 * @param type 验证码类型，默认为 'register'
 * @returns Promise<VerifyCodeResult>
 */
export function verifyEmailCode(
	email: string,
	code: string,
	type: 'register' | 'login' | 'reset' = 'register'
): Promise<VerifyCodeResult> {
	return new Promise((resolve, reject) => {
		if (!email || !email.trim()) {
			reject({ success: false, message: '请输入邮箱地址' });
			return;
		}

		if (!code || !code.trim()) {
			reject({ success: false, message: '请输入验证码' });
			return;
		}

		uni.request({
			url: API_BASE_URL + '/api/email/verify-code',
			method: 'POST',
			data: {
				email: email.trim().toLowerCase(),
				code: code.trim(),
				type,
			},
			success(res: any) {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data);
				} else {
					reject({
						success: false,
						message: res.data?.error || '验证码验证失败',
					});
				}
			},
			fail() {
				reject({
					success: false,
					message: '网络错误，请检查后端是否已启动',
				});
			},
		});
	});
}
