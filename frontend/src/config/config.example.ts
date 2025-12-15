/**
 * 前端配置示例文件
 * 复制此文件为 config.ts 并修改配置
 */

/**
 * 后端 API 基础地址
 * 
 * 配置说明：
 * - 开发环境：通常为 http://localhost:3001
 * - 生产环境：配置为实际的后端服务器地址
 * 
 * 环境变量注入：
 * - 构建时通过 VITE_API_BASE_URL 环境变量注入
 * - 如果未设置，将使用默认值 http://localhost:3001
 */
export const API_BASE_URL = 
	(import.meta as any)?.env?.VITE_API_BASE_URL || 
	(typeof process !== 'undefined' && (process as any)?.env?.VITE_API_BASE_URL) ||
	'http://localhost:3001';

/**
 * 应用主题配置
 */
export const theme = {
	primary: '#0052d9', // 主色调
};

/**
 * 其他配置项
 */
export const appConfig = {
	// 应用版本
	version: '1.0.0',
	
	// 应用名称
	appName: 'AI 玄学',
	
	// 是否启用调试模式
	debug: false,
	
	// 请求超时时间（毫秒）
	requestTimeout: 30000,
	
	// 分页默认大小
	defaultPageSize: 20,
};

