<template>
	<header class="app-header" :style="headerWrapStyle">
		<view class="app-header__left">
			<view class="app-header__logo" @tap="goToHome">
				<image class="logo-icon" src="/static/icons/F.png" mode="aspectFit"></image>
			</view>
		</view>
		<view class="app-header__nav">
			<view class="nav-btn" :class="{ dark: store.tmStore.dark }" @tap="goToHome">八字排盘</view>
			<view class="nav-btn" :class="{ dark: store.tmStore.dark }" @tap="goLiuyao">六爻排盘</view>
			<view class="nav-btn" :class="{ dark: store.tmStore.dark }" @tap="goQimen">奇门排盘</view>
			<view class="nav-btn" :class="{ dark: store.tmStore.dark }" @tap="goAbout">关于</view>
		</view>
		<view class="app-header__right">
			<view class="icon-btn" @tap="onChangeDark">
				<tm-icon
					:font-size="28"
					:color="store.tmStore.dark ? '#f59e0b' : '#4a5568'"
					:name="store.tmStore.dark ? 'tmicon-ios-sunny' : 'tmicon-md-moon'"
					:follow-dark="true"
				></tm-icon>
			</view>
			<view class="icon-btn" @tap.stop="toggleUserMenu" ref="userMenuWrapper">
				<tm-icon
					:font-size="28"
					:color="store.tmStore.dark ? '#818cf8' : '#667eea'"
					name="tmicon-md-person"
					:follow-dark="true"
				></tm-icon>
			</view>
		</view>
		<!-- 下拉菜单 - 放在navbar外部，使用fixed定位 -->
		<view
			v-if="showUserMenu"
			class="user-dropdown"
			:class="{ dark: store.tmStore.dark }"
			:style="dropdownStyle"
		>
			<!-- 未登录时显示登录/注册 -->
			<template v-if="!userStore.isLoggedIn">
				<view class="dropdown-item" @tap="onAuth">
					<tm-icon
						name="tmicon-md-person"
						:font-size="28"
						:margin="[0, 12, 0, 0]"
						:color="store.tmStore.dark ? '#818cf8' : '#667eea'"
					></tm-icon>
					<tm-text
						:font-size="28"
						:follow-dark="true"
						:color="store.tmStore.dark ? '#818cf8' : '#667eea'"
						label="登录/注册"
					></tm-text>
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
					<tm-icon
						name="tmicon-md-log-out"
						:font-size="28"
						:margin="[0, 12, 0, 0]"
						color="#f56565"
					></tm-icon>
					<tm-text :font-size="28" color="#f56565" label="退出登录"></tm-text>
				</view>
			</template>
		</view>
		<!-- 点击外部关闭菜单的遮罩 -->
		<view v-if="showUserMenu" class="dropdown-mask" @tap="closeUserMenu"></view>
	</header>
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

// 动态计算navbar高度，基于屏幕宽度的百分比，确保在不同屏幕下比例一致
// rpx单位本身就是响应式的，但我们需要确保在不同屏幕下视觉比例一致
const navbarHeight = computed(() => {
	try {
		// 使用固定的rpx值，uni-app会自动根据屏幕宽度转换
		// 40rpx在750rpx设计稿中，在不同屏幕下会自动适配
		// 为了确保视觉比例一致，我们保持40rpx不变，让uni-app自动处理
		return 40;
	} catch (e) {
		// 如果计算失败，使用默认值
		return 40;
	}
});

// 计算实际header总高度（包括状态栏），用于主页面动态调整padding-top
const totalHeaderHeight = computed(() => {
	try {
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		// header高度：小屏48px，大屏64px
		const headerHeight = systemInfo.windowWidth <= 640 ? 48 : 64;
		return statusBarHeight + headerHeight;
	} catch (e) {
		// 如果计算失败，使用默认值
		const systemInfo = uni.getSystemInfoSync();
		const statusBarHeight = systemInfo.statusBarHeight || 0;
		return statusBarHeight + 64;
	}
});

// 计算图标大小，基于header高度的百分比
const iconSize = computed(() => {
	// 图标大小设为header高度的150%，确保视觉上完全占满header高度
	return Math.floor(navbarHeight.value * 1.5);
});

// 计算按钮容器的样式（不再需要背景，只作为布局容器）
const actionContainerStyle = computed(() => {
	return {
		height: 'auto',
		minHeight: 'auto',
		maxHeight: 'none',
	};
});

// 计算黑夜模式下的样式
const headerWrapStyle = computed(() => {
	const isDark = store.tmStore.dark;
	return {
		background: isDark ? '#1a1a1a' : '#ffffff',
		borderBottom: `1rpx solid ${isDark ? '#2d2d2d' : '#e5e7eb'}`,
	};
});

const actionContainerClass = computed(() => {
	return store.tmStore.dark ? 'action-container dark' : 'action-container';
});

const onChangeDark = () => store.setTmVuetifyDark(!store.tmStore.dark);

const goToHome = () => {
	uni.reLaunch({
		url: '/pages/index/index',
	});
};

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
		const navbarHeightPx = uni.upx2px(navbarHeight.value); // navbar高度（px）
		const iconSizeValue = iconSize.value; // 图标大小（rpx）
		const iconContainerHeightPx = uni.upx2px(iconSizeValue); // 图标容器高度（px）

		// 计算下拉菜单位置：状态栏高度 + navbar高度 + 图标容器高度 + 间距
		// 由于图标容器向下对齐，下拉栏应该从header底部（即图标容器底部）开始
		// 统一使用px单位，确保在不同屏幕尺寸下位置一致
		const spacing = uni.upx2px(8); // 间距（px）
		const top = statusBarHeight + navbarHeightPx + iconContainerHeightPx + spacing;
		const right = uni.upx2px(12); // 距离右边缘12rpx

		dropdownStyle.value = {
			top: `${top}px`,
			right: `${right}px`,
		};
	} catch (e) {
		// 如果计算失败，使用默认位置
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
	// 跳转到登录/注册页面
	uni.navigateTo({
		url: '/pages/auth/auth',
	});
};

const goToHistory = () => {
	closeUserMenu();
	uni.navigateTo({
		url: '/pages/history/list',
	});
};

const goToAdmin = () => {
	closeUserMenu();
	uni.navigateTo({
		url: '/pages/auth/auth',
	});
};

const onLogout = () => {
	closeUserMenu();
	userStore.logout();
	uni.showToast({
		title: '已退出登录',
		icon: 'success',
		duration: 2000,
	});
};

const goLiuyao = () => {
	uni.showToast({
		title: '六爻排盘即将上线',
		icon: 'none',
	});
};

const goQimen = () => {
	uni.showToast({
		title: '奇门排盘即将上线',
		icon: 'none',
	});
};

const goAbout = () => {
	closeUserMenu();
	uni.navigateTo({
		url: '/pages/about/index',
	});
};

// 暴露给父组件使用，用于动态计算内容区域的padding-top
defineExpose({
	navbarHeight,
	iconSize,
	totalHeaderHeight,
});
</script>

<style scoped>
/* Header 样式已在 app-shell.css 中定义 */
/* 这里只添加组件特定的样式 */

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
	margin-left: 24rpx;
}

.nav-btn {
	padding: 12rpx 16rpx;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #4a5568;
}

.nav-btn + .nav-btn {
	margin-left: 12rpx;
}

.nav-btn:active {
	background: rgba(102, 126, 234, 0.12);
}

.nav-btn.dark {
	color: #e5e7eb;
}

.nav-btn.dark:active {
	background: rgba(129, 140, 248, 0.12);
}

.app-header__right {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: nowrap;
}

.app-header__right .icon-btn + .icon-btn {
	margin-left: 12rpx;
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
	/* 在移动端，遮罩层可以帮助关闭菜单 */
	/* #ifdef H5 */
	background: rgba(0, 0, 0, 0.01);
	/* #endif */
	pointer-events: auto;
}

.user-dropdown {
	position: fixed;
	min-width: 240rpx;
	background: #ffffff;
	border-radius: 12rpx;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
	overflow: hidden;
	z-index: 9999;
	padding: 8rpx 0;
	animation: slideDown 0.2s ease;
	pointer-events: auto;
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
