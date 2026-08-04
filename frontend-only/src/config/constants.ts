export const theme = {
	// 与 frontend-docker 保持一致的主题色
	primary: '#0052d9',
	// 自定义淡蓝按钮主题色（用于统一操作按钮）
	'soft-blue': '#93c5fd',
	primaryDark: '#003ba6',
	primaryLight: '#d0e2ff',
	background: '#F5F5F5',
	cardBg: '#FFFFFF',
	textPrimary: '#212121',
	textSecondary: '#757575',
	borderColor: '#E0E0E0',
};

export const tiangan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

export const dizhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const wuxing = {
	甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
	子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

export const wuxingColor: Record<string, string> = {
	金: '#FFD700',
	木: '#228B22',
	水: '#4169E1',
	火: '#DC143C',
	土: '#8B4513',
};
