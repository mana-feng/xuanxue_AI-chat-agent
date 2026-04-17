import { defineStore } from 'pinia';
import {
	getAccessToken,
	setAccessToken,
	setRefreshToken,
	clearAllTokens,
} from '@/utils/tokenStore';

export const useUserStore = defineStore('user', {
	state: () => {
		return {
		realname: null as string | null,
		gender: 0,
		timestamp: null as number | null,
		// 记录ID（如果已保存过）
			recordId: null as number | null,
			// 账号信息
			username: null as string | null,
			email: null as string | null,
			role: null as 'user' | 'admin' | null,
			// 添加一个标志位来跟踪登录状态，确保响应式更新
			_hasAccessToken: false as boolean,
		};
	},
	getters: {
		isLoggedIn: (state) => {
			// 检查是否有 access token（响应式）
			return state._hasAccessToken && !!getAccessToken();
		},
		isAdmin: (state) => state.role === 'admin',
	},
	actions: {
		set(data: Record<string, unknown>) {
			Object.assign(this, data);
		},
		// 初始化时从本地缓存恢复登录状态（仅恢复用户信息，token 由 tokenStore 管理）
		restoreAuth() {
			try {
				// 检查是否有 access token
				const accessToken = getAccessToken();
				this._hasAccessToken = !!accessToken;

				if (!accessToken) {
					// 没有 token，清除用户信息
					this.username = null;
					this.email = null;
					this.role = null;
					return;
				}

				// 如果有 token，尝试从本地存储恢复用户信息
				try {
					const userInfo = uni.getStorageSync('user_info');
					if (userInfo) {
						this.username = userInfo.username || null;
						this.email = userInfo.email || null;
						this.role = userInfo.role || 'user';
					}
				} catch (e) {
					// 忽略存储读取错误
				}
			} catch (e) {
				// 恢复失败，清除所有信息
				this.username = null;
				this.email = null;
				this.role = null;
				this._hasAccessToken = false;
				clearAllTokens();
			}
		},
		setAuth(payload: {
			username?: string | null;
			email: string;
			access_token: string;
			refresh_token?: string;
			role?: 'user' | 'admin';
		}) {
			this.username = payload.username || null;
			this.email = payload.email;
			this.role = payload.role || 'user';

			// 存储 token（由 tokenStore 管理）
			setAccessToken(payload.access_token);
			if (payload.refresh_token) {
				setRefreshToken(payload.refresh_token);
			}

			// 更新登录状态标志（确保响应式更新）
			this._hasAccessToken = true;

			// 可选：保存用户基本信息到本地存储（用于快速显示）
			try {
				uni.setStorageSync('user_info', {
					username: this.username,
					email: this.email,
					role: this.role,
				});
			} catch (e) {
				console.error('保存用户信息失败:', e);
			}
		},
		async logout() {
			// 调用后端 logout 接口撤销 refresh token
			try {
				const { request } = await import('@/services/api/index');
				const { getDeviceId } = await import('@/utils/device');
				const { getRefreshToken } = await import('@/utils/tokenStore');

				const deviceId = getDeviceId();
				const refreshToken = getRefreshToken();

				// 尝试调用 logout 接口（失败也不影响前端清除）
				if (refreshToken || deviceId) {
					await request('/api/auth/logout', {
						method: 'POST',
						data: refreshToken ? { refresh_token: refreshToken } : {},
						header: { 'X-Device-Id': deviceId },
						needAuth: false,
					}).catch(() => {
						// 忽略错误，继续清除本地数据
					});
				}
			} catch (e) {
				// 忽略错误，继续清除本地数据
			}

			// 清除用户信息和 token
			this.username = null;
			this.email = null;
			this.role = null;
			this._hasAccessToken = false; // 更新登录状态标志
			clearAllTokens();

			// 清除用户信息缓存
			try {
				uni.removeStorageSync('user_info');
			} catch (e) {
				// 忽略错误
			}
		},
	},
});
