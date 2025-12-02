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
@import './tmui/scss/nvue.css';
/* #endif */
/* #ifndef APP-NVUE */
@import './tmui/scss/noNvue.css';
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

/* 页面统一容器：水平居中，顶部对齐，更符合含导航栏页面的常规布局 */
.page-wrapper {
	min-height: 100vh;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: flex-start;
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
	src: url('./static/font/pingfang-font.ttf')
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