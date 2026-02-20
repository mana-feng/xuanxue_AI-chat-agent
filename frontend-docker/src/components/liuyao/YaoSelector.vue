<template>
	<view class="yao-selector-item">
		<tm-text :font-size="22" color="#718096" :label="label" class="yao-label"></tm-text>
		<picker mode="selector" :range="options" range-key="label" :value="selectedIndex" @change="onChange">
			<view class="picker-trigger">
				<view class="picker-content">
					<text v-if="displaySymbol" class="yao-symbol">{{ displaySymbol }}</text>
					<text v-if="displayName" class="yao-name">{{ displayName }}</text>
				</view>
				<tm-icon name="tmicon-angle-down" :font-size="20" color="#94a3b8"></tm-icon>
			</view>
		</picker>
	</view>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { getYaoName } from '@/features/liuyao/uiHelpers';

const props = defineProps({
	modelValue: { type: [String, Number], default: '' },
	options: { type: Array as () => Array<any>, required: true },
	label: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'change']);

const selectedIndex = computed(() => {
	const idx = props.options.findIndex(opt => String(opt.value) === String(props.modelValue));
	return idx >= 0 ? idx : 0;
});

const displaySymbol = computed(() => {
	const opt = props.options[selectedIndex.value];
	if (!opt) return '';
	return opt.symbol || opt.label || '';
});

const displayName = computed(() => {
	const opt = props.options[selectedIndex.value];
	if (!opt) return '';
	const v = opt.value;
	if (v === '' || v === null || v === undefined) return '';
	return opt.name || getYaoName(v);
});

function onChange(e: any) {
	const idx = e.detail.value;
	const opt = props.options[idx];
	emit('update:modelValue', String(opt.value));
	emit('change', e);
}
</script>

<style scoped>
.yao-selector-item {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.picker-trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.picker-content {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-direction: row;
	flex-wrap: nowrap;
}
.yao-symbol {
	color: #94a3b8;
	font-weight: 700;
	min-width: 72px;
	text-align: center;
	white-space: pre;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	letter-spacing: 1px;
}

.yao-name {
	color: #334155;
	font-size: 16px;
	white-space: nowrap;
}
</style>

