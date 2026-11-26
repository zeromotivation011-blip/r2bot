#!/usr/bin/env node
// scripts/kids-voices/record-episode.mjs
// Records one R2BOT Kids episode to an MP4 (1280×720) for YouTube and classrooms.
//
//   node scripts/kids-voices/record-episode.mjs --session L1-S01 --out /tmp/l1-s1.mp4 \
//        [--base http://localhost:3611] [--fps 24] [--crf 18] [--lufs -14]
// Defaults are upload-master quality: CRF 18 with x264's animation tuning
// (flat-shaded 3D with gradients bands at lower rates) and the mix
// normalised to -14 LUFS (YouTube's reference).
//
// Needs a running site (npx next dev / next start), Playwright (local or global:
// NODE_PATH=$(npm root -g)) with Chromium, and ffmpeg.
//
// How: the page is opened with ?record=1, which makes the player step its clock
// frame by frame instead of following the wall clock (so the video is smooth
// however slowly the machine renders 3D). Playwright screenshots every frame —
// 3D, captions and title cards exactly as a child sees them — and pipes them
// to ffmpeg. The player logs when each voice clip starts; the soundtrack is
// rebuilt from the same .ogg files at those times plus the music bed rendered
// offline by the player's own generator, then muxed. MP4s are artefacts: do
// not commit them.

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const session = arg('session', 'L1-S01')
const out = resolve(arg('out', join(tmpdir(), `${session.toLowerCase()}.mp4`)))
const base = arg('base', 'http://localhost:3611')
const fps = Number(arg('fps', '24'))
const crf = arg('crf', '18')
const lufs = Number(arg('lufs', '-14'))
const W = 1280
const H = 720

function loadPlaywright() {
  const req = createRequire(import.meta.url)
  for (const p of ['playwright', process.env.NODE_PATH ? join(process.env.NODE_PATH, 'playwright') : null]) {
    if (!p) continue
    try {
      return req(p)
    } catch {
      // try the next location
    }
  }
  throw new Error('Playwright not found. Install it, or set NODE_PATH=$(npm root -g).')
}

function run(cmd, args, { input } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d.toString()))
    p.on('error', rej)
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`))))
    if (input) input(p.stdin)
  })
}

const { chromium } = loadPlaywright()
const work = mkdtempSync(join(tmpdir(), 'r2bot-episode-'))
const videoOnly = join(work, 'video.mp4')
const audioMix = join(work, 'audio.wav')

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error('page error:', e.message))
  console.log(`opening ${base}/kids/lab/episodes/${session}?record=1`)
  await page.goto(`${base}/kids/lab/episodes/${session}?record=1`, { waitUntil: 'networkidle', timeout: 300000 })
  await page.waitForFunction(() => Boolean(window.__episode), null, { timeout: 300000 })
  await page.evaluate(() => document.fonts.ready)
  // The Next.js dev-mode badge is not part of the film.
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  const duration = await page.evaluate(() => window.__episode.duration)
  console.log(`episode ${session}: ${duration.toFixed(1)} s of story at ${fps} fps`)

  // Video: frames → ffmpeg (H.264, yuv420p for every player).
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps), videoOnly], {
    stdio: ['pipe', 'ignore', 'inherit'],
  })
  const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg video exited ${c}`)))))
  let frames = 0
  let tail = Math.round(fps * 1.5) // hold the last frame a moment
  const t0 = Date.now()
  for (;;) {
    const st = await page.evaluate(async (dt) => {
      const s = window.__episode.director.renderStep(dt)
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      return s
    }, 1 / fps)
    const buf = await page.screenshot({ type: 'jpeg', quality: 90 })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    frames++
    if (frames % (fps * 10) === 0) {
      const rate = frames / ((Date.now() - t0) / 1000)
      console.log(`  ${(frames / fps).toFixed(0)} s recorded (story ${st.time.toFixed(0)}/${duration.toFixed(0)} s), ${rate.toFixed(1)} frames/s`)
    }
    if (st.ended && --tail <= 0) break
    if (frames > fps * (duration + 120)) break // safety
  }
  ff.stdin.end()
  await ffDone
  const wallLength = frames / fps

  // Audio: voice clips at their logged times + the music bed.
  const log = await page.evaluate(() => window.__episode.director.recordLogEntries)
  const musicB64 = await page.evaluate(() => window.__episode.director.renderMusic())
  const musicWav = join(work, 'music.wav')
  writeFileSync(musicWav, Buffer.from(musicB64, 'base64'))
  const inputs = ['-i', musicWav]
  const filters = ['[0:a]aresample=48000,apad[m]']
  const labels = ['[m]']
  log.forEach((e, i) => {
    const file = join(ROOT, 'public', e.file)
    if (!existsSync(file)) return
    inputs.push('-i', file)
    const n = inputs.length / 2 - 1
    const delay = Math.max(0, Math.round(e.at * 1000))
    filters.push(`[${n}:a]atrim=start=${Math.max(0, e.offset).toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,adelay=${delay}:all=1[v${i}]`)
    labels.push(`[v${i}]`)
  })
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=first,atrim=0:${wallLength.toFixed(3)},loudnorm=I=${lufs}:TP=-1.5:LRA=11,aresample=48000[a]`)
  await run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[a]', '-ac', '2', audioMix])

  await run('ffmpeg', ['-v', 'error', '-y', '-i', videoOnly, '-i', audioMix, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out])
  console.log(`wrote ${out} — ${wallLength.toFixed(1)} s, ${frames} frames, ${log.length} voice clips`)
} finally {
  await browser.close()
  rmSync(work, { recursive: true, force: true })
}
