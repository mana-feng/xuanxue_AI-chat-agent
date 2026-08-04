<template>
	<view class="yao-chart">
		<view class="yao-chart__head">
			<text class="head-cell head-god">六神</text>
			<text class="head-cell head-main">本卦</text>
			<text v-if="hasBian" class="head-cell head-bian">变卦</text>
		</view>

		<view
			v-for="row in rows"
			:key="row.id"
			class="yao-line"
			:class="{ 'yao-line--moving': row.moving }"
		>
			<view class="yao-col yao-col--god">
				<text class="order-text">{{ row.order }}</text>
				<text class="god-text">{{ row.liushen }}</text>
			</view>

			<view class="yao-col yao-col--main">
				<view class="najia">
					<text class="najia-text">{{ row.relation }}</text>
					<text v-if="row.hidden" class="najia-hidden">伏 {{ row.hidden }}</text>
				</view>
				<view class="bar-area">
					<view class="bar-wrap">
						<view v-if="row.mainYang" class="bar bar--full"></view>
						<view v-else class="bar-split">
							<view class="bar bar--half"></view>
							<view class="bar bar--half"></view>
						</view>
					</view>
					<text class="move-mark">{{ row.moving ? (row.mainYang ? '○' : '×') : '' }}</text>
				</view>
				<text v-if="row.mainRole" class="role-badge">{{ row.mainRole }}</text>
				<text v-else class="role-placeholder"></text>
			</view>

			<view v-if="hasBian" class="yao-col yao-col--bian">
				<view class="bar-wrap bar-wrap--bian">
					<view v-if="row.bianYang" class="bar bar--full bar--bian"></view>
					<view v-else class="bar-split">
						<view class="bar bar--half bar--bian"></view>
						<view class="bar bar--half bar--bian"></view>
					</view>
				</view>
				<text class="najia-text najia-text--bian">{{ row.bianRelation }}</text>
				<text v-if="row.bianRole" class="role-badge role-badge--bian">{{ row.bianRole }}</text>
				<text v-else class="role-placeholder"></text>
			</view>
		</view>

		<view class="yao-chart__legend">
			<text class="legend-item">▬▬ 阳爻</text>
			<text class="legend-item">▬ ▬ 阴爻</text>
			<text v-if="hasBian" class="legend-item legend-item--move">○ / × 动爻</text>
			<text v-else class="legend-item">本卦为静卦，无动爻与变卦</text>
		</view>
	</view>
</template>

<script lang="ts" setup>
defineProps({
	rows: { type: Array as () => any[], default: () => [] },
	// 静卦（无动爻）时没有变卦，需整列隐藏，否则会渲染出一个并不存在的全阴变卦
	hasBian: { type: Boolean, default: false },
});
</script>

<style scoped>
/* 该项目运行在 nvue 兼容模式下，view 默认 flex-direction: column，
   所有横向排列必须显式声明 row，否则会纵向堆叠。 */
.yao-chart {
	display: flex;
	flex-direction: column;
	width: 100%;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background: #ffffff;
	overflow: hidden;
	box-sizing: border-box;
}

.yao-chart__head {
	display: flex;
	flex-direction: row;
	align-items: center;
	background: #f8fafc;
	border-bottom: 1px solid #e5e7eb;
	padding: 10px 12px;
}

.head-cell {
	font-size: 13px;
	font-weight: 600;
	color: #475569;
}

.head-god {
	width: 64px;
}

.head-main {
	flex: 1;
}

.head-bian {
	flex: 1;
}

.yao-line {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 12px;
	border-bottom: 1px solid #f1f5f9;
}

.yao-line:last-child {
	border-bottom: none;
}

.yao-line--moving {
	background: #fff7f6;
}

.yao-col {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.yao-col--god {
	width: 64px;
	flex-direction: column;
	align-items: flex-start;
}

.order-text {
	font-size: 13px;
	font-weight: 600;
	color: #1f2937;
}

.god-text {
	font-size: 12px;
	color: #64748b;
	margin-top: 2px;
}

.yao-col--main {
	flex: 1;
	gap: 8px;
}

.yao-col--bian {
	flex: 1;
	gap: 8px;
}

.najia {
	display: flex;
	flex-direction: column;
	min-width: 92px;
}

.najia-text {
	font-size: 13px;
	color: #1f2937;
}

.najia-text--bian {
	color: #64748b;
}

.najia-hidden {
	font-size: 11px;
	color: #d54941;
	margin-top: 2px;
}

.bar-area {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 6px;
}

.bar-wrap {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 64px;
}

.bar-wrap--bian {
	opacity: 0.75;
}

.bar-split {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 64px;
	justify-content: space-between;
}

.bar {
	height: 8px;
	border-radius: 2px;
	background: #334155;
}

.bar--full {
	width: 64px;
}

.bar--half {
	width: 26px;
}

.bar--bian {
	background: #94a3b8;
}

.yao-line--moving .bar {
	background: #d54941;
}

.move-mark {
	font-size: 14px;
	font-weight: 700;
	color: #d54941;
	width: 14px;
}

.role-badge {
	font-size: 11px;
	font-weight: 600;
	color: #0052d9;
	background: #e8f1ff;
	border-radius: 999px;
	padding: 2px 8px;
}

.role-badge--bian {
	color: #64748b;
	background: #f1f5f9;
}

.role-placeholder {
	width: 0;
}

.yao-chart__legend {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: 14px;
	padding: 10px 12px;
	background: #f8fafc;
	border-top: 1px solid #e5e7eb;
}

.legend-item {
	font-size: 11px;
	color: #94a3b8;
}

.legend-item--move {
	color: #d54941;
}

/* 窄屏：隐藏纳甲以外的次要信息压缩宽度，避免横向滚动 */
@media (max-width: 480px) {
	.yao-line,
	.yao-chart__head {
		padding: 10px 8px;
	}

	.yao-col--god,
	.head-god {
		width: 48px;
	}

	.najia {
		min-width: 76px;
	}

	.najia-text {
		font-size: 12px;
	}

	.bar-wrap,
	.bar-split,
	.bar--full {
		width: 46px;
	}

	.bar--half {
		width: 18px;
	}
}
</style>
