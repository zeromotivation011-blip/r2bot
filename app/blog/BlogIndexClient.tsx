'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

interface PostLite {
  slug: string
  title: string
  description: string
  date: string
  author: string
  authorRole: string
  tags: string[]
  readTime: number
  coverEmoji: string
  featured: boolean
  kind?: 'evergreen' | 'news'
  keywords: string[]
}

const TAG_COLOR: Record<string, string> = {
  Beginner:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Career:      'bg-purple-500/15 text-purple-300 border-purple-500/30',
  Arduino:     'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Schools:     'bg-amber-500/15 text-gray-300 border-white/15',
  India:       'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Hindi:       'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'AI & ML':   'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Tutorials:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
}
function tagClass(tag: string) {
  return TAG_COLOR[tag] || 'bg-white/[0.04] text-zinc-300 border-white/15'
}

export default function BlogIndexClient({ posts, tags }: { posts: PostLite[]; tags: { tag: string; count: number }[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [search, setSearch]       = useState('')

  // Dated news reports are separated from evergreen explainers. Four posts
  // about funding rounds and order volumes were sitting in the same grid as
  // "How do robots work", which makes the guides look like a news feed and the
  // news look like it should still be accurate next year.
  const evergreen = useMemo(() => posts.filter(p => p.kind !== 'news'), [posts])
  const news = useMemo(
    () => posts.filter(p => p.kind === 'news').sort((a, b) => b.date.localeCompare(a.date)),
    [posts],
  )

  const featured = evergreen.find(p => p.featured) ?? evergreen[0]
  const filtered = useMemo(() => {
    let list = evergreen
    if (activeTag) list = list.filter(p => p.tags.includes(activeTag))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    return list.filter(p => p.slug !== featured?.slug)
  }, [evergreen, activeTag, search, featured])
  const browsing = Boolean(activeTag || search.trim())

  return (
    <main className="min-h-screen bg-[var(--void)] text-white pt-24 pb-20 px-4">
      {/* Hero */}
      <section className="mx-auto max-w-5xl text-center">
        <p className="text-xs uppercase tracking-[3px] font-black text-blue-400">R2BOT Blog</p>
        <h1 className="mt-3 text-4xl md:text-6xl font-black">Guides, tutorials &amp; <span style={{ background: 'linear-gradient(90deg,#3b82f6,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>insights</span>.</h1>
        <p className="mt-4 text-lg text-zinc-300 max-w-2xl mx-auto">
          Explainers and comparisons for anyone getting into robotics, anywhere. Free, ad-free, and as practical as we can make it.
        </p>
        <div className="mt-7 max-w-md mx-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="text"
            placeholder="Search articles…"
            className="w-full bg-[var(--surface-1)] border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="mx-auto max-w-5xl mt-12">
          <Link href={`/blog/${featured.slug}`} className="block">
            <article className="relative rounded-3xl border border-white/15 bg-gradient-to-br from-amber-500/10 via-transparent to-blue-500/10 p-7 md:p-10 hover:border-amber-400/60 transition-colors">
              <span className="text-xs font-black uppercase tracking-widest text-gray-300">Featured</span>
              <div className="mt-3 flex items-start gap-5">
                <span className="text-6xl md:text-7xl">{featured.coverEmoji}</span>
                <div className="min-w-0">
                  <h2 className="text-2xl md:text-4xl font-black leading-tight text-white">{featured.title}</h2>
                  <p className="mt-2 text-zinc-300 line-clamp-2">{featured.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {featured.tags.map(t => (
                      <span key={t} className={`text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${tagClass(t)}`}>{t}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">{featured.readTime} min read · {fmtDate(featured.date)} · <span className="text-gray-300 font-bold">Read article →</span></p>
                </div>
              </div>
            </article>
          </Link>
        </section>
      )}

      {/* Tag filters */}
      <section className="mx-auto max-w-5xl mt-10">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border ${!activeTag ? 'bg-blue-500 text-white border-blue-500' : 'border-white/15 bg-white/[0.04] text-zinc-200'}`}
          >All</button>
          {tags.map(t => (
            <button
              key={t.tag}
              onClick={() => setActiveTag(t.tag === activeTag ? null : t.tag)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border ${activeTag === t.tag ? 'bg-blue-500 text-white border-blue-500' : `border-white/15 bg-white/[0.04] ${tagClass(t.tag).split(' ').slice(1, 2).join(' ')}`}`}
            >
              {t.tag} <span className="opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="block group">
            <article className="h-full rounded-2xl border border-white/10 bg-[var(--surface-1)] p-5 transition-all group-hover:-translate-y-1 group-hover:border-blue-500/40 group-hover:shadow-[0_18px_50px_rgba(59,130,246,.15)]">
              <div className="text-4xl">{p.coverEmoji}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.tags.slice(0, 3).map(t => (
                  <span key={t} className={`text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${tagClass(t)}`}>{t}</span>
                ))}
              </div>
              <h3 className="mt-3 text-lg font-black text-white leading-snug line-clamp-2">{p.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{p.description}</p>
              <p className="mt-3 text-xs text-zinc-500">{p.readTime} min · {fmtDate(p.date)}</p>
              <p className="mt-3 text-sm font-bold text-blue-400 group-hover:text-blue-300">Read →</p>
            </article>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-zinc-500 py-12">No articles match this filter.</p>
        )}
      </section>

      {/* Dated reporting, kept visibly separate and clearly dated. Hidden while
          the reader is filtering or searching the guides. */}
      {!browsing && news.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl">
          <h2 className="text-xl font-black text-white">Robotics news, reported</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Dated pieces about what happened, not guides. For the daily feed see{' '}
            <Link href="/news" className="text-gray-300 underline">News</Link>.
          </p>
          <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
            {news.map(p => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="flex min-h-[44px] flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 hover:bg-white/[0.03]"
                >
                  <span className="text-lg" aria-hidden>{p.coverEmoji}</span>
                  <span className="flex-1 font-semibold text-zinc-100">{p.title}</span>
                  <time dateTime={p.date} className="text-xs text-zinc-500">{fmtDate(p.date)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}
