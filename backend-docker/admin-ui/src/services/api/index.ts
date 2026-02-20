/**
 * API 统一管理
 * 提供统一的请求方法和错误处理
 * 支持 JWT 双 Token 机制：自动刷新 access token
 */

import { API_BASE_URL } from '@/config/config';
import { getDeviceId } from '@/utils/device';
import { signRequest, sanitizeRequestData } from '@/utils/api-signature';
import {
	getAccessToken,
	setAccessToken,
	getRefreshToken,
	setRefreshToken,
	clearAllTokens,
} from '@/utils/tokenStore';

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	code?: string;
	message?: string;
	error?: string;
}

const sanitizeErrorText = (value: unknown, fallback = '请求失败'): string => {
	const raw = String(value ?? '').replace(/<[^>]+>/g, '').trim();
	const masked = raw
		.replace(/([?&]key=)[^&\s]+/gi, '$1***')
		.replace(
			/([?&](token|access_token|refresh_token|api_key|apikey|signature|sign|nonce)=)[^&\s]+/gi,
			'$1***'
		)
		.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1***')
		.replace(
			/(["']?(api[_-]?key|token|access[_-]?token|refresh[_-]?token|password|secret|authorization|signature)["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi,
			'$1***'
		);
	const lower = masked.toLowerCase();
	if (
		lower.includes('generativelanguage.googleapis.com') ||
		(lower.includes('request to') && lower.includes('failed'))
	) {
		return '上游服务连接异常，请稍后重试';
	}
	return masked || fallback;
};

const normalizeApiResponse = <T>(payload: any, statusCode: number): ApiResponse<T> => {
	if (payload && typeof payload === 'object') {
		if ('success' in payload) {
			const message = sanitizeErrorText(payload.message || payload.error, '请求失败');
			return {
				success: Boolean(payload.success),
				data: payload.data ?? null,
				code: payload.code,
				message,
				error: sanitizeErrorText(payload.error || message, '请求失败'),
			};
		}

		if ('error' in payload) {
			const message = sanitizeErrorText(payload.message || payload.error, '请求失败');
			return {
				success: false,
				code: payload.code,
				message,
				error: message,
				data: payload.data ?? null,
			};
		}
	}

	if (statusCode >= 200 && statusCode < 300) {
		return {
			success: true,
			data: payload,
			message: 'ok',
		};
	}

	return {
		success: false,
		error: '请求失败',
		message: '请求失败',
	};
};

// Refresh 锁：防止并发请求时多次刷新
let refreshingPromise: Promise<void> | null = null;

/**
 * 刷新 access token（带锁机制）
 */
async function refreshAccessToken(): Promise<void> {
	if (refreshingPromise) {
		return refreshingPromise;
	}

	refreshingPromise = (async () => {
		try {
			const deviceId = getDeviceId();
			const refreshToken = getRefreshToken();

			// H5 场景：refresh token 在 cookie 中，不需要传 refresh_token
			// App/小程序场景：需要传 refresh_token
			const requestData: any = {
				device_id: deviceId,
			};

			if (refreshToken) {
				requestData.refresh_token = refreshToken;
			}

			const res = await new Promise<any>((resolve, reject) => {
				uni.request({
					url: API_BASE_URL + '/api/auth/refresh',
					method: 'POST',
					data: requestData,
					header: {
						'Content-Type': 'application/json; charset=utf-8',
						'X-Device-Id': deviceId,
					},
					// H5 需要 withCredentials 来发送 cookie
					// #ifdef H5
					withCredentials: true,
					// #endif
					success: resolve,
					fail: reject,
				});
			});

		if (res.statusCode === 200 && res.data) {
			const payload = res.data as any;
			if (payload?.success === false) {
				throw new Error(payload?.message || payload?.error || '刷新 token 失败');
			}

			const tokenData = payload?.data ?? payload;
			const { access_token, refresh_token } = tokenData as any;

			if (access_token) {
					setAccessToken(access_token);
					// 更新 user store 的登录状态标志（确保响应式更新）
					try {
						const { useUserStore } = await import('@/store/user');
						const userStore = useUserStore();
						userStore._hasAccessToken = true;
					} catch (e) {
						// 忽略错误
					}
			}

			// 如果返回了新的 refresh_token，更新它（非 H5 平台）
			if (refresh_token) {
				setRefreshToken(refresh_token);
			}
		} else {
			throw new Error('刷新 token 失败');
		}
		} catch (error) {
			// 刷新失败，清除所有 token 并更新状态
			clearAllTokens();
			// 更新 user store 的登录状态标志
			try {
				const { useUserStore } = await import('@/store/user');
				const userStore = useUserStore();
				userStore._hasAccessToken = false;
			} catch (e) {
				// 忽略错误
			}
			throw error;
		} finally {
			refreshingPromise = null;
		}
	})();

	return refreshingPromise;
}

/**
 * 统一请求方法（支持自动刷新 token）
 * 注意：排盘计算完全在前端完成，后端只负责数据存储和验证
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

	return new Promise((resolve, reject) => {
		let retryCount = 0;

		// 内部请求函数
		const doRequest = async (): Promise<void> => {
			const deviceId = getDeviceId();
			const accessToken = needAuth ? getAccessToken() : null;

			// 签名工具在模块顶层导入
			// 清理敏感数据
			const sanitizedData = sanitizeRequestData(data);
			
			// 添加签名信息
			const requestHeaders: Record<string, string> = {
				'Content-Type': 'application/json; charset=utf-8',
				'X-Device-Id': deviceId,
				...header,
			};
			
			// 为需要认证的请求添加签名（POST/PUT/DELETE）
            // 注意：登录接口 (/api/auth/login) 虽然不需要 Authorization，但也需要签名来防止重放攻击
            // 如果后端开启了强制签名，那么所有 POST 请求都必须签名
			if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
				try {
					const signed = await signRequest(sanitizedData, requestHeaders);
					Object.assign(requestHeaders, signed.headers);
				} catch (e) {
					console.warn('签名生成失败，将发送未签名请求', e);
				}
			}

			if (accessToken) {
				requestHeaders['Authorization'] = `Bearer ${accessToken}`;
			}

			uni.request({
				url: API_BASE_URL + url,
				method,
				data: sanitizedData,
				header: requestHeaders,
				// H5 需要 withCredentials 来发送 cookie
				// #ifdef H5
				withCredentials: true,
				// #endif
				success: async (res: any) => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						const normalized = normalizeApiResponse<T>(res.data, res.statusCode);
						resolve(normalized);
					} else if (res.statusCode === 401 && needAuth) {
						// 401 未授权：尝试刷新 token 后重试（最多 1 次）
						if (retryCount >= 1) {
							clearAllTokens();
							const err = {
								success: false,
								error: '登录已失效，请重新登录',
								message: '登录已失效，请重新登录',
								code: res.data?.code,
							};
							uni.showToast({ title: err.message, icon: 'none' });
							return reject(err);
						}
						retryCount += 1;
						try {
							await refreshAccessToken();
							const newToken = getAccessToken();
							if (!newToken) {
								clearAllTokens();
								const err = {
									success: false,
									error: '登录已失效，请重新登录',
									message: '登录已失效，请重新登录',
									code: res.data?.code,
								};
								uni.showToast({ title: err.message, icon: 'none' });
								return reject(err);
							}
							// 刷新成功，重试请求
							return doRequest();
						} catch (refreshError) {
							// 刷新失败，清除登录信息并跳转登录页
							clearAllTokens();
							const err = {
								success: false,
								error: '登录已失效，请重新登录',
								message: '登录已失效，请重新登录',
								code: res.data?.code,
							};
							reject(err);

							// 跳转到登录页
							uni.reLaunch({
								url: '/pages/auth/auth',
							});
						}
					} else {
						const message = sanitizeErrorText(
							res.data?.message || res.data?.error || `请求失败 (${res.statusCode})`
						);
						// 对于 5xx 错误，自动提示
						if (res.statusCode >= 500) {
							uni.showToast({ title: '服务器错误，请稍后重试', icon: 'none' });
						}
						reject({
							success: false,
							error: message,
							message,
							code: res.data?.code,
						});
					}
				},
				fail: (err: any) => {
					const errorMsg = sanitizeErrorText(
						err?.errMsg || err?.message || '网络错误，请检查后端是否已启动',
						'网络错误，请检查后端是否已启动'
					);
					uni.showToast({ title: '网络连接失败', icon: 'none' });
					reject({
						success: false,
						error: errorMsg,
						message: errorMsg,
					});
				},
			});
		};

		// 执行请求
		doRequest();
	});
}
