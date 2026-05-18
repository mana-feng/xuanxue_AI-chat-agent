import { Solar } from 'lunar-javascript';
import type { LiuyaoResultPayload } from '@/store/liuyao';
import { useLiuyaoStore } from '@/store/liuyao';
import { buildDisplayData, compileNajia } from './najiaCore';
import liuyaoService from './service';
import { formatDateTime } from './uiHelpers';

export type LiuyaoExecutionInput = {
	title?: string;
	gender?: string | number | null;
	date: Date;
	params: number[];
	methodLabel: string;
};

export type TimeLiuyaoExecutionInput = {
	title?: string;
	gender?: string | number | null;
	date?: Date;
};

function normalizeGenderLabel(value: LiuyaoExecutionInput['gender']) {
	const normalized = String(value ?? '').trim().toLowerCase();
	if (!normalized) return '未填写';
	if (normalized === '0' || normalized === '男' || normalized === 'male' || normalized === 'man') {
		return '男';
	}
	if (normalized === '1' || normalized === '女' || normalized === 'female' || normalized === 'woman') {
		return '女';
	}
	return String(value ?? '').trim() || '未填写';
}

function buildLiuyaoResultPayload(input: LiuyaoExecutionInput): LiuyaoResultPayload {
	const date = new Date(input.date);
	if (!Number.isFinite(date.getTime())) {
		throw new Error('时间参数无效，无法生成六爻盘');
	}

	const params = Array.isArray(input.params) ? input.params.map((value) => Number(value) || 0) : [];
	if (params.length !== 6) {
		throw new Error('六爻参数不足，无法生成盘面');
	}

	const solar = Solar.fromDate(date);
	const lunar = solar.getLunar();
	const eightChar = lunar.getEightChar();
	const dayGz = eightChar.getDay();
	const title = String(input.title || '').trim();
	const compiled = compileNajia(params, {
		gender: '',
		title,
		date,
		dayGz,
		guaci: true,
		solar,
		lunar,
	});
	const display = buildDisplayData(compiled);

	return {
		compiled,
		display,
		profile: {
			title: title || '起卦记录',
			method: input.methodLabel,
			gender: normalizeGenderLabel(input.gender),
			dayGanZhi: dayGz,
			timeLabel: formatDateTime(date),
			focus: title || '未填写',
			note: `八字：${eightChar.getYear()} ${eightChar.getMonth()} ${eightChar.getDay()} ${eightChar.getTime()}`,
		},
		createdAt: Date.now(),
	};
}

export function executeLiuyaoChart(input: LiuyaoExecutionInput) {
	const payload = buildLiuyaoResultPayload(input);
	useLiuyaoStore().setResult(payload);
	return payload;
}

export function executeTimeLiuyaoChart(input: TimeLiuyaoExecutionInput = {}) {
	const date =
		input.date instanceof Date && Number.isFinite(input.date.getTime()) ? new Date(input.date.getTime()) : new Date();

	return executeLiuyaoChart({
		title: input.title,
		gender: input.gender ?? '',
		date,
		params: liuyaoService.generateTimeParams(date),
		methodLabel: '时间起卦',
	});
}
