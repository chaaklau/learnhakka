#!/usr/bin/env node
/**
 * One-time helper for adding inferred romanization to A2 lesson JSON.
 *
 * This mirrors the website UI's current fallback algorithm:
 * - prefer exact/full-sentence lexicon entries
 * - otherwise greedily match the longest lexicon entry from left to right
 * - preserve sentence_practice/sentences without romanization
 * - convert vocab/token strings and practice rows into { hak, rom } objects
 *
 * Usage:
 *   node add-rom-a2.cjs
 */

const fs = require('fs')
const path = require('path')

const root = __dirname
const lessonsDir = path.join(root, 'public', 'data', 'lessons')
const lexiconPath = path.join(root, 'public', 'lexicon.csv')
const targetLessonIds = Array.from({ length: 10 }, (_, i) => i + 11)

function parseCsvLine(line) {
  const fields = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        q = false
      } else {
        cur += c
      }
    } else if (c === '"') {
      q = true
    } else if (c === ',') {
      fields.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur)
  return fields
}

function trimSentenceBoundaryPunctuation(text) {
  return String(text).replace(/^[\p{P}\p{S}\p{Z}\s]+|[\p{P}\p{S}\p{Z}\s]+$/gu, '')
}

function addLexiconEntry(map, hak, entry) {
  if (!map.has(hak)) map.set(hak, [])
  map.get(hak).push(entry)
}

function loadLexicon() {
  const lexicon = new Map()
  const sentenceLexicon = new Map()
  const lines = fs.readFileSync(lexiconPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const [hak, rom, zh, en, unproofread] = parseCsvLine(line)
    if (!hak) continue

    const entry = {
      hak,
      rom: rom || '',
      zh: zh || '',
      en: en || '',
      unproofread: unproofread === '1',
    }
    addLexiconEntry(lexicon, hak, entry)

    const normalizedHak = trimSentenceBoundaryPunctuation(hak)
    if (normalizedHak) addLexiconEntry(sentenceLexicon, normalizedHak, entry)
  }

  return { lexicon, sentenceLexicon }
}

function looksLikeRomOverride(text) {
  return /^[A-Za-z]+[1-6]?(?:[\s,]+[A-Za-z]+[1-6]?)*$/.test(text)
}

function parseToken(raw) {
  const s = typeof raw === 'string' ? raw : raw?.hak || ''
  const dot = s.indexOf('.')
  if (dot === -1) return { hak: s, overrideRom: '' }

  const overrideRom = s.slice(dot + 1)
  if (!looksLikeRomOverride(overrideRom)) return { hak: s, overrideRom: '' }
  return { hak: s.slice(0, dot), overrideRom }
}

const { lexicon, sentenceLexicon } = loadLexicon()

function getLexiconEntry(raw) {
  const { hak, overrideRom } = parseToken(raw)
  const entries = lexicon.get(hak) || []

  if (overrideRom) {
    const match = entries.find((entry) => entry.rom === overrideRom)
    if (match) return match
    return { hak, rom: overrideRom, zh: entries[0]?.zh || '', en: entries[0]?.en || '', unproofread: false }
  }

  return entries[0] || { hak, rom: '', zh: '', en: '', unproofread: false }
}

function getSentenceLexiconEntry(raw) {
  const exactEntry = getLexiconEntry(raw)
  if (exactEntry.rom) return exactEntry

  const normalizedHak = trimSentenceBoundaryPunctuation(typeof raw === 'string' ? raw : raw?.hak || '')
  const entries = normalizedHak ? sentenceLexicon.get(normalizedHak) : null
  return entries?.[0] || exactEntry
}

const punctuationMap = {
  '。': '.',
  '？': '?',
  '！': '!',
  '，': ',',
  '、': ',',
  '；': ';',
  '：': ':',
  '（': '(',
  '）': ')',
  '「': '"',
  '」': '"',
  '『': '"',
  '』': '"',
}

function convertPunctuation(ch) {
  return punctuationMap[ch] || ch
}

function isBoundary(ch) {
  return /[\p{P}\p{S}\p{Z}\s]/u.test(ch)
}

function normalizeRomPunctuation(rom) {
  return String(rom || '')
    .replace(/[。]/g, '.')
    .replace(/[？]/g, '?')
    .replace(/[！]/g, '!')
    .replace(/[，、]/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*([.!?;:])\s*/g, '$1 ')
    .trim()
}

function joinRomParts(parts) {
  return parts
    .join(' | ')
    .replace(/([.!?]) \| /g, '$1 ')
    .replace(/([,;:]) \| /g, '$1 ')
    .replace(/\( \| /g, '(')
    .replace(/ \| \)/g, ')')
    .trim()
}

function inferredRom(raw, options = {}) {
  const text = typeof raw === 'string' ? raw : raw?.hak || ''
  if (!text) return ''

  const token = parseToken(raw)
  if (token.overrideRom && token.hak !== text) return token.overrideRom

  if (options.useFullEntry !== false) {
    const fullEntry = getSentenceLexiconEntry(text)
    if (fullEntry.rom) return normalizeRomPunctuation(fullEntry.rom)
  }

  const parts = []
  let pendingPunctuation = ''
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (isBoundary(ch)) {
      if (parts.length) {
        parts[parts.length - 1] += convertPunctuation(ch)
      } else {
        pendingPunctuation += convertPunctuation(ch)
      }
      i++
      continue
    }

    let bestLen = 0
    let bestEntry = null
    const maxLen = Math.min(6, text.length - i)
    for (let len = maxLen; len >= 1; len--) {
      const candidate = text.slice(i, i + len)
      const entries = lexicon.get(candidate)
      if (entries && entries[0]?.rom) {
        bestLen = len
        bestEntry = entries[0]
        break
      }
    }

    if (bestEntry) {
      parts.push(pendingPunctuation + bestEntry.rom)
      pendingPunctuation = ''
      i += bestLen
    } else {
      i++
    }
  }

  if (pendingPunctuation && parts.length) parts[parts.length - 1] += pendingPunctuation
  return joinRomParts(parts)
}

function withRomAfterHak(obj, rom) {
  const out = {}
  let inserted = false

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'rom') continue
    out[key] = value
    if (key === 'hak') {
      if (rom) out.rom = rom
      inserted = true
    }
  }

  if (!inserted && rom) out.rom = rom
  return out
}

function tokenObject(raw) {
  const { hak, overrideRom } = parseToken(raw)
  const rom = overrideRom || inferredRom(hak)
  return rom ? { hak, rom } : { hak }
}

function addRomToHakObject(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item) || item.hak == null) return item
  return withRomAfterHak(item, inferredRom(item.hak))
}

function annotateNoteText(text) {
  if (typeof text !== 'string') return text
  return text.replace(/\{(?!\{)([^{}]+)\}(?!\})/g, (match, inner) => {
    if (/:\s*[A-Za-z]/.test(inner)) return match
    const rom = inferredRom(inner, { useFullEntry: false })
    return rom ? `{${inner}: ${rom}}` : match
  })
}

function compactStringify(obj, indent = 2) {
  return serialize(obj, 0, indent)
}

function serialize(val, depth, indent) {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'boolean' || typeof val === 'number') return JSON.stringify(val)
  if (typeof val === 'string') return JSON.stringify(val)

  const pad = ' '.repeat(depth * indent)
  const innerPad = ' '.repeat((depth + 1) * indent)

  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'

    if (val.every((v) => typeof v === 'string')) {
      const oneLine = '[' + val.map((s) => JSON.stringify(s)).join(', ') + ']'
      if (oneLine.length < 120) return oneLine
    }

    if (val.every((v) => Array.isArray(v) && v.every((cell) => typeof cell === 'string'))) {
      return '[\n' + val.map((row) => {
        return innerPad + '[' + row.map((s) => JSON.stringify(s)).join(', ') + ']'
      }).join(',\n') + '\n' + pad + ']'
    }

    if (val.every((v) => Array.isArray(v) && v.every((cell) => cell && typeof cell === 'object' && !Array.isArray(cell)))) {
      return '[\n' + val.map((row) => {
        return innerPad + '[' + row.map((cell) => JSON.stringify(cell)).join(', ') + ']'
      }).join(',\n') + '\n' + pad + ']'
    }

    if (val.every((v) => v && typeof v === 'object' && !Array.isArray(v))) {
      const compactItems = val.map((item) => {
        const oneLine = JSON.stringify(item)
        return oneLine.length < 260 ? oneLine : null
      })
      if (compactItems.every(Boolean)) {
        return '[\n' + compactItems.map((item) => innerPad + item).join(',\n') + '\n' + pad + ']'
      }
    }

    return '[\n' + val.map((v) => innerPad + serialize(v, depth + 1, indent)).join(',\n') + '\n' + pad + ']'
  }

  const keys = Object.keys(val)
  if (!keys.length) return '{}'

  const oneLine = JSON.stringify(val)
  if (oneLine.length < 100 && !keys.some((key) => typeof val[key] === 'object' && val[key] !== null)) {
    return oneLine
  }

  return '{\n' + keys.map((key) => {
    return innerPad + JSON.stringify(key) + ': ' + serialize(val[key], depth + 1, indent)
  }).join(',\n') + '\n' + pad + '}'
}

function updateLesson(lesson) {
  if (lesson.title?.hak) {
    lesson.title = withRomAfterHak(lesson.title, inferredRom(lesson.title.hak, { useFullEntry: false }))
  }

  for (const block of lesson.blocks || []) {
    if ((block.type === 'vocab' || block.type === 'main') && typeof block.items === 'string') {
      block.items = block.items.split(/\s+/).filter(Boolean).map(tokenObject)
    } else if (Array.isArray(block.items) && block.type !== 'sentence_practice' && block.type !== 'sentences') {
      if (block.type === 'notes') {
        block.items = block.items.map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return item
          const out = { ...item }
          if (out.zh) out.zh = annotateNoteText(out.zh)
          if (out.en) out.en = annotateNoteText(out.en)
          return out
        })
      } else {
        block.items = block.items.map(addRomToHakObject)
      }
    }

    if (Array.isArray(block.rows)) {
      block.rows = block.rows.map((row) => row.map((cell) => {
        if (typeof cell === 'string') return tokenObject(cell)
        return addRomToHakObject(cell)
      }))
    }
  }

  return lesson
}

for (const id of targetLessonIds) {
  const file = path.join(lessonsDir, `lesson-${String(id).padStart(2, '0')}.json`)
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'))
  fs.writeFileSync(file, compactStringify(updateLesson(lesson)) + '\n', 'utf8')
  console.log(`updated lesson-${String(id).padStart(2, '0')}.json`)
}
