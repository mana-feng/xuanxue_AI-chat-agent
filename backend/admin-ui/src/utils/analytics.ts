/**
 * 将统计代码片段注入到页面（仅 H5）
 */
export function injectAnalyticsSnippet(snippet: string, key = 'global-analytics'): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;
	const code = (snippet || '').trim();
	if (!code) return;

	// 避免重复注入
	if (document.querySelector(`[data-analytics-key="${key}"]`)) {
		return;
	}

	const marker = document.createElement('div');
	marker.style.display = 'none';
	marker.setAttribute('data-analytics-key', key);

	try {
		const template = document.createElement('template');
		template.innerHTML = code;
		const nodes = Array.from(template.content.childNodes);

		nodes.forEach((node) => {
			if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'SCRIPT') {
				const oldScript = node as HTMLScriptElement;
				const script = document.createElement('script');
				Array.from(oldScript.attributes).forEach((attr) => {
					if (attr.name === 'src') {
						script.src = attr.value;
					} else {
						script.setAttribute(attr.name, attr.value);
					}
				});
				if (oldScript.textContent) {
					script.text = oldScript.textContent;
				}
				script.setAttribute('data-analytics-key', key);
				document.head.appendChild(script);
			} else {
				marker.appendChild(node.cloneNode(true));
			}
		});
		document.body.appendChild(marker);
	} catch (e) {
		console.warn('注入统计代码失败:', (e as Error).message);
	}
}
