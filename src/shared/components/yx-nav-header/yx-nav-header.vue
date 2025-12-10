<template>
	<tm-navbar hideHome title="" class="responsive-navbar" :ll-width="'0'" :lr-width="'300'">
		<template v-slot:left>
		</template>
		<template v-slot:right>
			<view class="navbar-right-content">
				<tm-icon
					class="dark-mode-icon"
					:font-size="iconSize"
					:color="store.tmStore.dark ? 'yellow' : 'yellow'"
					font-family="tmicon"
					prefix="tmicon-"
					:name="store.tmStore.dark ? 'ios-sunny' : 'md-moon'"
					@click="onChangeDark"
				></tm-icon>
				<tm-button
					class="auth-button"
					color="primary"
					:margin="[0, 0]"
					:padding="buttonPadding"
					shape="round"
					:font-size="buttonFontSize"
					:height="buttonHeight"
					label="登录 / 注册"
					@tap="onAuthClick"
				></tm-button>
			</view>
		</template>
	</tm-navbar>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useTmpiniaStore } from '@/libs/tmui/tool/lib/tmpinia';

const store = useTmpiniaStore();
const emit = defineEmits<{
	(e: 'open-auth', mode: 'login' | 'register'): void
}>();

// 响应式尺寸计算
const iconSize = computed(() => {
	// #ifdef H5
	if (typeof window !== 'undefined') {
		const width = window.innerWidth;
		if (width < 600) return 36;
		if (width < 900) return 40;
		return 42;
	}
	// #endif
	return 42;
});

const buttonFontSize = computed(() => {
	// #ifdef H5
	if (typeof window !== 'undefined') {
		const width = window.innerWidth;
		if (width < 600) return 24;
		if (width < 900) return 26;
		return 28;
	}
	// #endif
	return 28;
});

const buttonPadding = computed(() => {
	// #ifdef H5
	if (typeof window !== 'undefined') {
		const width = window.innerWidth;
		if (width < 600) return [12, 16];
		if (width < 900) return [14, 18];
		return [16, 20];
	}
	// #endif
	return [16, 20];
});

const buttonHeight = computed(() => {
	// #ifdef H5
	if (typeof window !== 'undefined') {
		const width = window.innerWidth;
		if (width < 600) return 64;
		if (width < 900) return 72;
		return 80;
	}
	// #endif
	return 80;
});

const onChangeDark = () => store.setTmVuetifyDark(!store.tmStore.dark);
const onAuthClick = () => emit('open-auth', 'login');
</script>

<style scoped>
/* #ifdef H5 */
.navbar-right-content {
	display: flex !important;
	flex-direction: row !important;
	align-items: center !important;
	justify-content: flex-end !important;
	gap: 12px !important;
	flex-wrap: nowrap !important;
	min-width: auto !important;
	width: auto !important;
	box-sizing: border-box !important;
	visibility: visible !important;
	opacity: 1 !important;
	z-index: 10 !important;
}

.dark-mode-icon {
	flex-shrink: 0 !important;
	cursor: pointer;
	transition: transform 0.2s ease;
	visibility: visible !important;
	opacity: 1 !important;
	display: block !important;
	min-width: 42rpx !important;
	min-height: 42rpx !important;
}

.dark-mode-icon:hover {
	transform: scale(1.1);
}

.dark-mode-icon:active {
	transform: scale(0.95);
}

.auth-button {
	flex-shrink: 0 !important;
	white-space: nowrap !important;
	transition: all 0.2s ease;
	visibility: visible !important;
	opacity: 1 !important;
	display: block !important;
	min-height: 64rpx !important;
	min-width: 120rpx !important;
}

.auth-button:hover {
	opacity: 0.9;
	transform: translateY(-1px);
}

.auth-button:active {
	transform: translateY(0);
}

/* 小屏幕适配 */
@media screen and (max-width: 600px) {
	.navbar-right-content {
		gap: 8px;
	}
	
	.auth-button {
		min-height: 64rpx !important;
		min-width: 100rpx !important;
	}
}

/* 中等屏幕 */
@media screen and (min-width: 601px) and (max-width: 900px) {
	.navbar-right-content {
		gap: 10px;
	}
}

/* 大屏幕 */
@media screen and (min-width: 901px) {
	.navbar-right-content {
		gap: 12px;
	}
}

/* 确保导航栏本身也是响应式的 */
.responsive-navbar {
	width: 100% !important;
	max-width: 100% !important;
	box-sizing: border-box !important;
}

/* 确保导航栏右侧区域能够自适应 */
.responsive-navbar :deep(.tmNavbarRight) {
	width: auto !important;
	flex-shrink: 0 !important;
	min-width: auto !important;
	max-width: none !important;
	overflow: visible !important;
	visibility: visible !important;
	opacity: 1 !important;
	z-index: 10 !important;
}

.responsive-navbar :deep(.tmNavbarLeft) {
	width: auto !important;
	flex-shrink: 0 !important;
	min-width: 0 !important;
	max-width: none !important;
}

.responsive-navbar :deep(.tmNavbarContent) {
	width: 100% !important;
	max-width: 100% !important;
	box-sizing: border-box !important;
	padding-left: 16px !important;
	padding-right: 16px !important;
}

.responsive-navbar :deep(.tmNavbarContentBox) {
	width: 100% !important;
	max-width: 100% !important;
	box-sizing: border-box !important;
}

/* 响应式内边距 */
@media screen and (max-width: 600px) {
	.responsive-navbar :deep(.tmNavbarContent) {
		padding-left: 12px !important;
		padding-right: 12px !important;
	}
}

@media screen and (min-width: 601px) and (max-width: 900px) {
	.responsive-navbar :deep(.tmNavbarContent) {
		padding-left: 16px !important;
		padding-right: 16px !important;
	}
}

@media screen and (min-width: 901px) {
	.responsive-navbar :deep(.tmNavbarContent) {
		padding-left: 20px !important;
		padding-right: 20px !important;
	}
}

/* #endif */

/* #ifndef H5 */
.navbar-right-content {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
	flex-wrap: nowrap;
}
/* #endif */
</style>
