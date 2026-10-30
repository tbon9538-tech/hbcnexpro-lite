<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { decimals, fixed, fmtBig, fmtPrice, num } from '../format.js'

// bars: [{ ts, open, high, low, close, volume }]；mode: 'line'（分时）| 'candle'（K 线）
const props = defineProps({
  bars: { type: Array, default: () => [] },
  mode: { type: String, default: 'line' },
  prevClose: { type: [Number, String], default: null },
  timeZone: { type: String, default: undefined },
  period: { type: String, default: 'M5' },
})

const UP = '#0F9D6B'
const DOWN = '#E5484D'
const PRICE_H = 180
const VOL_H = 44
const GAP = 10
const AXIS_H = 18
const GUTTER = 52 // 右侧价格刻度
const HEIGHT = PRICE_H + GAP + VOL_H + AXIS_H

const root = ref(null)
const width = ref(320)
const active = ref(null)
const gradId = `g${Math.random().toString(36).slice(2, 8)}`
let ro = null
onMounted(() => {
  width.value = root.value.clientWidth || 320
  ro = new ResizeObserver(([e]) => { width.value = Math.round(e.contentRect.width) || width.value })
  ro.observe(root.value)
})
onBeforeUnmount(() => ro && ro.disconnect())

const data = computed(() => props.bars
  .map((b) => ({ ts: b.ts, o: num(b.open), h: num(b.high), l: num(b.low), c: num(b.close), v: num(b.volume) || 0 }))
  .filter((b) => b.c !== null))

const geo = computed(() => {
  const bars = data.value
  const n = bars.length
  const plotW = Math.max(40, width.value - GUTTER)
  const step = plotW / Math.max(n, 1)
  const prev = num(props.prevClose)
  const candle = props.mode === 'candle'
  let lo = Infinity
  let hi = -Infinity
  for (const b of bars) {
    lo = Math.min(lo, candle ? (b.l ?? b.c) : b.c)
    hi = Math.max(hi, candle ? (b.h ?? b.c) : b.c)
  }
  if (!candle && prev !== null) { lo = Math.min(lo, prev); hi = Math.max(hi, prev) }
  if (hi === lo) { hi += hi * 0.01 || 1; lo -= lo * 0.01 || 1 }
  const pad = (hi - lo) * 0.06
  hi += pad
  lo -= pad
  const y = (p) => ((hi - p) / (hi - lo)) * PRICE_H
  const x = (i) => i * step + step / 2
  const maxVol = Math.max(...bars.map((b) => b.v), 1)
  const volTop = PRICE_H + GAP
  return { bars, n, plotW, step, y, x, lo, hi, prev, maxVol, volTop }
})

const rising = computed(() => {
  const { bars, prev } = geo.value
  if (!bars.length) return true
  const base = props.mode === 'line' && prev !== null ? prev : (bars[0].o ?? bars[0].c)
  return bars[bars.length - 1].c >= base
})
const lineColor = computed(() => (rising.value ? UP : DOWN))

const linePath = computed(() => {
  const { bars, x, y } = geo.value
  return bars.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(b.c).toFixed(1)}`).join('')
})
const areaPath = computed(() => {
  const { bars, x } = geo.value
  if (!bars.length) return ''
  return `${linePath.value}L${x(bars.length - 1).toFixed(1)},${PRICE_H}L${x(0).toFixed(1)},${PRICE_H}Z`
})

// 刻度位数按刻度间距加，否则低价股波动小时 4 条线会显示同一个数
const grid = computed(() => {
  const { lo, hi } = geo.value
  const step = (hi - lo) / 3
  const d = Math.min(6, Math.max(decimals(hi), Math.ceil(-Math.log10(step))))
  return [0, 1, 2, 3].map((k) => {
    const p = hi - step * k
    return { y: (PRICE_H * k) / 3, label: fixed(p, d) }
  })
})
const summary = computed(() => {
  const { bars } = geo.value
  if (!bars.length) return 'No chart data'
  const first = bars[0]
  const last = bars[bars.length - 1]
  return `Price chart from ${fmtTick(first.ts)} to ${fmtTick(last.ts)}, last ${fmtPrice(last.c)}`
})

const fmtTick = (ts) => {
  const opts = { timeZone: props.timeZone }
  if (/^M\d|^H/.test(props.period)) Object.assign(opts, { hour: '2-digit', minute: '2-digit', hour12: false })
  else if (props.period === 'D1') Object.assign(opts, { day: 'numeric', month: 'short' })
  else Object.assign(opts, { month: 'short', year: '2-digit' })
  try { return new Date(ts).toLocaleString('en-GB', opts) } catch { return '' }
}
const ticks = computed(() => {
  const { n, x } = geo.value
  if (!n) return []
  const idx = n < 3 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]
  return [...new Set(idx)].map((i, k, arr) => ({
    x: x(i),
    anchor: k === 0 ? 'start' : k === arr.length - 1 ? 'end' : 'middle',
    label: fmtTick(geo.value.bars[i].ts),
  }))
})

// 手指/鼠标移动时显示该根数据
function onPoint(e) {
  const { n, step } = geo.value
  if (!n) return
  const rect = root.value.getBoundingClientRect()
  const i = Math.floor((e.clientX - rect.left) / step)
  active.value = Math.min(n - 1, Math.max(0, i))
}
const info = computed(() => {
  const { bars, prev } = geo.value
  const i = active.value
  if (i === null || !bars[i]) return null
  const b = bars[i]
  const base = props.mode === 'line' ? prev : b.o
  return { time: fmtTick(b.ts), bar: b, up: base === null || b.c >= base }
})
</script>

<template>
  <div ref="root" class="chart">
    <div class="chart__info">
      <template v-if="info">
        <span>{{ info.time }}</span>
        <template v-if="mode === 'candle'">
          <span>O <b class="num">{{ fmtPrice(info.bar.o) }}</b></span>
          <span>H <b class="num">{{ fmtPrice(info.bar.h) }}</b></span>
          <span>L <b class="num">{{ fmtPrice(info.bar.l) }}</b></span>
        </template>
        <span>C <b class="num" :class="info.up ? 'is-up' : 'is-down'">{{ fmtPrice(info.bar.c) }}</b></span>
        <span>Vol <b class="num">{{ fmtBig(info.bar.v) }}</b></span>
      </template>
      <span v-else-if="mode === 'line' && geo.prev !== null" class="chart__legend"><i></i>Prev close {{ fmtPrice(geo.prev) }}</span>
      <span v-else>Touch the chart for details</span>
    </div>
    <svg
      v-if="geo.n" :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" role="img" :aria-label="summary"
      @pointermove="onPoint" @pointerdown="onPoint" @pointerleave="active = null"
    >
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" :stop-color="lineColor" stop-opacity=".18" />
          <stop offset="1" :stop-color="lineColor" stop-opacity="0" />
        </linearGradient>
      </defs>

      <g class="chart__grid">
        <line v-for="g in grid" :key="g.y" x1="0" :x2="geo.plotW" :y1="g.y + .5" :y2="g.y + .5" />
        <text v-for="g in grid" :key="'t' + g.y" :x="width - 2" :y="Math.min(Math.max(g.y + 4, 10), PRICE_H - 2)" text-anchor="end">{{ g.label }}</text>
      </g>

      <template v-if="mode === 'line'">
        <line v-if="geo.prev !== null" class="chart__prev" x1="0" :x2="geo.plotW" :y1="geo.y(geo.prev)" :y2="geo.y(geo.prev)" />
        <path :d="areaPath" :fill="`url(#${gradId})`" />
        <path :d="linePath" fill="none" :stroke="lineColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />
      </template>
      <template v-else>
        <g v-for="(b, i) in geo.bars" :key="i" :stroke="b.c >= b.o ? UP : DOWN" :fill="b.c >= b.o ? UP : DOWN">
          <line :x1="geo.x(i)" :x2="geo.x(i)" :y1="geo.y(b.h ?? b.c)" :y2="geo.y(b.l ?? b.c)" stroke-width="1" />
          <rect
            :x="geo.x(i) - Math.max(1, geo.step * .6) / 2" :width="Math.max(1, geo.step * .6)"
            :y="Math.min(geo.y(b.o ?? b.c), geo.y(b.c))" :height="Math.max(1, Math.abs(geo.y(b.o ?? b.c) - geo.y(b.c)))"
            stroke="none"
          />
        </g>
      </template>

      <g>
        <rect
          v-for="(b, i) in geo.bars" :key="'v' + i"
          :x="geo.x(i) - Math.max(1, geo.step * .6) / 2" :width="Math.max(1, geo.step * .6)"
          :y="geo.volTop + VOL_H - (b.v / geo.maxVol) * VOL_H" :height="(b.v / geo.maxVol) * VOL_H"
          :fill="(mode === 'line' ? i === 0 || b.c >= geo.bars[i - 1].c : b.c >= b.o) ? '#B9E6D3' : '#F6C6C8'"
        />
      </g>

      <g v-if="info" class="chart__cross">
        <line :x1="geo.x(active)" :x2="geo.x(active)" y1="0" :y2="geo.volTop + VOL_H" />
        <circle :cx="geo.x(active)" :cy="geo.y(info.bar.c)" r="3.5" :fill="lineColor" stroke="#fff" stroke-width="1.5" />
      </g>

      <g class="chart__axis">
        <text v-for="t in ticks" :key="t.x" :x="t.x" :y="HEIGHT - 4" :text-anchor="t.anchor">{{ t.label }}</text>
      </g>
    </svg>
    <div v-else class="chart__empty">No chart data</div>
  </div>
</template>
