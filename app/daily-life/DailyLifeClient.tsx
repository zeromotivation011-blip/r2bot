'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { DAY_MOMENTS, ROBOT_COUNTER_FACTS, TOTAL_ROBOTS_PER_DAY, type DayMoment } from '@/lib/daily-life-data'
import { HeroCounter } from '@/components/daily-life/HeroCounter'
import { FunFactsTicker } from '@/components/daily-life/FunFactsTicker'
import {
  DAILY_LIFE_ARTICLES,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  isPublished,
  type DailyLifeArticle,
  type DailyLifeCategory,
} from '@/lib/daily-life'

type Mode = 'story' | 'check' | 'category' | 'articles'

const CATEGORIES = ['Home', 'Finance', 'Transport', 'Work', 'Health', 'Food', 'Communication', 'Entertainment'] as const

export default function DailyLifeClient() {
  const [mode, setMode] = useState<Mode>('story')
  const modeRef = useRef<HTMLDivElement | null>(null)

  return (
    <main className="min-h-screen bg-[#050810] text-white pt-20 pb-16">
      <HeroCounter
        total={TOTAL_ROBOTS_PER_DAY}
        onShowMe={() => modeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
      <FunFactsTicker />
      <div ref={modeRef} className="px-4 mt-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs tracking-[3px] uppercase font-bold text-amber-300">Robots already running your life</p>
          <h1 className="mt-2 text-3xl md:text-5xl font-black">
            Your <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">Robot Day</span>
          </h1>
          <p className="mt-3 text-zinc-300 text-base md:text-lg">A walk through one Indian day. 47 robots help you — most invisible.</p>
        </div>

        <div className="mt-6 mx-auto max-w-2xl flex gap-2 justify-center">
          {([
            { id: 'story', label: '📜 Your Day' },
            { id: 'check', label: '✓ Count My Robots' },
            { id: 'category', label: '📂 By Category' },
            { id: 'articles', label: '📰 Articles' },
          ] as { id: Mode; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-full text-sm font-bold border ${
                mode === t.id
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'border-white/15 bg-white/[0.04] text-zinc-300 hover:border-amber-400/40'
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {mode === 'story'    && <StoryMode />}
      {mode === 'check'    && <CheckMode />}
      {mode === 'category' && <CategoryMode />}
      {mode === 'articles' && <ArticlesMode />}
    </main>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MODE 4 — Long-form article grid (10 stubs; "Coming soon" until content lands)
// ────────────────────────────────────────────────────────────────────────────
function ArticlesMode() {
  const [catFilter, setCatFilter] = useState<'all' | DailyLifeCategory>('all')
  const articles = useMemo(() => {
    if (catFilter === 'all') return DAILY_LIFE_ARTICLES
    return DAILY_LIFE_ARTICLES.filter((a) => a.category === catFilter)
  }, [catFilter])

  const categories: ('all' | DailyLifeCategory)[] = ['all', 'manufacturing', 'healthcare', 'agriculture', 'home', 'logistics']

  return (
    <section className="px-4 mt-10">
      <div className="mx-auto max-w-5xl">
        <header className="text-center mb-6">
          <p className="text-[11px] tracking-[3px] uppercase font-bold text-amber-300">Articles</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-black">Real-world robotics, one story at a time.</h2>
          <p className="mt-2 text-zinc-400 text-sm">
            Ten dispatches from where robots already live and work — manufacturing floors, hospitals, farms, kitchens, warehouses.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {categories.map((c) => (
            <button
              key={c} type="button"
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                catFilter === c
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'border-white/15 bg-white/[0.04] text-zinc-300 hover:border-amber-400/40'
              }`}
            >
              {c === 'all' ? 'All' : `${CATEGORY_EMOJI[c]} ${CATEGORY_LABEL[c]}`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      </div>
    </section>
  )
}

function ArticleCard({ article: a }: { article: DailyLifeArticle }) {
  const published = isPublished(a)
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200">
          {CATEGORY_EMOJI[a.category]} {CATEGORY_LABEL[a.category]}
        </span>
        {!published && (
          <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-zinc-500/15 border border-zinc-500/30 text-zinc-300">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-white leading-snug">{a.title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{a.excerpt}</p>
      {a.atlasLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {a.atlasLinks.map((l) => (
            <Link
              key={l.slug} href={`/atlas/concept/${l.slug}`}
              className="text-[11px] font-semibold rounded-full bg-white/[0.04] border border-white/10 px-2 py-0.5 text-zinc-300 hover:border-amber-400/40 hover:text-amber-200"
            >
              📚 {l.label}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
        <span>{a.readTime}</span>
        <span>{new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </article>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MODE 1 — Story scroll with IntersectionObserver counter + 47-robot climax
// ────────────────────────────────────────────────────────────────────────────
function StoryMode() {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [showClimax, setShowClimax] = useState(false)
  const climaxFired = useRef(false)

  const revealedCount = revealedIds.size + extraInvisibleRobots(revealedIds.size)

  // IntersectionObserver — mark each moment as seen
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).dataset.momentId
          if (!id) return
          setRevealedIds(prev => {
            if (prev.has(id)) return prev
            const next = new Set(prev); next.add(id); return next
          })
        }
      })
    }, { threshold: 0.55 })
    document.querySelectorAll('[data-moment-id]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  // 47-robot climax (only fires once)
  useEffect(() => {
    if (climaxFired.current) return
    if (revealedCount >= TOTAL_ROBOTS_PER_DAY) {
      climaxFired.current = true
      setShowClimax(true)
      playClimaxSound()
    }
  }, [revealedCount])

  const milestone = ROBOT_COUNTER_FACTS.slice().reverse().find(f => revealedCount >= f.count)
  const bgClass =
    revealedCount >= 47 ? 'bg-emerald-900' :
    revealedCount >= 35 ? 'bg-amber-900' :
    revealedCount >= 20 ? 'bg-purple-900' :
    revealedCount >= 10 ? 'bg-blue-900' :
    'bg-gray-900'

  return (
    <>
      {/* Counter top bar (sticky) */}
      <div className={`sticky top-0 z-10 ${bgClass} border-b border-white/10 px-4 py-3 mt-6 transition-colors`}>
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
          <p className="text-base md:text-lg font-bold">
            🤖 Robots used so far: <span className="text-3xl md:text-4xl font-black text-amber-300 inline-block tabular-nums transition-all" style={{ transition: 'all 0.3s ease' }}>{revealedCount}</span> / {TOTAL_ROBOTS_PER_DAY}
          </p>
          <div className="h-2 w-32 sm:w-48 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${(revealedCount / TOTAL_ROBOTS_PER_DAY) * 100}%` }} />
          </div>
        </div>
        {milestone && (
          <p className="mt-1 text-center text-xs text-amber-200 max-w-3xl mx-auto">💡 {milestone.message}</p>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 mt-8 space-y-4">
        {DAY_MOMENTS.map((m, i) => (
          <MomentCard
            key={m.id}
            moment={m}
            index={i}
            open={openIds.has(m.id)}
            onToggle={() => setOpenIds(prev => {
              const next = new Set(prev)
              if (next.has(m.id)) next.delete(m.id); else next.add(m.id)
              return next
            })}
          />
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="mt-12 mx-auto max-w-3xl px-4">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 text-center">
          <p className="text-2xl md:text-3xl font-black text-white">India has 4 robots per 10,000 workers.</p>
          <p className="mt-2 text-lg text-amber-300 font-bold">South Korea has 1,012.</p>
          <div className="mt-4 h-3 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" style={{ width: '0.4%' }} />
          </div>
          <p className="mt-2 text-xs text-zinc-400">India: 0.4% of Korea\'s density</p>
          <p className="mt-4 text-base text-zinc-200">The robots are already there. The question is: will you <strong className="text-amber-300">build</strong> them, or just <em>use</em> them?</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/academy" className="rounded-xl bg-amber-500 text-black px-5 py-2.5 font-bold">Start Learning Robotics →</Link>
            <Link href="/atlas" className="rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-200 px-5 py-2.5 font-bold">Explore the World Map →</Link>
          </div>
        </div>
      </section>

      {/* 47-robot climax */}
      {showClimax && <ClimaxOverlay onClose={() => setShowClimax(false)} />}
    </>
  )
}

function MomentCard({ moment: m, index, open, onToggle }: {
  moment: DayMoment; index: number; open: boolean; onToggle: () => void
}) {
  return (
    <article
      data-moment-id={m.id}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">{m.time}</span>
          <h3 className="mt-1 text-lg md:text-xl font-black text-white">{m.activity}</h3>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${m.isVisible ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'}`}>
          {m.isVisible ? '👁️ Visible' : '👻 Invisible'}
        </span>
      </div>

      <button
        onClick={() => { onToggle(); if (!open) playRevealSound() }}
        className="mt-3 w-full text-left rounded-xl bg-black/30 border border-amber-500/30 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/10"
      >
        {open ? '✕ Hide robot' : '👉 Tap to reveal the robot'}
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? 800 : 0, opacity: open ? 1 : 0 }}
      >
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">{m.robotInvolved}</p>
            <p className="mt-1 text-sm text-zinc-100">{m.howRobotHelps}</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Think of it like…</p>
            <p className="mt-1 text-sm text-zinc-200 italic">{m.analogy}</p>
          </div>
          <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
            <p className="text-[10px] uppercase tracking-wider text-purple-300 font-bold">🤯 Mind-blowing</p>
            <p className="mt-1 text-sm text-zinc-100">{m.mindBlowingFact}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">💰 {m.economicValue}</span>
            <span className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/15 rounded-full px-2 py-0.5">{m.category}</span>
            {m.atlasLink && (
              <Link href={`/atlas/concept/${m.atlasLink}`} className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">📚 {m.atlasLink}</Link>
            )}
            {m.robotLink && (
              <Link href={`/robots/${m.robotLink}`} className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">🤖 {m.robotLink}</Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MODE 2 — "Count My Robots" interactive checklist + canvas share card
// ────────────────────────────────────────────────────────────────────────────
function CheckMode() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const count = checked.size + extraInvisibleRobots(checked.size)

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else { next.add(id); playRevealSound() }
      return next
    })
  }

  const shareCard = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200; canvas.height = 630
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0F0A1E'; ctx.fillRect(0, 0, 1200, 630)
    // Stars
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.7
      ctx.beginPath(); ctx.arc(Math.random() * 1200, Math.random() * 630, Math.random() * 1.6, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 200px sans-serif'
    ctx.fillText(String(count), 100, 320)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText('robots running my day', 100, 400)
    ctx.fillStyle = '#fbbf24'
    ctx.font = '32px sans-serif'
    ctx.fillText('Built with R2BOT — r2bot.in/daily-life', 100, 560)
    const a = document.createElement('a')
    a.href = canvas.toDataURL()
    a.download = 'my-robot-day.png'
    a.click()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 mt-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 mb-4 sticky top-0 z-10 backdrop-blur">
        <p className="text-sm font-bold">You\'ve used <span className="text-3xl text-amber-300">{count}</span> / {TOTAL_ROBOTS_PER_DAY} robots today.</p>
        <button onClick={shareCard} className="mt-2 rounded-xl bg-amber-500 text-black px-4 py-2 text-sm font-bold">📤 Share my robot score</button>
      </div>
      <ul className="space-y-2">
        {DAY_MOMENTS.map(m => (
          <li key={m.id}>
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${checked.has(m.id) ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/30'}`}>
              <input type="checkbox" checked={checked.has(m.id)} onChange={() => toggle(m.id)} className="mt-1 accent-amber-500" />
              <div>
                <p className="text-sm font-bold text-white">{m.time} — {m.activity}</p>
                <p className="text-xs text-zinc-400">{m.robotInvolved}</p>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MODE 3 — By Category
// ────────────────────────────────────────────────────────────────────────────
function CategoryMode() {
  const [cat, setCat] = useState<string | null>(null)
  const items = useMemo(() => cat ? DAY_MOMENTS.filter(m => m.category === cat) : DAY_MOMENTS, [cat])

  return (
    <div className="mx-auto max-w-5xl px-4 mt-8">
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setCat(null)} className={`text-xs px-3 py-1.5 rounded-full border ${!cat ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 bg-white/[0.04] text-zinc-300'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`text-xs px-3 py-1.5 rounded-full border ${cat === c ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 bg-white/[0.04] text-zinc-300'}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(m => (
          <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">{m.time}</span>
            <h4 className="mt-1 font-bold text-white">{m.activity}</h4>
            <p className="text-xs text-zinc-400 mt-1">{m.robotInvolved}</p>
            <p className="mt-3 text-sm text-zinc-200 italic">🤯 {m.mindBlowingFact}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Climax overlay (47 ROBOTS. ONE DAY.)
// ────────────────────────────────────────────────────────────────────────────
function ClimaxOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-4" onClick={onClose}>
      <div className="text-center max-w-2xl">
        <p className="text-[120px] md:text-[200px] font-black text-amber-400 leading-none climax-47" style={{ textShadow: '0 0 80px rgba(251,191,36,.4)' }}>
          47
        </p>
        <p className="mt-2 text-2xl md:text-3xl font-black text-white climax-line climax-line-1">ROBOTS.</p>
        <p className="mt-1 text-2xl md:text-3xl font-black text-white climax-line climax-line-2">ONE DAY.</p>
        <p className="mt-6 text-base md:text-lg text-amber-300 climax-line climax-line-3">India has only <strong className="text-white">4</strong> robots per 10,000 workers. South Korea has <strong className="text-white">1,012</strong>.</p>
        <p className="mt-3 text-sm text-zinc-300 climax-line climax-line-3">The robots are already there. The question is — will you build them?</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 climax-line climax-line-4">
          <Link href="/academy" className="rounded-xl bg-amber-500 text-black px-5 py-3 font-bold">Start Learning Robotics →</Link>
          <Link href="/atlas" className="rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-200 px-5 py-3 font-bold">Explore the World Map →</Link>
        </div>
      </div>
      <style jsx>{`
        @keyframes slam-in { 0% { transform: scale(3); opacity: 0 } 60% { transform: scale(.9); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        .climax-47 { animation: slam-in 0.6s ease-out forwards; }
        .climax-line { opacity: 0; animation: fade-up 0.5s ease-out forwards; }
        .climax-line-1 { animation-delay: 0.8s; }
        .climax-line-2 { animation-delay: 1.5s; }
        .climax-line-3 { animation-delay: 2.5s; }
        .climax-line-4 { animation-delay: 3.5s; }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sound + counter helpers
// ────────────────────────────────────────────────────────────────────────────
function playRevealSound() {
  try {
    if (typeof window === 'undefined') return
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    if (!Ctor) return
    const ctx = new Ctor()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 220
    o.type = 'sine'
    g.gain.value = 0.15
    o.connect(g).connect(ctx.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    o.stop(ctx.currentTime + 0.2)
  } catch {}
}

function playClimaxSound() {
  try {
    if (typeof window === 'undefined') return
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    if (!Ctor) return
    const ctx = new Ctor()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(220, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5)
    o.type = 'sawtooth'
    g.gain.value = 0.2
    o.connect(g).connect(ctx.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    o.stop(ctx.currentTime + 0.6)
  } catch {}
}

// As the user scrolls/reveals 24 visible moments, the running counter also
// reflects ~23 invisible robots bundled inside each (network routers, payment HSMs,
// OCR services, CDN nodes, etc.). We progressively credit those as the user reads.
function extraInvisibleRobots(visibleSeen: number): number {
  if (visibleSeen <= 0) return 0
  const extraPerVisible = (TOTAL_ROBOTS_PER_DAY - DAY_MOMENTS.length) / DAY_MOMENTS.length
  return Math.min(TOTAL_ROBOTS_PER_DAY - visibleSeen, Math.round(visibleSeen * extraPerVisible))
}
