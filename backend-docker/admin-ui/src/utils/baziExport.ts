/**
 * 构建八字导出数据
 * 从 userStore、baziStore、yunStore 中提取数据，构建完整的八字 JSON 导出格式
 */

import type { Store } from 'pinia';
import { calculateShenShaForGanZhi } from '@/libs/utils/bazi-enhanced';
import utils from '@/libs/utils/utils';

interface UserStore {
	realname: string | null;
	gender: number;
	timestamp: number | null;
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
	original: any[]; // 原始大运数据，包含所有大运
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
		prompt: `你是一名专业八字解读助手，目标是：根据用户提供的八字排盘信息，精准回答用户提出的具体问题。

规则：

必须以盘面事实为依据（四柱、藏干、十神、五行旺衰/月令、格局倾向、合冲刑害、用忌神），神煞只能辅助。

回答要围绕"用户问题"，避免输出与问题无关的大段通用命理科普。

避免武断：对不确定或依赖缺失信息（尤其时辰）的部分，要明确说明"影响点"和"可能范围"。

不要编造盘面数据；如果输入里没有提供某项（如时辰/大运/流年），不要假设。

输出风格自然、易读、接地气；但关键结论必须给出1–3条"依据点"（例如：月令、透干、根气、某合冲导致某十神受损/得力）。

默认输出结构（不要用死板标题也可以）：

直接回答结论（2–4句，先对准问题）

依据点解释（要短，但能对得上盘面）

建议/行动方案（可执行、结合喜忌与风险点）

若信息不足：补问最多2个关键问题（可选）

如果用户问的是"某件事能不能成/何时好转/该不该做"，请给出：倾向（偏好/偏坏/中性）+ 关键窗口（如果有大运流年则结合，没有就给触发条件而非硬给年份）。

需要你分析的八字信息如下（我将提供在下方）`,
		basic: {
			name: userStore.realname || null,
			gender: userStore.gender === 0 ? '男' : userStore.gender === 1 ? '女' : null,
			birthTimestamp: userStore.timestamp,
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
		// 获取日干和四柱地支，用于计算神煞
		const dayGan = baziStore.tiangan.day || '';
		const yearGan = baziStore.tiangan.year || '';
		const yearZhi = baziStore.dizhi.year || '';
		const monthZhi = baziStore.dizhi.month || '';
		const dayZhi = baziStore.dizhi.day || '';
		const timeZhi = baziStore.dizhi.time || '';
		const originalZhiList = [yearZhi, monthZhi, dayZhi, timeZhi];
		
		payload.dayun = yunStore.dayun_list.map((item, index) => {
			const ganzhi = item.ganzhi || '';
			// 计算大运神煞
			const shensha = ganzhi ? calculateShenShaForGanZhi(
				dayGan,
				ganzhi,
				originalZhiList,
				yearZhi,
				monthZhi,
				dayZhi,
				timeZhi,
				yearGan
			) : [];
			
			return {
				index,
				startYear: item.start_year || null,
				startAge: item.start_age || null,
				ganzhi: ganzhi,
				shishen: item.shishen || null,
				shensha: shensha.length > 0 ? shensha : null,
			};
		});
		payload.currentDayunIndex = yunStore.current_index || 0;
	}

	// 添加流年信息（导出前一个大运、当前大运、后一个大运的流年）
	// 注意：year_list 只包含当前大运的流年，需要从 original 获取其他大运的流年
	if (yunStore.original && yunStore.original.length > 0) {
		const currentIndex = yunStore.current_index || 0;
		
		// 确定要导出的大运索引：全部大运
		const dayunIndices: number[] = yunStore.original.map((_, index) => index);
		
		// 获取日干和四柱地支，用于计算神煞
		const dayGan = baziStore.tiangan.day || '';
		const yearGan = baziStore.tiangan.year || '';
		const yearZhi = baziStore.dizhi.year || '';
		const monthZhi = baziStore.dizhi.month || '';
		const dayZhi = baziStore.dizhi.day || '';
		const timeZhi = baziStore.dizhi.time || '';
		const originalZhiList = [yearZhi, monthZhi, dayZhi, timeZhi];
		
		// 收集所有大运的流年
		const allLiunian: any[] = [];
		
		for (const dayunIndex of dayunIndices) {
			if (dayunIndex >= 0 && dayunIndex < yunStore.original.length) {
				const dayun = yunStore.original[dayunIndex];
				if (dayun && typeof dayun.getLiuNian === 'function') {
					const yearArray = dayun.getLiuNian();
					if (yearArray && yearArray.length > 0) {
						for (let i = 0; i < yearArray.length; i++) {
							const item = yearArray[i];
							const ganzhi = item.getGanZhi ? item.getGanZhi() : '';
							const year = item.getYear ? item.getYear() : null;
							const age = item.getAge ? item.getAge() : null;
							
							// 计算流年神煞
							const shensha = ganzhi ? calculateShenShaForGanZhi(
								dayGan,
								ganzhi,
								originalZhiList,
								yearZhi,
								monthZhi,
								dayZhi,
								timeZhi,
								yearGan
							) : [];
							
							allLiunian.push({
								dayunIndex, // 标记属于哪个大运
								year: year,
								ganzhi: ganzhi,
								age: age,
								shishen: ganzhi ? utils.GetShiShen(ganzhi) : null,
								shensha: shensha.length > 0 ? shensha : null,
							});
						}
					}
				}
			}
		}
		
		// 按年份排序
		allLiunian.sort((a, b) => {
			if (a.year && b.year) {
				return a.year - b.year;
			}
			return 0;
		});
		
		// 转换为导出格式
		payload.liunian = allLiunian.map((item, index) => ({
			index,
			dayunIndex: item.dayunIndex,
			year: item.year,
			ganzhi: item.ganzhi,
			age: item.age,
			shishen: item.shishen,
			shensha: item.shensha,
		}));
		
		// 找到当前流年在合并列表中的索引
		const currentYear = yunStore.year_list && yunStore.year_list.length > 0 
			? (yunStore.year_list[yunStore.year_index || 0] as any)?.year 
			: null;
		let currentLiunianIndex = 0;
		if (currentYear) {
			const foundIndex = allLiunian.findIndex(item => item.year === currentYear);
			if (foundIndex >= 0) {
				currentLiunianIndex = foundIndex;
			}
		}
		
		payload.currentLiunianIndex = currentLiunianIndex;
		payload.liunianRange = {
			dayunIndices: dayunIndices,
			totalYears: allLiunian.length,
		};
	}

	return payload;
}

