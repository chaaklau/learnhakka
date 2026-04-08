#!/usr/bin/env node
/**
 * Conversion script:
 * 1. Converts lexicon.json → lexicon.csv (diacritics → numerical tones)
 * 2. Rewrites lessons.json to compact format (removes rom, compacts vocab)
 */

const fs = require('fs');
const path = require('path');

const lexiconPath  = path.join(__dirname, 'public/lexicon.json');
const lessonsPath  = path.join(__dirname, 'public/lessons.json');
const csvOutPath   = path.join(__dirname, 'public/lexicon.csv');
const jsonOutPath  = path.join(__dirname, 'public/lessons.json');

const lexiconRaw = JSON.parse(fs.readFileSync(lexiconPath, 'utf-8'));
const lessonsRaw = JSON.parse(fs.readFileSync(lessonsPath, 'utf-8'));

// Load original proverb/nursery_rhyme roms from backup (git version compacted)
// keyed by hak text
const proverbRomMap = {
  "一代親，二代表，三代閒了了。": "yit5 toi4 cin1, ngi4 toi4 biau3, sam1 toi4 han2 liau3 liau3",
  "人冇千日好，花冇百日紅。": "ngin2 mau2 cien1 ngit6 hau3, fa1 mau2 bat5 ngit6 fung1",
  "瓠打瓠，瓜打瓜，唔係像阿㜆就像阿爸。": "pu2 da3 pu2, ga1 da3 ga1, m he4 ciong4 a1 mi2 ciu4 ciong4 a1 ba4",
  "先生教厓讀書，厓教先生打山豬。": "sin1 sang1 gau4 ngai2 tuk6 su1, ngai2 gau4 sin1 sang1 da3 san1 zu1",
  "山豬飆過河，嚇到先生兩公婆。": "san1 zu1 biau1 go4 ho2, hak5 dau3 sin1 sang1 liong3 gung1 po2",
  "一夜冇睡目，十夜補唔足。": "yit5 ya4 mau2 soi4 muk5, sip6 ya4 bu3 m zuk5",
  "老虎都曉啄目睡。": "lau3 fu3 du1 hiau3 duk5 muk5 soi4",
  "爺娘記子長江水，子記爺娘冇擔竿長。": "ya2 niong2 gi4 zu3 cong2 gong1 sui3, zu3 gi4 ya2 niong2 mau2 dam1 gon1 cong2",
  "早死爺娘冇教招。": "zau3 si3 ya2 niong2 mau2 gau4 zau1",
  "養子唔知娘辛苦，養女正曉謝娘恩。": "yong3 zu3 m di1 niong2 sin1 ku3, yong3 ng3 zang4 hiau3 cia4 niong2 en1",
};

// ============================================================
// DIACRITIC → NUMERAL CONVERSION
// ============================================================

function convertSyllable(syl) {
  if (!syl || !syl.trim()) return syl;
  const nfd = syl.normalize('NFD');

  const hasAcute  = /\u0301/.test(nfd); // ´ → tone 1
  const hasMacron = /\u0304/.test(nfd); // ¯ → tone 2
  const hasBreve  = /\u0306/.test(nfd); // ˘ → tone 3 or 5
  const hasGrave  = /\u0300/.test(nfd); // ` → tone 4 or 6

  let tone = 0;
  if (hasAcute)  tone = 1;
  else if (hasMacron) tone = 2;
  else if (hasBreve)  tone = 3;
  else if (hasGrave)  tone = 4;

  if (tone === 0) return syl; // No tone mark – return unchanged

  // Strip all combining diacritics, renormalize to NFC
  const base = nfd.replace(/[\u0300-\u036f]/g, '').normalize('NFC');

  // Entering tone check: syllable ends in p, t, or k
  if ((tone === 3 || tone === 4) && /[ptk]$/i.test(base)) {
    tone += 2; // 3 → 5 (entering light), 4 → 6 (entering dark)
  }

  return base + tone;
}

function diacriticToNumeral(rom) {
  if (!rom) return rom;
  return rom.split(' ').map(convertSyllable).join(' ');
}

// ============================================================
// LEXICON → CSV
// ============================================================

function csvField(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  // Quote if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Build lookup map by hak → { rom, zh, en, unproofread }
// Also track duplicates (multiple pronunciations for same hak)
const lexByHak = {};
const csvLines = ['hak,rom,zh,en,unproofread'];

for (const [key, val] of Object.entries(lexiconRaw)) {
  const dotIdx = key.indexOf('.');
  const hak    = dotIdx === -1 ? key : key.slice(0, dotIdx);
  const romDiac = dotIdx === -1 ? '' : key.slice(dotIdx + 1);
  const romNum  = diacriticToNumeral(romDiac);
  const unproofread = val.unproofread ? '1' : '';

  const row = {
    hak,
    rom: romNum,
    zh: val.zh  || '',
    en: val.en  || '',
    unproofread: val.unproofread || false,
  };

  if (lexByHak[hak]) {
    // Multiple pronunciations – store as array
    if (!Array.isArray(lexByHak[hak])) lexByHak[hak] = [lexByHak[hak]];
    lexByHak[hak].push(row);
  } else {
    lexByHak[hak] = row;
  }

  csvLines.push([
    csvField(hak),
    csvField(romNum),
    csvField(val.zh  || ''),
    csvField(val.en  || ''),
    unproofread,
  ].join(','));
}

fs.writeFileSync(csvOutPath, '\uFEFF' + csvLines.join('\n'), 'utf-8'); // BOM for Excel compat
console.log(`✓ lexicon.csv  written (${csvLines.length - 1} entries)`);

// ============================================================
// LESSONS.JSON → COMPACT FORMAT
// ============================================================

// Collect all vocab words referenced in lessons to check coverage
const missingEntries = new Set();

function compact(lesson) {
  return {
    id: lesson.id,
    title: {
      hak: lesson.title.hak,
      en:  lesson.title.en,
    },
    blocks: lesson.blocks.map(compactBlock.bind(null, lesson.id)),
  };
}

function compactBlock(lessonId, block) {
  const b = { type: block.type };

  if (block.description) {
    b.description = {
      ...(block.description.hak && { hak: block.description.hak }),
      en: block.description.en || '',
    };
  }

  switch (block.type) {

    case 'vocab': {
      // Support both string (already compacted) and array (original) format
      let items = block.items;
      if (typeof items === 'string') {
        // Already compacted – keep as-is
        b.items = items;
      } else {
        // Original array format: convert "hak.rom" entries → space-delimited hak string
        const words = items.map(item => {
          const dotIdx = item.indexOf('.');
          const hak = dotIdx === -1 ? item : item.slice(0, dotIdx);
          if (!lexByHak[hak]) {
            missingEntries.add(`L${lessonId} vocab: "${hak}"`);
          }
          return hak;
        });
        b.items = words.join(' ');
      }
      break;
    }

    case 'dialogue':
      b.items = block.items.map(item => {
        const r = { hak: item.hak };
        if (item.sp  != null) r.sp = item.sp;
        if (item.zh) r.zh = item.zh;
        if (item.en) r.en = item.en;
        return r;
      });
      break;

    case 'sentence_practice':
      // Convert to plain strings (removing empty rom/en)
      b.items = block.items.map(item =>
        typeof item === 'string' ? item : item.hak
      );
      break;

    case 'pronunciation_practice':
      b.rows = block.rows.map(row =>
        row.map(cell => {
          if (typeof cell === 'string') return cell;
          const r = { hak: cell.hak };
          if (cell.rom) {
            const unproofread = cell.rom.endsWith('*');
            const romClean = unproofread ? cell.rom.slice(0, -1) : cell.rom;
            r.rom = diacriticToNumeral(romClean);
            if (unproofread) r.u = 1; // compact unproofread flag
          }
          return r;
        })
      );
      break;

    case 'grammar_notes':
      b.items = block.items.map(item => ({
        ...(item.zh && { zh: item.zh }),
        ...(item.en && { en: item.en }),
      }));
      break;

    case 'proverbs':
    case 'nursery_rhymes':
      b.items = block.items.map(item => {
        const r = { hak: item.hak };
        const romRaw = item.rom || proverbRomMap[item.hak] || '';
        if (romRaw) r.rom = diacriticToNumeral(romRaw);
        if (item.en)   r.en   = item.en;
        if (item.note) r.note = item.note;
        return r;
      });
      break;

    default:
      // Copy remaining fields as-is
      Object.assign(b, block);
      delete b.audio;
  }

  // Drop empty audio objects
  // (audio is now implied by naming convention: ch{n}-vocab.mp3 etc.)

  return b;
}

const compactLessons = lessonsRaw.map(compact);
fs.writeFileSync(
  jsonOutPath,
  JSON.stringify(compactLessons, null, 2),
  'utf-8'
);

console.log(`✓ lessons.json written (${compactLessons.length} lessons)`);

if (missingEntries.size > 0) {
  console.warn('\n⚠  Words used in vocab but missing from lexicon:');
  for (const e of missingEntries) console.warn('   ' + e);
} else {
  console.log('✓ All vocab words found in lexicon');
}
