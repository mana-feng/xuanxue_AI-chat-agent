<template>
	<tm-navbar hideHome title="">
		<template v-slot:left>
		</template>
		<template v-slot:right>
			<view class="flex flex-center flex-row">
				<tm-icon
					:font-size="42"
					:color="store.tmStore.dark ? 'yellow' : 'yellow'"
					:name="store.tmStore.dark ? 'tmicon-ios-sunny' : 'tmicon-md-moon'"
					@click="onChangeDark"
				></tm-icon>
				<tm-button
					class="ml-20"
					size="small"
					type="primary"
					:margin="[0, 0]"
					:padding="[22, 6]"
					shape="round"
					label="登录 / 注册"
					@tap="onAuthClick"
				></tm-button>
			</view>
		</template>
	</tm-navbar>
</template>

<script lang="ts" setup>
import { useTmpiniaStore } from '@/tmui/tool/lib/tmpinia';

const store = useTmpiniaStore();
const emit = defineEmits<{
	(e: 'open-auth', mode: 'login' | 'register'): void
}>();

const onChangeDark = () => store.setTmVuetifyDark(!store.tmStore.dark);
const onAuthClick = () => emit('open-auth', 'login');
</script>
