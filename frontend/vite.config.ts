import { defineConfig } from "vite";
import path from "path";
import uni from "@dcloudio/vite-plugin-uni";
import progress from "vite-plugin-progress";

export default defineConfig({
	server: {
		port: 3000, // uni-app H5 开发默认端口
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
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
	// uni-app 特定配置
	build: {
		// 禁用 sourcemap 以减小包体积（开发时可开启）
		sourcemap: false,
		// 启用 CSS 代码分割
		cssCodeSplit: true,
		// 强制使用 ES 格式，避免 rollup 在分包时尝试 iife/umd 导致报错
		rollupOptions: {
			output: {
				// 若外部工具强行设为 iife，开启 inlineDynamicImports 以避免报错
				inlineDynamicImports: true,
				format: 'es',
			},
		},
		// 优化构建
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: false, // 保留 console，方便调试
				drop_debugger: true,
			},
		},
	},
});
