<script setup lang="ts">
import { onMounted } from 'vue';
import { onPageNotFound } from '@dcloudio/uni-app';
import { bootstrapApp, waitBootstrap } from '@/utils/bootstrap';

onPageNotFound(() => {
	uni.redirectTo({
		url: '/pages/auth/auth',
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
/* å…±äº«é¡µé¢æ¨¡å¼ */
@import './styles/page-patterns.css';

/* #ifdef H5 */
html,
body,
uni-app,
#app,
uni-page-body {
	margin: 0;
	padding: 0;
	width: 100%;
	height: 100%;
}

uni-page-body {
	padding-top: 0 !important;
}

uni-page-head,
uni-page-head + .uni-placeholder,
uni-page-head ~ .uni-placeholder {
	display: none !important;
	height: 0 !important;
}

body::-webkit-scrollbar,
div::-webkit-scrollbar,
*::-webkit-scrollbar {
	display: none;
}

body.pages-index-index uni-page-body,
body {
	padding-bottom: 0 !important;
}

/* ensure tm-app fills available width */
tm-app {
	display: block;
	width: 100%;
}

/* �?1200px 为基准宽度缩放，始终水平居中并铺满宽�?*/
.page-content-scale {
	width: 100%;
	max-width: 720px;
	box-sizing: border-box;
	padding: 0 14px;
}

@media (min-width: 900px) {
	.page-content-scale {
		max-width: 980px;
		padding: 0 24px;
	}
}

@media (min-width: 1280px) {
	.page-content-scale {
		max-width: 1200px;
	}
}

@media (min-width: 1600px) {
	.page-content-scale {
		max-width: 1520px;
	}
}

.layout-wide .page-content-scale {
	max-width: 1200px;
	padding: 0 24px;
}

@media (min-width: 1600px) {
	.layout-wide .page-content-scale {
		max-width: 1520px;
	}
}
/* #endif */

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
	/* #ifdef H5 */
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
	/* #endif */
}
</style>
