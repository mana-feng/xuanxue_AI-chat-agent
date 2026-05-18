import { useAppConfigStore } from '@/store/appConfig';

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapApp(force = false): Promise<void> {
	if (bootstrapPromise && !force) {
		return bootstrapPromise;
	}

	bootstrapPromise = (async () => {
		try {
			const appConfigStore = useAppConfigStore();
			await appConfigStore.load(force);
		} catch (err) {
			console.warn('加载运行时配置失败，继续使用默认配置', err);
		}
	})();

	return bootstrapPromise;
}

export function waitBootstrap(): Promise<void> | null {
	return bootstrapPromise;
}
