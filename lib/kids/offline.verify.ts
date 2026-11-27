// lib/kids/offline.verify.ts — checks for the offline kids app (public/kids-sw.js) and for
// third-party connections on /kids.
// Run: npx tsx lib/kids/offline.verify.ts  (CI: .github/workflows/quality.yml)
//
// The service worker is a plain static file that cannot import the app's TypeScript, so its
// page list drifts silently when a place or a Story Theatre episode is added. This fails on:
//   - a precached path with no page in app/ (the install would save a 404 and skip it);
//   - a tab, header tab, Settings, a "More" place or an episode that is not precached
//     (except the places in ONLINE_FIRST below, which say why);
//   - a precached page the worker also refuses to save (classroom / join);
//   - an offline-page link to a page that is not precached;
//   - a precached game that is not in GAMES;
//   - the deploy refresh (build fingerprint) missing from the worker;
//   - a static third-party <link>/<script> in the root or kids layout <head>
//     (the Supabase hint must come from SupabasePreconnectClient, which skips /kids).

import fs from 'node:fs'
import path from 'node:path'
import { KIDS_HEADER_TABS, KIDS_MORE, KIDS_SETTINGS, KIDS_TABS } from './nav'
import { EPISODES } from './stories'
import { GAMES } from './universe/worlds'

const ROOT = path.join(__dirname, '..', '..')

// Places in the nav that are deliberately NOT precached (saved on first visit instead).
const ONLINE_FIRST: Record<string, string> = {
  '/kids/ai': 'Talk to your robot and AI Spark need the network; the on-device labs are saved on first visit',
}

let failures = 0
let checks = 0
function check(ok: boolean, msg: string): void {
  checks++
  if (!ok) {
    failures++
    console.error('FAIL', msg)
  }
}

const sw = fs.readFileSync(path.join(ROOT, 'public', 'kids-sw.js'), 'utf8')

function arrayBlock(name: string): string {
  const m = sw.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\]`))
  if (!m) throw new Error(`kids-sw.js: ${name} not found`)
  return m[1]
}

const precache = [...arrayBlock('PRECACHE_PAGES').matchAll(/'([^']+)'/g)].map((m) => m[1])
const offlineLinks = [...arrayBlock('OFFLINE_LINKS').matchAll(/\['([^']+)'/g)].map((m) => m[1])
const neverSave = [...(sw.match(/const NEVER_SAVE = \[([^\n]*)\]/)?.[1] ?? '').matchAll(/\/\^(.*?)\(\\\/\|\$\)\//g)].map(
  (m) => new RegExp(`^${m[1]}(\\/|$)`),
)

check(precache.length > 0, 'PRECACHE_PAGES parsed')
check(new Set(precache).size === precache.length, 'PRECACHE_PAGES has no duplicates')
check(neverSave.length >= 2, 'NEVER_SAVE parsed')

function routeExists(p: string): boolean {
  return fs.existsSync(path.join(ROOT, 'app', ...p.split('/').filter(Boolean), 'page.tsx'))
}

for (const p of precache) {
  const slug = p.match(/^\/kids\/stories\/([^/]+)$/)?.[1]
  const ok = slug ? EPISODES.some((e) => e.slug === slug) && routeExists('/kids/stories/[slug]') : routeExists(p)
  check(ok, `precached ${p} has a page`)
  check(!neverSave.some((re) => re.test(p)), `precached ${p} is not in NEVER_SAVE`)
  const game = p.match(/^\/kids\/play\/([^/]+)$/)?.[1]
  if (game) check(GAMES.some((g) => g.id === game), `precached game ${game} is in GAMES`)
}

const nav = [...KIDS_TABS, ...KIDS_HEADER_TABS, KIDS_SETTINGS, ...KIDS_MORE].map((t) => t.href)
for (const href of new Set(nav)) {
  check(precache.includes(href) || href in ONLINE_FIRST, `nav place ${href} is precached (or listed in ONLINE_FIRST)`)
}
for (const ep of EPISODES) check(precache.includes(`/kids/stories/${ep.slug}`), `episode ${ep.slug} is precached`)
for (const p of offlineLinks) check(precache.includes(p), `offline-page link ${p} is precached`)

// Deploy refresh: the worker must fingerprint the build and re-run the precache on change.
check(/const KEEP_BUILD = /.test(sw), 'worker records the precached build (KEEP_BUILD)')
check(/function refreshAfterDeploy\(/.test(sw) && /return refreshAfterDeploy\(\)/.test(sw), 'a navigation with a new build re-runs the precache')
check(/webpack-\[\^\/\]\+\\\\\.js/.test(sw) || sw.includes('webpack-[^/]+\\.js'), 'build fingerprint is the webpack runtime chunk')

// No static third-party hints/scripts in a layout that /kids renders under.
for (const file of ['app/layout.tsx', 'app/kids/layout.tsx']) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const tags = src.match(/<(link|script)\b[^>]*>/g) ?? []
  for (const tag of tags) check(!/(href|src)=["'{`]*(https?:)?\/\//.test(tag), `${file}: no third-party ${tag.slice(0, 60)}`)
}
const pre = fs.readFileSync(path.join(ROOT, 'components', 'SupabasePreconnectClient.tsx'), 'utf8')
check(/startsWith\('\/kids\/'\)/.test(pre), 'Supabase preconnect skips /kids')

console.log(`kids offline: ${checks - failures}/${checks} checks passed`)
if (failures) process.exit(1)
