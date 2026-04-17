import type { AgentTarget, QuickPrompt, ToolCard } from './types';

export const toolCards: ToolCard[] = [
	{
		target: 'bazi',
		title: '八字排盘',
		subtitle: '出生信息明确时优先',
		summary: '适合命盘总览、长期运势、十神格局和大运节奏。',
		icon: 'tmicon-chart-bar',
		badges: ['长期趋势', '命局结构', '大运流年'],
		prompt: '我有明确出生时间，请判断是否该走八字排盘，并带我打开对应页面。',
	},
	{
		target: 'liuyao',
		title: '六爻排盘',
		subtitle: '具体问题与短期决策',
		summary: '适合有单一问题、短期决策、事件走势和结果判断。',
		icon: 'tmicon-chart-relation',
		badges: ['具体问题', '短期判断', '事件走势'],
		prompt: '我现在有一个具体问题要判断，请判断是否应该走六爻排盘，并带我打开页面。',
	},
	{
		target: 'ziwei',
		title: '紫微排盘',
		subtitle: '命盘结构与宫位主题',
		summary: '适合看命宫、三方四正、人生主题、事业与关系结构。',
		icon: 'tmicon-star-circle',
		badges: ['宫位结构', '人生主题', '长期画像'],
		prompt: '我想看命盘结构和人生主题，请判断是否应该走紫微排盘，并直接带我打开页面。',
	},
];

export const quickPrompts: QuickPrompt[] = [
	{
		label: '帮我选盘',
		prompt: '我现在还不确定该用八字、六爻还是紫微，请先帮我选最合适的排盘工具。',
	},
	{
		label: '打开八字',
		prompt: '我已经准备好出生信息了，请直接带我去八字排盘，并告诉我先填什么。',
	},
	{
		label: '打开紫微',
		prompt: '我想看命盘格局，请直接带我去紫微排盘，并说清楚为什么选它。',
	},
	{
		label: '看事业宫',
		prompt: '如果当前已经有紫微盘，请直接带我查看事业宫；如果还没有，请告诉我还缺哪些出生信息。',
	},
	{
		label: '查看历史',
		prompt: '我想先看之前生成过的盘，请带我打开历史记录页面。',
	},
];

export const routeMap: Record<AgentTarget, string> = {
	bazi: '/pages/index/index',
	liuyao: '/pages/liuyao/index',
	ziwei: '/pages/ziwei/index',
	history: '/pages/history/list',
};

export const ZIWEI_PALACE_ALIASES: Array<[string, string[]]> = [
	['命', ['命宫']],
	['兄弟', ['兄弟宫']],
	['夫妻', ['夫妻宫', '婚姻宫', '感情宫', '伴侣宫']],
	['子女', ['子女宫', '子息宫', '孩子宫']],
	['财帛', ['财帛宫', '财运宫']],
	['疾厄', ['疾厄宫', '健康宫', '疾病宫']],
	['迁移', ['迁移宫', '出行宫', '远行宫']],
	['仆役', ['仆役宫', '交友宫', '朋友宫', '人脉宫']],
	['官禄', ['官禄宫', '事业宫', '工作宫', '职业宫']],
	['田宅', ['田宅宫', '房产宫', '家宅宫', '居所宫']],
	['福德', ['福德宫', '福气宫', '精神宫']],
	['父母', ['父母宫', '长辈宫']],
];

export const LIUYAO_DIRECT_MARKERS = [
	'起卦',
	'占问',
	'占卜',
	'问事',
	'问卦',
	'能不能',
	'会不会',
	'是否',
	'结果',
	'何时',
	'什么时候',
	'适不适合',
	'行不行',
	'吉凶',
];
