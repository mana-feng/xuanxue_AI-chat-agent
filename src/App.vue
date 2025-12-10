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

/* 引入响应式布局系统 */
@import './styles/responsive-layout.css';
/* 引入 App Shell 布局系统 */
@import './styles/app-shell.css';

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

/* 以 1200px 为基准宽度缩放，始终水平居中并铺满宽度 */
.page-content-scale {
	width: 100%;
	max-width: 1200px;
	box-sizing: border-box;
	padding: 0 16px;
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