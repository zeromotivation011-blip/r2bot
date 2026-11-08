#!/usr/bin/env node
// Turn an Unlighthouse run into a short, readable summary in the Actions log.
//
// WHY THIS IS DEFENSIVE: the exact filename and JSON shape of the reporter
// output were not verified against a real run when this was written (the audit
// could not be executed in the authoring environment). So rather than assume a
// path and crash the workflow on a guess, this discovers whatever JSON the run
// produced, handles the shapes it may take, and says plainly when it cannot
// read something. A reporting step must never be the reason a workflow fails:
// it exits 0 no matter what. The budget flag is what fails a run.
//
// Shape confirmed by the first real run (8 Nov 2026): the reporter writes
// .unlighthouse/ci-result.json and the probe below reads it correctly.
//
// That run also exposed a hole in THIS script. Unlighthouse crawled 1,756 URLs
// fast enough to trip the site's rate limiting, which answered 403; it skipped
// nearly every page and finished with 34. This script reported "34 pages
// audited", good averages, and exit 0 — a scan that silently missed 98% of the
// site went green. That is the exact failure this whole workflow was built to
// catch, reproduced by the tool meant to catch it.
//
// So coverage is now assertable: pass --min <n> and the script exits non-zero
// when fewer pages were audited than demanded. Without --min it stays a pure
// reporter and always exits 0.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const minIdx = args.indexOf('--min')
const MIN = minIdx === -1 ? null : Number(args[minIdx + 1])
const DIR = args.find((a, i) => !a.startsWith('--') && i !== minIdx + 1) || '.unlighthouse'

if (minIdx !== -1 && (!Number.isFinite(MIN) || MIN <= 0)) {
  console.error('--min needs a positive number')
  process.exit(2)
}

/**
 * Exit the way the caller asked for. Reporting mode always succeeds; coverage
 * mode fails loudly, because a scan that quietly audited a handful of pages is
 * worse than no scan — it looks like evidence.
 */
function finish(auditedCount) {
  if (MIN === null) process.exit(0)
  if (auditedCount < MIN) {
    console.error(
      `\nCOVERAGE FAILURE: ${auditedCount} pages audited, ${MIN} required.\n` +
        'The scan did not cover what it was asked to. Check the audit step log for\n' +
        '"Skipping ... code: 403" — the site rate-limits a fast crawler, so the scan\n' +
        'must use an explicit --urls list rather than crawling every route.',
    )
    process.exit(1)
  }
  console.log(`\nCoverage ok: ${auditedCount} pages audited, ${MIN} required.`)
  process.exit(0)
}

function findJson(dir, depth = 0) {
  if (depth > 3) return []
  let out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  for (const name of entries) {
    const p = join(dir, name)
    let s
    try {
      s = statSync(p)
    } catch {
      continue
    }
    if (s.isDirectory()) out = out.concat(findJson(p, depth + 1))
    else if (name.endsWith('.json')) out.push({ path: p, size: s.size })
  }
  return out
}

const files = findJson(DIR).sort((a, b) => b.size - a.size)
if (files.length === 0) {
  console.log(`No JSON report found under ${DIR}/.`)
  console.log('The scan may have failed before writing results — check the audit step above.')
  finish(0)
}

console.log(`Found ${files.length} JSON file(s) under ${DIR}/. Reading the largest.`)

let parsed
try {
  parsed = JSON.parse(readFileSync(files[0].path, 'utf8'))
} catch (err) {
  console.log(`Could not parse ${files[0].path}: ${err.message}`)
  finish(0)
}

// Pull out anything that looks like {url/path, score(s)}. Unlighthouse has used
// a few shapes across versions, so probe rather than insist.
const rows = []
const visit = (node) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach(visit)
    return
  }
  const url = node.route?.path ?? node.path ?? node.url ?? node.finalUrl
  const cats = node.categories ?? node.report?.categories ?? node.score
  if (url && cats) {
    const pick = (k) => {
      const v = cats?.[k]?.score ?? cats?.[k]
      return typeof v === 'number' ? Math.round(v <= 1 ? v * 100 : v) : null
    }
    rows.push({
      url: String(url),
      performance: pick('performance'),
      accessibility: pick('accessibility'),
      seo: pick('seo'),
      best: pick('best-practices'),
      overall: typeof cats === 'number' ? Math.round(cats <= 1 ? cats * 100 : cats) : null,
    })
  }
  Object.values(node).forEach(visit)
}
visit(parsed)

if (rows.length === 0) {
  console.log('Report parsed, but no per-page scores recognised in it.')
  console.log('Top-level keys:', Object.keys(parsed).slice(0, 20).join(', '))
  console.log('The full report is attached to this run as an artifact.')
  finish(0)
}

// Deduplicate by URL, keeping the first.
const seen = new Set()
const unique = rows.filter((r) => (seen.has(r.url) ? false : seen.add(r.url)))

const avg = (k) => {
  const vals = unique.map((r) => r[k]).filter((v) => typeof v === 'number')
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : '—'
}

console.log(`\n${unique.length} pages audited.`)
console.log(
  `Averages — performance ${avg('performance')}, accessibility ${avg('accessibility')}, ` +
    `SEO ${avg('seo')}, best-practices ${avg('best')}`,
)

// Accessibility first: it is the bar with no other coverage anywhere, and a
// failure there is a person who cannot use the page, not a slow page.
for (const cat of ['accessibility', 'seo', 'performance', 'best']) {
  const scored = unique.filter((r) => typeof r[cat] === 'number').sort((a, b) => a[cat] - b[cat])
  if (scored.length === 0) continue
  console.log(`\nWorst ${cat}:`)
  for (const r of scored.slice(0, 8)) console.log(`  ${String(r[cat]).padStart(3)}  ${r.url}`)
}

console.log('\nFull interactive report: the "site-audit-report" artifact on this run.')

finish(unique.length)
