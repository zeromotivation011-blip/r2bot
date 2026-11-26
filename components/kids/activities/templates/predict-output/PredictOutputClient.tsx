'use client'

// predict-output — read a robot's program, predict what it prints (or where a
// variable ends up), then step through the real trace to see exactly why.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { Btn, FeedbackCard, Panel, useAttempts, useReducedMotion } from '../sequence-path/KitClient'
import { colorPy } from '../sequence-path/ProgramEditorClient'
import { type BlockRow, blockRows, fmt, variableNames } from './lang'
import { type Answer, type Compiled, type Params, compile } from './logic'

const KIND_STYLE: Record<BlockRow['kind'], string> = {
  set: 'bg-amber-500 text-[#1A1103]',
  change: 'bg-amber-300 text-[#1A1103]',
  say: 'bg-[#00B8D4] text-[#04151A]',
  loop: 'bg-[#22C55E] text-[#052E14]',
  if: 'bg-[#EAB308] text-[#2A2003]',
  else: 'bg-[#EAB308] text-[#2A2003]',
  pass: 'bg-[#19263F] text-[#EEF2F8]',
}

export default function PredictOutputClient({ params, onSubmit, onDone, band }: TemplateProps<Params, Answer>) {
  const reduced = useReducedMotion()
  const compiled: Compiled | null = useMemo(() => {
    try {
      return compile(params)
    } catch {
      return null
    }
  }, [params])
  const view = params.view ?? 'python'
  const [showPy, setShowPy] = useState(view === 'python')
  const askOutput = params.ask.kind === 'output'
  const askName = params.ask.kind === 'variable' ? params.ask.name : ''
  const showCount = params.showOutputCount ?? true
  const expectedLen = compiled?.expected.length ?? 1
  const [values, setValues] = useState<string[]>(() => Array.from({ length: askOutput ? (showCount ? expectedLen : 1) : 1 }, () => ''))
  const [focus, setFocus] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const getAnswer = useCallback(() => ({ values }), [values])
  const state = useAttempts<Params, Answer>({ onSubmit, onDone }, getAnswer)
  const locked = !!state.result?.correct || state.done

  // Trace player (unlocked after the first prediction).
  const trace = useMemo(() => compiled?.result.trace ?? [], [compiled])
  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (!playing) return
    if (step >= trace.length - 1) { setPlaying(false); return }
    timer.current = setTimeout(() => {
      const next = step + 1
      setStep(next)
      if (trace[next]?.note.startsWith('printed')) playSound('star')
      else playSound('click')
    }, reduced ? 350 : 650)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [playing, step, trace, reduced])

  const scratchOn = params.scratchpad ?? view === 'blocks'
  const names = useMemo(() => (compiled ? variableNames(compiled.prog) : []), [compiled])
  const [notes, setNotes] = useState<Record<string, number | null>>({})
  const usesBool = /\b(True|False)\b|[<>]=?|==|!=/.test(params.code) && /print|True|False/.test(params.code)

  if (!compiled) {
    return <Panel><p className="text-[17px] text-[#EEF2F8]">This program could not be loaded.</p></Panel>
  }

  const codeLines = params.code.replace(/\r/g, '').split('\n')
  const rows = blockRows(compiled.prog)
  const cur = step >= 0 ? trace[step] : null
  const prev = step > 0 ? trace[step - 1] : null

  const setValue = (i: number, v: string) => {
    setValues((vs) => vs.map((x, k) => (k === i ? v : x)))
    if (state.result && !state.result.correct) state.retry()
  }
  const press = (key: string) => {
    if (locked) return
    primeAudio()
    playSound('click')
    const v = values[focus] ?? ''
    if (key === '⌫') setValue(focus, v.slice(0, -1))
    else if (key === 'True' || key === 'False') setValue(focus, key)
    else if (key === '−') setValue(focus, v.startsWith('-') ? v.slice(1) : `-${v}`)
    else if (/^(True|False)$/.test(v)) setValue(focus, key)
    else if (v.replace('-', '').length < 6) setValue(focus, v + key)
    inputs.current[focus]?.focus()
  }
  const addLine = (d: 1 | -1) => {
    playSound('click')
    setValues((vs) => (d > 0 ? (vs.length < 8 ? [...vs, ''] : vs) : vs.length > 1 ? vs.slice(0, -1) : vs))
    setFocus((f) => Math.max(0, Math.min(f, values.length + d - 1)))
    if (state.result && !state.result.correct) state.retry()
  }
  const submit = () => {
    const r = state.submit()
    if (!r.correct) setStep(-1)
  }
  const startTrace = () => {
    primeAudio()
    playSound('click')
    if (step >= trace.length - 1) setStep(-1)
    setPlaying(true)
  }
  const stepBy = (d: 1 | -1) => {
    playSound('click')
    setPlaying(false)
    setStep((s) => Math.max(-1, Math.min(trace.length - 1, s + d)))
  }

  const lineActive = (line: number) => cur?.line === line
  const pythonView = (
    <pre className="m-0 overflow-x-auto rounded-xl bg-[#060B16] p-3 font-mono text-[15px] leading-[1.75] text-[#C9D4E5]" aria-label="The robot's program in Python">
      {codeLines.map((text, i) => (
        <div key={i} className={`flex gap-3 rounded px-1 transition-colors duration-150 ${lineActive(i + 1) ? 'bg-amber-500/30 text-white' : ''}`} aria-current={lineActive(i + 1) ? 'step' : undefined}>
          <span className="w-5 shrink-0 select-none text-right text-[#6E7888]">{i + 1}</span>
          <span className="whitespace-pre">{text ? colorPy(text) : ' '}</span>
        </div>
      ))}
    </pre>
  )
  const blocksView = (
    <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="The robot's program as blocks">
      {rows.map((r, i) => (
        <li key={i} style={{ marginLeft: `${r.depth * 22}px` }} className={`${r.depth ? 'border-l-4 border-white/15 pl-2' : ''}`}>
          <span className={`inline-flex min-h-11 items-center rounded-xl px-3 font-display text-[16px] font-bold shadow-[0_3px_0_rgba(0,0,0,.35)] transition-transform duration-150 ${KIND_STYLE[r.kind]} ${lineActive(r.line) ? 'outline outline-[3px] outline-white motion-safe:scale-[1.03]' : ''}`}>
            {r.text}
          </span>
        </li>
      ))}
    </ol>
  )

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', '⌫']

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
      <Panel
        className="lg:sticky lg:top-4"
        title={
          <span className="flex items-center justify-between gap-2">
            <span>The robot&apos;s program</span>
            {view === 'toggle' && (
              <span className="flex gap-1 rounded-xl bg-[#0A1120] p-1 normal-case tracking-normal" role="group" aria-label="View">
                <Btn tone={showPy ? 'ghost' : 'primary'} className="!min-h-11 !px-3 !text-[14px]" ariaPressed={!showPy} onClick={() => { playSound('click'); setShowPy(false) }}>Blocks</Btn>
                <Btn tone={showPy ? 'cyan' : 'ghost'} className="!min-h-11 !px-3 !text-[14px]" ariaPressed={showPy} onClick={() => { playSound('click'); setShowPy(true) }}>Python</Btn>
              </span>
            )}
          </span>
        }
      >
        {showPy ? pythonView : blocksView}
        {state.attempts > 0 && (
          <TracePanel>
            <div className="flex flex-wrap items-center gap-2">
              <Btn tone="cyan" onClick={playing ? () => setPlaying(false) : startTrace} className="flex-1 sm:flex-none">
                {playing ? '❚❚ Pause' : step >= trace.length - 1 ? '↺ Run again' : '▶ Watch it run'}
              </Btn>
              <Btn tone="secondary" ariaLabel="Step back" onClick={() => stepBy(-1)} disabled={step < 0}>◀</Btn>
              <Btn tone="secondary" ariaLabel="Step forward" onClick={() => stepBy(1)} disabled={step >= trace.length - 1}>▶</Btn>
              <span className="text-[14px] font-semibold text-[#A7B0C0]">Step {Math.max(0, step + 1)} / {trace.length}</span>
            </div>
            <p className="mt-2 min-h-[1.6em] font-display text-[17px] font-bold text-amber-300" aria-live="polite">
              {cur ? `Line ${cur.line}: ${cur.note}` : 'Press play to run the program one step at a time.'}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-[#A7B0C0]">Variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {names.map((n) => {
                    const v = cur?.vars[n]
                    const changed = cur && prev ? prev.vars[n] !== v : !!cur && v !== undefined
                    return (
                      <span key={n} className={`rounded-lg border px-2 py-1 font-mono text-[15px] transition-colors duration-200 ${changed ? 'border-amber-400 bg-amber-500/20 text-white' : 'border-white/10 bg-[#0A1120] text-[#C9D4E5]'}`}>
                        {n} = {v === undefined ? '?' : fmt(v)}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-[#A7B0C0]">Robot screen</p>
                <div className="min-h-[44px] rounded-lg bg-[#060B16] p-2 font-mono text-[15px] text-[#4ADE80]" aria-label="Printed so far">
                  {(cur?.out ?? []).length === 0 ? <span className="text-[#6E7888]">(nothing yet)</span> : cur?.out.map((o, i) => <div key={i}>{o}</div>)}
                </div>
              </div>
            </div>
          </TracePanel>
        )}
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel title={askOutput ? 'Your prediction: what does the robot print?' : `Your prediction: what is ${askName} at the end?`}>
          <div className="rounded-xl bg-[#060B16] p-3" role="group" aria-label="Prediction">
            {values.map((v, i) => (
              <label key={i} className="mb-1.5 flex items-center gap-2 last:mb-0">
                <span className="w-16 shrink-0 font-mono text-[14px] text-[#6E7888]">{askOutput ? `line ${i + 1}` : `${askName} =`}</span>
                <input
                  ref={(el) => { inputs.current[i] = el }}
                  value={v}
                  inputMode="none"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={locked}
                  aria-label={askOutput ? `Printed line ${i + 1}` : `Final value of ${askName}`}
                  onFocus={() => setFocus(i)}
                  onChange={(e) => setValue(i, e.target.value.slice(0, 7))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !locked) submit() }}
                  className={`min-h-12 w-full rounded-xl border-2 bg-[#0A1120] px-3 font-mono text-[20px] font-bold text-[#4ADE80] outline-none transition-colors focus-visible:ring-4 focus-visible:ring-amber-400/60 ${focus === i ? 'border-amber-400' : 'border-white/10'}`}
                />
              </label>
            ))}
          </div>
          {askOutput && !showCount && !locked && (
            <div className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-[#A7B0C0]">
              <span>How many lines?</span>
              <Btn tone="secondary" ariaLabel="One line fewer" onClick={() => addLine(-1)} disabled={values.length <= 1}>−</Btn>
              <span className="font-display text-[18px] text-[#EEF2F8]">{values.length}</span>
              <Btn tone="secondary" ariaLabel="One more line" onClick={() => addLine(1)} disabled={values.length >= 8}>+</Btn>
            </div>
          )}
          {!locked && (
            <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Keypad">
              {keys.map((k) => (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete' : k === '−' ? 'Minus' : k} className="min-h-12 rounded-xl bg-[#19263F] font-display text-[20px] font-bold text-[#EEF2F8] shadow-[0_3px_0_rgba(0,0,0,.4)] transition-transform duration-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:translate-y-[2px]">
                  {k}
                </button>
              ))}
              {usesBool && (
                <>
                  <button type="button" onClick={() => press('True')} className="col-span-3 min-h-12 rounded-xl bg-[#14304A] font-display text-[17px] font-bold text-[#00E5FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:col-span-1">True</button>
                  <button type="button" onClick={() => press('False')} className="col-span-3 min-h-12 rounded-xl bg-[#14304A] font-display text-[17px] font-bold text-[#00E5FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:col-span-1">False</button>
                </>
              )}
            </div>
          )}
          {!state.result && !locked && (
            <Btn tone="primary" className="mt-3 w-full" onClick={submit} disabled={values.every((v) => !v.trim())}>Check my prediction</Btn>
          )}
        </Panel>

        {scratchOn && names.length > 0 && !locked && (
          <Panel title="Notepad — keep track as you trace">
            <div className="flex flex-col gap-1.5">
              {names.map((n) => {
                const v = notes[n] ?? null
                const bump = (d: number) => { playSound('click'); setNotes((s) => ({ ...s, [n]: (s[n] ?? 0) + d })) }
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="min-w-[5.5rem] font-mono text-[16px] text-[#C9D4E5]">{n}</span>
                    <Btn tone="secondary" ariaLabel={`${n} minus one`} onClick={() => bump(-1)}>−</Btn>
                    <span className="min-w-[3rem] text-center font-display text-[20px] font-bold text-[#EEF2F8]" aria-live="polite">{v === null ? '?' : v}</span>
                    <Btn tone="secondary" ariaLabel={`${n} plus one`} onClick={() => bump(1)}>+</Btn>
                  </div>
                )
              })}
            </div>
            {band === 'explorers' && <p className="mt-2 text-[14px] text-[#A7B0C0]">Tap + and − to change each number as you read each block.</p>}
          </Panel>
        )}

        <FeedbackCard state={state} />
      </div>
    </div>
  )
}

function TracePanel({ children }: { children: ReactNode }) {
  return <div className="mt-3 rounded-xl border border-[#00B8D4]/30 bg-[#0A1A2A] p-3 motion-safe:animate-[tplPop_.28s_cubic-bezier(.22,.61,.36,1)]">{children}</div>
}
