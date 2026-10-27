import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { romToDiacritics } from '../src/romanization.js'

test('renders all six tones, with a breve for tones 3 and 5', () => {
  assert.equal(romToDiacritics('si1 si2 si3 si4 sit5 sit6'), 'sí sī sĭ sì sĭt sìt')
  assert.equal(romToDiacritics('ng3').normalize('NFD'), 'n\u0306g')
})

test('preserves the readings previously hardcoded in language notes', () => {
  for (const [numeric, previous] of [
    ['lau3', 'la\u0306u'], ['ga3', 'ga\u0306'], ['zu3', 'zŭ'],
    ['ngi3', 'ngĭ'], ['giok5', 'giŏk'], ['git5', 'gĭt'],
    ['mia3?', 'mia\u0306?'], ['i', 'i'],
  ]) assert.equal(romToDiacritics(numeric), previous.normalize('NFC'))
})

test('lesson notes store tone numbers rather than hardcoded tone marks', () => {
  const dir = new URL('../public/data/lessons/', import.meta.url)
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const text = readFileSync(new URL(file, dir), 'utf8')
    for (const [, inline] of text.matchAll(/`([^`]+)`/g)) {
      assert.doesNotMatch(inline.normalize('NFD'), /[\u0300\u0301\u0304\u0306\u030c]/u, `${file}: ${inline}`)
    }
  }
})
