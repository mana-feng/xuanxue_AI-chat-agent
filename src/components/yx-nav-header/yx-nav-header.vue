<template>
	<view class="header-wrap" :style="headerWrapStyle">
		<tm-navbar hideHome title="" :shadow="2" :margin="[0,0]" :padding="[0,0]" :height="40" :follow-dark="true">
			<template #left></template>
			<template #right>
				<view :class="actionContainerClass" :style="actionContainerStyle">
					<view class="action-item dark-toggle-wrapper" @tap="onChangeDark">
						<view class="dark-toggle-icon-wrapper">
							<tm-icon
								class="dark-toggle-icon"
								:font-size="iconSize"
								:color="store.tmStore.dark ? '#f59e0b' : '#4a5568'"
								:name="store.tmStore.dark ? 'tmicon-ios-sunny' : 'tmicon-md-moon'"
								:follow-dark="true"
							></tm-icon>
						</view>
					</view>
					<!-- 用户icon和下拉菜单 -->
					<view class="action-item user-menu-wrapper" ref="userMenuWrapper">
						<view class="user-icon-wrapper" @tap.stop="toggleUserMenu">
							<tm-icon
								class="user-icon"
								:font-size="iconSize"
								:color="store.tmStore.dark ? '#818cf8' : '#667eea'"
								name="tmicon-md-person"
								:follow-dark="true"
							></tm-icon>
						</view>
					</view>
				</view>
			</template>
		</tm-navbar>
		<!-- 下拉菜单 - 放在navbar外部，使用fixed定位 -->
		<view v-if="showUserMenu" class="user-dropdown" :class="{ 'dark': store.tmStore.dark }" :style="dropdownStyle">
			<!-- 未登录时显示登录/注册 -->
			<template v-if="!userStore.isLoggedIn">
				<view class="dropdown-item" @tap="onAuth">
					<tm-icon name="tmicon-md-person" :font-size="28" :margin="[0, 12, 0, 0]" :color="store.tmStore.dark ? '#818cf8' : '#667eea'"></tm-icon>
					<tm-text :font-size="28" :follow-dark="true" :color="store.tmStore.dark ? '#818cf8' : '#667eea'" label="登录/注册"></tm-text>
				</view>
			</template>
			<!-- 已登录时显示用户菜单 -->
			<template v-else>
				<view class="dropdown-item" @tap="goToHistory">
					<tm-icon name="tmicon-md-time" :font-size="28" :margin="[0, 12, 0, 0]"></tm-icon>
					<tm-text :font-size="28" :follow-dark="true" label="历史查询"></tm-text>
				</view>
				<view v-if="userStore.isAdmin" class="dropdown-item" @tap="goToAdmin">
					<tm-icon name="tmicon-md-settings" :font-size="28" :margin="[0, 12, 0, 0]"></tm-icon>
					<tm-text :font-size="28" :follow-dark="true" label="管理员后台"></tm-text>
				</view>
				<view class="dropdown-divider"></view>
				<view class="dropdown-item" @tap="onLogout">
					<tm-icon name="tmicon-md-log-out" :font-size="28" :margin="[0, 12, 0, 0]" color="#f56565"></tm-icon>
					<tm-text :font-size="28" color="#f56565" label="退出登录"></tm-text>
				</view>
			</template>
		</view>
		<!-- 点击外部关闭菜单的遮罩 -->
		<view v-if="showUserMenu" class="dropdown-mask" @tap="closeUserMenu"></view>
	</view>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, nextTick } from 'vue';
import { useTmpiniaStore } from '@/libs/tmui/tool/lib/tmpinia';
import { useUserStore } from '@/store/user';

const store = useTmpiniaStore();
const userStore = useUserStore();

// 下拉菜单显示状态
const showUserMenu = ref(false);
const dropdownStyle = ref({ top: '0px', right: '0px' });
const userIconRef = ref(null);

// 初始化时恢复用户状态
onMounted(() => {
	userStore.restoreAuth();
});

// navbar 高度（rpx），与 tm-navbar 的 height prop 保持一致
const navbarHeight = 40;

// 计算图标大小，使其视觉上占满header高度
const iconSize = computed(() => {
	// 图标大小设为header高度的105%，确保视觉上完全占满header高度
	// 由于图标字体本身可能有内边距，稍微超出一点能确保视觉上占满
	return Math.floor(navbarHeight * 1.5);
});

// 计算按钮容器的样式（不再需要背景，只作为布局容器）
const actionContainerStyle = computed(() => {
	return {
		height: 'auto',
		minHeight: 'auto',
		maxHeight: 'none'
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

const onChangeDark = () => store.setTmVuetifyDark(!store.tmStore.dark);

const toggleUserMenu = async () => {
	if (!showUserMenu.value) {
		// 打开菜单时计算位置
		await nextTick();
		calculateDropdownPosition();
	}
	showUserMenu.value = !showUserMenu.value;
};

const calculateDropdownPosition = () => {
	try {
		// 获取系统信息
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const navbarHeight = 40; // navbar高度（rpx）
		const navbarHeightPx = uni.upx2px(navbarHeight);
		const iconContainerHeight = uni.upx2px(iconSize.value); // 图标容器高度（px）
		
		// 计算下拉菜单位置：状态栏高度 + navbar高度 + 图标容器高度 + 间距
		// 由于图标容器向下对齐，下拉栏应该从header底部（即图标容器底部）开始
		const top = statusBarHeight + navbarHeightPx + iconContainerHeight + uni.upx2px(8);
		const right = uni.upx2px(12); // 距离右边缘12rpx
		
		dropdownStyle.value = {
			top: `${top}px`,
			right: `${right}px`
		};
	} catch (e) {
		// 如果计算失败，使用默认位置
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		const iconContainerHeight = uni.upx2px(iconSize.value);
		dropdownStyle.value = {
			top: `${statusBarHeight + 40 + iconContainerHeight + 8}px`,
			right: '12px'
		};
	}
};

const closeUserMenu = () => {
	showUserMenu.value = false;
};

const onAuth = () => {
	closeUserMenu();
	// 跳转到登录/注册页面
	uni.navigateTo({
		url: '/pages/auth/auth'
	});
};

const goToHistory = () => {
	closeUserMenu();
	uni.navigateTo({
		url: '/pages/history/list'
	});
};

const goToAdmin = () => {
	closeUserMenu();
	uni.navigateTo({
		url: '/pages/auth/auth'
	});
};

const onLogout = () => {
	closeUserMenu();
	userStore.logout();
	uni.showToast({
		title: '已退出登录',
		icon: 'success',
		duration: 2000
	});
};
</script>

<style scoped>
.header-wrap {
	margin: 0;
	padding: 0;
	line-height: 1;
	transition: background-color 0.3s ease, border-color 0.3s ease;
	display: flex;
	align-items: flex-end;
}

/* 覆盖 navbar-right-section 的样式，让按钮向下对齐 */
.header-wrap :deep(.navbar-right-section) {
	padding-right: 12rpx !important;
	align-items: flex-end !important;
	height: 100% !important;
	overflow: visible !important;
}

/* 确保 navbar-content-wrapper 也向下对齐 */
.header-wrap :deep(.navbar-content-wrapper) {
	height: 100%;
	align-items: flex-end;
}

.action-container {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: flex-end;
	justify-content: flex-end;
	gap: 0;
	padding: 0;
	margin: 0;
	background: transparent;
	border: none;
	box-shadow: none;
	overflow: visible;
	white-space: nowrap;
	width: auto;
	/* 移除背景，让图标直接显示在header背景上 */
}

.action-container.dark {
	background: transparent;
	border: none;
	box-shadow: none;
}

.action-item {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: flex-end;
	justify-content: center;
	height: 100%;
	min-height: 100%;
	padding: 0;
	position: relative;
	flex-shrink: 0;
	box-sizing: border-box;
	vertical-align: bottom;
}

/* 移除分隔线，因为不再有背景容器 */
.action-item:not(:last-child)::after {
	display: none;
}

.dark-toggle-wrapper {
	min-width: 64rpx;
	padding: 0 8rpx;
	height: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	flex-shrink: 0;
}

.dark-toggle-icon-wrapper {
	display: flex;
	align-items: flex-end;
	justify-content: center;
	width: 100%;
	height: 100%;
	padding: 0;
}

.dark-toggle-icon {
	transition: transform 0.2s ease;
	line-height: 1;
	vertical-align: middle;
}

.dark-toggle-icon-wrapper:active .dark-toggle-icon {
	transform: scale(0.95);
}

.user-menu-wrapper {
	position: relative;
	min-width: 64rpx;
	padding: 0 8rpx;
	cursor: pointer;
	overflow: visible;
	z-index: 1001;
	flex-shrink: 0;
	height: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.user-icon-wrapper {
	display: flex;
	align-items: flex-end;
	justify-content: center;
	width: 100%;
	height: 100%;
	padding: 0;
}

.user-icon {
	transition: transform 0.2s ease;
	line-height: 1;
	vertical-align: middle;
}

.user-icon-wrapper:active .user-icon {
	transform: scale(0.95);
}

.dropdown-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	background: transparent;
	/* 在移动端，遮罩层可以帮助关闭菜单 */
	/* #ifdef H5 */
	background: rgba(0, 0, 0, 0.01);
	/* #endif */
}

.user-dropdown {
	position: fixed;
	min-width: 240rpx;
	background: #ffffff;
	border-radius: 12rpx;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
	overflow: hidden;
	z-index: 1002;
	padding: 8rpx 0;
	animation: slideDown 0.2s ease;
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-10rpx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.user-dropdown.dark {
	background: #2d2d2d;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.4);
}

.dropdown-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 20rpx 24rpx;
	cursor: pointer;
	transition: background-color 0.2s ease;
}

.dropdown-item:active {
	background-color: rgba(102, 126, 234, 0.1);
}

.user-dropdown.dark .dropdown-item:active {
	background-color: rgba(129, 140, 248, 0.2);
}

.dropdown-divider {
	height: 1rpx;
	background: #e5e7eb;
	margin: 8rpx 0;
}

.user-dropdown.dark .dropdown-divider {
	background: #3d3d3d;
}
</style>
