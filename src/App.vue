<template>
  <div class="site-banner">⚠️ This site is under construction. Some content, audio, and features may be incomplete or inaccurate.</div>
  <nav class="site-nav">
    <span class="site-brand" @click="navigateTo('textbook')">香港客家話入門</span>
    <div class="site-links">
      <button type="button" :class="['site-link', { active: page === 'textbook' }]" @click="navigateTo('textbook')">課本 Textbook</button>
      <button type="button" :class="['site-link', { active: page === 'about' }]" @click="navigateTo('about')">About Us</button>
      <button type="button" :class="['site-link', { active: page === 'acknowledgement' }]" @click="navigateTo('acknowledgement')">Acknowledgement</button>
    </div>
    <div class="lang-toggle">
      <button type="button" :class="['lang-btn', { active: displayLang === 'zh' }]" @click="displayLang = 'zh'">中文</button>
      <button type="button" :class="['lang-btn', { active: displayLang === 'en' }]" @click="displayLang = 'en'">EN</button>
    </div>
  </nav>

  <div v-if="page === 'textbook' && loading" class="loading-state">
    <p>Loading textbook…</p>
  </div>

  <div v-else-if="page === 'textbook' && currentLesson" class="app-shell">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <nav class="lesson-nav">
        <button
          v-for="lesson in lessons"
          :key="lesson.id"
          type="button"
          :class="['lesson-link', { active: lesson.id === currentLessonId }]"
          @click="selectLesson(lesson.id)"
        >
          <span class="lesson-num">{{ lesson.id }}</span>
          <span class="lesson-label font-hakka" v-html="formatHakka(lesson.title.hak)"></span>
        </button>
      </nav>
    </aside>

    <button type="button" :class="['scrim', { visible: sidebarOpen }]" @click="sidebarOpen = false"></button>

    <main class="main-stage">
      <header class="topbar" :class="{ hidden: heroVisible }">
        <button type="button" class="menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="topbar-center">
          <span class="topbar-kicker">第 {{ currentLesson.id }} 課</span>
          <h2 class="font-hakka" v-html="renderTitleRuby(currentLesson.title.hak)"></h2>
          <span class="topbar-en">{{ currentLesson.title.en }}</span>
        </div>
      </header>

      <div class="content">
        <section ref="heroEl" class="hero">
          <span class="kicker">Lesson {{ currentLesson.id }}</span>
          <h1 class="font-hakka" v-html="renderTitleRuby(currentLesson.title.hak)"></h1>
          <p class="hero-sub">{{ currentLesson.title.en }}</p>
          <button type="button" class="audio-btn" @click="playAudio(baseUrl + `audio/ch${currentLesson.id}-title.m4a`)">▶ Title</button>
        </section>

        <section class="blocks">
          <article
            v-for="(block, bi) in currentLesson.blocks"
            :key="`${currentLesson.id}-${bi}`"
            class="block"
          >
            <header class="block-hd">
              <div class="block-hd-text">
                <span class="block-type">{{ blockTitle(block.type) }}</span>
                <span class="block-type-en">{{ blockTitlesEn[block.type] || '' }}</span>
                <span v-if="blockTimestampMismatch(currentLesson.id, block, bi)" class="ts-warn" title="Timestamp count mismatch">⚠️</span>
              </div>
              <button
                v-if="getBlockAudio(currentLesson.id, block, bi)"
                type="button"
                class="block-play-btn"
                @click="playAudio(getBlockAudio(currentLesson.id, block, bi))"
              >▶</button>
            </header>

            <div v-if="block.description" class="block-desc">
              <p v-if="block.description.hak" class="font-hakka" v-html="formatHakka(block.description.hak)"></p>
              <p v-if="block.description.en" class="desc-copy">{{ block.description.en }}</p>
            </div>

            <div v-if="block.type === 'vocab'" class="vocab-grid">
              <div v-for="(token, ti) in tokenize(block.items)" :key="token" class="vocab-card" @click="playTokenAudio(block, bi, ti)">
                <p class="vocab-hak font-hakka" v-html="renderTokenRuby(token)"></p>
                <p class="vocab-mean">{{ getMeaning(token) || '—' }}</p>
              </div>
            </div>

            <div v-else-if="block.type === 'main' && typeof block.items === 'string'" class="vocab-grid vocab-sm">
              <div v-for="(token, ti) in tokenize(block.items)" :key="token" class="vocab-card sm" @click="playTokenAudio(block, bi, ti)">
                <p class="vocab-hak font-hakka" v-html="renderTokenRuby(token)"></p>
              </div>
            </div>

            <div v-else-if="block.type === 'main' && hasSpeakers(block.items)" class="dialogue">
              <div
                v-for="(item, ii) in block.items"
                :key="ii"
                class="dia-row"
                @click="playBlockItem(currentLesson.id, block, bi, ii)"
              >
                <span class="dia-sp">{{ item.sp || '例' }}</span>
                <div class="dia-body">
                  <p class="dia-hak font-hakka" v-html="renderSentenceRuby(item.hak)"></p>
                  <p v-if="getDisplayText(item)" class="dia-tr">{{ getDisplayText(item) }}</p>
                </div>
              </div>
            </div>

            <div v-else-if="block.type === 'main'" class="sent-list">
              <div
                v-for="(item, ii) in block.items"
                :key="ii"
                class="sent-row"
                @click="playBlockItem(currentLesson.id, block, bi, ii)"
              >
                <p class="sent-hak font-hakka" v-html="renderSentenceRuby(item.hak)"></p>
                <p v-if="getDisplayText(item)" class="sent-tr">{{ getDisplayText(item) }}</p>
              </div>
            </div>

            <ol v-else-if="block.type === 'practice' && Array.isArray(block.items)" class="prompt-list">
              <li v-for="(item, ii) in block.items" :key="ii" v-html="formatNoteText(item)"></li>
            </ol>

            <div v-else-if="block.type === 'practice' && Array.isArray(block.rows)" class="table-wrap">
              <table class="drill-table">
                <tbody>
                  <tr v-for="(row, ri) in block.rows" :key="ri">
                    <td v-for="(cell, ci) in row" :key="ci">
                      <span class="font-hakka" v-html="renderTokenRuby(cell)"></span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else-if="block.type === 'idiom' || block.type === 'nursery'" class="sent-list">
              <div v-for="(item, ii) in block.items" :key="ii" class="sent-row">
                <p class="sent-hak font-hakka" v-html="renderSentenceRuby(item.hak)"></p>
                <p v-if="getDisplayText(item)" class="sent-tr">{{ getDisplayText(item) }}</p>
                <p v-if="item.note" class="sent-note">{{ item.note }}</p>
              </div>
            </div>

            <div v-else-if="block.type === 'notes'" class="notes">
              <div v-for="(item, ii) in block.items" :key="ii" class="note-item">
                <p v-html="formatNoteText(getDisplayText(item))"></p>
              </div>
            </div>

            <ol v-else-if="block.type === 'sentence_practice' || block.type === 'sentences'" class="sp-list">
              <li v-for="(item, ii) in block.items" :key="ii" class="sp-item" v-html="formatPracticeItem(item)"></li>
            </ol>

            <div v-else class="note-item fallback">
              <p>Unsupported block: {{ block.type }}</p>
            </div>
          </article>
        </section>

        <footer class="lesson-foot">
          <button v-if="currentIndex > 0" type="button" class="foot-btn" @click="selectLesson(lessons[currentIndex - 1].id)">← Previous</button>
          <span class="spacer"></span>
          <button v-if="currentIndex < lessons.length - 1" type="button" class="foot-btn" @click="selectLesson(lessons[currentIndex + 1].id)">Next →</button>
        </footer>
      </div>
    </main>
  </div>

  <div v-else-if="page === 'textbook'" class="loading-state">
    <p>No lessons found.</p>
  </div>

  <div v-else-if="page === 'about'" class="static-page">
    <h1>About Us</h1>
  </div>

  <div v-else-if="page === 'acknowledgement'" class="static-page">
    <h1>Acknowledgement</h1>
  </div>

  <div v-if="playingAudio" class="audio-bar">
    <button type="button" class="audio-bar-btn" @click="stopAudio">■</button>
    <span class="audio-bar-label">{{ audioLabel }}</span>
    <button type="button" class="audio-bar-btn" @click="replayAudio">⟲</button>
    <button type="button" class="audio-bar-btn primary" @click="stopAudio">⏸</button>
  </div>

  <audio ref="audioEl" @ended="playingAudio = ''" @pause="onAudioPause" @timeupdate="onAudioTimeUpdate"></audio>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const baseUrl = import.meta.env.BASE_URL

const loading = ref(true)
const lessons = ref([])
const lexicon = ref(new Map())
const displayLang = ref('zh')
const sidebarOpen = ref(false)
const audioEl = ref(null)
const playingAudio = ref('')
const timestamps = ref({})
let stopAtTime = null
const heroEl = ref(null)
const heroVisible = ref(true)
let heroObserver = null

const page = computed(() => {
  if (route.name === 'about') return 'about'
  if (route.name === 'acknowledgement') return 'acknowledgement'
  return 'textbook'
})

const currentLessonId = computed(() => {
  if (route.name === 'chapter' && route.params.id) return parseInt(route.params.id)
  return null
})

const blockTitlesEn = {
  vocab: 'Vocabulary',
  main: 'Dialogue',
  practice: 'Practice',
  sentence_practice: 'Sentence Practice',
  sentences: 'Sentence Practice',
  notes: 'Language Notes',
  idiom: 'Proverbs',
  nursery: 'Nursery Rhyme'
}

const blockTitles = {
  vocab: '生字',
  main: '課文',
  practice: '練習',
  sentence_practice: '造句練習',
  sentences: '造句練習',
  notes: '語言筆記',
  idiom: '諺語',
  nursery: '童謠'
}

const currentLesson = computed(() =>
  lessons.value.find((l) => l.id === currentLessonId.value) || null
)
const currentIndex = computed(() =>
  lessons.value.findIndex((l) => l.id === currentLessonId.value)
)

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Numerical tone → diacritic conversion
const TONE_MARKS = {
  1: '\u0301', // acute ´
  2: '\u0304', // macron ¯
  3: '\u0306', // breve ˘
  4: '\u0300', // grave `
  5: '\u0306', // breve (entering)
  6: '\u0300', // grave (entering)
}
const VOWELS = 'aeiou'
const SEMIVOWEL = 'y'

function numeralToDiacritic(syl) {
  if (!syl) return syl
  const toneMatch = syl.match(/^(.+?)(\d)$/)
  if (!toneMatch) {
    // bare "m" or "ng" → default tone 1
    if (syl === 'm' || syl === 'ng') {
      const mark = TONE_MARKS[1]
      return (syl[0] + mark + syl.slice(1)).normalize('NFC')
    }
    return syl
  }
  const base = toneMatch[1]
  const tone = parseInt(toneMatch[2])
  const mark = TONE_MARKS[tone]
  if (!mark) return syl

  // Find the vowel to place the diacritic on
  // 'i' before a/e/o or before u+consonant is a glide — skip to next vowel
  // 'y' is only used as fallback when no real vowel exists
  let idx = -1
  for (let i = 0; i < base.length; i++) {
    if (VOWELS.includes(base[i])) {
      // Check if this 'i' is a glide
      if (base[i] === 'i' && i + 1 < base.length && 'aeou'.includes(base[i + 1])) {
        continue // skip glide i
      }
      idx = i
      break
    }
  }
  if (idx === -1) {
    // No real vowel — try y
    const yi = base.indexOf('y')
    idx = yi !== -1 ? yi : 0
  }
  const result = base.slice(0, idx) + base[idx] + mark + base.slice(idx + 1)
  return result.normalize('NFC')
}

function romToDiacritics(rom) {
  if (!rom) return ''
  return rom.split(/(\s+|,\s*)/).map(part => {
    if (/^\s+$/.test(part) || /^,/.test(part)) return part
    return numeralToDiacritic(part)
  }).join('')
}

function parseCsvLine(line) {
  const fields = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { fields.push(cur); cur = '' }
    else cur += c
  }
  fields.push(cur)
  return fields
}

function tokenize(text) {
  return typeof text === 'string' ? text.split(/\s+/).filter(Boolean) : []
}

function parseToken(raw) {
  const s = typeof raw === 'string' ? raw : raw?.hak || ''
  const dot = s.indexOf('.')
  if (dot === -1) return { hak: s, overrideRom: '' }
  return { hak: s.slice(0, dot), overrideRom: s.slice(dot + 1) }
}

function getTokenDisplay(raw) {
  return parseToken(raw).hak
}

function getLexiconEntry(raw) {
  const { hak, overrideRom } = parseToken(raw)
  const entries = lexicon.value.get(hak) || []
  if (overrideRom) {
    const match = entries.find((e) => e.rom === overrideRom)
    if (match) return match
    return { hak, rom: overrideRom, zh: entries[0]?.zh || '', en: entries[0]?.en || '', unproofread: false }
  }
  return entries[0] || { hak, rom: '', zh: '', en: '', unproofread: false }
}

function getRom(raw) {
  return getLexiconEntry(raw).rom
}

function getMeaning(raw) {
  const e = getLexiconEntry(raw)
  return displayLang.value === 'en' ? (e.en || e.zh || '') : (e.zh || e.en || '')
}

function getDisplayText(item) {
  if (!item || typeof item !== 'object') return ''
  return displayLang.value === 'en'
    ? (item.en || item.zh || item.note || '')
    : (item.zh || item.en || item.note || '')
}

function blockTitle(type) {
  return blockTitles[type] || type
}

function countBlockItems(block) {
  if (block.type === 'vocab' || (block.type === 'main' && typeof block.items === 'string')) {
    return block.items.split(/\s+/).filter(Boolean).length
  }
  if (Array.isArray(block.items)) {
    return block.items.filter(item => typeof item === 'string' || (item && item.hak != null)).length
  }
  if (Array.isArray(block.rows)) {
    return block.rows.reduce((sum, row) => sum + row.length, 0)
  }
  return 0
}

function blockTimestampMismatch(lessonId, block, blockIndex) {
  const ts = getBlockTimestamps(lessonId, block, blockIndex)
  if (!ts) return false
  const expected = countBlockItems(block)
  return ts.length !== expected
}

function hasSpeakers(items) {
  return Array.isArray(items) && items.some((i) => i?.sp)
}

function formatHakka(text) {
  if (!text) return ''
  return String(text).replace(/\(([^)]+)\)/g, '<span class="anno">$1</span>')
}

function renderItermRuby(inner) {
  // If the content has CJK characters, render with ruby like vocab
  if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(inner)) {
    return '<span class="iterm">' + renderSentenceRuby(inner) + '</span>'
  }
  return '<span class="iterm">' + escapeHtml(inner) + '</span>'
}

function formatNoteText(text) {
  if (!text) return ''
  // Process {…} placeholders first on raw text, then annotations and bold
  let result = ''
  let rest = String(text)
  const re = /\{(.*?)\}/g
  let lastIdx = 0
  let m
  while ((m = re.exec(rest)) !== null) {
    // Process the text before this match through formatHakka
    result += formatHakka(rest.slice(lastIdx, m.index))
    result += renderItermRuby(m[1])
    lastIdx = re.lastIndex
  }
  result += formatHakka(rest.slice(lastIdx))
  // Support **bold**
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  return result
}

function renderWithRuby(text, rom) {
  if (!text) return ''
  if (!rom) return formatHakka(text)

  const segments = []
  let rest = String(text)
  const re = /\(([^)]+)\)/
  while (rest) {
    const m = re.exec(rest)
    if (!m) { segments.push({ t: 'text', v: rest }); break }
    if (m.index > 0) segments.push({ t: 'text', v: rest.slice(0, m.index) })
    segments.push({ t: 'anno', v: m[1] })
    rest = rest.slice(m.index + m[0].length)
  }

  const syls = rom.split(/[\s,]+/).filter(Boolean)
  let si = 0
  let out = ''

  for (const seg of segments) {
    if (seg.t === 'anno') {
      out += '<span class="anno">' + escapeHtml(seg.v) + '</span>'
    } else {
      for (const ch of seg.v) {
        if (/[\p{P}\p{S}\p{Z}\s]/u.test(ch)) {
          out += escapeHtml(ch)
        } else if (si < syls.length) {
          out += '<ruby>' + escapeHtml(ch) + '<rp>(</rp><rt>' + escapeHtml(numeralToDiacritic(syls[si])) + '</rt><rp>)</rp></ruby>'
          si++
        } else {
          out += escapeHtml(ch)
        }
      }
    }
  }
  return out
}

function renderTokenRuby(token) {
  const { hak } = parseToken(token)
  const entry = getLexiconEntry(token)
  if (hak === '__') {
    return entry.rom
      ? '<span class="drill-blank">' + escapeHtml(romToDiacritics(entry.rom)) + '</span>'
      : '___'
  }
  if (entry.rom) return renderWithRuby(hak, entry.rom)
  return '<span class="pending">' + escapeHtml(hak) + '</span>'
}

function renderTitleRuby(text) {
  if (!text) return ''
  const segments = []
  let rest = String(text)
  const re = /\(([^)]+)\)/
  while (rest) {
    const m = re.exec(rest)
    if (!m) { segments.push({ t: 'text', v: rest }); break }
    if (m.index > 0) segments.push({ t: 'text', v: rest.slice(0, m.index) })
    segments.push({ t: 'anno', v: m[1] })
    rest = rest.slice(m.index + m[0].length)
  }
  let out = ''
  for (const seg of segments) {
    if (seg.t === 'anno') {
      out += '<span class="anno">' + escapeHtml(seg.v) + '</span>'
    } else {
      // Greedy longest match for title characters
      let i = 0
      while (i < seg.v.length) {
        const ch = seg.v[i]
        if (/[\p{P}\p{S}\p{Z}\s]/u.test(ch)) {
          out += escapeHtml(ch)
          i++
          continue
        }
        let bestLen = 0
        let bestEntry = null
        const maxLen = Math.min(6, seg.v.length - i)
        for (let len = maxLen; len >= 1; len--) {
          const candidate = seg.v.slice(i, i + len)
          const entries = lexicon.value.get(candidate)
          if (entries && entries[0]?.rom) {
            bestLen = len
            bestEntry = entries[0]
            break
          }
        }
        if (bestEntry) {
          const word = seg.v.slice(i, i + bestLen)
          const roms = bestEntry.rom.split(/[\s,]+/).filter(Boolean)
          const meaning = displayLang.value === 'en'
            ? (bestEntry.en || bestEntry.zh || '')
            : (bestEntry.zh || bestEntry.en || '')
          const showMeaning = meaning && meaning !== word
          // Render each character with its rom syllable
          let si = 0
          out += '<span class="title-word">'
          for (const c of word) {
            if (si < roms.length) {
              out += '<ruby>' + escapeHtml(c) + '<rp>(</rp><rt>' + escapeHtml(numeralToDiacritic(roms[si])) + '</rt><rp>)</rp></ruby>'
              si++
            } else {
              out += escapeHtml(c)
            }
          }
          if (showMeaning) {
            out += '<span class="hero-gloss">' + escapeHtml(meaning) + '</span>'
          }
          out += '</span>'
          i += bestLen
        } else {
          out += escapeHtml(ch)
          i++
        }
      }
    }
  }
  return out
}

function formatPracticeItem(text) {
  if (!text) return ''
  // Split on " + " to get segments, then handle slash groups in each
  const segments = text.split(/ \+ /)
  const parts = segments.map(seg => {
    // Replace blanks first
    let s = seg.replace(/[…][.…]*/g, '\x00BLANK\x00').replace(/\.{3,}/g, '\x00BLANK\x00')
    // Check if this segment has slash-separated options
    if (s.includes('/')) {
      const options = s.split('/')
      if (options.length > 1) {
        const escaped = options.map(o => {
          let h = escapeHtml(o)
          h = h.replace(/\x00BLANK\x00/g, '<span class="sp-blank">&#x2009;</span>')
          return h
        })
        return '<span class="sp-brace-group">' +
          '<span class="sp-brace">{</span>' +
          '<span class="sp-options">' + escaped.map(o => '<span class="sp-option">' + o + '</span>').join('') + '</span>' +
          '<span class="sp-brace">}</span>' +
          '</span>'
      }
    }
    let h = escapeHtml(s)
    h = h.replace(/\x00BLANK\x00/g, '<span class="sp-blank">&#x2009;</span>')
    return h
  })
  return parts.join(' <span class="sp-plus">+</span> ')
}

function renderSentenceRuby(text) {
  if (!text) return ''
  // First check for an exact full-sentence entry
  const fullEntry = getLexiconEntry(text)
  if (fullEntry.rom) return renderWithRuby(text, fullEntry.rom)

  // Greedy longest-string match against lexicon
  const str = String(text)
  let out = ''
  let i = 0
  while (i < str.length) {
    const ch = str[i]
    // Skip punctuation/whitespace
    if (/[\p{P}\p{S}\p{Z}\s]/u.test(ch)) {
      out += escapeHtml(ch)
      i++
      continue
    }
    // Handle (annotation) spans
    if (ch === '(') {
      const close = str.indexOf(')', i)
      if (close !== -1) {
        out += '<span class="anno">' + escapeHtml(str.slice(i + 1, close)) + '</span>'
        i = close + 1
        continue
      }
    }
    // Try longest match from position i
    let bestLen = 0
    let bestEntry = null
    const maxLen = Math.min(6, str.length - i)
    for (let len = maxLen; len >= 1; len--) {
      const candidate = str.slice(i, i + len)
      const entries = lexicon.value.get(candidate)
      if (entries && entries[0]?.rom) {
        bestLen = len
        bestEntry = entries[0]
        break
      }
    }
    if (bestEntry) {
      out += renderWithRuby(str.slice(i, i + bestLen), bestEntry.rom)
      i += bestLen
    } else {
      out += escapeHtml(ch)
      i++
    }
  }
  return out
}

function getBlockAudio(lessonId, block, blockIndex) {
  if (block.type === 'notes') return null
  const blocks = currentLesson.value.blocks
  const sameType = []
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === block.type) sameType.push(i)
  }
  if (sameType.length > 1 && block.type === 'main') {
    const typeIdx = sameType.indexOf(blockIndex) + 1
    return baseUrl + 'audio/ch' + lessonId + '-main-' + typeIdx + '.m4a'
  }
  return baseUrl + 'audio/ch' + lessonId + '-' + block.type + '.m4a'
}

const audioLabel = computed(() => {
  if (!playingAudio.value) return ''
  const m = playingAudio.value.match(/ch(\d+)-([\w-]+)\.m4a$/)
  if (!m) return 'Audio'
  return 'Ch ' + m[1] + ' – ' + m[2].replace(/-/g, ' ')
})

function playAudio(src, startTime, endTime) {
  const el = audioEl.value
  if (!el) return
  stopAtTime = endTime || null
  if (el.src && el.src.endsWith(src) && !el.paused && !startTime) {
    el.pause()
    playingAudio.value = ''
    return
  }
  if (!el.src || !el.src.endsWith(src)) {
    el.src = src
  }
  if (startTime != null) el.currentTime = startTime
  el.play().catch(() => {})
  playingAudio.value = src
}

function stopAudio() {
  const el = audioEl.value
  if (!el) return
  el.pause()
  el.currentTime = 0
  playingAudio.value = ''
  stopAtTime = null
}

function replayAudio() {
  const el = audioEl.value
  if (!el) return
  el.currentTime = 0
  el.play().catch(() => {})
}

function onAudioPause() {
  const el = audioEl.value
  if (el && el.currentTime >= el.duration) {
    playingAudio.value = ''
    stopAtTime = null
  }
}

function onAudioTimeUpdate() {
  if (stopAtTime != null) {
    const el = audioEl.value
    if (el && el.currentTime >= stopAtTime) {
      el.pause()
      playingAudio.value = ''
      stopAtTime = null
    }
  }
}

function getBlockTimestamps(lessonId, block, blockIndex) {
  const src = getBlockAudio(lessonId, block, blockIndex)
  if (!src) return null
  const key = src.replace(/^.*\/audio\//, '').replace('.m4a', '')
  return timestamps.value[key] || null
}

function playBlockItem(lessonId, block, blockIndex, itemIndex) {
  const src = getBlockAudio(lessonId, block, blockIndex)
  if (!src) return
  const ts = getBlockTimestamps(lessonId, block, blockIndex)
  if (ts && ts[itemIndex]) {
    playAudio(src, ts[itemIndex][0], ts[itemIndex][1])
  } else {
    playAudio(src)
  }
}

function playTokenAudio(block, blockIndex, tokenIndex) {
  if (!currentLesson.value) return
  playBlockItem(currentLesson.value.id, block, blockIndex, tokenIndex)
}

function selectLesson(id) {
  router.push({ name: 'chapter', params: { id } })
  sidebarOpen.value = false
}

function navigateTo(p) {
  if (p === 'textbook') {
    const id = currentLessonId.value || lessons.value[0]?.id || 1
    router.push({ name: 'chapter', params: { id } })
  } else {
    router.push({ name: p })
  }
  sidebarOpen.value = false
}

watch(heroEl, (el) => {
  if (heroObserver) heroObserver.disconnect()
  if (!el) { heroVisible.value = true; return }
  heroObserver = new IntersectionObserver(
    ([entry]) => { heroVisible.value = entry.isIntersecting },
    { threshold: 0 }
  )
  heroObserver.observe(el)
})

onUnmounted(() => {
  if (heroObserver) heroObserver.disconnect()
})

onMounted(async () => {
  try {
    const [lr, cr, tr] = await Promise.all([
      fetch(baseUrl + 'lessons.json'),
      fetch(baseUrl + 'lexicon.csv'),
      fetch(baseUrl + 'timestamps.json').catch(() => null)
    ])
    if (!lr.ok || !cr.ok) throw new Error('Failed to load assets.')

    const lessonsData = await lr.json()
    const csvText = await cr.text()
    if (tr && tr.ok) timestamps.value = await tr.json()
    const map = new Map()
    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/)

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const [hak, rom, zh, en, unproofread] = parseCsvLine(line)
      if (!hak) continue
      if (!map.has(hak)) map.set(hak, [])
      map.get(hak).push({ hak, rom: rom || '', zh: zh || '', en: en || '', unproofread: unproofread === '1' })
    }

    lessons.value = lessonsData
    lexicon.value = map
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* ── Site nav ── */
.site-banner {
  background: #fef3cd;
  color: #664d03;
  text-align: center;
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  font-family: var(--font-body);
  line-height: 1.4;
}
.site-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  height: 2.6rem;
  padding: 0 0.8rem;
  background: var(--color-green);
  color: #fff;
  gap: 0;
}
.site-brand {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin-right: 1rem;
  cursor: pointer;
  white-space: nowrap;
}
.site-links {
  display: flex;
  gap: 0;
}
.site-link {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  padding: 0.4rem 0.65rem;
  font-size: 0.88rem;
  transition: color 150ms;
}
.site-link:hover,
.site-link.active {
  color: #fff;
}
.lang-toggle {
  margin-left: auto;
  display: flex;
  gap: 2px;
}
.lang-btn {
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 0.25rem 0.45rem;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.lang-btn.active {
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
}

/* ── Loading / empty ── */
.loading-state {
  display: grid;
  place-items: center;
  min-height: 60vh;
  color: var(--color-muted);
}

/* ── Layout ── */
.app-shell {
  display: grid;
  grid-template-columns: 15rem 1fr;
  min-height: calc(100vh - 2.6rem);
}

/* ── Sidebar ── */
.sidebar {
  position: sticky;
  top: 2.6rem;
  height: calc(100vh - 2.6rem);
  overflow-y: auto;
  padding: 0.6rem;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  z-index: 20;
}
.lesson-nav {
  display: grid;
  gap: 0.3rem;
}
.lesson-link {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.55rem;
  border: 1px solid transparent;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.95rem;
  transition: border-color 150ms, background 150ms;
}
.lesson-link:hover,
.lesson-link.active {
  border-color: var(--color-border-strong);
  background: var(--color-surface-soft);
}
.lesson-link.active {
  border-left: 3px solid var(--color-green);
}
.lesson-num {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-green);
  min-width: 1.1rem;
}
.lesson-label {
  line-height: 1.35;
}

.scrim {
  display: none;
}

/* ── Topbar ── */
.main-stage {
  min-width: 0;
}
.topbar {
  position: sticky;
  top: 2.6rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  transition: transform 200ms ease, opacity 200ms ease;
}
.topbar.hidden {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}
.menu-btn {
  display: none;
  background: none;
  border: 1px solid var(--color-border-strong);
  padding: 0.3rem 0.55rem;
  cursor: pointer;
  font-size: 1rem;
}
.topbar-center h2 {
  margin: 0;
  font-size: clamp(1rem, 1.6vw, 1.3rem);
  color: var(--color-text);
}
.topbar-en {
  font-size: 0.72rem;
  color: var(--color-muted);
}
.topbar-kicker {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.62rem;
  color: var(--color-green);
  margin-bottom: 0.1rem;
}

/* ── Content ── */
.content {
  padding: 1rem;
  max-width: 52rem;
}

/* ── Hero ── */
.hero {
  padding: 1.2rem;
  margin-bottom: 1rem;
  background: radial-gradient(circle at top right, rgba(24, 60, 50, 0.08), transparent 14rem), var(--color-surface);
}
.hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4vw, 3.2rem);
  line-height: 1.7;
  color: var(--color-green);
}
.hero-sub {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--color-border-strong);
  letter-spacing: 0.02em;
}
:deep(.hero-gloss) {
  display: block;
  font-size: 0.3em;
  color: var(--color-border-strong);
  font-family: var(--font-body);
  font-weight: 300;
  line-height: 1.3;
  margin-top: -0.2em;
  text-align: center;
}
:deep(.title-word) {
  display: inline-block;
  text-align: center;
  vertical-align: top;
}
.kicker {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.72rem;
  color: var(--color-green);
  margin-bottom: 0.35rem;
}

/* ── Audio button ── */
.audio-btn {
  background: none;
  border: 1px solid var(--color-border-strong);
  color: var(--color-green);
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 150ms, color 150ms;
  margin-top: 0.4rem;
}
.audio-btn:hover {
  background: var(--color-green);
  color: #fff;
}
.block-play-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  padding: 0.15rem 0.4rem;
  font-size: 0.7rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 150ms, color 150ms;
}
.block-play-btn:hover {
  opacity: 1;
  color: var(--color-green);
}

/* ── Blocks ── */
.blocks {
  display: grid;
  gap: 0.8rem;
}
.block {
  padding: 0.9rem 0;
}
.block + .block {
  border-top: 1px solid var(--color-border);
}
.block-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
  padding-left: 0.6rem;
  border-left: 3px solid var(--color-green);
}
.block-hd-text {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.ts-warn {
  font-size: 1.3rem;
  cursor: help;
}
.block-type {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--color-green);
  font-weight: 600;
}
.block-type-en {
  font-size: 0.68rem;
  color: var(--color-muted);
  letter-spacing: 0.02em;
}
.block-desc {
  margin-bottom: 0.6rem;
}
.block-desc p {
  margin: 0;
}
.desc-copy {
  color: var(--color-muted);
  font-size: 0.88rem;
  margin-top: 0.15rem;
}

/* ── Vocab grid ── */
.vocab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.45rem;
}
.vocab-sm {
  grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
}
.vocab-card {
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-soft);
  text-align: center;
  cursor: pointer;
  transition: background 120ms;
}
.vocab-card:hover {
  background: rgba(24, 60, 50, 0.06);
}
.vocab-card.sm {
  padding: 0.25rem 0.35rem;
}
.vocab-hak {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  line-height: 1.8;
  color: var(--color-text);
}
.vocab-card.sm .vocab-hak {
  font-size: 1.85rem;
  font-weight: 400;
}
.vocab-mean {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--color-muted);
  line-height: 1.4;
}

/* ── Dialogue ── */
.dialogue {
  display: grid;
  gap: 0.4rem;
}
.dia-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem;
  padding: 0.2rem 0;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background 120ms;
}
.dia-row:hover {
  background: var(--color-surface-soft);
}
.dia-row:last-child {
  border-bottom: none;
}
.dia-sp {
  min-width: 1.8rem;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--color-border-strong);
  color: var(--color-green);
  background: var(--color-surface-soft);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  align-self: start;
}
.dia-body p {
  margin: 0;
}
.dia-hak {
  font-size: 1.45rem;
  line-height: 1.8;
  color: var(--color-text);
}
.dia-tr {
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-top: 0.1rem;
}

/* ── Sentence list ── */
.sent-list {
  display: grid;
  gap: 0.5rem;
}
.sent-row {
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  transition: background 120ms;
}
.sent-row:hover {
  background: var(--color-surface-soft);
}
.sent-row p {
  margin: 0;
}
.sent-hak {
  font-size: 1.45rem;
  line-height: 1.8;
  color: var(--color-text);
}
.sent-tr {
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-top: 0.1rem;
}
.sent-note {
  font-size: 0.78rem;
  color: var(--color-muted);
  font-style: italic;
  margin-top: 0.2rem;
}

/* ── Practice prompt list ── */
.prompt-list {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.4rem;
  font-size: 1.05rem;
  color: var(--color-muted);
  line-height: 1.5;
}

/* ── Practice drill table ── */
.table-wrap {
  overflow-x: auto;
}
.drill-table {
  width: 100%;
  border-collapse: collapse;
}
.drill-table td {
  min-width: 5.5rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  vertical-align: top;
  background: var(--color-surface-soft);
  font-size: 1.85rem;
  line-height: 1.8;
}

/* ── Notes ── */
.notes {
  display: grid;
  gap: 0.5rem;
}
.note-item {
  padding: 0.55rem 0.7rem;
  font-size: 1.05rem;
  color: var(--color-muted);
  line-height: 1.65;
}
.note-item + .note-item {
  border-top: 1px solid var(--color-border);
}
.note-item p {
  margin: 0;
}
.fallback {
  color: var(--color-crimson);
}

/* ── Ruby ── */
:deep(ruby) {
  ruby-position: over;
}
:deep(ruby rt) {
  font-size: 0.5em;
  font-family: var(--font-body);
  color: var(--color-crimson);
  font-weight: 400;
  line-height: 1;
}
:deep(.pending) {
  color: var(--color-crimson);
  text-decoration: underline dotted;
  text-underline-offset: 0.15rem;
}
:deep(.drill-blank) {
  font-family: var(--font-mono);
  color: var(--color-green);
  font-size: 0.85em;
}
:deep(.anno) {
  margin-left: 0.08rem;
  font-size: 0.55em;
  vertical-align: super;
  color: var(--color-crimson);
  font-family: var(--font-body);
}
:deep(.iterm) {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.8;
  color: var(--color-text);
  padding: 0.1rem 0.3rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-soft);
  vertical-align: middle;
  text-align: center;
  margin: 0 0.15rem;
}

/* ── Sentence practice ── */
.sp-list {
  list-style: none;
  counter-reset: sp-counter;
  padding-left: 0;
  margin: 0;
}
.sp-item {
  counter-increment: sp-counter;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.05rem;
  line-height: 1.6;
  padding: 0.35rem 0.5rem;
  color: var(--color-text);
}
.sp-item::before {
  content: counter(sp-counter) '.';
  color: var(--color-muted);
  font-size: 0.82rem;
  min-width: 1.5em;
  flex-shrink: 0;
}
.sp-item:nth-child(odd) {
  background: var(--color-surface-soft);
}
:deep(.sp-brace-group) {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
:deep(.sp-brace) {
  font-size: 1.6em;
  font-weight: 200;
  color: var(--color-muted);
  line-height: 1;
  padding: 0 0.05em;
}
:deep(.sp-options) {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  padding: 0.1em 0.15em;
  line-height: 1.35;
}
:deep(.sp-option) {
  white-space: nowrap;
}
:deep(.sp-plus) {
  display: inline-block;
  color: var(--color-green);
  font-weight: 700;
  margin: 0 0.15em;
}
:deep(.sp-blank) {
  display: inline-block;
  width: 3em;
  height: 1.1em;
  border-bottom: 1.5px solid var(--color-border-strong);
  vertical-align: bottom;
  margin: 0 0.1em;
}

/* ── Audio bar ── */
.audio-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  background: #111;
  color: #fff;
  font-size: 0.82rem;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
}
.audio-bar-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.audio-bar-btn {
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: #fff;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 120ms;
}
.audio-bar-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.audio-bar-btn.primary {
  background: var(--color-crimson);
  width: 2.6rem;
  height: 2.6rem;
  font-size: 1.1rem;
}
.audio-bar-btn.primary:hover {
  background: #a52230;
}

/* ── Footer ── */
.lesson-foot {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-top: 1rem;
}
.spacer {
  flex: 1;
}
.foot-btn {
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-green);
  padding: 0.45rem 0.8rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.foot-btn:hover {
  background: var(--color-green);
  color: #fff;
}

/* ── Static pages ── */
.static-page {
  max-width: 42rem;
  margin: 0 auto;
  padding: 2rem 1.2rem;
}
.static-page h1 {
  font-family: var(--font-display);
  color: var(--color-green);
  margin: 0 0 1rem;
}

/* ── Mobile ── */
@media (max-width: 860px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    top: 2.6rem;
    left: 0;
    width: min(18rem, 80vw);
    height: calc(100vh - 2.6rem);
    transform: translateX(-100%);
    transition: transform 200ms ease;
    box-shadow: 0.5rem 0 2rem rgba(0, 0, 0, 0.1);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .scrim {
    display: block;
    position: fixed;
    inset: 2.6rem 0 0;
    border: 0;
    background: rgba(17, 17, 17, 0.2);
    opacity: 0;
    pointer-events: none;
    z-index: 15;
    transition: opacity 200ms;
  }
  .scrim.visible {
    opacity: 1;
    pointer-events: auto;
  }
  .menu-btn {
    display: block;
  }
  .topbar {
    top: 2.6rem;
  }
  .site-brand {
    font-size: 0.85rem;
    margin-right: 0.4rem;
  }
  .site-link {
    font-size: 0.72rem;
    padding: 0.3rem 0.4rem;
  }
  .dia-row {
    grid-template-columns: auto 1fr;
  }
  .vocab-grid {
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  }
}
</style>
