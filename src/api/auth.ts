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
		role?: 'user' | 'admin';
	};
}

// 以下函数未在项目中使用（项目中直接使用 uni.request），已删除：
// - login() - 登录函数
// - register() - 注册函数

