export type AgentTarget = 'bazi' | 'liuyao' | 'ziwei' | 'history';
export type ChatRole = 'system' | 'user' | 'assistant';
export type MessageRole = 'assistant' | 'user';
export type MessageStatus = 'ready' | 'waiting' | 'stream' | 'error';

export type ChatMessage = {
	role: ChatRole;
	content: string;
};

export type BirthChartPayload = {
	realname?: string;
	gender: 0 | 1 | '0' | '1' | 'male' | 'female' | 'man' | 'woman' | '男' | '女';
	date: string;
	time: string;
	focusPalace?: string;
};

export type LiuyaoPayload = {
	title: string;
	date?: string;
	time?: string;
};

export type ZiweiFocusPayload = {
	palace: string;
};

export type UiMessage = {
	id: string;
	role: MessageRole;
	text: string;
	time: string;
	status: MessageStatus;
	seed?: boolean;
	thinking?: string;
	showThinking?: boolean;
};

export type NavigateAction = {
	type: 'navigate';
	target: AgentTarget;
	label: string;
	reason?: string;
};

export type AgentAction =
	| NavigateAction
	| {
			type: 'run_bazi_chart';
			label: string;
			reason?: string;
			payload: BirthChartPayload;
	  }
	| {
			type: 'run_ziwei_chart';
			label: string;
			reason?: string;
			payload: BirthChartPayload;
	  }
	| {
			type: 'run_liuyao_chart';
			label: string;
			reason?: string;
			payload: LiuyaoPayload;
	  }
	| {
			type: 'focus_ziwei_palace';
			label: string;
			reason?: string;
			payload: ZiweiFocusPayload;
	  }
	| {
			type: 'none';
	  };

export type ExecutableAction = Extract<
	AgentAction,
	{ type: 'run_bazi_chart' | 'run_ziwei_chart' | 'run_liuyao_chart' | 'focus_ziwei_palace' }
>;

export type ToolCard = {
	target: AgentTarget;
	title: string;
	subtitle: string;
	summary: string;
	icon: string;
	badges: string[];
	prompt: string;
};

export type QuickPrompt = {
	label: string;
	prompt: string;
};
