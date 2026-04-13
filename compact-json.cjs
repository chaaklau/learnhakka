#!/usr/bin/env node
/**
 * Reformat all lesson JSON files for human-readability:
 * - Top-level structure pretty-printed (2-space indent)
 * - Short inner arrays (timestamps, rows, items strings) collapsed to single lines
 * - Dialogue items compacted to single lines
 *
 * Usage: node compact-json.cjs
 */

const fs = require('fs')
const path = require('path')

const dataDir = path.join(__dirname, 'public/data')
const lessonsDir = path.join(dataDir, 'lessons')

// Smart JSON serializer: pretty-prints but collapses "leaf" arrays onto one line
function compactStringify(obj, indent) {
  indent = indent || 2
  return _serialize(obj, 0, indent)
}

function _serialize(val, depth, indent) {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'boolean' || typeof val === 'number') return JSON.stringify(val)
  if (typeof val === 'string') return JSON.stringify(val)

  const pad = ' '.repeat(depth * indent)
  const innerPad = ' '.repeat((depth + 1) * indent)

  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'

    // Timestamp-like: array of [number, number] pairs
    if (val.every(v => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number'))) {
      const pairs = val.map(p => `[${p[0]}, ${p[1]}]`)
      const oneLine = `[${pairs.join(', ')}]`
      if (oneLine.length < 100) return oneLine
      // Multi-line but each pair on its own line
      return '[\n' + pairs.map(p => innerPad + p).join(',\n') + '\n' + pad + ']'
    }

    // Row of strings (e.g. practice grid rows): collapse to one line
    if (val.every(v => typeof v === 'string')) {
      const oneLine = '[' + val.map(s => JSON.stringify(s)).join(', ') + ']'
      if (oneLine.length < 120) return oneLine
    }

    // Array of string-arrays (rows): each sub-array on one line
    if (val.every(v => Array.isArray(v) && v.every(s => typeof s === 'string'))) {
      const lines = val.map(row => {
        return innerPad + '[' + row.map(s => JSON.stringify(s)).join(', ') + ']'
      })
      return '[\n' + lines.join(',\n') + '\n' + pad + ']'
    }

    // Dialogue/main items: compact objects with hak/sp/zh/en onto one line if short enough
    if (val.every(v => typeof v === 'object' && !Array.isArray(v) && v !== null)) {
      const compactItems = val.map(item => {
        const oneLine = JSON.stringify(item)
        return oneLine.length < 200 ? oneLine : null
      })
      if (compactItems.every(c => c !== null)) {
        const joined = compactItems.map(c => innerPad + c).join(',\n')
        return '[\n' + joined + '\n' + pad + ']'
      }
    }

    // Default: expand normally
    const items = val.map(v => innerPad + _serialize(v, depth + 1, indent))
    return '[\n' + items.join(',\n') + '\n' + pad + ']'
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val)
    if (keys.length === 0) return '{}'

    // Small objects (like {hak, en} titles) on one line
    const oneLine = JSON.stringify(val)
    if (oneLine.length < 80 && !keys.some(k => typeof val[k] === 'object' && val[k] !== null)) {
      return oneLine
    }

    const entries = keys.map(k => {
      return innerPad + JSON.stringify(k) + ': ' + _serialize(val[k], depth + 1, indent)
    })
    return '{\n' + entries.join(',\n') + '\n' + pad + '}'
  }

  return JSON.stringify(val)
}

// Process all lesson files
const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json')).sort()
for (const file of files) {
  const filePath = path.join(lessonsDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const output = compactStringify(data) + '\n'
  fs.writeFileSync(filePath, output, 'utf-8')
  console.log(`✓ ${file}`)
}

// Also compact index.json
const indexPath = path.join(dataDir, 'index.json')
if (fs.existsSync(indexPath)) {
  const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
  fs.writeFileSync(indexPath, compactStringify(data) + '\n', 'utf-8')
  console.log('✓ index.json')
}

console.log('\nDone.')
