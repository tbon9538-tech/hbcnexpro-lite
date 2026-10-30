<script setup>
import { computed } from 'vue'
import { articleHtml, fmtTime } from '../format.js'
import { closeSheet } from '../store.js'
import Icon from './Icon.vue'

const props = defineProps({ sheet: { type: Object, required: true } })
const n = computed(() => props.sheet.data)
// 列表里的资讯没有正文，详情回来之前先显示占位
const html = computed(() => articleHtml(n.value))
</script>

<template>
  <div class="sheet">
    <div class="sheet__nav">
      <button type="button" class="icon-btn press" aria-label="Back" @click="closeSheet"><Icon name="back" /></button>
      <div class="sheet__title"><span class="sheet__eyebrow">News</span></div>
      <span class="icon-btn icon-btn--ghost"></span>
    </div>
    <article class="sheet__body article">
      <span class="article__cat">{{ n.category }}</span>
      <h1>{{ n.title }}</h1>
      <div class="meta">{{ n.source }} · {{ fmtTime(n.publishedAt) }}</div>
      <img v-if="n.coverUrl" class="article__cover" :src="n.coverUrl" alt="">
      <div v-if="html" class="article__body" v-html="html"></div>
      <div v-else class="article__body">
        <span class="sk" style="width: 100%; height: 14px"></span>
        <span class="sk" style="width: 92%; height: 14px; margin-top: 10px"></span>
        <span class="sk" style="width: 96%; height: 14px; margin-top: 10px"></span>
        <span class="sk" style="width: 60%; height: 14px; margin-top: 10px"></span>
      </div>
    </article>
  </div>
</template>
