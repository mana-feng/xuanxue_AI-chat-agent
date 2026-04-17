import { ref } from 'vue';

type LayoutMode = 'layout-compact' | 'layout-medium' | 'layout-wide';

// 统一断点标准 (与 responsive-layout.css 保持一致)
const BREAKPOINT_XS = 640;
const BREAKPOINT_SM = 768;
const BREAKPOINT_MD = 1024;
const BREAKPOINT_LG = 1280;

const MODES: LayoutMode[] = ['layout-compact', 'layout-medium', 'layout-wide'];

const SCALE_MIN = 0.6;
const SCALE_MAX = 1;

const uiScale = ref(1);

const getMode = (width: number): LayoutMode => {
	// 使用标准断点：640px/768px/1024px/1280px
	if (width >= BREAKPOINT_LG) return 'layout-wide';
	if (width >= BREAKPOINT_SM) return 'layout-medium';
	return 'layout-compact';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getScale = (width: number) => {
	if (!width) return SCALE_MAX;
	// 768px 以上不缩放，以下按比例缩放
	if (width >= BREAKPOINT_SM) return SCALE_MAX;
	return clamp(width / BREAKPOINT_SM, SCALE_MIN, SCALE_MAX);
};

const applyMode = (mode: LayoutMode) => {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const body = document.body;
	if (!root || !body) return;

	MODES.forEach((item) => {
		root.classList.remove(item);
		body.classList.remove(item);
	});
	root.classList.add(mode);
	body.classList.add(mode);
};

const applyScale = (width: number) => {
	uiScale.value = getScale(width);
	if (typeof document !== 'undefined') {
		document.documentElement?.style.setProperty('--ui-scale', uiScale.value.toString());
	}
};

export const useUiScale = () => uiScale;

export const setupViewportWatcher = () => {
	if (typeof window === 'undefined') return;

	let rafId = 0;
	const update = () => {
		const width = window.innerWidth || 0;
		applyMode(getMode(width));
		applyScale(width);
	};

	const schedule = () => {
		if (rafId) {
			window.cancelAnimationFrame(rafId);
		}
		rafId = window.requestAnimationFrame(update);
	};

	if (document.readyState === 'loading') {
		window.addEventListener('DOMContentLoaded', update, { once: true });
	} else {
		update();
	}

	window.addEventListener('resize', schedule);
};
