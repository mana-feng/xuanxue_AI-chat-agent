export function getYaoName(p: number | string) {
	const names: Record<string, string> = {
		'0': '少阴',
		'1': '少阳',
		'3': '老阳',
		'4': '老阴'
	};
	return names[String(p)] || '未知';
}

export function getYaoSymbol(p: number | string) {
	switch (String(p)) {
		case '0':
			return '━ ━';
		case '1':
			return '━━━';
		case '3':
			return '━━━x';
		case '4':
			return '━ ━o';
		default:
			return '';
	}
}

export function formatDateTime(d: Date) {
	const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
		d.getHours()
	)}:${pad(d.getMinutes())}`;
}

export default { getYaoName, getYaoSymbol, formatDateTime };


