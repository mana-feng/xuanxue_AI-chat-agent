// 使用 lunar-javascript 计算日干支与旬空（移植自根目�?liuyao/utils/dateNajia.js�?
import { Solar } from 'lunar-javascript';

/**
 * 计算日期对应的干支、旬空等信息
 */
export function computeDaily(date: Date) {
	if (!(date instanceof Date)) {
		throw new Error('computeDaily 需要传入有效的 Date 对象');
	}

	const solar = Solar.fromDate(date);
	const lunar = solar.getLunar();
	const bazi = lunar.getEightChar();

	let xkong = '';
	const lunarAny = lunar;
	if (typeof (lunarAny as any).getDayXunKong === 'function') {
		xkong = (lunarAny as any).getDayXunKong();
	} else {
		const dayGz = bazi.getDay();
		xkong = calculateXunKong(dayGz);
	}

	return {
		xkong,
		gz: {
			year: bazi.getYear(),
			month: bazi.getMonth(),
			day: bazi.getDay(),
			hour: bazi.getTime()
		}
	};
}

/**
 * 备用：根据日柱计算旬�? */
function calculateXunKong(dayGz: string) {
	if (!dayGz || dayGz.length < 2) return '';

	const JIAZI_60 = [
		'甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
		'甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
		'甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
		'甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
		'甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
		'甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
	];

	const XUN_KONG: Record<string, string> = {
		'甲子': '戌亥',
		'甲戌': '申酉',
		'甲申': '午未',
		'甲午': '辰巳',
		'甲辰': '寅卯',
		'甲寅': '子丑'
	};

	const idx = JIAZI_60.indexOf(dayGz);
	if (idx === -1) return '';

	const xunStartIdx = Math.floor(idx / 10) * 10;
	const xunStart = JIAZI_60[xunStartIdx];
	return XUN_KONG[xunStart] || '';
}
