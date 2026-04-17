import { watch, onUnmounted } from 'vue';
import { useAppConfigStore } from '@/store/appConfig';
import { trackPageView } from '@/utils/analytics';

let is收集已初始化 = false;

function 初始化统计(): void {
	if (is收集已初始化) return;
	is收集已初始化 = true;

	if (typeof window === 'undefined') return;

	trackPageView();

	window.addEventListener('popstate', handlePopState);
	window.addEventListener('hashchange', handleHashChange);

	const originalPushState = history.pushState;
	const originalReplaceState = history.replaceState;

	history.pushState = function (...args) {
		(originalPushState as any).apply(this, args);
		setTimeout(() => trackPageView(), 0);
	};

	history.replaceState = function (...args) {
		(originalReplaceState as any).apply(this, args);
		setTimeout(() => trackPageView(), 0);
	};
}

function handlePopState(): void {
	setTimeout(() => trackPageView(), 0);
}

function handleHashChange(): void {
	setTimeout(() => trackPageView(), 0);
}

function 清理统计(): void {
	if (typeof window === 'undefined') return;
	window.removeEventListener('popstate', handlePopState);
	window.removeEventListener('hashchange', handleHashChange);
	is收集已初始化 = false;
}

export function usePageAnalytics(): void {
	const appConfigStore = useAppConfigStore();

	if (appConfigStore.loaded) {
		初始化统计();
	} else {
		const unwatch = watch(
			() => appConfigStore.loaded,
			(loaded) => {
				if (loaded) {
					初始化统计();
					unwatch();
				}
			}
		);
	}

	onUnmounted(() => {
		清理统计();
	});
}