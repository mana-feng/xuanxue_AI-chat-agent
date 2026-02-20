/**
 * LLM路由
 */
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');
const { checkLLMQuota, recordLLMUsage } = require('../services/quota');
const { buildLLMRequest } = require('../services/llm');
const { authMiddleware } = require('../middleware/auth');
const { apiSignatureMiddleware } = require('../middleware/api-signature');
const { llmLimiter } = require('../config/rateLimit');
const {
	normalizeStatusCode,
	isLikelyUpstreamNetworkError,
	resolvePublicErrorMessage,
	sanitizeErrorForLog,
} = require('../utils/error-sanitizer');
const { getErrorCode } = require('../utils/response');

const db = getDatabase();

function resolveLlmErrorCode({ statusCode, rawMessage, rawCode } = {}) {
	const normalizedStatus = normalizeStatusCode(statusCode || 500);
	const safeCode = typeof rawCode === 'string' ? rawCode : '';
	const safeMessage = typeof rawMessage === 'string' ? rawMessage : '';

	if (isLikelyUpstreamNetworkError(safeMessage, safeCode)) {
		return 'LLM_UPSTREAM_UNREACHABLE';
	}

	if (normalizedStatus === 429) {
		return 'LLM_QUOTA_EXHAUSTED';
	}

	if (normalizedStatus >= 500) {
		return 'LLM_REQUEST_FAILED';
	}

	return getErrorCode(normalizedStatus);
}

/**
 * 获取用户额度信息
 */
router.get('/quota', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		
		await checkLLMQuota(userId);
		
		const quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [userId]);
		
		// 确保字段有值
		const remainingCount = quota?.remaining_daily_count !== null && quota?.remaining_daily_count !== undefined 
			? quota.remaining_daily_count 
			: 0;
		
		const result = {
			remainingCount: remainingCount
		};
		
		res.json(result);
	} catch (err) {
		console.error('获取用户额度失败:', err);
		res.status(500).json({ error: '获取额度信息失败' });
	}
});

/**
 * 聊天接口（HTTP，支持流式和非流式）
 * 注意：此接口涉及敏感操作，已添加API签名验证
 */
router.post('/chat', llmLimiter, authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { messages = [], stream = false } = req.body || {};

	if (!Array.isArray(messages) || messages.length === 0) {
		return res.status(400).json({ error: 'messages 不能为空' });
	}

	try {
		// 检查用户额度
		const userId = req.user.id;
		const quotaCheck = await checkLLMQuota(userId);
		if (!quotaCheck.allowed) {
			return res.status(429).json({ 
				error: quotaCheck.reason || '额度已用完',
				usage: quotaCheck.usage 
			});
		}

		const cfg = await ConfigService.getLLMConfig(db);
		if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
			return res.status(400).json({ error: 'LLM 配置不完整，请联系管理员' });
		}

		const { url, headers, payload } = buildLLMRequest(cfg, messages, stream);

		if (stream) {
			// 流式转发：保持 chunk 输出
			res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');

			const llmRes = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(payload),
			});

			if (!llmRes.ok || !llmRes.body) {
				const text = await llmRes.text();
				const statusCode = normalizeStatusCode(llmRes.status || 502);
				const code = resolveLlmErrorCode({
					statusCode,
					rawMessage: text || 'LLM 请求失败',
				});
				const errorMessage = resolvePublicErrorMessage({
					statusCode,
					rawMessage: text || 'LLM 请求失败',
				});
				res.write(`data: ${JSON.stringify({ error: errorMessage, code })}\n\n`);
				return res.end();
			}

			if (cfg.provider === 'gemini') {
				// Gemini SSE 转换层：将 JSON 数组流转换为 SSE 格式
				let buffer = '';
				llmRes.body.on('data', (chunk) => {
					buffer += chunk.toString();
					
					// 使用计数法匹配最外层 {}
					let depth = 0;
					let start = -1;
					let inString = false;
					let escape = false;
					
					for (let i = 0; i < buffer.length; i++) {
						const char = buffer[i];
						if (escape) { escape = false; continue; }
						if (char === '\\') { escape = true; continue; }
						if (char === '"') { inString = !inString; continue; }
						if (inString) continue;

						if (char === '{') {
							if (depth === 0) start = i;
							depth++;
						} else if (char === '}') {
							depth--;
							if (depth === 0 && start !== -1) {
								const jsonStr = buffer.substring(start, i + 1);
								try {
									// 验证 JSON 合法性并压缩为单行（去除换行符，符合 SSE 规范）
									const compactJson = JSON.stringify(JSON.parse(jsonStr));
									res.write(`data: ${compactJson}\n\n`);
								} catch (e) {
									console.error('Gemini chunk parse error:', e);
								}
								
								// 移除已处理部分，重置循环
								buffer = buffer.substring(i + 1);
								i = -1; 
								start = -1;
							}
						}
					}
				});
				
				llmRes.body.on('end', () => {
					res.write('data: [DONE]\n\n');
					res.end();
				});
				
				llmRes.body.on('error', (err) => {
					console.error('Gemini stream error:', sanitizeErrorForLog(err));
					const statusCode = 502;
					const code = resolveLlmErrorCode({
						statusCode,
						rawMessage: err?.message || '流式错误',
						rawCode: err?.code || err?.errno,
					});
					const errorMessage = resolvePublicErrorMessage({
						statusCode,
						rawMessage: err?.message || '流式错误',
					});
					res.write(`data: ${JSON.stringify({ error: errorMessage, code })}\n\n`);
					res.end();
				});
			} else {
				// 其他厂商（OpenAI/Anthropic）本身就是 SSE，直接透传
				llmRes.body.on('data', (chunk) => {
					res.write(chunk);
				});
				llmRes.body.on('end', () => res.end());
				llmRes.body.on('error', (err) => {
					const statusCode = 502;
					const code = resolveLlmErrorCode({
						statusCode,
						rawMessage: err?.message || '流式错误',
						rawCode: err?.code || err?.errno,
					});
					const errorMessage = resolvePublicErrorMessage({
						statusCode,
						rawMessage: err?.message || '流式错误',
					});
					res.write(`data: ${JSON.stringify({ error: errorMessage, code })}\n\n`);
					res.end();
				});
			}
			return;
		}

		// 非流式响应
		const llmRes = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
		});
		const data = await llmRes.json().catch(() => ({}));
		if (!llmRes.ok) {
			const statusCode = normalizeStatusCode(llmRes.status || 502);
			const code = resolveLlmErrorCode({
				statusCode,
				rawMessage: data?.error || data?.message || 'LLM 请求失败',
			});
			return res.status(statusCode).json({ error: data?.error || 'LLM 请求失败', code });
		}

		let text = '';
		if (cfg.provider === 'gemini') {
			if (data.candidates && data.candidates[0]) {
				const candidate = data.candidates[0];
				if (candidate.content && candidate.content.parts) {
					for (const part of candidate.content.parts) {
						if (part.text) {
							text += part.text;
						}
					}
				}
			}
		} else if (cfg.provider === 'anthropic') {
			if (data.content && Array.isArray(data.content)) {
				for (const block of data.content) {
					if (block.type === 'text' && block.text) {
						text += block.text;
					}
				}
			}
		} else {
			if (data.choices && data.choices[0]) {
				const choice = data.choices[0];
				if (choice.message && choice.message.content) {
					text += choice.message.content;
				} else if (choice.text) {
					text += choice.text;
				}
			}
		}

		// 统一返回格式：只返回 text 内容
		// 仅按次数计数，不再按 Token 扣减
		await recordLLMUsage(userId, 0);
		
		res.json({ 
			reply: text || ''
		});
	} catch (e) {
		const statusCode = normalizeStatusCode(e?.statusCode || e?.status || 500);
		const code = resolveLlmErrorCode({
			statusCode,
			rawMessage: e?.publicMessage || e?.message || '调用失败',
			rawCode: e?.code || e?.errno || e?.cause?.code,
		});
		const message = resolvePublicErrorMessage({
			statusCode,
			rawMessage: e?.publicMessage || e?.message || '调用失败',
		});
		console.error('调用 LLM 失败:', { statusCode, code, ...sanitizeErrorForLog(e) });
		res.status(statusCode).json({ error: message, code });
	}
});

module.exports = router;

