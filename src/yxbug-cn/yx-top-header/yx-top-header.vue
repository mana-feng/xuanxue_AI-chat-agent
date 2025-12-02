<template>
	<tm-sheet :round="0" :shadow="0" :margin="[0, 0]" :padding="[18, 0]">
		<view class="flex flex-wrap items-center">
			<view style="width: 96px;" class="mb-10">
				<tm-image class="rounded" src="./static/icon/logo.svg" :width="96" :height="96"></tm-image>
			</view>
			<view class="flex-1 pl-20">
				<tm-text _class="font-weight-b" label="" class="flex-start pb-10" :font-size="38"></tm-text>
				<tm-text class="flex-start" label=""></tm-text>
			</view>
		</view>
	</tm-sheet>
</template>
