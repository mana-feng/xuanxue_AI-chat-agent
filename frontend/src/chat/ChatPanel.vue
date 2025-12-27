<template>
	<view class="chat-page">
		<view class="chat-header">
			<view class="header-left">
				<text class="chat-title">AI 聊天</text>
				<text class="chat-subtitle">对接大模型的专用界面</text>
			</view>
			<view v-if="quotaInfo" class="header-right">
				<text class="quota-item">次数: {{ quotaInfo.remainingCount }}</text>
			</view>
			<view v-else class="header-right">
				<text class="quota-item">加载中...</text>
			</view>
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
				:id="msg.id"
				:key="msg.id"
				class="chat-item"
				:class="msg.role === 'user' ? 'from-user' : 'from-bot'"
			>
				<view class="avatar">
					<text>{{ msg.role === 'user' ? '我' : 'AI' }}</text>
				</view>
				<view class="bubble">
					<view v-if="msg.status === 'waiting'" class="waiting-container">
						<text class="bubble-text waiting-text">正在思考</text>
						<text class="waiting-dots">...</text>
					</view>
					<text v-else class="bubble-text">{{ msg.text || ' ' }}</text>
					<view class="meta">
						<text class="time">{{ msg.time }}</text>
						<text v-if="msg.status && msg.status !== 'waiting' && msg.status !== 'stream'" class="status">{{ msg.status }}</text>
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
				confirm-type="send"
				@confirm="handleSend"
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

type QuotaInfo = {
	remainingCount: number;
};

const emit = defineEmits<{
	(e: 'send', text: string): void;
}>();

const quotaInfo = ref<QuotaInfo | null>(null);

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

// 创建等待状态的助手消息
function createWaitingMessage() {
	const newMsg: Message = {
		id: `msg-${messages.length + 1}-${Date.now()}`,
		role: 'assistant',
		text: '',
		time: formatNow(),
		status: 'waiting',
	};
	messages.push(newMsg);
	nextTick(() => {
		scrollTop.value += 200;
	});
	return newMsg;
}

// 获取或创建最后一条助手消息（用于流式更新）
function getOrCreateLastAssistantMessage() {
	const lastMsg = messages[messages.length - 1];
	// 如果是等待状态，转换为流式状态
	if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'waiting') {
		lastMsg.status = 'stream';
		lastMsg.text = '';
		return lastMsg;
	}
	// 如果已经是流式状态，直接返回
	if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'stream') {
		return lastMsg;
	}
	// 创建新的助手消息
	const newMsg: Message = {
		id: `msg-${messages.length + 1}-${Date.now()}`,
		role: 'assistant',
		text: '',
		time: formatNow(),
		status: 'stream',
	};
	messages.push(newMsg);
	nextTick(() => {
		scrollTop.value += 200;
	});
	return newMsg;
}

// 完成流式更新（将状态从 stream 改为 ready）
function finishStreaming() {
	const lastMsg = messages[messages.length - 1];
	if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'stream') {
		lastMsg.status = 'ready';
	}
	sending.value = false;
}

// 更新额度信息
function updateQuotaInfo(info: QuotaInfo) {
	quotaInfo.value = info;
}

// 获取所有消息（用于构建对话历史）
function getMessages() {
	return messages;
}

// 对外暴露一个方法，便于上层在拿到模型回复后调用
defineExpose({
	// 创建等待状态的助手消息
	createWaitingMessage,
	// 追加助手消息（支持流式更新）
	appendAssistant(text: string, status?: string) {
		if (status === 'stream') {
			// 流式更新：追加到最后一条助手消息
			const lastMsg = getOrCreateLastAssistantMessage();
			lastMsg.text += text;
			nextTick(() => {
				scrollTop.value += 200;
			});
		} else {
			// 完整回复或错误：创建新消息
			// 如果最后一条是等待状态，先移除它
			const lastMsg = messages[messages.length - 1];
			if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'waiting') {
				messages.pop();
			}
			pushMessage('assistant', text, status);
			sending.value = false;
		}
	},
	setSending(flag: boolean) {
		sending.value = flag;
	},
	finishStreaming,
	updateQuotaInfo,
	getMessages,
});
</script>

<style scoped>
.chat-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: radial-gradient(circle at 20% 18%, rgba(99, 102, 241, 0.08), transparent 40%),
		#f3f4f6;
}

.chat-header {
	padding: 10px 14px;
	background: #ffffff;
	border-bottom: 1px solid #e5e7eb;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	/* #ifndef APP-PLUS-NVUE */
	width: 100%;
	box-sizing: border-box;
	/* #endif */
}

.header-left {
	flex: 1;
	/* #ifndef APP-PLUS-NVUE */
	min-width: 0;
	/* #endif */
}

.header-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
	margin-left: 16px;
	/* #ifndef APP-PLUS-NVUE */
	gap: 4px;
	/* #endif */
	/* #ifdef APP-PLUS-NVUE */
	/* nvue 不支持 gap，使用 margin 替代 */
	/* #endif */
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

.quota-item {
	font-size: 11px;
	color: #6b7280;
	line-height: 1.4;
	text-align: right;
	/* #ifndef APP-PLUS-NVUE */
	white-space: nowrap;
	/* #endif */
	/* #ifdef APP-PLUS-NVUE */
	margin-bottom: 4px;
	/* #endif */
}

.chat-body {
	flex: 1;
	padding: 12px 12px 16px;
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
	max-width: 82%;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	/* #endif */
	/* #ifdef APP-PLUS-NVUE */
	width: 82%;
	/* #endif */
	padding: 10px 12px;
	border-radius: 14px;
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

.waiting-container {
	display: flex;
	align-items: center;
}

.waiting-text {
	color: #9ca3af;
	font-style: italic;
}

.waiting-dots {
	color: #9ca3af;
	font-style: italic;
	/* #ifndef APP-PLUS-NVUE */
	animation: blink 1.5s infinite;
	/* #endif */
}

/* #ifndef APP-PLUS-NVUE */
@keyframes blink {
	0%, 100% {
		opacity: 0.3;
	}
	50% {
		opacity: 1;
	}
}
/* #endif */

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
	padding: 10px 12px calc(10px + var(--safe-bottom));
	background: #ffffff;
	border-top: 1px solid #e5e7eb;
	/* #ifndef APP-PLUS-NVUE */
	box-sizing: border-box;
	/* #endif */
}

.chat-input {
	flex: 1;
	min-height: 44px;
	max-height: 120px;
	padding: 8px 10px;
	border-radius: 10px;
	border: 1px solid #e5e7eb;
	background: #f9fafb;
	font-size: 14px;
	color: #111827;
}

.chat-send {
	width: 76px;
	border: none;
	border-radius: 10px;
	background: #4f46e5;
	color: #f9fafb;
	font-size: 14px;
	font-weight: 600;
	min-height: 44px;
}

.chat-send:disabled {
	background: #cbd5e1;
	color: #f8fafc;
}
</style>
