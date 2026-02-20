import { defineStore } from 'pinia';
import { request } from '@/services/api/index';

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
		 * 读取配置项，未命中时返回 fallback�?
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
		 * 运行时从后端拉取配置，数据仅存内存，不落盘�?
		 */
		async load(force = false): Promise<void> {
			if (this.loading) return;
			if (this.loaded && !force) return;

			this.loading = true;
			this.error = null;
			try {
				const res = await request<RemoteAppConfig>('/api/config/bootstrap', {
					method: 'GET',
				});

				if (!res.success) {
					throw new Error(res.message || res.error || '');
				}

				const normalized =
					res.data && typeof res.data === 'object' ? res.data : ({} as RemoteAppConfig);

				this.config = normalized;
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
