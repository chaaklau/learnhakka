<template>
  <div class="time-diagram-wrap" role="region" :aria-label="block.title.zh" tabindex="0">
    <svg class="time-diagram" :viewBox="`0 0 960 ${height}`" role="img" :aria-labelledby="`${id}-title ${id}-desc`">
      <title :id="`${id}-title`">{{ block.title.zh }} · {{ block.title.en }}</title>
      <desc :id="`${id}-desc`">{{ description }}</desc>
      <defs>
        <g :id="`${id}-sun`" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <circle r="9" />
          <path d="M0-20v5M0 15v5M-20 0h5M15 0h5M-14-14l4 4M10 10l4 4M-14 14l4-4M10-10l4-4" />
        </g>
        <g :id="`${id}-sunrise`" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M-20 10h40M-11 5a11 11 0 0 1 22 0M0-17v6M-18-9l4 4M18-9l-4 4M-22 2h5M17 2h5" />
        </g>
        <g :id="`${id}-moon`" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
          <path d="M5-18A18 18 0 1 0 18 8 16 16 0 0 1 5-18Z" />
          <path d="M17-17v8M13-13h8" stroke-linecap="round" />
        </g>
        <g :id="`${id}-calendar`" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="-17" y="-15" width="34" height="32" rx="4" />
          <path d="M-17-5h34M-9-20v10M9-20v10" />
        </g>
      </defs>
      <rect width="960" :height="height" rx="14" class="diagram-bg" />
      <path d="M0 92H960" class="grid-line" />
      <g v-for="(heading, ci) in block.headers" :key="ci" :transform="`translate(${ci * 240 + 120}, 0)`">
        <use v-if="ci" :href="`#${id}-${['', 'sunrise', 'sun', 'moon'][ci]}`" transform="translate(0 32)" :class="['period-icon', `period-${ci}`]" />
        <text x="0" :y="ci ? 77 : 54" class="column-label">{{ heading }}</text>
      </g>
      <g v-for="(row, ri) in block.rows" :key="ri" :transform="`translate(0, ${92 + ri * 132})`">
        <rect x="0" y="0" width="240" height="132" class="row-bg" />
        <path v-if="ri" d="M0 0H960" class="grid-line" />
        <g transform="translate(28 62)" class="day-icon">
          <use :href="`#${id}-calendar`" />
          <path v-if="ri === 0" d="M8 5H-8M-3 0l-5 5 5 5" class="icon-stroke" />
          <circle v-else-if="ri === 1" cy="6" r="4" fill="currentColor" />
          <path v-else-if="ri === 2" d="M-8 5H8M3 0l5 5-5 5" class="icon-stroke" />
          <path v-else d="M-9 6a9 9 0 0 1 16-5M7-3v5H2M9 8a9 9 0 0 1-16 5M-7 17v-5h5" class="icon-stroke" />
        </g>
        <g v-for="(cell, ci) in [row.label, ...row.cells]" :key="ci" :transform="`translate(${ci * 240 + (ci ? 120 : 141)}, 0)`">
          <text v-if="cell.rom" x="0" :y="romMode === 'bracket' ? 89 : 41" class="pronunciation">{{ romMode === 'bracket' ? `[${romToDiacritics(cell.rom)}]` : romToDiacritics(cell.rom) }}</text>
          <text v-if="cell.hak" x="0" :y="romMode === 'bracket' ? 55 : 75" class="hakka">{{ cell.hak }}</text>
          <text v-if="cell.zh" x="0" :y="cell.hak ? 114 : 76" class="meaning">{{ cell.zh }}</text>
        </g>
      </g>
      <path :d="`M240 0V${height}M480 0V${height}M720 0V${height}`" class="grid-line" />
      <rect x="1" y="1" width="958" :height="height - 2" rx="14" class="outline" />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { romToDiacritics } from '../romanization.js'

const props = defineProps({ block: { type: Object, required: true }, romMode: { type: String, default: 'ruby' } })
const id = computed(() => `time-${props.block.id}`)
const height = computed(() => 92 + props.block.rows.length * 132)
const description = computed(() => props.block.rows.map(row =>
  [row.label.zh, ...row.cells.map((cell, i) => `${props.block.headers[i + 1]}：${cell.hak} (${romToDiacritics(cell.rom)})`)].join('，')
).join('；'))
</script>

<style scoped>
.time-diagram-wrap { overflow-x: auto; }
.time-diagram { display: block; width: 70%; min-width: 532px; text-anchor: middle; }
.diagram-bg { fill: var(--color-surface); }
.row-bg { fill: var(--color-surface-soft); }
.grid-line, .outline { fill: none; stroke: var(--color-border); stroke-width: 1; }
.column-label { fill: var(--color-text); font: 500 19px var(--font-body); }
.hakka { fill: var(--color-text); font: 26px var(--font-display); }
.pronunciation { fill: var(--color-crimson); font: 400 17px var(--font-body); }
.meaning { fill: var(--color-muted); font: 18px var(--font-body); }
.day-icon { color: var(--color-green); }
.period-1 { color: #aa641b; }
.period-2 { color: #a8750a; }
.period-3 { color: #4a5a91; }
.icon-stroke { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
@media print {
  .time-diagram-wrap { overflow: visible; break-inside: avoid; }
  .time-diagram { min-width: 0; }
}
</style>
