// lib/blog.ts
// MDX-backed blog content. Files live in content/blog/*.mdx and use gray-matter
// frontmatter — same pattern as the Atlas. No new deps required.

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string           // ISO date string (YYYY-MM-DD)
  author: string
  authorRole: string
  tags: string[]
  readTime: number       // minutes
  coverEmoji: string
  featured: boolean
  keywords: string[]
  content: string        // raw MDX/markdown body
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

function safeISODate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string' && v.length >= 10) return v.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(String)
}

function build(slug: string, data: Record<string, unknown>, content: string): BlogPost {
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    date: safeISODate(data.date),
    author: String(data.author ?? 'R2BOT Team'),
    authorRole: String(data.authorRole ?? "India's Robotics Education Platform"),
    tags: asStringArray(data.tags),
    readTime: typeof data.readTime === 'number' ? data.readTime : Math.max(2, Math.ceil(content.split(/\s+/).length / 220)),
    coverEmoji: typeof data.coverEmoji === 'string' ? data.coverEmoji : '📝',
    featured: data.featured === true,
    keywords: asStringArray(data.keywords),
    content,
  }
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data, content } = matter(raw)
    const slug = file.replace(/\.(mdx|md)$/, '')
    return build(slug, data as Record<string, unknown>, content)
  })
  return posts.sort((a, b) => b.date.localeCompare(a.date))
}

export function getPostBySlug(slug: string): BlogPost | null {
  const mdx = path.join(BLOG_DIR, `${slug}.mdx`)
  const md  = path.join(BLOG_DIR, `${slug}.md`)
  const file = fs.existsSync(mdx) ? mdx : fs.existsSync(md) ? md : null
  if (!file) return null
  const raw = fs.readFileSync(file, 'utf-8')
  const { data, content } = matter(raw)
  return build(slug, data as Record<string, unknown>, content)
}

export function getRelatedPosts(slug: string, tags: string[], limit = 3): BlogPost[] {
  const all = getAllPosts()
  const withOverlap = all
    .filter(p => p.slug !== slug)
    .map(p => ({ post: p, overlap: p.tags.filter(t => tags.includes(t)).length }))
    .filter(x => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map(x => x.post)
  if (withOverlap.length >= limit) return withOverlap
  // Pad with most-recent posts (excluding current and already-selected)
  const have = new Set([slug, ...withOverlap.map(p => p.slug)])
  for (const p of all) {
    if (withOverlap.length >= limit) break
    if (!have.has(p.slug)) withOverlap.push(p)
  }
  return withOverlap
}

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of getAllPosts()) {
    for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }))
}
