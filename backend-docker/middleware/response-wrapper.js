const { buildSuccess, buildError, normalizeResponsePayload, getErrorCode } = require('../utils/response');

function responseWrapper(req, res, next) {
	const originalJson = res.json.bind(res);

	res.json = (payload) => {
		const normalized = normalizeResponsePayload(payload, res.statusCode || 200);
		return originalJson(normalized);
	};

	res.ok = (data, message, code) => {
		return res.json(buildSuccess(data, message, code));
	};

	res.fail = (message, statusCode = 400, code, data) => {
		res.status(statusCode);
		const resolvedCode = code || getErrorCode(statusCode);
		return res.json(buildError(message, resolvedCode, data));
	};

	next();
}

module.exports = responseWrapper;
