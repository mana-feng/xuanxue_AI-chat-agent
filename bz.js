var $tiangan = [ "癸","甲","乙","丙","丁","戊","己","庚","辛","壬" ];
var $dizhi = [ "亥","子","丑","寅","卯","辰","巳","午","未","申","酉","戌" ];
// 1911年月干
var $yuegan1911 = [ "庚","辛","壬","癸","甲","乙","丙","丁","戊","己" ];
var $jie = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', 'XIAO_HAN', 'LI_CHUN'];
var $ssShorter = {
	'比肩': '比',
	'劫财': '劫',
	'正印': '印',
	'偏印': '枭',
	'正官': '官',
	'七杀': '杀',
	'正财': '财',
	'偏财': '才',
	'伤官': '伤',
	'食神': '食',
};

// 天干地支留意
var liuyi = [
	['甲己', '合土'],
	['乙庚', '合金'],
	['丙辛', '合水'],
	['丁壬', '合木'],
	['戊癸', '合火'],

	['甲庚', '冲'],
	['乙辛', '冲'],
	['丙壬', '冲'],
	['丁癸', '冲'],

	['巳申', '合化水'],
	['辰酉', '合化金'],
	['卯戌', '合化火'],
	['寅亥', '合化木'],
	['子丑', '合化土'],
	['午未', '合化火或土'],

	['申子辰', '合化水'],
	['寅午戌', '合化火'],
	['亥卯未', '合化木'],
	['巳酉丑', '合化金'],

	['亥子丑', '汇聚北方水'],
	['寅卯辰', '汇聚东方木'],
	['巳午未', '汇聚南方火'],
	['申酉戌', '汇聚西方金'],

	['子卯', '为无礼之刑'],
	['丑未戌', '为恃势之刑'],
	['寅巳申', '为无恩之刑'],
	['辰辰', '为自刑'],
	['午午', '为自刑'],
	['酉酉', '为自刑'],
	['亥亥', '为自刑'],

	['子午', '相冲'],
	['卯酉', '相冲'],
	['寅申', '相冲'],
	['巳亥', '相冲'],
	['辰戌', '相冲'],
	['丑未', '相冲'],

	['子未', '相害'],
	['丑午', '相害'],
	['寅巳', '相害'],
	['卯辰', '相害'],
	['申亥', '相害'],
	['酉戍', '相害'],

	['寅午', '暗合土'],
	['子巳', '暗合火'],
	['巳酉', '暗合水'],
	['卯申', '暗合金'],
	['亥午', '暗合木'],

	['子酉', '相破'],
	['寅亥', '相破'],
	['卯午', '相破'],
	['辰丑', '相破'],
	['巳申', '相破'],
	['未戌', '相破']
];

var currentYear = (new Date()).getFullYear();
var currentYearMonth = currentYear + '-' + (new Date()).getMonth();
var currentDay = (new Date()).getDate();

// 本命部分的天干留意
(function () {
	var tglineArr = $("#bm_tgline .big").map((i, v) => v.innerText).get();
	var dzlineArr = $("#bm_dzline .big").map((i, v) => v.innerText).get();
	for (var item of liuyi) {
		// 天干留意
		let tmpArr = [...tglineArr], result = '';
		for (let j = 0; j < item[0].length; j++) {
			let iArr = tmpArr.indexOf(item[0][j]);
			if (iArr >= 0) 
				result += tmpArr.splice(iArr, 1)[0];
		}
		if (result == item[0])
			document.querySelector("#bm_tgliuyi").innerHTML += item[0] + item[1] + '; ';

		// 地支留意
		tmpArr = [...dzlineArr], result = '';
		for (let j = 0; j < item[0].length; j++) {
			let iArr = tmpArr.indexOf(item[0][j]);
			if (iArr >= 0) 
				result += tmpArr.splice(iArr, 1)[0];
		}
		if (result == item[0])
			document.querySelector("#bm_dzliuyi").innerHTML += item[0] + item[1] + '; ';
	}
})();

// 计算空亡
function xunkong(gz1) {
	var xkarr = [
		["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","戌亥"],
		["甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","申酉"],
		["甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳","午未"],
		["甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯","辰巳"],
		["甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑","寅卯"],
		["甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥","子丑"]
	];
	var tag = 0;
	var xunk = "";
	for(var i = 0; i <= 5; i++) {
		for(var j = 0; j <= 9; j++) {
			if(xkarr[i][j] == gz1) {
				xunk = xkarr[i][10];
				tag = 1;
				break;
			}
		}
		if(tag == 1) break;
	}
	return xunk;
}
function getWuxing(tgdz)
{
	switch(tgdz)
	{
	case "子":wh="水";break;
	case "亥":wh="水";break;
	case "寅":wh="木";break;
	case "卯":wh="木";break;
	case "巳":wh="火";break;
	case "午":wh="火";break;
	case "申":wh="金";break;
	case "酉":wh="金";break;
	case "辰":wh="土";break;
	case "戌":wh="土";break;
	case "丑":wh="土";break;
	case "未":wh="土";break;
	case "甲":wh="木";break;
	case "乙":wh="木";break;
	case "丙":wh="火";break;
	case "丁":wh="火";break;
	case "戊":wh="土";break;
	case "己":wh="土";break;
	case "庚":wh="金";break;
	case "辛":wh="金";break;
	case "壬":wh="水";break;
	case "癸":wh="水";break;
	}
	return wh;
}
function getNayin(gz)
{
	gzu=["甲子","丙寅","戊辰","庚午","壬申","甲戌","丙子","戊寅","庚辰","壬午","甲申","丙戌","戊子","庚寅","壬辰","甲午","丙申","戊戌","庚子","壬寅","甲辰","丙午","戊申","庚戌","壬子","甲寅","丙辰","戊午","庚申","壬戌"];
	zzu=["乙丑","丁卯","己巳","辛未","癸酉","乙亥","丁丑","己卯","辛巳","癸未","乙酉","丁亥","己丑","辛卯","癸巳","乙未","丁酉","己亥","辛丑","癸卯","乙巳","丁未","己酉","辛亥","癸丑","乙卯","丁巳","己未","辛酉","癸亥"];
	nyzu=["海中金","炉中火","大林木","路旁土","剑锋金","山头火","涧下水","城头土","白腊金","杨柳木 ","泉中水","屋上土","霹雳火","松柏木","长流水","砂石金","山下火","平地木","壁上土","金薄金","覆灯火","天河水","大驿土","钗环金","桑柘木","大溪水","沙中土","天上火","石榴木","大海水"];
	z1 = gzu.indexOf(gz);
	if(z1 != -1){
		nayin = nyzu[z1];
	}else{
		nayin = nyzu[zzu.indexOf(gz)];
	}
	return nayin;
}
function Shen_niangan(ng, gz) {
    arr = [
		["天乙贵人","甲戊:丑未","乙己:申子","丙丁:亥酉","壬癸:卯巳","庚辛:寅午"],
		["太极贵人","甲乙:子午","丙丁:卯酉","戊己:辰戌丑未","庚辛:寅亥","壬癸:巳申"],
		["文昌贵人","甲乙:巳午","丙戊:申","丁己:酉","庚:亥","辛:子","壬:寅","癸:卯"],
		["天厨贵人","甲:巳","乙:午","丙:子","丁:巳","戊:午","己:申","庚:寅","辛:午","壬:酉","癸:亥"],
		["国印贵人","甲:戌","乙:亥","丙:丑","丁:寅","戊:丑","己:寅","庚:辰","辛:巳","壬:未","癸:申"],
		["学堂","甲:己亥","乙:壬午","丙:丙寅","丁:丁酉","戊:戊寅","己:己酉","庚:辛巳","辛:甲子","壬:甲申","癸:乙卯"],
		["词馆","甲:庚寅","乙:辛卯","丙:乙巳","丁:戊午","戊:丁巳","己:庚午","庚:壬申","辛:癸酉","壬:癸亥","癸:壬戌"]
	];
    shens = "";
    dza = gz[1];
    for (i = 0; i <= 6; i++) {
        if (i <= 4) {
            for (j = 1; j <= arr[i].length - 1; j++) {
                str = arr[i][j].split(':');
                if (str[0].includes(ng) && str[1].includes(dza)) {
                    shens = shens + " " + arr[i][0];
                    break;
                }
            }
        } else {
            for (j = 1; j <= arr[i].length - 1; j++) {
                str = arr[i][j].split(':');
                if (str[0] == ng && str[1] == gz && getWuxing(ng) == getNayin(gz)[2]) {
                    shens = shens + " " + arr[i][0];
                    break;
                }
            }
        }
    }
    return (shens);
}
function Shen_nianzhi(nz, dza, nzx, sx) {
	arr=[
		["红鸾","子:卯","丑:寅","寅:丑","卯:子","辰:亥","巳:戌","午:酉","未:申","申:未","酉:午","戌:巳","亥:辰"],
		["天喜","子:酉","丑:申","寅:未","卯:午","辰:巳","巳:辰","午:卯","未:寅","申:丑","酉:子","戌:亥","亥:戌"],
		["元辰","子:未","丑:申","寅:酉","卯:戌","辰:亥","巳:子","午:丑","未:寅","申:卯","酉:辰","戌:巳","亥:午"],
		["元辰","子:巳","丑:午","寅:未","卯:申","辰:酉","巳:戌","午:亥","未:子","申:丑","酉:寅","戌:卯","亥:辰"],
		["灾煞","申子辰:午","亥卯未:酉","寅午戌:子","巳酉丑:卯"],
		["孤辰","亥子丑:寅","寅卯辰:巳","巳午未:申","申酉戌:亥"],
		["寡宿","亥子丑:戌","寅卯辰:丑","巳午未:辰","申酉戌:未"],
		["驿马","申子辰:寅","寅午戌:申","巳酉丑:亥","亥卯未:巳"],
		["华盖","寅午戌:戌","亥卯未:未","申子辰:辰","巳酉丑:丑"],
		["将星","寅午戌:午","巳酉丑:酉","申子辰:子","亥卯未:卯"],
		["劫煞","申子辰:巳","亥卯未:申","寅午戌:亥","巳酉丑:寅"],
		["桃花","申子辰:酉","寅午戌:卯","巳酉丑:午","亥卯未:子"],
		["亡神","寅午戌:巳","亥卯未:寅","巳酉丑:申","申子辰:亥"],
		["天罗地网","辰:巳","巳:辰","戌:亥","亥:戌"]
	];
    shens = "";
    for (i = 0; i <= 13; i++) {
        if (i == 2 && sx == 0) continue;
        if (i == 3 && sx == 1) continue;
        for (j = 1; j <= arr[i].length - 1; j++) {
            str = arr[i][j].split(":");
            if (str[0].includes(nz) && str[1] == dza) {
                shens = shens + " " + arr[i][0];
                break;
            }
        }
    }
    pmz = (nzx + 3) % 12;
    dkz = (nzx + 2) % 12;
    smz = (nzx + 10) % 12;
    dz = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    if (dz[pmz] == dza) {
        shens = shens + " 披麻";
    }
    if (dz[dkz] == dza) {
        shens = shens + " 吊客";
    }
    if (dz[smz] == dza) {
        shens = shens + " 丧门";
    }
    return (shens);
}
function Shen_yuezhi(yzx,tgx,dzy)
{
	arr=[
		["天德贵人","寅:丁","卯:申","辰:壬","巳:辛","午:亥","未:甲","申:癸","酉:寅","戌:丙","亥:乙","子:己","丑:庚"],
		["月德贵人","寅午戌:丙","申子辰:壬","亥卯未:甲","巳酉丑:庚"],
		["天医","寅:丑","卯:寅","辰:卯","巳:辰","午:巳","未:午","申:未","酉:申","戌:酉","亥:戌","子:亥","丑:子"]
	];
	shens = "";
	for (i = 0; i <= 2; i++) {
	    for (j = 1; j <= arr[i].length - 1; j++) {
	        str = arr[i][j].split(":");
	        if (str[0].includes(yzx) && (str[1] == tgx || str[1] == dzy)) {
	            shens = shens + " " + arr[i][0];
	            break;
	        }
	    }
	}
	return (shens);
}
function Shen_rigan(rg,gz)
{
	arr=[
		["天乙贵人","甲戊:丑未","乙己:申子","丙丁:亥酉","壬癸:卯巳","庚辛:寅午"],
		["太极贵人","甲乙:子午","丙丁:卯酉","戊己:辰戌丑未","庚辛:寅亥","壬癸:巳申"],
		["文昌贵人","甲乙:巳午","丙戊:申","丁己:酉","庚:亥","辛:子","壬:寅","癸:卯"],
		["金舆","甲:辰","乙:巳","丙戊:未","丁己:申","庚:戌","辛:亥","壬:丑","癸:寅"],
		["禄神","甲:寅","乙:卯","丙戊:巳","丁己:午","庚:申","辛:酉","壬:亥","癸:子"],
		["羊刃","甲:卯","乙:寅","丙戊:午","丁己:巳","庚:酉","辛:申","壬:子","癸:亥"],
		["天厨贵人","甲:巳","乙:午","丙:子","丁:巳","戊:午","己:申","庚:寅","辛:午","壬:酉","癸:亥"],
		["国印贵人","甲:戌","乙:亥","丙:丑","丁:寅","戊:丑","己:寅","庚:辰","辛:巳","壬:未","癸:申"],
		["学堂","甲:己亥","乙:壬午","丙:丙寅","丁:丁酉","戊:戊寅","己:己酉","庚:辛巳","辛:甲子","壬:甲申","癸:乙卯"],
		["词馆","甲:庚寅","乙:辛卯","丙:乙巳","丁:戊午","戊:丁巳","己:庚午","庚:壬申","辛:癸酉","壬:癸亥","癸:壬戌"]
	];
	shens = "";
	dza = gz[1];
	for (i = 0; i <= 9; i++) {
	    if (i <= 7) {
	        for (j = 1; j <= arr[i].length - 1; j++) {
	            str = arr[i][j].split(":");
	            if (str[0].includes(rg) > 0 && str[1].includes(dza) > 0) {
	                shens = shens + " " + arr[i][0];
	                break;
	            }
	        }
	    } else {
	        for (j = 1; j <= arr[i].length - 1; j++) {
	            str = arr[i][j].split(":");
	            if (str[0] == rg && str[1] == gz && getWuxing(rg) == getNayin(gz)[2]) {
	                shens = shens + " " + arr[i][0];
	                break;
	            }
	        }
	    }
	}
	return (shens);
}
function Shen_rizhi(rz,dz,rzx)
{
	arr = [
		["驿马","申子辰:寅","寅午戌:申","巳酉丑:亥","亥卯未:巳"],
		["华盖","寅午戌:戌","亥卯未:未","申子辰:辰","巳酉丑:丑"],
		["将星","寅午戌:午","巳酉丑:酉","申子辰:子","亥卯未:卯"],
		["亡神","寅午戌:巳","亥卯未:寅","巳酉丑:申","申子辰:亥"],
		["劫煞","申子辰:巳","亥卯未:申","寅午戌:亥","巳酉丑:寅"],
		["桃花","申子辰:酉","寅午戌:卯","巳酉丑:午","亥卯未:子"],
		["天罗地网","辰:巳","巳:辰","戌:亥","亥:戌"]
	];
	shens = "";
	for (i = 0; i <= 6; i++) {
	    for (j = 1; j <= arr[i].length - 1; j++) {
	        str = arr[i][j].split(":");
	        if (str[0].includes(rz) > 0 && str[1] == dz) {
	            shens = shens + " " + arr[i][0];
	            break;
	        }
	    }
	}
	pmz = (rzx + 3) % 12;
	dkz = (rzx + 2) % 12;
	smz = (rzx + 10) % 12;
	dzr = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
	if (dzr[pmz] == dz) {
	    shens = shens + " 披麻";
	}
	if (dzr[dkz] == dz) {
	    shens = shens + " 吊客";
	}
	if (dzr[smz] == dz) {
	    shens = shens + " 丧门";
	}
	return (shens);
}
// 天干地支留意
function tiangandizhiliuyi() {
	document.querySelector("#tgliuyi").innerHTML = document.querySelector("#dzliuyi").innerHTML = '';
	var tglineArr = $("#tgline .big").map((i, v) => v.innerText).get();
	var dzlineArr = $("#dzline .big").map((i, v) => v.innerText).get();
	for (var item of liuyi) {
		// 天干留意
		let tmpArr = [...tglineArr], result = '';
		for (let j = 0; j < item[0].length; j++) {
			let iArr = tmpArr.indexOf(item[0][j]);
			if (iArr >= 0) 
				result += tmpArr.splice(iArr, 1)[0];
		}
		if (result == item[0])
			document.querySelector("#tgliuyi").innerHTML += item[0] + item[1] + '; ';

		// 地支留意
		tmpArr = [...dzlineArr], result = '';
		for (let j = 0; j < item[0].length; j++) {
			let iArr = tmpArr.indexOf(item[0][j]);
			if (iArr >= 0) 
				result += tmpArr.splice(iArr, 1)[0];
		}
		if (result == item[0])
			document.querySelector("#dzliuyi").innerHTML += item[0] + item[1] + '; ';
	}
}
// 清空流月流日数据
function emptyData() {
	$("#liuritg .big").html('');
	$("#liuridz .big").html('');
	$("#liuri_kongwang").html('');
	$("#liuritg .small").html('');
	$("#liuridz .small").html('');
	$("#liuriage").html("");
	$("#liurishensha").html("");
	$(".swiper-slide").html("&nbsp;");
	$(".swiper-slide").addClass("kong");
	// $(".liuri-box").empty();
	$("#liuyuetg .big").html('');
	$("#liuyuedz .big").html('');
	$("#liuyue_kongwang").html('');
	$("#liuyuetg .small").html('');
	$("#liuyuedz .small").html('');
	$("#liuyueage").html("");
	$("#liuyueshensha").html("");
	$("#xipanliuyue tr:eq(1) td").css('backgroundColor', '');
}
// 去重
function unique(str) {
	if (str) {
		return $.unique(str.split(' ').slice(1).sort()).toString(' ');
	}
	return ''
}
// 细盘流日干支点击事件
$(".liuri-box").on("click", "span", function (e) {
	$(this).css('backgroundColor', '#999').siblings().css('backgroundColor', '');
	var d = Lunar.fromDate(new Date($(e.target).attr("date")));
	var _tiangan = $(this).html()[0]
	var _dizhi = $(this).html()[1]
	$("#liuritg .big").html(_tiangan).css('color', tgdzColor[_tiangan]);
	$("#liuridz .big").html(_dizhi).css('color', tgdzColor[_dizhi]);
	// 流日空亡
	$("#liuri_kongwang").html(xunkong(_tiangan + _dizhi));

	$("#liuritg .small").html($ssShorter[getShishen(
		$tiangan.indexOf(_tiangan), 
		$tiangan.indexOf($("#rigan").html())
	)]);
	$("#liuridz .small").html(getDzSS(_dizhi, $("#rigan").html()));
	$("#liuriage").html(d.getDayInChinese() + "<br>" + d.getSolar().getDay() + "日");
	$("#liuyueage").html(d.getMonthInChinese() + "月<br>" +  Math.abs(d.getSolar().getMonth()) + "月");	// 修复月份变化
	// 流日神煞
	$("#liurishensha").html(unique(Shen_niangan($("#bm_tgline .big:eq(0)").html(), _tiangan + _dizhi) + Shen_nianzhi($("#bm_dzline .big:eq(0)").html(), _dizhi, $("#yzx").val(), $("#bz_sx").val()) + Shen_yuezhi($("#bm_dzline .big:eq(1)").html(), _tiangan, _dizhi) + Shen_rigan($("#bm_tgline .big:eq(2)").html(), _tiangan + _dizhi) + Shen_rizhi($("#bm_dzline .big:eq(2)").html(), _dizhi, $('#rzx').val())));

	tiangandizhiliuyi();
})

// 细盘流月干支点击事件
$("#xipanliuyue tr:eq(1) td").click(function (e) {
	var start = end = ''
	if (!e.target.getAttribute("jieqi-start")) {
		if (!$(e.target).parent().attr("jieqi-start")) {
			return
		}
		start = $(e.target).parent().attr("jieqi-start")
		end = $(e.target).parent().attr("jieqi-end")
		emptyData();	
		$(e.target).parent().css('backgroundColor', '#999').siblings().css('backgroundColor', '');
	} else {
		start = e.target.getAttribute("jieqi-start")
		end = e.target.getAttribute("jieqi-end")
		emptyData();	
		$(e.target).css('backgroundColor', '#999').siblings().css('backgroundColor', '');
	}
	var _tiangan = $(this).find('span:eq(0)').html()
	var _dizhi = $(this).find('span:eq(1)').html()
	$("#liuyuetg .big").html(_tiangan).css('color', tgdzColor[_tiangan]);
	$("#liuyuedz .big").html(_dizhi).css('color', tgdzColor[_dizhi]);
	// 流月空亡
	$("#liuyue_kongwang").html(xunkong(_tiangan + _dizhi));

	$("#liuyuetg .small").html($ssShorter[getShishen(
		$tiangan.indexOf(_tiangan), 
		$tiangan.indexOf($("#rigan").html())
	)]);
	$("#liuyuedz .small").html(getDzSS(_dizhi, $("#rigan").html()));
	var d = Lunar.fromDate(new Date(start))
	$("#liuyueage").html(d.getMonthInChinese() + "月<br>" + Math.abs(d.getSolar().getMonth()) + "月");
	// 流月神煞
	$("#liuyueshensha").html(unique(Shen_niangan($("#bm_tgline .big:eq(0)").html(), _tiangan + _dizhi) + Shen_nianzhi($("#bm_dzline .big:eq(0)").html(), _dizhi, $("#yzx").val(), $("#bz_sx").val()) + Shen_yuezhi($("#bm_dzline .big:eq(1)").html(), _tiangan, _dizhi) + Shen_rigan($("#bm_tgline .big:eq(2)").html(), _tiangan + _dizhi) + Shen_rizhi($("#bm_dzline .big:eq(2)").html(), _dizhi, $('#rzx').val())));

	// 更换当月的流日
	// $(".liuri-box").empty();
	$(".swiper-slide").html("&nbsp;");
	$(".swiper-slide").removeClass("kong");
	var i = 0;
	var dateTime = new Date(start);
	while(dateTime.getTime() < new Date(end).getTime()) {
		var d = Lunar.fromDate(dateTime);
		$(".swiper-slide:eq(" + i +")").html(d.getDayInGanZhi()).attr("date", d.getSolar().toYmd());
		i++;
		// var span = $("<span>" + d.getDayInGanZhi() + "</span>").addClass('swiper-slide').attr("date", d.getSolar().toYmd());
		// $(".liuri-box").append(span);
 		dateTime = new Date(dateTime.setDate(dateTime.getDate() + 1));
	}

	var swiper = new Swiper('.swiper-container', {
	    slidesPerView: 'auto',
	    // observer: true
	});
	$(".swiper-wrapper").css("transform", "translate3d(0px, 0px, 0px)");
	tiangandizhiliuyi();
	// 根据所选择的流月，自动选择对应的流日，以触发流日点击事件
	var d = Solar.fromDate(new Date());
	console.log(d.toYmd())
	day = $(".liuri-box").find('[date=' + d.toYmd() + ']');
	if (day.length > 0) {
		day.click();
	} else {
		// $(".liuri-box").find('span:eq(0)').click();
	}

})

// 细盘流年干支点击事件
$("#dayunliunian tr:eq(1) td").click(function (e) {
	if (!e.target.getAttribute("year")) 
		return;

	$(e.target).css('backgroundColor', '#999').siblings().css('backgroundColor', '');
	$("#liuniantg .big").html(e.target.innerHTML[0]).css('color', tgdzColor[e.target.innerHTML[0]]);
	$("#liuniandz .big").html(e.target.innerHTML[1]).css('color', tgdzColor[e.target.innerHTML[1]]);
	// 流年空亡
	$("#liunian_kongwang").html(xunkong(e.target.innerHTML));

	$("#liuniantg .small").html($ssShorter[getShishen(
		$tiangan.indexOf(e.target.innerHTML[0]), 
		$tiangan.indexOf($("#rigan").html())
	)]);
	$("#liuniandz .small").html(getDzSS(e.target.innerHTML[1], $("#rigan").html()));

	$("#liunianage").html($(e.target).attr("age") + "岁<br>" + $(e.target).attr("year"));

	// 更换当年的流月干
	var i = (parseInt($(e.target).attr("year")) - 1911) % 5;
	var yuegan = [];
	yuegan.push(...$yuegan1911.slice(2 * i));
	yuegan.push(...$yuegan1911.slice(0, 2 * i));
	yuegan.push(...yuegan.slice(0, 2));
	$("#liuyuegan").children(":gt(0)").each(function (i, v) {
		$(v).find(".vl span:eq(1)").html(yuegan[i]).css('color', tgdzColor[yuegan[i]]);
		$(v).find(".vl span:eq(0)").html($ssShorter[getShishen(
			$tiangan.indexOf(yuegan[i]), 
			$tiangan.indexOf($("#rigan").html())
		)]);
	})
	// 流年神煞
	$("#liunianshensha").html(unique(Shen_niangan($("#bm_tgline .big:eq(0)").html(), e.target.innerHTML) + Shen_nianzhi($("#bm_dzline .big:eq(0)").html(), e.target.innerHTML[1], $("#yzx").val(), $("#bz_sx").val()) + Shen_yuezhi($("#bm_dzline .big:eq(1)").html(), e.target.innerHTML[0], e.target.innerHTML[1]) + Shen_rigan($("#bm_tgline .big:eq(2)").html(), e.target.innerHTML) + Shen_rizhi($("#bm_dzline .big:eq(2)").html(), e.target.innerHTML[1], $('#rzx').val())));

	// 显示流年对应的流月
	var year = parseInt($(e.target).attr("year"));
	var jieqi = Lunar.fromYmd(year, 6, 1).getJieQiTable();
	$("#xipanliuyue tr:eq(1) td:gt(0)").each(function (i, v) {
		var spanTian = $("<span>" + yuegan[i] + "</span>").css('color', tgdzColor[yuegan[i]]);
		if ((i + 3) > 11) {
			var spanDi = $("<span>" + $dizhi[i + 3 - 12] + "</span>").css('color', tgdzColor[$dizhi[i + 3 - 12]]);
		} else {
			var spanDi = $("<span>" + $dizhi[i + 3] + "</span>").css('color', tgdzColor[$dizhi[i + 3]]);
		}
		$("#xipanliuyue tr:eq(1) td:eq(" + (i + 1) + ")").attr('jieqi-start', jieqi[$jie[i]].toYmd()).attr('jieqi-end', jieqi[$jie[i + 1]].toYmd()).empty().append(spanTian).append(spanDi);
	})

	emptyData();
	tiangandizhiliuyi();
	// 根据所选择的流年，自动选择对应的流月，以触发流月点击事件
	var d = Lunar.fromDate(new Date());
	console.log(d.getCurrentJie(), d.getPrevJie())
	var oJie = d.getCurrentJie() ? d.getCurrentJie() : d.getPrevJie();
	console.log(oJie.getSolar().toYmd())
	month = $("#xipanliuyue").find('[jieqi-start=' + oJie.getSolar().toYmd() + ']');
	if (month.length > 0) {
		month.click();
	} else {
		// $("#xipanliuyue").find('tr:eq(1) td:eq(1)').click();
	}

})

// 细盘大运干支点击事件
$("#xipandayungz td").click(function (e) {
	if (!e.target.dataset['year'])
		return;
	// 显示大运对应的流年
	var year = parseInt(e.target.dataset['year']);
	$(this).css('backgroundColor', '#999').siblings().css('backgroundColor', '');
	for (var i = 0; i < 10; i++) {
		$("#dayunliunian tr:eq(0) td:eq(" + (i + 1) + ")").html(year + i);
		$("#dayunliunian tr:eq(1) td:eq(" + (i + 1) + ")")
			.html(dayunliunianData[(year + i)]).attr('year', year + i)
			.attr('age', parseInt(e.target.dataset["age"]) + i);
	}

	$("#dayuntg .big").html(e.target.innerHTML[0]).css('color', tgdzColor[e.target.innerHTML[0]]);
	$("#dayundz .big").html(e.target.innerHTML[1]).css('color', tgdzColor[e.target.innerHTML[1]]);
	// 大运空亡
	$("#dayun_kongwang").html(xunkong(e.target.innerHTML));

	// 显示大运天干地支
	$("#dayuntg .small").html($ssShorter[getShishen(
		$tiangan.indexOf(e.target.innerHTML[0]), 
		$tiangan.indexOf($("#rigan").html())
	)]);
	$("#dayundz .small").html(getDzSS(e.target.innerHTML[1], $("#rigan").html()));

	// 显示大运岁数
	$("#dayunage").html(e.target.dataset["age"] + "岁<br>" + e.target.dataset["year"]);

	// 大运神煞
	$("#dayunshensha").html(unique(Shen_niangan($("#bm_tgline .big:eq(0)").html(), e.target.innerHTML) + Shen_nianzhi($("#bm_dzline .big:eq(0)").html(), e.target.innerHTML[1], $("#yzx").val(), $("#bz_sx").val()) + Shen_yuezhi($("#bm_dzline .big:eq(1)").html(), e.target.innerHTML[0], e.target.innerHTML[1]) + Shen_rigan($("#bm_tgline .big:eq(2)").html(), e.target.innerHTML) + Shen_rizhi($("#bm_dzline .big:eq(2)").html(), e.target.innerHTML[1], $('#rzx').val())));
	
	// 根据所选择的大运，自动选择对应的流年，以触发流年点击事件
	$year = $("#dayunliunian").find('[year=' + currentYear + ']');
	if ($year.length > 0) {
		$year.click();
	} else {
		$s = $("#dayunliunian").find('tr:eq(1) td:eq(1)').click();
	}
}).each(function (i) {
	// 找到今年命主所处的大运
	if (currentYear >= parseInt(this.dataset['year']) && currentYear - parseInt(this.dataset['year']) < 10) {
		this.click();
	}
})

/*
 * 获取十神
 * @param $tgans 天干索引
 * @param $ritgs 日干索引
 */
function getShishen($tgans, $ritgs)
{
	if($ritgs==0) $ritgs=10;
	if($tgans==0) $tgans=10;
	var $cha = $ritgs-$tgans, $str = '';
	if($cha>=0) {
		switch($cha) {
			case 0:$str="比肩";break;
			case 1:
				if($ritgs%2==0){$str="劫财";}else{$str="正印";}
				break;
			case 2:$str="偏印";break;
			case 3:
				if($ritgs%2==0){$str="正印";}else{$str="正官";}
				break;
			case 4:$str="七杀";break;
			case 5:
				if($ritgs%2==0){$str="正官";}else{$str="正财";}
				break;
			case 6:$str="偏财";break;
			case 7:
				if($ritgs%2==0){$str="正财";}else{$str="伤官";}
				break;
			case 8:$str="食神";break;
			case 9:$str="伤官";break;
		}
	} else {
		switch(Math.abs($cha)) {
			case 1:
				if($ritgs%2==1){$str="劫财";}else{$str="伤官";}
				break;
			case 2:$str="食神";break;
			case 3:
				if($ritgs%2==1){$str="伤官";}else{$str="正财";}
				break;
			case 4:$str="偏财";break;
			case 5:
				if($ritgs%2==1){$str="正财";}else{$str="正官";}
				break;
			case 6:$str="七杀";break;
			case 7:
				if($ritgs%2==1){$str="正官";}else{$str="正印";}
				break;
			case 8:$str="偏印";break;
			case 9:$str="正印";break;
		}
	}
	return $str;
}

/*
 * 获取藏干
 * @param $dzx 地支索引
 */
function getDcang($dzx)
{
	var $arr = [ "壬甲","癸","己癸辛","甲丙戊","乙","戊乙癸","丙戊庚","丁己","己丁乙","庚壬戊","辛","戊辛丁" ];
	return $arr[$dzx];
}

/*
 * 获取地支藏干的十神
 * @author gougoushan@qq.com
 * @param $dz 地支
 * @param $rg 日干
 */
function getDzSS($dz, $rg)
{
	var $cgs = getDcang($dizhi.indexOf($dz));
	var $ss = '';
	var $i = 0;
	while (true) {
		var $cg = $cgs[$i++];
		if (!$cg) 
			break;
		$ss += $ssShorter[getShishen($tiangan.indexOf($cg), $tiangan.indexOf($rg))];
	}
	return $ss;
}



function unselectall()
{
	var a=document.bz.mode.length;
	for (var i=0;i<a;i++){
		document.bz.mode[i].checked=false;
	}
    if(document.bz.mode.checked){
		document.bz.mode.checked = false;
    } 	
    if(document.bz.mode.checked){
		document.bz.mode.checked = false;
    } 	
    if(document.bz.mode.checked){
		document.bz.mode.checked = false;
    } 	
}
function mode1(form)
{
	for (var i=0;i<form.elements.length;i++)
	{
		var e = form.elements[i];
		if (e.name == "lnp") {// 流年干支
			e.checked = false;
			continue;
		}
		if (e.name == "ssp") {// 十神
			e.checked = true;
			continue;
		}
		if (e.name == "cgp") {// 四柱藏干
			e.checked = false;
			continue;
		}
		if (e.name == "qyp") {// 起运交运时间
			e.checked = false;
			continue;
		}
		if (e.name == "nyp") {// 纳音
			e.checked = false;
			continue;
		}
		if (e.name == "shenshap") {// 神煞
			e.checked = false;
			continue;
		}
		if (e.name == "csp") {// 长生十二宫
			e.checked = false;
			continue;
		}
		if (e.name == "mgp") {// 命宫胎元
			e.checked = false;
			continue;
		}
		if (e.name == "xyp") {// 小运
			e.checked = false;
			continue;
		}
	}
}
function mode2(form)
{
	for (var i=0;i<form.elements.length;i++)
	{
		var e = form.elements[i];
		if (e.name == "lnp") {// 流年干支
			e.checked = true;
			continue;
		}
		if (e.name == "ssp") {// 十神
			e.checked = true;
			continue;
		}
		if (e.name == "cgp") {// 四柱藏干
			e.checked = true;
			continue;
		}
		if (e.name == "qyp") {// 起运交运时间
			e.checked = true;
			continue;
		}
		if (e.name == "nyp") {// 纳音
			e.checked = false;
			continue;
		}
		if (e.name == "shenshap") {// 神煞
			e.checked = false;
			continue;
		}
		if (e.name == "csp") {// 长生十二宫
			e.checked = false;
			continue;
		}
		if (e.name == "mgp") {// 命宫胎元
			e.checked = false;
			continue;
		}
		if (e.name == "xyp") {// 小运
			e.checked = false;
			continue;
		}
	}
}
function mode3(form)
{
	for (var i=0;i<form.elements.length;i++)
	{
		var e = form.elements[i];
		if (e.name == "lnp") {// 流年干支
			e.checked = true;
			continue;
		}
		if (e.name == "ssp") {// 十神
			e.checked = true;
			continue;
		}
		if (e.name == "cgp") {// 四柱藏干
			e.checked = true;
			continue;
		}
		if (e.name == "qyp") {// 起运交运时间
			e.checked = true;
			continue;
		}
		if (e.name == "nyp") {// 纳音
			e.checked = true;
			continue;
		}
		if (e.name == "shenshap") {// 神煞
			e.checked = true;
			continue;
		}
		if (e.name == "csp") {// 长生十二宫
			e.checked = true;
			continue;
		}
		if (e.name == "mgp") {// 命宫胎元
			e.checked = true;
			continue;
		}
		if (e.name == "xyp") {// 小运
			e.checked = true;
			continue;
		}
	}
}
function mode4(form)
{
	for (var i=0;i<form.elements.length;i++)
	{
		var e = form.elements[i];
		if (e.name == "lnp") {// 流年干支
			e.checked = false;
			continue;
		}
		if (e.name == "ssp") {// 十神
			e.checked = false;
			continue;
		}
		if (e.name == "cgp") {// 四柱藏干
			e.checked = false;
			continue;
		}
		if (e.name == "qyp") {// 起运交运时间
			e.checked = false;
			continue;
		}
		if (e.name == "nyp") {// 纳音
			e.checked = false;
			continue;
		}
		if (e.name == "shenshap") {// 神煞
			e.checked = false;
			continue;
		}
		if (e.name == "csp") {// 长生十二宫
			e.checked = false;
			continue;
		}
		if (e.name == "mgp") {// 命宫胎元
			e.checked = false;
			continue;
		}
		if (e.name == "xyp") {// 小运
			e.checked = false;
			continue;
		}
	}
}
