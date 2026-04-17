/**
 * LLM routes.
 */
const express = require('express');

const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');
const { checkLLMQuota, recordLLMUsage } = require('../services/quota');
const {
	buildLLMRequest,
	createThinkBlockStripper,
	extractLLMStreamText,
	extractLLMText,
	flushLLMStreamText,
	isLLMConfigReady,
} = require('../services/llm');
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

function writeStreamError(res, { statusCode = 502, rawMessage, rawCode } = {}) {
	const code = resolveLlmErrorCode({ statusCode, rawMessage, rawCode });
	const errorMessage = resolvePublicErrorMessage({ statusCode, rawMessage });
	res.write(`data: ${JSON.stringify({ error: errorMessage, code })}\n\n`);
	res.end();
}

async function pipeLLMStream(res, cfg, llmRes) {
	if (!llmRes.ok || !llmRes.body) {
		const text = await llmRes.text().catch(() => '');
		writeStreamError(res, {
			statusCode: normalizeStatusCode(llmRes.status || 502),
			rawMessage: text || 'LLM request failed',
		});
		return;
	}

	if (cfg.provider === 'gemini') {
		let buffer = '';
		llmRes.body.on('data', (chunk) => {
			buffer += chunk.toString();

			let depth = 0;
			let start = -1;
			let inString = false;
			let escape = false;

			for (let i = 0; i < buffer.length; i += 1) {
				const char = buffer[i];
				if (escape) {
					escape = false;
					continue;
				}
				if (char === '\\') {
					escape = true;
					continue;
				}
				if (char === '"') {
					inString = !inString;
					continue;
				}
				if (inString) {
					continue;
				}

				if (char === '{') {
					if (depth === 0) {
						start = i;
					}
					depth += 1;
				} else if (char === '}') {
					depth -= 1;
					if (depth === 0 && start !== -1) {
						const jsonStr = buffer.substring(start, i + 1);
						try {
							const compactJson = JSON.stringify(JSON.parse(jsonStr));
							res.write(`data: ${compactJson}\n\n`);
						} catch (err) {
							void err;
						}

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
			writeStreamError(res, {
				statusCode: 502,
				rawMessage: err?.message || 'stream error',
				rawCode: err?.code || err?.errno,
			});
		});
		return;
	}

	if (cfg.provider === 'ollama') {
		let buffer = '';
		const stripThinkChunk = createThinkBlockStripper();

		const writeOllamaDelta = (payload) => {
			const text = extractLLMStreamText(cfg, payload, stripThinkChunk);
			if (text) {
				res.write(`data: ${JSON.stringify({ event: 'delta', text })}\n\n`);
			}
		};

		llmRes.body.on('data', (chunk) => {
			buffer += chunk.toString();
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) {
					continue;
				}
				try {
					writeOllamaDelta(JSON.parse(trimmed));
				} catch (err) {
					void err;
				}
			}
		});

		llmRes.body.on('end', () => {
			const trimmed = buffer.trim();
			if (trimmed) {
				try {
					writeOllamaDelta(JSON.parse(trimmed));
				} catch (err) {
					void err;
				}
			}

			const tail = flushLLMStreamText(cfg, stripThinkChunk);
			if (tail) {
				res.write(`data: ${JSON.stringify({ event: 'delta', text: tail })}\n\n`);
			}

			res.write('data: [DONE]\n\n');
			res.end();
		});

		llmRes.body.on('error', (err) => {
			writeStreamError(res, {
				statusCode: 502,
				rawMessage: err?.message || 'stream error',
				rawCode: err?.code || err?.errno,
			});
		});
		return;
	}

	llmRes.body.on('data', (chunk) => {
		res.write(chunk);
	});
	llmRes.body.on('end', () => {
		res.end();
	});
	llmRes.body.on('error', (err) => {
		writeStreamError(res, {
			statusCode: 502,
			rawMessage: err?.message || 'stream error',
			rawCode: err?.code || err?.errno,
		});
	});
}

async function handleLLMRequest(req, res, { scope = 'chat', requireQuota = false } = {}) {
	const { messages = [], stream = false } = req.body || {};

	if (!Array.isArray(messages) || messages.length === 0) {
		return res.status(400).json({ error: 'messages cannot be empty' });
	}

	try {
		const userId = req.user?.id;
		if (requireQuota) {
			const quotaCheck = await checkLLMQuota(userId);
			if (!quotaCheck.allowed) {
				return res.status(429).json({
					error: quotaCheck.reason || 'quota exhausted',
					usage: quotaCheck.usage,
				});
			}
		}

		const cfg = await ConfigService.getLLMConfig(db, scope);
		if (!isLLMConfigReady(cfg)) {
			return res.status(400).json({ error: 'LLM config is incomplete' });
		}

		const { url, headers, payload } = buildLLMRequest(cfg, messages, stream);

		if (stream) {
			res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');

			const llmRes = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(payload),
			});

			await pipeLLMStream(res, cfg, llmRes);
			return;
		}

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
				rawMessage: data?.error || data?.message || 'LLM request failed',
			});
			return res.status(statusCode).json({ error: data?.error || 'LLM request failed', code });
		}

		const text = extractLLMText(cfg, data);

		if (requireQuota && userId) {
			await recordLLMUsage(userId, 0);
		}

		return res.json({
			reply: text || '',
		});
	} catch (err) {
		const statusCode = normalizeStatusCode(err?.statusCode || err?.status || 500);
		const code = resolveLlmErrorCode({
			statusCode,
			rawMessage: err?.publicMessage || err?.message || 'request failed',
			rawCode: err?.code || err?.errno || err?.cause?.code,
		});
		const message = resolvePublicErrorMessage({
			statusCode,
			rawMessage: err?.publicMessage || err?.message || 'request failed',
		});
		console.error('LLM request failed:', { statusCode, code, ...sanitizeErrorForLog(err) });
		return res.status(statusCode).json({ error: message, code });
	}
}

router.get('/quota', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;

		await checkLLMQuota(userId);

		const quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [userId]);
		const remainingCount =
			quota?.remaining_daily_count !== null && quota?.remaining_daily_count !== undefined
				? quota.remaining_daily_count
				: 0;

		res.json({
			remainingCount,
		});
	} catch (err) {
		console.error('load llm quota failed:', err);
		res.status(500).json({ error: 'load quota failed' });
	}
});

router.post('/chat', llmLimiter, authMiddleware, apiSignatureMiddleware(), async (req, res) => {
	return handleLLMRequest(req, res, { scope: 'chat', requireQuota: true });
});

router.post('/agent', llmLimiter, async (req, res) => {
	return handleLLMRequest(req, res, { scope: 'agent', requireQuota: false });
});

module.exports = router;
