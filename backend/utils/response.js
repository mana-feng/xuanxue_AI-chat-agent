const SUCCESS_CODE = 'OK';

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
	message,
	data: data ?? null,
});

const buildError = (message, code, data) => ({
	success: false,
	code: code || 'REQUEST_ERROR',
	message: message || 'Request failed',
	data: data ?? null,
});

const normalizeResponsePayload = (payload, statusCode = 200) => {
	const isObject = payload && typeof payload === 'object' && !Array.isArray(payload);

	if (isObject && Object.prototype.hasOwnProperty.call(payload, 'success')) {
		const success = Boolean(payload.success);
		const message =
			(typeof payload.message === 'string' && payload.message) ||
			(typeof payload.error === 'string' && payload.error) ||
			(success ? 'ok' : 'Request failed');
		const code = payload.code || (success ? SUCCESS_CODE : getErrorCode(statusCode));
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

		return {
			success,
			code,
			message,
			data,
		};
	}

	if (isObject && Object.prototype.hasOwnProperty.call(payload, 'error')) {
		const message =
			(typeof payload.error === 'string' && payload.error) ||
			(typeof payload.message === 'string' && payload.message) ||
			'Request failed';
		return {
			success: false,
			code: getErrorCode(statusCode, payload.code),
			message,
			data: payload.data ?? null,
		};
	}

	if (isObject && typeof payload.message === 'string' && payload.message) {
		const data = { ...payload };
		delete data.message;
		return {
			success: true,
			code: SUCCESS_CODE,
			message: payload.message,
			data: Object.keys(data).length > 0 ? data : null,
		};
	}

	if (statusCode >= 400) {
		const message = typeof payload === 'string' && payload ? payload : 'Request failed';
		return {
			success: false,
			code: getErrorCode(statusCode),
			message,
			data: payload ?? null,
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
