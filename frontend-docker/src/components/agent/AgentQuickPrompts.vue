<template>
	<SectionBlock
		icon="tmicon-comment-dots"
		title="快捷指令"
		subtitle="这些自然语言会直接发送给 Agent，用来触发推荐与页面控制"
	>
		<view class="quick-list">
			<view
				v-for="item in quickPrompts"
				:key="item.label"
				class="quick-chip"
				@tap="emit('quick-prompt', item.prompt)"
			>
				<text class="quick-chip__label">{{ item.label }}</text>
				<text class="quick-chip__text">{{ item.prompt }}</text>
			</view>
		</view>
	</SectionBlock>
</template>

<script setup lang="ts">
import SectionBlock from '@/components/layout/SectionBlock.vue';
import type { QuickPrompt } from '@/features/agent/types';

defineProps<{
	quickPrompts: QuickPrompt[];
}>();

const emit = defineEmits<{
	(event: 'quick-prompt', prompt: string): void;
}>();
</script>

<style scoped>
.quick-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.quick-chip {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 14px 16px;
	border-radius: 16px;
	background: rgba(255, 255, 255, 0.92);
	border: 1px solid rgba(148, 163, 184, 0.2);
}

.quick-chip__label {
	font-size: 13px;
	font-weight: 700;
	color: #0f172a;
}

.quick-chip__text {
	font-size: 13px;
	line-height: 1.6;
	color: #475569;
}

@media (min-width: 900px) {
	.quick-list {
		flex-direction: row;
		flex-wrap: wrap;
	}

	.quick-chip {
		width: calc(50% - 6px);
	}
}
</style>
