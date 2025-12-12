<template>
	<view class="chat-page">
		<view class="chat-header">
			<text class="chat-title">AI 聊天</text>
			<text class="chat-subtitle">对接大模型的专用界面</text>
		</view>

		<scroll-view
			class="chat-body"
			scroll-y
			:scroll-with-animation="true"
			:scroll-top="scrollTop"
			:scroll-into-view="lastMessageId"
		>
			<view
				v-for="msg in messages"
				:key="msg.id"
				:id="msg.id"
				class="chat-item"
				:class="msg.role === 'user' ? 'from-user' : 'from-bot'"
			>
				<view class="avatar">
					<text>{{ msg.role === 'user' ? '我' : 'AI' }}</text>
				</view>
				<view class="bubble">
					<text class="bubble-text">{{ msg.text }}</text>
					<view class="meta">
						<text class="time">{{ msg.time }}</text>
						<text v-if="msg.status" class="status">{{ msg.status }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<view class="chat-input-bar">
			<textarea
				v-model="draft"
				class="chat-input"
				auto-height
				maxlength="-1"
				placeholder="输入消息，回车发送"
				:disabled="sending"
				@confirm="handleSend"
				confirm-type="send"
			/>
			<button class="chat-send" :disabled="sending || !draft.trim()" @tap="handleSend">
				{{ sending ? '发送中...' : '发送' }}
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';

type Role = 'user' | 'assistant';

type Message = {
	id: string;
	role: Role;
	text: string;
	time: string;
	status?: string;
};

const emit = defineEmits<{
	(e: 'send', text: string): void;
}>();

const messages = reactive<Message[]>([
	{
		id: 'm-1',
		role: 'assistant',
		text: '你好，我是你的 AI 助手，可以随时发问。',
		time: formatNow(),
		status: 'ready',
	},
]);

const draft = ref('');
const sending = ref(false);
const scrollTop = ref(0);

const lastMessageId = computed(() => (messages.length ? messages[messages.length - 1].id : ''));

function formatNow() {
	const d = new Date();
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `${hh}:${mm}`;
}

function pushMessage(role: Role, text: string, status?: string) {
	messages.push({
		id: `msg-${messages.length + 1}-${Date.now()}`,
		role,
		text,
		time: formatNow(),
		status,
	});
	nextTick(() => {
		scrollTop.value += 200; // ensure scroll-view moves down
	});
}

async function handleSend() {
	const text = draft.value.trim();
	if (!text || sending.value) return;
	sending.value = true;
	pushMessage('user', text);
	emit('send', text);
	draft.value = '';
}

// 对外暴露一个方法，便于上层在拿到模型回复后调用
defineExpose({
	appendAssistant(text: string, status?: string) {
		pushMessage('assistant', text, status);
		sending.value = false;
	},
	setSending(flag: boolean) {
		sending.value = flag;
	},
});
</script>

<style scoped>
.chat-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: #f3f4f6;
}

.chat-header {
	padding: 12px 16px;
	background: #ffffff;
	border-bottom: 1px solid #e5e7eb;
}

.chat-title {
	/* #ifndef APP-PLUS-NVUE */
	display: block;
	/* #endif */
	font-size: 18px;
	font-weight: 700;
	color: #111827;
}

.chat-subtitle {
	/* #ifndef APP-PLUS-NVUE */
	display: block;
	/* #endif */
	margin-top: 4px;
	font-size: 12px;
	color: #6b7280;
}

.chat-body {
	flex: 1;
	padding: 12px;
	/* #ifndef APP-PLUS-NVUE */
	box-sizing: border-box;
	/* #endif */
}

.chat-item {
	display: flex;
	margin-bottom: 12px;
	/* gap: 8px; nvue 不支持，使用 margin 替代 */
}

.chat-item.from-user {
	flex-direction: row-reverse;
}

.avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: #e5e7eb;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	color: #111827;
}

.bubble {
	/* #ifndef APP-PLUS-NVUE */
	max-width: 70%;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	/* #endif */
	/* #ifdef APP-PLUS-NVUE */
	width: 70%;
	/* #endif */
	padding: 10px 12px;
	border-radius: 12px;
	background: #ffffff;
}

.chat-item.from-user .bubble {
	background: #4f46e5;
	color: #f9fafb;
}

.bubble-text {
	font-size: 14px;
	line-height: 1.5;
	/* #ifndef APP-PLUS-NVUE */
	white-space: pre-wrap;
	/* #endif */
}

.meta {
	margin-top: 6px;
	display: flex;
	/* gap: 8px; nvue 不支持，使用 margin 替代 */
	font-size: 11px;
	color: #9ca3af;
}

.chat-item.from-user .meta {
	color: #e5e7eb;
}

.chat-input-bar {
	display: flex;
	/* gap: 8px; nvue 不支持，使用 margin 替代 */
	padding: 10px 12px;
	background: #ffffff;
	border-top: 1px solid #e5e7eb;
	/* #ifndef APP-PLUS-NVUE */
	box-sizing: border-box;
	/* #endif */
}

.chat-input {
	flex: 1;
	min-height: 40px;
	max-height: 120px;
	padding: 8px 10px;
	border-radius: 10px;
	border: 1px solid #e5e7eb;
	background: #f9fafb;
	font-size: 14px;
	color: #111827;
}

.chat-send {
	width: 82px;
	border: none;
	border-radius: 10px;
	background: #4f46e5;
	color: #f9fafb;
	font-size: 14px;
	font-weight: 600;
}

.chat-send:disabled {
	background: #cbd5e1;
	color: #f8fafc;
}
</style>
