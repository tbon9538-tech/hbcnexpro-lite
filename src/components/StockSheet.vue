<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { dir, exch, fmtBig, fmtChange, fmtPct, fmtPrice, fmtTime, lastSession } from '../format.js'
import { API, closeSheet, getJson, isWatched, state, toggleWatch } from '../store.js'
import Icon from './Icon.vue'
import PriceChart from './PriceChart.vue'

const props = defineProps({ sheet: { type: Object, required: true } })
const s = computed(() => props.sheet.data)

const PERIODS = [
  { key: 'intraday', label: 'Intraday', period: 'M5', limit: 300, mode: 'line' },
  { key: 'D1', label: 'Daily', period: 'D1', limit: 90, mode: 'candle' },
  { key: 'W1', label: 'Weekly', period: 'W1', limit: 78, mode: 'candle' },
  { key: 'MN1', label: 'Monthly', period: 'MN1', limit: 60, mode: 'candle' },
]
const period = ref(PERIODS[0])
const klines = reactive({})   // period key -> bars
const failed = reactive({})

const market = computed(() => state.markets.find((m) => m.id === s.value.market?.id))
const timeZone = computed(() => market.value?.timezone)
const open = computed(() => !!state.marketStatus[s.value.market?.code])

async function loadKline(p, force = false) {
  if ((klines[p.key] && !force) || !s.value) return
  failed[p.key] = false
  try {
    const bars = await getJson(`${API}/stocks/${s.value.id}/kline?period=${p.period}&limit=${p.limit}`)
    klines[p.key] = p.key === 'intraday' ? lastSession(bars, timeZone.value) : bars
  } catch {
    if (!klines[p.key]) failed[p.key] = true // 轮询刷新失败时保留已有的图
  }
}
watch(period, (p) => loadKline(p), { immediate: true })

// 开市期间分时图跟着轮询更新（报价本身由 store 的轮询刷新）
watch(() => state.tick, () => {
  if (period.value.key === 'intraday' && open.value) loadKline(period.value, true)
})

const bars = computed(() => klines[period.value.key])
const watched = computed(() => isWatched(s.value.id))
</script>

<template>
  <div class="sheet">
    <div class="sheet__nav">
      <button type="button" class="icon-btn press" aria-label="Back" @click="closeSheet"><Icon name="back" /></button>
      <div class="sheet__title">
        <strong>{{ s.code }}</strong>
        <span v-if="s.market" class="tag" :class="'tag--' + s.market.code.toLowerCase()">{{ exch(s.market.code) }}</span>
      </div>
      <button
        type="button" class="icon-btn press" :class="{ 'is-starred': watched }"
        :aria-label="watched ? 'Remove from watchlist' : 'Add to watchlist'" @click="toggleWatch(s)"
      ><Icon name="star" :filled="watched" /></button>
    </div>

    <div class="sheet__body">
      <div class="sd-name">{{ s.name }}</div>
      <div class="sd-price">
        <span class="sd-price__last num">{{ fmtPrice(s.last) }}</span>
        <span class="sd-price__chg num" :class="dir(s.changePct)">{{ fmtChange(s.change) }} ({{ fmtPct(s.changePct) }})</span>
      </div>
      <div class="status status--flush">
        <span class="pill" :class="open ? 'is-open' : 'is-muted'">{{ open ? 'Open' : 'Closed' }}</span>
        <span class="status__time">Updated {{ fmtTime(s.quoteTime) }}</span>
      </div>

      <dl class="stats">
        <div><dt>Open</dt><dd class="num">{{ fmtPrice(s.open) }}</dd></div>
        <div><dt>High</dt><dd class="num">{{ fmtPrice(s.high) }}</dd></div>
        <div><dt>Vol</dt><dd class="num">{{ fmtBig(s.volume) }}</dd></div>
        <div><dt>Prev</dt><dd class="num">{{ fmtPrice(s.prevClose) }}</dd></div>
        <div><dt>Low</dt><dd class="num">{{ fmtPrice(s.low) }}</dd></div>
        <div><dt>Turn</dt><dd class="num">{{ fmtBig(s.turnover) }}</dd></div>
      </dl>

      <div class="segmented segmented--chart">
        <button
          v-for="p in PERIODS" :key="p.key" type="button"
          :class="{ 'is-on': period.key === p.key }" @click="period = p"
        >{{ p.label }}</button>
      </div>
      <PriceChart
        v-if="bars" :key="period.key" :bars="bars" :mode="period.mode"
        :prev-close="period.mode === 'line' ? s.prevClose : null" :time-zone="timeZone" :period="period.period"
      />
      <div v-else-if="failed[period.key]" class="chart__empty">
        <span>Chart unavailable</span>
        <button type="button" class="link" @click="loadKline(period, true)">Retry</button>
      </div>
      <div v-else class="chart__empty">Loading chart…</div>

      <div class="sd-foot">
        <span v-if="s.lotSize">Lot size {{ s.lotSize }} · </span>Prices in {{ s.market?.currency }}<span v-if="market"> · Trading hours {{ market.amOpen }}–{{ market.pmClose }} local time</span>
      </div>
    </div>
  </div>
</template>
