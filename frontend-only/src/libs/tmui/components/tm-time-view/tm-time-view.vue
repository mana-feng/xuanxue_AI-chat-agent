<template>
	<view class="flex flex-row" >
		<view v-if="showCol.year" :style="panelStyle('year')">
			<timePanelVue :suffix="props.showSuffix.year" :show-suffix="props.showSuffix" :height="props.height" :disabled-date="props.disabledDate" :time-type="timeDetailType.year" :start="_startTime" :end="_endTime" :nowtime="_nowtimeValue"></timePanelVue>
		</view>
		<view v-if="showCol.month" :style="panelStyle('month')">
			<timePanelVue :suffix="props.showSuffix.month" :show-suffix="props.showSuffix" :height="props.height" :disabled-date="props.disabledDate" :time-type="timeDetailType.month" :start="_startTime" :end="_endTime" :nowtime="_nowtimeValue"></timePanelVue>
		</view>
		<view v-if="showCol.day" :style="panelStyle('day')">
			<timePanelVue :suffix="props.showSuffix.day" :show-suffix="props.showSuffix" :height="props.height" :disabled-date="props.disabledDate" :time-type="timeDetailType.day" :start="_startTime" :end="_endTime" :nowtime="_nowtimeValue"></timePanelVue>
		</view>
		<view v-if="showCol.hour" :style="panelStyle('hour')">
			<timePanelVue :suffix="props.showSuffix.hour" :show-suffix="props.showSuffix" :height="props.height" :disabled-date="props.disabledDate" :time-type="timeDetailType.hour" :start="_startTime" :end="_endTime" :nowtime="_nowtimeValue"></timePanelVue>
		</view>
		<view v-if="showCol.minute" :style="panelStyle('minute')">
			<timePanelVue :suffix="props.showSuffix.minute" :show-suffix="props.showSuffix" :height="props.height" :disabled-date="props.disabledDate" :time-type="timeDetailType.minute" :start="_startTime" :end="_endTime" :nowtime="_nowtimeValue"></timePanelVue>
		</view>
		<view v-if="showCol.second" :style="panelStyle('second')">
			<timePanelVue :suffix="props.showSuffix.second" :show-suffix="props.showSuffix" :height="props.height" :disabled-date="props.disabledDate" :time-type="timeDetailType.second" :start="_startTime" :end="_endTime" :nowtime="_nowtimeValue"></timePanelVue>
		</view>
	</view>
</template>

<script lang="ts" setup>
/**
 * 时间选择
 * @description 嵌入在页面的时间选择器。
 */
import { computed, PropType, watchEffect,ref, toRaw,onMounted,nextTick, watch } from 'vue';
import { showDetail,coltimeData,timeDetailType } from './interface'
import dayjs from "../../tool/dayjs/esm/index"
import timePanelVue from './time-panel.vue';

const emits = defineEmits(['update:modelValue','update:modelStr','change'])
const tmTimeViewName = "tmTimeViewName"
const DayJs = dayjs;
type ColumnFlex = Partial<Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>>;
const props = defineProps({
	//这里是动态返回时间戳。这是一个标准的时间，不管showDetail是如何设置都将不影响这里的输出。
	modelValue:{
		type:[Number,String,Date],
		default:''
	},
	//这里和modelValue不一样，它只代表格式化输出显示，因此这里可能并不是一个有效的时间值。
	/**
	 * 比如:format为"MM/DD",那这里就会显示12/10这样的时间格式，因此并不是一个正确的时间，
	 * 这里主要是为了方便表单上页面的显示控制输入。如果真要保存到数据库，你应该保存modelValue的值。
	 */
	modelStr:{
		type:[String],
		default:''
	},
	defaultValue:{
		type:[Number,String,Date],
		default:''
	},
	//禁用的部分日期，禁用的日期将不会被选中，就算滑到了该位置，也会回弹到之前的时间。
	/**
	 * 现在暂时只禁用到天，也就是一个时间到天这如果==下面的禁用日期，就会选不中。
	 */
	disabledDate:{
		type:Array as PropType<Array<number|string|Date>>,
		default:():Array<number|string|Date>=>[]
	},
	//展示格式。最终影响到modelStr输出格式的内容。
	format:{
		type:String,
		default:"YYYY/MM/DD"
	},
	//需要展现的时间格式类型
	showDetail:{
		type:Object as PropType<showDetail>,
		default:()=>{
			return {
				year:true,
				month:true,
				day:true,
				hour:false,
				minute:false,
				second:false
			}
		}
	},
	//日期的后缀，
	showSuffix:{
		type:Object,
		default:()=>{
			return {
				year:'年',
				month:'月',
				day:'日',
				hour:'时',
				minute:'分',
				second:'秒'
			}
		}
	},
	columnFlex: {
		type: Object as PropType<ColumnFlex>,
		default: () => ({})
	},
	start:{
		type:[Number,String,Date],
		default:'2008/01/01 00:00:00'
	},
	end:{
		type:[Number,String,Date],
		default:''
	},
	height:{
		type:Number,
		default:300
	}
})

const _nowtime = ref(DayJs(props.defaultValue).isValid()?DayJs(props.defaultValue):DayJs());
const _nowtimeValue = computed(()=>_nowtime.value.format())

const _startTime = computed(()=>{
	return DayJs(props.start).isValid()?DayJs(props.start).format():DayJs('2008/01/01 00:00:00').format();
})
const _endTime = computed(()=>{
	return DayJs(props.end).isValid()?DayJs(props.end).format():DayJs().format();
})

const showCol = computed(()=>props.showDetail)

const normalizedColumnFlex = computed(() => {
	return {
		year: 1,
		month: 1,
		day: 1,
		hour: 1,
		minute: 1,
		second: 1,
		...(props.columnFlex || {})
	};
});

function panelStyle(key: keyof ColumnFlex) {
	const flex = normalizedColumnFlex.value[key] ?? 1;
	return {
		flex,
		flexGrow: flex,
		flexShrink: 1,
		flexBasis: '0%',
		minWidth: '0'
	};
}

function setNowtime(data:number,type:timeDetailType){
	 let d= DayJs(toRaw(_nowtime.value));
	 
	 const old = _nowtimeValue.value;
	 // dayjs 的 month 为 0-11，这里使用 1-12 的列值需要手动减 1
	const next =
		type === timeDetailType.month
			? DayJs(d.month(Math.max(0, data - 1)))
			: DayJs(d[type](data));
	_nowtime.value  =  next
	if(isDisabledDate(_nowtime.value.format())){
		nextTick(()=>_nowtime.value  =  DayJs(old))
		return;
	}
	emits('update:modelValue',_nowtime.value.format("YYYY/MM/DD HH:mm:ss"))
	emits('update:modelStr',_nowtime.value.format(props.format))
	emits('change',_nowtime.value.format(props.format))
}
//检测当前选中的时间是否处于被禁用的日期中。
function isDisabledDate(nowtime:string){
	let d = DayJs(nowtime)
    let len = props.disabledDate.filter(el=>{
        return d.isSame(el,timeDetailType.day)
    })
    return len.length>0;
}
watch(()=>props.modelValue,(newval,oldval)=>{
	if(DayJs(props.modelValue).isValid()==false||!oldval) return;
	_nowtime.value = DayJs(props.modelValue)
	emits('update:modelStr',_nowtime.value.format(props.format))
})

onMounted(()=>{
	nextTick(()=>{
		emits('update:modelValue',_nowtime.value.format(props.format))
		emits('update:modelStr',_nowtime.value.format(props.format))
	})
})
defineExpose({tmTimeViewName,setNowtime})
</script>

<style>

</style>
