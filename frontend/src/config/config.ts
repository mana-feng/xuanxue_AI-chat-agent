/**
 * 前端配置文件（实际使用）
 * 从环境变量读取配置，如果未设置则使用默认值
 */

import { theme, tiangan, dizhi } from './constants';

/**
 * 后端 API 基础地址
 * uni-app 环境变量处理：
 * - 开发环境：使用 vite 注入的 import.meta.env
 * - 生产环境：使用构建时注入的环境变量
 * - 默认值：本地开发地址
 */
const resolveApiBase = (): string => {
	// uni-app 使用 import.meta.env 获取环境变量（Vite 模式）
	// #ifdef VITE
	const viteEnv = (import.meta as any)?.env?.VITE_API_BASE_URL;
	if (viteEnv) return viteEnv;
	// #endif
	
	// 兼容处理：检查是否有全局配置
	// @ts-ignore - 运行时可能注入的全局变量
	if (typeof globalThis !== 'undefined' && (globalThis as any).__API_BASE_URL__) {
		return (globalThis as any).__API_BASE_URL__;
	}
	
	// 默认值：本地开发地址
	return 'http://localhost:3001';
};

export const API_BASE_URL = resolveApiBase();

export { theme };

// 导出十神映射表（向后兼容）
export default {
	tiangan,
	dizhi,
};
