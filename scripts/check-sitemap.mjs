#!/usr/bin/env node
// scripts/check-sitemap.mjs
//
// Asserts the things the live sitemap got wrong before, in production, for
// four months: it served a July view of the site and was missing ~300 URLs
// including every Quick Lesson and the whole course path, and forty URLs
// reported a lastmod of "today" on every fetch, which teaches Google to
// ignore lastmod entirely.
//
// Run against the live site (default) or any origin:
//   node scripts/check-sitemap.mjs
//   node scripts/check-sitemap.mjs https://r2bot-navy.vercel.app
//
// Exits non-zero with a readable reason, so CI fails instead of a human
// noticing weeks later.

const BASE = (process.argv[2] ?? 'https://www.r2bot.in').replace(/\/$/, '')

// Floor, not a target: the sitemap had 919 URLs on 8 Nov 2026. It should grow.
// A drop means routes stopped generating, which is the failure we care about.
const MIN_URLS = 850

// Every one of these was absent from the live sitemap during the regression.
const REQUIRED_SUBSTRINGS = [
  '/shorts/',
  '/shorts/course/',
  '/courses/',
  '/ai-robotics',
  '/atlas/concept/',
  '/robots/',
  '/academy/',
  '/blog/',
  '/start',
  '/about/how-this-is-written',
  '/zh/',
  '/hi/',
  '/es/',
]

// A static page claiming it changed today, every day, is the lastmod bug.
// This check cannot tell "genuinely edited today" from "always says today" in
// a single run, so the threshold only catches the pathological case. If it
// trips, diff the offending URLs against lib/content-dates.ts and the content
// itself: anything not actually edited today is the bug.
//
// Calibration: it caught a real one on 8 Nov 2026 at 567 URLs. Every Atlas
// entry was reporting today, every day, because the atlas_entries rows carry
// no `lastReviewed` and the missing value defaulted forward to the current
// date. A day when a large batch legitimately ships — 25 new Quick Lessons
// plus their hubs and translations — reaches about 60, so the ceiling sits
// above that and well below the broken case.
const MAX_TODAY_LASTMOD = 120

function fail(msg) {
  console.error(`FAIL  ${msg}`)
  process.exitCode = 1
}
function pass(msg) {
  console.log(`ok    ${msg}`)
}

const res = await fetch(`${BASE}/sitemap.xml`, {
  headers: { 'user-agent': 'r2bot-sitemap-check' },
})
if (!res.ok) {
  console.error(`FAIL  ${BASE}/sitemap.xml returned ${res.status}`)
  process.exit(1)
}
const xml = await res.text()

const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])

if (locs.length < MIN_URLS) {
  fail(`only ${locs.length} URLs in the sitemap, expected at least ${MIN_URLS}`)
} else {
  pass(`${locs.length} URLs`)
}

for (const needle of REQUIRED_SUBSTRINGS) {
  const n = locs.filter((l) => l.includes(needle)).length
  if (n === 0) fail(`no URL contains "${needle}" — a whole section is missing from the sitemap`)
  else pass(`${needle} → ${n} URLs`)
}

const today = new Date().toISOString().slice(0, 10)
const todays = lastmods.filter((d) => d.startsWith(today)).length
if (todays > MAX_TODAY_LASTMOD) {
  fail(
    `${todays} URLs report a lastmod of today (${today}). Dates must come from the content or ` +
      `lib/content-dates.ts — never new Date() for a static page.`,
  )
} else {
  pass(`${todays} URLs with today's lastmod (limit ${MAX_TODAY_LASTMOD})`)
}

const dupes = locs.filter((l, i) => locs.indexOf(l) !== i)
if (dupes.length) fail(`duplicate URLs in sitemap: ${[...new Set(dupes)].slice(0, 5).join(', ')}`)
else pass('no duplicate URLs')

const nonCanonical = locs.filter((l) => !l.startsWith('https://www.r2bot.in'))
if (nonCanonical.length) {
  fail(`${nonCanonical.length} URLs are not on https://www.r2bot.in, e.g. ${nonCanonical[0]}`)
} else {
  pass('every URL is on the canonical host')
}

if (process.exitCode === 1) {
  console.error('\nSitemap check failed. See CLAUDE.md §12 for why each of these exists.')
} else {
  console.log('\nSitemap check passed.')
}
