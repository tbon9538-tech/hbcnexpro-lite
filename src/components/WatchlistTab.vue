<script setup>
import { computed } from 'vue'
import { openSearch, state } from '../store.js'
import Icon from './Icon.vue'
import QuoteRow from './QuoteRow.vue'

// 行情还没回来的先不显示，避免空行
const stocks = computed(() => state.watchIds.map((id) => state.watchQuotes[id]).filter(Boolean))
</script>

<template>
  <main class="page">
    <div class="headline-row-wrap">
      <h1 class="headline">Watchlist</h1>
      <button v-if="state.watchIds.length" type="button" class="round-btn press" aria-label="Search" @click="openSearch"><Icon name="search" /></button>
    </div>

    <div v-if="!state.watchIds.length" class="empty">
      <span class="empty__icon"><Icon name="star" /></span>
      <h2>No stocks yet</h2>
      <p>Tap the star on any stock to follow it here. Your watchlist is saved on this device.</p>
      <button type="button" class="btn press" @click="state.tab = 'market'">Browse markets</button>
      <button type="button" class="btn btn--soft press" @click="openSearch">Search stocks</button>
    </div>
    <section v-else class="card">
      <div class="list-head"><span>Name</span><span>Last</span><span>Chg%</span></div>
      <QuoteRow v-for="s in stocks" :key="s.id" :stock="s" />
      <div v-if="stocks.length < state.watchIds.length" class="state state--inline">Loading…</div>
    </section>
  </main>
</template>
