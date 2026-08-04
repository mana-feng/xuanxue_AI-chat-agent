<template>
  <view class="time-input-component">
    <view v-if="label" class="time-input-header">
      <tm-text
        class="time-input-label"
        :font-size="22"
        color="#2d3748"
        :label="label"
      ></tm-text>
      <text class="now-link" @tap="onUseNow">现在</text>
    </view>
    <tm-button
      class="time-picker-btn"
      type="primary"
      linear="right"
      linear-deep="accent"
      :block="true"
      :round="12"
      icon="tmicon-calendar-alt"
      icon-pos="left"
      :label="innerValue || placeholder"
      :padding="[24, 24]"
      :shadow="0"
      @tap="$emit('open')"
    ></tm-button>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { formatDateTime } from '@/features/liuyao/uiHelpers';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '起卦时间' },
  placeholder: { type: String, default: '默认当前时间，点击按钮选择' },
});

const emit = defineEmits(['update:modelValue', 'open', 'useNow']);

const innerValue = ref(props.modelValue);
watch(() => props.modelValue, (v) => (innerValue.value = v));
watch(innerValue, (v) => emit('update:modelValue', v));

function onUseNow() {
  const nowLabel = formatDateTime(new Date());
  innerValue.value = nowLabel;
  emit('useNow');
}
</script>

<style scoped>
.time-input-component {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.time-input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.time-input-label {
  font-weight: 600;
}
.now-link {
  font-size: 13px;
  color: #667eea;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  background: #eef2ff;
  cursor: pointer;
}
.now-link:active {
  background: #e0e7ff;
}
.time-picker-btn {
  width: 100%;
  justify-content: flex-start;
  font-size: 20px;
  text-align: left;
}
.time-picker-btn :deep(.tm-button__content) {
  gap: 12px;
}
@media (min-width: 900px) {
  .time-picker-btn {
    font-size: 20px;
  }
}
</style>
