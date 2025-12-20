// @ts-nocheck
// 六爻排盘核心逻辑（完整实现，移植自 najia-master）
import {
	SHEN6,
	QING6,
	XING5,
	NAJIA,
	GUA64,
	GUAS,
	GUA5,
	YAOS,
	GANS,
	ZHIS,
	ZHI5,
	CHONG,
	LIUHE,
	SYMBOL,
	KONG
} from './najiaConst';
import { computeDaily } from './dateNajia';
import { getGuaci, getGuaName, getGuaciEntry } from './guaci';

const TRIGRAM_MAP: Record<string, string> = {
	'111': '乾',
	'110': '巽',
	'101': '离',
	'100': '艮',
	'011': '兑',
	'010': '坎',
	'001': '震',
	'000': '坤'
};

/**
 * 干支五行
 */
export function gz5x(gz: string): string {
	if (!gz || gz.length < 2) return gz;
	const z = gz[1];
	const zm = ZHIS.indexOf(z);
	if (zm === -1) return gz;
	return gz + XING5[ZHI5[zm]];
}

/**
 * 计算旬空
 * @param gz 干支字符串（如 '甲子'）或 [天干索引, 地支索引]
 * @returns 旬空地支对（如 '戌亥'）
 */
export function xkong(gz: string | [number, number]): string {
	let gm: number;
	let zm: number;

	if (typeof gz === 'string') {
		if (gz.length < 2) return '';
		gm = GANS.indexOf(gz[0]);
		zm = ZHIS.indexOf(gz[1]);
		if (gm === -1 || zm === -1) return '';
	} else {
		[gm, zm] = gz;
	}

	if (gm === zm || zm < gm) {
		zm += 12;
	}

	const xk = Math.floor((zm - gm) / 2) - 1;
	if (xk < 0 || xk >= KONG.length) return '';
	return KONG[xk];
}

/**
 * 构建显示数据
 */
export function buildDisplayData(compiled: any) {
	if (!compiled) {
		throw new Error('buildDisplayData: compiled data is required');
	}

	const rows: any = { ...compiled };
	const symbol = SYMBOL;
	const empty = '\u3000'.repeat(6);

	// 动爻标识
	rows.dong = rows.dong || [];
	rows.params = rows.params || [];
	rows.dyao = rows.params.map((x: number) => ([3, 4].includes(x) ? symbol[x] : ''));

	// 主卦信息
	rows.mark = rows.mark || '';
	rows.main = {
		mark: rows.mark.split('').map((x: string) => symbol[parseInt(x, 10)] || ''),
		type: rows.type || '',
		gong: rows.gong || '',
		name: rows.name || '',
		indent: '\u3000'.repeat(2)
	};

	// 伏神处理
	if (rows.hide && rows.hide.seat && rows.hide.seat.length > 0) {
		const hideQin6: string[] = [];
		for (let i = 0; i < 6; i++) {
			if (rows.hide.seat.includes(i)) {
				hideQin6.push(` ${rows.hide.qin6[i]}${rows.hide.qinx[i]} `);
			} else {
				hideQin6.push(empty);
			}
		}
		rows.hide.qin6 = hideQin6;
		rows.main.indent += empty;
	} else {
		rows.hide = { qin6: Array(6).fill('  '), seat: [] };
		rows.main.indent += '\u3000';
	}

	// 主卦显示
	rows.main.display = `${rows.main.indent}${rows.main.name} (${rows.main.gong}-${rows.main.type})`;

	// 变卦处理
	if (rows.bian) {
		const hideLen = rows.hide && rows.hide.seat && rows.hide.seat.length > 0 ? 19 : 8;
		rows.bian.type = getType(rows.bian.mark || '');
		rows.bian.indent = Math.max(0, hideLen - rows.main.display.length) * '\u3000';

		if (rows.bian.qin6 && rows.bian.qin6.length > 0) {
			rows.bian.qinx = rows.bian.qinx || Array(6).fill('');
			rows.bian.qin6 = rows.bian.qin6.map((q: string, x: number) => {
				const qinx = rows.bian.qinx[x] || '';
				if (rows.dong && rows.dong.includes(x)) {
					return `${q}${qinx}`;
				} else {
					return `  ${q}${qinx}`;
				}
			});
		}

		if (rows.bian.mark && typeof rows.bian.mark === 'string') {
			rows.bian.mark = rows.bian.mark.split('').map((x: string) => symbol[parseInt(x, 10)]);
		}
	} else {
		rows.bian = {
			qin6: Array(6).fill(' '),
			mark: Array(6).fill(' ')
		};
	}

	// 世应显示
	const shiyDisplay: string[] = [];
	if (rows.shiy && Array.isArray(rows.shiy) && rows.shiy.length >= 2) {
		for (let x = 0; x < 6; x++) {
			if (x === rows.shiy[0] - 1) {
				shiyDisplay.push('世');
			} else if (x === rows.shiy[1] - 1) {
				shiyDisplay.push('应');
			} else {
				shiyDisplay.push('  ');
			}
		}
	} else {
		shiyDisplay.push(...Array(6).fill('  '));
	}
	rows.shiyDisplay = shiyDisplay;

	// 确保数组长度
	rows.qin6 = rows.qin6 || Array(6).fill('');
	rows.qinx = rows.qinx || Array(6).fill('');
	rows.god6 = rows.god6 || Array(6).fill('');

	return rows;
}

/**
 * 将参数数组转换为二进制卦码
 */
function toMark(params: number[]): string {
	return params.map(p => (p % 2).toString()).join('');
}

/**
 * 编译纳甲六爻排盘
 * @param params 六个爻的参数数组（0=阴静, 1=阳静, 3=阴动, 4=阳动）
 * @param options 选项
 * @returns 编译后的卦数据
 */
export function compileNajia(params: number[], options: any = {}) {
	const gender = options.gender || '';
	const guaci = options.guaci || false;
	const title = options.title || '';

	const date = options.date || new Date();
	const lunarInfo = computeDaily(date);

	// 卦码（自下而上）
	const mark = toMark(params);
	const finalDayGz = options.dayGz || lunarInfo.gz.day;
	const solar = options.solar || date;
	const lunar = lunarInfo;

	// 世应爻
	const shiy = setShiYao(mark);

	// 卦宫
	const gongIndex = palace(mark, shiy[0]);
	const gong = GUAS[gongIndex];

	// 卦名
	const name = GUA64[mark] || getGuaName(mark) || '';

	// 纳甲
	const najia = getNaja(mark);

	// 六亲
	const qin6 = najia.map(x => {
		const zIdx = ZHIS.indexOf(x[1]);
		if (zIdx === -1) return '';
		return getQin6(XING5[GUA5[gongIndex]], ZHI5[zIdx]);
	});

	// 干支五行
	const qinx = najia.map(x => gz5x(x));

	// 六神
	const god6 = getGod6(finalDayGz);

	// 动爻位置（从0开始）
	const dong = params.map((x, i) => (x > 2 ? i : -1)).filter(i => i >= 0);

	// 伏神
	const hide = calcHidden(gongIndex, qin6);

	// 变卦
	const bian = calcTransform(params, gongIndex);

	// 卦类型
	const type = getType(mark);

	let guaciEntry = null;
	if (guaci) {
		try {
			if (typeof getGuaciEntry !== 'undefined') {
				guaciEntry = getGuaciEntry(name) || getGuaciEntry(mark) || null;
			}
		} catch (err) {
			// ignore runtime lookup errors
		}
		// fallback to plain string lookup if entry not available
		if (!guaciEntry) {
			try {
				const text = (typeof getGuaci !== 'undefined') ? (getGuaci(name) || getGuaci(mark) || '') : '';
				guaciEntry = { guaci: text, text: text };
			} catch (err) {
				guaciEntry = { guaci: '', text: '' };
			}
		}
	}

	return {
		params,
		gender,
		title,
		dayGz: finalDayGz,
		solar,
		lunar,
		god6,
		dong,
		name,
		mark,
		gong,
		gongIndex,
		shiy,
		qin6,
		qinx,
		bian,
		hide,
		type,
		guaci: guaci ? (guaciEntry?.text || guaciEntry?.guaci || '') : '',
		guaciEntry: guaciEntry
	};
}

/**
 * 寻世诀：天同二世天变五，地同四世地变初。本宫六世三世异，人同游魂人变归。
 * 获取世爻、应爻和所在卦宫位置
 * @param symbol 卦的二进制码（自下而上，如 '111000'）
 * @returns [世爻, 应爻, 所在卦宫位置] 世爻从1开始（初爻为1）
 */
export function setShiYao(symbol: string): [number, number, number] {
	if (symbol == null) symbol = '';
	if (typeof symbol !== 'string') symbol = String(symbol);
	const wai = symbol.slice(3); // 外卦（上卦）
	const nei = symbol.slice(0, 3); // 内卦（下卦）

	function shiy(shi: number, index?: number): [number, number, number] {
		const ying = shi > 3 ? shi - 3 : shi + 3;
		const idx = index !== undefined ? index : shi;
		return [shi, ying, idx];
	}

	// 天同二世天变五
	if (wai[2] === nei[2]) {
		if (wai[1] !== nei[1] && wai[0] !== nei[0]) {
			return shiy(2);
		}
	} else {
		if (wai[1] === nei[1] && wai[0] === nei[0]) {
			return shiy(5);
		}
	}

	// 人同游魂人变归
	if (wai[1] === nei[1]) {
		if (wai[0] !== nei[0] && wai[2] !== nei[2]) {
			return shiy(4, 6); // 游魂
		}
	} else {
		// fix 归魂问题
		if (wai[0] === nei[0] && wai[2] === nei[2]) {
			return shiy(3, 6); // 归魂
		}
	}

	// 地同四世地变初
	if (wai[0] === nei[0]) {
		if (wai[1] !== nei[1] && wai[2] !== nei[2]) {
			return shiy(4);
		}
	} else {
		if (wai[1] === nei[1] && wai[2] === nei[2]) {
			return shiy(1);
		}
	}

	// 本宫六世
	if (wai === nei) {
		return shiy(6);
	}

	// 三世异
	return shiy(3);
}

/**
 * 认宫诀：一二三六外卦宫，四五游魂内变更。若问归魂何所取，归魂内卦是本宫。
 * 六爻卦的卦宫名
 * @param symbol 卦的二进制码
 * @param index 世爻（从1开始）
 * @returns 卦宫索引（0-7）
 */
export function palace(symbol: string, index: number): number {
	if (symbol == null) symbol = '';
	if (typeof symbol !== 'string') symbol = String(symbol);
	const wai = symbol.slice(3); // 外卦
	const nei = symbol.slice(0, 3); // 内卦
	let hun = '';

	// 判断游魂归魂
	if (wai[1] === nei[1]) {
		if (wai[0] !== nei[0] && wai[2] !== nei[2]) {
			hun = '游魂';
		}
	} else {
		if (wai[0] === nei[0] && wai[2] === nei[2]) {
			hun = '归魂';
		}
	}

	// 归魂内卦是本宫
	if (hun === '归魂') {
		return YAOS.indexOf(nei);
	}

	// 一二三六外卦宫
	if ([1, 2, 3, 6].includes(index)) {
		return YAOS.indexOf(wai);
	}

	// 四五游魂内变更
	if ([4, 5].includes(index) || hun === '游魂') {
		// 内卦取反
		const symbolChanged = nei
			.split('')
			.map(c => (parseInt(c, 10) ^ 1).toString())
			.join('');
		return YAOS.indexOf(symbolChanged);
	}

	return YAOS.indexOf(wai);
}

/**
 * 判断是否六冲卦
 */
function attack(symbol: string): boolean {
	if (symbol == null) symbol = '';
	if (typeof symbol !== 'string') symbol = String(symbol);
	const wai = symbol.slice(3); // 外卦
	const nei = symbol.slice(0, 3); // 内卦

	// 内外卦相同
	if (wai === nei) {
		return true;
	}

	// 天雷无妄 和 雷天大壮
	const gua = [nei, wai];
	const set = new Set(gua);
	if (set.size === 2 && (set.has('100') && set.has('111'))) {
		return true;
	}

	return false;
}

/**
 * 判断是否六合卦
 */
function unite(symbol: string): string | null {
	if (symbol == null) symbol = '';
	if (typeof symbol !== 'string') symbol = String(symbol);
	const name = GUA64[symbol] || '';
	for (const x of LIUHE) {
		if (name.includes(x)) {
			return '六合';
		}
	}
	return null;
}

/**
 * 判断游魂归魂
 */
function soul(symbol: string): string {
	if (symbol == null) symbol = '';
	if (typeof symbol !== 'string') symbol = String(symbol);
	const wai = symbol.slice(3); // 外卦
	const nei = symbol.slice(0, 3); // 内卦
	let hun = '';

	if (wai[1] === nei[1]) {
		if (wai[0] !== nei[0] && wai[2] !== nei[2]) {
			hun = '游魂';
		}
	} else {
		if (wai[0] === nei[0] && wai[2] === nei[2]) {
			hun = '归魂';
		}
	}

	return hun;
}

/**
 * 获取卦类型（游魂、归魂、六冲、六合）
 */
export function getType(symbol: string): string {
	if (symbol == null) symbol = '';
	if (typeof symbol !== 'string') symbol = String(symbol);
	const res = soul(symbol);
	if (res) {
		return res;
	}

	if (attack(symbol)) {
		return '六冲';
	}

	const res2 = unite(symbol);
	if (res2) {
		return res2;
	}

	return '';
}

/**
 * 纳甲配干支
 * @param symbol 卦的二进制码（自下而上）
 * @returns 六个爻的干支数组（自下而上）
 */
export function getNaja(symbol: string): string[] {
	if (symbol == null) symbol = '';
	if (typeof symbol !== 'string') symbol = String(symbol);
	const wai = symbol.slice(3); // 外卦（上卦）
	const nei = symbol.slice(0, 3); // 内卦（下卦）

	const waiIndex = YAOS.indexOf(wai);
	const neiIndex = YAOS.indexOf(nei);

	if (waiIndex === -1 || neiIndex === -1) {
		return [];
	}

	// 内卦纳甲：NAJIA[neiIndex][0] 是字符串，第一个字符是天干，后面是地支
	const neiNajiaStr = NAJIA[neiIndex][0];
	const ganNei = neiNajiaStr[0];
	const ngz: string[] = [];
	// 内卦地支：从第1个字符开始，每2个字符是一个地支（但实际是单个字符）
	// 格式：'甲子寅辰' -> 天干'甲' + 地支'子'、'寅'、'辰'
	for (let i = 1; i < neiNajiaStr.length; i++) {
		ngz.push(ganNei + neiNajiaStr[i]);
	}

	// 外卦纳甲：NAJIA[waiIndex][1] 是字符串
	const waiNajiaStr = NAJIA[waiIndex][1];
	const ganWai = waiNajiaStr[0];
	const wgz: string[] = [];
	for (let i = 1; i < waiNajiaStr.length; i++) {
		wgz.push(ganWai + waiNajiaStr[i]);
	}

	// 自下而上：内卦 + 外卦（外卦倒序）
	return [...ngz, ...wgz.reverse()];
}

/**
 * 两个五行判断六亲
 * 水1 # 木2 # 金3 # 火4 # 土5
 * @param w1 卦宫五行（索引或字符串）
 * @param w2 地支五行（索引或字符串）
 * @returns 六亲名称
 */
export function getQin6(w1: number | string, w2: number | string): string {
	const w1Index = typeof w1 === 'string' ? XING5.indexOf(w1) : w1;
	const w2Index = typeof w2 === 'string' ? XING5.indexOf(w2) : w2;

	if (w1Index === -1 || w2Index === -1) {
		return '';
	}

	const ws = w1Index - w2Index;
	const wsNormalized = ws < 0 ? ws + 5 : ws;
	return QING6[wsNormalized];
}

/**
 * 六神, 根据日干五行配对六神五行
 * 甲乙起青龙 丙丁起朱雀 戊日起勾陈 己日起腾蛇 庚辛起白虎 壬癸起玄武
 * @param daygz 日干支
 * @returns 六神数组（自下而上）
 */
export function getGod6(daygz: string): string[] {
	if (!daygz || daygz.length < 2) {
		return SHEN6.slice();
	}

	const gm = daygz[0];
	const gmIndex = GANS.indexOf(gm);
	if (gmIndex === -1) {
		return SHEN6.slice();
	}

	// 计算起始位置
	let num = Math.ceil((gmIndex + 1) / 2) - 7;

	if (gmIndex === 4) {
		num = -4;
	} else if (gmIndex === 5) {
		num = -3;
	} else if (gmIndex > 5) {
		num += 1;
	}

	// 旋转数组
	const result: string[] = [];
	for (let i = 0; i < 6; i++) {
		const idx = (num + i + 6) % 6;
		result.push(SHEN6[idx]);
	}

	return result;
}

/**
 * 计算伏神卦
 * @param gong 卦宫索引
 * @param qins 当前六亲数组
 * @returns 伏神信息或 null
 */
function calcHidden(gong: number, qins: string[]): any | null {
	if (gong === undefined || gong === null || !qins) {
		return null;
	}

	// 检查六亲是否齐全（至少5种）
	const uniqueQins = new Set(qins);
	if (uniqueQins.size >= 5) {
		return null;
	}

	// 本宫卦的二进制码
	const mark = YAOS[gong] + YAOS[gong];

	// 六亲
	const najia = getNaja(mark);
	const qin6 = najia.map(x => {
		const zIdx = ZHIS.indexOf(x[1]);
		if (zIdx === -1) return '';
		return getQin6(XING5[GUA5[gong]], ZHI5[zIdx]);
	});

	// 干支五行
	const qinx = najia.map(x => gz5x(x));

	// 找出缺失的六亲位置
	const missingQins = Array.from(new Set(QING6)).filter(q => !qins.includes(q));
	const seat = missingQins.map(q => qin6.indexOf(q)).filter(idx => idx !== -1);

	return {
		name: GUA64[mark] || '',
		mark: mark,
		qin6: qin6,
		qinx: qinx,
		seat: seat
	};
}

/**
 * 计算变卦
 * @param params 六个爻的参数数组
 * @param gong 卦宫索引
 * @returns 变卦信息或 null
 */
function calcTransform(params: number[], gong: number): any | null {
	if (!params || params.length < 6) {
		return null;
	}

	// 检查是否有动爻（3或4）
	if (!params.includes(3) && !params.includes(4)) {
		return null;
	}

	// 生成变卦的二进制码：1,4 -> 1; 其他 -> 0
	const mark = params.map(v => (v === 1 || v === 4 ? '1' : '0')).join('');

	// 纳甲
	const najia = getNaja(mark);

	// 六亲（按变卦所在的本宫卦来定）
	const qin6 = najia.map(x => {
		const zIdx = ZHIS.indexOf(x[1]);
		if (zIdx === -1) return '';
		return getQin6(XING5[GUA5[gong]], ZHI5[zIdx]);
	});

	// 干支五行
	const qinx = najia.map(x => gz5x(x));

	// 变卦的卦宫
	const bianShiy = setShiYao(mark);
	const bianGong = palace(mark, bianShiy[0]);

	return {
		name: GUA64[mark] || getGuaName(mark) || '',
		mark: mark,
		qin6: qin6,
		qinx: qinx,
		gong: GUAS[bianGong]
	};
}

