import { reactive } from 'vue'
import { lastSession } from './format.js'

export const API = 'https://www.hbcnexpro.com/api/v1'
const LOAD_ERROR = 'Failed to load. Check your connection.'
const WATCH_KEY = 'hb.watchlist'
const WATCH_MAX = 50
const STALE_MS = 30 * 1000

// 不能让 storage 抛异常（无痕模式等）拖垮整个页面；内容被改坏时当作空
function readWatch() {
  try {
    const v = JSON.parse(localStorage.getItem(WATCH_KEY))
    return Array.isArray(v) ? v.filter(Number.isInteger).slice(0, WATCH_MAX) : []
  } catch { return [] }
}
function saveWatch(ids) {
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(ids)) } catch {}
}

export const state = reactive({
  tab: 'home',
  booting: true,
  markets: [],
  marketStatus: {},      // 市场 code -> 是否开市
  statusAt: null,
  activeMarketId: null,  // Markets 页选中的市场
  lists: {},             // 市场 id -> 股票列表
  listAt: {},            // 市场 id -> 列表更新时间
  listErrors: {},        // 市场 id -> 错误提示
  featured: [],          // 首页推荐（与主站首页同一批）
  sparks: {},            // 股票 id -> 当日分时收盘价，首页迷你走势用
  movers: {},            // `${marketId}:${type}` -> 排行
  moverMarketId: null,
  moverType: 'gainers',
  news: [],
  newsError: '',
  watchIds: readWatch(),
  watchQuotes: {},       // 股票 id -> 最新行情
  sheets: [],            // 叠在页面上的详情页：{ key, type, data }
  tick: 0,               // 每轮轮询 +1，详情页据此刷新分时图
})

export async function getJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status })
  return (await r.json()).data
}

// 同一份数据同时只发一个请求（切 Tab 和轮询可能撞在一起）
const inflight = new Map()
function dedupe(key, fn) {
  if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)))
  return inflight.get(key)
}

// 限制并发，避免自选股多时一次打出几十个请求（服务端按 IP 限流 300 次/分钟）
async function eachLimit(items, limit, fn) {
  const queue = [...items]
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift())
  }))
}

// /config/public 已经只返回上线市场，且不带 online 字段，不能再按 m.online 过滤
const loadMarkets = () => dedupe('markets', async () => {
  const cfg = await getJson(`${API}/config/public`)
  state.markets = cfg.markets || []
  if (!state.activeMarketId && state.markets[0]) state.activeMarketId = state.markets[0].id
  if (!state.moverMarketId && state.markets[0]) state.moverMarketId = state.markets[0].id
})

// /markets/status 返回 { serverTime, markets: [...] }
const loadStatus = () => dedupe('status', async () => {
  try {
    const { markets } = await getJson(`${API}/markets/status`)
    state.marketStatus = Object.fromEntries(markets.map((m) => [m.code, m.open]))
    state.statusAt = new Date()
  } catch {}
})

export const loadList = (marketId = state.activeMarketId) => !marketId ? Promise.resolve() : dedupe(`list:${marketId}`, async () => {
  try {
    state.lists[marketId] = (await getJson(`${API}/stocks?marketId=${marketId}&type=STOCK&sort=code_asc&size=100`)).items
    state.listAt[marketId] = new Date()
    state.listErrors[marketId] = ''
  } catch {
    // 轮询偶发失败时保留上一次的数据，只有一直没数据才提示
    if (!state.lists[marketId]?.length) state.listErrors[marketId] = LOAD_ERROR
  }
})

const loadMovers = (marketId = state.moverMarketId, type = state.moverType) => !marketId ? Promise.resolve() : dedupe(`movers:${marketId}:${type}`, async () => {
  try {
    state.movers[`${marketId}:${type}`] = await getJson(`${API}/rankings?marketId=${marketId}&type=${type}&size=5`)
  } catch {}
})

// 迷你走势不需要跟着 30 秒轮询，5 分钟整体更新一次；新出现的推荐股立即补
let sparksAt = 0
async function loadSparks() {
  const stale = Date.now() - sparksAt > 5 * 60 * 1000
  const todo = stale ? state.featured : state.featured.filter((s) => !state.sparks[s.id])
  if (!todo.length) return
  if (stale) sparksAt = Date.now()
  await Promise.all(todo.map(async (s) => {
    try {
      const tz = state.markets.find((m) => m.id === s.market?.id)?.timezone
      const bars = lastSession(await getJson(`${API}/stocks/${s.id}/kline?period=M5&limit=120`), tz)
      state.sparks[s.id] = bars.map((b) => Number(b.close)).filter((x) => isFinite(x))
    } catch {}
  }))
}

const loadFeatured = () => dedupe('featured', async () => {
  try {
    state.featured = (await getJson(`${API}/stocks?recommended=true&size=6`)).items
    await loadSparks()
  } catch {}
})

// 接口不带 language 会把同一篇文章的 en/ms/ja/ko 版本全部返回
const loadNews = () => dedupe('news', async () => {
  try {
    state.news = (await getJson(`${API}/news?page=1&size=50&language=en`)).items
    state.newsError = ''
  } catch {
    if (!state.news.length) state.newsError = LOAD_ERROR
  }
})

const loadWatchQuotes = () => dedupe('watch', () => eachLimit(state.watchIds, 4, async (id) => {
  try {
    state.watchQuotes[id] = await getJson(`${API}/stocks/${id}`)
  } catch (e) {
    if (e.status === 404) removeWatch(id) // 已下架的股票打不开详情，也就没法手动取消，直接移除
  }
}))

// 详情页开着时随轮询更新报价
async function refreshTopStock() {
  const top = state.sheets[state.sheets.length - 1]
  if (top?.type !== 'stock' || !top.data?.id) return
  try { top.data = await getJson(`${API}/stocks/${top.data.id}`) } catch {}
}

// 只加载当前 Tab 用得到的数据
const TAB_LOADERS = {
  home: () => [loadMovers(), loadFeatured(), loadNews()],
  market: () => [loadList()],
  watch: () => [loadWatchQuotes()],
  news: () => [loadNews()],
}
export const loadTab = (tab = state.tab) => Promise.all(TAB_LOADERS[tab]())

let refreshing = false
export async function refresh() {
  if (refreshing) return // 上一轮还没回来就跳过，避免请求堆积
  refreshing = true
  try {
    if (!state.markets.length) await loadMarkets().catch(() => {})
    await Promise.all([loadStatus(), loadTab(), refreshTopStock()])
    state.tick++
  } finally {
    state.booting = false
    refreshing = false
  }
}

// App 切到后台时停止轮询，回到前台立即刷新一次
let timer = null
function onVisibility() {
  clearInterval(timer)
  timer = null
  if (!document.hidden) {
    refresh()
    timer = setInterval(refresh, STALE_MS)
  }
}
export function startPolling() {
  refresh()
  timer = setInterval(refresh, STALE_MS)
  document.addEventListener('visibilitychange', onVisibility)
}
export function stopPolling() {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
}

export function selectMarket(id) {
  state.activeMarketId = id
  const at = state.listAt[id]
  if (!at || Date.now() - at > STALE_MS) loadList(id)
}
export function selectMovers(marketId, type) {
  state.moverMarketId = marketId
  state.moverType = type
  if (!state.movers[`${marketId}:${type}`]) loadMovers(marketId, type)
}

// 自选只存在本机，不需要账号
export const isWatched = (id) => state.watchIds.includes(id)
function removeWatch(id) {
  state.watchIds = state.watchIds.filter((x) => x !== id)
  delete state.watchQuotes[id]
  saveWatch(state.watchIds)
}
export function toggleWatch(stock) {
  if (isWatched(stock.id)) return removeWatch(stock.id)
  state.watchIds = [stock.id, ...state.watchIds].slice(0, WATCH_MAX)
  state.watchQuotes[stock.id] = stock
  saveWatch(state.watchIds)
}

// 详情页按栈叠放：搜索 → 个股，返回时逐层关闭
let seq = 0
function push(type, data = null) {
  state.sheets.push({ key: ++seq, type, data })
  return state.sheets[state.sheets.length - 1]
}
export const closeSheet = () => state.sheets.pop()

export async function openStock(stock) {
  const sheet = push('stock', stock) // 先用列表里的数据画出来，再补全详情
  try { sheet.data = await getJson(`${API}/stocks/${stock.id}`) } catch {}
}
export async function openNews(item) {
  const sheet = push('news', item)
  try { sheet.data = await getJson(`${API}/news/${item.id}`) } catch {}
}
export const openSearch = () => push('search')
export const openAbout = () => push('about')
