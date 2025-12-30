import { defineConfig, loadEnv } from "vite";
import path from "path";
import fs from "fs";
import uni from "@dcloudio/vite-plugin-uni";
import progress from "vite-plugin-progress";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, __dirname);
	const devPort = Number(process.env.VITE_DEV_PORT || env.VITE_DEV_PORT) || 3000;
	const apiTarget = env.VITE_API_PROXY_TARGET || "https://localhost:3001";
	const httpsKeyPath = path.resolve(__dirname, "../cert/localhost-key.pem");
	const httpsCertPath = path.resolve(__dirname, "../cert/localhost.pem");
	const viteDevHttps = process.env.VITE_DEV_HTTPS || env.VITE_DEV_HTTPS;
	const httpsEnabled =
		fs.existsSync(httpsKeyPath) && fs.existsSync(httpsCertPath) && viteDevHttps !== "false";

	return {
		server: {
			port: devPort,
			strictPort: true,
			https: httpsEnabled
				? {
						key: fs.readFileSync(httpsKeyPath),
						cert: fs.readFileSync(httpsCertPath),
					}
				: undefined,
			proxy: {
				"/api": {
					target: apiTarget,
					changeOrigin: true,
					secure: false,
					ws: true,
				},
			},
			hmr: {
				overlay: false,
				protocol: "wss",
				clientHost: "localhost",
				clientPort: 3000,
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
