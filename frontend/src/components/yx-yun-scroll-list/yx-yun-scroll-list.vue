<template>
	<view>
		<!-- 大运 -->
		<tm-sheet
			v-if="(yun_store as any)[map_list[0].list].length"
			class="my-20 yun-sheet"
			:round="3"
			:shadow="2"
			:margin="[0, 12]"
		>
			<tm-text _class="font-weight-b" :label="map_list[0].title"></tm-text>
			<view class="list-divider"></view>
			<view class="scroll-container">
				<scroll-view
					ref="scrollView_0"
					class="scroll-view"
					scroll-x="true"
					:show-scrollbar="true"
					:enable-flex="true"
				>
					<view
						class="scroll-view-item"
						v-for="(ditem, dindex) in (yun_store as any)[map_list[0].list]"
						:key="dindex"
					>
						<view
							class="scroll-view-item-default"
							:class="{
								'scroll-view-item-active':
									(yun_store as any)[map_list[0].index] == dindex
							}"
							@click="ScrollItemClick(0, dindex)"
						>
							<view><tm-text :label="ditem.start_year"></tm-text></view>
							<view><tm-text :label="ditem.ganzhi"></tm-text></view>
							<view><tm-text :label="ditem.start_age + '岁'"></tm-text></view>
							<view><tm-text :label="ditem.shishen"></tm-text></view>
						</view>
					</view>
				</scroll-view>

				<view v-if="(yun_store as any)[map_list[0].index] >= 0" class="selected-info">
					<view v-if="getCachedShenSha(0).length > 0" class="px-20 py-10">
						<tm-text
							label="神煞："
							:font-size="32"
							color="primary"
							_class="font-weight-b"
						></tm-text>
						<tm-text
							:label="getCachedShenSha(0).join('、')"
							:font-size="30"
							color="grey-darken-1"
							class="ml-10"
						></tm-text>
					</view>
					<view v-if="getCachedHasRelations(0)" class="px-20 py-10">
						<tm-text
							label="关系："
							:font-size="32"
							color="primary"
							_class="font-weight-b"
						></tm-text>
						<view class="mt-6">
							<view v-if="getCachedRelationValue(0, 'ganHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(0, 'ganHe')" :font-size="30" color="orange"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(0, 'zhiLiuHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(0, 'zhiLiuHe')" :font-size="30" color="green"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(0, 'zhiSanHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(0, 'zhiSanHe')" :font-size="30" color="blue"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(0, 'zhiSanHui')" class="mb-6">
								<tm-text :label="getCachedRelationValue(0, 'zhiSanHui')" :font-size="30" color="purple"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(0, 'zhiLiuChong').length > 0" class="mb-6">
								<tm-text :label="'冲：' + getCachedRelationArray(0, 'zhiLiuChong').join('、')" :font-size="30" color="red"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(0, 'zhiXing').length > 0" class="mb-6">
								<tm-text :label="'刑：' + getCachedRelationArray(0, 'zhiXing').join('、')" :font-size="30" color="red-darken-1"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(0, 'zhiHai').length > 0" class="mb-6">
								<tm-text :label="'害：' + getCachedRelationArray(0, 'zhiHai').join('、')" :font-size="30" color="orange-darken-1"></tm-text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</tm-sheet>

		<!-- 流年 -->
		<tm-sheet
			v-if="(yun_store as any)[map_list[1].list].length"
			class="my-20 yun-sheet"
			:round="3"
			:shadow="2"
			:margin="[0, 12]"
		>
			<tm-text _class="font-weight-b" :label="map_list[1].title"></tm-text>
			<view class="list-divider"></view>
			<view class="scroll-container">
				<scroll-view
					ref="scrollView_1"
					class="scroll-view"
					scroll-x="true"
					:show-scrollbar="true"
					:enable-flex="true"
				>
					<view
						class="scroll-view-item"
						v-for="(ditem, dindex) in (yun_store as any)[map_list[1].list]"
						:key="dindex"
					>
						<view
							class="scroll-view-item-default"
							:class="{
								'scroll-view-item-active':
									(yun_store as any)[map_list[1].index] == dindex
							}"
							@click="ScrollItemClick(1, dindex)"
						>
							<view><tm-text :label="ditem.year"></tm-text></view>
							<view><tm-text :label="ditem.ganzhi"></tm-text></view>
							<view><tm-text :label="ditem.age + '岁'"></tm-text></view>
							<view><tm-text :label="ditem.shishen"></tm-text></view>
						</view>
					</view>
				</scroll-view>

				<view v-if="(yun_store as any)[map_list[1].index] >= 0" class="selected-info">
					<view v-if="getCachedShenSha(1).length > 0" class="px-20 py-10">
						<tm-text label="神煞：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
						<tm-text :label="getCachedShenSha(1).join('、')" :font-size="30" color="grey-darken-1" class="ml-10"></tm-text>
					</view>
					<view v-if="getCachedHasRelations(1)" class="px-20 py-10">
						<tm-text label="关系：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
						<view class="mt-6">
							<view v-if="getCachedRelationValue(1, 'ganHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(1, 'ganHe')" :font-size="30" color="orange"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(1, 'zhiLiuHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(1, 'zhiLiuHe')" :font-size="30" color="green"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(1, 'zhiSanHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(1, 'zhiSanHe')" :font-size="30" color="blue"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(1, 'zhiSanHui')" class="mb-6">
								<tm-text :label="getCachedRelationValue(1, 'zhiSanHui')" :font-size="30" color="purple"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(1, 'zhiLiuChong').length > 0" class="mb-6">
								<tm-text :label="'冲：' + getCachedRelationArray(1, 'zhiLiuChong').join('、')" :font-size="30" color="red"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(1, 'zhiXing').length > 0" class="mb-6">
								<tm-text :label="'刑：' + getCachedRelationArray(1, 'zhiXing').join('、')" :font-size="30" color="red-darken-1"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(1, 'zhiHai').length > 0" class="mb-6">
								<tm-text :label="'害：' + getCachedRelationArray(1, 'zhiHai').join('、')" :font-size="30" color="orange-darken-1"></tm-text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</tm-sheet>

		<!-- 流月 -->
		<tm-sheet
			v-if="(yun_store as any)[map_list[2].list].length"
			class="my-20 yun-sheet"
			:round="3"
			:shadow="2"
			:margin="[0, 12]"
		>
			<tm-text _class="font-weight-b" :label="map_list[2].title"></tm-text>
			<view class="list-divider"></view>
			<view class="scroll-container">
				<scroll-view
					ref="scrollView_2"
					class="scroll-view"
					scroll-x="true"
					:show-scrollbar="true"
					:enable-flex="true"
				>
					<view
						class="scroll-view-item"
						v-for="(ditem, dindex) in (yun_store as any)[map_list[2].list]"
						:key="dindex"
					>
						<view
							class="scroll-view-item-default"
							:class="{
								'scroll-view-item-active':
									(yun_store as any)[map_list[2].index] == dindex
							}"
							@click="ScrollItemClick(2, dindex)"
						>
							<view><tm-text :label="ditem.jieqi"></tm-text></view>
							<view><tm-text :label="ditem.date"></tm-text></view>
							<view><tm-text :label="ditem.ganzhi"></tm-text></view>
							<view><tm-text :label="ditem.shishen"></tm-text></view>
						</view>
					</view>
				</scroll-view>

				<view v-if="(yun_store as any)[map_list[2].index] >= 0" class="selected-info">
					<view v-if="getCachedShenSha(2).length > 0" class="px-20 py-10">
						<tm-text label="神煞：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
						<tm-text :label="getCachedShenSha(2).join('、')" :font-size="30" color="grey-darken-1" class="ml-10"></tm-text>
					</view>
					<view v-if="getCachedHasRelations(2)" class="px-20 py-10">
						<tm-text label="关系：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
						<view class="mt-6">
							<view v-if="getCachedRelationValue(2, 'ganHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(2, 'ganHe')" :font-size="30" color="orange"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(2, 'zhiLiuHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(2, 'zhiLiuHe')" :font-size="30" color="green"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(2, 'zhiSanHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(2, 'zhiSanHe')" :font-size="30" color="blue"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(2, 'zhiSanHui')" class="mb-6">
								<tm-text :label="getCachedRelationValue(2, 'zhiSanHui')" :font-size="30" color="purple"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(2, 'zhiLiuChong').length > 0" class="mb-6">
								<tm-text :label="'冲：' + getCachedRelationArray(2, 'zhiLiuChong').join('、')" :font-size="30" color="red"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(2, 'zhiXing').length > 0" class="mb-6">
								<tm-text :label="'刑：' + getCachedRelationArray(2, 'zhiXing').join('、')" :font-size="30" color="red-darken-1"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(2, 'zhiHai').length > 0" class="mb-6">
								<tm-text :label="'害：' + getCachedRelationArray(2, 'zhiHai').join('、')" :font-size="30" color="orange-darken-1"></tm-text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</tm-sheet>

		<!-- 流日 -->
		<tm-sheet
			v-if="(yun_store as any)[map_list[3].list].length"
			class="my-20 yun-sheet"
			:round="3"
			:shadow="2"
			:margin="[0, 12]"
		>
			<tm-text _class="font-weight-b" :label="map_list[3].title"></tm-text>
			<view class="list-divider"></view>
			<view class="scroll-container scroll-container-liuri">
				<scroll-view
					ref="scrollView_3"
					class="scroll-view scroll-view-liuri draggable-scroll"
					scroll-x="true"
					:show-scrollbar="true"
					:enable-flex="true"
				>
					<view
						class="scroll-view-item"
						v-for="(ditem, dindex) in limitedDayList"
						:key="dindex"
					>
						<view
							class="scroll-view-item-default"
							:class="{
								'scroll-view-item-active':
									(yun_store as any)[map_list[3].index] == getOriginalDayIndex(dindex)
							}"
							@click="ScrollItemClick(3, getOriginalDayIndex(dindex))"
						>
							<view><tm-text :label="formatSolarDate(ditem.date)"></tm-text></view>
							<view><tm-text :label="ditem.nongli"></tm-text></view>
							<view><tm-text :label="ditem.ganzhi"></tm-text></view>
							<view><tm-text :label="ditem.shishen"></tm-text></view>
						</view>
					</view>
				</scroll-view>

				<view v-if="(yun_store as any)[map_list[3].index] >= 0" class="selected-info">
					<view v-if="getCachedShenSha(3).length > 0" class="px-20 py-10">
						<tm-text label="神煞：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
						<tm-text :label="getCachedShenSha(3).join('、')" :font-size="30" color="grey-darken-1" class="ml-10"></tm-text>
					</view>
					<view v-if="getCachedHasRelations(3)" class="px-20 py-10">
						<tm-text label="关系：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
						<view class="mt-6">
							<view v-if="getCachedRelationValue(3, 'ganHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(3, 'ganHe')" :font-size="30" color="orange"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(3, 'zhiLiuHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(3, 'zhiLiuHe')" :font-size="30" color="green"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(3, 'zhiSanHe')" class="mb-6">
								<tm-text :label="getCachedRelationValue(3, 'zhiSanHe')" :font-size="30" color="blue"></tm-text>
							</view>
							<view v-if="getCachedRelationValue(3, 'zhiSanHui')" class="mb-6">
								<tm-text :label="getCachedRelationValue(3, 'zhiSanHui')" :font-size="30" color="purple"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(3, 'zhiLiuChong').length > 0" class="mb-6">
								<tm-text :label="'冲：' + getCachedRelationArray(3, 'zhiLiuChong').join('、')" :font-size="30" color="red"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(3, 'zhiXing').length > 0" class="mb-6">
								<tm-text :label="'刑：' + getCachedRelationArray(3, 'zhiXing').join('、')" :font-size="30" color="red-darken-1"></tm-text>
							</view>
							<view v-if="getCachedRelationArray(3, 'zhiHai').length > 0" class="mb-6">
								<tm-text :label="'害：' + getCachedRelationArray(3, 'zhiHai').join('、')" :font-size="30" color="orange-darken-1"></tm-text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</tm-sheet>
	</view>
</template>

<script lang="ts" setup>
import { onMounted, watch, nextTick, computed, ref, onUnmounted } from 'vue';
import { useYunStore } from '@/store/yun';
import { useBaziStore } from '@/store/bazi';
import { calculateShenShaForGanZhi, calculateGanZhiRelations } from '@/libs/utils/bazi-enhanced';

const yun_store = useYunStore();
const bazi_store = useBaziStore();
const dragCleanups: Array<() => void> = [];

// 限制流日显示数量，只显示当前流月中的每一天
const limitedDayList = computed(() => {
	const dayList = yun_store.day_list || [];
	const monthList = yun_store.month_list || [];
	const monthIndex = yun_store.month_index;

	// 如果没有流月数据或索引无效，返回全部流日
	if (!monthList.length || monthIndex < 0 || monthIndex >= monthList.length) {
		return dayList;
	}

	// 获取当前流月的数据
	const currentMonth = monthList[monthIndex] as any;
	if (!currentMonth || !currentMonth.date) {
		return dayList;
	}

	// 获取当前流年的年份
	const yearList = yun_store.year_list || [];
	const yearIndex = yun_store.year_index;
	if (!yearList.length || yearIndex < 0 || yearIndex >= yearList.length) {
		return dayList;
	}
	const currentYear = (yearList[yearIndex] as any).year;

	// 计算当前流月的日期范围
	// currentMonth.date 格式如 "2/4"，表示月/日
	// currentMonth.next_jieqi_date 格式如 "3/5"，表示下一个节气的月/日

	// 特殊处理：小寒流月（索引为11）应该是下一年的1月6号到2月3号
	let startYear, startMonth, startDay, endYear, endMonth, endDay;
	if (monthIndex === 11) {
		// 小寒流月：起始日期为下一年的1月6号，结束日期为下一年的2月3号（包含）
		startYear = currentYear + 1;
		startMonth = 1;
		startDay = 6;
		endYear = currentYear + 1;
		endMonth = 2;
		endDay = 3;
	} else {
		// 其他流月：使用当前节气的日期作为起始
		const [month, day] = currentMonth.date.split('/').map(Number);
		startYear = currentYear;
		startMonth = month;
		startDay = day;

		// 结束日期：使用下一个节气的日期
		// 如果流月索引>=10，说明下一个节气是下一年的
		endYear = monthIndex < 10 ? currentYear : currentYear + 1;
		const [nextMonth, nextDay] = currentMonth.next_jieqi_date.split('/').map(Number);
		endMonth = nextMonth;
		endDay = nextDay;
	}

	// 构建日期范围字符串用于比较（格式：YYYY/M/D）
	const startDateStr = `${startYear}/${startMonth}/${startDay}`;
	const endDateStr = `${endYear}/${endMonth}/${endDay}`;

	// 解析日期对象（用于比较，只比较年月日，忽略时间部分）
	const parseDate = (dateStr: string): Date => {
		// 统一格式为 YYYY/M/D
		const normalized = dateStr.replace(/-/g, '/');
		const parts = normalized.split('/');
		if (parts.length === 3) {
			const year = parseInt(parts[0]);
			const month = parseInt(parts[1]) - 1; // Date 对象的月份是 0-11
			const day = parseInt(parts[2]);
			return new Date(year, month, day);
		}
		return new Date(normalized);
	};

	const startDate = parseDate(startDateStr);
	const endDate = parseDate(endDateStr);

	// 过滤流日：只保留在当前流月日期范围内的
	// 对于小寒流月：包含起始日期和结束日期（2月3号）
	// 对于其他流月：包含起始日期，不包含结束日期（因为结束日期是下一个流月的起始日期）
	const filteredDays = dayList.filter((day: any) => {
		if (!day.date) return false;

		const dayDate = parseDate(day.date);

		// 比较日期（只比较年月日，忽略时间部分）
		if (monthIndex === 11) {
			// 小寒流月：包含2月3号
			return dayDate >= startDate && dayDate <= endDate;
		} else {
			// 其他流月：不包含结束日期
			return dayDate >= startDate && dayDate < endDate;
		}
	});

	return filteredDays.length > 0 ? filteredDays : dayList;
});

// 获取流日列表的起始索引偏移量（用于索引映射）
const dayListStartOffset = computed(() => {
	const dayList = yun_store.day_list || [];
	const limitedList = limitedDayList.value;

	// 如果过滤后的列表等于原列表，偏移量为0
	if (limitedList.length === dayList.length) {
		return 0;
	}

	// 找到过滤后列表的第一个元素在原列表中的索引
	if (limitedList.length > 0 && dayList.length > 0) {
		const firstLimitedDay = limitedList[0] as any;
		const originalIndex = dayList.findIndex((day: any) => {
			return day.date === firstLimitedDay.date;
		});
		return originalIndex >= 0 ? originalIndex : 0;
	}

	return 0;
});

// 将显示索引转换为原始索引（仅用于流日）
function getOriginalDayIndex(displayIndex: number): number {
	const dayList = yun_store.day_list || [];
	const limitedList = limitedDayList.value;

	// 如果过滤后的列表等于原列表，直接返回显示索引
	if (limitedList.length === dayList.length) {
		return displayIndex;
	}

	// 获取显示列表中对应索引的日期
	if (displayIndex >= 0 && displayIndex < limitedList.length) {
		const displayDay = limitedList[displayIndex] as any;
		const originalIndex = dayList.findIndex((day: any) => {
			return day.date === displayDay.date;
		});
		return originalIndex >= 0 ? originalIndex : displayIndex;
	}

	return displayIndex;
}

// 格式化阳历日期显示
function formatSolarDate(dateStr: string | undefined): string {
	if (!dateStr) return '';

	// 日期格式可能是 "2024/2/4" 或 "2024/02/04"
	const date = new Date(dateStr.replace(/-/g, '/'));
	if (isNaN(date.getTime())) {
		// 如果解析失败，返回原始字符串
		return dateStr;
	}

	const month = date.getMonth() + 1;
	const day = date.getDate();

	// 格式化为 "2月4日" 的格式
	return `${month}月${day}日`;
}

const map_list: Array<{ title: string; list: string; index: string }> = [
	{
		title: '大运',
		list: 'dayun_list',
		index: 'current_index',
	},
	{
		title: '流年',
		list: 'year_list',
		index: 'year_index',
	},
	{
		title: '流月',
		list: 'month_list',
		index: 'month_index',
	},
	{
		title: '流日',
		list: 'day_list',
		index: 'day_index',
	},
];

// 缓存神煞和关系计算结果，避免重复计算
const shenShaCache: { [key: number]: string[] } = {};
const relationsCache: { [key: number]: any } = {};
const cacheKeys: { [key: number]: string } = {};

function getCacheKey(mindex: number): string {
	const mitem = map_list[mindex];
	const selectedIndex = (yun_store as any)[mitem.index];
	return `${mitem.index}_${selectedIndex}`;
}

function getCachedShenSha(mindex: number): string[] {
	const cacheKey = getCacheKey(mindex);
	if (cacheKeys[mindex] === cacheKey && shenShaCache[mindex]) {
		return shenShaCache[mindex];
	}
	const mitem = map_list[mindex];
	const result = getSelectedShenSha(mitem.index, mitem.list);
	shenShaCache[mindex] = result;
	cacheKeys[mindex] = cacheKey;
	return result;
}

function getCachedRelations(mindex: number): any {
	const cacheKey = getCacheKey(mindex);
	if (cacheKeys[mindex] === cacheKey && relationsCache[mindex]) {
		return relationsCache[mindex];
	}
	const mitem = map_list[mindex];
	const result = getSelectedRelations(mitem.index, mitem.list);
	relationsCache[mindex] = result;
	cacheKeys[mindex] = cacheKey;
	return result;
}

function getCachedHasRelations(mindex: number): boolean {
	const relations = getCachedRelations(mindex);
	if (!relations) return false;
	return !!(
		relations.ganHe ||
		relations.zhiLiuHe ||
		relations.zhiSanHe ||
		relations.zhiSanHui ||
		(relations.zhiLiuChong && relations.zhiLiuChong.length > 0) ||
		(relations.zhiXing && relations.zhiXing.length > 0) ||
		(relations.zhiHai && relations.zhiHai.length > 0)
	);
}

function getCachedRelationValue(
	mindex: number,
	key: 'ganHe' | 'zhiLiuHe' | 'zhiSanHe' | 'zhiSanHui'
): string {
	const relations = getCachedRelations(mindex);
	return relations?.[key] || '';
}

function getCachedRelationArray(
	mindex: number,
	key: 'zhiLiuChong' | 'zhiXing' | 'zhiHai'
): string[] {
	const relations = getCachedRelations(mindex);
	return relations?.[key] || [];
}

function ScrollItemClick(e: number, index: number) {
	if (e > 3) return;
	const key_list = ['current_index', 'year_index', 'month_index', 'day_index'];
	const methods_list = ['resolveLiuYear', 'resolveLiuMonth', 'resolveLiuDay'];
	
	// 检查索引是否真的改变了，避免重复计算
	const currentIndex = (yun_store as any)[key_list[e]];
	if (currentIndex === index) return;
	
	(yun_store as any)[key_list[e]] = index;
	if (e < 3) {
		(yun_store as any)[key_list[e + 1]] = 0;
	}
	// 标记用户已手动选择时间，禁用自动定位
	yun_store.markManualSelection();
	
	// 使用 nextTick 延迟执行，避免阻塞UI
	if (e < methods_list.length) {
		nextTick(() => {
			(yun_store as any)[methods_list[e]]();
		});
	}
}

function getSelectedShenSha(indexKey: string, listKey: string): string[] {
	const selectedIndex = (yun_store as any)[indexKey];
	const list = (yun_store as any)[listKey];

	if (selectedIndex < 0 || !list || !list[selectedIndex] || !list[selectedIndex].ganzhi) {
		return [];
	}

	const ganzhi = list[selectedIndex].ganzhi;
	if (!bazi_store.tiangan?.day) {
		return [];
	}

	// 获取原四柱地支用于计算驿马
	const originalZhiList: string[] = [];
	if (bazi_store.dizhi?.year) originalZhiList.push(bazi_store.dizhi.year);
	if (bazi_store.dizhi?.month) originalZhiList.push(bazi_store.dizhi.month);
	if (bazi_store.dizhi?.day) originalZhiList.push(bazi_store.dizhi.day);
	if (bazi_store.dizhi?.time) originalZhiList.push(bazi_store.dizhi.time);

	const yearZhi = bazi_store.dizhi?.year || '';
	const monthZhi = bazi_store.dizhi?.month || '';
	const dayZhi = bazi_store.dizhi?.day || '';
	const timeZhi = bazi_store.dizhi?.time || '';
	const yearGan = bazi_store.tiangan?.year || '';

	return calculateShenShaForGanZhi(
		bazi_store.tiangan.day,
		ganzhi,
		originalZhiList,
		yearZhi,
		monthZhi,
		dayZhi,
		timeZhi,
		yearGan
	);
}

function getSelectedRelations(indexKey: string, listKey: string) {
	const selectedIndex = (yun_store as any)[indexKey];
	const list = (yun_store as any)[listKey];

	if (selectedIndex < 0 || !list || !list[selectedIndex] || !list[selectedIndex].ganzhi) {
		return null;
	}

	const ganzhi = list[selectedIndex].ganzhi;
	if (!ganzhi || ganzhi.length < 2) {
		return null;
	}

	// 获取原局四柱干支
	const originalGanZhi: string[] = [];
	if (bazi_store.sizhu?.year) originalGanZhi.push(bazi_store.sizhu.year);
	if (bazi_store.sizhu?.month) originalGanZhi.push(bazi_store.sizhu.month);
	if (bazi_store.sizhu?.day) originalGanZhi.push(bazi_store.sizhu.day);
	if (bazi_store.sizhu?.time) originalGanZhi.push(bazi_store.sizhu.time);

	if (originalGanZhi.length === 0) {
		return null;
	}

	return calculateGanZhiRelations(ganzhi, originalGanZhi);
}

function hasRelations(indexKey: string, listKey: string): boolean {
	const relations = getSelectedRelations(indexKey, listKey);
	if (!relations) return false;
	return !!(
		relations.ganHe ||
		relations.zhiLiuHe ||
		relations.zhiSanHe ||
		relations.zhiSanHui ||
		(relations.zhiLiuChong && relations.zhiLiuChong.length > 0) ||
		(relations.zhiXing && relations.zhiXing.length > 0) ||
		(relations.zhiHai && relations.zhiHai.length > 0)
	);
}

function getRelationValue(
	indexKey: string,
	listKey: string,
	key: 'ganHe' | 'zhiLiuHe' | 'zhiSanHe' | 'zhiSanHui'
): string {
	const relations = getSelectedRelations(indexKey, listKey);
	return relations?.[key] || '';
}

function getRelationArray(
	indexKey: string,
	listKey: string,
	key: 'zhiLiuChong' | 'zhiXing' | 'zhiHai'
): string[] {
	const relations = getSelectedRelations(indexKey, listKey);
	return relations?.[key] || [];
}

// 自动定位到当前系统时间（只在初始加载时执行）
function autoLocateToCurrentTime() {
	// 如果已经完成自动定位，不再执行（防止用户手动选择后被重置）
	if (yun_store.autoLocated) {
		return;
	}

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1; // 1-12
	const currentDay = now.getDate();

	// 定位大运：找到 start_year <= 当前年份的最大索引
	if (yun_store.dayun_list && yun_store.dayun_list.length > 0) {
		let dayunIndex = 0;
		for (let i = 0; i < yun_store.dayun_list.length; i++) {
			const item = yun_store.dayun_list[i] as any;
			if (item.start_year && parseInt(item.start_year) <= currentYear) {
				dayunIndex = i;
			} else {
				break;
			}
		}
		if (yun_store.current_index !== dayunIndex) {
			yun_store.current_index = dayunIndex;
			yun_store.resolveLiuYear();
		}
	}

	// 等待流年数据加载完成后再定位流年
	nextTick(() => {
		// 定位流年：找到匹配当前年份的索引
		if (yun_store.year_list && yun_store.year_list.length > 0) {
			const yearIndex = yun_store.year_list.findIndex((item: any) => item.year == currentYear);
			if (yearIndex >= 0 && yun_store.year_index !== yearIndex) {
				yun_store.year_index = yearIndex;
				yun_store.resolveLiuMonth();
			}
		}

		// 等待流月数据加载完成后再定位流月
		nextTick(() => {
			// 定位流月：找到包含当前日期的流月（使用完整的日期范围比较）
			if (yun_store.month_list && yun_store.month_list.length > 0) {
				let monthIndex = -1;
				const currentYear = now.getFullYear();
				const currentMonthNum = now.getMonth() + 1;
				const currentDayNum = now.getDate();

				// 获取当前流年的年份
				const yearList = yun_store.year_list || [];
				const yearIndex = yun_store.year_index;
				if (yearList.length && yearIndex >= 0 && yearIndex < yearList.length) {
					const year = (yearList[yearIndex] as any).year;

					for (let i = 0; i < yun_store.month_list.length; i++) {
						const item = yun_store.month_list[i] as any;
						if (!item.date || !item.next_jieqi_date) continue;

						// 计算流月的日期范围
						let startYear, startMonth, startDay, endYear, endMonth, endDay;
						if (i === 11) {
							// 小寒流月：下一年的1月6号到2月3号
							startYear = year + 1;
							startMonth = 1;
							startDay = 6;
							endYear = year + 1;
							endMonth = 2;
							endDay = 3;
						} else {
							// 其他流月：使用节气的日期范围
							const [month, day] = item.date.split('/').map(Number);
							startYear = year;
							startMonth = month;
							startDay = day;

							endYear = i < 10 ? year : year + 1;
							const [nextMonth, nextDay] = item.next_jieqi_date.split('/').map(Number);
							endMonth = nextMonth;
							endDay = nextDay;
						}

						// 判断当前日期是否在这个流月范围内
						const currentDate = new Date(currentYear, currentMonthNum - 1, currentDayNum);
						const startDate = new Date(startYear, startMonth - 1, startDay);
						const endDate = new Date(endYear, endMonth - 1, endDay);

						// 对于非小寒流月，结束日期不包含（因为结束日期是下一个流月的起始日期）
						if (i === 11) {
							// 小寒流月：包含结束日期
							if (currentDate >= startDate && currentDate <= endDate) {
								monthIndex = i;
								break;
							}
						} else {
							// 其他流月：不包含结束日期
							if (currentDate >= startDate && currentDate < endDate) {
								monthIndex = i;
								break;
							}
						}
					}
				}

				if (monthIndex >= 0 && yun_store.month_index !== monthIndex) {
					yun_store.month_index = monthIndex;
					yun_store.resolveLiuDay();
				}
			}

			// 等待流日数据加载完成后再定位流日
			nextTick(() => {
				// 定位流日：找到匹配当前日期的索引
				if (yun_store.day_list && yun_store.day_list.length > 0) {
					// 格式化当前日期为 YYYY/M/D 或 YYYY/MM/DD 格式
					const currentDateStr1 = `${currentYear}/${currentMonth}/${currentDay}`;
					const currentDateStr2 = `${currentYear}/${currentMonth.toString().padStart(2, '0')}/${currentDay.toString().padStart(2, '0')}`;

					const dayIndex = yun_store.day_list.findIndex((item: any) => {
						if (item.date) {
							// 格式化日期字符串进行比较（统一格式）
							const itemDate = item.date.replace(/-/g, '/');
							// 尝试多种格式匹配
							return (
								itemDate === currentDateStr1 ||
								itemDate === currentDateStr2 ||
								itemDate.startsWith(currentDateStr1) ||
								itemDate.startsWith(currentDateStr2)
							);
						}
						return false;
					});
					if (dayIndex >= 0 && yun_store.day_index !== dayIndex) {
						yun_store.day_index = dayIndex;
					}
				}
			});
		});
	});
}

// 监听数据变化，自动定位（只在首次加载时执行）
let hasAutoLocated = false;
watch(
	() => yun_store.dayun_list.length,
	(newLen) => {
		// 只在首次加载且未完成自动定位时执行
		if (newLen > 0 && !hasAutoLocated && !yun_store.autoLocated) {
			hasAutoLocated = true;
			autoLocateToCurrentTime();
		}
	},
	{ immediate: true }
);

// 仅针对流日行（mindex===3）的滚动区域启用指针拖动
// 拖动手感与排盘详情中的拖动逻辑保持一致：按下变抓手、跟随指针位移滚动
function enableLiuriDrag(el: HTMLElement | null) {
	if (!el) return;
	if (typeof (el as any).addEventListener !== 'function') return;

	let isDown = false;
	let startX = 0;
	let startY = 0;
	let scrollLeft = 0;
	let scrollTop = 0;

	const onPointerDown = (e: PointerEvent) => {
		if (e.pointerType === 'mouse' || e.pointerType === 'pen' || e.pointerType === 'touch') {
			isDown = true;
			el.classList?.add('dragging');
			const rect = el.getBoundingClientRect();
			startX = e.clientX - rect.left;
			startY = e.clientY - rect.top;
			scrollLeft = el.scrollLeft || 0;
			scrollTop = el.scrollTop || 0;
			el.setPointerCapture?.(e.pointerId);
		}
	};

	const onPointerMove = (e: PointerEvent) => {
		if (!isDown) return;
		e.preventDefault();
		const x = e.clientX - el.getBoundingClientRect().left;
		const y = e.clientY - el.getBoundingClientRect().top;
		const walkX = x - startX;
		const walkY = y - startY;
		if (el.scrollLeft !== undefined) {
			el.scrollLeft = scrollLeft - walkX;
		}
		if (el.scrollTop !== undefined) {
			el.scrollTop = scrollTop - walkY;
		}
	};

	const endDrag = (e?: PointerEvent) => {
		if (!isDown) return;
		isDown = false;
		el.classList?.remove('dragging');
		if (e) el.releasePointerCapture?.(e.pointerId);
	};

	el.addEventListener('pointerdown', onPointerDown);
	el.addEventListener('pointermove', onPointerMove);
	el.addEventListener('pointerup', endDrag);
	el.addEventListener('pointercancel', endDrag);
	el.addEventListener('pointerleave', endDrag);

	dragCleanups.push(() => {
		el.removeEventListener('pointerdown', onPointerDown);
		el.removeEventListener('pointermove', onPointerMove);
		el.removeEventListener('pointerup', endDrag);
		el.removeEventListener('pointercancel', endDrag);
		el.removeEventListener('pointerleave', endDrag);
		el.classList?.remove('dragging');
	});
}

// 组件挂载时也尝试定位（只在首次加载时执行）
onMounted(() => {
	if (
		yun_store.dayun_list &&
		yun_store.dayun_list.length > 0 &&
		!hasAutoLocated &&
		!yun_store.autoLocated
	) {
		hasAutoLocated = true;
		autoLocateToCurrentTime();
	}
	
	// 只对流日一栏启用拖动
	nextTick(() => {
		setTimeout(() => {
			if (typeof document === 'undefined') return;
			const liuriEl = document.querySelector?.('.scroll-view-liuri') as any;
			enableLiuriDrag(liuriEl);
		}, 100);
	});
});

onUnmounted(() => {
	dragCleanups.forEach(fn => fn());
});
</script>

<style lang="scss" scoped>
.scroll-container {
	width: 100%;
	max-width: 100%;
	overflow: hidden;
	box-sizing: border-box;

	&.scroll-container-liuri {
		max-height: 400rpx;
		overflow: hidden;
	}
}

.scroll-view {
	display: block;
	box-sizing: border-box;
	white-space: nowrap;
	width: 100%;
	max-width: 100%;
	margin-bottom: 20rpx;
	overflow-x: auto;
	overflow-y: hidden;
	padding: 0 6px;
	::-webkit-scrollbar {
		display: block;
		height: 8rpx;
	}
	::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 4rpx;
	}
	::-webkit-scrollbar-thumb {
		background: #cbd5e0;
		border-radius: 4rpx;
		&:hover {
			background: #a0aec0;
		}
	}

	&.scroll-view-liuri {
		::-webkit-scrollbar {
			display: block;
			height: 8rpx;
		}
		::-webkit-scrollbar-track {
			background: #f1f1f1;
			border-radius: 4rpx;
		}
		::-webkit-scrollbar-thumb {
			background: #888;
			border-radius: 4rpx;
			&:hover {
				background: #555;
			}
		}
	}

	&-item {
		display: inline-block;
		text-align: center;
		padding: 0 10rpx;
		box-sizing: border-box;
		&-default {
			padding: 10rpx;
		}
		&-active {
			background-color: #6768ab;
			border-radius: 12rpx;
			:deep(uni-text) {
				color: #f8f8f8 !important;
			}
		}
	}
}

.draggable-scroll {
	cursor: grab;
	user-select: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
}

.draggable-scroll.dragging {
	cursor: grabbing;
	user-select: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
}

:deep(.yun-sheet) {
	width: 100%;
	box-sizing: border-box;
	margin: 0 !important;
}

.selected-info {
	border-top: 1px solid #e0e0e0;
	margin-top: 10rpx;
}

.list-divider {
	height: 1px;
	width: 100%;
	background-color: #e5e7eb;
	margin: 12rpx 0;
}
</style>
