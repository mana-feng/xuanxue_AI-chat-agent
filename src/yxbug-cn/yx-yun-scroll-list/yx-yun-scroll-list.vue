<template>
	<view>
		<view v-for="(mitem, mindex) in map_list" :key="mitem.index">
			<tm-sheet v-if="(yun_store as any)[mitem.list].length" class="my-20" :round="3" :shadow="2" :margin="[20, 0]">
				<tm-text _class="font-weight-b" :label="mitem.title"></tm-text>
				<tm-divider></tm-divider>
				<view class="scroll-container">
					<scroll-view class="scroll-view" scroll-x="true">
						<view class="scroll-view-item" v-for="(ditem, dindex) in (yun_store as any)[mitem.list]">
							<view
								class="scroll-view-item-default"
								:class="{ 'scroll-view-item-active': (yun_store as any)[mitem.index] == dindex && mindex < 4 }"
								@click="ScrollItemClick(mindex, dindex)"
							>
								<view v-if="mindex == 0">
									<view><tm-text :label="ditem.start_year"></tm-text></view>
									<view><tm-text :label="ditem.ganzhi"></tm-text></view>
									<view><tm-text :label="ditem.start_age + '岁'"></tm-text></view>
									<view><tm-text :label="ditem.shishen"></tm-text></view>
								</view>
								<view v-if="mindex == 1">
									<view><tm-text :label="ditem.year"></tm-text></view>
									<view><tm-text :label="ditem.ganzhi"></tm-text></view>
									<view><tm-text :label="ditem.age + '岁'"></tm-text></view>
									<view><tm-text :label="ditem.shishen"></tm-text></view>
								</view>
								<view v-if="mindex == 2">
									<view><tm-text :label="ditem.jieqi"></tm-text></view>
									<view><tm-text :label="ditem.date"></tm-text></view>
									<view><tm-text :label="ditem.ganzhi"></tm-text></view>
									<view><tm-text :label="ditem.shishen"></tm-text></view>
								</view>
								<view v-if="mindex == 3">
									<view><tm-text :label="ditem.nongli"></tm-text></view>
									<view><tm-text :label="ditem.ganzhi"></tm-text></view>
									<view><tm-text :label="ditem.shishen"></tm-text></view>
								</view>
								<view v-if="mindex == 4">
									<view><tm-text :label="ditem.time"></tm-text></view>
									<view><tm-text :label="ditem.ganzhi"></tm-text></view>
									<view><tm-text :label="ditem.shishen"></tm-text></view>
								</view>
							</view>
						</view>
					</scroll-view>
					
					<!-- 在选中项下方显示神煞和关系（仅对大运、小运、流月、流日） -->
					<view v-if="mindex < 4 && (yun_store as any)[mitem.index] >= 0" class="selected-info">
						<!-- 显示选中项的神煞 -->
						<view v-if="getSelectedShenSha(mitem.index, mitem.list).length > 0" class="px-20 py-10">
							<tm-text label="神煞：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
							<tm-text 
								:label="getSelectedShenSha(mitem.index, mitem.list).join('、')" 
								:font-size="30" 
								color="grey-darken-1"
								class="ml-10"
							></tm-text>
						</view>
						
						<!-- 显示选中项与原局的关系 -->
						<view v-if="hasRelations(mitem.index, mitem.list)" class="px-20 py-10">
							<tm-text label="关系：" :font-size="32" color="primary" _class="font-weight-b"></tm-text>
							<view class="mt-6">
								<!-- 天干合化 -->
								<view v-if="getRelationValue(mitem.index, mitem.list, 'ganHe')" class="mb-6">
									<tm-text 
										:label="getRelationValue(mitem.index, mitem.list, 'ganHe')" 
										:font-size="30" 
										color="orange"
									></tm-text>
								</view>
								<!-- 地支六合 -->
								<view v-if="getRelationValue(mitem.index, mitem.list, 'zhiLiuHe')" class="mb-6">
									<tm-text 
										:label="getRelationValue(mitem.index, mitem.list, 'zhiLiuHe')" 
										:font-size="30" 
										color="green"
									></tm-text>
								</view>
								<!-- 地支三合 -->
								<view v-if="getRelationValue(mitem.index, mitem.list, 'zhiSanHe')" class="mb-6">
									<tm-text 
										:label="getRelationValue(mitem.index, mitem.list, 'zhiSanHe')" 
										:font-size="30" 
										color="blue"
									></tm-text>
								</view>
								<!-- 地支三会 -->
								<view v-if="getRelationValue(mitem.index, mitem.list, 'zhiSanHui')" class="mb-6">
									<tm-text 
										:label="getRelationValue(mitem.index, mitem.list, 'zhiSanHui')" 
										:font-size="30" 
										color="purple"
									></tm-text>
								</view>
								<!-- 地支六冲 -->
								<view v-if="getRelationArray(mitem.index, mitem.list, 'zhiLiuChong').length > 0" class="mb-6">
									<tm-text 
										:label="'冲：' + getRelationArray(mitem.index, mitem.list, 'zhiLiuChong').join('、')" 
										:font-size="30" 
										color="red"
									></tm-text>
								</view>
								<!-- 地支相刑 -->
								<view v-if="getRelationArray(mitem.index, mitem.list, 'zhiXing').length > 0" class="mb-6">
									<tm-text 
										:label="'刑：' + getRelationArray(mitem.index, mitem.list, 'zhiXing').join('、')" 
										:font-size="30" 
										color="red-darken-1"
									></tm-text>
								</view>
								<!-- 地支相害 -->
								<view v-if="getRelationArray(mitem.index, mitem.list, 'zhiHai').length > 0" class="mb-6">
									<tm-text 
										:label="'害：' + getRelationArray(mitem.index, mitem.list, 'zhiHai').join('、')" 
										:font-size="30" 
										color="orange-darken-1"
									></tm-text>
								</view>
								<!-- 五行生克 -->
								<view v-if="getRelationArray(mitem.index, mitem.list, 'wuxingShengKe').length > 0" class="mb-6">
									<tm-text 
										:label="'生克：' + getRelationArray(mitem.index, mitem.list, 'wuxingShengKe').join('、')" 
										:font-size="30" 
										color="grey-darken-1"
									></tm-text>
								</view>
							</view>
						</view>
					</view>
				</view>
			</tm-sheet>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { useYunStore } from '@/store/yun';
import { useBaziStore } from '@/store/bazi';
import { calculateShenShaForGanZhi, calculateGanZhiRelations } from '@/tool/bazi-enhanced';

const yun_store = useYunStore();
const bazi_store = useBaziStore();

const map_list: Array<{ title: string; list: string; index: string }> = [
	{
		title: '大运',
		list: 'dayun_list',
		index: 'current_index'
	},
	{
		title: '小运',
		list: 'year_list',
		index: 'year_index'
	},
	{
		title: '流月',
		list: 'month_list',
		index: 'month_index'
	},
	{
		title: '流日',
		list: 'day_list',
		index: 'day_index'
	},
	{
		title: '流时',
		list: 'time_list',
		index: 'time_index'
	}
];

function ScrollItemClick(e: number, index: number) {
	if (e > 3) return;
	const key_list = ['current_index', 'year_index', 'month_index', 'day_index', 'time_index'];
	const methods_list = ['resolveLiuYear', 'resolveLiuMonth', 'resolveLiuDay', 'resolveLiuTime'];
	(yun_store as any)[key_list[e]] = index;
	(yun_store as any)[key_list[e + 1]] = 0;
	(yun_store as any)[methods_list[e]]();
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
	
	return calculateShenShaForGanZhi(bazi_store.tiangan.day, ganzhi, originalZhiList);
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
		(relations.zhiHai && relations.zhiHai.length > 0) ||
		(relations.wuxingShengKe && relations.wuxingShengKe.length > 0)
	);
}

function getRelationValue(indexKey: string, listKey: string, key: 'ganHe' | 'zhiLiuHe' | 'zhiSanHe' | 'zhiSanHui'): string {
	const relations = getSelectedRelations(indexKey, listKey);
	return relations?.[key] || '';
}

function getRelationArray(indexKey: string, listKey: string, key: 'zhiLiuChong' | 'zhiXing' | 'zhiHai' | 'wuxingShengKe'): string[] {
	const relations = getSelectedRelations(indexKey, listKey);
	return relations?.[key] || [];
}
</script>

<style lang="scss" scoped>
.scroll-container {
	width: 100%;
}

.scroll-view {
	white-space: nowrap;
	width: 100%;
	margin-bottom: 20rpx;
	&-item {
		display: inline-block;
		text-align: center;
		padding: 0 10rpx;
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

.selected-info {
	border-top: 1px solid #e0e0e0;
	margin-top: 10rpx;
}
</style>
