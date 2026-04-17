import { useBaziStore } from '@/store/bazi';
import { Solar } from 'lunar-javascript';
import config from "@/config/config"

export default {
	// 获取十神
	GetShiShen(ganzhi: string) {
		const bazi_store = useBaziStore();

		const { tiangan, dizhi } = config

		const selfgan = String(bazi_store.tiangan.day)
		const gan = String(ganzhi === "流年" ? bazi_store.tiangan.year : ganzhi[0] ?? '')
		const zhi = String(ganzhi === "流年" ? bazi_store.dizhi.year : ganzhi[1] ?? '')

		const tg = (tiangan as any)?.[selfgan]?.[gan] ?? ''
		const dz = (dizhi as any)?.[selfgan]?.[zhi] ?? ''

		return this.TransformShiShen(tg, dz)
	},
	// 转换十神
	TransformShiShen(a: string, b: string) {
		const map: Record<string, string> = {
			"正印": "印",
			"正官": "官",
			"劫财": "劫",
			"伤官": "伤",
			"正财": "财",
			"七杀": "杀",
			"偏印": "枭",
			"比肩": "比",
			"食神": "食",
			"偏财": "才",
		}
		return (map[a] ?? '') + (map[b] ?? '')
	},
	// 获取生肖
	GetChineseZodiac(year: number) {
		const animals = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'];
		return animals[year % 12];
	},
	// 获取五行
	Get5Elements(str: string, type: 't' | 'd' | 's' = 't') {
		let list: string[] = [];
		let el: string[] = []
		if (type == 't') {
			// 天干
			list = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
			el = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
		} else if (type == 'd') {
			// 地支
			list = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
			el = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
		} else if (type == 's') {
			// 生肖
			list = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
			el = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
		}
		return el[list.indexOf(str)] || '*';
	},
	// 结构数组
	DeArray(arr: Array<string | number> | null | undefined, type = "default") {
		if (!arr) {
			return '';
		}
		if (type == "canggan") {
			let str = ""
			for (let key of arr) {
				const k = String(key)
				str += k + this.Get5Elements(k) + "\r\n"
			}
			return str
		} else {
			return arr.map(String).join('\r\n');
		}
	},
	HideSecond(time: string | number | Date | null | undefined){
		try {
			if (time === null || time === undefined || time === '') {
				return '';
			}
			const dateObj = time instanceof Date ? time : new Date(time);
			if (Number.isNaN(dateObj.getTime())) {
				return '';
			}
			const solar = Solar.fromDate(dateObj);
			let date = solar.toYmdHms().replace(/-/g, '/')
			if (date && date.lastIndexOf(":") !== -1) {
				date = date.substr(0, date.lastIndexOf(":"))
			}
			return date || '';
		} catch (e) {
			return '';
		}
	}
}
