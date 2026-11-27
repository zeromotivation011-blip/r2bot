// app/kids/teach/unplugged/printables.tsx — the printable kits of the
// unplugged lessons (roadmap #85), as server components: command cards to cut
// out, the human-robot floor-grid map, sense–think–act sorting cards and the
// paper-gear template. Everything is plain HTML/SVG so it prints from any
// browser ("Save as PDF" included) and costs no JavaScript.
//
// .print-keep keeps the card colours when printing (see ../layout.tsx).

import type { CSSProperties } from 'react'
import { CARDS, GROUP_STYLE, type CardId } from '@/lib/kids/unplugged/cards'
import type { FloorMission } from '@/lib/kids/unplugged/grid'
import type { SortItem } from '@/lib/kids/unplugged/lessons'

type Vars = CSSProperties & Record<'--pk-bg' | '--pk-border', string>

export function CommandCardSheet({ cards, copies = 2 }: { cards: CardId[]; copies?: number }) {
  const list = cards.flatMap((id) => Array.from({ length: copies }, (_, i) => ({ id, i })))
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4" aria-label="Command cards to cut out">
      {list.map(({ id, i }) => {
        const card = CARDS[id]
        const g = GROUP_STYLE[card.group]
        const style: Vars = { '--pk-bg': g.bg, '--pk-border': g.border, backgroundColor: g.bg, borderColor: g.border }
        return (
          <li
            key={`${id}-${i}`}
            className="print-keep flex min-h-[132px] flex-col items-center justify-center rounded-2xl border-[3px] border-dashed p-3 text-center text-[#111C32] break-inside-avoid"
            style={style}
            aria-hidden={i > 0 ? true : undefined}
          >
            <span className="text-4xl leading-none" aria-hidden>{card.icon}</span>
            <span className="mt-2 font-display text-lg font-bold leading-tight">{card.label}</span>
            {card.container && <span className="mt-1 text-xs font-semibold">Put cards inside a loop of string</span>}
            {(id === 'wait' || id === 'repeat') && <span className="mt-1 text-xs font-semibold">Number: ____</span>}
            {id === 'say' && <span className="mt-1 text-xs font-semibold">Words: ____________</span>}
            <span className="sr-only">: {card.does}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function CardMeanings({ cards }: { cards: CardId[] }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {cards.map((id) => (
        <div key={id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <dt className="font-bold text-white"><span aria-hidden>{CARDS[id].icon} </span>{CARDS[id].label}</dt>
          <dd className="mt-0.5 text-[15px] leading-relaxed text-slate-300">{CARDS[id].does}</dd>
        </div>
      ))}
    </dl>
  )
}

const CELL: Record<string, { label: string; icon: string; bg: string }> = {
  '.': { label: 'floor', icon: '', bg: '#FFFFFF' },
  '#': { label: 'blocked', icon: '🪑', bg: '#CFD6E2' },
  S: { label: 'start', icon: '🤖', bg: '#FFE7D6' },
  G: { label: 'goal', icon: '⭐', bg: '#FFF3B0' },
  L: { label: 'light to scoop', icon: '🏮', bg: '#FFF8E1' },
  '+': { label: 'draw here', icon: '·', bg: '#E8F5E9' },
  '~': { label: 'ice', icon: '🧊', bg: '#D6F1FF' },
  D: { label: 'dark', icon: '🌑', bg: '#3A4459' },
  P: { label: 'people cross', icon: '🚶', bg: '#FDE2F3' },
  W: { label: 'lift bridge', icon: '🌉', bg: '#E0F7FA' },
}

const ARROW: Record<FloorMission['heading'], string> = { up: '↑', right: '→', down: '↓', left: '←' }

export function FloorGridMap({ mission, caption }: { mission: FloorMission; caption?: string }) {
  const cols = mission.rows[0].length
  const used = new Set(mission.rows.join('').split(''))
  return (
    <figure className="break-inside-avoid">
      <div
        className="print-keep mx-auto grid w-full max-w-[420px] gap-1 rounded-2xl border-4 border-[#111C32] bg-[#111C32] p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, '--pk-bg': '#111C32', '--pk-border': '#111C32' } as Vars}
        role="img"
        aria-label={`Floor grid, ${cols} squares wide and ${mission.rows.length} squares tall. The robot starts facing ${mission.heading}.`}
      >
        {mission.rows.flatMap((row, r) =>
          row.split('').map((ch, c) => {
            const cell = CELL[ch] ?? CELL['.']
            const style: Vars = { '--pk-bg': cell.bg, '--pk-border': '#111C32', backgroundColor: cell.bg }
            return (
              <div key={`${r}-${c}`} className="print-keep relative grid aspect-square place-items-center rounded-md text-2xl sm:text-3xl" style={style}>
                <span aria-hidden>{ch === 'S' ? `${cell.icon}` : cell.icon}</span>
                {ch === 'S' && <span className="absolute bottom-0.5 right-1 text-lg font-black text-[#B4410A]" aria-hidden>{ARROW[mission.heading]}</span>}
              </div>
            )
          }),
        )}
      </div>
      <figcaption className="mt-2 text-center text-sm text-slate-300">
        {caption ?? mission.ask}
        <span className="mt-1 block">
          Key:{' '}
          {[...used].map((ch) => CELL[ch]).filter((x) => x && x.label !== 'floor').map((x) => `${x.icon} ${x.label}`).join(' · ')}
          {' · '}the arrow shows which way the robot faces at the start.
        </span>
      </figcaption>
    </figure>
  )
}

const HEAD: Record<SortItem['answer'], { label: string; icon: string; bg: string; border: string }> = {
  sense: { label: 'SENSE', icon: '👂', bg: '#E3F2FD', border: '#1E88E5' },
  think: { label: 'THINK', icon: '🧠', bg: '#FFF8E1', border: '#C28A00' },
  act: { label: 'ACT', icon: '✋', bg: '#FFE7D6', border: '#FC6818' },
}

export function SortingSheet({ prompt, items, showAnswers = false }: { prompt: string; items: SortItem[]; showAnswers?: boolean }) {
  return (
    <div className="break-inside-avoid">
      <p className="font-bold text-white">{prompt}</p>
      <ul className="mt-3 grid grid-cols-3 gap-3" aria-label="Header cards">
        {(['sense', 'think', 'act'] as const).map((k) => {
          const h = HEAD[k]
          return (
            <li key={k} className="print-keep grid min-h-[96px] place-items-center rounded-2xl border-[3px] border-solid p-2 text-center text-[#111C32]" style={{ '--pk-bg': h.bg, '--pk-border': h.border, backgroundColor: h.bg, borderColor: h.border } as Vars}>
              <span className="text-3xl" aria-hidden>{h.icon}</span>
              <span className="font-display text-xl font-black">{h.label}</span>
            </li>
          )
        })}
      </ul>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Picture cards to sort">
        {items.map((it) => (
          <li key={it.text} className="print-keep flex min-h-[96px] flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-[#6E7888] bg-white p-2 text-center text-[#111C32]" style={{ '--pk-bg': '#FFFFFF', '--pk-border': '#6E7888' } as Vars}>
            <span className="text-3xl" aria-hidden>{it.icon}</span>
            <span className="mt-1 text-[15px] font-bold leading-snug">{it.text}</span>
            {showAnswers && <span className="mt-1 text-xs font-black uppercase text-[#B4410A]">{it.answer}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A spur gear outline (module m mm, z teeth), centred at 0,0, as an SVG path. */
function gearPath(z: number, m: number): string {
  const rp = (m * z) / 2
  const ra = rp + m
  const rf = rp - 1.25 * m
  const pts: string[] = []
  for (let i = 0; i < z; i++) {
    const a = (i / z) * Math.PI * 2
    const step = (Math.PI * 2) / z
    const seq: [number, number][] = [
      [rf, a],
      [rf, a + step * 0.12],
      [ra, a + step * 0.3],
      [ra, a + step * 0.5],
      [rf, a + step * 0.68],
    ]
    for (const [r, t] of seq) pts.push(`${(r * Math.cos(t)).toFixed(2)},${(r * Math.sin(t)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

const GEARS = [
  { z: 8, name: 'Small gear (the motor)', fill: '#FFE7D6' },
  { z: 16, name: 'Middle gear', fill: '#E0F7FA' },
  { z: 24, name: 'Big gear (the wheel)', fill: '#E8F5E9' },
]

/** Printable paper gears at true size in millimetres (module 4 mm: they mesh). */
export function PaperGears() {
  const m = 4
  return (
    <figure className="break-inside-avoid">
      <div className="print-keep rounded-2xl bg-white p-3" style={{ '--pk-bg': '#FFFFFF', '--pk-border': '#FFFFFF' } as Vars}>
        <svg viewBox="0 0 180 120" width="100%" style={{ maxWidth: '180mm' }} role="img" aria-label="Three paper gears to cut out: 8, 16 and 24 teeth">
          {GEARS.map((g, i) => {
            const cx = [28, 38, 127][i]
            const cy = [22, 78, 60][i]
            return (
              <g key={g.z} transform={`translate(${cx} ${cy})`}>
                <path d={gearPath(g.z, m)} fill={g.fill} stroke="#111C32" strokeWidth="0.5" />
                <circle r="2.2" fill="#fff" stroke="#111C32" strokeWidth="0.5" />
                <circle r="0.6" fill="#111C32" />
                <text y={(m * g.z) / 2 - 7} textAnchor="middle" fontSize="4" fontWeight="700" fill="#111C32">{g.z} teeth</text>
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="mt-2 text-sm text-slate-300">
        Print at 100% (not “fit to page”) on card. Cut round the teeth, push a pencil through each centre dot, and pin the gears to
        a piece of cardboard so the teeth touch. The small gear turns three times for every one turn of the big gear.
      </figcaption>
    </figure>
  )
}
