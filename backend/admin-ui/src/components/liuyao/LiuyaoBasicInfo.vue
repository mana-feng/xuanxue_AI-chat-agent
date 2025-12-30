<template>
	<view class="section">
		<header class="section__header">
			<tm-icon name="tmicon-md-person" :font-size="26" color="#667eea"></tm-icon>
			<h2 class="section__title">基础信息</h2>
		</header>
		<view class="section__body">
			<tm-input
				v-model="titleLocal"
				label="占卦相关信息"
				placeholder="请输入占卦相关信息，如：求财/合作/考试等"
				prefix="tmicon-md-bulb"
				:round="12"
				:border="1"
				:padding="[20, 18]"
			></tm-input>

			<view class="helper-row">
				<tm-text :font-size="22" color="#94a3b8" label="性别"></tm-text>
				<tm-radio-group v-model="genderLocal">
					<tm-radio label="男" :value="0" :margin="[0, 16, 0, 0]"></tm-radio>
					<tm-radio label="女" :value="1"></tm-radio>
				</tm-radio-group>
			</view>

			<view class="time-row">
				<TimeInput v-model="timeLabelLocal" @open="$emit('openTimePicker')" @useNow="$emit('useNowTime')" />
			</view>

			<view class="helper-row">
				<tm-text :font-size="22" color="#94a3b8" label="默认填入当前时间，点击选择可使用滚动轮盘选择阳历日期与时间。"></tm-text>
			</view>
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


