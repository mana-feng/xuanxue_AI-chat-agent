<template>
	<SectionBlock icon="tmicon-monitoring" title="Agent 对话" :subtitle="subtitle">
		<view class="agent-console">
			<view v-if="pendingAction" class="action-banner">
				<view class="action-banner__text">
					<text class="action-banner__title">Agent 建议执行</text>
					<text class="action-banner__body">{{ pendingAction.reason || pendingAction.label }}</text>
				</view>
				<button class="action-btn" @tap="emit('apply-pending')">{{ pendingAction.label }}</button>
			</view>

			<view v-if="contextItems.length" class="context-banner">
				<text class="context-banner__title">当前可继续接手的盘面</text>
				<view class="context-banner__items">
					<text v-for="item in contextItems" :key="item" class="context-banner__item">{{ item }}</text>
				</view>
			</view>

			<scroll-view
				class="message-list"
				scroll-y
				:scroll-with-animation="true"
				:scroll-into-view="lastMessageId"
			>
				<view
					v-for="msg in messages"
					:id="msg.id"
					:key="msg.id"
					class="message-item"
					:class="[
						msg.role === 'user' ? 'message-item--user' : 'message-item--assistant',
						msg.status === 'error' ? 'message-item--error' : '',
					]"
				>
					<view class="message-avatar">
						<text class="message-avatar__text">{{ msg.role === 'user' ? '我' : 'AI' }}</text>
					</view>
					<view class="message-bubble">
						<view v-if="msg.status === 'waiting'" class="waiting-indicator">
							<text class="waiting-indicator__text">正在整理操作建议</text>
							<text class="waiting-indicator__dots">...</text>
						</view>
						<text v-else class="message-text" selectable user-select>{{ msg.text }}</text>
						<text class="message-meta">{{ msg.time }}</text>
					</view>
				</view>
			</scroll-view>

			<view class="compose-box">
				<textarea
					v-model="draftValue"
					class="compose-input"
					auto-height
					maxlength="-1"
					:disabled="sending"
					placeholder="例如：我想看职业方向，帮我判断该走八字还是紫微，并直接带我打开对应页面"
					confirm-type="send"
					@confirm="emit('send')"
				/>
				<view class="compose-actions">
					<text class="compose-tip">{{ composeTip }}</text>
					<button class="send-btn" :disabled="sending || !draftValue.trim()" @tap="emit('send')">
						{{ sending ? '发送中...' : '发送给 Agent' }}
					</button>
				</view>
			</view>
		</view>
	</SectionBlock>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionBlock from '@/components/layout/SectionBlock.vue';
import type { NavigateAction, UiMessage } from '@/features/agent/types';

const props = defineProps<{
	subtitle: string;
	pendingAction: NavigateAction | null;
	contextItems: string[];
	messages: UiMessage[];
	lastMessageId: string;
	modelValue: string;
	sending: boolean;
	composeTip: string;
}>();

const emit = defineEmits<{
	(event: 'update:modelValue', value: string): void;
	(event: 'send'): void;
	(event: 'apply-pending'): void;
}>();

const draftValue = computed({
	get: () => props.modelValue,
	set: (value: string) => emit('update:modelValue', value),
});
</script>

<style scoped>
.agent-console {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.action-banner,
.context-banner {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px 16px;
	border-radius: 18px;
}

.action-banner {
	background: linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(14, 165, 233, 0.1));
	border: 1px solid rgba(79, 70, 229, 0.14);
}

.action-banner__text {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.action-banner__title {
	font-size: 13px;
	font-weight: 700;
	color: #312e81;
}

.action-banner__body {
	font-size: 13px;
	line-height: 1.6;
	color: #3730a3;
}

.context-banner {
	background: rgba(248, 250, 252, 0.96);
	border: 1px solid #e2e8f0;
}

.context-banner__title {
	font-size: 13px;
	font-weight: 700;
	color: #0f172a;
}

.context-banner__items {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 8px;
}

.context-banner__item {
	padding: 5px 8px;
	border-radius: 999px;
	background: rgba(15, 23, 42, 0.05);
	font-size: 12px;
	color: #334155;
}

.message-list {
	height: 920rpx;
	min-height: 360px;
	max-height: 680px;
	padding: 14px;
	border-radius: 20px;
	background: linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
	border: 1px solid rgba(148, 163, 184, 0.18);
}

.message-item {
	display: flex;
	flex-direction: row;
	gap: 10px;
	margin-bottom: 12px;
	align-items: flex-start;
}

.message-item--user {
	flex-direction: row-reverse;
}

.message-avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 999px;
	background: linear-gradient(135deg, #4338ca, #0ea5e9);
	flex-shrink: 0;
}

.message-item--user .message-avatar {
	background: linear-gradient(135deg, #0f172a, #334155);
}

.message-avatar__text {
	font-size: 12px;
	font-weight: 700;
	color: #ffffff;
}

.message-bubble {
	max-width: 84%;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px 14px;
	border-radius: 18px;
	background: #ffffff;
	border: 1px solid rgba(148, 163, 184, 0.2);
}

.message-item--user .message-bubble {
	background: linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%);
	border-color: transparent;
}

.message-item--error .message-bubble {
	background: rgba(254, 242, 242, 0.96);
	border-color: rgba(248, 113, 113, 0.24);
}

.message-text {
	font-size: 13px;
	line-height: 1.7;
	color: #0f172a;
	white-space: pre-wrap;
}

.message-item--user .message-text {
	color: #ffffff;
}

.message-item--error .message-text {
	color: #991b1b;
}

.message-meta {
	font-size: 11px;
	color: #94a3b8;
}

.message-item--user .message-meta {
	color: rgba(255, 255, 255, 0.72);
}

.waiting-indicator {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

.waiting-indicator__text,
.waiting-indicator__dots {
	font-size: 13px;
	color: #475569;
}

.compose-box {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.98);
	border: 1px solid rgba(148, 163, 184, 0.2);
}

.compose-input {
	width: 100%;
	min-height: 110px;
	padding: 12px 14px;
	border-radius: 16px;
	background: rgba(248, 250, 252, 0.96);
	font-size: 14px;
	line-height: 1.6;
	color: #0f172a;
}

.compose-actions {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.compose-tip {
	flex: 1;
	min-width: 0;
	font-size: 12px;
	line-height: 1.5;
	color: #64748b;
}

.action-btn,
.send-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0 16px;
	height: 38px;
	border-radius: 999px;
	font-size: 13px;
	font-weight: 700;
	background: linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%);
	color: #ffffff;
}

.action-btn::after,
.send-btn::after {
	border: none;
}

.send-btn[disabled] {
	opacity: 0.55;
}
</style>
