import { createSSRApp } from 'vue';
import * as Pinia from 'pinia';
import tmui from '@/libs/tmui';
import App from '@/App.vue';
import { bootstrapApp } from '@/utils/bootstrap';
import { setupViewportWatcher } from '@/utils/viewport';

export function createApp() {
	const app = createSSRApp(App);
	app.use(Pinia.createPinia());
	app.use(tmui, {} as any);

	// 启动时恢复登录态并拉取运行时配置（仅内存缓存，不写入包体）
	bootstrapApp().catch((err) => {
		console.error('bootstrap failed:', err);
	});
	// #ifdef H5
	setupViewportWatcher();
	// #endif
	return {
		app,
		Pinia,
	};
}
