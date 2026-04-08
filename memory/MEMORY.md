# learnhakka project memory

## Stack
- Vue 3 + Vite, single-file entry: `src/App.vue` (no router/store)
- Deployed via GitHub Actions to GitHub Pages

## Data files (public/)
- `lessons.json` — 10 lessons; vocab blocks use string arrays (keys)
- `lexicon.json` — 130 entries keyed by `hak.rom` notation

## Key data conventions
- Vocab item key format: `"hak.rom"` (split on first `.`)
- `rom` strips trailing `*` in keys; `unproofread: true` stored in lexicon entry
- Block audio field: `{ "file": "ch1.wav", "from": "HH:MM:SS", "to": "HH:MM:SS" }` (currently placeholder)
- Blocks that are not vocab still have `items` arrays with full objects (hak, zh, en, etc.)

## Display conventions
- Half-width `(text)` in hak strings → rendered as `.annotation` (small superscript)
- `renderAnnotated(text)` used for lesson titles and vocab hak display
- `.hak-large` = 2rem, `.hak-medium` = 1.3rem

## Audio
- WAV range playback: `playBlockAudio(block)` seeks to `block.audio.from`
- Per-item MP3 fallback: `./audio/lesson{NN}/{sanitized_rom}.mp3`

## User preferences
- Prefers Chinese/Hakka text to be larger
- Chapter title shown in top bar (lesson num + hak title)
