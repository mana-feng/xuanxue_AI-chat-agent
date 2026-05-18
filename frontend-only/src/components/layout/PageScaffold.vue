<template>
	<view class="app-shell">
		<yx-nav-header></yx-nav-header>
		<view class="app-main">
			<view class="page-shell">
				<view class="page-card" :class="cardClass">
					<view v-if="hasHero" class="page-title-wrapper">
						<view class="page-title-text">
							<h1 v-if="props.title" class="page-title">{{ props.title }}</h1>
							<p v-if="props.subtitle" class="page-subtitle">{{ props.subtitle }}</p>
						</view>
						<view v-if="props.tag || $slots['header-extra']" class="page-title-extra">
							<slot name="header-extra">
								<tm-tag v-if="props.tag" type="primary" :round="8" :label="props.tag"></tm-tag>
							</slot>
						</view>
					</view>

					<view class="page-card__body">
						<slot />
					</view>

					<view v-if="$slots.footer" class="page-card__footer">
						<slot name="footer" />
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue';
import YxNavHeader from '@/components/yx-nav-header/yx-nav-header.vue';

const props = defineProps<{
	title?: string;
	subtitle?: string;
	tag?: string;
	cardClass?: string | string[] | Record<string, boolean>;
}>();

const slots = useSlots();
const hasHero = computed(() => !!(props.title || props.subtitle || props.tag || slots['header-extra']));
const cardClass = computed(() => props.cardClass);
</script>

<style scoped>
.page-title-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
}

.page-title-text {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
	min-width: 0;
}

.page-title-extra {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
}

.page-card__body {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

@media (min-width: 900px) {
	.page-card__body {
		gap: 16px;
	}
}
</style>
