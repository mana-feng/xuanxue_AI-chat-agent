export interface AiConfig {
	apiUrl: string;
	apiKey: string;
	model: string;
	provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';
}

const STORAGE_KEY = 'xuanxue_ai_config';

export function getAiConfig(): AiConfig | null {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as AiConfig;
	} catch {
		return null;
	}
}

export function saveAiConfig(config: AiConfig): void {
	uni.setStorageSync(STORAGE_KEY, JSON.stringify(config));
}

export function clearAiConfig(): void {
	uni.removeStorageSync(STORAGE_KEY);
}

export function hasAiConfig(): boolean {
	return !!getAiConfig();
}
