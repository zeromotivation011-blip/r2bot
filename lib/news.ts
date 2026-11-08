// lib/news.ts — News aggregation + enrichment
// Aggregates robotics news from 9 RSS feeds AND enriches each article with:
//   - India Impact Score (0-10)  [computed, no longer surfaced as a hero]
//   - Topic classification
//   - R2BOT editorial "Why it matters"
//   - Sentiment
//   - Reading time
//   - Atlas + lesson links
//   - Breaking / trending flags
//
// It also exposes the archive (public.news, migrations 0033 + 0037) as
// per-article, SEO-indexable data via getArchivedNewsBySlug / getArchivedNewsSlugs
// / getRecentArchivedNews, consumed by app/news/[slug].

import { SOURCE_STYLES } from '@/lib/news-styles'
import { createClient } from '@supabase/supabase-js'

// ── Curation overlay ────────────────────────────────────────────────────────
// Admins can pin / hide / rewrite the summary of any story (news table, 0033).
// We read that as a light overlay on the live feed. Session-less anon client so
// it works in ISR; any failure falls back to the un-curated feed.
const _cvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const _cvAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const _cvSb = _cvUrl && _cvAnon ? createClient(_cvUrl, _cvAnon, { auth: { persistSession: false } }) : null

async function applyCuration(articles: EnrichedArticle[]): Promise<EnrichedArticle[]> {
  if (!_cvSb || articles.length === 0) return articles
  try {
    const { data } = await _cvSb
      .from('news')
      .select('url, pinned, hidden, curated_summary')
      .in('url', articles.map(a => a.url))
      .abortSignal(AbortSignal.timeout(2500))
    if (!data) return articles
    const map = new Map(
      (data as { url: string; pinned: boolean; hidden: boolean; curated_summary: string | null }[])
        .map(r => [r.url, r]),
    )
    const visible = articles.filter(a => !map.get(a.url)?.hidden)
    for (const a of visible) {
      const c = map.get(a.url)
      if (c?.curated_summary) a.aiSummary = c.curated_summary
    }
    visible.sort((a, b) => Number(!!map.get(b.url)?.pinned) - Number(!!map.get(a.url)?.pinned))
    return visible
  } catch {
    return articles
  }
}

interface RawFeed { name: string; url: string }

const FEEDS: RawFeed[] = [
  { name: 'IEEE Spectrum',     url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss' },
  { name: 'MIT News',          url: 'https://news.mit.edu/rss/topic/robots' },
  { name: 'TechCrunch',        url: 'https://techcrunch.com/tag/robots/feed/' },
  { name: 'The Robot Report',  url: 'https://www.therobotreport.com/feed/' },
  { name: 'Wired',             url: 'https://www.wired.com/feed/tag/robots/rss' },
  { name: 'Hacker News',       url: 'https://hnrss.org/newest?q=robotics+robot+ROS' },
  { name: 'Robohub',           url: 'https://robohub.org/feed/' },
  { name: 'Analytics India',   url: 'https://analyticsindiamag.com/feed/' },
  { name: 'Analytics Vidhya',  url: 'https://www.analyticsvidhya.com/feed/' },
]

interface RSSItem {
  source: string
  title: string
  link: string
  publishedAt: string
  description: string
  imageUrl?: string
}

export interface EnrichedArticle {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  description: string
  aiSummary?: string // 2-sentence Claude-Haiku summary; falls back to description in UI
  imageUrl?: string
  indiaImpactScore: number
  indiaImpactLabel: 'High for India' | 'Moderate' | 'Global context' | 'Distant'
  whyItMatters: string
  topic: string
  sentiment: 'breakthrough' | 'concern' | 'business' | 'research' | 'neutral'
  readingTime: number
  relatedAtlasTerms: string[]
  relatedLessons: string[]
  isBreaking: boolean
  isTrending: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// Claude Haiku summarisation (opt-in via ANTHROPIC_API_KEY).
// Bounded: at most MAX_AI_SUMMARIES per cycle, only for articles whose
// description is too short to be useful (< 80 chars). Silent on failure.
// ────────────────────────────────────────────────────────────────────────────
const MAX_AI_SUMMARIES = 20
const SUMMARY_MIN_DESC = 80

async function summarizeWithClaude(title: string, description: string, apiKey: string): Promise<string | null> {
  const input = `${title}\n\n${description.slice(0, 500)}`
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 220,
        messages: [
          {
            role: 'user',
            content:
              'Summarize this robotics article in exactly 2 sentences for a student audience. ' +
              'Be specific, not vague: ' + input,
          },
        ],
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = json.content?.find((c) => c.type === 'text')?.text?.trim()
    return text && text.length > 0 ? text : null
  } catch {
    return null
  }
}

async function addAiSummaries(articles: EnrichedArticle[]): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return
  const candidates = articles
    .filter((a) => a.description.length < SUMMARY_MIN_DESC)
    .slice(0, MAX_AI_SUMMARIES)
  // Run in parallel but bounded by the slice above; Promise.all is safe.
  await Promise.all(
    candidates.map(async (a) => {
      const summary = await summarizeWithClaude(a.title, a.description, apiKey)
      if (summary) a.aiSummary = summary
    }),
  )
}

// ────────────────────────────────────────────────────────────────────────────
// XML parsing helpers
// ────────────────────────────────────────────────────────────────────────────
function extractAllBetweenTags(xml: string, tag: string): string[] {
  const out: string[] = []
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  let m
  while ((m = re.exec(xml))) out.push(m[1])
  return out
}
function extractBetweenTags(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml)
  return m ? m[1] : ''
}
function decodeCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[/i, '').replace(/\]\]>\s*$/, '')
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
}
function safeISO(d: string): string {
  if (!d) return new Date(0).toISOString()
  const parsed = new Date(d)
  return isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString()
}
function extractImage(it: string): string | undefined {
  const enclosure = /<enclosure[^>]+url=["']([^"']+)["']/i.exec(it)
  if (enclosure?.[1]) return enclosure[1]
  const media = /<media:content[^>]+url=["']([^"']+)["']/i.exec(it)
  if (media?.[1]) return media[1]
  const img = /<img[^>]+src=["']([^"']+)["']/i.exec(it)
  if (img?.[1]) return img[1]
  return undefined
}

function parseFeed(name: string, xml: string): RSSItem[] {
  const items = extractAllBetweenTags(xml, 'item')
  const entries = items.length > 0 ? items : extractAllBetweenTags(xml, 'entry')
  const out: RSSItem[] = []
  for (const it of entries) {
    const title = stripHtml(decodeCdata(extractBetweenTags(it, 'title')))
    let link = decodeCdata(extractBetweenTags(it, 'link')).trim()
    if (!link) {
      const hrefMatch = /<link[^>]+href=["']([^"']+)["']/i.exec(it)
      link = hrefMatch ? hrefMatch[1] : ''
    }
    const pubDateRaw =
      decodeCdata(extractBetweenTags(it, 'pubDate')) ||
      decodeCdata(extractBetweenTags(it, 'updated')) ||
      decodeCdata(extractBetweenTags(it, 'published'))
    const descRaw =
      decodeCdata(extractBetweenTags(it, 'description')) ||
      decodeCdata(extractBetweenTags(it, 'summary')) ||
      decodeCdata(extractBetweenTags(it, 'content'))
    const description = stripHtml(descRaw).slice(0, 320)
    const imageUrl = extractImage(it)
    if (!title || !link) continue
    out.push({ source: name, title, link, publishedAt: safeISO(pubDateRaw), description, imageUrl })
  }
  return out
}

async function fetchFeed(f: RawFeed): Promise<RSSItem[]> {
  try {
    const res = await fetch(f.url, {
      headers: { 'User-Agent': 'R2BOT-NewsAggregator/2.0 (+https://r2bot.in)' },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(9000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseFeed(f.name, xml)
  } catch {
    return []
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Enrichment
// ────────────────────────────────────────────────────────────────────────────
const INDIA_DIRECT = [
  'india', 'indian', 'bengaluru', 'bangalore', 'mumbai', 'delhi',
  'pune', 'hyderabad', 'chennai', 'kolkata', 'drdo', 'iit', 'iisc',
  'isro', 'tata', 'mahindra', 'reliance', 'infosys', 'wipro',
  'make in india', 'atmanirbhar', 'greyorange',
]
const INDIA_HIGH_REL = [
  'warehouse automation', 'agricultural robot', 'surgical robot',
  'manufacturing automation', 'cobots', 'amr ', 'robot density',
  'emerging markets', 'asia pacific', 'apac', 'low-cost robotics',
]
const INDIA_MODERATE = [
  'humanoid robot', 'ai robotics', 'robot investment',
  'automation trend', 'robot workforce', 'industrial robot',
  'autonomous vehicle', 'logistics robot',
]

function scoreIndiaImpact(title: string, description: string): number {
  const text = (title + ' ' + description).toLowerCase()
  let score = 0
  INDIA_DIRECT.forEach(k => { if (text.includes(k)) score += 3 })
  INDIA_HIGH_REL.forEach(k => { if (text.includes(k)) score += 1.5 })
  INDIA_MODERATE.forEach(k => { if (text.includes(k)) score += 0.5 })
  return Math.min(10, Math.round(score))
}

function indiaImpactLabel(score: number): EnrichedArticle['indiaImpactLabel'] {
  if (score >= 7) return 'High for India'
  if (score >= 4) return 'Moderate'
  if (score >= 1) return 'Global context'
  return 'Distant'
}

function classifyTopic(title: string, description: string): string {
  const t = (title + ' ' + description).toLowerCase()
  if (/\b(ai|machine learning|neural|llm|gpt|computer vision|deep learning|reinforcement learning)\b/.test(t)) return 'ai'
  if (/\b(surgical|medical|hospital|healthcare|patient|prosthetic|biopsy|laparoscop)\b/.test(t)) return 'medical'
  if (/\b(mars|space|nasa|satellite|spacecraft|lunar|asteroid|isro|jpl|spacex)\b/.test(t)) return 'space'
  if (/\b(warehouse|factory|manufacturing|assembly|industrial|kuka|fanuc|abb)\b/.test(t)) return 'industrial'
  if (/\b(home|consumer|roomba|domestic|personal|household)\b/.test(t)) return 'consumer'
  if (/\b(military|defense|defence|drone|weapon|surveillance|battlefield)\b/.test(t)) return 'military'
  if (/\b(startup|funding|investment|acquisition|ipo|revenue|raised|round)\b/.test(t)) return 'business'
  if (/\b(research|university|lab|paper|study|experiment|professor)\b/.test(t)) return 'research'
  if (/\b(india|drdo|iit|isro|tata|bengaluru)\b/.test(t)) return 'india'
  if (/\b(policy|regulation|government|law|bill|act)\b/.test(t)) return 'policy'
  return 'general'
}

function classifySentiment(title: string, description: string): EnrichedArticle['sentiment'] {
  const t = (title + ' ' + description).toLowerCase()
  if (/\b(breakthrough|first ever|world.?first|unveils|launches|achieves|milestone)\b/.test(t)) return 'breakthrough'
  if (/\b(concern|fear|risk|ban|controversy|fail|accident|injured|hurt|worry)\b/.test(t)) return 'concern'
  if (/\b(funding|raised|acquires|ipo|valuation|revenue|profit|deal)\b/.test(t)) return 'business'
  if (/\b(research|study|paper|university|lab|professor|published)\b/.test(t)) return 'research'
  return 'neutral'
}

// Globalised editorial context. These strings render on the public per-article
// pages, so they must read for a worldwide audience (the site's positioning was
// globalised in July 2026). India-specific angle now lives only in the optional
// "india" topic, not in every blurb.
const WHY_IT_MATTERS: Record<string, string> = {
  ai: 'AI is what turns robots from fixed-task machines into adaptable workers — the fastest-moving frontier in the field right now.',
  medical: 'Medical robotics reduces human error and widens access to precision care, making it one of the highest-stakes proving grounds for autonomy.',
  space: 'Space robotics pushes autonomy and durability to their limits — and those advances filter down into industrial and consumer robots within a few years.',
  industrial: 'Factories and warehouses are where robotics economics get decided. Every advance here reshapes how things are built and moved worldwide.',
  consumer: 'Consumer robotics drives the volume that pulls costs down for everyone — what is expensive today becomes mainstream in a few years.',
  military: 'Defence robotics shapes dual-use technology that filters into civilian inspection, surveillance and logistics over the following decade.',
  business: 'Investment signals where robotics is heading. Where capital flows, talent and technology follow.',
  research: "Today's research paper is tomorrow's product — this is the earliest look at where the field is going.",
  india: 'A story with direct relevance to the robotics ecosystem in India and other fast-growing markets.',
  policy: 'Policy set in one country quickly becomes a reference point elsewhere — especially around AI safety and automation.',
  general: 'Robotics is reshaping nearly every industry, which makes each major development worth understanding.',
}

const ATLAS_TERM_KEYWORDS: { keyword: RegExp; slug: string }[] = [
  { keyword: /\b(lidar)\b/i,                 slug: 'lidar' },
  { keyword: /\b(slam)\b/i,                  slug: 'slam' },
  { keyword: /\b(ros|ros2)\b/i,              slug: 'ros2' },
  { keyword: /\b(humanoid)\b/i,              slug: 'humanoid-robot' },
  { keyword: /\b(quadruped|four-?legged)\b/i,slug: 'quadruped-robot' },
  { keyword: /\b(autonomous vehicle|self-?driving)\b/i, slug: 'autonomous-navigation' },
  { keyword: /\b(reinforcement learning|rl)\b/i, slug: 'reinforcement-learning' },
  { keyword: /\b(computer vision|cv)\b/i,    slug: 'computer-vision' },
  { keyword: /\b(amr|mobile robot)\b/i,      slug: 'amr' },
  { keyword: /\b(cobot|collaborative robot)\b/i, slug: 'collaborative-robot' },
  { keyword: /\b(neural network|deep learning)\b/i, slug: 'neural-network' },
  { keyword: /\b(servo)\b/i,                 slug: 'servo-motor' },
  { keyword: /\b(pid)\b/i,                   slug: 'pid-control' },
  { keyword: /\b(arduino)\b/i,               slug: 'arduino' },
]

function matchAtlasTerms(title: string, description: string): string[] {
  const text = `${title} ${description}`
  const matched = new Set<string>()
  for (const { keyword, slug } of ATLAS_TERM_KEYWORDS) {
    if (keyword.test(text)) matched.add(slug)
    if (matched.size >= 3) break
  }
  return Array.from(matched)
}

const LESSON_KEYWORDS: { keyword: RegExp; lesson: string }[] = [
  { keyword: /\b(arduino|microcontroller)\b/i,      lesson: 'arduino-basics' },
  { keyword: /\b(humanoid|bipedal)\b/i,             lesson: 'how-robots-move' },
  { keyword: /\b(computer vision|cv|object detection)\b/i, lesson: 'computer-vision-intro' },
  { keyword: /\b(pid|control)\b/i,                  lesson: 'pid-control' },
]

function matchLessons(title: string, description: string): string[] {
  const text = `${title} ${description}`
  const matched: string[] = []
  for (const { keyword, lesson } of LESSON_KEYWORDS) {
    if (keyword.test(text)) matched.push(lesson)
    if (matched.length >= 2) break
  }
  return matched
}

function readingTime(description: string): number {
  const words = description.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function entityWords(title: string): string[] {
  const stop = new Set([
    'the', 'a', 'an', 'of', 'for', 'and', 'or', 'in', 'on', 'to', 'with', 'is', 'are',
    'as', 'how', 'why', 'this', 'that', 'these', 'those', 'be', 'has', 'have',
  ])
  return title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3 && !stop.has(w)).slice(0, 3)
}

function classifyBreakingTrending(item: RSSItem, all: RSSItem[]): { isBreaking: boolean; isTrending: boolean } {
  const itemTime = new Date(item.publishedAt).getTime()
  const dayAgo = Date.now() - 86_400_000
  if (itemTime < dayAgo) return { isBreaking: false, isTrending: false }
  const itemEntities = entityWords(item.title)
  if (itemEntities.length === 0) return { isBreaking: false, isTrending: false }
  let sameEntityCount = 0
  for (const a of all) {
    if (a.link === item.link) continue
    const aEntities = entityWords(a.title)
    if (aEntities.some(w => itemEntities.includes(w))) sameEntityCount++
  }
  return {
    isBreaking: sameEntityCount === 0,
    isTrending: sameEntityCount >= 3,
  }
}

function enrich(item: RSSItem, all: RSSItem[]): EnrichedArticle {
  const indiaImpactScore = scoreIndiaImpact(item.title, item.description)
  const topic = classifyTopic(item.title, item.description)
  const sentiment = classifySentiment(item.title, item.description)
  const { isBreaking, isTrending } = classifyBreakingTrending(item, all)

  return {
    id: Buffer.from(item.link).toString('base64').slice(0, 24),
    title: item.title,
    url: item.link,
    source: item.source,
    publishedAt: item.publishedAt,
    description: item.description,
    imageUrl: item.imageUrl,
    indiaImpactScore,
    indiaImpactLabel: indiaImpactLabel(indiaImpactScore),
    whyItMatters: WHY_IT_MATTERS[topic] || WHY_IT_MATTERS.general,
    topic,
    sentiment,
    readingTime: readingTime(item.description),
    relatedAtlasTerms: matchAtlasTerms(item.title, item.description),
    relatedLessons: matchLessons(item.title, item.description),
    isBreaking,
    isTrending,
  }
}

function computeTrending(articles: EnrichedArticle[]): { topic: string; count: number; momentum: 'rising' | 'stable' }[] {
  const counts = new Map<string, number>()
  const recent = new Map<string, number>()
  const dayAgo = Date.now() - 86_400_000
  for (const a of articles) {
    counts.set(a.topic, (counts.get(a.topic) || 0) + 1)
    if (new Date(a.publishedAt).getTime() > dayAgo) {
      recent.set(a.topic, (recent.get(a.topic) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic, count]) => ({
      topic,
      count,
      momentum: ((recent.get(topic) || 0) / Math.max(1, count)) > 0.4 ? 'rising' : 'stable',
    }))
}

export interface NewsPayload {
  articles: EnrichedArticle[]
  trending: { topic: string; count: number; momentum: 'rising' | 'stable' }[]
  indiaHighlights: EnrichedArticle[]
  weeklyStats: { totalArticles: number; topTopics: string[]; topSources: string[]; indiaStories: number }
  sourceStyles: typeof SOURCE_STYLES
  lastUpdated: string
}

export async function getNewsData(): Promise<NewsPayload> {
  const fetched = await Promise.all(FEEDS.map(fetchFeed))
  const all: RSSItem[] = fetched.flat()

  const byUrl = new Map<string, RSSItem>()
  for (const a of all) if (!byUrl.has(a.link)) byUrl.set(a.link, a)
  const merged = Array.from(byUrl.values())
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 80)

  let enriched = merged.map(item => enrich(item, merged))
  await addAiSummaries(enriched)
  enriched = await applyCuration(enriched) // pin / hide / summary overrides from admin
  const trending = computeTrending(enriched)
  const indiaHighlights = enriched.filter(a => a.indiaImpactScore >= 7).slice(0, 6)
  const topTopics = Array.from(new Set(enriched.map(a => a.topic))).slice(0, 6)
  const topSources = Array.from(new Set(enriched.map(a => a.source))).slice(0, 6)
  const indiaStories = enriched.filter(a => a.indiaImpactScore >= 5).length

  return {
    articles: enriched,
    trending,
    indiaHighlights,
    weeklyStats: { totalArticles: enriched.length, topTopics, topSources, indiaStories },
    sourceStyles: SOURCE_STYLES,
    lastUpdated: new Date().toISOString(),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Archive reads (public.news, 0033 + 0037) — power the per-article /news/<slug>
// pages, their OG images, and the sitemap. All are defensive: if the table or
// the slug column is missing (e.g. migration not yet applied), or the anon
// client is unavailable, they return empty rather than throwing, so the build
// and the live feed keep working.
// ────────────────────────────────────────────────────────────────────────────
export interface ArchivedArticle extends EnrichedArticle {
  slug: string
  shownSummary: string
}

interface NewsRow {
  url: string
  title: string | null
  source: string | null
  topic: string | null
  published_at: string | null
  image_url: string | null
  summary: string | null
  article: EnrichedArticle | null
  slug: string | null
  curated_summary: string | null
}

const ARCHIVE_COLS =
  'url, title, source, topic, published_at, image_url, summary, article, slug, curated_summary'

function rowToArticle(r: NewsRow): ArchivedArticle | null {
  if (!r.slug) return null
  const base: Partial<EnrichedArticle> =
    r.article && typeof r.article === 'object' ? r.article : {}
  const shownSummary =
    r.curated_summary || base.aiSummary || base.description || r.summary || ''
  return {
    id: base.id || r.slug,
    title: r.title || base.title || 'Untitled',
    url: r.url,
    source: r.source || base.source || '',
    publishedAt: r.published_at || base.publishedAt || new Date(0).toISOString(),
    description: base.description || r.summary || '',
    aiSummary: r.curated_summary || base.aiSummary,
    imageUrl: r.image_url || base.imageUrl,
    indiaImpactScore: base.indiaImpactScore ?? 0,
    indiaImpactLabel: base.indiaImpactLabel ?? 'Distant',
    whyItMatters: base.whyItMatters || WHY_IT_MATTERS[r.topic || 'general'] || WHY_IT_MATTERS.general,
    topic: r.topic || base.topic || 'general',
    sentiment: base.sentiment ?? 'neutral',
    readingTime: base.readingTime ?? 1,
    relatedAtlasTerms: base.relatedAtlasTerms ?? [],
    relatedLessons: base.relatedLessons ?? [],
    isBreaking: base.isBreaking ?? false,
    isTrending: base.isTrending ?? false,
    slug: r.slug,
    shownSummary,
  }
}

export async function getArchivedNewsBySlug(slug: string): Promise<ArchivedArticle | null> {
  if (!_cvSb || !slug) return null
  try {
    const { data } = await _cvSb
      .from('news')
      .select(ARCHIVE_COLS)
      .eq('slug', slug)
      .eq('hidden', false)
      .limit(1)
      .abortSignal(AbortSignal.timeout(4000))
    const row = (data as NewsRow[] | null)?.[0]
    return row ? rowToArticle(row) : null
  } catch {
    return null
  }
}

export async function getArchivedNewsSlugs(
  limit = 500,
): Promise<{ slug: string; publishedAt: string }[]> {
  if (!_cvSb) return []
  try {
    const { data } = await _cvSb
      .from('news')
      .select('slug, published_at')
      .eq('hidden', false)
      .not('slug', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit)
      .abortSignal(AbortSignal.timeout(6000))
    return ((data as { slug: string | null; published_at: string | null }[] | null) ?? [])
      .filter((r) => !!r.slug)
      .map((r) => ({ slug: r.slug as string, publishedAt: r.published_at || new Date(0).toISOString() }))
  } catch {
    return []
  }
}

export async function getRecentArchivedNews(limit = 12): Promise<ArchivedArticle[]> {
  if (!_cvSb) return []
  try {
    const { data } = await _cvSb
      .from('news')
      .select(ARCHIVE_COLS)
      .eq('hidden', false)
      .not('slug', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit)
      .abortSignal(AbortSignal.timeout(6000))
    return ((data as NewsRow[] | null) ?? [])
      .map(rowToArticle)
      .filter((a): a is ArchivedArticle => a !== null)
  } catch {
    return []
  }
}
