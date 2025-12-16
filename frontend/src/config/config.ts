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
// 仅根据 .env 中的 VITE_API_BASE_URL 读取，未设置则使用默认值
const resolveApiBase = (): string =>
	(import.meta as any)?.env?.VITE_API_BASE_URL || 'https://xuanapi.manafeng.com';

export const API_BASE_URL = resolveApiBase();
export const API_SIGNATURE_SECRET = (import.meta as any)?.env?.VITE_API_SIGNATURE_SECRET || '';

export { theme };

// 导出十神映射表（向后兼容）
export default {
	tiangan,
	dizhi,
};
