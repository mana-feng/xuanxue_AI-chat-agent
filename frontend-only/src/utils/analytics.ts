export interface PageViewData {
	url: string;
	referrer?: string;
	title?: string;
	userAgent: string;
	screenWidth: number;
	screenHeight: number;
	viewportWidth: number;
	viewportHeight: number;
	deviceType: 'mobile' | 'tablet' | 'desktop';
	browser: string;
	browserVersion: string;
	os: string;
	osVersion: string;
	language: string;
	charset: string;
	colorDepth: number;
	pixelRatio: number;
	touchSupport: boolean;
	connectionType: string;
	downlinkSpeed: number;
	timezone: string;
	loadTime: number;
	domContentLoadedTime: number;
	fcpTime: number;
	isEntryPage: boolean;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmTerm?: string;
	utmContent?: string;
	referrerType: 'direct' | 'search' | 'social' | 'internal' | 'external' | 'email' | 'other';
	searchEngine?: string;
	searchKeyword?: string;
	timestamp: number;
	isLoggedIn: boolean;
	username?: string | null;
}

let pageViewEndpoint = '/api/stats/pageview';
let pvid: string | null = null;
let sessionId: string | null = null;
let sessionStartTime = 0;
let pageViewsInSession = 0;

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}

function getSessionId(): string {
	if (sessionId) return sessionId;
	sessionId = sessionStorage.getItem('stats_session_id');
	if (!sessionId) {
		sessionId = generateId();
		sessionStorage.setItem('stats_session_id', sessionId);
	}
	return sessionId;
}

function getPvid(): string {
	if (pvid) return pvid;
	pvid = localStorage.getItem('stats_pvid');
	if (!pvid) {
		pvid = generateId();
		localStorage.setItem('stats_pvid', pvid);
	}
	return pvid;
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
	if (typeof window === 'undefined') return 'desktop';
	const width = window.innerWidth;
	if (width < 768) return 'mobile';
	if (width < 1024) return 'tablet';
	return 'desktop';
}

function parseBrowserInfo(ua: string): { browser: string; browserVersion: string; os: string; osVersion: string } {
	let browser = 'Unknown';
	let browserVersion = '';
	let os = 'Unknown';
	let osVersion = '';

	if (!ua) return { browser, browserVersion, os, osVersion };

	const uaLower = ua.toLowerCase();

	if (uaLower.includes('edg/')) {
		browser = 'Edge';
		browserVersion = ua.match(/edg\/(\d+\.?\d*)/)?.[1] || '';
	} else if (uaLower.includes('chrome') && !uaLower.includes('opr/')) {
		browser = 'Chrome';
		browserVersion = ua.match(/chrome\/(\d+\.?\d*)/)?.[1] || '';
	} else if (uaLower.includes('firefox')) {
		browser = 'Firefox';
		browserVersion = ua.match(/firefox\/(\d+\.?\d*)/)?.[1] || '';
	} else if (uaLower.includes('safari') && !uaLower.includes('chrome')) {
		browser = 'Safari';
		browserVersion = ua.match(/version\/(\d+\.?\d*)/)?.[1] || '';
	} else if (uaLower.includes('opera') || uaLower.includes('opr/')) {
		browser = 'Opera';
		browserVersion = ua.match(/(?:opera|opr)\/(\d+\.?\d*)/)?.[1] || '';
	} else if (uaLower.includes('msie') || uaLower.includes('trident')) {
		browser = 'IE';
		browserVersion = ua.match(/(?:msie |rv:)(\d+\.?\d*)/)?.[1] || '';
	}

	if (uaLower.includes('windows nt 10')) { os = 'Windows'; osVersion = '10'; }
	else if (uaLower.includes('windows nt 6.3')) { os = 'Windows'; osVersion = '8.1'; }
	else if (uaLower.includes('windows nt 6.2')) { os = 'Windows'; osVersion = '8'; }
	else if (uaLower.includes('windows nt 6.1')) { os = 'Windows'; osVersion = '7'; }
	else if (uaLower.includes('mac os x')) {
		os = 'macOS';
		osVersion = ua.match(/mac os x (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
	} else if (uaLower.includes('android')) {
		os = 'Android';
		osVersion = ua.match(/android (\d+\.?\d*)/)?.[1] || '';
	} else if (uaLower.includes('iphone os')) {
		os = 'iOS';
		osVersion = ua.match(/iphone os (\d+_?\d*_?\d*)/)?.[1]?.replace(/_/g, '.') || '';
	} else if (uaLower.includes('ipad')) {
		os = 'iPadOS';
		osVersion = ua.match(/cpu os (\d+_?\d*)_?/)?.[1]?.replace(/_/g, '.') || '';
	} else if (uaLower.includes('linux')) {
		os = 'Linux';
		osVersion = '';
	}

	return { browser, browserVersion, os, osVersion };
}

function getConnectionInfo(): { type: string; downlink: number } {
	try {
		const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
		if (conn) {
			return {
				type: conn.effectiveType || 'unknown',
				downlink: conn.downlink || 0,
			};
		}
	} catch (e) {
		// ignore network info errors
	}
	return { type: '', downlink: 0 };
}

function getPerformanceMetrics(): { loadTime: number; domContentLoadedTime: number; fcpTime: number } {
	const result = { loadTime: 0, domContentLoadedTime: 0, fcpTime: 0 };
	try {
		const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		if (perf) {
			result.loadTime = Math.round(perf.loadEventEnd - perf.fetchStart);
			result.domContentLoadedTime = Math.round(perf.domContentLoadedEventEnd - perf.fetchStart);
		}
		const paintEntries = performance.getEntriesByType('paint');
		for (const entry of paintEntries) {
			if (entry.name === 'first-contentful-paint') {
				result.fcpTime = Math.round(entry.startTime);
			}
		}
	} catch (e) {
		// ignore performance metrics errors
	}
	return result;
}

function parseUTMParams(url: string): Record<string, string> {
	try {
		const u = new URL(url);
		const params: Record<string, string> = {};
		const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
		for (const key of utmKeys) {
			const val = u.searchParams.get(key);
			if (val) params[key] = val;
		}
		return params;
	} catch (e) {
		return {};
	}
}

function classifyReferrer(referrer: string): { type: 'direct' | 'search' | 'social' | 'internal' | 'external' | 'email' | 'other'; engine?: string; keyword?: string } {
	if (!referrer || referrer === '') return { type: 'direct' };

	try {
		const refUrl = new URL(referrer);
		const hostname = refUrl.hostname.toLowerCase();

		const currentHost = typeof location !== 'undefined' ? location.hostname : '';
		if (hostname === currentHost || hostname.endsWith('.' + currentHost)) {
			return { type: 'internal' };
		}

		const searchEngines: Record<string, string> = {
			'google.com': 'Google',
			'google.com.hk': 'Google',
			'google.co.jp': 'Google',
			'baidu.com': 'Baidu',
			'bing.com': 'Bing',
			'sogou.com': 'Sogou',
			'360.cn': '360 Search',
			'yandex.com': 'Yandex',
			'duckduckgo.com': 'DuckDuckGo',
			'yahoo.com': 'Yahoo',
		};

		for (const [domain, name] of Object.entries(searchEngines)) {
			if (hostname === domain || hostname.endsWith('.' + domain)) {
				const keyword = refUrl.searchParams.get('q')
					|| refUrl.searchParams.get('wd')
					|| refUrl.searchParams.get('keyword')
					|| refUrl.searchParams.get('p')
					|| '';
				return { type: 'search', engine: name, keyword: keyword || undefined };
			}
		}

		const socialNetworks = [
			'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
			'weibo.com', 'zhihu.com', 'douyin.com', 'tiktok.com', 'youtube.com',
			'pinterest.com', 'reddit.com', 'tumblr.com', 'vk.com', 'telegram.org',
		];
		if (socialNetworks.some(s => hostname === s || hostname.endsWith('.' + s))) {
			return { type: 'social' };
		}

		if (hostname.includes('mail.') || hostname.includes('outlook') || hostname.includes('gmail')) {
			return { type: 'email' };
		}

		return { type: 'external' };
	} catch (e) {
		return { type: 'other' };
	}
}

export function collectPageView(data: Partial<PageViewData> = {}): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;
	if (!navigator) return;

	console.log('[Analytics] Collecting page view...');

	const browserInfo = parseBrowserInfo(navigator.userAgent || '');
	const connectionInfo = getConnectionInfo();
	const perfMetrics = getPerformanceMetrics();
	const utmParams = parseUTMParams(data.url || window.location.href);
	const refInfo = classifyReferrer(data.referrer || document.referrer || '');

	// 获取用户登录状态
	let isLoggedIn = false;
	let username: string | null = null;
	try {
		// 尝试从 storage 中获取用户信息
		let userInfo: any = null;
		if (typeof uni !== 'undefined' && uni.getStorageSync) {
			// uni-app 环境
			userInfo = uni.getStorageSync('user_info');
		} else if (typeof localStorage !== 'undefined') {
			// Web 环境
			const stored = localStorage.getItem('user_info');
			if (stored) {
				userInfo = JSON.parse(stored);
			}
		}
		if (userInfo) {
			isLoggedIn = true;
			username = userInfo.username || userInfo.email || null;
		}
	} catch (e) {
		// 忽略错误
	}

	pageViewsInSession++;
	if (pageViewsInSession === 1 && !sessionStartTime) {
		sessionStartTime = Date.now();
	}

	const pageData: PageViewData = {
		url: data.url || window.location.href,
		referrer: data.referrer || document.referrer || '',
		title: data.title || document.title || '',
		userAgent: data.userAgent || navigator.userAgent || '',
		screenWidth: data.screenWidth || window.screen.width,
		screenHeight: data.screenHeight || window.screen.height,
		viewportWidth: data.viewportWidth || window.innerWidth,
		viewportHeight: data.viewportHeight || window.innerHeight,
		deviceType: getDeviceType(),
		browser: data.browser || browserInfo.browser,
		browserVersion: data.browserVersion || browserInfo.browserVersion,
		os: data.os || browserInfo.os,
		osVersion: data.osVersion || browserInfo.osVersion,
		language: data.language || navigator.language || '',
		charset: data.charset || document.characterSet || 'UTF-8',
		colorDepth: data.colorDepth || window.screen.colorDepth || 24,
		pixelRatio: data.pixelRatio || window.devicePixelRatio || 1,
		touchSupport: typeof data.touchSupport !== 'undefined' ? data.touchSupport : ('ontouchstart' in window || navigator.maxTouchPoints > 0),
		connectionType: data.connectionType || connectionInfo.type,
		downlinkSpeed: data.downlinkSpeed || connectionInfo.downlink,
		timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '',
		loadTime: data.loadTime || perfMetrics.loadTime,
		domContentLoadedTime: data.domContentLoadedTime || perfMetrics.domContentLoadedTime,
		fcpTime: data.fcpTime || perfMetrics.fcpTime,
		isEntryPage: typeof data.isEntryPage !== 'undefined' ? data.isEntryPage : (pageViewsInSession === 1),
		utmSource: data.utmSource || utmParams.utm_source,
		utmMedium: data.utmMedium || utmParams.utm_medium,
		utmCampaign: data.utmCampaign || utmParams.utm_campaign,
		utmTerm: data.utmTerm || utmParams.utm_term,
		utmContent: data.utmContent || utmParams.utm_content,
		referrerType: data.referrerType || refInfo.type,
		searchEngine: data.searchEngine || refInfo.engine,
		searchKeyword: data.searchKeyword || refInfo.keyword,
		timestamp: Date.now(),
		isLoggedIn,
		username,
	};

	const payload = {
		...pageData,
		sessionId: getSessionId(),
		pvid: getPvid(),
		sessionDuration: pageViewsInSession > 1 ? Math.round((Date.now() - sessionStartTime) / 1000) : 0,
	};

	console.log('[Analytics] Sending pageview data:', payload);

	sendBeacon(pageViewEndpoint, payload);
}

function sendBeacon(url: string, data: any): void {
	try {
		const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
		const success = navigator.sendBeacon(url, blob);
		console.log('[Analytics] SendBeacon result:', success ? 'success' : 'failed');
	} catch (e) {
		console.warn('[Analytics] Stats send failed:', e);
	}
}

export function trackPageView(): void {
	collectPageView();
}

export function setStatsEndpoint(endpoint: string): void {
	pageViewEndpoint = endpoint;
}