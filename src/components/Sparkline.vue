<script setup>
import { computed } from 'vue'
import { num } from '../format.js'

// 首页推荐卡片里的迷你分时；以昨收为基准决定涨跌色
const props = defineProps({
  points: { type: Array, default: () => [] },
  prevClose: { type: [Number, String], default: null },
})
const W = 100
const H = 32
const gradId = `s${Math.random().toString(36).slice(2, 8)}`

const shape = computed(() => {
  const pts = props.points
  if (pts.length < 6) return null // 冷门股当天只有几笔成交，画出来只是一条斜线，不如留空
  const prev = num(props.prevClose)
  let lo = Math.min(...pts)
  let hi = Math.max(...pts)
  if (prev !== null) { lo = Math.min(lo, prev); hi = Math.max(hi, prev) }
  if (hi === lo) { hi += 1; lo -= 1 }
  const x = (i) => (i / (pts.length - 1)) * W
  const y = (p) => 2 + ((hi - p) / (hi - lo)) * (H - 4)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(p).toFixed(2)}`).join('')
  const up = pts[pts.length - 1] >= (prev ?? pts[0])
  return {
    line,
    area: `${line}L${W},${H}L0,${H}Z`,
    base: prev !== null ? y(prev) : null,
    color: up ? '#0F9D6B' : '#E5484D',
  }
})
</script>

<template>
  <svg v-if="shape" class="spark" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="shape.color" stop-opacity=".16" />
        <stop offset="1" :stop-color="shape.color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <line v-if="shape.base !== null" x1="0" :x2="W" :y1="shape.base" :y2="shape.base" class="spark__base" />
    <path :d="shape.area" :fill="`url(#${gradId})`" />
    <path :d="shape.line" fill="none" :stroke="shape.color" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
  </svg>
  <span v-else class="spark spark--empty"></span>
</template>
