<template>
	<tm-app>
		<PageScaffold class="page-settings" title="设置" subtitle="账号信息与应用相关">
			<SectionBlock icon="tmicon-account" title="账号">
				<view class="user-card">
					<view class="user-name">{{ displayName }}</view>
					<view class="user-sub">{{ userStore.isLoggedIn ? (userStore.email || '') : '未登录' }}</view>
					<view class="user-actions">
						<view v-if="!userStore.isLoggedIn" class="action-btn" @tap="goLogin">登录/注册</view>
						<view v-else class="action-btn danger" @tap="onLogout">退出登录</view>
					</view>
				</view>
			</SectionBlock>

			<SectionBlock icon="tmicon-clock" title="历史记录">
				<view class="settings-row" @tap="goHistory">
					<view class="row-label">
						<tm-icon name="tmicon-clock" :font-size="20" color="#64748b"></tm-icon>
						<text>查看历史排盘</text>
					</view>
					<tm-icon name="tmicon-angle-right" :font-size="20" color="#9ca3af"></tm-icon>
				</view>
			</SectionBlock>

			<SectionBlock icon="tmicon-bell" title="公告">
				<view class="settings-row" @tap="openAnnouncement">
					<view class="row-label">
						<tm-icon name="tmicon-bell" :font-size="20" color="#64748b"></tm-icon>
						<text>查看最新公告</text>
					</view>
					<tm-icon name="tmicon-angle-right" :font-size="20" color="#9ca3af"></tm-icon>
				</view>
			</SectionBlock>

			<SectionBlock icon="tmicon-info-circle" title="关于">
				<view class="settings-row" @tap="goAbout">
					<view class="row-label">
						<tm-icon name="tmicon-info-circle" :font-size="20" color="#64748b"></tm-icon>
						<text>关于应用</text>
					</view>
					<tm-icon name="tmicon-angle-right" :font-size="20" color="#9ca3af"></tm-icon>
				</view>
			</SectionBlock>

			<tm-overlay v-model:show="showAnnouncement" :opacity="0.4" :duration="200">
				<view class="announcement-panel">
					<view class="announcement-header">
						<tm-text :font-size="30" bold label="公告"></tm-text>
						<tm-icon name="tmicon-close" :font-size="26" color="#94a3b8" @tap="closeAnnouncement"></tm-icon>
					</view>
					<scroll-view class="announcement-body" scroll-y>
						<view v-if="loading" class="py-4 flex flex-center">
							<tm-text label="加载中..." color="#9ca3af"></tm-text>
						</view>
						<view v-else-if="announcementList.length === 0" class="py-4 flex flex-center">
							<tm-text label="暂无公告" color="#9ca3af"></tm-text>
						</view>
						<view v-for="(item, idx) in announcementList" v-else :key="idx" class="announcement-item">
							<tm-text :font-size="26" bold :label="item.title"></tm-text>
							<tm-text :font-size="22" color="#4b5563" :label="item.content"></tm-text>
							<tm-text v-if="item.createdAt" :font-size="20" color="#9ca3af" :label="formatTime(item.createdAt)" class="mt-1"></tm-text>
						</view>
					</scroll-view>
				</view>
			</tm-overlay>
		</PageScaffold>
	</tm-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageScaffold from '@/components/layout/PageScaffold.vue';
import SectionBlock from '@/components/layout/SectionBlock.vue';
import { useUserStore } from '@/store/user';
import { fetchAnnouncements, type Announcement } from '@/services/api/announcement';
import utils from '@/libs/utils/utils';

const userStore = useUserStore();
const displayName = computed(() => userStore.username || userStore.email || '游客');
const showAnnouncement = ref(false);
const announcementList = ref<Announcement[]>([]);
const loading = ref(false);

const formatTime = (time: string | null) => {
	if (!time) return '';
	try {
		const d = new Date(time);
		if (isNaN(d.getTime())) {
			return '';
		}
		return utils.HideSecond(d.getTime()) || '';
	} catch (e) {
		return '';
	}
};

onMounted(() => {
	userStore.restoreAuth();
});

const goHistory = () => {
	uni.navigateTo({
		url: '/pages/history/list',
	});
};

const goLogin = () => {
	uni.navigateTo({
		url: '/pages/auth/auth',
	});
};

const goAbout = () => {
	uni.navigateTo({
		url: '/pages/about/index',
	});
};

const loadAnnouncements = async () => {
	loading.value = true;
	try {
		const res = await fetchAnnouncements();
		if (res.success && res.data?.list) {
			announcementList.value = res.data.list;
		}
	} catch (e) {
		console.error('获取公告失败', e);
	} finally {
		loading.value = false;
	}
};

const openAnnouncement = () => {
	showAnnouncement.value = true;
	loadAnnouncements();
};

const closeAnnouncement = () => {
	showAnnouncement.value = false;
};

const onLogout = () => {
	userStore.logout();
	uni.showToast({
		title: '已退出登录',
		icon: 'success',
		duration: 2000,
	});
};
</script>

<style scoped>
.page-settings .user-card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 14px;
	border-radius: 16px;
	border: 1px solid var(--border-subtle);
	background: var(--surface);
}

.page-settings .user-name {
	font-size: 18px;
	font-weight: 600;
	color: var(--text-primary);
}

.page-settings .user-sub {
	font-size: 13px;
	color: var(--text-secondary);
}

.page-settings .user-actions {
	display: flex;
	gap: 10px;
	margin-top: 6px;
}

.page-settings .action-btn {
	padding: 8px 14px;
	border-radius: 999px;
	background: linear-gradient(90deg, #06b6d4, #60a5fa);
	color: #ffffff;
	font-size: 13px;
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
	border: 1px solid rgba(255, 255, 255, 0.35);
	transition: transform 0.08s ease, filter 0.08s ease, box-shadow 0.08s ease;
}

.page-settings .action-btn:active {
	transform: translateY(1px);
	filter: brightness(0.985);
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
}

.page-settings .action-btn.danger {
	background: linear-gradient(90deg, #fb7185, #f43f5e);
}

.page-settings .settings-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 14px;
	border-radius: 12px;
	border: 1px solid var(--border-subtle);
	background: var(--surface);
}

.page-settings .row-label {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--text-primary);
	font-size: 14px;
}

.announcement-panel {
	position: fixed;
	left: 16px;
	right: 16px;
	bottom: calc(80px + var(--safe-bottom));
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
	padding: 14px 16px;
	max-height: 60vh;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.announcement-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid var(--border-subtle, #e5e7eb);
	padding-bottom: 8px;
}

.announcement-body {
	flex: 1;
	overflow-y: auto;
}

.announcement-item {
	padding: 10px 0;
	border-bottom: 1px solid var(--border-subtle, #e5e7eb);
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.announcement-item:last-child {
	border-bottom: none;
}
</style>
