<template>
	<tm-app>
		<PageScaffold class="page-settings" title="AI API 设置" subtitle="配置将保存在浏览器本地存储中">
			<view class="form">
				<view class="form-group">
					<text class="label"><text class="required">*</text>AI 提供商</text>
					<picker :value="providerIndex" :range="providerNames" @change="onProviderChange">
						<view class="picker-value">{{ currentProviderName || '请选择' }}</view>
					</picker>
				</view>

				<view class="form-group">
					<text class="label"><text class="required">*</text>API 地址</text>
					<input
						v-model="config.apiUrl"
						class="input"
						placeholder="选择提供商后自动填充"
						placeholder-class="input-placeholder"
					/>
				</view>

				<view v-if="config.provider !== 'ollama'" class="form-group">
					<text class="label"><text class="required">*</text>API Key</text>
					<input
						v-model="config.apiKey"
						class="input"
						:type="showKey ? 'text' : 'password'"
						placeholder="请输入 API Key"
						placeholder-class="input-placeholder"
					/>
					<text class="toggle-btn" @tap="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</text>
				</view>

				<view class="form-group">
					<text class="label"><text class="required">*</text>模型名称</text>
					<input
						v-model="config.model"
						class="input"
						placeholder="选择提供商后自动填充"
						placeholder-class="input-placeholder"
					/>
				</view>

				<view class="actions">
					<button class="btn btn-save" @tap="saveConfig">保存配置</button>
					<button class="btn btn-clear" @tap="clearConfig">清除配置</button>
				</view>

				<view v-if="statusMsg" :class="['status', statusType]">
					<text>{{ statusMsg }}</text>
				</view>
			</view>
		</PageScaffold>
	</tm-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import PageScaffold from '@/components/layout/PageScaffold.vue';
import { getAiConfig, saveAiConfig, clearAiConfig, type AiConfig } from '@/config/aiConfig';

interface ProviderInfo {
	name: string;
	value: AiConfig['provider'];
	apiUrl: string;
	defaultModel: string;
}

const providers: ProviderInfo[] = [
	{ name: 'OpenAI', value: 'openai', apiUrl: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o' },
	{ name: 'Claude', value: 'anthropic', apiUrl: 'https://api.anthropic.com/v1/messages', defaultModel: 'claude-3-5-sonnet-20241022' },
	{ name: 'Google Gemini', value: 'gemini', apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', defaultModel: 'gemini-2.0-flash' },
	{ name: '通义千问', value: 'qwen', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', defaultModel: 'qwen-plus' },
	{ name: 'DeepSeek', value: 'deepseek', apiUrl: 'https://api.deepseek.com/v1/chat/completions', defaultModel: 'deepseek-chat' },
	{ name: 'Kimi', value: 'kimi', apiUrl: 'https://api.moonshot.cn/v1/chat/completions', defaultModel: 'moonshot-v1-8k' },
	{ name: '智谱', value: 'zhipu', apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', defaultModel: 'glm-4' },
	{ name: 'Ollama (本地)', value: 'ollama', apiUrl: 'http://localhost:11434/v1/chat/completions', defaultModel: 'llama3' },
	{ name: '自定义', value: 'custom', apiUrl: '', defaultModel: '' },
];

const providerNames = providers.map((p) => p.name);
const providerIndex = ref(0);

const config = ref<AiConfig>({
	apiUrl: '',
	apiKey: '',
	model: '',
	provider: 'openai',
});

const showKey = ref(false);
const statusMsg = ref('');
const statusType = ref('');

const currentProviderName = computed(() => {
	const idx = providers.findIndex((p) => p.value === config.value.provider);
	return idx >= 0 ? providers[idx].name : '请选择';
});

function onProviderChange(e: any) {
	const idx = Number(e.detail.value);
	const provider = providers[idx];
	if (provider) {
		config.value.provider = provider.value;
		config.value.apiUrl = provider.apiUrl;
		config.value.model = provider.defaultModel;
		providerIndex.value = idx;
	}
}

function saveConfig() {
	if (!config.value.provider || config.value.provider === 'custom' && !config.value.apiUrl) {
		statusMsg.value = '请选择 AI 提供商';
		statusType.value = 'error';
		setTimeout(() => { statusMsg.value = ''; }, 2000);
		return;
	}
	if (!config.value.apiUrl) {
		statusMsg.value = '请输入 API 地址';
		statusType.value = 'error';
		setTimeout(() => { statusMsg.value = ''; }, 2000);
		return;
	}
	if (!config.value.model) {
		statusMsg.value = '请输入模型名称';
		statusType.value = 'error';
		setTimeout(() => { statusMsg.value = ''; }, 2000);
		return;
	}
	if (!config.value.apiKey && config.value.provider !== 'ollama') {
		statusMsg.value = '请输入 API Key';
		statusType.value = 'error';
		setTimeout(() => { statusMsg.value = ''; }, 2000);
		return;
	}
	saveAiConfig(config.value);
	statusMsg.value = '配置已保存';
	statusType.value = 'success';
	setTimeout(() => { statusMsg.value = ''; }, 2000);
}

function clearConfig() {
	clearAiConfig();
	config.value = {
		apiUrl: '',
		apiKey: '',
		model: '',
		provider: 'openai',
	};
	providerIndex.value = 0;
	statusMsg.value = '配置已清除';
	statusType.value = 'success';
	setTimeout(() => { statusMsg.value = ''; }, 2000);
}

onMounted(() => {
	const saved = getAiConfig();
	if (saved) {
		config.value = saved;
		const idx = providers.findIndex((p) => p.value === saved.provider);
		if (idx >= 0) providerIndex.value = idx;
	}
});
</script>

<style scoped>
.page-settings .page-shell {
	width: 100%;
	display: flex;
	justify-content: center;
	padding: var(--page-pad-y) var(--page-pad-x);
	box-sizing: border-box;
}

.page-settings .page-card {
	width: 100%;
	max-width: var(--page-max);
	background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
	border: 1px solid #e5e9f2;
	border-radius: 16px;
	box-shadow: 0 12px 32px rgba(31, 41, 55, 0.1);
	padding: 18px 16px;
	position: relative;
	overflow: hidden;
}

.page-settings .page-card::before {
	content: '';
	position: absolute;
	inset: 0;
	background: radial-gradient(circle at 12% 12%, rgba(102, 126, 234, 0.08), transparent 35%),
		radial-gradient(circle at 88% 6%, rgba(118, 75, 162, 0.07), transparent 32%);
	pointer-events: none;
}

.form {
	position: relative;
	z-index: 1;
}

.form-group {
	margin-bottom: 14px;
}

.label {
	display: block;
	font-size: 13px;
	color: #6b7280;
	margin-bottom: 6px;
	font-weight: 500;
}

.required {
	color: #e53e3e;
	margin-right: 2px;
}

.input {
	width: 100%;
	height: 42px;
	background: #f8fafc;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	padding: 0 12px;
	font-size: 14px;
	box-sizing: border-box;
}

.input-placeholder {
	color: #ccc;
}

.picker-value {
	width: 100%;
	height: 42px;
	background: #f8fafc;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	padding: 0 12px;
	font-size: 14px;
	line-height: 42px;
	color: #333;
	box-sizing: border-box;
}

.toggle-btn {
	font-size: 12px;
	color: #00BFA5;
	margin-top: 6px;
	display: inline-block;
	cursor: pointer;
}

.actions {
	display: flex;
	gap: 10px;
	margin-top: 20px;
}

.btn {
	flex: 1;
	height: 42px;
	border-radius: 8px;
	font-size: 14px;
	border: none;
}

.btn-save {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
}

.btn-clear {
	background: #f0f0f0;
	color: #666;
}

.status {
	margin-top: 12px;
	padding: 10px;
	border-radius: 6px;
	text-align: center;
	font-size: 13px;
}

.status.success {
	background: #e6fffa;
	color: #00BFA5;
}

.status.error {
	background: #fff5f5;
	color: #e53e3e;
}
</style>
