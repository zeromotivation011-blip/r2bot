'use client'

// components/kids/sim/PictureProgramClient.tsx
// The tap-only block editor for young children (Level 1). A program is a
// column of big picture blocks under "When I press Go". Tap a block in the
// palette and it goes in at the glowing ＋ (the cursor); Repeat, "Keep going
// until…" and "If…" open a slot inside them. Every control is a ≥48 px button,
// so switch and keyboard access work everywhere; nothing is dragged.

import { Fragment } from 'react'
import { newUid, paletteByKey, paramsOf, type PaletteBlock, type PicNode } from '@/lib/kids/sim/challenge'

/** Where the next block goes: in `parent` (null = the top level), before position `index`. */
export interface Cursor {
  parent: string | null
  index: number
}

interface Props {
  palette: PaletteBlock[]
  nodes: PicNode[]
  cursor: Cursor
  onChange: (nodes: PicNode[], cursor: Cursor) => void
  /** Palette keys the robot cannot use yet (its part is missing). */
  locked: Set<string>
  /** uid of the block that is running (lit up). */
  activeUid: string | null
  disabled: boolean
}

// ── Tree helpers (pure) ─────────────────────────────────────────────────────

function listOf(nodes: PicNode[], parent: string | null): PicNode[] | null {
  if (parent === null) return nodes
  for (const n of nodes) {
    if (n.uid === parent) return n.children ?? null
    if (n.children) {
      const l = listOf(n.children, parent)
      if (l) return l
    }
  }
  return null
}

function mapTree(nodes: PicNode[], f: (list: PicNode[], parent: string | null) => PicNode[], parent: string | null = null): PicNode[] {
  const mapped = f(nodes, parent)
  return mapped.map((n) => (n.children ? { ...n, children: mapTree(n.children, f, n.uid) } : n))
}

export function insertAt(nodes: PicNode[], cursor: Cursor, node: PicNode): PicNode[] {
  return mapTree(nodes, (list, parent) => (parent === cursor.parent ? [...list.slice(0, cursor.index), node, ...list.slice(cursor.index)] : list))
}

function removeNode(nodes: PicNode[], uid: string): PicNode[] {
  return mapTree(nodes, (list) => list.filter((n) => n.uid !== uid))
}

function setChoice(nodes: PicNode[], uid: string, choice: number | string): PicNode[] {
  return mapTree(nodes, (list) => list.map((n) => (n.uid === uid ? { ...n, choice } : n)))
}

function move(nodes: PicNode[], uid: string, dir: -1 | 1): PicNode[] {
  return mapTree(nodes, (list) => {
    const i = list.findIndex((n) => n.uid === uid)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return list
    const out = list.slice()
    ;[out[i], out[j]] = [out[j], out[i]]
    return out
  })
}

/** Parent uid and index of a node. */
function locate(nodes: PicNode[], uid: string, parent: string | null = null): Cursor | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].uid === uid) return { parent, index: i }
    const c = nodes[i].children
    if (c) {
      const l = locate(c, uid, nodes[i].uid)
      if (l) return l
    }
  }
  return null
}

/** Fresh uids for a program (e.g. a reference loaded with "Show me"). */
export function cloneNodes(nodes: PicNode[]): PicNode[] {
  return nodes.map((n) => ({ ...n, uid: newUid(), ...(n.children ? { children: cloneNodes(n.children) } : {}) }))
}

function chipText(param: string, v: number | string): string {
  if (param === 'seconds') return `${v} s`
  if (param === 'n') return `${v}×`
  return String(v)
}

/** What a block does, in words a child hears: "Hop forward 2". */
export function describeNode(b: PaletteBlock, n: PicNode): string {
  if (!b.choice) return b.label
  const v = paramsOf(b, n)[b.choice.param]
  if (b.op === 'say') return `Say “${v}”`
  if (b.choice.param === 'n') return `${b.label} ${v} times`
  if (b.choice.param === 'seconds') return `${b.label} ${v}`
  return `${b.label} ${v}`
}

// ── Component ─────────────────────────────────────────────────────────────

export default function PictureProgramClient({ palette, nodes, cursor, onChange, locked, activeUid, disabled }: Props) {
  const pal = paletteByKey(palette)

  const add = (b: PaletteBlock) => {
    const node: PicNode = { uid: newUid(), key: b.key, ...(b.choice ? { choice: b.choice.values[0] } : {}), ...(b.container ? { children: [] } : {}) }
    const next = insertAt(nodes, cursor, node)
    // A Repeat opens: the next block goes inside it. Otherwise, after the new block.
    onChange(next, b.container ? { parent: node.uid, index: 0 } : { parent: cursor.parent, index: cursor.index + 1 })
  }

  const slot = (parent: string | null, index: number, depth: number) => {
    const on = cursor.parent === parent && cursor.index === index
    return (
      <button
        type="button"
        key={`slot-${parent ?? 'top'}-${index}`}
        onClick={() => onChange(nodes, { parent, index })}
        disabled={disabled}
        aria-label={on ? 'New blocks go here' : 'Put new blocks here'}
        aria-pressed={on}
        data-testid={on ? 'cursor-slot' : undefined}
        className={`group flex w-full items-center rounded-xl transition-[height,background] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
          on ? 'h-11 border-2 border-dashed border-amber-400 bg-amber-400/10' : 'h-5 hover:h-9 hover:bg-white/5'
        } ${depth > 0 ? '' : ''}`}
      >
        <span className={`mx-auto text-xs font-black ${on ? 'text-amber-300' : 'text-transparent group-hover:text-slate-400'}`}>{on ? '＋ new blocks go here' : '＋'}</span>
      </button>
    )
  }

  const list = (items: PicNode[], parent: string | null, depth: number): React.ReactNode => (
    <div className="flex flex-col">
      {slot(parent, 0, depth)}
      {items.map((n, i) => {
        const b = pal.get(n.key)
        if (!b) return null
        const active = activeUid === n.uid
        const isLocked = locked.has(b.key)
        return (
          <Fragment key={n.uid}>
            <div
              data-testid="program-block"
              data-key={b.key}
              className={`rounded-2xl border px-2 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,.35)] transition-colors ${
                active
                  ? 'border-amber-300 bg-amber-400/25 ring-4 ring-amber-400/40'
                  : isLocked
                    ? 'border-rose-400/50 bg-rose-500/10'
                    : b.container
                      ? 'border-cyan-400/30 bg-cyan-400/[0.07]'
                      : 'border-white/15 bg-[#19263F]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25 text-xl" aria-hidden>
                  {b.icon}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-slate-50">
                  {b.op === 'say' ? 'Say' : b.label}
                  {isLocked && <span className="ml-1 text-xs font-black text-rose-200">🔒 needs a part</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onChange(move(nodes, n.uid, -1), cursor)}
                    disabled={disabled || i === 0}
                    aria-label={`Move “${describeNode(b, n)}” up`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M10 4l-6 7h4v5h4v-5h4z" fill="currentColor" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const here = locate(nodes, n.uid)
                      const next = removeNode(nodes, n.uid)
                      // Keep the cursor valid: inside a removed block → where the block was.
                      let c = cursor
                      if (c.parent === n.uid || (c.parent !== null && !listOf(next, c.parent))) c = here ?? { parent: null, index: 0 }
                      else if (here && c.parent === here.parent && c.index > here.index) c = { ...c, index: c.index - 1 }
                      onChange(next, c)
                    }}
                    disabled={disabled}
                    aria-label={`Remove “${describeNode(b, n)}”`}
                    data-testid="remove-block"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-rose-500/20 hover:text-rose-100 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </button>
                </span>
              </div>
              {b.choice && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[46px]" role="group" aria-label={`${b.label}: choose`}>
                  {b.choice.values.map((v) => {
                    const on = paramsOf(b, n)[b.choice!.param] === v
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => onChange(setChoice(nodes, n.uid, v), cursor)}
                        disabled={disabled}
                        aria-pressed={on}
                        className={`min-h-[44px] min-w-[48px] rounded-xl px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                          on ? 'bg-amber-400 text-[#1A1103]' : 'bg-white/[0.07] text-slate-200 hover:bg-white/15'
                        }`}
                      >
                        {chipText(b.choice!.param, v)}
                      </button>
                    )
                  })}
                </div>
              )}
              {b.container && (
                <div className="mt-1.5 rounded-xl border-l-4 border-cyan-400/50 bg-black/20 py-1 pl-2 pr-1">
                  {list(n.children ?? [], n.uid, depth + 1)}
                  {(n.children ?? []).length === 0 && b.op !== 'repeat_until' && <p className="px-1 pb-1 text-xs font-bold text-slate-400">Tap blocks to put them inside.</p>}
                  {(n.children ?? []).length === 0 && b.op === 'repeat_until' && <p className="px-1 pb-1 text-xs font-bold text-slate-400">Empty = wait right here until it happens.</p>}
                </div>
              )}
            </div>
            {slot(parent, i + 1, depth)}
          </Fragment>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Palette: only the blocks this mission allows. */}
      <div role="group" aria-label="Blocks you can use" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {palette.map((b) => {
          const isLocked = locked.has(b.key)
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => add(b)}
              disabled={disabled}
              data-testid={`palette-${b.key}`}
              className={`flex min-h-[56px] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left shadow-[0_4px_12px_rgba(0,0,0,.35)] transition-transform active:scale-[.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                isLocked ? 'border-rose-400/40 bg-rose-500/10' : b.container ? 'border-cyan-400/40 bg-cyan-400/10 hover:bg-cyan-400/20' : 'border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] hover:border-white/30'
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {b.icon}
              </span>
              <span className="text-sm font-black leading-tight text-slate-50">
                {b.op === 'say' ? 'Say…' : b.label}
                {isLocked && <span className="block text-[11px] text-rose-200">🔒 fit the part</span>}
              </span>
            </button>
          )
        })}
      </div>

      {/* The program. */}
      <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-2.5" data-testid="picture-program">
        <p className="flex items-center gap-2 px-1 pb-1 text-sm font-black text-amber-300">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-[#1A1103]" aria-hidden>
            ▶
          </span>
          When I press Go
        </p>
        {list(nodes, null, 0)}
        {nodes.length === 0 && <p className="px-2 pb-1 text-sm font-bold text-slate-400">Tap a block above to start your program.</p>}
      </div>
    </div>
  )
}
