'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { EnrichedArticle } from '@/lib/news'

interface ApiResponse {
  articles: EnrichedArticle[]
  trending: { topic: string; count: number; momentum: 'rising' | 'stable' }[]
  indiaHighlights: EnrichedArticle[]
  weeklyStats: { totalArticles: number; topTopics: string[]; topSources: string[]; indiaStories: number }
  sourceStyles: Record<string, { color: string; short: string }>
  lastUpdated: string
}

interface NewsPageClientProps {
  initialData?: ApiResponse
}

const TOPIC_LABELS: Record<string, string> = {
  ai: '🧠 AI',
  industrial: '🏭 Industrial',
  medical: '🏥 Medical',
  space: '🪐 Space',
  consumer: '🏠 Consumer',
  military: '🛡️ Defence',
  business: '💼 Business',
  research: '🔬 Research',
  india: '🇮🇳 India',
  policy: '⚖️ Policy',
  general: '📰 General',
}

const SENTIMENT_EMOJI: Record<string, string> = {
  breakthrough: '🚀',
  concern: '⚠️',
  business: '💼',
  research: '🔬',
  neutral: '📰',
}

const WATCHLIST_TOPICS = ['ai', 'medical', 'space', 'industrial', 'india', 'consumer', 'business', 'research']
const LS_WATCH = 'r2bot_pulse_watchlist'
const LS_SAVED = 'r2bot_pulse_saved'

export function NewsPageClient({ initialData }: NewsPageClientProps = {}) {
  const [data, setData] = useState<ApiResponse | null>(initialData ?? null)
  const [filter, setFilter] = useState<string>('all')   // 'all' | topic | 'india'
  const [sourceFilter, setSourceFilter] = useState<string>('all') // 'all' | source name
  const [sort, setSort] = useState<'latest' | 'india' | 'trending'>('latest')
  const [watch, setWatch] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showSaved, setShowSaved] = useState(false)
  const [email, setEmail] = useState('')
  const [subStatus, setSubStatus] = useState<'idle' | 'ok' | 'err'>('idle')

  useEffect(() => {
    try {
      const w = JSON.parse(localStorage.getItem(LS_WATCH) || '[]')
      const s = JSON.parse(localStorage.getItem(LS_SAVED) || '[]')
      if (Array.isArray(w)) setWatch(w)
      if (Array.isArray(s)) setSavedIds(s.map((x: { id: string }) => x.id))
    } catch {}
  }, [])

  useEffect(() => {
    if (initialData) return
    ;(async () => {
      try {
        const res = await fetch('/api/news', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as ApiResponse
        setData(json)
      } catch {}
    })()
  }, [initialData])

  const toggleWatch = (topic: string) => {
    setWatch(prev => {
      const next = prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      localStorage.setItem(LS_WATCH, JSON.stringify(next))
      return next
    })
  }

  const toggleSave = (a: EnrichedArticle) => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_SAVED) || '[]')
      const arr: { id: string; title: string; url: string; savedAt: string }[] = Array.isArray(raw) ? raw : []
      const idx = arr.findIndex(x => x.id === a.id)
      let next = arr
      if (idx >= 0) next = arr.filter(x => x.id !== a.id)
      else next = [{ id: a.id, title: a.title, url: a.url, savedAt: new Date().toISOString() }, ...arr].slice(0, 50)
      localStorage.setItem(LS_SAVED, JSON.stringify(next))
      setSavedIds(next.map(x => x.id))
    } catch {}
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.articles
    if (filter !== 'all') list = list.filter(a => a.topic === filter)
    if (sourceFilter !== 'all') list = list.filter(a => a.source === sourceFilter)
    if (sort === 'india') list = [...list].sort((a, b) => b.indiaImpactScore - a.indiaImpactScore)
    if (sort === 'trending') list = [...list].filter(a => a.isTrending || a.isBreaking)
    // Watch list bubbles to top
    if (watch.length > 0) {
      list = [...list].sort((a, b) => Number(watch.includes(b.topic)) - Number(watch.includes(a.topic)))
    }
    return list
  }, [data, filter, sourceFilter, sort, watch])

  const breakingOrTrending = useMemo(() =>
    data?.articles.filter(a => a.isBreaking || a.isTrending).slice(0, 3) ?? [],
    [data]
  )

  const submitEmail = async () => {
    if (!email.trim()) return
    setSubStatus('idle')
    try {
      const res = await fetch('/api/news/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      setSubStatus(json.ok ? 'ok' : 'err')
      if (json.ok) setEmail('')
    } catch {
      setSubStatus('err')
    }
  }

  return (
    <main className="min-h-screen bg-[#050810] text-white pt-24 pb-16">
      <div className="px-4 max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-xs tracking-[3px] uppercase font-bold text-amber-300">Pulse</p>
          <h1 className="mt-2 text-3xl md:text-5xl font-black">Robotics Intelligence Briefing</h1>
          <p className="mt-2 text-zinc-300">What happened in robotics — and why it matters for India.</p>
          {data?.lastUpdated && (
            <p className="mt-1 text-xs text-zinc-500">
              Updated {timeAgo(data.lastUpdated)}.
            </p>
          )}
        </div>

        {/* Trending bar */}
        {data && data.trending.length > 0 && (
          <div className="mb-6 overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 whitespace-nowrap">
              {data.trending.map(t => (
                <button
                  key={t.topic}
                  onClick={() => setFilter(t.topic)}
                  className={`text-xs font-bold px-3 py-2 rounded-full border ${
                    filter === t.topic ? 'bg-amber-500 text-black border-amber-500'
                                       : 'border-white/15 bg-white/[0.04] text-zinc-200 hover:border-amber-400/40'
                  }`}
                >
                  {TOPIC_LABELS[t.topic] || t.topic} · 🔥 {t.count}
                  {t.momentum === 'rising' && <span className="text-emerald-300 ml-1">↑</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main feed */}
          <div>
            {/* India Spotlight */}
            {data && data.indiaHighlights.length > 0 && (
              <section className="mb-7">
                <h2 className="text-xs uppercase tracking-widest font-black text-amber-300 mb-3">🇮🇳 India Spotlight</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.indiaHighlights.slice(0, 2).map(a => (
                    <FeaturedCard key={a.id} article={a} styles={data.sourceStyles} onSave={toggleSave} saved={savedIds.includes(a.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* Breaking / Trending */}
            {breakingOrTrending.length > 0 && (
              <section className="mb-7">
                <h2 className="text-xs uppercase tracking-widest font-black text-red-300 mb-3">🔥 Breaking / Trending</h2>
                <div className="grid grid-cols-1 gap-3">
                  {breakingOrTrending.map(a => (
                    <ArticleRow key={a.id} article={a} styles={data?.sourceStyles ?? {}}
                      expanded={expanded.has(a.id)}
                      onToggle={() => setExpanded(prev => {
                        const next = new Set(prev); if (next.has(a.id)) next.delete(a.id); else next.add(a.id); return next
                      })}
                      onSave={toggleSave}
                      saved={savedIds.includes(a.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Source filter */}
            <div className="mb-3 flex gap-2 flex-wrap items-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Source</span>
              {(['all', 'IEEE Spectrum', 'MIT News', 'TechCrunch', 'The Robot Report', 'Wired', 'Hacker News'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border ${sourceFilter === s ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 bg-white/[0.04] text-zinc-200'}`}
                >
                  {s === 'all' ? 'All sources' : s}
                </button>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="mb-4 flex gap-2 flex-wrap">
              <button onClick={() => setFilter('all')} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${filter === 'all' ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 bg-white/[0.04] text-zinc-200'}`}>All</button>
              {Object.entries(TOPIC_LABELS).map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${filter === k ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 bg-white/[0.04] text-zinc-200'}`}>{label}</button>
              ))}
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="text-zinc-400">Sort:</span>
                <select value={sort} onChange={e => setSort(e.target.value as 'latest' | 'india' | 'trending')} className="bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-zinc-200">
                  <option value="latest">Latest</option>
                  <option value="india">India Impact</option>
                  <option value="trending">Trending only</option>
                </select>
              </div>
            </div>

            {/* Saved toggle */}
            <button onClick={() => setShowSaved(s => !s)} className="text-xs font-bold underline text-amber-300 mb-3">
              {showSaved ? 'Hide saved' : `Show saved (${savedIds.length})`}
            </button>

            {/* Feed */}
            <div className="space-y-3">
              {!data && [...Array(5)].map((_, i) => <Skeleton key={i} />)}
              {data && (showSaved
                ? data.articles.filter(a => savedIds.includes(a.id))
                : filtered
              ).map(a => (
                <ArticleRow
                  key={a.id} article={a} styles={data.sourceStyles}
                  expanded={expanded.has(a.id)}
                  onToggle={() => setExpanded(prev => {
                    const next = new Set(prev); if (next.has(a.id)) next.delete(a.id); else next.add(a.id); return next
                  })}
                  onSave={toggleSave}
                  saved={savedIds.includes(a.id)}
                />
              ))}
              {data && filtered.length === 0 && (
                <p className="text-zinc-500 text-center py-10">No articles match this filter.</p>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-4">
            {data && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">This Week</p>
                <p className="text-2xl font-black mt-2">{data.weeklyStats.totalArticles}</p>
                <p className="text-xs text-zinc-400">articles aggregated</p>
                <p className="mt-3 text-sm text-amber-200">
                  🇮🇳 <strong>{data.weeklyStats.indiaStories}</strong> stories matter for India this week
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {data.weeklyStats.topTopics.slice(0, 5).map(t => (
                    <span key={t} className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-full px-2 py-0.5">{TOPIC_LABELS[t] || t}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-widest text-amber-300 font-bold mb-2">Watchlist</p>
              <p className="text-xs text-zinc-400 mb-2">Topics you follow bubble to the top.</p>
              <div className="space-y-1.5">
                {WATCHLIST_TOPICS.map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-zinc-200">
                    <input type="checkbox" checked={watch.includes(t)} onChange={() => toggleWatch(t)} className="accent-amber-500" />
                    {TOPIC_LABELS[t] || t}
                  </label>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Subscribe banner */}
        <section className="mt-10 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">Weekly Digest</p>
          <h3 className="mt-2 text-2xl font-black">Robotics Intelligence — every Monday</h3>
          <p className="text-zinc-300 mt-1">The week, condensed. India-relevant first. Sent honestly.</p>
          <div className="mt-4 flex justify-center gap-2 flex-wrap max-w-md mx-auto">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 min-w-[200px] bg-black/40 border border-white/15 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-amber-400"
            />
            <button onClick={submitEmail} className="rounded-xl bg-amber-500 text-black px-5 py-2 font-bold">Subscribe</button>
          </div>
          {subStatus === 'ok'  && <p className="mt-2 text-sm text-emerald-300">✓ Subscribed. Welcome.</p>}
          {subStatus === 'err' && <p className="mt-2 text-sm text-red-300">Something went wrong. Try again.</p>}
          <p className="mt-3 text-xs text-zinc-500">Join the readers building India\'s robotics future.</p>
        </section>
      </div>
    </main>
  )
}

function FeaturedCard({ article: a, styles, onSave, saved }: {
  article: EnrichedArticle
  styles: Record<string, { color: string; short: string }>
  onSave: (a: EnrichedArticle) => void
  saved: boolean
}) {
  const s = styles[a.source] || { color: '#888', short: a.source.slice(0, 4).toUpperCase() }
  return (
    <article className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-orange-500/4 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 text-white" style={{ background: s.color }}>{s.short}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded-full px-2 py-0.5">
          🇮🇳 HIGH IMPACT · {a.indiaImpactScore}/10
        </span>
        <span className="text-[10px] text-zinc-500 ml-auto">{timeAgo(a.publishedAt)}</span>
      </div>
      <a href={a.url} target="_blank" rel="noopener" className="block hover:text-amber-200">
        <h3 className="text-lg font-black text-white leading-snug">{a.title}</h3>
      </a>
      <p className="mt-2 text-sm text-zinc-300 line-clamp-3">{a.aiSummary || a.description}</p>
      <div className="mt-3 rounded-lg bg-black/30 border border-amber-500/30 p-3">
        <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">R2BOT context</p>
        <p className="mt-1 text-xs text-zinc-200">{a.whyItMatters}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => onSave(a)} className="text-xs text-zinc-300 hover:text-amber-300">{saved ? '🔖 Saved' : '🔖 Save'}</button>
        <a href={a.url} target="_blank" rel="noopener" className="ml-auto text-xs font-bold text-amber-300 hover:text-amber-200">Open →</a>
      </div>
    </article>
  )
}

function ArticleRow({ article: a, styles, expanded, onToggle, onSave, saved }: {
  article: EnrichedArticle
  styles: Record<string, { color: string; short: string }>
  expanded: boolean
  onToggle: () => void
  onSave: (a: EnrichedArticle) => void
  saved: boolean
}) {
  const s = styles[a.source] || { color: '#888', short: a.source.slice(0, 4).toUpperCase() }
  const impactColor = a.indiaImpactScore >= 7 ? '#10b981' : a.indiaImpactScore >= 4 ? '#f59e0b' : a.indiaImpactScore >= 1 ? '#a3a3a3' : '#525252'

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-amber-400/30 transition-colors">
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
        <span className="text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 text-white" style={{ background: s.color }}>{s.short}</span>
        <span className="text-zinc-400">{a.source}</span>
        <span className="text-[10px] text-zinc-500">·</span>
        <span className="text-[10px] text-amber-300 font-bold">{TOPIC_LABELS[a.topic] || a.topic}</span>
        <span title="sentiment" className="text-base">{SENTIMENT_EMOJI[a.sentiment]}</span>
        {a.isBreaking  && <span className="text-[9px] font-bold uppercase tracking-widest bg-red-500 text-white rounded px-1.5 py-0.5">BREAKING</span>}
        {a.isTrending  && <span className="text-[9px] font-bold uppercase tracking-widest bg-orange-500 text-black rounded px-1.5 py-0.5">TRENDING</span>}
        <span className="ml-auto text-[10px] text-zinc-500">{timeAgo(a.publishedAt)} · {a.readingTime} min</span>
      </div>

      <a href={a.url} target="_blank" rel="noopener" className="block">
        <h3 className="text-base font-bold text-white hover:text-amber-200">{a.title}</h3>
      </a>
      <p className="mt-1.5 text-sm text-zinc-400 line-clamp-3">{a.aiSummary || a.description}</p>

      {/* India impact bar */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="text-zinc-500 w-16">India ↗</span>
        <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${a.indiaImpactScore * 10}%`, background: impactColor }} />
        </div>
        <span className="text-zinc-300 font-bold w-12 text-right" style={{ color: impactColor }}>{a.indiaImpactScore}/10</span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-3 text-xs">
        <button onClick={onToggle} className="text-amber-300 hover:text-amber-200 font-bold">
          {expanded ? '✕ Hide context' : 'R2BOT context →'}
        </button>
        <button onClick={() => onSave(a)} className="text-zinc-300 hover:text-amber-300">{saved ? '🔖 Saved' : '🔖 Save'}</button>
        <a href={a.url} target="_blank" rel="noopener" className="ml-auto text-zinc-200 hover:text-amber-300">Open →</a>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg bg-black/30 border border-amber-500/20 p-3 space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-300">Why it matters</p>
            <p className="mt-1 text-sm text-zinc-200">{a.whyItMatters}</p>
          </div>
          {a.relatedAtlasTerms.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Learn more</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {a.relatedAtlasTerms.map(t => (
                  <Link key={t} href={`/atlas/concept/${t}`} className="text-xs bg-amber-500/15 border border-amber-500/30 text-amber-200 rounded-full px-2 py-0.5">📚 {t}</Link>
                ))}
              </div>
            </div>
          )}
          {a.relatedLessons.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Related lesson</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {a.relatedLessons.map(l => (
                  <Link key={l} href={`/academy`} className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 rounded-full px-2 py-0.5">🎓 {l}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function Skeleton() {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 animate-pulse h-32" />
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} day ago`
  return new Date(iso).toLocaleDateString()
}
