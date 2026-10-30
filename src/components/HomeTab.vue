<script setup>
import { computed } from 'vue'
import { dir, exch, fmtClock, fmtPct, fmtPrice, fmtTime, fmtZoned, greeting } from '../format.js'
import { openAbout, openNews, openSearch, openStock, refresh, selectMarket, selectMovers, state } from '../store.js'
import Icon from './Icon.vue'
import QuoteRow from './QuoteRow.vue'
import Sparkline from './Sparkline.vue'

const MOVER_TYPES = [
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers', label: 'Losers' },
  { key: 'turnover', label: 'Most active' },
]

const movers = computed(() => state.movers[`${state.moverMarketId}:${state.moverType}`])
const moverMarket = computed(() => state.markets.find((m) => m.id === state.moverMarketId))
const headlines = computed(() => state.news.slice(0, 4))
const now = computed(() => state.statusAt || new Date())
const openCount = computed(() => state.markets.filter((m) => state.marketStatus[m.code]).length)

function goMarket(id) {
  selectMarket(id)
  state.tab = 'market'
}
</script>

<template>
  <main class="page">
    <header class="home-head">
      <img class="brand__logo" src="https://www.hbcnexpro.com/hbcia-logo.png" alt="">
      <div class="home-head__text">
        <div class="home-head__hello">{{ greeting() }}</div>
        <div class="home-head__name">Hudson Bay</div>
      </div>
      <button type="button" class="round-btn press" aria-label="Search" @click="openSearch"><Icon name="search" /></button>
      <button type="button" class="round-btn press" aria-label="About" @click="openAbout"><Icon name="info" /></button>
    </header>

    <!-- 各市场开收盘状态：深色品牌卡片，4 个市场一屏放下 -->
    <section class="hero">
      <div class="hero__head">
        <span v-if="state.booting" class="hero__title">Loading market hours…</span>
        <span v-else-if="!state.markets.length || !state.statusAt" class="hero__title">Market status unavailable</span>
        <span v-else class="hero__title">{{ openCount ? `${openCount} market${openCount > 1 ? 's' : ''} open now` : 'All markets closed' }}</span>
        <span v-if="state.statusAt" class="hero__time">Updated {{ fmtClock(state.statusAt) }}</span>
        <button v-else-if="!state.booting" type="button" class="hero__retry" @click="refresh">Retry</button>
      </div>
      <div v-if="state.markets.length" class="hero__grid">
        <button v-for="m in state.markets" :key="m.id" type="button" class="hero__mkt press" @click="goMarket(m.id)">
          <span class="hero__code">{{ exch(m.code) }}</span>
          <span class="hero__status" :class="{ 'is-open': state.marketStatus[m.code] }"><i></i>{{ state.marketStatus[m.code] ? 'Open' : 'Closed' }}</span>
          <span class="hero__local num">{{ fmtZoned(now, m.timezone) }}</span>
        </button>
      </div>
      <div v-if="state.markets.length" class="hero__foot">Local exchange time</div>
    </section>

    <!-- 推荐个股（与主站首页同一批）+ 当日迷你走势 -->
    <template v-if="state.featured.length">
      <h2 class="section-title">Featured</h2>
      <div class="featured">
        <button v-for="s in state.featured" :key="s.id" type="button" class="featured__item press" @click="openStock(s)">
          <span class="featured__top">
            <span v-if="s.market" class="tag" :class="'tag--' + s.market.code.toLowerCase()">{{ exch(s.market.code) }}</span>
            <span class="featured__code">{{ s.code }}</span>
          </span>
          <span class="featured__name">{{ s.name }}</span>
          <Sparkline :points="state.sparks[s.id] || []" :prev-close="s.prevClose" />
          <span class="featured__last num">{{ fmtPrice(s.last) }}</span>
          <span class="featured__chg num" :class="dir(s.changePct)">{{ fmtPct(s.changePct) }}</span>
        </button>
      </div>
    </template>

    <section v-if="state.markets.length" class="panel">
      <div class="panel__head">
        <h2>Top movers</h2>
        <div class="mini-seg">
          <button
            v-for="m in state.markets" :key="m.id" type="button"
            :class="{ 'is-on': m.id === state.moverMarketId }"
            @click="selectMovers(m.id, state.moverType)"
          >{{ exch(m.code) }}</button>
        </div>
      </div>
      <div class="tabs-line">
        <button
          v-for="t in MOVER_TYPES" :key="t.key" type="button"
          :class="{ 'is-on': state.moverType === t.key }"
          @click="selectMovers(state.moverMarketId, t.key)"
        >{{ t.label }}</button>
      </div>
      <template v-if="movers">
        <QuoteRow v-for="s in movers" :key="s.id" :stock="s" solid />
        <div v-if="!movers.length" class="state state--inline">No data for this market yet</div>
      </template>
      <div v-else class="state state--inline">Loading…</div>
      <button v-if="moverMarket" type="button" class="panel__more press" @click="goMarket(moverMarket.id)">
        See all {{ exch(moverMarket.code) }} stocks <Icon name="chevron" />
      </button>
    </section>

    <section v-if="headlines.length" class="panel">
      <div class="panel__head">
        <h2>Latest news</h2>
        <button type="button" class="link" @click="state.tab = 'news'">See all</button>
      </div>
      <button v-for="(n, i) in headlines" :key="n.id" type="button" class="headline-row press" @click="openNews(n)">
        <span class="headline-row__rank num">{{ i + 1 }}</span>
        <span class="headline-row__body">
          <span class="headline-row__title">{{ n.title }}</span>
          <span class="meta">{{ n.source }} · {{ fmtTime(n.publishedAt) }}</span>
        </span>
      </button>
    </section>

    <p class="disclaimer">Market data is for reference only and may be delayed. Nothing in this app is investment advice.</p>
  </main>
</template>
