import { useAppConfigStore } from '@/store/appConfig';
import { useUserStore } from '@/store/user';

let bootstrapPromise: Promise<void> | null = null;

/**
 * 应用启动引导：恢复登录态 + 拉取运行时配置（仅内存存储）。
 */
export function bootstrapApp(force = false): Promise<void> {
	if (bootstrapPromise && !force) {
		return bootstrapPromise;
	}

	bootstrapPromise = (async () => {
		// 恢复登录态（仅从本地 token / storage 读取，不请求后端）
		const userStore = useUserStore();
		userStore.restoreAuth();

		// 拉取运行时配置，失败不阻塞应用，但会打印警告。
		try {
			const appConfigStore = useAppConfigStore();
			await appConfigStore.load(force);
		} catch (err) {
			console.warn('加载运行时配置失败，继续使用默认配置', err);
		}
	})();

	return bootstrapPromise;
}

/**
 * 允许其他模块等待引导完成。
 */
export function waitBootstrap(): Promise<void> | null {
	return bootstrapPromise;
}
