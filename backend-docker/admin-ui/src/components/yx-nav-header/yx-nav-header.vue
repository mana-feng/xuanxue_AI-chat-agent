<template>
	<header class="app-header">
		<view class="app-header__left">
			<view class="app-header__logo" @tap="goToDashboard" role="button" aria-label="返回仪表盘">
				<image class="logo-icon" src="@/static/icons/F.png" mode="aspectFit"></image>
			</view>
		</view>
		<view class="app-header__nav">
			<view class="nav-btn" @tap="goToDashboard" role="button" aria-label="仪表盘">仪表盘</view>
			<view class="nav-btn" @tap="goToUsers" role="button" aria-label="用户管理">用户</view>
			<view class="nav-btn" @tap="goToRecords" role="button" aria-label="记录管理">记录</view>
			<view class="nav-btn" @tap="goToAnnouncements" role="button" aria-label="公告管理">公告</view>
			<view class="nav-btn" @tap="goToLlmConfig" role="button" aria-label="LLM 配置">LLM</view>
			<view class="nav-btn" @tap="goToLlmQuota" role="button" aria-label="配额管理">配额</view>
			<view class="nav-btn" @tap="goToEmailConfig" role="button" aria-label="邮箱配置">邮箱</view>
		</view>
		<view class="app-header__right">
			<view class="icon-btn" @tap.stop="toggleUserMenu" ref="userMenuWrapper" role="button" aria-label="用户菜单">
				<tm-icon :font-size="28" color="#667eea" name="tmicon-md-person"></tm-icon>
			</view>
		</view>
		<view v-if="showUserMenu" class="user-dropdown" :style="dropdownStyle">
			<template v-if="!userStore.isLoggedIn">
				<view class="dropdown-item" @tap="onAuth">
					<tm-icon name="tmicon-md-person" :font-size="28" :margin="[0, 12, 0, 0]" color="#667eea"></tm-icon>
					<tm-text :font-size="28" color="#667eea" label="登录/注册"></tm-text>
				</view>
			</template>
			<template v-else>
				<view class="dropdown-item" @tap="goToDashboard">
					<tm-icon name="tmicon-md-settings" :font-size="28" :margin="[0, 12, 0, 0]"></tm-icon>
					<tm-text :font-size="28" label="管理员后台"></tm-text>
				</view>
				<view class="dropdown-divider"></view>
				<view class="dropdown-item" @tap="onLogout">
					<tm-icon name="tmicon-md-log-out" :font-size="28" :margin="[0, 12, 0, 0]" color="#f56565"></tm-icon>
					<tm-text :font-size="28" color="#f56565" label="退出登录"></tm-text>
				</view>
			</template>
		</view>
		<view v-if="showUserMenu" class="dropdown-mask" @tap="closeUserMenu"></view>
	</header>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, nextTick } from 'vue';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const showUserMenu = ref(false);
const dropdownStyle = ref({ top: '0px', right: '0px' });

onMounted(() => {
	userStore.restoreAuth();
});

const navbarHeight = computed(() => {
	try {
		return 40;
	} catch (e) {
		return 40;
	}
});

const totalHeaderHeight = computed(() => {
	try {
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const headerHeight = systemInfo.windowWidth <= 640 ? 48 : 64;
		return statusBarHeight + headerHeight;
	} catch (e) {
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		return statusBarHeight + 64;
	}
});

const iconSize = computed(() => Math.floor(navbarHeight.value * 1.5));

const goToDashboard = () => {
	closeUserMenu();
	uni.reLaunch({ url: '/pages/admin/dashboard' });
};

const goToUsers = () => {
	closeUserMenu();
	uni.navigateTo({ url: '/pages/admin/users' });
};

const goToRecords = () => {
	closeUserMenu();
	uni.navigateTo({ url: '/pages/admin/records' });
};

const goToAnnouncements = () => {
	closeUserMenu();
	uni.navigateTo({ url: '/pages/admin/announcements' });
};

const goToLlmConfig = () => {
	closeUserMenu();
	uni.navigateTo({ url: '/pages/admin/llm-config' });
};

const goToLlmQuota = () => {
	closeUserMenu();
	uni.navigateTo({ url: '/pages/admin/llm-quota' });
};

const goToEmailConfig = () => {
	closeUserMenu();
	uni.navigateTo({ url: '/pages/admin/email-config' });
};

const toggleUserMenu = async () => {
	if (!showUserMenu.value) {
		await nextTick();
		calculateDropdownPosition();
	}
	showUserMenu.value = !showUserMenu.value;
};

const calculateDropdownPosition = () => {
	try {
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const navbarHeightPx = uni.upx2px(navbarHeight.value);
		const iconContainerHeightPx = uni.upx2px(iconSize.value);
		const spacing = uni.upx2px(8);
		const top = statusBarHeight + navbarHeightPx + iconContainerHeightPx + spacing;
		const right = uni.upx2px(12);
		dropdownStyle.value = {
			top: `${top}px`,
			right: `${right}px`,
		};
	} catch (e) {
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const navbarHeightPx = uni.upx2px(navbarHeight.value);
		const iconContainerHeightPx = uni.upx2px(iconSize.value);
		const spacing = uni.upx2px(8);
		dropdownStyle.value = {
			top: `${statusBarHeight + navbarHeightPx + iconContainerHeightPx + spacing}px`,
			right: `${uni.upx2px(12)}px`,
		};
	}
};

const closeUserMenu = () => {
	showUserMenu.value = false;
};

const onAuth = () => {
	closeUserMenu();
	uni.navigateTo({ url: '/pages/auth/auth' });
};

const onLogout = () => {
	closeUserMenu();
	userStore.logout();
	uni.showToast({
		title: '已退出登录',
		icon: 'success',
		duration: 2000,
	});
	uni.reLaunch({ url: '/pages/auth/auth' });
};

defineExpose({
	navbarHeight,
	iconSize,
	totalHeaderHeight,
});
</script>

<style scoped>
.app-header {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.app-header__nav {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-left: 0;
	gap: 10px;
	flex-wrap: nowrap;
	align-content: center;
	height: 100%;
	flex: 1;
	justify-content: center;
	min-width: 0;
}

.nav-btn {
	padding: 0 10px;
	border-radius: 6px;
	font-size: 14px;
	color: #4a5568;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 32px;
	line-height: 32px;
	white-space: nowrap;
	box-sizing: border-box;
}

.nav-btn + .nav-btn {
	margin-left: 0;
}

.nav-btn:active {
	background: rgba(102, 126, 234, 0.12);
}

.app-header__right {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: nowrap;
	padding-right: 8px;
}

.app-header__left {
	flex: 0 0 auto;
}

.app-header__right .icon-btn + .icon-btn {
	margin-left: 6px;
}

.logo-icon {
	width: clamp(24px, 4vw, 32px);
	height: clamp(24px, 4vw, 32px);
}

.dropdown-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9998;
	background: transparent;
	pointer-events: auto;
}

.user-dropdown {
	position: fixed;
	min-width: 120px;
	background: #ffffff;
	border-radius: 6px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	overflow: hidden;
	z-index: 9999;
	padding: 4px 0;
	animation: slideDown 0.2s ease;
	pointer-events: auto;
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-5px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.dropdown-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 10px 12px;
	cursor: pointer;
	transition: background-color 0.2s ease;
}

.dropdown-item:active {
	background-color: rgba(102, 126, 234, 0.1);
}

.dropdown-divider {
	height: 1px;
	background: #e5e7eb;
	margin: 4px 0;
}
</style>
