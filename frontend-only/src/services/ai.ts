import { getAiConfig, type AiConfig } from '@/config/aiConfig';

export type StreamCallbacks = {
	onChunk?: (text: string) => void;
	onThinking?: (text: string) => void;
};

export async function callAi(
	messages: Array<{ role: string; content: string }>,
	callbacks?: StreamCallbacks,
): Promise<string> {
	const config = getAiConfig();
	if (!config) {
		throw new Error('请先在设置页面配置 AI API');
	}

	const { apiUrl, apiKey, model, provider } = config;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	let url = apiUrl;
	let body: any;
	const useStream = !!(callbacks?.onChunk || callbacks?.onThinking);
	// Gemini 原生端点（.../models/xxx:generateContent）与 OpenAI 兼容端点
	// （.../openai/chat/completions）的请求格式完全不同，按 URL 区分。
	const isGeminiNative = provider === 'gemini' && !url.includes('/chat/completions');
	const systemText = messages
		.filter((m) => m.role === 'system')
		.map((m) => m.content)
		.join('\n\n');

	if (provider === 'anthropic') {
		// Anthropic 使用 x-api-key 而非 Bearer；浏览器直连必须带 CORS 豁免头
		if (apiKey) headers['x-api-key'] = apiKey;
		headers['anthropic-version'] = '2023-06-01';
		headers['anthropic-dangerous-direct-browser-access'] = 'true';
		body = {
			model,
			messages: messages
				.filter((m) => m.role !== 'system')
				.map((m) => ({
					role: m.role === 'assistant' ? 'assistant' : 'user',
					content: m.content,
				})),
			max_tokens: 4096,
			stream: useStream,
		};
		if (systemText) {
			body.system = systemText;
		}
	} else if (isGeminiNative) {
		// 密钥放请求头，避免出现在 URL / 浏览器历史里
		if (apiKey) headers['x-goog-api-key'] = apiKey;
		body = {
			contents: messages
				.filter((m) => m.role !== 'system')
				.map((m) => ({
					role: m.role === 'assistant' ? 'model' : 'user',
					parts: [{ text: m.content }],
				})),
		};
		if (systemText) {
			body.systemInstruction = { parts: [{ text: systemText }] };
		}
		url = resolveGeminiNativeUrl(url, model, useStream);
	} else {
		// OpenAI / Gemini 兼容模式 / qwen / deepseek / kimi / zhipu / ollama / custom
		if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
		body = {
			model,
			messages,
			stream: useStream,
		};
	}

	if (useStream) {
		try {
			return await streamRequest(url, headers, body, provider, callbacks);
		} catch (streamErr: any) {
			const msg = String(streamErr?.message || '').toLowerCase();
			if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('err_aborted') || msg.includes('cors') || streamErr instanceof TypeError) {
				if (isGeminiNative) {
					// 原生 Gemini 的流式/非流式是不同端点，请求体本身不带 stream 字段
					const fallbackUrl = resolveGeminiNativeUrl(apiUrl, model, false);
					return await nonStreamRequest(fallbackUrl, headers, body, provider);
				}
				const nonStreamBody = { ...body, stream: false };
				return await nonStreamRequest(url, headers, nonStreamBody, provider);
			}
			throw streamErr;
		}
	}

	return nonStreamRequest(url, headers, body, provider);
}

function resolveGeminiNativeUrl(baseUrl: string, model: string, stream: boolean): string {
	const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
	let url = String(baseUrl || '').trim().replace(/[?#].*$/, '');
	if (/:(streamGenerateContent|generateContent)$/.test(url)) {
		url = url.replace(/:(streamGenerateContent|generateContent)$/, `:${endpoint}`);
	} else {
		url = `${url.replace(/\/+$/, '')}/models/${model}:${endpoint}`;
	}
	return stream ? `${url}?alt=sse` : url;
}

async function nonStreamRequest(
	url: string,
	headers: Record<string, string>,
	body: any,
	provider: string,
): Promise<string> {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'POST',
			data: body,
			header: headers,
			timeout: 300000,
			success: (res: any) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					const data = res.data as any;
					try {
						let content = '';
						if (provider === 'anthropic') {
							content = data?.content?.[0]?.text || '';
						} else if (provider === 'gemini') {
							// 兼容原生（candidates）和 OpenAI 兼容（choices）两种响应
							content =
								data?.candidates?.[0]?.content?.parts?.[0]?.text ||
								data?.choices?.[0]?.message?.content ||
								'';
						} else {
							content = data?.choices?.[0]?.message?.content || '';
						}
						resolve(content);
					} catch {
						reject(new Error('AI 响应解析失败'));
					}
				} else {
					reject(new Error(`AI 请求失败: ${res.statusCode}`));
				}
			},
			fail: (err: any) => {
				reject(new Error(`AI 请求失败: ${err?.errMsg || '网络错误'}`));
			},
		});
	});
}

function extractStreamChunk(
	data: any,
	provider: string,
): { content: string; thinking: string } {
	let content = '';
	let thinking = '';

	if (provider === 'anthropic') {
		if (data?.type === 'content_block_delta') {
			if (data?.delta?.type === 'thinking_delta') {
				thinking = data?.delta?.thinking || '';
			} else if (data?.delta?.type === 'text_delta') {
				content = data?.delta?.text || '';
			}
		}
	} else if (provider === 'gemini') {
		// 原生 SSE 走 candidates；OpenAI 兼容端点走 choices.delta
		content =
			data?.candidates?.[0]?.content?.parts?.[0]?.text ||
			data?.choices?.[0]?.delta?.content ||
			'';
	} else {
		thinking = data?.choices?.[0]?.delta?.reasoning_content || '';
		content = data?.choices?.[0]?.delta?.content || '';
	}

	return { content, thinking };
}

async function streamRequest(
	url: string,
	headers: Record<string, string>,
	body: any,
	provider: string,
	callbacks?: StreamCallbacks,
): Promise<string> {
	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`AI 流请求失败: ${response.status}`);
	}

	if (!response.body) {
		const text = await response.text();
		return text;
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let fullText = '';
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || !trimmed.startsWith('data:')) continue;
			const dataStr = trimmed.slice(5).trim();
			if (dataStr === '[DONE]') continue;
			try {
				const data = JSON.parse(dataStr);
				const { content, thinking } = extractStreamChunk(data, provider);
				if (thinking && callbacks?.onThinking) {
					callbacks.onThinking(thinking);
				}
				if (content) {
					fullText += content;
					callbacks?.onChunk?.(content);
				}
			} catch {
				// ignore parse errors
			}
		}
	}

	if (buffer.trim()) {
		const trimmed = buffer.trim();
		if (trimmed.startsWith('data:')) {
			const dataStr = trimmed.slice(5).trim();
			if (dataStr !== '[DONE]') {
				try {
					const data = JSON.parse(dataStr);
					const { content, thinking } = extractStreamChunk(data, provider);
					if (thinking && callbacks?.onThinking) {
						callbacks.onThinking(thinking);
					}
					if (content) {
						fullText += content;
						callbacks?.onChunk?.(content);
					}
				} catch {
					// ignore parse errors
				}
			}
		}
	}

	return fullText;
}
