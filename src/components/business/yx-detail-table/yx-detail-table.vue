<template>
	<tm-table :width="tableWidth" :cellHeight="120" :header="header" :table-data="tableData"></tm-table>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useBaziStore } from '@/store/bazi.ts';
import { useYunStore } from '@/store/yun.ts';
import { getHideGanForGanZhi, getFuXingForGanZhi, getDiShiForGanZhi, calculateShenShaForGanZhi } from '@/utils/bazi-enhanced.ts';
import config from '@/config/config.ts';
import utils from '@/utils/utils.ts';

interface headerOpts {
	title:string,
	key:string,
	width:number,
}

const baziStore = useBaziStore();
const yunStore = useYunStore();
const width: number = 150;
// 四柱列宽：增加到足够显示所有信息
const sizhuWidth: number = 200;

// 获取选中的大运、流年、流月、流日
const selectedDayun = computed(() => {
	const index = yunStore.current_index;
	if (index >= 0 && yunStore.dayun_list && yunStore.dayun_list[index]) {
		return yunStore.dayun_list[index].ganzhi || '';
	}
	return '';
});

const selectedYear = computed(() => {
	const index = yunStore.year_index;
	if (index >= 0 && yunStore.year_list && yunStore.year_list[index]) {
		return yunStore.year_list[index].ganzhi || '';
	}
	return '';
});

const selectedMonth = computed(() => {
	const index = yunStore.month_index;
	if (index >= 0 && yunStore.month_list && yunStore.month_list[index]) {
		return yunStore.month_list[index].ganzhi || '';
	}
	return '';
});

const selectedDay = computed(() => {
	const index = yunStore.day_index;
	if (index >= 0 && yunStore.day_list && yunStore.day_list[index]) {
		return yunStore.day_list[index].ganzhi || '';
	}
	return '';
});

const header = computed<headerOpts[]>(() => {
	// 检查是否有神煞行，如果有则使用更大的列宽以适应神煞名称
	const hasShenshaRow = baziStore.table?.some(row => row.data?.name === '神煞');
	// 四柱列宽：有神煞时使用更大的宽度，否则使用基础宽度
	const columnWidth = hasShenshaRow ? Math.max(sizhuWidth, 220) : sizhuWidth;
	
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
			headers.push({ title: '大运', key: 'dayun', width: width });
		}
		if (selectedYear.value) {
			headers.push({ title: '流年', key: 'year_yun', width: width });
		}
		if (selectedMonth.value) {
			headers.push({ title: '流月', key: 'month_yun', width: width });
		}
		if (selectedDay.value) {
			headers.push({ title: '流日', key: 'day_yun', width: width });
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
function formatCellData(value: string | string[], isEvenRow: boolean, isDayun: boolean = false, isShensha: boolean = false): any {
	// 如果是神煞行且值为数组，返回垂直文本格式
	if (isShensha) {
		// 确保值是数组格式
		const items = Array.isArray(value) ? value : (value ? [String(value)] : []);
		return {
			type: 'vertical-text',
			items: items,
			color: isEvenRow ? 'grey-4' : 'grey-3',
			light: true
		};
	}
	
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		// 如果已经是对象格式，直接返回并添加样式
		return {
			...value,
			color: value.color || (isEvenRow ? 'grey-4' : 'grey-3'),
			light: value.light !== undefined ? value.light : true
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

const tableData = computed(() => {
	const baseTable = baziStore.table || [];
	
	// 如果没有选中的大运、流年、流月、流日，直接返回原表格并应用样式
	if (!selectedDayun.value && !selectedYear.value && !selectedMonth.value && !selectedDay.value) {
		return baseTable.map((row, index) => {
			const isEvenRow = index % 2 === 0;
			const newRow = { ...row };
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
			return newRow;
		});
	}
	
		// 为每一行添加选中的大运、流年、流月、流日数据
	return baseTable.map((row, index) => {
		const isEvenRow = index % 2 === 0;
		const newRow = { ...row };
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
		
		// 获取日干和原四柱地支（用于计算神煞）
		const dayGan = baziStore.tiangan?.day || '';
		const yearZhi = baziStore.dizhi?.year || '';
		const monthZhi = baziStore.dizhi?.month || '';
		const originalZhiList: string[] = [];
		if (baziStore.dizhi?.year) originalZhiList.push(baziStore.dizhi.year);
		if (baziStore.dizhi?.month) originalZhiList.push(baziStore.dizhi.month);
		if (baziStore.dizhi?.day) originalZhiList.push(baziStore.dizhi.day);
		if (baziStore.dizhi?.time) originalZhiList.push(baziStore.dizhi.time);
		
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
				const fuXing = getFuXingForGanZhi(dayGan, zhi, config.dizhi, config.tiangan);
				dayunValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedDayun.value[1] || '';
				dayunValue = getDiShiForGanZhi(dayGan, zhi);
			} else if (row.data.name === '神煞') {
				dayunValue = calculateShenShaForGanZhi(dayGan, selectedDayun.value, originalZhiList, yearZhi, monthZhi);
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
				const fuXing = getFuXingForGanZhi(dayGan, zhi, config.dizhi, config.tiangan);
				yearValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedYear.value[1] || '';
				yearValue = getDiShiForGanZhi(dayGan, zhi);
			} else if (row.data.name === '神煞') {
				yearValue = calculateShenShaForGanZhi(dayGan, selectedYear.value, originalZhiList, yearZhi, monthZhi);
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
				const fuXing = getFuXingForGanZhi(dayGan, zhi, config.dizhi, config.tiangan);
				monthValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedMonth.value[1] || '';
				monthValue = getDiShiForGanZhi(dayGan, zhi);
			} else if (row.data.name === '神煞') {
				monthValue = calculateShenShaForGanZhi(dayGan, selectedMonth.value, originalZhiList, yearZhi, monthZhi);
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
				const fuXing = getFuXingForGanZhi(dayGan, zhi, config.dizhi, config.tiangan);
				dayValue = utils.DeArray(fuXing);
			} else if (row.data.name === '星运') {
				const zhi = selectedDay.value[1] || '';
				dayValue = getDiShiForGanZhi(dayGan, zhi);
			} else if (row.data.name === '神煞') {
				dayValue = calculateShenShaForGanZhi(dayGan, selectedDay.value, originalZhiList, yearZhi, monthZhi);
			}
			newData.day_yun = formatCellData(dayValue, isEvenRow, false, row.data.name === '神煞');
		}
		
		newRow.data = newData;
		return newRow;
	});
});
</script>
