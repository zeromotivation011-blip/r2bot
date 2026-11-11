// lib/daily-life-articles/loader.ts — server-only reader for the long-form
// "Robotics in Daily Life" articles.
//
// Bodies live as MDX-with-frontmatter files beside this module, one per slug
// in DAILY_LIFE_ARTICLES. They are read from disk at build/revalidate time and
// never imported into a client bundle: the hub (a client component) only needs
// the catalogue in lib/daily-life.ts, and `PUBLISHED_SLUGS` there is the list
// of slugs that have a file here. scripts/check-daily-life.mjs asserts the two
// stay in step.
// Node-only (fs). Import from server components and route files only.
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import {
  DAILY_LIFE_ARTICLES,
  PUBLISHED_SLUGS,
  type DailyLifeArticle,
  type DailyLifeAtlasLink,
  type DailyLifeCategory,
} from '@/lib/daily-life'

export interface DailyLifeSource {
  name: string
  url: string
}

export interface DailyLifeArticleFull extends DailyLifeArticle {
  updatedAt: string
  sources: DailyLifeSource[]
  /** Markdown body (frontmatter stripped). */
  body: string
}

const DIR = path.join(process.cwd(), 'lib', 'daily-life-articles')

interface Frontmatter {
  title?: string
  excerpt?: string
  category?: DailyLifeCategory
  readTime?: string
  publishedAt?: string
  updatedAt?: string
  atlasLinks?: DailyLifeAtlasLink[]
  sources?: DailyLifeSource[]
}

function isSource(x: unknown): x is DailyLifeSource {
  return typeof x === 'object' && x !== null && typeof (x as DailyLifeSource).name === 'string' && typeof (x as DailyLifeSource).url === 'string'
}

function isAtlasLink(x: unknown): x is DailyLifeAtlasLink {
  return typeof x === 'object' && x !== null && typeof (x as DailyLifeAtlasLink).slug === 'string' && typeof (x as DailyLifeAtlasLink).label === 'string'
}

/** Full article (catalogue entry + body + sources), or null if no file exists. */
export function getDailyLifeArticle(slug: string): DailyLifeArticleFull | null {
  const stub = DAILY_LIFE_ARTICLES.find((a) => a.slug === slug)
  if (!stub || !PUBLISHED_SLUGS.has(slug)) return null
  const file = path.join(DIR, `${slug}.mdx`)
  if (!fs.existsSync(file)) return null
  const { data, content } = matter(fs.readFileSync(file, 'utf-8'))
  const fm = data as Frontmatter
  const body = content.trim()
  if (!body) return null
  const sources = Array.isArray(fm.sources) ? fm.sources.filter(isSource) : []
  const atlasLinks = Array.isArray(fm.atlasLinks) && fm.atlasLinks.every(isAtlasLink) ? fm.atlasLinks : stub.atlasLinks
  return {
    ...stub,
    title: fm.title ?? stub.title,
    excerpt: fm.excerpt ?? stub.excerpt,
    category: fm.category ?? stub.category,
    readTime: fm.readTime ?? stub.readTime,
    publishedAt: fm.publishedAt ?? stub.publishedAt,
    updatedAt: fm.updatedAt ?? fm.publishedAt ?? stub.publishedAt,
    atlasLinks,
    sources,
    body,
    content: body,
  }
}

/** Every published article, newest first. */
export function getAllDailyLifeArticles(): DailyLifeArticleFull[] {
  return DAILY_LIFE_ARTICLES.map((a) => getDailyLifeArticle(a.slug))
    .filter((a): a is DailyLifeArticleFull => a !== null)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0))
}
