import { defineConfig, loadEnv } from "vite";
import path from "path";
import fs from "fs";
import uni from "@dcloudio/vite-plugin-uni";
import progress from "vite-plugin-progress";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, __dirname);
	const devPort = Number(env.VITE_DEV_PORT) || 3002; // 开发端口避开 3000/3001
	const platform = process.env.UNI_PLATFORM || "h5";
	const isH5 = platform === "h5";
	const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:3001";
	const httpsKeyPath = path.resolve(__dirname, "../../cert/localhost-key.pem");
	const httpsCertPath = path.resolve(__dirname, "../../cert/localhost.pem");
	const httpsEnabled =
		fs.existsSync(httpsKeyPath) && fs.existsSync(httpsCertPath) && env.VITE_DEV_HTTPS !== "false";

	return {
		server: {
			port: devPort,
			strictPort: true,
			https: httpsEnabled
				? {
						key: fs.readFileSync(httpsKeyPath, "utf8"),
						cert: fs.readFileSync(httpsCertPath, "utf8"),
					}
				: undefined,
            proxy: {
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    secure: false
                }
            }
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
		// uni-app 鐗瑰畾閰嶇疆
		build: {
			// 绂佺敤 sourcemap 浠ュ噺灏忓寘浣撶Н锛堝紑鍙戞椂鍙紑鍚級
			sourcemap: false,
			// 鍚敤 CSS 浠ｇ爜鍒嗗壊
			cssCodeSplit: true,
			// 浠?H5 闇€瑕佸己鍒?ES 鏍煎紡涓?inlineDynamicImports
			rollupOptions: isH5
				? {
						output: {
							// 鑻ュ閮ㄥ伐鍏峰己琛岃涓?iife锛屽紑鍚?inlineDynamicImports 浠ラ伩鍏嶆姤閿?							inlineDynamicImports: true,
							format: "es",
						},
					}
				: undefined,
			// 浼樺寲鏋勫缓
			minify: "terser",
			terserOptions: {
				compress: {
					drop_console: false, // 淇濈暀 console锛屾柟渚胯皟璇?					drop_debugger: true,
				},
			},
		},
	};
});
