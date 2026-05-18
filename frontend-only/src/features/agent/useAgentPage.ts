import { computed, ref } from 'vue';
import { callAi } from '@/services/ai';
import { hasAiConfig } from '@/config/aiConfig';
import { useBaziStore } from '@/store/bazi';
import { executeTimeLiuyaoChart } from '@/features/liuyao/executor';
import { useLiuyaoStore } from '@/store/liuyao';
import { useUserStore } from '@/store/user';
import { useZiweiStore } from '@/store/ziwei';
import { quickPrompts, routeMap, toolCards } from './config';
import {
	buildAgentSystemPrompt,
	extractAgentAction,
	extractTextFromPayload,
	formatZiweiPalaceLabel,
	getFallbackTargetForAction,
	isExecutableAction,
	normalizeAgentGender,
	normalizeAgentName,
	normalizeError,
	normalizeLiuyaoTitle,
	normalizeZiweiPalaceName,
	parseAgentTimestamp,
} from './runtime';
import type { ChatMessage, ExecutableAction, NavigateAction, UiMessage } from './types';

export function useAgentPage() {
	const userStore = useUserStore();
	const baziStore = useBaziStore();
	const liuyaoStore = useLiuyaoStore();
	const ziweiStore = useZiweiStore();

	const draft = ref('');
	const sending = ref(false);
	const pendingAction = ref<NavigateAction | null>(null);
	const messages = ref<UiMessage[]>([]);

	const contextItems = computed(() => {
		const items: string[] = [];

		if (baziStore.sizhu?.year && baziStore.sizhu?.month && baziStore.sizhu?.day && baziStore.sizhu?.time) {
			items.push(`八字 ${baziStore.sizhu.year} ${baziStore.sizhu.month} ${baziStore.sizhu.day} ${baziStore.sizhu.time}`);
		}

		if (liuyaoStore.profile?.title) {
			items.push(`六爻「${liuyaoStore.profile.title}」`);
		}

		if (ziweiStore.astrolabe) {
			items.push('紫微当前命盘');
		}

		return items;
	});

	const accessLabel = computed(() => hasAiConfig() ? '已配置 AI' : '未配置 AI');
	const usageLabel = computed(() => '使用本地 API 配置');
	const conversationSubtitle = computed(
		() => 'Agent 会根据你的自然语言直接排盘、聚焦紫微宫位或给出下一步动作',
	);
	const composeTip = computed(() =>
		sending.value ? 'Agent 正在调用内网模型' : '支持“帮我选盘 / 直接排盘 / 聚焦紫微宫位 / 查看历史记录”',
	);
	const lastMessageId = computed(() => {
		const current = messages.value[messages.value.length - 1];
		return current ? current.id : '';
	});

	function formatNow() {
		const now = new Date();
		const hh = String(now.getHours()).padStart(2, '0');
		const mm = String(now.getMinutes()).padStart(2, '0');
		return `${hh}:${mm}`;
	}

	function nextId(prefix = 'msg') {
		return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
	}

	function buildSeedText() {
		const contextText = contextItems.value.length
			? `当前可继续接手：${contextItems.value.join('；')}。`
			: '当前还没有缓存的盘面，我可以先帮你判断该走哪种排盘。';
		return `我是排盘 Agent，可以直接帮你排八字、按时间起六爻、继续聚焦紫微宫位，也可以带你去历史记录或设置页。${contextText}`;
	}

	function ensureSeedMessage() {
		const seedText = buildSeedText();
		if (!messages.value.length || !messages.value[0]?.seed) {
			messages.value = [
				{
					id: 'seed-1',
					role: 'assistant',
					text: seedText,
					time: formatNow(),
					status: 'ready',
					seed: true,
				},
			];
			return;
		}

		messages.value[0] = {
			...messages.value[0],
			text: seedText,
		};
	}

	function pushMessage(role: 'assistant' | 'user', text: string, status: UiMessage['status'] = 'ready') {
		messages.value.push({
			id: nextId(),
			role,
			text,
			time: formatNow(),
			status,
		});
	}

	function createWaitingMessage() {
		const id = nextId('waiting');
		messages.value.push({
			id,
			role: 'assistant',
			text: '',
			time: formatNow(),
			status: 'waiting',
			thinking: '',
			showThinking: true,
		});
		return id;
	}

	function appendToMessage(id: string, text: string, thinking?: string) {
		const index = messages.value.findIndex((item) => item.id === id);
		if (index < 0) return;
		const item = { ...messages.value[index] };
		if (thinking !== undefined) {
			item.thinking = (item.thinking || '') + thinking;
		}
		if (text) {
			item.text += text;
		}
		item.status = 'stream';
		messages.value[index] = item;
	}

	function replaceMessage(id: string, text: string, status: UiMessage['status']) {
		const index = messages.value.findIndex((item) => item.id === id);
		if (index < 0) return;
		messages.value[index] = {
			...messages.value[index],
			text,
			status,
			time: formatNow(),
		};
	}

	function buildMessages(): ChatMessage[] {
		const payload: ChatMessage[] = [
			{
				role: 'system',
				content: buildAgentSystemPrompt(contextItems.value),
			},
		];

		for (const item of messages.value) {
			if (item.seed || item.status === 'waiting') continue;
			const text = String(item.text || '').trim();
			if (!text) continue;
			payload.push({
				role: item.role === 'user' ? 'user' : 'assistant',
				content: text,
			});
		}

		return payload;
	}

	function initializePage() {
		liuyaoStore.restoreLastResult();
		ensureSeedMessage();
	}

	function resolveZiweiPalaceIndex(name: string) {
		if (!ziweiStore.astrolabe) return null;
		const normalized = normalizeZiweiPalaceName(name);
		if (!normalized) return null;

		for (let index = 0; index < ziweiStore.astrolabe.palaces.length; index += 1) {
			const palace = ziweiStore.astrolabe.palaces[index];
			if (normalizeZiweiPalaceName(palace?.name) === normalized) {
				return typeof palace?.index === 'number' ? palace.index : index;
			}
		}

		return null;
	}

	function applyZiweiFocusByName(name: string, strict = true) {
		const palaceIndex = resolveZiweiPalaceIndex(name);
		if (palaceIndex === null) {
			if (strict) {
				throw new Error(`未识别到可聚焦的宫位：${formatZiweiPalaceLabel(name)}`);
			}
			return false;
		}

		if (ziweiStore.focusPalaceIndex !== palaceIndex) {
			ziweiStore.setFocus(palaceIndex);
		}

		return true;
	}

	async function navigateToPage(url: string) {
		await new Promise<void>((resolve, reject) => {
			uni.navigateTo({
				url,
				success: () => resolve(),
				fail: (err) => reject(err),
			});
		});
	}

	async function executeAgentAction(action: ExecutableAction) {
		if (action.type === 'focus_ziwei_palace') {
			if (!ziweiStore.astrolabe) {
				throw new Error('当前还没有紫微盘，无法直接聚焦宫位');
			}

			applyZiweiFocusByName(action.payload.palace);
			await navigateToPage('/pages/ziwei/result');
			return;
		}

		if (action.type === 'run_liuyao_chart') {
			const hasCustomDate = String(action.payload.date || '').trim();
			const hasCustomTime = String(action.payload.time || '').trim();
			let date = new Date();

			if (hasCustomDate || hasCustomTime) {
				const timestamp = parseAgentTimestamp(action.payload.date, action.payload.time);
				if (!timestamp) {
					throw new Error('起卦时间格式无效，无法直接排六爻');
				}
				date = new Date(timestamp);
			}

			uni.showLoading({
				title: '正在起六爻盘...',
			});

			try {
				executeTimeLiuyaoChart({
					title: normalizeLiuyaoTitle(action.payload.title) || '当前问题',
					date,
				});
				await navigateToPage('/pages/liuyao/result');
			} finally {
				uni.hideLoading();
			}

			return;
		}

		const gender = normalizeAgentGender(action.payload.gender);
		if (gender === null) {
			throw new Error('性别参数无效，无法直接排盘');
		}

		const timestamp = parseAgentTimestamp(action.payload.date, action.payload.time);
		if (!timestamp) {
			throw new Error('出生日期或时辰格式无效，无法直接排盘');
		}

		const realname = normalizeAgentName(action.payload.realname);
		const params = {
			realname,
			gender,
			timestamp,
			recordId: null,
		};

		uni.showLoading({
			title: action.type === 'run_bazi_chart' ? '正在生成八字盘...' : '正在生成紫微盘...',
		});

		try {
			userStore.set(params);
			userStore.recordId = null;

			if (action.type === 'run_bazi_chart') {
				baziStore.pull({ timestamp, gender });
				await navigateToPage('/pages/index/detail');
				return;
			}

			ziweiStore.pull({ timestamp, gender });
			if (action.payload.focusPalace) {
				applyZiweiFocusByName(action.payload.focusPalace, false);
			}
			await navigateToPage('/pages/ziwei/result');
		} finally {
			uni.hideLoading();
		}
	}

	async function sendPrompt(text: string) {
		const content = String(text || '').trim();
		if (!content || sending.value) return;

		pushMessage('user', content);
		pendingAction.value = null;
		draft.value = '';
		sending.value = true;
		const waitingId = createWaitingMessage();

		try {
			if (!hasAiConfig()) {
				throw new Error('请先在设置页面配置 AI API');
			}

			let rawReply = '';
			await callAi(buildMessages(), {
				onThinking: (thinking: string) => {
					appendToMessage(waitingId, '', thinking);
				},
				onChunk: (chunk: string) => {
					rawReply += chunk;
					appendToMessage(waitingId, chunk);
				},
			});

			if (!String(rawReply).trim()) {
				throw new Error('模型未返回可显示内容');
			}

			const parsed = extractAgentAction(rawReply, content, {
				hasZiweiAstrolabe: !!ziweiStore.astrolabe,
			});
			replaceMessage(waitingId, parsed.cleanText, 'ready');

			if (isExecutableAction(parsed.action)) {
				try {
					await executeAgentAction(parsed.action);
					pendingAction.value = null;
					return;
				} catch (err) {
					const fallbackTarget = getFallbackTargetForAction(parsed.action);
					if (fallbackTarget) {
						pendingAction.value = {
							type: 'navigate',
							target: fallbackTarget,
							label: fallbackTarget === 'ziwei' ? '打开紫微排盘' : fallbackTarget === 'liuyao' ? '打开六爻排盘' : '打开对应页面',
							reason: '自动执行失败，可先打开对应页面手动确认参数后再继续。',
						};
					}
					pushMessage('assistant', `执行失败：${normalizeError(err)}`, 'error');
					return;
				}
			}

			pendingAction.value = parsed.action.type === 'navigate' ? parsed.action : null;
		} catch (err) {
			replaceMessage(waitingId, `调用失败：${normalizeError(err)}`, 'error');
		} finally {
			sending.value = false;
		}
	}

	function handleSend() {
		void sendPrompt(draft.value);
	}

	function handleQuickPrompt(prompt: string) {
		void sendPrompt(prompt);
	}

	function openTarget(target: keyof typeof routeMap) {
		pendingAction.value = null;
		if (target === 'bazi') {
			uni.reLaunch({
				url: routeMap[target],
			});
			return;
		}

		uni.navigateTo({
			url: routeMap[target],
		});
	}

	function applyPendingAction() {
		if (!pendingAction.value) return;
		openTarget(pendingAction.value.target);
	}

	return {
		toolCards,
		quickPrompts,
		draft,
		sending,
		pendingAction,
		messages,
		contextItems,
		accessLabel,
		usageLabel,
		conversationSubtitle,
		composeTip,
		lastMessageId,
		initializePage,
		handleSend,
		handleQuickPrompt,
		openTarget,
		applyPendingAction,
	};
}
