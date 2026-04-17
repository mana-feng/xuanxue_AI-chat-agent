<template>
	<view class="section" :class="{ 'section--plain': plain }">
		<header v-if="hasHeader" class="section__header">
			<tm-icon v-if="icon" :name="icon" :font-size="iconSize" :color="iconColor"></tm-icon>
			<view class="section__title-wrap">
				<h2 class="section__title">{{ title }}</h2>
				<p v-if="subtitle" class="section__subtitle">{{ subtitle }}</p>
			</view>
			<view v-if="$slots.action" class="section__action">
				<slot name="action" />
			</view>
		</header>
		<view class="section__body">
			<slot />
		</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue';

const props = withDefaults(
	defineProps<{
		title: string;
		subtitle?: string;
		icon?: string;
		iconColor?: string;
		iconSize?: number;
		plain?: boolean;
	}>(),
	{
		iconColor: '#667eea',
		iconSize: 26,
		plain: false,
		subtitle: undefined,
		icon: undefined
	}
);

const slots = useSlots();
const hasHeader = computed(() => !!props.title || !!props.subtitle || !!props.icon || !!slots.action);
</script>

<style scoped>
.section--plain {
	background: transparent;
	border: 1px dashed var(--border-subtle, #e5e7eb);
	box-shadow: none;
}

.section__title-wrap {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
	min-width: 0;
}

.section__subtitle {
	margin: 0;
	font-size: clamp(13px, 2vw, 14px);
	color: #6b7280;
	line-height: 1.5;
}

.section__action {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-left: auto;
}
</style>
