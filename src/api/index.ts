/**
 * API 统一管理
 * 提供统一的请求方法和错误处理
 */

import { API_BASE_URL } from '@/config/config';

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

/**
 * 统一请求方法
 */
export function request<T = any>(
	url: string,
	options: {
		method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
		data?: any;
		header?: Record<string, string>;
		needAuth?: boolean;
	} = {}
): Promise<ApiResponse<T>> {
	const { method = 'GET', data, header = {}, needAuth = false } = options;

	// 如果需要认证，添加token
	if (needAuth) {
		const token = uni.getStorageSync('auth')?.token;
		if (token) {
			header['Authorization'] = `Bearer ${token}`;
		}
	}

	return new Promise((resolve, reject) => {
		uni.request({
			url: API_BASE_URL + url,
			method,
			data,
			header: {
				'Content-Type': 'application/json; charset=utf-8',
				...header
			},
			success(res: any) {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data);
				} else if (res.statusCode === 401) {
					// 未授权，清除登录信息
					uni.removeStorageSync('auth');
					reject({
						success: false,
						error: '登录已失效，请重新登录'
					});
				} else {
					reject({
						success: false,
						error: res.data?.error || `请求失败 (${res.statusCode})`
					});
				}
			},
			fail(err: any) {
				reject({
					success: false,
					error: '网络错误，请检查后端是否已启动'
				});
			}
		});
	});
}

