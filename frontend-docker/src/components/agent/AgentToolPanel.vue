<template>
	<SectionBlock
		icon="tmicon-applicationgroup"
		title="可控工具"
		subtitle="先让 Agent 判断最合适的排盘方式，也可以直接打开对应页面"
	>
		<view class="tool-grid">
			<view v-for="card in toolCards" :key="card.target" class="tool-card">
				<view class="tool-card__head">
					<view class="tool-card__icon">
						<tm-icon :name="card.icon" :font-size="26" color="#4338ca"></tm-icon>
					</view>
					<view class="tool-card__title-wrap">
						<text class="tool-card__title">{{ card.title }}</text>
						<text class="tool-card__subtitle">{{ card.subtitle }}</text>
					</view>
				</view>
				<text class="tool-card__summary">{{ card.summary }}</text>
				<view class="tool-card__tags">
					<text v-for="badge in card.badges" :key="badge" class="tool-card__tag">{{ badge }}</text>
				</view>
				<view class="tool-card__actions">
					<button class="tool-btn tool-btn--ghost" @tap="emit('open-target', card.target)">立即打开</button>
					<button class="tool-btn tool-btn--primary" @tap="emit('quick-prompt', card.prompt)">让 Agent 帮我用</button>
				</view>
			</view>
		</view>
	</SectionBlock>
</template>

<script setup lang="ts">
import SectionBlock from '@/components/layout/SectionBlock.vue';
import type { AgentTarget, ToolCard } from '@/features/agent/types';

defineProps<{
	toolCards: ToolCard[];
}>();

const emit = defineEmits<{
	(event: 'open-target', target: AgentTarget): void;
	(event: 'quick-prompt', prompt: string): void;
}>();
</script>

<style scoped>
.tool-grid {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.tool-card {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px;
	border-radius: 18px;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 247, 255, 0.98) 100%);
	border: 1px solid rgba(99, 102, 241, 0.12);
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.tool-card__head {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12px;
}

.tool-card__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	border-radius: 14px;
	background: linear-gradient(135deg, rgba(79, 70, 229, 0.14), rgba(14, 165, 233, 0.16));
}

.tool-card__title-wrap {
	display: flex;
	flex-direction: column;
	gap: 4px;
	flex: 1;
	min-width: 0;
}

.tool-card__title {
	font-size: 16px;
	font-weight: 700;
	color: #111827;
}

.tool-card__subtitle {
	font-size: 12px;
	color: #6366f1;
}

.tool-card__summary {
	font-size: 13px;
	line-height: 1.65;
	color: #475569;
}

.tool-card__tags {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 8px;
}

.tool-card__tag {
	padding: 4px 8px;
	border-radius: 999px;
	background: rgba(99, 102, 241, 0.08);
	font-size: 12px;
	color: #4338ca;
}

.tool-card__actions {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 10px;
}

.tool-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0 16px;
	height: 38px;
	border-radius: 999px;
	font-size: 13px;
	font-weight: 700;
}

.tool-btn::after {
	border: none;
}

.tool-btn--ghost {
	background: rgba(15, 23, 42, 0.06);
	color: #0f172a;
}

.tool-btn--primary {
	background: linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%);
	color: #ffffff;
}

@media (min-width: 900px) {
	.tool-grid {
		flex-direction: row;
		flex-wrap: wrap;
	}

	.tool-card {
		width: calc(33.333% - 8px);
	}
}
</style>
