import { Solar } from 'lunar-javascript';

/**
 * 数字起卦
 * @param {number} num1 第一个数字（上卦）
 * @param {number} num2 第二个数字（下卦）
 * @param {number|null} num3 第三个数字（动爻，可选）
 * @returns {Array<number>} 6 个爻的参数数组
 */
export function numberQiGua(num1: number, num2: number, num3: number | null = null) {
	const shangGua = num1 % 8 || 8;
	const xiaGua = num2 % 8 || 8;

	const guaMap: Record<number, string> = {
		1: '111',
		2: '110',
		3: '101',
		4: '100',
		5: '011',
		6: '010',
		7: '001',
		8: '000'
	};

	const shangYao = guaMap[shangGua].split('').map(x => parseInt(x));
	const xiaYao = guaMap[xiaGua].split('').map(x => parseInt(x));
	const params = [...xiaYao, ...shangYao]; // 自下而上

	if (num3 !== null && num3 > 0) {
		const dongYao = num3 % 6 || 6;
		const dongIndex = dongYao - 1;
		params[dongIndex] = params[dongIndex] === 1 ? 3 : 4;
	}

	return params.map(p => (p === 0 ? 0 : p === 1 ? 1 : p));
}

/**
 * 时间起卦 (修正为农历日期 + 干支时辰)
 */
export function timeQiGua(date?: Date) {
	const d = date || new Date();
	const solar = Solar.fromDate(d);
	const lunar = solar.getLunar();

	const zhiMap: any = {
		'子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6,
		'午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12
	};

	const yearZhi = String((lunar as any).getYearZhi());
	const yearNum = zhiMap[yearZhi] || 1;
	const monthNum = lunar.getMonth();
	const dayNum = lunar.getDay();

	const hourZhi = lunar.getTimeZhi();
	const hourNum = zhiMap[hourZhi] || 1;

	const shangGua = (yearNum + monthNum + dayNum) % 8 || 8;
	const xiaGua = (yearNum + monthNum + dayNum + hourNum) % 8 || 8;
	const dongYao = (yearNum + monthNum + dayNum + hourNum) % 6 || 6;

	const guaMap: Record<number, string> = {
		1: '111',
		2: '110',
		3: '101',
		4: '100',
		5: '011',
		6: '010',
		7: '001',
		8: '000'
	};

	const shangYao = guaMap[shangGua].split('').map(x => parseInt(x));
	const xiaYao = guaMap[xiaGua].split('').map(x => parseInt(x));
	const params = [...xiaYao, ...shangYao];

	const dongIndex = dongYao - 1;
	params[dongIndex] = params[dongIndex] === 1 ? 3 : 4;

	return params.map(p => (p === 0 ? 0 : p === 1 ? 1 : p));
}

/**
 * 自动/随机起卦 (修正为铜钱摇卦概率)
 */
export function autoQiGua() {
	const params: number[] = [];
	for (let i = 0; i < 6; i++) {
		// 模拟三枚铜钱: 正面(背)记为3, 反面(字)记为2
		// 概率: 3/8 少阴(8), 3/8 少阳(7), 1/8 老阴(6), 1/8 老阳(9)
		const coin1 = Math.random() < 0.5 ? 3 : 2;
		const coin2 = Math.random() < 0.5 ? 3 : 2;
		const coin3 = Math.random() < 0.5 ? 3 : 2;
		const sum = coin1 + coin2 + coin3;

		let val = 0;
		if (sum === 6) val = 4;      // 老阴 (变爻)
		else if (sum === 7) val = 1; // 少阳
		else if (sum === 8) val = 0; // 少阴
		else if (sum === 9) val = 3; // 老阳 (变爻)

		params.push(val);
	}
	return params;
}

