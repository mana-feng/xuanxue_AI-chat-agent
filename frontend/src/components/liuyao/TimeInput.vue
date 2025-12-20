<template>
	<view class="time-input-component">
	<tm-input
		v-model="innerValue"
		:label="label"
		:placeholder="placeholder"
		prefix="tmicon-md-time"
		suffix="tmicon-angle-right"
		:round="12"
		:border="1"
		:padding="[18,12]"
		readonly
		@tap="$emit('open')"
	></tm-input>
		<tm-button class="suffix-btn" size="small" type="primary" :round="6" @tap="onUseNow" :padding="[6,10]" label="今"></tm-button>
	</view>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { formatDateTime } from '@/features/liuyao/uiHelpers';

const props = defineProps({
	modelValue: { type: String, default: '' },
	label: { type: String, default: '起卦时间' },
	placeholder: { type: String, default: '默认当前时间，点击选择' }
});

const emit = defineEmits(['update:modelValue', 'open', 'useNow']);

const innerValue = ref(props.modelValue);
watch(() => props.modelValue, v => (innerValue.value = v));
watch(innerValue, v => emit('update:modelValue', v));

function onUseNow() {
	const nowLabel = formatDateTime(new Date());
	// update local and notify parent immediately
	innerValue.value = nowLabel;
	emit('useNow');
}
</script>

<style scoped>
.time-input-component {
	position: relative;
	width: 100%;
}
.time-input-component :deep(.tm-input) {
	width: calc(100% - 70px);
	display: inline-block;
}
.suffix-btn {
	position: absolute;
	right: 8px;
	top: 50%;
	transform: translateY(-50%);
}
</style>


