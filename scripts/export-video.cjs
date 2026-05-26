#!/usr/bin/env node
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const defaults = {
  lesson: 1,
  pause: 0.8,
  out: path.join(root, 'exports', 'videos'),
  fps: 30,
  silent: 3,
  title: 3,
  width: 1920,
  height: 1080,
  port: 4173
}

function parseArgs(argv) {
  const args = { ...defaults }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const readValue = () => {
      const value = argv[++i]
      if (value == null) throw new Error(`Missing value for ${arg}`)
      return value
    }
    if (arg === '--lesson') args.lesson = Number(readValue())
    else if (arg === '--pause') args.pause = Number(readValue())
    else if (arg === '--out') args.out = path.resolve(readValue())
    else if (arg === '--fps') args.fps = Number(readValue())
    else if (arg === '--silent') args.silent = Number(readValue())
    else if (arg === '--title') args.title = Number(readValue())
    else if (arg === '--port') args.port = Number(readValue())
    else if (arg === '--url') args.url = readValue()
    else if (arg === '--help') {
      console.log('Usage: npm run export:video -- --lesson 1 --pause 0.8 --out exports/videos')
      process.exit(0)
    } else {
      throw new Error(`Unknown option ${arg}`)
    }
  }
  return args
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: options.stdio || 'pipe', encoding: 'utf8' })
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(`${cmd} ${args.join(' ')} failed\n${output}`)
  }
  return result.stdout
}

function ffprobeDuration(file) {
  const out = run('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  const duration = Number.parseFloat(out.trim())
  return Number.isFinite(duration) ? duration : 0
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error('Preview server exited before it was ready')
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function audioSrcToPath(src) {
  if (!src) return null
  const parsed = new URL(src, 'http://localhost')
  const marker = '/data/'
  const markerIndex = parsed.pathname.indexOf(marker)
  if (markerIndex === -1) return null
  const relative = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length))
  return path.join(root, 'public', 'data', relative)
}

function makeAudioClip(audio, duration, file, pause) {
  if (!audio?.src) {
    run('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-t', String(duration),
      '-c:a', 'aac',
      file
    ])
    return
  }

  const audioPath = audioSrcToPath(audio.src)
  if (!audioPath || !fs.existsSync(audioPath)) {
    throw new Error(`Cannot resolve audio source ${audio.src}`)
  }
  const inputArgs = audio.start != null && audio.end != null
    ? ['-ss', String(audio.start), '-to', String(audio.end), '-i', audioPath]
    : ['-i', audioPath]
  run('ffmpeg', [
    '-y',
    ...inputArgs,
    '-af', `apad=pad_dur=${pause}`,
    '-t', String(duration),
    '-c:a', 'aac',
    file
  ])
}

function makeVideoClip(image, audio, duration, file, args) {
  run('ffmpeg', [
    '-y',
    '-loop', '1',
    '-t', String(duration),
    '-i', image,
    '-i', audio,
    '-vf', `scale=${args.width}:${args.height}:force_original_aspect_ratio=decrease,pad=${args.width}:${args.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
    '-r', String(args.fps),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-shortest',
    file
  ])
}

function slideDuration(state, args) {
  const audio = state.audio
  if (!audio?.src) return state.page?.type === 'hero' ? args.title : args.silent
  if (audio.start != null && audio.end != null) return Math.max(0.2, audio.end - audio.start) + args.pause
  const audioPath = audioSrcToPath(audio.src)
  const duration = audioPath && fs.existsSync(audioPath) ? ffprobeDuration(audioPath) : args.title
  return Math.max(0.2, duration) + args.pause
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  let server = null
  let browser = null
  let baseUrl = args.url

  try {
    if (!baseUrl) {
      run('npm', ['run', 'build'], { stdio: 'inherit' })
      baseUrl = `http://127.0.0.1:${args.port}/`
      server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(args.port)], {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      await waitForServer(baseUrl, server)
    }

    const { chromium } = require('playwright')
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: args.width, height: args.height }, deviceScaleFactor: 1 })
    const lessonUrl = new URL(`#/chapter/${args.lesson}?mode=slides&export=1`, baseUrl).toString()
    await page.goto(lessonUrl, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__LESSON_EXPORT__?.getSlideCount?.() > 0)

    const slideCount = await page.evaluate(() => window.__LESSON_EXPORT__.getSlideCount())
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `learnhakka-video-${args.lesson}-`))
    const clips = []

    for (let i = 0; i < slideCount; i++) {
      const state = await page.evaluate(slideIndex => window.__LESSON_EXPORT__.setSlide(slideIndex), i)
      await page.waitForTimeout(150)
      const image = path.join(workDir, `slide-${String(i).padStart(4, '0')}.png`)
      const audio = path.join(workDir, `slide-${String(i).padStart(4, '0')}.m4a`)
      const clip = path.join(workDir, `clip-${String(i).padStart(4, '0')}.mp4`)
      await page.screenshot({ path: image })
      const duration = slideDuration(state, args)
      makeAudioClip(state.audio, duration, audio, args.pause)
      makeVideoClip(image, audio, duration, clip, args)
      clips.push(clip)
      console.log(`Rendered slide ${i + 1}/${slideCount}`)
    }

    fs.mkdirSync(args.out, { recursive: true })
    const listFile = path.join(workDir, 'clips.txt')
    fs.writeFileSync(listFile, clips.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n') + '\n')
    const outFile = path.join(args.out, `lesson-${String(args.lesson).padStart(2, '0')}.mp4`)
    run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart', outFile], { stdio: 'inherit' })
    console.log(`Wrote ${outFile}`)
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (server) server.kill()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
