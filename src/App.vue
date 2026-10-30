<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { closeSheet, loadTab, startPolling, state, stopPolling } from './store.js'
import AboutSheet from './components/AboutSheet.vue'
import HomeTab from './components/HomeTab.vue'
import Icon from './components/Icon.vue'
import MarketsTab from './components/MarketsTab.vue'
import NewsSheet from './components/NewsSheet.vue'
import NewsTab from './components/NewsTab.vue'
import SearchSheet from './components/SearchSheet.vue'
import StockSheet from './components/StockSheet.vue'
import WatchlistTab from './components/WatchlistTab.vue'

const TABS = [
  { key: 'home', label: 'Home', icon: 'home', view: HomeTab },
  { key: 'market', label: 'Markets', icon: 'markets', view: MarketsTab },
  { key: 'watch', label: 'Watchlist', icon: 'star', view: WatchlistTab },
  { key: 'news', label: 'News', icon: 'news', view: NewsTab },
]
const SHEETS = { stock: StockSheet, news: NewsSheet, search: SearchSheet, about: AboutSheet }

// 轮询只刷当前 Tab 的数据，所以切 Tab 时要立刻补一次；同时回到顶部
watch(() => state.tab, (tab) => {
  window.scrollTo(0, 0)
  if (!state.booting) loadTab(tab)
})

// 桌面浏览器上 Esc 关闭最上层详情页
const onKey = (e) => { if (e.key === 'Escape' && state.sheets.length) closeSheet() }

onMounted(() => {
  startPolling()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  stopPolling()
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <component :is="TABS.find((t) => t.key === state.tab).view" />

  <nav class="tabbar">
    <button
      v-for="t in TABS" :key="t.key" type="button"
      class="tabbar__item" :class="{ 'is-on': state.tab === t.key }" @click="state.tab = t.key"
    >
      <Icon :name="t.icon" />
      <span>{{ t.label }}</span>
    </button>
  </nav>

  <component :is="SHEETS[s.type]" v-for="s in state.sheets" :key="s.key" :sheet="s" />
</template>
