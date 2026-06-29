'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { HistoryChapter, HistoryMilestone } from '@/lib/history-chapters'
import { FUTURE_PREDICTIONS } from '@/lib/history-chapters'
import { TimelineScrubber } from '@/components/history/TimelineScrubber'

const LS_BIRTH = 'r2bot_history_birth_year'

export default function HistoryHomeClient({ chapters }: { chapters: HistoryChapter[] }) {
  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [activeChapter, setActiveChapter] = useState<string>(chapters[0].id)

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_BIRTH)
      if (v) setBirthYear(parseInt(v, 10))
    } catch {}
  }, [])

  const onBirthChange = (v: string) => {
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= 1900 && n <= new Date().getFullYear()) {
      setBirthYear(n)
      localStorage.setItem(LS_BIRTH, String(n))
    } else if (v === '') {
      setBirthYear(null)
      localStorage.removeItem(LS_BIRTH)
    }
  }

  const lifetimeSummary = useMemo(() => {
    if (!birthYear) return null
    const allMs = chapters.flatMap(c => c.milestones).sort((a, b) => a.year - b.year)
    const inLifetime = allMs.filter(m => m.year >= birthYear)
    if (inLifetime.length < 2) return null
    const first = inLifetime[0]
    const last = inLifetime[inLifetime.length - 1]
    return {
      count: inLifetime.length,
      firstYear: first.year,
      firstTitle: first.title,
      lastYear: last.year,
      lastTitle: last.title,
      age: new Date().getFullYear() - birthYear,
    }
  }, [chapters, birthYear])

  return (
    <main className="min-h-screen bg-[#050810] text-white">
      {/* Hero */}
      <section className="relative px-4 pt-28 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.15),transparent_40%),radial-gradient(circle_at_80%_50%,rgba(124,58,237,0.12),transparent_40%)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs tracking-[3px] uppercase text-amber-300 font-bold">The Greatest Story Never Told</p>
          <h1 className="mt-4 font-black leading-[1.05] text-[clamp(36px,6vw,64px)] text-white animate-fade-in">
            The Story of <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">Robots</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-zinc-300">
            From a 1920 Czech play to a robot walking on Mars. The full narrative, in 6 chapters — with India\'s parallel story woven in.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <a href="#dream" className="rounded-xl bg-amber-500 text-black px-5 py-2.5 font-bold">Start reading →</a>
            <a href="#india" className="rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-200 px-5 py-2.5 font-bold">Jump to India 🇮🇳 →</a>
            <a href="#future" className="rounded-xl border border-white/15 bg-white/[0.04] text-zinc-200 px-5 py-2.5 font-bold">The future →</a>
          </div>

          {/* Birth year time-travel — enhanced */}
          <BirthYearPanel birthYear={birthYear} onBirthChange={onBirthChange} lifetimeSummary={lifetimeSummary} />
        </div>
      </section>

      {/* Chapter selector */}
      <nav className="sticky top-0 z-20 bg-[#050810]/95 backdrop-blur border-y border-white/10 px-4 py-3">
        <div className="mx-auto max-w-6xl flex gap-2 overflow-x-auto">
          {chapters.map(c => (
            <a
              key={c.id}
              href={`#${c.id}`}
              onClick={() => setActiveChapter(c.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
                activeChapter === c.id
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'border-white/15 bg-white/[0.04] text-zinc-300 hover:border-amber-400/40'
              }`}
            >
              <span>{c.emoji}</span> {c.title} <span className="opacity-60 ml-1">{c.years}</span>
            </a>
          ))}
          <a
            href="#future"
            className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border border-purple-400/40 bg-purple-500/10 text-purple-200 whitespace-nowrap"
          >🚀 Future →</a>
        </div>
      </nav>

      {/* Horizontal timeline scrubber */}
      <TimelineScrubber chapters={chapters} birthYear={birthYear} />

      {/* Chapters */}
      {chapters.map((c, i) => (
        <ChapterSection key={c.id} chapter={c} birthYear={birthYear} chapterIndex={i} />
      ))}

      {/* Future */}
      <FutureSection />

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
      `}</style>
    </main>
  )
}

function ChapterSection({ chapter, birthYear, chapterIndex }: { chapter: HistoryChapter; birthYear: number | null; chapterIndex: number }) {
  return (
    <section id={chapter.id} className="px-4 py-16" style={{
      background: `linear-gradient(180deg, ${chapter.color}15 0%, transparent 100%)`,
      borderTop: `1px solid ${chapter.color}30`,
    }}>
      <div className="mx-auto max-w-5xl">
        {/* Cinematic chapter opener */}
        <ChapterOpener chapter={chapter} chapterIndex={chapterIndex} milestoneCount={chapter.milestones.length} />

        {/* Pivot moment callout */}
        <div className="mt-6 max-w-2xl mx-auto rounded-2xl p-4" style={{
          background: `${chapter.color}15`,
          border: `1px solid ${chapter.color}50`,
        }}>
          <p className="text-xs uppercase tracking-wider font-bold" style={{ color: chapter.color }}>The pivot moment</p>
          <p className="mt-1 text-base text-zinc-100">{chapter.pivotMoment}</p>
        </div>

        {/* Milestones */}
        <ol className="space-y-6">
          {chapter.milestones.map((m, i) => (
            <MilestoneCard key={`${chapter.id}-${m.year}-${i}`} milestone={m} index={i} color={chapter.color} birthYear={birthYear} />
          ))}
        </ol>
      </div>
    </section>
  )
}

function BirthYearPanel({ birthYear, onBirthChange, lifetimeSummary }: {
  birthYear: number | null
  onBirthChange: (v: string) => void
  lifetimeSummary: {
    count: number
    firstYear: number
    firstTitle: string
    lastYear: number
    lastTitle: string
    age: number
  } | null
}) {
  // Era-appropriate background based on birth year
  const eraStyle = (() => {
    if (!birthYear) {
      return { background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }
    }
    if (birthYear < 1950) return { background: 'linear-gradient(135deg, #4b3a1f, #2d2113)', borderColor: '#8B7355' }
    if (birthYear < 1970) return { background: 'linear-gradient(135deg, #3d4622, #232a15)', borderColor: '#849c40' }
    if (birthYear < 1990) return { background: 'linear-gradient(135deg, #5e3a18, #3b240e)', borderColor: '#d97706' }
    if (birthYear < 2010) return { background: 'linear-gradient(135deg, #1e3a5f, #122440)', borderColor: '#3b82f6' }
    return { background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.45)' }
  })()

  return (
    <div
      className="mt-7 inline-flex flex-col items-center gap-2 rounded-2xl border px-5 py-3"
      style={{
        background: eraStyle.background,
        borderColor: eraStyle.borderColor,
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >
      <label className="text-xs uppercase tracking-wider text-amber-300 font-bold">Time-travel feature</label>
      <div className="flex items-center gap-2 text-sm text-zinc-100">
        <span>I was born in</span>
        <input
          type="number"
          value={birthYear ?? ''}
          onChange={e => onBirthChange(e.target.value)}
          placeholder="e.g. 2008"
          min="1900"
          max={new Date().getFullYear()}
          className="w-24 bg-black/40 border border-white/15 text-white text-center px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:border-amber-400"
        />
      </div>
      {birthYear && (
        <div key={birthYear} className="counter-tick text-3xl font-black text-amber-300 mt-1" aria-live="polite">
          {birthYear}
        </div>
      )}
      {lifetimeSummary && (
        <p className="text-xs text-amber-100 mt-1 max-w-md leading-relaxed">
          <strong className="text-amber-300">{lifetimeSummary.count}</strong> robot milestones happened in your lifetime —
          from <strong>{lifetimeSummary.firstTitle}</strong> ({lifetimeSummary.firstYear})
          to <strong>{lifetimeSummary.lastTitle}</strong> ({lifetimeSummary.lastYear}).
        </p>
      )}
    </div>
  )
}

function ChapterOpener({ chapter, chapterIndex, milestoneCount }: {
  chapter: HistoryChapter
  chapterIndex: number
  milestoneCount: number
}) {
  const c = chapter.color
  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl px-8 py-12 md:py-16 text-center"
      style={{
        background: `linear-gradient(135deg, ${c}22, ${c}44)`,
        border: `1px solid ${c}66`,
      }}
    >
      {/* Floating robot silhouettes background */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="float-robot"
            style={{
              position: 'absolute',
              left: `${(i * 17 + 7) % 100}%`,
              top: `${(i * 23 + 11) % 80}%`,
              fontSize: 40 + (i % 3) * 12,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            🤖
          </span>
        ))}
      </div>

      <p className="text-[10px] font-bold tracking-[4px] uppercase text-zinc-400 mb-2">
        Chapter {chapterIndex + 1}
      </p>
      <span className="text-5xl">{chapter.emoji}</span>
      <h2 className="mt-3 text-3xl md:text-5xl font-black text-white">{chapter.title}</h2>
      <p className="mt-2 text-lg text-zinc-300">{chapter.subtitle}</p>
      <p className="mt-3 text-sm font-bold tracking-wider" style={{ color: c }}>{chapter.years}</p>

      {chapter.openingQuote && (
        <p className="mt-5 max-w-xl mx-auto text-base md:text-lg italic text-zinc-100 leading-relaxed">
          &ldquo;{chapter.openingQuote}&rdquo;
        </p>
      )}
      <p className="mt-4 max-w-3xl mx-auto text-sm text-zinc-300 leading-relaxed">
        {chapter.chapterIntro}
      </p>
      <p className="mt-4 text-xs text-zinc-400">
        {milestoneCount} milestones
      </p>
    </div>
  )
}

function MilestoneCard({ milestone: m, index, color, birthYear }: {
  milestone: HistoryMilestone
  index: number
  color: string
  birthYear: number | null
}) {
  const inLifetime = birthYear !== null && m.year >= birthYear
  const isLeft = index % 2 === 0
  // Mobile: always single column. Desktop: alternate.

  return (
    <li
      id={`${m.year}-${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`}
      className={`rounded-2xl border bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 md:p-6 ${inLifetime ? 'border-l-4' : 'border'}`}
      style={{
        borderColor: inLifetime ? '#fbbf24' : 'rgba(255,255,255,0.1)',
        borderLeftColor: inLifetime ? '#fbbf24' : undefined,
      }}
    >
      <div className={`md:flex gap-6 ${isLeft ? '' : 'md:flex-row-reverse'}`}>
        {/* Year + image */}
        <div className="md:w-44 md:flex-shrink-0">
          <div className="flex items-center gap-3 md:flex-col md:items-start">
            <div
              className="font-black text-3xl md:text-5xl tracking-tight"
              style={{ color }}
            >{m.year}</div>
            {inLifetime && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-full px-2 py-0.5">
                In your lifetime →
              </span>
            )}
          </div>
          {(m.milestoneImage || m.imageUrl) && (
            <img
              src={m.milestoneImage ?? m.imageUrl}
              alt={m.title}
              loading="lazy"
              className="mt-3 rounded-xl border border-white/10 w-full h-32 md:h-40 object-cover"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 mt-3 md:mt-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{m.emoji}</span>
            <h3 className="text-lg md:text-xl font-black text-white">{m.title}</h3>
            {m.isKeyMilestone && (
              <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-500 text-black px-1.5 py-0.5 rounded">Key</span>
            )}
          </div>

          <p className="text-amber-300 font-bold text-base leading-snug mb-3">{m.hookLine}</p>

          {/* Inline YouTube — above the story so people see it */}
          {m.youtubeId && (
            <div className="mb-3 aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${m.youtubeId}?rel=0&modestbranding=1`}
                title={`Video: ${m.title}`}
                loading="lazy"
                className="w-full h-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <span className="sr-only">📹 Watch: {m.title}</span>
            </div>
          )}

          {m.keyFact && (
            <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300">⚡ Key fact</p>
              <p className="mt-1 text-sm text-amber-100 font-semibold">{m.keyFact}</p>
            </div>
          )}

          <p className="text-zinc-200 text-sm leading-relaxed">{m.story}</p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg bg-black/30 border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">The person behind it</p>
              <p className="mt-1 text-xs text-zinc-200 leading-relaxed">{m.personBehind}</p>
            </div>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">It almost didn\'t happen</p>
              <p className="mt-1 text-xs text-zinc-200 italic leading-relaxed">{m.almostFailed}</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Why it matters today</p>
            <p className="mt-1 text-xs text-zinc-100">{m.whyItMattered}</p>
          </div>

          {m.indiaConnection && (
            <div className="mt-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-emerald-500/10 border border-amber-400/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">🇮🇳 India connection</p>
              <p className="mt-1 text-xs text-zinc-100">{m.indiaConnection}</p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            {m.robotSlug && (
              <Link href={`/robots/${m.robotSlug}`} className="rounded-full bg-white/[0.05] border border-white/15 text-zinc-200 px-2.5 py-1 hover:border-amber-400/40">
                🤖 See {m.robotSlug} →
              </Link>
            )}
            {m.atlasSlug && (
              <Link href={`/atlas/concept/${m.atlasSlug}`} className="rounded-full bg-white/[0.05] border border-white/15 text-zinc-200 px-2.5 py-1 hover:border-amber-400/40">
                📚 Concept: {m.atlasSlug} →
              </Link>
            )}
          </div>

          <p className="mt-3 text-xs text-zinc-400 italic">→ {m.ledTo}</p>
        </div>
      </div>
    </li>
  )
}

function FutureSection() {
  const [userPrediction, setUserPrediction] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('r2bot_history_predictions')
      if (raw) setSubmitted(JSON.parse(raw))
    } catch {}
  }, [])

  const submit = () => {
    if (!userPrediction.trim()) return
    const next = [...submitted, userPrediction.trim()].slice(-10)
    setSubmitted(next)
    localStorage.setItem('r2bot_history_predictions', JSON.stringify(next))
    setUserPrediction('')
  }

  return (
    <section id="future" className="px-4 py-16 border-t border-white/10 bg-gradient-to-b from-purple-900/15 to-transparent">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <span className="text-5xl">🚀</span>
          <p className="mt-2 text-xs tracking-[3px] uppercase font-bold text-purple-300">2025 – 2050</p>
          <h2 className="mt-2 text-3xl md:text-5xl font-black text-white">What\'s Coming</h2>
          <p className="mt-3 text-lg text-zinc-300 max-w-2xl mx-auto">Predictions sourced from IFR, industry decks and researcher commentary.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FUTURE_PREDICTIONS.map(p => (
            <div key={p.year} className="rounded-2xl border border-purple-400/30 bg-purple-500/5 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-2xl font-black text-purple-200">{p.year}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">probability</span>
              </div>
              <h3 className="text-lg font-bold text-white">{p.title}</h3>
              <p className="mt-2 text-sm text-zinc-200">{p.description}</p>
              <div className="mt-3 h-2 bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${p.probability}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-purple-300 font-mono text-right">{p.probability}%</p>
              <div className="mt-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2">
                <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">🇮🇳 India angle</p>
                <p className="mt-1 text-xs text-zinc-200">{p.indiaAngle}</p>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500">Source: {p.source}</p>
            </div>
          ))}
        </div>

        {/* Community prediction */}
        <div className="mt-10 rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5">
          <p className="text-xs uppercase tracking-wider font-bold text-amber-300">Add your prediction</p>
          <p className="text-sm text-zinc-300 mt-1">What will happen with robots by 2030? Your prediction is saved locally.</p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={userPrediction}
              onChange={e => setUserPrediction(e.target.value)}
              placeholder="By 2030, …"
              className="flex-1 bg-black/40 border border-white/15 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-400"
            />
            <button onClick={submit} className="rounded-xl bg-amber-500 text-black px-4 font-bold">Save →</button>
          </div>
          {submitted.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {submitted.slice().reverse().map((p, i) => (
                <li key={i} className="text-xs text-zinc-200 bg-black/30 rounded-lg px-3 py-2 border border-white/10">💭 {p}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
