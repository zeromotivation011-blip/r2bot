'use client'

// components/kids/codelab/BlockEditorClient.tsx
// Mobile-first block editor. Tap a palette block to add it:
//   • nothing selected      → added at the end of the program
//   • a container selected  → added inside it (then / else branch)
//   • a block selected      → added right after it
// Tap a placed block to select it, then move it up/down, delete it, or change
// its number / colour / phrase. Keyboard: Tab to a block, Enter selects,
// Delete removes, Alt+↑/↓ moves.

import { useState } from 'react'
import Link from 'next/link'
import type { Capability } from '@/lib/kids/robot-design'
import { CAPABILITY_NEEDS } from '@/lib/kids/robot-design'
import { BLOCK_INFO, BLOCK_NEEDS, COLOR_HEX, SAY_PHRASES, TILE_COLORS, blockText, countBlocks, createBlock } from '@/lib/kids/code-lab/blocks'
import { findBlock, findLoc, insertBlock, moveBlock, patchBlock, removeBlock, type Branch } from '@/lib/kids/code-lab/tree'
import { hasElse, isContainer, type Block, type BlockType } from '@/lib/kids/code-lab/types'
import { playSound } from '@/lib/kids-audio'

export interface Selection {
  id: string
  branch: Branch
}

interface Props {
  program: Block[]
  onChange: (p: Block[]) => void
  palette: BlockType[]
  caps: Set<Capability>
  budget: number
  activeId: string | null
  errorId: string | null
  disabled: boolean
}

export default function BlockEditorClient({ program, onChange, palette, caps, budget, activeId, errorId, disabled }: Props) {
  const [sel, setSel] = useState<Selection | null>(null)
  const [lockedMsg, setLockedMsg] = useState<string | null>(null)
  const selected = sel ? findBlock(program, sel.id) : null
  const count = countBlocks(program)

  const add = (type: BlockType) => {
    const need = BLOCK_NEEDS[type]
    if (need && !caps.has(need)) {
      setLockedMsg(`“${BLOCK_INFO[type].label}” is locked. Your robot needs ${CAPABILITY_NEEDS[need]} — go to the Workshop to add it.`)
      playSound('wrong')
      return
    }
    setLockedMsg(null)
    playSound('click')
    const block = createBlock(type)
    let next: Block[]
    let nextSel: Selection | null = sel
    if (selected && isContainer(selected) && sel) {
      const list = sel.branch === 'else' && hasElse(selected) ? selected.elseBody : selected.body
      next = insertBlock(program, selected.id, sel.branch, list.length, block)
    } else if (selected && sel) {
      const loc = findLoc(program, selected.id)
      next = loc ? insertBlock(program, loc.parentId, loc.branch, loc.index + 1, block) : [...program, block]
      nextSel = { id: block.id, branch: 'body' }
    } else {
      next = [...program, block]
      nextSel = null
    }
    if (isContainer(block)) nextSel = { id: block.id, branch: 'body' }
    onChange(next)
    setSel(nextSel)
  }

  const del = (id: string) => {
    const loc = findLoc(program, id)
    onChange(removeBlock(program, id))
    playSound('click')
    // Select the parent container (if any) so the child can keep editing there.
    setSel(loc?.parentId ? { id: loc.parentId, branch: loc.branch } : null)
  }

  const move = (id: string, d: -1 | 1) => onChange(moveBlock(program, id, d))
  const patch = (id: string, fn: (b: Block) => Block) => onChange(patchBlock(program, id, fn))

  const onBlockKey = (e: React.KeyboardEvent, b: Block) => {
    if (disabled) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      del(b.id)
    } else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault()
      move(b.id, -1)
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      move(b.id, 1)
    } else if (e.key === 'Escape') {
      setSel(null)
    }
  }

  const renderList = (list: Block[], parentId: string | null, branch: Branch, depth: number): React.ReactNode => (
    <ol className={depth === 0 ? 'space-y-2' : 'space-y-2 border-l-4 border-white/20 pl-3'}>
      {list.map((b) => (
        <li key={b.id}>{renderBlock(b, depth)}</li>
      ))}
      {parentId && list.length === 0 && (
        <li>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSel({ id: parentId, branch })}
            className={`min-h-[44px] w-full rounded-xl border-2 border-dashed px-3 text-left text-sm font-bold ${
              sel?.id === parentId && sel.branch === branch ? 'border-amber-400 bg-amber-400/10 text-amber-200' : 'border-white/20 text-slate-300'
            }`}
          >
            + Tap here, then tap a block to put it inside
          </button>
        </li>
      )}
    </ol>
  )

  const renderBlock = (b: Block, depth: number) => {
    const info = BLOCK_INFO[b.type]
    const isSel = sel?.id === b.id
    const isActive = activeId === b.id
    const isErr = errorId === b.id
    const need = BLOCK_NEEDS[b.type]
    const missing = need ? !caps.has(need) : false
    const ring = isErr ? 'ring-4 ring-rose-400' : isActive ? 'ring-4 ring-white scale-[1.02]' : isSel ? 'ring-4 ring-amber-300' : ''
    return (
      <div>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={isSel}
          aria-current={isActive ? 'step' : undefined}
          onClick={() => setSel(isSel ? null : { id: b.id, branch: 'body' })}
          onKeyDown={(e) => onBlockKey(e, b)}
          className={`flex min-h-[48px] w-full items-center gap-2 rounded-xl px-3 text-left font-black shadow transition ${info.tone} ${ring} ${missing ? 'opacity-60' : ''} focus:outline-none focus-visible:ring-4 focus-visible:ring-white disabled:cursor-default`}
        >
          <span aria-hidden>{info.emoji}</span>
          <span className="flex-1">{blockText(b)}</span>
          {missing && <span aria-label="needs a part">🔒</span>}
          {b.type === 'ifColor' && <span className="h-5 w-5 rounded-full border-2 border-white" style={{ background: COLOR_HEX[b.color] }} aria-hidden />}
        </button>
        {isContainer(b) && (
          <div className="mt-2 pl-2">
            {renderList(b.body, b.id, 'body', depth + 1)}
            {hasElse(b) && (
              <>
                <p className="mt-2 text-sm font-black text-cyan-200">else (otherwise):</p>
                <div className="mt-1">{renderList(b.elseBody, b.id, 'else', depth + 1)}</div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const stepper = (b: Block & { n: number }, min: number, max: number) => (
    <div className="flex items-center gap-1" role="group" aria-label="How many">
      <button type="button" aria-label="Less" onClick={() => patch(b.id, (x) => ('n' in x ? { ...x, n: Math.max(min, x.n - 1) } : x))} className="h-11 w-11 rounded-xl bg-white/15 text-xl font-black">
        −
      </button>
      <span className="w-8 text-center text-xl font-black" aria-live="polite">
        {b.n}
      </span>
      <button type="button" aria-label="More" onClick={() => patch(b.id, (x) => ('n' in x ? { ...x, n: Math.min(max, x.n + 1) } : x))} className="h-11 w-11 rounded-xl bg-white/15 text-xl font-black">
        +
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Palette */}
      <div>
        <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-300">Blocks · tap to add</h3>
        <div className="flex flex-wrap gap-2">
          {palette.map((t) => {
            const info = BLOCK_INFO[t]
            const need = BLOCK_NEEDS[t]
            const locked = need ? !caps.has(need) : false
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => add(t)}
                aria-label={locked ? `${info.label} (locked — your robot needs ${need ? CAPABILITY_NEEDS[need] : 'a part'})` : `Add ${info.label}`}
                className={`flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-sm font-black shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-white ${
                  locked ? 'bg-slate-600 text-slate-300' : info.tone
                } disabled:opacity-50`}
              >
                <span aria-hidden>{locked ? '🔒' : info.emoji}</span> {info.label}
              </button>
            )
          })}
        </div>
        {lockedMsg && (
          <p role="alert" className="mt-2 rounded-xl bg-rose-500/15 p-3 text-sm font-bold text-rose-100">
            {lockedMsg}{' '}
            <Link href="/kids/workshop" className="underline">
              Open the Workshop
            </Link>
          </p>
        )}
      </div>

      {/* Selected-block toolbar: always the same height so the program never jumps. */}
      <div className="flex min-h-[60px] flex-wrap items-center gap-2 rounded-2xl bg-white/5 p-2" aria-label="Edit selected block">
        {selected && !disabled ? (
          <>
            <span className="px-1 text-sm font-black text-amber-200">{blockText(selected)}:</span>
            <button type="button" onClick={() => move(selected.id, -1)} aria-label="Move up" className="h-11 w-11 rounded-xl bg-white/15 font-black">
              ▲
            </button>
            <button type="button" onClick={() => move(selected.id, 1)} aria-label="Move down" className="h-11 w-11 rounded-xl bg-white/15 font-black">
              ▼
            </button>
            {(selected.type === 'forward' || selected.type === 'repeat') && stepper(selected, 1, selected.type === 'forward' ? 9 : 20)}
            {selected.type === 'ifColor' && (
              <div className="flex gap-1" role="group" aria-label="Colour">
                {TILE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    aria-pressed={selected.color === c}
                    onClick={() => patch(selected.id, (x) => (x.type === 'ifColor' ? { ...x, color: c } : x))}
                    className={`h-11 w-11 rounded-full border-4 ${selected.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: COLOR_HEX[c] }}
                  />
                ))}
              </div>
            )}
            {selected.type === 'say' && (
              <select
                aria-label="What should the robot say?"
                value={selected.text}
                onChange={(e) => patch(selected.id, (x) => (x.type === 'say' ? { ...x, text: e.target.value } : x))}
                className="min-h-[44px] rounded-xl bg-black/40 px-2 font-bold"
              >
                {SAY_PHRASES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
            {hasElse(selected) && sel && (
              <div className="flex gap-1" role="group" aria-label="Add new blocks into">
                {(['body', 'else'] as Branch[]).map((br) => (
                  <button
                    key={br}
                    type="button"
                    aria-pressed={sel.branch === br}
                    onClick={() => setSel({ id: selected.id, branch: br })}
                    className={`min-h-[44px] rounded-xl px-3 text-sm font-black ${sel.branch === br ? 'bg-amber-400 text-black' : 'bg-white/15'}`}
                  >
                    add to {br === 'body' ? 'IF' : 'ELSE'}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => del(selected.id)} className="min-h-[44px] rounded-xl bg-rose-700 px-3 text-sm font-black text-white">
              🗑 Delete
            </button>
            <button type="button" onClick={() => setSel(null)} className="min-h-[44px] rounded-xl bg-white/15 px-3 text-sm font-black">
              Done
            </button>
          </>
        ) : (
          <p className="px-1 text-sm text-slate-300">
            {disabled ? 'Running your program…' : 'Tap a block in your program to move it, change it or delete it.'}
          </p>
        )}
      </div>

      {/* Program */}
      <div className="min-h-[220px] rounded-2xl border-2 border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Your program</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-black ${count <= budget ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}>
            {count} / {budget} blocks for ⭐⭐⭐
          </span>
        </div>
        {program.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-white/20 p-4 text-center text-slate-300">Tap a block above to start.</p>
        ) : (
          renderList(program, null, 'body', 0)
        )}
        {program.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange([])
              setSel(null)
            }}
            className="mt-3 min-h-[44px] rounded-xl px-3 text-sm font-bold text-slate-300 underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
