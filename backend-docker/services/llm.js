/**
 * LLM service helpers
 */
const { safeJsonParse } = require('../utils/helpers');

function normalizeProvider(provider) {
	return String(provider || '').trim().toLowerCase();
}

function isApiKeyOptionalProvider(provider) {
	return normalizeProvider(provider) === 'ollama';
}

function isLLMConfigReady(cfg) {
	if (!cfg) return false;
	const provider = normalizeProvider(cfg.provider);
	return Boolean(cfg.baseUrl && cfg.model && (cfg.apiKey || isApiKeyOptionalProvider(provider)));
}

function resolveOllamaChatUrl(baseUrl) {
	const base = String(baseUrl || '').trim();
	if (!base) return '';
	if (/\/api\/chat\/?$/i.test(base)) {
		return base;
	}
	return `${base.replace(/\/$/, '')}/api/chat`;
}

function stripThinkTags(text) {
	return String(text || '')
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.trim();
}

function createThinkBlockStripper() {
	const openTag = '<think>';
	const closeTag = '</think>';
	const maxCarryLength = Math.max(openTag.length, closeTag.length) - 1;
	let insideThink = false;
	let carry = '';

	return function stripChunk(input, { flush = false } = {}) {
		let text = carry + String(input || '');
		carry = '';
		let output = '';
		let cursor = 0;

		while (cursor < text.length) {
			if (insideThink) {
				const closeIndex = text.indexOf(closeTag, cursor);
				if (closeIndex === -1) {
					if (!flush) {
						carry = text.slice(Math.max(cursor, text.length - maxCarryLength));
					}
					return output;
				}
				cursor = closeIndex + closeTag.length;
				insideThink = false;
				continue;
			}

			const openIndex = text.indexOf(openTag, cursor);
			if (openIndex === -1) {
				if (flush) {
					output += text.slice(cursor);
				} else {
					const keepStart = Math.max(cursor, text.length - maxCarryLength);
					output += text.slice(cursor, keepStart);
					carry = text.slice(keepStart);
				}
				return output;
			}

			output += text.slice(cursor, openIndex);
			cursor = openIndex + openTag.length;
			insideThink = true;
		}

		return output;
	};
}

function buildLLMHeaders(cfg) {
	const provider = normalizeProvider(cfg.provider);
	const common = { 'Content-Type': 'application/json' };

	if (provider === 'gemini') {
		return common;
	}

	if (provider === 'anthropic') {
		return {
			...common,
			'x-api-key': cfg.apiKey,
			'anthropic-version': '2023-06-01',
		};
	}

	if (provider === 'ollama') {
		return common;
	}

	return {
		...common,
		Authorization: `Bearer ${cfg.apiKey}`,
	};
}

function buildLLMPayload(cfg, messages, stream) {
	const provider = normalizeProvider(cfg.provider);
	const extra = safeJsonParse(cfg.extra) || {};

	if (provider === 'gemini') {
		const systemMessage = messages.find((item) => item.role === 'system');
		const chatMessages = messages.filter((item) => item.role !== 'system');
		const contents = chatMessages.map((item) => ({
			role: item.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: item.content }],
		}));

		const payload = {
			contents,
			...extra,
		};

		if (systemMessage) {
			payload.systemInstruction = {
				parts: [{ text: systemMessage.content }],
			};
		}

		return payload;
	}

	if (provider === 'anthropic') {
		return {
			model: cfg.model,
			messages: messages.map((item) => ({
				role: item.role || 'user',
				content: item.content,
			})),
			max_tokens: extra.max_tokens || 1024,
			stream: Boolean(stream),
			...extra,
		};
	}

	if (provider === 'ollama') {
		const payload = {
			model: cfg.model,
			messages: messages.map((item) => ({
				role: item.role || 'user',
				content: item.content,
			})),
			stream: Boolean(stream),
			...extra,
		};

		if (payload.think === undefined) {
			payload.think = false;
		}

		return payload;
	}

	return {
		model: cfg.model,
		messages: messages.map((item) => ({
			role: item.role || 'user',
			content: item.content,
		})),
		stream: Boolean(stream),
		...extra,
	};
}

function buildLLMRequest(cfg, messages, stream) {
	const provider = normalizeProvider(cfg.provider);
	const headers = buildLLMHeaders(cfg);
	const payload = buildLLMPayload(cfg, messages, stream);

	if (provider === 'gemini') {
		const base = String(cfg.baseUrl || '').trim();
		const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
		let targetUrl = '';

		if (base.includes(':streamGenerateContent') || base.includes(':generateContent')) {
			targetUrl = base.replace(/:(streamGenerateContent|generateContent)/, `:${endpoint}`);
		} else {
			targetUrl = `${base.replace(/\/$/, '')}/models/${cfg.model}:${endpoint}`;
		}

		const url = new URL(targetUrl);
		url.searchParams.set('key', cfg.apiKey);
		if (stream) {
			url.searchParams.set('alt', 'sse');
		}
		return { url: url.toString(), headers, payload };
	}

	if (provider === 'ollama') {
		return {
			url: resolveOllamaChatUrl(cfg.baseUrl),
			headers,
			payload,
		};
	}

	return { url: cfg.baseUrl, headers, payload };
}

function extractLLMText(cfg, data) {
	const provider = normalizeProvider(cfg?.provider);

	if (provider === 'gemini') {
		let text = '';
		if (data?.candidates?.[0]?.content?.parts) {
			for (const part of data.candidates[0].content.parts) {
				if (part.text) {
					text += part.text;
				}
			}
		}
		return text.trim();
	}

	if (provider === 'anthropic') {
		let text = '';
		if (Array.isArray(data?.content)) {
			for (const block of data.content) {
				if (block?.type === 'text' && block?.text) {
					text += block.text;
				}
			}
		}
		return text.trim();
	}

	if (provider === 'ollama') {
		return stripThinkTags(data?.message?.content || '');
	}

	if (data?.choices?.[0]) {
		const choice = data.choices[0];
		if (choice.message?.content) {
			return String(choice.message.content).trim();
		}
		if (choice.text) {
			return String(choice.text).trim();
		}
	}

	return '';
}

function extractLLMStreamText(cfg, data, thinkStripper) {
	const provider = normalizeProvider(cfg?.provider);

	if (provider === 'anthropic') {
		return typeof data?.delta?.text === 'string' ? data.delta.text : '';
	}

	if (provider === 'ollama') {
		const content = typeof data?.message?.content === 'string' ? data.message.content : '';
		if (!content) return '';
		return thinkStripper ? thinkStripper(content) : stripThinkTags(content);
	}

	if (data?.choices?.[0]) {
		const choice = data.choices[0];
		if (typeof choice?.delta?.content === 'string') {
			return choice.delta.content;
		}
		if (typeof choice?.message?.content === 'string') {
			return choice.message.content;
		}
	}

	return '';
}

function flushLLMStreamText(cfg, thinkStripper) {
	if (normalizeProvider(cfg?.provider) !== 'ollama' || typeof thinkStripper !== 'function') {
		return '';
	}
	return thinkStripper('', { flush: true }).trim();
}

module.exports = {
	buildLLMHeaders,
	buildLLMPayload,
	buildLLMRequest,
	createThinkBlockStripper,
	extractLLMStreamText,
	extractLLMText,
	flushLLMStreamText,
	isApiKeyOptionalProvider,
	isLLMConfigReady,
};
