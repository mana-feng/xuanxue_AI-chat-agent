import { defineStore } from 'pinia';
import { Solar, Lunar, Yun } from 'lunar-javascript';
import utils from '@/utils/utils';

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
			time_index: 0
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
					shishen: ganzhi == '流年' ? '流年' : utils.GetShiShen(ganzhi)
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

			const dayun = original[current_index];
			const xiaoyun = dayun.getXiaoYun();
			const year = dayun.getLiuNian();
			const year_list = [];

			for (let i = 0; i < year.length; i++) {
				const item = year[i];
				const ganzhi = item.getGanZhi();
				year_list.push({
					year: item.getYear(),
					ganzhi: ganzhi,
					age: item.getAge(),
					shishen: utils.GetShiShen(ganzhi)
				});
			}

			this.year_list = year_list;
			this.month_index = 0;
			this.day_index = 0;
			this.time_index = 0;
			this.month_list = [];
			this.day_list = [];
			this.time_list = [];

			this.resolveLiuMonth();
		},
		async resolveLiuMonth() {
			const original = this.original;
			const current_index = this.current_index;
			const year_index = this.year_index;

			const dayun = original[current_index];
			const year = dayun.getLiuNian();

			const month = year[year_index].getLiuYue();

			const month_list = [];
			// 获取当前流年的节气表
			const jieqi = year[year_index].getLunar().getJieQiTable();
			// 获取下一年的节气表（用于小寒流月和大雪流月的下一个节气）
			const currentYear = year[year_index].getYear();
			const nextYearSolar = Solar.fromDate(new Date(currentYear + 1, 0, 1));
			const nextYearLunar = nextYearSolar.getLunar();
			const nextYearJieqi = nextYearLunar.getJieQiTable();
			
			const map = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', 'XIAO_HAN'];

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
					// 大雪流月：当前节气从当前流年获取，下一个节气（小寒）从下一年获取（优先使用中文键名）
					_jieqi = jieqi[map[i]];
					_next_jieqi = nextYearJieqi['小寒'] || nextYearJieqi['XIAO_HAN'];
				} else {
					// 其他流月：从当前流年的节气表获取
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
					shishen: utils.GetShiShen(ganzhi)
				});
			}

			this.month_list = month_list;
			this.day_index = 0;
			this.time_index = 0;
			this.day_list = [];
			this.time_list = [];
			
			// 自动定位到当前系统时间（延迟执行，确保数据已更新）
			// 使用 false 参数，允许定位大运和流年，但 resolve 方法会传递 true 避免递归
			setTimeout(() => {
				this.autoLocateToCurrentDate(false);
			}, 0);
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

			const year = year_list[year_index].year;
			let startSolar: Solar;
			let endSolar: Solar;

			// 使用库提供的 Solar 对象直接计算，避免手动拼接日期字符串
			if (month_index === 11) {
				// 小寒流月：特殊处理，起始日期为下一年的1月6号，结束日期为下一年的2月3号
				const nextYear = year + 1;
				startSolar = Solar.fromDate(new Date(nextYear, 0, 6)); // 1月6号（月份从0开始）
				endSolar = Solar.fromDate(new Date(nextYear, 1, 3)); // 2月3号
			} else {
				// 其他流月：使用当前节气的 Solar 对象作为起始
				startSolar = currentMonth.original as Solar;
				
				// 计算结束日期（下一个节气的日期）
				const [nextMonth, nextDay] = currentMonth.next_jieqi_date.split('/').map(Number);
				const endYear = month_index < 10 ? year : year + 1;
				endSolar = Solar.fromDate(new Date(endYear, nextMonth - 1, nextDay)); // 月份从0开始
			}

			const day_list = [];
			let currentSolar = startSolar;

			// 遍历从起始日期到结束日期的每一天
			// 对于小寒流月，包含结束日期（2月3号）
			// 对于其他流月，不包含结束日期（因为结束日期是下一个流月的起始日期）
			const includeEndDate = month_index === 11;
			
			while (true) {
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
					shishen: utils.GetShiShen(ganzhi)
				};
				day_list.push(params);
				
				// 移动到下一天
				currentSolar = currentSolar.next(1);
			}

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
			const start_time = new Date(date.replace(/-/g, '/').replace(/T/g, ' ')).getTime() - 60 * 60 * 1000;

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
					shishen: utils.GetShiShen(ganzhi)
				};
				time_list.push(params);
			}

			this.time_list = time_list;
		},
		// 自动定位到当前系统时间
		async autoLocateToCurrentDate(skipAutoLocate = false): Promise<void> {
			const now = new Date();
			const currentYear = now.getFullYear();
			const currentMonth = now.getMonth() + 1; // 1-12
			const currentDay = now.getDate();
			
			// 1. 定位大运：找到 start_year <= 当前年份的最大索引
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
					// resolveLiuYear 会调用 resolveLiuMonth，resolveLiuMonth 会调用 autoLocateToCurrentDate(true)
					// 所以这里不需要再次调用
					return;
				}
			}
			
			// 2. 定位流年：找到匹配当前年份的索引
			if (!skipAutoLocate && this.year_list && this.year_list.length > 0) {
				const yearIndex = this.year_list.findIndex((item: any) => item.year == currentYear);
				if (yearIndex >= 0 && this.year_index !== yearIndex) {
					this.year_index = yearIndex;
					await this.resolveLiuMonth();
					// resolveLiuMonth 会调用 autoLocateToCurrentDate(true)
					// 所以这里不需要再次调用
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
					
					// 获取当前流年的年份
					const yearList = this.year_list;
					const yearIndex = this.year_index;
					if (!yearList.length || yearIndex < 0 || yearIndex >= yearList.length) break;
					const year = (yearList[yearIndex] as any).year;
					
					// 计算流月的日期范围
					let startYear, startMonth, startDay, endYear, endMonth, endDay;
					if (i === 11) {
						// 小寒流月：下一年的1月6号到2月3号
						startYear = year + 1;
						startMonth = 1;
						startDay = 6;
						endYear = year + 1;
						endMonth = 2;
						endDay = 3;
					} else {
						// 其他流月：使用节气的日期范围
						const [month, day] = item.date.split('/').map(Number);
						startYear = year;
						startMonth = month;
						startDay = day;
						
						endYear = i < 10 ? year : year + 1;
						const [nextMonth, nextDay] = item.next_jieqi_date.split('/').map(Number);
						endMonth = nextMonth;
						endDay = nextDay;
					}
					
					// 判断当前日期是否在这个流月范围内
					const currentDate = new Date(currentYear, currentMonthNum - 1, currentDayNum);
					const startDate = new Date(startYear, startMonth - 1, startDay);
					const endDate = new Date(endYear, endMonth - 1, endDay);
					
					// 对于非小寒流月，结束日期不包含（因为结束日期是下一个流月的起始日期）
					if (i === 11) {
						// 小寒流月：包含结束日期
						if (currentDate >= startDate && currentDate <= endDate) {
							monthIndex = i;
							break;
						}
					} else {
						// 其他流月：不包含结束日期
						if (currentDate >= startDate && currentDate < endDate) {
							monthIndex = i;
							break;
						}
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
				// 格式化当前日期为 YYYY/M/D 或 YYYY/MM/DD 格式
				const currentDateStr1 = `${currentYear}/${currentMonth}/${currentDay}`;
				const currentDateStr2 = `${currentYear}/${currentMonth.toString().padStart(2, '0')}/${currentDay.toString().padStart(2, '0')}`;
				
				const dayIndex = this.day_list.findIndex((item: any) => {
					if (item.date) {
						// 格式化日期字符串进行比较（统一格式）
						const itemDate = item.date.replace(/-/g, '/');
						// 尝试多种格式匹配
						return itemDate === currentDateStr1 || 
						       itemDate === currentDateStr2 ||
						       itemDate.startsWith(currentDateStr1) ||
						       itemDate.startsWith(currentDateStr2);
					}
					return false;
				});
				if (dayIndex >= 0 && this.day_index !== dayIndex) {
					this.day_index = dayIndex;
				}
			}
		}
	}
});
