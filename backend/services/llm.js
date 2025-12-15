/**
 * LLM服务
 */
const { safeJsonParse } = require('../utils/helpers');

/**
 * 构建LLM请求头
 */
function buildLLMHeaders(cfg) {
	const common = { 'Content-Type': 'application/json' };
	if (cfg.provider === 'gemini') {
		return common; // API key 走 query 参数
	}
	if (cfg.provider === 'anthropic') {
		return {
			...common,
			'x-api-key': cfg.apiKey,
			'anthropic-version': '2023-06-01',
		};
	}
	// openai / deepseek / qwen 兼容
	return {
		...common,
		Authorization: `Bearer ${cfg.apiKey}`,
	};
}

/**
 * 构建LLM请求体
 */
function buildLLMPayload(cfg, messages, stream) {
	const extra = safeJsonParse(cfg.extra) || {};
	if (cfg.provider === 'gemini') {
		// Gemini: content parts
		return {
			contents: [
				{
					parts: messages.map((m) => ({ text: m.content })),
				},
			],
			...extra,
		};
	}
	if (cfg.provider === 'anthropic') {
		return {
			model: cfg.model,
			messages: messages.map((m) => ({
				role: m.role || 'user',
				content: m.content,
			})),
			max_tokens: extra.max_tokens || 1024,
			stream: Boolean(stream),
			...extra,
		};
	}
	// openai / deepseek / qwen 兼容 Chat Completions
	return {
		model: cfg.model,
		messages: messages.map((m) => ({
			role: m.role || 'user',
			content: m.content,
		})),
		stream: Boolean(stream),
		...extra,
	};
}

/**
 * 构建LLM请求
 */
function buildLLMRequest(cfg, messages, stream) {
	const headers = buildLLMHeaders(cfg);
	const payload = buildLLMPayload(cfg, messages, stream);

	// Gemini 需将 key 放 query，流式用 streamGenerateContent
	if (cfg.provider === 'gemini') {
		const base = cfg.baseUrl || '';
		const streamPath =
			base.includes(':streamGenerateContent') || base.includes(':generateContent')
				? base
				: `${base.replace(/\/$/, '')}/models/${cfg.model}:${
						stream ? 'streamGenerateContent' : 'generateContent'
					}`;
		const url = new URL(streamPath);
		url.searchParams.set('key', cfg.apiKey);
		return { url: url.toString(), headers, payload };
	}

	return { url: cfg.baseUrl, headers, payload };
}

module.exports = {
	buildLLMHeaders,
	buildLLMPayload,
	buildLLMRequest,
};

