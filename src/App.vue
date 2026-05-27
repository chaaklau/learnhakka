<template>
  <nav v-if="!exportMode && !slidesMode" ref="navEl" class="site-nav">
    <button type="button" class="menu-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
    <span class="site-brand" @click="navigateTo('textbook')">{{ isA2 ? '香港客家話初級' : '香港客家話入門' }}<span class="site-brand-level">Hong Kong Hakka · {{ isA2 ? 'Elementary (A2)' : 'Beginner (A1)' }}</span></span>
    <div class="site-links">
      <button type="button" :class="['site-link', { active: page === 'textbook' }]" @click="navigateTo('textbook')">課本 Textbook</button>
      <button type="button" :class="['site-link', { active: page === 'about' }]" @click="navigateTo('about')">關於計劃 About the Project</button>
    </div>
      <div class="nav-controls" aria-label="顯示設定 Display controls">
      <div class="view-menu">
        <div :class="['ctl-btn', 'view-menu-summary', { active: paperMode || displayLang !== 'zh' || romMode !== 'ruby' }]" title="顯示設定 Display settings">
          <svg class="ctl-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h4"></path><path d="M12 7h8"></path><circle cx="10" cy="7" r="2"></circle>
            <path d="M4 17h8"></path><path d="M16 17h4"></path><circle cx="14" cy="17" r="2"></circle>
          </svg>
          <span>顯示 Display</span>
        </div>
        <div class="view-menu-panel">
          <div class="view-menu-section">
            <span class="view-menu-label">譯文 Translation</span>
            <div class="control-group lang-controls" role="group" aria-label="譯文語言 Translation language">
              <button type="button" :class="['ctl-btn', { active: displayLang === 'zh' }]" :aria-pressed="displayLang === 'zh'" title="中文譯文 Chinese translation" @click="displayLang = 'zh'">中文</button>
              <button type="button" :class="['ctl-btn', { active: displayLang === 'en' }]" :aria-pressed="displayLang === 'en'" title="英文譯文 English translation" @click="displayLang = 'en'">英文</button>
            </div>
          </div>
          <div class="view-menu-section">
            <span class="view-menu-label">讀音 Pronunciation</span>
            <div class="control-group rom-controls" role="group" aria-label="讀音顯示 Pronunciation display">
              <button type="button" :class="['ctl-btn', 'rom-choice', { active: romMode === 'ruby' }]" :aria-pressed="romMode === 'ruby'" title="讀音在字上 Pronunciation above the word" @click="romMode = 'ruby'">
                <ruby class="ctl-example">厓<rt>ngai</rt></ruby>
              </button>
              <button type="button" :class="['ctl-btn', 'rom-choice', { active: romMode === 'bracket' }]" :aria-pressed="romMode === 'bracket'" title="讀音在字後 Pronunciation after the word" @click="romMode = 'bracket'">
                <span class="ctl-example">厓<span class="ctl-rom">[ngai]</span></span>
              </button>
            </div>
          </div>
          <div class="view-menu-section">
            <span class="view-menu-label">版面 Layout</span>
            <div class="control-group mode-controls" role="group" aria-label="版面模式 View mode">
              <button type="button" :class="['ctl-btn', { active: viewMode === 'textbook' }]" :aria-pressed="viewMode === 'textbook'" title="課本模式 Textbook view" @click="setMode('textbook')"><span class="ctl-symbol">T</span><span>課本 Text</span></button>
              <button type="button" :class="['ctl-btn', { active: paperMode }]" :aria-pressed="paperMode" title="紙本模式 Paper view" @click="setMode('paper')"><span class="ctl-symbol">□</span><span>紙本 Paper</span></button>
            </div>
          </div>
        </div>
      </div>
      <button type="button" :class="['ctl-btn', 'ctl-slides-main', { active: slidesMode }]" :aria-pressed="slidesMode" title="投影片模式 Slide view" @click="setMode('slides')">
        <svg class="ctl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="11" rx="1.5"></rect>
          <path d="M12 16v4"></path><path d="M8.5 20h7"></path>
        </svg>
        <span>投影片 Slides</span>
      </button>
      <button type="button" class="ctl-btn ctl-print" @click="downloadPdf">
        <svg class="ctl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7z"></path><path d="M14 3v5h5"></path>
        </svg>
        <span>列印/PDF</span>
      </button>
    </div>
  </nav>

  <div v-if="page === 'textbook' && loading" class="loading-state">
    <p>Loading textbook…</p>
  </div>

  <div v-else-if="page === 'textbook' && currentLesson" class="app-shell" :class="{ 'slides-active': slidesMode, 'paper-active': paperMode, 'export-active': exportMode }">
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

      <div class="content" :class="{ 'slides-mode': slidesMode, 'paper-mode': paperMode, 'export-mode': exportMode }" @mousemove="slidesMode && resetSlideNavTimer()">
        <div v-if="slidesMode" class="slide-meta-bar">
          <span class="slide-project">香港客家話入門</span>
          <span class="slide-lesson">第 {{ currentLesson.id }} 課 · <span class="font-hakka" v-html="formatHakka(currentLesson.title.hak)"></span></span>
        </div>
        <div v-if="slidesMode && !exportMode" class="slide-tool-bar">
          <div class="slide-display-menu">
            <div class="slide-tool-btn slide-display-summary" title="顯示設定 Display settings">
              <svg class="ctl-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h4"></path><path d="M12 7h8"></path><circle cx="10" cy="7" r="2"></circle>
                <path d="M4 17h8"></path><path d="M16 17h4"></path><circle cx="14" cy="17" r="2"></circle>
              </svg>
              <span>顯示 Display</span>
            </div>
            <div class="slide-display-panel">
              <div class="view-menu-section">
                <span class="view-menu-label">譯文 Translation</span>
                <div class="control-group lang-controls" role="group" aria-label="譯文語言 Translation language">
                  <button type="button" :class="['ctl-btn', { active: displayLang === 'zh' }]" :aria-pressed="displayLang === 'zh'" title="中文譯文 Chinese translation" @click="displayLang = 'zh'">中文</button>
                  <button type="button" :class="['ctl-btn', { active: displayLang === 'en' }]" :aria-pressed="displayLang === 'en'" title="英文譯文 English translation" @click="displayLang = 'en'">英文</button>
                </div>
              </div>
              <div class="view-menu-section">
                <span class="view-menu-label">讀音 Pronunciation</span>
                <div class="control-group rom-controls" role="group" aria-label="讀音顯示 Pronunciation display">
                  <button type="button" :class="['ctl-btn', 'rom-choice', { active: romMode === 'ruby' }]" :aria-pressed="romMode === 'ruby'" title="讀音在字上 Pronunciation above the word" @click="romMode = 'ruby'">
                    <ruby class="ctl-example">厓<rt>ngai</rt></ruby>
                  </button>
                  <button type="button" :class="['ctl-btn', 'rom-choice', { active: romMode === 'bracket' }]" :aria-pressed="romMode === 'bracket'" title="讀音在字後 Pronunciation after the word" @click="romMode = 'bracket'">
                    <span class="ctl-example">厓<span class="ctl-rom">[ngai]</span></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="slide-tool-btn slide-exit-btn" title="離開投影片 Exit slide mode" aria-label="離開投影片 Exit slide mode" @click="setMode('textbook')">
            <svg class="ctl-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12"></path><path d="M18 6L6 18"></path>
            </svg>
            <span>離開 Exit</span>
          </button>
        </div>
        <section ref="heroEl" class="hero" v-show="!slidesMode || currentSlide === 0" @click="playHeroAudio(currentLesson.id)">
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
                  @click="playBlockAudio(currentLesson.id, block, bi)"
                >▶</button>

              </div>
            </header>

            <div class="block-content">
              <div v-if="block.description" class="block-desc">
                <p v-if="block.description.hak" class="font-hakka" v-html="formatHakka(block.description.hak)"></p>
                <p v-if="block.description.en" class="block-desc-en">{{ block.description.en }}</p>
              </div>

              <div v-if="block.type === 'vocab'" class="vocab-grid">
                <div v-for="(token, ti) in tokenize(block.items)" :key="token" class="vocab-card" v-show="!slidesMode || slideItemVisible(bi, ti)" @click="playTokenAudio(block, bi, ti)">
                  <p v-if="slidesMode" class="slide-context">{{ ti + 1 }} / {{ tokenize(block.items).length }}</p>
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
                  :class="dialogueBubbleClasses(block, item, bi, ii)"
                  v-show="dialogueItemVisible(bi, ii)"
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

              <div v-else-if="block.type === 'main' || block.type === 'idiom' || block.type === 'nursery'" class="sent-list">
                <div
                  v-for="(item, ii) in block.items"
                  :key="ii"
                  class="sent-row"
                  v-show="!slidesMode || slideItemVisible(bi, ii)"
                  @click="playBlockItem(currentLesson.id, block, bi, ii)"
                >
                  <button v-if="getBlockTimestamps(currentLesson.id, block, bi)" type="button" class="row-play-btn">▶</button>
                  <div class="sent-text">
                    <p class="sent-hak font-hakka" v-html="renderSentenceRuby(item.hak)"></p>
                    <p v-if="getDisplayText(item)" class="sent-tr">{{ getDisplayText(item) }}</p>
                    <p v-if="item.note" class="sent-note">{{ item.note }}</p>
                  </div>
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

              <div v-else-if="block.type === 'notes'" class="notes">
                <div v-for="(item, ii) in block.items" :key="ii" class="note-item" v-show="!slidesMode || slideItemVisible(bi, ii)">
                  <p v-html="formatNoteText(getDisplayText(item))"></p>
                </div>
              </div>

              <template v-else-if="block.type === 'sentence_practice' || block.type === 'sentences'">
                <ol class="sp-list" :style="slidesMode && curPage()?.bi === bi ? { counterReset: 'sp-counter ' + curPage().from } : {}">
                  <li v-for="(item, ii) in block.items" :key="ii" class="sp-item" v-show="!slidesMode || slideItemVisible(bi, ii)" v-html="formatPracticeItem(item)"></li>
                </ol>
              </template>

              <div v-else class="note-item fallback">
                <p>Unsupported block: {{ block.type }}</p>
              </div>
            </div>
            <div v-if="slidesMode && slideSectionEndVisible(bi)" class="section-end-mark" aria-hidden="true">◆</div>
          </article>
        </section>

        <div v-if="slidesMode && slidePages.length > 1" class="slide-nav-global" :class="{ hidden: !slideNavVisible }" :style="audioBarVisible ? { bottom: 'calc(var(--audio-bar-h) + 1.2rem)' } : {}">
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

  <div v-if="audioBarVisible && !exportMode" ref="audioBarEl" class="audio-bar">
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

  <div v-if="!exportMode && !slidesMode && isA2" class="site-banner">⚠️ This site is under construction. Some content, audio, and features may be incomplete or inaccurate.</div>

  <audio ref="audioEl" @ended="onAudioEnded" @pause="onAudioPause"></audio>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const baseUrl = import.meta.env.BASE_URL

const isA2 = window.location.pathname.includes('/a2/')
const loading = ref(true)
const lessons = ref([])
const lessonCache = ref({})
const mediaCache = ref({})
const lexicon = ref(new Map())
const site = ref({})
const displayLang = ref(route.query.lang === 'en' ? 'en' : 'zh')
const romMode = ref(route.query.rom === 'bracket' ? 'bracket' : 'ruby')
const slideNavVisible = ref(true)
let slideNavTimer = null
const currentSlide = ref(0)
let savedRomMode = null
const sidebarOpen = ref(false)
const audioEl = ref(null)
const playingAudio = ref('')
const audioBarVisible = ref(false)
const audioSegmentText = ref('')
const audioCurrentTime = ref(0)
const audioDuration = ref(0)
const lastPlayedSrc = ref('')
let stopAtTime = null
let rafId = null
let activeSegments = null // { timestamps: [[s,e],...], texts: [str,...] } | null
const heroEl = ref(null)
const heroVisible = ref(true)
let heroObserver = null
const navEl = ref(null)
let navResizeObserver = null
const audioBarEl = ref(null)
let audioBarResizeObserver = null

const page = computed(() => {
  if (route.name === 'about') return 'about'
  if (route.name === 'acknowledgement') return 'acknowledgement'
  return 'textbook'
})

const viewMode = computed(() => {
  const mode = String(route.query.mode || 'textbook')
  return ['textbook', 'paper', 'slides'].includes(mode) ? mode : 'textbook'
})

const slidesMode = computed(() => viewMode.value === 'slides')
const paperMode = computed(() => viewMode.value === 'paper')
const exportMode = computed(() => route.query.export === '1')

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

const currentMedia = computed(() => {
  const id = currentLessonId.value
  if (id == null) return null
  return mediaCache.value[id] || null
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

function romToDiacritics(pron) {
  if (!pron) return pron
  return pron.replace(/(\D*[aeo]|\D*[iu](?!\d)|\D*[iumn])(\D*)(\d)/g,
    (_, $1, $2, $3) => $1 + TONE_DIACRITICS[+$3] + $2
  ).normalize('NFC')
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
    ? (item.en || item.zh || '')
    : (item.zh || item.en || '')
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
    return block.rows.length
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

function dialogueItemOnRight(block, item) {
  const firstSpeaker = block?.items?.[0]?.sp
  return firstSpeaker === '先生' ? item.sp === 'B' : item.sp !== firstSpeaker
}

function dialogueItemIsPreviousContext(bi, ii) {
  if (!slidesMode.value) return false
  const pg = curPage()
  return Boolean(pg && pg.bi === bi && ii === pg.from - 1)
}

function dialogueItemIsNextContext(bi, ii) {
  if (!slidesMode.value) return false
  const pg = curPage()
  return Boolean(pg && pg.bi === bi && ii === pg.to)
}

function dialogueItemVisible(bi, ii) {
  if (!slidesMode.value) return true
  const pg = curPage()
  if (!pg || pg.bi !== bi) return false
  return ii >= Math.max(0, pg.from - 1) && ii <= pg.to
}

function dialogueBubbleClasses(block, item, bi, ii) {
  const isPreviousContext = dialogueItemIsPreviousContext(bi, ii)
  const isNextContext = dialogueItemIsNextContext(bi, ii)
  return [
    'dia-bubble',
    {
      'dia-right': dialogueItemOnRight(block, item),
      'dia-context': isPreviousContext || isNextContext,
      'dia-context-prev': isPreviousContext,
      'dia-context-next': isNextContext,
      'dia-current': slidesMode.value && slideItemVisible(bi, ii)
    }
  ]
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
          out += '<span class="ruby"><span class="rb">' + escapeHtml(ch) + '</span><span class="rt">' + escapeHtml(romToDiacritics(syls[si])) + '</span></span>'
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
  if (hak === '＿') {
    return entry.rom
      ? '<span class="drill-blank">' + escapeHtml(romToDiacritics(entry.rom)) + '</span>'
      : '＿'
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
          out += '<span class="title-word">'
          if (romMode.value === 'bracket') {
            out += escapeHtml(word) + '<span class="rom-bracket">[' + escapeHtml(romToDiacritics(roms.join(' '))) + ']</span>'
          } else {
            // Render each character with its rom syllable
            let si = 0
            for (const c of word) {
              if (si < roms.length) {
                out += '<span class="ruby"><span class="rb">' + escapeHtml(c) + '</span><span class="rt">' + escapeHtml(romToDiacritics(roms[si])) + '</span></span>'
                si++
              } else {
                out += escapeHtml(c)
              }
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

function getLessonMedia(id) {
  return mediaCache.value[id] || null
}

function getBlockMedia(lessonId, block) {
  return getLessonMedia(lessonId)?.blocks?.[block.id] || null
}

function getBlockAudio(lessonId, block, blockIndex) {
  const media = getBlockMedia(lessonId, block)
  if (!media?.audio) return null
  return baseUrl + 'data/' + media.audio
}

function normalizeSegments(segments) {
  if (!Array.isArray(segments)) return null
  return segments
    .map((segment) => {
      if (Array.isArray(segment)) return [segment[0], segment[1]]
      return [segment.start, segment.end]
    })
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
}

const audioLabel = computed(() => {
  const src = lastPlayedSrc.value
  if (!src) return ''
  const m = src.match(/ch(\d+)-([\w-]+)\.m4a$/)
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

function startRaf() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(rafLoop)
}

function stopRaf() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}

function rafLoop() {
  const el = audioEl.value
  if (el) {
    audioCurrentTime.value = el.currentTime
    audioDuration.value = el.duration || 0
    if (activeSegments) {
      const t = el.currentTime
      const idx = activeSegments.timestamps.findIndex(([s, e]) => t >= s && t < e)
      audioSegmentText.value = idx >= 0 ? (activeSegments.texts[idx] || '') : ''
    }
    if (stopAtTime != null && el.currentTime >= stopAtTime) {
      el.pause()
      playingAudio.value = ''
      stopAtTime = null
    }
  }
  if (!el || el.paused || el.ended) {
    rafId = null
    return
  }
  rafId = requestAnimationFrame(rafLoop)
}

function onAudioEnded() {
  playingAudio.value = ''
  audioSegmentText.value = ''
  stopAtTime = null
  stopRaf()
}

function onAudioPause() {
  // Only sync state for external pauses (e.g. another tab, OS media controls)
  // Ignore pauses triggered by our own code (togglePlayPause sets playingAudio directly)
  const el = audioEl.value
  if (!el || el.ended) return
  if (playingAudio.value) {
    playingAudio.value = ''
  }
}

function playHeroAudio(lessonId) {
  const titleAudio = getLessonMedia(lessonId)?.titleAudio
  if (!titleAudio) return
  activeSegments = null
  audioSegmentText.value = ''
  playAudio(baseUrl + 'data/' + titleAudio)
}

function playBlockAudio(lessonId, block, bi) {
  const src = getBlockAudio(lessonId, block, bi)
  if (!src) return
  const ts = getBlockTimestamps(lessonId, block, bi)
  if (ts) {
    activeSegments = { timestamps: ts, texts: ts.map((_, i) => getSegmentText(block, i)) }
  } else {
    activeSegments = null
    audioSegmentText.value = ''
  }
  playAudio(src)
}

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
  lastPlayedSrc.value = src
  audioBarVisible.value = true
  startRaf()
}

function togglePlayPause() {
  const el = audioEl.value
  if (!el || !el.src) return
  if (el.paused) {
    el.play().catch(() => {})
    playingAudio.value = el.src
    startRaf()
  } else {
    el.pause()
    playingAudio.value = ''
  }
}

function closeAudioBar() {
  const el = audioEl.value
  if (el) { el.pause(); el.currentTime = 0 }
  playingAudio.value = ''
  lastPlayedSrc.value = ''
  audioBarVisible.value = false
  audioSegmentText.value = ''
  activeSegments = null
  stopAtTime = null
  stopRaf()
}

function stopAudio() {
  const el = audioEl.value
  if (!el) return
  el.pause()
  el.currentTime = 0
  playingAudio.value = ''
  activeSegments = null
  stopAtTime = null
  stopRaf()
}

function replayAudio() {
  const el = audioEl.value
  if (!el) return
  el.currentTime = 0
  el.play().catch(() => {})
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
  stopAtTime = null  // cancel any segment endpoint restriction
  el.currentTime = ratio * el.duration
  audioCurrentTime.value = el.currentTime
  // Update segment text immediately; rafLoop will keep it live if playing
  if (activeSegments) {
    const t = el.currentTime
    const idx = activeSegments.timestamps.findIndex(([s, end]) => t >= s && t < end)
    audioSegmentText.value = idx >= 0 ? (activeSegments.texts[idx] || '') : ''
  }
}

function getBlockTimestamps(lessonId, block, blockIndex) {
  return normalizeSegments(getBlockMedia(lessonId, block)?.segments)
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
  const ts = getBlockTimestamps(lessonId, block, blockIndex)
  if (ts) {
    activeSegments = { timestamps: ts, texts: ts.map((_, i) => getSegmentText(block, i)) }
  } else {
    activeSegments = null
    audioSegmentText.value = getSegmentText(block, itemIndex)
  }
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
  router.push({ name: 'chapter', params: { id }, query: route.query })
  sidebarOpen.value = false
  currentSlide.value = 0
}

function setMode(mode) {
  const nextMode = ['paper', 'slides'].includes(mode) ? mode : 'textbook'
  const q = { ...route.query }
  if (nextMode === 'textbook') delete q.mode
  else q.mode = nextMode
  router.replace({ ...route, query: q })
  if (nextMode !== 'slides') currentSlide.value = 0
}

async function downloadPdf() {
  setMode('paper')
  await nextTick()
  window.setTimeout(() => window.print(), 80)
}

const slidePages = computed(() => {
  if (!currentLesson.value) return []
  const pages = [{ type: 'hero', bi: -1, from: 0, to: 0 }]
  currentLesson.value.blocks.forEach((block, bi) => {
    const sectionStart = pages.length
    if (block.type === 'vocab' || (block.type === 'main' && typeof block.items === 'string')) {
      const tokens = tokenize(block.items)
      for (let i = 0; i < tokens.length; i++) {
        pages.push({ type: block.type === 'vocab' ? 'vocab' : 'token-list', bi, from: i, to: i + 1 })
      }
    } else if (block.type === 'main' && Array.isArray(block.items)) {
      block.items.forEach((_, ii) => pages.push({ type: 'main', bi, from: ii, to: ii + 1 }))
    } else if (block.type === 'practice' && Array.isArray(block.rows)) {
      block.rows.forEach((_, ri) => pages.push({ type: 'practice-row', bi, from: ri, to: ri + 1 }))
    } else if (block.type === 'practice' && Array.isArray(block.items)) {
      block.items.forEach((_, ii) => pages.push({ type: 'practice-item', bi, from: ii, to: ii + 1 }))
    } else if (block.type === 'sentence_practice' || block.type === 'sentences') {
      const items = block.items || []
      for (let i = 0; i < items.length; i++) {
        pages.push({ type: 'sentence-practice', bi, from: i, to: i + 1 })
      }
    } else if (block.type === 'notes' && Array.isArray(block.items)) {
      block.items.forEach((_, ii) => pages.push({ type: 'note', bi, from: ii, to: ii + 1 }))
    } else {
      pages.push({ type: block.type, bi, from: 0, to: (block.items?.length || 1) })
    }
    if (pages.length > sectionStart) pages[pages.length - 1].sectionEnd = true
  })
  return pages
})

function resetSlideNavTimer() {
  slideNavVisible.value = true
  clearTimeout(slideNavTimer)
  slideNavTimer = setTimeout(() => { slideNavVisible.value = false }, 5000)
}

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
function slideSectionEndVisible(bi) {
  const pg = curPage()
  return Boolean(pg && pg.bi === bi && pg.sectionEnd)
}

function getSlideAudio(page) {
  if (!currentLesson.value || !page) return null
  if (page.type === 'hero') {
    const titleAudio = currentMedia.value?.titleAudio
    return titleAudio ? { src: baseUrl + 'data/' + titleAudio, start: null, end: null, text: currentLesson.value.title.hak } : null
  }
  const block = currentLesson.value.blocks[page.bi]
  const media = block ? getBlockMedia(currentLesson.value.id, block) : null
  if (!block || !media?.audio) return null
  const segments = normalizeSegments(media.segments)
  const segment = segments?.[page.from]
  return {
    src: baseUrl + 'data/' + media.audio,
    start: segment?.[0] ?? null,
    end: segment?.[1] ?? null,
    text: getSegmentText(block, page.from)
  }
}

function getExportState() {
  const page = curPage()
  return {
    lessonId: currentLesson.value?.id || null,
    slideIndex: currentSlide.value,
    slideCount: slidePages.value.length,
    page,
    audio: getSlideAudio(page)
  }
}

function installExportApi() {
  if (typeof window === 'undefined') return
  window.__LESSON_EXPORT__ = {
    getState: getExportState,
    getSlideCount: () => slidePages.value.length,
    getSlides: () => slidePages.value.map((page, slideIndex) => ({ slideIndex, page, audio: getSlideAudio(page) })),
    setSlide: async (slideIndex) => {
      currentSlide.value = Math.max(0, Math.min(slideIndex, slidePages.value.length - 1))
      await nextTick()
      return getExportState()
    }
  }
}

function navigateTo(p) {
  if (p === 'textbook') {
    const id = currentLessonId.value || lessons.value[0]?.id || 1
    router.push({ name: 'chapter', params: { id }, query: route.query })
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
  if (audioBarResizeObserver) audioBarResizeObserver.disconnect()
  document.removeEventListener('keydown', onSlideKeydown)
  if (typeof window !== 'undefined') delete window.__LESSON_EXPORT__
  stopRaf()
})

function onSlideKeydown(e) {
  if (!slidesMode.value || !currentLesson.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    setMode('textbook')
    return
  }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  const total = slidePages.value.length
  if (e.key === 'ArrowRight' && currentSlide.value < total - 1) currentSlide.value++
  if (e.key === 'ArrowLeft' && currentSlide.value > 0) currentSlide.value--
}

watch(slidesMode, (on) => {
  if (on) {
    resetSlideNavTimer()
    savedRomMode = romMode.value
    romMode.value = 'bracket'
    document.addEventListener('keydown', onSlideKeydown)
  } else {
    clearTimeout(slideNavTimer)
    slideNavVisible.value = true
    if (savedRomMode) romMode.value = savedRomMode
    savedRomMode = null
    document.removeEventListener('keydown', onSlideKeydown)
  }
})

watch([currentLesson, currentMedia, slidePages, currentSlide], () => installExportApi(), { immediate: true })

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

async function loadMedia(id) {
  if (mediaCache.value[id]) return mediaCache.value[id]
  const entry = lessons.value.find(l => l.id === id)
  if (!entry?.media) return null
  const res = await fetch(baseUrl + 'data/' + entry.media)
  if (!res.ok) return null
  const data = await res.json()
  mediaCache.value = { ...mediaCache.value, [id]: data }
  return data
}

async function loadLessonBundle(id) {
  if (id == null) return
  await Promise.all([loadLesson(id), loadMedia(id)])
}

function prefetchNeighborLessons(id) {
  const idx = lessons.value.findIndex(l => l.id === id)
  for (const neighbor of [lessons.value[idx - 1], lessons.value[idx + 1]]) {
    if (neighbor) loadLessonBundle(neighbor.id)
  }
}

watch(currentLessonId, async (id) => {
  if (id != null) {
    await loadLessonBundle(id)
    prefetchNeighborLessons(id)
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

    lessons.value = isA2
      ? indexData.filter((l) => l.id >= 11 && l.id <= 20)
      : indexData.filter((l) => l.id >= 1 && l.id <= 10)
    lexicon.value = map
    site.value = siteData

    await loadLessonBundle(currentLessonId.value || indexData[0]?.id)
    prefetchNeighborLessons(currentLessonId.value || indexData[0]?.id)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }

})

watch(navEl, (el) => {
  if (navResizeObserver) navResizeObserver.disconnect()
  if (!el) return
  const update = () => document.documentElement.style.setProperty('--nav-h', el.offsetHeight + 'px')
  navResizeObserver = new ResizeObserver(update)
  navResizeObserver.observe(el)
  update()
}, { flush: 'post' })

watch(audioBarEl, (el) => {
  if (audioBarResizeObserver) audioBarResizeObserver.disconnect()
  if (!el) return
  const update = () => document.documentElement.style.setProperty('--audio-bar-h', el.offsetHeight + 'px')
  audioBarResizeObserver = new ResizeObserver(update)
  audioBarResizeObserver.observe(el)
  update()
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
  min-height: var(--nav-h, 3rem);
  padding: 0.32rem 0.9rem;
  background: var(--color-green);
  color: #fff;
  gap: 0.55rem;
}
.site-brand {
  font-family: var(--font-display);
  font-size: 1.18rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.site-brand-level {
  font-family: var(--font-body);
  font-size: 0.68rem;
  opacity: 0.72;
  letter-spacing: 0.02em;
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
  padding: 0.45rem 0.7rem;
  font-size: 0.86rem;
  transition: color 150ms;
  white-space: nowrap;
}
.site-link:hover,
.site-link.active {
  color: #fff;
}
.nav-controls {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.11);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
}
.ctl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  min-height: 2.2rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  padding: 0.28rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 150ms, color 150ms;
  white-space: nowrap;
  line-height: 1.2;
  letter-spacing: 0;
}
.ctl-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ctl-btn.active {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}
.ctl-btn:hover {
  color: #fff;
}
.view-menu {
  position: relative;
}
.view-menu:hover {
  z-index: 40;
}
.view-menu-summary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.78);
}
.view-menu-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  display: grid;
  gap: 0.65rem;
  width: max-content;
  min-width: 20rem;
  padding: 0.75rem;
  border: 1px solid rgba(24, 60, 50, 0.16);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.98);
  color: var(--color-text);
  box-shadow: 0 1rem 2.5rem rgba(17, 17, 17, 0.16);
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms 80ms, visibility 0s 260ms;
}
.view-menu-panel::before {
  content: '';
  position: absolute;
  top: -0.6rem;
  left: 0;
  right: 0;
  height: 0.6rem;
}
.view-menu:hover .view-menu-panel {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transition: opacity 150ms, visibility 0s;
}
.view-menu-section {
  display: grid;
  gap: 0.3rem;
}
.view-menu-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-muted);
}
.view-menu-panel .control-group {
  justify-content: flex-start;
  background: var(--color-surface-soft);
  border-color: var(--color-border);
}
.view-menu-panel .ctl-btn {
  color: var(--color-muted);
}
.view-menu-panel .ctl-btn.active {
  background: var(--color-green);
  color: #fff;
}
.view-menu-panel .ctl-btn:hover {
  color: var(--color-green);
}
.view-menu-panel .ctl-btn.active:hover {
  color: #fff;
}
.lang-controls .ctl-btn {
  min-width: 3rem;
}
.rom-choice {
  min-width: 4.7rem;
  min-height: 2.55rem;
}
.ctl-example {
  font-family: var(--font-display);
  font-size: 1.08rem;
  line-height: 1;
  color: currentColor;
}
.ctl-example rt {
  font-family: var(--font-body);
  font-size: 0.54rem;
  line-height: 1;
  color: currentColor;
  opacity: 0.76;
}
.ctl-rom {
  margin-left: 0.12rem;
  font-family: var(--font-body);
  font-size: 0.72em;
  color: currentColor;
  opacity: 0.82;
}
.ctl-symbol {
  width: 1rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  opacity: 0.86;
}
.mode-controls .ctl-btn {
  min-width: 5.4rem;
}
.ctl-slides-main {
  min-width: 7.4rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.28);
}
.ctl-slides-main.active {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.ctl-print {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
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
  color: var(--color-text);
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
}

.scrim {
  display: none;
}

/* ── Topbar ── */
.main-stage {
  min-width: 0;
  overflow-x: clip;
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
  height: 0;
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
  margin: 0.75rem 0;
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
  color: var(--color-muted);
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
.block-desc-en {
  color: var(--color-muted);
  font-size: 0.88em;
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
  margin: 0;
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
.dialogue:has(.rom-bracket) {
  max-width: 52rem;
}
.dia-bubble {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: 80%;
  cursor: pointer;
}
.dia-bubble.dia-right {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.content:not(.slides-mode) .dia-bubble:not(.dia-right) + .dia-bubble:not(.dia-right) .dia-avatar,
.content:not(.slides-mode) .dia-bubble.dia-right + .dia-bubble.dia-right .dia-avatar {
  visibility: hidden;
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
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
  font-size: 0.72rem;
  color: var(--color-muted);
  margin-top: 0;
}
.sent-note {
  font-size: 0.78rem;
  color: var(--color-muted);
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
/* Drill rows' vocab cards can't be individually clicked */
.drill-rows .vocab-card {
  cursor: unset;
}
.drill-rows .vocab-card:hover {
  background: unset;
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
:deep(.font-hakka:has(.ruby)) {
  padding-top: 0.25em;
}
:deep(.ruby) {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: bottom;
  margin: 0 0.08em;
  line-height: 1;
  position: relative;
  bottom: 0.333em;
}
:deep(.ruby .rt) {
  font-size: 0.5em;
  font-family: var(--font-body);
  color: var(--color-crimson);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  order: -1;
  height: 0;
  position: relative;
  bottom: 1.333em;
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
  font-family: var(--font-body);
  color: var(--color-crimson);
  font-size: 0.85em;
}
:deep(.anno) {
  font-size: 0.75em;
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
:deep(.iterm:has(.ruby)) {
  padding-top: 0.35em;
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
  padding: 1rem 1.2rem 0.6rem;
  background: #111;
  color: #fff;
  font-size: 0.92rem;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
  min-height: 3.4rem;
}
.audio-bar-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0.4rem;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
}
.audio-bar-progress-fill {
  height: 100%;
  background: var(--color-crimson);
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
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.04em;
}
.audio-bar-segment {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
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

/* ── Paper mode ── */
.paper-active {
  display: block;
  background: #d8d7d2;
  padding: 1rem;
}
.paper-active .sidebar,
.paper-active .topbar {
  display: none;
}
.paper-mode {
  width: min(100%, 210mm);
  min-height: 297mm;
  margin: 0 auto;
  padding: 12mm;
  background: #fff;
  box-shadow: 0 0.25rem 1.5rem rgba(0, 0, 0, 0.18);
  color: #111;
}
.paper-mode .hero {
  padding: 0 0 0.7rem;
  margin-bottom: 0.8rem;
  background: none;
  border-bottom: 1px solid var(--color-border);
  cursor: default;
}
.paper-mode .hero h1 {
  font-size: 2rem;
  line-height: 1.55;
  margin: 0.45rem 0;
}
.paper-mode .blocks {
  gap: 0.55rem;
}
.paper-mode .block {
  padding: 0.45rem 0;
  break-inside: avoid;
}
.paper-mode .block-hd {
  margin-bottom: 0.4rem;
}
.paper-mode .vocab-grid {
  gap: 0.28rem;
}
.paper-mode .vocab-card {
  min-width: 4.5rem;
  padding: 0.22rem 0.3rem;
  cursor: default;
}
.paper-mode .vocab-hak,
.paper-mode .vocab-card.sm .vocab-hak {
  font-size: 1.35rem;
  line-height: 1.75;
}
.paper-mode .dia-hak,
.paper-mode .sent-hak {
  font-size: 1.08rem;
  line-height: 1.7;
}
.paper-mode .note-item,
.paper-mode .sp-item,
.paper-mode .prompt-list {
  font-size: 0.9rem;
}
.paper-mode .block-play-btn,
.paper-mode .row-play-btn,
.paper-mode .lesson-foot {
  display: none;
}

@page {
  size: A4;
  margin: 12mm;
}

@media print {
  :global(body) {
    background: #fff !important;
  }
  .site-nav,
  .site-banner,
  .sidebar,
  .topbar,
  .audio-bar,
  .slide-nav-global,
  .lesson-foot,
  .block-play-btn,
  .row-play-btn {
    display: none !important;
  }
  .app-shell,
  .paper-active {
    display: block !important;
    min-height: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }
  .main-stage {
    overflow: visible !important;
  }
  .content,
  .paper-mode {
    width: auto !important;
    max-width: none !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
  }
  .hero,
  .block,
  .note-item,
  .dia-bubble,
  .sent-row,
  .drill-row-wrap {
    break-inside: avoid;
  }
}

/* ── Slides mode ── */
.slides-active {
  grid-template-columns: 1fr;
  min-height: 100vh;
  background: var(--color-border);
}
.slides-active .sidebar,
.slides-active .topbar {
  display: none;
}
.slides-active .main-stage {
  display: grid;
  min-height: 100vh;
}
.slides-mode {
  position: relative;
  display: grid;
  background: var(--color-bg);
  margin: 0 auto;
  width: min(100vh / 0.5625, 100%);
  min-height: 100vh;
  max-width: unset;
}
.slide-meta-bar {
  display: none;
}
.slides-mode .slide-meta-bar {
  position: absolute;
  top: 1.15rem;
  right: 1.6rem;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.85rem;
  max-width: 68%;
  color: var(--color-muted);
  font-size: 1rem;
  line-height: 1.35;
  text-align: right;
  white-space: nowrap;
}
.slide-project {
  font-size: 1.06rem;
  font-weight: 700;
  color: var(--color-green);
}
.slide-lesson {
  font-size: 0.96rem;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slide-lesson .font-hakka {
  color: var(--color-text);
}
.slide-tool-bar {
  position: absolute;
  top: 3.25rem;
  right: 1.6rem;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.slide-display-menu {
  position: relative;
}
.slide-display-menu:hover {
  z-index: 25;
}
.slide-display-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  display: grid;
  gap: 0.65rem;
  width: max-content;
  min-width: 19rem;
  padding: 0.75rem;
  border: 1px solid rgba(24, 60, 50, 0.16);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.98);
  color: var(--color-text);
  box-shadow: 0 1rem 2.5rem rgba(17, 17, 17, 0.16);
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms 80ms, visibility 0s 260ms;
}
.slide-display-panel::before {
  content: '';
  position: absolute;
  top: -0.6rem;
  left: 0;
  right: 0;
  height: 0.6rem;
}
.slide-display-menu:hover .slide-display-panel {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transition: opacity 150ms, visibility 0s;
}
.slide-display-panel .control-group {
  justify-content: flex-start;
  background: var(--color-surface-soft);
  border-color: var(--color-border);
}
.slide-display-panel .ctl-btn {
  color: var(--color-muted);
}
.slide-display-panel .ctl-btn.active {
  background: var(--color-green);
  color: #fff;
}
.slide-display-panel .ctl-btn:hover {
  color: var(--color-green);
}
.slide-display-panel .ctl-btn.active:hover {
  color: #fff;
}
.slide-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 2.35rem;
  padding: 0.42rem 0.85rem;
  border: 1px solid rgba(24, 60, 50, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-green);
  box-shadow: 0 0.6rem 1.7rem rgba(17, 17, 17, 0.08);
  cursor: pointer;
  font-size: 0.92rem;
  line-height: 1;
}
.slide-tool-btn:hover {
  background: var(--color-green);
  color: #fff;
}
.export-active .slides-mode {
  width: min(100vh / 0.5625, 100vw);
  min-height: 100vh;
}
.slides-mode .hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  margin-bottom: 0;
  margin: -1rem;
  padding: 3rem;
  background: radial-gradient(circle at top right, rgba(24, 60, 50, 0.1), transparent 22rem), var(--color-surface);
}
.slides-mode .hero .audio-btn,
.slides-mode .block-play-btn,
.slides-mode .lesson-foot {
  display: none;
}
.slides-mode .block {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.2rem 1.6rem;
  border-top: none;
  page-break-before: always;
}
.slides-mode .block + .block {
  border-top: none;
}
.slides-mode .block-hd {
  margin-bottom: 1.4rem;
}
.slides-mode .block-content {
  flex: 1;
  align-content: center;
}
.slides-mode .vocab-grid {
  justify-content: center;
}
.slides-mode .block-content > .vocab-grid > .vocab-card {
  width: min(48rem, 94%);
  min-height: 20rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: none;
  background: transparent;
}
.slides-mode .slide-context {
  margin: 0 0 1.1rem;
  font-size: 1.05rem;
  color: var(--color-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.slides-mode .dialogue {
  max-width: unset;
  width: min(64rem, 100%);
  margin: 0 auto;
  gap: 1rem;
  justify-content: center;
}
.slides-mode .dia-bubble {
  max-width: 92%;
  gap: 1rem;
  align-items: center;
}
.slides-mode .dia-avatar {
  width: 5.4rem;
  height: 5.4rem;
  border-width: 3px;
}
.slides-mode .dia-sp {
  min-width: 5rem;
  height: 5rem;
  font-size: 1.35rem;
}
.slides-mode .dia-body {
  padding: 0.85rem 1.15rem;
  border-radius: 0.5rem;
}
.slides-mode .dia-current .dia-body {
  border-color: rgba(24, 60, 50, 0.28);
  box-shadow: 0 0.5rem 1.5rem rgba(24, 60, 50, 0.08);
}
.slides-mode .dia-context {
  opacity: 0.48;
  pointer-events: none;
}
.slides-mode .dia-context-next {
  opacity: 0.32;
}
.slides-mode .dia-context-next .dia-body {
  border-style: dashed;
}
.slides-mode .dia-context .dia-avatar {
  width: 3.4rem;
  height: 3.4rem;
  border-width: 2px;
}
.slides-mode .dia-context .dia-sp {
  min-width: 3.1rem;
  height: 3.1rem;
  font-size: 1rem;
}
.slides-mode .dia-context .dia-body {
  padding: 0.58rem 0.85rem;
}
.slides-mode .dia-context .dia-hak {
  font-size: 1.65rem;
}
.slides-mode .dia-context .dia-tr {
  font-size: 0.95rem;
}
.slides-mode .vocab-hak {
  font-size: 3.4rem;
}
.slides-mode .vocab-card.sm .vocab-hak {
  font-size: 3rem;
}
.slides-mode .vocab-mean {
  font-size: 1.25rem;
}
.slides-mode .dia-hak {
  font-size: 2.7rem;
}
.slides-mode .dia-tr {
  font-size: 1.25rem;
}
.slides-mode .sent-hak {
  font-size: 2.8rem;
}
.slides-mode .sent-tr {
  font-size: 1.25rem;
}
.slides-mode .sent-note {
  font-size: 1.25rem;
}
.slides-mode .prompt-list {
  justify-content: center;
  padding-left: 0;
  font-size: 2.2rem;
}
.slides-mode .sp-item {
  justify-content: center;
  min-height: 14rem;
  font-size: 2.35rem;
  text-align: center;
  background: transparent;
}
.slides-mode .sp-item::before {
  align-self: center;
  font-size: 1.25rem;
}
.slides-mode .note-item {
  width: min(54rem, 94%);
  margin: 0 auto;
  font-size: 1.75rem;
  color: var(--color-text);
}
.slides-mode :deep(.iterm) {
  font-size: 2.35rem;
  line-height: 1.65;
  padding: 0.15rem 0.45rem;
}
.slides-mode :deep(.iterm:has(.ruby)) {
  padding-top: 0.5em;
}
.slides-mode .block-type {
  font-size: 2.1rem;
}
.slides-mode .block-type-en {
  font-size: 1.35rem;
}
.slides-mode .hero h1 {
  font-size: 3.7rem;
}
.slides-mode .hero-sub {
  font-size: 1.35rem;
}
:deep(.slides-mode .hero-gloss) {
  font-size: 1.25rem;
}
.slides-mode .kicker {
  font-size: 1.2rem;
}
.slides-mode .block-desc {
  font-size: 1.55rem;
}
.slides-mode .row-play-btn {
  font-size: 1.1rem;
}
.section-end-mark {
  display: none;
}
.slides-mode .section-end-mark {
  position: absolute;
  left: 50%;
  bottom: 5.3rem;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: min(12rem, 45%);
  margin: 0;
  color: rgba(24, 60, 50, 0.48);
  font-size: 1.45rem;
  line-height: 1;
}
.export-active .slides-mode .section-end-mark {
  bottom: 3.2rem;
}
.slides-mode .section-end-mark::before,
.slides-mode .section-end-mark::after {
  content: "";
  display: block;
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.55;
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
  padding: 0.5rem;
  border-radius: 2rem;
  z-index: 35;
  transition: opacity 400ms ease, visibility 400ms ease;
}
.slide-nav-global.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.slide-nav-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  font-size: 1.5rem;
  line-height: 1;
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
  font-size: 0.88rem;
  line-height: 2.2rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-mono);
  min-width: 4rem;
  text-align: center;
  align-self: stretch;
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
    min-height: 2.9rem;
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
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.25rem;
  }
  .ctl-btn {
    min-height: 2rem;
    padding: 0.22rem 0.46rem;
    font-size: 0.72rem;
  }
  .rom-choice {
    min-width: 4rem;
    min-height: 2.15rem;
  }
  .mode-controls .ctl-btn {
    min-width: 3.45rem;
  }
  .view-menu-panel {
    right: -4.5rem;
  }
  .slides-mode .slide-meta-bar {
    top: 0.85rem;
    right: 1rem;
    left: 1rem;
    justify-content: center;
    gap: 0.55rem;
    max-width: none;
    font-size: 0.95rem;
    text-align: center;
  }
  .slide-project {
    font-size: 1rem;
  }
  .slide-lesson {
    font-size: 0.9rem;
  }
  .slide-tool-bar {
    top: 3.25rem;
    left: 1rem;
    right: 1rem;
    justify-content: space-between;
  }
  .slide-tool-btn {
    min-height: 2.4rem;
    padding: 0.45rem 0.8rem;
    font-size: 0.95rem;
  }
  .slide-display-panel {
    left: 0;
    right: auto;
    min-width: min(19rem, calc(100vw - 2rem));
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
  .ctl-slides-main span,
  .ctl-print span,
  .ctl-print {
    display: none;
  }
  .ctl-slides-main {
    min-width: 2rem;
  }
  .view-menu-panel {
    right: -2.8rem;
    min-width: min(18rem, calc(100vw - 1rem));
  }
}
</style>
