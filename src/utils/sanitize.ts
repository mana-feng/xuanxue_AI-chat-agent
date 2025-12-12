/**
 * 简单输入清洗，去除常见 XSS 符号并裁剪长度
 * 仅用于前端提交前的基础防护，服务端仍需严格校验
 */
export function sanitizeInput(value: string, maxLength = 255): string {
	const cleaned = String(value || '')
		.replace(/[<>"]/g, '') // 去除尖括号/双引号
		.trim()
		.slice(0, maxLength);
	return cleaned;
}
