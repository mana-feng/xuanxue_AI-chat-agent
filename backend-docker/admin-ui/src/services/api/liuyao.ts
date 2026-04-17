import { request } from '@/services/api/index';

export interface LiuyaoRecordInfo {
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

export interface LiuyaoRecordListResponse {
	list: LiuyaoRecordInfo[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

/**
 * 获取六爻记录列表
 */
export function getLiuyaoRecordList(params: {
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

	return request<LiuyaoRecordListResponse>(`/api/admin/liuyao-records?${query.toString()}`, {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 获取六爻记录详情
 */
export function getLiuyaoRecordDetail(id: number) {
	return request<LiuyaoRecordInfo & { rawPayload?: any }>(`/api/admin/liuyao-records/${id}`, {
		method: 'GET',
		needAuth: true,
	});
}

/**
 * 创建六爻记录
 */
export function createLiuyaoRecord(params: {
	userId: number;
	name?: string;
	gender?: string;
	birthDatetime: string;
	calendarType?: string;
	rawPayload?: any;
}) {
	return request('/api/admin/liuyao-records', {
		method: 'POST',
		data: params,
		needAuth: true,
	});
}

/**
 * 更新六爻记录
 */
export function updateLiuyaoRecord(
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
	return request(`/api/admin/liuyao-records/${id}`, {
		method: 'PUT',
		data: params,
		needAuth: true,
	});
}

/**
 * 删除六爻记录
 */
export function deleteLiuyaoRecord(id: number) {
	return request('/api/admin/liuyao-records/' + id, {
		method: 'DELETE',
		needAuth: true,
	});
}
