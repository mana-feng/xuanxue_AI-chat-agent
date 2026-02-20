import rawGuaci from './data/guaci.json';
import { TRIGRAM_LABEL } from './najiaConst';

type GuaciEntry = {
	name?: string;
	zhuguaName?: string;
	guaci?: string;
	guaciDetailed?: any;
	yaoci?: any;
	text?: string;
};

// Support both formats: old { "111111": { name, text } } and new array [{ zhuguaName, guaci, ... }]
const guaciByMark: Record<string, GuaciEntry> = {};
const guaciByName: Record<string, GuaciEntry> = {};

if (Array.isArray(rawGuaci)) {
	// array format: map by zhuguaName and name if present,
	// and attempt to build a mark-index by matching trigram names
	(rawGuaci as GuaciEntry[]).forEach((entry) => {
		const nameKey = entry.zhuguaName || entry.name;
		if (!nameKey) return;

		// build a friendly text field by combining guaci, guaciDetailed and yaoci
		const lines: string[] = [];
		if (entry.guaci) lines.push(entry.guaci);
		if (Array.isArray(entry.guaciDetailed)) {
			entry.guaciDetailed.forEach((d: any) => {
				if (d.guaciDetailed1) lines.push(d.guaciDetailed1.trim());
				if (d.guaciDetailed2) lines.push(d.guaciDetailed2.trim());
			});
		}
		if (Array.isArray(entry.yaoci)) {
			entry.yaoci.forEach((y: any) => {
				if (y.yao) lines.push(y.yao);
			});
		}
		const enriched: GuaciEntry = { ...entry, text: lines.join('\n') };

		guaciByName[nameKey] = enriched;
		// if entry contains a code array like [1,1,1,0,1,0] or a string code '111010', map it by mark
		if (Array.isArray((entry as any).code) && (entry as any).code.length === 6) {
			const mark = (entry as any).code.slice().reverse().map((n: any) => String(n)).join('');
			if (mark && !guaciByMark[mark]) {
				guaciByMark[mark] = enriched;
			}
		} else if (typeof (entry as any).code === 'string' && (entry as any).code.length === 6) {
			const mark = (entry as any).code.split('').reverse().join('');
			if (!guaciByMark[mark]) {
				guaciByMark[mark] = enriched;
			}
		}
	});

	// lazy-load mapping by mark using trigram labels if available
	if (TRIGRAM_LABEL && typeof TRIGRAM_LABEL === 'object') {
		const trigramCodes = Object.keys(TRIGRAM_LABEL);
		const arr = rawGuaci as GuaciEntry[];
		trigramCodes.forEach((upper) => {
			trigramCodes.forEach((lower) => {
				// mark 采用下卦在前、上卦在后
				const mark = `${lower}${upper}`;
				const altMark = `${upper}${lower}`;
				// try to find entry whose zhuguaName includes both trigram names or exact match
				const upperName = TRIGRAM_LABEL[upper]?.name || '';
				const lowerName = TRIGRAM_LABEL[lower]?.name || '';
				const found = arr.find((e: any) => {
					const n = (e?.zhuguaName || e?.name || '').replace(/\s+/g, '');
					return upperName && lowerName && n.indexOf(upperName) !== -1 && n.indexOf(lowerName) !== -1;
				});
				if (found) {
					const foundNameKey = (found.zhuguaName || found.name);
					if (foundNameKey) {
						guaciByMark[mark] = guaciByName[foundNameKey] || found;
						guaciByMark[altMark] = guaciByName[foundNameKey] || found; // 兼容上卦在前的标记
					} else {
						guaciByMark[mark] = found;
						guaciByMark[altMark] = found;
					}
				}
			});
		});
	}
} else {
	// object format keyed by mark
	const obj = rawGuaci as Record<string, GuaciEntry>;
	Object.keys(obj).forEach((mark) => {
		const entry = obj[mark];
		guaciByMark[mark] = entry;
		const nameKey = entry?.name || entry?.zhuguaName;
		if (nameKey) guaciByName[nameKey] = entry;
	});
}

export function getGuaci(markOrName: string) {
	if (!markOrName) return '';
	// try by mark first
	if (guaciByMark[markOrName]?.text) return guaciByMark[markOrName].text || '';
	// try by name (exact)
	if (guaciByName[markOrName]?.guaci) return guaciByName[markOrName].guaci || guaciByName[markOrName].text || '';
	if (guaciByName[markOrName]?.text) return guaciByName[markOrName].text || '';
	// fallback message
	return `${markOrName}：暂无卦辞数据，后续将补充完整文本。`;
}

export function getGuaName(mark: string) {
	return guaciByMark[mark]?.name || guaciByMark[mark]?.zhuguaName || '';
}

export function getGuaciEntry(markOrName: string): GuaciEntry | null {
	if (!markOrName) return null;
	// try exact mark first
	if (guaciByMark[markOrName]) return guaciByMark[markOrName];
	// try name exact
	if (guaciByName[markOrName]) return guaciByName[markOrName];
	// try normalized matches
	const normalized = (s: string) => s.replace(/\s+/g, '').toLowerCase();
	const target = normalized(markOrName);
	// check marks (already keys)
	for (const m of Object.keys(guaciByMark)) {
		if (normalized(m) === target) return guaciByMark[m];
	}
	for (const n of Object.keys(guaciByName)) {
		if (normalized(n) === target) return guaciByName[n];
	}
	return null;
}

export function getCanonicalNameByName(name: string) {
	if (!name) return '';
	if (guaciByName[name]) return guaciByName[name].name || guaciByName[name].zhuguaName || '';
	// try fuzzy match (ignore spaces)
	const key = Object.keys(guaciByName).find(k => k.replace(/\s+/g, '') === name.replace(/\s+/g, ''));
	if (key) return guaciByName[key].name || guaciByName[key].zhuguaName || '';
	return '';
}
