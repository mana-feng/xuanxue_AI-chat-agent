<script setup lang="ts">
import { onPageNotFound } from '@dcloudio/uni-app';

// 未匹配到页面时统一回到首页
onPageNotFound(() => {
	uni.redirectTo({
		url: '/pages/index/index'
	});
});
</script>

<style>
/* #ifdef APP-NVUE */
@import './libs/tmui/scss/nvue.css';
/* #endif */
/* #ifndef APP-NVUE */
@import './libs/tmui/scss/noNvue.css';
/* #endif */

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
	overflow-x: hidden;
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

/* 导航栏响应式样式 */
.tmNavbar {
	width: 100% !important;
	max-width: 100% !important;
	box-sizing: border-box !important;
	left: 0 !important;
	right: 0 !important;
	top: 0 !important;
}

.tmNavbarBg {
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
	right: 0 !important;
	width: 100% !important;
	z-index: 0 !important;
}

.tmNavbarContentBox {
	width: 100% !important;
	max-width: 100% !important;
	box-sizing: border-box !important;
}

.tmNavbarContent {
	width: 100% !important;
	max-width: 100% !important;
	box-sizing: border-box !important;
	padding: 0 !important;
}

.tmNavbarLeft {
	flex-shrink: 0 !important;
	min-width: auto !important;
}

.tmNavbarRight {
	flex-shrink: 0 !important;
	min-width: auto !important;
	overflow: visible !important;
	max-width: none !important;
	visibility: visible !important;
	opacity: 1 !important;
	z-index: 10 !important;
}

.tmNavbarTtitle {
	flex: 1 !important;
	min-width: 0 !important;
	overflow: hidden !important;
}

/* 小屏幕导航栏适配 */
@media screen and (max-width: 600px) {
	.tmNavbarContent {
		padding: 0 12px !important;
	}
	
	.tmNavbarLeft {
		width: auto !important;
		min-width: 60px !important;
	}
	
	.tmNavbarRight {
		width: auto !important;
		min-width: 120px !important;
	}
}

/* 中等屏幕导航栏适配 */
@media screen and (min-width: 601px) and (max-width: 900px) {
	.tmNavbarContent {
		padding: 0 16px !important;
	}
	
	.tmNavbarLeft {
		width: auto !important;
		min-width: 80px !important;
	}
	
	.tmNavbarRight {
		width: auto !important;
		min-width: 150px !important;
	}
}

/* 大屏幕导航栏适配 */
@media screen and (min-width: 901px) {
	.tmNavbarContent {
		padding: 0 20px !important;
	}
	
	.tmNavbarLeft {
		width: auto !important;
		min-width: 100px !important;
	}
	
	.tmNavbarRight {
		width: auto !important;
		min-width: 180px !important;
	}
}

/* 页面统一容器：水平居中，顶部对齐，更符合含导航栏页面的常规布局 */
.page-wrapper {
	min-height: 100vh;
	width: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
	box-sizing: border-box;
	padding: 20px 0 30px;
}

/* 以 1200px 为基准宽度缩放，始终水平居中并铺满宽度 */
.page-content-scale {
	width: 100%;
	max-width: 1200px;
	box-sizing: border-box;
	padding: 0 16px;
}

/* 小屏幕时适当压缩上下留白，左右由 max-width 控制 */
@media (max-width: 600px) {
	.page-wrapper {
		padding-top: 12px;
		padding-bottom: 16px;
	}
}
/* #endif */

@font-face{
	font-family: PingFangSC-Medium;
	src: url('./assets/fonts/pingfang-font.ttf')
}

view,
text,
label,
input,
uni-view,
uni-text,
uni-label,
uni-input {
	font-family: 'PingFangSC-Medium';
}
</style>
