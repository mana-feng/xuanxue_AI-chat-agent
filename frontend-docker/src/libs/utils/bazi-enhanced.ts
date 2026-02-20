/**
 * 增强版八字排盘工具
 * 参考 zydx.top 等专业排盘网站的功能
 * 包含神煞、格局、用神、五行旺衰等分析
 */

import { Solar } from 'lunar-javascript';
import config from '@/config/config';

// 神煞映射表
const SHEN_SHA = {
	// 天乙贵人（严格按照 bz.js 的 Shen_niangan 和 Shen_rigan）
	// bz.js: "甲戊:丑未","乙己:申子","丙丁:亥酉","壬癸:卯巳","庚辛:寅午"
	tianyi: {
		'甲': ['丑', '未'],
		'乙': ['子', '申'],
		'丙': ['亥', '酉'],
		'丁': ['亥', '酉'],
		'戊': ['丑', '未'],
		'己': ['子', '申'],
		'庚': ['寅', '午'], // 修复：严格按照 bz.js，庚辛应该是寅午
		'辛': ['寅', '午'], // 修复：严格按照 bz.js，庚辛应该是寅午
		'壬': ['卯', '巳'],
		'癸': ['卯', '巳']
	},
	// 文昌（严格按照 bz.js 的 Shen_niangan 和 Shen_rigan）
	// bz.js: "甲乙:巳午","丙戊:申","丁己:酉","庚:亥","辛:子","壬:寅","癸:卯"
	wenchang: {
		'甲': '巳', // 修复：甲文昌在巳
		'乙': '午', // 修复：乙文昌在午
		'丙': '申',
		'丁': '酉',
		'戊': '申',
		'己': '酉',
		'庚': '亥',
		'辛': '子',
		'壬': '寅',
		'癸': '卯'
	},
	// 桃花（严格按照 bz.js 的 Shen_nianzhi 和 Shen_rizhi）
	// bz.js: "申子辰:酉","寅午戌:卯","巳酉丑:午","亥卯未:子"
	// 逻辑：如果年支或日支是申、子、辰之一，且当前地支是酉 -> 桃花
	//      如果年支或日支是寅、午、戌之一，且当前地支是卯 -> 桃花
	//      如果年支或日支是巳、酉、丑之一，且当前地支是午 -> 桃花
	//      如果年支或日支是亥、卯、未之一，且当前地支是子 -> 桃花
	taohua: {
		'申': '酉', '子': '酉', '辰': '酉',
		'寅': '卯', '午': '卯', '戌': '卯',
		'巳': '午', '酉': '午', '丑': '午',
		'亥': '子', '卯': '子', '未': '子'
	},
	// 驿马（申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳）
	yima: {
		'申': '寅', '子': '寅', '辰': '寅',
		'寅': '申', '午': '申', '戌': '申',
		'巳': '亥', '酉': '亥', '丑': '亥',
		'亥': '巳', '卯': '巳', '未': '巳'
	},
	// 天德贵人（根据月支）
	tiande: {
		'寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
		'午': '亥', '未': '甲', '申': '癸', '酉': '寅',
		'戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
	},
	// 月德贵人（根据月支）
	yuede: {
		'寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚',
		'午': '丙', '未': '甲', '申': '壬', '酉': '庚',
		'戌': '丙', '亥': '甲', '子': '壬', '丑': '庚'
	},
	// 太极贵人（根据年干或日干，严格按照 bz.js 的 Shen_niangan）
	// bz.js: "甲乙:子午","丙丁:卯酉","戊己:辰戌丑未","庚辛:寅亥","壬癸:巳申"
	taiji: {
		'甲': ['子', '午'],
		'乙': ['子', '午'],
		'丙': ['卯', '酉'],
		'丁': ['卯', '酉'],
		'戊': ['辰', '戌', '丑', '未'],
		'己': ['辰', '戌', '丑', '未'],
		'庚': ['寅', '亥'], // 修复：严格按照 bz.js，庚辛应该是寅亥，不是寅申
		'辛': ['寅', '亥'], // 修复：严格按照 bz.js，庚辛应该是寅亥，不是寅申
		'壬': ['巳', '申'], // 修复：严格按照 bz.js，壬癸应该是巳申，不是巳亥
		'癸': ['巳', '申']  // 修复：严格按照 bz.js，壬癸应该是巳申，不是巳亥
	},
	// 福星贵人（根据日干，查地支）
	fuxing: {
		'甲': ['寅', '子'],
		'乙': ['卯', '丑'],
		'丙': ['寅', '子'],
		'丁': '亥',
		'戊': '申',
		'己': '未',
		'庚': '午',
		'辛': '巳',
		'壬': '辰',
		'癸': ['卯', '丑']
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
	// 将星（根据年支或日支）
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
	rigui: ['丁酉', '丁亥', '癸巳', '癸卯'],
	// 天厨贵人（根据日干，食神建禄之宫）
	tianchu: {
		'甲': '巳',
		'乙': '午',
		'丙': '巳',
		'丁': '午',
		'戊': '申',
		'己': '酉',
		'庚': '亥',
		'辛': '子',
		'壬': '寅',
		'癸': '卯'
	},
	// 元辰（根据年支，有两个版本，根据性别选择）
	yuanchen1: { // 第一个版本（sx == 0 时使用）
		'子': '未', '丑': '申', '寅': '酉', '卯': '戌',
		'辰': '亥', '巳': '子', '午': '丑', '未': '寅',
		'申': '卯', '酉': '辰', '戌': '巳', '亥': '午'
	},
	yuanchen2: { // 第二个版本（sx == 1 时使用）
		'子': '巳', '丑': '午', '寅': '未', '卯': '申',
		'辰': '酉', '巳': '戌', '午': '亥', '未': '子',
		'申': '丑', '酉': '寅', '戌': '卯', '亥': '辰'
	},
	// 灾煞（根据年支三合局）
	zaisha: {
		'申': '午', '子': '午', '辰': '午',
		'亥': '酉', '卯': '酉', '未': '酉',
		'寅': '子', '午': '子', '戌': '子',
		'巳': '卯', '酉': '卯', '丑': '卯'
	},
	// 劫煞（根据年支三合局）
	jiesha: {
		'申': '巳', '子': '巳', '辰': '巳',
		'亥': '申', '卯': '申', '未': '申',
		'寅': '亥', '午': '亥', '戌': '亥',
		'巳': '寅', '酉': '寅', '丑': '寅'
	},
	// 天罗地网 (年支或日支查)
	tianluodiwang: {
		'辰': '巳', '巳': '辰', // 地网
		'戌': '亥', '亥': '戌'  // 天罗
	},
	// 勾绞煞 (阳男阴女: 勾=前3, 绞=后3; 阴男阳女: 勾=后3, 绞=前3)
	// 这里存储：[前3位(阳勾/阴绞), 后3位(阳绞/阴勾)]
	goujiao: {
		'子': ['卯', '酉'], '丑': ['辰', '戌'], '寅': ['巳', '亥'], '卯': ['午', '子'],
		'辰': ['未', '丑'], '巳': ['申', '寅'], '午': ['酉', '卯'], '未': ['戌', '辰'],
		'申': ['亥', '巳'], '酉': ['子', '午'], '戌': ['丑', '未'], '亥': ['寅', '申']
	},
	// 披麻 (年支查)
	pima: {
		'子': '酉', '丑': '戌', '寅': '亥', '卯': '子', '辰': '丑', '巳': '寅',
		'午': '卯', '未': '辰', '申': '巳', '酉': '午', '戌': '未', '亥': '申'
	},
	// 吊客 (年支查)
	diaoke: {
		'子': '戌', '丑': '亥', '寅': '子', '卯': '丑', '辰': '寅', '巳': '卯',
		'午': '辰', '未': '巳', '申': '午', '酉': '未', '戌': '申', '亥': '酉'
	},
	// 丧门 (年支查)
	sangmen: {
		'子': '寅', '丑': '卯', '寅': '辰', '卯': '巳', '辰': '午', '巳': '未',
		'午': '申', '未': '酉', '申': '戌', '酉': '亥', '戌': '子', '亥': '丑'
	},
	// 血刃 (月支查)
	xueren: {
		'子': '午', '丑': '子', '寅': '丑', '卯': '未', '辰': '寅', '巳': '申',
		'午': '卯', '未': '酉', '申': '辰', '酉': '戌', '戌': '巳', '亥': '亥'
	},
	// 十恶大败 (日柱查)
	shiedabai: ['壬申', '庚辰', '辛巳', '丁亥', '己丑', '丙申', '戊戌', '甲辰', '乙巳', '癸亥'],
	// 十灵日 (日柱查)
	shiling: ['乙亥', '癸未', '庚寅', '丁酉', '壬寅', '甲辰', '庚戌', '辛亥', '丙辰', '戊午'],
	// 九丑日 (日柱查)
	jiuchou: ['己卯', '壬午', '戊子', '辛卯', '丁酉', '己酉', '壬子', '戊午', '辛酉'],
	// 六秀日 (日柱查)
	liuxiu: ['戊子', '己丑', '丙午', '丁未', '戊午', '己未'],
	// 八专日 (日柱查)
	bazhuan: ['戊戌', '丁未', '癸丑', '甲寅', '乙卯', '己未', '庚申', '辛酉'],
	// 孤鸾煞 (日柱查)
	guluan: ['丁巳', '乙巳', '丙午', '戊申', '辛亥', '壬子', '甲寅', '戊午'],
	// 三奇贵人 (天干)
	sanqi: {
		'tian': ['甲', '戊', '庚'], // 天上三奇
		'di': ['乙', '丙', '丁'],   // 地下三奇
		'ren': ['壬', '癸', '辛']  // 人中三奇
	},
	// 亡神（根据年支三合局）
	wangshen: {
		'寅': '巳', '午': '巳', '戌': '巳',
		'亥': '寅', '卯': '寅', '未': '寅',
		'巳': '申', '酉': '申', '丑': '申',
		'申': '亥', '子': '亥', '辰': '亥'
	}
};

// 格局判断
// (Deleted GE_JU)

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
		taohua?: string[]; // 桃花（根据年支或日支的三合局判断）
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
		ganChong?: string[]; // 天干相冲，如 ["甲庚冲"]（严格按照 bz.js 的 liuyi 数组）
		zhiHe?: string[]; // 地支六合，如 ["子丑合"]
		chong?: string[]; // 地支六冲，如 ["子午冲"]
		hai?: string[]; // 地支相害，如 ["子未害"]
		zhiPo?: string[]; // 地支相破，如 ["子酉破"]（严格按照 bz.js 的 liuyi 数组）
	};
}

export interface GanZhiDiagramNode {
	index: number;
	label: string;
	gan: string;
	zhi: string;
	key: string;
}

export interface GanZhiDiagramEdge {
	from: number;
	to: number;
	type: string;
	label: string;
}

export interface GanZhiDiagramData {
	nodes: GanZhiDiagramNode[];
	ganEdges: GanZhiDiagramEdge[];
	zhiEdges: GanZhiDiagramEdge[];
}

/**
 * 计算某个干支所在旬的空亡支列表（用于专门的空亡行）
 */
export function calculateKongWangForGanZhi(ganzhi: string): string[] {
	if (!ganzhi || ganzhi.length < 2) return [];
	const JIAZI_60 = [
		'甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉',
		'甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未',
		'甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳',
		'甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯',
		'甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑',
		'甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'
	];
	const idx = JIAZI_60.indexOf(ganzhi);
	if (idx === -1) return [];
	const xunStart = JIAZI_60[Math.floor(idx / 10) * 10];
	const kongwangMap = SHEN_SHA.kongwang as { [key: string]: string[] };
	return kongwangMap[xunStart] ? [...kongwangMap[xunStart]] : [];
}

/**
 * 获取纳音（严格按照 bz.js 的 getNayin 函数）
 */
function getNayinForGanZhi(ganzhi: string): string {
	const gzu = ["甲子","丙寅","戊辰","庚午","壬申","甲戌","丙子","戊寅","庚辰","壬午","甲申","丙戌","戊子","庚寅","壬辰","甲午","丙申","戊戌","庚子","壬寅","甲辰","丙午","戊申","庚戌","壬子","甲寅","丙辰","戊午","庚申","壬戌"];
	const zzu = ["乙丑","丁卯","己巳","辛未","癸酉","乙亥","丁丑","己卯","辛巳","癸未","乙酉","丁亥","己丑","辛卯","癸巳","乙未","丁酉","己亥","辛丑","癸卯","乙巳","丁未","己酉","辛亥","癸丑","乙卯","丁巳","己未","辛酉","癸亥"];
	const nyzu = ["海中金","炉中火","大林木","路旁土","剑锋金","山头火","涧下水","城头土","白腊金","杨柳木","泉中水","屋上土","霹雳火","松柏木","长流水","砂石金","山下火","平地木","壁上土","金薄金","覆灯火","天河水","大驿土","钗环金","桑柘木","大溪水","沙中土","天上火","石榴木","大海水"];
	
	const z1 = gzu.indexOf(ganzhi);
	if (z1 !== -1) {
		return nyzu[z1];
	} else {
		const z2 = zzu.indexOf(ganzhi);
		if (z2 !== -1) {
			return nyzu[z2];
		}
	}
	return '';
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
 * @param dayZhi   日支（可选，用于金神等）
 * @param timeZhi  时支（可选，用于金神等）
 * @param yearGan 年干（可选，用于计算天厨贵人）
 * @param gender 性别（可选，0=男，1=女，用于元辰选择）
 * @param isDayPillar 是否为日柱（可选，用于某些只在日柱计算的神煞）
 * @param currentPillar 当前计算的柱位（可选，'year'|'month'|'day'|'time'，用于避免年支查年支等自查情况）
 * @returns 神煞数组
 */
export function calculateShenShaForGanZhi(dayGan: string, ganzhi: string, originalZhiList?: string[], yearZhi?: string, monthZhi?: string, dayZhi?: string, timeZhi?: string, yearGan?: string, gender?: number, isDayPillar: boolean = false, currentPillar?: string): string[] {
	const shenshaList: string[] = [];
	const pushUnique = (value?: string) => {
		if (value && !shenshaList.includes(value)) shenshaList.push(value);
	};
	
	if (!ganzhi || ganzhi.length < 2) {
		return shenshaList;
	}
	
	const gan = ganzhi[0]; // 取天干
	const zhi = ganzhi[1]; // 取地支
	
	// 天乙贵人
	const tianyiMap = SHEN_SHA.tianyi as { [key: string]: string[] };
	// 查日干
	if (tianyiMap[dayGan] && tianyiMap[dayGan].includes(zhi)) {
		pushUnique(`天乙贵人(${zhi})`);
	}
	// 查年干
	if (yearGan && tianyiMap[yearGan] && tianyiMap[yearGan].includes(zhi)) {
		pushUnique(`天乙贵人(${zhi})`);
	}
	
	// 文昌（严格按照 bz.js 的 Shen_niangan 和 Shen_rigan）
	const wenchangMap = SHEN_SHA.wenchang as { [key: string]: string | string[] };
	const checkWenchang = (gan: string) => {
		const val = wenchangMap[gan];
		if (val) {
			if (Array.isArray(val)) {
				if (val.includes(zhi)) pushUnique(`文昌(${zhi})`);
			} else if (val === zhi) {
				pushUnique(`文昌(${zhi})`);
			}
		}
	};
	// 查日干
	checkWenchang(dayGan);
	// 查年干
	if (yearGan) checkWenchang(yearGan);
	
	// 桃花（严格按照 bz.js 的 Shen_nianzhi 和 Shen_rizhi）
	// bz.js: "申子辰:酉","寅午戌:卯","巳酉丑:午","亥卯未:子"
	const taohuaMap = SHEN_SHA.taohua as { [key: string]: string };
	// 检查年支
	if (yearZhi && taohuaMap[yearZhi] === zhi) {
		if (currentPillar !== 'year') pushUnique(`桃花(${zhi})`);
	}
	// 检查日支
	if (dayZhi && taohuaMap[dayZhi] === zhi) {
		if (currentPillar !== 'day') pushUnique(`桃花(${zhi})`);
	}
	
	// 驿马（以年支或日支查）
	// 驿马规则：申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳
	// 查法：以年、日支查余三支
	const yimaMap = SHEN_SHA.yima as { [key: string]: string };
	// 检查年支
	if (yearZhi && yimaMap[yearZhi] === zhi) {
		if (currentPillar !== 'year') pushUnique(`驿马(${zhi})`);
	}
	// 检查日支
	if (dayZhi && yimaMap[dayZhi] === zhi) {
		if (currentPillar !== 'day') pushUnique(`驿马(${zhi})`);
	}
	
	// 天德贵人（根据月支，严格按照 bz.js 的 Shen_yuezhi）
	// bz.js: 天德贵人可以是天干或地支，检查 str[1] == tgx || str[1] == dzy
	if (monthZhi) {
		const tiandeMap = SHEN_SHA.tiande as { [key: string]: string };
		const tiandeValue = tiandeMap[monthZhi];
		if (tiandeValue) {
			// 检查天干或地支
			if (tiandeValue === gan || tiandeValue === zhi) {
				pushUnique(`天德贵人(${tiandeValue})`);
			}
		}
	}
	
	// 月德贵人（根据月支）
	if (monthZhi) {
		const yuedeMap = SHEN_SHA.yuede as { [key: string]: string };
		if (yuedeMap[monthZhi] === gan) {
			pushUnique(`月德贵人(${gan})`);
		}
	}
	
	// 太极贵人（根据年干或日干）
	const taijiMap = SHEN_SHA.taiji as { [key: string]: string[] };
	// 查日干
	if (taijiMap[dayGan] && taijiMap[dayGan].includes(zhi)) {
		pushUnique(`太极贵人(${zhi})`);
	}
	// 查年干
	if (yearGan && taijiMap[yearGan] && taijiMap[yearGan].includes(zhi)) {
		pushUnique(`太极贵人(${zhi})`);
	}
	
	// 福星贵人（根据年干或日干，检查地支）
	const fuxingMap = SHEN_SHA.fuxing as { [key: string]: string | string[] };
	const checkFuxing = (gan: string) => {
		const fuxingValue = fuxingMap[gan];
		if (fuxingValue) {
			if (Array.isArray(fuxingValue)) {
				if (fuxingValue.includes(zhi)) {
					pushUnique(`福星贵人(${zhi})`);
				}
			} else if (fuxingValue === zhi) {
				pushUnique(`福星贵人(${zhi})`);
			}
		}
	};
	// 查日干
	checkFuxing(dayGan);
	// 查年干
	if (yearGan) checkFuxing(yearGan);
	
	// 国印贵人（根据日干）
	const guoyinMap = SHEN_SHA.guoyin as { [key: string]: string };
	if (guoyinMap[dayGan] === zhi) {
		pushUnique(`国印贵人(${zhi})`);
	}
	
	// 学堂（根据年柱纳音）
	// 金命见巳，辛巳为正；木命见亥，己亥为正；水命见申，甲申为正；火命见寅，丙寅为正；土命见申，戊申为正。
	if (yearGan && yearZhi) {
		const yearGanZhi = yearGan + yearZhi;
		const yearNayin = getNayinForGanZhi(yearGanZhi);
		let xuetangZhi = '';
		if (yearNayin.includes('金')) xuetangZhi = '巳';
		else if (yearNayin.includes('木')) xuetangZhi = '亥';
		else if (yearNayin.includes('水')) xuetangZhi = '申';
		else if (yearNayin.includes('火')) xuetangZhi = '寅';
		else if (yearNayin.includes('土')) xuetangZhi = '申'; // 水土长生同宫

		if (xuetangZhi === zhi) {
			pushUnique(`学堂(${zhi})`);
		}
	}
	
	// 词馆（根据日干，严格按照 bz.js 的 Shen_niangan 和 Shen_rigan）
	// bz.js 逻辑：需要日干匹配、干支完全匹配，且日干五行等于纳音第三个字符
	const ciguanMap: { [key: string]: string } = {
		'甲': '庚寅', '乙': '辛卯', '丙': '乙巳', '丁': '戊午',
		'戊': '丁巳', '己': '庚午', '庚': '壬申', '辛': '癸酉',
		'壬': '癸亥', '癸': '壬戌'
	};
	if (ciguanMap[dayGan] === ganzhi) {
		// 检查日干五行是否等于纳音第三个字符（严格按照 bz.js）
		const ganWuxing = getGanWuxing(dayGan);
		const nayin = getNayinForGanZhi(ganzhi);
		if (nayin && nayin.length >= 3 && ganWuxing === nayin[2]) {
			pushUnique(`词馆(${ganzhi})`);
		}
	}
	
	// 金舆（根据日干或年干）
	const jinyuMap = SHEN_SHA.jinyu as { [key: string]: string };
	if (jinyuMap[dayGan] === zhi) {
		pushUnique(`金舆(${zhi})`);
	}
	if (yearGan && jinyuMap[yearGan] === zhi) {
		pushUnique(`金舆(${zhi})`);
	}
	
	// 禄神（根据日干）
	const lushenMap = SHEN_SHA.lushen as { [key: string]: string };
	if (lushenMap[dayGan] === zhi) {
		pushUnique(`禄神(${zhi})`);
	}
	
	// 羊刃（根据日干）
	const yangrenMap = SHEN_SHA.yangren as { [key: string]: string };
	if (yangrenMap[dayGan] === zhi) {
		pushUnique(`羊刃(${zhi})`);
	}
	
	// 红鸾（根据年支）
	if (yearZhi) {
		const hongluanMap = SHEN_SHA.hongluan as { [key: string]: string };
		if (hongluanMap[yearZhi] === zhi) {
			pushUnique(`红鸾(${zhi})`);
		}
	}
	
	// 天喜（根据年支）
	if (yearZhi) {
		const tianxiMap = SHEN_SHA.tianxi as { [key: string]: string };
		if (tianxiMap[yearZhi] === zhi) {
			pushUnique(`天喜(${zhi})`);
		}
	}
	
	// 华盖（根据年支或日支）
	if (yearZhi || dayZhi) {
		const huagaiMap = SHEN_SHA.huagai as { [key: string]: string };
		if (yearZhi && huagaiMap[yearZhi] === zhi) {
			if (currentPillar !== 'year') pushUnique(`华盖(${zhi})`);
		}
		if (dayZhi && huagaiMap[dayZhi] === zhi) {
			if (currentPillar !== 'day') pushUnique(`华盖(${zhi})`);
		}
	}
	
	// 将星（根据年支或日支）
	if (yearZhi || dayZhi) {
		const jiangxingMap = SHEN_SHA.jiangxing as { [key: string]: string };
		if (yearZhi && jiangxingMap[yearZhi] === zhi) {
			if (currentPillar !== 'year') pushUnique(`将星(${zhi})`);
		}
		if (dayZhi && jiangxingMap[dayZhi] === zhi) {
			if (currentPillar !== 'day') pushUnique(`将星(${zhi})`);
		}
	}
	
	// 魁罡（根据日柱干支）
	const kuigangList = SHEN_SHA.kuigang as string[];
	if (kuigangList.includes(ganzhi)) {
		pushUnique(`魁罡(${ganzhi})`);
	}
	
	// 天医（根据月支）
	if (monthZhi) {
		const tianyiMedicalMap = SHEN_SHA.tianyi_medical as { [key: string]: string };
		if (tianyiMedicalMap[monthZhi] === zhi) {
			pushUnique(`天医(${zhi})`);
		}
	}
	
	// 天德合（根据月支，天德贵人的合干）
	// 注意：天德合仅在天德贵人为天干时计算，如果天德贵人是地支（如"卯:申"、"午:亥"、"酉:寅"），则不计算天德合
	if (monthZhi) {
		const tiandeMap = SHEN_SHA.tiande as { [key: string]: string };
		const tiandeValue = tiandeMap[monthZhi];
		// 只有当天德贵人是天干时，才计算天德合
		if (tiandeValue && ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].includes(tiandeValue)) {
			const tiandeheMap = SHEN_SHA.tiandehe as { [key: string]: string };
			if (tiandeheMap[monthZhi] === gan) {
				pushUnique(`天德合(${gan})`);
			}
		}
	}
	
	// 月德合（根据月支，月德贵人的合干）
	// 月德贵人都是天干，所以可以直接计算
	if (monthZhi) {
		const yuedeheMap = SHEN_SHA.yuedehe as { [key: string]: string };
		if (yuedeheMap[monthZhi] === gan) {
			pushUnique(`月德合(${gan})`);
		}
	}
	
	// 孤辰（根据年支）
	if (yearZhi) {
		const guchenMap = SHEN_SHA.guchen as { [key: string]: string };
		if (guchenMap[yearZhi] === zhi) {
			pushUnique(`孤辰(${zhi})`);
		}
	}
	
	// 寡宿（根据年支）
	if (yearZhi) {
		const guasuMap = SHEN_SHA.guasu as { [key: string]: string };
		if (guasuMap[yearZhi] === zhi) {
			pushUnique(`寡宿(${zhi})`);
		}
	}

	// 天罗地网 (年支或日支查)
	const tianluodiwangMap = SHEN_SHA.tianluodiwang as { [key: string]: string };
	if (yearZhi && tianluodiwangMap[yearZhi] === zhi) {
		pushUnique(yearZhi === '辰' || yearZhi === '巳' ? `地网(${zhi})` : `天罗(${zhi})`);
	}
	if (dayZhi && tianluodiwangMap[dayZhi] === zhi) {
		pushUnique(dayZhi === '辰' || dayZhi === '巳' ? `地网(${zhi})` : `天罗(${zhi})`);
	}

	// 勾绞煞 (根据年支)
	if (yearZhi && gender !== undefined) {
		const yangZhi = ['子', '寅', '辰', '午', '申', '戌'];
		const isYangYear = yangZhi.includes(yearZhi);
		const isMale = gender === 0; // 0=男
		
		const goujiaoMap = SHEN_SHA.goujiao as { [key: string]: string[] };
		const targets = goujiaoMap[yearZhi]; // [前3, 后3]
		
		if (targets) {
			let gouTarget = '';
			let jiaoTarget = '';
			
			// 阳男阴女: 勾=前3, 绞=后3
			if ((isMale && isYangYear) || (!isMale && !isYangYear)) {
				gouTarget = targets[0];
				jiaoTarget = targets[1];
			} 
			// 阴男阳女: 勾=后3, 绞=前3
			else {
				gouTarget = targets[1];
				jiaoTarget = targets[0];
			}
			
			if (gouTarget === zhi || jiaoTarget === zhi) {
				pushUnique(`勾绞煞(${zhi})`);
			}
		}
	}

	// 披麻, 吊客, 丧门, 血刃 (根据年支)
	if (yearZhi) {
		const pimaMap = SHEN_SHA.pima as { [key: string]: string };
		if (pimaMap[yearZhi] === zhi) pushUnique(`披麻(${zhi})`);
		
		const diaokeMap = SHEN_SHA.diaoke as { [key: string]: string };
		if (diaokeMap[yearZhi] === zhi) pushUnique(`吊客(${zhi})`);
		
		const sangmenMap = SHEN_SHA.sangmen as { [key: string]: string };
		if (sangmenMap[yearZhi] === zhi) pushUnique(`丧门(${zhi})`);
	}

	// 血刃 (根据月支)
	if (monthZhi) {
		const xuerenMap = SHEN_SHA.xueren as { [key: string]: string };
		if (xuerenMap[monthZhi] === zhi) pushUnique(`血刃(${zhi})`);
	}

	// 日柱神煞 (十恶大败, 十灵日, 九丑日, 六秀日, 八专日, 孤鸾煞)
	if (isDayPillar) {
		const shiedabaiList = SHEN_SHA.shiedabai as string[];
		if (shiedabaiList.includes(ganzhi)) pushUnique(`十恶大败(${zhi})`);
		
		const shilingList = SHEN_SHA.shiling as string[];
		if (shilingList.includes(ganzhi)) pushUnique(`十灵日(${zhi})`);
		
		const jiuchouList = SHEN_SHA.jiuchou as string[];
		if (jiuchouList.includes(ganzhi)) pushUnique(`九丑日(${zhi})`);
		
		const liuxiuList = SHEN_SHA.liuxiu as string[];
		if (liuxiuList.includes(ganzhi)) pushUnique(`六秀日(${zhi})`);
		
		const bazhuanList = SHEN_SHA.bazhuan as string[];
		if (bazhuanList.includes(ganzhi)) pushUnique(`八专日(${zhi})`);
		
		const guluanList = SHEN_SHA.guluan as string[];
		if (guluanList.includes(ganzhi)) pushUnique(`孤鸾煞(${zhi})`);
	}
	
	// 金神（根据日干和时支，需要传入时支）
	if (dayGan && timeZhi) {
		const jinshenMap = SHEN_SHA.jinshen as { [key: string]: string[] };
		const jinshenRizhu = ['乙丑', '己巳', '癸酉'];
		const dayGanZhi = dayGan + (dayZhi || '');
		if (jinshenRizhu.includes(dayGanZhi) && jinshenMap[dayGan] && jinshenMap[dayGan].includes(timeZhi)) {
			pushUnique(`金神(${timeZhi})`);
		}
	}
	
	// 天厨贵人（根据年干或日干，严格按照 bz.js 的 Shen_niangan 和 Shen_rigan）
	const tianchuMap = SHEN_SHA.tianchu as { [key: string]: string };
	// 先检查年干（如果传入）
	if (yearGan && tianchuMap[yearGan] === zhi) {
		pushUnique(`天厨贵人(${zhi})`);
	}
	// 再检查日干（如果年干没有匹配）
	else if (tianchuMap[dayGan] === zhi) {
		pushUnique(`天厨贵人(${zhi})`);
	}
	
	// 元辰（根据年支，有两个版本，根据性别选择）
	if (yearZhi && gender !== undefined) {
		const yuanchen1Map = SHEN_SHA.yuanchen1 as { [key: string]: string };
		const yuanchen2Map = SHEN_SHA.yuanchen2 as { [key: string]: string };
		// gender: 0=男，1=女（与 bz.js 的 sx 相反：sx==0 用第一个，sx==1 用第二个）
		if (gender === 0 && yuanchen1Map[yearZhi] === zhi) {
			pushUnique(`元辰(${zhi})`);
		} else if (gender === 1 && yuanchen2Map[yearZhi] === zhi) {
			pushUnique(`元辰(${zhi})`);
		}
	}
	
	// 灾煞（根据年支三合局）
	if (yearZhi) {
		const zaishaMap = SHEN_SHA.zaisha as { [key: string]: string };
		if (zaishaMap[yearZhi] === zhi) {
			if (currentPillar !== 'year') pushUnique(`灾煞(${zhi})`);
		}
	}
	
	// 劫煞（根据年支或日支三合局）
	if (yearZhi || dayZhi) {
		const jieshaMap = SHEN_SHA.jiesha as { [key: string]: string };
		if (yearZhi && jieshaMap[yearZhi] === zhi) {
			if (currentPillar !== 'year') pushUnique(`劫煞(${zhi})`);
		}
		if (dayZhi && jieshaMap[dayZhi] === zhi) {
			if (currentPillar !== 'day') pushUnique(`劫煞(${zhi})`);
		}
	}
	
	// 亡神（根据年支三合局）
	if (yearZhi) {
		const wangshenMap = SHEN_SHA.wangshen as { [key: string]: string };
		if (wangshenMap[yearZhi] === zhi) {
			if (currentPillar !== 'year') pushUnique(`亡神(${zhi})`);
		}
	}
	
	// 天罗地网（严格按照 bz.js 的 Shen_nianzhi 和 Shen_rizhi）
	// bz.js: "辰:巳","巳:辰","戌:亥","亥:戌"
	// 逻辑：如果年支是辰，当前地支是巳 -> 天罗地网；如果年支是巳，当前地支是辰 -> 天罗地网
	// 或者：如果日支是辰，当前地支是巳 -> 天罗地网；如果日支是巳，当前地支是辰 -> 天罗地网
	if (yearZhi) {
		if (yearZhi === '辰' && zhi === '巳') {
			pushUnique(`天罗地网(${zhi})`);
		} else if (yearZhi === '巳' && zhi === '辰') {
			pushUnique(`天罗地网(${zhi})`);
		} else if (yearZhi === '戌' && zhi === '亥') {
			pushUnique(`天罗地网(${zhi})`);
		} else if (yearZhi === '亥' && zhi === '戌') {
			pushUnique(`天罗地网(${zhi})`);
		}
	}
	if (dayZhi) {
		if (dayZhi === '辰' && zhi === '巳') {
			pushUnique(`天罗地网(${zhi})`);
		} else if (dayZhi === '巳' && zhi === '辰') {
			pushUnique(`天罗地网(${zhi})`);
		} else if (dayZhi === '戌' && zhi === '亥') {
			pushUnique(`天罗地网(${zhi})`);
		} else if (dayZhi === '亥' && zhi === '戌') {
			pushUnique(`天罗地网(${zhi})`);
		}
	}
	
	// 字数多的在上面，字数少的在下面
	shenshaList.sort((a, b) => b.length - a.length);
	
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
	const tianyiList: string[] = [];
	// 查日干
	if (tianyiMap[dayGan]) {
		const matched = tianyiMap[dayGan].filter((zhi: string) => allZhi.includes(zhi));
		tianyiList.push(...matched);
	}
	// 查年干
	if (tianyiMap[yearGan]) {
		const matched = tianyiMap[yearGan].filter((zhi: string) => allZhi.includes(zhi));
		tianyiList.push(...matched);
	}

	if (tianyiList.length > 0) {
		shensha.tianyi = [...new Set(tianyiList)];
		if (shensha.all) {
			shensha.all.push(...shensha.tianyi.map((z: string) => `天乙贵人(${z})`));
		}
	}

	// 文昌（严格按照 bz.js 的 Shen_niangan 和 Shen_rigan）
	const wenchangMap = SHEN_SHA.wenchang as { [key: string]: string | string[] };
	const wenchangList: string[] = [];
	
	const checkWenchang = (gan: string) => {
		const val = wenchangMap[gan];
		if (val) {
			if (Array.isArray(val)) {
				const matched = val.filter((z: string) => allZhi.includes(z));
				wenchangList.push(...matched);
			} else if (allZhi.includes(val)) {
				wenchangList.push(val);
			}
		}
	};
	
	// 查日干
	checkWenchang(dayGan);
	// 查年干
	checkWenchang(yearGan);

	if (wenchangList.length > 0) {
		shensha.wenchang = [...new Set(wenchangList)];
		if (shensha.all) {
			shensha.all.push(...shensha.wenchang.map((z: string) => `文昌(${z})`));
		}
	}

	// 桃花（严格按照 bz.js 的 Shen_nianzhi 和 Shen_rizhi）
	// bz.js: "申子辰:酉","寅午戌:卯","巳酉丑:午","亥卯未:子"
	const taohuaMap = SHEN_SHA.taohua as { [key: string]: string };
	const taohua: string[] = [];
	// 检查年支和日支
	const checkZhi = [yearZhi, dayZhi].filter(Boolean);
	checkZhi.forEach((zhi: string) => {
		if (taohuaMap[zhi] && allZhi.includes(taohuaMap[zhi])) {
			const taohuaZhi = taohuaMap[zhi];
			if (!taohua.includes(taohuaZhi)) {
				taohua.push(taohuaZhi);
			}
		}
	});
	if (taohua.length > 0) {
		shensha.taohua = taohua;
		if (shensha.all) {
			shensha.all.push(...taohua.map((z: string) => `桃花(${z})`));
		}
	}

	// 驿马（以年支或日支查）
	const yima: string[] = [];
	const yimaMap = SHEN_SHA.yima as { [key: string]: string };
	// 检查年支
	if (yimaMap[yearZhi] && allZhi.includes(yimaMap[yearZhi])) {
		yima.push(yimaMap[yearZhi]);
	}
	// 检查日支
	if (yimaMap[dayZhi] && allZhi.includes(yimaMap[dayZhi])) {
		yima.push(yimaMap[dayZhi]);
	}
	if (yima.length > 0) {
		shensha.yima = [...new Set(yima)];
		if (shensha.all) {
			shensha.all.push(...shensha.yima.map((z: string) => `驿马(${z})`));
		}
	}

	// 天德贵人（根据月支，严格按照 bz.js 的 Shen_yuezhi）
	// bz.js: 天德贵人可以是天干或地支，检查 str[1] == tgx || str[1] == dzy
	const tiandeMap = SHEN_SHA.tiande as { [key: string]: string };
	if (tiandeMap[monthZhi]) {
		const tiandeValue = tiandeMap[monthZhi];
		// 检查天干或地支
		if (allGan.includes(tiandeValue) || allZhi.includes(tiandeValue)) {
			shensha.tiande = [tiandeValue];
			if (shensha.all) {
				shensha.all.push(`天德贵人(${tiandeValue})`);
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

	// 太极贵人（根据年干或日干）
	const taijiMap = SHEN_SHA.taiji as { [key: string]: string[] };
	const taiji: string[] = [];
	
	// 查日干
	if (taijiMap[dayGan]) {
		const matched = taijiMap[dayGan].filter((zhi: string) => allZhi.includes(zhi));
		taiji.push(...matched);
	}
	// 查年干
	if (taijiMap[yearGan]) {
		const matched = taijiMap[yearGan].filter((zhi: string) => allZhi.includes(zhi));
		taiji.push(...matched);
	}

	if (taiji.length > 0) {
		shensha.taiji = [...new Set(taiji)];
		if (shensha.all) {
			shensha.all.push(...shensha.taiji.map((z: string) => `太极贵人(${z})`));
		}
	}

	// 福星贵人（根据年干或日干）
	const fuxingMap = SHEN_SHA.fuxing as { [key: string]: string | string[] };
	const fuxingList: string[] = [];

	const checkFuxingGlobal = (gan: string) => {
		const fuxingValue = fuxingMap[gan];
		if (fuxingValue) {
			if (Array.isArray(fuxingValue)) {
				const matched = fuxingValue.filter((z: string) => allZhi.includes(z));
				if (matched.length > 0) {
					fuxingList.push(...matched);
				}
			} else if (allZhi.includes(fuxingValue)) {
				fuxingList.push(fuxingValue);
			}
		}
	};

	// 查日干
	checkFuxingGlobal(dayGan);
	// 查年干
	if (yearGan) checkFuxingGlobal(yearGan);

	if (fuxingList.length > 0) {
		shensha.fuxing = [...new Set(fuxingList)];
		if (shensha.all) {
			shensha.all.push(...shensha.fuxing.map((z: string) => `福星贵人(${z})`));
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

	// 学堂（根据年柱纳音）
	// 金命见巳，辛巳为正；木命见亥，己亥为正；水命见申，甲申为正；火命见寅，丙寅为正；土命见申，戊申为正。
	if (yearGan && yearZhi) {
		const yearGanZhi = yearGan + yearZhi;
		const yearNayin = getNayinForGanZhi(yearGanZhi);
		let xuetangZhi = '';
		if (yearNayin.includes('金')) xuetangZhi = '巳';
		else if (yearNayin.includes('木')) xuetangZhi = '亥';
		else if (yearNayin.includes('水')) xuetangZhi = '申';
		else if (yearNayin.includes('火')) xuetangZhi = '寅';
		else if (yearNayin.includes('土')) xuetangZhi = '申'; // 水土长生同宫

		if (xuetangZhi && allZhi.includes(xuetangZhi)) {
			shensha.xuetang = [xuetangZhi];
			if (shensha.all) {
				shensha.all.push(`学堂(${xuetangZhi})`);
			}
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

	// 金舆（根据日干或年干）
	const jinyuMap = SHEN_SHA.jinyu as { [key: string]: string };
	const jinyuList: string[] = [];
	// 查日干
	if (jinyuMap[dayGan] && allZhi.includes(jinyuMap[dayGan])) {
		jinyuList.push(jinyuMap[dayGan]);
	}
	// 查年干
	if (jinyuMap[yearGan] && allZhi.includes(jinyuMap[yearGan])) {
		jinyuList.push(jinyuMap[yearGan]);
	}

	if (jinyuList.length > 0) {
		shensha.jinyu = [...new Set(jinyuList)];
		if (shensha.all) {
			shensha.all.push(...shensha.jinyu.map((z: string) => `金舆(${z})`));
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

	// 华盖（根据年支或日支）
	const huagaiMap = SHEN_SHA.huagai as { [key: string]: string };
	const huagaiList: string[] = [];
	if (huagaiMap[yearZhi] && allZhi.includes(huagaiMap[yearZhi])) {
		huagaiList.push(huagaiMap[yearZhi]);
	}
	if (huagaiMap[dayZhi] && allZhi.includes(huagaiMap[dayZhi])) {
		huagaiList.push(huagaiMap[dayZhi]);
	}

	if (huagaiList.length > 0) {
		shensha.huagai = [...new Set(huagaiList)];
		if (shensha.all) {
			shensha.all.push(...shensha.huagai.map((z: string) => `华盖(${z})`));
		}
	}

	// 将星（根据年支或日支）
	const jiangxingMap = SHEN_SHA.jiangxing as { [key: string]: string };
	const jiangxingList: string[] = [];
	
	// 查年支
	if (jiangxingMap[yearZhi] && allZhi.includes(jiangxingMap[yearZhi])) {
		jiangxingList.push(jiangxingMap[yearZhi]);
	}
	// 查日支
	if (jiangxingMap[dayZhi] && allZhi.includes(jiangxingMap[dayZhi])) {
		jiangxingList.push(jiangxingMap[dayZhi]);
	}

	if (jiangxingList.length > 0) {
		shensha.jiangxing = [...new Set(jiangxingList)];
		if (shensha.all) {
			shensha.all.push(...shensha.jiangxing.map((z: string) => `将星(${z})`));
		}
	}

	// 劫煞（根据年支或日支三合局）
	const jieshaMap = SHEN_SHA.jiesha as { [key: string]: string };
	const jieshaList: string[] = [];
	// 查年支
	if (jieshaMap[yearZhi] && allZhi.includes(jieshaMap[yearZhi])) {
		jieshaList.push(jieshaMap[yearZhi]);
	}
	// 查日支
	if (jieshaMap[dayZhi] && allZhi.includes(jieshaMap[dayZhi])) {
		jieshaList.push(jieshaMap[dayZhi]);
	}

	if (jieshaList.length > 0) {
		if (shensha.all) {
			shensha.all.push(...[...new Set(jieshaList)].map((z: string) => `劫煞(${z})`));
		}
	}

	// 天厨贵人（根据年干或日干）
	const tianchuMap = SHEN_SHA.tianchu as { [key: string]: string };
	const tianchuList: string[] = [];
	// 查年干
	if (yearGan && tianchuMap[yearGan] && allZhi.includes(tianchuMap[yearGan])) {
		tianchuList.push(tianchuMap[yearGan]);
	}
	// 查日干
	if (tianchuMap[dayGan] && allZhi.includes(tianchuMap[dayGan])) {
		tianchuList.push(tianchuMap[dayGan]);
	}
	
	if (tianchuList.length > 0) {
		if (shensha.all) {
			shensha.all.push(...[...new Set(tianchuList)].map((z: string) => `天厨贵人(${z})`));
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

	// 天罗地网 (年支或日支查)
	const tianluodiwangMap = SHEN_SHA.tianluodiwang as { [key: string]: string };
	const tianluodiwangList: string[] = [];
	
	if (yearZhi && tianluodiwangMap[yearZhi]) {
		const target = tianluodiwangMap[yearZhi];
		if (allZhi.includes(target)) {
			tianluodiwangList.push(yearZhi === '辰' || yearZhi === '巳' ? `地网(${target})` : `天罗(${target})`);
		}
	}
	if (dayZhi && tianluodiwangMap[dayZhi]) {
		const target = tianluodiwangMap[dayZhi];
		if (allZhi.includes(target)) {
			tianluodiwangList.push(dayZhi === '辰' || dayZhi === '巳' ? `地网(${target})` : `天罗(${target})`);
		}
	}
	
	if (tianluodiwangList.length > 0) {
		if (shensha.all) {
			shensha.all.push(...[...new Set(tianluodiwangList)]);
		}
	}

	// 披麻, 吊客, 丧门 (根据年支)
	if (yearZhi) {
		const pimaMap = SHEN_SHA.pima as { [key: string]: string };
		if (pimaMap[yearZhi] && allZhi.includes(pimaMap[yearZhi])) {
			if (shensha.all) shensha.all.push(`披麻(${pimaMap[yearZhi]})`);
		}
		
		const diaokeMap = SHEN_SHA.diaoke as { [key: string]: string };
		if (diaokeMap[yearZhi] && allZhi.includes(diaokeMap[yearZhi])) {
			if (shensha.all) shensha.all.push(`吊客(${diaokeMap[yearZhi]})`);
		}
		
		const sangmenMap = SHEN_SHA.sangmen as { [key: string]: string };
		if (sangmenMap[yearZhi] && allZhi.includes(sangmenMap[yearZhi])) {
			if (shensha.all) shensha.all.push(`丧门(${sangmenMap[yearZhi]})`);
		}
	}

	// 血刃 (根据月支)
	if (monthZhi) {
		const xuerenMap = SHEN_SHA.xueren as { [key: string]: string };
		if (xuerenMap[monthZhi] && allZhi.includes(xuerenMap[monthZhi])) {
			if (shensha.all) shensha.all.push(`血刃(${xuerenMap[monthZhi]})`);
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

	// 字数多的在上面，字数少的在下面
	if (shensha.all) {
		shensha.all.sort((a, b) => b.length - a.length);
	}

	return shensha;
}

/**
 * 判断格局（完善版）
 * 根据八字格局判断规则：
 * 1. 以月令（月支）藏干透干定格局
 * 2. 本气透干优先于中气、余气
 * 3. 检查破格因素（合化、冲克等）
 * 4. 考虑特殊格局（从格、化格等）
 */
function calculateGeJu(bazi: any, shishen: any): BaziEnhancedData['geju'] {
	const geju: BaziEnhancedData['geju'] = {
		type: '',
		description: ''
	};

	try {
		// 获取月支和月干
		const monthGan = bazi.getMonthGan() || '';
		const dayGan = bazi.getDayGan() || '';
		
		// 获取月支藏干（本气、中气、余气）
		const monthHideGan = bazi.getMonthHideGan() || [];
		if (!Array.isArray(monthHideGan) || monthHideGan.length === 0) {
			geju.type = '杂格';
			geju.description = '杂格：月令藏干信息不足，需要综合分析';
			return geju;
		}

		// 获取所有天干（年、月、日、时）
		const yearGan = bazi.getYearGan() || '';
		const timeGan = bazi.getTimeGan() || '';
		const allGan = [yearGan, monthGan, dayGan, timeGan].filter(Boolean);

		// 月令本气（第一个藏干）
		const benQi = monthHideGan[0] || '';
		// 月令中气（第二个藏干，如果有）
		const zhongQi = monthHideGan[1] || '';
		// 月令余气（第三个藏干，如果有）
		const yuQi = monthHideGan[2] || '';

		// 检查月令藏干是否透干（在年、月、日、时天干中出现）
		const checkTouGan = (canggan: string): boolean => {
			return allGan.includes(canggan);
		};

		// 获取日主对应的十神（使用 config 中的映射表）
		const getShiShenForGan = (gan: string): string => {
			if (!dayGan || !gan) return '';
			const tianganMap = config.tiangan as { [key: string]: { [key: string]: string } };
			if (tianganMap[dayGan] && tianganMap[dayGan][gan]) {
				return tianganMap[dayGan][gan];
			}
			return '';
		};

		// 优先判断本气透干
		let touGanGan = '';
		let touGanShiShen = '';
		let isBenQi = false;

		if (benQi && checkTouGan(benQi)) {
			touGanGan = benQi;
			touGanShiShen = getShiShenForGan(benQi);
			isBenQi = true;
		} else if (zhongQi && checkTouGan(zhongQi)) {
			touGanGan = zhongQi;
			touGanShiShen = getShiShenForGan(zhongQi);
		} else if (yuQi && checkTouGan(yuQi)) {
			touGanGan = yuQi;
			touGanShiShen = getShiShenForGan(yuQi);
		}

		// 如果月令藏干透干，根据透干的十神定格局
		if (touGanGan && touGanShiShen) {
			const shishenMap: { [key: string]: { type: string; desc: string } } = {
				'正官': { type: '正官格', desc: '正官格：月令正官透干，主贵气，性格端正，有责任感。成格条件：正官有力、不被冲克、有印护官。破格因素：伤官见官、七杀混杂、财星坏印。' },
				'七杀': { type: '七杀格', desc: '七杀格：月令七杀透干，主权威，性格刚强，有魄力。成格条件：七杀有力、有制化（食伤制杀或印化杀）。破格因素：官杀混杂、无制化、比劫夺财。' },
				'正财': { type: '正财格', desc: '正财格：月令正财透干，主财富，性格务实，善于理财。成格条件：财星有力、有食伤生财、有官护财。破格因素：比劫夺财、财多身弱、无食伤生财。' },
				'偏财': { type: '偏财格', desc: '偏财格：月令偏财透干，主横财，性格灵活，善于把握机会。成格条件：偏财有力、有食伤生财、身强能担财。破格因素：比劫夺财、财多身弱、无食伤生财。' },
				'正印': { type: '正印格', desc: '正印格：月令正印透干，主文贵，性格温和，有学识。成格条件：印星有力、有官杀生印、身弱喜印。破格因素：财星坏印、印多身旺、无官杀生印。' },
				'偏印': { type: '偏印格', desc: '偏印格：月令偏印透干，主智慧，性格内向，有独特见解。成格条件：偏印有力、有食伤配印、身弱喜印。破格因素：财星坏印、印多身旺、食神被夺。' },
				'食神': { type: '食神格', desc: '食神格：月令食神透干，主才华，性格温和，有艺术天赋。成格条件：食神有力、有财星泄秀、身强能担。破格因素：枭神夺食、食神被克、无财星泄秀。' },
				'伤官': { type: '伤官格', desc: '伤官格：月令伤官透干，主才华，性格张扬，有创造力。成格条件：伤官有力、有财星泄秀或印星制伤、身强能担。破格因素：伤官见官、无财印、伤官被克。' },
				'比肩': { type: '比肩格', desc: '比肩格：月令比肩透干，主自立，性格独立，有主见。成格条件：比肩有力、有食伤泄秀、身强能担。破格因素：比劫夺财、无食伤泄秀、身弱不胜。' },
				'劫财': { type: '劫财格', desc: '劫财格：月令劫财透干，主竞争，性格好胜，有冲劲。成格条件：劫财有力、有食伤泄秀、身强能担。破格因素：比劫夺财、无食伤泄秀、身弱不胜。' }
			};

			const gejuInfo = shishenMap[touGanShiShen];
			if (gejuInfo) {
				geju.type = gejuInfo.type;
				geju.description = gejuInfo.desc;
				if (!isBenQi) {
					geju.description += `（注：以月令${zhongQi ? '中气' : '余气'}透干定格局）`;
				}
			} else {
				geju.type = '杂格';
				geju.description = `杂格：月令${touGanGan}透干，十神为${touGanShiShen}，格局复杂，需要综合分析`;
			}
		} else {
			// 月令藏干未透干，可能是特殊格局或杂格
			// 检查是否为从格、化格等特殊格局
			const monthShishenStr = String(shishen.month || '');
			
			// 如果月柱天干本身就是十神，也可以定格局（但优先级较低）
			if (monthShishenStr.includes('正官') || monthShishenStr.includes('官')) {
				geju.type = '正官格（月干）';
				geju.description = '正官格：以月干正官定格局，主贵气。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else if (monthShishenStr.includes('七杀') || monthShishenStr.includes('杀')) {
				geju.type = '七杀格（月干）';
				geju.description = '七杀格：以月干七杀定格局，主权威。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else if (monthShishenStr.includes('正财') || monthShishenStr.includes('财')) {
				geju.type = '正财格（月干）';
				geju.description = '正财格：以月干正财定格局，主财富。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else if (monthShishenStr.includes('偏财') || monthShishenStr.includes('才')) {
				geju.type = '偏财格（月干）';
				geju.description = '偏财格：以月干偏财定格局，主横财。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else if (monthShishenStr.includes('正印') || monthShishenStr.includes('印')) {
				geju.type = '正印格（月干）';
				geju.description = '正印格：以月干正印定格局，主文贵。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else if (monthShishenStr.includes('偏印') || monthShishenStr.includes('枭')) {
				geju.type = '偏印格（月干）';
				geju.description = '偏印格：以月干偏印定格局，主智慧。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else if (monthShishenStr.includes('食神') || monthShishenStr.includes('食')) {
				geju.type = '食神格（月干）';
				geju.description = '食神格：以月干食神定格局，主才华。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else if (monthShishenStr.includes('伤官') || monthShishenStr.includes('伤')) {
				geju.type = '伤官格（月干）';
				geju.description = '伤官格：以月干伤官定格局，主才华。注意：月令藏干未透，格局力量较弱，需结合其他因素判断。';
			} else {
				geju.type = '杂格';
				geju.description = '杂格：月令藏干未透干，且月干十神不明显，格局复杂，需要综合分析。建议：查看月令本气、中气、余气，结合日主强弱、五行旺衰、组合关系综合判断。';
			}
		}

		// 检查破格因素（简化版，后续可完善）
		const poGeFactors: string[] = [];
		
		// 检查天干五合是否破格
		const ganHeList = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
		for (const he of ganHeList) {
			if (allGan.includes(he[0]) && allGan.includes(he[1])) {
				// 如果月令透干被合，可能破格
				if (touGanGan && (he.includes(touGanGan))) {
					poGeFactors.push(`${he[0]}${he[1]}合，可能影响格局`);
				}
			}
		}

		if (poGeFactors.length > 0) {
			geju.description += ` 破格因素：${poGeFactors.join('；')}`;
		}

	} catch (e) {
		console.error('格局判断失败:', e);
		geju.type = '杂格';
		geju.description = '杂格：格局判断过程中出现错误，需要综合分析';
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
 * 判断日主强弱（完善版）
 * 根据八字理论，综合考虑：
 * 1. 得令（月令）：日主是否生于自身五行旺盛的月份
 * 2. 得地（根气）：地支中是否有日主的根气（本气、中气、余气）
 * 3. 得势（比劫）：天干地支中与日主同类五行（比肩、劫财）的数量
 * 4. 得生（印星）：四柱中是否有生助日主的五行（印星）
 * 5. 得助（通关）：是否有克制日主克星的五行
 */
function calculateRizhuQiangruo(bazi: any): BaziEnhancedData['rizhuQiangruo'] {
	const dayGan = bazi.getDayGan();
	const dayWuxing = getGanWuxing(dayGan);
	
	// 获取四柱天干地支
	const yearGan = bazi.getYearGan() || '';
	const monthGan = bazi.getMonthGan() || '';
	const timeGan = bazi.getTimeGan() || '';
	const yearZhi = bazi.getYearZhi() || '';
	const monthZhi = bazi.getMonthZhi() || '';
	const dayZhi = bazi.getDayZhi() || '';
	const timeZhi = bazi.getTimeZhi() || '';
	
	// 获取所有地支的藏干
	const yearHideGan = bazi.getYearHideGan() || [];
	const monthHideGan = bazi.getMonthHideGan() || [];
	const dayHideGan = bazi.getDayHideGan() || [];
	const timeHideGan = bazi.getTimeHideGan() || [];
	
	// 获取日主对应的十神映射表
	const tianganMap = config.tiangan as { [key: string]: { [key: string]: string } };
	const getShiShen = (gan: string): string => {
		if (!dayGan || !gan) return '';
		return tianganMap[dayGan]?.[gan] || '';
	};
	
	// 1. 得令（月令）：检查月支是否与日主同五行或生助日主
	let deLing = 0; // 0: 失令, 1: 得令, 2: 得生
	const monthZhiWuxing = getZhiWuxing(monthZhi);
	const monthHideGanList = Array.isArray(monthHideGan) ? monthHideGan : [];
	
	// 检查月支本气是否与日主同五行
	if (monthZhiWuxing === dayWuxing) {
		deLing = 1; // 得令
	} else {
		// 检查月支藏干是否有与日主同五行的
		for (const gan of monthHideGanList) {
			if (getGanWuxing(gan) === dayWuxing) {
				deLing = 1; // 得令
				break;
			}
		}
		// 检查月支是否生助日主（印星）
		const shengMap: { [key: string]: string } = {
			'木': '水', '火': '木', '土': '火', '金': '土', '水': '金'
		};
		if (shengMap[dayWuxing] === monthZhiWuxing) {
			deLing = 2; // 得生（印星生助）
		}
	}
	
	// 2. 得地（根气）：检查地支中是否有日主的根气
	let deDi = 0; // 根气数量
	const allZhi = [yearZhi, monthZhi, dayZhi, timeZhi];
	const allHideGan = [yearHideGan, monthHideGan, dayHideGan, timeHideGan];
	
	for (let i = 0; i < allZhi.length; i++) {
		const zhi = allZhi[i];
		const hideGan = allHideGan[i];
		const hideGanList = Array.isArray(hideGan) ? hideGan : [];
		
		// 检查地支本气
		if (getZhiWuxing(zhi) === dayWuxing) {
			deDi += 1; // 本气根
		}
		// 检查藏干
		for (const gan of hideGanList) {
			if (getGanWuxing(gan) === dayWuxing) {
				deDi += 0.5; // 中气或余气根
			}
		}
	}
	
	// 3. 得势（比劫）：统计比肩、劫财的数量
	let deShi = 0; // 比劫数量
	const allGan = [yearGan, monthGan, dayGan, timeGan];
	
	for (const gan of allGan) {
		const shishen = getShiShen(gan);
		if (shishen === '比肩' || shishen === '劫财') {
			deShi += 1;
		}
	}
	
	// 统计地支藏干中的比劫
	for (const hideGanList of allHideGan) {
		const hideGanArray = Array.isArray(hideGanList) ? hideGanList : [];
		for (const gan of hideGanArray) {
			const shishen = getShiShen(gan);
			if (shishen === '比肩' || shishen === '劫财') {
				deShi += 0.5; // 藏干中的比劫权重较低
			}
		}
	}
	
	// 4. 得生（印星）：统计正印、偏印的数量
	let deSheng = 0; // 印星数量
	
	for (const gan of allGan) {
		const shishen = getShiShen(gan);
		if (shishen === '正印' || shishen === '偏印') {
			deSheng += 1;
		}
	}
	
	// 统计地支藏干中的印星
	for (const hideGanList of allHideGan) {
		const hideGanArray = Array.isArray(hideGanList) ? hideGanList : [];
		for (const gan of hideGanArray) {
			const shishen = getShiShen(gan);
			if (shishen === '正印' || shishen === '偏印') {
				deSheng += 0.5;
			}
		}
	}
	
	// 5. 统计克泄耗（官杀、财星、食伤）
	let keXieHao = 0; // 克泄耗数量
	
	for (const gan of allGan) {
		const shishen = getShiShen(gan);
		if (shishen === '正官' || shishen === '七杀' || 
			shishen === '正财' || shishen === '偏财' ||
			shishen === '食神' || shishen === '伤官') {
			keXieHao += 1;
		}
	}
	
	// 统计地支藏干中的克泄耗
	for (const hideGanList of allHideGan) {
		const hideGanArray = Array.isArray(hideGanList) ? hideGanList : [];
		for (const gan of hideGanArray) {
			const shishen = getShiShen(gan);
			if (shishen === '正官' || shishen === '七杀' || 
				shishen === '正财' || shishen === '偏财' ||
				shishen === '食神' || shishen === '伤官') {
				keXieHao += 0.5;
			}
		}
	}
	
	// 综合评分
	let score = 0;
	
	// 得令权重最高（3分）
	if (deLing === 1) {
		score += 3; // 得令
	} else if (deLing === 2) {
		score += 1.5; // 得生（印星生助）
	}
	
	// 得地（根气）权重较高（2分）
	score += Math.min(deDi, 2); // 最多2分
	
	// 得势（比劫）权重中等（1.5分）
	score += Math.min(deShi * 0.5, 1.5); // 最多1.5分
	
	// 得生（印星）权重中等（1分）
	score += Math.min(deSheng * 0.3, 1); // 最多1分
	
	// 克泄耗减分（最多减2分）
	score -= Math.min(keXieHao * 0.2, 2);
	
	// 判断强弱
	let level = '中';
	let description = '';
	const evidence: string[] = [];
	
	if (score >= 4) {
		level = '强';
		if (deLing === 1) evidence.push('得令');
		if (deDi >= 1) evidence.push(`得地（${deDi.toFixed(1)}个根气）`);
		if (deShi >= 1) evidence.push(`得势（${deShi.toFixed(1)}个比劫）`);
		if (deSheng >= 1) evidence.push(`得生（${deSheng.toFixed(1)}个印星）`);
		description = `日主${dayGan}(${dayWuxing})身强。依据：${evidence.join('、')}。`;
	} else if (score >= 2.5) {
		level = '中强';
		if (deLing === 1) evidence.push('得令');
		if (deDi >= 0.5) evidence.push(`得地（${deDi.toFixed(1)}个根气）`);
		if (deShi >= 0.5) evidence.push(`得势（${deShi.toFixed(1)}个比劫）`);
		description = `日主${dayGan}(${dayWuxing})身中强。依据：${evidence.join('、') || '综合判断'}。`;
	} else if (score >= 1) {
		level = '中';
		description = `日主${dayGan}(${dayWuxing})身中和。依据：得令/得地/得势/得生/克泄耗综合平衡。`;
	} else if (score >= -1) {
		level = '弱';
		if (deLing === 0) evidence.push('失令');
		if (deDi < 0.5) evidence.push('失地（根气不足）');
		if (keXieHao >= 2) evidence.push(`克泄耗多（${keXieHao.toFixed(1)}个）`);
		description = `日主${dayGan}(${dayWuxing})身弱。依据：${evidence.join('、')}。`;
	} else {
		level = '极弱';
		if (deLing === 0) evidence.push('失令');
		if (deDi < 0.5) evidence.push('失地（根气不足）');
		if (keXieHao >= 3) evidence.push(`克泄耗多（${keXieHao.toFixed(1)}个）`);
		if (deShi < 0.5 && deSheng < 0.5) evidence.push('无助无生');
		description = `日主${dayGan}(${dayWuxing})身极弱。依据：${evidence.join('、')}。需考虑从格。`;
	}
	
	return { level, description };
}

/**
 * 建议用神（简化版）
 */
function calculateYongShen(rizhuQiangruo: BaziEnhancedData['rizhuQiangruo']): BaziEnhancedData['yongshen'] {
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

	result.rizhuQiangruo = calculateRizhuQiangruo(bazi);
	result.yongshen = calculateYongShen(result.rizhuQiangruo);
	result.ganzhiRelations = calculateOriginalGanZhiRelations(bazi);

	return result;
}

/**
 * 天干地支关系接口
 */
export interface GanZhiRelation {
	// 天干合化
	ganHe?: string; // 如 "甲己合化土"
	// 天干相冲（严格按照 bz.js 的 liuyi 数组）
	ganChong?: string[]; // 如 ["甲庚冲"]
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
	// 地支相破（严格按照 bz.js 的 liuyi 数组）
	zhiPo?: string[]; // 如 ["子酉破"]
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
 * 天干相冲映射（严格按照 bz.js 的 liuyi 数组）
 */
const GAN_CHONG_MAP: { [key: string]: boolean } = {
	'甲庚': true,
	'庚甲': true,
	'乙辛': true,
	'辛乙': true,
	'丙壬': true,
	'壬丙': true,
	'丁癸': true,
	'癸丁': true
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
 * 地支相害映射（严格按照 bz.js 的 liuyi 数组）
 * 注意：bz.js 中写的是"酉戍"，但应该是"酉戌"（可能是错字）
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
 * 地支相破映射（严格按照 bz.js 的 liuyi 数组）
 * bz.js: 子酉相破、寅亥相破、卯午相破、辰丑相破、巳申相破、未戌相破
 */
const ZHI_PO_MAP: { [key: string]: string } = {
	'子': '酉',
	'酉': '子',
	'寅': '亥',
	'亥': '寅',
	'卯': '午',
	'午': '卯',
	'辰': '丑',
	'丑': '辰',
	'巳': '申',
	'申': '巳',
	'未': '戌',
	'戌': '未'
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

const ZHI_SAN_HE_GROUPS = [
	{ members: ['申', '子', '辰'], wuxing: '水' },
	{ members: ['亥', '卯', '未'], wuxing: '木' },
	{ members: ['寅', '午', '戌'], wuxing: '火' },
	{ members: ['巳', '酉', '丑'], wuxing: '金' }
];

/**
 * 地支暗合映射（严格按照 bz.js 的 liuyi 数组）
 * bz.js: 寅午暗合土、子巳暗合火、巳酉暗合水、卯申暗合金、亥午暗合木
 */
const ZHI_AN_HE_PAIRS: Record<string, string> = {
	'寅午': '暗合土',
	'午寅': '暗合土',
	'子巳': '暗合火',
	'巳子': '暗合火',
	'巳酉': '暗合水',
	'酉巳': '暗合水',
	'卯申': '暗合金',
	'申卯': '暗合金',
	'亥午': '暗合木',
	'午亥': '暗合木'
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
 * 检查天干相冲（严格按照 bz.js 的 liuyi 数组）
 */
function checkGanChong(gan1: string, gan2: string): boolean {
	const key1 = gan1 + gan2;
	const key2 = gan2 + gan1;
	return GAN_CHONG_MAP[key1] === true || GAN_CHONG_MAP[key2] === true;
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
 * 检查地支半合（同属三合局任意两支）
 */
function checkZhiBanHe(zhi1: string, zhi2: string): string | null {
	for (const group of ZHI_SAN_HE_GROUPS) {
		if (group.members.includes(zhi1) && group.members.includes(zhi2)) {
			return `${zhi1}${zhi2}半合${group.wuxing}`;
		}
	}
	return null;
}

/**
 * 检查地支暗合（按固定暗合对）
 */
function checkZhiAnHe(zhi1: string, zhi2: string): string | null {
	const key1 = zhi1 + zhi2;
	const key2 = zhi2 + zhi1;
	if (ZHI_AN_HE_PAIRS[key1]) return `${zhi1}${zhi2}${ZHI_AN_HE_PAIRS[key1]}`;
	if (ZHI_AN_HE_PAIRS[key2]) return `${zhi2}${zhi1}${ZHI_AN_HE_PAIRS[key2]}`;
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
 * 检查地支相破（严格按照 bz.js 的 liuyi 数组）
 */
function checkZhiPo(zhi1: string, zhi2: string): boolean {
	return ZHI_PO_MAP[zhi1] === zhi2 || ZHI_PO_MAP[zhi2] === zhi1;
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
		
		// 检查天干相冲（严格按照 bz.js 的 liuyi 数组）
		if (checkGanChong(gan, origGan)) {
			const chong = `${gan}${origGan}冲`;
			if (!relations.ganChong?.includes(chong)) {
				if (!relations.ganChong) relations.ganChong = [];
				relations.ganChong.push(chong);
			}
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
		
		// 检查地支相破（严格按照 bz.js 的 liuyi 数组）
		if (checkZhiPo(zhi, origZhi)) {
			const po = `${zhi}${origZhi}破`;
			if (!relations.zhiPo?.includes(po)) {
				if (!relations.zhiPo) relations.zhiPo = [];
				relations.zhiPo.push(po);
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
		ganChong: [],
		zhiHe: [],
		chong: [],
		hai: [],
		zhiPo: []
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

	// 4.5. 检查天干相冲（严格按照 bz.js 的 liuyi 数组）
	if (gans.length >= 2) {
		const foundGanChong = new Set<string>();
		for (let i = 0; i < gans.length; i++) {
			for (let j = i + 1; j < gans.length; j++) {
				if (checkGanChong(gans[i], gans[j])) {
					const chong = `${gans[i]}${gans[j]}冲`;
					if (!foundGanChong.has(chong)) {
						foundGanChong.add(chong);
						relations.ganChong!.push(chong);
					}
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

	// 8. 检查破（严格按照 bz.js 的 liuyi 数组）
	if (zhis.length >= 2) {
		const foundPo = new Set<string>();
		for (let i = 0; i < zhis.length; i++) {
			for (let j = i + 1; j < zhis.length; j++) {
				if (checkZhiPo(zhis[i], zhis[j])) {
					const po = `${zhis[i]}${zhis[j]}破`;
					if (!foundPo.has(po)) {
						foundPo.add(po);
						relations.zhiPo!.push(po);
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
			ganChong: [],
			zhiHe: [],
			chong: [],
			hai: [],
			zhiPo: []
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
 * 构建干支关系图数据（节点 + 边），用于智能图示
 */
export function buildGanZhiDiagram(ganzhiList: string[], labels: string[] = [], options: { showKe?: boolean } = { showKe: true }): GanZhiDiagramData {
	const nodes: GanZhiDiagramNode[] = [];
	const ganEdges: GanZhiDiagramEdge[] = [];
	const zhiEdges: GanZhiDiagramEdge[] = [];

	const validList = (ganzhiList || []).filter(gz => gz && gz.length >= 2);
	validList.forEach((gz, idx) => {
		nodes.push({
			index: idx,
			label: labels[idx] || `节点${idx + 1}`,
			gan: gz[0],
			zhi: gz[1],
			key: gz
		});
	});

	const edgeSeen = new Set<string>();
	const addEdge = (collection: GanZhiDiagramEdge[], from: number, to: number, type: string, label: string) => {
		const key = `${Math.min(from, to)}-${Math.max(from, to)}-${type}-${label}`;
		if (edgeSeen.has(key)) return;
		edgeSeen.add(key);
		collection.push({ from, to, type, label });
	};

	// 天干合 & 克
	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const rel = checkGanHe(nodes[i].gan, nodes[j].gan);
			if (rel) {
				addEdge(ganEdges, i, j, 'ganHe', rel.substring(2));
			}
			// 天干相冲（严格按照 bz.js 的 liuyi 数组）
			if (checkGanChong(nodes[i].gan, nodes[j].gan)) {
				addEdge(ganEdges, i, j, 'ganChong', '冲');
			}
			// 天干克：按五行克制关系生成（方向只按克表，不会出现反向如"木克金"）
			// 大运、流年、流月不显示克关系
			const isTimeNode = (label: string) => ['大运', '流年', '流月'].some(t => label && label.includes(t));
			if (options.showKe && !isTimeNode(nodes[i].label) && !isTimeNode(nodes[j].label)) {
				const ganWx1 = getGanWuxing(nodes[i].gan);
				const ganWx2 = getGanWuxing(nodes[j].gan);
				const ganKeLabel =
					WUXING_KE[ganWx1] === ganWx2 || WUXING_KE[ganWx2] === ganWx1
						? '克'
						: null;
				if (ganKeLabel) {
					addEdge(ganEdges, i, j, 'ganKe', ganKeLabel);
				}
			}
		}
	}

	// 地支关系：三合/三会（三个节点之间全部连线）、六合、冲、刑、害
	for (let i = 0; i < nodes.length - 2; i++) {
		for (let j = i + 1; j < nodes.length - 1; j++) {
			for (let k = j + 1; k < nodes.length; k++) {
				const zhis = [nodes[i].zhi, nodes[j].zhi, nodes[k].zhi];
				const sanHe = checkZhiSanHe(zhis);
				if (sanHe) {
					const label = sanHe.substring(3);
					addEdge(zhiEdges, i, j, 'sanHe', label);
					addEdge(zhiEdges, i, k, 'sanHe', label);
					addEdge(zhiEdges, j, k, 'sanHe', label);
				}
				const sanHui = checkZhiSanHui(zhis);
				if (sanHui) {
					const label = sanHui.substring(3);
					addEdge(zhiEdges, i, j, 'sanHui', label);
					addEdge(zhiEdges, i, k, 'sanHui', label);
					addEdge(zhiEdges, j, k, 'sanHui', label);
				}
			}
		}
	}

	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const zhi1 = nodes[i].zhi;
			const zhi2 = nodes[j].zhi;

			const he = checkZhiLiuHe(zhi1, zhi2);
			if (he) addEdge(zhiEdges, i, j, 'zhiHe', he.substring(2));
			const banHe = checkZhiBanHe(zhi1, zhi2);
			if (banHe) addEdge(zhiEdges, i, j, 'banHe', banHe.substring(2));
			const anHe = checkZhiAnHe(zhi1, zhi2);
			if (anHe) addEdge(zhiEdges, i, j, 'anHe', anHe.substring(2));

			if (checkZhiLiuChong(zhi1, zhi2)) addEdge(zhiEdges, i, j, 'chong', '冲');
			if (checkZhiXing(zhi1, zhi2)) addEdge(zhiEdges, i, j, 'xing', '刑');
			if (checkZhiHai(zhi1, zhi2)) addEdge(zhiEdges, i, j, 'hai', '害');
			// 地支相破（严格按照 bz.js 的 liuyi 数组）
			if (checkZhiPo(zhi1, zhi2)) addEdge(zhiEdges, i, j, 'po', '破');
			// 地支克：按五行克制关系生成
			// 大运、流年、流月不显示克关系
			const isTimeNode = (label: string) => ['大运', '流年', '流月'].some(t => label && label.includes(t));
			if (options.showKe && !isTimeNode(nodes[i].label) && !isTimeNode(nodes[j].label)) {
				const zhiWx1 = getZhiWuxing(zhi1);
				const zhiWx2 = getZhiWuxing(zhi2);
				const zhiKeLabel =
					WUXING_KE[zhiWx1] === zhiWx2 || WUXING_KE[zhiWx2] === zhiWx1
						? '克'
						: null;
				if (zhiKeLabel) {
					addEdge(zhiEdges, i, j, 'zhiKe', zhiKeLabel);
				}
			}
		}
	}

	return { nodes, ganEdges, zhiEdges };
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
	calculateKongWangForGanZhi,
	calculateGeJu,
	calculateWuxingWangshuai,
	calculateRizhuQiangruo,
	calculateYongShen,
	calculateGanZhiRelations,
	calculateGanZhiRelationsForList,
	getHideGanForGanZhi,
	getFuXingForGanZhi,
	getDiShiForGanZhi,
	buildGanZhiDiagram
};
