<template>
	<view class="yx-table-container">
		<!-- 左侧固定列 -->
		<view class="yx-table-fixed" :style="{ width: fixedColumnWidth + 'rpx' }">
			<!-- 表头 -->
			<tm-sheet
				:width="fixedColumnWidth"
				:height="headerHeight"
				:margin="[0, 0]"
				:padding="[10, 6]"
				:color="'grey-5'"
				_class="flex-center flex-col"
				:border="1"
				border-direction="bottom"
			>
				<tm-text :label="fixedHeader?.title || ''" :font-size="24"></tm-text>
			</tm-sheet>
			<!-- 数据行 -->
			<view v-for="(row, rowIndex) in tableData" :key="'fixed-' + rowIndex">
				<tm-sheet
					:width="fixedColumnWidth"
					:height="row.rowHeight || cellHeight"
					:margin="[0, 0]"
					:padding="[10, 6]"
					:color="row.data.name.color"
					:text="row.data.name.light"
					_class="flex-center flex-col"
					:border="1"
					border-direction="bottom"
				>
					<tm-text
						:label="row.data.name.text"
						:font-size="row.data.name.fontSize"
						:color="row.data.name.light ? undefined : row.data.name.color"
					></tm-text>
				</tm-sheet>
			</view>
		</view>

		<!-- 右侧滚动区域 -->
		<scroll-view class="yx-table-scroll" scroll-x enable-flex>
			<view class="yx-table-scroll-content">
				<!-- 表头 -->
				<view class="yx-row">
					<tm-sheet
						v-for="col in scrollableHeaders"
						:key="col.key"
						:width="col.width"
						:height="headerHeight"
						:margin="[0, 0]"
						:padding="[10, 6]"
						:color="'grey-5'"
						_class="flex-center flex-col"
						:border="1"
						border-direction="bottom"
					>
						<tm-text :label="col.title" :font-size="30" _class="text-weight-b"></tm-text>
					</tm-sheet>
				</view>
				<!-- 数据行 -->
				<view v-for="(row, rowIndex) in tableData" :key="'row-' + rowIndex" class="yx-row">
					<view v-for="col in scrollableHeaders" :key="col.key">
						<tm-sheet
							:width="col.width"
							:height="row.rowHeight || cellHeight"
							:margin="[0, 0]"
							:padding="[10, 6]"
							:color="row.data[col.key].color"
							:text="row.data[col.key].light"
							_class="flex-center flex-col"
							:border="1"
							border-direction="bottom"
						>
							<template v-if="row.data[col.key].type === 'vertical-text'">
								<view class="flex flex-col flex-center">
									<tm-text
										v-for="(txt, ti) in row.data[col.key].items"
										:key="ti"
										:label="txt"
										:font-size="row.data[col.key].fontSize"
										:style="{ marginBottom: Number(ti) < row.data[col.key].items.length - 1 ? '4rpx' : '0' }"
									></tm-text>
								</view>
							</template>
							<template v-else>
								<tm-text
									:label="row.data[col.key].text"
									:font-size="row.data[col.key].fontSize"
									:color="row.data[col.key].textColor"
								></tm-text>
							</template>
						</tm-sheet>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useBaziStore } from '@/store/bazi';
import { useYunStore } from '@/store/yun';
import tmSheet from '@/libs/tmui/components/tm-sheet/tm-sheet.vue';
import tmText from '@/libs/tmui/components/tm-text/tm-text.vue';
import { useUiScale } from '@/utils/viewport';
import {
	getHideGanForGanZhi,
	getFuXingForGanZhi,
	getDiShiForGanZhi,
	calculateShenShaForGanZhi,
	calculateKongWangForGanZhi,
} from '@/libs/utils/bazi-enhanced';
import config from '@/config/config';
import utils from '@/libs/utils/utils';

interface headerOpts {
	title: string;
	key: string;
	width: number;
}

type CellValue = string | string[] | Record<string, any>;
type FormattedCell = Record<string, any>;

const WU_XING_GAN: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};
const WU_XING_ZHI: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

function getWuxingInfo(char: string) {
	if (!char) return null;
	const wx = WU_XING_GAN[char] || WU_XING_ZHI[char];
	if (!wx) return null;
	const colorMap: Record<string, string> = {
		'金': '#E6B322',
		'木': '#4CAF50',
		'水': '#2196F3',
		'火': '#F44336',
		'土': '#795548'
	};
	return {
		color: colorMap[wx],
		symbol: wx
	};
}

const baziStore = useBaziStore();
const yunStore = useYunStore();
const uiScale = useUiScale();
const scaleNumber = (value: number) => Math.round(value * uiScale.value * 100) / 100;
const baseFixedColumnWidth = 80;
const fixedColumnWidth = computed(() => scaleNumber(baseFixedColumnWidth));
// 分开行高：主星/天干/地支/星运/纳音较短，藏干/副星稍高
const compactRows = new Set(['主星', '天干', '地支', '星运', '纳音']);
const midRows = new Set(['藏干', '副星']);
const compactRowHeight = computed(() => scaleNumber(66));
const midRowHeight = computed(() => scaleNumber(100));
const baseRowHeight = computed(() => scaleNumber(90));
const headerHeight = computed(() => scaleNumber(88));


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
const baseDayZhi = computed(() => baziStore.dizhi?.day || '');
const baseTimeZhi = computed(() => baziStore.dizhi?.time || '');
const yearGan = computed(() => baziStore.tiangan?.year || '');

function toArray(value: any): string[] {
	if (!value) return [];
	if (Array.isArray(value)) return value.filter(Boolean).map(String);
	if (typeof value === 'string') return value.split(/[\s、，,]+/).filter(Boolean);
	return [String(value)];
}

// 计算各列的神煞最大字数
const columnShenShaMaxLen = computed(() => {
	const maxLens: Record<string, number> = {
		year: 0,
		month: 0,
		day: 0,
		time: 0,
		dayun: 0,
		year_yun: 0,
		month_yun: 0,
		day_yun: 0,
	};

	// 辅助函数：计算数组中最长字符串的长度
	const getMaxLen = (arr: any[]) => {
		if (!arr || arr.length === 0) return 0;
		return Math.max(...arr.map(s => String(s).length));
	};

	// 1. 基础四柱：直接从表格数据中获取
	const shenshaRow = baziStore.table?.find((row) => row.data?.name === '神煞');
	if (shenshaRow) {
		['year', 'month', 'day', 'time'].forEach((key) => {
			const val = (shenshaRow.data as any)[key];
			const arr = Array.isArray(val) ? val : toArray(val);
			maxLens[key] = getMaxLen(arr);
		});
	}

	// 2. 扩展列：需实时计算
	const calc = (ganZhi: string) => {
		return calculateShenShaForGanZhi(
			dayGan.value,
			ganZhi,
			originalZhiList.value,
			yearZhi.value,
			monthZhi.value,
			baseDayZhi.value,
			baseTimeZhi.value,
			yearGan.value
		);
	};

	if (selectedDayun.value) {
		const res = calc(selectedDayun.value);
		maxLens.dayun = getMaxLen(Array.isArray(res) ? res : toArray(res));
	}
	if (selectedYear.value) {
		const res = calc(selectedYear.value);
		maxLens.year_yun = getMaxLen(Array.isArray(res) ? res : toArray(res));
	}
	if (selectedMonth.value) {
		const res = calc(selectedMonth.value);
		maxLens.month_yun = getMaxLen(Array.isArray(res) ? res : toArray(res));
	}
	if (selectedDay.value) {
		const res = calc(selectedDay.value);
		maxLens.day_yun = getMaxLen(Array.isArray(res) ? res : toArray(res));
	}

	return maxLens;
});

const fullHeaders = computed<headerOpts[]>(() => {
	// 动态计算列宽
	// 基础宽度 60 (3个字)，每个字增加约 20
	const getWidth = (key: string) => {
		const maxLen = columnShenShaMaxLen.value[key] || 0;
		// 如果没有神煞，或者神煞字数少于3个，使用最小宽度
		const minLen = 3; 
		const len = Math.max(minLen, maxLen);
		
		const fontSize = scaleNumber(20);
		const padding = scaleNumber(12);
		const computedWidth = len * fontSize + padding;
		const minWidthMap: Record<string, number> = {
			year: 120,
			month: 120,
			day: 120,
			time: 120,
			dayun: 140,
			year_yun: 140,
			month_yun: 140,
			day_yun: 140,
		};
		const minWidth = scaleNumber(minWidthMap[key] ?? 120);
		return Math.max(minWidth, computedWidth);
	};

	const headers: headerOpts[] = [
		{ title: '\\', key: 'name', width: fixedColumnWidth.value },
		{ title: '年柱', key: 'year', width: getWidth('year') },
		{ title: '月柱', key: 'month', width: getWidth('month') },
		{ title: '日柱', key: 'day', width: getWidth('day') },
		{ title: '时柱', key: 'time', width: getWidth('time') },
	];

	// 如果有选中的大运、流年、流月、流日，添加列
	if (selectedDayun.value || selectedYear.value || selectedMonth.value || selectedDay.value) {
		if (selectedDayun.value) {
			headers.push({ title: '大运', key: 'dayun', width: getWidth('dayun') });
		}
		if (selectedYear.value) {
			headers.push({ title: '流年', key: 'year_yun', width: getWidth('year_yun') });
		}
		if (selectedMonth.value) {
			headers.push({ title: '流月', key: 'month_yun', width: getWidth('month_yun') });
		}
		if (selectedDay.value) {
			headers.push({ title: '流日', key: 'day_yun', width: getWidth('day_yun') });
		}
	}

	// 充满容器逻辑：
	// 只调整可滚动列（除第一列外的所有列）
	const scrollableCols = headers.slice(1);
	const scrollableContentWidth = scrollableCols.reduce((sum, h) => sum + h.width, 0);
	
	// 预估容器可用宽度 (rpx)
	// 屏幕 750rpx - 左侧固定列 - padding (约 40)
	const minScrollableWidth = Math.max(0, 750 - fixedColumnWidth.value - 40);
	
	if (scrollableContentWidth < minScrollableWidth) {
		const extra = minScrollableWidth - scrollableContentWidth;
		const perColExtra = extra / scrollableCols.length;
		scrollableCols.forEach(h => {
			h.width += perColExtra;
		});
	}

	return headers;
});

const fixedHeader = computed(() => fullHeaders.value[0]);
const scrollableHeaders = computed(() => fullHeaders.value.slice(1));

// 格式化单元格数据，应用 zydx.top 样式
// 参考 zydx.top：偶数行 #EEE（浅灰），奇数行 #CCC（深灰）
function formatCellData(
	value: CellValue,
	isEvenRow: boolean,
	isShensha: boolean = false,
	isGanZhi: boolean = false
): FormattedCell {
	// 如果是神煞行且值为数组，返回垂直文本格式
	if (isShensha) {
		// 确保值是数组格式
		const items = Array.isArray(value) ? value : value ? [String(value)] : [];
		const safeItems = items.length > 0 ? items : ['—'];
		return {
			type: 'vertical-text',
			items: safeItems,
			color: isEvenRow ? 'grey-4' : 'grey-3',
			light: true,
			fontSize: 20,
		};
	}

	if (value && typeof value === 'object' && !Array.isArray(value)) {
		// 如果已经是对象格式，直接返回并添加样式
		const obj = value as Record<string, any>;
		return {
			...obj,
			color: obj.color || (isEvenRow ? 'grey-4' : 'grey-3'),
			light: obj.light !== undefined ? obj.light : true,
			fontSize: obj.fontSize || 22,
		};
	}

	// 字符串格式，转换为对象并添加样式
	// 使用 grey-4（浅灰）和 grey-3（深灰）实现交替行背景色
	const result: FormattedCell = {
		text: Array.isArray(value) ? value.join(' ') : value || '',
		type: 'text',
		color: isEvenRow ? 'grey-4' : 'grey-3',
		light: true,
		fontSize: 22,
	};

	if (isGanZhi && typeof value === 'string') {
		const wxInfo = getWuxingInfo(value);
		if (wxInfo) {
			result.textColor = wxInfo.color;
			result.text = `${value}${wxInfo.symbol}`;
		}
	}

	return result;
}



// 计算神煞行在当前场景下的最大条目数，用于按需抬高该行
function getShenshaMaxItems(baseRowData: any, includeExtended: boolean): number {
	const items: any[] = [];
	// 获取基础四柱的神煞数据
	['year', 'month', 'day', 'time'].forEach((key) => {
		const value = baseRowData?.[key];
		if (value) {
			// 如果已经是数组，直接使用；如果是字符串，转换为数组
			const arr = Array.isArray(value) ? value : toArray(value);
			items.push(...arr);
		}
	});

	if (includeExtended) {
		if (selectedDayun.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedDayun.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			items.push(...arr);
		}
		if (selectedYear.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedYear.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			items.push(...arr);
		}
		if (selectedMonth.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedMonth.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			items.push(...arr);
		}
		if (selectedDay.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedDay.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			items.push(...arr);
		}
	}

	// 计算每个单元格的最大条目数
	const cellMaxItems: number[] = [];
	['year', 'month', 'day', 'time'].forEach((key) => {
		const value = baseRowData?.[key];
		const arr = Array.isArray(value) ? value : toArray(value);
		cellMaxItems.push(arr.length);
	});

	if (includeExtended) {
		if (selectedDayun.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedDayun.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			cellMaxItems.push(arr.length);
		}
		if (selectedYear.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedYear.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			cellMaxItems.push(arr.length);
		}
		if (selectedMonth.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedMonth.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			cellMaxItems.push(arr.length);
		}
		if (selectedDay.value) {
			const shensha = calculateShenShaForGanZhi(
				dayGan.value,
				selectedDay.value,
				originalZhiList.value,
				yearZhi.value,
				monthZhi.value,
				baseDayZhi.value,
				baseTimeZhi.value,
				yearGan.value
			);
			const arr = Array.isArray(shensha) ? shensha : toArray(shensha);
			cellMaxItems.push(arr.length);
		}
	}

	// 返回所有单元格中的最大条目数
	return Math.max(...cellMaxItems, 0);
}

// 基础行高（未单独指定的行）
const cellHeight = computed(() => baseRowHeight.value);

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
			requiredKeys.forEach((key) => {
				if (key === 'name') {
					newData[key] = {
						text: row.data[key],
						type: 'text',
						color: isEvenRow ? 'grey-4' : 'grey-3',
						light: true,
						fontSize: 20,
					};
				} else {
		// 如果是神煞行，确保传递正确的 isShensha 参数
					const value = (row.data as any)[key];
					newData[key] = formatCellData(value, isEvenRow, isShenshaRow, row.data.name === '天干' || row.data.name === '地支');
				}
			});

			newRow.data = newData;
			if (compactRows.has(row.data.name)) {
				newRow.rowHeight = compactRowHeight.value;
			} else if (midRows.has(row.data.name)) {
				newRow.rowHeight = midRowHeight.value;
			} else if (row.data.name === '神煞') {
				const maxItems = getShenshaMaxItems(row.data, false);
				// 根据神煞数量动态调整高度：每个神煞约36rpx高度，加上上下内边距24rpx
				// 至少保持基础行高，如果神煞多则增加高度
				const minHeight = baseRowHeight.value;
				const itemHeight = scaleNumber(36);
				const padding = scaleNumber(24);
				newRow.rowHeight = Math.max(minHeight, maxItems * itemHeight + padding);
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
		requiredKeys.forEach((key) => {
			if (key === 'name') {
				newData[key] = {
					text: row.data[key],
					type: 'text',
					color: isEvenRow ? 'grey-4' : 'grey-3',
					light: true,
					fontSize: 20,
				};
		} else {
				const value = (row.data as any)[key];
				newData[key] = formatCellData(value, isEvenRow, isShenshaRow, row.data.name === '天干' || row.data.name === '地支');
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
				dayunValue = calculateShenShaForGanZhi(
					dayGan.value,
					selectedDayun.value,
					originalZhiList.value,
					yearZhi.value,
					monthZhi.value,
					baseDayZhi.value,
					baseTimeZhi.value,
					yearGan.value
				);
			}
			newData.dayun = formatCellData(dayunValue, isEvenRow, row.data.name === '神煞', row.data.name === '天干' || row.data.name === '地支');
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
				yearValue = calculateShenShaForGanZhi(
					dayGan.value,
					selectedYear.value,
					originalZhiList.value,
					yearZhi.value,
					monthZhi.value,
					baseDayZhi.value,
					baseTimeZhi.value,
					yearGan.value
				);
			}
			newData.year_yun = formatCellData(yearValue, isEvenRow, row.data.name === '神煞', row.data.name === '天干' || row.data.name === '地支');
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
				monthValue = calculateShenShaForGanZhi(
					dayGan.value,
					selectedMonth.value,
					originalZhiList.value,
					yearZhi.value,
					monthZhi.value,
					baseDayZhi.value,
					baseTimeZhi.value,
					yearGan.value
				);
			}
			newData.month_yun = formatCellData(monthValue, isEvenRow, row.data.name === '神煞', row.data.name === '天干' || row.data.name === '地支');
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
				dayValue = calculateShenShaForGanZhi(
					dayGan.value,
					selectedDay.value,
					originalZhiList.value,
					yearZhi.value,
					monthZhi.value,
					baseDayZhi.value,
					baseTimeZhi.value,
					yearGan.value
				);
			}
			newData.day_yun = formatCellData(dayValue, isEvenRow, row.data.name === '神煞', row.data.name === '天干' || row.data.name === '地支');
		}

		newRow.data = newData;
		if (compactRows.has(row.data.name)) {
			newRow.rowHeight = compactRowHeight.value;
		} else if (midRows.has(row.data.name)) {
			newRow.rowHeight = midRowHeight.value;
		} else if (row.data.name === '神煞') {
			const maxItems = getShenshaMaxItems(row.data, true);
			// 根据神煞数量动态调整高度：每个神煞约36rpx高度，加上上下内边距24rpx
			// 至少保持基础行高，如果神煞多则增加高度
			const minHeight = baseRowHeight.value;
			const itemHeight = scaleNumber(36);
			const padding = scaleNumber(24);
			newRow.rowHeight = Math.max(minHeight, maxItems * itemHeight + padding);
		}
		return newRow;
	});
});
</script>

<style scoped>
.yx-table-container {
	display: flex;
	flex-direction: row;
	width: 100%;
	position: relative;
	background-color: #ffffff;
}

.yx-table-fixed {
	flex-shrink: 0;
	z-index: 10;
	background-color: #ffffff;
	box-shadow: 4rpx 0 8rpx rgba(0, 0, 0, 0.05);
}

.yx-table-scroll {
	flex: 1;
	width: 0;
	/* 关键：允许 flex 项目收缩 */
}

.yx-table-scroll-content {
	display: flex;
	flex-direction: column;
	min-width: 100%;
}

.yx-row {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
}
</style>
