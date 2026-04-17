<template>
	<view class="param-preview-component">
		<view v-if="params && params.length" class="param-grid">
			<view v-for="(p, idx) in params" :key="idx" class="param-chip">
				<tm-text class="param-line" :label="`第${idx + 1}爻： ${getYaoSymbol(p)}  ${getYaoName(p)}`" />
			</view>
		</view>
		<view v-else>
			<tm-text :font-size="20" color="#9ca3af" label="尚未生成爻"></tm-text>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { getYaoName, getYaoSymbol } from '@/features/liuyao/uiHelpers';

const props = defineProps({
	params: { type: Array as () => number[], default: () => [] }
});
</script>

<style scoped>
.param-preview-component {}
.param-grid {
	display: flex;
	gap: 10px;
	flex-wrap: nowrap;
	overflow-x: auto;
	align-items: center;
	margin-top: 8px;
	justify-content: center;
}
.param-chip {
	background: #fff;
	border: 1px solid #e6edf7;
	padding: 10px 14px;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(31, 41, 55, 0.03);
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 140px;
	min-height: 44px;
}

.param-line {
	font-size: 16px;
	color: #0f1724;
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
