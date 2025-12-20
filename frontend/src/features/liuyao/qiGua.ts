// @ts-nocheck
// 起卦工具函数（移植自根目?liuyao/utils/qiGua.js?
/**
 * 数字起卦
 * @param {number} num1 第一个数字（上卦? * @param {number} num2 第二个数字（下卦? * @param {number|null} num3 第三个数字（动爻，可选）
 * @returns {Array<number>} 6 个爻的参数数? */
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
 * 时间起卦
 */
export function timeQiGua(date?: Date) {
	const d = date || new Date();
	const year = d.getFullYear();
	const month = d.getMonth() + 1;
	const day = d.getDate();
	const hour = d.getHours();

	const shangGua = (year + month + day) % 8 || 8;
	const xiaGua = (year + month + day + hour) % 8 || 8;
	const dongYao = (year + month + day + hour) % 6 || 6;

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
 * 自动/随机起卦
 */
export function autoQiGua() {
	const params: number[] = [];
	for (let i = 0; i < 6; i++) {
		const rand = Math.random();
		if (rand < 0.25) params.push(0);
		else if (rand < 0.5) params.push(1);
		else if (rand < 0.75) params.push(3);
		else params.push(4);
	}
	return params;
}
