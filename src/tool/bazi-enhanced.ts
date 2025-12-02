/**
 * 增强版八字排盘工具
 * 参考 zydx.top 等专业排盘网站的功能
 * 包含神煞、格局、用神、五行旺衰等分析
 */

import { Solar, Lunar } from 'lunar-javascript';

// 神煞映射表
const SHEN_SHA = {
	// 天乙贵人
	tianyi: {
		'甲': ['丑', '未'],
		'乙': ['子', '申'],
		'丙': ['亥', '酉'],
		'丁': ['亥', '酉'],
		'戊': ['丑', '未'],
		'己': ['子', '申'],
		'庚': ['丑', '未'],
		'辛': ['午', '寅'],
		'壬': ['卯', '巳'],
		'癸': ['卯', '巳']
	},
	// 文昌
	wenchang: {
		'甲': '巳',
		'乙': '午',
		'丙': '申',
		'丁': '酉',
		'戊': '申',
		'己': '酉',
		'庚': '亥',
		'辛': '子',
		'壬': '寅',
		'癸': '卯'
	},
	// 桃花（子午卯酉）
	taohua: ['子', '午', '卯', '酉'],
	// 驿马（申子辰见寅，寅午戌见申，巳酉丑见亥，亥卯未见巳）
	yima: {
		'申': '寅',
		'子': '寅',
		'辰': '寅',
		'寅': '申',
		'午': '申',
		'戌': '申',
		'巳': '亥',
		'酉': '亥',
		'丑': '亥',
		'亥': '巳',
		'卯': '巳',
		'未': '巳'
	}
};

// 格局判断
const GE_JU = {
	// 正官格
	zheng_guan: ['正官'],
	// 偏官格（七杀格）
	pian_guan: ['七杀'],
	// 正财格
	zheng_cai: ['正财'],
	// 偏财格
	pian_cai: ['偏财'],
	// 正印格
	zheng_yin: ['正印'],
	// 偏印格
	pian_yin: ['偏印'],
	// 食神格
	shi_shen: ['食神'],
	// 伤官格
	shang_guan: ['伤官'],
	// 比肩格
	bi_jian: ['比肩'],
	// 劫财格
	jie_cai: ['劫财']
};

// 五行旺衰表（简化版，实际需要根据月令、得地、得势综合判断）
const WUXING_WANGSHUAI = {
	'木': { '春': '旺', '夏': '休', '秋': '死', '冬': '相', '季': '囚' },
	'火': { '春': '相', '夏': '旺', '秋': '囚', '冬': '死', '季': '休' },
	'土': { '春': '死', '夏': '相', '秋': '休', '冬': '囚', '季': '旺' },
	'金': { '春': '囚', '夏': '死', '秋': '旺', '冬': '休', '季': '相' },
	'水': { '春': '休', '夏': '囚', '秋': '相', '冬': '旺', '季': '死' }
};

// 月令季节映射
const YUE_LING_SEASON = {
	1: '冬', 2: '春', 3: '春', 4: '春',
	5: '夏', 6: '夏', 7: '夏', 8: '季',
	9: '秋', 10: '秋', 11: '秋', 12: '冬'
};

export interface BaziEnhancedData {
	// 神煞
	shensha: {
		tianyi?: string[]; // 天乙贵人
		wenchang?: string[]; // 文昌
		taohua?: string[]; // 桃花
		yima?: string[]; // 驿马
		all?: string[]; // 所有神煞汇总
	};
	// 格局
	geju: {
		type?: string; // 格局类型
		description?: string; // 格局描述
	};
	// 五行旺衰
	wuxingWangshuai: {
		[element: string]: string; // 五行 -> 旺衰状态
	};
	// 日主强弱
	rizhuQiangruo: {
		level: string; // 强/中/弱
		description: string; // 描述
	};
	// 用神建议
	yongshen: {
		suggested?: string[]; // 建议用神
		avoid?: string[]; // 忌神
		description?: string; // 用神说明
	};
}

/**
 * 获取天干对应的五行
 */
function getGanWuxing(gan: string): string {
	const map: { [key: string]: string } = {
		'甲': '木', '乙': '木',
		'丙': '火', '丁': '火',
		'戊': '土', '己': '土',
		'庚': '金', '辛': '金',
		'壬': '水', '癸': '水'
	};
	return map[gan] || '';
}

/**
 * 获取地支对应的五行
 */
function getZhiWuxing(zhi: string): string {
	const map: { [key: string]: string } = {
		'子': '水', '亥': '水',
		'寅': '木', '卯': '木',
		'巳': '火', '午': '火',
		'申': '金', '酉': '金',
		'辰': '土', '戌': '土', '丑': '土', '未': '土'
	};
	return map[zhi] || '';
}

/**
 * 根据日干和单个干支计算神煞（用于大运、小运、流月、流时等）
 * @param dayGan 日干
 * @param ganzhi 干支（如"甲子"）
 * @param originalZhiList 原四柱地支数组（可选，用于计算驿马）
 * @returns 神煞数组
 */
export function calculateShenShaForGanZhi(dayGan: string, ganzhi: string, originalZhiList?: string[]): string[] {
	const shenshaList: string[] = [];
	
	if (!ganzhi || ganzhi.length < 2) {
		return shenshaList;
	}
	
	const zhi = ganzhi[1]; // 取地支
	
	// 天乙贵人
	const tianyiMap = SHEN_SHA.tianyi as { [key: string]: string[] };
	if (tianyiMap[dayGan] && tianyiMap[dayGan].includes(zhi)) {
		shenshaList.push(`天乙贵人(${zhi})`);
	}
	
	// 文昌
	const wenchangMap = SHEN_SHA.wenchang as { [key: string]: string };
	if (wenchangMap[dayGan] === zhi) {
		shenshaList.push(`文昌(${zhi})`);
	}
	
	// 桃花
	if (SHEN_SHA.taohua.includes(zhi)) {
		shenshaList.push(`桃花(${zhi})`);
	}
	
	// 驿马（需要看原四柱地支）
	// 驿马规则：申子辰见寅，寅午戌见申，巳酉丑见亥，亥卯未见巳
	if (originalZhiList && originalZhiList.length >= 3) {
		const yimaMap = SHEN_SHA.yima as { [key: string]: string };
		// 检查原四柱地支中是否有对应的地支组合
		for (const originalZhi of originalZhiList) {
			if (yimaMap[originalZhi] === zhi) {
				shenshaList.push(`驿马(${zhi})`);
				break; // 找到一个就够了
			}
		}
	}
	
	return shenshaList;
}

/**
 * 计算神煞
 */
function calculateShenSha(bazi: any): BaziEnhancedData['shensha'] {
	const shensha: BaziEnhancedData['shensha'] = {
		all: []
	};

	const dayGan = bazi.getDayGan();
	const yearZhi = bazi.getYearZhi();
	const monthZhi = bazi.getMonthZhi();
	const dayZhi = bazi.getDayZhi();
	const timeZhi = bazi.getTimeZhi();

	const allZhi = [yearZhi, monthZhi, dayZhi, timeZhi];

	// 天乙贵人
	const tianyiMap = SHEN_SHA.tianyi as { [key: string]: string[] };
	if (tianyiMap[dayGan]) {
		const tianyi = tianyiMap[dayGan].filter((zhi: string) => allZhi.includes(zhi));
		if (tianyi.length > 0) {
			shensha.tianyi = tianyi;
			if (shensha.all) {
				shensha.all.push(...tianyi.map((z: string) => `天乙贵人(${z})`));
			}
		}
	}

	// 文昌
	const wenchangMap = SHEN_SHA.wenchang as { [key: string]: string };
	if (wenchangMap[dayGan] && allZhi.includes(wenchangMap[dayGan])) {
		shensha.wenchang = [wenchangMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`文昌(${wenchangMap[dayGan]})`);
		}
	}

	// 桃花
	const taohua = allZhi.filter((zhi: string) => SHEN_SHA.taohua.includes(zhi));
	if (taohua.length > 0) {
		shensha.taohua = taohua;
		if (shensha.all) {
			shensha.all.push(...taohua.map((z: string) => `桃花(${z})`));
		}
	}

	// 驿马
	const yima: string[] = [];
	const yimaMap = SHEN_SHA.yima as { [key: string]: string };
	allZhi.forEach((zhi: string) => {
		if (yimaMap[zhi] && allZhi.includes(yimaMap[zhi])) {
			yima.push(yimaMap[zhi]);
		}
	});
	if (yima.length > 0) {
		shensha.yima = [...new Set(yima)];
		if (shensha.all) {
			shensha.all.push(...shensha.yima.map((z: string) => `驿马(${z})`));
		}
	}

	return shensha;
}

/**
 * 判断格局（简化版）
 */
function calculateGeJu(bazi: any, shishen: any): BaziEnhancedData['geju'] {
	const geju: BaziEnhancedData['geju'] = {};

	// 获取月柱十神（通常以月柱定格局）
	// shishen.month 可能是字符串（如"正官"）或数组
	let monthShishen = shishen.month;
	if (Array.isArray(monthShishen)) {
		monthShishen = monthShishen.join('');
	}
	const monthShishenStr = String(monthShishen || '');
	
	// 简化判断：如果月柱有正官，可能是正官格
	if (monthShishenStr.includes('正官')) {
		geju.type = '正官格';
		geju.description = '正官格：以正官为用，主贵气，性格端正，有责任感';
	} else if (monthShishenStr.includes('七杀') || monthShishenStr.includes('杀')) {
		geju.type = '七杀格';
		geju.description = '七杀格：以七杀为用，主权威，性格刚强，有魄力';
	} else if (monthShishenStr.includes('正财') || monthShishenStr.includes('财')) {
		geju.type = '正财格';
		geju.description = '正财格：以正财为用，主财富，性格务实，善于理财';
	} else if (monthShishenStr.includes('偏财') || monthShishenStr.includes('才')) {
		geju.type = '偏财格';
		geju.description = '偏财格：以偏财为用，主横财，性格灵活，善于把握机会';
	} else if (monthShishenStr.includes('正印') || monthShishenStr.includes('印')) {
		geju.type = '正印格';
		geju.description = '正印格：以正印为用，主文贵，性格温和，有学识';
	} else if (monthShishenStr.includes('偏印') || monthShishenStr.includes('枭')) {
		geju.type = '偏印格';
		geju.description = '偏印格：以偏印为用，主智慧，性格内向，有独特见解';
	} else if (monthShishenStr.includes('食神') || monthShishenStr.includes('食')) {
		geju.type = '食神格';
		geju.description = '食神格：以食神为用，主才华，性格温和，有艺术天赋';
	} else if (monthShishenStr.includes('伤官') || monthShishenStr.includes('伤')) {
		geju.type = '伤官格';
		geju.description = '伤官格：以伤官为用，主才华，性格张扬，有创造力';
	} else if (monthShishenStr.includes('比肩') || monthShishenStr.includes('比')) {
		geju.type = '比肩格';
		geju.description = '比肩格：以比肩为用，主自立，性格独立，有主见';
	} else if (monthShishenStr.includes('劫财') || monthShishenStr.includes('劫')) {
		geju.type = '劫财格';
		geju.description = '劫财格：以劫财为用，主竞争，性格好胜，有冲劲';
	} else {
		geju.type = '杂格';
		geju.description = '杂格：格局复杂，需要综合分析';
	}

	return geju;
}

/**
 * 计算五行旺衰
 */
function calculateWuxingWangshuai(bazi: any, solar: Solar): BaziEnhancedData['wuxingWangshuai'] {
	const wuxingWangshuai: BaziEnhancedData['wuxingWangshuai'] = {};
	
	const month = solar.getMonth();
	const seasonMap = YUE_LING_SEASON as { [key: number]: string };
	const season = seasonMap[month] || '季';

	// 统计各五行出现次数
	const wuxingCount: { [key: string]: number } = {
		'木': 0, '火': 0, '土': 0, '金': 0, '水': 0
	};

	// 统计天干五行
	const ganList = [bazi.getYearGan(), bazi.getMonthGan(), bazi.getDayGan(), bazi.getTimeGan()];
	ganList.forEach(gan => {
		const wx = getGanWuxing(gan);
		if (wx) wuxingCount[wx]++;
	});

	// 统计地支五行
	const zhiList = [bazi.getYearZhi(), bazi.getMonthZhi(), bazi.getDayZhi(), bazi.getTimeZhi()];
	zhiList.forEach(zhi => {
		const wx = getZhiWuxing(zhi);
		if (wx) wuxingCount[wx]++;
	});

	// 根据月令判断旺衰
	const wangshuaiMap = WUXING_WANGSHUAI as { [key: string]: { [key: string]: string } };
	Object.keys(wuxingCount).forEach(element => {
		const count = wuxingCount[element];
		const wangshuai = wangshuaiMap[element]?.[season] || '囚';
		wuxingWangshuai[element] = `${wangshuai}(${count})`;
	});

	return wuxingWangshuai;
}

/**
 * 判断日主强弱（简化版）
 */
function calculateRizhuQiangruo(bazi: any, wuxingWangshuai: BaziEnhancedData['wuxingWangshuai']): BaziEnhancedData['rizhuQiangruo'] {
	const dayGan = bazi.getDayGan();
	const dayWuxing = getGanWuxing(dayGan);
	const wangshuai = wuxingWangshuai[dayWuxing] || '';

	let level = '中';
	let description = '';

	if (wangshuai.includes('旺')) {
		level = '强';
		description = `日主${dayGan}(${dayWuxing})得令而旺，身强`;
	} else if (wangshuai.includes('相')) {
		level = '中强';
		description = `日主${dayGan}(${dayWuxing})得相，身中强`;
	} else if (wangshuai.includes('休') || wangshuai.includes('囚') || wangshuai.includes('死')) {
		level = '弱';
		description = `日主${dayGan}(${dayWuxing})失令，身弱`;
	} else {
		level = '中';
		description = `日主${dayGan}(${dayWuxing})中和`;
	}

	return { level, description };
}

/**
 * 建议用神（简化版）
 */
function calculateYongShen(rizhuQiangruo: BaziEnhancedData['rizhuQiangruo'], wuxingWangshuai: BaziEnhancedData['wuxingWangshuai']): BaziEnhancedData['yongshen'] {
	const yongshen: BaziEnhancedData['yongshen'] = {
		suggested: [],
		avoid: []
	};

	const level = rizhuQiangruo.level;

	if (level === '强' || level === '中强') {
		// 身强，用克泄耗
		yongshen.description = '身强，宜用克、泄、耗';
		// 简化：建议用财、官、食伤
		yongshen.suggested = ['财', '官', '食伤'];
		yongshen.avoid = ['印', '比劫'];
	} else if (level === '弱') {
		// 身弱，用生扶
		yongshen.description = '身弱，宜用生、扶';
		yongshen.suggested = ['印', '比劫'];
		yongshen.avoid = ['财', '官', '食伤'];
	} else {
		// 中和
		yongshen.description = '身中和，五行平衡为佳';
		yongshen.suggested = ['平衡'];
	}

	return yongshen;
}

/**
 * 增强版八字排盘分析
 * @param bazi 八字对象（来自 lunar-javascript）
 * @param solar 阳历对象
 * @param shishen 十神对象（包含年月日时的十神）
 */
export function enhanceBaziAnalysis(bazi: any, solar: Solar, shishen: any): BaziEnhancedData {
	const result: BaziEnhancedData = {
		shensha: calculateShenSha(bazi),
		geju: calculateGeJu(bazi, shishen),
		wuxingWangshuai: calculateWuxingWangshuai(bazi, solar),
		rizhuQiangruo: { level: '', description: '' },
		yongshen: {}
	};

	result.rizhuQiangruo = calculateRizhuQiangruo(bazi, result.wuxingWangshuai);
	result.yongshen = calculateYongShen(result.rizhuQiangruo, result.wuxingWangshuai);

	return result;
}

/**
 * 天干地支关系接口
 */
export interface GanZhiRelation {
	// 天干合化
	ganHe?: string; // 如 "甲己合化土"
	// 地支六合
	zhiLiuHe?: string; // 如 "子丑合"
	// 地支三合
	zhiSanHe?: string; // 如 "申子辰合水"
	// 地支三会
	zhiSanHui?: string; // 如 "寅卯辰会木"
	// 地支六冲
	zhiLiuChong?: string[]; // 如 ["子午冲"]
	// 地支相刑
	zhiXing?: string[]; // 如 ["子卯刑"]
	// 地支相害
	zhiHai?: string[]; // 如 ["子未害"]
	// 五行生克关系
	wuxingShengKe?: string[]; // 如 ["金生水", "木克土"]
}

/**
 * 天干合化映射
 */
const GAN_HE_MAP: { [key: string]: string } = {
	'甲己': '土',
	'乙庚': '金',
	'丙辛': '水',
	'丁壬': '木',
	'戊癸': '火'
};

/**
 * 地支六合映射
 */
const ZHI_LIU_HE_MAP: { [key: string]: boolean } = {
	'子丑': true,
	'寅亥': true,
	'卯戌': true,
	'辰酉': true,
	'巳申': true,
	'午未': true
};

/**
 * 地支三合映射
 */
const ZHI_SAN_HE_MAP: { [key: string]: string } = {
	'申子辰': '水',
	'寅午戌': '火',
	'巳酉丑': '金',
	'亥卯未': '木'
};

/**
 * 地支三会映射
 */
const ZHI_SAN_HUI_MAP: { [key: string]: string } = {
	'寅卯辰': '木',
	'巳午未': '火',
	'申酉戌': '金',
	'亥子丑': '水'
};

/**
 * 地支六冲映射
 */
const ZHI_LIU_CHONG_MAP: { [key: string]: string } = {
	'子': '午',
	'午': '子',
	'丑': '未',
	'未': '丑',
	'寅': '申',
	'申': '寅',
	'卯': '酉',
	'酉': '卯',
	'辰': '戌',
	'戌': '辰',
	'巳': '亥',
	'亥': '巳'
};

/**
 * 地支相刑映射
 */
const ZHI_XING_MAP: { [key: string]: string[] } = {
	'子': ['卯'],
	'卯': ['子'],
	'寅': ['巳', '申'],
	'巳': ['寅', '申'],
	'申': ['寅', '巳'],
	'丑': ['未', '戌'],
	'未': ['丑', '戌'],
	'戌': ['丑', '未'],
	'辰': ['辰'], // 自刑
	'午': ['午'], // 自刑
	'酉': ['酉'], // 自刑
	'亥': ['亥']  // 自刑
};

/**
 * 地支相害映射
 */
const ZHI_HAI_MAP: { [key: string]: string } = {
	'子': '未',
	'未': '子',
	'丑': '午',
	'午': '丑',
	'寅': '巳',
	'巳': '寅',
	'卯': '辰',
	'辰': '卯',
	'申': '亥',
	'亥': '申',
	'酉': '戌',
	'戌': '酉'
};

/**
 * 五行生克映射
 */
const WUXING_SHENG: { [key: string]: string } = {
	'金': '水',
	'水': '木',
	'木': '火',
	'火': '土',
	'土': '金'
};

const WUXING_KE: { [key: string]: string } = {
	'金': '木',
	'木': '土',
	'土': '水',
	'水': '火',
	'火': '金'
};

/**
 * 检查天干合化
 */
function checkGanHe(gan1: string, gan2: string): string | null {
	const key1 = gan1 + gan2;
	const key2 = gan2 + gan1;
	if (GAN_HE_MAP[key1]) {
		return `${gan1}${gan2}合化${GAN_HE_MAP[key1]}`;
	}
	if (GAN_HE_MAP[key2]) {
		return `${gan2}${gan1}合化${GAN_HE_MAP[key2]}`;
	}
	return null;
}

/**
 * 检查地支六合
 */
function checkZhiLiuHe(zhi1: string, zhi2: string): string | null {
	const key1 = zhi1 + zhi2;
	const key2 = zhi2 + zhi1;
	if (ZHI_LIU_HE_MAP[key1] || ZHI_LIU_HE_MAP[key2]) {
		return `${zhi1}${zhi2}合`;
	}
	return null;
}

/**
 * 检查地支三合
 */
function checkZhiSanHe(zhis: string[]): string | null {
	if (zhis.length < 3) return null;
	
	const sorted = [...zhis].sort().join('');
	for (const [pattern, wuxing] of Object.entries(ZHI_SAN_HE_MAP)) {
		const patternSorted = pattern.split('').sort().join('');
		if (sorted === patternSorted) {
			return `${pattern}合${wuxing}`;
		}
	}
	return null;
}

/**
 * 检查地支三会
 */
function checkZhiSanHui(zhis: string[]): string | null {
	if (zhis.length < 3) return null;
	
	const sorted = [...zhis].sort().join('');
	for (const [pattern, wuxing] of Object.entries(ZHI_SAN_HUI_MAP)) {
		const patternSorted = pattern.split('').sort().join('');
		if (sorted === patternSorted) {
			return `${pattern}会${wuxing}`;
		}
	}
	return null;
}

/**
 * 检查地支六冲
 */
function checkZhiLiuChong(zhi1: string, zhi2: string): boolean {
	return ZHI_LIU_CHONG_MAP[zhi1] === zhi2 || ZHI_LIU_CHONG_MAP[zhi2] === zhi1;
}

/**
 * 检查地支相刑
 */
function checkZhiXing(zhi1: string, zhi2: string): boolean {
	const xingList = ZHI_XING_MAP[zhi1];
	if (!xingList) return false;
	return xingList.includes(zhi2);
}

/**
 * 检查地支相害
 */
function checkZhiHai(zhi1: string, zhi2: string): boolean {
	return ZHI_HAI_MAP[zhi1] === zhi2 || ZHI_HAI_MAP[zhi2] === zhi1;
}

/**
 * 计算五行生克关系
 */
function getWuxingShengKe(wx1: string, wx2: string): string[] {
	const relations: string[] = [];
	
	if (WUXING_SHENG[wx1] === wx2) {
		relations.push(`${wx1}生${wx2}`);
	}
	if (WUXING_SHENG[wx2] === wx1) {
		relations.push(`${wx2}生${wx1}`);
	}
	if (WUXING_KE[wx1] === wx2) {
		relations.push(`${wx1}克${wx2}`);
	}
	if (WUXING_KE[wx2] === wx1) {
		relations.push(`${wx2}克${wx1}`);
	}
	
	return relations;
}

/**
 * 计算大运/流年/流月/流日与原局的关系
 * @param ganzhi 大运/流年/流月/流日的干支（如"甲子"）
 * @param originalGanZhi 原局四柱的干支数组（如["甲子", "乙丑", "丙寅", "丁卯"]）
 * @returns 关系数组
 */
export function calculateGanZhiRelations(ganzhi: string, originalGanZhi: string[]): GanZhiRelation {
	const relations: GanZhiRelation = {
		wuxingShengKe: [],
		zhiLiuChong: [],
		zhiXing: [],
		zhiHai: []
	};
	
	if (!ganzhi || ganzhi.length < 2) {
		return relations;
	}
	
	const gan = ganzhi[0];
	const zhi = ganzhi[1];
	const ganWx = getGanWuxing(gan);
	const zhiWx = getZhiWuxing(zhi);
	
	// 遍历原局四柱
	for (const origGanZhi of originalGanZhi) {
		if (!origGanZhi || origGanZhi.length < 2) continue;
		
		const origGan = origGanZhi[0];
		const origZhi = origGanZhi[1];
		const origGanWx = getGanWuxing(origGan);
		const origZhiWx = getZhiWuxing(origZhi);
		
		// 检查天干合化
		const ganHe = checkGanHe(gan, origGan);
		if (ganHe && !relations.ganHe) {
			relations.ganHe = ganHe;
		}
		
		// 检查地支六合
		const zhiLiuHe = checkZhiLiuHe(zhi, origZhi);
		if (zhiLiuHe && !relations.zhiLiuHe) {
			relations.zhiLiuHe = zhiLiuHe;
		}
		
		// 检查地支六冲
		if (checkZhiLiuChong(zhi, origZhi)) {
			const chong = `${zhi}${origZhi}冲`;
			if (!relations.zhiLiuChong?.includes(chong)) {
				if (!relations.zhiLiuChong) relations.zhiLiuChong = [];
				relations.zhiLiuChong.push(chong);
			}
		}
		
		// 检查地支相刑
		if (checkZhiXing(zhi, origZhi)) {
			const xing = `${zhi}${origZhi}刑`;
			if (!relations.zhiXing?.includes(xing)) {
				if (!relations.zhiXing) relations.zhiXing = [];
				relations.zhiXing.push(xing);
			}
		}
		
		// 检查地支相害
		if (checkZhiHai(zhi, origZhi)) {
			const hai = `${zhi}${origZhi}害`;
			if (!relations.zhiHai?.includes(hai)) {
				if (!relations.zhiHai) relations.zhiHai = [];
				relations.zhiHai.push(hai);
			}
		}
		
		// 检查五行生克（天干）
		if (ganWx && origGanWx) {
			const shengKe = getWuxingShengKe(ganWx, origGanWx);
			shengKe.forEach(rel => {
				if (!relations.wuxingShengKe?.includes(rel)) {
					if (!relations.wuxingShengKe) relations.wuxingShengKe = [];
					relations.wuxingShengKe.push(rel);
				}
			});
		}
		
		// 检查五行生克（地支）
		if (zhiWx && origZhiWx) {
			const shengKe = getWuxingShengKe(zhiWx, origZhiWx);
			shengKe.forEach(rel => {
				if (!relations.wuxingShengKe?.includes(rel)) {
					if (!relations.wuxingShengKe) relations.wuxingShengKe = [];
					relations.wuxingShengKe.push(rel);
				}
			});
		}
	}
	
	// 检查三合、三会（需要收集所有地支）
	const allZhis = [zhi];
	originalGanZhi.forEach(origGanZhi => {
		if (origGanZhi && origGanZhi.length >= 2) {
			allZhis.push(origGanZhi[1]);
		}
	});
	
	// 检查三合（需要3个地支）
	if (allZhis.length >= 3) {
		// 尝试所有组合
		for (let i = 0; i < allZhis.length - 2; i++) {
			for (let j = i + 1; j < allZhis.length - 1; j++) {
				for (let k = j + 1; k < allZhis.length; k++) {
					const sanHe = checkZhiSanHe([allZhis[i], allZhis[j], allZhis[k]]);
					if (sanHe && !relations.zhiSanHe) {
						relations.zhiSanHe = sanHe;
					}
					const sanHui = checkZhiSanHui([allZhis[i], allZhis[j], allZhis[k]]);
					if (sanHui && !relations.zhiSanHui) {
						relations.zhiSanHui = sanHui;
					}
				}
			}
		}
	}
	
	return relations;
}

/**
 * 地支藏干映射表（固定）
 */
const ZHI_HIDE_GAN_MAP: { [key: string]: string[] } = {
	'子': ['癸'],
	'丑': ['己', '癸', '辛'],
	'寅': ['甲', '丙', '戊'],
	'卯': ['乙'],
	'辰': ['戊', '乙', '癸'],
	'巳': ['丙', '戊', '庚'],
	'午': ['丁', '己'],
	'未': ['己', '丁', '乙'],
	'申': ['庚', '壬', '戊'],
	'酉': ['辛'],
	'戌': ['戊', '辛', '丁'],
	'亥': ['壬', '甲']
};

/**
 * 日干十二长生表（根据日干和地支计算地势）
 * 格式：{ 日干: { 地支: 地势 } }
 */
const GAN_DISHI_MAP: { [key: string]: { [key: string]: string } } = {
	'甲': { '亥': '长生', '子': '沐浴', '丑': '冠带', '寅': '临官', '卯': '帝旺', '辰': '衰', '巳': '病', '午': '死', '未': '墓', '申': '绝', '酉': '胎', '戌': '养' },
	'乙': { '午': '长生', '巳': '沐浴', '辰': '冠带', '卯': '临官', '寅': '帝旺', '丑': '衰', '子': '病', '亥': '死', '戌': '墓', '酉': '绝', '申': '胎', '未': '养' },
	'丙': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
	'丁': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
	'戊': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
	'己': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
	'庚': { '巳': '长生', '午': '沐浴', '未': '冠带', '申': '临官', '酉': '帝旺', '戌': '衰', '亥': '病', '子': '死', '丑': '墓', '寅': '绝', '卯': '胎', '辰': '养' },
	'辛': { '子': '长生', '亥': '沐浴', '戌': '冠带', '酉': '临官', '申': '帝旺', '未': '衰', '午': '病', '巳': '死', '辰': '墓', '卯': '绝', '寅': '胎', '丑': '养' },
	'壬': { '申': '长生', '酉': '沐浴', '戌': '冠带', '亥': '临官', '子': '帝旺', '丑': '衰', '寅': '病', '卯': '死', '辰': '墓', '巳': '绝', '午': '胎', '未': '养' },
	'癸': { '卯': '长生', '寅': '沐浴', '丑': '冠带', '子': '临官', '亥': '帝旺', '戌': '衰', '酉': '病', '申': '死', '未': '墓', '午': '绝', '巳': '胎', '辰': '养' }
};

/**
 * 根据干支获取藏干（用于大运、小运、流月、流日）
 * @param ganzhi 干支（如"甲子"）
 * @returns 藏干数组
 */
export function getHideGanForGanZhi(ganzhi: string): string[] {
	if (!ganzhi || ganzhi.length < 2) {
		return [];
	}
	const zhi = ganzhi[1];
	return ZHI_HIDE_GAN_MAP[zhi] || [];
}

/**
 * 根据日干和地支获取副星（十神，用于大运、小运、流月、流日）
 * 副星是地支藏干的十神数组
 * @param dayGan 日干
 * @param zhi 地支
 * @param dizhiMap 地支十神映射表（从 config.ts 导入）
 * @param tianganMap 天干十神映射表（从 config.ts 导入）
 * @returns 副星数组（字符串数组，包含所有藏干的十神）
 */
export function getFuXingForGanZhi(dayGan: string, zhi: string, dizhiMap: any, tianganMap: any): string[] {
	if (!dayGan || !zhi || !dizhiMap || !tianganMap) {
		return [];
	}
	
	const hideGans = getHideGanForGanZhi('X' + zhi);
	const fuXing: string[] = [];
	
	// 副星是地支藏干的十神，需要根据日干和每个藏干计算十神
	// 遍历每个藏干，计算其十神
	for (const hideGan of hideGans) {
		if (tianganMap[dayGan] && tianganMap[dayGan][hideGan]) {
			fuXing.push(tianganMap[dayGan][hideGan]);
		}
	}
	
	return fuXing;
}

/**
 * 根据日干和地支获取地势（星运，用于大运、小运、流月、流日）
 * @param dayGan 日干
 * @param zhi 地支
 * @returns 地势字符串
 */
export function getDiShiForGanZhi(dayGan: string, zhi: string): string {
	if (!dayGan || !zhi) {
		return '';
	}
	if (GAN_DISHI_MAP[dayGan] && GAN_DISHI_MAP[dayGan][zhi]) {
		return GAN_DISHI_MAP[dayGan][zhi];
	}
	return '';
}

export default {
	enhanceBaziAnalysis,
	calculateShenSha,
	calculateShenShaForGanZhi,
	calculateGeJu,
	calculateWuxingWangshuai,
	calculateRizhuQiangruo,
	calculateYongShen,
	calculateGanZhiRelations,
	getHideGanForGanZhi,
	getFuXingForGanZhi,
	getDiShiForGanZhi
};

