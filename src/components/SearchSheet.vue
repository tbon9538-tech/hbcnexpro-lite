<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { API, closeSheet, getJson, openStock, state } from '../store.js'
import Icon from './Icon.vue'
import QuoteRow from './QuoteRow.vue'

defineProps({ sheet: Object })

const q = ref('')
const input = ref(null)
const results = ref(null)  // null = 还没搜
const searching = ref(false)
const failed = ref(false)

onMounted(() => nextTick(() => input.value && input.value.focus()))

// 输入停顿 250ms 再搜；只采用最后一次请求的结果
let timer = null
let seq = 0
async function search(kw) {
  const mine = ++seq
  try {
    const data = await getJson(`${API}/stocks?keyword=${encodeURIComponent(kw)}&size=30`)
    if (mine === seq) { results.value = data.items; failed.value = false }
  } catch {
    // 网络失败不能显示成“没有结果”
    if (mine === seq) { results.value = []; failed.value = true }
  } finally {
    if (mine === seq) searching.value = false
  }
}
watch(q, (v) => {
  clearTimeout(timer)
  const kw = v.trim()
  if (!kw) { seq++; results.value = null; searching.value = false; failed.value = false; return }
  searching.value = true
  timer = setTimeout(() => search(kw), 250)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="sheet">
    <div class="search-head">
      <label class="search-bar search-bar--input">
        <Icon name="search" />
        <input
          ref="input" v-model="q" type="search" inputmode="search" enterkeyhint="search"
          autocomplete="off" autocapitalize="characters" spellcheck="false"
          placeholder="Search stocks, ETFs, REITs"
        >
      </label>
      <button type="button" class="link" @click="closeSheet">Cancel</button>
    </div>

    <div class="sheet__body sheet__body--flush">
      <template v-if="results === null && !searching">
        <div v-if="state.featured.length" class="search-section">
          <h3>Trending</h3>
          <div class="trending">
            <button v-for="s in state.featured" :key="s.id" type="button" class="chip chip--s press" @click="openStock(s)">{{ s.name }}</button>
          </div>
        </div>
        <p class="search-hint">Search by stock code or company name, e.g. D05 or Apple.</p>
      </template>
      <div v-else-if="searching && !results" class="state state--inline">Searching…</div>
      <div v-else-if="failed" class="state">
        <p>Search failed. Check your connection.</p>
        <button type="button" class="btn press" @click="results = null; failed = false; searching = true; search(q.trim())">Retry</button>
      </div>
      <div v-else-if="!results.length" class="state">No results for “{{ q.trim() }}”</div>
      <section v-else class="card card--flush">
        <QuoteRow v-for="s in results" :key="s.id" :stock="s" />
      </section>
    </div>
  </div>
</template>
