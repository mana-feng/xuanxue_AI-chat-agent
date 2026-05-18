import { defineConfig } from "vite";
import path from "path";
import uni from "@dcloudio/vite-plugin-uni";
import progress from "vite-plugin-progress";

export default defineConfig(() => {
	return {
		server: {
			port: 3050,
			host: "0.0.0.0",
			strictPort: false,
			hmr: {
				overlay: false,
				protocol: "ws",
				host: "localhost",
				port: 3050,
			},
		},
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
			},
		},
		define: {
			__VUE_I18N_FULL_INSTALL__: true,
			__VUE_I18N_LEGACY_API__: false,
			__INTLIFY_PROD_DEVTOOLS__: false,
		},
		plugins: [
			progress({
				format: "building [:bar] :percent",
				total: 100,
				width: 100,
				complete: "=",
				incomplete: "",
			}),
			uni(),
		],
		css: {
			preprocessorOptions: {
				scss: {
					silenceDeprecations: ["legacy-js-api"],
				},
			},
		},
		build: {
			sourcemap: false,
			cssCodeSplit: true,
			minify: "terser",
			terserOptions: {
				compress: {
					drop_console: false,
					drop_debugger: true,
				},
			},
		},
	};
});
