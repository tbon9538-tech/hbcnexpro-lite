<script setup>
import { closeSheet } from '../store.js'
import Icon from './Icon.vue'

defineProps({ sheet: Object })
</script>

<template>
  <div class="sheet">
    <div class="sheet__nav">
      <button type="button" class="icon-btn press" aria-label="Back" @click="closeSheet"><Icon name="back" /></button>
      <div class="sheet__title"><span class="sheet__eyebrow">About</span></div>
      <span class="icon-btn icon-btn--ghost"></span>
    </div>
    <div class="sheet__body about">
      <div class="about__brand">
        <img src="https://www.hbcnexpro.com/hbcia-logo.png" alt="">
        <h1>Hudson Bay</h1>
        <p>Version 1.0</p>
      </div>

      <section class="about__card">
        <h2>What's inside</h2>
        <p>Follow stock prices across Singapore, US, Hong Kong and China markets, see daily top movers and price charts, keep a personal watchlist, and read the latest market news.</p>
      </section>
      <section class="about__card">
        <h2>About the data</h2>
        <p>Quotes refresh every 30 seconds while the app is open and may be delayed. Trading hours and market status follow each exchange's local time.</p>
      </section>
      <section class="about__card">
        <h2>Your watchlist</h2>
        <p>No sign-up is needed. Your watchlist is stored only on this device and is removed if you delete the app.</p>
      </section>
      <section class="about__card">
        <h2>Disclaimer</h2>
        <p>Information in this app is for general reference only. It is not investment advice or an offer to buy or sell any security.</p>
      </section>
    </div>
  </div>
</template>
