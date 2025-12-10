<template>
	<tm-table :width="tableWidth" :cellHeight="cellHeight" :header="header" :table-data="tableData"></tm-table>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useBaziStore } from '@/store/bazi';
import { useYunStore } from '@/store/yun';
import { getHideGanForGanZhi, getFuXingForGanZhi, getDiShiForGanZhi, calculateShenShaForGanZhi, calculateKongWangForGanZhi } from '@/libs/utils/bazi-enhanced';
import config from '@/config/config';
import utils from '@/libs/utils/utils';

interface headerOpts {
	title: string;
	key: string;
	width: number;
}

type CellValue = string | string[] | Record<string, any>;
type FormattedCell = Record<string, any>;

const baziStore = useBaziStore();
const yunStore = useYunStore();
const width: number = 150;
// 四柱列宽：加宽以避免单个神煞名称换行
const sizhuWidth: number = 200;
// 分开行高：主星/天干/地支/星运/纳音较短，藏干/副星稍高
const compactRows = new Set(['主星', '天干', '地支', '星运', '纳音']);
const midRows = new Set(['藏干', '副星']);
const compactRowHeight = 88;
const midRowHeight = 130;
const baseRowHeight = 120;
const baseDayZhi = computed(() => baziStore.dizhi?.day || '');
const baseTimeZhi = computed(() => baziStore.dizhi?.time || '');

// 获取选中的大运、流年、流月、流日
function normalizeGanZhi(value: any): string {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.filter(Boolean).join('');
	if (typeof value === 'object') {
		if (value.ganzhi) return String(value.ganzhi);
		if (value.gan && value.zhi) return `${value.gan}${value.zhi}`;
	}
	return String(value);
}

const selectedDayun = computed(() => {
	const index = yunStore.current_index;
	if (index >= 0 && yunStore.dayun_list && yunStore.dayun_list[index]) {
		return normalizeGanZhi(yunStore.dayun_list[index].ganzhi);
	}
	return '';
});

const selectedYear = computed(() => {
	const index = yunStore.year_index;
	if (index >= 0 && yunStore.year_list && yunStore.year_list[index]) {
		return normalizeGanZhi(yunStore.year_list[index].ganzhi);
	}
	return '';
});

const selectedMonth = computed(() => {
	const index = yunStore.month_index;
	if (index >= 0 && yunStore.month_list && yunStore.month_list[index]) {
		return normalizeGanZhi(yunStore.month_list[index].ganzhi);
	}
	return '';
});

const selectedDay = computed(() => {
	const index = yunStore.day_index;
	if (index >= 0 && yunStore.day_list && yunStore.day_list[index]) {
		return normalizeGanZhi(yunStore.day_list[index].ganzhi);
	}
	return '';
});

const header = computed<headerOpts[]>(() => {
	// 检查是否有神煞行，如果有则使用更大的列宽以适应神煞名称
	const hasShenshaRow = baziStore.table?.some(row => row.data?.name === '神煞');
	// 四柱列宽：有神煞时使用更大的宽度，否则使用基础宽度
	const columnWidth = hasShenshaRow ? 220 : sizhuWidth;
	
	const headers: headerOpts[] = [
		{ title: '\\', key: 'name', width: width },
		{ title: '年柱', key: 'year', width: columnWidth },
		{ title: '月柱', key: 'month', width: columnWidth },
		{ title: '日柱', key: 'day', width: columnWidth },
		{ title: '时柱', key: 'time', width: columnWidth }
	];
	
	// 如果有选中的大运、流年、流月、流日，添加列
	if (selectedDayun.value || selectedYear.value || selectedMonth.value || selectedDay.value) {
		if (selectedDayun.value) {
			headers.push({ title: '大运', key: 'dayun', width: columnWidth });
		}
		if (selectedYear.value) {
			headers.push({ title: '流年', key: 'year_yun', width: columnWidth });
		}
		if (selectedMonth.value) {
			headers.push({ title: '流月', key: 'month_yun', width: columnWidth });
		}
		if (selectedDay.value) {
			headers.push({ title: '流日', key: 'day_yun', width: columnWidth });
		}
	}
	
	return headers;
});

// 表格宽度：动态计算所有列的总宽度，使所有列直接显示，无需滚动
// tm-table 组件的 width prop 用于设置 scroll-view 的可见宽度
// 将宽度设置为所有列的总宽度，这样就不会出现横向滚动
const tableWidth = computed(() => {
	// 计算所有列的总宽度，并添加一些额外空间确保所有列完全显示
	const totalWidth = header.value.reduce((sum, col) => sum + col.width, 0);
	// 添加额外的边距空间（每列约10rpx的边距）
	return totalWidth + (header.value.length * 10);
});

// 格式化单元格数据，应用 zydx.top 样式
// 参考 zydx.top：偶数行 #EEE（浅灰），奇数行 #CCC（深灰）
function formatCellData(value: CellValue, isEvenRow: boolean, isDayun: boolean = false, isShensha: boolean = false): FormattedCell {
	// 如果是神煞行且值为数组，返回垂直文本格式
	if (isShensha) {
		// 确保值是数组格式
		const items = Array.isArray(value) ? value : (value ? [String(value)] : []);
		const safeItems = items.length > 0 ? items : ['—'];
		return {
			type: 'vertical-text',
			items: safeItems,
			color: isEvenRow ? 'grey-4' : 'grey-3',
			light: true
		};
	}
	
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		// 如果已经是对象格式，直接返回并添加样式
		const obj = value as Record<string, any>;
		return {
			...obj,
			color: obj.color || (isEvenRow ? 'grey-4' : 'grey-3'),
			light: obj.light !== undefined ? obj.light : true
		};
	}
	
	// 字符串格式，转换为对象并添加样式
	// 使用 grey-4（浅灰）和 grey-3（深灰）实现交替行背景色
	return {
		text: Array.isArray(value) ? value.join(' ') : (value || ''),
		type: 'text',
		color: isEvenRow ? 'grey-4' : 'grey-3',
		light: true
	};
}

// 公用：日干、原四柱地支
const dayGan = computed(() => baziStore.tiangan?.day || '');
const yearZhi = computed(() => baziStore.dizhi?.year || '');
const monthZhi = computed(() => baziStore.dizhi?.month || '');
const originalZhiList = computed<string[]>(() => {
	const list: string[] = [];
	if (baziStore.dizhi?.year) list.push(baziStore.dizhi.year);
	if (baziStore.dizhi?.month) list.push(baziStore.dizhi.month);
	if (baziStore.dizhi?.day) list.push(baziStore.dizhi.day);
	if (baziStore.dizhi?.time) list.push(baziStore.dizhi.time);
	return list;
});

function toArray(value: any): string[] {
	if (!value) return [];
	if (Array.isArray(value)) return value.filter(Boolean).map(String);
	if (typeof value === 'string') return value.split(/[\s、，,]+/).filter(Boolean);
	return [String(value)];
}

// 计算神煞行在当前场景下的最大条目数，用于按需抬高该行
function getShenshaMaxItems(baseRowData: any, includeExtended: boolean): number {
	const items: any[] = [];
	['year', 'month', 'day', 'time'].forEach(key => items.push(baseRowData?.[key]));

	if (includeExtended) {
		if (selectedDayun.value) {
		items.push(calculateShenShaForGanZhi(dayGan.value, selectedDayun.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value));
	}
	if (selectedYear.value) {
		items.push(calculateShenShaForGanZhi(dayGan.value, selectedYear.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value));
	}
	if (selectedMonth.value) {
		items.push(calculateShenShaForGanZhi(dayGan.value, selectedMonth.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value));
	}
	if (selectedDay.value) {
		items.push(calculateShenShaForGanZhi(dayGan.value, selectedDay.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value));
	}
	}

	return items.reduce((max, cur) => Math.max(max, toArray(cur).length), 0);
}

// 基础行高（未单独指定的行）
const cellHeight = computed(() => baseRowHeight);

const tableData = computed(() => {
	const baseTable = baziStore.table || [];
	
	// 如果没有选中的大运、流年、流月、流日，直接返回原表格并应用样式
	if (!selectedDayun.value && !selectedYear.value && !selectedMonth.value && !selectedDay.value) {
		return baseTable.map((row, index) => {
			const isEvenRow = index % 2 === 0;
			const newRow: any = { ...row };
			const newData: any = {};
			
			// 格式化每个单元格数据
			const isShenshaRow = row.data.name === '神煞';
			// 确保包含所有必需的字段：name, year, month, day, time
			const requiredKeys = ['name', 'year', 'month', 'day', 'time'];
			requiredKeys.forEach(key => {
				if (key === 'name') {
					// 行名称列保持原样
					newData[key] = row.data[key];
				} else {
					// 如果是神煞行，确保传递正确的 isShensha 参数
					const value = row.data[key];
					newData[key] = formatCellData(value, isEvenRow, false, isShenshaRow);
				}
			});
			
			newRow.data = newData;
			if (compactRows.has(row.data.name)) {
				newRow.rowHeight = compactRowHeight;
			} else if (midRows.has(row.data.name)) {
				newRow.rowHeight = midRowHeight;
			} else if (row.data.name === '神煞') {
				const maxItems = getShenshaMaxItems(row.data, false);
				newRow.rowHeight = Math.max(baseRowHeight, maxItems * 32 + 24);
			}
			return newRow;
		});
	}
	
		// 为每一行添加选中的大运、流年、流月、流日数据
	return baseTable.map((row, index) => {
		const isEvenRow = index % 2 === 0;
		const newRow: any = { ...row };
		const newData: any = {};
		
		// 先处理原有数据
		const isShenshaRow = row.data.name === '神煞';
		// 确保包含所有必需的字段：name, year, month, day, time
		const requiredKeys = ['name', 'year', 'month', 'day', 'time'];
		requiredKeys.forEach(key => {
			if (key === 'name') {
				newData[key] = row.data[key];
			} else {
				const value = row.data[key];
				newData[key] = formatCellData(value, isEvenRow, false, isShenshaRow);
			}
		});
		
		// 添加大运、流年、流月、流日列
		if (selectedDayun.value) {
			let dayunValue: string | string[] = '';
			if (row.data.name === '天干') {
				dayunValue = selectedDayun.value[0] || '';
			} else if (row.data.name === '地支') {
				dayunValue = selectedDayun.value[1] || '';
			} else if (row.data.name === '主星') {
				const dayunItem = yunStore.dayun_list[yunStore.current_index];
				dayunValue = dayunItem?.shishen || '';
			} else if (row.data.name === '藏干') {
				const hideGans = getHideGanForGanZhi(selectedDayun.value);
				dayunValue = utils.DeArray(hideGans, 'canggan');
			} else if (row.data.name === '副星') {
				const zhi = selectedDayun.value[1] || '';
				const fuXing = getFuXingForGanZhi(dayGan.value, zhi, config.dizhi, config.tiangan);
				dayunValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedDayun.value[1] || '';
				dayunValue = getDiShiForGanZhi(dayGan.value, zhi);
			} else if (row.data.name === '空亡') {
				dayunValue = calculateKongWangForGanZhi(selectedDayun.value).join('、');
			} else if (row.data.name === '神煞') {
				dayunValue = calculateShenShaForGanZhi(dayGan.value, selectedDayun.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value);
			}
			newData.dayun = formatCellData(dayunValue, isEvenRow, true, row.data.name === '神煞');
		}
		
		if (selectedYear.value) {
			let yearValue: string | string[] = '';
			if (row.data.name === '天干') {
				yearValue = selectedYear.value[0] || '';
			} else if (row.data.name === '地支') {
				yearValue = selectedYear.value[1] || '';
			} else if (row.data.name === '主星') {
				const yearItem = yunStore.year_list[yunStore.year_index];
				yearValue = yearItem?.shishen || '';
			} else if (row.data.name === '藏干') {
				const hideGans = getHideGanForGanZhi(selectedYear.value);
				yearValue = utils.DeArray(hideGans, 'canggan');
			} else if (row.data.name === '副星') {
				const zhi = selectedYear.value[1] || '';
				const fuXing = getFuXingForGanZhi(dayGan.value, zhi, config.dizhi, config.tiangan);
				yearValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedYear.value[1] || '';
				yearValue = getDiShiForGanZhi(dayGan.value, zhi);
			} else if (row.data.name === '空亡') {
				yearValue = calculateKongWangForGanZhi(selectedYear.value).join('、');
			} else if (row.data.name === '神煞') {
				yearValue = calculateShenShaForGanZhi(dayGan.value, selectedYear.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value);
			}
			newData.year_yun = formatCellData(yearValue, isEvenRow, false, row.data.name === '神煞');
		}
		
		if (selectedMonth.value) {
			let monthValue: string | string[] = '';
			if (row.data.name === '天干') {
				monthValue = selectedMonth.value[0] || '';
			} else if (row.data.name === '地支') {
				monthValue = selectedMonth.value[1] || '';
			} else if (row.data.name === '主星') {
				const monthItem = yunStore.month_list[yunStore.month_index];
				monthValue = monthItem?.shishen || '';
			} else if (row.data.name === '藏干') {
				const hideGans = getHideGanForGanZhi(selectedMonth.value);
				monthValue = utils.DeArray(hideGans, 'canggan');
			} else if (row.data.name === '副星') {
				const zhi = selectedMonth.value[1] || '';
				const fuXing = getFuXingForGanZhi(dayGan.value, zhi, config.dizhi, config.tiangan);
				monthValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedMonth.value[1] || '';
				monthValue = getDiShiForGanZhi(dayGan.value, zhi);
			} else if (row.data.name === '空亡') {
				monthValue = calculateKongWangForGanZhi(selectedMonth.value).join('、');
			} else if (row.data.name === '神煞') {
				monthValue = calculateShenShaForGanZhi(dayGan.value, selectedMonth.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value);
			}
			newData.month_yun = formatCellData(monthValue, isEvenRow, false, row.data.name === '神煞');
		}
		
		if (selectedDay.value) {
			let dayValue: string | string[] = '';
			if (row.data.name === '天干') {
				dayValue = selectedDay.value[0] || '';
			} else if (row.data.name === '地支') {
				dayValue = selectedDay.value[1] || '';
			} else if (row.data.name === '主星') {
				const dayItem = yunStore.day_list[yunStore.day_index];
				dayValue = dayItem?.shishen || '';
			} else if (row.data.name === '藏干') {
				const hideGans = getHideGanForGanZhi(selectedDay.value);
				dayValue = utils.DeArray(hideGans, 'canggan');
			} else if (row.data.name === '副星') {
				const zhi = selectedDay.value[1] || '';
				const fuXing = getFuXingForGanZhi(dayGan.value, zhi, config.dizhi, config.tiangan);
				dayValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedDay.value[1] || '';
				dayValue = getDiShiForGanZhi(dayGan.value, zhi);
			} else if (row.data.name === '空亡') {
				dayValue = calculateKongWangForGanZhi(selectedDay.value).join('、');
			} else if (row.data.name === '神煞') {
				dayValue = calculateShenShaForGanZhi(dayGan.value, selectedDay.value, originalZhiList.value, yearZhi.value, monthZhi.value, baseDayZhi.value, baseTimeZhi.value);
			}
			newData.day_yun = formatCellData(dayValue, isEvenRow, false, row.data.name === '神煞');
		}
		
		newRow.data = newData;
		if (compactRows.has(row.data.name)) {
			newRow.rowHeight = compactRowHeight;
		} else if (midRows.has(row.data.name)) {
			newRow.rowHeight = midRowHeight;
		} else if (row.data.name === '神煞') {
			const maxItems = getShenshaMaxItems(row.data, true);
			newRow.rowHeight = Math.max(baseRowHeight, maxItems * 32 + 24);
		}
		return newRow;
	});
});
</script>
