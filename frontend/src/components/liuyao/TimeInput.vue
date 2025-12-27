<template>
  <view class="time-input-component">
    <tm-text
      v-if="label"
      class="time-input-label"
      :font-size="22"
      color="#2d3748"
      :label="label"
    ></tm-text>
    <tm-button
      class="time-picker-btn"
      type="grey"
      :block="true"
      :round="12"
      icon="tmicon-md-time"
      icon-pos="left"
      :label="innerValue || placeholder"
      :padding="[16, 18]"
      :shadow="0"
      @tap="$emit('open')"
    ></tm-button>
    <tm-button
      class="suffix-btn"
      size="small"
      type="primary"
      :round="6"
      :padding="[6, 10]"
      label="现在"
      @tap="onUseNow"
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
  gap: 6px;
}
.time-picker-btn {
  width: 100%;
  justify-content: flex-start;
  font-size: 20px;
  text-align: left;
  min-height: 70px;
  padding: 20px 22px !important;
}
.time-picker-btn :deep(.tm-button__content) {
  gap: 12px;
}
.time-input-label {
  font-weight: 600;
}
.suffix-btn {
  align-self: flex-end;
  font-size: 16px;
  padding: 8px 16px !important;
}
@media (min-width: 900px) {
  .time-picker-btn {
    font-size: 20px;
  }
}
</style>
