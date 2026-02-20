<template>
	<view class="app-header" :style="headerInlineStyle">
		<view class="app-header__left">
			<view class="app-header__logo" @tap="goToHome">
				<image class="logo-icon" src="@/static/icons/F.png" mode="aspectFit"></image>
			</view>
		</view>
	</view>

	<view class="bottom-nav">
		<view class="bottom-nav__item" :class="{ active: isBaziActive }" @tap="goToBazi">
				<tm-icon name="tmicon-chart-bar" :font-size="24" color="#667eea"></tm-icon>
			<text class="bottom-nav__label">八字排盘</text>
		</view>
		<view class="bottom-nav__item" :class="{ active: isLiuyaoActive }" @tap="goToLiuyao">
				<tm-icon name="tmicon-chart-relation" :font-size="24" color="#667eea"></tm-icon>
			<text class="bottom-nav__label">六爻排盘</text>
		</view>
		<view class="bottom-nav__item" :class="{ active: isZiweiActive }" @tap="goToZiwei">
				<tm-icon name="tmicon-star-circle" :font-size="24" color="#667eea"></tm-icon>
			<text class="bottom-nav__label">紫微排盘</text>
		</view>

		<view class="bottom-nav__item" :class="{ active: isSettingsActive }" @tap="goToSettings">
			<tm-icon name="tmicon-cog" :font-size="24" color="#667eea"></tm-icon>
			<text class="bottom-nav__label">我</text>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { getSystemInfo } from '@/utils/platform';

const userStore = useUserStore();

const extraTopOffset = (() => {
	let offset = 0;
	// #ifdef H5
	offset = 12;
	// #endif
	return offset;
})();

const currentRoute = ref('');
const isSettingsActive = computed(() => currentRoute.value === 'pages/settings/index');
const isBaziActive = computed(() => currentRoute.value === 'pages/index/index' || currentRoute.value === 'pages/index/detail');
const isLiuyaoActive = computed(() => currentRoute.value?.startsWith('pages/liuyao'));
const isZiweiActive = computed(() => currentRoute.value?.startsWith('pages/ziwei'));

onMounted(() => {
	userStore.restoreAuth();
	refreshRoute();
});

const navbarHeight = computed(() => 40);

const headerInlineStyle = computed(() => {
	try {
		const systemInfo = getSystemInfo();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const safeAreaTop = (systemInfo.safeAreaInsets && systemInfo.safeAreaInsets.top) || 0;
		const safeTop = statusBarHeight || safeAreaTop || 0;
		const headerHeight = systemInfo.windowWidth <= 640 ? 48 : 64;
		const paddingX = 14;
		const paddingRight = paddingX + 16;
		return {
			position: 'fixed',
			top: '0px',
			left: '0px',
			right: '0px',
			zIndex: 1000,
			width: '100%',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'flex-start',
			paddingTop: `${safeTop}px`,
			paddingBottom: '8px',
			paddingLeft: `${paddingX}px`,
			paddingRight: `${paddingRight}px`,
			height: `${safeTop + headerHeight}px`,
			background: '#ffffff',
			boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
			boxSizing: 'border-box',
		} as Record<string, string | number>;
	} catch (e) {
		return {
			position: 'fixed',
			top: '0px',
			left: '0px',
			right: '0px',
			zIndex: 1000,
			width: '100%',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'flex-start',
			paddingTop: '0px',
			paddingBottom: '8px',
			paddingLeft: '14px',
			paddingRight: '30px',
			height: '52px',
			background: '#ffffff',
			boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
			boxSizing: 'border-box',
		};
	}
});

const totalHeaderHeight = computed(() => {
	try {
		const systemInfo = getSystemInfo();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const safeAreaTop = (systemInfo.safeAreaInsets && systemInfo.safeAreaInsets.top) || 0;
		const headerOffset = (statusBarHeight || safeAreaTop) + extraTopOffset;
		const headerHeight = systemInfo.windowWidth <= 640 ? 48 : 64;
		return headerOffset + headerHeight;
	} catch (e) {
		const systemInfo = getSystemInfo();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const safeAreaTop = (systemInfo.safeAreaInsets && systemInfo.safeAreaInsets.top) || 0;
		const headerOffset = (statusBarHeight || safeAreaTop) + extraTopOffset;
		return headerOffset + 64;
	}
});

const refreshRoute = () => {
	// eslint-disable-next-line no-undef
	const pages = getCurrentPages();
	const current = pages[pages.length - 1];
	currentRoute.value = current && current.route ? current.route : '';
};

const goToHome = () => {
	currentRoute.value = 'pages/index/index';
	uni.reLaunch({
		url: '/pages/index/index',
	});
};

const goToBazi = () => {
	goToHome();
};

const goToLiuyao = () => {
	currentRoute.value = 'pages/liuyao/index';
	uni.navigateTo({
		url: '/pages/liuyao/index',
	});
};

const goToZiwei = () => {
	currentRoute.value = 'pages/ziwei/index';
	uni.navigateTo({
		url: '/pages/ziwei/index',
	});
};

const goToSettings = () => {
	if (currentRoute.value === 'pages/settings/index') {
		return;
	}
	currentRoute.value = 'pages/settings/index';
	uni.navigateTo({
		url: '/pages/settings/index',
	});
};

defineExpose({
	navbarHeight,
	totalHeaderHeight,
});
</script>

<style scoped>
.app-header {
	width: 100%;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-start;
	padding-bottom: 8px;
	box-sizing: border-box;
}

.app-header__left {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.app-header__logo {
	display: flex;
	align-items: center;
	gap: 10px;
	cursor: pointer;
	text-decoration: none;
	color: inherit;
}

.app-header__logo .logo-icon {
	width: 32px;
	height: 32px;
	object-fit: contain;
}

.bottom-nav {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1001;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-around;
	height: calc(var(--bottom-nav-height, 56px) + var(--safe-bottom));
	padding: 8px 8px calc(8px + var(--safe-bottom));
	background: var(--surface, #ffffff);
	border-top: 1px solid var(--border-subtle, #e5e7eb);
	box-shadow: 0 -6px 16px rgba(15, 23, 42, 0.08);
	box-sizing: border-box;
}

.bottom-nav__item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	color: var(--text-secondary);
}

.bottom-nav__item.active {
	color: #4f46e5;
}

.bottom-nav__label {
	font-size: 12px;
}

.panel-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.28);
	z-index: 1002;
}

.panel-sheet,
.panel-mask,
.panel-handle,
.panel-section,
.panel-grid,
.panel-card,
.panel-card__label,
.panel-empty,
.panel-loading,
.panel-error,
.panel-action,
.history-list,
.history-item,
.history-item__title,
.history-item__meta,
.panel-footer,
.panel-link,
.user-card,
.user-name,
.user-sub,
.user-actions,
.panel-row {
	display: none;
}

</style>
