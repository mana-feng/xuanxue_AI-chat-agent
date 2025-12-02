/**
 * 认证相关API
 */

import { request } from '@/api/index';

export interface LoginParams {
	identifier: string; // 邮箱或用户名
	password: string;
}

export interface RegisterParams {
	email: string;
	password: string;
	code: string; // 邮箱验证码
	username?: string;
}

export interface AuthResponse {
	token: string;
	user: {
		id: number;
		username?: string;
		email: string;
	};
}

/**
 * 登录
 */
export function login(params: LoginParams) {
	return request<AuthResponse>('/api/login', {
		method: 'POST',
		data: params
	});
}

/**
 * 注册
 */
export function register(params: RegisterParams) {
	return request<AuthResponse>('/api/register', {
		method: 'POST',
		data: params
	});
}

