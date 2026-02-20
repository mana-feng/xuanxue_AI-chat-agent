const DEFAULT_PUBLIC_MESSAGE_BY_STATUS = {
	400: '请求参数有误，请检查后重试',
	401: '登录已失效，请重新登录',
	403: '没有访问权限',
	404: '请求的资源不存在',
	409: '请求冲突，请刷新后重试',
	413: '请求数据过大，请精简后重试',
	422: '提交数据校验失败，请检查后重试',
	429: '请求过于频繁，请稍后再试',
	500: '服务暂时不可用，请稍后重试',
	502: '上游服务暂时不可用，请稍后重试',
	503: '服务暂时不可用，请稍后重试',
	504: '服务响应超时，请稍后重试',
};

const SENSITIVE_REPLACERS = [
	[/([?&]key=)[^&\s]+/gi, '$1***'],
	[/([?&](token|access_token|refresh_token|api_key|apikey|signature|sign|nonce)=)[^&\s]+/gi, '$1***'],
	[/(["']?(api[_-]?key|token|access[_-]?token|refresh[_-]?token|password|secret|authorization|signature)["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi, '$1***'],
	[/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+\b/gi, '$1 ***'],
];

const NETWORK_ERROR_PATTERN =
	/(etimedout|timed?\s*out|timeout|econnreset|socket hang up|enotfound|eai_again|network|fetcherror|upstream)/i;
const JSON_FORMAT_ERROR_PATTERN = /(invalid request json|unexpected token|json parse|invalid json)/i;
const NETWORK_ERROR_CODE_PATTERN =
	/^(ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|UND_ERR_CONNECT_TIMEOUT|UND_ERR_CONNECT_ABORTED)$/i;

function normalizeStatusCode(statusCode) {
	const num = Number(statusCode);
	if (!Number.isFinite(num)) return 500;
	const normalized = Math.trunc(num);
	if (normalized < 100 || normalized > 599) return 500;
	return normalized;
}

function sanitizeText(value, maxLength = 300) {
	if (value === undefined || value === null) return '';
	let text = String(value);

	for (const [pattern, replacement] of SENSITIVE_REPLACERS) {
		text = text.replace(pattern, replacement);
	}

	text = text.replace(/\s+/g, ' ').trim();
	if (text.length > maxLength) {
		text = `${text.slice(0, maxLength)}...`;
	}
	return text;
}

function sanitizeValue(value, depth = 0) {
	if (depth > 4) return null;
	if (value === undefined || value === null) return value;
	if (typeof value === 'string') return sanitizeText(value);
	if (typeof value === 'number' || typeof value === 'boolean') return value;
	if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
	if (typeof value === 'object') {
		const result = {};
		for (const [key, item] of Object.entries(value)) {
			result[key] = sanitizeValue(item, depth + 1);
		}
		return result;
	}
	return sanitizeText(value);
}

function isLikelyUpstreamNetworkError(rawMessage, rawCode) {
	const safeMessage = sanitizeText(rawMessage, 800);
	const safeCode = sanitizeText(rawCode, 100);
	if (NETWORK_ERROR_CODE_PATTERN.test(safeCode)) return true;
	return NETWORK_ERROR_PATTERN.test(safeMessage);
}

function resolvePublicErrorMessage({ statusCode, rawMessage }) {
	const normalizedStatus = normalizeStatusCode(statusCode);
	const safeRaw = sanitizeText(rawMessage);
	const lowerRaw = safeRaw.toLowerCase();

	if (normalizedStatus >= 500) {
		if (NETWORK_ERROR_PATTERN.test(lowerRaw)) {
			return '上游服务连接异常，请稍后重试';
		}
		return (
			DEFAULT_PUBLIC_MESSAGE_BY_STATUS[normalizedStatus] ||
			DEFAULT_PUBLIC_MESSAGE_BY_STATUS[500]
		);
	}

	if (normalizedStatus === 400 && JSON_FORMAT_ERROR_PATTERN.test(lowerRaw)) {
		return '请求 JSON 格式不正确，请检查后重试';
	}

	if (normalizedStatus === 401) return DEFAULT_PUBLIC_MESSAGE_BY_STATUS[401];
	if (normalizedStatus === 403) return DEFAULT_PUBLIC_MESSAGE_BY_STATUS[403];
	if (normalizedStatus === 404) return DEFAULT_PUBLIC_MESSAGE_BY_STATUS[404];
	if (normalizedStatus === 413) return DEFAULT_PUBLIC_MESSAGE_BY_STATUS[413];
	if (normalizedStatus === 429) {
		if (safeRaw && /(quota|额度|limit)/i.test(safeRaw)) return safeRaw;
		return DEFAULT_PUBLIC_MESSAGE_BY_STATUS[429];
	}
	if (normalizedStatus === 400 || normalizedStatus === 409 || normalizedStatus === 422) {
		if (safeRaw) return safeRaw;
		return DEFAULT_PUBLIC_MESSAGE_BY_STATUS[normalizedStatus];
	}

	if (safeRaw) return safeRaw;
	return DEFAULT_PUBLIC_MESSAGE_BY_STATUS[normalizedStatus] || '请求失败，请稍后重试';
}

function sanitizeErrorForLog(error) {
	if (!error) return { message: '' };
	return {
		name: sanitizeText(error.name || ''),
		code: sanitizeText(error.code || error.errno || error.cause?.code || ''),
		message: sanitizeText(error.message || ''),
		reason: sanitizeText(error.cause?.message || ''),
		stack: sanitizeText(error.stack || '', 1000),
	};
}

module.exports = {
	normalizeStatusCode,
	sanitizeText,
	sanitizeValue,
	isLikelyUpstreamNetworkError,
	resolvePublicErrorMessage,
	sanitizeErrorForLog,
};
