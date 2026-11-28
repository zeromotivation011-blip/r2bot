#!/usr/bin/env node
// scripts/kids-app/build-export.mjs — R2BOT Kids as a STANDALONE app bundle.
//
// Turns every /kids page into static files for the Android/iOS app
// (apps/kids-mobile/www, Capacitor's webDir), so the app runs with no network
// and no www.r2bot.in. The website build is never touched: all the surgery
// happens in a scratch copy of the repo.
//
//   npm run kids:app:export                 (repo root)
//   npm run build:apk                       (apps/kids-mobile: this + cap sync + gradle)
//
// Steps
//   1. Copy the repo to a scratch dir (default /tmp/kids-app-build; set
//      KIDS_APP_BUILD_DIR to move it), without .git/.next/node_modules/apps.
//      node_modules is a symlink to the repo's own.
//   2. In the COPY only: delete app/api, middleware.ts and every app/* route that
//      is not /kids; copy scripts/kids-app/overrides/** over the copy (the app's
//      root layout, the start page, a kids 404, static redirect pages, note pages
//      for the server-only grown-up screens, generateStaticParams for the client
//      routes); delete the pages a static export cannot hold (see REMOVE below);
//      write a next.config.mjs with output:'export'.
//   3. `next build` in the copy with NEXT_PUBLIC_KIDS_APP=1 (lib/kids/app-context.ts
//      KIDS_STANDALONE: no service worker, no /api calls, gated outbound links
//      open on www.r2bot.in).
//   4. Replace apps/kids-mobile/www with the export, add offline.html (from
//      apps/kids-mobile/offline/index.html) and app-build.json.
//
// Path rule the native layer must follow (trailingSlash export):
//   a path with no file extension -> <path>/index.html  (/kids/hangar -> kids/hangar/index.html)
//   anything else                 -> that file          (/_next/static/..., /kids/hangar/index.txt)
//   no such file                  -> 404.html
//
// No new dependencies: node built-ins and the repo's own `next`.

import { spawnSync, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const BUILD = path.resolve(process.env.KIDS_APP_BUILD_DIR || '/tmp/kids-app-build')
const OVERRIDES = path.join(HERE, 'overrides')
const MOBILE = path.join(ROOT, 'apps', 'kids-mobile')
const WWW = path.join(MOBILE, 'www')
const OFFLINE_SRC = path.join(MOBILE, 'offline', 'index.html')

/** Top-level repo entries never copied into the scratch build. */
const SKIP_TOP = new Set(['.git', '.next', 'node_modules', 'apps', 'out', 'tsconfig.tsbuildinfo', 'reels', '.vercel', '.env', '.env.local'])
/** public/ files the app does not need (search-engine verification, the PWA worker). */
const SKIP_PUBLIC = new Set(['kids-sw.js', 'prototype.html', 'googleff031e959691a871.html', 'd0bc705d5159ce054cfc727d7b12dd95.txt'])
/** app/* entries kept in the copy (everything else is the adult site, removed). */
const KEEP_APP = new Set(['kids', 'globals.css', 'layout.tsx', 'loading.tsx', 'template.tsx', 'icon.svg'])

/**
 * Removed from the copy, with the reason. A static export cannot hold them,
 * and the app does not need them.
 */
const REMOVE = [
  // Teacher dashboards for one class: data from the server, per class id.
  ['app/kids/classroom/[classId]', 'per-class teacher dashboard (roster, projector, join card): server data for a class id that only exists on r2bot.in'],
  // A share card for social media, drawn by a server route.
  ['app/kids/opengraph-image.tsx', 'social share image: no use inside the app'],
  // The PWA manifest route: the app is the installed app.
  ['app/kids/manifest.webmanifest', 'PWA manifest: the native app replaces the PWA install'],
]

const log = (...a) => console.log('[kids-app]', ...a)

function rm(p) {
  fs.rmSync(p, { recursive: true, force: true })
}

function gitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function gitDirty() {
  try {
    return execFileSync('git', ['status', '--porcelain', '--', 'app', 'components', 'lib', 'scripts/kids-app', 'public'], { cwd: ROOT, encoding: 'utf8' }).trim() !== ''
  } catch {
    return false
  }
}

// ── 1. Scratch copy ─────────────────────────────────────────────────────────
function makeCopy() {
  // Keep Next's build cache between runs (much faster second builds).
  const cache = path.join(BUILD, '.next', 'cache')
  const keep = path.join(path.dirname(BUILD), `.kids-app-next-cache`)
  rm(keep)
  if (fs.existsSync(cache)) fs.renameSync(cache, keep)
  rm(BUILD)
  fs.mkdirSync(BUILD, { recursive: true })
  for (const name of fs.readdirSync(ROOT)) {
    if (SKIP_TOP.has(name)) continue
    fs.cpSync(path.join(ROOT, name), path.join(BUILD, name), {
      recursive: true,
      filter: (src) => {
        const rel = path.relative(ROOT, src)
        if (rel.startsWith(`public${path.sep}`) && SKIP_PUBLIC.has(rel.slice('public/'.length))) return false
        return true
      },
    })
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(BUILD, 'node_modules'), 'dir')
  if (fs.existsSync(keep)) {
    fs.mkdirSync(path.join(BUILD, '.next'), { recursive: true })
    fs.renameSync(keep, cache)
  }
  log('scratch copy at', BUILD)
}

// ── 2. App-only surgery (in the copy) ───────────────────────────────────────
function prune() {
  const app = path.join(BUILD, 'app')
  for (const name of fs.readdirSync(app)) {
    if (!KEEP_APP.has(name)) rm(path.join(app, name))
  }
  rm(path.join(BUILD, 'middleware.ts'))
  for (const [rel] of REMOVE) rm(path.join(BUILD, rel))
  // The overrides mirror the repo; copy them over the scratch tree.
  fs.cpSync(path.join(OVERRIDES), BUILD, { recursive: true })

  // Static export cannot use headers/redirects/rewrites or the image optimizer.
  // Type-check and lint are the root build's job (`npm run type-check`): the
  // copy no longer has the adult routes some shared files import from.
  fs.writeFileSync(
    path.join(BUILD, 'next.config.mjs'),
    `// Written by scripts/kids-app/build-export.mjs: the standalone R2BOT Kids app.\n` +
      `/** @type {import('next').NextConfig} */\n` +
      `export default {\n` +
      `  reactStrictMode: true,\n` +
      `  output: 'export',\n` +
      `  trailingSlash: true,\n` +
      `  images: { unoptimized: true },\n` +
      `  typescript: { ignoreBuildErrors: true },\n` +
      `  eslint: { ignoreDuringBuilds: true },\n` +
      `}\n`,
  )
  log('pruned to /kids; overrides applied')
}

// ── 3. next build ───────────────────────────────────────────────────────────
function build() {
  const env = {
    ...process.env,
    NEXT_PUBLIC_KIDS_APP: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    // The app never talks to Supabase; the shared code only needs the names set.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://x.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy',
    NEXT_PUBLIC_SITE_URL: 'https://www.r2bot.in',
    // Never analytics in a children's app, whatever the shell has set.
    NEXT_PUBLIC_GA_ID: '',
  }
  const next = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
  log('next build (export)…')
  const r = spawnSync(process.execPath, [next, 'build'], { cwd: BUILD, env, stdio: 'inherit' })
  if (r.status !== 0) {
    console.error('[kids-app] next build failed')
    process.exit(r.status ?? 1)
  }
}

// ── 4. Into the app ─────────────────────────────────────────────────────────
function countHtml(dir) {
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) n += countHtml(p)
    else if (e.name.endsWith('.html')) n++
  }
  return n
}

function install() {
  const out = path.join(BUILD, 'out')
  if (!fs.existsSync(path.join(out, 'index.html')) || !fs.existsSync(path.join(out, 'kids', 'index.html'))) {
    console.error('[kids-app] export is missing index.html or kids/index.html')
    process.exit(1)
  }
  rm(WWW)
  fs.cpSync(out, WWW, { recursive: true })
  if (fs.existsSync(OFFLINE_SRC)) fs.copyFileSync(OFFLINE_SRC, path.join(WWW, 'offline.html'))
  else log('warning: no', path.relative(ROOT, OFFLINE_SRC))
  const pages = countHtml(WWW)
  const kidsPages = countHtml(path.join(WWW, 'kids'))
  const info = {
    builtFrom: gitSha(),
    dirty: gitDirty(),
    builtAt: new Date().toISOString(),
    pages,
    kidsPages,
    pathRule: 'no extension -> <path>/index.html; otherwise the file; missing -> 404.html',
    removed: REMOVE.map(([p, why]) => ({ path: p, why })),
  }
  fs.writeFileSync(path.join(WWW, 'app-build.json'), JSON.stringify(info, null, 2) + '\n')
  log(`www ready: ${pages} html pages (${kidsPages} under /kids) ->`, path.relative(ROOT, WWW))
}

makeCopy()
prune()
build()
install()
