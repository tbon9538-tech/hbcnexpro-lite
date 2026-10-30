<script setup>
import { dir, exch, fmtPct, fmtPrice } from '../format.js'
import { openStock } from '../store.js'

// solid：首页 Top movers 用实心涨跌块，其余列表用浅色块（同主站）
defineProps({ stock: { type: Object, required: true }, solid: Boolean })
</script>

<template>
  <button type="button" class="quote press" @click="openStock(stock)">
    <span class="quote__main">
      <span class="quote__name">{{ stock.name }}</span>
      <span class="quote__sub">
        <span v-if="stock.market" class="tag" :class="'tag--' + stock.market.code.toLowerCase()">{{ exch(stock.market.code) }}</span>
        <span class="quote__code">{{ stock.code }}</span>
      </span>
    </span>
    <span class="quote__last num">{{ fmtPrice(stock.last) }}</span>
    <span class="chg num" :class="[dir(stock.changePct), { 'chg--solid': solid }]">{{ fmtPct(stock.changePct) }}</span>
  </button>
</template>
