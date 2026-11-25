'use client'

// Tap-to-build block editor for grid-robot programs (sequence-path, debug-program).
// Tap a palette block to insert it at the orange cursor. Tap a block to select
// it: then change it, change its repeat count, move it or delete it. Tap a
// loop's header (or an empty slot) to put the cursor inside it. Fully keyboard
// operable: every control is a real <button>.

import type { ReactNode } from 'react'
import { playSound } from '@/lib/kids-audio'
import {
  type Cmd,
  type ListKey,
  type Op,
  PRIMITIVE_OPS,
  blockLabel,
  countBlocks,
  getBlock,
  getList,
  newBlock,
  parentOf,
  pythonRows,
  replaceBlock,
  updateList,
} from './engine'

export interface Cursor {
  listPath: string
  index: number
}

const OP_STYLE: Record<Op, { bg: string; text: string; ring: string }> = {
  forward: { bg: 'bg-amber-500', text: 'text-[#1A1103]', ring: 'ring-amber-300' },
  back: { bg: 'bg-amber-700', text: 'text-[#FFF4EC]', ring: 'ring-amber-300' },
  left: { bg: 'bg-[#00B8D4]', text: 'text-[#04151A]', ring: 'ring-[#00E5FF]' },
  right: { bg: 'bg-[#00B8D4]', text: 'text-[#04151A]', ring: 'ring-[#00E5FF]' },
  repeat: { bg: 'bg-[#22C55E]', text: 'text-[#052E14]', ring: 'ring-[#86EFAC]' },
  untilGoal: { bg: 'bg-[#14B8A6]', text: 'text-[#042F2A]', ring: 'ring-[#5EEAD4]' },
  ifWall: { bg: 'bg-[#EAB308]', text: 'text-[#2A2003]', ring: 'ring-[#FDE047]' },
}

const PALETTE_LABEL: Record<Op, string> = {
  forward: 'Forward',
  back: 'Reverse',
  left: 'Turn left',
  right: 'Turn right',
  repeat: 'Repeat',
  untilGoal: 'Until goal',
  ifWall: 'If wall',
}

export function OpIcon({ op, className = 'h-5 w-5' }: { op: Op; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (op) {
    case 'forward':
      return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M12 20V5M6 11l6-6 6 6" {...common} /></svg>
    case 'back':
      return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M12 4v15M6 13l6 6 6-6" {...common} /></svg>
    case 'left':
      return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M17 20v-7a4 4 0 0 0-4-4H6M10 5L6 9l4 4" {...common} /></svg>
    case 'right':
      return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M7 20v-7a4 4 0 0 1 4-4h7M14 5l4 4-4 4" {...common} /></svg>
    case 'repeat':
      return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M4 12a7 7 0 0 1 12-5l2 2M20 12a7 7 0 0 1-12 5l-2-2M18 4v5h-5M6 20v-5h5" {...common} /></svg>
    case 'untilGoal':
      return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M6 21V4l10 3-10 4M20 14a5 5 0 1 1-5-5" {...common} /></svg>
    case 'ifWall':
      return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M4 12h3M9 7a7 7 0 0 1 0 10M12 4a11 11 0 0 1 0 16M19 4v16" {...common} /></svg>
  }
}

export function ProgramEditor({
  program,
  onChange,
  palette,
  cursor,
  setCursor,
  selected,
  setSelected,
  activePath,
  disabled,
  maxBlocks,
  maxDepth = 2,
  python,
  pythonOnly,
  header,
}: {
  program: Cmd[]
  onChange: (p: Cmd[]) => void
  palette: Op[]
  cursor: Cursor
  setCursor: (c: Cursor) => void
  selected: string | null
  setSelected: (p: string | null) => void
  activePath: string | null
  disabled?: boolean
  maxBlocks?: number
  maxDepth?: number
  /** Show Python beside the blocks. */
  python: boolean
  /** Show only Python (toggle mode). */
  pythonOnly?: boolean
  header?: ReactNode
}) {
  const used = countBlocks(program)
  const depthOf = (listPath: string) => (listPath ? listPath.split('.').length / 2 : 0)
  const full = maxBlocks !== undefined && used >= maxBlocks

  const insert = (op: Op) => {
    if (disabled) return
    if ((op === 'repeat' || op === 'untilGoal' || op === 'ifWall') && depthOf(cursor.listPath) >= maxDepth) {
      playSound('wrong')
      return
    }
    const b = newBlock(op)
    const next = updateList(program, cursor.listPath, (l) => [...l.slice(0, cursor.index), b, ...l.slice(cursor.index)])
    playSound('click')
    onChange(next)
    const p = cursor.listPath ? `${cursor.listPath}.${cursor.index}` : `${cursor.index}`
    if (op === 'repeat' || op === 'untilGoal') setCursor({ listPath: `${p}.body`, index: 0 })
    else if (op === 'ifWall') setCursor({ listPath: `${p}.then`, index: 0 })
    else setCursor({ listPath: cursor.listPath, index: cursor.index + 1 })
    setSelected(null)
  }

  const selectBlock = (path: string) => {
    if (disabled) return
    playSound('click')
    const b = getBlock(program, path)
    if (!b) return
    setSelected(selected === path ? null : path)
    if (b.op === 'repeat' || b.op === 'untilGoal') setCursor({ listPath: `${path}.body`, index: getList(program, `${path}.body`).length })
    else if (b.op === 'ifWall') setCursor({ listPath: `${path}.then`, index: getList(program, `${path}.then`).length })
    else {
      const { listPath, index } = parentOf(path)
      setCursor({ listPath, index: index + 1 })
    }
  }

  const del = (path: string) => {
    playSound('click')
    const { listPath, index } = parentOf(path)
    onChange(replaceBlock(program, path, () => null))
    setCursor({ listPath, index })
    setSelected(null)
  }

  const move = (path: string, dir: -1 | 1) => {
    const { listPath, index } = parentOf(path)
    const list = getList(program, listPath)
    const j = index + dir
    if (j < 0 || j >= list.length) return
    playSound('click')
    onChange(updateList(program, listPath, (l) => {
      const c = [...l]
      ;[c[index], c[j]] = [c[j], c[index]]
      return c
    }))
    const np = listPath ? `${listPath}.${j}` : `${j}`
    setSelected(np)
    setCursor({ listPath, index: j + 1 })
  }

  const setOp = (path: string, op: Op) => {
    playSound('click')
    onChange(replaceBlock(program, path, () => newBlock(op)))
  }

  const setTimes = (path: string, d: number) => {
    playSound('click')
    onChange(replaceBlock(program, path, (c) => (c.op === 'repeat' ? { ...c, times: Math.min(20, Math.max(1, c.times + d)) } : c)))
  }

  const cursorMark = (
    <div aria-hidden className="my-1 flex items-center gap-2 pl-1">
      <span className="h-[3px] flex-1 rounded-full bg-amber-400 motion-safe:animate-pulse" />
      <span className="text-[12px] font-bold uppercase tracking-wider text-amber-300">new blocks go here</span>
    </div>
  )

  const renderList = (list: Cmd[], listPath: string): ReactNode => {
    const here = (i: number) => !disabled && cursor.listPath === listPath && cursor.index === i
    return (
      <div className="flex flex-col gap-1.5">
        {list.length === 0 && listPath !== '' && !here(0) && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => { playSound('click'); setCursor({ listPath, index: 0 }); setSelected(null) }}
            className="min-h-11 rounded-xl border-2 border-dashed border-white/20 px-3 text-left text-[14px] font-semibold text-[#A7B0C0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Empty — tap to add blocks here
          </button>
        )}
        {list.map((c, i) => {
          const path = listPath ? `${listPath}.${i}` : `${i}`
          const st = OP_STYLE[c.op]
          const isSel = selected === path
          const active = activePath === path || (activePath?.startsWith(path + '.') ?? false)
          const head = (
            <div className={`flex items-stretch gap-1 ${active ? 'motion-safe:scale-[1.02]' : ''} transition-transform duration-150`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => selectBlock(path)}
                aria-pressed={isSel}
                aria-label={`${blockLabel(c)}${isSel ? ', selected' : ''}`}
                className={`flex min-h-12 flex-1 items-center gap-2 rounded-xl px-3 text-left font-display text-[16px] font-bold shadow-[0_3px_0_rgba(0,0,0,.35)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${st.bg} ${st.text} ${isSel ? `ring-4 ${st.ring}` : ''} ${active ? 'outline outline-[3px] outline-white' : ''}`}
              >
                <OpIcon op={c.op} />
                <span className="truncate">{c.op === 'repeat' ? `Repeat ${c.times}×` : blockLabel(c)}</span>
              </button>
              {c.op === 'repeat' && isSel && !disabled && (
                <>
                  <MiniBtn label="One fewer time" onClick={() => setTimes(path, -1)}>−</MiniBtn>
                  <MiniBtn label="One more time" onClick={() => setTimes(path, 1)}>+</MiniBtn>
                </>
              )}
            </div>
          )
          const tools = isSel && !disabled && (
            <div className="mt-1 flex flex-wrap gap-1 rounded-xl bg-[#0A1120]/60 p-1.5">
              {PRIMITIVE_OPS.includes(c.op) &&
                palette.filter((o) => PRIMITIVE_OPS.includes(o) && o !== c.op).map((o) => (
                  <MiniBtn key={o} label={`Change to ${PALETTE_LABEL[o]}`} onClick={() => setOp(path, o)}>
                    <OpIcon op={o} className="h-4 w-4" />
                  </MiniBtn>
                ))}
              <MiniBtn label="Move up" onClick={() => move(path, -1)}>↑</MiniBtn>
              <MiniBtn label="Move down" onClick={() => move(path, 1)}>↓</MiniBtn>
              <MiniBtn label="Delete block" onClick={() => del(path)} danger>✕</MiniBtn>
            </div>
          )
          const body = (key: ListKey, label?: string) => (
            <div className="ml-3 border-l-4 border-white/15 pl-2 pt-1.5">
              {label && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => { playSound('click'); setCursor({ listPath: `${path}.${key}`, index: getList(program, `${path}.${key}`).length }); setSelected(null) }}
                  className="mb-1 min-h-11 rounded-lg px-2 text-[13px] font-bold uppercase tracking-wider text-[#FDE047] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  {label}
                </button>
              )}
              {renderList(key === 'body' && (c.op === 'repeat' || c.op === 'untilGoal') ? c.body : c.op === 'ifWall' ? c[key as 'then' | 'else'] : [], `${path}.${key}`)}
            </div>
          )
          return (
            <div key={path}>
              {here(i) && cursorMark}
              {head}
              {tools}
              {(c.op === 'repeat' || c.op === 'untilGoal') && body('body')}
              {c.op === 'ifWall' && (
                <>
                  {body('then', 'then')}
                  {body('else', 'otherwise')}
                </>
              )}
            </div>
          )
        })}
        {here(list.length) && cursorMark}
      </div>
    )
  }

  const py = pythonRows(program)
  const pyPanel = (
    <pre className="m-0 overflow-x-auto rounded-xl bg-[#060B16] p-3 font-mono text-[14px] leading-[1.7] text-[#C9D4E5]" aria-label="Your program in Python">
      {py.map((l, i) => (
        <div key={i} className={`flex gap-3 rounded px-1 ${l.path && activePath === l.path ? 'bg-amber-500/25 text-white' : ''}`}>
          <span className="w-5 shrink-0 select-none text-right text-[#6E7888]">{i + 1}</span>
          <span className="whitespace-pre">{colorPy(l.text)}</span>
        </div>
      ))}
    </pre>
  )

  return (
    <div className="flex flex-col gap-3">
      {header}
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Blocks you can add">
        {palette.map((op) => {
          const st = OP_STYLE[op]
          return (
            <button
              key={op}
              type="button"
              disabled={disabled || full}
              onClick={() => insert(op)}
              className={`flex min-h-12 items-center gap-1.5 rounded-xl px-3 font-display text-[15px] font-bold shadow-[0_4px_0_rgba(0,0,0,.4)] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:translate-y-[3px] disabled:opacity-40 ${st.bg} ${st.text}`}
            >
              <OpIcon op={op} />
              {PALETTE_LABEL[op]}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[14px] font-semibold text-[#A7B0C0]">
        <span>
          Blocks: <span className={`font-display text-[17px] ${maxBlocks !== undefined && used > maxBlocks ? 'text-red-400' : 'text-[#EEF2F8]'}`}>{used}</span>
          {maxBlocks !== undefined && <span> / {maxBlocks} memory</span>}
        </span>
        {program.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => { playSound('click'); onChange([]); setCursor({ listPath: '', index: 0 }); setSelected(null) }}
            className="min-h-11 rounded-lg px-2 text-[14px] font-semibold text-[#A7B0C0] underline-offset-4 hover:text-[#EEF2F8] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Clear all
          </button>
        )}
      </div>
      {maxBlocks !== undefined && (
        <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className={`h-full rounded-full transition-[width] duration-200 ${used > maxBlocks ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (used / maxBlocks) * 100)}%` }} />
        </div>
      )}
      {pythonOnly ? (
        pyPanel
      ) : (
        <div className={python ? 'grid gap-3 md:grid-cols-2' : ''}>
          <div className="min-h-[120px] rounded-xl bg-[#0A1120]/50 p-2" aria-label="Your program">
            {program.length === 0 && cursor.listPath === '' && (
              <p className="px-2 py-3 text-[15px] text-[#A7B0C0]">Tap a block above to start your program.</p>
            )}
            {renderList(program, '')}
          </div>
          {python && pyPanel}
        </div>
      )}
    </div>
  )
}

function MiniBtn({ children, onClick, label, danger }: { children: ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg font-display text-[18px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${danger ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-[#19263F] text-[#EEF2F8] hover:bg-[#223152]'}`}
    >
      {children}
    </button>
  )
}

/** Light Python syntax colouring (keywords orange, calls cyan, numbers green). */
export function colorPy(text: string): ReactNode {
  const parts = text.split(/(\b(?:for|in|range|while|not|if|elif|else|and|or|pass|True|False|print)\b|\b\d+\b|#.*$)/g)
  return parts.map((p, i) => {
    if (!p) return null
    if (p.startsWith('#')) return <span key={i} className="text-[#6E7888]">{p}</span>
    if (/^\d+$/.test(p)) return <span key={i} className="text-[#86EFAC]">{p}</span>
    if (/^(for|in|while|not|if|elif|else|and|or|pass|True|False)$/.test(p)) return <span key={i} className="text-amber-300">{p}</span>
    if (/^(range|print)$/.test(p)) return <span key={i} className="text-[#00E5FF]">{p}</span>
    return <span key={i}>{p}</span>
  })
}
