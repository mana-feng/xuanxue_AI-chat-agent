import { defineConfig, loadEnv } from "vite";
import path from "path";
import uni from "@dcloudio/vite-plugin-uni";
import progress from "vite-plugin-progress";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, __dirname);
	const devPort = Number(env.VITE_DEV_PORT) || 3000;

	return {
		server: {
			port: devPort,
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
