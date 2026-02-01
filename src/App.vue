<template>
  <div v-if="loading" class="loading-screen">
    Loading...
  </div>
  <div v-else class="app-container">
    <!-- Sidebar Navigation -->
    <aside class="sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
      <div class="sidebar-header">
        <h2>香港客家話入門</h2>
        <div class="subtitle">Introduction to Hong Kong Hakka</div>
        <div class="subtitle org-name">Produced by 客家大學堂</div>
      </div>
      
      <nav class="main-nav">
        <ul>
          <li><a href="#" class="nav-link">About</a></li>
          <li><a href="#" class="nav-link">Tools</a></li>
        </ul>
      </nav>

      <div class="nav-divider"></div>
      
      <nav class="lesson-nav">
        <div class="nav-label">Lessons</div>
        <ul>
          <li v-for="lesson in lessons" :key="lesson.id" 
              :class="{ active: currentLesson && currentLesson.id === lesson.id }"
              @click="selectLesson(lesson)">
            <span class="lesson-num">{{ lesson.id }}.</span>
            <span class="lesson-title font-hakka">{{ lesson.title.hak }}</span>
          </li>
        </ul>
      </nav>
      
      <div class="sidebar-footer">
        <p>By Prof 劉鎮發</p>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="top-bar">
        <button class="menu-toggle" @click="toggleSidebar">☰</button>
        <div class="settings">
          <button class="btn" :class="{ active: displayLang === 'zh' }" @click="displayLang = 'zh'">中文</button>
          <button class="btn" :class="{ active: displayLang === 'en' }" @click="displayLang = 'en'">EN</button>
        </div>
      </header>

      <div class="content-scroll" v-if="currentLesson">
        <div class="lesson-container">
          <!-- Lesson Header -->
          <div class="lesson-header">
            <div class="lesson-meta">Lesson {{ currentLesson.id }}</div>
            <h1 class="font-hakka">{{ currentLesson.title.hak }}</h1>
            <div class="font-rom" style="margin-bottom: 0.5rem">{{ currentLesson.title.rom }}</div>
            <div class="subtle-trans" style="font-size: 1rem">{{ currentLesson.title.en }}</div>
          </div>

          <!-- Blocks -->
          <div v-for="(block, index) in currentLesson.blocks" :key="index" class="content-block">
            <h3 class="block-title">{{ getHeading(block.type) }}</h3>
            
            <!-- Vocab Block -->
            <div v-if="block.type === 'vocab'" class="vocab-grid">
              <div v-for="(item, i) in block.items" :key="i" class="vocab-card">
                <div class="vocab-main">
                  <span class="font-hakka">{{ item.hak }}</span>
                  <button class="audio-btn" title="Play Audio" @click="playAudio(currentLesson.id, 'vocab', item.rom)">🔊</button>
                </div>
                <!-- Rom with proofread check -->
                <div class="font-rom" :class="{ 'unproofread': item.rom && item.rom.trim().endsWith('*') }">
                  {{ item.rom }}
                </div>
                <div class="vocab-desc">
                  {{ getDesc(item) }}
                </div>
              </div>
            </div>

            <!-- Dialogue Block -->
            <div v-else-if="block.type === 'dialogue'" class="dialogue-list">
              <div v-for="(item, i) in block.items" :key="i" class="dialogue-row">
                <div class="speaker">{{ item.sp }}</div>
                <div class="dialogue-content">
                  <div class="font-hakka">
                    {{ item.hak }}
                    <button class="audio-btn" @click="playAudio(currentLesson.id, 'dialogue', i)">🔊</button>
                  </div>
                  <div class="subtle-trans">{{ getDesc(item) }}</div>
                </div>
              </div>
            </div>

            <!-- Sentence Practice -->
            <div v-else-if="block.type === 'sentence_practice'" class="practice-list">
              <div v-for="(item, i) in block.items" :key="i" class="practice-row">
                <div class="font-hakka text-lg">
                  {{ item.hak }}
                  <button class="audio-btn" @click="playAudio(currentLesson.id, 'sentence', i)">🔊</button>
                </div>
                <div v-if="item.rom" class="font-rom">{{ item.rom }}</div>
                <div class="subtle-trans" v-html="processText(getDesc(item))"></div>
              </div>
            </div>

            <!-- Pronunciation Practice -->
            <div v-else-if="block.type === 'pronunciation_practice'" class="pronunciation-block">
              <div v-if="block.description" class="pronunciation-desc">
                 <span class="font-hakka">{{ block.description.hak }}</span>
                 <span class="font-rom ml-2">{{ block.description.rom }}</span>
                 <button class="audio-btn" @click="playAudio(currentLesson.id, 'pronunciation_desc')">🔊</button>
              </div>
              <div class="pronunciation-grid-wrapper">
                <table class="pronunciation-table">
                  <tbody>
                    <tr v-for="(row, r) in block.rows" :key="r">
                      <td v-for="(cell, c) in row" :key="c" @click="playAudio(currentLesson.id, 'pronunciation', r, c)" class="interactive-cell">
                        <template v-if="typeof cell === 'object'">
                          <div class="font-hakka">{{ cell.hak }}</div>
                          <div class="font-rom" :class="{'unproofread': cell.rom && cell.rom.endsWith('*')}">{{ cell.rom }}</div>
                        </template>
                        <template v-else>
                          {{ cell }}
                        </template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Grammar Notes -->
            <div v-else-if="block.type === 'grammar_notes'" class="notes-list">
              <div v-for="(item, i) in block.items" :key="i" class="note-item">
                 <div v-html="processText(getDesc(item))"></div>
              </div>
            </div>

            <!-- Proverbs / Rhymes -->
            <div v-else-if="['proverbs', 'nursery_rhymes'].includes(block.type)" class="rhyme-list">
              <div v-for="(item, i) in block.items" :key="i" class="rhyme-card" @click="playAudio(currentLesson.id, block.type === 'proverbs' ? 'proverb' : 'rhyme', i)">
                 <div class="font-hakka text-center text-xl mb-1">
                   {{ item.hak }}
                   <div class="text-xs text-center text-gray-400 mt-1">🔊</div>
                  </div>
                 <div class="font-rom text-center mb-2">{{ item.rom }}</div>
                 <div class="text-center subtle-trans">{{ getDesc(item) }}</div>
              </div>
            </div>
            
            <!-- Fallback -->
            <div v-else>
              Unknown block type: {{ block.type }}
            </div>

          </div>
        </div>
        
        <!-- Navigation Buttons -->
        <div class="lesson-footer-nav" v-if="lessons.length > 0">
          <button v-if="currentIndex > 0" @click="selectLesson(lessons[currentIndex - 1])" class="btn">
            &larr; Previous Lesson
          </button>
          <span style="flex-grow:1"></span>
          <button v-if="currentIndex < lessons.length - 1" @click="selectLesson(lessons[currentIndex + 1])" class="btn">
            Next Lesson &rarr;
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const lessons = ref([])
const currentLessonId = ref(null)
const isSidebarOpen = ref(false) // Mobile sidebar state
const displayLang = ref('zh') // 'zh' | 'en'

// Headings map
const headings = {
  "vocab": "生字",
  "dialogue": "課文",
  "sentence_practice": "造句練習",
  "pronunciation_practice": "發音練習",
  "proverbs": "諺語",
  "nursery_rhymes": "童謠",
  "grammar_notes": "客家話知識"
}

const currentLesson = computed(() => {
  return lessons.value.find(l => l.id === currentLessonId.value)
})

const currentIndex = computed(() => {
  return lessons.value.findIndex(l => l.id === currentLessonId.value)
})

onMounted(async () => {
  try {
    const response = await fetch('./lessons.json')
    if (!response.ok) throw new Error("Failed to load")
    const data = await response.json()
    lessons.value = data
    if (data.length > 0) {
      currentLessonId.value = data[0].id
    }
  } catch (e) {
    console.error("Error loading lessons:", e)
  } finally {
    loading.value = false
  }
})

function selectLesson(lesson) {
  currentLessonId.value = lesson.id
  isSidebarOpen.value = false // Close sidebar on mobile on select
  // Scroll to top
  const el = document.querySelector('.content-scroll')
  if (el) el.scrollTop = 0
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function getHeading(type) {
  return headings[type] || type
}

// Get correct description language, fallback to ZH if EN missing
function getDesc(item) {
  if (displayLang.value === 'en') {
    return item.en || item.zh || ''
  }
  return item.zh || ''
}

// Process {hakka} text to specific font spans
function processText(text) {
  if (!text) return ''
  return text.replace(/\{(.*?)\}/g, '<span class="inline-hakka">$1</span>')
}

function sanitizeFilename(text) {
  if (!text) return 'unknown';
  // Lowercase, replace spaces with _, remove/replace problematic chars if needed
  // Keeping diacritics as requested implicitly by "use rom" to distinguish words.
  // trim() to remove leading/trailing spaces
  return text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[\?\.!,]/g, '');
}

function playAudio(lessonId, type, identifier, col) {
  // Pad lesson ID (e.g., 1 -> "01")
  const l = String(lessonId).padStart(2, '0');
  
  let filename = '';
  
  if (type === 'vocab') {
    // identifier is the rom string
    // e.g. "ngī" -> "ngī.mp3" (or "ngi.mp3" if we strip accents, but let's keep them distinctive)
    // We sanitize to be safe for URLs (remove spaces etc)
    const safeName = sanitizeFilename(identifier);
    filename = `${safeName}.mp3`;
  } else if (type === 'pronunciation') {
    // pronunciation_01_02.mp3 (row_col) 1-based
    const r = String(identifier + 1).padStart(2, '0');
    const c = String(col + 1).padStart(2, '0');
    filename = `${type}_${r}_${c}.mp3`;
  } else if (type === 'pronunciation_desc') {
    filename = 'pronunciation_desc.mp3';
  } else {
    // identifier is index (0-based)
    const i = String(identifier + 1).padStart(2, '0');
    filename = `${type}_${i}.mp3`;
  }
  
  const path = `./audio/lesson${l}/${filename}`;
  
  const audio = new Audio(path);
  audio.play().catch(e => {
    console.warn("Audio file not found:", path);
  });
}
</script>

<style scoped>
.loading-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: var(--color-accent);
}

.app-container {
  display: flex;
  width: 100%;
  height: 100%;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  z-index: 10;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-accent-light);
}
.sidebar-header h2 {
  margin: 0;
  color: var(--color-accent);
  font-family: var(--font-serif);
}
.subtitle {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.2rem;
}
.org-name {
  font-size: 0.75rem;
  font-style: italic;
  margin-top: 0.5rem;
  color: var(--color-accent);
}

.main-nav {
  padding: 0.5rem 1.5rem;
}
.main-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.nav-link {
  display: block;
  padding: 0.5rem 0;
  color: var(--color-text);
  text-decoration: none;
  font-weight: 500;
}
.nav-link:hover {
  color: var(--color-accent);
}

.nav-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 1rem 1.5rem;
}

.nav-label {
  padding: 0 1.5rem 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #999;
  letter-spacing: 0.05em;
}

.lesson-nav {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}
.lesson-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.lesson-nav li {
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: baseline;
}
.lesson-nav li:hover {
  background-color: #f9f9f9;
}
.lesson-nav li.active {
  background-color: rgba(125, 138, 104, 0.1);
  border-left-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: bold;
}
.lesson-num {
  font-family: var(--font-mono);
  margin-right: 8px;
  font-size: 0.8em;
  color: #999;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
  color: #999;
  text-align: center;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden; /* Prevent body scroll */
}

.top-bar {
  padding: 0.75rem 1.5rem;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.menu-toggle {
  display: none; /* Hidden on desktop */
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text);
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: var(--color-bg);
}

.lesson-container {
  max-width: 900px;
  margin: 0 auto;
  background-color: var(--color-surface);
  padding: 3rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
  border-radius: 8px;
  min-height: 80vh;
}

.lesson-meta {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}
.lesson-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px dashed var(--color-border);
}
.lesson-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  color: #2c3e50;
}

.block-title {
  margin: 2.5rem 0 1.5rem 0;
  font-family: var(--font-serif);
  font-size: 1.25rem;
  color: #333;
  display: flex;
  align-items: center;
}
.block-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 1.25rem;
  background-color: var(--color-accent);
  margin-right: 12px;
}

/* Vocab Grid - Compact Layout */
.vocab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.vocab-card {
  border: 1px solid var(--color-border);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  background-color: #fafafa;
  transition: transform 0.2s, box-shadow 0.2s;
}
.vocab-card:hover {
  background-color: #fff;
  border-color: var(--color-accent);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.vocab-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}
.vocab-desc {
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.5rem;
  border-top: 1px dotted #e5e7eb;
  padding-top: 0.5rem;
  line-height: 1.4;
}

.unproofread {
  color: var(--color-error);
}

/* Dialogue */
.dialogue-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.dialogue-row {
  display: flex;
  gap: 1rem;
}
.speaker {
  font-weight: bold;
  color: var(--color-accent);
  width: 2rem;
  flex-shrink: 0;
}
.dialogue-content {
  flex: 1;
}
.subtle-trans {
  font-size: 0.9rem;
  color: #999;
  margin-top: 0.25rem;
  font-family: var(--font-sans);
}

/* Practice Lists */
.practice-row {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}
.practice-row:last-child {
  border-bottom: none;
}

/* Pronunciation Table */
.pronunciation-grid-wrapper {
  overflow-x: auto;
}
.pronunciation-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}
.pronunciation-table td {
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  text-align: center;
}
.pronunciation-desc {
  margin-bottom: 1rem;
  text-align: center;
  background: var(--color-accent-light);
  padding: 0.5rem;
  border-radius: 4px;
}

/* Rhymes */
.rhyme-card {
  background-color: #fdfdfd;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  border: 1px dashed var(--color-border);
}

.interactive-cell {
  cursor: pointer;
  transition: background-color 0.2s;
}
.interactive-cell:hover {
  background-color: #f0f7f0;
}
.rhyme-card {
  cursor: pointer;
  transition: all 0.2s;
}
.rhyme-card:hover {
  border-color: var(--color-accent);
  background-color: #fbfdfb;
}

.lesson-footer-nav {
  display: flex;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    height: 100%;
    transform: translateX(-100%);
    box-shadow: 2px 0 5px rgba(0,0,0,0.1);
  }
  .sidebar-open {
    transform: translateX(0);
  }
  
  .menu-toggle {
    display: block; 
  }
  
  .lesson-container {
    padding: 1.5rem;
  }
  
  .content-scroll {
    padding: 1rem; 
  }
  
  .lesson-header h1 {
    font-size: 1.8rem;
  }
}
</style>
