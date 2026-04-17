<template>
	<tm-app>
		<PageScaffold class="page-about" title="关于" subtitle="一段关于作者的玄学求学故事">
			<SectionBlock icon="tmicon-md-bulb" title="作者经历">
				<view class="diploma-wrapper">
					<image class="diploma-image" src="@/static/icons/diploma.png" mode="widthFix"></image>
				</view>
				<tm-text class="about-text" :font-size="26" color="#334155" label="作者在 Wild Chinken University 完成玄学方向博士（PhD）学习，主攻传统命理的现代化表达与应用。"></tm-text>
				<tm-text class="about-text" :font-size="24" color="#64748b" label="这段求学历程强调“古法与现代工具结合”，在严谨的学术训练中，将八字、六爻的经典体系与可视化表达融合。"></tm-text>
				<tm-text class="about-text" :font-size="24" color="#64748b" label="如今，玄学 AI 便是这段研究的延伸：让排盘与解析更易用、更清晰，也更具可解释性。"></tm-text>
			</SectionBlock>
			<SectionBlock icon="tmicon-md-book" title="学习片段">
				<tm-text class="about-text" :font-size="24" color="#64748b" label="• 在校期间完成《传统命理的结构化表达》与《六爻信息层级模型》两门核心课题。"></tm-text>
				<tm-text class="about-text" :font-size="24" color="#64748b" label="• 建立“排盘一致性标准”，确保不同历法与算法下的输出稳定可追溯。"></tm-text>
				<tm-text class="about-text" :font-size="24" color="#64748b" label="• 以“人可读”的方式呈现推演逻辑，让分析过程更透明。"></tm-text>
			</SectionBlock>
		</PageScaffold>
	</tm-app>
</template>

<script setup lang="ts">
import PageScaffold from '@/components/layout/PageScaffold.vue';
import SectionBlock from '@/components/layout/SectionBlock.vue';
</script>

<style scoped>
.page-about .section__body .about-text + .about-text {
	margin-top: 8px;
}

.page-about .diploma-wrapper {
	width: 100%;
	display: flex;
	justify-content: center;
	padding: 6px 0 4px;
}

.page-about .diploma-image {
	width: min(100%, 520px);
	border-radius: 12px;
	border: 1px solid #e2e8f0;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}
</style>
