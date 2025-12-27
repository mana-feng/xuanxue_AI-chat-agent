import { defineStore } from 'pinia';
import { Solar, Lunar } from 'lunar-javascript';
import utils from '@/libs/utils/utils';

// 类型定义
interface DayunItem {
	start_year: any;
	start_age: any;
	ganzhi: any;
	shishen: any;
}

interface YearItem {
	year: any;
	ganzhi: any;
	age: any;
	shishen: any;
}

interface MonthItem {
	original: Solar;
	year: any;
	jieqi: string;
	next_jieqi_date: string;
	date: string;
	ganzhi: any;
	shishen: any;
}

interface DayItem {
	date: string;
	nongli: string;
	gan: string;
	zhi: string;
	ganzhi: string;
	shishen: any;
}

interface TimeItem {
	gan: string;
	zhi: string;
	ganzhi: string;
	time: string;
	shishen: any;
}

export const useYunStore = defineStore('yun', {
	state: () => {
		return {
			// 列表
			original: [] as any[],
			dayun_list: [] as DayunItem[],
			year_list: [] as YearItem[],
			month_list: [] as MonthItem[],
			day_list: [] as DayItem[],
			time_list: [] as TimeItem[],
			// 索引
			current_index: 0,
			year_index: 0,
			month_index: 0,
			day_index: 0,
			time_index: 0,
			// 是否已完成初始自动定位（用于防止用户手动选择后被重置�?
			autoLocated: false,
			// 缓存流日数据，避免重复计�?
			_dayListCache: null as { key: string; data: DayItem[] } | null,
			// 记录上次计算流年时的大运索引
			_lastDayunIndex: -1 as number,
			// 记录上次计算流月时的缓存�?
			_lastMonthCacheKey: '' as string,
		};
	},
	actions: {
		async pull(original: any[]) {
			this.original = original;
			this.current_index = 0;
			this.year_index = 0;
			this.month_index = 0;
			this.day_index = 0;
			this.time_index = 0;
			this.dayun_list = [];
			this.year_list = [];
			this.month_list = [];
			this.day_list = [];
			this.time_list = [];
			this.autoLocated = false; // 重置自动定位标志
			// 清除所有缓�?
			this._dayListCache = null;
			this._lastDayunIndex = -1;
			this._lastMonthCacheKey = '';
			this.resolveDaYun();
		},
		// 大运
		async resolveDaYun() {
			const original = this.original;
			const dayun_list = [];

			for (let i = 0; i < original.length; i++) {
				const item = original[i];
				const ganzhi = item.getGanZhi() || '流年';
				dayun_list.push({
					start_year: item.getStartYear(),
					start_age: item.getStartAge(),
					ganzhi: ganzhi,
					shishen: ganzhi == '流年' ? '流年' : utils.GetShiShen(ganzhi),
				});
			}

			this.dayun_list = dayun_list;
			this.year_index = 0;
			this.month_index = 0;
			this.day_index = 0;
			this.time_index = 0;
			this.year_list = [];
			this.month_list = [];
			this.day_list = [];
			this.time_list = [];
			this.resolveLiuYear();
		},
		// 流年
		async resolveLiuYear() {
			const original = this.original;
			const current_index = this.current_index;

			// 检查缓存：如果大运索引没有变化，且已有流年数据，则不需要重新计�?
			if (this.year_list.length > 0 && this._lastDayunIndex === current_index) {
				// 清除流日缓存，因为流年变化了
				this._dayListCache = null;
				this.resolveLiuMonth();
				return;
			}

			const dayun = original[current_index];
			const year = dayun.getLiuNian();
			const year_list = [];

			for (let i = 0; i < year.length; i++) {
				const item = year[i];
				const ganzhi = item.getGanZhi();
				year_list.push({
					year: item.getYear(),
					ganzhi: ganzhi,
					age: item.getAge(),
					shishen: utils.GetShiShen(ganzhi),
				});
			}

			this.year_list = year_list;
			this._lastDayunIndex = current_index;
			this.month_index = 0;
			this.day_index = 0;
			this.time_index = 0;
			this.month_list = [];
			this.day_list = [];
			this.time_list = [];
			// 清除流日缓存
			this._dayListCache = null;

			this.resolveLiuMonth();
		},
		async resolveLiuMonth() {
			const original = this.original;
			const current_index = this.current_index;
			const year_index = this.year_index;

			// 检查缓存：如果流年索引没有变化，且已有流月数据，则不需要重新计�?
			const monthCacheKey = `${current_index}_${year_index}`;
			if (this.month_list.length > 0 && this._lastMonthCacheKey === monthCacheKey) {
				// 清除流日缓存，因为流月可能变化了
				this._dayListCache = null;
				this.resolveLiuDay();
				return;
			}

			const dayun = original[current_index];
			const year = dayun.getLiuNian();

			const month = year[year_index].getLiuYue();

			const month_list = [];
			// 严格按照 bz.js 的逻辑：使�?Lunar.fromYmd(year, 6, 1).getJieQiTable() 获取节气�?
			// 在项目中，使�?Solar.fromDate 创建日期，然后获取农历对�?
			const currentYear = year[year_index].getYear();
			const jieqi = Lunar.fromDate(new Date(currentYear, 5, 1)).getJieQiTable(); // 月份�?开始，6月对应索�?
			// 获取下一年的节气表（用于小寒流月和大雪流月的下一个节气）
			const nextYearJieqi = Lunar.fromDate(new Date(currentYear + 1, 5, 1)).getJieQiTable();

			// 严格按照 bz.js �?$jie 数组：包�?3个元素（最后一个为 'LI_CHUN'�?
			const map = [
				'立春',
				'惊蛰',
				'清明',
				'立夏',
				'芒种',
				'小暑',
				'立秋',
				'白露',
				'寒露',
				'立冬',
				'大雪',
				'XIAO_HAN',
				'LI_CHUN',
			];

			for (let i = 0; i < month.length; i++) {
				const item = month[i];
				const ganzhi = item.getGanZhi();

				let _jieqi: Solar;
				let _next_jieqi: Solar;

				if (i === 11) {
					// 小寒流月：从下一年的节气表获取小寒和立春（优先使用中文键名）
					_jieqi = nextYearJieqi['小寒'] || nextYearJieqi['XIAO_HAN'];
					_next_jieqi = nextYearJieqi['立春'] || nextYearJieqi['LI_CHUN'];
				} else if (i === 10) {
					// 大雪流月：当前节气从当前流年获取，下一个节气（小寒）从下一年获取（优先使用中文键名�?
					_jieqi = jieqi[map[i]];
					_next_jieqi = nextYearJieqi['小寒'] || nextYearJieqi['XIAO_HAN'];
				} else {
					// 其他流月：从当前流年的节气表获取，使�?map[i] �?map[i + 1]
					_jieqi = jieqi[map[i]];
					_next_jieqi = jieqi[map[i + 1]];
				}

				month_list.push({
					original: _jieqi,
					year: year[year_index].getYear(),
					jieqi: i == 11 ? '小寒' : map[i],
					next_jieqi_date: _next_jieqi.getMonth() + '/' + _next_jieqi.getDay(),
					date: _jieqi.getMonth() + '/' + _jieqi.getDay(),
					ganzhi: ganzhi,
					shishen: utils.GetShiShen(ganzhi),
				});
			}

			this.month_list = month_list;
			this._lastMonthCacheKey = monthCacheKey;
			this.day_index = 0;
			this.time_index = 0;
			this.day_list = [];
			this.time_list = [];
			// 清除流日缓存
			this._dayListCache = null;

			// 自动定位到当前系统时间（延迟执行，确保数据已更新�?
			// 只在未完成初始自动定位时执行
			if (!this.autoLocated) {
				setTimeout(() => {
					this.autoLocateToCurrentDate(false);
				}, 0);
			} else {
				// 如果已经完成自动定位，直接解析流�?
				this.resolveLiuDay();
			}
		},
		async resolveLiuDay() {
			const year_list = this.year_list;
			const year_index = this.year_index;
			const month_list = this.month_list;
			const month_index = this.month_index;

			const currentMonth = month_list[month_index] as any;
			if (!currentMonth) {
				this.day_list = [];
				this.time_index = 0;
				this.time_list = [];
				return;
			}

			// 检查缓存：如果流年和流月索引没有变化，且已有流日数据，则不需要重新计�?
			const cacheKey = `${year_index}_${month_index}`;
			if (this._dayListCache && this._dayListCache.key === cacheKey && this._dayListCache.data) {
				this.day_list = this._dayListCache.data;
				this.time_index = 0;
				this.time_list = [];
				return;
			}

			const year = year_list[year_index].year;
		
			// 严格按照旧版 bz.js 中的逻辑�?
			// 起始日期使用当前节气对应�?Solar（currentMonth.original�?
			// 结束日期使用 next_jieqi_date 对应的节气日（不包含在当前流月内�?
			const startSolar = currentMonth.original as Solar;
		
			const [nextMonth, nextDay] = currentMonth.next_jieqi_date.split('/').map(Number);
			const endYear = month_index < 10 ? year : year + 1;
			const endSolar = Solar.fromDate(new Date(endYear, nextMonth - 1, nextDay)); // 月份开始月份�?开�?

			const day_list = [];
			let currentSolar = startSolar;

			// 遍历从起始日期到结束日期前一天的每一�?
			// （结束日期本身属于下一个流月）
			const includeEndDate = false;

			const maxDays = 60; // 最�?0天，防止无限循环
			let dayCount = 0;

			// 遍历日期，直到超过结束日�?
			// eslint-disable-next-line no-constant-condition
			while (dayCount < maxDays) {
				const currentYear = currentSolar.getYear();
				const currentMonthNum = currentSolar.getMonth();
				const currentDay = currentSolar.getDay();
				const endYear = endSolar.getYear();
				const endMonthNum = endSolar.getMonth();
				const endDay = endSolar.getDay();

				// 判断是否超过结束日期
				if (currentYear > endYear) break;
				if (currentYear === endYear && currentMonthNum > endMonthNum) break;
				if (currentYear === endYear && currentMonthNum === endMonthNum) {
					if (includeEndDate) {
						if (currentDay > endDay) break;
					} else {
						if (currentDay >= endDay) break;
					}
				}

				const lunar = currentSolar.getLunar();
				const ganzhi = lunar.getDayInGanZhi();
				const params = {
					date: currentSolar.toYmd().replace(/-/g, '/'),
					nongli: lunar.getDayInChinese(),
					gan: lunar.getDayGan(),
					zhi: lunar.getDayZhi(),
					ganzhi: ganzhi,
					shishen: utils.GetShiShen(ganzhi),
				};
				day_list.push(params);

				// 移动到下一�?
				currentSolar = currentSolar.next(1);
				dayCount++;
			}

			// 缓存结果
			this._dayListCache = {
				key: cacheKey,
				data: day_list
			};

			this.day_list = day_list;
			this.time_index = 0;
			this.time_list = [];
		},
		resolveLiuTime() {
			const day_list = this.day_list;
			const day_index = this.day_index;

			if (day_list.length == 0) return;
			const { date: _date } = day_list[day_index];

			const date = _date + ' 00:00:00';
			const start_time =
				new Date(date.replace(/-/g, '/').replace(/T/g, ' ')).getTime() - 60 * 60 * 1000;

			const time_list = [];
			for (let i = 0; i < 12; i++) {
				const _date = new Date(start_time + i * 2 * 60 * 60 * 1000);
				const lunar = Lunar.fromDate(new Date(_date));
				const ganzhi = lunar.getTimeInGanZhi();
				const params = {
					gan: lunar.getTimeGan(),
					zhi: lunar.getTimeZhi(),
					ganzhi: ganzhi,
					time: lunar.getHour() + ':00',
					shishen: utils.GetShiShen(ganzhi),
				};
				time_list.push(params);
			}

			this.time_list = time_list;
		},
		// 自动定位到当前系统时�?
		async autoLocateToCurrentDate(skipAutoLocate = false): Promise<void> {
			// 如果已经完成自动定位，且不是递归调用，不再执行（防止用户手动选择后被重置�?
			if (this.autoLocated && !skipAutoLocate) {
				return;
			}

			const now = new Date();
			const currentYear = now.getFullYear();
			const currentMonth = now.getMonth() + 1; // 1-12
			const currentDay = now.getDate();

			// 1. 定位大运：找�?start_year <= 当前年份的最大索�?
			if (!skipAutoLocate && this.dayun_list && this.dayun_list.length > 0) {
				let dayunIndex = 0;
				for (let i = 0; i < this.dayun_list.length; i++) {
					const item = this.dayun_list[i] as any;
					if (item.start_year && parseInt(item.start_year) <= currentYear) {
						dayunIndex = i;
					} else {
						break;
					}
				}
				if (this.current_index !== dayunIndex) {
					this.current_index = dayunIndex;
					await this.resolveLiuYear();
					// resolveLiuYear 会调�?resolveLiuMonth，resolveLiuMonth 会调�?autoLocateToCurrentDate(true)
					// 所以这里不需要再次调�?
					return;
				}
			}

			// 2. 定位流年：找到匹配当前年份的索引
			if (!skipAutoLocate && this.year_list && this.year_list.length > 0) {
				const yearIndex = this.year_list.findIndex((item: any) => item.year == currentYear);
				if (yearIndex >= 0 && this.year_index !== yearIndex) {
					this.year_index = yearIndex;
					await this.resolveLiuMonth();
					// resolveLiuMonth 会调�?autoLocateToCurrentDate(true)
					// 所以这里不需要再次调�?
					return;
				}
			}

			// 3. 定位流月：找到包含当前日期的流月
			if (this.month_list && this.month_list.length > 0) {
				let monthIndex = -1;
				const currentYear = now.getFullYear();
				const currentMonthNum = now.getMonth() + 1;
				const currentDayNum = now.getDate();

				for (let i = 0; i < this.month_list.length; i++) {
					const item = this.month_list[i] as any;
					if (!item.date || !item.next_jieqi_date) continue;

					// 获取当前流年的年�?
					const yearList = this.year_list;
					const yearIndex = this.year_index;
					if (!yearList.length || yearIndex < 0 || yearIndex >= yearList.length) break;
					const year = (yearList[yearIndex] as any).year;

					// 计算流月的日期范?
					const [month, day] = item.date.split('/').map(Number);
					const [nextMonth, nextDay] = item.next_jieqi_date.split('/').map(Number);

					const startMonth = month;
					const startDay = day;
					// 小寒流月（索引11）是在下一年
					const startYear = i === 11 ? year + 1 : year;

					const endMonth = nextMonth;
					const endDay = nextDay;
					// 大雪（索引10）和小寒（索引11）的下一个节气都在下一年
					const endYear = i >= 10 ? year + 1 : year;

					// 判断当前日期是否在这个流月范围内
					const currentDate = new Date(currentYear, currentMonthNum - 1, currentDayNum);
					const startDate = new Date(startYear, startMonth - 1, startDay);
					const endDate = new Date(endYear, endMonth - 1, endDay);

					// 包含起始日期，不包含结束日期（因为结束日期是下一个流月的起始日期）
					if (currentDate >= startDate && currentDate < endDate) {
						monthIndex = i;
						break;
					}
				}

				if (monthIndex >= 0 && this.month_index !== monthIndex) {
					this.month_index = monthIndex;
					await this.resolveLiuDay();
					// 继续定位流日
					if (!skipAutoLocate) {
						return this.autoLocateToCurrentDate(true);
					}
				}
			}

			// 4. 定位流日：找到匹配当前日期的索引
			if (this.day_list && this.day_list.length > 0) {
				// 格式化当前日期为 YYYY/M/D �?YYYY/MM/DD 格式
				const currentDateStr1 = `${currentYear}/${currentMonth}/${currentDay}`;
				const currentDateStr2 = `${currentYear}/${currentMonth.toString().padStart(2, '0')}/${currentDay.toString().padStart(2, '0')}`;

				const dayIndex = this.day_list.findIndex((item: any) => {
					if (item.date) {
						// 格式化日期字符串进行比较（统一格式�?
						const itemDate = item.date.replace(/-/g, '/');
						// 尝试多种格式匹配
						return (
							itemDate === currentDateStr1 ||
							itemDate === currentDateStr2 ||
							itemDate.startsWith(currentDateStr1) ||
							itemDate.startsWith(currentDateStr2)
						);
					}
					return false;
				});
				if (dayIndex >= 0 && this.day_index !== dayIndex) {
					this.day_index = dayIndex;
				}
			}

			// 标记已完成自动定�?
			if (!skipAutoLocate) {
				this.autoLocated = true;
			}
		},
		// 标记用户已手动选择时间，禁用自动定�?
		markManualSelection() {
			this.autoLocated = true;
		},
	},
});
