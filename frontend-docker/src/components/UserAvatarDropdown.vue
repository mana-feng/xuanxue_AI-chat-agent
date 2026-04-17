<template>
	<view class="user-avatar-dropdown">
		<view class="user-avatar" @tap="toggleDropdown">
			<tm-icon
				v-if="!isLoggedIn"
				name="tmicon-md-person"
				:font-size="28"
				color="#667eea"
			></tm-icon>
			<view v-else class="avatar-circle">
				<text class="avatar-text">{{ userInitial }}</text>
			</view>
			<tm-icon
				name="tmicon-angle-down"
				:font-size="16"
				color="#999"
				:margin="[0, 0, 0, 4]"
			></tm-icon>
		</view>

		<view v-if="showDropdown" class="dropdown-panel" @tap.stop="closeDropdown">
			<view class="dropdown-menu" @tap.stop>
				<view v-if="isLoggedIn" class="user-info-section">
					<view class="avatar-large">
						<text class="avatar-text-large">{{ userInitial }}</text>
					</view>
					<view class="user-details">
						<text class="user-name">{{ username || '用户' }}</text>
						<text class="user-email">{{ email }}</text>
					</view>
				</view>

				<view v-else class="not-logged-in-hint">
					<text class="hint-text">未登录</text>
				</view>

				<view class="menu-list">
					<view
						v-if="!isLoggedIn"
						class="menu-item"
						@click="handleLogin"
					>
						<tm-icon name="tmicon-md-login" :font-size="20" color="#667eea"></tm-icon>
						<text class="menu-label">登录/注册</text>
					</view>

					<view class="menu-item" @click="handleAnnouncements">
						<tm-icon name="tmicon-bullhorn" :font-size="20" color="#667eea"></tm-icon>
						<text class="menu-label">公告</text>
					</view>

					<view class="menu-item" @click="handleHistory">
						<tm-icon name="tmicon-history" :font-size="20" color="#667eea"></tm-icon>
						<text class="menu-label">历史记录</text>
					</view>

					<view class="menu-item" @click="handleAbout">
						<tm-icon name="tmicon-info-circle" :font-size="20" color="#667eea"></tm-icon>
						<text class="menu-label">关于</text>
					</view>

					<view v-if="isLoggedIn" class="menu-item menu-item--danger" @click="handleLogout">
						<tm-icon name="tmicon-logout" :font-size="20" color="#f56565"></tm-icon>
						<text class="menu-label">注销</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const showDropdown = ref(false);

const isLoggedIn = computed(() => userStore.isLoggedIn);
const username = computed(() => userStore.username);
const email = computed(() => userStore.email);
const userInitial = computed(() => {
	if (!username.value) return '用';
	const first = username.value.charAt(0).toUpperCase();
	return /[A-Z]/.test(first) ? first : username.value.charAt(0);
});

function toggleDropdown() {
	showDropdown.value = !showDropdown.value;
}

function closeDropdown() {
	showDropdown.value = false;
}

function handleLogin() {
	closeDropdown();
	uni.navigateTo({
		url: '/pages/auth/auth',
	});
}

function handleAnnouncements() {
	closeDropdown();
	// 直接触发全局事件，在当前页面打开公告弹窗
	// PageScaffold 组件会在所有使用它的页面中监听这个事件
	uni.$emit('openAnnouncements');
}

function handleHistory() {
	closeDropdown();
	uni.navigateTo({
		url: '/pages/history/list',
	});
}

function handleAbout() {
	closeDropdown();
	uni.navigateTo({
		url: '/pages/about/index',
	});
}

function handleLogout() {
	closeDropdown();
	uni.showModal({
		title: '确认注销',
		content: '确定要退出登录吗？',
		success: async (res) => {
			if (res.confirm) {
				uni.showLoading({
					title: '退出中...',
				});
				try {
					await userStore.logout();
					uni.hideLoading();
					uni.showToast({
						title: '已退出登录',
						icon: 'success',
					});
				} catch (error) {
					uni.hideLoading();
					uni.showToast({
						title: '退出失败',
						icon: 'none',
					});
				}
			}
		},
	});
}
</script>

<style scoped>
.user-avatar-dropdown {
	position: relative;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.user-avatar {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 6px 10px;
	border-radius: 999px;
	background: rgba(102, 126, 234, 0.08);
	cursor: pointer;
	transition: background 0.2s;
}

.user-avatar:active {
	background: rgba(102, 126, 234, 0.15);
}

.avatar-circle {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 4px;
}

.avatar-text {
	font-size: 14px;
	color: #ffffff;
	font-weight: bold;
}

.avatar-large {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-text-large {
	font-size: 20px;
	color: #ffffff;
	font-weight: bold;
}

.dropdown-panel {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
}

.dropdown-menu {
	position: absolute;
	top: 48px;
	right: 12px;
	width: 240px;
	background: #ffffff;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
	overflow: hidden;
	animation: dropdownSlideIn 0.2s ease-out;
}

@keyframes dropdownSlideIn {
	from {
		opacity: 0;
		transform: translateY(-8px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.user-info-section {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 16px;
	background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
	border-bottom: 1px solid #e5e7eb;
}

.user-details {
	display: flex;
	flex-direction: column;
	margin-left: 12px;
	flex: 1;
	min-width: 0;
}

.user-name {
	font-size: 15px;
	color: #2d3748;
	font-weight: bold;
	margin-bottom: 4px;
}

.user-email {
	font-size: 12px;
	color: #718096;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.not-logged-in-hint {
	padding: 16px;
	text-align: center;
	background: rgba(102, 126, 234, 0.05);
	border-bottom: 1px solid #e5e7eb;
}

.hint-text {
	font-size: 14px;
	color: #718096;
}

.menu-list {
	display: flex;
	flex-direction: column;
}

.menu-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 14px 16px;
	cursor: pointer;
	transition: background 0.2s;
	border-bottom: 1px solid #f7fafc;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-item:active {
	background: #f7fafc;
}

.menu-item--danger:active {
	background: rgba(245, 101, 101, 0.1);
}

.menu-label {
	font-size: 14px;
	color: #2d3748;
	margin-left: 12px;
}

.menu-item--danger .menu-label {
	color: #f56565;
}
</style>
