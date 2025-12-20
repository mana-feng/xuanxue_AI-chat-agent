import guaciRaw from './data/guaci.json';

export const SHENX = ['比肩', '劫财', '偏印', '正印', '偏官', '正官', '偏财', '正财', '食神', '伤官'];
export const SHEN6 = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
export const QING6 = ['兄弟', '父母', '官鬼', '妻财', '子孙'];
export const XING5 = ['木', '火', '土', '金', '水'];

export const NAJIA = [
	['甲子寅辰', '壬午申戌'],
	['丁巳卯丑', '丁亥酉未'],
	['己卯丑亥', '己酉未巳'],
	['庚子寅辰', '庚午申戌'],
	['辛丑亥酉', '辛未巳卯'],
	['戊寅辰午', '戊申戌子'],
	['丙辰午申', '丙戌子寅'],
	['乙未巳卯', '癸丑亥酉']
];

export const TRIGRAM_LABEL: Record<string, { name: string; element: string }> = {
	'111': { name: '乾', element: '天' },
	'110': { name: '巽', element: '风' },
	'101': { name: '离', element: '火' },
	'100': { name: '艮', element: '山' },
	'011': { name: '兑', element: '泽' },
	'010': { name: '坎', element: '水' },
	'001': { name: '震', element: '雷' },
	'000': { name: '坤', element: '地' }
};

export const YAOS = ['111', '110', '101', '100', '011', '010', '001', '000'];
export const GUAS = YAOS.map(code => TRIGRAM_LABEL[code].name);
export const GUA5 = GUAS.map(name => {
	switch (name) {
		case '乾':
		case '兑':
			return 3;
		case '离':
			return 1;
		case '坎':
			return 4;
		case '艮':
		case '坤':
			return 2;
		case '巽':
		case '震':
		default:
			return 0;
	}
});

// Build GUA64 mapping robustly whether guaci is an object (by mark) or an array
export const GUA64 = (() => {
	const result: Record<string, string> = {};
	// generate all 64 marks from YAOS (8 trigram codes)
	const trigramCodes = Object.keys(TRIGRAM_LABEL);
	for (let i = 0; i < trigramCodes.length; i++) {
		for (let j = 0; j < trigramCodes.length; j++) {
			const upper = trigramCodes[i];
			const lower = trigramCodes[j];
			const mark = `${upper}${lower}`;
			const upperLabel = TRIGRAM_LABEL[upper];
			const lowerLabel = TRIGRAM_LABEL[lower];
			// try to get hexagram name from guaciRaw if possible
			let hexName = '';
			if (!Array.isArray(guaciRaw)) {
				hexName = (guaciRaw as Record<string, any>)[mark]?.name || '';
			} else {
				// if array, try to find an entry whose zhuguaName contains the upper or lower trigram name
				const arr = guaciRaw as any[];
				const found = arr.find(
					(e: any) =>
						(e?.zhuguaName && e.zhuguaName.indexOf(upperLabel.name) !== -1 && e.zhuguaName.indexOf(lowerLabel.name) !== -1) ||
						(e?.zhuguaName && e.zhuguaName.indexOf(upperLabel.name) !== -1 && upper === lower)
				);
				hexName = (found && (found.zhuguaName || found.name)) || '';
			}
			const display = upper === lower ? `${upperLabel.element}为${hexName || upperLabel.name}` : `${upperLabel.element}${lowerLabel.element}${hexName || ''}`.trim();
			result[mark] = display;
		}
	}
	return result;
})();

export const GANS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const ZHIS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ZHI5 = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
export const KONG = ['子丑', '寅卯', '辰巳', '午未', '申酉', '戌亥'];

// 六冲卦
export const CHONG: string[] = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤', '大壮', '无妄'];
// 六合卦
export const LIUHE = ['否', '困', '旅', '豫', '节', '贲', '复', '泰'];

export const SYMBOL = ['━　━', '━━━━', '━　━', '○', '×'];
