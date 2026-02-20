/**
 * Rate limit config
 */
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('../config');

const { ipKeyGenerator } = rateLimit;

function extractBearerToken(authHeader) {
	if (typeof authHeader !== 'string') return null;
	const m = authHeader.match(/^Bearer\s+(.+)$/i);
	return m && m[1] ? m[1].trim() : null;
}

function getUserRateKey(req) {
	if (req.user && req.user.id !== undefined && req.user.id !== null) {
		return `u:${req.user.id}`;
	}

	const token = extractBearerToken(req.headers.authorization);
	if (!token) return null;

	try {
		const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
		if (decoded && decoded.uid !== undefined && decoded.uid !== null) {
			return `u:${decoded.uid}`;
		}
	} catch (err) {
		// Ignore invalid token and fall back to anonymous key.
	}
	return null;
}

// Primary key: IP + authenticated user id. Anonymous requests fall back to IP-only scope.
const rateKey = (req) => {
	const ipKey = ipKeyGenerator(req);
	const userKey = getUserRateKey(req);
	return userKey ? `${ipKey}-${userKey}` : `${ipKey}-anon`;
};

const authLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

const strictLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

const refreshLimiter = rateLimit({
	windowMs: 60 * 1000,
	// Keep refresh reasonably loose to reduce accidental session loss.
	max: 200,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

const llmLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: rateKey,
});

module.exports = {
	authLimiter,
	strictLimiter,
	refreshLimiter,
	llmLimiter,
};
