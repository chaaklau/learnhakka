#!/usr/bin/env node
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const audioDir = path.join(__dirname, 'public/audio')
const lessons = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/lessons.json'), 'utf8'))

function getDuration(file) {
  return parseFloat(execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${file}"`,
    { encoding: 'utf8' }
  ).trim())
}

function detectSilences(file, noise = '-30dB', minDur = 0.15) {
  const cmd = `ffmpeg -i "${file}" -af silencedetect=noise=${noise}:d=${minDur} -f null - 2>&1`
  const out = execSync(cmd, { encoding: 'utf8' })
  const gaps = []
  let curStart = null
  for (const line of out.split('\n')) {
    const sm = line.match(/silence_start:\s*([\d.]+)/)
    if (sm) curStart = parseFloat(sm[1])
    const em = line.match(/silence_end:\s*([\d.]+)/)
    if (em && curStart !== null) {
      gaps.push({ start: curStart, end: parseFloat(em[1]), dur: parseFloat(em[1]) - curStart })
      curStart = null
    }
  }
  return gaps
}

// Segment the audio into N item ranges, skipping the intro word.
// Uses the first silence gap as the intro boundary, then picks
// the N-1 longest remaining gaps to split the rest into N segments.
function getItemSegments(file, itemCount) {
  const totalDur = getDuration(file)
  if (itemCount <= 0) return []

  const gaps = detectSilences(file)

  // Find intro boundary: skip any leading silence (gap starting near 0),
  // then use the first real gap (after the intro word) as the boundary.
  let contentStart = 0
  let remainingGaps = gaps
  if (gaps.length > 0) {
    let introGapIdx = 0
    // If the first gap starts near 0, it's leading silence — skip it
    if (gaps[0].start < 0.15 && gaps.length > 1) {
      introGapIdx = 1
    }
    contentStart = (gaps[introGapIdx].start + gaps[introGapIdx].end) / 2
    remainingGaps = gaps.slice(introGapIdx + 1)
  }

  if (itemCount === 1) {
    return [[Math.round(contentStart * 100) / 100, Math.round(totalDur * 100) / 100]]
  }

  const needed = itemCount - 1 // split points for N items

  if (remainingGaps.length === 0) {
    const segDur = (totalDur - contentStart) / itemCount
    return Array.from({ length: itemCount }, (_, i) => [
      Math.round((contentStart + i * segDur) * 100) / 100,
      Math.round((contentStart + (i + 1) * segDur) * 100) / 100
    ])
  }

  let selectedGaps
  if (remainingGaps.length <= needed) {
    selectedGaps = remainingGaps
  } else {
    // Pick the longest N-1 gaps
    const sorted = [...remainingGaps].sort((a, b) => b.dur - a.dur)
    selectedGaps = sorted.slice(0, needed)
  }

  selectedGaps.sort((a, b) => a.start - b.start)
  const splitPoints = selectedGaps.map(g => (g.start + g.end) / 2)
  const points = [contentStart, ...splitPoints, totalDur]
  return points.slice(0, -1).map((s, i) => [
    Math.round(s * 100) / 100,
    Math.round(points[i + 1] * 100) / 100
  ])
}

function countBlockItems(block) {
  if (block.type === 'vocab' || (block.type === 'main' && typeof block.items === 'string')) {
    return block.items.split(/\s+/).filter(Boolean).length
  }
  if (Array.isArray(block.items)) {
    return block.items.filter(item => {
      if (typeof item === 'string') return true
      if (item && typeof item === 'object') return item.hak != null
      return false
    }).length
  }
  if (Array.isArray(block.rows)) {
    return block.rows.reduce((sum, row) => sum + row.length, 0)
  }
  return 0
}

function getBlockAudioFile(lessonId, block, blockIndex, blocks) {
  if (block.type === 'notes' || block.type === 'sentence_practice' || block.type === 'sentences') return null
  const sameType = []
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === block.type) sameType.push(i)
  }
  if (sameType.length > 1 && block.type === 'main') {
    const typeIdx = sameType.indexOf(blockIndex) + 1
    return `ch${lessonId}-main-${typeIdx}.m4a`
  }
  return `ch${lessonId}-${block.type}.m4a`
}

const timestamps = {}

for (const lesson of lessons) {
  const ch = lesson.id
  for (let bi = 0; bi < lesson.blocks.length; bi++) {
    const block = lesson.blocks[bi]
    const audioFile = getBlockAudioFile(ch, block, bi, lesson.blocks)
    if (!audioFile) continue
    const fullPath = path.join(audioDir, audioFile)
    if (!fs.existsSync(fullPath)) {
      console.log(`  SKIP ${audioFile} (not found)`)
      continue
    }

    const itemCount = countBlockItems(block)
    if (itemCount === 0) continue

    console.log(`Processing ${audioFile} (${itemCount} items, skipping intro)...`)
    const itemSegments = getItemSegments(fullPath, itemCount)

    const key = audioFile.replace('.m4a', '')
    timestamps[key] = itemSegments

    if (itemSegments.length !== itemCount) {
      console.log(`  WARNING: got ${itemSegments.length} segments, expected ${itemCount}`)
    } else {
      console.log(`  OK: ${itemSegments.length} segments`)
    }
  }
}

let out = '{\n'
const keys = Object.keys(timestamps)
keys.forEach((k, i) => {
  const arr = timestamps[k].map(a => '[' + a.join(',') + ']')
  out += '  "' + k + '": [' + arr.join(', ') + ']' + (i < keys.length - 1 ? ',' : '') + '\n'
})
out += '}\n'

fs.writeFileSync(path.join(__dirname, 'public/timestamps.json'), out)
console.log('\nWrote public/timestamps.json')
