#!/usr/bin/env node
// scripts/kids-app/verify-export.mjs — checks the standalone app bundle
// (apps/kids-mobile/www) the way the app will run it, with no network.
//
//   node scripts/kids-app/verify-export.mjs            every exported page
//   node scripts/kids-app/verify-export.mjs --quick    one page per route (faster)
//
// Needs Playwright with Chromium (a local tool, not a repo dependency:
// `npm i -g playwright && npx playwright install chromium`).
//
// 1. Serves www/ with a tiny static server that follows the SAME path rule as
//    the native app (android/.../KidsRoutes.java):
//      no file extension -> <path>/index.html, otherwise the file, missing -> 404.
// 2. Opens every html page at 390x844 with touch, and fails on: an uncaught page
//    error, any request to a host other than the local server, or a page that
//    shows almost no text.
// 3. Clicks through the five tabs (Home, Learn, Worlds, Games, Garage) on the real
//    tab bar (client-side navigation: the RSC payloads must resolve), and checks
//    that progress saved in localStorage survives a reload.

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const WWW = path.resolve(process.env.KIDS_APP_WWW || path.join(ROOT, 'apps', 'kids-mobile', 'www'))
const QUICK = process.argv.includes('--quick')
const TABS_ONLY = process.argv.includes('--tabs-only')
const CONCURRENCY = Number(process.env.VERIFY_CONCURRENCY || 3)
const MIN_TEXT = 60

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.cur': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
}

/** The native path rule (KidsRoutes.pageAssetFor + Capacitor's plain file serving). */
export function assetFor(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  if (p.split('/').some((s) => s === '..')) return null
  if (p === '/' || p === '') return 'index.html'
  const trimmed = p.replace(/\/+$/, '')
  const last = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  if (!last.includes('.')) return `${trimmed.slice(1)}/index.html`
  return trimmed.slice(1)
}

const missing = new Map()

function serve() {
  const server = http.createServer((req, res) => {
    const rel = assetFor(req.url || '/')
    const file = rel ? path.join(WWW, rel) : null
    if (file && file.startsWith(WWW) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
      return
    }
    missing.set(req.url, (missing.get(req.url) || 0) + 1)
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    fs.createReadStream(path.join(WWW, '404.html')).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

function htmlPages(dir, base = '') {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '_next') continue
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...htmlPages(path.join(dir, e.name), rel))
    else if (e.name === 'index.html') out.push(base ? `/${base}/` : '/')
  }
  return out
}

/** One page per route shape: the first child of every dynamic segment. */
function quickPick(pages) {
  const seen = new Set()
  return pages.filter((p) => {
    const parts = p.split('/').filter(Boolean)
    const key = parts.map((s, i) => (i >= 2 && /\d|-/.test(s) && parts.length > 2 ? '*' : s)).join('/')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function checkPage(context, origin, url) {
  const page = await context.newPage()
  const errors = []
  const foreign = []
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)))
  page.on('request', (r) => {
    const u = r.url()
    if (/^(data|blob|about):/.test(u)) return
    if (!u.startsWith(origin)) foreign.push(u)
  })
  // Anything not local is blocked, exactly as on a phone with no network.
  await page.route((u) => !u.href.startsWith(origin) && !/^(data|blob|about):/.test(u.href), (r) => r.abort())
  let text = 0
  let status = 0
  try {
    const resp = await page.goto(origin + url, { waitUntil: 'load', timeout: 45000 })
    status = resp ? resp.status() : 0
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
    await page.waitForTimeout(400)
    text = await page.evaluate(() => (document.body ? document.body.innerText.replace(/\s+/g, ' ').trim().length : 0))
  } catch (e) {
    errors.push(`navigation: ${e.message}`)
  }
  await page.close()
  return { url, status, errors, foreign, text }
}

async function tabsAndReload(browser, origin) {
  const problems = []
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await context.route((u) => !u.href.startsWith(origin), (r) => r.abort())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message || e)))
  const docLoads = []
  page.on('request', (r) => { if (r.resourceType() === 'document') docLoads.push(r.url()) })
  await page.goto(origin + '/', { waitUntil: 'load' })
  await page.waitForURL(/\/kids\/$/, { timeout: 15000 }).catch(() => problems.push(`start page did not forward to /kids/ (at ${page.url()})`))
  await page.waitForLoadState('networkidle').catch(() => undefined)
  const startDocs = docLoads.length
  const tabs = [
    { label: 'Learn', path: '/kids/course/' },
    { label: 'Worlds', path: '/kids/worlds/' },
    { label: 'Games', path: '/kids/play/' },
    { label: 'Garage', path: '/kids/hangar/' },
    { label: 'Home', path: '/kids/' },
  ]
  for (const t of tabs) {
    const link = page.locator('nav.kids-tabbar a', { hasText: t.label }).first()
    if (!(await link.isVisible().catch(() => false))) {
      problems.push(`tab ${t.label} not visible on ${page.url()}`)
      continue
    }
    await link.tap()
    try {
      await page.waitForURL((u) => u.pathname === t.path, { timeout: 15000 })
      await page.waitForLoadState('networkidle').catch(() => undefined)
      const on = await page.locator('nav.kids-tabbar a[aria-current="page"]').first().innerText().catch(() => '')
      if (!on.includes(t.label)) problems.push(`tab ${t.label}: aria-current is on "${on.trim()}"`)
    } catch {
      problems.push(`tab ${t.label}: did not reach ${t.path} (at ${page.url()})`)
    }
  }
  if (docLoads.length !== startDocs) problems.push(`tab taps caused full page loads (client navigation broken): ${docLoads.slice(startDocs).join(', ')}`)

  // Progress survives a reload: give the explorer XP in the app's own progress
  // store (localStorage, profileKey('r2bot_kids_v2')), reload, and read the Rank
  // the header computes from it.
  const rankText = () => page.locator('a.kids-nav-stars').first().innerText().catch(() => '')
  const before = (await rankText()).replace(/\D+/g, '')
  const wrote = await page.evaluate(() => {
    // No progress yet on a fresh device: the default explorer's key ('p1' = the bare base).
    const key = Object.keys(localStorage).find((k) => k.includes('r2bot_kids_v2')) || 'r2bot_kids_v2'
    const p = JSON.parse(localStorage.getItem(key) || '{}')
    p.xp = 5000
    localStorage.setItem(key, JSON.stringify(p))
    return { ok: true, key }
  })
  if (!wrote.ok) {
    problems.push(`no progress store in localStorage after the tab walk (keys: ${wrote.keys.join(', ')})`)
  } else {
    await page.reload({ waitUntil: 'load' })
    await page.waitForLoadState('networkidle').catch(() => undefined)
    await page.waitForTimeout(500)
    const after = (await rankText()).replace(/\D+/g, '')
    const kept = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').xp, wrote.key)
    if (kept !== 5000) problems.push(`progress XP did not survive the reload (xp=${kept})`)
    if (!(Number(after) > Number(before || 1))) problems.push(`Rank did not rise after the reload (before ${before}, after ${after})`)
    else console.log(`[verify] progress kept across reload: Rank ${before} -> ${after} (key ${wrote.key})`)
  }
  // A setting changed through the real UI survives a reload too.
  await page.goto(origin + '/kids/settings/', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle').catch(() => undefined)
  const sw = page.locator('button[role="switch"]').first()
  const was = await sw.getAttribute('aria-checked')
  await sw.tap()
  await page.waitForTimeout(300)
  await page.reload({ waitUntil: 'load' })
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(500)
  const now = await page.locator('button[role="switch"]').first().getAttribute('aria-checked')
  if (now === was) problems.push(`a Settings switch did not survive the reload (${was} -> ${now})`)
  else console.log(`[verify] Settings switch kept across reload (${was} -> ${now})`)
  if (errors.length) problems.push(`page errors during tab walk: ${errors.join(' | ')}`)
  await context.close()
  return { problems }
}

async function main() {
  if (!fs.existsSync(path.join(WWW, 'index.html'))) {
    console.error(`[verify] no export at ${WWW}: run npm run kids:app:export first`)
    process.exit(1)
  }
  const server = await serve()
  const origin = `http://127.0.0.1:${server.address().port}`
  const all = htmlPages(WWW).sort()
  const pages = TABS_ONLY ? [] : QUICK ? quickPick(all) : all
  console.log(`[verify] ${pages.length} of ${all.length} pages, ${CONCURRENCY} at a time, at ${origin}`)

  const browser = await chromium.launch()
  const results = []
  let i = 0
  async function worker() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
    while (i < pages.length) {
      const url = pages[i++]
      results.push(await checkPage(context, origin, url))
      if (results.length % 50 === 0) console.log(`[verify] ${results.length}/${pages.length}`)
    }
    await context.close()
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const bad = results.filter((r) => r.status !== 200 || r.errors.length || r.foreign.length || r.text < MIN_TEXT)
  for (const r of bad) {
    console.log(`FAIL ${r.url} status=${r.status} text=${r.text}`)
    for (const e of r.errors.slice(0, 3)) console.log(`   error: ${e.slice(0, 300)}`)
    for (const f of [...new Set(r.foreign)].slice(0, 5)) console.log(`   foreign: ${f}`)
  }
  const tw = await tabsAndReload(browser, origin)
  for (const p of tw.problems) console.log(`FAIL tabs: ${p}`)
  await browser.close()
  server.close()

  const missingList = [...missing.entries()].filter(([u]) => !u.endsWith('favicon.ico'))
  if (missingList.length) {
    console.log(`[verify] local 404s (${missingList.length}):`)
    for (const [u, n] of missingList.slice(0, 40)) console.log(`   ${n}x ${u}`)
  }
  const textMin = results.length ? Math.min(...results.map((r) => r.text)) : 0
  console.log(`[verify] pages ok: ${results.length - bad.length}/${results.length}; tab walk: ${tw.problems.length ? 'FAIL' : 'ok'}; least text on a page: ${textMin} chars`)
  process.exit(bad.length || tw.problems.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
