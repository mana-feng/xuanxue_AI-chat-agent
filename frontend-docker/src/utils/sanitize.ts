/**
 * 简单输入清洗，去除常见 XSS 符号并裁剪长度
 * 仅用于前端提交前的基础防护（如用户名、邮箱等标识符），服务端仍需严格校验
 * 
 * 注意：此函数会移除 < > " 等字符，不适用于密码或普通文本内容
 */
export function sanitizeInput(value: string, maxLength = 255): string {
	const cleaned = String(value || '')
		.replace(/[<>"]/g, '') // 去除尖括号、双引号
		.trim()
		.slice(0, maxLength);
	return cleaned;
}

/**
 * HTML 转义，将特殊字符转换为 HTML 实体
 * 用于在需要手动插入 HTML 内容时防止 XSS
 */
export function escapeHtml(value: string): string {
	if (!value) return '';
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * HTML 反转义
 */
export function unescapeHtml(value: string): string {
	if (!value) return '';
	return String(value)
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}
