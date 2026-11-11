#!/usr/bin/env node
// Assert that the blog says something, cites something, and links to pages
// that exist.
//
// WHY THIS EXISTS: on 11 Nov 2026, 23 of 32 posts were under 500 words and
// none of the 32 carried a single source URL. Five were sub-350-word copies of
// an Atlas concept that is two to four times deeper, competing with it for one
// query. Those five now 308 to the Atlas (next.config.mjs) and the rest were
// expanded or sourced. This check stops the blog sliding back:
//
//   * every evergreen (non-`news`) post is at least MIN_WORDS of body
//   * every evergreen post has a "## Sources" section with https:// URLs
//   * title <= 65 chars, description <= 160 chars (what the SERP shows)
//   * every internal link resolves to a content file or an app route
//   * every slug that next.config.mjs redirects away from /blog/ has no file
//     (a file would shadow the redirect in the index and the sitemap)
//
// Pure filesystem, no network, so it can run in quality.yml on every PR.
//
// Usage: node scripts/check-blog.mjs

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const ROOT = process.cwd()
const BLOG_DIR = path.join(ROOT, 'content', 'blog')
const APP_DIR = path.join(ROOT, 'app')
const MIN_WORDS = 500
const MAX_TITLE = 65
const MAX_DESCRIPTION = 160

const errors = []
const warnings = []

// ---------------------------------------------------------------------------
// Route resolution
// ---------------------------------------------------------------------------

/** Does a path resolve to an app route (static dir or dynamic [segment])? */
function appRouteExists(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  let dir = APP_DIR
  for (const seg of segments) {
    const exact = path.join(dir, seg)
    if (fs.existsSync(exact) && fs.statSync(exact).isDirectory()) {
      dir = exact
      continue
    }
    const dynamic = fs
      .readdirSync(dir, { withFileTypes: true })
      .find((d) => d.isDirectory() && /^\[.+\]$/.test(d.name))
    if (dynamic) {
      dir = path.join(dir, dynamic.name)
      continue
    }
    const catchAll = fs
      .readdirSync(dir, { withFileTypes: true })
      .find((d) => d.isDirectory() && /^\[\.\.\..+\]$/.test(d.name))
    if (catchAll) return true
    return false
  }
  return fs.existsSync(path.join(dir, 'page.tsx')) || fs.existsSync(path.join(dir, 'route.ts'))
}

const compareSlugs = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'compare', 'index.ts'), 'utf-8')
  return new Set([...src.matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => m[1]))
})()

const simulatorSrc = fs.readFileSync(path.join(ROOT, 'lib', 'simulators.ts'), 'utf-8')

/**
 * Resolve an internal href. Content-backed routes are checked against their
 * files so a link to a concept that was never written fails here instead of
 * on the live site.
 */
function internalLinkResolves(href) {
  const pathname = href.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/'
  if (pathname === '/') return true

  let m
  if ((m = pathname.match(/^\/atlas\/(concept|robot|company|person)\/([^/]+)$/))) {
    return fs.existsSync(path.join(ROOT, 'content', 'atlas', m[1], `${m[2]}.mdx`))
  }
  if ((m = pathname.match(/^\/blog\/([^/]+)$/))) {
    return fs.existsSync(path.join(BLOG_DIR, `${m[1]}.mdx`)) || fs.existsSync(path.join(BLOG_DIR, `${m[1]}.md`))
  }
  if ((m = pathname.match(/^\/compare\/([^/]+)$/))) return compareSlugs.has(m[1])
  if ((m = pathname.match(/^\/visualizer\/([^/]+)$/))) {
    return new RegExp(`['"]${m[1]}['"]`).test(simulatorSrc)
  }
  if ((m = pathname.match(/^\/academy\/([^/]+)(?:\/([^/]+))?$/))) {
    const track = path.join(ROOT, 'content', 'academy', m[1])
    if (!fs.existsSync(track)) return appRouteExists(pathname)
    if (!m[2]) return true
    return fs.existsSync(path.join(track, `${m[2]}.mdx`)) || fs.existsSync(path.join(track, m[2]))
  }
  return appRouteExists(pathname)
}

// ---------------------------------------------------------------------------
// Redirected slugs must not exist as files
// ---------------------------------------------------------------------------

const nextConfig = fs.readFileSync(path.join(ROOT, 'next.config.mjs'), 'utf-8')
const redirectedSlugs = [...nextConfig.matchAll(/source:\s*'\/blog\/([^':]+)'/g)].map((m) => m[1])
for (const slug of redirectedSlugs) {
  if (fs.existsSync(path.join(BLOG_DIR, `${slug}.mdx`)) || fs.existsSync(path.join(BLOG_DIR, `${slug}.md`))) {
    errors.push(`${slug}: redirected in next.config.mjs but content/blog/${slug}.mdx still exists`)
  }
}

// The canonical-map record must list the same slugs as the config.
const canonicalMap = fs.readFileSync(path.join(ROOT, 'lib', 'canonical-map.ts'), 'utf-8')
for (const slug of redirectedSlugs) {
  if (!canonicalMap.includes(`'${slug}'`)) {
    errors.push(`${slug}: redirected in next.config.mjs but missing from BLOG_TO_ATLAS in lib/canonical-map.ts`)
  }
}

// ---------------------------------------------------------------------------
// Per-post checks
// ---------------------------------------------------------------------------

const files = fs.readdirSync(BLOG_DIR).filter((f) => /\.(mdx|md)$/.test(f))
const rows = []

for (const file of files) {
  const slug = file.replace(/\.(mdx|md)$/, '')
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
  const { data, content } = matter(raw)
  const isNews = data.kind === 'news'

  // Word count of prose: strip code fences, tables' pipes, markdown link
  // targets and the Sources section (URLs are not prose).
  const body = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/^## Sources[\s\S]*$/m, '')
  const words = body.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length

  const sourcesSection = content.match(/^## Sources\s*$([\s\S]*)$/m)
  const sourceUrls = sourcesSection ? [...sourcesSection[1].matchAll(/https:\/\/[^\s)>\]]+/g)].map((m) => m[0]) : []

  const title = String(data.title ?? '')
  const description = String(data.description ?? '')

  if (!isNews) {
    if (words < MIN_WORDS) errors.push(`${slug}: ${words} words (minimum ${MIN_WORDS})`)
    if (!sourcesSection) errors.push(`${slug}: no "## Sources" section`)
    else if (sourceUrls.length === 0) errors.push(`${slug}: Sources section has no https:// URL`)
  }
  // News posts are dated reports with their own conventions; their SERP
  // lengths are reported, not enforced.
  const lengthProblem = (what, len, max) => `${slug}: ${what} is ${len} chars (max ${max})`
  if (title.length > MAX_TITLE) (isNews ? warnings : errors).push(lengthProblem('title', title.length, MAX_TITLE))
  if (description.length > MAX_DESCRIPTION) (isNews ? warnings : errors).push(lengthProblem('description', description.length, MAX_DESCRIPTION))
  if (!title) errors.push(`${slug}: missing title`)
  if (!description) errors.push(`${slug}: missing description`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date ?? ''))) errors.push(`${slug}: date must be YYYY-MM-DD`)
  if (data.updated != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.updated))) {
    errors.push(`${slug}: updated must be YYYY-MM-DD`)
  }
  if (data.updated != null && String(data.updated) < String(data.date)) {
    errors.push(`${slug}: updated (${data.updated}) is before date (${data.date})`)
  }

  // Internal links: markdown [text](/path) only. External links are the
  // Sources section's job and are checked for liveness by live-checks.yml.
  const internal = [...content.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1])
  for (const href of internal) {
    if (!internalLinkResolves(href)) errors.push(`${slug}: internal link does not resolve: ${href}`)
  }

  // Em-dash budget: at most 2 per 300 words of prose (house style).
  const emDashes = (body.match(/—/g) || []).length
  const budget = Math.max(2, Math.ceil(words / 300) * 2)
  if (emDashes > budget) warnings.push(`${slug}: ${emDashes} em-dashes in ${words} words (budget ${budget})`)

  rows.push({ slug, kind: isNews ? 'news' : 'evergreen', words, sources: sourceUrls.length, updated: data.updated ?? '' })
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

rows.sort((a, b) => a.words - b.words)
console.log(`check-blog: ${rows.length} posts, ${redirectedSlugs.length} redirected slugs\n`)
for (const r of rows) {
  console.log(`  ${String(r.words).padStart(5)} w  ${String(r.sources).padStart(2)} src  ${r.kind.padEnd(9)} ${r.slug}${r.updated ? `  (updated ${r.updated})` : ''}`)
}
console.log()
for (const w of warnings) console.log(`WARN  ${w}`)
for (const e of errors) console.log(`FAIL  ${e}`)
if (errors.length) {
  console.log(`\ncheck-blog: ${errors.length} error(s)`)
  process.exit(1)
}
console.log(`check-blog: ok${warnings.length ? ` (${warnings.length} warning(s))` : ''}`)
