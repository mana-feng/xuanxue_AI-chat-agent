declare module 'lunar-javascript' {
	export class Solar {
		static fromDate(date: Date): Solar;
		static fromYmd(year: number, month: number, day: number): Solar;
		getYear(): number;
		getMonth(): number;
		getDay(): number;
		getHour(): number;
		getMinute(): number;
		getLunar(): Lunar;
		getXingzuo(): string;
		toYmd(): string;
		toYmdHms(): string;
		next(days: number): Solar;
		isBefore(solar: Solar): boolean;
		isAfter(solar: Solar): boolean;
	}

	export class Lunar {
		static fromDate(date: Date): Lunar;
		getYear(): number;
		getMonth(): number;
		getDay(): number;
		getHour(): number;
		getMinute(): number;
		getYearInChinese(): string;
		getMonthInChinese(): string;
		getDayInChinese(): string;
		getTimeGan(): string;
		getTimeZhi(): string;
		getDayGan(): string;
		getDayZhi(): string;
		getDayInGanZhi(): string;
		getTimeInGanZhi(): string;
		getJieQiTable(): { [key: string]: Solar };
		getJieQi(): string;
		getEightChar(): EightChar;
		toString(): string;
	}

	export class EightChar {
		getYear(): string;
		getMonth(): string;
		getDay(): string;
		getTime(): string;
		getYearGan(): string;
		getMonthGan(): string;
		getDayGan(): string;
		getTimeGan(): string;
		getYearZhi(): string;
		getMonthZhi(): string;
		getDayZhi(): string;
		getTimeZhi(): string;
		getYearWuXing(): string;
		getMonthWuXing(): string;
		getDayWuXing(): string;
		getTimeWuXing(): string;
		getYearNaYin(): string;
		getMonthNaYin(): string;
		getDayNaYin(): string;
		getTimeNaYin(): string;
		getYearDiShi(): string;
		getMonthDiShi(): string;
		getDayDiShi(): string;
		getTimeDiShi(): string;
		getYearHideGan(): string[];
		getMonthHideGan(): string[];
		getDayHideGan(): string[];
		getTimeHideGan(): string[];
		getYearShiShenGan(): string;
		getMonthShiShenGan(): string;
		getDayShiShenGan(): string;
		getTimeShiShenGan(): string;
		getYearShiShenZhi(): string[];
		getMonthShiShenZhi(): string[];
		getDayShiShenZhi(): string[];
		getTimeShiShenZhi(): string[];
		getYun(gender: number): Yun;
	}

	export class Yun {
		getStartYear(): number;
		getStartMonth(): number;
		getStartDay(): number;
		getStartHour(): number;
		getStartSolar(): Solar;
		getDaYun(): any[];
	}
}
