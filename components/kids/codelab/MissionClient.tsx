'use client'

// components/kids/codelab/MissionClient.tsx
// One Code Lab mission: the child's own robot in a 3D arena, the block
// editor, run / step / reset with the running block highlighted, kind and
// specific errors, the hint ladder after a failed run (goal → clue → "Spark
// shows me" a twin mission, roadmap #26; a hint caps the stars at 2 but still
// earns XP), stars, and the Python view.
// Capabilities matter: a mission that needs a part the robot lacks offers a
// one-tap "Add the part" that updates the saved Workshop design.
// The editor is Blockly, in the one block language of R2BOT Kids (roadmap #21);
// drafts are Blockly JSON, and a draft saved by the old tap editor is
// converted on load (lib/kids/code-lab/blockly-format.ts).

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { capabilitiesOf, CAPABILITY_NEEDS, loadDesign, ROBOT_CHANGED_EVENT, saveDesign, DEFAULT_DESIGN, type RobotDesign } from '@/lib/kids/robot-design'
import { BLOCK_INFO, countBlocks, toPython } from '@/lib/kids/code-lab/blocks'
import { initialState, parseArena, runMission, starsFor, type Frame, type RunResult } from '@/lib/kids/code-lab/interpreter'
import { changedParts, designWith, missingCaps } from '@/lib/kids/code-lab/parts'
import { programToWorkspace, readDraft, workspaceToProgram, writeDraft, type BWorkspace } from '@/lib/kids/code-lab/blockly-format'
import { useKidsReducedMotion } from '@/lib/kids/settings'
import { profileKey } from '@/lib/kids/profiles'
import type { Block, MissionPublic } from '@/lib/kids/code-lab/types'
import { completeCodeMission, getProgress } from '@/lib/kids-progress'
import { reportBestRun } from '@/lib/kids/universe/rewards'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { fireConfetti } from '@/components/kids/Confetti'
import BlockEditorClient from './BlockEditorClient'
import HintLadderClient, { type LadderStep, type WorkedExample } from '@/components/kids/galaxy/HintLadderClient'
import type { WinRule } from '@/lib/kids/code-lab/types'

function ArenaSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#111C32]">
      <div className="h-20 w-20 animate-pulse rounded-2xl bg-white/10" aria-hidden />
      <span className="sr-only">Loading the 3D arena…</span>
    </div>
  )
}
const Arena = dynamic(() => import('./ArenaClient'), { ssr: false, loading: ArenaSkeleton })

const SPEED_MS = [950, 680, 460, 300, 170]
const BLOCK_LABEL: Partial<Record<string, string>> = Object.fromEntries(Object.values(BLOCK_INFO).map((b) => [b.type, b.label]))

interface Props {
  mission: MissionPublic
  next: { id: string; title: string } | null
  previous: { id: string; title: string } | null
}

type Status =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'fail'; message: string }
  | { kind: 'progress'; message: string }
  | { kind: 'win'; stars: 1 | 2 | 3; added: number; hinted: boolean }

/** Per child (profileKey, a PROFILE_KEY_PREFIXES store in lib/kids/profiles.ts). */
const draftKey = (id: string) => profileKey(`r2bot_kids_codelab_draft_${id}`)

/** Hints cap a Code Lab finish at 2 stars (roadmap #26). */
const HINT_STAR_CAP = 2

/** The win rule in words, for step 1 of the hint ladder. */
function winWords(win: WinRule): string {
  const parts: string[] = []
  if (win.goal) parts.push('end on the 🏁 flag')
  if (win.gems) parts.push('collect every 💎 gem')
  if (win.deliver) parts.push('put every 📦 box on a drop zone')
  if (win.draw) parts.push('draw the exact shape with the pen')
  if (!parts.length) return ''
  const last = parts.pop()
  return `To win: ${parts.length ? `${parts.join(', ')} and ${last}` : last}.`
}

export default function MissionClient({ mission, next, previous }: Props) {
  const [design, setDesign] = useState<RobotDesign>(DEFAULT_DESIGN)
  const [program, setProgram] = useState<Block[]>([])
  const [arenaIdx, setArenaIdx] = useState(0)
  const [frame, setFrame] = useState<Frame>(() => ({ blockId: null, step: 0, state: initialState(parseArena(mission.arenas[0])), event: 'start' }))
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [speed, setSpeed] = useState(2)
  const [fails, setFails] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(false)
  const hintsUsedRef = useRef(false)
  const [lastFail, setLastFail] = useState('')
  const [goalLit, setGoalLit] = useState(false)
  const [worked, setWorked] = useState<WorkedExample | null | 'loading'>('loading')
  const workedRequested = useRef(false)
  const editorRef = useRef<HTMLElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const [showPython, setShowPython] = useState(mission.band === 'engineers')
  const [errorId, setErrorId] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [bestStars, setBestStars] = useState(0)
  const [addedParts, setAddedParts] = useState<string[] | null>(null)
  const [loaded, setLoaded] = useState<{ workspace: BWorkspace; key: string } | null>(null)
  const reducedMotion = useKidsReducedMotion()
  const scrollBehavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'

  const timer = useRef<number | null>(null)
  const trace = useRef<{ results: RunResult[]; arena: number; frame: number; won: boolean } | null>(null)
  const speedRef = useRef(speed)
  speedRef.current = speed

  // Load robot, draft and progress.
  useEffect(() => {
    const refresh = () => setDesign(loadDesign())
    refresh()
    window.addEventListener(ROBOT_CHANGED_EVENT, refresh)
    let workspace: BWorkspace = programToWorkspace([])
    try {
      const draft = readDraft(window.localStorage.getItem(draftKey(mission.id)))
      if (draft) {
        workspace = draft.workspace
        // A program from the old tap editor: store it in the new format straight away.
        if (draft.migrated) window.localStorage.setItem(draftKey(mission.id), writeDraft(workspace))
      }
    } catch {
      /* no draft, or storage blocked */
    }
    setProgram(workspaceToProgram(workspace))
    setLoaded({ workspace, key: `${mission.id}:${Date.now().toString(36)}` })
    const p = getProgress()
    setBestStars(p.codeMissions[mission.id] ?? 0)
    if (previous && !p.codeMissions[previous.id]) setLocked(true)
    if (p.band === 'engineers') setShowPython(true)
    return () => window.removeEventListener(ROBOT_CHANGED_EVENT, refresh)
  }, [mission.id, previous])

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  function stopTimer() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const caps = useMemo(() => capabilitiesOf(design), [design])
  const missing = missingCaps(design, mission.needs)
  const blockCount = countBlocks(program)

  const showArena = useCallback(
    (i: number) => {
      setArenaIdx(i)
      setFrame({ blockId: null, step: 0, state: initialState(parseArena(mission.arenas[i])), event: 'start' })
    },
    [mission.arenas],
  )

  const reset = () => {
    stopTimer()
    trace.current = null
    setErrorId(null)
    setStatus({ kind: 'idle' })
    showArena(0)
  }

  const finishArena = (t: NonNullable<typeof trace.current>): 'continue' | 'done' => {
    const r = t.results[t.arena]
    if (!r.won) {
      setErrorId(r.errorBlockId)
      setStatus({ kind: 'fail', message: r.message })
      setLastFail(r.message)
      setFails((f) => f + 1)
      playSound('wrong')
      trace.current = null
      return 'done'
    }
    if (t.arena < t.results.length - 1) {
      playSound('correct')
      setStatus({ kind: 'progress', message: `✓ It works on map ${t.arena + 1}! Now the same program on map ${t.arena + 2}…` })
      t.arena += 1
      t.frame = 0
      return 'continue'
    }
    // Every arena won.
    const hinted = hintsUsedRef.current
    const unhinted = starsFor(blockCount, mission.budget, false)
    const stars: 1 | 2 | 3 = hinted ? (Math.min(HINT_STAR_CAP, unhinted) as 1 | 2) : unhinted
    const { starsAdded, progress } = completeCodeMission(mission.id, stars)
    // `hintsUsed` rides along for rewards.ts / learning telemetry (#76); the cap is applied above.
    const report: Parameters<typeof reportBestRun>[0] = { kind: 'challenge', id: `codelab-${mission.id}`, stars, score: stars, hintsUsed: hinted }
    reportBestRun(report)
    setBestStars(progress.codeMissions[mission.id] ?? stars)
    setStatus({ kind: 'win', stars, added: starsAdded, hinted })
    playSound('levelup')
    fireConfetti({ count: 60 })
    trace.current = null
    return 'done'
  }

  const prepare = () => {
    primeAudio()
    setErrorId(null)
    const res = runMission(program, mission, caps)
    // runMission stops at the first failing arena — exactly what we animate.
    trace.current = { results: res.results, arena: 0, frame: 0, won: res.won }
    showArena(0)
  }

  const tick = () => {
    const t = trace.current
    if (!t) return
    const frames = t.results[t.arena].frames
    t.frame += 1
    if (t.frame < frames.length) {
      setFrame(frames[t.frame])
      const f = frames[t.frame]
      if (f.event === 'gem') playSound('star')
      else if (f.event === 'bonk' || f.event === 'stuck' || f.event === 'dark' || f.event === 'oops') playSound('wrong')
      else if (f.event === 'pickup' || f.event === 'drop' || f.event === 'say') playSound('click')
      timer.current = window.setTimeout(tick, SPEED_MS[speedRef.current - 1] ?? 460)
      return
    }
    const outcome = finishArena(t)
    if (outcome === 'continue') {
      timer.current = window.setTimeout(() => {
        // The program was edited (or reset) during the pause between maps.
        if (trace.current !== t) {
          timer.current = null
          return
        }
        showArena(t.arena)
        setStatus({ kind: 'running' })
        timer.current = window.setTimeout(tick, 600)
      }, 1400)
    } else {
      timer.current = null
    }
  }

  const runAll = () => {
    stopTimer()
    prepare()
    setStatus({ kind: 'running' })
    timer.current = window.setTimeout(tick, 350)
  }

  const step = () => {
    stopTimer()
    if (!trace.current) {
      prepare()
      setStatus({ kind: 'progress', message: 'Step mode: tap “Step” to run one block at a time.' })
      return
    }
    const t = trace.current
    // Step pressed in the pause after a map passed: show the next map first,
    // so its frames never play over the previous map's layout.
    if (t.arena !== arenaIdx) {
      showArena(t.arena)
      return
    }
    const frames = t.results[t.arena].frames
    if (t.frame + 1 < frames.length) {
      t.frame += 1
      setFrame(frames[t.frame])
    } else {
      const outcome = finishArena(t)
      if (outcome === 'continue') showArena(t.arena)
    }
  }

  const addParts = () => {
    const nextDesign = designWith(design, mission.needs)
    if (!nextDesign) return
    const names = changedParts(design, nextDesign)
    saveDesign(nextDesign)
    setDesign(nextDesign)
    setAddedParts(names)
    playSound('unlock')
  }

  const running = status.kind === 'running'
  const python = toPython(program)
  const goalText = [mission.task, winWords(mission.win), mission.mustUse?.length ? `Use the ${mission.mustUse.map((t) => `“${BLOCK_LABEL[t] ?? t}”`).join(' and ')} block${mission.mustUse.length > 1 ? 's' : ''}.` : ''].filter(Boolean).join(' ')
  // The last written hint spells the answer out; "Spark shows me" (a twin) replaces it.
  const clues = [lastFail, ...mission.hints.slice(0, Math.max(1, mission.hints.length - 1))].filter(Boolean)

  const onHintStep = (step: LadderStep) => {
    hintsUsedRef.current = true
    setHintsUsed(true)
    if (step === 1) {
      setGoalLit(true)
      requestAnimationFrame(() => arenaRef.current?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior }))
    }
    if (step === 3 && !workedRequested.current) {
      workedRequested.current = true
      import('./worked-twin')
        .then((m) => setWorked(m.codeLabWorked(mission.id)))
        .catch(() => setWorked(null))
    }
  }

  const onYourTurn = () => {
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior })
      editorRef.current?.focus({ preventScroll: true })
    })
  }
  const activeId = running || trace.current ? frame.blockId : null

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      {locked && (
        <p className="mb-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-200">
          🔒 This mission unlocks after{' '}
          <Link className="font-bold text-amber-300 underline" href={`/kids/code-lab/${previous?.id ?? ''}`}>
            {previous?.title}
          </Link>
          . You can still have a go!
        </p>
      )}

      {missing.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4" role="alert">
          <p className="font-black">🔧 {design.name} is missing a part for this mission.</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {missing.map((c) => (
              <li key={c}>It needs {CAPABILITY_NEEDS[c]}.</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={addParts} className="min-h-[48px] rounded-2xl bg-amber-500 px-5 font-black text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white">
              ➕ Add the part
            </button>
            <Link href="/kids/workshop" className="inline-flex min-h-[48px] items-center rounded-2xl bg-white/10 px-5 font-bold">
              Choose it myself in the Workshop
            </Link>
          </div>
        </div>
      )}
      {addedParts && addedParts.length > 0 && missing.length === 0 && (
        <p role="status" className="mb-4 rounded-2xl bg-emerald-400/15 p-3 font-bold text-emerald-100">
          ✅ Added {addedParts.join(' and ')} to {design.name}. Your Workshop robot is updated too!
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Arena + run controls ── */}
        <section aria-label="Arena" className="py-0">
          {mission.arenas.length > 1 && (
            <div className="mb-2 flex gap-2" role="group" aria-label="Maps">
              {mission.arenas.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={running}
                  aria-pressed={arenaIdx === i}
                  onClick={() => {
                    stopTimer()
                    trace.current = null
                    setStatus({ kind: 'idle' })
                    showArena(i)
                  }}
                  className={`min-h-[44px] rounded-xl px-4 text-sm font-black ${arenaIdx === i ? 'bg-amber-500 text-black' : 'bg-white/10'}`}
                >
                  Map {i + 1}
                </button>
              ))}
              <span className="self-center text-xs text-slate-300">One program must solve every map.</span>
            </div>
          )}
          {goalLit && (
            <p className="mb-2 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-3 text-[17px] font-bold text-[#EEF2F8]" data-testid="codelab-goal">
              <span className="mr-1 font-display text-xs uppercase tracking-wider text-amber-300">Your goal</span> {goalText}
            </p>
          )}
          <div
            ref={arenaRef}
            className={`relative aspect-[4/3] w-full scroll-mt-24 overflow-hidden rounded-3xl border bg-[#111C32] transition-shadow duration-300 ${goalLit ? 'border-amber-400 shadow-[0_0_0_4px_rgba(252,104,24,.35)]' : 'border-white/10'}`}
          >
            <Arena
              arena={mission.arenas[arenaIdx]}
              design={design}
              state={frame.state}
              event={frame.event}
              durationMs={SPEED_MS[speed - 1] ?? 460}
              label={`Map ${arenaIdx + 1}: ${mission.task}`}
            />
            {frame.state.said && (
              <p className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-lg font-black text-black shadow-xl">💬 {frame.state.said}</p>
            )}
            {frame.step > 0 && (
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-bold">Step {frame.step}</p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runAll}
              disabled={running || program.length === 0}
              className="min-h-[52px] rounded-2xl bg-emerald-400 px-6 text-lg font-black text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white disabled:opacity-50"
            >
              ▶ Run
            </button>
            <button type="button" onClick={step} disabled={running || program.length === 0} className="min-h-[52px] rounded-2xl bg-sky-700 px-4 font-black text-white disabled:opacity-50">
              ⏭ Step
            </button>
            <button type="button" onClick={reset} className="min-h-[52px] rounded-2xl bg-white/10 px-4 font-bold">
              ↺ Reset
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm font-bold">
              🐢
              <input
                type="range"
                min={1}
                max={5}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                aria-label="Speed"
                className="h-11 w-28 accent-amber-500"
              />
              🐇
            </label>
          </div>

          <div aria-live="polite" className="mt-3 min-h-[56px]">
            {status.kind === 'fail' && <p className="rounded-2xl bg-rose-500/15 p-3 font-bold text-rose-100">🤖 {status.message}</p>}
            {status.kind === 'progress' && <p className="rounded-2xl bg-sky-500/15 p-3 font-bold text-sky-100">{status.message}</p>}
            {status.kind === 'running' && <p className="rounded-2xl bg-white/5 p-3 text-slate-200">Watch the glowing block — that is the instruction your robot is doing now.</p>}
            {status.kind === 'win' && (
              <div className="rounded-2xl bg-emerald-400/15 p-4">
                <p className="text-2xl font-black">
                  <span aria-label={`${status.stars} out of 3 stars`}>{'⭐'.repeat(status.stars)}{'☆'.repeat(3 - status.stars)}</span> Mission complete!
                </p>
                <p className="mt-1 text-sm text-emerald-100">
                  {status.stars === 3
                    ? `Perfect — you solved it in ${blockCount} ${blockCount === 1 ? "block" : "blocks"}.`
                    : status.stars === 2
                      ? `Solved! Can you do it in ${mission.budget} ${mission.budget === 1 ? 'block' : 'blocks'} or fewer for three stars?`
                      : 'You kept going and solved it! Try it in fewer blocks for more stars.'}
                  {status.hinted && ' Solved with Spark’s help: hints keep it to 2 stars at most. Play again without hints to aim for 3.'}
                  {status.added > 0 ? ` +${status.added} ⭐ added.` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {next ? (
                    <Link href={`/kids/code-lab/${next.id}`} className="inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-5 font-black text-black">
                      Next: {next.title} →
                    </Link>
                  ) : (
                    <Link href="/kids/code-lab" className="inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-5 font-black text-black">
                      Back to all missions →
                    </Link>
                  )}
                  <button type="button" onClick={reset} className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-bold">
                    Play again
                  </button>
                </div>
              </div>
            )}
          </div>
          {status.kind !== 'win' && (
            <div className="mt-3">
              <HintLadderClient
                available={fails > 0}
                goal={goalText}
                clues={clues}
                worked={worked}
                onStep={onHintStep}
                onYourTurn={onYourTurn}
                resetKey={mission.id}
              />
            </div>
          )}
          {hintsUsed && status.kind !== 'win' && <p className="mt-2 text-sm text-amber-200">Hint used · up to 2 ⭐ this time</p>}
          {bestStars > 0 && status.kind !== 'win' && <p className="mt-2 text-sm text-slate-300">Your best: {'⭐'.repeat(bestStars)}</p>}
        </section>

        {/* ── Editor ── */}
        <section ref={editorRef} tabIndex={-1} aria-label="Code editor" className="scroll-mt-24 py-0 focus:outline-none">
          {loaded ? (
            <BlockEditorClient
              initialWorkspace={loaded.workspace}
              resetKey={loaded.key}
              band={mission.band}
              onChange={(p, workspace) => {
                setProgram(p)
                // Save the draft (Blockly JSON) as the child edits.
                try {
                  window.localStorage.setItem(draftKey(mission.id), writeDraft(workspace))
                } catch {
                  /* storage blocked */
                }
                if (trace.current && !running) {
                  // Cancel a queued "next map" timer too, or it would set the
                  // status to running with no trace and lock the editor.
                  stopTimer()
                  trace.current = null
                  showArena(arenaIdx)
                  if (status.kind === 'progress') setStatus({ kind: 'idle' })
                }
              }}
              palette={mission.palette}
              caps={caps}
              budget={mission.budget}
              activeId={activeId}
              errorId={errorId}
              disabled={running}
            />
          ) : (
            <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" aria-hidden />
          )}
          <div className="mt-3 rounded-2xl bg-black/30 p-3">
            <button
              type="button"
              aria-expanded={showPython}
              onClick={() => setShowPython((v) => !v)}
              className="min-h-[44px] text-sm font-black text-amber-200"
            >
              🐍 {showPython ? 'Hide' : 'Show'} the Python version
            </button>
            {showPython && (
              <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0A1120] p-3 text-sm leading-relaxed text-emerald-200">
                <code>{python}</code>
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
