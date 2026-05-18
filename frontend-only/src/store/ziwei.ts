/**
 * 紫微斗数 Store
 *
 * 使用 iztro 库进行排盘计算
 */
import { defineStore } from 'pinia';
import { astro } from 'iztro';
import { Solar } from 'lunar-javascript';
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe';

interface PullData {
	timestamp: number;
	gender: number; // 0: male, 1: female
}

type ViewMode = 'origin' | 'decadal' | 'yearly' | 'monthly' | 'daily';

function toHourIndex(hour: number): number {
	// Keep hour index aligned with iztro: 00:00 => early rat(0), 23:00 => late rat(12).
	if (hour === 0) return 0;
	if (hour === 23) return 12;
	return Math.floor((hour + 1) / 2);
}

function toDateKey(value: Date | string | number): string {
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime())) return '';
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

const horoscopeCacheByAstrolabe = new WeakMap<object, Map<string, any>>();

function getCachedHoroscope(astrolabe: object, cacheKey: string, calc: () => any) {
	let cache = horoscopeCacheByAstrolabe.get(astrolabe);
	if (!cache) {
		cache = new Map<string, any>();
		horoscopeCacheByAstrolabe.set(astrolabe, cache);
	}
	if (cache.has(cacheKey)) {
		return cache.get(cacheKey) || null;
	}
	const value = calc();
	cache.set(cacheKey, value);
	return value;
}

export const useZiweiStore = defineStore('ziwei', {
	state: () => {
		return {
			astrolabe: null as IFunctionalAstrolabe | null,
			input: {
				timestamp: null as number | null,
				gender: null as number | null,
			},
			viewMode: 'origin' as ViewMode,
			targetDate: new Date(), // For horoscope
			focusPalaceIndex: null as number | null, // The index of the palace currently clicked/focused
		};
	},
	getters: {
		currentHoroscope(state): any | null {
			if (!state.astrolabe || state.viewMode === 'origin') return null;
			try {
	                // console.log('Generating horoscope for', state.targetDate);
				const timestamp =
					state.targetDate instanceof Date
						? state.targetDate.getTime()
						: new Date(state.targetDate as any).getTime();
				if (!Number.isFinite(timestamp)) return null;
				const cacheKey = toDateKey(timestamp);
				if (!cacheKey) return null;
				// Use a fresh Date instance to avoid accidental in-place Date mutation side effects.
				return getCachedHoroscope(state.astrolabe as object, cacheKey, () =>
					state.astrolabe!.horoscope(new Date(timestamp)),
				);
			} catch (e) {
				console.error('Failed to generate horoscope:', e);
				return null;
			}
		},
	},
		actions: {
			pull(data: PullData) {
			const { timestamp, gender } = data;
			// @ts-expect-error - Pinia store state assignment
			this.input = { timestamp, gender };

			const solar = Solar.fromDate(new Date(timestamp));
			const dateStr = solar.toYmd();
			const hourIndex = toHourIndex(solar.getHour());

			const genderStr = gender === 0 ? '男' : '女';

			try {
				// @ts-expect-error - iztro library type incompatibility
				this.astrolabe = astro.bySolar(dateStr, hourIndex, genderStr, true, 'zh-CN');
				this.targetDate = new Date(); // Reset target date to now
				this.viewMode = 'origin';
				this.focusPalaceIndex = null;
			} catch (e) {
				console.error('Ziwei calculation failed:', e);
				this.astrolabe = null;
				throw e;
			}
		},
			setMode(mode: ViewMode) {
				const sameMode = this.viewMode === mode;
				const hadFocus = this.focusPalaceIndex !== null;
				if (sameMode && !hadFocus) return;
				this.$patch((state) => {
					if (!sameMode) state.viewMode = mode;
					if (hadFocus) state.focusPalaceIndex = null;
				});
			},
			setTargetDate(date: Date | string | number) {
				const nextDate =
					date instanceof Date ? new Date(date.getTime()) : new Date(date);
				if (!Number.isFinite(nextDate.getTime())) {
					console.warn('Ignore invalid targetDate:', date);
					return;
				}
				const currentTs =
					this.targetDate instanceof Date
						? this.targetDate.getTime()
						: new Date(this.targetDate as any).getTime();
				if (Number.isFinite(currentTs) && currentTs === nextDate.getTime()) return;
				this.targetDate = nextDate;
			},
			setTimelineSelection(payload: { mode: ViewMode; date: Date | string | number }) {
				const nextDate =
					payload.date instanceof Date ? new Date(payload.date.getTime()) : new Date(payload.date);
				if (!Number.isFinite(nextDate.getTime())) {
					console.warn('Ignore invalid timeline payload:', payload);
					return;
				}
				const currentTs =
					this.targetDate instanceof Date
						? this.targetDate.getTime()
						: new Date(this.targetDate as any).getTime();
				const sameDate = Number.isFinite(currentTs) && currentTs === nextDate.getTime();
				const sameMode = this.viewMode === payload.mode;
				const hadFocus = this.focusPalaceIndex !== null;
				if (sameDate && sameMode && !hadFocus) return;
				this.$patch((state) => {
					if (!sameDate) state.targetDate = nextDate;
					if (!sameMode) state.viewMode = payload.mode;
					if (hadFocus) state.focusPalaceIndex = null;
				});
			},
		setFocus(index: number | null) {
			// Toggle focus if clicking the same one
			if (this.focusPalaceIndex === index) {
				this.focusPalaceIndex = null;
			} else {
				this.focusPalaceIndex = index;
			}
		}
	},
});
