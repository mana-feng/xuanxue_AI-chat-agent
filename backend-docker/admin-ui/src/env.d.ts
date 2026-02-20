/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />

// uni-app 环境变量类型定义
declare namespace UniApp {
	interface Env {
		readonly VITE_API_BASE_URL?: string;
		readonly NODE_ENV: 'development' | 'production';
	}
}

// Vite 环境变量类型扩展
interface ImportMetaEnv {
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_API_SIGNATURE_SECRET?: string;
	readonly NODE_ENV: 'development' | 'production';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare global {
	let clipboardJS: any;
	const process: any;
	const require: any;
	interface Uni {
		$tm: any;
	}
}

declare module '*.vue' {
	import { DefineComponent } from 'vue';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
	const component: DefineComponent<{}, {}, any>;
	export default component;
}

export {};
