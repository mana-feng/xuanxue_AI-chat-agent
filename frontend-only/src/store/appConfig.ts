import { defineStore } from 'pinia';

export interface RemoteAppConfig {
	version?: string;
	features?: Record<string, boolean>;
	[key: string]: any;
}

interface State {
	config: RemoteAppConfig | null;
	loading: boolean;
	loaded: boolean;
	error: string | null;
}

const DEFAULT_CONFIG: RemoteAppConfig = {
	version: '1.0.0',
	features: {},
};

export const useAppConfigStore = defineStore('appConfig', {
	state: (): State => ({
		config: DEFAULT_CONFIG,
		loading: false,
		loaded: true,
		error: null,
	}),
	getters: {
		get:
			(state) =>
			<T>(key: string, fallback: T | null = null): T | null => {
				if (!state.config) return fallback;
				return (state.config as any)[key] ?? fallback;
			},
	},
	actions: {
		async load(force = false): Promise<void> {
			if (this.loaded && !force) return;
			this.config = DEFAULT_CONFIG;
			this.loaded = true;
		},
	},
});
