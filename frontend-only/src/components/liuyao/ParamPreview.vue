<template>
	<view class="param-preview-component">
		<view v-if="params && params.length" class="param-grid">
			<view v-for="(p, idx) in params" :key="idx" class="param-chip">
				<view class="param-line">
					<text class="yao-prefix">第{{ idx + 1 }}爻：</text>
					<text class="yao-symbol">{{ getYaoSymbol(p) }}</text>
					<text class="yao-name">{{ getYaoName(p) }}</text>
				</view>
			</view>
		</view>
		<view v-else>
			<tm-text :font-size="20" color="#9ca3af" label="尚未生成爻"></tm-text>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { getYaoName, getYaoSymbol } from '@/features/liuyao/uiHelpers';

defineProps({
	params: { type: Array as () => number[], default: () => [] }
});
</script>

<style scoped>
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
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: nowrap;
	flex-direction: row;
	font-size: 16px;
	color: #0f1724;
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.yao-symbol {
	display: inline-block;
	min-width: 72px;
	text-align: center;
	white-space: pre;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	letter-spacing: 1px;
	flex: 0 0 auto;
}

.yao-prefix,
.yao-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.yao-prefix {
	flex: 0 0 auto;
}

.yao-name {
	flex: 1 1 auto;
	min-width: 0;
}
</style>
