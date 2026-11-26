'use client'

// binary-encoder — flip bit lamps to store a number, paint a camera image from
// its row codes, spell a radio message, or protect data with parity bits.

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { Btn, FeedbackCard, Panel, useAttempts } from '../sequence-path/KitClient'
import {
  type Answer,
  type Bit,
  type Params,
  charCode,
  codeChar,
  codeWidth,
  editable,
  fromBits,
  placeValues,
  rowCode,
  startGrid,
} from './logic'

export default function BinaryEncoderClient({ params, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const [grid, setGrid] = useState<Bit[][]>(() => startGrid(params))
  const [showChecks, setShowChecks] = useState(false)
  const getAnswer = useCallback(() => ({ bits: grid }), [grid])
  const state = useAttempts<Params, Answer>({ onSubmit, onDone }, getAnswer)
  const locked = !!state.result?.correct || state.done
  const solved = !!state.result?.correct

  const toggle = (r: number, c: number) => {
    if (locked || !editable(params, r, c)) return
    primeAudio()
    playSound(grid[r][c] ? 'click' : 'star')
    setGrid((g) => g.map((row, i) => (i === r ? row.map((b, j) => (j === c ? ((1 - b) as Bit) : b)) : row)))
    if (state.result && !state.result.correct) state.retry()
  }
  const reset = () => {
    playSound('click')
    setGrid(startGrid(params))
    if (state.result && !state.result.correct) state.retry()
  }

  let board: ReactNode
  let title = ''
  switch (params.mode) {
    case 'number': {
      title = `Store ${params.target} in the ${params.label ? params.label.toLowerCase() : 'robot’s'} register`
      const v = fromBits(grid[0])
      const max = 2 ** params.bits - 1
      board = (
        <div className="flex flex-col gap-4">
          <BitRow bits={grid[0]} row={0} onToggle={toggle} places={params.showPlaceValues ?? true} big locked={locked} />
          {/* Older bands work the sum out themselves unless the author turns the live total on. */}
          {(params.showTotal ?? (band === 'explorers' || band === 'builders')) && (
            <div>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-[15px] font-semibold text-[#A7B0C0]">{params.label ?? 'Value'}</span>
                <span className="text-[15px] text-[#A7B0C0]">
                  <span className={`text-[30px] font-bold ${v === params.target ? 'text-[#4ADE80]' : 'text-[#EEF2F8]'}`} aria-live="polite">{v}</span> / target {params.target}
                </span>
              </div>
              <div className="relative mt-1 h-4 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div className="h-full rounded-full bg-amber-500 transition-[width] duration-200" style={{ width: `${(v / max) * 100}%` }} />
                <div className="absolute top-0 h-full w-1 bg-[#00E5FF]" style={{ left: `calc(${(params.target / max) * 100}% - 2px)` }} />
              </div>
              <p className="mt-1 text-[13px] text-[#6E7888]">{params.bits} bits can store 0 to {max}.</p>
            </div>
          )}
        </div>
      )
      break
    }
    case 'pixels': {
      title = 'Decode the camera image'
      const w = params.width
      board = (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] text-[#A7B0C0]">
            Each row of the picture arrived as {params.codes === 'binary' ? 'a binary code (1 = lit)' : params.codes === 'hex' ? 'a hexadecimal number' : 'a number'}. Light the pixels it describes.
          </p>
          {/* Pixels never shrink below the 44px tap target; a wide board scrolls sideways instead. */}
          <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
          <div className="grid w-fit gap-1" style={{ gridTemplateColumns: `auto repeat(${w}, 44px)` }}>
            <span />
            {placeValues(w).map((pv) => (
              <span key={pv} className="text-center font-mono text-[11px] text-[#6E7888]">{params.codes === 'binary' ? '' : pv}</span>
            ))}
            {grid.map((row, r) => (
              <Row key={r}>
                <span className="flex items-center justify-end pr-1.5 font-mono text-[14px] font-bold text-amber-300">{rowCode(params.rows[r], w, params.codes)}</span>
                {row.map((b, c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={locked}
                    onClick={() => toggle(r, c)}
                    aria-pressed={b === 1}
                    aria-label={`Row ${r + 1}, pixel ${c + 1}: ${b ? 'lit' : 'dark'}`}
                    className={`h-11 w-11 rounded-md border transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${b ? 'border-[#E0FCFF] bg-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,.7)]' : 'border-white/10 bg-[#0A1120]'}`}
                  />
                ))}
              </Row>
            ))}
          </div>
          </div>
          {solved && params.reveal && <p className="font-display text-[17px] font-bold text-[#4ADE80]">It’s {params.reveal}!</p>}
        </div>
      )
      break
    }
    case 'message': {
      title = `Send “${params.text}” in ${params.code === 'ascii' ? 'ASCII' : 'the A1Z26 code'}`
      const cw = codeWidth(params.code)
      board = (
        <div className="flex flex-col gap-3">
          {grid.map((row, r) => {
            const v = fromBits(row)
            const ch = params.text[r]
            return (
              <div key={r} className="rounded-xl bg-[#0A1120]/60 p-2">
                <div className="mb-1 flex items-baseline justify-between gap-2 font-display">
                  <span className="text-[22px] font-bold text-[#EEF2F8]">{ch === ' ' ? '␣' : ch}</span>
                  <span className="text-[14px] text-[#A7B0C0]">
                    your bits = <span className="font-bold text-[#EEF2F8]">{v}</span>
                    {v > 0 && <> → <span className={codeChar(v, params.code) === ch ? 'font-bold text-[#4ADE80]' : 'font-bold text-amber-300'}>{codeChar(v, params.code)}</span></>}
                  </span>
                </div>
                <BitRow bits={row} row={r} onToggle={toggle} places={r === 0 && (params.showPlaceValues ?? true)} locked={locked} />
              </div>
            )
          })}
          {(params.showTable ?? true) && <CodeTable code={params.code} highlight={params.text} />}
          <p className="text-[13px] text-[#6E7888]">Each letter uses {cw} bits.</p>
        </div>
      )
      break
    }
    case 'parity': {
      const w = params.data[0].length
      const fix = params.task === 'fix'
      title = fix ? 'One bit was damaged — find it and flip it back' : 'Add a parity bit to every row'
      const rowOnes = grid.map((r) => r.reduce<number>((n, b) => n + b, 0))
      const colOnes = grid[0].map((_, c) => grid.reduce((n, r) => n + r[c], 0))
      // The live odd/even readout would turn the task into "tap until green", so it
      // stays hidden until the child asks for it, or (in 'add') after a first check.
      const checksOn = showChecks || (!fix && (state.attempts > 0 || locked))
      board = (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-[#A7B0C0]">
            {fix
              ? 'Each row ends with a parity bit and the last row holds the column parity bits, so every row and every column should have an EVEN number of 1s. Noise flipped exactly one bit.'
              : 'Make each row have an EVEN number of 1s by setting its parity bit (the orange column). Count the 1s yourself — the data bits are locked.'}
          </p>
          <div className="grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${w + 1}, 48px) auto` }}>
            {grid.map((row, r) => (
              <Row key={r}>
                {row.map((b, c) => {
                  const parityCell = c === w || (fix && r === params.data.length)
                  const can = editable(params, r, c) && !locked
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggle(r, c)}
                      disabled={!can}
                      aria-pressed={b === 1}
                      aria-label={`Row ${r + 1}, column ${c + 1}${parityCell ? ' (parity)' : ''}: ${b}`}
                      className={`h-12 w-12 rounded-lg border-2 font-mono text-[20px] font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:cursor-default ${parityCell ? 'border-amber-400/70' : 'border-white/10'} ${b ? 'bg-amber-500 text-[#1A1103]' : 'bg-[#0A1120] text-[#6E7888]'} ${!can && !locked ? 'opacity-70' : ''}`}
                    >
                      {b}
                    </button>
                  )
                })}
                <span className={`flex items-center pl-1 text-[13px] font-semibold ${checksOn ? (rowOnes[r] % 2 ? 'text-red-300' : 'text-[#4ADE80]') : 'text-transparent'}`} aria-hidden={!checksOn}>
                  {rowOnes[r]} {rowOnes[r] % 2 ? 'odd' : 'even'}
                </span>
              </Row>
            ))}
            {fix && showChecks && colOnes.map((n, c) => (
              <span key={c} className={`text-center text-[12px] font-semibold ${n % 2 ? 'text-red-300' : 'text-[#4ADE80]'}`}>{n} {n % 2 ? 'odd' : 'ev'}</span>
            ))}
          </div>
          {fix && !locked && (
            <Btn tone="ghost" ariaPressed={showChecks} onClick={() => { playSound('click'); setShowChecks((s) => !s) }} className="self-start">
              {showChecks ? 'Hide the parity checks' : 'Count the 1s for me'}
            </Btn>
          )}
        </div>
      )
      break
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
      <Panel title={title}>{board}</Panel>
      <div className="flex flex-col gap-3">
        {!state.result && !locked && (
          <div className="flex flex-wrap gap-2">
            <Btn tone="primary" className="flex-1" onClick={() => state.submit()}>Send the bits</Btn>
            <Btn tone="ghost" onClick={reset}>↺ Reset</Btn>
          </div>
        )}
        <FeedbackCard state={state} />
      </div>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** A row of bit lamps grouped in nibbles (groups of 4 from the right) so long registers wrap cleanly on phones. */
function BitRow({ bits, row, onToggle, places, big, locked }: { bits: Bit[]; row: number; onToggle: (r: number, c: number) => void; places: boolean; big?: boolean; locked: boolean }) {
  const pv = placeValues(bits.length)
  const groups: number[][] = []
  for (let end = bits.length; end > 0; end -= 4) groups.unshift(Array.from({ length: Math.min(4, end) }, (_, k) => Math.max(0, end - 4) + k))
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2" role="group" aria-label={`Bits, value ${fromBits(bits)}`}>
      {groups.map((g, gi) => (
        <div key={gi} className="flex gap-1">
          {g.map((c) => (
            <div key={c} className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                disabled={locked}
                onClick={() => onToggle(row, c)}
                aria-pressed={bits[c] === 1}
                aria-label={`Bit worth ${pv[c]}: ${bits[c] ? 'on' : 'off'}`}
                className={`flex w-11 items-center justify-center rounded-xl border-2 font-mono font-bold transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-95 ${big ? 'h-16 text-[24px]' : 'h-12 text-[20px]'} ${bits[c] ? 'border-amber-300 bg-amber-500 text-[#1A1103] shadow-[0_0_18px_rgba(252,104,24,.6)]' : 'border-white/10 bg-[#0A1120] text-[#6E7888]'}`}
              >
                {bits[c]}
              </button>
              {places && <span className="font-mono text-[12px] text-[#A7B0C0]">{pv[c]}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function CodeTable({ code, highlight }: { code: 'a1z26' | 'ascii'; highlight: string }) {
  const letters = useMemo(() => {
    if (code === 'a1z26') return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
    const set = new Set<string>()
    for (let i = 0; i < 26; i++) set.add(String.fromCharCode(65 + i))
    for (const ch of highlight) set.add(ch)
    return [...set].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0))
  }, [code, highlight])
  return (
    <details className="rounded-xl border border-white/10 bg-[#0A1120]/60 p-2" open>
      <summary className="min-h-11 cursor-pointer content-center px-1 font-display text-[14px] font-bold text-[#A7B0C0]">Code table</summary>
      <div className="mt-1 grid grid-cols-6 gap-1 sm:grid-cols-9">
        {letters.map((ch) => (
          <span key={ch} className={`rounded-md px-1 py-0.5 text-center font-mono text-[13px] ${highlight.toUpperCase().includes(ch.toUpperCase()) && (code === 'a1z26' || highlight.includes(ch)) ? 'bg-amber-500/20 text-amber-200' : 'text-[#A7B0C0]'}`}>
            {ch === ' ' ? '␣' : ch}={charCode(ch, code)}
          </span>
        ))}
      </div>
    </details>
  )
}
