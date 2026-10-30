<script setup>
import { computed } from 'vue'
import { exch, fmtClock } from '../format.js'
import { openSearch, refresh, selectMarket, state } from '../store.js'
import Icon from './Icon.vue'
import QuoteRow from './QuoteRow.vue'

const activeMarket = computed(() => state.markets.find((m) => m.id === state.activeMarketId))
const stocks = computed(() => (activeMarket.value && state.lists[activeMarket.value.id]) || null)
// 市场列表本身没取到，或当前市场的股票取不到时才提示出错
const error = computed(() => {
  if (state.booting) return ''
  if (!state.markets.length) return 'Failed to load. Check your connection.'
  return (!stocks.value && state.listErrors[activeMarket.value?.id]) || ''
})
</script>

<template>
  <main class="page">
    <h1 class="headline">Markets</h1>
    <button type="button" class="search-bar press" @click="openSearch">
      <Icon name="search" /><span>Search stocks, ETFs, REITs</span>
    </button>

    <div v-if="state.markets.length" class="chips">
      <button
        v-for="m in state.markets" :key="m.id" type="button"
        class="chip press" :class="{ 'is-on': m.id === state.activeMarketId }"
        @click="selectMarket(m.id)"
      >{{ exch(m.code) }}</button>
    </div>

    <div v-if="activeMarket && stocks" class="status">
      <span class="pill" :class="state.marketStatus[activeMarket.code] ? 'is-open' : 'is-muted'">
        {{ exch(activeMarket.code) }} {{ state.marketStatus[activeMarket.code] ? 'Open' : 'Closed' }}
      </span>
      <span v-if="state.listAt[activeMarket.id]" class="status__time">Updated {{ fmtClock(state.listAt[activeMarket.id]) }}</span>
    </div>

    <div v-if="error" class="state">
      <p>{{ error }}</p>
      <button type="button" class="btn press" @click="refresh">Retry</button>
    </div>
    <section v-else-if="!stocks" class="card">
      <div v-for="i in 8" :key="i" class="quote quote--skeleton">
        <span class="quote__main"><span class="sk" style="width: 60%; height: 14px"></span><span class="sk" style="width: 34%; height: 10px; margin-top: 8px"></span></span>
        <span class="sk" style="width: 44px; height: 14px"></span>
        <span class="sk" style="width: 76px; height: 32px; border-radius: 8px"></span>
      </div>
    </section>
    <section v-else class="card">
      <div class="list-head"><span>Name</span><span>Last</span><span>Chg%</span></div>
      <QuoteRow v-for="s in stocks" :key="s.id" :stock="s" />
      <div v-if="!stocks.length" class="state state--inline">No stocks in this market</div>
    </section>
  </main>
</template>
