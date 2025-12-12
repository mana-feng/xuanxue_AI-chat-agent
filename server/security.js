// 安全防护工具模块
// 提供 SQL 注入防护、XSS 防护、输入验证等功能

const path = require('path');

/**
 * SQL 注入防护：清理和验证 SQL 输入
 */
class SecurityUtils {
	/**
	 * 验证和清理字符串输入
	 * @param {string} input - 用户输入
	 * @param {Object} options - 选项
	 * @returns {string} 清理后的字符串
	 */
	static sanitizeString(input, options = {}) {
		if (input === null || input === undefined) {
			return '';
		}

		const {
			maxLength = 1000,
			allowSpecialChars = false,
			trim = true,
			removeNullBytes = true,
		} = options;

		let sanitized = String(input);

		// 移除 null 字节（防止注入攻击）
		if (removeNullBytes) {
			sanitized = sanitized.replace(/\0/g, '');
		}

		// 移除控制字符（除了换行符和制表符）
		sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

		// 如果不允许特殊字符，移除 SQL 特殊字符
		if (!allowSpecialChars) {
			// 移除常见的 SQL 注入字符（但保留必要的字符如空格、标点）
			sanitized = sanitized.replace(/[;'"\\]/g, '');
		}

		// 修剪空白字符
		if (trim) {
			sanitized = sanitized.trim();
		}

		// 限制长度
		if (sanitized.length > maxLength) {
			sanitized = sanitized.substring(0, maxLength);
		}

		return sanitized;
	}

	/**
	 * 验证邮箱格式
	 * @param {string} email - 邮箱地址
	 * @returns {boolean} 是否有效
	 */
	static isValidEmail(email) {
		if (!email || typeof email !== 'string') {
			return false;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const sanitized = this.sanitizeString(email, { maxLength: 255 });
		return emailRegex.test(sanitized);
	}

	/**
	 * 验证用户名格式
	 * @param {string} username - 用户名
	 * @returns {Object} { valid: boolean, error?: string }
	 */
	static validateUsername(username) {
		if (!username || typeof username !== 'string') {
			return { valid: false, error: '用户名不能为空' };
		}

		const sanitized = this.sanitizeString(username, { maxLength: 50 });

		if (sanitized.length < 2) {
			return { valid: false, error: '用户名长度不能少于 2 个字符' };
		}

		if (sanitized.length > 50) {
			return { valid: false, error: '用户名长度不能超过 50 个字符' };
		}

		// 只允许字母、数字、下划线、中文字符
		const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
		if (!usernameRegex.test(sanitized)) {
			return { valid: false, error: '用户名只能包含字母、数字、下划线和中文' };
		}

		return { valid: true, sanitized };
	}

	/**
	 * 验证密码强度
	 * @param {string} password - 密码
	 * @returns {Object} { valid: boolean, error?: string }
	 */
	static validatePassword(password) {
		if (!password || typeof password !== 'string') {
			return { valid: false, error: '密码不能为空' };
		}

		if (password.length < 6) {
			return { valid: false, error: '密码长度不能少于 6 个字符' };
		}

		if (password.length > 128) {
			return { valid: false, error: '密码长度不能超过 128 个字符' };
		}

		// 检查是否包含控制字符
		if (/[\x00-\x1F\x7F]/.test(password)) {
			return { valid: false, error: '密码包含非法字符' };
		}

		return { valid: true };
	}

	/**
	 * 验证数字ID
	 * @param {any} id - ID值
	 * @returns {number|null} 有效的数字ID或null
	 */
	static validateId(id) {
		if (id === null || id === undefined) {
			return null;
		}

		const num = Number(id);
		if (isNaN(num) || !isFinite(num) || num < 1 || num !== Math.floor(num)) {
			return null;
		}

		return num;
	}

	/**
	 * 验证分页参数
	 * @param {any} page - 页码
	 * @param {any} pageSize - 每页大小
	 * @returns {Object} { page: number, pageSize: number }
	 */
	static validatePagination(page, pageSize) {
		const validPage = Math.max(1, Math.floor(Number(page)) || 1);
		const validPageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 50));

		return { page: validPage, pageSize: validPageSize };
	}

	/**
	 * 验证排序参数
	 * @param {string} sortBy - 排序字段
	 * @param {string} sortOrder - 排序方向
	 * @param {string[]} allowedFields - 允许的字段列表
	 * @returns {Object} { sortBy: string, sortOrder: string }
	 */
	static validateSort(sortBy, sortOrder, allowedFields = []) {
		const validFields =
			allowedFields.length > 0 ? allowedFields : ['created_at', 'name', 'birth_datetime'];
		const validSortFields = ['created_at', 'name', 'birth_datetime'];

		const field = validFields.includes(sortBy) ? sortBy : 'created_at';
		const order = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase())
			? sortOrder.toUpperCase()
			: 'DESC';

		return { sortBy: field, sortOrder: order };
	}

	/**
	 * 转义 HTML 防止 XSS
	 * @param {string} text - 要转义的文本
	 * @returns {string} 转义后的文本
	 */
	static escapeHtml(text) {
		if (!text || typeof text !== 'string') {
			return '';
		}

		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		};

		return text.replace(/[&<>"']/g, (m) => map[m]);
	}

	/**
	 * 验证 JSON 字符串（防止 JSON 注入）
	 * @param {string} jsonString - JSON 字符串
	 * @param {number} maxLength - 最大长度
	 * @returns {Object|null} 解析后的对象或null
	 */
	static safeJsonParse(jsonString, maxLength = 1000000) {
		if (!jsonString || typeof jsonString !== 'string') {
			return null;
		}

		if (jsonString.length > maxLength) {
			console.warn('JSON 字符串过长，已拒绝');
			return null;
		}

		try {
			const parsed = JSON.parse(jsonString);
			// 检查解析后的对象是否过大
			const stringified = JSON.stringify(parsed);
			if (stringified.length > maxLength) {
				console.warn('解析后的 JSON 对象过大，已拒绝');
				return null;
			}
			return parsed;
		} catch (e) {
			console.warn('JSON 解析失败:', e.message);
			return null;
		}
	}

	/**
	 * 验证文件路径（防止路径遍历攻击）
	 * @param {string} filePath - 文件路径
	 * @param {string} baseDir - 基础目录
	 * @returns {string|null} 规范化后的路径或null
	 */
	static validateFilePath(filePath, baseDir) {
		if (!filePath || typeof filePath !== 'string') {
			return null;
		}

		// 移除路径遍历字符
		const normalized = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
		const resolved = path.resolve(baseDir, normalized);

		// 确保解析后的路径在基础目录内
		if (!resolved.startsWith(path.resolve(baseDir))) {
			return null;
		}

		return resolved;
	}

	/**
	 * 验证验证码格式
	 * @param {string} code - 验证码
	 * @returns {boolean} 是否有效
	 */
	static validateVerificationCode(code) {
		if (!code || typeof code !== 'string') {
			return false;
		}

		// 只允许6位数字
		const codeRegex = /^\d{6}$/;
		return codeRegex.test(code.trim());
	}

	/**
	 * 验证性别值
	 * @param {any} gender - 性别值
	 * @returns {string|null} 有效的性别值或null
	 */
	static validateGender(gender) {
		if (gender === null || gender === undefined || gender === '') {
			return null;
		}

		const str = String(gender).trim();
		if (str === '0' || str === '1' || str === 'male' || str === 'female') {
			return str === 'male' ? '1' : str === 'female' ? '0' : str;
		}

		return null;
	}

	/**
	 * 清理搜索关键词（防止 SQL 注入）
	 * @param {string} keyword - 搜索关键词
	 * @returns {string} 清理后的关键词
	 */
	static sanitizeSearchKeyword(keyword) {
		if (!keyword || typeof keyword !== 'string') {
			return '';
		}

		// 移除 SQL 特殊字符，但保留通配符 % 和 _
		let sanitized = keyword.trim();

		// 移除危险字符
		sanitized = sanitized.replace(/[;'"\\]/g, '');

		// 限制长度
		if (sanitized.length > 100) {
			sanitized = sanitized.substring(0, 100);
		}

		return sanitized;
	}

	/**
	 * 验证日期时间字符串
	 * @param {any} datetime - 日期时间值
	 * @returns {string|null} ISO 格式的日期字符串或null
	 */
	static validateDateTime(datetime) {
		if (datetime === null || datetime === undefined || datetime === '') {
			return null;
		}

		try {
			let date;
			if (typeof datetime === 'number') {
				date = new Date(datetime);
			} else {
				date = new Date(String(datetime));
			}

			if (isNaN(date.getTime())) {
				return null;
			}

			// 验证日期范围（1900-2100）
			const year = date.getFullYear();
			if (year < 1900 || year > 2100) {
				return null;
			}

			return date.toISOString();
		} catch (e) {
			return null;
		}
	}

	/**
	 * 检查字符串是否包含 SQL 注入模式
	 * @param {string} input - 输入字符串
	 * @returns {boolean} 是否包含可疑模式
	 */
	static containsSqlInjectionPattern(input) {
		if (!input || typeof input !== 'string') {
			return false;
		}

		const sqlPatterns = [
			/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
			/(['";])\s*(OR|AND)\s*\1/i,
			/--/,
			/\/\*/,
			/;\s*(DROP|DELETE|UPDATE|INSERT)/i,
			/(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
			/(\bOR\b|\bAND\b)\s+['"]\s*=\s*['"]/i,
		];

		return sqlPatterns.some((pattern) => pattern.test(input));
	}

	/**
	 * 检查字符串是否包含 XSS 模式
	 * @param {string} input - 输入字符串
	 * @returns {boolean} 是否包含可疑模式
	 */
	static containsXssPattern(input) {
		if (!input || typeof input !== 'string') {
			return false;
		}

		const xssPatterns = [
			/<script/i,
			/javascript:/i,
			/on\w+\s*=/i,
			/<iframe/i,
			/<object/i,
			/<embed/i,
			/<img[^>]+src[^>]*=.*javascript:/i,
			/<svg/i,
			/eval\s*\(/i,
			/expression\s*\(/i,
		];

		return xssPatterns.some((pattern) => pattern.test(input));
	}
}

module.exports = SecurityUtils;
