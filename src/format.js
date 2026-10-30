// 与主站一致：市场按交易所简称显示（接口里的 name 是中文）
const EXCHANGE = { SG: 'SGX', US: 'US', HK: 'HK', CN: 'CN', MY: 'MY' }
export const exch = (code) => EXCHANGE[code] || code || ''

export const num = (n) => {
  const x = Number(n)
  return n === null || n === undefined || n === '' || !isFinite(x) ? null : x
}

// 价格位数跟主站一致：< 1 三位小数，否则两位
export const decimals = (x) => (Math.abs(x) < 0.01 ? 4 : Math.abs(x) < 1 ? 3 : 2)
export const fixed = (x, d) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const signOf = (x) => (x > 0 ? '+' : x < 0 ? '−' : '')

export const fmtPrice = (n) => {
  const x = num(n)
  return x === null ? '—' : fixed(x, decimals(x))
}
export const fmtChange = (n) => {
  const x = num(n)
  return x === null ? '—' : signOf(x) + fixed(Math.abs(x), decimals(x))
}
export const fmtPct = (n) => {
  const x = num(n)
  return x === null ? '—' : `${signOf(x)}${Math.abs(x).toFixed(2)}%`
}
export const fmtBig = (n) => {
  const x = num(n)
  if (x === null) return '—'
  if (x >= 1e9) return (x / 1e9).toFixed(2) + 'B'
  if (x >= 1e6) return (x / 1e6).toFixed(2) + 'M'
  if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K'
  return String(x)
}
export const fmtTime = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
export const fmtClock = (d) => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

/** 某时区的当地时间，如 "Fri 09:30" */
export const fmtZoned = (d, timeZone) => {
  try {
    return new Date(d).toLocaleString('en-GB', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

/** 分时只取最近一个交易日（按市场当地日期切） */
export function lastSession(bars, timeZone) {
  if (!bars || !bars.length) return []
  const day = (ts) => { try { return new Date(ts).toLocaleDateString('en-CA', { timeZone }) } catch { return '' } }
  const last = day(bars[bars.length - 1].ts)
  return bars.filter((b) => day(b.ts) === last)
}

export const dir = (n) => {
  const x = num(n)
  return x > 0 ? 'is-up' : x < 0 ? 'is-down' : 'is-flat'
}

export const greeting = (d = new Date()) => {
  const h = d.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// 资讯正文来自第三方源（服务端原样保存），可能带脚本或事件属性。
// 本站与管理端同源（github.io），管理端的 GitHub 令牌存在 localStorage 里，所以必须先清洗再 v-html。
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const KEEP_TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'A', 'IMG', 'SPAN', 'DIV', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'])
const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'SVG', 'MATH', 'LINK', 'META', 'BASE', 'NOSCRIPT', 'TEMPLATE'])
const safeUrl = (v) => /^https?:\/\//i.test((v || '').trim())

function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const walk = (node) => {
    for (const el of [...node.children]) {
      const tag = el.tagName.toUpperCase() // SVG/MathML 里的元素名是小写
      if (DROP_TAGS.has(tag)) { el.remove(); continue }
      walk(el)
      if (!KEEP_TAGS.has(tag)) { el.replaceWith(...el.childNodes); continue }
      for (const { name, value } of [...el.attributes]) {
        const keep = (tag === 'A' && name === 'href' && safeUrl(value))
          || (tag === 'IMG' && ((name === 'src' && safeUrl(value)) || name === 'alt'))
        if (!keep) el.removeAttribute(name)
      }
      if (tag === 'A') el.setAttribute('rel', 'noopener noreferrer')
      if (tag === 'IMG' && !el.hasAttribute('src')) el.remove()
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}

/** 纯文本按换行分段；HTML 只保留白名单标签和 http(s) 链接/图片 */
export const articleHtml = (n) => {
  const raw = (n && (n.body || n.content)) || ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return sanitize(raw)
  return raw.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('')
}
