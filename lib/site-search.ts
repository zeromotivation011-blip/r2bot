// lib/site-search.ts
//
// The site-wide search index.
//
// r2bot.in had 923 indexable URLs — 472 Atlas concepts, 47 Quick Lessons, 24
// robots, 23 Academy lessons, 32 posts, 9 simulators — and no way to search
// them. The only ⌘K in the header opened the Co-pilot, and the one real search
// (components/atlas/AtlasCommandSearch.tsx, Fuse-powered and good) was mounted
// on /atlas alone. Someone arriving from a Short who wanted "harmonic drive"
// had to find it through the menus or go back to Google.
//
// This assembles one index from the same sources app/sitemap.ts reads, so
// anything in the sitemap is findable and the two cannot drift. It is served
// from /api/search-index and fetched the first time the palette opens, which
// keeps it out of every page's first load — the bundle discipline in
// CLAUDE.md §11 matters more than saving one round trip on a keystroke.
//
// Deliberately NOT in the index: /news (changes daily, has its own page and
// would go stale in the hourly cache), parked surfaces that are noindex
// (jobs, schools, lab, showcase), and course lessons with no video — we do
// not advertise what we noindex (CLAUDE.md §12).

import { getAllAtlasEntriesMerged } from '@/lib/atlas-db'
import { getAllAcademyLessons, trackLabel } from '@/lib/academy'
import { ROBOTS } from '@/lib/robots-data'
import { getAllPostsMerged } from '@/lib/blog-db'
import { AI_TOPICS } from '@/lib/ai-robotics'
import { SIMULATORS } from '@/lib/simulators'
import { SHORTS, SHORT_COURSES } from '@/lib/shorts'
import { listPublishedCourses, hasVideo } from '@/lib/courses'
import { loadAllProjects } from '@/lib/build/loader'
import { ATLAS_ROBOTS_REDIRECTED } from '@/lib/canonical-map'

/** What the palette shows and ranks. Kept small: the whole index ships to the browser. */
export interface SearchNode {
  /** Path, always site-relative. */
  href: string
  /** What the user reads first. */
  title: string
  /** One short line. Truncated hard — this is a result row, not a page. */
  sub?: string
  /** Grouping label shown as a chip, e.g. "Concept", "1-min lesson". */
  kind: SearchKind
  /** Extra words that should match but need not be displayed. */
  tags?: string[]
}

export type SearchKind =
  | 'Concept'
  | 'Robot'
  | 'Company'
  | 'Person'
  | '1-min lesson'
  | 'Mini-course'
  | 'Course'
  | 'Course lesson'
  | 'Academy lesson'
  | 'AI + Robotics'
  | 'Simulator'
  | 'Robot project'
  | 'Article'
  | 'Page'

const MAX_SUB = 110

function clip(s: string | undefined, n = MAX_SUB): string | undefined {
  if (!s) return undefined
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  // Cut on a word boundary — a summary sliced mid-word reads as broken.
  return `${t.slice(0, t.lastIndexOf(' ', n) === -1 ? n : t.lastIndexOf(' ', n))}…`
}

/** The handful of hubs worth reaching by name. Everything else is content. */
const STATIC_PAGES: SearchNode[] = [
  { href: '/start', title: 'Start here', sub: 'Find the right place to begin', kind: 'Page' },
  { href: '/atlas', title: 'Atlas', sub: 'The robotics encyclopedia, in plain English', kind: 'Page' },
  { href: '/shorts', title: 'Quick Lessons', sub: 'One-minute lessons with a demo and a quiz', kind: 'Page' },
  { href: '/courses', title: 'Free course path', sub: 'Five video courses, zero to robot intelligence', kind: 'Page' },
  { href: '/academy', title: 'Academy', sub: 'Written lessons across four tracks', kind: 'Page' },
  { href: '/robots', title: 'Robots', sub: 'The robots worth knowing', kind: 'Page' },
  { href: '/ai-robotics', title: 'AI + Robotics', sub: 'How modern robots learn', kind: 'Page' },
  { href: '/visualizer', title: 'Simulators', sub: 'Interactive tools you can play with', kind: 'Page' },
  { href: '/build', title: 'Robot projects', sub: 'Guided builds with a full parts list', kind: 'Page' },
  { href: '/blog', title: 'Blog', sub: 'Explainers and comparisons', kind: 'Page' },
  { href: '/daily-life', title: 'Robotics in daily life', sub: 'The robots already around you', kind: 'Page' },
  { href: '/challenge', title: 'Daily Challenge', sub: 'One question a day', kind: 'Page' },
  { href: '/diagnostic', title: 'Find my level', sub: 'A two-minute placement test', kind: 'Page' },
  { href: '/about/how-this-is-written', title: 'How this is written', sub: 'Who writes R2BOT and how', kind: 'Page' },
]

const ATLAS_KIND: Record<string, SearchKind> = {
  robot: 'Robot',
  company: 'Company',
  person: 'Person',
}

export async function buildSearchIndex(): Promise<SearchNode[]> {
  const nodes: SearchNode[] = [...STATIC_PAGES]

  // ── Atlas ───────────────────────────────────────────────────────────────
  // Skips the robot entries that 308 to /robots/<slug>: one owner per query.
  const atlas = await getAllAtlasEntriesMerged()
  for (const e of atlas) {
    if (e.type === 'robot' && ATLAS_ROBOTS_REDIRECTED.has(e.slug)) continue
    nodes.push({
      href: `/atlas/${e.type}/${e.slug}`,
      title: e.title,
      sub: clip(e.tagline || e.summary),
      kind: ATLAS_KIND[e.type] ?? 'Concept',
      tags: [e.category, e.bucket, e.hindi_name, e.difficulty].filter(Boolean) as string[],
    })
  }

  // ── Quick Lessons ───────────────────────────────────────────────────────
  for (const c of SHORT_COURSES) {
    nodes.push({
      href: `/shorts/course/${c.slug}`,
      title: c.title,
      sub: clip(c.blurb),
      kind: 'Mini-course',
      tags: c.searchIntent ? [c.searchIntent] : undefined,
    })
  }
  for (const s of SHORTS) {
    nodes.push({
      href: `/shorts/${s.slug}`,
      title: s.title,
      sub: clip(s.summary),
      kind: '1-min lesson',
      tags: [s.course],
    })
  }

  // ── Course path ─────────────────────────────────────────────────────────
  for (const c of listPublishedCourses()) {
    const live = c.lessons.filter(hasVideo)
    if (live.length === 0) continue // noindex, so not advertised here either
    nodes.push({
      href: `/courses/${c.slug}`,
      title: c.title,
      sub: clip(c.tagline || c.description),
      kind: 'Course',
      tags: [c.level],
    })
    for (const l of live) {
      nodes.push({
        href: `/courses/${c.slug}/${l.id}`,
        title: l.title,
        sub: clip(l.summary),
        kind: 'Course lesson',
        tags: [c.title],
      })
    }
  }

  // ── Academy ─────────────────────────────────────────────────────────────
  for (const l of getAllAcademyLessons()) {
    nodes.push({
      href: `/academy/${l.track}/${l.slug}`,
      title: l.title,
      sub: clip(l.description),
      kind: 'Academy lesson',
      tags: [trackLabel(l.track), l.hindi_name].filter(Boolean) as string[],
    })
  }

  // ── Robots, AI topics, simulators ───────────────────────────────────────
  for (const r of ROBOTS) {
    nodes.push({
      href: `/robots/${r.slug}`,
      title: r.name,
      sub: clip(r.oneLiner),
      kind: 'Robot',
      tags: [r.maker, r.country, r.type, String(r.year)],
    })
  }
  for (const t of AI_TOPICS) {
    nodes.push({
      href: `/ai-robotics/${t.slug}`,
      title: t.title,
      sub: clip(t.short),
      kind: 'AI + Robotics',
      tags: [t.level],
    })
  }
  for (const s of SIMULATORS) {
    nodes.push({
      href: `/visualizer/${s.id}`,
      title: s.title,
      sub: clip(s.blurb),
      kind: 'Simulator',
      tags: s.keywords,
    })
  }

  // ── Guided builds ───────────────────────────────────────────────────────
  for (const p of loadAllProjects()) {
    nodes.push({
      href: `/build/${p.slug}`,
      title: p.title,
      sub: clip(p.tagline),
      kind: 'Robot project',
      tags: [p.level, p.simulation_only ? 'simulator only' : 'hardware'],
    })
  }

  // ── Writing ─────────────────────────────────────────────────────────────
  const posts = await getAllPostsMerged()
  for (const p of posts) {
    nodes.push({
      href: `/blog/${p.slug}`,
      title: p.title,
      sub: clip(p.description),
      kind: 'Article',
      tags: [...(p.tags ?? []), ...(p.keywords ?? [])],
    })
  }
  // Daily Life is deliberately absent. Its 30 articles have no page of their
  // own — /daily-life renders them client-side from DAILY_LIFE_ARTICLES and
  // there is no [slug] route — so indexing them would point search at URLs
  // that 404. The hub itself is in STATIC_PAGES. Give the articles real pages
  // and they belong here.

  // Same href twice would show the same row twice; first wins.
  const seen = new Set<string>()
  return nodes.filter((n) => {
    if (seen.has(n.href)) return false
    seen.add(n.href)
    return true
  })
}
