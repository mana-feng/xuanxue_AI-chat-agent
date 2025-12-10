<template>
	<view class="header-wrap" :style="headerWrapStyle">
		<tm-navbar hideHome title="" :shadow="2" :margin="[0,0]" :padding="[0,0]" :height="40" :follow-dark="true">
			<template #left></template>
			<template #right>
				<view :class="actionContainerClass" :style="actionContainerStyle">
					<view class="action-item dark-toggle-wrapper" @tap="onChangeDark">
						<tm-icon
							class="dark-toggle-icon"
							:font-size="28"
							:color="store.tmStore.dark ? '#f59e0b' : '#4a5568'"
							:name="store.tmStore.dark ? 'tmicon-ios-sunny' : 'tmicon-md-moon'"
							:follow-dark="true"
						></tm-icon>
					</view>
					<view class="action-item auth-btn-wrapper primary" @tap="onAuth">
						<text :class="authBtnTextClass">登录/注册</text>
					</view>
				</view>
			</template>
		</tm-navbar>
	</view>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useTmpiniaStore } from '@/libs/tmui/tool/lib/tmpinia';

const store = useTmpiniaStore();

// navbar 高度（rpx），与 tm-navbar 的 height prop 保持一致
const navbarHeight = 40;

// 计算按钮容器的高度和圆角，使其与 navbar 高度一致，占满整个高度
const actionContainerStyle = computed(() => {
	// 使用 100% 高度占满父容器，同时设置最小高度确保不会太小
	return {
		height: '100%',
		minHeight: `${navbarHeight}rpx`,
		maxHeight: `${navbarHeight}rpx`,
		borderRadius: `${navbarHeight}rpx`
	};
});

// 计算黑夜模式下的样式
const headerWrapStyle = computed(() => {
	const isDark = store.tmStore.dark;
	return {
		background: isDark ? '#1a1a1a' : '#ffffff',
		borderBottom: `1rpx solid ${isDark ? '#2d2d2d' : '#e5e7eb'}`
	};
});

const actionContainerClass = computed(() => {
	return store.tmStore.dark ? 'action-container dark' : 'action-container';
});

const authBtnTextClass = computed(() => {
	return store.tmStore.dark ? 'auth-btn-text dark' : 'auth-btn-text';
});

const onChangeDark = () => store.setTmVuetifyDark(!store.tmStore.dark);
const onAuth = () => {
	// 跳转到登录/注册页面
	uni.navigateTo({
		url: '/pages/auth/auth'
	});
};
</script>

<style scoped>
.header-wrap {
	margin: 0;
	padding: 0;
	line-height: 0;
	transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 覆盖 navbar-right-section 的样式，让按钮占满高度 */
.header-wrap :deep(.navbar-right-section) {
	padding-right: 12rpx !important;
	align-items: stretch !important;
	height: 100% !important;
}

/* 确保 navbar-content-wrapper 也占满高度 */
.header-wrap :deep(.navbar-content-wrapper) {
	height: 100%;
	align-items: stretch;
}

.action-container {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: stretch;
	justify-content: flex-end;
	gap: 0;
	padding: 0;
	margin: 0;
	background: linear-gradient(135deg, #f7f9fc 0%, #edf2f7 100%);
	border: 1rpx solid #e2e8f0;
	box-shadow: inset 0 2rpx 4rpx rgba(0, 0, 0, 0.06);
	overflow: hidden;
	white-space: nowrap;
	width: auto;
	transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
	/* height 和 border-radius 通过 :style 动态设置，与 navbar 高度保持一致 */
	/* align-items: stretch 确保按钮占满整个高度 */
}

.action-container.dark {
	background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
	border: 1rpx solid #3d3d3d;
	box-shadow: inset 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

.action-item {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 100%;
	padding: 0 16rpx;
	position: relative;
	flex-shrink: 0;
	box-sizing: border-box;
}

.action-item:not(:last-child)::after {
	content: '';
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 1rpx;
	height: 60%;
	background: linear-gradient(180deg, transparent 0%, #d1d5db 50%, transparent 100%);
	transition: background 0.3s ease;
}

.action-container.dark .action-item:not(:last-child)::after {
	background: linear-gradient(180deg, transparent 0%, #4a4a4a 50%, transparent 100%);
}

.dark-toggle-wrapper {
	min-width: 64rpx;
	padding: 0 16rpx;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.auth-btn-wrapper {
	min-width: 100rpx;
	font-size: 26rpx;
	color: #4a5568;
	background: transparent;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.3s ease;
}

.action-container.dark .auth-btn-wrapper {
	color: #a0aec0;
}

.auth-btn-wrapper.primary {
	color: #667eea;
	font-weight: 600;
	background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(102, 126, 234, 0.05) 100%);
	transition: color 0.3s ease, background 0.3s ease;
}

.action-container.dark .auth-btn-wrapper.primary {
	color: #818cf8;
	background: linear-gradient(135deg, rgba(129, 140, 248, 0.2) 0%, rgba(129, 140, 248, 0.1) 100%);
}

.auth-btn-text {
	font-size: 26rpx;
	line-height: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	display: inline-block;
	vertical-align: middle;
	transition: color 0.3s ease;
}
</style>
