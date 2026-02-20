<template>
	<view class="advanced-chat-root">
		<vue-advanced-chat
			:height="'100%'"
			:current-user-id="currentUserId"
			:rooms="roomsJson"
			:rooms-loaded="true"
			:room-id="roomId"
			:load-first-room="true"
			:single-room="true"
			:show-search="false"
			:show-add-room="false"
			:show-files="false"
			:show-audio="false"
			:show-reaction-emojis="false"
			room-actions="[]"
			menu-actions="[]"
			message-actions="[]"
			:messages="messagesJson"
			:messages-loaded="true"
			@send-message="onSendMessage"
		/>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { register } from 'vue-advanced-chat';

register();

type Role = 'user' | 'assistant';
type Status = 'waiting' | 'stream' | 'ready' | 'error' | undefined;

type LocalMessage = {
	id: string;
	role: Role;
	text: string;
	time: string;
	status?: Status;
};

type QuotaInfo = {
	remainingCount: number;
};

defineProps<{
	disableAutoRestore?: boolean;
	quotaInfo?: QuotaInfo | null;
}>();

const emit = defineEmits<{
	(e: 'send', text: string): void;
}>();

const currentUserId = 'local-user';
const assistantId = 'assistant';
const roomId = 'room-ai';

let idSeed = 1;
const sending = ref(false);
const remainingCount = ref<number | null>(null);
const localMessages = ref<LocalMessage[]>([
	{
		id: 'm-1',
		role: 'assistant',
		text: '你好，我是你的 AI 助手。',
		time: formatNow(),
		status: 'ready',
	},
]);

const rooms = computed(() => [
	{
		roomId,
		roomName:
			typeof remainingCount.value === 'number' ? `AI 解答 (剩余 ${remainingCount.value})` : 'AI 解答',
		avatar: '',
		users: [
			{
				_id: currentUserId,
				username: '我',
			},
			{
				_id: assistantId,
				username: 'AI',
				status: {
					state: 'online',
					lastChanged: new Date().toISOString(),
				},
			},
		],
		index: Date.now(),
	},
]);

const uiMessages = computed(() => {
	return localMessages.value.map((msg) => {
		const isUser = msg.role === 'user';
		const text =
			msg.status === 'waiting' && !msg.text.trim()
				? '思考中...'
				: msg.text || (msg.status === 'stream' ? '...' : '');
		return {
			_id: msg.id,
			content: text,
			senderId: isUser ? currentUserId : assistantId,
			timestamp: msg.time,
			date: formatDateLabel(),
			saved: true,
			distributed: true,
			seen: !isUser,
		};
	});
});

const roomsJson = computed(() => JSON.stringify(rooms.value));
const messagesJson = computed(() => JSON.stringify(uiMessages.value));

function formatNow() {
	const d = new Date();
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `${hh}:${mm}`;
}

function formatDateLabel() {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function nextId() {
	idSeed += 1;
	return `msg-${idSeed}-${Date.now()}`;
}

function pushLocalMessage(role: Role, text: string, status?: Status) {
	localMessages.value = [
		...localMessages.value,
		{
			id: nextId(),
			role,
			text,
			time: formatNow(),
			status,
		},
	];
}

function findLastAssistantIndex(statuses: Status[]) {
	for (let i = localMessages.value.length - 1; i >= 0; i -= 1) {
		const item = localMessages.value[i];
		if (item.role !== 'assistant') continue;
		if (statuses.includes(item.status)) return i;
	}
	return -1;
}

function onSendMessage(event: any) {
	const payload = event?.detail?.[0] ?? event?.detail ?? event;
	const text = String(payload?.content || '').trim();
	if (!text || sending.value) return;

	pushLocalMessage('user', text, 'ready');
	emit('send', text);
}

function createWaitingMessage() {
	pushLocalMessage('assistant', '', 'waiting');
}

function appendAssistant(text: string, status?: Status) {
	const chunk = String(text || '');
	if (status === 'stream') {
		let idx = findLastAssistantIndex(['waiting', 'stream']);
		if (idx < 0) {
			createWaitingMessage();
			idx = findLastAssistantIndex(['waiting', 'stream']);
		}
		if (idx >= 0) {
			const next = [...localMessages.value];
			const item = { ...next[idx] };
			if (item.status === 'waiting') {
				item.text = '';
			}
			item.status = 'stream';
			item.text = `${item.text || ''}${chunk}`;
			next[idx] = item;
			localMessages.value = next;
		}
		return;
	}

	const waitingIdx = findLastAssistantIndex(['waiting']);
	if (waitingIdx >= 0) {
		const next = [...localMessages.value];
		next.splice(waitingIdx, 1);
		localMessages.value = next;
	}

	pushLocalMessage('assistant', chunk, status || 'ready');
}

function setSending(flag: boolean) {
	sending.value = Boolean(flag);
}

function finishStreaming() {
	const idx = findLastAssistantIndex(['stream']);
	if (idx >= 0) {
		const next = [...localMessages.value];
		next[idx] = {
			...next[idx],
			status: 'ready',
		};
		localMessages.value = next;
	}
	sending.value = false;
}

function updateQuotaInfo(info: QuotaInfo) {
	const value = Number(info?.remainingCount);
	remainingCount.value = Number.isFinite(value) ? value : null;
}

function getMessages() {
	return localMessages.value;
}

defineExpose({
	createWaitingMessage,
	appendAssistant,
	setSending,
	finishStreaming,
	updateQuotaInfo,
	getMessages,
});
</script>

<style scoped>
.advanced-chat-root {
	width: 100%;
	height: 100%;
}
</style>
