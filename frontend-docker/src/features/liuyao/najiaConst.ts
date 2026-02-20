import guaciRaw from './data/guaci.json';

export const SHENX = ['比肩', '劫财', '偏印', '正印', '偏官', '正官', '偏财', '正财', '食神', '伤官'];
export const SHEN6 = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
export const QING6 = ['兄弟', '父母', '官鬼', '妻财', '子孙'];
export const XING5 = ['木', '火', '土', '金', '水'];

export const NAJIA = [
	['甲子寅辰', '壬午申戌'], // 乾
	['辛丑亥酉', '辛未巳卯'], // 巽
	['己卯丑亥', '己酉未巳'], // 离
	['丙辰午申', '丙戌子寅'], // 艮
	['丁巳卯丑', '丁亥酉未'], // 兑
	['戊寅辰午', '戊申戌子'], // 坎
	['庚子寅辰', '庚午申戌'], // 震
	['乙未巳卯', '癸丑亥酉']  // 坤
];

export const TRIGRAM_LABEL: Record<string, { name: string; element: string }> = {
	'111': { name: '乾', element: '天' },
	'011': { name: '巽', element: '风' }, // 自下而上：初阴二阳三阳
	'101': { name: '离', element: '火' },
	'001': { name: '艮', element: '山' }, // 自下而上：初阴二阴三阳
	'110': { name: '兑', element: '泽' }, // 自下而上：初阳二阳三阴
	'010': { name: '坎', element: '水' },
	'100': { name: '震', element: '雷' }, // 自下而上：初阳二阴三阴
	'000': { name: '坤', element: '地' }
};

export const YAOS = ['111', '011', '101', '001', '110', '010', '100', '000'];
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

// 使用 guaci.json 中的卦名，保证与结果页一致
export const GUA64 = (() => {
	const result: Record<string, string> = {};
	const trigramCodes = Object.keys(TRIGRAM_LABEL);

	// 如果 guaciRaw 是数组，先用 code 建立直接映射 mark -> 卦名
	const codeNameMap: Record<string, string> = {};
	if (Array.isArray(guaciRaw)) {
		(guaciRaw as any[]).forEach((entry: any) => {
			// guaci.json 中的 code 是 [上, 五, 四, 三, 二, 初] (自上而下)
			// 我们需要转换为 [初, 二, 三, 四, 五, 上] (自下而上)
			if (Array.isArray(entry?.code) && entry.code.length === 6) {
				const mark = entry.code.slice().reverse().map((n: any) => String(n)).join('');
				const name = entry.zhuguaName || entry.name || '';
				if (mark) codeNameMap[mark] = name;
			} else if (typeof entry?.code === 'string' && entry.code.length === 6) {
				const mark = entry.code.split('').reverse().join('');
				const name = entry.zhuguaName || entry.name || '';
				codeNameMap[mark] = name;
			}
		});
	}

	for (let i = 0; i < trigramCodes.length; i++) {
		for (let j = 0; j < trigramCodes.length; j++) {
			const upper = trigramCodes[i];
			const lower = trigramCodes[j];
			// mark 采用自下而上的顺序：下卦在前，上卦在后
			// 此时 upper 和 lower 已经是自下而上的字符串了，直接拼接即可
			const mark = `${lower}${upper}`;
			let hexName = '';

			if (codeNameMap[mark]) {
				hexName = codeNameMap[mark];
			} else if (!Array.isArray(guaciRaw)) {
				// 兼容对象格式的 guaciRaw（如果有）
				hexName =
					(guaciRaw as Record<string, any>)[mark]?.name ||
					(guaciRaw as Record<string, any>)[mark]?.zhuguaName ||
					'';
			}

			if (!hexName && Array.isArray(guaciRaw)) {
				const upperLabel = TRIGRAM_LABEL[upper];
				const lowerLabel = TRIGRAM_LABEL[lower];
				const arr = guaciRaw as any[];
				const found = arr.find((e: any) => {
					const n = (e?.zhuguaName || e?.name || '').replace(/\s+/g, '');
					return n.includes(upperLabel.name) && n.includes(lowerLabel.name);
				});
				hexName = (found && (found.zhuguaName || found.name)) || '';
			}

			if (!hexName) {
				const upperLabel = TRIGRAM_LABEL[upper];
				const lowerLabel = TRIGRAM_LABEL[lower];
				hexName = upper === lower ? upperLabel.name : `${upperLabel.name}${lowerLabel.name}`;
			}

			result[mark] = hexName;
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
