import { ref } from 'vue';
import { getSystemInfo } from '@/utils/platform';

const uiScale = ref(1);
let hasInitialized = false;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function computeScale(windowWidth: number) {
	const baseWidth = 375;
	if (!Number.isFinite(windowWidth) || windowWidth <= 0) return 1;
	const ratio = windowWidth / baseWidth;
	return clamp(Math.sqrt(ratio), 0.9, 1.5);
}

function syncUiScale(windowWidth?: number) {
	const width = typeof windowWidth === 'number' ? windowWidth : getSystemInfo().windowWidth;
	uiScale.value = computeScale(width);
}

export const useUiScale = () => {
	if (!hasInitialized) {
		hasInitialized = true;
		try {
			syncUiScale();
			if (typeof uni !== 'undefined' && typeof uni.onWindowResize === 'function') {
				uni.onWindowResize((res: any) => {
					const width = res?.size?.windowWidth ?? getSystemInfo().windowWidth;
					syncUiScale(width);
				});
			}
		} catch {
			uiScale.value = 1;
		}
	}
	return uiScale;
};
