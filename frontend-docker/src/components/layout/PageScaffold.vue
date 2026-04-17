<template>
	<view class="app-shell">
		<yx-nav-header></yx-nav-header>
		<view class="app-main">
			<view class="page-shell">
				<view class="page-card" :class="cardClass">
					<view v-if="hasHero" class="page-title-wrapper">
						<view class="page-title-text">
							<h1 v-if="props.title" class="page-title">{{ props.title }}</h1>
							<p v-if="props.subtitle" class="page-subtitle">{{ props.subtitle }}</p>
						</view>
						<view v-if="props.tag || $slots['header-extra']" class="page-title-extra">
							<slot name="header-extra">
								<tm-tag v-if="props.tag" type="primary" :round="8" :label="props.tag"></tm-tag>
							</slot>
						</view>
					</view>

					<view class="page-card__body">
						<slot />
					</view>

					<view v-if="$slots.footer" class="page-card__footer">
						<slot name="footer" />
					</view>
				</view>
			</view>
		</view>

		<!-- 全局公告弹窗 -->
		<tm-overlay v-model:show="showAnnouncementModal" :opacity="0.4" :duration="200">
			<tm-sheet
				:round="18"
				:padding="[24, 24]"
				:margin="[40, 32]"
				:shadow="2"
				:width="600"
				class="announcement-modal"
			>
				<view class="modal-header">
					<tm-text :font-size="30" label="公告" bold></tm-text>
					<tm-button size="small" type="grey" :round="12" @tap="closeAnnouncements">关闭</tm-button>
				</view>
				<view v-if="annLoading" class="py-10">
					<tm-text label="加载中.." color="#999"></tm-text>
				</view>
				<view v-else-if="announcementList.length === 0" class="py-10">
					<tm-text label="暂无公告" color="#999"></tm-text>
				</view>
				<view v-else class="announcement-list">
					<tm-sheet
						v-for="item in announcementList"
						:key="item.id"
						:round="12"
						:padding="[18, 16]"
						:margin="[0, 0, 16, 0]"
						:shadow="1"
					>
						<tm-text :font-size="28" bold :label="item.title"></tm-text>
						<tm-text
							v-if="item.expiresAt"
							:font-size="22"
							color="#999"
							:label="`有效期至：${item.expiresAt}`"
							class="mt-4"
						></tm-text>
						<tm-text :font-size="24" color="#444" class="mt-6" :label="item.content"></tm-text>
					</tm-sheet>
				</view>
				<view v-if="annError" class="mt-6">
					<tm-text :label="annError" color="red"></tm-text>
				</view>
			</tm-sheet>
		</tm-overlay>
	</view>
</template>

<script lang="ts" setup>
import { ref, computed, useSlots, onMounted, onUnmounted } from 'vue';
import { onShow, onHide } from '@dcloudio/uni-app';
import YxNavHeader from '@/components/yx-nav-header/yx-nav-header.vue';
import { fetchAnnouncementMeta, fetchAnnouncements, type Announcement, type AnnouncementMeta } from '@/services/api/announcement';

const props = defineProps<{
	title?: string;
	subtitle?: string;
	tag?: string;
	cardClass?: string | string[] | Record<string, boolean>;
}>();

const slots = useSlots();
const hasHero = computed(() => !!(props.title || props.subtitle || props.tag || slots['header-extra']));
const cardClass = computed(() => props.cardClass);

// 公告相关
const ANN_CACHE_KEY = 'announcements_cache_v1';
const showAnnouncementModal = ref(false);
const announcementList = ref<Announcement[]>([]);
const annLoading = ref(false);
const annError = ref('');

function loadAnnouncementCache() {
	try {
		const cacheStr = uni.getStorageSync(ANN_CACHE_KEY);
		if (!cacheStr) return null;
		return JSON.parse(cacheStr);
	} catch (e) {
		return null;
	}
}

function saveAnnouncementCache(payload: { signature: string; list: Announcement[] }) {
	try {
		uni.setStorageSync(ANN_CACHE_KEY, JSON.stringify(payload));
	} catch (e) {
		// ignore
	}
}

function buildSignature(meta: AnnouncementMeta[]) {
	return meta.map((m) => `${m.id}-${m.updatedAt || ''}`).join('|');
}

async function refreshAnnouncements() {
	annError.value = '';
	annLoading.value = true;
	try {
		const metaRes = await fetchAnnouncementMeta();
		const metaList = (metaRes.data?.meta || []) as AnnouncementMeta[];
		const newSig = buildSignature(metaList);
		const cache = loadAnnouncementCache();
		if (cache && cache.signature === newSig) {
			announcementList.value = cache.list || [];
			return;
		}
		const fullRes = await fetchAnnouncements();
		const list = (fullRes.data?.list || []) as Announcement[];
		announcementList.value = list;
		saveAnnouncementCache({ signature: newSig, list });
	} catch (e: any) {
		annError.value = e?.error || e?.message || '获取公告失败';
		const cache = loadAnnouncementCache();
		if (cache?.list) {
			announcementList.value = cache.list;
		}
	} finally {
		annLoading.value = false;
	}
}

function openAnnouncements() {
	const cache = loadAnnouncementCache();
	if (cache?.list) {
		announcementList.value = cache.list;
		showAnnouncementModal.value = true;
		// 后台刷新公告，不阻塞显示
		refreshAnnouncements();
	} else {
		// 没有缓存，先显示弹窗并加载数据
		showAnnouncementModal.value = true;
		refreshAnnouncements();
	}
}

function closeAnnouncements() {
	showAnnouncementModal.value = false;
}

// 当前组件对应的页面是否可见
let isPageVisible = false;

const handleOpenAnnouncements = () => {
	if (isPageVisible) {
		openAnnouncements();
	}
};

onMounted(() => {
	isPageVisible = true;
	uni.$on('openAnnouncements', handleOpenAnnouncements);
});

onUnmounted(() => {
	isPageVisible = false;
	uni.$off('openAnnouncements', handleOpenAnnouncements);
});

onShow(() => {
	isPageVisible = true;
});

onHide(() => {
	isPageVisible = false;
});
</script>

<style scoped>
.page-title-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
}

.page-title-text {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
	min-width: 0;
}

.page-title-extra {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
}

.page-card__body {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

@media (min-width: 900px) {
	.page-card__body {
		gap: 16px;
	}
}

/* 公告弹窗样式 */
.announcement-modal .tm-text {
	line-height: 1.6;
}

.announcement-modal .modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.announcement-list {
	max-height: 50vh;
	overflow-y: auto;
}
</style>

<style scoped>
.page-title-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
}

.page-title-text {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
	min-width: 0;
}

.page-title-extra {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
}

.page-card__body {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

@media (min-width: 900px) {
	.page-card__body {
		gap: 16px;
	}
}
</style>
