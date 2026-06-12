#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dataDir = path.join(root, 'public', 'data')
const index = readJson(path.join(dataDir, 'index.json'))
const errors = []

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function existsDataFile(file) {
  return fs.existsSync(path.join(dataDir, file))
}

function playableUnitCount(block) {
  if (block.type === 'vocab' || (block.type === 'main' && isTokenList(block.items))) {
    return tokenize(block.items).length
  }
  if (Array.isArray(block.rows)) return block.rows.length
  if (Array.isArray(block.items)) return block.items.length
  return 0
}

function tokenize(items) {
  if (typeof items === 'string') return items.split(/\s+/).filter(Boolean)
  if (Array.isArray(items)) {
    return items.filter(item => typeof item === 'string' || (item && typeof item === 'object' && item.hak != null))
  }
  return []
}

function isTokenList(items) {
  return typeof items === 'string' || (Array.isArray(items) && items.every(item => {
    if (typeof item === 'string') return true
    return item && typeof item === 'object' && item.hak != null && item.zh == null && item.en == null && item.note == null && item.sp == null
  }))
}

function fail(scope, message) {
  errors.push(`${scope}: ${message}`)
}

for (const entry of index) {
  const lessonScope = `lesson ${entry.id}`
  if (!entry.file) fail(lessonScope, 'missing lesson file in index')
  if (!entry.media) fail(lessonScope, 'missing media file in index')
  if (entry.file && !existsDataFile(entry.file)) fail(lessonScope, `missing ${entry.file}`)
  if (entry.media && !existsDataFile(entry.media)) fail(lessonScope, `missing ${entry.media}`)
  if (!entry.file || !existsDataFile(entry.file)) continue

  const lesson = readJson(path.join(dataDir, entry.file))
  const blockIds = new Set()
  const blocksById = new Map()

  if (lesson.id !== entry.id) fail(lessonScope, `index id ${entry.id} does not match lesson id ${lesson.id}`)

  for (let i = 0; i < lesson.blocks.length; i++) {
    const block = lesson.blocks[i]
    const blockScope = `${lessonScope} block ${i}`
    if (!block.id) fail(blockScope, 'missing stable id')
    if (block.audio) fail(blockScope, 'audio belongs in media JSON')
    if (block.timestamps) fail(blockScope, 'timestamps belong in media JSON')
    if (block.id && blockIds.has(block.id)) fail(blockScope, `duplicate block id ${block.id}`)
    if (block.id) {
      blockIds.add(block.id)
      blocksById.set(block.id, block)
    }
  }

  if (!entry.media || !existsDataFile(entry.media)) continue
  const media = readJson(path.join(dataDir, entry.media))
  if (media.lessonId !== lesson.id) fail(lessonScope, `media lessonId ${media.lessonId} does not match lesson id ${lesson.id}`)
  if (media.titleAudio && !existsDataFile(media.titleAudio)) fail(lessonScope, `missing title audio ${media.titleAudio}`)

  for (const [blockId, blockMedia] of Object.entries(media.blocks || {})) {
    const blockScope = `${lessonScope} media ${blockId}`
    const block = blocksById.get(blockId)
    if (!block) {
      fail(blockScope, 'does not point to a lesson block')
      continue
    }
    if (blockMedia.audio && !existsDataFile(blockMedia.audio)) fail(blockScope, `missing audio ${blockMedia.audio}`)
    if (blockMedia.segments) {
      const expected = playableUnitCount(block)
      if (blockMedia.segments.length !== expected) {
        fail(blockScope, `has ${blockMedia.segments.length} segments, expected ${expected}`)
      }
      let previousEnd = -Infinity
      for (let i = 0; i < blockMedia.segments.length; i++) {
        const segment = blockMedia.segments[i]
        if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end)) {
          fail(blockScope, `segment ${i} start/end must be finite numbers`)
        } else if (segment.end <= segment.start) {
          fail(blockScope, `segment ${i} must end after it starts`)
        } else if (segment.start < previousEnd - 0.15) {
          fail(blockScope, `segment ${i} starts before the previous segment ends`)
        }
        previousEnd = Number.isFinite(segment.end) ? segment.end : previousEnd
      }
    }
  }
}

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Data validation passed for ${index.length} lessons.`)
