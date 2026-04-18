<template>
  <nav ref="navEl" class="site-nav">
    <button type="button" class="menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
    <span class="site-brand" @click="navigateTo('textbook')">香港客家話入門</span>
    <div class="site-links">
      <button type="button" :class="['site-link', { active: page === 'textbook' }]" @click="navigateTo('textbook')">課本 Textbook</button>
      <button type="button" :class="['site-link', { active: page === 'about' }]" @click="navigateTo('about')">關於計劃 About the Project</button>
    </div>
    <div class="nav-controls">
      <div class="control-group">
        <button type="button" :class="['ctl-btn', { active: displayLang === 'zh' }]" @click="displayLang = 'zh'">中</button>
        <button type="button" :class="['ctl-btn', { active: displayLang === 'en' }]" @click="displayLang = 'en'">EN</button>
      </div>
      <div class="control-group">
        <button type="button" :class="['ctl-btn', { active: romMode === 'ruby' }]" @click="romMode = 'ruby'">Ruby</button>
        <button type="button" :class="['ctl-btn', { active: romMode === 'bracket' }]" @click="romMode = 'bracket'">[Rom]</button>
      </div>
      <button type="button" :class="['ctl-btn ctl-slides', { active: slidesMode }]" @click="slidesMode = !slidesMode">Slides</button>
    </div>
  </nav>

  <div v-if="page === 'textbook' && loading" class="loading-state">
    <p>Loading textbook…</p>
  </div>

  <div v-else-if="page === 'textbook' && currentLesson" class="app-shell" :class="{ 'slides-active': slidesMode }">
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
          <div class="lesson-titles">
            <span class="lesson-label font-hakka" v-html="formatHakka(lesson.title.hak)"></span>
            <span class="lesson-label-en">{{ lesson.title.en }}</span>
          </div>
        </button>
      </nav>
    </aside>

    <button type="button" :class="['scrim', { visible: sidebarOpen }]" @click="sidebarOpen = false"></button>

    <main class="main-stage">
      <header class="topbar" :class="{ hidden: heroVisible }">
        <button v-if="currentIndex > 0" type="button" class="topbar-nav" @click="selectLesson(lessons[currentIndex - 1].id)">‹</button>
        <span class="topbar-lesson">{{ currentLesson.id }}</span>
        <span class="topbar-title font-hakka" v-html="formatHakka(currentLesson.title.hak)"></span>
        <button v-if="currentIndex < lessons.length - 1" type="button" class="topbar-nav topbar-nav-next" @click="selectLesson(lessons[currentIndex + 1].id)">›</button>
      </header>

      <div class="content" :class="{ 'slides-mode': slidesMode }">
        <section ref="heroEl" class="hero" v-show="!slidesMode || currentSlide === 0" @click="audioSegmentText = ''; playAudio(baseUrl + `data/audio/ch${currentLesson.id}-title.m4a`)">
          <span class="kicker">第 {{ currentLesson.id }} 課 · Lesson {{ currentLesson.id }}</span>
          <h1 class="font-hakka" v-html="renderTitleRuby(currentLesson.title.hak)"></h1>
          <p class="hero-sub">{{ currentLesson.title.en }}</p>
        </section>

        <section class="blocks">
          <article
            v-for="(block, bi) in currentLesson.blocks"
            :key="`${currentLesson.id}-${bi}`"
            class="block"
            v-show="!slidesMode || slideBlockVisible(bi)"
          >
            <header class="block-hd">
              <div class="block-hd-text">
                <span class="block-type">{{ blockTitle(block.type) }}</span>
                <span class="block-type-en">{{ (blockTitlesEn[block.type]) || '' }}</span>
                <button
                  v-if="getBlockAudio(currentLesson.id, block, bi)"
                  type="button"
                  class="block-play-btn"
                  @click="audioSegmentText = ''; playAudio(getBlockAudio(currentLesson.id, block, bi))"
                >▶</button>

              </div>
            </header>

            <div v-if="block.description" class="block-desc">
              <p v-if="block.description.hak" class="font-hakka" v-html="formatHakka(block.description.hak)"></p>
              <p v-if="block.description.en" class="desc-copy">{{ block.description.en }}</p>
            </div>

            <div v-if="block.type === 'vocab'" class="vocab-grid">
              <div v-for="(token, ti) in tokenize(block.items)" :key="token" class="vocab-card" v-show="!slidesMode || slideItemVisible(bi, ti)" @click="playTokenAudio(block, bi, ti)">
                <p class="vocab-hak font-hakka" v-html="renderTokenRuby(token)"></p>
                <p class="vocab-mean">{{ getMeaning(token) || '—' }}</p>
              </div>
            </div>

            <div v-else-if="block.type === 'main' && typeof block.items === 'string'" class="vocab-grid vocab-sm">
              <div v-for="(token, ti) in tokenize(block.items)" :key="token" class="vocab-card sm" v-show="!slidesMode || slideItemVisible(bi, ti)" @click="playTokenAudio(block, bi, ti)">
                <p class="vocab-hak font-hakka" v-html="renderTokenRuby(token)"></p>
              </div>
            </div>

            <div v-else-if="block.type === 'main' && hasSpeakers(block.items)" class="dialogue">
              <div
                v-for="(item, ii) in block.items"
                :key="ii"
                :class="['dia-bubble', { 'dia-right': item.sp === 'B' }]"
                v-show="!slidesMode || slideItemVisible(bi, ii)"
                @click="playBlockItem(currentLesson.id, block, bi, ii)"
              >
                <img v-if="speakerInfo(item.sp)" class="dia-avatar" :src="baseUrl + speakerInfo(item.sp).avatar" :alt="item.sp">
                <span v-else class="dia-sp">{{ item.sp || '例' }}</span>
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
                v-show="!slidesMode || slideItemVisible(bi, ii)"
                @click="playBlockItem(currentLesson.id, block, bi, ii)"
              >
                <p class="sent-hak font-hakka" v-html="renderSentenceRuby(item.hak)"></p>
                <p v-if="getDisplayText(item)" class="sent-tr">{{ getDisplayText(item) }}</p>
              </div>
            </div>

            <template v-else-if="block.type === 'practice' && Array.isArray(block.items)">
              <ol class="prompt-list">
                <li v-for="(item, ii) in block.items" :key="ii" v-show="!slidesMode || slideItemVisible(bi, ii)">
                  <button v-if="getBlockTimestamps(currentLesson.id, block, bi)" type="button" class="row-play-btn" @click.stop="playBlockItem(currentLesson.id, block, bi, ii)">▶</button>
                  <span v-html="formatNoteText(item)"></span>
                </li>
              </ol>
            </template>

            <div v-else-if="block.type === 'practice' && Array.isArray(block.rows)" class="drill-rows">
              <div v-for="(row, ri) in block.rows" :key="ri" class="drill-row-wrap" v-show="!slidesMode || slideItemVisible(bi, ri)">
                <button v-if="getBlockTimestamps(currentLesson.id, block, bi)" type="button" class="row-play-btn" @click.stop="playBlockItem(currentLesson.id, block, bi, ri)">▶</button>
                <div class="vocab-grid">
                  <div v-for="(cell, ci) in row" :key="ci" class="vocab-card sm">
                    <p class="vocab-hak font-hakka" v-html="renderTokenRuby(cell)"></p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="block.type === 'idiom' || block.type === 'nursery'" class="sent-list">
              <div v-for="(item, ii) in block.items" :key="ii" class="sent-row">
                <div class="sent-hak-row">
                  <button v-if="getBlockTimestamps(currentLesson.id, block, bi)" type="button" class="row-play-btn" @click.stop="playBlockItem(currentLesson.id, block, bi, ii)">▶</button>
                  <p class="sent-hak font-hakka" v-html="renderSentenceRuby(item.hak)"></p>
                </div>
                <p v-if="getDisplayText(item)" class="sent-tr">{{ getDisplayText(item) }}</p>
                <p v-if="item.note" class="sent-note">{{ item.note }}</p>
              </div>
            </div>

            <div v-else-if="block.type === 'notes'" class="notes">
              <div v-for="(item, ii) in block.items" :key="ii" class="note-item">
                <p v-html="formatNoteText(getDisplayText(item))"></p>
              </div>
            </div>

            <template v-else-if="block.type === 'sentence_practice' || block.type === 'sentences'">
              <ol class="sp-list">
                <li v-for="(item, ii) in block.items" :key="ii" class="sp-item" v-show="!slidesMode || slideItemVisible(bi, ii)" v-html="formatPracticeItem(item)"></li>
              </ol>
            </template>

            <div v-else class="note-item fallback">
              <p>Unsupported block: {{ block.type }}</p>
            </div>
          </article>
        </section>

        <div v-if="slidesMode && slidePages.length > 1" class="slide-nav-global">
          <button type="button" class="slide-nav-btn" :disabled="currentSlide <= 0" @click="currentSlide--">‹</button>
          <span class="slide-nav-count">{{ currentSlide + 1 }} / {{ slidePages.length }}</span>
          <button type="button" class="slide-nav-btn" :disabled="currentSlide >= slidePages.length - 1" @click="currentSlide++">›</button>
        </div>

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

  <div v-else-if="page === 'about' && aboutPage" class="static-page">
    <h1>{{ aboutPage.title.zh }} {{ aboutPage.title.en }}</h1>
    <template v-for="(section, si) in aboutPage.sections" :key="si">
      <h2>{{ section.heading.zh }} {{ section.heading.en }}</h2>
      <div v-for="(item, ii) in section.items" :key="ii" class="about-item">
        <p v-if="item.url"><a :href="item.url" target="_blank" rel="noopener noreferrer">{{ displayLang === 'en' ? item.label.en : item.label.zh }}</a></p>
        <p v-else-if="item.label"><strong>{{ displayLang === 'en' ? item.label.en : item.label.zh }}:</strong> {{ item.text || '' }}</p>
        <p v-if="item.zh && !item.label">{{ displayLang === 'en' ? (item.en || item.zh) : item.zh }}</p>
        <p v-if="item.zh && item.label">{{ displayLang === 'en' ? (item.en || item.zh) : item.zh }}</p>
      </div>
    </template>
  </div>

  <div v-if="audioBarVisible" class="audio-bar">
    <div class="audio-bar-progress" @click="seekAudio($event)">
      <div class="audio-bar-progress-fill" :style="{ width: audioDuration ? (audioCurrentTime / audioDuration * 100) + '%' : '0%' }"></div>
    </div>
    <button type="button" class="audio-bar-btn" @click="togglePlayPause">{{ playingAudio ? '⏸' : '▶' }}</button>
    <div class="audio-bar-info">
      <span class="audio-bar-label">{{ audioLabel }}</span>
      <span v-if="audioSegmentText" class="audio-bar-segment font-hakka">{{ audioSegmentText }}</span>
      <span v-else class="audio-bar-sub">{{ playingAudio ? 'Now Playing' : 'Paused' }}</span>
    </div>
    <span class="audio-bar-time">{{ formatTime(audioCurrentTime) }} / {{ formatTime(audioDuration) }}</span>
    <button type="button" class="audio-bar-btn" @click="replayAudio">⟲</button>
    <button type="button" class="audio-bar-btn close" @click="closeAudioBar">✕</button>
  </div>

  <div class="site-banner">⚠️ This site is under construction. Some content, audio, and features may be incomplete or inaccurate.</div>

  <audio ref="audioEl" @ended="playingAudio = ''; audioSegmentText = ''" @pause="onAudioPause" @timeupdate="onAudioTimeUpdate"></audio>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const baseUrl = import.meta.env.BASE_URL

const loading = ref(true)
const lessons = ref([])
const lessonCache = ref({})
const lexicon = ref(new Map())
const site = ref({})
const displayLang = ref(route.query.lang === 'en' ? 'en' : 'zh')
const romMode = ref(route.query.rom === 'bracket' ? 'bracket' : 'ruby')
const slidesMode = ref(false)
const currentSlide = ref(0)
let savedRomMode = null
const sidebarOpen = ref(false)
const audioEl = ref(null)
const playingAudio = ref('')
const audioBarVisible = ref(false)
const audioSegmentText = ref('')
const audioCurrentTime = ref(0)
const audioDuration = ref(0)
let stopAtTime = null
const heroEl = ref(null)
const heroVisible = ref(true)
let heroObserver = null
const navEl = ref(null)
let navResizeObserver = null

const page = computed(() => {
  if (route.name === 'about') return 'about'
  if (route.name === 'acknowledgement') return 'acknowledgement'
  return 'textbook'
})

const currentLessonId = computed(() => {
  if (route.name === 'chapter' && route.params.id) return parseInt(route.params.id)
  return null
})

const blockTitlesEn = computed(() => {
  const bt = site.value.blockTypes || {}
  const out = {}
  for (const [k, v] of Object.entries(bt)) out[k] = v.en || ''
  return out
})

const blockTitles = computed(() => {
  const bt = site.value.blockTypes || {}
  const out = {}
  for (const [k, v] of Object.entries(bt)) out[k] = v.zh || ''
  return out
})

const currentLesson = computed(() => {
  const id = currentLessonId.value
  if (id == null) return null
  return lessonCache.value[id] || null
})
const currentIndex = computed(() =>
  lessons.value.findIndex((l) => l.id === currentLessonId.value)
)

function speakerInfo(sp) {
  const speakers = site.value.speakers || {}
  return speakers[sp] || null
}

const aboutPage = computed(() => site.value.pages?.about || null)

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Numerical tone → diacritic conversion
const TONE_DIACRITICS = " \u0301\u0304\u0306\u0300\u0306\u0300" // index 1–6

function numeralToDiacritic(pron) {
  if (!pron) return pron
  return pron.replace(/(\D*[aeo]|\D*[iu](?!\d)|\D*[iumn])(\D*)(\d)/g,
    (_, $1, $2, $3) => $1 + TONE_DIACRITICS[+$3] + $2
  ).normalize('NFC')
}

function romToDiacritics(rom) {
  if (!rom) return ''
  return numeralToDiacritic(rom)
}

/* Wrap n/N + combining diacritics in a <span> so CSS can fix vertical positioning */
function fixNDiac(html) {
  return html.replace(/([nN])([\u0300-\u036f]+)/g, '<span class="diac-n">$1$2</span>')
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
  return blockTitles.value[type] || type
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
  // Support `code` as crimson inline
  result = result.replace(/`(.*?)`/g, '<span class="note-rom">$1</span>')
  return result
}

function renderWithRuby(text, rom) {
  if (!text) return ''
  if (!rom) return formatHakka(text)

  if (romMode.value === 'bracket') {
    return escapeHtml(text) + '<span class="rom-bracket">[' + escapeHtml(romToDiacritics(rom)) + ']</span>'
  }

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
          out += '<span class="ruby"><span class="rb">' + escapeHtml(ch) + '</span><span class="rt">' + escapeHtml(numeralToDiacritic(syls[si])) + '</span></span>'
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
  if (romMode.value === 'bracket') return renderSentenceRuby(text)
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
              out += '<span class="ruby"><span class="rb">' + escapeHtml(c) + '</span><span class="rt">' + escapeHtml(numeralToDiacritic(roms[si])) + '</span></span>'
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
  if (!block.audio) return null
  return baseUrl + 'data/' + block.audio
}

const audioLabel = computed(() => {
  if (!playingAudio.value) return ''
  const m = playingAudio.value.match(/ch(\d+)-([\w-]+)\.m4a$/)
  if (!m) return 'Audio'
  const chNum = m[1]
  const section = m[2].replace(/-/g, ' ')
  const lesson = lessons.value.find(l => String(l.id) === chNum)
  const sectionLabel = blockTitlesEn.value[section] || section.charAt(0).toUpperCase() + section.slice(1)
  if (lesson) {
    return '第 ' + chNum + ' 課 · ' + sectionLabel
  }
  return 'Ch ' + chNum + ' · ' + sectionLabel
})

function playAudio(src, startTime, endTime) {
  const el = audioEl.value
  if (!el) return
  stopAtTime = endTime || null
  if (el.src && el.src.endsWith(src) && !el.paused && !startTime) {
    el.pause()
    return
  }
  if (!el.src || !el.src.endsWith(src)) {
    el.src = src
  }
  if (startTime != null) el.currentTime = startTime
  el.play().catch(() => {})
  playingAudio.value = src
  audioBarVisible.value = true
}

function togglePlayPause() {
  const el = audioEl.value
  if (!el || !el.src) return
  if (el.paused) {
    el.play().catch(() => {})
    playingAudio.value = el.src
  } else {
    el.pause()
  }
}

function closeAudioBar() {
  const el = audioEl.value
  if (el) { el.pause(); el.currentTime = 0 }
  playingAudio.value = ''
  audioBarVisible.value = false
  audioSegmentText.value = ''
  stopAtTime = null
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
    audioSegmentText.value = ''
  }
}

function onAudioTimeUpdate() {
  const el = audioEl.value
  if (el) {
    audioCurrentTime.value = el.currentTime
    audioDuration.value = el.duration || 0
  }
  if (stopAtTime != null) {
    if (el && el.currentTime >= stopAtTime) {
      el.pause()
      playingAudio.value = ''
      stopAtTime = null
    }
  }
}

function formatTime(s) {
  if (!s || !isFinite(s)) return '0:00.000'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 1000)
  return m + ':' + (sec < 10 ? '0' : '') + sec + '.' + String(ms).padStart(3, '0')
}

function seekAudio(e) {
  const el = audioEl.value
  if (!el || !el.duration) return
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  el.currentTime = ratio * el.duration
}

function getBlockTimestamps(lessonId, block, blockIndex) {
  return block.timestamps || null
}

function getSegmentText(block, itemIndex) {
  if (block.type === 'vocab' || (block.type === 'main' && typeof block.items === 'string')) {
    const tokens = block.items.split(/\s+/).filter(Boolean)
    return tokens[itemIndex] || ''
  }
  if (block.type === 'practice' && Array.isArray(block.rows)) {
    const row = block.rows[itemIndex]
    return row ? row.join(' ') : ''
  }
  if (Array.isArray(block.items)) {
    const item = block.items[itemIndex]
    if (!item) return ''
    if (typeof item === 'string') return item
    return item.hak || ''
  }
  return ''
}

function playBlockItem(lessonId, block, blockIndex, itemIndex) {
  const src = getBlockAudio(lessonId, block, blockIndex)
  if (!src) return
  audioSegmentText.value = getSegmentText(block, itemIndex)
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
  currentSlide.value = 0
}

const slidePages = computed(() => {
  if (!currentLesson.value) return []
  const pages = [{ type: 'hero', bi: -1, from: 0, to: 0 }]
  currentLesson.value.blocks.forEach((block, bi) => {
    if (block.type === 'vocab' || (block.type === 'main' && typeof block.items === 'string')) {
      const tokens = tokenize(block.items)
      for (let i = 0; i < tokens.length; i += 4) {
        pages.push({ bi, from: i, to: Math.min(i + 4, tokens.length) })
      }
    } else if (block.type === 'main' && Array.isArray(block.items)) {
      block.items.forEach((_, ii) => pages.push({ bi, from: ii, to: ii + 1 }))
    } else if (block.type === 'practice' && Array.isArray(block.rows)) {
      block.rows.forEach((_, ri) => pages.push({ bi, from: ri, to: ri + 1 }))
    } else if (block.type === 'practice' && Array.isArray(block.items)) {
      block.items.forEach((_, ii) => pages.push({ bi, from: ii, to: ii + 1 }))
    } else if (block.type === 'sentence_practice' || block.type === 'sentences') {
      const items = block.items || []
      for (let i = 0; i < items.length; i += 4) {
        pages.push({ bi, from: i, to: Math.min(i + 4, items.length) })
      }
    } else {
      pages.push({ bi, from: 0, to: (block.items?.length || 1) })
    }
  })
  return pages
})

function curPage() {
  return slidePages.value[currentSlide.value] || null
}
function slideBlockVisible(bi) {
  if (!slidesMode.value) return true
  const pg = curPage()
  return pg && pg.bi === bi
}
function slideItemVisible(bi, ii) {
  if (!slidesMode.value) return true
  const pg = curPage()
  return pg && pg.bi === bi && ii >= pg.from && ii < pg.to
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

watch([displayLang, romMode], ([lang, rom]) => {
  const q = { ...route.query }
  if (lang === 'zh') delete q.lang; else q.lang = lang
  if (rom === 'ruby') delete q.rom; else q.rom = rom
  router.replace({ ...route, query: q })
})

watch(() => route.query, (q) => {
  if (q.lang && q.lang !== displayLang.value) displayLang.value = q.lang === 'en' ? 'en' : 'zh'
  if (q.rom && q.rom !== romMode.value) romMode.value = q.rom === 'bracket' ? 'bracket' : 'ruby'
})

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
  if (navResizeObserver) navResizeObserver.disconnect()
  document.removeEventListener('keydown', onSlideKeydown)
})

function onSlideKeydown(e) {
  if (!slidesMode.value || !currentLesson.value) return
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  const total = slidePages.value.length
  if (e.key === 'ArrowRight' && currentSlide.value < total - 1) currentSlide.value++
  if (e.key === 'ArrowLeft' && currentSlide.value > 0) currentSlide.value--
}

watch(slidesMode, (on) => {
  if (on) {
    savedRomMode = romMode.value
    romMode.value = 'bracket'
    document.addEventListener('keydown', onSlideKeydown)
  } else {
    if (savedRomMode) romMode.value = savedRomMode
    savedRomMode = null
    document.removeEventListener('keydown', onSlideKeydown)
  }
})

async function loadLesson(id) {
  if (lessonCache.value[id]) return lessonCache.value[id]
  const entry = lessons.value.find(l => l.id === id)
  if (!entry) return null
  const res = await fetch(baseUrl + 'data/' + entry.file)
  if (!res.ok) return null
  const data = await res.json()
  lessonCache.value = { ...lessonCache.value, [id]: data }
  return data
}

watch(currentLessonId, async (id) => {
  if (id != null && !lessonCache.value[id]) {
    await loadLesson(id)
  }
})

onMounted(async () => {
  try {
    const [ir, cr, sr] = await Promise.all([
      fetch(baseUrl + 'data/index.json'),
      fetch(baseUrl + 'lexicon.csv'),
      fetch(baseUrl + 'data/site.json'),
    ])
    if (!ir.ok || !cr.ok || !sr.ok) throw new Error('Failed to load assets.')

    const indexData = await ir.json()
    const csvText = await cr.text()
    const siteData = await sr.json()
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

    lessons.value = indexData
    lexicon.value = map
    site.value = siteData

    // Preload all lessons in parallel
    await Promise.all(indexData.map(entry => loadLesson(entry.id)))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }

  if (navEl.value) {
    const updateNavH = () => {
      document.documentElement.style.setProperty('--nav-h', navEl.value.offsetHeight + 'px')
    }
    navResizeObserver = new ResizeObserver(updateNavH)
    navResizeObserver.observe(navEl.value)
    updateNavH()
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
  height: var(--nav-h, 2.6rem);
  padding: 0 0.8rem;
  background: var(--color-green);
  color: #fff;
  gap: 0.4rem;
}
.site-brand {
  font-family: var(--font-display);
  font-size: 1.1rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.site-links {
  display: flex;
  gap: 0;
  flex: 1;
  justify-content: center;
}
.site-link {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  padding: 0.4rem 0.65rem;
  font-size: 0.82rem;
  transition: color 150ms;
  white-space: nowrap;
}
.site-link:hover,
.site-link.active {
  color: #fff;
}
.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}
.control-group {
  display: flex;
  gap: 1px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  overflow: hidden;
}
.ctl-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  padding: 0.2rem 0.4rem;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 150ms, color 150ms;
  white-space: nowrap;
  line-height: 1.3;
}
.ctl-btn.active {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.ctl-btn:hover {
  color: #fff;
}
.ctl-slides {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.ctl-slides.active {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
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
  min-height: calc(100vh - var(--nav-h, 2.6rem));
}

/* ── Sidebar ── */
.sidebar {
  position: sticky;
  top: var(--nav-h, 2.6rem);
  height: calc(100vh - var(--nav-h, 2.6rem));
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.6rem;
  padding-right: 0.3rem;
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
.lesson-titles {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}
.lesson-label {
  line-height: 1.35;
  overflow-wrap: break-word;
  word-break: break-word;
}
.lesson-label-en {
  font-size: 0.72rem;
  color: var(--color-muted);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scrim {
  display: none;
}

/* ── Topbar ── */
.main-stage {
  min-width: 0;
  overflow-x: hidden;
}
.topbar {
  position: sticky;
  top: var(--nav-h, 2.6rem);
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
  border: none;
  color: rgba(255, 255, 255, 0.8);
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  font-size: 1.1rem;
}
.topbar-lesson {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-green);
  min-width: 1.4rem;
  text-align: center;
  padding: 0.15rem 0.35rem;
  border: 1px solid var(--color-border);
}
.topbar-title {
  font-size: clamp(0.95rem, 1.5vw, 1.2rem);
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.topbar-nav {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-green);
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: background 120ms, color 120ms;
}
.topbar-nav:hover {
  background: var(--color-green);
  color: #fff;
}
.topbar-nav-next {
  margin-left: auto;
}

/* ── Content ── */
.content {
  padding: 1rem;
  max-width: 72rem;
}

/* ── Hero ── */
.hero {
  padding: 1.2rem;
  margin-bottom: 1rem;
  background: radial-gradient(circle at top right, rgba(24, 60, 50, 0.08), transparent 14rem), var(--color-surface);
  cursor: pointer;
}
.hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3.5vw, 2.6rem);
  line-height: 1.7;
  color: var(--color-green);
}
.hero-sub {
  margin: 0.15rem 0 0;
  font-size: 0.92rem;
  color: var(--color-text);
  letter-spacing: 0.02em;
  opacity: 0.7;
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
  letter-spacing: 0.12em;
  font-size: 0.82rem;
  color: var(--color-green);
  margin-bottom: 0.25rem;
  font-weight: 600;
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
  font-size: 0.85rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 150ms, color 150ms;
}
.block-play-btn:hover {
  opacity: 1;
  color: var(--color-green);
}
.row-play-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  padding: 0.1rem 0.3rem;
  font-size: 0.7rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 150ms, color 150ms;
  flex-shrink: 0;
}
.row-play-btn:hover {
  opacity: 1;
  color: var(--color-green);
}
.drill-row-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.drill-row-wrap .vocab-grid {
  flex: 1;
}

/* ── Blocks ── */
.blocks {
  display: grid;
  gap: 1.2rem;
}
.block {
  padding: 1rem 0;
}
.block + .block {
  border-top: 1px solid var(--color-border);
}
.block-hd {
  display: flex;
  align-items: center;
  margin-bottom: 0.8rem;
  padding-left: 0.6rem;
  border-left: 3px solid var(--color-green);
}
.block-hd-text {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.block-type {
  letter-spacing: 0.1em;
  font-size: 1.05rem;
  color: var(--color-green);
  font-weight: 600;
}
.block-type-en {
  font-size: 0.82rem;
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.vocab-card {
  flex: 0 1 auto;
  min-width: 5rem;
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--color-border);
  background: transparent;
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 40rem;
}
.dia-bubble {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: 85%;
  cursor: pointer;
}
.dia-bubble.dia-right {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.dia-avatar {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 0.2rem;
  border: 2px solid var(--color-border);
}
.dia-right .dia-avatar {
  border-color: rgba(140, 29, 39, 0.3);
}
.dia-sp {
  min-width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--color-green);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 0.3rem;
}
.dia-right .dia-sp {
  background: var(--color-crimson);
}
.dia-body {
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
}
.dia-right .dia-body {
  background: rgba(24, 60, 50, 0.04);
  border-color: rgba(24, 60, 50, 0.12);
}
.dia-body p {
  margin: 0;
}
.dia-hak {
  font-size: 1.35rem;
  line-height: 1.8;
  color: var(--color-text);
}
.dia-tr {
  font-size: 0.72rem;
  color: var(--color-muted);
  margin-top: 0;
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
.sent-hak-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.sent-hak {
  font-size: 1.45rem;
  line-height: 1.8;
  color: var(--color-text);
}
.sent-tr {
  font-size: 0.72rem;
  color: var(--color-muted);
  margin-top: 0;
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 1.05rem;
  color: var(--color-muted);
  line-height: 1.5;
}
.prompt-list li {
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  gap: 0.2rem;
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

/* ── Practice drill rows ── */
.drill-rows {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
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

/* ── Ruby (span-based) ── */
:deep(.ruby) {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: bottom;
  margin: 0 0.08em;
}
:deep(.ruby .rb) {
  line-height: 1.4;
}
:deep(.ruby .rt) {
  display: block;
  font-size: 0.5em;
  font-family: var(--font-body);
  color: var(--color-crimson);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  order: -1;
}
.dia-hak :deep(.ruby .rt),
.sent-hak :deep(.ruby .rt) {
  font-size: 0.52em;
  color: var(--color-crimson);
}
.dia-hak :deep(.rom-bracket),
.sent-hak :deep(.rom-bracket) {
  font-size: 0.85em;
  color: var(--color-crimson);
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
:deep(.rom-bracket) {
  font-family: var(--font-body);
  font-size: 0.65em;
  color: var(--color-crimson);
  font-weight: 400;
  margin-left: 0.15em;
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
:deep(.note-rom) {
  color: var(--color-crimson);
  font-family: var(--font-body);
  font-weight: 500;
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
  flex-wrap: wrap;
  gap: 0.5rem 0.8rem;
  padding: 0 1.2rem 0.6rem;
  background: #111;
  color: #fff;
  font-size: 0.92rem;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
  min-height: 3.4rem;
}
.audio-bar-progress {
  flex-basis: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  margin-top: -0px;
}
.audio-bar-progress-fill {
  height: 100%;
  background: var(--color-crimson);
  border-radius: 2px;
  transition: width 150ms linear;
}
.audio-bar-time {
  font-size: 0.7rem;
  font-family: var(--font-mono);
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}
.audio-bar-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow: hidden;
}
.audio-bar-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  font-size: 0.95rem;
}
.audio-bar-sub {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.04em;
}
.audio-bar-segment {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.85);
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
.audio-bar-btn.close {
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.06);
}
.audio-bar-btn.close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ── Romanisation font for diacritics ── */
rt, .rom-bracket {
  font-family: var(--font-rom);
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
.static-page h2 {
  font-family: var(--font-display);
  color: var(--color-green);
  font-size: 1.2rem;
  margin: 1.5rem 0 0.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.3rem;
}
.static-page p {
  color: var(--color-muted);
  margin: 0 0 0.8rem;
}

/* ── Slides mode ── */
.slides-active {
  grid-template-columns: 1fr;
}
.slides-active .sidebar,
.slides-active .topbar {
  display: none;
}
.slides-mode .hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  margin-bottom: 0;
  padding: 2rem;
}
.slides-mode .hero .audio-btn,
.slides-mode .block-play-btn,
.slides-mode .lesson-foot {
  display: none;
}
.slides-mode .block {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 1rem;
  border-top: none;
  page-break-before: always;
}
.slides-mode .block + .block {
  border-top: 2px solid var(--color-border);
}
.slides-mode .block-hd {
  margin-bottom: 1.2rem;
}
.slides-mode .vocab-grid {
  justify-content: center;
}
.slides-mode .vocab-hak {
  font-size: 2.8rem;
}
.slides-mode .vocab-card.sm .vocab-hak {
  font-size: 2.4rem;
}
.slides-mode .vocab-mean {
  font-size: 1.1rem;
}
.slides-mode .dia-hak {
  font-size: 2.2rem;
}
.slides-mode .dia-tr {
  font-size: 1rem;
}
.slides-mode .sent-hak {
  font-size: 2.2rem;
}
.slides-mode .sent-tr {
  font-size: 1rem;
}
.slides-mode .prompt-list {
  font-size: 1.6rem;
}
.slides-mode .sp-item {
  font-size: 1.4rem;
}
.slides-mode .note-item {
  font-size: 1.3rem;
}
.slides-mode .block-type {
  font-size: 1.3rem;
}
.slides-mode .block-type-en {
  font-size: 0.85rem;
}
.slides-mode .hero h1 {
  font-size: 3.2rem;
}
.slides-mode .hero-sub {
  font-size: 1.2rem;
}
.slides-mode .kicker {
  font-size: 1rem;
}

/* ── Global slide nav ── */
.slide-nav-global {
  position: fixed;
  bottom: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 0.4rem 0.8rem;
  border-radius: 2rem;
  z-index: 35;
}
.slide-nav-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 120ms;
}
.slide-nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}
.slide-nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.slide-nav-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-mono);
  min-width: 4rem;
  text-align: center;
}

/* ── Mobile ── */
@media (max-width: 860px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    top: var(--nav-h, 2.6rem);
    left: 0;
    width: min(18rem, 80vw);
    height: calc(100vh - var(--nav-h, 2.6rem));
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
    inset: var(--nav-h, 2.6rem) 0 0;
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
    top: var(--nav-h, 2.6rem);
  }
  .site-brand {
    font-size: 0.85rem;
    margin-right: 0.4rem;
  }
  .site-link {
    font-size: 0.72rem;
    padding: 0.3rem 0.4rem;
  }
  .vocab-grid {
    gap: 0.35rem;
  }
  .content {
    padding: 0.5rem;
    overflow-x: hidden;
  }
  .hero {
    padding: 0.8rem;
  }
  .hero h1 {
    font-size: clamp(1.3rem, 6vw, 2rem);
  }
  .dialogue {
    max-width: 100%;
  }
  .dia-bubble {
    max-width: 92%;
  }
  .dia-body {
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .dia-hak {
    font-size: 1.15rem;
  }
  .sent-hak {
    font-size: 1.2rem;
  }
  .drill-table td {
    min-width: 3rem;
    padding: 0.35rem;
    font-size: 1.35rem;
  }
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }
  .sp-item {
    flex-wrap: wrap;
  }
  .note-item {
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .vocab-hak {
    font-size: 1.5rem;
  }
  .vocab-card.sm .vocab-hak {
    font-size: 1.5rem;
  }
  .block-type {
    font-size: 0.92rem;
  }
  .block-type-en {
    font-size: 0.72rem;
  }
  .kicker {
    font-size: 0.72rem;
  }
  .site-nav {
    flex-wrap: wrap;
    height: auto;
    min-height: 2.6rem;
    gap: 0.25rem;
    padding: 0.35rem 0.6rem;
  }
  .site-links {
    order: 10;
    flex-basis: 100%;
    justify-content: flex-start;
  }
  .nav-controls {
    margin-left: auto;
  }
}
@media (max-width: 480px) {
  .site-links {
    display: none;
  }
  .dia-hak {
    font-size: 1rem;
  }
  .sent-hak {
    font-size: 1.05rem;
  }
  .hero h1 {
    font-size: 1.3rem;
  }
}
</style>
