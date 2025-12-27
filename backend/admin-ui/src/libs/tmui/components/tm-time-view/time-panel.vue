<template>
	<!-- background:linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.6)),linear-gradient(0deg, rgba(255,255,255,0.95), rgba(255,255,255,0.6)) -->
<!-- :mask-style="isDark?'background:linear-gradient(0deg,rgba(0,0,0,0.4),rgba(0,0,0,0),rgba(0,0,0,0.4))':'background:rgba(255,255,255,0)'" -->
	<view class="flex-1 relative" :style="{height:props.height+'rpx'}">
		<!-- #ifndef APP-NVUE -->
		<picker-view  :value="[colIndex]" @change="colchange" :style="[{height:props.height+'rpx'}]"
		:mask-style="maskStyle"
		>
		    <picker-view-column
		    :style="[{height:props.height+'rpx'}]">
		        <view  v-for="(item,index) in tmArray" :key="index" class="flex"  style="justify-content: center;height:34px;align-items:center">
		            <TmText :font-size="30" :dark="isDark" :label="displayLabel(item)"></TmText>
		        </view>
		    </picker-view-column>
		</picker-view>
		<!-- #endif -->
		<!-- #ifdef APP-NVUE -->
		<picker-view ref="picker"  :value="[colIndex]" @change="colchange" :style="[{height:props.height+'rpx'}]"
		>
		    <picker-view-column
		    :style="[{height:props.height+'rpx'}]">
		        <view  v-for="(item,index) in tmArray" :key="index" class="flex"  style="justify-content: center;height:34px;align-items:center">
		            <TmText :font-size="30" :dark="isDark" :label="displayLabel(item)"></TmText>
		        </view>
		    </picker-view-column>
		</picker-view>
		<view v-if="isDark" :userInteractionEnabled="false" class="top absolute l-0 t-0" :style="{height:maskHeight+'px',width:maskWidth+'px'}"></view>
		<view v-if="isDark" :userInteractionEnabled="false" class="bottom absolute l-0 b-0" :style="{height:maskHeight+'px',width:maskWidth+'px'}"></view>
		<!-- #endif -->
	</view>
</template>
<script lang="ts" setup>
import { useTmpiniaStore } from '../../tool/lib/tmpinia';
import { computed, PropType, Ref,onUpdated, watchEffect,ref,getCurrentInstance,nextTick,onMounted,watch, toRaw } from 'vue';
import { showDetail,coltimeData,timeDetailType } from './interface'
import * as dayjs from "../../tool/dayjs/esm/index"
import isSameOrBefore from '../../tool/dayjs/esm/plugin/isSameOrBefore/index';
import isSameOrAfter from '../../tool/dayjs/esm/plugin/isSameOrAfter/index';
import isBetween from '../../tool/dayjs/esm/plugin/isBetween/index';
import TmText from '../tm-text/tm-text.vue';
import { Solar, Lunar } from 'lunar-javascript';
// #ifdef APP-PLUS-NVUE
const dom = uni.requireNativePlugin('dom')
// #endif
dayjs.default.extend(isBetween)
dayjs.default.extend(isSameOrBefore)
dayjs.default.extend(isSameOrAfter)
const DayJs = dayjs.default;
const { proxy } = getCurrentInstance();
const store = useTmpiniaStore();
const toSafeDate = (value: ReturnType<typeof DayJs>) =>
	new Date(value.year(), value.month(), value.date(), value.hour(), value.minute(), value.second());
const props = defineProps({
    nowtime:{
        type:String,
        default:"",
        required:true
    },
    start:{
        type:String,
        default:"",
        required:true
    },
    end:{
        type:String,
        default:"",
        required:true
    },
    timeType:{
        type:String as PropType<timeDetailType>,
        default:'year',
        required:true
    },
    //禁用的部分日期，禁用的日期将不会被选中，就算滑到了该位置，也会回弹到之前的时间。
	disabledDate:{
		type:Array as PropType<Array<Number|String|Date>>,
		default:():Array<Number|String|Date>=>[]
	},
    height:{
        type:Number,
        default:600
	},
    //日期的后缀，
	suffix:{
		type:String,
		default:''
	},
	//完整的后缀对象，用于判断是否是阴历模式
	showSuffix:{
		type:Object,
		default:()=>({})
	},
})
//父级方法。
let parent = proxy.$parent
while (parent) {
    if (parent?.tmTimeViewName == 'tmTimeViewName' || !parent) {
        break;
    } else {
        parent = parent?.$parent ?? undefined
    }
}
const tmArray:Ref<Array<number>> = ref([]);
const _nowtimeValue = computed(()=>DayJs(props.nowtime))
const colIndex  = ref(0)
const isDark = computed(() => store.tmStore.dark);
// 判断是否是阴历模式（通过检查小时后缀是否是"时辰"）
const isLunarMode = computed(() => props.showSuffix?.hour === '时辰');
const maskHeight = computed(()=>{
	return (uni.upx2px(props.height)-34)/2
})
const maskWidth = ref(0)
const zhiHours = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const zhiRanges = ['23:00-00:59','01:00-02:59','03:00-04:59','05:00-06:59','07:00-08:59','09:00-10:59','11:00-12:59','13:00-14:59','15:00-16:59','17:00-18:59','19:00-20:59','21:00-22:59'];
const maskStyle = computed(()=>{
		let str_white = 'background-image:linear-gradient(rgba(255,255,255,0.95),rgba(255,255,255,0.6)),linear-gradient(rgba(255,255,255,0.6),rgba(255,255,255,0.95))'
	let str_black = 'background-image:linear-gradient(rgba(17, 17, 17, 1.0),rgba(106, 106, 106, 0.2)),linear-gradient(rgba(106, 106, 106, 0.2),rgba(17, 17, 17, 1.0))'
	
	// #ifdef APP-NVUE
	str_black='background-image: linear-gradient(to bottom,rgba(30, 30, 30, 0.9),rgba(104, 104, 104, 0.6))'
	// #endif
	if(!isDark.value){
		return str_white
	}
	return str_black
})
// rangeTimeArray()
watch([()=>props.start,()=>props.end],()=>{
    rangeTimeArray();
})
watch([()=>props.nowtime],(newval,oldval)=>{
    //前面相册的时间段不需要更新。
    if( DayJs(String(oldval)).isSame(String(newval),props.timeType)){
        return;
    }
    rangeTimeArray();
})
onMounted(()=>{
	nvuegetClientRect()
    nextTick(()=>{
        setTimeout(()=>{
            rangeTimeArray()
        },60)
    })
})
onUpdated(()=>nvuegetClientRect())
function getIndexNow(){
	let currentValue = 0;
	if(isLunarMode.value && (props.timeType === 'month' || props.timeType === 'date')){
		// 阴历模式下，需要获取阴历的月份或日期
		const solar = Solar.fromDate(toSafeDate(_nowtimeValue.value));
		const lunar = solar.getLunar();
		if(props.timeType === 'month'){
			currentValue = lunar.getMonth(); // 阴历月份（1-12）
		}else if(props.timeType === 'date'){
			currentValue = lunar.getDay(); // 阴历日期（1-30）
		}
	}else{
		// 阳历模式或非月份/日期类型
		if(props.timeType === 'month'){
			currentValue = _nowtimeValue.value.month() + 1; // dayjs的month是0-11，需要+1
		}else{
			currentValue = _nowtimeValue.value[props.timeType]();
		}
	}
	let index = tmArray.value.findIndex(el=>el==currentValue);
    if(index==-1) index=0;
    if(index>=tmArray.value.length) index = tmArray.value.length-1
	// #ifdef H5
	colIndex.value = -1
	// #endif
	colIndex.value = index
}
// 阴历月份中文名称
const lunarMonthNames = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

// 阴历日期中文名称
function getLunarDayName(day: number): string {
	if (day === 1) return '初一';
	if (day === 2) return '初二';
	if (day === 3) return '初三';
	if (day === 4) return '初四';
	if (day === 5) return '初五';
	if (day === 6) return '初六';
	if (day === 7) return '初七';
	if (day === 8) return '初八';
	if (day === 9) return '初九';
	if (day === 10) return '初十';
	if (day === 11) return '十一';
	if (day === 12) return '十二';
	if (day === 13) return '十三';
	if (day === 14) return '十四';
	if (day === 15) return '十五';
	if (day === 16) return '十六';
	if (day === 17) return '十七';
	if (day === 18) return '十八';
	if (day === 19) return '十九';
	if (day === 20) return '二十';
	if (day === 21) return '廿一';
	if (day === 22) return '廿二';
	if (day === 23) return '廿三';
	if (day === 24) return '廿四';
	if (day === 25) return '廿五';
	if (day === 26) return '廿六';
	if (day === 27) return '廿七';
	if (day === 28) return '廿八';
	if (day === 29) return '廿九';
	if (day === 30) return '三十';
	return `${day}日`;
}

// 获取阴历月份中文名称（支持闰月）
function getLunarMonthName(month: number, year?: number): string {
	if (month >= 1 && month <= 12) {
		// 检查是否是闰月
		if (year) {
			try {
				// 尝试创建该月的日期来判断是否是闰月
				const testLunar = Lunar.fromYmd(year, month, 1);
				// 如果 month 大于 12，可能是闰月
				// 但 lunar-javascript 可能用其他方式表示闰月
				// 这里先简单处理
				return lunarMonthNames[month];
			} catch (e) {
				return lunarMonthNames[month];
			}
		}
		return lunarMonthNames[month];
	} else if (month === 13) {
		// 第13个月通常是闰月，需要根据实际情况判断是闰几月
		// 这里先简单处理，显示"闰月"
		// 实际应该根据年份判断是闰几月
		if (year) {
			// 尝试判断是闰几月
			// 由于 lunar-javascript 的闰月处理可能不同，这里先简化
			return '闰月';
		}
		return '闰月';
	}
	return `${month}月`;
}

function displayLabel(val:number){
	if(props.timeType==='hour' && props.suffix==='时辰'){
		const idx = val === 23 || val === 0 ? 0 : Math.floor((val + 1) / 2);
		const zhi = zhiHours[idx] ?? '';
		const range = zhiRanges[idx] ?? '';
		return range ? `${zhi}(${range})` : `${zhi}时辰`;
	}
	if(isLunarMode.value && props.timeType === 'month'){
		// 阴历月份显示中文名称
		const currentDate = toSafeDate(_nowtimeValue.value);
		const solar = Solar.fromDate(currentDate);
		const lunar = solar.getLunar();
		const year = lunar.getYear();
		
		if (val >= 1 && val <= 12) {
			// 检查是否是闰月
			// 尝试通过创建该月的日期来判断
			try {
				const testLunar = Lunar.fromYmd(year, val, 1);
				// 如果能创建，说明是正常月份
				return lunarMonthNames[val];
			} catch (e) {
				// 如果创建失败，可能是闰月
				return `闰${lunarMonthNames[val]}`;
			}
		} else if (val === 13) {
			// 第13个月通常是闰月
			// 需要判断是闰几月（通常是闰中间某个月）
			// 这里简化处理，显示"闰月"
			return '闰月';
		}
		return `${val}${props.suffix}`;
	}
	if(isLunarMode.value && props.timeType === 'date'){
		// 阴历日期显示中文名称
		return getLunarDayName(val);
	}
	return `${val}${props.suffix}`;
}
function rangeTimeArray(){
    let _start = DayJs(props.start);
    let _end = DayJs(props.end);
    let intdate = 0
    
    // 如果是阴历模式且是月份或日期类型，需要特殊处理
    if(isLunarMode.value && (props.timeType === 'month' || props.timeType === 'date')){
        rangeLunarTimeArray();
        return;
    }
    
    if(props.timeType=='date'){
        intdate = 1;
    }
	if(props.timeType=='month'){
        intdate = 1;
    }
    if(props.timeType=='year'){
        intdate = _start.year();
    }

    if(props.timeType=='year'){
       tmArray.value = rangeNumber(intdate,_end.year());
    }else if(props.timeType=='month'){
       setd(timeDetailType.year,false)
    }else if(props.timeType=='date'){
		
       setd(timeDetailType.month,false)
    }else if(props.timeType=='hour'){
       setd(timeDetailType.day,false)
    }else if(props.timeType=='minute'){
       setd(timeDetailType.hour,false)
    }else if(props.timeType=='second'){
       setd(timeDetailType.minute,false)
    }else if(props.timeType=='second'){
       setd(timeDetailType.second,false)
    }

    function setd(type:timeDetailType,isno=true){
        if(_nowtimeValue.value.isSameOrBefore(_start,type)){
            // 这是开始的数字。
            intdate = _start[props.timeType]();
			
            tmArray.value = rangeNumber(intdate,getEndNumber(_start,true));
        }else if(_nowtimeValue.value.isSameOrAfter(_end,type)){
            tmArray.value = rangeNumber(intdate,getEndNumber(_end,isno));
        }else if(_nowtimeValue.value.isBetween(_start,_end,props.timeType,'()')){
            tmArray.value = rangeNumber(intdate,getEndNumber(_nowtimeValue.value,true));
            
        }
    }
    
    nextTick(()=>getIndexNow())
}

// 生成阴历月份或日期数组
function rangeLunarTimeArray(){
    const currentDate = toSafeDate(_nowtimeValue.value);
    const solar = Solar.fromDate(currentDate);
    const lunar = solar.getLunar();
    
    if(props.timeType === 'month'){
        // 阴历月份：1-12，但需要考虑闰月
        // 获取当前年份的所有月份（包括闰月）
        const year = lunar.getYear();
        // 通过尝试创建每个月的日期来判断月份是否存在
        // 阴历月份范围通常是1-12，但有些年份有闰月（13个月）
        const months: number[] = [];
        // 先尝试1-12月
        for(let m = 1; m <= 12; m++){
            try {
                const testLunar = Lunar.fromYmd(year, m, 1);
                months.push(m);
            } catch (e) {
                // 如果创建失败，说明该月不存在（不应该发生）
            }
        }
        // 检查是否有闰月（闰月通常用负数表示，如-5表示闰五月）
        // 但 lunar-javascript 可能用其他方式表示闰月
        // 为了简化，我们先使用1-12，如果有闰月再扩展
        // 实际上，我们需要检查当前年份是否有闰月
        // 通过尝试创建13个月来判断
        try {
            const testLunar13 = Lunar.fromYmd(year, 13, 1);
            months.push(13);
        } catch (e) {
            // 没有第13个月
        }
        tmArray.value = months.length > 0 ? months : rangeNumber(1, 12);
    }else if(props.timeType === 'date'){
        // 阴历日期：根据月份不同，可能是29或30天
        const year = lunar.getYear();
        const month = lunar.getMonth();
        // 通过尝试创建日期来判断该月有多少天
        // 从1日开始，尝试创建日期，直到失败
        let dayCount = 0;
        for(let d = 1; d <= 30; d++){
            try {
                const testLunar = Lunar.fromYmd(year, month, d);
                dayCount = d;
            } catch (e) {
                // 如果创建失败，说明该日期不存在，说明上一天就是该月的最后一天
                break;
            }
        }
        // 如果dayCount为0，说明无法确定，使用默认值30
        tmArray.value = rangeNumber(1, dayCount > 0 ? dayCount : 30);
    }
    
    nextTick(()=>getIndexNow())
}

function getEndNumber(d,isno=true){
    let _start = DayJs(props.start);
    let _end = DayJs(props.end);
    let jh = {
            year:_end.year(),
            month:12,
            date:d.daysInMonth(),
            hour:23,
            minute:59,
            second:59,
    }
    if(isno) return jh[props.timeType];
	// month 返回 0-11，这里保持 1-12
	if(props.timeType==='month') return d.month()+1;
    return d[props.timeType]();
}
function rangeNumber(from=0,to=0){
	let range:Array<number> = []
	from = from >= 0 ? from : 1
	for (let i = from; i <= to; i++) {
		range.push(i)
	}
	return range
}

function colchange(e:any){
    if(tmArray.value.length==0) return;
    
    let selectedValue = tmArray.value[e.detail.value[0]];
    
    // 如果是阴历模式且是月份或日期类型，需要将阴历值转换为阳历时间
    if(isLunarMode.value && (props.timeType === 'month' || props.timeType === 'date')){
        const currentDate = toSafeDate(_nowtimeValue.value);
        const solar = Solar.fromDate(currentDate);
        const lunar = solar.getLunar();
        
        let newLunarYear = lunar.getYear();
        let newLunarMonth = props.timeType === 'month' ? selectedValue : lunar.getMonth();
        let newLunarDay = props.timeType === 'date' ? selectedValue : lunar.getDay();
        
        // 如果是月份变化，日期需要重置为1（因为不同月份的天数不同）
        if(props.timeType === 'month'){
            newLunarDay = 1;
        }
        
        // 将阴历日期转换为阳历日期
        try {
            const newLunar = Lunar.fromYmd(newLunarYear, newLunarMonth, newLunarDay);
            const newSolar = newLunar.getSolar();
            const newDate = new Date(newSolar.getYear(), newSolar.getMonth() - 1, newSolar.getDay(), 
                                    currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
            
            // 构造新的时间字符串并直接更新nowtime
            const newTimeStr = DayJs(newDate).format('YYYY-MM-DD HH:mm:ss');
            
            // 由于parent.setNowtime只能设置单个字段，我们需要分别设置月份和日期
            // 先设置月份
            if(props.timeType === 'month'){
                parent?.setNowtime(newSolar.getMonth() - 1, 'month');
                // 然后在下一个tick中设置日期
                nextTick(() => {
                    parent?.setNowtime(newSolar.getDay(), 'date');
                });
            }else if(props.timeType === 'date'){
                // 设置阳历日期（1-31）
                parent?.setNowtime(newSolar.getDay(), props.timeType);
            }
        } catch (error) {
            console.error('阴历日期转换失败:', error);
            // 如果转换失败，使用原来的逻辑
            parent?.setNowtime(selectedValue, props.timeType);
        }
    }else{
        // 阳历模式或非月份/日期类型，直接使用原逻辑
        parent?.setNowtime(selectedValue, props.timeType);
    }
}

function nvuegetClientRect() {
    nextTick(function () {
        // #ifdef APP-PLUS-NVUE
        dom.getComponentRect(proxy.$refs.picker, function (res) {
            if (res?.size) {
                maskWidth.value = res.size.width;
				
                if (res.size.width == 0) {
                    nvuegetClientRect()
                }
            }
        })
        // #endif
        
    })

}
</script>
<style scoped>
	.top{
		background-image: linear-gradient(to bottom,rgba(17, 17, 17, 1),rgba(36, 36, 36, 0.6));  
	}
	.bottom{
		background-image: linear-gradient(to top,rgba(17, 17, 17, 1),rgba(36, 36, 36, 0.6));  
		
	}
</style>
