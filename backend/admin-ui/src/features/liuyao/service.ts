import { autoQiGua, numberQiGua, timeQiGua } from './qiGua';
import { formatDateTime } from './uiHelpers';

export function generateAutoParams(): number[] {
	return autoQiGua();
}

export function generateNumberParams(num1: number, num2: number, num3?: number | null): number[] {
	return numberQiGua(Math.abs(num1), Math.abs(num2), num3 ?? null);
}

export function generateTimeParams(date: Date): number[] {
	return timeQiGua(date);
}

export function formatTimeLabel(date: Date): string {
	return formatDateTime(date);
}

export default {
	generateAutoParams,
	generateNumberParams,
	generateTimeParams,
	formatTimeLabel
};


