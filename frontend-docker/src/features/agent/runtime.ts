import { LIUYAO_DIRECT_MARKERS, routeMap, ZIWEI_PALACE_ALIASES } from './config';
import type {
	AgentAction,
	AgentTarget,
	BirthChartPayload,
	ExecutableAction,
	LiuyaoPayload,
} from './types';

export function buildAgentSystemPrompt(contextItems: string[]) {
	const contextLines = contextItems.length
		? contextItems.map((item) => `- ${item}`).join('\n')
		: '- 当前无缓存盘面，请先根据问题类型选择工具';

	return `你是“排盘调度 Agent”，运行在一个玄学排盘工具里。你的职责：
1. 你只能输出以下六种动作之一：
- 直接排八字：
<!--AGENT_ACTION:{"type":"run_bazi_chart","label":"直接排八字","reason":"已拿到完整出生信息","payload":{"realname":"张三","gender":0,"date":"1998-08-12","time":"09:00"}}-->
- 直接排紫微：
<!--AGENT_ACTION:{"type":"run_ziwei_chart","label":"直接排紫微","reason":"已拿到完整出生信息","payload":{"realname":"张三","gender":1,"date":"1996-03-21","time":"18:30","focusPalace":"事业宫"}}-->
- 直接排六爻：
<!--AGENT_ACTION:{"type":"run_liuyao_chart","label":"按时间起一卦","reason":"问题明确，适合直接占问","payload":{"title":"问换工作是否合适","date":"2026-03-17","time":"09:30"}}-->
- 聚焦紫微宫位：
<!--AGENT_ACTION:{"type":"focus_ziwei_palace","label":"查看事业宫","reason":"当前已有紫微盘，可继续聚焦宫位","payload":{"palace":"事业宫"}}-->
- 只打开某个页面：
<!--AGENT_ACTION:{"type":"navigate","target":"bazi","label":"打开八字排盘","reason":"还缺少出生时辰"}-->
- 不执行动作：
<!--AGENT_ACTION:{"type":"none"}-->
2. 只有当你同时确定以下信息时，才能使用 run_bazi_chart 或 run_ziwei_chart：
- 公历日期，格式必须是 YYYY-MM-DD
- 24 小时制时间，格式必须是 HH:mm
- 性别，0 表示男，1 表示女
3. run_liuyao_chart 只适用于具体事件、短期判断、单题占问。payload.title 必填；如果用户没有明确给出时间，可以省略 date/time，系统会使用当前本地时间起卦。
4. focus_ziwei_palace 只适用于当前上下文里已经存在紫微盘，并且宫位必须明确，例如命宫、夫妻宫、事业宫、财运宫、交友宫。
5. 如果用户只给了农历、只给了年份、缺少时辰、性别不明确、时间含糊，禁止编造出生数据；这时必须改用 navigate 或 none。
6. 八字适合命盘总览、长期运势、大运流年；紫微适合命盘结构、宫位主题、人生画像；六爻适合具体事件和短期占问。
7. 回复正文请使用中文，结构固定为“推荐工具 / 原因 / 下一步”，控制在 160 字以内，直接说明你将执行什么，或还缺什么信息。
8. 动作指令必须单独一行，不能放进代码块，不能输出多余 JSON。

当前上下文：
${contextLines}`;
}

export function stripHtml(value: unknown): string {
	const raw = String(value ?? '');
	const stripped = raw.replace(/<[^>]+>/g, '');
	return stripped || raw;
}

export function normalizeError(value: unknown): string {
	const raw = String(
		(value as any)?.error || (value as any)?.message || (value as any)?.errMsg || value || '调用失败',
	);
	const stripped = stripHtml(raw).trim();
	if (!stripped) return '调用失败';
	if (
		stripped.toLowerCase().includes('generativelanguage.googleapis.com') ||
		(stripped.toLowerCase().includes('request to') && stripped.toLowerCase().includes('failed'))
	) {
		return '内网模型连接异常，请检查后台 LLM 配置';
	}
	return stripped;
}

export function extractTextFromPayload(payload: any): string {
	if (!payload || typeof payload !== 'object') return '';
	if (typeof payload.reply === 'string') return payload.reply;

	const choice = payload.choices?.[0];
	if (typeof choice?.message?.content === 'string') return choice.message.content;
	if (typeof choice?.text === 'string') return choice.text;

	if (Array.isArray(payload.content)) {
		return payload.content
			.map((item: any) => (typeof item?.text === 'string' ? item.text : ''))
			.filter(Boolean)
			.join('');
	}

	if (typeof payload.content === 'string') return payload.content;

	const parts = payload?.candidates?.[0]?.content?.parts;
	if (Array.isArray(parts)) {
		return parts
			.map((item: any) => (typeof item?.text === 'string' ? item.text : ''))
			.filter(Boolean)
			.join('');
	}

	return '';
}

export function normalizeAgentName(value: unknown) {
	const text = String(value ?? '').trim();
	return text ? text.slice(0, 24) : '';
}

export function normalizeAgentGender(value: BirthChartPayload['gender']): 0 | 1 | null {
	const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
	if (normalized === 0 || normalized === '0' || normalized === 'male' || normalized === 'man' || value === '男') {
		return 0;
	}
	if (
		normalized === 1 ||
		normalized === '1' ||
		normalized === 'female' ||
		normalized === 'woman' ||
		value === '女'
	) {
		return 1;
	}
	return null;
}

export function parseAgentTimestamp(dateValue: unknown, timeValue: unknown) {
	const dateText = String(dateValue ?? '').trim();
	const timeText = String(timeValue ?? '').trim();

	const dateMatch = dateText.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
	const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

	if (!dateMatch || !timeMatch) {
		return null;
	}

	const year = Number(dateMatch[1]);
	const month = Number(dateMatch[2]);
	const day = Number(dateMatch[3]);
	const hour = Number(timeMatch[1]);
	const minute = Number(timeMatch[2]);
	const second = Number(timeMatch[3] || 0);

	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day) ||
		!Number.isInteger(hour) ||
		!Number.isInteger(minute) ||
		!Number.isInteger(second) ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59 ||
		second < 0 ||
		second > 59
	) {
		return null;
	}

	const parsed = new Date(year, month - 1, day, hour, minute, second, 0);
	if (
		parsed.getFullYear() !== year ||
		parsed.getMonth() !== month - 1 ||
		parsed.getDate() !== day ||
		parsed.getHours() !== hour ||
		parsed.getMinutes() !== minute
	) {
		return null;
	}

	return parsed.getTime();
}

function padTwo(value: number) {
	return String(value).padStart(2, '0');
}

function extractDateTimeFromText(text: string) {
	const raw = String(text || '');
	const dateMatch = raw.match(/(\d{4})\s*[年\-/.]\s*(\d{1,2})\s*[月\-/.]\s*(\d{1,2})\s*(?:日|号)?/);
	if (!dateMatch) {
		return null;
	}

	const date = `${Number(dateMatch[1])}-${padTwo(Number(dateMatch[2]))}-${padTwo(Number(dateMatch[3]))}`;
	const tail = raw.slice((dateMatch.index || 0) + dateMatch[0].length);
	const sanitizedRaw = raw.replace(dateMatch[0], ' ');
	const timePattern = /(上午|下午|中午|晚上|凌晨)?\s*(\d{1,2})(?:\s*[:点时]\s*(\d{1,2}))?/;
	const timeMatch = tail.match(timePattern) || sanitizedRaw.match(timePattern);
	if (!timeMatch) {
		return null;
	}

	let hour = Number(timeMatch[2]);
	const minute = Number(timeMatch[3] || 0);
	const meridiem = timeMatch[1] || '';

	if (Number.isNaN(hour) || Number.isNaN(minute)) {
		return null;
	}

	if ((meridiem === '下午' || meridiem === '晚上') && hour < 12) {
		hour += 12;
	} else if (meridiem === '中午' && hour < 11) {
		hour += 12;
	} else if (meridiem === '凌晨' && hour === 12) {
		hour = 0;
	}

	const time = `${padTwo(hour)}:${padTwo(minute)}`;
	return parseAgentTimestamp(date, time) ? { date, time } : null;
}

export function normalizeZiweiPalaceName(value: unknown) {
	const stripped = String(value ?? '')
		.replace(/\s+/g, '')
		.replace(/宫/g, '');

	switch (stripped) {
		case '婚姻':
		case '感情':
		case '伴侣':
			return '夫妻';
		case '财运':
			return '财帛';
		case '健康':
		case '疾病':
			return '疾厄';
		case '出行':
		case '远行':
			return '迁移';
		case '交友':
		case '朋友':
		case '人脉':
			return '仆役';
		case '事业':
		case '工作':
		case '职业':
			return '官禄';
		case '房产':
		case '家宅':
		case '居所':
			return '田宅';
		case '福气':
		case '精神':
			return '福德';
		case '长辈':
			return '父母';
		case '子息':
		case '孩子':
			return '子女';
		default:
			return stripped;
	}
}

export function formatZiweiPalaceLabel(value: unknown) {
	const normalized = normalizeZiweiPalaceName(value);
	if (!normalized) return '目标宫位';
	if (normalized === '仆役') return '交友宫';
	return `${normalized}宫`;
}

export function extractZiweiPalaceName(text: string) {
	const raw = String(text || '');
	for (const [canonical, aliases] of ZIWEI_PALACE_ALIASES) {
		if (aliases.some((alias) => raw.includes(alias))) {
			return canonical;
		}
	}
	return null;
}

export function defaultActionLabel(target: AgentTarget) {
	switch (target) {
		case 'bazi':
		return '打开八字排盘';
	case 'liuyao':
		return '打开六爻排盘';
	case 'ziwei':
		return '打开紫微排盘';
	case 'history':
		return '打开历史记录';
	default:
		return '执行操作';
}
}

export function defaultChartActionLabel(actionType: 'run_bazi_chart' | 'run_ziwei_chart' | 'run_liuyao_chart') {
	switch (actionType) {
		case 'run_bazi_chart':
			return '直接排八字';
		case 'run_ziwei_chart':
			return '直接排紫微';
		default:
			return '按时间起一卦';
	}
}

export function defaultZiweiFocusLabel(name: string) {
	return `查看${formatZiweiPalaceLabel(name)}`;
}

export function isExecutableAction(action: AgentAction): action is ExecutableAction {
	return (
		action.type === 'run_bazi_chart' ||
		action.type === 'run_ziwei_chart' ||
		action.type === 'run_liuyao_chart' ||
		action.type === 'focus_ziwei_palace'
	);
}

export function getFallbackTargetForAction(action: AgentAction): AgentTarget | null {
	if (action.type === 'run_bazi_chart') return 'bazi';
	if (action.type === 'run_ziwei_chart') return 'ziwei';
	if (action.type === 'run_liuyao_chart') return 'liuyao';
	if (action.type === 'focus_ziwei_palace') return 'ziwei';
	if (action.type === 'navigate') return action.target;
	return null;
}

export function detectNamedTarget(text: string): AgentTarget | null {
	const raw = String(text || '');
	const normalized = raw.toLowerCase();

	if (normalized.includes('历史') || normalized.includes('记录') || normalized.includes('history')) {
		return 'history';
	}

	if (
		normalized.includes('紫微') ||
		normalized.includes('宫位') ||
		normalized.includes('命盘结构') ||
		!!extractZiweiPalaceName(raw) ||
		normalized.includes('ziwei')
	) {
		return 'ziwei';
	}

	if (
		normalized.includes('六爻') ||
		normalized.includes('起卦') ||
		normalized.includes('占问') ||
		normalized.includes('短期') ||
		normalized.includes('liuyao')
	) {
		return 'liuyao';
	}

	if (
		normalized.includes('八字') ||
		normalized.includes('四柱') ||
		normalized.includes('生辰') ||
		normalized.includes('大运') ||
		normalized.includes('命局') ||
		normalized.includes('bazi')
	) {
		return 'bazi';
	}

	return null;
}

function extractRealnameFromText(text: string) {
	const raw = String(text || '');
	const matched =
		raw.match(/我叫([^\s，,。；;：:]{1,12})/) ||
		raw.match(/名字(?:是|叫)?([^\s，,。；;：:]{1,12})/) ||
		raw.match(/姓名(?:是|叫)?([^\s，,。；;：:]{1,12})/);
	return normalizeAgentName(matched?.[1] || '');
}

export function normalizeLiuyaoTitle(value: unknown) {
	const text = String(value ?? '')
		.replace(/\s+/g, ' ')
		.replace(/^[，,。；;：:!?！？\s]+/, '')
		.replace(/[。！？!?；;，,\s]+$/, '')
		.trim();
	return text.slice(0, 40);
}

export function extractChartPayloadFromText(text: string): BirthChartPayload | null {
	const raw = String(text || '');
	const genderMatch = raw.match(/(?:我是|性别是|性别为)?\s*(男|女)/);
	const gender = normalizeAgentGender((genderMatch?.[1] || '') as BirthChartPayload['gender']);
	if (gender === null) {
		return null;
	}

	const dateTime = extractDateTimeFromText(raw);
	if (!dateTime || !parseAgentTimestamp(dateTime.date, dateTime.time)) {
		return null;
	}

	return {
		realname: extractRealnameFromText(raw),
		gender,
		date: dateTime.date,
		time: dateTime.time,
		focusPalace: extractZiweiPalaceName(raw) || '',
	};
}

function extractLiuyaoTitleFromText(text: string) {
	const raw = String(text || '').trim();
	const quoted =
		raw.match(/[“"「](.{2,40}?)[”"」]/) ||
		raw.match(/(?:问|想问|占|测|看看|判断)\s*([^，。！？!?；;\n]{2,40})/);

	if (quoted?.[1]) {
		return normalizeLiuyaoTitle(quoted[1]);
	}

	const cleaned = raw
		.replace(/(\d{4}\s*[年\-/.]\s*\d{1,2}\s*[月\-/.]\s*\d{1,2}\s*(?:日|号)?)/g, ' ')
		.replace(/(上午|下午|中午|晚上|凌晨)?\s*\d{1,2}(?:\s*[:点时]\s*\d{1,2})?/g, ' ')
		.replace(/(?:请|帮我|麻烦|直接|现在|用六爻|六爻|按时间起卦|时间起卦|起一卦|起卦|排盘|一下)/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	return normalizeLiuyaoTitle(cleaned || raw);
}

export function extractLiuyaoPayloadFromText(text: string): LiuyaoPayload | null {
	const raw = String(text || '').trim();
	if (!raw) return null;
	if (!LIUYAO_DIRECT_MARKERS.some((marker) => raw.includes(marker))) {
		return null;
	}

	const title = extractLiuyaoTitleFromText(raw);
	if (!title) {
		return null;
	}

	const dateTime = extractDateTimeFromText(raw);
	return {
		title,
		date: dateTime?.date || '',
		time: dateTime?.time || '',
	};
}

export function inferAction(
	inputText: string,
	replyText = '',
	options: {
		hasZiweiAstrolabe?: boolean;
	} = {},
): AgentAction {
	const combinedText = `${inputText}\n${replyText}`;
	const palaceName = extractZiweiPalaceName(combinedText);
	const target = detectNamedTarget(combinedText);
	const birthPayload = extractChartPayloadFromText(inputText);
	const liuyaoPayload = extractLiuyaoPayloadFromText(inputText);

	if (birthPayload && target === 'bazi') {
		return {
			type: 'run_bazi_chart',
			label: defaultChartActionLabel('run_bazi_chart'),
			reason: '已从你的输入里识别出完整出生信息，可直接生成八字盘。',
			payload: birthPayload,
		};
	}

	if (birthPayload && target === 'ziwei') {
		return {
			type: 'run_ziwei_chart',
			label: palaceName ? `直接排紫微并查看${formatZiweiPalaceLabel(palaceName)}` : defaultChartActionLabel('run_ziwei_chart'),
			reason: palaceName
				? `已识别出完整出生信息，可直接生成紫微命盘并聚焦${formatZiweiPalaceLabel(palaceName)}。`
				: '已从你的输入里识别出完整出生信息，可直接生成紫微命盘。',
			payload: {
				...birthPayload,
				focusPalace: palaceName || birthPayload.focusPalace || '',
			},
		};
	}

	if (target === 'liuyao' && liuyaoPayload) {
		return {
			type: 'run_liuyao_chart',
			label: defaultChartActionLabel('run_liuyao_chart'),
			reason:
				liuyaoPayload.date && liuyaoPayload.time
					? '这是具体短期问题，已识别到起卦时间，可直接按时间起卦。'
					: '这是具体短期问题，可直接按当前时间起卦。',
			payload: liuyaoPayload,
		};
	}

	if (palaceName && options.hasZiweiAstrolabe) {
		return {
			type: 'focus_ziwei_palace',
			label: defaultZiweiFocusLabel(palaceName),
			reason: `当前已有紫微盘，可直接继续聚焦${formatZiweiPalaceLabel(palaceName)}。`,
			payload: {
				palace: palaceName,
			},
		};
	}

	if (target === 'history') {
		return {
			type: 'navigate',
			target: 'history',
			label: defaultActionLabel('history'),
			reason: '适合先查看之前已经生成过的排盘记录。',
		};
	}

	if (target === 'ziwei') {
		return {
			type: 'navigate',
			target: 'ziwei',
			label: birthPayload ? defaultChartActionLabel('run_ziwei_chart') : defaultActionLabel('ziwei'),
			reason: palaceName && !options.hasZiweiAstrolabe
				? `当前还没有可聚焦的紫微盘，需要先打开紫微排盘生成命盘，再查看${formatZiweiPalaceLabel(palaceName)}。`
				: birthPayload
					? '已识别到紫微相关意图，但自动执行未满足条件，可先打开页面确认参数。'
					: '当前问题更偏命盘结构、宫位主题或长期画像。',
		};
	}

	if (target === 'liuyao') {
		return {
			type: 'navigate',
			target: 'liuyao',
			label: defaultActionLabel('liuyao'),
			reason: liuyaoPayload
				? '已识别到六爻意图，但自动执行未满足条件，可先打开六爻页确认。'
				: '当前问题更像具体事件、短期判断或单题占问。',
		};
	}

	if (target === 'bazi') {
		return {
			type: 'navigate',
			target: 'bazi',
			label: birthPayload ? defaultChartActionLabel('run_bazi_chart') : defaultActionLabel('bazi'),
			reason: birthPayload
				? '已识别到八字相关意图，但自动执行未满足条件，可先打开页面确认参数。'
				: '当前问题更适合从出生信息、命局结构和大运节奏切入。',
		};
	}

	return { type: 'none' };
}

export function extractAgentAction(
	reply: string,
	inputText: string,
	options: {
		hasZiweiAstrolabe?: boolean;
	} = {},
) {
	const rawReply = String(reply || '');
	const matched = rawReply.match(/<!--AGENT_ACTION:([\s\S]*?)-->/);
	let parsedAction: AgentAction = { type: 'none' };

	if (matched?.[1]) {
		try {
			const json = JSON.parse(matched[1]);
			if (json?.type === 'navigate' && routeMap[json.target as AgentTarget]) {
				parsedAction = {
					type: 'navigate',
					target: json.target as AgentTarget,
					label:
						typeof json.label === 'string' && json.label.trim()
							? json.label.trim()
							: defaultActionLabel(json.target as AgentTarget),
					reason: typeof json.reason === 'string' ? json.reason.trim() : undefined,
				};
			} else if (json?.type === 'run_bazi_chart' || json?.type === 'run_ziwei_chart') {
				const payload = json?.payload;
				if (
					payload &&
					typeof payload === 'object' &&
					typeof payload.date === 'string' &&
					typeof payload.time === 'string'
				) {
					parsedAction = {
						type: json.type,
						label:
							typeof json.label === 'string' && json.label.trim()
								? json.label.trim()
								: defaultChartActionLabel(json.type),
						reason: typeof json.reason === 'string' ? json.reason.trim() : undefined,
						payload: {
							realname: typeof payload.realname === 'string' ? payload.realname : '',
							gender: payload.gender,
							date: payload.date,
							time: payload.time,
							focusPalace: typeof payload.focusPalace === 'string' ? payload.focusPalace : '',
						},
					};
				}
			} else if (json?.type === 'run_liuyao_chart') {
				const payload = json?.payload;
				if (payload && typeof payload === 'object' && typeof payload.title === 'string' && payload.title.trim()) {
					parsedAction = {
						type: 'run_liuyao_chart',
						label:
							typeof json.label === 'string' && json.label.trim()
								? json.label.trim()
								: defaultChartActionLabel('run_liuyao_chart'),
						reason: typeof json.reason === 'string' ? json.reason.trim() : undefined,
						payload: {
							title: payload.title.trim(),
							date: typeof payload.date === 'string' ? payload.date : '',
							time: typeof payload.time === 'string' ? payload.time : '',
						},
					};
				}
			} else if (json?.type === 'focus_ziwei_palace') {
				const payload = json?.payload;
				if (payload && typeof payload === 'object' && typeof payload.palace === 'string' && payload.palace.trim()) {
					parsedAction = {
						type: 'focus_ziwei_palace',
						label:
							typeof json.label === 'string' && json.label.trim()
								? json.label.trim()
								: defaultZiweiFocusLabel(payload.palace),
						reason: typeof json.reason === 'string' ? json.reason.trim() : undefined,
						payload: {
							palace: payload.palace.trim(),
						},
					};
				}
			}
		} catch (err) {
			void err;
		}
	}

	const withoutAction = rawReply.replace(/<!--AGENT_ACTION:[\s\S]*?-->/g, '').trim();
	const cleanText = stripHtml(withoutAction).trim();

	if (parsedAction.type === 'none') {
		parsedAction = inferAction(inputText, cleanText, options);
	}

	return {
		action: parsedAction,
		cleanText: cleanText || '我已经整理好下一步，你可以直接执行下面的建议操作。',
	};
}
