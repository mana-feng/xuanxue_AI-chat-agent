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

	if (apiKey) {
		headers['Authorization'] = `Bearer ${apiKey}`;
	}

	let url = apiUrl;
	let body: any;
	const useStream = !!(callbacks?.onChunk || callbacks?.onThinking);

	switch (provider) {
		case 'openai':
		case 'custom':
			body = {
				model,
				messages,
				stream: useStream,
			};
			break;
		case 'anthropic':
			body = {
				model,
				messages: messages.map((m) => ({
					role: m.role === 'assistant' ? 'assistant' : 'user',
					content: m.content,
				})),
				max_tokens: 4096,
				stream: useStream,
			};
			if (useStream) {
				body.thinking = { type: 'enabled', budget_tokens: 10000 };
			}
			headers['anthropic-version'] = '2023-06-01';
			break;
		case 'gemini':
			body = {
				contents: messages.map((m) => ({
					role: m.role === 'assistant' ? 'model' : 'user',
					parts: [{ text: m.content }],
				})),
			};
			if (url.includes('generativelanguage.googleapis.com') && !url.includes('key=')) {
				url = `${url}?key=${apiKey}`;
				delete headers['Authorization'];
			}
			break;
		case 'ollama':
			body = {
				model,
				messages,
				stream: useStream,
			};
			break;
		default:
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
				const nonStreamBody = { ...body, stream: false };
				return await nonStreamRequest(url, headers, nonStreamBody, provider);
			}
			throw streamErr;
		}
	}

	return nonStreamRequest(url, headers, body, provider);
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
							content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
		content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
