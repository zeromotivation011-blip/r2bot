'use client'

// The playable grid-robot mission shared by sequence-path and debug-program:
// map(s) + block editor + Run → animated drive → feedback → retry.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { type Cell, type Cmd, type Op, type RunResult, type Theme, type World, THEMES, bfsPath, runProgram } from './engine'
import { GridWorld, frameAngles } from './GridWorldClient'
import { type Cursor, ProgramEditor } from './ProgramEditorClient'
import { Btn, FeedbackCard, Panel, useAttempts, useReducedMotion } from './KitClient'

export interface GridMissionProps<P> extends Pick<TemplateProps<P, { program: Cmd[] }>, 'onSubmit' | 'onDone'> {
  worlds: World[]
  theme: Theme
  palette: Op[]
  maxBlocks?: number
  maxDepth?: number
  python: 'off' | 'toggle' | 'on'
  initialProgram: Cmd[]
  showHintPath?: boolean
  /** Rendered above the editor (debug-program shows its edit counter here). */
  editorHeader?: (program: Cmd[]) => ReactNode
  /** Extra controls next to Run (debug-program: "Reset to original"). */
  extraActions?: (setProgram: (p: Cmd[]) => void) => ReactNode
  runLabel?: string
  /** A program the child can watch without submitting (debug-program: the buggy original). */
  preview?: { label: string; program: Cmd[] }
}

export function GridMission<P>(props: GridMissionProps<P>) {
  const { worlds, theme, palette, maxBlocks, maxDepth, python, initialProgram, showHintPath, editorHeader, extraActions, runLabel = 'Run program', preview } = props
  const reduced = useReducedMotion()
  const [program, setProgramRaw] = useState<Cmd[]>(initialProgram)
  const [cursor, setCursor] = useState<Cursor>({ listPath: '', index: initialProgram.length })
  const [selected, setSelected] = useState<string | null>(null)
  const [mapIdx, setMapIdx] = useState(0)
  const [runs, setRuns] = useState<RunResult[] | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [fast, setFast] = useState(false)
  const [pyOnly, setPyOnly] = useState(false)
  const [runProg, setRunProg] = useState<Cmd[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = THEMES[theme]

  const getAnswer = useCallback(() => ({ program }), [program])
  const state = useAttempts<P, { program: Cmd[] }>(props, getAnswer)
  const stepMs = reduced ? 140 : fast ? 170 : 380

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const setProgram = (p: Cmd[]) => {
    setProgramRaw(p)
    setRuns(null)
    setFrameIdx(0)
    if (state.result && !state.result.correct) state.retry()
  }

  const run = (prog: Cmd[] = program, submitAfter = true) => {
    if (running) return
    primeAudio()
    playSound('click')
    setSelected(null)
    setRunProg(prog)
    const results = worlds.map((w) => runProgram(w, prog))
    setRuns(results)
    setRunning(true)
    // Animate map by map, stopping at the first map that fails.
    let m = 0
    let f = 0
    setMapIdx(0)
    setFrameIdx(0)
    const step = () => {
      const r = results[m]
      if (f < r.frames.length - 1) {
        f++
        setFrameIdx(f)
        const ev = r.frames[f].event
        if (ev === 'gem') playSound('star')
        else if (ev === 'bump') playSound('wrong')
        timer.current = setTimeout(step, stepMs)
        return
      }
      if (r.outcome === 'goal' && m < results.length - 1) {
        m++
        f = 0
        setMapIdx(m)
        setFrameIdx(0)
        timer.current = setTimeout(step, stepMs * 2)
        return
      }
      setRunning(false)
      if (submitAfter) state.submit()
    }
    timer.current = setTimeout(step, stepMs)
  }

  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    setRunning(false)
    setRuns(null)
    setFrameIdx(0)
  }

  const world = worlds[mapIdx]
  const r = runs?.[mapIdx]
  const frames = r?.frames ?? null
  const frame = frames ? frames[Math.min(frameIdx, frames.length - 1)] : null
  const angles = useMemo(() => (frames ? frameAngles(frames) : null), [frames])
  const angle = angles ? angles[Math.min(frameIdx, angles.length - 1)] : frameAngles([{ at: world.start.at, dir: world.start.dir, node: '', event: 'start', collected: [] }])[0]
  const trail: Cell[] = frames ? frames.slice(0, frameIdx + 1).map((f) => f.at) : [world.start.at]
  const activePath = running && runProg === program && frame && frame.node ? frame.node : null
  const hint = useMemo(() => {
    if (!showHintPath) return undefined
    const stops = [...(world.gems ?? []), world.goal]
    let at = world.start.at
    const out: Cell[] = [at]
    for (const s of stops) {
      const seg = bfsPath(world, at, s)
      out.push(...seg.slice(1))
      at = s
    }
    return out
  }, [showHintPath, world])
  const locked = running || !!state.result?.correct || state.done

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <Panel className="lg:sticky lg:top-20">
        {worlds.length > 1 && (
          <div className="mb-2 flex gap-2" role="tablist" aria-label="Maps">
            {worlds.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={mapIdx === i}
                disabled={running}
                onClick={() => { playSound('click'); setMapIdx(i); setRuns(null); setFrameIdx(0) }}
                className={`min-h-11 flex-1 rounded-xl px-3 font-display text-[15px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${mapIdx === i ? 'bg-amber-500 text-[#1A1103]' : 'bg-[#19263F] text-[#A7B0C0]'}`}
              >
                Map {i + 1}
                {runs && runs[i] && i <= mapIdx && !running && (runs[i].outcome === 'goal' ? ' ✓' : '')}
              </button>
            ))}
          </div>
        )}
        <GridWorld world={world} theme={theme} frame={frame} angle={angle} trail={trail} hintPath={hint} reduced={reduced} stepMs={stepMs} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-[#A7B0C0]">
          <Legend swatch={<span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />} text={t.robot} />
          <Legend swatch={<span className="inline-block h-3 w-3 rounded-full border-2 border-amber-400" />} text={t.goal} />
          {(world.gems ?? []).length > 0 && <Legend swatch={<span className="inline-block h-3 w-3 rotate-45 bg-[#00E5FF]" />} text={t.gems} />}
          {(world.walls ?? []).length > 0 && <Legend swatch={<span className="inline-block h-3 w-3 rounded-sm bg-[#8A6E4B]" />} text={`${t.wall}s`} />}
        </div>
      </Panel>
      <div className="flex flex-col gap-3">
        <Panel>
          <ProgramEditor
            program={program}
            onChange={setProgram}
            palette={palette}
            cursor={cursor}
            setCursor={setCursor}
            selected={selected}
            setSelected={setSelected}
            activePath={activePath}
            disabled={locked}
            maxBlocks={maxBlocks}
            maxDepth={maxDepth}
            python={python === 'on'}
            pythonOnly={python === 'toggle' && pyOnly}
            header={
              <>
                {editorHeader?.(program)}
                {python === 'toggle' && (
                  <div className="flex gap-1 self-start rounded-xl bg-[#0A1120] p-1" role="group" aria-label="View">
                    <Btn tone={pyOnly ? 'ghost' : 'primary'} className="!min-h-11 !px-3 !text-[14px]" ariaPressed={!pyOnly} onClick={() => { playSound('click'); setPyOnly(false) }}>Blocks</Btn>
                    <Btn tone={pyOnly ? 'cyan' : 'ghost'} className="!min-h-11 !px-3 !text-[14px]" ariaPressed={pyOnly} onClick={() => { playSound('click'); setPyOnly(true) }}>Python</Btn>
                  </div>
                )}
              </>
            }
          />
        </Panel>
        {!state.result && (
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Btn tone="secondary" onClick={stop}>■ Stop</Btn>
            ) : (
              <Btn tone="primary" onClick={() => run()} disabled={program.length === 0 || state.done} className="flex-1 sm:flex-none">▶ {runLabel}</Btn>
            )}
            <Btn tone="ghost" ariaPressed={fast} onClick={() => { playSound('click'); setFast((f) => !f) }}>{fast ? 'Speed: fast' : 'Speed: normal'}</Btn>
            {!running && preview && (
              <Btn tone="cyan" onClick={() => run(preview.program, false)}>{preview.label}</Btn>
            )}
            {!running && extraActions?.(setProgram)}
          </div>
        )}
        <FeedbackCard state={state} />
      </div>
    </div>
  )
}

function Legend({ swatch, text }: { swatch: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      <span className="capitalize">{text}</span>
    </span>
  )
}
