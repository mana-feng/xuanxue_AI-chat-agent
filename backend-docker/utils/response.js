const SUCCESS_CODE = 'OK';
const {
	normalizeStatusCode,
	sanitizeText,
	sanitizeValue,
	resolvePublicErrorMessage,
} = require('./error-sanitizer');

const ERROR_CODE_BY_STATUS = {
	400: 'BAD_REQUEST',
	401: 'AUTH_REQUIRED',
	403: 'AUTH_FORBIDDEN',
	404: 'NOT_FOUND',
	409: 'CONFLICT',
	413: 'PAYLOAD_TOO_LARGE',
	422: 'VALIDATION_ERROR',
	429: 'RATE_LIMITED',
	500: 'SERVER_ERROR',
	503: 'SERVICE_UNAVAILABLE',
};

const getErrorCode = (statusCode, fallback) => {
	if (fallback && typeof fallback === 'string') return fallback;
	if (ERROR_CODE_BY_STATUS[statusCode]) return ERROR_CODE_BY_STATUS[statusCode];
	if (statusCode >= 500) return 'SERVER_ERROR';
	if (statusCode >= 400) return 'REQUEST_ERROR';
	return 'UNKNOWN_ERROR';
};

const buildSuccess = (data, message = 'ok', code = SUCCESS_CODE) => ({
	success: true,
	code,
	message: sanitizeText(message || 'ok'),
	data: data ?? null,
});

const buildError = (message, code, data) => ({
	success: false,
	code: code || 'REQUEST_ERROR',
	message: sanitizeText(message || 'Request failed'),
	data: data ?? null,
});

const normalizeResponsePayload = (payload, statusCode = 200) => {
	const normalizedStatus = normalizeStatusCode(statusCode);
	const isObject = payload && typeof payload === 'object' && !Array.isArray(payload);

	if (isObject && Object.prototype.hasOwnProperty.call(payload, 'success')) {
		const success = Boolean(payload.success);
		const rawMessage =
			(typeof payload.message === 'string' && payload.message) ||
			(typeof payload.error === 'string' && payload.error) ||
			(success ? 'ok' : 'Request failed');
		const code = payload.code || (success ? SUCCESS_CODE : getErrorCode(normalizedStatus));
		const message = success
			? sanitizeText(rawMessage || 'ok')
			: resolvePublicErrorMessage({ statusCode: normalizedStatus, rawMessage, code });
		let data = payload.data;

		if (data === undefined && success) {
			const extra = { ...payload };
			delete extra.success;
			delete extra.message;
			delete extra.code;
			delete extra.error;
			delete extra.data;
			if (Object.keys(extra).length > 0) {
				data = extra;
			}
		}

		if (data === undefined) data = null;
		if (!success) {
			data = normalizedStatus >= 500 ? null : sanitizeValue(data);
		}

		return {
			success,
			code,
			message,
			data,
		};
	}

	if (isObject && Object.prototype.hasOwnProperty.call(payload, 'error')) {
		const rawMessage =
			(typeof payload.error === 'string' && payload.error) ||
			(typeof payload.message === 'string' && payload.message) ||
			'Request failed';
		const code = getErrorCode(normalizedStatus, payload.code);
		const message = resolvePublicErrorMessage({
			statusCode: normalizedStatus,
			rawMessage,
			code,
		});
		return {
			success: false,
			code,
			message,
			data: normalizedStatus >= 500 ? null : sanitizeValue(payload.data ?? null),
		};
	}

	if (isObject && typeof payload.message === 'string' && payload.message) {
		const data = { ...payload };
		delete data.message;
		return {
			success: true,
			code: SUCCESS_CODE,
			message: sanitizeText(payload.message),
			data: Object.keys(data).length > 0 ? data : null,
		};
	}

	if (normalizedStatus >= 400) {
		const code = getErrorCode(normalizedStatus);
		const message = resolvePublicErrorMessage({
			statusCode: normalizedStatus,
			rawMessage: typeof payload === 'string' && payload ? payload : 'Request failed',
			code,
		});
		return {
			success: false,
			code,
			message,
			data: normalizedStatus >= 500 ? null : sanitizeValue(payload ?? null),
		};
	}

	return buildSuccess(payload ?? null);
};

module.exports = {
	SUCCESS_CODE,
	ERROR_CODE_BY_STATUS,
	getErrorCode,
	buildSuccess,
	buildError,
	normalizeResponsePayload,
};
