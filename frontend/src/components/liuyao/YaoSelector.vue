<template>
	<view class="yao-selector-item">
		<tm-text :font-size="22" color="#718096" :label="label" class="yao-label"></tm-text>
		<picker mode="selector" :range="options" range-key="label" :value="selectedIndex" @change="onChange">
			<view class="picker-trigger">
				<view class="picker-content">
					<tm-text :font-size="28" :label="displayLabel" class="picker-label" _class="font-weight-b"></tm-text>
				</view>
				<tm-icon name="tmicon-angle-down" :font-size="20" color="#94a3b8"></tm-icon>
			</view>
		</picker>
	</view>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

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

const displayLabel = computed(() => {
	const opt = props.options[selectedIndex.value];
	return opt ? opt.label : '请选择';
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
}
.yao-symbol {
	color: #94a3b8;
}
</style>


