<template>
	<tm-button
		class="btn-gradient"
		:size="size"
		color="soft-blue"
		linear="right"
		:round="round"
		:padding="padding"
		:margin="margin"
		:block="block"
		:loading="loading"
		:disabled="disabled"
		:label="label"
		:icon="icon"
	>
		<slot />
	</tm-button>
</template>

<script setup lang="ts">
import { PropType } from 'vue';

type BtnSize = 'mini' | 'small' | 'normal' | 'middle' | 'large' | 'block';

defineProps({
	size: {
		type: String as PropType<BtnSize>,
		default: 'small'
	},
	label: {
		type: String,
		default: ''
	},
	icon: {
		type: String,
		default: ''
	},
	loading: {
		type: Boolean,
		default: false
	},
	disabled: {
		type: Boolean,
		default: false
	},
	block: {
		type: Boolean,
		default: false
	},
	round: {
		type: Number,
		default: 12
	},
	padding: {
		type: Array as PropType<number[]>,
		default: () => [18, 22]
	},
	margin: {
		type: Array as PropType<number[]>,
		default: () => [0, 0, 0, 0]
	}
});
</script>


