/**
 * 八字排盘相关API
 */

import { request } from '@/api/index';

export interface SaveBaziParams {
	name: string;
	gender: string | null;
	birthDatetime: number | null;
	calendarType: string;
	rawPayload: any;
}

export interface BaziRecord {
	id: number;
	name: string;
	gender: number;
	birthDatetime: number;
	createdAt: string;
	updatedAt: string;
	rawPayload?: any;
}

// 以下函数未在项目中使用，已删除：
// - saveBazi() - 保存八字排盘
// - getBaziList() - 获取八字排盘列表
// - getBaziDetail() - 获取单个八字排盘详情
// - deleteBazi() - 删除八字排盘

