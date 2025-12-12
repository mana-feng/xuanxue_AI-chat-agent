/**
 * 构建八字导出数据
 * 从 userStore、baziStore、yunStore 中提取数据，构建完整的八字 JSON 导出格式
 */

import type { Store } from 'pinia';

interface UserStore {
	realname: string | null;
	gender: number;
	timestamp: number | null;
	birthPlace: string | null;
}

interface BaziStore {
	solar: {
		year: number | null;
		month: number | null;
		day: number | null;
		time: string | null;
	};
	sizhu: {
		year: string | null;
		month: string | null;
		day: string | null;
		time: string | null;
	};
	tiangan: {
		year: string | null;
		month: string | null;
		day: string | null;
		time: string | null;
	};
	dizhi: {
		year: string | null;
		month: string | null;
		day: string | null;
		time: string | null;
	};
	wuxing: {
		year: string | null;
		month: string | null;
		day: string | null;
		time: string | null;
	};
	nayin: {
		year: string | null;
		month: string | null;
		day: string | null;
		time: string | null;
	};
	dishi: {
		year: string | null;
		month: string | null;
		day: string | null;
		time: string | null;
	};
	canggan: {
		year: string[] | null;
		month: string[] | null;
		day: string[] | null;
		time: string[] | null;
	};
	zhuxing: {
		year: string | null;
		month: string | null;
		day: string | null;
		time: string | null;
	};
	fuxing: {
		year: string[] | null;
		month: string[] | null;
		day: string[] | null;
		time: string[] | null;
	};
	yinli: string | null;
	yangli: string | null;
	xinzuo: string | null;
	lunar: {
		year: number;
		month: number;
		day: number;
		time: string;
		hour: number;
		minute: number;
		_year: string;
		_month: string;
		_day: string;
		_time: string;
	} | null;
	start_yun: {
		year: number | null;
		month: number | null;
		day: number | null;
		hour: number | null;
		solar: string | null;
	};
	table: Array<{
		data: {
			name: string;
			year: any;
			month: any;
			day: any;
			time: any;
		};
	}>;
	enhanced: any;
}

interface YunStore {
	dayun_list: Array<{
		start_year: any;
		start_age: any;
		ganzhi: any;
		shishen: any;
	}>;
	year_list: Array<{
		year: any;
		ganzhi: any;
		age: any;
		shishen: any;
	}>;
	month_list: Array<{
		original: any;
		year: any;
		jieqi: string;
		next_jieqi_date: string;
		date: string;
		ganzhi: any;
		shishen: any;
	}>;
	day_list: Array<{
		date: string;
		nongli: string;
		gan: string;
		zhi: string;
		ganzhi: string;
		shishen: any;
	}>;
	time_list: Array<{
		gan: string;
		zhi: string;
		ganzhi: string;
		time: string;
		shishen: any;
	}>;
	current_index: number;
	year_index: number;
	month_index: number;
	day_index: number;
	time_index: number;
}

export function buildBaziExportPayload(
	userStore: Store & UserStore,
	baziStore: Store & BaziStore,
	yunStore: Store & YunStore
): any | null {
	// 检查必要数据
	if (!userStore.timestamp) {
		return null;
	}

	// 构建基础信息
	const payload: any = {
		meta: {
			exportTime: new Date().toISOString(),
			version: '1.0.0',
		},
		prompt: `你是一名严格的八字分析器（偏"做题式推断"而非散文式玄谈）。你必须仅基于：干支、藏干、十神、五行旺衰、月令、根气、透干、通关/调候、格局成败、用神忌神、天干五合与争合、地支六合三合半合、刑冲害破穿进行推断；神煞只允许作为辅助参考，禁止主断。

【禁止事项】玄学口吻模糊表达、只给结论不给推导、跳步骤、凭感觉编造、鸡汤建议。

【核心要求】所有结论必须给出"依据点"，并形成因果链：结论 → 依据A（盘面事实）→ 依据B（命理规则）→ 推导。若无法从盘面得到依据，必须写"信息不足/不足以判断"，不得臆测。

【输出结构】（必须严格按顺序、按标题输出）

1）基础盘面：四柱（年/月/日/时）、地支藏干（逐柱列出）、十神标注（以日主为参照，逐干逐藏干标十神）、五行统计（干支+藏干合计，给出数量/权重简表）、明确缺失信息（如时辰、出生地、性别等）及其对判断的影响等级（高/中/低）

2）旺衰判断（以月令为主）：先判日主强弱：强/弱/从强/从弱/假从（必须选一个）。必须列证据：月令司令、透干、根气、帮扶/克泄耗、是否成势。列出：助/泄/耗/克分别来自哪里（哪些干支/藏干在起作用）

3）格局与用神（必须包含成败条件）：格局判定：写清"为何属于此格/不属于其他格"。成格/破格因素：如合化不成、冲破印官、财坏印、伤官见官等（逐条对应盘面）。用神选择必须按优先级解释：调候 > 通关 > 扶抑（说明为何）。给出：用神、喜神、忌神（五行与对应十神都要写）

4）组合关系（天干+地支）：天干：五合、争合、合化是否成立（给成立/不成立理由）。地支：六合/三合/半合/暗合，以及刑冲害破穿（逐条列出）。每条组合必须说明：对哪类十神/五行产生增益或破坏，以及对格局/用神的影响

5）具体断语（必须"结论+依据"，不得空泛）：分别输出以下五类，每类至少3条：事业/学业（结论+依据点+推导）、财运（结论+依据点+推导）、感情/婚恋（结论+依据点+推导）、健康（结论+依据点+推导）、家庭/人际（结论+依据点+推导）

6）可执行建议（必须可操作、可验证）：事业方向/岗位类型建议至少3条（每条必须对应"喜用五行/十神结构"的依据）、行为策略建议至少3条（具体到做法，禁止"多努力、多沟通"这种空话）、环境/习惯调整建议至少3条（同样要写依据）

7）风险与不确定性：明确指出哪些结论最依赖"时辰/出生地/具体年龄段/大运流年"等信息。标注：在信息不足下哪些只能给趋势、不能给定论

8）总结（≤120字）：用神/忌神一句话、盘面主轴一句话、最关键的3条结论（短句）

【强制要求】（重要）
- 先完成"基础盘面表格"，再开始分析；盘面未完成不得进入下一步
- 格局判定必须包含：日主强弱结论及证据、月令司令之神是什么/是否透干、是否存在破格因素、用神选择是否与强弱判断一致
- 输出前做自检并写出来：强弱判断是否与用神一致？是否出现同一组合被解释为相反含义？用神是否与月令/透干/根气冲突？如有冲突，必须修正文中矛盾并注明修正点

需要你分析的八字信息如下（我将提供在下方）`,
		basic: {
			name: userStore.realname || null,
			gender: userStore.gender === 1 ? '男' : userStore.gender === 0 ? '女' : null,
			birthTimestamp: userStore.timestamp,
			birthPlace: userStore.birthPlace || null,
			solar: userStore.timestamp ? new Date(userStore.timestamp).toISOString() : null,
			solarString: baziStore.yangli || null,
			lunar: baziStore.yinli || null,
			constellation: baziStore.xinzuo || null,
		},
		sizhu: {
			year: baziStore.sizhu.year || null,
			month: baziStore.sizhu.month || null,
			day: baziStore.sizhu.day || null,
			time: baziStore.sizhu.time || null,
		},
		tiangan: {
			year: baziStore.tiangan.year || null,
			month: baziStore.tiangan.month || null,
			day: baziStore.tiangan.day || null,
			time: baziStore.tiangan.time || null,
		},
		dizhi: {
			year: baziStore.dizhi.year || null,
			month: baziStore.dizhi.month || null,
			day: baziStore.dizhi.day || null,
			time: baziStore.dizhi.time || null,
		},
		wuxing: {
			year: baziStore.wuxing.year || null,
			month: baziStore.wuxing.month || null,
			day: baziStore.wuxing.day || null,
			time: baziStore.wuxing.time || null,
		},
		nayin: {
			year: baziStore.nayin.year || null,
			month: baziStore.nayin.month || null,
			day: baziStore.nayin.day || null,
			time: baziStore.nayin.time || null,
		},
		dishi: {
			year: baziStore.dishi.year || null,
			month: baziStore.dishi.month || null,
			day: baziStore.dishi.day || null,
			time: baziStore.dishi.time || null,
		},
		canggan: {
			year: baziStore.canggan.year || null,
			month: baziStore.canggan.month || null,
			day: baziStore.canggan.day || null,
			time: baziStore.canggan.time || null,
		},
		zhuxing: {
			year: baziStore.zhuxing.year || null,
			month: baziStore.zhuxing.month || null,
			day: baziStore.zhuxing.day || null,
			time: baziStore.zhuxing.time || null,
		},
		fuxing: {
			year: baziStore.fuxing.year || null,
			month: baziStore.fuxing.month || null,
			day: baziStore.fuxing.day || null,
			time: baziStore.fuxing.time || null,
		},
		solar: {
			year: baziStore.solar.year || null,
			month: baziStore.solar.month || null,
			day: baziStore.solar.day || null,
			time: baziStore.solar.time || null,
		},
	};

	// 添加阴历详细信息
	if (baziStore.lunar) {
		payload.lunar = {
			year: baziStore.lunar.year || null,
			month: baziStore.lunar.month || null,
			day: baziStore.lunar.day || null,
			time: baziStore.lunar.time || null,
			hour: baziStore.lunar.hour || null,
			minute: baziStore.lunar.minute || null,
			yearChinese: baziStore.lunar._year || null,
			monthChinese: baziStore.lunar._month || null,
			dayChinese: baziStore.lunar._day || null,
			timeChinese: baziStore.lunar._time || null,
		};
	}

	// 添加起运信息
	if (baziStore.start_yun) {
		payload.start_yun = {
			year: baziStore.start_yun.year || null,
			month: baziStore.start_yun.month || null,
			day: baziStore.start_yun.day || null,
			hour: baziStore.start_yun.hour || null,
			solar: baziStore.start_yun.solar || null,
		};
	}

	// 添加排盘表格（可选）
	if (baziStore.table && baziStore.table.length > 0) {
		payload.table = baziStore.table.map((row) => ({
			name: row.data?.name || null,
			year: row.data?.year || null,
			month: row.data?.month || null,
			day: row.data?.day || null,
			time: row.data?.time || null,
		}));
	}

	// 添加增强分析数据
	if (baziStore.enhanced) {
		payload.enhanced = {
			shensha: baziStore.enhanced.shensha || null,
			geju: baziStore.enhanced.geju || null,
			wuxingWangshuai: baziStore.enhanced.wuxingWangshuai || null,
			rizhuQiangruo: baziStore.enhanced.rizhuQiangruo || null,
			yongshen: baziStore.enhanced.yongshen || null,
			ganzhiRelations: baziStore.enhanced.ganzhiRelations || null,
		};
	}

	// 添加大运信息（全部导出）
	if (yunStore.dayun_list && yunStore.dayun_list.length > 0) {
		payload.dayun = yunStore.dayun_list.map((item, index) => ({
			index,
			startYear: item.start_year || null,
			startAge: item.start_age || null,
			ganzhi: item.ganzhi || null,
			shishen: item.shishen || null,
		}));
		payload.currentDayunIndex = yunStore.current_index || 0;
	}

	// 添加流年信息（只导出上一个大运、当前大运、下一个大运，最多30年）
	if (yunStore.year_list && yunStore.year_list.length > 0) {
		const currentIndex = yunStore.current_index || 0;
		const dayunList = yunStore.dayun_list || [];
		
		// 计算需要导出的流年范围
		let startYearIndex = 0;
		let endYearIndex = yunStore.year_list.length - 1;
		let totalYears = 0;
		
		// 确定起始年份：上一个大运的开始年份
		if (currentIndex > 0 && dayunList[currentIndex - 1]) {
			const prevDayunStartYear = dayunList[currentIndex - 1].start_year;
			startYearIndex = yunStore.year_list.findIndex((item: any) => item.year >= prevDayunStartYear);
			if (startYearIndex < 0) startYearIndex = 0;
		}
		
		// 确定结束年份：下一个大运的开始年份，或最多30年
		if (currentIndex < dayunList.length - 1 && dayunList[currentIndex + 1]) {
			const nextDayunStartYear = dayunList[currentIndex + 1].start_year;
			endYearIndex = yunStore.year_list.findIndex((item: any) => item.year >= nextDayunStartYear);
			if (endYearIndex < 0) endYearIndex = yunStore.year_list.length - 1;
		}
		
		// 限制最多30年
		const maxYears = 30;
		if (endYearIndex - startYearIndex + 1 > maxYears) {
			// 优先保留当前大运附近的年份
			const currentYearIndex = yunStore.year_index || 0;
			const halfRange = Math.floor(maxYears / 2);
			startYearIndex = Math.max(0, currentYearIndex - halfRange);
			endYearIndex = Math.min(yunStore.year_list.length - 1, startYearIndex + maxYears - 1);
		}
		
		// 提取范围内的流年
		const filteredYearList = yunStore.year_list.slice(startYearIndex, endYearIndex + 1);
		payload.liunian = filteredYearList.map((item, index) => ({
			index: startYearIndex + index,
			year: item.year || null,
			ganzhi: item.ganzhi || null,
			age: item.age || null,
			shishen: item.shishen || null,
		}));
		payload.currentLiunianIndex = yunStore.year_index || 0;
		payload.liunianRange = {
			startIndex: startYearIndex,
			endIndex: endYearIndex,
			totalYears: filteredYearList.length,
		};
	}

	return payload;
}

