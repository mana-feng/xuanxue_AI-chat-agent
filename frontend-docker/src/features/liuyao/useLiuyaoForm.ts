import { computed, ref, watch } from 'vue';
import { Solar } from 'lunar-javascript';
import cnchar from 'cnchar';
import { compileNajia, buildDisplayData } from '@/features/liuyao/najiaCore';
import { GUA64 } from '@/features/liuyao/najiaConst';
import { useLiuyaoStore } from '@/store/liuyao';
import liuyaoService from './service';
import { getYaoName, getYaoSymbol, formatDateTime } from './uiHelpers';

type MethodKey =
	| 'computer'
	| 'number'
	| 'online'
	| 'manual'
	| 'time'
	| 'single'
	| 'double'
	| 'chars'
	| 'gua'
	| 'auto'
	| 'shake';

export function useLiuyaoForm() {
	const methodTabs = [
		{ text: '电脑自动', key: 'computer' as MethodKey },
		{ text: '在线起卦', key: 'online' as MethodKey },
		{ text: '手工指定', key: 'manual' as MethodKey },
		{ text: '时间起卦', key: 'time' as MethodKey },
		{ text: '单数起卦', key: 'single' as MethodKey },
		{ text: '双数起卦', key: 'double' as MethodKey },
		{ text: '汉字起卦', key: 'chars' as MethodKey },
		{ text: '卦名起卦', key: 'gua' as MethodKey }
	];

	const methodIndex = ref(0);

	const form = ref({
		title: '',
		gender: '',
		timeLabel: '',
		num1: '',
		num2: '',
		num3: '',
		manualParams: ['', '', '', '', '', ''],
		autoParams: [] as number[],
		timeParams: [] as number[],
		singleInput: '',
		singleParams: [] as number[],
		double1: '',
		double2: '',
		doubleParams: [] as number[],
		charsInput: '',
		charsParams: [] as number[],
		guaMain: '',
		guaBian: '',
		guaParams: [] as number[]
	});

	const liuyaoStore = useLiuyaoStore();

	const timePickerShow = ref(false);
	const timePickerDefault = ref('');
	const timePick = {
		start: '1900/01/01 00:00',
		end: '2099/12/31 23:59',
		format: 'YYYY/MM/DD HH:mm',
		detail: {
			year: true,
			month: true,
			day: true,
			hour: true,
			minute: true,
			second: false
		}
	};
	const timeSuffix = {
		year: '年',
		month: '月',
		day: '日',
		hour: '时',
		minute: '分',
		second: '秒'
	};

	const yaoOptions = [
		{ label: '请选择', value: '', symbol: '', name: '' },
		{ label: `${getYaoSymbol(0)} ${getYaoName(0)}`, value: 0, symbol: getYaoSymbol(0), name: getYaoName(0) },
		{ label: `${getYaoSymbol(1)} ${getYaoName(1)}`, value: 1, symbol: getYaoSymbol(1), name: getYaoName(1) },
		{ label: `${getYaoSymbol(3)} ${getYaoName(3)}`, value: 3, symbol: getYaoSymbol(3), name: getYaoName(3) },
		{ label: `${getYaoSymbol(4)} ${getYaoName(4)}`, value: 4, symbol: getYaoSymbol(4), name: getYaoName(4) }
	];

	const yaoLabels = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

	function getYaoLabel(index: number): string {
		return yaoLabels[index] || `第${index + 1}爻`;
	}

	function getYaoIndex(index: number): number {
		const value = form.value.manualParams[index];
		if (value === '' || value === null || value === undefined) return 0;
		const optionIndex = yaoOptions.findIndex(opt => String(opt.value) === String(value));
		return optionIndex >= 0 ? optionIndex : 0;
	}

	function getYaoDisplayValue(index: number): string {
		const value = form.value.manualParams[index];
		if (value === '' || value === null || value === undefined) return '请选择';
		const option = yaoOptions.find(opt => String(opt.value) === String(value));
		return option ? option.label : '请选择';
	}

	const currentMethod = computed(() => methodTabs[methodIndex.value] || methodTabs[0]);

	const methodInfo: Record<string, { icon: string; desc: string }> = {
		computer: { icon: 'tmicon-md-cpu', desc: '电脑自动起卦，系统为你随机生成卦象。' },
		online: { icon: 'tmicon-md-hand', desc: '在线起卦，心念专注后点击开始摇卦。' },
		manual: { icon: 'tmicon-md-edit', desc: '手工指定每一爻的状态，适用于精确控制。' },
		time: { icon: 'tmicon-md-time', desc: '按时间起卦，根据选择的时间计算卦象。' },
		single: { icon: 'tmicon-md-list', desc: '单数起卦：输入一组数字生成卦象。' },
		double: { icon: 'tmicon-md-copy', desc: '双数起卦：输入两组数字生成卦象。' },
		chars: { icon: 'tmicon-md-text', desc: '汉字起卦：使用汉字按码点生成卦象。' },
		gua: { icon: 'tmicon-md-book', desc: '卦名起卦：直接选择卦名生成卦象参数。' }
	};
	const currentMethodIcon = computed(() => methodInfo[currentMethod.value.key as string]?.icon || 'tmicon-md-grid');
	const methodDesc = computed(() => methodInfo[currentMethod.value.key as string]?.desc || '');

	function setMethod(idx: number) {
		methodIndex.value = idx;
		onlineMsg.value = '';
	}

// clear generated params when switching methods
function clearGeneratedParams() {
	form.value.autoParams = [];
	form.value.timeParams = [];
	form.value.singleParams = [];
	form.value.doubleParams = [];
	form.value.charsParams = [];
	form.value.guaParams = [];
	form.value.manualParams = ['', '', '', '', '', ''];
}

watch(methodIndex, (newIdx, oldIdx) => {
	if (newIdx === oldIdx) return;
	clearGeneratedParams();
	onlineMsg.value = '';
});

	function parseDate(label: string) {
		if (!label) return null;
		const normalized = label.replace('T', ' ').replace(/\//g, '-');
		const date = new Date(normalized.replace(/-/g, '/'));
		return isNaN(date.getTime()) ? null : date;
	}

	function useNowTime() {
		const now = new Date();
		form.value.timeLabel = formatDateTime(now);
	}

	function openTimePicker() {
		timePickerShow.value = true;
	}

	function onTimeConfirm(val: any) {
		timePickerShow.value = false;
		if (val && val.detail) {
			form.value.timeLabel = val.detail.value;
		}
	}

	function generateTime() {
		const dateObj = parseDate(form.value.timeLabel) || new Date();
		const params = liuyaoService.generateTimeParams(dateObj);
		form.value.timeParams = params;
		uni.showToast({ title: '已生成时间起卦参数', icon: 'none' });
	}

	function generateAuto() {
		form.value.autoParams = liuyaoService.generateAutoParams();
		uni.showToast({ title: '已生成随机参数', icon: 'none', duration: 1500 });
	}

	const shakeActive = ref(false);
	function generateShake() {
		shakeActive.value = true;
		const ANIM_DURATION = 1200;
		setTimeout(() => {
			shakeActive.value = false;
			form.value.autoParams = liuyaoService.generateAutoParams();
			uni.showToast({ title: '摇卦完成', icon: 'none', duration: 1200 });
		}, ANIM_DURATION);
	}

	const onlineActive = ref(false);
	const onlineMsg = ref('');

	function startOnlineShake() {
		if (form.value.autoParams.length >= 6) {
			uni.showToast({ title: '已生成完整卦象', icon: 'none' });
			return;
		}
		onlineActive.value = true;
		onlineMsg.value = '摇卦中...';
		setTimeout(() => {
			onlineActive.value = false;
		}, 300);
		const params = liuyaoService.generateAutoParams();
		const nextIndex = form.value.autoParams.length;
		const nextYao = params[nextIndex];
		form.value.autoParams.push(nextYao);
		onlineMsg.value = `已生成第 ${nextIndex + 1} 爻`;
		if (form.value.autoParams.length === 6) {
			onlineMsg.value = '在线起卦完成';
			uni.showToast({ title: '在线起卦完成', icon: 'none' });
		}
	}

	function generateSingle() {
		let raw = (form.value.singleInput || '').toString().replace(/\D/g, '');
		if (!raw) {
			uni.showToast({ title: '请输入有效数字', icon: 'none' });
			return;
		}
		// limit length for security
		if (raw.length > 20) raw = raw.slice(0, 20);
		
		const len = raw.length;
		// 修正：天清地浊，上卦位数少于或等于下卦
		const mid = Math.floor(len / 2);
		const part1 = raw.slice(0, mid) || raw;
		const part2 = raw.slice(mid) || raw;
		const rawN1 = parseInt(part1, 10) || 0;
		const rawN2 = parseInt(part2, 10) || 0;
		const n1 = (rawN1 % 8) || 8;
		const n2 = (rawN2 % 8) || 8;
		const n3 = ((Math.abs(rawN1) + Math.abs(rawN2)) % 6) || 6;
		const params = liuyaoService.generateNumberParams(n1, n2, n3);
		form.value.singleParams = params;
		uni.showToast({ title: '已生成单数起卦参数', icon: 'none' });
	}

	function generateDouble() {
		let a = (form.value.double1 || '').toString().replace(/\D/g, '');
		let b = (form.value.double2 || '').toString().replace(/\D/g, '');
		if (!a || !b) {
			uni.showToast({ title: '请输入两组有效数字', icon: 'none' });
			return;
		}
		// limit length for security
		if (a.length > 20) a = a.slice(0, 20);
		if (b.length > 20) b = b.slice(0, 20);
		
		const rawN1 = parseInt(a, 10) || 0;
		const rawN2 = parseInt(b, 10) || 0;
		const n1 = (rawN1 % 8) || 8;
		const n2 = (rawN2 % 8) || 8;
		const n3 = ((Math.abs(rawN1) + Math.abs(rawN2)) % 6) || 6;
		const params = liuyaoService.generateNumberParams(n1, n2, n3);
		form.value.doubleParams = params;
		uni.showToast({ title: '已生成双数起卦参数', icon: 'none' });
	}

	function generateChars() {
		const rawAll = (form.value.charsInput || '').toString();
		let chars: string[] = rawAll.match(/[\u4e00-\u9fff]/g) || [];
		if (chars.length < 2) {
			uni.showToast({ title: '请至少输入 2 个汉字', icon: 'none' });
			return;
		}
		// limit length for security
		if (chars.length > 20) chars = chars.slice(0, 20);

		const len = chars.length;
		// 修正：天清地浊，上卦字数少于或等于下卦
		const mid = Math.floor(len / 2);
		const part1 = chars.slice(0, mid);
		const part2 = chars.slice(mid);
		// 修正：使用笔画数起卦
		const getStroke = (ch: string) => {
			const stroke: any = cnchar.stroke(ch);
			const value = Array.isArray(stroke) ? stroke[0] : stroke;
			const n = Number(value);
			if (Number.isFinite(n) && n > 0) return n;
			const fallback = ch.codePointAt(0) || 0;
			return (fallback % 30) + 1;
		};
		const sumCode = (arr: string[]) => arr.reduce((s, ch) => s + getStroke(ch), 0);
		const s1 = sumCode(part1);
		const s2 = sumCode(part2);
		const total = s1 + s2;
		const n1 = (s1 % 8) || 8;
		const n2 = (s2 % 8) || 8;
		const n3 = (total % 6) || 6;
		const params = liuyaoService.generateNumberParams(n1, n2, n3);
		form.value.charsParams = params;
		uni.showToast({ title: '已生成汉字起卦参数', icon: 'none' });
	}

	const guaMarks = Object.keys(GUA64).map(m => ({ label: GUA64[m], value: m }));
	const guaMainIndex = ref(0);
	const guaBianIndex = ref(0);
	const guaMainLabel = ref('');
	const guaBianLabel = ref('');

	function onGuaMainChange(e: any) {
		guaMainIndex.value = e.detail.value;
		guaMainLabel.value = guaMarks[guaMainIndex.value]?.label || '';
		form.value.guaMain = guaMarks[guaMainIndex.value]?.value || '';
	}

	function onGuaBianChange(e: any) {
		guaBianIndex.value = e.detail.value;
		guaBianLabel.value = guaMarks[guaBianIndex.value]?.label || '';
		form.value.guaBian = guaMarks[guaBianIndex.value]?.value || '';
	}

	function generateGua() {
		const mainMark = form.value.guaMain || '';
		const bianMark = form.value.guaBian || '';

		if (!mainMark) {
			uni.showToast({ title: '请先选择本卦', icon: 'none' });
			return;
		}

		// 校验数据格式
		if (mainMark.length !== 6) {
			console.error('本卦数据异常', mainMark);
			uni.showToast({ title: '本卦数据异常', icon: 'none' });
			return;
		}
		if (bianMark && bianMark.length !== 6) {
			console.error('变卦数据异常', bianMark);
			uni.showToast({ title: '变卦数据异常', icon: 'none' });
			return;
		}

		// If no bian gua or same as main, return static lines
		if (!bianMark || bianMark === mainMark) {
			const params = mainMark.split('').map(ch => (ch === '1' ? 1 : 0));
			form.value.guaParams = params;
			uni.showToast({ title: '已生成卦名参数', icon: 'none' });
			return;
		}

		// Compare main and bian to determine moving lines
		const params: number[] = [];
		for (let i = 0; i < 6; i++) {
			const m = mainMark[i];
			const b = bianMark[i];

			if (m === b) {
				// Static
				params.push(m === '1' ? 1 : 0);
			} else {
				// Moving
				if (m === '1' && b === '0') {
					// Yang -> Yin: Old Yang (3)
					params.push(3);
				} else if (m === '0' && b === '1') {
					// Yin -> Yang: Old Yin (4)
					params.push(4);
				} else {
					// Should not happen for binary strings, fallback to static
					params.push(m === '1' ? 1 : 0);
				}
			}
		}

		form.value.guaParams = params;
		uni.showToast({ title: '已生成卦名参数', icon: 'none' });
	}

	// watch gua index changes to keep labels and form values in sync
	watch(guaMainIndex, v => {
		guaMainLabel.value = guaMarks[v]?.label || '';
		form.value.guaMain = guaMarks[v]?.value || '';
	});

	watch(guaBianIndex, v => {
		guaBianLabel.value = guaMarks[v]?.label || '';
		form.value.guaBian = guaMarks[v]?.value || '';
	});

	// Input validation watchers
	watch(() => form.value.singleInput, (val) => {
		const filtered = String(val || '').replace(/\D/g, '');
		if (filtered !== val) {
			// use nextTick to ensure update cycle completes
			setTimeout(() => { form.value.singleInput = filtered; }, 0);
		}
	});

	watch(() => form.value.double1, (val) => {
		const filtered = String(val || '').replace(/\D/g, '');
		if (filtered !== val) {
			setTimeout(() => { form.value.double1 = filtered; }, 0);
		}
	});

	watch(() => form.value.double2, (val) => {
		const filtered = String(val || '').replace(/\D/g, '');
		if (filtered !== val) {
			setTimeout(() => { form.value.double2 = filtered; }, 0);
		}
	});

	function startLiuyao() {
		try {
			const errorMsg = validateStart();
			if (errorMsg) {
				uni.showModal({
					title: '提示',
					content: errorMsg,
					showCancel: false,
					confirmText: '知道了'
				});
				return;
			}

			const methodKey = currentMethod.value.key as MethodKey;
			let params: number[] = [];
			const dateObj = parseDate(form.value.timeLabel) || new Date();

			if (methodKey === 'number') {
				if (!form.value.num1 || !form.value.num2) {
					uni.showToast({ title: '请输入数字1和数字2', icon: 'none' });
					return;
				}
				params = liuyaoService.generateNumberParams(
					Math.abs(parseInt(form.value.num1, 10)),
					Math.abs(parseInt(form.value.num2, 10)),
					form.value.num3 ? Math.abs(parseInt(form.value.num3, 10)) : null
				);
			} else if (methodKey === 'time') {
				params = liuyaoService.generateTimeParams(dateObj);
			} else if (methodKey === 'computer' || methodKey === 'online') {
				params = form.value.autoParams.length
					? form.value.autoParams.map(v => parseInt(String(v || 0), 10) || 0)
					: liuyaoService.generateAutoParams();
				form.value.autoParams = params;
			} else if (methodKey === 'single') {
				if (form.value.singleParams && form.value.singleParams.length) {
					params = form.value.singleParams.map(v => parseInt(String(v || 0), 10) || 0);
				} else {
					generateSingle();
					params = form.value.singleParams.map(v => parseInt(String(v || 0), 10) || 0);
				}
			} else if (methodKey === 'double') {
				if (form.value.doubleParams && form.value.doubleParams.length) {
					params = form.value.doubleParams.map(v => parseInt(String(v || 0), 10) || 0);
				} else {
					generateDouble();
					params = form.value.doubleParams.map(v => parseInt(String(v || 0), 10) || 0);
				}
			} else if (methodKey === 'chars') {
				if (form.value.charsParams && form.value.charsParams.length) {
					params = form.value.charsParams.map(v => parseInt(String(v || 0), 10) || 0);
				} else {
					generateChars();
					params = form.value.charsParams.map(v => parseInt(String(v || 0), 10) || 0);
				}
			} else if (methodKey === 'gua') {
				if (form.value.guaParams && form.value.guaParams.length) {
					params = form.value.guaParams.map(v => parseInt(String(v || 0), 10) || 0);
				} else {
					generateGua();
					params = form.value.guaParams.map(v => parseInt(String(v || 0), 10) || 0);
				}
			} else if (methodKey === 'manual') {
				params = form.value.manualParams.map(v => {
					const n = parseInt(String(v || '0'), 10);
					return isNaN(n) ? 0 : n;
				});
			}

			const solar = Solar.fromDate(dateObj);
			const lunar = solar.getLunar();
			const eightChar = lunar.getEightChar();
			const dayGz = eightChar.getDay();
			const timeLabel = form.value.timeLabel || formatDateTime(dateObj);

			const compiled = compileNajia(params, {
				gender: '',
				title: form.value.title,
				date: dateObj,
				dayGz,
				guaci: true,
				solar,
				lunar
			});

			const display = buildDisplayData(compiled);

			const profilePayload = {
				title: form.value.title || '起卦记录',
				method: currentMethod.value.text,
				gender: form.value.gender === '' ? '未填写' : (String(form.value.gender) === '0' ? '男' : '女'),
				dayGanZhi: dayGz,
				timeLabel,
				focus: form.value.title || '未填写',
				note: `八字：${eightChar.getYear()} ${eightChar.getMonth()} ${eightChar.getDay()} ${eightChar.getTime()}`
			};

			liuyaoStore.setResult({
				compiled,
				display,
				profile: profilePayload,
				createdAt: Date.now()
			});

			uni.showToast({ title: '排盘完成', icon: 'none', duration: 1400 });
			uni.navigateTo({ url: '/pages/liuyao/result' });
		} catch (err: any) {
			console.warn('startLiuyao error', err);
			uni.showToast({ title: err?.message || '排盘失败，请检查输入', icon: 'none' });
		}
	}

	function resetForm() {
		form.value = {
			title: '',
			timeLabel: '',
			num1: '',
			num2: '',
			num3: '',
			manualParams: ['', '', '', '', '', ''],
			autoParams: []
		} as any;
		liuyaoStore.clear();
		useNowTime();
	}

	// gua defaults
	if (guaMarks.length) {
		guaMainLabel.value = guaMarks[0].label;
		form.value.guaMain = guaMarks[0].value;
	}

	const hasCompleteParams = (): boolean => {
		// check if any params array contains exactly 6 entries
		if (Array.isArray(form.value.autoParams) && form.value.autoParams.length === 6) return true;
		if (Array.isArray(form.value.timeParams) && form.value.timeParams.length === 6) return true;
		if (Array.isArray(form.value.singleParams) && form.value.singleParams.length === 6) return true;
		if (Array.isArray(form.value.doubleParams) && form.value.doubleParams.length === 6) return true;
		if (Array.isArray(form.value.charsParams) && form.value.charsParams.length === 6) return true;
		if (Array.isArray(form.value.guaParams) && form.value.guaParams.length === 6) return true;
		// manualParams must have all 6 selected (non-empty)
		if (Array.isArray(form.value.manualParams) && form.value.manualParams.length === 6) {
			const allFilled = form.value.manualParams.every(v => String(v || '').trim() !== '');
			if (allFilled) return true;
		}
		// also accept compiled result stored in the store
		if (liuyaoStore && liuyaoStore.compiled && Array.isArray(liuyaoStore.compiled.params) && liuyaoStore.compiled.params.length === 6) {
			return true;
		}
		return false;
	};

	function validateStart(): string {
		if (!String(form.value.title || '').trim()) {
			return '请输入占卜事项（标题）';
		}

		// check if any params array contains exactly 6 entries (global check for cached/preset)
		if (hasCompleteParams()) return '';

		const methodKey = currentMethod.value.key as string;

		if (methodKey === 'computer' || methodKey === 'online' || methodKey === 'auto' || methodKey === 'shake') {
			if (!Array.isArray(form.value.autoParams) || form.value.autoParams.length < 6) {
				return '请先完成起卦（生成完整卦象）';
			}
		} else if (methodKey === 'time') {
			if (!Array.isArray(form.value.timeParams) || form.value.timeParams.length < 6) {
				return '请先生成时间起卦参数';
			}
		} else if (methodKey === 'single') {
			if (!Array.isArray(form.value.singleParams) || form.value.singleParams.length < 6) {
				return '请先生成单数起卦参数';
			}
		} else if (methodKey === 'double') {
			if (!Array.isArray(form.value.doubleParams) || form.value.doubleParams.length < 6) {
				return '请先生成双数起卦参数';
			}
		} else if (methodKey === 'chars') {
			if (!Array.isArray(form.value.charsParams) || form.value.charsParams.length < 6) {
				return '请先生成汉字起卦参数';
			}
		} else if (methodKey === 'gua') {
			if (!Array.isArray(form.value.guaParams) || form.value.guaParams.length < 6) {
				return '请先生成卦名起卦参数';
			}
		} else if (methodKey === 'number') {
			if (!form.value.num1 || !form.value.num2) {
				return '请输入完整的起卦数字';
			}
		} else if (methodKey === 'manual') {
			const allFilled = Array.isArray(form.value.manualParams) && 
				form.value.manualParams.length === 6 && 
				form.value.manualParams.every(v => String(v || '').trim() !== '');
			if (!allFilled) {
				return '请手工指定全部 6 爻';
			}
		}

		return '';
	}

	const canStart = computed(() => !validateStart());

	return {
		form,
		methodTabs,
		methodIndex,
		currentMethod,
		methodInfo,
		yaoOptions,
		getYaoLabel,
		getYaoIndex,
		getYaoDisplayValue,
		getYaoName,
		getYaoSymbol,
		currentMethodIcon,
		methodDesc,
		setMethod,
		timePickerShow,
		timePickerDefault,
		timePick,
		timeSuffix,
		openTimePicker,
		onTimeConfirm,
		useNowTime,
		generateAuto,
		generateTime,
		generateShake,
		generateSingle,
		generateDouble,
		generateChars,
		generateGua,
		startOnlineShake,
		onlineActive,
		onlineMsg,
		startLiuyao,
		resetForm,
		canStart,
		guaMarks,
		guaMainIndex,
		guaBianIndex,
		guaMainLabel,
		guaBianLabel
		,onGuaMainChange
		,onGuaBianChange
	};
}

export default useLiuyaoForm;
