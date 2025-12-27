/**
 * 前端配置文件（实际使用）
 * 从环境变量读取配置，如果未设置则使用默认�?
 */

import { theme, tiangan, dizhi } from './constants';

/**
 * 统一读取环境变量（兼�?Vite import.meta.env �?Webpack/Vue-CLI �?process.env�?
 */
const getEnv = (key: string): string | undefined => {
	// Vite / uni-app (import.meta.env)
	const viteEnv = (import.meta as any)?.env?.[key];
	if (viteEnv !== undefined && viteEnv !== null && viteEnv !== '') {
		return String(viteEnv);
	}

	// Webpack / Vue-CLI (process.env)
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore - process 在浏览器构建中可能不存在，仅作兼容读�?
	if (typeof process !== 'undefined' && process?.env) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const v = process.env[key];
		if (v !== undefined && v !== null && v !== '') {
			return String(v);
		}
	}

	return undefined;
};

/**
 * 后端 API 基础地址�?
 * - 优先 Vite 风格：VITE_API_BASE_URL
 * - 兼容 Vue-CLI 风格：VUE_APP_API_BASE_URL
 * - 最终兜底：线上默认地址
 */
export const API_BASE_URL =
	getEnv('VITE_API_BASE_URL') ??
	getEnv('VUE_APP_API_BASE_URL') ??
	'http://localhost:3001';

/**
 * API 签名密钥（仅供测试用，不建议在线上前端暴露）�?
 * - 优先 Vite：VITE_API_SIGNATURE_SECRET
 * - 兼容 Vue-CLI：VUE_APP_API_SIGNATURE_SECRET
 * - 默认空字符串（表示未启用前端签名密钥�?
 */
export const API_SIGNATURE_SECRET =
	getEnv('VITE_API_SIGNATURE_SECRET') ??
	getEnv('VUE_APP_API_SIGNATURE_SECRET') ??
	'';

// 开发环境检查：如果未配置签名密钥，提示开发者
if (import.meta.env.DEV && !API_SIGNATURE_SECRET) {
	console.info(
		'[Config] 未配置 VITE_API_SIGNATURE_SECRET，将使用弱签名模式（仅防重放）。' +
		'如需测试强签名，请在 .env 文件中配置。'
	);
}

export { theme };

// 导出十神映射表（向后兼容�?
export default {
	tiangan,
	dizhi,
};
