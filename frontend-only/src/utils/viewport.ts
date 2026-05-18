import { ref } from 'vue';
import { getSystemInfo } from '@/utils/platform';

const uiScale = ref(1);
let hasInitialized = false;

// 统一断点标准
const BREAKPOINT_SM = 768;
const BREAKPOINT_BASE = 375;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function computeScale(windowWidth: number) {
	// 优化缩放逻辑：避免大屏过度放大
	if (!Number.isFinite(windowWidth) || windowWidth <= 0) return 1;
	
	// 768px 以上不缩放，保持 1.0
	if (windowWidth >= BREAKPOINT_SM) return 1;
	
	// 375px-768px 之间按平方根缩放，范围 0.9-1.0
	if (windowWidth >= BREAKPOINT_BASE) {
		const ratio = windowWidth / BREAKPOINT_BASE;
		return clamp(Math.sqrt(ratio), 0.9, 1);
	}
	
	// 375px 以下最小缩放到 0.9
	return 0.9;
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
