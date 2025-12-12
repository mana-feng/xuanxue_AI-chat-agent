import { createSSRApp } from 'vue';
import * as Pinia from 'pinia';
import tmui from '@/libs/tmui';
import App from '@/App.vue';

export function createApp() {
	const app = createSSRApp(App);
	app.use(Pinia.createPinia());
	app.use(tmui);
	return {
		app,
		Pinia,
	};
}
