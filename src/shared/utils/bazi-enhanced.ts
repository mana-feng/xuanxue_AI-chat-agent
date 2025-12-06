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
	},
	// 天德贵人（根据月支）
	tiande: {
		'寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
		'午': '亥', '未': '甲', '申': '癸', '酉': '寅',
		'戌': '丙', '亥': '乙', '子': '己', '丑': '庚'
	},
	// 月德贵人（根据月支）
	yuede: {
		'寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚',
		'午': '丙', '未': '甲', '申': '壬', '酉': '庚',
		'戌': '丙', '亥': '甲', '子': '壬', '丑': '庚'
	},
	// 太极贵人（根据日干）
	taiji: {
		'甲': ['子', '午'],
		'乙': ['子', '午'],
		'丙': ['卯', '酉'],
		'丁': ['卯', '酉'],
		'戊': ['辰', '戌', '丑', '未'],
		'己': ['辰', '戌', '丑', '未'],
		'庚': ['寅', '申'],
		'辛': ['寅', '申'],
		'壬': ['巳', '亥'],
		'癸': ['巳', '亥']
	},
	// 福星贵人（根据日干）
	fuxing: {
		'甲': '丙',
		'乙': '丁',
		'丙': '戊',
		'丁': '己',
		'戊': '庚',
		'己': '辛',
		'庚': '壬',
		'辛': '癸',
		'壬': '甲',
		'癸': '乙'
	},
	// 国印贵人（根据日干）
	guoyin: {
		'甲': '戌',
		'乙': '亥',
		'丙': '丑',
		'丁': '寅',
		'戊': '丑',
		'己': '寅',
		'庚': '辰',
		'辛': '巳',
		'壬': '未',
		'癸': '申'
	},
	// 学堂（根据日干）
	xuetang: {
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
	// 词馆（根据日干）
	ciguan: {
		'甲': '寅',
		'乙': '卯',
		'丙': '巳',
		'丁': '午',
		'戊': '巳',
		'己': '午',
		'庚': '申',
		'辛': '酉',
		'壬': '亥',
		'癸': '子'
	},
	// 金舆（根据日干）
	jinyu: {
		'甲': '辰',
		'乙': '巳',
		'丙': '未',
		'丁': '申',
		'戊': '未',
		'己': '申',
		'庚': '戌',
		'辛': '亥',
		'壬': '丑',
		'癸': '寅'
	},
	// 禄神（根据日干）
	lushen: {
		'甲': '寅',
		'乙': '卯',
		'丙': '巳',
		'丁': '午',
		'戊': '巳',
		'己': '午',
		'庚': '申',
		'辛': '酉',
		'壬': '亥',
		'癸': '子'
	},
	// 羊刃（根据日干）
	yangren: {
		'甲': '卯',
		'乙': '寅',
		'丙': '午',
		'丁': '巳',
		'戊': '午',
		'己': '巳',
		'庚': '酉',
		'辛': '申',
		'壬': '子',
		'癸': '亥'
	},
	// 红鸾（根据年支）
	hongluan: {
		'子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
		'辰': '亥', '巳': '戌', '午': '酉', '未': '申',
		'申': '未', '酉': '午', '戌': '巳', '亥': '辰'
	},
	// 天喜（根据年支，与红鸾相冲）
	tianxi: {
		'子': '酉', '丑': '申', '寅': '未', '卯': '午',
		'辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
		'申': '丑', '酉': '子', '戌': '亥', '亥': '戌'
	},
	// 华盖（根据年支）
	huagai: {
		'子': '辰', '丑': '丑', '寅': '戌', '卯': '未',
		'辰': '辰', '巳': '丑', '午': '戌', '未': '未',
		'申': '辰', '酉': '丑', '戌': '戌', '亥': '未'
	},
	// 将星（根据年支）
	jiangxing: {
		'子': '子', '丑': '酉', '寅': '午', '卯': '卯',
		'辰': '子', '巳': '酉', '午': '午', '未': '卯',
		'申': '子', '酉': '酉', '戌': '午', '亥': '卯'
	},
	// 魁罡（根据日柱干支）
	kuigang: ['庚戌', '庚辰', '戊戌', '壬辰'],
	// 天医（根据月支）
	tianyi_medical: {
		'子': '亥', '丑': '子', '寅': '丑', '卯': '寅',
		'辰': '卯', '巳': '辰', '午': '巳', '未': '午',
		'申': '未', '酉': '申', '戌': '酉', '亥': '戌'
	},
	// 天赦（根据日柱）
	tianshe: {
		'春': ['戊寅'], // 春戊寅
		'夏': ['甲午'], // 夏甲午
		'秋': ['戊申'], // 秋戊申
		'冬': ['甲子']  // 冬甲子
	},
	// 天德合（根据月支，天德贵人的合干）
	tiandehe: {
		'寅': '壬', '卯': '己', '辰': '丁', '巳': '丙',
		'午': '甲', '未': '己', '申': '戊', '酉': '丁',
		'戌': '辛', '亥': '庚', '子': '甲', '丑': '乙'
	},
	// 月德合（根据月支，月德贵人的合干）
	yuedehe: {
		'寅': '辛', '卯': '己', '辰': '丁', '巳': '乙',
		'午': '辛', '未': '己', '申': '丁', '酉': '乙',
		'戌': '辛', '亥': '己', '子': '丁', '丑': '乙'
	},
	// 孤辰（根据年支）
	guchen: {
		'子': '寅', '丑': '寅', '寅': '巳', '卯': '巳',
		'辰': '巳', '巳': '申', '午': '申', '未': '申',
		'申': '亥', '酉': '亥', '戌': '亥', '亥': '寅'
	},
	// 寡宿（根据年支）
	guasu: {
		'子': '戌', '丑': '戌', '寅': '丑', '卯': '丑',
		'辰': '丑', '巳': '辰', '午': '辰', '未': '辰',
		'申': '未', '酉': '未', '戌': '未', '亥': '戌'
	},
	// 空亡（根据日柱，甲子旬中戌亥空，甲戌旬中申酉空等）
	kongwang: {
		'甲子': ['戌', '亥'], '甲戌': ['申', '酉'], '甲申': ['午', '未'],
		'甲午': ['辰', '巳'], '甲辰': ['寅', '卯'], '甲寅': ['子', '丑']
	},
	// 金神（根据日干和时支，乙丑、己巳、癸酉日见巳午未时）
	jinshen: {
		'乙': ['巳', '午', '未'],
		'己': ['巳', '午', '未'],
		'癸': ['巳', '午', '未']
	},
	// 日德（根据日干，甲寅、戊辰、丙辰、壬戌、庚辰）
	ride: ['甲寅', '戊辰', '丙辰', '壬戌', '庚辰'],
	// 日贵（根据日干，丁酉、丁亥、癸巳、癸卯）
	rigui: ['丁酉', '丁亥', '癸巳', '癸卯']
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
		tiande?: string[]; // 天德贵人
		yuede?: string[]; // 月德贵人
		taiji?: string[]; // 太极贵人
		fuxing?: string[]; // 福星贵人
		guoyin?: string[]; // 国印贵人
		xuetang?: string[]; // 学堂
		ciguan?: string[]; // 词馆
		jinyu?: string[]; // 金舆
		lushen?: string[]; // 禄神
		yangren?: string[]; // 羊刃
		hongluan?: string[]; // 红鸾
		tianxi?: string[]; // 天喜
		huagai?: string[]; // 华盖
		jiangxing?: string[]; // 将星
		kuigang?: boolean; // 魁罡
		tianyi_medical?: string[]; // 天医
		tianshe?: boolean; // 天赦
		tiandehe?: string[]; // 天德合
		yuedehe?: string[]; // 月德合
		guchen?: string[]; // 孤辰
		guasu?: string[]; // 寡宿
		kongwang?: string[]; // 空亡
		jinshen?: string[]; // 金神
		ride?: boolean; // 日德
		rigui?: boolean; // 日贵
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
	// 天干地支关系
	ganzhiRelations?: {
		sanHe?: string[]; // 三合，如 ["申子辰合水"]
		sanXing?: string[]; // 三刑，如 ["子卯刑", "寅巳申刑"]
		sanHui?: string[]; // 三会，如 ["寅卯辰会木"]
		ganHe?: string[]; // 天干合化，如 ["甲己合化土"]
		zhiHe?: string[]; // 地支六合，如 ["子丑合"]
		chong?: string[]; // 冲，如 ["子午冲"]
		hai?: string[]; // 害，如 ["子未害"]
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
 * 根据日干和单个干支计算神煞（用于大运、流年、流月、流时等）
 * @param dayGan 日干
 * @param ganzhi 干支（如"甲子"）
 * @param originalZhiList 原四柱地支数组（可选，用于计算驿马）
 * @param yearZhi 年支（可选，用于计算红鸾、天喜、华盖、将星）
 * @param monthZhi 月支（可选，用于计算天德贵人、月德贵人）
 * @returns 神煞数组
 */
export function calculateShenShaForGanZhi(dayGan: string, ganzhi: string, originalZhiList?: string[], yearZhi?: string, monthZhi?: string): string[] {
	const shenshaList: string[] = [];
	
	if (!ganzhi || ganzhi.length < 2) {
		return shenshaList;
	}
	
	const gan = ganzhi[0]; // 取天干
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
	
	// 天德贵人（根据月支）
	if (monthZhi) {
		const tiandeMap = SHEN_SHA.tiande as { [key: string]: string };
		if (tiandeMap[monthZhi] === gan) {
			shenshaList.push(`天德贵人(${gan})`);
		}
	}
	
	// 月德贵人（根据月支）
	if (monthZhi) {
		const yuedeMap = SHEN_SHA.yuede as { [key: string]: string };
		if (yuedeMap[monthZhi] === gan) {
			shenshaList.push(`月德贵人(${gan})`);
		}
	}
	
	// 太极贵人（根据日干）
	const taijiMap = SHEN_SHA.taiji as { [key: string]: string[] };
	if (taijiMap[dayGan] && taijiMap[dayGan].includes(zhi)) {
		shenshaList.push(`太极贵人(${zhi})`);
	}
	
	// 福星贵人（根据日干，检查天干）
	const fuxingMap = SHEN_SHA.fuxing as { [key: string]: string };
	if (fuxingMap[dayGan] === gan) {
		shenshaList.push(`福星贵人(${gan})`);
	}
	
	// 国印贵人（根据日干）
	const guoyinMap = SHEN_SHA.guoyin as { [key: string]: string };
	if (guoyinMap[dayGan] === zhi) {
		shenshaList.push(`国印贵人(${zhi})`);
	}
	
	// 学堂（根据日干）
	const xuetangMap = SHEN_SHA.xuetang as { [key: string]: string };
	if (xuetangMap[dayGan] === zhi) {
		shenshaList.push(`学堂(${zhi})`);
	}
	
	// 词馆（根据日干）
	const ciguanMap = SHEN_SHA.ciguan as { [key: string]: string };
	if (ciguanMap[dayGan] === zhi) {
		shenshaList.push(`词馆(${zhi})`);
	}
	
	// 金舆（根据日干）
	const jinyuMap = SHEN_SHA.jinyu as { [key: string]: string };
	if (jinyuMap[dayGan] === zhi) {
		shenshaList.push(`金舆(${zhi})`);
	}
	
	// 禄神（根据日干）
	const lushenMap = SHEN_SHA.lushen as { [key: string]: string };
	if (lushenMap[dayGan] === zhi) {
		shenshaList.push(`禄神(${zhi})`);
	}
	
	// 羊刃（根据日干）
	const yangrenMap = SHEN_SHA.yangren as { [key: string]: string };
	if (yangrenMap[dayGan] === zhi) {
		shenshaList.push(`羊刃(${zhi})`);
	}
	
	// 红鸾（根据年支）
	if (yearZhi) {
		const hongluanMap = SHEN_SHA.hongluan as { [key: string]: string };
		if (hongluanMap[yearZhi] === zhi) {
			shenshaList.push(`红鸾(${zhi})`);
		}
	}
	
	// 天喜（根据年支）
	if (yearZhi) {
		const tianxiMap = SHEN_SHA.tianxi as { [key: string]: string };
		if (tianxiMap[yearZhi] === zhi) {
			shenshaList.push(`天喜(${zhi})`);
		}
	}
	
	// 华盖（根据年支）
	if (yearZhi) {
		const huagaiMap = SHEN_SHA.huagai as { [key: string]: string };
		if (huagaiMap[yearZhi] === zhi) {
			shenshaList.push(`华盖(${zhi})`);
		}
	}
	
	// 将星（根据年支）
	if (yearZhi) {
		const jiangxingMap = SHEN_SHA.jiangxing as { [key: string]: string };
		if (jiangxingMap[yearZhi] === zhi) {
			shenshaList.push(`将星(${zhi})`);
		}
	}
	
	// 魁罡（根据日柱干支）
	const kuigangList = SHEN_SHA.kuigang as string[];
	if (kuigangList.includes(ganzhi)) {
		shenshaList.push(`魁罡(${ganzhi})`);
	}
	
	// 天医（根据月支）
	if (monthZhi) {
		const tianyiMedicalMap = SHEN_SHA.tianyi_medical as { [key: string]: string };
		if (tianyiMedicalMap[monthZhi] === zhi) {
			shenshaList.push(`天医(${zhi})`);
		}
	}
	
	// 天德合（根据月支）
	if (monthZhi) {
		const tiandeheMap = SHEN_SHA.tiandehe as { [key: string]: string };
		if (tiandeheMap[monthZhi] === gan) {
			shenshaList.push(`天德合(${gan})`);
		}
	}
	
	// 月德合（根据月支）
	if (monthZhi) {
		const yuedeheMap = SHEN_SHA.yuedehe as { [key: string]: string };
		if (yuedeheMap[monthZhi] === gan) {
			shenshaList.push(`月德合(${gan})`);
		}
	}
	
	// 孤辰（根据年支）
	if (yearZhi) {
		const guchenMap = SHEN_SHA.guchen as { [key: string]: string };
		if (guchenMap[yearZhi] === zhi) {
			shenshaList.push(`孤辰(${zhi})`);
		}
	}
	
	// 寡宿（根据年支）
	if (yearZhi) {
		const guasuMap = SHEN_SHA.guasu as { [key: string]: string };
		if (guasuMap[yearZhi] === zhi) {
			shenshaList.push(`寡宿(${zhi})`);
		}
	}
	
	// 空亡（根据日柱，需要传入日柱干支）
	// 注意：空亡的计算需要日柱，这里暂时跳过，在 calculateShenSha 中处理
	
	// 金神（根据日干和时支，需要传入时支）
	// 注意：金神的计算需要时支，这里暂时跳过，在 calculateShenSha 中处理
	
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
	const yearGan = bazi.getYearGan();
	const monthGan = bazi.getMonthGan();
	const yearZhi = bazi.getYearZhi();
	const monthZhi = bazi.getMonthZhi();
	const dayZhi = bazi.getDayZhi();
	const timeZhi = bazi.getTimeZhi();
	const dayGanZhi = bazi.getDayGan() + bazi.getDayZhi();

	const allZhi = [yearZhi, monthZhi, dayZhi, timeZhi];
	const allGan = [yearGan, monthGan, dayGan, bazi.getTimeGan()];

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

	// 天德贵人（根据月支）
	const tiandeMap = SHEN_SHA.tiande as { [key: string]: string };
	if (tiandeMap[monthZhi]) {
		const tiandeGan = tiandeMap[monthZhi];
		if (allGan.includes(tiandeGan)) {
			shensha.tiande = [tiandeGan];
			if (shensha.all) {
				shensha.all.push(`天德贵人(${tiandeGan})`);
			}
		}
	}

	// 月德贵人（根据月支）
	const yuedeMap = SHEN_SHA.yuede as { [key: string]: string };
	if (yuedeMap[monthZhi]) {
		const yuedeGan = yuedeMap[monthZhi];
		if (allGan.includes(yuedeGan)) {
			shensha.yuede = [yuedeGan];
			if (shensha.all) {
				shensha.all.push(`月德贵人(${yuedeGan})`);
			}
		}
	}

	// 太极贵人（根据日干）
	const taijiMap = SHEN_SHA.taiji as { [key: string]: string[] };
	if (taijiMap[dayGan]) {
		const taiji = taijiMap[dayGan].filter((zhi: string) => allZhi.includes(zhi));
		if (taiji.length > 0) {
			shensha.taiji = taiji;
			if (shensha.all) {
				shensha.all.push(...taiji.map((z: string) => `太极贵人(${z})`));
			}
		}
	}

	// 福星贵人（根据日干）
	const fuxingMap = SHEN_SHA.fuxing as { [key: string]: string };
	if (fuxingMap[dayGan] && allGan.includes(fuxingMap[dayGan])) {
		shensha.fuxing = [fuxingMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`福星贵人(${fuxingMap[dayGan]})`);
		}
	}

	// 国印贵人（根据日干）
	const guoyinMap = SHEN_SHA.guoyin as { [key: string]: string };
	if (guoyinMap[dayGan] && allZhi.includes(guoyinMap[dayGan])) {
		shensha.guoyin = [guoyinMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`国印贵人(${guoyinMap[dayGan]})`);
		}
	}

	// 学堂（根据日干）
	const xuetangMap = SHEN_SHA.xuetang as { [key: string]: string };
	if (xuetangMap[dayGan] && allZhi.includes(xuetangMap[dayGan])) {
		shensha.xuetang = [xuetangMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`学堂(${xuetangMap[dayGan]})`);
		}
	}

	// 词馆（根据日干）
	const ciguanMap = SHEN_SHA.ciguan as { [key: string]: string };
	if (ciguanMap[dayGan] && allZhi.includes(ciguanMap[dayGan])) {
		shensha.ciguan = [ciguanMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`词馆(${ciguanMap[dayGan]})`);
		}
	}

	// 金舆（根据日干）
	const jinyuMap = SHEN_SHA.jinyu as { [key: string]: string };
	if (jinyuMap[dayGan] && allZhi.includes(jinyuMap[dayGan])) {
		shensha.jinyu = [jinyuMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`金舆(${jinyuMap[dayGan]})`);
		}
	}

	// 禄神（根据日干）
	const lushenMap = SHEN_SHA.lushen as { [key: string]: string };
	if (lushenMap[dayGan] && allZhi.includes(lushenMap[dayGan])) {
		shensha.lushen = [lushenMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`禄神(${lushenMap[dayGan]})`);
		}
	}

	// 羊刃（根据日干）
	const yangrenMap = SHEN_SHA.yangren as { [key: string]: string };
	if (yangrenMap[dayGan] && allZhi.includes(yangrenMap[dayGan])) {
		shensha.yangren = [yangrenMap[dayGan]];
		if (shensha.all) {
			shensha.all.push(`羊刃(${yangrenMap[dayGan]})`);
		}
	}

	// 红鸾（根据年支）
	const hongluanMap = SHEN_SHA.hongluan as { [key: string]: string };
	if (hongluanMap[yearZhi] && allZhi.includes(hongluanMap[yearZhi])) {
		shensha.hongluan = [hongluanMap[yearZhi]];
		if (shensha.all) {
			shensha.all.push(`红鸾(${hongluanMap[yearZhi]})`);
		}
	}

	// 天喜（根据年支）
	const tianxiMap = SHEN_SHA.tianxi as { [key: string]: string };
	if (tianxiMap[yearZhi] && allZhi.includes(tianxiMap[yearZhi])) {
		shensha.tianxi = [tianxiMap[yearZhi]];
		if (shensha.all) {
			shensha.all.push(`天喜(${tianxiMap[yearZhi]})`);
		}
	}

	// 华盖（根据年支）
	const huagaiMap = SHEN_SHA.huagai as { [key: string]: string };
	if (huagaiMap[yearZhi] && allZhi.includes(huagaiMap[yearZhi])) {
		shensha.huagai = [huagaiMap[yearZhi]];
		if (shensha.all) {
			shensha.all.push(`华盖(${huagaiMap[yearZhi]})`);
		}
	}

	// 将星（根据年支）
	const jiangxingMap = SHEN_SHA.jiangxing as { [key: string]: string };
	if (jiangxingMap[yearZhi] && allZhi.includes(jiangxingMap[yearZhi])) {
		shensha.jiangxing = [jiangxingMap[yearZhi]];
		if (shensha.all) {
			shensha.all.push(`将星(${jiangxingMap[yearZhi]})`);
		}
	}

	// 魁罡（根据日柱干支）
	const kuigangList = SHEN_SHA.kuigang as string[];
	if (kuigangList.includes(dayGanZhi)) {
		shensha.kuigang = true;
		if (shensha.all) {
			shensha.all.push(`魁罡(${dayGanZhi})`);
		}
	}

	// 天医（根据月支）
	const tianyiMedicalMap = SHEN_SHA.tianyi_medical as { [key: string]: string };
	if (tianyiMedicalMap[monthZhi] && allZhi.includes(tianyiMedicalMap[monthZhi])) {
		shensha.tianyi_medical = [tianyiMedicalMap[monthZhi]];
		if (shensha.all) {
			shensha.all.push(`天医(${tianyiMedicalMap[monthZhi]})`);
		}
	}

	// 天赦（根据日柱和季节）
	// 需要判断季节：春（寅卯辰月）戊寅，夏（巳午未月）甲午，秋（申酉戌月）戊申，冬（亥子丑月）甲子
	const month = bazi.getMonth();
	let season = '';
	if ([1, 2, 3].includes(month)) season = '春';
	else if ([4, 5, 6].includes(month)) season = '夏';
	else if ([7, 8, 9].includes(month)) season = '秋';
	else season = '冬';
	
	const tiansheMap = SHEN_SHA.tianshe as { [key: string]: string[] };
	if (tiansheMap[season] && tiansheMap[season].includes(dayGanZhi)) {
		shensha.tianshe = true;
		if (shensha.all) {
			shensha.all.push(`天赦(${dayGanZhi})`);
		}
	}

	// 天德合（根据月支）
	const tiandeheMap = SHEN_SHA.tiandehe as { [key: string]: string };
	if (tiandeheMap[monthZhi] && allGan.includes(tiandeheMap[monthZhi])) {
		shensha.tiandehe = [tiandeheMap[monthZhi]];
		if (shensha.all) {
			shensha.all.push(`天德合(${tiandeheMap[monthZhi]})`);
		}
	}

	// 月德合（根据月支）
	const yuedeheMap = SHEN_SHA.yuedehe as { [key: string]: string };
	if (yuedeheMap[monthZhi] && allGan.includes(yuedeheMap[monthZhi])) {
		shensha.yuedehe = [yuedeheMap[monthZhi]];
		if (shensha.all) {
			shensha.all.push(`月德合(${yuedeheMap[monthZhi]})`);
		}
	}

	// 孤辰（根据年支）
	const guchenMap = SHEN_SHA.guchen as { [key: string]: string };
	if (guchenMap[yearZhi] && allZhi.includes(guchenMap[yearZhi])) {
		shensha.guchen = [guchenMap[yearZhi]];
		if (shensha.all) {
			shensha.all.push(`孤辰(${guchenMap[yearZhi]})`);
		}
	}

	// 寡宿（根据年支）
	const guasuMap = SHEN_SHA.guasu as { [key: string]: string };
	if (guasuMap[yearZhi] && allZhi.includes(guasuMap[yearZhi])) {
		shensha.guasu = [guasuMap[yearZhi]];
		if (shensha.all) {
			shensha.all.push(`寡宿(${guasuMap[yearZhi]})`);
		}
	}

	// 空亡（根据日柱）
	// 甲子旬中戌亥空，甲戌旬中申酉空，甲申旬中午未空，甲午旬中辰巳空，甲辰旬中寅卯空，甲寅旬中子丑空
	const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
	const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
	const dayGanIndex = ganList.indexOf(dayGan);
	const dayZhiIndex = zhiList.indexOf(dayZhi);
	
	// 计算日柱在60甲子中的位置
	const ganzhiIndex = (dayGanIndex * 12 + dayZhiIndex) % 60;
	// 计算所在旬的起始位置（每10个为一旬）
	const xunStartIndex = Math.floor(ganzhiIndex / 10) * 10;
	// 计算旬首的干支索引
	const xunStartGanIndex = xunStartIndex % 10;
	const xunStartZhiIndex = (xunStartIndex - xunStartGanIndex * 12 + 60) % 12;
	const xunStartGan = ganList[xunStartGanIndex];
	const xunStartZhi = zhiList[xunStartZhiIndex];
	const xunKey = xunStartGan + xunStartZhi;
	
	const kongwangMap = SHEN_SHA.kongwang as { [key: string]: string[] };
	if (kongwangMap[xunKey]) {
		const kongwangZhis = kongwangMap[xunKey];
		const foundKongwang = allZhi.filter(zhi => kongwangZhis.includes(zhi));
		if (foundKongwang.length > 0) {
			shensha.kongwang = foundKongwang;
			if (shensha.all) {
				shensha.all.push(...foundKongwang.map(z => `空亡(${z})`));
			}
		}
	}

	// 金神（根据日干和时支，乙丑、己巳、癸酉日见巳午未时）
	const jinshenMap = SHEN_SHA.jinshen as { [key: string]: string[] };
	const jinshenRizhu = ['乙丑', '己巳', '癸酉'];
	if (jinshenRizhu.includes(dayGanZhi) && jinshenMap[dayGan] && jinshenMap[dayGan].includes(timeZhi)) {
		shensha.jinshen = [timeZhi];
		if (shensha.all) {
			shensha.all.push(`金神(${timeZhi})`);
		}
	}

	// 日德（根据日柱干支）
	const rideList = SHEN_SHA.ride as string[];
	if (rideList.includes(dayGanZhi)) {
		shensha.ride = true;
		if (shensha.all) {
			shensha.all.push(`日德(${dayGanZhi})`);
		}
	}

	// 日贵（根据日柱干支）
	const riguiList = SHEN_SHA.rigui as string[];
	if (riguiList.includes(dayGanZhi)) {
		shensha.rigui = true;
		if (shensha.all) {
			shensha.all.push(`日贵(${dayGanZhi})`);
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
	result.ganzhiRelations = calculateOriginalGanZhiRelations(bazi);

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
 * 给定干支列表，计算内部的天干地支关系（可用于四柱 + 大运/流年组合）
 */
function calculateGanZhiRelationsFromList(ganzhiList: string[]): BaziEnhancedData['ganzhiRelations'] {
	const relations: BaziEnhancedData['ganzhiRelations'] = {
		sanHe: [],
		sanXing: [],
		sanHui: [],
		ganHe: [],
		zhiHe: [],
		chong: [],
		hai: []
	};

	if (!ganzhiList || ganzhiList.length < 2) {
		return relations;
	}

	const validList = ganzhiList.filter(gz => gz && gz.length >= 2);

	// 提取天干和地支
	const gans: string[] = [];
	const zhis: string[] = [];
	validList.forEach(gz => {
		gans.push(gz[0]);
		zhis.push(gz[1]);
	});

	// 1. 检查三合（需要3个地支）
	if (zhis.length >= 3) {
		const foundSanHe = new Set<string>();
		for (let i = 0; i < zhis.length - 2; i++) {
			for (let j = i + 1; j < zhis.length - 1; j++) {
				for (let k = j + 1; k < zhis.length; k++) {
					const sanHe = checkZhiSanHe([zhis[i], zhis[j], zhis[k]]);
					if (sanHe && !foundSanHe.has(sanHe)) {
						foundSanHe.add(sanHe);
						relations.sanHe!.push(sanHe);
					}
				}
			}
		}
	}

	// 2. 检查三刑
	if (zhis.length >= 2) {
		const foundXing = new Set<string>();
		
		// 先检查三刑组合（需要3个地支）
		if (zhis.length >= 3) {
			// 检查寅巳申三刑
			if (zhis.includes('寅') && zhis.includes('巳') && zhis.includes('申')) {
				const sanXingStr = '寅巳申刑';
				if (!foundXing.has(sanXingStr)) {
					foundXing.add(sanXingStr);
					relations.sanXing!.push(sanXingStr);
				}
			}
			// 检查丑未戌三刑
			if (zhis.includes('丑') && zhis.includes('未') && zhis.includes('戌')) {
				const sanXingStr = '丑未戌刑';
				if (!foundXing.has(sanXingStr)) {
					foundXing.add(sanXingStr);
					relations.sanXing!.push(sanXingStr);
				}
			}
		}
		
		// 检查单个相刑关系（子卯刑等）
		for (let i = 0; i < zhis.length; i++) {
			for (let j = i + 1; j < zhis.length; j++) {
				const zhi1 = zhis[i];
				const zhi2 = zhis[j];
				
				// 跳过已经包含在三刑组合中的地支对
				const isInSanXing = 
					((zhi1 === '寅' || zhi1 === '巳' || zhi1 === '申') && 
					 (zhi2 === '寅' || zhi2 === '巳' || zhi2 === '申') &&
					 zhis.includes('寅') && zhis.includes('巳') && zhis.includes('申')) ||
					((zhi1 === '丑' || zhi1 === '未' || zhi1 === '戌') && 
					 (zhi2 === '丑' || zhi2 === '未' || zhi2 === '戌') &&
					 zhis.includes('丑') && zhis.includes('未') && zhis.includes('戌'));
				
				if (!isInSanXing && checkZhiXing(zhi1, zhi2)) {
					const xing = `${zhi1}${zhi2}刑`;
					if (!foundXing.has(xing)) {
						foundXing.add(xing);
						relations.sanXing!.push(xing);
					}
				}
			}
		}
		
		// 检查自刑（辰辰、午午、酉酉、亥亥）
		const zhiCount: { [key: string]: number } = {};
		zhis.forEach(zhi => {
			zhiCount[zhi] = (zhiCount[zhi] || 0) + 1;
		});
		
		['辰', '午', '酉', '亥'].forEach(zhi => {
			if (zhiCount[zhi] && zhiCount[zhi] >= 2) {
				const xing = `${zhi}自刑`;
				if (!foundXing.has(xing)) {
					foundXing.add(xing);
					relations.sanXing!.push(xing);
				}
			}
		});
	}

	// 3. 检查三会（需要3个地支）
	if (zhis.length >= 3) {
		const foundSanHui = new Set<string>();
		for (let i = 0; i < zhis.length - 2; i++) {
			for (let j = i + 1; j < zhis.length - 1; j++) {
				for (let k = j + 1; k < zhis.length; k++) {
					const sanHui = checkZhiSanHui([zhis[i], zhis[j], zhis[k]]);
					if (sanHui && !foundSanHui.has(sanHui)) {
						foundSanHui.add(sanHui);
						relations.sanHui!.push(sanHui);
					}
				}
			}
		}
	}

	// 4. 检查天干合化
	if (gans.length >= 2) {
		const foundGanHe = new Set<string>();
		for (let i = 0; i < gans.length; i++) {
			for (let j = i + 1; j < gans.length; j++) {
				const ganHe = checkGanHe(gans[i], gans[j]);
				if (ganHe && !foundGanHe.has(ganHe)) {
					foundGanHe.add(ganHe);
					relations.ganHe!.push(ganHe);
				}
			}
		}
	}

	// 5. 检查地支六合
	if (zhis.length >= 2) {
		const foundZhiHe = new Set<string>();
		for (let i = 0; i < zhis.length; i++) {
			for (let j = i + 1; j < zhis.length; j++) {
				const zhiHe = checkZhiLiuHe(zhis[i], zhis[j]);
				if (zhiHe && !foundZhiHe.has(zhiHe)) {
					foundZhiHe.add(zhiHe);
					relations.zhiHe!.push(zhiHe);
				}
			}
		}
	}

	// 6. 检查冲
	if (zhis.length >= 2) {
		const foundChong = new Set<string>();
		for (let i = 0; i < zhis.length; i++) {
			for (let j = i + 1; j < zhis.length; j++) {
				if (checkZhiLiuChong(zhis[i], zhis[j])) {
					const chong = `${zhis[i]}${zhis[j]}冲`;
					if (!foundChong.has(chong)) {
						foundChong.add(chong);
						relations.chong!.push(chong);
					}
				}
			}
		}
	}

	// 7. 检查害
	if (zhis.length >= 2) {
		const foundHai = new Set<string>();
		for (let i = 0; i < zhis.length; i++) {
			for (let j = i + 1; j < zhis.length; j++) {
				if (checkZhiHai(zhis[i], zhis[j])) {
					const hai = `${zhis[i]}${zhis[j]}害`;
					if (!foundHai.has(hai)) {
						foundHai.add(hai);
						relations.hai!.push(hai);
					}
				}
			}
		}
	}

	return relations;
}

/**
 * 计算原局四柱内部的天干地支关系，可附加额外干支
 * @param bazi 八字对象（来自 lunar-javascript）
 * @param extraGanZhi 追加的干支（如当前大运、流年）
 * @returns 关系对象
 */
export function calculateOriginalGanZhiRelations(bazi: any, extraGanZhi: string[] = []): BaziEnhancedData['ganzhiRelations'] {
	if (!bazi) {
		return {
			sanHe: [],
			sanXing: [],
			sanHui: [],
			ganHe: [],
			zhiHe: [],
			chong: [],
			hai: []
		};
	}

	// 获取原局四柱的干支
	const baseList = [
		bazi.getYear() || '',
		bazi.getMonth() || '',
		bazi.getDay() || '',
		bazi.getTime() || ''
	].filter(gz => gz && gz.length >= 2);

	const allGanZhi = [
		...baseList,
		...extraGanZhi.filter(gz => gz && gz.length >= 2)
	];

	return calculateGanZhiRelationsFromList(allGanZhi);
}

// 通用：直接使用干支列表计算关系（用于四柱 + 大运、流年组合）
export function calculateGanZhiRelationsForList(ganzhiList: string[]): BaziEnhancedData['ganzhiRelations'] {
	return calculateGanZhiRelationsFromList(ganzhiList);
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
 * 根据干支获取藏干（用于大运、流年、流月、流日）
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
 * 根据日干和地支获取副星（十神，用于大运、流年、流月、流日）
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
 * 根据日干和地支获取地势（星运，用于大运、流年、流月、流日）
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
	calculateGanZhiRelationsForList,
	getHideGanForGanZhi,
	getFuXingForGanZhi,
	getDiShiForGanZhi
};

