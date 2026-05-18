import { API_BASE_URL } from '@/config/config';

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	code?: string;
	message?: string;
	error?: string;
}

const normalizeApiResponse = <T>(payload: any, statusCode: number): ApiResponse<T> => {
	if (payload && typeof payload === 'object') {
		if ('success' in payload) {
			return {
				success: Boolean(payload.success),
				data: payload.data ?? null,
				code: payload.code,
				message: payload.message || payload.error || '请求失败',
				error: payload.error || payload.message || '请求失败',
			};
		}

		if ('error' in payload) {
			const message = payload.message || payload.error || '请求失败';
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

export function request<T = any>(
	url: string,
	options: {
		method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
		data?: any;
		header?: Record<string, string>;
		needAuth?: boolean;
	} = {}
): Promise<ApiResponse<T>> {
	const { method = 'GET', data, header = {} } = options;

	return new Promise((resolve, reject) => {
		const requestHeaders: Record<string, string> = {
			'Content-Type': 'application/json; charset=utf-8',
			...header,
		};

		uni.request({
			url: API_BASE_URL + url,
			method,
			data,
			header: requestHeaders,
			success: (res: any) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					const normalized = normalizeApiResponse<T>(res.data, res.statusCode);
					resolve(normalized);
				} else {
					const message = res.data?.message || res.data?.error || `请求失败 (${res.statusCode})`;
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
				const errorMsg = err?.errMsg || err?.message || '网络错误';
				uni.showToast({ title: '网络连接失败', icon: 'none' });
				reject({
					success: false,
					error: errorMsg,
					message: errorMsg,
				});
			},
		});
	});
}
