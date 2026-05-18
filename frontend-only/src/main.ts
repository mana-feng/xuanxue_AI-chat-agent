import { createSSRApp } from 'vue';
import * as Pinia from 'pinia';
import tmui from '@/libs/tmui';
import App from '@/App.vue';
import { bootstrapApp } from '@/utils/bootstrap';

export function createApp() {
	const app = createSSRApp(App);
	app.use(Pinia.createPinia());
	app.use(tmui, {} as any);

	bootstrapApp().catch((err) => {
		console.error('bootstrap failed:', err);
	});
	return {
		app,
		Pinia,
	};
}
