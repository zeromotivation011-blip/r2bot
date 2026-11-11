#!/usr/bin/env node
// Assert that every published "Robotics in Daily Life" article is real:
// written, sourced, correctly linked, and in step with the catalogue.
//
// WHY: /daily-life sits in the main nav and its article cards used to be
// stubs with empty bodies and a "Coming soon" badge. A page that exists but
// says nothing is the failure mode §16 of CLAUDE.md warns about, so this
// checks what the articles SAY, not just that the files exist.
//
// Checks, per slug in PUBLISHED_SLUGS (lib/daily-life.ts):
//   - a file lib/daily-life-articles/<slug>.mdx exists with frontmatter
//   - body ≥ 600 words (and ≤ 1,000 — these are short explainers)
//   - ≥ 2 https sources in frontmatter, each also present in the body
//   - every /atlas/concept/<x>, /shorts/<x>, /robots/<x>, /daily-life/<x>
//     link resolves to an existing file / catalogue entry
//   - title ≤ 60 chars, excerpt ≤ 155 chars, matching the catalogue
//   - the required sections are present
// Also: every .mdx file is listed in PUBLISHED_SLUGS (no orphan files), and
// the catalogue count matches the expected total.
//
// Usage: node scripts/check-daily-life.mjs

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const ROOT = process.cwd()
const DIR = path.join(ROOT, 'lib', 'daily-life-articles')
const CATALOGUE = path.join(ROOT, 'lib', 'daily-life.ts')

const EXPECTED_TOTAL = 10 // entries in DAILY_LIFE_ARTICLES
const MIN_WORDS = 600
const MAX_WORDS = 1000
const MIN_SOURCES = 2
const REQUIRED_SECTIONS = ['## What it is', '## How it works', "## Where you'll see it", "## What it can't do yet", '## Try it / learn more', '## Sources']

const errors = []
const fail = (slug, msg) => errors.push(`${slug}: ${msg}`)

// --- read the catalogue without a TS toolchain: regex over a plain file ---
const cat = fs.readFileSync(CATALOGUE, 'utf-8')
const catalogueSlugs = [...cat.matchAll(/^\s+slug: '([^']+)',/gm)].map((m) => m[1])
const catalogueTitles = Object.fromEntries([...cat.matchAll(/slug: '([^']+)',\s*\n(?:\s*\/\/.*\n)?\s*title: '((?:[^'\\]|\\.)*)',/gm)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]))
const publishedBlock = /PUBLISHED_SLUGS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(cat)
const published = publishedBlock ? [...publishedBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []

if (catalogueSlugs.length !== EXPECTED_TOTAL) fail('catalogue', `expected ${EXPECTED_TOTAL} entries in DAILY_LIFE_ARTICLES, found ${catalogueSlugs.length}`)
if (published.length === 0) fail('catalogue', 'PUBLISHED_SLUGS is empty or unparseable')
for (const s of published) if (!catalogueSlugs.includes(s)) fail(s, 'in PUBLISHED_SLUGS but not in DAILY_LIFE_ARTICLES')

// --- link targets ---
const atlasConcepts = new Set(fs.readdirSync(path.join(ROOT, 'content', 'atlas', 'concept')).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, '')))
const shortsSrc = ['shorts.ts', 'shorts-more.ts', 'shorts-scheduled.ts'].map((f) => path.join(ROOT, 'lib', f)).filter(fs.existsSync).map((f) => fs.readFileSync(f, 'utf-8')).join('\n')
const shortSlugs = new Set([...shortsSrc.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]))
const liveShortSlugs = new Set(
  [...shortsSrc.matchAll(/slug: '([^']+)'[^\n]*?(?:publishAt: '([^']+)')?/g)]
    .filter((m) => !m[2] || Date.parse(m[2]) <= Date.now())
    .map((m) => m[1]),
)
const robotsSrc = fs.readFileSync(path.join(ROOT, 'lib', 'robots-data.ts'), 'utf-8')
const robotSlugs = new Set([...robotsSrc.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]))

const wordCount = (md) =>
  (md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_>`-]/g, ' ')
    .match(/\S+/g) ?? []).length

// --- orphan files ---
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''))
for (const f of files) if (!published.includes(f)) fail(f, 'file exists but slug is not in PUBLISHED_SLUGS')

// --- per article ---
const report = []
for (const slug of published) {
  const file = path.join(DIR, `${slug}.mdx`)
  if (!fs.existsSync(file)) { fail(slug, 'listed in PUBLISHED_SLUGS but no .mdx file'); continue }
  const { data, content } = matter(fs.readFileSync(file, 'utf-8'))
  const body = content.trim()

  if (typeof data.title !== 'string' || !data.title) fail(slug, 'frontmatter.title missing')
  else {
    if (data.title.length > 60) fail(slug, `title is ${data.title.length} chars (max 60)`)
    if (catalogueTitles[slug] && catalogueTitles[slug] !== data.title) fail(slug, `title differs from catalogue ("${catalogueTitles[slug]}")`)
  }
  if (typeof data.excerpt !== 'string' || !data.excerpt) fail(slug, 'frontmatter.excerpt missing')
  else if (data.excerpt.length > 155) fail(slug, `excerpt is ${data.excerpt.length} chars (max 155)`)
  for (const k of ['category', 'readTime', 'publishedAt', 'updatedAt']) if (!data[k]) fail(slug, `frontmatter.${k} missing`)
  if (data.publishedAt && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.publishedAt))) fail(slug, `publishedAt must be YYYY-MM-DD, got ${data.publishedAt}`)

  const words = wordCount(body)
  if (words < MIN_WORDS) fail(slug, `body is ${words} words (min ${MIN_WORDS})`)
  if (words > MAX_WORDS) fail(slug, `body is ${words} words (max ${MAX_WORDS})`)
  const minutes = Math.max(1, Math.ceil(words / 200))
  if (data.readTime && Math.abs(parseInt(String(data.readTime), 10) - minutes) > 1) fail(slug, `readTime "${data.readTime}" does not match ${words} words (~${minutes} min)`)

  const sources = Array.isArray(data.sources) ? data.sources : []
  const https = sources.filter((s) => s && typeof s.url === 'string' && /^https:\/\//.test(s.url) && typeof s.name === 'string' && s.name)
  if (https.length < MIN_SOURCES) fail(slug, `${https.length} https sources (min ${MIN_SOURCES})`)
  for (const s of https) if (!body.includes(s.url)) fail(slug, `source not cited in body: ${s.url}`)

  for (const sec of REQUIRED_SECTIONS) if (!body.includes(sec)) fail(slug, `missing section "${sec}"`)

  const links = [...body.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1])
  if (!links.some((l) => l.startsWith('/atlas/concept/'))) fail(slug, 'no Atlas concept links')
  for (const l of links) {
    const [, kind, rest] = /^\/(atlas\/concept|shorts|robots|daily-life)\/([^/#?]+)/.exec(l) ?? []
    if (!kind) { fail(slug, `internal link outside the allowed set: ${l}`); continue }
    if (kind === 'atlas/concept' && !atlasConcepts.has(rest)) fail(slug, `Atlas concept does not exist: ${rest}`)
    if (kind === 'shorts') {
      if (!shortSlugs.has(rest)) fail(slug, `Quick Lesson does not exist: ${rest}`)
      else if (!liveShortSlugs.has(rest)) fail(slug, `Quick Lesson is scheduled, not live yet: ${rest}`)
    }
    if (kind === 'robots' && !robotSlugs.has(rest)) fail(slug, `robot profile does not exist: ${rest}`)
    if (kind === 'daily-life' && !published.includes(rest)) fail(slug, `daily-life article not published: ${rest}`)
  }
  const atlasFm = Array.isArray(data.atlasLinks) ? data.atlasLinks : []
  for (const a of atlasFm) if (!atlasConcepts.has(a.slug)) fail(slug, `frontmatter atlasLinks slug does not exist: ${a.slug}`)

  report.push({ slug, words, sources: https.length, links: links.length })
}

for (const r of report) console.log(`ok  ${r.slug.padEnd(52)} ${String(r.words).padStart(4)} words  ${r.sources} sources  ${r.links} links`)
console.log(`\n${report.length}/${catalogueSlugs.length} catalogue entries published`)

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log('daily-life check passed')
