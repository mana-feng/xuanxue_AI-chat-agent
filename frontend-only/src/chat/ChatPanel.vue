<template>
	<view class="chat-page">
		<scroll-view
			class="chat-body"
			scroll-y
			:show-scrollbar="true"
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
					<view v-if="(msg.status === 'waiting' || msg.status === 'stream') && !msg.text" class="thinking-section">
						<view v-if="msg.thinking" class="thinking-content" @tap="toggleThinking(msg.id)">
							<view class="thinking-header">
								<text class="thinking-label">思考中</text>
								<text class="thinking-toggle">{{ msg.showThinking ? '收起' : '展开' }}</text>
							</view>
							<text v-if="msg.showThinking" class="thinking-text">{{ msg.thinking }}</text>
						</view>
						<view v-else class="waiting-container">
							<text class="bubble-text waiting-text">正在思考</text>
							<text class="waiting-dots">...</text>
						</view>
					</view>
					<view v-if="(msg.status === 'waiting' || msg.status === 'stream') && msg.text && msg.thinking" class="thinking-section">
						<view class="thinking-content" @tap="toggleThinking(msg.id)">
							<view class="thinking-header">
								<text class="thinking-label">思考中</text>
								<text class="thinking-toggle">{{ msg.showThinking ? '收起' : '展开' }}</text>
							</view>
							<text v-if="msg.showThinking" class="thinking-text">{{ msg.thinking }}</text>
						</view>
					</view>
					<text v-if="msg.text" class="bubble-text" :selectable="true" :user-select="true">{{ msg.text }}</text>
					<view v-if="msg.status === 'ready' && msg.thinking" class="thinking-section-done">
						<view class="thinking-toggle-bar" @tap="toggleThinking(msg.id)">
							<text class="thinking-toggle-label">思考过程</text>
							<text class="thinking-toggle">{{ msg.showThinking ? '收起' : '展开' }}</text>
						</view>
						<text v-if="msg.showThinking" class="thinking-text">{{ msg.thinking }}</text>
					</view>
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
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import {
	getPersistentItem,
	idbGetItem,
	idbSetItem,
	setPersistentItem,
} from '@/utils/persistentStorage';

type Role = 'user' | 'assistant';

type Message = {
	id: string;
	role: Role;
	text: string;
	time: string;
	status?: string;
	thinking?: string;
	showThinking?: boolean;
};

const props = defineProps<{
	disableAutoRestore?: boolean;
}>();

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

function toggleThinking(msgId: string) {
	for (const msg of messages) {
		if (msg.id === msgId) {
			msg.showThinking = !msg.showThinking;
			break;
		}
	}
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
		thinking: '',
		showThinking: true,
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

type ChatArchiveV1 = {
	v: 1;
	kind: 'chat';
	savedAt: string;
	messages: Array<{
		role: Role;
		text: string;
		time: string;
	}>;
};

const ARCHIVE_HANDLE_KEY = 'chat_archive_handle_v1';
const ARCHIVE_FALLBACK_KEY = 'chat_archive_last_v1';

const archiveBusy = ref(false);

function buildArchivePayload(): ChatArchiveV1 {
	const exported: ChatArchiveV1 = {
		v: 1,
		kind: 'chat',
		savedAt: new Date().toISOString(),
		messages: [],
	};
	for (const msg of messages) {
		if (msg.id === 'm-1') continue;
		if (msg.status === 'waiting' || msg.status === 'stream') continue;
		if (!msg.text || !msg.text.trim()) continue;
		exported.messages.push({
			role: msg.role,
			text: msg.text,
			time: msg.time,
		});
	}
	return exported;
}

function applyArchivePayload(archive: ChatArchiveV1) {
	const restored: Message[] = [
		{
			id: 'm-1',
			role: 'assistant',
			text: '你好，我是你的 AI 助手，可以随时发问。',
			time: formatNow(),
			status: 'ready',
		},
	];
	for (const item of archive.messages || []) {
		if (!item?.text) continue;
		restored.push({
			id: `msg-${restored.length + 1}-${Date.now()}`,
			role: item.role === 'user' ? 'user' : 'assistant',
			text: String(item.text),
			time: item.time || formatNow(),
			status: 'ready',
		});
	}
	messages.splice(0, messages.length, ...restored);
	nextTick(() => {
		scrollTop.value += 9999;
	});
}

function downloadTextFile(text: string, filename: string) {
	if (typeof window === 'undefined') return;
	const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function writeTextToFileHandle(handle: any, text: string) {
	const writable = await handle.createWritable();
	await writable.write(text);
	await writable.close();
}

async function readTextFromFileHandle(handle: any): Promise<string> {
	const file = await handle.getFile();
	return file.text();
}

async function pickFileTextByInput(): Promise<string> {
	if (typeof window === 'undefined') {
		throw new Error('not supported');
	}
	return new Promise<string>((resolve, reject) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json,application/json';
		input.onchange = async () => {
			try {
				const file = input.files?.[0];
				if (!file) return reject(new Error('no file'));
				const text = await file.text();
				resolve(text);
			} catch (e) {
				reject(e);
			}
		};
		input.click();
	});
}

async function handleSaveArchive() {
	if (archiveBusy.value) return;
	archiveBusy.value = true;
	try {
		const archive = buildArchivePayload();
		const archiveText = JSON.stringify(archive);
		setPersistentItem(ARCHIVE_FALLBACK_KEY, archiveText, 365 * 24 * 60 * 60 * 1000);
		const filename = `ai-chat-${new Date().toISOString().slice(0, 10)}.json`;

		const win = typeof window !== 'undefined' ? (window as any) : null;
		if (win?.showSaveFilePicker) {
			const handle = await win.showSaveFilePicker({
				suggestedName: filename,
				types: [
					{
						description: 'JSON',
						accept: { 'application/json': ['.json'] },
					},
				],
			});
			await writeTextToFileHandle(handle, archiveText);
			await idbSetItem(ARCHIVE_HANDLE_KEY, handle);
		} else {
			downloadTextFile(archiveText, filename);
		}
		uni.showToast({ title: '已保存', icon: 'success' });
	} catch (e: any) {
		uni.showToast({ title: e?.message || '保存失败', icon: 'none' });
	} finally {
		archiveBusy.value = false;
	}
}

async function handleRestoreArchive() {
	if (archiveBusy.value) return;
	archiveBusy.value = true;
	try {
		let text: string | null = null;
		const win = typeof window !== 'undefined' ? (window as any) : null;
		const existingHandle = await idbGetItem<any>(ARCHIVE_HANDLE_KEY);
		if (existingHandle) {
			try {
				text = await readTextFromFileHandle(existingHandle);
			} catch {
				text = null;
			}
		}

		if (!text && win?.showOpenFilePicker) {
			const handles = await win.showOpenFilePicker({
				multiple: false,
				types: [
					{
						description: 'JSON',
						accept: { 'application/json': ['.json'] },
					},
				],
			});
			const handle = handles?.[0];
			if (handle) {
				text = await readTextFromFileHandle(handle);
				await idbSetItem(ARCHIVE_HANDLE_KEY, handle);
			}
		}

		if (!text) {
			try {
				text = await pickFileTextByInput();
			} catch {
				text = null;
			}
		}

		if (!text) {
			const fallback = getPersistentItem<string>(ARCHIVE_FALLBACK_KEY);
			if (fallback) text = fallback;
		}

		if (!text) {
			throw new Error('未找到可恢复的记录');
		}

		const archive = JSON.parse(text) as ChatArchiveV1;
		if (!archive || archive.v !== 1 || archive.kind !== 'chat' || !Array.isArray(archive.messages)) {
			throw new Error('记录格式不正确');
		}
		applyArchivePayload(archive);
		uni.showToast({ title: '已恢复', icon: 'success' });
	} catch (e: any) {
		uni.showToast({ title: e?.message || '恢复失败', icon: 'none' });
	} finally {
		archiveBusy.value = false;
	}
}

async function tryAutoRestoreOnOpen() {
	if (props.disableAutoRestore) return;
	try {
		const handle = await idbGetItem<any>(ARCHIVE_HANDLE_KEY);
		if (handle) {
			const permission = (await handle.queryPermission?.({ mode: 'read' })) || 'prompt';
			if (permission === 'granted') {
				const text = await readTextFromFileHandle(handle);
				const archive = JSON.parse(text) as ChatArchiveV1;
				if (archive?.v === 1 && archive?.kind === 'chat' && Array.isArray(archive.messages)) {
					applyArchivePayload(archive);
					return;
				}
			}
		}
		const fallback = getPersistentItem<string>(ARCHIVE_FALLBACK_KEY);
		if (fallback) {
			const archive = JSON.parse(fallback) as ChatArchiveV1;
			if (archive?.v === 1 && archive?.kind === 'chat' && Array.isArray(archive.messages)) {
				applyArchivePayload(archive);
			}
		}
	} catch {
		return;
	}
}

// 获取所有消息（用于构建对话历史）
function getMessages() {
	return messages;
}

// 对外暴露一个方法，便于上层在拿到模型回复后调用
defineExpose({
	createWaitingMessage,
	appendAssistant(text: string, status?: string, thinking?: string) {
		if (status === 'stream') {
			const lastMsg = getOrCreateLastAssistantMessage();
			if (thinking !== undefined) {
				lastMsg.thinking = (lastMsg.thinking || '') + thinking;
			}
			if (text) {
				lastMsg.text += text;
			}
			nextTick(() => {
				scrollTop.value += 200;
			});
		} else {
			const lastMsg = messages[messages.length - 1];
			if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'waiting') {
				messages.pop();
			}
			pushMessage('assistant', text, status);
			sending.value = false;
		}
	},
	appendThinking(text: string) {
		const lastMsg = messages[messages.length - 1];
		if (lastMsg && lastMsg.role === 'assistant' && (lastMsg.status === 'waiting' || lastMsg.status === 'stream')) {
			lastMsg.thinking = (lastMsg.thinking || '') + text;
			lastMsg.status = 'stream';
			nextTick(() => {
				scrollTop.value += 200;
			});
		}
	},
	setSending(flag: boolean) {
		sending.value = flag;
	},
	finishStreaming,
	getMessages,
	handleRestoreArchive,
	handleSaveArchive,
	archiveBusy,
});

onMounted(() => {
	tryAutoRestoreOnOpen();
});
</script>

<style scoped>
.chat-page {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	background: radial-gradient(circle at 20% 18%, rgba(59, 130, 246, 0.08), transparent 40%),
		radial-gradient(circle at 80% 10%, rgba(14, 165, 233, 0.06), transparent 38%),
		#f6f8fc;
}

.chat-header {
	padding: 10px 16px;
	background: rgba(255, 255, 255, 0.85);
	backdrop-filter: blur(10px);
	border-bottom: 1px solid #e5e9f2;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.header-left {
	flex: 1;
}

.header-right {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;
	margin-left: 12px;
}

.chat-title {
	font-size: 17px;
	font-weight: 700;
	color: #1f2937;
}

.chat-subtitle {
	margin-top: 2px;
	font-size: 11px;
	color: #6b7280;
}

.header-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;
}

.header-btn {
	height: 26px;
	line-height: 26px;
	padding: 0 10px;
	font-size: 12px;
	border-radius: 999px;
	border: 1px solid rgba(59, 130, 246, 0.3);
	background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.1));
	color: #3b82f6;
	margin-left: 6px;
}

.header-btn:active {
	filter: brightness(0.985);
}

.header-btn:disabled {
	opacity: 0.6;
}

.chat-body {
	flex: 1;
	min-height: 0;
	padding: 16px 14px 18px;
	scrollbar-width: thin;
	scrollbar-color: #94a3b8 rgba(226, 232, 240, 0.8);
}

.chat-body :deep(::-webkit-scrollbar) {
	width: 6px;
	display: block;
}

.chat-body :deep(::-webkit-scrollbar-track) {
	background: transparent;
}

.chat-body :deep(::-webkit-scrollbar-thumb) {
	background: #c7d2dd;
	border-radius: 999px;
}

.chat-item {
	display: flex;
	margin-bottom: 16px;
}

.chat-item.from-user {
	flex-direction: row-reverse;
}

.avatar {
	width: 34px;
	height: 34px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	font-weight: 600;
	flex-shrink: 0;
}

.chat-item.from-bot .avatar {
	background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
	color: #ffffff;
}

.chat-item.from-user .avatar {
	background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
	color: #ffffff;
}

.bubble {
	max-width: 78%;
	padding: 12px 14px;
	border-radius: 16px;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.chat-item.from-bot .bubble {
	background: #ffffff;
	color: #1f2937;
	border-bottom-left-radius: 4px;
	margin-left: 10px;
}

.chat-item.from-user .bubble {
	background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
	color: #ffffff;
	border-bottom-right-radius: 4px;
	margin-right: 10px;
}

.bubble-text {
	font-size: 14px;
	line-height: 1.6;
	white-space: pre-wrap;
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
	animation: blink 1.5s infinite;
}

.thinking-section {
	margin-bottom: 8px;
}

.thinking-content {
	background: #f0f4ff;
	border-radius: 8px;
	padding: 8px 10px;
	border-left: 3px solid #93b4f8;
}

.thinking-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 4px;
}

.thinking-label {
	font-size: 12px;
	color: #6b7fbf;
	font-weight: 600;
}

.thinking-toggle {
	font-size: 11px;
	color: #93b4f8;
}

.thinking-text {
	font-size: 12px;
	color: #6b7280;
	line-height: 1.5;
	white-space: pre-wrap;
}

.thinking-section-done {
	margin-top: 8px;
	border-top: 1px dashed #e5e7eb;
	padding-top: 8px;
}

.thinking-toggle-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 4px 0;
}

.thinking-toggle-label {
	font-size: 12px;
	color: #9ca3af;
}

@keyframes blink {
	0%, 100% {
		opacity: 0.3;
	}
	50% {
		opacity: 1;
	}
}

.meta {
	margin-top: 6px;
	display: flex;
	font-size: 11px;
}

.chat-item.from-bot .meta {
	color: #9ca3af;
}

.chat-item.from-user .meta {
	color: rgba(255, 255, 255, 0.7);
}

.chat-input-bar {
	display: flex;
	flex-wrap: nowrap;
	align-items: flex-end;
	padding: 10px 14px calc(10px + var(--safe-bottom));
	background: rgba(255, 255, 255, 0.9);
	backdrop-filter: blur(10px);
	border-top: 1px solid #e5e9f2;
}

.chat-input {
	flex: 1;
	min-width: 0;
	min-height: 42px;
	max-height: 120px;
	padding: 10px 14px;
	border-radius: 20px;
	border: 1px solid #e5e7eb;
	background: #f8fafc;
	font-size: 14px;
	color: #1f2937;
	transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input:focus {
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.chat-send {
	width: 72px;
	flex-shrink: 0;
	border: none;
	border-radius: 20px;
	background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
	color: #ffffff;
	font-size: 14px;
	font-weight: 600;
	min-height: 42px;
	margin-left: 10px;
	white-space: nowrap;
}

.chat-send:active {
	filter: brightness(0.95);
}

.chat-send:disabled {
	background: linear-gradient(135deg, #cbd5e1, #94a3b8);
	color: #f8fafc;
}

@media (max-width: 420px) {
	.chat-subtitle {
		display: none;
	}
	.chat-title {
		font-size: 16px;
	}
}
</style>
