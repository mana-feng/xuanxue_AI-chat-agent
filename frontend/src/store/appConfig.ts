import { defineStore } from 'pinia';
import { API_BASE_URL } from '@/config/config';

export interface RemoteAppConfig {
	version?: string;
	features?: Record<string, boolean>;
	uploadEndpoint?: string;
	cdnBase?: string;
	[key: string]: any;
}

interface State {
	config: RemoteAppConfig | null;
	loading: boolean;
	loaded: boolean;
	error: string | null;
}

export const useAppConfigStore = defineStore('appConfig', {
	state: (): State => ({
		config: null,
		loading: false,
		loaded: false,
		error: null,
	}),
	getters: {
		/**
		 * 读取配置项，未命中时返回 fallback。
		 */
		get:
			(state) =>
			<T>(key: string, fallback: T | null = null): T | null => {
				if (!state.config) return fallback;
				return (state.config as any)[key] ?? fallback;
			},
	},
	actions: {
		/**
		 * 运行时从后端拉取配置，数据仅存内存，不落盘。
		 */
		async load(force = false): Promise<void> {
			if (this.loading) return;
			if (this.loaded && !force) return;

			this.loading = true;
			this.error = null;
			try {
				const res = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
					uni.request({
						url: `${API_BASE_URL}/api/config/bootstrap`,
						method: 'GET',
						timeout: 10000,
						success: resolve,
						fail: reject,
					});
				});

				const raw = res.data as any;
				const normalized =
					raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object'
						? raw.data
						: raw;

				this.config = (normalized && typeof normalized === 'object' ? normalized : {}) as RemoteAppConfig;
				this.loaded = true;
			} catch (err: any) {
				this.error = err?.errMsg || err?.message || '加载配置失败';
				throw err;
			} finally {
				this.loading = false;
			}
		},
	},
});
