#!/usr/bin/env python3
"""Draft pause-based timestamps for recorded lesson sections (no audio recognition).

Preview: python3 scripts/draft-sentence-timestamps.py
Write:   python3 scripts/draft-sentence-timestamps.py --write
Existing timestamps are preserved unless --overwrite is supplied.
"""
import argparse
import json
import math
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TYPES = {'main', 'practice', 'sentence_practice', 'sentences', 'idiom'}


def speech_spans(audio):
    duration = float(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', str(audio),
    ], text=True))
    result = subprocess.run([
        'ffmpeg', '-nostdin', '-hide_banner', '-i', str(audio),
        '-af', 'silencedetect=noise=-30dB:d=0.35', '-f', 'null', '-',
    ], capture_output=True, text=True, check=True)
    gaps = re.findall(r'silence_start: ([\d.]+).*?silence_end: ([\d.]+)', result.stderr, re.S)
    spans, start = [], 0.0
    for a, b in gaps:
        a, b = float(a), float(b)
        if a - start > 0.12:
            spans.append((start, a))
        start = b
    if duration - start > 0.12:
        spans.append((start, duration))
    return duration, spans


def text(item):
    if isinstance(item, list):
        return ' '.join(text(cell) for cell in item)
    if isinstance(item, dict):
        return item.get('hak', '')
    return str(item)


def weights(items):
    # Count written syllables rather than translations or romanization.
    return [max(1, len(re.findall(r'[\u3400-\u9fff]', text(item)))) for item in items]


def partition(spans, item_weights, numbered=False):
    """Group speech spans into exactly one segment per displayed unit.

    Prefer long pauses and groups whose speech duration fits the text length.
    In numbered recordings, favor a short spoken number before its sentence.
    """
    n, count = len(spans), len(item_weights)
    if n < count:
        raise ValueError(f'Only {n} speech spans for {count} items; manual alignment needed')
    cumulative = [0.0]
    for start, end in spans:
        cumulative.append(cumulative[-1] + end - start)
    rate = cumulative[-1] / sum(item_weights)
    costs = {(0, 0): 0.0}
    previous = {}
    for item_index, weight in enumerate(item_weights):
        target = rate * weight
        for end in range(item_index + 1, n - (count - item_index - 1) + 1):
            best = (math.inf, None)
            for start in range(item_index, end):
                prior = costs.get((item_index, start), math.inf)
                speech = cumulative[end] - cumulative[start]
                score = prior + ((speech - target) / max(target, 0.5)) ** 2
                if start:
                    pause = spans[start][0] - spans[start - 1][1]
                    score -= 0.18 * min(pause, 3.0)
                    if numbered and start + 1 < n:
                        short_number = spans[start][1] - spans[start][0] < 0.95
                        following_sentence = spans[start + 1][1] - spans[start + 1][0] > 1.2
                        if short_number and following_sentence:
                            score -= 0.8
                if score < best[0]:
                    best = (score, start)
            costs[item_index + 1, end] = best[0]
            previous[item_index + 1, end] = best[1]
    groups, end = [], n
    for i in range(count, 0, -1):
        start = previous[i, end]
        groups.append((spans[start][0], spans[end - 1][1]))
        end = start
    return groups[::-1]


def draft(block, audio):
    duration, spans = speech_spans(audio)
    items = block.get('rows', block.get('items', []))
    if not items or not spans:
        raise ValueError('No items or speech detected')
    kind = block['type']
    numbered = kind in {'sentence_practice', 'sentences'}
    intro = 1  # Dialogue/proverb recordings start with a spoken section heading.
    if kind == 'practice' and 'rows' in block:
        word_count = sum(len(row) for row in items)
        # Usually two heading spans followed by one span per practice word.
        intro = max(0, min(2, len(spans) - word_count))
    elif numbered and len(spans) >= 3:
        # Distinguish a second heading from the short spoken number "one".
        intro = 2 if spans[1][1] - spans[1][0] > 0.8 and spans[2][1] - spans[2][0] < 0.8 else 1
    content = spans[intro:]
    if kind == 'practice' and 'rows' in block and len(content) == sum(len(row) for row in items):
        groups, cursor = [], 0
        for row in items:
            groups.append((content[cursor][0], content[cursor + len(row) - 1][1]))
            cursor += len(row)
    else:
        groups = partition(content, weights(items), numbered)
    return [
        {'start': round(max(0, start - 0.15), 3), 'end': round(min(duration, end + 0.15), 3)}
        for start, end in groups
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    parser.add_argument('--lessons', type=int, nargs='+', default=list(range(11, 21)))
    args = parser.parse_args()
    for lesson_id in args.lessons:
        lesson = json.loads((ROOT / f'public/data/lessons/lesson-{lesson_id:02}.json').read_text())
        media_path = ROOT / f'public/data/media/lesson-{lesson_id:02}.json'
        media = json.loads(media_path.read_text())
        changed = False
        for block in lesson['blocks']:
            entry = media['blocks'].get(block['id'], {})
            if block['type'] not in TYPES or not entry.get('audio'):
                continue
            if entry.get('segments') and not args.overwrite:
                continue
            segments = draft(block, ROOT / 'public/data' / entry['audio'])
            entry['segments'] = segments
            changed = True
            print(f'Lesson {lesson_id} {block["id"]}: {len(segments)} draft segments')
        if changed and args.write:
            media_path.write_text(json.dumps(media, ensure_ascii=False, indent=2) + '\n')
    if not args.write:
        print('Preview only. Pass --write to save.')


if __name__ == '__main__':
    main()
