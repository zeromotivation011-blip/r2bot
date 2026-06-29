'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface LiteRobot {
  slug: string
  name: string
  maker: string
  country: string
  countryFlag: string
  year: number
  type: string
  status: string
  emoji: string
  hookLine: string
  statChips: { icon: string; text: string }[]
}

export default function CompareClient({ robots }: { robots: LiteRobot[] }) {
  const sp = useSearchParams()
  const initA = sp?.get('a') ?? 'spot'
  const initB = sp?.get('b') ?? 'roomba'

  const find = (s: string) => robots.find(r => r.slug === s) ?? robots[0]
  const [a, setA] = useState<LiteRobot>(() => find(initA))
  const [b, setB] = useState<LiteRobot>(() => find(initB))

  // Reflect into URL when picks change.
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('a', a.slug)
    url.searchParams.set('b', b.slug)
    window.history.replaceState({}, '', url.toString())
  }, [a, b])

  const insight = useMemo(() => generateInsight(a, b), [a, b])

  const shareText = `Compare ${a.name} vs ${b.name} — ${insight} · r2bot.in/robots/compare?a=${a.slug}&b=${b.slug}`

  return (
    <main className="min-h-screen bg-[#050810] text-white pt-24 pb-16 px-4">
      <div className="mx-auto max-w-5xl">
        <Link href="/robots" className="text-amber-300 text-sm hover:underline">← All robots</Link>
        <h1 className="mt-3 text-3xl md:text-4xl font-black">⚖️ Robot vs Robot</h1>
        <p className="mt-2 text-zinc-400">Side-by-side compare any two famous robots from the Hall of Fame.</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Picker label="Robot A" color="blue" value={a} onChange={setA} options={robots} />
          <Picker label="Robot B" color="pink" value={b} onChange={setB} options={robots} />
        </div>

        {/* Comparison table */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.05]">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-zinc-400">Metric</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-300">{a.emoji} {a.name}</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-pink-300">{b.emoji} {b.name}</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Year"        a={String(a.year)} b={String(b.year)} highlightOlder={a.year < b.year ? 'a' : a.year > b.year ? 'b' : null} />
              <Row label="Maker"       a={a.maker}        b={b.maker} />
              <Row label="Country"     a={`${a.countryFlag} ${a.country}`} b={`${b.countryFlag} ${b.country}`} />
              <Row label="Category"    a={a.type}         b={b.type} />
              <Row label="Status"      a={a.status}       b={b.status} />
              <Row label="Top stat 1"  a={a.statChips[0]?.text ?? '—'} b={b.statChips[0]?.text ?? '—'} />
              <Row label="Top stat 2"  a={a.statChips[1]?.text ?? '—'} b={b.statChips[1]?.text ?? '—'} />
              <Row label="Top stat 3"  a={a.statChips[2]?.text ?? '—'} b={b.statChips[2]?.text ?? '—'} />
              <tr className="border-t border-white/10">
                <td className="px-4 py-3 text-zinc-400">Hook line</td>
                <td className="px-4 py-3 text-amber-300 italic">{a.hookLine}</td>
                <td className="px-4 py-3 text-amber-300 italic">{b.hookLine}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Insight */}
        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">R2BOT insight</p>
          <p className="mt-2 text-base leading-relaxed text-zinc-100">{insight}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/robots/${a.slug}`} className="rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-200 px-4 py-2 text-sm font-bold">Open {a.name} →</Link>
          <Link href={`/robots/${b.slug}`} className="rounded-xl bg-pink-500/20 border border-pink-400/40 text-pink-200 px-4 py-2 text-sm font-bold">Open {b.name} →</Link>
          <button
            onClick={() => navigator.clipboard?.writeText(shareText)}
            className="rounded-xl bg-amber-500 text-black px-4 py-2 text-sm font-bold"
          >📋 Copy share text</button>
        </div>
      </div>
    </main>
  )
}

function Picker({ label, color, value, onChange, options }: {
  label: string
  color: 'blue' | 'pink'
  value: LiteRobot
  onChange: (r: LiteRobot) => void
  options: LiteRobot[]
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() =>
    options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12),
    [q, options]
  )

  const colorClass = color === 'blue'
    ? 'border-blue-500/40 text-blue-300'
    : 'border-pink-500/40 text-pink-300'

  return (
    <div>
      <p className={`text-xs uppercase tracking-widest font-bold mb-1 ${colorClass.split(' ')[1]}`}>{label}</p>
      <div className={`rounded-xl border bg-white/[0.04] ${colorClass.split(' ')[0]} p-3`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{value.emoji}</span>
          <div className="flex-1">
            <p className="font-bold text-white">{value.name}</p>
            <p className="text-xs text-zinc-400">{value.maker} · {value.year}</p>
          </div>
        </div>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Switch to…"
          className="mt-2 w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-amber-400"
        />
        {q && (
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/60">
            {filtered.map(o => (
              <li key={o.slug}>
                <button
                  onClick={() => { onChange(o); setQ('') }}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.06] text-sm text-zinc-200 flex items-center gap-2"
                >
                  <span>{o.emoji}</span> <span>{o.name}</span>
                  <span className="ml-auto text-xs text-zinc-500">{o.year}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-2 text-xs text-zinc-500">No matches</li>}
          </ul>
        )}
      </div>
    </div>
  )
}

function Row({ label, a, b, highlightOlder }: { label: string; a: string; b: string; highlightOlder?: 'a' | 'b' | null }) {
  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3 text-zinc-400">{label}</td>
      <td className={`px-4 py-3 ${highlightOlder === 'a' ? 'text-amber-300 font-bold' : 'text-zinc-100'}`}>{a}</td>
      <td className={`px-4 py-3 ${highlightOlder === 'b' ? 'text-amber-300 font-bold' : 'text-zinc-100'}`}>{b}</td>
    </tr>
  )
}

function generateInsight(a: LiteRobot, b: LiteRobot): string {
  const diff = Math.abs(a.year - b.year)
  const older = a.year < b.year ? a : b
  const newer = a.year < b.year ? b : a
  const sameType = a.type === b.type
  const indianA = a.country === 'India'
  const indianB = b.country === 'India'

  const parts: string[] = []
  parts.push(`${older.name} is ${diff} year${diff === 1 ? '' : 's'} older than ${newer.name}.`)
  if (sameType) parts.push(`Both are ${a.type} robots — direct competitors.`)
  else parts.push(`${a.name} was built for ${a.type} use while ${b.name} targets ${b.type}.`)

  if (indianA && indianB) {
    parts.push(`Both are Indian — a rare matchup in the Hall of Fame.`)
  } else if (indianA || indianB) {
    const indianOne = indianA ? a : b
    const other = indianA ? b : a
    parts.push(`India connection: ${indianOne.name} is the Indian player here — and ${other.name} is a useful benchmark for what indigenous robotics could look like.`)
  } else {
    parts.push(`Neither is Indian — both serve as reference points for what India-built equivalents could become.`)
  }
  return parts.join(' ')
}
