<script setup lang="ts">
import { onMounted } from 'vue';
import { onPageNotFound } from '@dcloudio/uni-app';
import { bootstrapApp, waitBootstrap } from '@/utils/bootstrap';

onPageNotFound(() => {
	uni.redirectTo({
		url: '/pages/index/index',
	});
});

onMounted(async () => {
	if (typeof window === 'undefined') return;
	const bootstrapPromise = waitBootstrap();
	if (bootstrapPromise) {
		await bootstrapPromise;
	} else {
		await bootstrapApp();
	}
});
</script>

<style>
/* #ifdef APP-NVUE */
@import './libs/tmui/scss/nvue.css';
/* #endif */
/* #ifndef APP-NVUE */
@import './libs/tmui/scss/noNvue.css';
/* #endif */

/* 引入响应式布局系统 */
@import './styles/responsive-layout.css';
/* 引入 App Shell 布局系统 */
@import './styles/app-shell.css';
/* 引入页面基础图案样式 */
@import './styles/page-patterns.css';

/* #ifdef APP-PLUS */
@font-face {
	font-family: PingFangSC-Medium;
	src: url('@/assets/fonts/pingfang-font.ttf');
}
/* #endif */

view,
text,
label,
input,
uni-view,
uni-text,
uni-label,
uni-input {
	/* #ifdef APP-PLUS */
	font-family: 'PingFangSC-Medium';
	/* #endif */
}
</style>
