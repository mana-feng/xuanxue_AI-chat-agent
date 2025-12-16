/**
 * 八字排盘 Store
 * 
 * 重要说明：
 * 1. 所有排盘计算都在前端完成，使用 lunar-javascript 库
 * 2. 后端不进行任何排盘计算，只负责数据存储
 * 3. 计算结果只在本地显示，不发送完整计算过程到后端
 */
import { defineStore } from 'pinia';
import { useYunStore } from '@/store/yun';
import { Solar, Yun } from 'lunar-javascript';
import utils from '@/libs/utils/utils';
import {
	enhanceBaziAnalysis,
	BaziEnhancedData,
	calculateShenShaForGanZhi,
	calculateKongWangForGanZhi,
} from '@/libs/utils/bazi-enhanced';

interface PullData {
	timestamp: number;
	gender: number;
}

interface DateTimeFields {
	year: string | null;
	month: string | null;
	day: string | null;
	time: string | null;
}

interface SolarFields {
	year: number | null;
	month: number | null;
	day: number | null;
	time: string | null;
}

interface StartYunFields {
	year: number | null;
	month: number | null;
	day: number | null;
	hour: number | null;
	solar: string | null;
}

interface CangganFields {
	year: string[] | null;
	month: string[] | null;
	day: string[] | null;
	time: string[] | null;
}

interface FuxingFields {
	year: string[] | null;
	month: string[] | null;
	day: string[] | null;
	time: string[] | null;
}

interface LunarFields {
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
}

interface TableRow {
	data: {
		name: string;
		year: any;
		month: any;
		day: any;
		time: any;
	};
}

export const useBaziStore = defineStore('bazi', {
	state: () => {
		return {
			yun: null as Yun | null,
			yinli: null as string | null,
			yangli: null as string | null,
			xinzuo: null as string | null,
			lunar: null as LunarFields | null,
			// 四柱
			sizhu: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as DateTimeFields,
			// 阳历
			solar: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as SolarFields,
			// 天干
			tiangan: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as DateTimeFields,
			// 地支
			dizhi: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as DateTimeFields,
			// 五行
			wuxing: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as DateTimeFields,
			// 纳音
			nayin: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as DateTimeFields,
			// 地势
			dishi: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as DateTimeFields,
			// 藏干
			canggan: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as CangganFields,
			// 主星
			zhuxing: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as DateTimeFields,
			// 副星
			fuxing: {
				year: null,
				month: null,
				day: null,
				time: null,
			} as FuxingFields,
			start_yun: {
				year: null,
				month: null,
				day: null,
				hour: null,
				solar: null,
			} as StartYunFields,
			table: [] as TableRow[],
			// 增强分析数据
			enhanced: null as BaziEnhancedData | null,
		};
	},
	actions: {
		pull(data: PullData) {
			const { timestamp, gender } = data;

			const solar = Solar.fromDate(new Date(timestamp));
			const lunar = solar.getLunar();
			const bazi = lunar.getEightChar();
			// lunar-javascript 库标准：1=男，0=女
			// 前端统一标准：0=男，1=女
			// 需要反转：0(男) → 1，1(女) → 0
			const libraryGender = gender === 0 ? 1 : 0;
			const yun = bazi.getYun(libraryGender);
			this.yun = yun;

			this.yinli =
				lunar.getYear() +
				'年' +
				lunar.getMonthInChinese() +
				'月' +
				lunar.getDayInChinese() +
				'  ' +
				bazi.getTimeZhi() +
				'时';
			this.yangli = solar.toYmdHms().replace(/-/g, '/');

			this.xinzuo = solar.getXingzuo();

			this.lunar = {
				year: lunar.getYear(),
				month: lunar.getMonth(),
				day: lunar.getDay(),
				time: lunar.getHour() + ':' + lunar.getMinute(),
				hour: lunar.getHour(),
				minute: lunar.getMinute(),

				_year: lunar.getYearInChinese(),
				_month: lunar.getMonthInChinese(),
				_day: lunar.getDayInChinese(),
				_time: lunar.getTimeGan(),
			};

			this.solar = {
				year: solar.getYear(),
				month: solar.getMonth(),
				day: solar.getDay(),
				time: solar.getHour() + ':' + solar.getMinute(),
			};

			this.sizhu = {
				year: bazi.getYear(),
				month: bazi.getMonth(),
				day: bazi.getDay(),
				time: bazi.getTime(),
			};

			this.tiangan = {
				year: bazi.getYearGan(),
				month: bazi.getMonthGan(),
				day: bazi.getDayGan(),
				time: bazi.getTimeGan(),
			};

			this.dizhi = {
				year: bazi.getYearZhi(),
				month: bazi.getMonthZhi(),
				day: bazi.getDayZhi(),
				time: bazi.getTimeZhi(),
			};

			this.wuxing = {
				year: bazi.getYearWuXing(),
				month: bazi.getMonthWuXing(),
				day: bazi.getDayWuXing(),
				time: bazi.getTimeWuXing(),
			};

			this.nayin = {
				year: bazi.getYearNaYin(),
				month: bazi.getMonthNaYin(),
				day: bazi.getDayNaYin(),
				time: bazi.getTimeNaYin(),
			};

			this.dishi = {
				year: bazi.getYearDiShi(),
				month: bazi.getMonthDiShi(),
				day: bazi.getDayDiShi(),
				time: bazi.getTimeDiShi(),
			};

			this.canggan = {
				year: bazi.getYearHideGan(),
				month: bazi.getMonthHideGan(),
				day: bazi.getDayHideGan(),
				time: bazi.getTimeHideGan(),
			};

			this.zhuxing = {
				year: bazi.getYearShiShenGan(),
				month: bazi.getMonthShiShenGan(),
				day: bazi.getDayShiShenGan(),
				time: bazi.getTimeShiShenGan(),
			};

			this.fuxing = {
				year: bazi.getYearShiShenZhi(),
				month: bazi.getMonthShiShenZhi(),
				day: bazi.getDayShiShenZhi(),
				time: bazi.getTimeShiShenZhi(),
			};

			this.start_yun = {
				year: yun.getStartYear(),
				month: yun.getStartMonth(),
				day: yun.getStartDay(),
				hour: yun.getStartHour(),
				solar: yun.getStartSolar().toYmd(),
			};

			// 计算增强分析数据（提前计算，用于神煞显示）
			let enhanced: BaziEnhancedData | null = null;
			try {
				const shishen = {
					year: this.zhuxing.year,
					month: this.zhuxing.month,
					day: this.zhuxing.day,
					time: this.zhuxing.time,
				};
				enhanced = enhanceBaziAnalysis(bazi, solar, shishen);
				this.enhanced = enhanced;
			} catch (e) {
				this.enhanced = null;
			}

			// 计算每个四柱的神煞
			const dayGan = bazi.getDayGan();
			const yearGan = this.tiangan.year || '';
			const yearZhi = this.dizhi.year || '';
			const monthZhi = this.dizhi.month || '';
			const dayZhi = this.dizhi.day || '';
			const timeZhi = this.dizhi.time || '';
			const allZhi = [yearZhi, monthZhi, dayZhi, timeZhi];
			// 前端统一标准：0=男，1=女（与 bz.js 的 sx 相反：sx==0 用第一个元辰，sx==1 用第二个元辰）
			const shensha = {
				year: calculateShenShaForGanZhi(
					dayGan,
					this.sizhu.year || '',
					allZhi,
					yearZhi,
					monthZhi,
					dayZhi,
					timeZhi,
					yearGan,
					gender
				),
				month: calculateShenShaForGanZhi(
					dayGan,
					this.sizhu.month || '',
					allZhi,
					yearZhi,
					monthZhi,
					dayZhi,
					timeZhi,
					yearGan,
					gender
				),
				day: calculateShenShaForGanZhi(
					dayGan,
					this.sizhu.day || '',
					allZhi,
					yearZhi,
					monthZhi,
					dayZhi,
					timeZhi,
					yearGan,
					gender
				),
				time: calculateShenShaForGanZhi(
					dayGan,
					this.sizhu.time || '',
					allZhi,
					yearZhi,
					monthZhi,
					dayZhi,
					timeZhi,
					yearGan,
					gender
				),
			};

			const table = [];

			table.push({
				data: {
					name: '主星',
					year: this.zhuxing.year,
					month: this.zhuxing.month,
					// 前端统一标准：0=男，1=女
					day: gender === 0 ? '元男' : '元女',
					time: this.zhuxing.time,
				},
			});

			table.push({
				data: {
					name: '天干',
					year: this.tiangan.year,
					month: this.tiangan.month,
					day: this.tiangan.day,
					time: this.tiangan.time,
				},
			});

			table.push({
				data: {
					name: '地支',
					year: this.dizhi.year,
					month: this.dizhi.month,
					day: this.dizhi.day,
					time: this.dizhi.time,
				},
			});

			table.push({
				data: {
					name: '藏干',
					year: utils.DeArray(this.canggan.year, 'canggan'),
					month: utils.DeArray(this.canggan.month, 'canggan'),
					day: utils.DeArray(this.canggan.day, 'canggan'),
					time: utils.DeArray(this.canggan.time, 'canggan'),
				},
			});

			table.push({
				data: {
					name: '副星',
					year: utils.DeArray(this.fuxing.year),
					month: utils.DeArray(this.fuxing.month),
					day: utils.DeArray(this.fuxing.day),
					time: utils.DeArray(this.fuxing.time),
				},
			});

			table.push({
				data: {
					name: '星运',
					year: this.dishi.year,
					month: this.dishi.month,
					day: this.dishi.day,
					time: this.dishi.time,
				},
			});

			table.push({
				data: {
					name: '空亡',
					year: calculateKongWangForGanZhi(this.sizhu.year || '').join('、') || '',
					month: calculateKongWangForGanZhi(this.sizhu.month || '').join('、') || '',
					day: calculateKongWangForGanZhi(this.sizhu.day || '').join('、') || '',
					time: calculateKongWangForGanZhi(this.sizhu.time || '').join('、') || '',
				},
			});

			table.push({
				data: {
					name: '神煞',
					year: shensha.year,
					month: shensha.month,
					day: shensha.day,
					time: shensha.time,
				},
			});

			table.push({
				data: {
					name: '纳音',
					year: this.nayin.year,
					month: this.nayin.month,
					day: this.nayin.day,
					time: this.nayin.time,
				},
			});

			this.table = table;

			useYunStore().pull(yun.getDaYun());
		},
	},
});
