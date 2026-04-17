import type { Store } from 'pinia';

type ViewMode = 'origin' | 'decadal' | 'yearly' | 'monthly' | 'daily';

interface UserStoreLike {
	realname: string | null;
	gender: number | string | null;
	timestamp: number | null;
}

interface ZiweiStoreLike {
	astrolabe: unknown | null;
	viewMode: ViewMode;
	targetDate: Date | string | number;
	focusPalaceIndex: number | null;
	currentHoroscope?: unknown | null;
}

type SurroundKey = 'target' | 'opposite' | 'wealth' | 'career';

type ExportStar = {
	name: string | null;
	brightness: string | null;
	mutagen: string | null;
};

type ExportPalace = {
	index: number | null;
	name: string | null;
	displayName: string | null;
	isBodyPalace: boolean;
	isOriginalPalace: boolean;
	heavenlyStem: string | null;
	earthlyBranch: string | null;
	changsheng12: string | null;
	boshi12: string | null;
	jiangqian12: string | null;
	suiqian12: string | null;
	decadal: {
		range: number[];
		heavenlyStem: string | null;
		earthlyBranch: string | null;
	};
	ages: number[];
	majorStars: ExportStar[];
	minorStars: ExportStar[];
	adjectiveStars: ExportStar[];
};

type DecadalTimelineItem = {
	palaceIndex: number | null;
	palaceName: string | null;
	displayName: string | null;
	heavenlyStem: string | null;
	earthlyBranch: string | null;
	ganZhi: string;
	range: number[];
};

type HoroscopeScopesExport = {
	decadal: Record<string, unknown> | null;
	age: Record<string, unknown> | null;
	yearly: Record<string, unknown> | null;
	monthly: Record<string, unknown> | null;
	daily: Record<string, unknown> | null;
	hourly: Record<string, unknown> | null;
};

type CompactHoroscopeScope = {
	i: number | null;
	hs: string | null;
	eb: string | null;
	m?: string[];
	sp?: Array<{ p: number; v: string[] }>;
	na?: number;
	y12?: { j: string[]; u: string[] };
};

type CompactScopePack = {
	d: CompactHoroscopeScope | null;
	a: CompactHoroscopeScope | null;
	y: CompactHoroscopeScope | null;
};

const MUTAGEN_NAMES = ['禄', '权', '科', '忌'] as const;
const SURROUND_KEYS: SurroundKey[] = ['target', 'opposite', 'wealth', 'career'];
const ZIWEI_EXPORT_PROMPT = `你是一名专业紫微斗数解读助手，目标是：根据用户提供的紫微排盘信息，精准回答用户提出的具体问题。

规则：

每次回答问题时称呼我为主人。

必须以盘面事实为依据（十二宫、主星/辅星/杂曜、四化、三方四正、命宫/身宫、大限/流年/流月/流日/流时），神煞只能辅助。

回答要围绕“用户问题”，避免输出与问题无关的大段通用命理科普。

避免武断：对不确定或依赖缺失信息（尤其时辰、历法、目标时间）的部分，要明确说明“影响点”和“可能范围”。

不要编造盘面数据；如果输入里没有提供某项（如某一层运限、某宫位细节），不要假设。

在判断时间趋势时，要明确区分长期与短期：
- 大限：长期阶段主题
- 流年：年度主线变化
- 流月/流日/流时：短期触发与节奏

结论需要给出1-2条依据点（例如：关键宫位、关键星曜、四化落宫、三方四正呼应/冲突）。

默认输出结构（不必用死板标题）：
1. 直接回答结论（先对准问题）
2. 依据点解释（短而可核对）
3. 建议/行动方案（可执行，区分优先级与时间窗口）
4. 若信息不足：补问最多3个关键问题（可选）

如果用户问“能不能做/何时做更合适”，请给出：倾向（偏好/偏弱/中性）+ 时间窗口（优先给条件与区间，避免硬性绝对断言）。

需要你分析的紫微盘信息如下（我将提供在下方）：`;

function asObject(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object') return null;
	return value as Record<string, unknown>;
}

function toSafeString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	return value;
}

function toDate(value: unknown): Date | null {
	const date = value instanceof Date ? new Date(value.getTime()) : new Date(value as any);
	if (!Number.isFinite(date.getTime())) return null;
	return date;
}

function normalizePalaceName(name: string | null): string | null {
	if (!name) return null;
	return name === '仆役' ? '交友' : name;
}

function normalizeGender(gender: unknown): string | null {
	if (gender === 0 || gender === '0' || gender === '男') return '男';
	if (gender === 1 || gender === '1' || gender === '女') return '女';
	return toSafeString(gender);
}

function normalizeStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const result: string[] = [];
	value.forEach((item) => {
		if (typeof item === 'string') {
			const normalized = toSafeString(item);
			if (normalized) result.push(normalized);
			return;
		}
		const obj = asObject(item);
		const name = toSafeString(obj?.name);
		if (name) result.push(name);
	});
	return result;
}

function normalizeNumberList(value: unknown): number[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => toFiniteNumber(item))
		.filter((item): item is number => typeof item === 'number');
}

function mapStar(star: unknown): ExportStar {
	const obj = asObject(star);
	return {
		name: toSafeString(obj?.name),
		brightness: toSafeString(obj?.brightness),
		mutagen: toSafeString(obj?.mutagen),
	};
}

function mapStarList(stars: unknown): ExportStar[] {
	if (!Array.isArray(stars)) return [];
	return stars.map((star) => mapStar(star));
}

function mapPalace(palace: unknown): ExportPalace {
	const obj = asObject(palace);
	const decadalObj = asObject(obj?.decadal);

	const name = toSafeString(obj?.name);

	return {
		index: toFiniteNumber(obj?.index),
		name,
		displayName: normalizePalaceName(name),
		isBodyPalace: Boolean(obj?.isBodyPalace),
		isOriginalPalace: Boolean(obj?.isOriginalPalace),
		heavenlyStem: toSafeString(obj?.heavenlyStem),
		earthlyBranch: toSafeString(obj?.earthlyBranch),
		changsheng12: toSafeString(obj?.changsheng12),
		boshi12: toSafeString(obj?.boshi12),
		jiangqian12: toSafeString(obj?.jiangqian12),
		suiqian12: toSafeString(obj?.suiqian12),
		decadal: {
			range: normalizeNumberList(decadalObj?.range),
			heavenlyStem: toSafeString(decadalObj?.heavenlyStem),
			earthlyBranch: toSafeString(decadalObj?.earthlyBranch),
		},
		ages: normalizeNumberList(obj?.ages),
		majorStars: mapStarList(obj?.majorStars),
		minorStars: mapStarList(obj?.minorStars),
		adjectiveStars: mapStarList(obj?.adjectiveStars),
	};
}

function mapSurroundedPalaces(surrounded: unknown) {
	const surroundedObj = asObject(surrounded);
	if (!surroundedObj) return null;

	const mapped: Record<string, unknown> = {};
	SURROUND_KEYS.forEach((key) => {
		const palaceObj = asObject(surroundedObj[key]);
		if (!palaceObj) {
			mapped[key] = null;
			return;
		}
		const palaceName = toSafeString(palaceObj.name);
		mapped[key] = {
			index: toFiniteNumber(palaceObj.index),
			name: palaceName,
			displayName: normalizePalaceName(palaceName),
		};
	});

	const haveMutagenFn = surroundedObj.haveMutagen;
	const mutagenFlags =
		typeof haveMutagenFn === 'function'
			? MUTAGEN_NAMES.map((mutagen) => {
					let active = false;
					try {
						active = Boolean((haveMutagenFn as (name: string) => unknown)(mutagen));
					} catch (e) {
						active = false;
					}
					return { mutagen, active };
				})
			: [];
	mapped.mutagenFlags = mutagenFlags;

	return mapped;
}

function mapHoroscopeStarsByPalace(stars: unknown) {
	if (!Array.isArray(stars)) return [];
	const mapped: Array<{ palaceIndex: number; stars: string[] }> = [];
	stars.forEach((item, palaceIndex) => {
		const starNames = normalizeStringList(item);
		if (!starNames.length) return;
		mapped.push({
			palaceIndex,
			stars: starNames,
		});
	});
	return mapped;
}

function mapHoroscopeItem(item: unknown) {
	const obj = asObject(item);
	if (!obj) return null;

	const mapped: Record<string, unknown> = {
		index: toFiniteNumber(obj.index),
		name: toSafeString(obj.name),
		heavenlyStem: toSafeString(obj.heavenlyStem),
		earthlyBranch: toSafeString(obj.earthlyBranch),
		palaceNames: normalizeStringList(obj.palaceNames).map((name) => normalizePalaceName(name) || name),
		mutagen: normalizeStringList(obj.mutagen),
		starsByPalace: mapHoroscopeStarsByPalace(obj.stars),
	};

	const nominalAge = toFiniteNumber(obj.nominalAge);
	if (nominalAge !== null) {
		mapped.nominalAge = nominalAge;
	}

	const yearlyDecStarObj = asObject(obj.yearlyDecStar);
	if (yearlyDecStarObj) {
		mapped.yearlyDecStar = {
			jiangqian12: normalizeStringList(yearlyDecStarObj.jiangqian12),
			suiqian12: normalizeStringList(yearlyDecStarObj.suiqian12),
		};
	}

	return mapped;
}

function mapHoroscopeItemCompact(item: unknown): CompactHoroscopeScope | null {
	const obj = asObject(item);
	if (!obj) return null;

	const compact: CompactHoroscopeScope = {
		i: toFiniteNumber(obj.index),
		hs: toSafeString(obj.heavenlyStem),
		eb: toSafeString(obj.earthlyBranch),
	};

	const mutagen = normalizeStringList(obj.mutagen);
	if (mutagen.length) compact.m = mutagen;

	const starsByPalaceRaw = mapHoroscopeStarsByPalace(obj.stars);
	if (starsByPalaceRaw.length) {
		compact.sp = starsByPalaceRaw.map((item) => ({
			p: item.palaceIndex,
			v: item.stars,
		}));
	}

	const nominalAge = toFiniteNumber(obj.nominalAge);
	if (nominalAge !== null) compact.na = nominalAge;

	const yearlyDecStarObj = asObject(obj.yearlyDecStar);
	if (yearlyDecStarObj) {
		const jiangqian12 = normalizeStringList(yearlyDecStarObj.jiangqian12);
		const suiqian12 = normalizeStringList(yearlyDecStarObj.suiqian12);
		if (jiangqian12.length || suiqian12.length) {
			compact.y12 = {
				j: jiangqian12,
				u: suiqian12,
			};
		}
	}

	return compact;
}

function mapCoreScopePackCompact(horoscopeObj: Record<string, unknown> | null): CompactScopePack | null {
	if (!horoscopeObj) return null;
	return {
		d: mapHoroscopeItemCompact(horoscopeObj.decadal),
		a: mapHoroscopeItemCompact(horoscopeObj.age),
		y: mapHoroscopeItemCompact(horoscopeObj.yearly),
	};
}

function buildCurrentScopeLabel(viewMode: ViewMode, horoscope: unknown): string | null {
	const horoscopeObj = asObject(horoscope);
	if (!horoscopeObj) return null;

	if (viewMode === 'decadal') {
		const decadal = asObject(horoscopeObj.decadal);
		if (!decadal) return null;
		const heavenlyStem = toSafeString(decadal.heavenlyStem);
		const earthlyBranch = toSafeString(decadal.earthlyBranch);
		return heavenlyStem && earthlyBranch ? `${heavenlyStem}${earthlyBranch}大限` : null;
	}
	if (viewMode === 'yearly') {
		const yearly = asObject(horoscopeObj.yearly);
		if (!yearly) return null;
		const heavenlyStem = toSafeString(yearly.heavenlyStem);
		const earthlyBranch = toSafeString(yearly.earthlyBranch);
		return heavenlyStem && earthlyBranch ? `${heavenlyStem}${earthlyBranch}流年` : null;
	}
	if (viewMode === 'monthly') {
		const monthly = asObject(horoscopeObj.monthly);
		if (!monthly) return null;
		const heavenlyStem = toSafeString(monthly.heavenlyStem);
		const earthlyBranch = toSafeString(monthly.earthlyBranch);
		return heavenlyStem && earthlyBranch ? `${heavenlyStem}${earthlyBranch}流月` : null;
	}
	if (viewMode === 'daily') {
		const daily = asObject(horoscopeObj.daily);
		if (!daily) return null;
		const heavenlyStem = toSafeString(daily.heavenlyStem);
		const earthlyBranch = toSafeString(daily.earthlyBranch);
		return heavenlyStem && earthlyBranch ? `${heavenlyStem}${earthlyBranch}流日` : null;
	}
	return null;
}

function resolveHoroscope(astrolabeObj: Record<string, unknown>, storeHoroscope: unknown, targetDate: Date) {
	const horoscopeObj = asObject(storeHoroscope);
	if (horoscopeObj) return horoscopeObj;

	const horoscopeFn = astrolabeObj.horoscope;
	if (typeof horoscopeFn !== 'function') return null;
	try {
		return asObject((horoscopeFn as (date: Date) => unknown)(new Date(targetDate.getTime())));
	} catch (e) {
		return null;
	}
}

function buildFocusData(
	astrolabeObj: Record<string, unknown>,
	horoscopeObj: Record<string, unknown> | null,
	viewMode: ViewMode,
	focusPalaceIndex: number | null,
) {
	if (typeof focusPalaceIndex !== 'number') return null;
	const palacesRaw = astrolabeObj.palaces;
	if (!Array.isArray(palacesRaw)) return null;

	const focusPalace = asObject(palacesRaw[focusPalaceIndex]);
	if (!focusPalace) return null;

	const focusName = toSafeString(focusPalace.name);
	const focusDisplayName = normalizePalaceName(focusName);

	let natalSurrounded = null;
	const surroundedPalacesFn = astrolabeObj.surroundedPalaces;
	if (typeof surroundedPalacesFn === 'function') {
		try {
			natalSurrounded = mapSurroundedPalaces((surroundedPalacesFn as (index: number) => unknown)(focusPalaceIndex));
		} catch (e) {
			natalSurrounded = null;
		}
	}

	let scopeSurrounded = null;
	if (viewMode !== 'origin' && horoscopeObj && focusName) {
		const surroundPalacesFn = horoscopeObj.surroundPalaces;
		if (typeof surroundPalacesFn === 'function') {
			try {
				scopeSurrounded = mapSurroundedPalaces(
					(surroundPalacesFn as (name: string, scope: ViewMode) => unknown)(focusName, viewMode),
				);
			} catch (e) {
				scopeSurrounded = null;
			}
		}
	}

	const fliesToFn = focusPalace.fliesTo;
	const flyMutagens: Array<{ palaceIndex: number; palaceName: string | null; displayName: string | null; mutagens: string[] }> = [];
	if (typeof fliesToFn === 'function') {
		palacesRaw.forEach((palace, index) => {
			const targetPalace = asObject(palace);
			if (!targetPalace) return;
			const mutagens = MUTAGEN_NAMES.filter((mutagen) => {
				try {
					return Boolean((fliesToFn as (to: number, withMutagen: string) => unknown)(index, mutagen));
				} catch (e) {
					return false;
				}
			});
			if (!mutagens.length) return;
			const palaceName = toSafeString(targetPalace.name);
			flyMutagens.push({
				palaceIndex: index,
				palaceName,
				displayName: normalizePalaceName(palaceName),
				mutagens: [...mutagens],
			});
		});
	}

	return {
		palace: {
			index: focusPalaceIndex,
			name: focusName,
			displayName: focusDisplayName,
		},
		surrounded: {
			natal: natalSurrounded,
			scope: scopeSurrounded,
		},
		flyMutagens,
	};
}

function buildDecadalTimeline(palaces: ExportPalace[]): DecadalTimelineItem[] {
	const list = palaces.map((palace) => ({
		palaceIndex: palace.index,
		palaceName: palace.name,
		displayName: palace.displayName,
		heavenlyStem: palace.decadal.heavenlyStem,
		earthlyBranch: palace.decadal.earthlyBranch,
		ganZhi: `${palace.decadal.heavenlyStem || ''}${palace.decadal.earthlyBranch || ''}`,
		range: [...palace.decadal.range],
	}));
	list.sort((a, b) => {
		const aStart = typeof a.range[0] === 'number' ? a.range[0] : Number.MAX_SAFE_INTEGER;
		const bStart = typeof b.range[0] === 'number' ? b.range[0] : Number.MAX_SAFE_INTEGER;
		return aStart - bStart;
	});
	return list;
}

function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function buildDateInYear(year: number, baseDate: Date): Date {
	const month = baseDate.getMonth();
	const day = baseDate.getDate();
	const date = new Date(year, month, day);
	if (date.getMonth() !== month) {
		return new Date(year, month + 1, 0);
	}
	return date;
}

function mapHoroscopeScopes(horoscopeObj: Record<string, unknown> | null): HoroscopeScopesExport | null {
	if (!horoscopeObj) return null;
	return {
		decadal: mapHoroscopeItem(horoscopeObj.decadal),
		age: mapHoroscopeItem(horoscopeObj.age),
		yearly: mapHoroscopeItem(horoscopeObj.yearly),
		monthly: mapHoroscopeItem(horoscopeObj.monthly),
		daily: mapHoroscopeItem(horoscopeObj.daily),
		hourly: mapHoroscopeItem(horoscopeObj.hourly),
	};
}

function createHoroscopeGetter(
	astrolabeObj: Record<string, unknown>,
	seedDate: Date,
	seedHoroscope: Record<string, unknown> | null,
) {
	const cache = new Map<string, Record<string, unknown> | null>();
	cache.set(toDateKey(seedDate), seedHoroscope);

	const horoscopeFn = astrolabeObj.horoscope;
	return (date: Date): Record<string, unknown> | null => {
		const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const key = toDateKey(normalized);
		if (cache.has(key)) {
			return cache.get(key) || null;
		}
		if (typeof horoscopeFn !== 'function') {
			cache.set(key, null);
			return null;
		}
		try {
			const horoscopeObj = asObject((horoscopeFn as (value: Date) => unknown)(new Date(normalized.getTime())));
			cache.set(key, horoscopeObj);
			return horoscopeObj;
		} catch (e) {
			cache.set(key, null);
			return null;
		}
	};
}

function buildAllDecadalCharts(
	decadalTimeline: DecadalTimelineItem[],
	targetDate: Date,
	currentNominalAge: number | null,
	getHoroscopeAt: (date: Date) => Record<string, unknown> | null,
) {
	const currentYear = targetDate.getFullYear();
	return decadalTimeline.map((decadal, idx) => {
		const rangeStart = typeof decadal.range[0] === 'number' ? decadal.range[0] : null;
		let referenceYear: number;
		if (rangeStart !== null && currentNominalAge !== null) {
			referenceYear = currentYear + (rangeStart - currentNominalAge);
		} else {
			referenceYear = currentYear + (idx - Math.floor(decadalTimeline.length / 2)) * 10;
		}

		const referenceDate = buildDateInYear(referenceYear, targetDate);
		const horoscopeObj = getHoroscopeAt(referenceDate);

		return {
			...decadal,
			referenceYear: referenceDate.getFullYear(),
			cs: mapCoreScopePackCompact(horoscopeObj),
		};
	});
}

function buildYearlyRangeCharts(
	targetDate: Date,
	beforeYears: number,
	afterYears: number,
	getHoroscopeAt: (date: Date) => Record<string, unknown> | null,
	minStartYearByDecadal: number | null,
) {
	const currentYear = targetDate.getFullYear();
	const requestedStartYear = currentYear - Math.max(0, Math.floor(beforeYears));
	const startYear =
		typeof minStartYearByDecadal === 'number' && Number.isFinite(minStartYearByDecadal)
			? Math.max(requestedStartYear, minStartYearByDecadal)
			: requestedStartYear;
	const endYear = currentYear + Math.max(0, Math.floor(afterYears));
	const charts: Array<Record<string, unknown>> = [];

	for (let year = startYear; year <= endYear; year += 1) {
		const date = buildDateInYear(year, targetDate);
		const horoscopeObj = getHoroscopeAt(date);
		const yearlyObj = asObject(horoscopeObj?.yearly);
		const heavenlyStem = toSafeString(yearlyObj?.heavenlyStem);
		const earthlyBranch = toSafeString(yearlyObj?.earthlyBranch);

		charts.push({
			y: year,
			c: year === currentYear,
			g: heavenlyStem && earthlyBranch ? `${heavenlyStem}${earthlyBranch}` : null,
			cs: mapCoreScopePackCompact(horoscopeObj),
		});
	}

	return {
		beforeYears: Math.max(0, Math.floor(beforeYears)),
		afterYears: Math.max(0, Math.floor(afterYears)),
		requestedStartYear,
		minStartYearByDecadal,
		startYear,
		endYear,
		totalYears: charts.length,
		charts,
	};
}

export function buildZiweiExportPayload(
	userStore: Store & UserStoreLike,
	ziweiStore: Store & ZiweiStoreLike,
): Record<string, unknown> | null {
	const astrolabeObj = asObject(ziweiStore.astrolabe);
	if (!astrolabeObj) return null;

	const targetDate = toDate(ziweiStore.targetDate) || new Date();
	const horoscopeObj = resolveHoroscope(astrolabeObj, ziweiStore.currentHoroscope, targetDate);

	const palacesRaw = Array.isArray(astrolabeObj.palaces) ? astrolabeObj.palaces : [];
	const palaces = palacesRaw.map((palace) => mapPalace(palace));

	const birthDate =
		typeof userStore.timestamp === 'number' && Number.isFinite(userStore.timestamp)
			? new Date(userStore.timestamp)
			: null;
	const birthSolarISO = birthDate && Number.isFinite(birthDate.getTime()) ? birthDate.toISOString() : null;

	const scopeSelections = {
		decadal: toFiniteNumber(asObject(horoscopeObj?.decadal)?.index),
		age: toFiniteNumber(asObject(horoscopeObj?.age)?.index),
		yearly: toFiniteNumber(asObject(horoscopeObj?.yearly)?.index),
		monthly: toFiniteNumber(asObject(horoscopeObj?.monthly)?.index),
		daily: toFiniteNumber(asObject(horoscopeObj?.daily)?.index),
		hourly: toFiniteNumber(asObject(horoscopeObj?.hourly)?.index),
	};

	const decadalTimeline = buildDecadalTimeline(palaces);
	const currentNominalAge = toFiniteNumber(asObject(horoscopeObj?.age)?.nominalAge);
	const getHoroscopeAt = createHoroscopeGetter(astrolabeObj, targetDate, horoscopeObj);
	const allDecadalCharts = buildAllDecadalCharts(decadalTimeline, targetDate, currentNominalAge, getHoroscopeAt);
	const decadalStartYears = allDecadalCharts
		.map((item) => toFiniteNumber(item.referenceYear))
		.filter((item): item is number => typeof item === 'number');
	const minStartYearByDecadal = decadalStartYears.length ? Math.min(...decadalStartYears) : null;
	const yearlyRangeCharts = buildYearlyRangeCharts(targetDate, 20, 30, getHoroscopeAt, minStartYearByDecadal);

	return {
		meta: {
			exportTime: new Date().toISOString(),
			version: '1.0.0',
			module: 'ziwei',
		},
		prompt: ZIWEI_EXPORT_PROMPT,
		profile: {
			name: (userStore.realname || '').trim() || '佚名',
			gender: normalizeGender(userStore.gender),
			birthTimestamp: userStore.timestamp ?? null,
			birthSolarISO,
		},
		basicChart: {
			gender: toSafeString(astrolabeObj.gender),
			solarDate: toSafeString(astrolabeObj.solarDate),
			lunarDate: toSafeString(astrolabeObj.lunarDate),
			chineseDate: toSafeString(astrolabeObj.chineseDate),
			time: toSafeString(astrolabeObj.time),
			timeRange: toSafeString(astrolabeObj.timeRange),
			sign: toSafeString(astrolabeObj.sign),
			zodiac: toSafeString(astrolabeObj.zodiac),
			earthlyBranchOfSoulPalace: toSafeString(astrolabeObj.earthlyBranchOfSoulPalace),
			earthlyBranchOfBodyPalace: toSafeString(astrolabeObj.earthlyBranchOfBodyPalace),
			soul: toSafeString(astrolabeObj.soul),
			body: toSafeString(astrolabeObj.body),
			fiveElementsClass: toSafeString(astrolabeObj.fiveElementsClass),
			palaceLayout: {
				top: ['巳', '午', '未', '申'],
				left: ['辰', '卯'],
				right: ['酉', '戌'],
				bottom: ['寅', '丑', '子', '亥'],
			},
			palaces,
		},
		newSchoolChart: {
			selection: {
				viewMode: ziweiStore.viewMode,
				targetDateISO: targetDate.toISOString(),
				currentScopeLabel: buildCurrentScopeLabel(ziweiStore.viewMode, horoscopeObj),
			},
			timeline: {
				decadal: decadalTimeline,
				selectedIndices: scopeSelections,
			},
			scopes: mapHoroscopeScopes(horoscopeObj),
			compactFieldMap: {
				cs: 'compactScopes',
				d: 'decadal',
				a: 'age',
				y: 'yearly',
				i: 'index',
				hs: 'heavenlyStem',
				eb: 'earthlyBranch',
				m: 'mutagen',
				sp: 'starsByPalace',
				p: 'palaceIndex',
				v: 'stars',
				na: 'nominalAge',
				y12: 'yearlyDecStar',
				j: 'jiangqian12',
				u: 'suiqian12',
				c: 'isCurrentYear',
				g: 'yearlyGanZhi',
			},
			allDecadalCharts,
			yearlyRangeCharts,
			focus: buildFocusData(astrolabeObj, horoscopeObj, ziweiStore.viewMode, ziweiStore.focusPalaceIndex),
		},
	};
}
