<template>
	<view class="chat-page">
		<view class="chat-header">
			<view class="header-left">
				<text class="chat-title">AI 聊天</text>
				<text class="chat-subtitle">对接大模型的专用界面</text>
			</view>
			<view class="header-right">
				<text class="quota-item">次数: {{ remainingCountText }}</text>
				<view class="header-actions">
					<button class="header-btn" :disabled="archiveBusy" @tap="handleRestoreArchive">恢复</button>
					<button class="header-btn" :disabled="archiveBusy" @tap="handleSaveArchive">保存</button>
				</view>
			</view>
		</view>

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
					<view v-if="msg.status === 'waiting'" class="waiting-container">
						<text class="bubble-text waiting-text">正在思考</text>
						<text class="waiting-dots">...</text>
					</view>
					<text v-else class="bubble-text" :selectable="true" :user-select="true">{{ msg.text || ' ' }}</text>
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
	decryptJsonAesGcm,
	encryptJsonAesGcm,
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
};

type QuotaInfo = {
	remainingCount: number;
};

const props = defineProps<{
	quotaInfo?: QuotaInfo | null;
	disableAutoRestore?: boolean;
}>();

const emit = defineEmits<{
	(e: 'send', text: string): void;
}>();

const localQuotaInfo = ref<QuotaInfo | null>(null);
const effectiveQuotaInfo = computed(() => props.quotaInfo ?? localQuotaInfo.value);
const remainingCountText = computed(() => {
	const value = effectiveQuotaInfo.value?.remainingCount;
	if (value === 0) return '0';
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return '--';
});

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
	localQuotaInfo.value = info;
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

const ARCHIVE_PURPOSE = 'chat-archive-v1';
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
		const encryptedText = await encryptJsonAesGcm(archive, ARCHIVE_PURPOSE);
		setPersistentItem(ARCHIVE_FALLBACK_KEY, encryptedText, 365 * 24 * 60 * 60 * 1000);
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
			await writeTextToFileHandle(handle, encryptedText);
			await idbSetItem(ARCHIVE_HANDLE_KEY, handle);
		} else {
			downloadTextFile(encryptedText, filename);
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

		const archive = (await decryptJsonAesGcm(text, ARCHIVE_PURPOSE)) as ChatArchiveV1;
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
				const archive = (await decryptJsonAesGcm(text, ARCHIVE_PURPOSE)) as ChatArchiveV1;
				if (archive?.v === 1 && archive?.kind === 'chat' && Array.isArray(archive.messages)) {
					applyArchivePayload(archive);
					return;
				}
			}
		}
		const fallback = getPersistentItem<string>(ARCHIVE_FALLBACK_KEY);
		if (fallback) {
			const archive = (await decryptJsonAesGcm(fallback, ARCHIVE_PURPOSE)) as ChatArchiveV1;
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
	background: radial-gradient(circle at 20% 18%, rgba(99, 102, 241, 0.08), transparent 40%),
		#f3f4f6;
}

.chat-header {
	padding: 8px 12px;
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
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;
	margin-left: 12px;
	/* #ifndef APP-PLUS-NVUE */
	gap: 10px;
	/* #endif */
	/* #ifdef APP-PLUS-NVUE */
	/* nvue 不支持 gap，使用 margin 替代 */
	/* #endif */
}

.chat-title {
	/* #ifndef APP-PLUS-NVUE */
	display: block;
	/* #endif */
	font-size: 17px;
	font-weight: 700;
	color: #111827;
}

.chat-subtitle {
	/* #ifndef APP-PLUS-NVUE */
	display: block;
	/* #endif */
	margin-top: 2px;
	font-size: 11px;
	color: #6b7280;
}

.quota-item {
	font-size: 11px;
	color: #6b7280;
	line-height: 1.4;
	text-align: left;
	/* #ifndef APP-PLUS-NVUE */
	white-space: nowrap;
	/* #endif */
}

.header-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;
}

.header-btn {
	height: 22px;
	line-height: 22px;
	padding: 0 8px;
	font-size: 11px;
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: linear-gradient(90deg, rgba(6, 182, 212, 0.92), rgba(96, 165, 250, 0.92));
	color: #ffffff;
	/* #ifndef APP-PLUS-NVUE */
	margin-left: 6px;
	/* #endif */
	/* #ifdef APP-PLUS-NVUE */
	margin-left: 6px;
	/* #endif */
}

.header-btn:active {
	filter: brightness(0.985);
}

.header-actions .header-btn:first-child {
	/* #ifndef APP-PLUS-NVUE */
	margin-left: 0;
	/* #endif */
}

.header-btn:disabled {
	opacity: 0.6;
}

.chat-body {
	flex: 1;
	min-height: 0;
	padding: 12px 12px 16px;
	scrollbar-width: thin;
	scrollbar-color: #94a3b8 rgba(226, 232, 240, 0.8);
	/* #ifndef APP-PLUS-NVUE */
	box-sizing: border-box;
	/* #endif */
}

.chat-body :deep(::-webkit-scrollbar) {
	width: 8px;
	display: block;
}

.chat-body :deep(::-webkit-scrollbar-track) {
	background: rgba(226, 232, 240, 0.8);
	border-radius: 999px;
}

.chat-body :deep(::-webkit-scrollbar-thumb) {
	background: #94a3b8;
	border-radius: 999px;
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
	flex-wrap: nowrap;
	align-items: flex-end;
	/* gap: 8px; nvue 不支持，使用 margin 替代 */
	padding: 8px 12px calc(8px + var(--safe-bottom));
	background: #ffffff;
	border-top: 1px solid #e5e7eb;
	/* #ifndef APP-PLUS-NVUE */
	box-sizing: border-box;
	/* #endif */
}

.chat-input {
	flex: 1;
	min-width: 0;
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
	flex-shrink: 0;
	border: none;
	border-radius: 10px;
	background: linear-gradient(90deg, #06b6d4, #60a5fa);
	color: #f9fafb;
	font-size: 14px;
	font-weight: 600;
	min-height: 44px;
	/* #ifndef APP-PLUS-NVUE */
	margin-left: 10px;
	white-space: nowrap;
	/* #endif */
	/* #ifdef APP-PLUS-NVUE */
	margin-left: 10px;
	/* #endif */
}

.chat-send:active {
	filter: brightness(0.985);
}

.chat-send:disabled {
	background: linear-gradient(90deg, #cbd5e1, #94a3b8);
	color: #f8fafc;
}

/* #ifndef APP-PLUS-NVUE */
@media (max-width: 420px) {
	.chat-subtitle {
		display: none;
	}
	.chat-title {
		font-size: 16px;
	}
}
/* #endif */
</style>
