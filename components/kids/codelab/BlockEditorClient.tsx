'use client'

// components/kids/codelab/BlockEditorClient.tsx
//
// Code Lab's block editor, in the ONE block language of R2BOT Kids (roadmap
// #21): the program is a real Blockly workspace — the same renderer (zelos),
// theme, colours, "▶ when Run is pressed" hat and serialization as the Physics
// Lab — holding the grid blocks of lib/kids/code-lab/blockly-defs.ts.
//
// Two ways in, one program:
//   • Blockly: drag blocks to reorder or nest them, tap a number / colour /
//     phrase to choose another (dropdowns only, never typing), drag to the bin.
//   • The big picture palette and the edit bar (HTML buttons, ≥ 48 px, Tab +
//     Enter, one switch): TAP a block to add it —
//        nothing selected      → added at the end of the program
//        a container selected  → added inside it (IF or ELSE branch)
//        a block selected      → added right after it
//     then ◀ ▶ to pick a block, ▲ ▼ to move it, − + to change its number,
//     🗑 to delete it. Every action goes through the same Block tree
//     (lib/kids/code-lab/tree.ts) and back into the workspace, keeping any
//     loose blocks the child dragged aside.
// Explorers (5–7) get the blocks bigger (startScale) and bigger palette chips.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import * as Blockly from 'blockly/core'
import * as En from 'blockly/msg/en'
import type { Capability } from '@/lib/kids/robot-design'
import { CAPABILITY_NEEDS } from '@/lib/kids/robot-design'
import type { BandId } from '@/lib/kids/bands'
import { BLOCK_INFO, BLOCK_NEEDS, COLOR_HEX, SAY_PHRASES, TILE_COLORS, blockText, countBlocks, createBlock } from '@/lib/kids/code-lab/blocks'
import { GRID_BLOCK_DEFS } from '@/lib/kids/code-lab/blockly-defs'
import { FORWARD_MAX, FROM_GRID_TYPE, HAT_ID, REPEAT_MAX, programToWorkspace, withProgram, workspaceToProgram, type BWorkspace } from '@/lib/kids/code-lab/blockly-format'
import { findBlock, findLoc, insertBlock, moveBlock, patchBlock, removeBlock, type Branch } from '@/lib/kids/code-lab/tree'
import { hasElse, isContainer, type Block, type BlockType } from '@/lib/kids/code-lab/types'
import { defineBlocks, kidsTheme } from '@/components/kids/sim/blockly-blocks'
import { playSound } from '@/lib/kids-audio'

export interface Selection {
  id: string
  branch: Branch
}

interface Props {
  /** The workspace to show (a loaded draft, or an empty one). Reloaded when `resetKey` changes. */
  initialWorkspace: BWorkspace
  resetKey: string
  onChange: (program: Block[], workspace: BWorkspace) => void
  palette: BlockType[]
  caps: Set<Capability>
  budget: number
  band: BandId
  activeId: string | null
  errorId: string | null
  disabled: boolean
}

let gridDefined = false
function defineGridBlocks(): void {
  defineBlocks() // the shared set, including the "▶ when Run is pressed" hat
  if (gridDefined) return
  gridDefined = true
  Blockly.common.defineBlocksWithJsonArray(GRID_BLOCK_DEFS)
}

/** Every block in reading order (for ◀ ▶ selection with a keyboard or one switch). */
function flatten(list: Block[], out: Block[] = []): Block[] {
  for (const b of list) {
    out.push(b)
    if (isContainer(b)) {
      flatten(b.body, out)
      if (hasElse(b)) flatten(b.elseBody, out)
    }
  }
  return out
}

/** The program as indented words, for screen readers (the SVG canvas is not readable). */
function outline(list: Block[], depth = 0): string[] {
  const out: string[] = []
  for (const b of list) {
    out.push(`${'  '.repeat(depth)}${blockText(b)}`)
    if (isContainer(b)) {
      out.push(...outline(b.body, depth + 1))
      if (hasElse(b) && b.elseBody.length) {
        out.push(`${'  '.repeat(depth)}otherwise:`)
        out.push(...outline(b.elseBody, depth + 1))
      }
    }
  }
  return out
}

export default function BlockEditorClient({ initialWorkspace, resetKey, onChange, palette, caps, budget, band, activeId, errorId, disabled }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const ws = useRef<Blockly.WorkspaceSvg | null>(null)
  const loading = useRef(false)
  const [program, setProgram] = useState<Block[]>(() => workspaceToProgram(initialWorkspace))
  const programRef = useRef(program)
  const [sel, setSel] = useState<Selection | null>(null)
  const [lockedMsg, setLockedMsg] = useState<string | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const capsRef = useRef(caps)
  capsRef.current = caps
  const initialRef = useRef(initialWorkspace)
  initialRef.current = initialWorkspace
  const young = band === 'explorers'

  const selected = sel ? findBlock(program, sel.id) : null
  const count = countBlocks(program)
  const order = useMemo(() => flatten(program), [program])

  /** Padlock warnings on placed blocks the robot cannot use yet. */
  const refreshWarnings = useCallback(() => {
    const w = ws.current
    if (!w) return
    for (const b of w.getAllBlocks(false)) {
      const t = FROM_GRID_TYPE[b.type]
      const need = t ? BLOCK_NEEDS[t] : undefined
      b.setWarningText(need && !capsRef.current.has(need) ? `🔒 Your robot needs ${CAPABILITY_NEEDS[need]} for this block. Add it in the Workshop.` : null)
    }
  }, [])

  /** Read the workspace back into a program and tell the mission. */
  const emit = useCallback(() => {
    const w = ws.current
    if (!w) return
    const json = Blockly.serialization.workspaces.save(w) as BWorkspace
    const p = workspaceToProgram(json)
    programRef.current = p
    setProgram(p)
    setSel((s) => (s && !findBlock(p, s.id) ? null : s))
    refreshWarnings()
    onChangeRef.current(p, json)
  }, [refreshWarnings])

  const loadJson = useCallback(
    (json: BWorkspace) => {
      const w = ws.current
      if (!w) return
      loading.current = true
      Blockly.Events.disable()
      try {
        w.clear()
        Blockly.serialization.workspaces.load(json as object, w)
      } finally {
        Blockly.Events.enable()
        loading.current = false
      }
      refreshWarnings()
    },
    [refreshWarnings],
  )

  // Create the workspace once.
  useEffect(() => {
    if (!host.current) return
    defineGridBlocks()
    Blockly.setLocale(En as unknown as Record<string, string>)
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    const w = Blockly.inject(host.current, {
      theme: kidsTheme(),
      renderer: 'zelos',
      media: '/kids/lab/blockly-media/',
      sounds: false,
      trashcan: true,
      // Explorers: big blocks first (a 5-year-old's finger); everyone can pinch or use + / −.
      // Wheel/trackpad scrolls the PAGE (no scroll trap).
      zoom: { controls: true, wheel: false, pinch: true, startScale: young ? (coarse ? 1.15 : 1.25) : coarse ? 0.95 : 1, maxScale: 2, minScale: 0.5 },
      move: { scrollbars: true, drag: true, wheel: false },
      grid: { spacing: 24, length: 2, colour: '#1E2A44', snap: true },
    })
    ws.current = w
    w.addChangeListener(Blockly.Events.disableOrphans)
    w.addChangeListener((e: Blockly.Events.Abstract) => {
      if (loading.current) return
      if (e.type === Blockly.Events.SELECTED) {
        const id = (e as Blockly.Events.Selected).newElementId ?? null
        // Blockly drops its selection when focus leaves the canvas — e.g. when the child taps
        // "add to IF" or a palette block. That is not "deselect": keep the edit bar's block.
        if (!id && !host.current?.contains(document.activeElement)) return
        setSel((s) => (id && id !== HAT_ID && findBlock(programRef.current, id) ? (s?.id === id ? s : { id, branch: 'body' }) : null))
        return
      }
      if (e.isUiEvent) return
      emit()
    })
    loadJson(initialRef.current)
    w.scroll(8, 8)
    const ro = new ResizeObserver(() => Blockly.svgResize(w))
    ro.observe(host.current)
    return () => {
      ro.disconnect()
      w.dispose()
      ws.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; the rest is handled by the effects below
  }, [])

  // A new draft / mission: load it without telling the mission (it already has it).
  const firstReset = useRef(true)
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false
      return
    }
    loadJson(initialRef.current)
    const p = workspaceToProgram(initialRef.current)
    programRef.current = p
    setProgram(p)
    setSel(null)
  }, [resetKey, loadJson])

  useEffect(() => refreshWarnings(), [caps, refreshWarnings])

  useEffect(() => {
    ws.current?.setIsReadOnly(disabled)
  }, [disabled])

  // The running block glows; after a failed run, the block where the robot stopped does.
  useEffect(() => {
    const w = ws.current
    if (!w) return
    const id = activeId ?? errorId
    w.highlightBlock(id && w.getBlockById(id) ? id : null)
  }, [activeId, errorId])

  /** Apply an edit made with the buttons, then select (and show) a block. */
  const apply = (next: Block[], nextSel: Selection | null) => {
    const w = ws.current
    if (!w) return
    loadJson(withProgram(Blockly.serialization.workspaces.save(w) as BWorkspace, next))
    emit()
    setSel(nextSel)
    if (nextSel) {
      const b = w.getBlockById(nextSel.id)
      if (b) {
        loading.current = true
        b.select()
        loading.current = false
        w.scrollBoundsIntoView(b.getBoundingRectangleWithoutChildren(), 24)
      }
    }
  }

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
    apply(next, nextSel)
  }

  const del = (id: string) => {
    const loc = findLoc(program, id)
    playSound('click')
    // Select the parent container (if any) so the child can keep editing there.
    apply(removeBlock(program, id), loc?.parentId ? { id: loc.parentId, branch: loc.branch } : null)
  }

  const move = (id: string, d: -1 | 1) => apply(moveBlock(program, id, d), sel)
  const patch = (id: string, fn: (b: Block) => Block) => apply(patchBlock(program, id, fn), sel)
  const pick = (d: -1 | 1) => {
    if (!order.length) return
    const i = sel ? order.findIndex((b) => b.id === sel.id) : -1
    const j = i < 0 ? (d === 1 ? 0 : order.length - 1) : (i + d + order.length) % order.length
    const b = ws.current?.getBlockById(order[j].id)
    setSel({ id: order[j].id, branch: 'body' })
    if (b && ws.current) {
      loading.current = true
      b.select()
      loading.current = false
      ws.current.scrollBoundsIntoView(b.getBoundingRectangleWithoutChildren(), 24)
    }
  }

  const stepper = (b: Block & { n: number }, min: number, max: number) => (
    <div className="flex items-center gap-1" role="group" aria-label="How many">
      <button type="button" aria-label="One less" onClick={() => patch(b.id, (x) => ('n' in x ? { ...x, n: Math.max(min, x.n - 1) } : x))} className="h-11 w-11 rounded-xl bg-white/15 text-xl font-black">
        −
      </button>
      <span className="w-8 text-center text-xl font-black" aria-live="polite">
        {b.n}
      </span>
      <button type="button" aria-label="One more" onClick={() => patch(b.id, (x) => ('n' in x ? { ...x, n: Math.min(max, x.n + 1) } : x))} className="h-11 w-11 rounded-xl bg-white/15 text-xl font-black">
        +
      </button>
    </div>
  )

  const running = activeId ? findBlock(program, activeId) : null

  return (
    <div className="flex flex-col gap-3" data-testid="codelab-editor" data-blocks={count}>
      {/* Palette: the picture blocks, tap to add (works with a keyboard and one switch). */}
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
                className={`flex items-center gap-1.5 rounded-xl px-3 font-black shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-white ${
                  young ? 'min-h-[56px] text-base' : 'min-h-[48px] text-sm'
                } ${locked ? 'bg-slate-600 text-slate-300' : info.tone} disabled:opacity-50`}
              >
                <span aria-hidden className={young ? 'text-2xl' : ''}>
                  {locked ? '🔒' : info.emoji}
                </span>{' '}
                {info.label}
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

      {/* Edit bar: always the same height so the program never jumps. */}
      <div className="flex min-h-[60px] flex-wrap items-center gap-2 rounded-2xl bg-white/5 p-2" role="group" aria-label="Edit selected block">
        {!disabled && order.length > 0 && (
          <>
            <button type="button" onClick={() => pick(-1)} aria-label="Select the block before" className="h-11 w-11 rounded-xl bg-white/15 font-black">
              ◀
            </button>
            <button type="button" onClick={() => pick(1)} aria-label="Select the next block" className="h-11 w-11 rounded-xl bg-white/15 font-black">
              ▶
            </button>
          </>
        )}
        {selected && !disabled ? (
          <>
            <span className="px-1 text-sm font-black text-amber-200" aria-live="polite">
              {blockText(selected)}:
            </span>
            <button type="button" onClick={() => move(selected.id, -1)} aria-label="Move up" className="h-11 w-11 rounded-xl bg-white/15 font-black">
              ▲
            </button>
            <button type="button" onClick={() => move(selected.id, 1)} aria-label="Move down" className="h-11 w-11 rounded-xl bg-white/15 font-black">
              ▼
            </button>
            {(selected.type === 'forward' || selected.type === 'repeat') && stepper(selected, 1, selected.type === 'forward' ? FORWARD_MAX : REPEAT_MAX)}
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
            {isContainer(selected) && !hasElse(selected) && <span className="text-xs text-slate-300">New blocks go inside.</span>}
            <button type="button" onClick={() => del(selected.id)} className="min-h-[44px] rounded-xl bg-rose-700 px-3 text-sm font-black text-white">
              🗑 Delete
            </button>
            <button
              type="button"
              onClick={() => {
                setSel(null)
                Blockly.common.getSelected()?.unselect()
              }}
              className="min-h-[44px] rounded-xl bg-white/15 px-3 text-sm font-black"
            >
              Done
            </button>
          </>
        ) : (
          <p className="px-1 text-sm text-slate-300">
            {disabled
              ? running
                ? `Running: ${blockText(running)}`
                : 'Running your program…'
              : order.length
                ? 'Tap a block in your program (or ◀ ▶) to move it, change it or delete it. You can drag blocks too.'
                : 'Tap a block above to start.'}
          </p>
        )}
      </div>

      {/* Program: the Blockly workspace. */}
      <div className="rounded-2xl border-2 border-white/10 bg-black/20 p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Your program</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-black ${count <= budget ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}>
            {count} / {budget} blocks for ⭐⭐⭐
          </span>
        </div>
        <div className="relative">
          <div
            ref={host}
            className={`w-full overflow-hidden rounded-xl ${young ? 'h-[360px] sm:h-[440px]' : 'h-[340px] sm:h-[420px]'}`}
            aria-label="Your program as blocks. Drag to move them, or use the buttons above."
          />
          {program.length === 0 && (
            <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border-2 border-dashed border-white/20 bg-[#111C32]/90 p-3 text-center text-slate-300">
              Tap a block above — it snaps under “▶ when Run is pressed”.
            </p>
          )}
        </div>
        <ol className="sr-only" aria-label="Your program in words">
          {outline(program).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
        {program.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => {
              loadJson(programToWorkspace([]))
              emit()
              setSel(null)
            }}
            className="mt-2 min-h-[44px] rounded-xl px-3 text-sm font-bold text-slate-300 underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
