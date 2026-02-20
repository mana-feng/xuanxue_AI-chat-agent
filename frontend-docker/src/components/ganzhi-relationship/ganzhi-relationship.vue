<template>
  <movable-area class="zoom-container">
    <movable-view 
      class="zoom-content" 
      direction="all" 
      :out-of-bounds="true" 
      :scale="true" 
      :scale-min="0.5" 
      :scale-max="2.0"
      :scale-value="scale"
      @scale="onScale"
      :style="{ width: '750rpx', height: contentHeight + 'px' }"
    >
      <view class="ganzhi-relationship-wrapper" :style="{ height: contentHeight + 'px' }">
        <!-- 天干关系 (上方) -->
        <view class="tg_wrapper">
          <view class="chart-container">
            <view v-for="(rel, index) in diagramData.ganEdges" :key="'gan-' + index" class="gzchatitem">
              <!-- 连接线 -->
              <view 
                class="gztipsline" 
                :style="{ left: getLeftPos(rel.from) + '%', width: getWidth(rel.from, rel.to) + '%' }"
              ></view>
              <!-- 关系标签 -->
              <view 
                class="gzchatitem_relaction" 
                :style="{ left: getLeftPos(rel.from) + '%', width: getWidth(rel.from, rel.to) + '%' }"
              >
                <text class="rel-text">{{ rel.label }}</text>
              </view>
              <!-- 左端点字符 -->
              <view 
                class="gzchatitem_gz" 
                :style="{ left: 'calc(' + getLeftPos(rel.from) + '% - 10px)' }"
              >
                <text class="gz-text">{{ diagramData.nodes[rel.from].gan }}</text>
              </view>
              <!-- 右端点字符 -->
              <view 
                class="gzchatitem_gz" 
                :style="{ left: 'calc(' + getLeftPos(rel.to) + '% - 10px)' }"
              >
                <text class="gz-text">{{ diagramData.nodes[rel.to].gan }}</text>
              </view>
            </view>
            <!-- 占位，防止高度塌陷 -->
            <view style="height: 1px; width: 750rpx"></view>
          </view>
        </view>

        <!-- 中间柱名与干支 -->
        <view class="pillars-row">
          <!-- 标签行：显示每一柱的干支（如 甲子、乙丑） -->
          <view class="pillar-labels-row">
            <view class="pillar-col" v-for="(node, idx) in diagramData.nodes" :key="'label-'+idx">
              <text class="pillar-label">{{ node.label }}</text>
            </view>
          </view>

          <!-- 干支字符显示 (带五行颜色) -->
          <view class="pillar-gz-row">
            <view class="pillar-gz-col" v-for="(node, idx) in diagramData.nodes" :key="'gan-' + idx">
              <view class="gztips_mpgz" :class="getWuxingColorClass(node.gan)">
                <text class="mpgz-text">{{ node.gan }}</text>
              </view>
            </view>
          </view>
          <view class="pillar-gz-row">
            <view class="pillar-gz-col" v-for="(node, idx) in diagramData.nodes" :key="'zhi-' + idx">
              <view class="gztips_mpgz" :class="getWuxingColorClass(node.zhi)">
                <text class="mpgz-text">{{ node.zhi }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 地支关系 (下方) -->
        <view class="dz_wrapper">
          <view class="chart-container-down">
             <view style="height: 1px; width: 750rpx"></view>
             <view v-for="(rel, index) in diagramData.zhiEdges" :key="'zhi-' + index" class="gzchatitem">
              <!-- 连接线 -->
              <view 
                class="gztipsline" 
                :style="{ left: getLeftPos(rel.from) + '%', width: getWidth(rel.from, rel.to) + '%' }"
              ></view>
              <!-- 关系标签 -->
              <view 
                class="gzchatitem_relaction" 
                :style="{ left: getLeftPos(rel.from) + '%', width: getWidth(rel.from, rel.to) + '%' }"
              >
                <text class="rel-text">{{ rel.label }}</text>
              </view>
              <!-- 左端点字符 -->
              <view 
                class="gzchatitem_gz" 
                :style="{ left: 'calc(' + getLeftPos(rel.from) + '% - 10px)' }"
              >
                <text class="gz-text">{{ diagramData.nodes[rel.from].zhi }}</text>
              </view>
              <!-- 右端点字符 -->
              <view 
                class="gzchatitem_gz" 
                :style="{ left: 'calc(' + getLeftPos(rel.to) + '% - 10px)' }"
              >
                <text class="gz-text">{{ diagramData.nodes[rel.to].zhi }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </movable-view>
  </movable-area>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import baziEnhanced from '@/libs/utils/bazi-enhanced';

const WU_XING_GAN: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};
const WU_XING_ZHI: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

const props = defineProps<{
  ganzhiList: string[]; // ['甲子', '乙丑', '丙寅', '丁卯', ...]
  labels?: string[]; // ['年柱', '月柱', '日柱', '时柱', '大运', '流年', '流月']
}>();

const scale = ref(1);

const onScale = (e: any) => {
  scale.value = e.detail.scale;
};

const diagramData = computed(() => {
  const data = baziEnhanced.buildGanZhiDiagram(props.ganzhiList, props.labels || [], { showKe: false });
  
  const sortEdges = (edges: any[]) => {
    return edges.sort((a, b) => {
      const minA = Math.min(a.from, a.to);
      const minB = Math.min(b.from, b.to);
      if (minA !== minB) return minA - minB;
      
      const maxA = Math.max(a.from, a.to);
      const maxB = Math.max(b.from, b.to);
      return maxA - maxB;
    });
  };

  if (data.ganEdges) data.ganEdges = sortEdges([...data.ganEdges]);
  if (data.zhiEdges) data.zhiEdges = sortEdges([...data.zhiEdges]);

  return data;
});

const contentHeight = computed(() => {
  if (!diagramData.value) return 300;
  const ganH = diagramData.value.ganEdges.length * 35; 
  const zhiH = diagramData.value.zhiEdges.length * 35;
  const pillarH = 120; // Approx height for pillar labels and gz rows
  // + some padding
  return ganH + zhiH + pillarH + 20; 
});

const getLeftPos = (index: number) => {
  const count = diagramData.value.nodes.length || 1;
  const unit = 100 / count;
  return unit / 2 + index * unit;
};

const getWidth = (from: number, to: number) => {
  const count = diagramData.value.nodes.length || 1;
  const unit = 100 / count;
  return (to - from) * unit;
};

const getWuxingColorClass = (char: string) => {
  if (!char) return '';
  const wx = WU_XING_GAN[char] || WU_XING_ZHI[char];
  if (!wx) return '';
  const map: Record<string, string> = {
    '金': 'goldColor',
    '木': 'woodColor',
    '水': 'waterColor',
    '火': 'fireColor',
    '土': 'soilColor'
  };
  return map[wx] || '';
};
</script>

<style scoped>
.zoom-container {
  width: 100%;
  height: 500rpx; /* Fixed viewport height */
  background-color: #f9f9f9;
  overflow: hidden;
}

.zoom-content {
  /* Dimensions are set dynamically in template */
  display: flex;
  align-items: center;
  justify-content: center;
}

.ganzhi-relationship-wrapper {
  width: 100%;
  padding: 10px 0;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.tg_wrapper, .dz_wrapper {
  width: 750rpx;
  position: relative;
}

.chart-container {
  width: 750rpx;
  display: flex;
  flex-direction: column; /* Start from Year Pillar (top-down) */
}

.chart-container-down {
  width: 750rpx;
  display: flex;
  flex-direction: column;
}

.gzchatitem {
  width: 750rpx;
  height: 30px; 
  position: relative;
  margin-bottom: 5px;
}

.gztipsline {
  position: absolute;
  top: 15px; /* Center vertically in 30px height */
  height: 1px;
  background-color: #ddd;
}

.gzchatitem_relaction {
  position: absolute;
  top: 0;
  height: 30px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: transparent; 
  /* z-index: 1; */
}

.rel-text {
  font-size: 12px;
  color: #666;
  background-color: #fff;
  padding: 0 4px;
}

.gzchatitem_gz {
  position: absolute;
  top: 5px; /* (30 - 20) / 2 */
  width: 20px;
  height: 20px;
  border-radius: 10px; /* 50% */
  background-color: #f0f0f0;
  border-width: 1px;
  border-style: solid;
  border-color: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  /* z-index: 2; */
}

.gz-text {
  font-size: 12px;
  color: #333;
}

/* Middle Pillars Section */
.pillars-row {
  display: flex;
  flex-direction: column;
  border-top-width: 1px;
  border-top-style: solid;
  border-top-color: #eee;
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: #eee;
  padding: 10px 0;
  margin: 5px 0;
  width: 750rpx;
}

.pillar-labels-row {
  display: flex;
  flex-direction: row;
  width: 750rpx;
}

.pillar-col {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 0;
}

.pillar-label {
  color: #a1a1a1;
  font-size: 14px;
}

.pillar-gz-row {
  width: 750rpx;
  display: flex;
  flex-direction: row;
}

.pillar-gz-col {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5px 0;
}

.gztips_mpgz {
  width: 30px;
  height: 30px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mpgz-text {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

/* Wuxing Colors */
.goldColor { background-color: #E6B322; }
.woodColor { background-color: #4CAF50; }
.waterColor { background-color: #2196F3; }
.fireColor { background-color: #F44336; }
.soilColor { background-color: #795548; }

</style>
