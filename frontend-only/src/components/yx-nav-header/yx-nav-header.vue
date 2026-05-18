<template>
	<view class="app-header" :style="headerInlineStyle">
		<view class="app-header__left">
			<view class="app-header__logo" @tap="goToHome">
				<image class="logo-icon" src="@/static/icons/F.png" mode="aspectFit"></image>
			</view>
		</view>
		<view class="app-header__right">
			<UserAvatarDropdown />
		</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { getSystemInfo } from '@/utils/platform';
import UserAvatarDropdown from '@/components/UserAvatarDropdown.vue';

const userStore = useUserStore();

const extraTopOffset = (() => {
	let offset = 0;
	// #ifdef H5
	offset = 12;
	// #endif
	return offset;
})();

const currentRoute = ref('');

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
			justifyContent: 'space-between',
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
			justifyContent: 'space-between',
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
	currentRoute.value = 'pages/agent/index';
	uni.reLaunch({
		url: '/pages/agent/index',
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
	justify-content: space-between;
	padding-bottom: 8px;
	box-sizing: border-box;
}

.app-header__left {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.app-header__right {
	display: flex;
	align-items: center;
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
</style>
