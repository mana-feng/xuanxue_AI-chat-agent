import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
	state: () => {
		return {
			realname: null as string | null,
			gender: 0,
			timestamp: null as number | null,
			// 账号信息
			username: null as string | null,
			email: null as string | null,
			token: null as string | null
		};
	},
	getters: {
		isLoggedIn: (state) => !!state.token
	},
	actions: {
		set(data: Record<string, unknown>) {
			for (let key in data) {
				// @ts-ignore 动态合并字段
				this[key] = data[key] as any;
			}
		},
		// 初始化时从本地缓存恢复登录状态
		restoreAuth() {
			try {
				const cache = uni.getStorageSync('auth');
				if (!cache) return;
				const parsed = typeof cache === 'string' ? JSON.parse(cache) : cache;
				this.username = parsed.username || null;
				this.email = parsed.email || null;
				this.token = parsed.token || null;
			} catch (e) {
				uni.removeStorageSync('auth');
			}
		},
		setAuth(payload: { username?: string | null; email: string; token: string }) {
			this.username = payload.username || null;
			this.email = payload.email;
			this.token = payload.token;
			uni.setStorageSync('auth', {
				username: this.username,
				email: this.email,
				token: this.token
			});
		},
		logout() {
			this.username = null;
			this.email = null;
			this.token = null;
			uni.removeStorageSync('auth');
		}
	}
});
