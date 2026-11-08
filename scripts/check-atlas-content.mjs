#!/usr/bin/env node
// Assert that Atlas pages actually contain their content.
//
// WHY THIS EXISTS: on 8 Nov 2026 a seed run inserted 512 rows into
// `atlas_entries` carrying only type/slug/status — empty body, empty `data`.
// The merge in lib/atlas-db.ts lets the database win on content, so every one
// of those slugs stopped serving its MDX file and started serving a husk:
// the <h1> printed the raw slug ("a-star-algorithm" instead of "A* (A-Star)
// Pathfinding"), the body was blank, and the page measured "1 min read".
//
// All 512 pages — the entire knowledge base this site exists to rank — went
// empty in fourteen seconds. Every existing check passed: the pages returned
// 200, the sitemap listed them, the links resolved, the canonical was right.
// Nothing measured whether a page SAID anything. This does.
//
// Usage: node scripts/check-atlas-content.mjs [base]

const base = (process.argv[2] || 'https://www.r2bot.in').replace(/\/$/, '')

// A spread of entries across types and the alphabet. Each must be a page we
// expect to be substantial, with the title we expect rendered in its <h1>.
const SAMPLES = [
  { path: '/atlas/concept/a-star-algorithm', expectTitle: 'A*' },
  { path: '/atlas/concept/accelerometer', expectTitle: 'Accelerometer' },
  { path: '/atlas/concept/slam', expectTitle: 'SLAM' },
  { path: '/atlas/concept/pid-controller', expectTitle: 'PID' },
  { path: '/atlas/concept/lidar', expectTitle: 'LiDAR' },
]

// A real entry renders well over this much prose. A husk renders the shared
// nav and footer and nothing else, which measured ~4,100 characters, so the
// floor sits comfortably above the chrome and far below a thin real entry.
const MIN_BODY_CHARS = 6000

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

let failed = 0

for (const { path: p, expectTitle } of SAMPLES) {
  const url = `${base}${p}`
  let html
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'r2bot-live-checks' } })
    if (!res.ok) {
      console.error(`FAIL ${p} — HTTP ${res.status}`)
      failed++
      continue
    }
    html = await res.text()
  } catch (err) {
    console.error(`FAIL ${p} — ${err.message}`)
    failed++
    continue
  }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const h1 = h1Match ? strip(h1Match[1]) : ''
  const text = strip(html)
  const slug = p.split('/').pop()

  const problems = []
  // The giveaway symptom: the heading is the URL slug, because `data.title`
  // was missing and buildEntry falls back to the slug.
  if (h1 === slug) problems.push(`<h1> is the raw slug ("${slug}")`)
  if (!h1) problems.push('no <h1> at all')
  if (expectTitle && h1 && !h1.toLowerCase().includes(expectTitle.toLowerCase())) {
    problems.push(`<h1> "${h1}" does not contain "${expectTitle}"`)
  }
  if (text.length < MIN_BODY_CHARS) {
    problems.push(`only ${text.length} chars of text (floor ${MIN_BODY_CHARS}) — page looks empty`)
  }

  if (problems.length) {
    console.error(`FAIL ${p}`)
    for (const problem of problems) console.error(`       ${problem}`)
    failed++
  } else {
    console.log(`ok   ${p} — "${h1}", ${text.length} chars`)
  }
}

if (failed) {
  console.error(
    `\n${failed}/${SAMPLES.length} Atlas pages are not serving their content.\n` +
      'Most likely cause: rows in `atlas_entries` with an empty body are winning\n' +
      'over the MDX files. See hasContent() in lib/atlas-db.ts.',
  )
  process.exit(1)
}

console.log(`\nAll ${SAMPLES.length} sampled Atlas pages render real content.`)
