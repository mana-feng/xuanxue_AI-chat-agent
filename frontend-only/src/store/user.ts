import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
	state: () => {
		return {
			realname: null as string | null,
			gender: 0,
			timestamp: null as number | null,
			recordId: null as number | null,
		};
	},
	getters: {
		isLoggedIn: () => true,
	},
	actions: {
		set(data: Record<string, unknown>) {
			Object.assign(this, data);
		},
		restoreAuth() {
			// 无需认证，直接返回
		},
		async logout() {
			this.realname = null;
			this.gender = 0;
			this.timestamp = null;
			this.recordId = null;
		},
	},
});
