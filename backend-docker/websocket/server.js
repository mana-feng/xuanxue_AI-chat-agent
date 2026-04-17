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
const {
	buildLLMRequest,
	createThinkBlockStripper,
	extractLLMStreamText,
	flushLLMStreamText,
	isLLMConfigReady,
} = require('../services/llm');
const config = require('../config');
const {
	normalizeStatusCode,
	isLikelyUpstreamNetworkError,
	resolvePublicErrorMessage,
	sanitizeErrorForLog,
} = require('../utils/error-sanitizer');

// 在初始化阶段获取数据库和密钥，确保已完成 initDatabase 后再调用
let cachedDb = null;
const JWT_SECRET = config.JWT_SECRET;
const wsRateMap = new Map();

function resolveWsLlmErrorCode({ statusCode, rawMessage, rawCode, fallbackCode } = {}) {
	const normalizedStatus = normalizeStatusCode(statusCode || 500);
	const codeText = typeof rawCode === 'string' ? rawCode : '';
	const messageText = typeof rawMessage === 'string' ? rawMessage : '';

	if (isLikelyUpstreamNetworkError(messageText, codeText)) {
		return 'LLM_UPSTREAM_UNREACHABLE';
	}
	if (normalizedStatus === 429) return 'LLM_QUOTA_EXHAUSTED';
	if (normalizedStatus >= 500) return fallbackCode || 'LLM_REQUEST_FAILED';
	return fallbackCode || 'REQUEST_ERROR';
}

function extractBearerToken(authHeader) {
	if (typeof authHeader !== 'string') return null;
	const m = authHeader.match(/^Bearer\s+(.+)$/i);
	return m && m[1] ? m[1].trim() : null;
}

function extractWsToken(req) {
	const fromAuth = extractBearerToken(req.headers.authorization);
	if (fromAuth) return fromAuth;

	const rawProtocolHeader = req.headers['sec-websocket-protocol'];
	const protocolHeader = Array.isArray(rawProtocolHeader) ? rawProtocolHeader.join(',') : rawProtocolHeader;
	if (typeof protocolHeader === 'string' && protocolHeader.trim()) {
		const protocols = protocolHeader
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
		if (protocols.length >= 2 && protocols[0].toLowerCase() === 'bearer') {
			return protocols[1];
		}

		const bearerProtocol = protocols.find((item) => item.toLowerCase().startsWith('bearer.'));
		if (bearerProtocol) {
			return bearerProtocol.slice('bearer.'.length);
		}
	}

	return null;
}

function sendWsError(ws, { code, message, statusCode = 500, extra } = {}) {
	const safeMessage = resolvePublicErrorMessage({
		statusCode: normalizeStatusCode(statusCode),
		rawMessage: message || '请求失败',
	});
	const payload = {
		event: 'error',
		code: code || 'INTERNAL_ERROR',
		message: safeMessage,
	};
	if (extra && typeof extra === 'object') {
		Object.assign(payload, extra);
	}
	try {
		ws.send(JSON.stringify(payload) + '\n');
	} catch (_) {
		void 0;
	}
}

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
		const token = extractWsToken(req);
		
		if (!token) {
			sendWsError(ws, { code: 'MISSING_TOKEN', message: 'missing token', statusCode: 401 });
			ws.close(4001, 'missing token');
			return;
		}
		
		try {
			const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
			ws.userId = decoded.uid;
		} catch (e) {
			sendWsError(ws, { code: 'INVALID_TOKEN', message: 'invalid token', statusCode: 401 });
			ws.close(4002, 'invalid token');
			return;
		}

		ws.on('message', async (message) => {
			const now = Date.now();
			const key = String(ws.userId || 'unknown');
			let rec = wsRateMap.get(key) || { count: 0, resetAt: now + 60000 };
			if (now > rec.resetAt) {
				rec.count = 0;
				rec.resetAt = now + 60000;
			}
			rec.count++;
			wsRateMap.set(key, rec);
			if (rec.count > 5) {
				sendWsError(ws, { code: 'RATE_LIMIT', message: '消息过于频繁', statusCode: 429 });
				ws.close();
				return;
			}
			let parsed = null;
			try {
				parsed = JSON.parse(message.toString());
			} catch (e) {
				sendWsError(ws, { code: 'INVALID_JSON', message: 'invalid json', statusCode: 400 });
				return;
			}
			
			const { messages = [], stream = true } = parsed || {};
			if (!Array.isArray(messages) || messages.length === 0) {
				sendWsError(ws, { code: 'INVALID_PARAMS', message: 'messages 不能为空', statusCode: 400 });
				return;
			}
			
			try {
				// 检查用户额度
				const userId = ws.userId;
				const quotaCheck = await checkLLMQuota(userId);
				if (!quotaCheck.allowed) {
					sendWsError(ws, {
						code: 'QUOTA_EXHAUSTED',
						message: quotaCheck.reason || '额度已用完',
						statusCode: 429,
						extra: { usage: quotaCheck.usage },
					});
					ws.close();
					return;
				}

				const cfg = await ConfigService.getLLMConfig(db);
				if (!isLLMConfigReady(cfg)) {
					sendWsError(ws, {
						code: 'CONFIG_INCOMPLETE',
						message: 'LLM 配置不完整',
						statusCode: 500,
					});
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
					const statusCode = llmRes.status || 502;
					sendWsError(ws, {
						code: resolveWsLlmErrorCode({
							statusCode,
							rawMessage: text || 'LLM 请求失败',
							fallbackCode: 'LLM_REQUEST_FAILED',
						}),
						message: text || 'LLM 请求失败',
						statusCode,
					});
					ws.close();
					return;
				}

				const stripThinkChunk = cfg.provider === 'ollama' ? createThinkBlockStripper() : null;
				const decoder = new StringDecoder('utf8');
				let buffer = '';
				let jsonBuffer = '';

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
									ws.send(JSON.stringify({ event: 'delta', text }) + '\n');
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
								ws.send(JSON.stringify({ event: 'delta', text }) + '\n');
							}
						} catch (e) {
							// 忽略解析错误
						}
					}
				});

				llmRes.body.on('end', async () => {
					const tail = decoder.end();
					// 即使 tail 为空，也需要处理 buffer 或 jsonBuffer 中剩余的内容
					if (tail || buffer || jsonBuffer) {
						if (cfg.provider === 'gemini') {
							jsonBuffer += (tail || '');
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
										ws.send(JSON.stringify({ event: 'delta', text }) + '\n');
									}
								} catch (e) {
									// 忽略解析错误
								}
								startIdx = 0;
							}
						} else {
							buffer += (tail || '');
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
												ws.send(JSON.stringify({ event: 'delta', text }) + '\n');
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
					console.error('[WebSocket] 流式响应错误:', sanitizeErrorForLog(err));
					sendWsError(ws, {
						code: resolveWsLlmErrorCode({
							statusCode: 502,
							rawMessage: err?.message || '流式错误',
							rawCode: err?.code || err?.errno,
							fallbackCode: 'STREAM_ERROR',
						}),
						message: err?.message || '流式错误',
						statusCode: 502,
					});
					ws.close();
				});
			} catch (err) {
				console.error('[WebSocket] 调用失败:', sanitizeErrorForLog(err));
				sendWsError(ws, {
					code: resolveWsLlmErrorCode({
						statusCode: 500,
						rawMessage: err?.message || '调用失败',
						rawCode: err?.code || err?.errno,
						fallbackCode: 'INTERNAL_ERROR',
					}),
					message: err?.message || '调用失败',
					statusCode: 500,
				});
				ws.close();
			}
		});
	});
	
	return wss;
}

module.exports = {
	initWebSocketServer,
};

