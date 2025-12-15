/**
 * Token 存储管理
 * 按三端区分存储策略：
 * - H5: refresh_token 使用 HttpOnly Cookie（由后端设置），access_token 存内存或 sessionStorage
 * - App: refresh_token 和 access_token 都存 storage（后续可迁移到安全存储）
 * - 小程序: refresh_token 和 access_token 都存 storage
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// 判断当前运行平台
function getPlatform(): 'h5' | 'app' | 'mp' {
	// #ifdef H5
	return 'h5';
	// #endif

	// #ifdef APP-PLUS
	return 'app';
	// #endif

	// #ifdef MP-WEIXIN
	return 'mp';
	// #endif

	// 默认返回 h5
	return 'h5';
}

const platform = getPlatform();

/**
 * Access Token 存储（所有平台都可以用 storage 或内存）
 */
export function getAccessToken(): string | null {
	try {
		return uni.getStorageSync(ACCESS_TOKEN_KEY) || null;
	} catch (e) {
		return null;
	}
}

export function setAccessToken(token: string): void {
	try {
		uni.setStorageSync(ACCESS_TOKEN_KEY, token);
	} catch (e) {
		console.error('存储 access token 失败:', e);
	}
}

export function clearAccessToken(): void {
	try {
		uni.removeStorageSync(ACCESS_TOKEN_KEY);
	} catch (e) {
		console.error('清除 access token 失败:', e);
	}
}

/**
 * Refresh Token 存储（按平台区分）
 */
export function getRefreshToken(): string | null {
	if (platform === 'h5') {
		// H5 使用 HttpOnly Cookie，JS 无法读取
		// 如果后端设置了 cookie，前端不需要存储
		// 这里返回 null，refresh 接口会从 cookie 读取
		return null;
	}

	// App 和 小程序使用 storage
	try {
		return uni.getStorageSync(REFRESH_TOKEN_KEY) || null;
	} catch (e) {
		return null;
	}
}

export function setRefreshToken(token: string): void {
	if (platform === 'h5') {
		// H5 使用 HttpOnly Cookie，由后端设置
		// 前端不需要存储，但可以存一份作为备份（不推荐）
		// 这里不存储，完全依赖 cookie
		return;
	}

	// App 和 小程序使用 storage
	try {
		uni.setStorageSync(REFRESH_TOKEN_KEY, token);
	} catch (e) {
		console.error('存储 refresh token 失败:', e);
	}
}

export function clearRefreshToken(): void {
	if (platform === 'h5') {
		// H5 的 refresh token 在 cookie 中，需要调用后端 logout 清除
		// 这里只清除本地可能存在的备份
		try {
			uni.removeStorageSync(REFRESH_TOKEN_KEY);
		} catch (e) {
			// 忽略错误
		}
		return;
	}

	// App 和 小程序清除 storage
	try {
		uni.removeStorageSync(REFRESH_TOKEN_KEY);
	} catch (e) {
		console.error('清除 refresh token 失败:', e);
	}
}

/**
 * 清除所有 token
 */
export function clearAllTokens(): void {
	clearAccessToken();
	clearRefreshToken();
}
