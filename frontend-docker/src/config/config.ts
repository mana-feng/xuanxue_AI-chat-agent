/**
 * 前端配置文件
 * 统一通过环境变量 (.env) 管理配置
 */

import { theme, tiangan, dizhi } from './constants';

/**
 * 统一读取环境变量（兼容 Vite import.meta.env 和 Webpack/Vue-CLI / process.env）
 */
const getEnv = (key: string): string | undefined => {
    // Vite / uni-app (import.meta.env)
    const viteEnv = (import.meta as any)?.env?.[key];
    if (viteEnv !== undefined && viteEnv !== null && viteEnv !== '') {
        return String(viteEnv);
    }

    // Webpack / Vue-CLI (process.env)
    const procEnv = (globalThis as any)?.process?.env as Record<string, unknown> | undefined;
    if (procEnv) {
        const v = procEnv[key];
        if (v !== undefined && v !== null && v !== '') {
            return String(v);
        }
    }

    return undefined;
};

/**
 * 后端 API 基础地址
 */
export const API_BASE_URL =
    getEnv('VITE_API_BASE_URL') ??
    getEnv('VUE_APP_API_BASE_URL') ??
    (typeof window !== 'undefined' ? window.location.origin : undefined);

/**
 * API 签名密钥
 */
export const API_SIGNATURE_SECRET =
    getEnv('VITE_API_SIGNATURE_SECRET') ??
    getEnv('VUE_APP_API_SIGNATURE_SECRET');

/**
 * 是否启用签名
 */
export const API_SIGNATURE_ENABLED = getEnv('VITE_API_SIGNATURE_ENABLED') !== 'false';

// 开发环境检查
if (import.meta.env.DEV && !API_SIGNATURE_SECRET) {
    console.info(
        '[Config] 未配置 VITE_API_SIGNATURE_SECRET，将使用弱签名模式。'
    );
}

// 强制启用签名（即使是开发环境），因为后端现在默认是开启的
export const FORCE_ENABLE_SIGNATURE = API_SIGNATURE_ENABLED;

export { theme };

export default {
    tiangan,
    dizhi,
};
