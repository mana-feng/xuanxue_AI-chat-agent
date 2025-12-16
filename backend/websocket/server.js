/**
 * WebSocket 服务器
 */
const { WebSocketServer } = require('ws');
const { StringDecoder } = require('string_decoder');
const jwt = require('jsonwebtoken');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');
const { checkLLMQuota, recordLLMUsage } = require('../services/quota');
const { buildLLMRequest } = require('../services/llm');
const config = require('../config');

// 在初始化阶段获取数据库和密钥，确保已完成 initDatabase 后再调用
let cachedDb = null;
const JWT_SECRET = config.JWT_SECRET;

/**
 * 初始化 WebSocket 服务器
 */
function initWebSocketServer(server) {
	// 确保在 app.js 调用 initDatabase() 之后再获取数据库实例
	if (!cachedDb) {
		cachedDb = getDatabase();
	}
	const db = cachedDb;
	const wss = new WebSocketServer({ server, path: '/api/llm/chat/ws' });
	
	wss.on('connection', (ws, req) => {
		const url = new URL(req.url, `http://${req.headers.host}`);
		const token = url.searchParams.get('token');
		
		if (!token) {
			ws.close(4001, 'missing token');
			return;
		}
		
		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			ws.userId = decoded.uid;
		} catch (e) {
			ws.close(4002, 'invalid token');
			return;
		}

		ws.on('message', async (message) => {
			let parsed = null;
			try {
				parsed = JSON.parse(message.toString());
			} catch (e) {
				ws.send(JSON.stringify({ error: 'invalid json' }));
				return;
			}
			
			const { messages = [], stream = true } = parsed || {};
			if (!Array.isArray(messages) || messages.length === 0) {
				ws.send(JSON.stringify({ error: 'messages 不能为空' }));
				return;
			}
			
			try {
				// 检查用户额度
				const userId = ws.userId;
				const quotaCheck = await checkLLMQuota(userId);
				if (!quotaCheck.allowed) {
					ws.send(JSON.stringify({ error: quotaCheck.reason || '额度已用完', usage: quotaCheck.usage }) + '\n');
					ws.close();
					return;
				}

				const cfg = await ConfigService.getLLMConfig(db);
				if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
					ws.send(JSON.stringify({ error: 'LLM 配置不完整' }) + '\n');
					ws.close();
					return;
				}
				
				const { url: llmUrl, headers, payload } = buildLLMRequest(cfg, messages, Boolean(stream));
				
				const llmRes = await fetch(llmUrl, {
					method: 'POST',
					headers,
					body: JSON.stringify(payload),
				});
				
				if (!llmRes.ok || !llmRes.body) {
					const text = await llmRes.text();
					ws.send(JSON.stringify({ error: text || 'LLM 请求失败' }) + '\n');
					ws.close();
					return;
				}

				const decoder = new StringDecoder('utf8');
				let buffer = '';
				let jsonBuffer = '';
				let totalText = '';

				llmRes.body.on('data', (chunk) => {
					const safeText = decoder.write(chunk);
					buffer += safeText;

					if (cfg.provider === 'gemini') {
						jsonBuffer += safeText;
						let startIdx = 0;
						while (startIdx < jsonBuffer.length) {
							const braceStart = jsonBuffer.indexOf('{', startIdx);
							if (braceStart === -1) break;

							let braceCount = 0;
							let braceEnd = -1;
							for (let i = braceStart; i < jsonBuffer.length; i++) {
								if (jsonBuffer[i] === '{') braceCount++;
								if (jsonBuffer[i] === '}') braceCount--;
								if (braceCount === 0) {
									braceEnd = i;
									break;
								}
							}

							if (braceEnd === -1) {
								break;
							}

							const jsonStr = jsonBuffer.slice(braceStart, braceEnd + 1);
							jsonBuffer = jsonBuffer.slice(braceEnd + 1);

							try {
								const json = JSON.parse(jsonStr);
								let text = '';
								if (json.candidates && json.candidates[0]) {
									const candidate = json.candidates[0];
									if (candidate.content && candidate.content.parts) {
										for (const part of candidate.content.parts) {
											if (part.text) {
												text += part.text;
											}
										}
									}
								}
								if (text) {
									totalText += text;
									// 按字符逐个发送，实现逐个token显示效果
									for (let i = 0; i < text.length; i++) {
										ws.send(JSON.stringify({ event: 'delta', text: text[i] }) + '\n');
									}
								}
							} catch (e) {
								// 忽略解析错误
							}

							startIdx = 0;
						}
						return;
					}

					// 其他 provider：按行处理（SSE 格式或 NDJSON）
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (!line.trim()) continue;

						// 处理 SSE 格式：data: {...}
						let jsonStr = line;
						if (line.startsWith('data:')) {
							jsonStr = line.replace(/^data:\s*/, '').trim();
						}

						// 跳过 [DONE] 标记
						if (jsonStr === '[DONE]') {
							continue;
						}

						try {
							const json = JSON.parse(jsonStr);
							let text = '';

							// 根据不同 provider 提取 text 内容
							if (cfg.provider === 'anthropic') {
								if (json.delta && json.delta.text) {
									text = json.delta.text;
								} else if (json.type === 'content_block_delta' && json.delta && json.delta.text) {
									text = json.delta.text;
								}
							} else {
								// OpenAI/DeepSeek/Qwen 流式响应
								if (json.choices && json.choices[0]) {
									const choice = json.choices[0];
									if (choice.delta && choice.delta.content) {
										text = choice.delta.content;
									} else if (choice.message && choice.message.content) {
										text = choice.message.content;
									}
								}
							}

							if (text) {
								totalText += text;
								// 按字符逐个发送，实现逐个token显示效果
								for (let i = 0; i < text.length; i++) {
									ws.send(JSON.stringify({ event: 'delta', text: text[i] }) + '\n');
								}
							}
						} catch (e) {
							// 忽略解析错误
						}
					}
				});

				llmRes.body.on('end', async () => {
					const tail = decoder.end();
					if (tail) {
						if (cfg.provider === 'gemini') {
							jsonBuffer += tail;
							let startIdx = 0;
							while (startIdx < jsonBuffer.length) {
								const braceStart = jsonBuffer.indexOf('{', startIdx);
								if (braceStart === -1) break;
								let braceCount = 0;
								let braceEnd = -1;
								for (let i = braceStart; i < jsonBuffer.length; i++) {
									if (jsonBuffer[i] === '{') braceCount++;
									if (jsonBuffer[i] === '}') braceCount--;
									if (braceCount === 0) {
										braceEnd = i;
										break;
									}
								}
								if (braceEnd === -1) break;
								const jsonStr = jsonBuffer.slice(braceStart, braceEnd + 1);
								jsonBuffer = jsonBuffer.slice(braceEnd + 1);
								try {
									const json = JSON.parse(jsonStr);
									let text = '';
									if (json.candidates?.[0]?.content?.parts) {
										for (const part of json.candidates[0].content.parts) {
											if (part.text) text += part.text;
										}
									}
									if (text) {
										totalText += text;
										for (let i = 0; i < text.length; i++) {
											ws.send(JSON.stringify({ event: 'delta', text: text[i] }) + '\n');
										}
									}
								} catch (e) {
									// 忽略解析错误
								}
								startIdx = 0;
							}
						} else {
							buffer += tail;
							if (buffer.trim()) {
								try {
									let jsonStr = buffer;
									if (buffer.startsWith('data:')) {
										jsonStr = buffer.replace(/^data:\s*/, '').trim();
									}
									if (jsonStr !== '[DONE]') {
										const json = JSON.parse(jsonStr);
										let text = '';
										if (cfg.provider === 'anthropic' && json.delta?.text) {
											text = json.delta.text;
										} else if (json.choices?.[0]?.delta?.content) {
											text = json.choices[0].delta.content;
										}
										if (text) {
											totalText += text;
											for (let i = 0; i < text.length; i++) {
												ws.send(JSON.stringify({ event: 'delta', text: text[i] }) + '\n');
											}
										}
									}
								} catch (e) {
									// 忽略解析错误
								}
							}
						}
					}
					
					// 记录使用情况（仅按次数计数，不再按 Token 扣减）
					try {
						await recordLLMUsage(userId, 0);
					} catch (err) {
						console.error('记录使用情况失败:', err);
					}
					
					// 发送完成标记
					ws.send(JSON.stringify({ event: 'done' }) + '\n');
					
					ws.close();
				});

				llmRes.body.on('error', (err) => {
					console.error('[WebSocket] 流式响应错误:', err);
					ws.send(JSON.stringify({ error: err.message || '流式错误' }) + '\n');
					ws.close();
				});
			} catch (err) {
				ws.send(JSON.stringify({ error: err.message || '调用失败' }) + '\n');
				ws.close();
			}
		});
	});
	
	return wss;
}

module.exports = {
	initWebSocketServer,
};

