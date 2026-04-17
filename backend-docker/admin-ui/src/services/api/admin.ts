/**
 * 管理员后台API
 */

import { request } from '@/services/api/index';

export interface AdminStats {
	totalUsers: number;
	totalRecords: number;
	todayUsers: number;
	todayRecords: number;
	adminUsers: number;
}

export interface UserInfo {
	id: number;
	email: string;
	username?: string;
	role: 'user' | 'admin';
	created_at: string;
	recordCount?: number;
}

export interface UserListResponse {
	list: UserInfo[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface BaziRecordInfo {
	id: number;
	name: string;
	gender: string;
	birthDatetime: string;
	calendarType: string;
	createdAt: string;
	userId: number;
	userEmail: string;
	userUsername?: string;
}

export interface RecordListResponse {
	list: BaziRecordInfo[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export type ChartType = 'bazi' | 'liuyao' | 'ziwei';
export type ChartTypeFilter = ChartType | 'all';

export interface AdminChartRecordInfo extends BaziRecordInfo {
	chartType: ChartType;
}

export interface AdminChartRecordListResponse {
	list: AdminChartRecordInfo[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface EmailConfig {
	configured: boolean;
	host: string;
	port: number;
	user: string;
	from: string;
	fromName: string;
}

export interface AnalyticsSnippetResponse {
	snippet: string;
}

export interface EmailConfigHistoryItem {
	id: number;
	host: string;
	port: number;
	user: string;
	pass: string;
	from: string;
	fromName?: string | null;
	is_active: number;
	created_at?: string;
	updated_at?: string;
}

/**
 * 获取统计数据
 */
export function getAdminStats() {
	return request<AdminStats>('/api/admin/stats', {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 获取用户列表
 */
export function getUserList(params: { page?: number; pageSize?: number; search?: string }) {
	const query = new URLSearchParams();
	if (params.page) query.append('page', params.page.toString());
	if (params.pageSize) query.append('pageSize', params.pageSize.toString());
	if (params.search) query.append('search', params.search);

	return request<UserListResponse>(`/api/admin/users?${query.toString()}`, {
		method: 'GET',
		needAuth: true,
	});
}

export interface QuotaResetConfig {
	enabled: boolean;
	time: string;
	timezone: string;
	target: number;
}

/**
 * 获取额度重置配置
 */
export function getQuotaResetConfig() {
	return request<QuotaResetConfig>('/api/admin/quota-reset-config', {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 保存额度重置配置
 */
export function setQuotaResetConfig(data: QuotaResetConfig) {
	return request<{ success: boolean }>('/api/admin/quota-reset-config', {
		method: 'PUT',
		needAuth: true,
		data,
	});
}

// getUserDetail() 函数未在项目中使用，已删除

/**
 * 更新用户角色
 */
export function updateUserRole(id: number, role: 'user' | 'admin') {
	return request('/api/admin/users/' + id + '/role', {
		method: 'PUT',
		data: { role },
		needAuth: true,
	});
}

/**
 * 删除用户
 */
export function deleteUser(id: number) {
	return request('/api/admin/users/' + id, {
		method: 'DELETE',
		needAuth: true,
	});
}

/**
 * 获取八字记录列表
 */
export function getRecordList(params: {
	page?: number;
	pageSize?: number;
	userId?: number;
	search?: string;
}) {
	const query = new URLSearchParams();
	if (params.page) query.append('page', params.page.toString());
	if (params.pageSize) query.append('pageSize', params.pageSize.toString());
	if (params.userId) query.append('userId', params.userId.toString());
	if (params.search) query.append('search', params.search);

	return request<RecordListResponse>(`/api/admin/records?${query.toString()}`, {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 获取八字记录详情
 */
export function getRecordDetail(id: number) {
	return request<BaziRecordInfo & { rawPayload?: any }>(`/api/admin/records/${id}`, {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 创建八字记录
 */
export function createRecord(params: {
	userId: number;
	name?: string;
	gender?: string;
	birthDatetime: string;
	calendarType?: string;
	rawPayload?: any;
}) {
	return request('/api/admin/records', {
		method: 'POST',
		data: params,
		needAuth: true,
	});
}

/**
 * 更新八字记录
 */
export function updateRecord(
	id: number,
	params: {
		userId?: number;
		name?: string | null;
		gender?: string;
		birthDatetime?: string;
		calendarType?: string | null;
		rawPayload?: any | null;
	}
) {
	return request(`/api/admin/records/${id}`, {
		method: 'PUT',
		data: params,
		needAuth: true,
	});
}

/**
 * 删除八字记录
 */
export function deleteRecord(id: number) {
	return request('/api/admin/records/' + id, {
		method: 'DELETE',
		needAuth: true,
	});
}

/**
 * 获取统一排盘记录列表（八字/六爻/紫微）
 */
export function getChartRecordList(params: {
	page?: number;
	pageSize?: number;
	userId?: number;
	search?: string;
	type?: ChartTypeFilter;
}) {
	const query = new URLSearchParams();
	if (params.page) query.append('page', params.page.toString());
	if (params.pageSize) query.append('pageSize', params.pageSize.toString());
	if (params.userId) query.append('userId', params.userId.toString());
	if (params.search) query.append('search', params.search);
	if (params.type) query.append('type', params.type);

	return request<AdminChartRecordListResponse>(`/api/admin/chart-records?${query.toString()}`, {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 获取统一排盘记录详情
 */
export function getChartRecordDetail(id: number, type: ChartType) {
	const query = new URLSearchParams();
	query.append('type', type);
	return request<AdminChartRecordInfo & { rawPayload?: any }>(
		`/api/admin/chart-records/${id}?${query.toString()}`,
		{
			method: 'GET',
			needAuth: true,
		}
	);
}

/**
 * 创建统一排盘记录
 */
export function createChartRecord(params: {
	type: ChartType;
	userId: number;
	name?: string;
	gender?: string;
	birthDatetime: string;
	calendarType?: string;
	rawPayload?: any;
}) {
	return request('/api/admin/chart-records', {
		method: 'POST',
		data: params,
		needAuth: true,
	});
}

/**
 * 更新统一排盘记录
 */
export function updateChartRecord(
	id: number,
	params: {
		type: ChartType;
		userId?: number;
		name?: string | null;
		gender?: string;
		birthDatetime?: string;
		calendarType?: string | null;
		rawPayload?: any | null;
	}
) {
	return request(`/api/admin/chart-records/${id}`, {
		method: 'PUT',
		data: params,
		needAuth: true,
	});
}

/**
 * 删除统一排盘记录
 */
export function deleteChartRecord(id: number, type: ChartType) {
	const query = new URLSearchParams();
	query.append('type', type);
	return request(`/api/admin/chart-records/${id}?${query.toString()}`, {
		method: 'DELETE',
		needAuth: true,
	});
}

/**
 * 创建用户
 */
export function createUser(params: {
	email: string;
	username?: string;
	password: string;
	role?: 'user' | 'admin';
}) {
	return request('/api/admin/users', {
		method: 'POST',
		data: params,
		needAuth: true,
	});
}

/**
 * 更新用户信息
 */
export function updateUser(
	id: number,
	params: {
		email?: string;
		username?: string | null;
		password?: string;
		role?: 'user' | 'admin';
	}
) {
	return request(`/api/admin/users/${id}`, {
		method: 'PUT',
		data: params,
		needAuth: true,
	});
}

/**
 * 获取邮箱配置
 */
export function getAdminEmailConfig() {
	return request<EmailConfig>('/api/admin/email-config', {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 更新邮箱配置
 */
export function updateAdminEmailConfig(payload: {
	host: string;
	port: number;
	user: string;
	pass: string;
	from: string;
	fromName?: string;
}) {
	return request('/api/admin/email-config', {
		method: 'PUT',
		data: payload,
		needAuth: true,
	});
}



/**
 * 获取访问统计数据
 */
export interface AnalyticsStats {
	todayPageviews: number;
	yesterdayPageviews: number;
	totalPageviews: number;
	uniqueVisitors: number;
	totalSessions: number;
	weeklyPageviews: number;
	monthlyPageviews: number;
	deviceStats: { mobile: number; tablet: number; desktop: number };
	topBrowsers: Array<{ browser: string; version: string; count: number }>;
	topOs: Array<{ os: string; version: string; count: number }>;
	topPages: Array<{ pathname: string; title: string; count: number }>;
	topReferrers: Array<{ referrer: string; count: number }>;
	connectionStats: Array<{ type: string; count: number }>;
	geoCountries: Array<{ country: string; count: number }>;
	ispStats: Array<{ isp: string; count: number }>;
	referrerTypeStats: Array<{ type: string; count: number }>;
	searchEngineStats: Array<{ engine: string; count: number }>;
	searchKeywords: Array<{ keyword: string; count: number }>;
	screenResolutions: Array<{ resolution: string; count: number }>;
	hourlyData: Array<{ hour: number; count: number }>;
	dailyTrend: Array<{ date: string; pv: number; uv: number }>;
	dowData: Array<{ day: string; dayIndex: number; count: number }>;
	newVisitorCount: number;
	returningVisitorCount: number;
	bounceRate: number;
	entryPages: Array<{ pathname: string; count: number }>;
	exitPages: Array<{ pathname: string; entryCount: number; exitCount: number }>;
	performanceStats: { avgLoadTime: number; minLoadTime: number; maxLoadTime: number; avgFCP: number; avgDCL: number };
	utmCampaigns: Array<{ source: string; medium: string; campaign: string; count: number }>;
	languageStats: Array<{ language: string; count: number }>;
	timezoneStats: Array<{ timezone: string; count: number }>;
	realtimeVisitors: Array<{
		url: string; pathname: string; title: string;
		ip: string;
		screenWidth: number; screenHeight: number; pixelRatio: number;
		language: string;
		deviceType: string;
		browser: string; browserVersion: string;
		os: string; osVersion: string;
		referrerType: string;
		time: string;
		isLoggedIn: boolean;
		username: string | null;
	}>;
}

export function getAdminAnalyticsStats() {
	return request<{ success: boolean; data: AnalyticsStats }>('/api/admin/stats/analytics', {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 获取邮箱配置历史
 */
export function getAdminEmailConfigHistory() {
	return request<{ success: boolean; data: EmailConfigHistoryItem[] }>('/api/admin/email-configs', {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 切换邮箱配置
 */
export function activateAdminEmailConfig(id: number) {
	return request(`/api/admin/email-configs/${id}/activate`, {
		method: 'POST',
		needAuth: true,
	});
}

/**
 * 删除邮箱配置
 */
export function deleteAdminEmailConfig(id: number) {
	return request(`/api/admin/email-configs/${id}`, {
		method: 'DELETE',
		needAuth: true,
	});
}

// ==================== AI额度管理 API ====================

export interface UserQuota {
	userId: number;
	email: string;
	username?: string;
	remainingCount: number;
	updatedAt: string | null;
}

export interface UserQuotasListResponse {
	list: UserQuota[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

/**
 * 获取用户AI额度列表（管理员）
 */
export function getUserQuotasList(params: { page?: number; pageSize?: number; search?: string }) {
	const query = new URLSearchParams();
	if (params.page) query.append('page', params.page.toString());
	if (params.pageSize) query.append('pageSize', params.pageSize.toString());
	if (params.search) query.append('search', params.search);

	return request<UserQuotasListResponse>(`/api/admin/users-quotas?${query.toString()}`, {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 获取指定用户AI额度（管理员）
 */
export function getUserQuotaDetail(userId: number) {
	return request<UserQuota>(`/api/admin/users/${userId}/quota`, {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 设置指定用户AI额度（管理员）
 */
export function setUserQuota(
	userId: number,
	payload: {
		remainingCount?: number;
	}
) {
	return request(`/api/admin/users/${userId}/quota`, {
		method: 'PUT',
		data: payload,
		needAuth: true,
	});
}
