<template>
	<view :class="['method-card', { active }]" @tap="$emit('select')">
		<tm-icon :name="icon" :font-size="34" color="#667eea"></tm-icon>
		<tm-text :font-size="20" bold :label="text" _style="line-height:1.35;" _class="method-card__title"></tm-text>
	</view>
</template>

<script lang="ts" setup>
defineProps({
	text: { type: String, required: true },
	icon: { type: String, required: true },
	desc: { type: String, required: true },
	active: { type: Boolean, default: false }
});

defineEmits(['select']);
</script>

<style scoped>
.method-card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6px;
	padding: 14px;
	border-radius: 10px;
	background: transparent;
	border: 1px solid transparent;
	cursor: pointer;
}
.method-card.active {
	background: linear-gradient(90deg, rgba(102,126,234,0.06), rgba(118,75,162,0.04));
	border-color: rgba(102,126,234,0.12);
}
</style>
