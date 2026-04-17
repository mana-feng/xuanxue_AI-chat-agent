/**
 * API signature utility
 * Protects against tampering and replay attacks.
 */

const crypto = require('crypto');
const config = require('../config');

const API_SIGNATURE_SECRET = config.API_SIGNATURE_SECRET;
const TIMESTAMP_VALID_WINDOW = config.API_SIGNATURE_TIMESTAMP_WINDOW || 5 * 60 * 1000;
const REDIS_URL = config.REDIS_URL || '';
const REDIS_PREFIX = config.REDIS_PREFIX || 'bazi';

const usedNonces = new Map();

let redisClient = null;
let redisInitPromise = null;
let redisUnavailable = false;

const cleanupTimer = setInterval(() => {
	const now = Date.now();
	for (const [nonce, timestamp] of usedNonces.entries()) {
		if (now - timestamp > TIMESTAMP_VALID_WINDOW) {
			usedNonces.delete(nonce);
		}
	}
}, 10 * 60 * 1000);

if (typeof cleanupTimer.unref === 'function') {
	cleanupTimer.unref();
}

function nonceKey(nonce) {
	return `${REDIS_PREFIX}:nonce:${nonce}`;
}

async function getRedisClient() {
	if (!REDIS_URL || redisUnavailable) {
		return null;
	}

	if (redisClient && redisClient.isOpen) {
		return redisClient;
	}

	if (redisInitPromise) {
		return redisInitPromise;
	}

	redisInitPromise = (async () => {
		try {
			// Optional dependency. If not installed, fallback to in-memory nonce store.
			// eslint-disable-next-line global-require
			const { createClient } = require('redis');
			const client = createClient({ url: REDIS_URL });

			client.on('error', (err) => {
				console.warn('[api-signature] Redis client error, fallback to memory:', err.message);
			});

			await client.connect();
			redisClient = client;
			console.log('[api-signature] Redis nonce store enabled');
			return redisClient;
		} catch (err) {
			redisUnavailable = true;
			console.warn(
				'[api-signature] Redis unavailable, using in-memory nonce store:',
				err.message || err
			);
			return null;
		} finally {
			redisInitPromise = null;
		}
	})();

	return redisInitPromise;
}

function timingSafeEqualString(a, b) {
	const bufA = Buffer.from(String(a), 'utf8');
	const bufB = Buffer.from(String(b), 'utf8');
	if (bufA.length !== bufB.length) {
		return false;
	}
	return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate API signature.
 * @param {Object} params
 * @param {number} timestamp
 * @param {string} nonce
 * @param {string} secret
 * @returns {string}
 */
function generateSignature(params, timestamp, nonce, secret = API_SIGNATURE_SECRET) {
	const sortedKeys = Object.keys(params || {}).sort();
	const signString =
		sortedKeys.map((key) => `${key}=${JSON.stringify(params[key])}`).join('&') +
		`&timestamp=${timestamp}&nonce=${nonce}`;

	return crypto.createHmac('sha256', secret).update(signString).digest('hex');
}

async function reserveNonce(nonce, timestamp) {
	const now = Date.now();
	const redis = await getRedisClient();

	if (redis) {
		try {
			const result = await redis.set(nonceKey(nonce), String(timestamp), {
				NX: true,
				PX: TIMESTAMP_VALID_WINDOW,
			});
			if (result !== 'OK') {
					return { valid: false, error: 'Replay request detected' };
			}
			return { valid: true };
		} catch (err) {
			console.warn('[api-signature] Redis nonce reserve failed, fallback to memory:', err.message);
		}
	}

	// In-memory fallback
	const existedAt = usedNonces.get(nonce);
	if (existedAt) {
		if (now - existedAt <= TIMESTAMP_VALID_WINDOW) {
			return { valid: false, error: 'Replay request detected' };
		}
		usedNonces.delete(nonce);
	}

	usedNonces.set(nonce, timestamp);
	return { valid: true };
}

/**
 * Verify API signature.
 * @param {Object} params
 * @param {number|string} timestamp
 * @param {string} nonce
 * @param {string} receivedSignature
 * @param {string} secret
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function verifySignature(
	params,
	timestamp,
	nonce,
	receivedSignature,
	secret = API_SIGNATURE_SECRET
) {
	const ts = Number(timestamp);
	if (!Number.isFinite(ts) || ts <= 0) {
		return { valid: false, error: 'Invalid timestamp' };
	}

	const now = Date.now();
	if (Math.abs(now - ts) > TIMESTAMP_VALID_WINDOW) {
		return { valid: false, error: 'Request expired' };
	}

	const expectedSignature = generateSignature(params, ts, nonce, secret);
	if (!timingSafeEqualString(expectedSignature, receivedSignature)) {
		return { valid: false, error: 'Signature verification failed' };
	}

	return reserveNonce(nonce, ts);
}

/**
 * Extract signature data from request.
 * @param {Object} req
 * @returns {{params: Object, timestamp: number, nonce: string, signature: string}}
 */
function extractSignatureInfo(req) {
	const headers = req.headers || {};
	const body = req.body || {};

	const timestamp = parseInt(headers['x-timestamp'] || body.timestamp || '0', 10);
	const nonce = headers['x-nonce'] || body.nonce || '';
	const signature = headers['x-signature'] || body.signature || '';

	const params = { ...body };
	delete params.timestamp;
	delete params.nonce;
	delete params.signature;

	return { params, timestamp, nonce, signature };
}

module.exports = {
	generateSignature,
	verifySignature,
	extractSignatureInfo,
	TIMESTAMP_VALID_WINDOW,
};

