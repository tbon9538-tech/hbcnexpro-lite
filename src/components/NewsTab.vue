<script setup>
import { computed } from 'vue'
import { fmtTime } from '../format.js'
import { openNews, refresh, state } from '../store.js'

const topStory = computed(() => state.news[0])
const moreNews = computed(() => state.news.slice(1))
</script>

<template>
  <main class="page">
    <h1 class="headline">News</h1>

    <section v-if="state.booting" class="news">
      <div class="top-story top-story--skeleton"><span class="sk" style="width: 30%; height: 10px"></span><span class="sk" style="width: 90%; height: 18px; margin-top: 14px"></span><span class="sk" style="width: 70%; height: 18px; margin-top: 8px"></span></div>
    </section>
    <div v-else-if="state.newsError" class="state">
      <p>{{ state.newsError }}</p>
      <button type="button" class="btn press" @click="refresh">Retry</button>
    </div>
    <div v-else-if="!state.news.length" class="state">No news yet</div>
    <section v-else class="news">
      <button type="button" class="top-story press" @click="openNews(topStory)">
        <span class="top-story__eyebrow">Top story</span>
        <span class="top-story__title">{{ topStory.title }}</span>
        <span class="meta">{{ topStory.source }} · {{ fmtTime(topStory.publishedAt) }}</span>
      </button>
      <button v-for="n in moreNews" :key="n.id" type="button" class="news-row press" @click="openNews(n)">
        <span class="news-row__title">{{ n.title }}</span>
        <span class="meta">{{ n.source }} · {{ fmtTime(n.publishedAt) }}</span>
      </button>
    </section>
  </main>
</template>
