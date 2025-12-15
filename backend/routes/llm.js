/**
 * LLM路由
 */
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');
const { checkLLMQuota, recordLLMUsage } = require('../services/quota');
const { buildLLMHeaders, buildLLMPayload } = require('../services/llm');
const { authMiddleware } = require('../middleware/auth');
const { apiSignatureMiddleware } = require('../middleware/api-signature');

const db = getDatabase();

/**
 * 获取用户额度信息
 */
router.get('/quota', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		
		const quotaCheck = await checkLLMQuota(userId);
		
		// 获取或创建用户额度记录
		let quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [userId]);
		
		if (!quota) {
			// 如果不存在，创建默认额度记录（per_minute_limit 固定为1）
			await db.run(
				`INSERT INTO user_llm_quotas 
				(user_id, per_minute_limit, remaining_count, remaining_token, updated_at) 
				VALUES (?, 1, 0, 0, NOW())`,
				[userId]
			);
			quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [userId]);
		}
		
		// 确保字段有值
		const remainingCount = quota.remaining_count !== null && quota.remaining_count !== undefined 
			? quota.remaining_count 
			: 0;
		const remainingToken = quota.remaining_token !== null && quota.remaining_token !== undefined 
			? quota.remaining_token 
			: 0;
		
		const result = {
			remainingCount: remainingCount,
			remainingToken: remainingToken,
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
router.post('/chat', authMiddleware, apiSignatureMiddleware(), async (req, res) => {
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

		const payload = buildLLMPayload(cfg, messages, stream);
		const headers = buildLLMHeaders(cfg);

		if (stream) {
			// 流式转发：保持 chunk 输出
			res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');

			const llmRes = await fetch(cfg.baseUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify(payload),
			});

			if (!llmRes.ok || !llmRes.body) {
				const text = await llmRes.text();
				res.write(`data: ${JSON.stringify({ error: text || 'LLM 请求失败' })}\n\n`);
				return res.end();
			}

			llmRes.body.on('data', (chunk) => {
				res.write(chunk);
			});
			llmRes.body.on('end', () => res.end());
			llmRes.body.on('error', (err) => {
				res.write(`data: ${JSON.stringify({ error: err.message || '流式错误' })}\n\n`);
				res.end();
			});
			return;
		}

		// 非流式响应
		const llmRes = await fetch(cfg.baseUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
		});
		const data = await llmRes.json().catch(() => ({}));
		if (!llmRes.ok) {
			return res.status(500).json({ error: data?.error || 'LLM 请求失败' });
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
		const estimatedTokens = Math.ceil(text.length / 4); // 简单估算：4个字符约等于1个token
		await recordLLMUsage(userId, estimatedTokens);
		
		res.json({ 
			reply: text || ''
		});
	} catch (e) {
		console.error('调用 LLM 失败:', e);
		res.status(500).json({ error: e.message || '调用失败' });
	}
});

module.exports = router;

