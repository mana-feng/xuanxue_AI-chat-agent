<template>
	<view>
		<tm-input
			v-model="titleLocal"
				label="占卦相关信息"
				placeholder="请输入具体想要占问的事情（必填）"
				prefix="tmicon-md-bulb"
				:round="12"
				:border="1"
				:padding="[20, 18]"
			></tm-input>

			<view class="helper-row">
				<tm-text :font-size="22" color="#94a3b8" label="性别"></tm-text>
				<tm-segtab
					v-model="genderLocal"
					:list="[{ text: '男' }, { text: '女' }]"
					:width="300"
					:margin="[0, 0]"
					:default-value="0"
				></tm-segtab>
			</view>

			<view class="time-row">
				<TimeInput v-model="timeLabelLocal" @open="$emit('openTimePicker')" @use-now="$emit('useNowTime')" />
			</view>

			<view class="helper-row">
				<tm-text :font-size="22" color="#94a3b8" label="默认填入当前时间，点击选择可使用滚动轮盘选择阳历日期与时间。"></tm-text>
			</view>
	</view>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import TimeInput from '@/components/liuyao/TimeInput.vue';

const props = defineProps({
	title: { type: String, default: '' },
	timeLabel: { type: String, default: '' },
	gender: { type: [String, Number], default: '' }
});

const emit = defineEmits([
	'update:title',
	'update:timeLabel',
	'update:gender',
	'openTimePicker',
	'useNowTime'
]);

const titleLocal = ref(props.title);
const timeLabelLocal = ref(props.timeLabel);
const genderLocal = ref(props.gender);

watch(titleLocal, v => emit('update:title', v));
watch(() => props.title, v => (titleLocal.value = v));

watch(timeLabelLocal, v => emit('update:timeLabel', v));
watch(() => props.timeLabel, v => (timeLabelLocal.value = v));

watch(genderLocal, v => emit('update:gender', v));
watch(() => props.gender, v => (genderLocal.value = v));
</script>

<style scoped>
.time-row {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
}
.helper-row {
	margin-top: 8px;
}
</style>


