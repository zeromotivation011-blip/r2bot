'use client'

// components/kids/games/safety-inspector/SafetyInspectorGameClient.tsx
// Robot Safety Inspector — the playable game (loaded with next/dynamic, ssr:false).
//
// The child inspects a scene object by object, decides hazard or safe,
// classifies each hazard with the six-question Harm Check, (Legend) rates it on
// the likelihood × severity matrix, and chooses a fix. "Run the scene" then
// plays each moment with and without protection and simulates a year of
// operation from the model in ./model.ts. The debrief explains why.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { Glyph } from '@/components/kids/activities/templates/spot-in-scene/glyphs'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { HARM_CHECK, harmQ, type HarmCat } from './harm'
import { SCENE_H, SCENE_W, TIER_SCENES, type Fix, type Hazard, type Inspectable } from './scenes'
import {
  BAND_COLOR,
  CATS,
  LIKELIHOOD_WORDS,
  SEVERITY_WORDS,
  acceptance,
  band,
  bestFix,
  evaluate,
  hazards,
  ratingOk,
  reduction,
  simulateYear,
  speedVerdict,
  type Evaluation,
} from './model'
import { SceneArt } from './SceneArt'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

type Phase = 'inspect' | 'speed' | 'defend' | 'run' | 'debrief'
type Judge = 'hazard' | 'safe'
type Note = { tone: 'good' | 'warn' | 'info'; text: string } | null

/** Seconds per "run the scene" moment: the actor moves for MOVE s, then the outcome holds. */
const MOMENT = 2.2
const MOVE = 1.3

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function fixBand(f: Fix | undefined): 'green' | 'amber' | 'red' {
  if (!f) return 'red'
  return band(f.l * f.s)
}

export default function SafetyInspectorGameClient({ tier: rawTier, onFinish }: Props) {
  const tier = Math.max(0, Math.min(3, rawTier))
  const scene = TIER_SCENES[tier]
  const hs = useMemo(() => hazards(scene), [scene])
  const showCls = tier >= 1
  const showRate = tier === 3
  const showMoney = tier >= 2
  const reduced = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('inspect')
  const [sel, setSel] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Record<string, Judge>>({})
  const [mistakes, setMistakes] = useState(0)
  const [cls, setCls] = useState<Record<string, { done: boolean; first: boolean }>>({})
  const [rates, setRates] = useState<Record<string, { l: number; s: number; ok: boolean }>>({})
  const [draft, setDraft] = useState<{ l: number; s: number }>({ l: 0, s: 0 })
  const [fixes, setFixes] = useState<Record<string, string>>({})
  const [note, setNote] = useState<Note>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [speed, setSpeed] = useState(scene.speed?.max ?? 1)
  const [speedLocked, setSpeedLocked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [qIndex, setQIndex] = useState(0)
  const [runT, setRunT] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const ev = useMemo(() => evaluate(scene, fixes), [scene, fixes])
  const evNone = useMemo(() => evaluate(scene, {}), [scene])
  const found = hs.filter((h) => resolved[h.id])
  const selected: Inspectable | undefined = scene.objects.find((o) => o.id === sel)

  const stepOf = useCallback(
    (h: Hazard): 'judge' | 'classify' | 'rate' | 'fix' => {
      if (!resolved[h.id]) return 'judge'
      if (showCls && !cls[h.id]?.done) return 'classify'
      if (showRate && !rates[h.id]) return 'rate'
      return 'fix'
    },
    [resolved, cls, rates, showCls, showRate],
  )

  const readyToRun = hs.every((h) => resolved[h.id] && stepOf(h) === 'fix' && fixes[h.id])

  // Scroll the panel into view on small screens when something is selected.
  // Going back to the scene scrolls the scene back into view.
  const hadSel = useRef(false)
  useEffect(() => {
    if (!panelRef.current || window.innerWidth >= 1024) {
      hadSel.current = !!sel
      return
    }
    const behavior = reduced ? 'auto' : 'smooth'
    if (sel) panelRef.current.scrollIntoView({ behavior, block: 'nearest' })
    else if (hadSel.current) panelRef.current.parentElement?.scrollIntoView({ behavior, block: 'start' })
    hadSel.current = !!sel
  }, [sel, reduced])

  const select = useCallback(
    (id: string | null) => {
      primeAudio()
      if (phase !== 'inspect') return
      setSel(id)
      setNote(null)
      setDraft({ l: 0, s: 0 })
      if (id) playSound('click')
    },
    [phase],
  )

  const judge = (o: Inspectable, j: Judge) => {
    const right = (o.kind === 'hazard') === (j === 'hazard')
    if (o.kind === 'hazard') {
      setNote(right ? { tone: 'good', text: `Hazard found! ${o.harm}` } : { tone: 'warn', text: `Look again — this one is a hazard. ${o.harm}` })
    } else {
      setNote(right ? { tone: 'good', text: `Good call — that is safe. ${o.why}` } : { tone: 'warn', text: `Not a hazard: it is a safety feature. ${o.why}` })
    }
    if (!right) setMistakes((m) => m + 1)
    playSound(right ? 'correct' : 'wrong')
    setResolved((r) => ({ ...r, [o.id]: o.kind === 'hazard' ? 'hazard' : 'safe' }))
    if (hint === o.id) setHint(null)
  }

  const classify = (h: Hazard, c: HarmCat) => {
    const prev = cls[h.id]
    if (c === h.cat) {
      playSound('correct')
      setCls((x) => ({ ...x, [h.id]: { done: true, first: prev ? prev.first : true } }))
      setNote({ tone: 'good', text: `Yes — question ${harmQ(c).n}: ${harmQ(c).question}` })
    } else {
      playSound('wrong')
      setCls((x) => ({ ...x, [h.id]: { done: false, first: false } }))
      setNote({ tone: 'warn', text: `“${harmQ(c).short}” is not the main worry here. Read what goes wrong again — which question does it answer?` })
    }
  }

  const rate = (h: Hazard) => {
    if (!draft.l || !draft.s) return
    const ok = ratingOk(h, draft.l, draft.s)
    playSound(ok ? 'correct' : 'wrong')
    setRates((r) => ({ ...r, [h.id]: { l: draft.l, s: draft.s, ok } }))
    setNote({
      tone: ok ? 'good' : 'warn',
      text: `${ok ? 'Close to the expert.' : 'The expert rated it differently.'} Expert: ${LIKELIHOOD_WORDS[h.l]} (${h.l}) × ${SEVERITY_WORDS[h.s]} (${h.s}) = ${h.l * h.s}. ${h.rateWhy ?? ''}`,
    })
  }

  const chooseFix = (h: Hazard, f: Fix) => {
    playSound('click')
    setFixes((x) => ({ ...x, [h.id]: f.id }))
    if (showMoney && f.creates) {
      setNote({ tone: 'warn', text: `Watch out: this fix creates a new ${harmQ(f.creates.cat).name} hazard — “${f.creates.label}” (risk ${f.creates.l * f.creates.s}).` })
    } else {
      setNote({ tone: 'info', text: showMoney ? `Fix chosen: risk ${h.l * h.s} → ${f.l * f.s}.` : 'Fix chosen. You will see if it works when you run the scene.' }
      )
    }
  }

  const giveHint = () => {
    const next = hs.find((h) => !resolved[h.id])
    if (!next) return
    setHint(next.id)
    setHintsUsed((n) => n + 1)
    setNote({ tone: 'info', text: next.hint ?? 'Look at the glowing ring.' })
    setSel(null)
  }

  // ── Run the scene ────────────────────────────────────────────────────────
  const runTotal = hs.length * MOMENT + 0.5
  useEffect(() => {
    if (phase !== 'run') return
    if (reduced) {
      setRunT(runTotal)
      return
    }
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      let done = false
      setRunT((t) => {
        const n = t + dt
        if (n >= runTotal) done = true
        return Math.min(runTotal, n)
      })
      if (!done) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, reduced, runTotal])

  const runDone = phase === 'run' && runT >= runTotal - 1e-6
  useEffect(() => {
    if (runDone) playSound('star')
  }, [runDone])

  const startRun = () => {
    primeAudio()
    setSel(null)
    setNote(null)
    setRunT(0)
    setPhase('run')
  }

  const toNext = () => {
    if (tier === 3) {
      setSel(null)
      setNote(null)
      setPhase('speed')
    } else startRun()
  }

  // ── Grading ──────────────────────────────────────────────────────────────
  const clsFirst = hs.filter((h) => cls[h.id]?.first).length
  const ratesOk = hs.filter((h) => rates[h.id]?.ok).length
  const defendOk = (scene.defend ?? []).filter((q) => q.options.find((o) => o.id === answers[q.id])?.ok).length
  const speedRes = scene.speed && speedLocked !== null ? speedVerdict(speedLocked, scene.speed) : null
  const verdict = acceptance(scene, ev, tier)

  const result = useMemo((): RoundResult => {
    const red = reduction(ev)
    let stars = 0
    let message = ''
    if (tier === 0) {
      const b = ev.bestCount
      stars = b === hs.length && mistakes <= 2 ? 3 : b >= 3 ? 2 : b >= 2 ? 1 : 0
      message =
        stars > 0
          ? `You stopped ${b} of ${hs.length} dangers with a real fix. Guards, light curtains and stop buttons work every time — signs and “be careful” do not.`
          : 'Most dangers were still there when the factory ran. A warning is not a fix: choose things that stop the danger by themselves.'
    } else if (tier === 1) {
      const b = ev.bestCount
      stars = b === hs.length && clsFirst >= 5 && mistakes <= 2 ? 3 : b >= 5 && clsFirst >= 4 ? 2 : b >= 4 && clsFirst >= 3 ? 1 : 0
      message =
        stars > 0
          ? `Harm Check complete: ${clsFirst} of ${hs.length} hazards named first time, ${b} best fixes. Harm is not only about bodies — data, fairness, control, people and the planet count too.`
          : `Not yet safe: you need at least 4 best fixes and 3 hazards named first time (you had ${b} and ${clsFirst}). Ask all six questions of every device.`
    } else if (tier === 2) {
      stars = !verdict.pass ? 0 : ev.total <= 29 && clsFirst >= 5 ? 3 : ev.total <= 34 ? 2 : 1
      message = verdict.pass
        ? `The city says yes! Total risk ${ev.total} (from ${ev.before}) for ${ev.cost} coins. You spent where the risk was biggest and avoided fixes that move harm somewhere else.`
        : `The city says not yet: ${verdict.problems[0]} Spend coins on the biggest risks, and check whether a fix creates a new hazard.`
    } else {
      const okSpeed = !!speedRes && speedRes.safe && speedRes.timely
      const pass = verdict.pass && okSpeed && defendOk >= 2
      stars = !pass ? 0 : ratesOk >= 5 && defendOk === 3 && clsFirst >= 5 ? 3 : ratesOk >= 4 && defendOk === 3 ? 2 : 1
      message = pass
        ? `Safety case approved: every hazard out of the red, a top speed of ${speedLocked?.toFixed(1)} m/s that stops inside the field, ${ratesOk} of ${hs.length} ratings close to the expert and ${defendOk} of 3 challenges answered.`
        : !verdict.pass
          ? `The board rejects the case: ${verdict.problems[0]}`
          : !okSpeed
            ? `The board rejects the case: at ${speedLocked?.toFixed(1)} m/s MediRun ${speedRes && !speedRes.safe ? 'cannot stop inside its protective field' : 'is too slow for the nurses'}.`
            : 'The board is not convinced: you answered fewer than 2 of the 3 challenges well. A safety case must be defended with reasons.'
    }
    const badges: string[] = []
    if (tier >= 1 && stars >= 2) badges.push('decision-maker')
    if (tier >= 2 && stars >= 2) badges.push('right-tool')
    return { stars, score: red, scoreLabel: '% of the risk removed', message, badges }
  }, [ev, tier, hs.length, mistakes, clsFirst, verdict, ratesOk, defendOk, speedRes, speedLocked])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-2">
        <SceneView
          tier={tier}
          ev={ev}
          phase={phase}
          resolved={resolved}
          cls={cls}
          sel={sel}
          focusId={focusId}
          hint={hint}
          fixes={fixes}
          runT={runT}
          onSelect={select}
          onFocus={setFocusId}
        />
        <HarmLegend />
      </div>

      <div ref={panelRef} className="flex min-h-[320px] flex-col gap-3 rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]" aria-live="polite">
        {phase === 'inspect' && !selected && (
          <Overview
            tier={tier}
            brief={scene.brief}
            place={scene.place}
            foundCount={found.length}
            total={hs.length}
            mistakes={mistakes}
            ev={ev}
            budget={scene.budget}
            limit={scene.limit}
            verdictProblems={verdict.problems}
            readyToRun={readyToRun}
            onHint={tier === 0 ? giveHint : undefined}
            hintsUsed={hintsUsed}
            onNext={toNext}
            note={note}
            pending={hs.filter((h) => resolved[h.id] && !(stepOf(h) === 'fix' && fixes[h.id])).map((h) => ({ id: h.id, label: h.label }))}
            onOpen={select}
          />
        )}

        {phase === 'inspect' && selected && (
          <ObjectPanel
            o={selected}
            tier={tier}
            step={selected.kind === 'hazard' ? stepOf(selected) : resolved[selected.id] ? 'fix' : 'judge'}
            resolved={resolved[selected.id]}
            classified={selected.kind === 'hazard' ? cls[selected.id] : undefined}
            rated={selected.kind === 'hazard' ? rates[selected.id] : undefined}
            draft={draft}
            setDraft={setDraft}
            fixId={fixes[selected.id]}
            note={note}
            showMoney={showMoney}
            onJudge={(j) => judge(selected, j)}
            onClassify={(c) => selected.kind === 'hazard' && classify(selected, c)}
            onRate={() => selected.kind === 'hazard' && rate(selected)}
            onFix={(f) => selected.kind === 'hazard' && chooseFix(selected, f)}
            onBack={() => select(null)}
          />
        )}

        {phase === 'speed' && scene.speed && (
          <SpeedPanel
            sc={scene.speed}
            v={speed}
            setV={setSpeed}
            onLock={() => {
              setSpeedLocked(speed)
              const r = speedVerdict(speed, scene.speed!)
              playSound(r.safe && r.timely ? 'correct' : 'wrong')
              setPhase('defend')
              setQIndex(0)
            }}
          />
        )}

        {phase === 'defend' && scene.defend && (
          <DefendPanel
            qs={scene.defend}
            index={qIndex}
            answers={answers}
            onAnswer={(qid, oid) => {
              if (answers[qid]) return
              const ok = scene.defend!.find((q) => q.id === qid)?.options.find((o) => o.id === oid)?.ok
              playSound(ok ? 'correct' : 'wrong')
              setAnswers((a) => ({ ...a, [qid]: oid }))
            }}
            onNext={() => {
              if (qIndex + 1 < (scene.defend?.length ?? 0)) setQIndex(qIndex + 1)
              else startRun()
            }}
          />
        )}

        {phase === 'run' && <RunPanel hs={hs} fixes={fixes} ev={ev} evNone={evNone} sceneId={scene.id} runT={runT} done={runDone} onDebrief={() => setPhase('debrief')} />}

        {phase === 'debrief' && (
          <Debrief
            tier={tier}
            hs={hs}
            fixes={fixes}
            cls={cls}
            rates={rates}
            ev={ev}
            verdictProblems={verdict.problems}
            speed={speedLocked}
            speedRes={speedRes}
            defendOk={defendOk}
            defendTotal={scene.defend?.length ?? 0}
            result={result}
            onFinish={() => onFinish(result)}
          />
        )}
      </div>
    </div>
  )
}

// ── Scene ──────────────────────────────────────────────────────────────────

interface SceneProps {
  tier: number
  ev: Evaluation
  phase: Phase
  resolved: Record<string, Judge>
  cls: Record<string, { done: boolean; first: boolean }>
  sel: string | null
  focusId: string | null
  hint: string | null
  fixes: Record<string, string>
  runT: number
  onSelect: (id: string | null) => void
  onFocus: (id: string | null) => void
}

function SceneView({ tier, phase, resolved, cls, sel, focusId, hint, fixes, runT, onSelect, onFocus }: SceneProps) {
  const scene = TIER_SCENES[tier]
  const hs = hazards(scene)
  const running = phase === 'run' || phase === 'debrief'
  const interactive = phase === 'inspect'

  const onKey = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(id)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120] shadow-[0_8px_24px_rgba(0,0,0,.45)]">
      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="block h-auto w-full select-none" role="group" aria-label={`${scene.name}: ${scene.place}. ${interactive ? 'Choose a thing to inspect.' : ''}`}>
        <SceneArt id={scene.id} />
        {scene.decor.map((d, i) => (
          <g key={i} opacity={0.95} aria-hidden>
            <Glyph icon={d.icon} x={d.x} y={d.y} size={d.size} />
          </g>
        ))}

        {scene.objects.map((o) => {
          const st = resolved[o.id]
          const r = Math.max(o.size / 2 + 1.2, 6.2)
          const isHaz = o.kind === 'hazard'
          const cat = isHaz ? harmQ(o.cat) : null
          const known = isHaz && st && (tier === 0 || cls[o.id]?.done)
          const ringColor = st === 'safe' ? '#22C55E' : st === 'hazard' ? (known && cat ? cat.color : '#FC6818') : 'rgba(255,255,255,0.55)'
          const isSel = sel === o.id
          const isFocus = focusId === o.id
          const statusText = st === 'safe' ? ', checked: safe' : st === 'hazard' ? ', hazard found' : ', not inspected yet'
          // During the run, outcome per hazard.
          let outcome: 'good' | 'amber' | 'bad' | null = null
          if (running && isHaz) {
            const i = hs.findIndex((h) => h.id === o.id)
            const t = runT - i * MOMENT
            if (t >= MOVE || phase === 'debrief') {
              const f = o.fixes.find((x) => x.id === fixes[o.id])
              const b = fixBand(f)
              outcome = b === 'green' ? 'good' : b === 'amber' ? 'amber' : 'bad'
            }
          }
          return (
            <g
              key={o.id}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : -1}
              aria-label={interactive ? `${o.label}${statusText}` : undefined}
              aria-pressed={interactive ? isSel : undefined}
              onClick={interactive ? () => onSelect(o.id) : undefined}
              onKeyDown={interactive ? (e) => onKey(e, o.id) : undefined}
              onFocus={() => onFocus(o.id)}
              onBlur={() => onFocus(null)}
              className={interactive ? 'cursor-pointer outline-none' : undefined}
            >
              <circle cx={o.x} cy={o.y} r={r} fill="transparent" />
              {hint === o.id && <circle cx={o.x} cy={o.y} r={r + 2.5} fill="none" stroke="#FF8A4C" strokeWidth="1.2" className="motion-safe:animate-ping" style={{ transformOrigin: `${o.x}px ${o.y}px` }} />}
              <circle
                cx={o.x}
                cy={o.y}
                r={r}
                fill={st === 'hazard' ? 'rgba(252,104,24,0.10)' : 'rgba(10,17,32,0.25)'}
                stroke={isSel || isFocus ? '#FFA878' : ringColor}
                strokeWidth={isSel || isFocus ? 1 : 0.5}
                strokeDasharray={st ? undefined : '1.6 1.2'}
              />
              <Glyph icon={o.icon} x={o.x} y={o.y} size={o.size} />
              {st === 'safe' && (
                <g>
                  <circle cx={o.x + r * 0.72} cy={o.y - r * 0.72} r={2.2} fill="#22C55E" />
                  <path d={`M${o.x + r * 0.72 - 1} ${o.y - r * 0.72} l0.8 0.9 l1.4 -1.6`} stroke="#0A1120" strokeWidth="0.6" fill="none" />
                </g>
              )}
              {st === 'hazard' && (
                <g>
                  <circle cx={o.x + r * 0.72} cy={o.y - r * 0.72} r={2.6} fill={known && cat ? cat.color : '#FC6818'} />
                  <text x={o.x + r * 0.72} y={o.y - r * 0.72 + 0.1} fontSize="2.8" textAnchor="middle" dominantBaseline="central">
                    {known && cat ? cat.icon : '!'}
                  </text>
                </g>
              )}
              {outcome && (
                <g>
                  <circle cx={o.x - r * 0.72} cy={o.y - r * 0.72} r={2.8} fill={outcome === 'good' ? '#22C55E' : outcome === 'amber' ? '#F59E0B' : '#EF4444'} stroke="#0A1120" strokeWidth="0.4" />
                  <text x={o.x - r * 0.72} y={o.y - r * 0.72 + 0.15} fontSize="3" fontWeight="900" fill="#0A1120" textAnchor="middle" dominantBaseline="central">
                    {outcome === 'good' ? '✓' : outcome === 'amber' ? '!' : '✕'}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* Run the scene: actors move in, one moment at a time. */}
        {running &&
          hs.map((h, i) => {
            const t = phase === 'debrief' ? MOVE : runT - i * MOMENT
            if (t < 0 || t > MOMENT + 0.4) return null
            const p = ease(clamp01(t / MOVE))
            const f = h.fixes.find((x) => x.id === fixes[h.id])
            const good = fixBand(f) === 'green'
            // A protected actor stops short; an unprotected one goes all the way in.
            const stopAt = good ? 0.72 : 1
            const k = Math.min(p, stopAt)
            const x = h.run.from[0] + (h.run.to[0] - h.run.from[0]) * k
            const y = h.run.from[1] + (h.run.to[1] - h.run.from[1]) * k
            const shake = !good && p >= 1 ? Math.sin(runT * 40) * 0.6 : 0
            return (
              <g key={h.id} aria-hidden>
                {p >= stopAt && (
                  <circle cx={h.x} cy={h.y} r={Math.max(h.size / 2 + 3, 8)} fill="none" stroke={good ? '#22C55E' : '#EF4444'} strokeWidth="0.9" opacity={0.85} />
                )}
                <Glyph icon={h.run.actor} x={x + shake} y={y} size={7} />
              </g>
            )
          })}
      </svg>
      {phase === 'run' && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-xl bg-[#0A1120]/85 px-3 py-1 text-sm font-bold text-white">
          ▶ Running the scene…
        </div>
      )}
    </div>
  )
}

function HarmLegend() {
  return (
    <ol className="hidden grid-cols-2 gap-1.5 sm:grid sm:grid-cols-3" aria-label="The Robot Harm Check">
      {HARM_CHECK.map((q) => (
        <li key={q.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111C32] px-2 py-1.5 text-[13px] leading-tight text-[#A7B0C0]">
          <span aria-hidden className="text-lg">{q.icon}</span>
          <span>
            <span className="font-display font-bold text-[#EEF2F8]">
              {q.n}. {q.name}
            </span>
            <br />
            {q.short}
          </span>
        </li>
      ))}
    </ol>
  )
}

// ── Panels ─────────────────────────────────────────────────────────────────

function NoteBox({ note }: { note: Note }) {
  if (!note) return null
  const cls =
    note.tone === 'good'
      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
      : note.tone === 'warn'
        ? 'border-amber-400/50 bg-amber-400/10 text-amber-100'
        : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-50'
  return <p className={`rounded-2xl border p-3 text-[15px] leading-snug ${cls}`}>{note.text}</p>
}

function Btn({ children, onClick, disabled, kind = 'primary', className = '' }: { children: ReactNode; onClick: () => void; disabled?: boolean; kind?: 'primary' | 'ghost'; className?: string }) {
  const base = 'min-h-[48px] rounded-2xl px-4 font-display text-[16px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40'
  const look = kind === 'primary' ? 'bg-amber-500 text-[#1A1103] hover:bg-amber-400' : 'border border-white/15 bg-white/5 text-[#EEF2F8] hover:bg-white/10'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${look} ${className}`}>
      {children}
    </button>
  )
}

function RiskBars({ ev, budget, limit, perCat }: { ev: Evaluation; budget?: number; limit?: number; perCat: boolean }) {
  const max = 25
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1120]/60 p-3">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-sm font-bold text-[#EEF2F8]">Risk by Harm Check question</p>
        {budget !== undefined && (
          <p className={`font-display text-sm font-bold ${ev.cost > budget ? 'text-rose-300' : 'text-amber-300'}`}>
            🪙 {ev.cost} / {budget}
          </p>
        )}
      </div>
      <ul className="mt-2 space-y-1.5">
        {CATS.map((c) => {
          const q = harmQ(c)
          const v = ev.byCat[c]
          const over = perCat && limit !== undefined && v > limit
          return (
            <li key={c} className="flex items-center gap-2 text-[13px]">
              <span aria-hidden className="w-5 text-center">{q.icon}</span>
              <span className="w-16 text-[#A7B0C0]">{q.name}</span>
              <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: BAND_COLOR[band(v)] }} />
                {perCat && limit !== undefined && <span className="absolute inset-y-0 w-0.5 bg-white/70" style={{ left: `${(limit / max) * 100}%` }} />}
              </span>
              <span className={`w-7 text-right font-display font-bold ${over ? 'text-rose-300' : 'text-[#EEF2F8]'}`}>{v}</span>
            </li>
          )
        })}
      </ul>
      {ev.items.some((i) => i.created) && (
        <p className="mt-2 text-[13px] text-amber-200">
          New hazards from fixes: {ev.items.filter((i) => i.created).map((i) => `${i.label} (${i.risk})`).join('; ')}
        </p>
      )}
      <p className="mt-2 text-[12px] text-[#6E7888]">Risk = likelihood × severity. Unfound hazards still count. {perCat && limit !== undefined ? `White line: the most allowed per question (${limit}).` : ''}</p>
    </div>
  )
}

interface OverviewProps {
  tier: number
  brief: string
  place: string
  foundCount: number
  total: number
  mistakes: number
  ev: Evaluation
  budget?: number
  limit?: number
  verdictProblems: string[]
  readyToRun: boolean
  onHint?: () => void
  hintsUsed: number
  onNext: () => void
  note: Note
  pending: { id: string; label: string }[]
  onOpen: (id: string) => void
}

function Overview(p: OverviewProps) {
  return (
    <>
      <div>
        <p className="text-[12px] font-bold uppercase tracking-wider text-emerald-300">{p.place}</p>
        <p className="mt-1 text-[16px] leading-snug text-[#EEF2F8]">{p.brief}</p>
      </div>
      <NoteBox note={p.note} />
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-sm font-bold text-[#A7B0C0]">
            <span>Hazards found</span>
            <span className="font-display text-[#EEF2F8]">
              {p.foundCount} / {p.total}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${(p.foundCount / p.total) * 100}%` }} />
          </div>
        </div>
        {p.onHint && (
          <Btn kind="ghost" onClick={p.onHint} disabled={p.foundCount >= p.total}>
            💡 Hint
          </Btn>
        )}
      </div>
      {p.pending.length > 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-100">
          <p className="font-bold">Still to finish:</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {p.pending.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => p.onOpen(x.id)} className="min-h-[44px] rounded-xl border border-amber-300/40 px-3 font-bold text-amber-100 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  {x.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.tier >= 2 && <RiskBars ev={p.ev} budget={p.budget} limit={p.limit} perCat={p.tier === 2} />}
      {p.tier >= 2 && p.readyToRun && p.verdictProblems.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-rose-200">
          {p.verdictProblems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {!p.readyToRun && p.foundCount === 0 && <p className="text-[15px] text-[#A7B0C0]">Tap anything in the scene (or Tab to it and press Enter) to inspect it.</p>}
      <Btn onClick={p.onNext} disabled={!p.readyToRun} className="mt-auto w-full">
        {p.tier === 3 ? 'Next: set the top speed →' : '▶ Run the scene'}
      </Btn>
      {!p.readyToRun && <p className="-mt-1 text-center text-[13px] text-[#6E7888]">Find every hazard and choose a fix for each to continue.</p>}
    </>
  )
}

interface ObjectPanelProps {
  o: Inspectable
  tier: number
  step: 'judge' | 'classify' | 'rate' | 'fix'
  resolved?: Judge
  classified?: { done: boolean; first: boolean }
  rated?: { l: number; s: number; ok: boolean }
  draft: { l: number; s: number }
  setDraft: (d: { l: number; s: number }) => void
  fixId?: string
  note: Note
  showMoney: boolean
  onJudge: (j: Judge) => void
  onClassify: (c: HarmCat) => void
  onRate: () => void
  onFix: (f: Fix) => void
  onBack: () => void
}

function ObjectPanel(p: ObjectPanelProps) {
  const { o } = p
  const h = o.kind === 'hazard' ? o : null
  return (
    <>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#19263F]">
          <svg viewBox="0 0 20 20" width="40" height="40" aria-hidden>
            <Glyph icon={o.icon} x={10} y={10} size={17} />
          </svg>
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-[#EEF2F8]">{o.label}</h2>
          {p.resolved === 'safe' && <p className="text-sm font-bold text-emerald-300">✓ Checked: safe</p>}
          {p.resolved === 'hazard' && h && (
            <p className="text-sm font-bold" style={{ color: p.tier === 0 || p.classified?.done ? harmQ(h.cat).color : '#FF8A4C' }}>
              ⚠ Hazard{p.tier === 0 || p.classified?.done ? ` · ${harmQ(h.cat).icon} ${harmQ(h.cat).name}` : ''}
            </p>
          )}
        </div>
      </div>
      <p className="text-[16px] leading-snug text-[#EEF2F8]">{o.observe}</p>
      <NoteBox note={p.note} />

      {p.step === 'judge' && !p.resolved && (
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={() => p.onJudge('hazard')}>⚠️ Hazard!</Btn>
          <Btn kind="ghost" onClick={() => p.onJudge('safe')}>
            ✅ Looks safe
          </Btn>
        </div>
      )}

      {h && p.step === 'classify' && (
        <div>
          <p className="mb-2 font-display font-bold text-[#EEF2F8]">Which Harm Check question does it fail?</p>
          <div className="grid grid-cols-2 gap-2">
            {HARM_CHECK.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => p.onClassify(q.id)}
                className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 text-left text-[14px] leading-tight text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
              >
                <span aria-hidden className="text-xl">{q.icon}</span>
                <span>
                  <b className="font-display">{q.name}</b>
                  <br />
                  <span className="text-[#A7B0C0]">{q.short}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {h && p.step === 'rate' && <RatePicker draft={p.draft} setDraft={p.setDraft} onRate={p.onRate} />}

      {h && p.step === 'fix' && (
        <div>
          {p.rated && (
            <p className="mb-2 text-sm text-[#A7B0C0]">
              Your rating: {p.rated.l} × {p.rated.s} = {p.rated.l * p.rated.s} {p.rated.ok ? '✓' : '(expert: ' + h.l + ' × ' + h.s + ')'}
            </p>
          )}
          <p className="mb-2 font-display font-bold text-[#EEF2F8]">{p.tier === 3 ? 'Choose a mitigation' : 'Choose the fix'}</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Fixes">
            {h.fixes.map((f) => {
              const on = p.fixId === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => p.onFix(f)}
                  className={`min-h-[52px] rounded-2xl border px-3 py-2 text-left text-[15px] leading-snug transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.98] ${on ? 'border-amber-400 bg-amber-400/15 text-[#EEF2F8]' : 'border-white/15 bg-white/5 text-[#EEF2F8] hover:bg-white/10'}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>{f.label}</span>
                    {p.showMoney && (
                      <span className="shrink-0 text-right font-display text-[13px] font-bold">
                        <span className="text-amber-300">🪙 {f.cost}</span>
                        <br />
                        <span style={{ color: BAND_COLOR[band(f.l * f.s)] }}>risk {f.l * f.s}</span>
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Btn kind="ghost" onClick={p.onBack} className="mt-auto">
        ← Back to the scene
      </Btn>
    </>
  )
}

function RatePicker({ draft, setDraft, onRate }: { draft: { l: number; s: number }; setDraft: (d: { l: number; s: number }) => void; onRate: () => void }) {
  const row = (label: string, words: string[], value: number, set: (n: number) => void) => (
    <div>
      <p className="mb-1 font-display text-sm font-bold text-[#EEF2F8]">{label}</p>
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => set(n)}
            className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border text-[11px] leading-tight focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${value === n ? 'border-amber-400 bg-amber-400/20 text-[#EEF2F8]' : 'border-white/15 bg-white/5 text-[#A7B0C0]'}`}
          >
            <span className="font-display text-base font-bold text-[#EEF2F8]">{n}</span>
            {words[n]}
          </button>
        ))}
      </div>
    </div>
  )
  const risk = draft.l * draft.s
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[#A7B0C0]">Rate it on the risk matrix, as an engineer would.</p>
      {row('Likelihood — how often could it happen?', LIKELIHOOD_WORDS, draft.l, (n) => setDraft({ ...draft, l: n }))}
      {row('Severity — how bad would it be?', SEVERITY_WORDS, draft.s, (n) => setDraft({ ...draft, s: n }))}
      <div className="flex items-center gap-3">
        <MiniMatrix l={draft.l} s={draft.s} />
        <p className="flex-1 text-sm text-[#A7B0C0]">
          {risk ? (
            <>
              Risk = {draft.l} × {draft.s} ={' '}
              <b className="font-display text-base" style={{ color: BAND_COLOR[band(risk)] }}>
                {risk}
              </b>
            </>
          ) : (
            'Pick both to see the risk.'
          )}
        </p>
      </div>
      <Btn onClick={onRate} disabled={!draft.l || !draft.s}>
        Rate it
      </Btn>
    </div>
  )
}

function MiniMatrix({ l, s }: { l: number; s: number }) {
  return (
    <svg viewBox="0 0 50 50" width="84" height="84" role="img" aria-label={l && s ? `Risk matrix: likelihood ${l}, severity ${s}` : 'Risk matrix'}>
      {[1, 2, 3, 4, 5].map((li) =>
        [1, 2, 3, 4, 5].map((si) => (
          <rect key={`${li}-${si}`} x={(si - 1) * 10} y={(5 - li) * 10} width="9.4" height="9.4" rx="1.5" fill={BAND_COLOR[band(li * si)]} opacity={li === l && si === s ? 1 : 0.28} />
        )),
      )}
      {l > 0 && s > 0 && <circle cx={(s - 1) * 10 + 4.7} cy={(5 - l) * 10 + 4.7} r="2.6" fill="#0A1120" />}
    </svg>
  )
}

function SpeedPanel({ sc, v, setV, onLock }: { sc: NonNullable<(typeof TIER_SCENES)[number]['speed']>; v: number; setV: (n: number) => void; onLock: () => void }) {
  const r = speedVerdict(v, sc)
  const maxD = 3
  return (
    <>
      <h2 className="font-display text-xl font-bold text-[#EEF2F8]">Speed check: how fast may MediRun go?</h2>
      <p className="text-[15px] leading-snug text-[#A7B0C0]">
        Its safety LiDAR brakes when anything enters a protective field <b className="text-[#EEF2F8]">{sc.fieldM.toFixed(1)} m</b> ahead. It must stop inside that field. Braking is gentle ({sc.decel} m/s²) so medicines don’t spill, and the system needs {sc.reactS} s to react. Nurses need a {sc.routeM} m delivery within {sc.maxRouteS / 60} minutes.
      </p>
      <label className="block">
        <span className="flex justify-between font-display font-bold text-[#EEF2F8]">
          <span>Top speed</span>
          <span>{v.toFixed(1)} m/s</span>
        </span>
        <input type="range" min={sc.min} max={sc.max} step={sc.step} value={v} onChange={(e) => setV(Math.round(Number(e.target.value) * 10) / 10)} className="mt-2 h-11 w-full accent-amber-500" aria-valuetext={`${v.toFixed(1)} metres per second`} />
      </label>
      <div className="rounded-2xl border border-white/10 bg-[#0A1120]/60 p-3 text-sm text-[#A7B0C0]">
        <p className="font-mono text-[13px] text-amber-200">
          d = v·t + v²/(2a) = {v.toFixed(1)}×{sc.reactS} + {v.toFixed(1)}²/(2×{sc.decel}) = {r.stop.toFixed(2)} m
        </p>
        <div className="relative mt-2 h-4 rounded-full bg-white/10" aria-hidden>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (r.stop / maxD) * 100)}%`, background: r.safe ? '#22C55E' : '#EF4444' }} />
          <div className="absolute -top-1 bottom-[-4px] w-0.5 bg-white" style={{ left: `${(sc.fieldM / maxD) * 100}%` }} />
        </div>
        <p className="mt-1 text-[12px]">Bar: stopping distance. White line: the protective field.</p>
        <p className={`mt-2 font-bold ${r.safe ? 'text-emerald-300' : 'text-rose-300'}`}>{r.safe ? `Stops in ${r.stop.toFixed(2)} m — inside the field.` : `Needs ${r.stop.toFixed(2)} m to stop — it would hit what it sees.`}</p>
        <p className={`font-bold ${r.timely ? 'text-emerald-300' : 'text-rose-300'}`}>
          Delivery takes {Math.round(r.time)} s ({(r.time / 60).toFixed(1)} min){r.timely ? ' — in time.' : ' — too slow for the nurses.'}
        </p>
      </div>
      <Btn onClick={onLock} className="mt-auto w-full">
        Lock in {v.toFixed(1)} m/s →
      </Btn>
    </>
  )
}

function DefendPanel({
  qs,
  index,
  answers,
  onAnswer,
  onNext,
}: {
  qs: NonNullable<(typeof TIER_SCENES)[number]['defend']>
  index: number
  answers: Record<string, string>
  onAnswer: (qid: string, oid: string) => void
  onNext: () => void
}) {
  const q = qs[index]
  const picked = q.options.find((o) => o.id === answers[q.id])
  return (
    <>
      <p className="text-[12px] font-bold uppercase tracking-wider text-emerald-300">
        Defend your safety case · {index + 1} of {qs.length}
      </p>
      <h2 className="font-display text-xl font-bold text-[#EEF2F8]">A board member asks:</h2>
      <p className="rounded-2xl bg-[#19263F] p-3 text-[16px] italic text-[#EEF2F8]">{q.challenge}</p>
      <div className="flex flex-col gap-2">
        {q.options.map((o) => {
          const on = picked?.id === o.id
          const tone = picked ? (o.ok ? 'border-emerald-400 bg-emerald-400/10' : on ? 'border-rose-400 bg-rose-400/10' : 'border-white/10 opacity-60') : 'border-white/15 bg-white/5 hover:bg-white/10'
          return (
            <button
              key={o.id}
              type="button"
              disabled={!!picked}
              onClick={() => onAnswer(q.id, o.id)}
              className={`min-h-[52px] rounded-2xl border px-3 py-2 text-left text-[15px] leading-snug text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${tone}`}
            >
              {o.text}
            </button>
          )
        })}
      </div>
      {picked && <NoteBox note={{ tone: picked.ok ? 'good' : 'warn', text: picked.reply }} />}
      <Btn onClick={onNext} disabled={!picked} className="mt-auto w-full">
        {index + 1 < qs.length ? 'Next challenge →' : '▶ Run a day at the hospital'}
      </Btn>
    </>
  )
}

function RunPanel({
  hs,
  fixes,
  ev,
  evNone,
  sceneId,
  runT,
  done,
  onDebrief,
}: {
  hs: Hazard[]
  fixes: Record<string, string>
  ev: Evaluation
  evNone: Evaluation
  sceneId: string
  runT: number
  done: boolean
  onDebrief: () => void
}) {
  const before = useMemo(() => simulateYear(sceneId, evNone.items), [sceneId, evNone])
  const after = useMemo(() => simulateYear(sceneId, ev.items), [sceneId, ev])
  const created = ev.items.filter((i) => i.created)
  const maxI = Math.max(1, before.incidents, after.incidents)
  return (
    <>
      <h2 className="font-display text-xl font-bold text-[#EEF2F8]">Running the scene</h2>
      <ol className="flex flex-col gap-1.5">
        {hs.map((h, i) => {
          const t = runT - i * MOMENT
          if (t < 0) return null
          const f = h.fixes.find((x) => x.id === fixes[h.id])
          const b = fixBand(f)
          const shown = t >= MOVE
          return (
            <li key={h.id} className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2 text-[14px] leading-snug text-[#EEF2F8]">
              <span aria-hidden>{harmQ(h.cat).icon}</span>
              <span>
                <b className="font-display">{h.label}: </b>
                {!shown ? '…' : b === 'green' ? <span className="text-emerald-200">{h.run.good}</span> : b === 'amber' ? <span className="text-amber-200">Safer, but still risky. {h.run.bad}</span> : <span className="text-rose-200">{h.run.bad}</span>}
              </span>
            </li>
          )
        })}
        {done &&
          created.map((c) => (
            <li key={c.id} className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[14px] text-amber-100">
              <span aria-hidden>{harmQ(c.cat).icon}</span>
              <span>
                <b className="font-display">New problem from a fix:</b> {c.label}.
              </span>
            </li>
          ))}
      </ol>
      {done && (
        <div className="rounded-2xl border border-white/10 bg-[#0A1120]/60 p-3">
          <p className="font-display font-bold text-[#EEF2F8]">One simulated year (365 days)</p>
          {[
            { label: 'With no fixes', r: before, color: '#EF4444' },
            { label: 'With your fixes', r: after, color: '#22C55E' },
          ].map((row) => (
            <div key={row.label} className="mt-2">
              <div className="flex justify-between text-[13px] text-[#A7B0C0]">
                <span>{row.label}</span>
                <span className="font-display font-bold text-[#EEF2F8]">
                  {row.r.incidents} incidents · {row.r.serious} serious
                </span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${(row.r.incidents / maxI) * 100}%`, background: row.color }} />
              </div>
            </div>
          ))}
          <p className="mt-2 text-[12px] text-[#6E7888]">
            Each day, every hazard has a chance of causing an incident that depends on its likelihood; severity 4–5 counts as serious. Average over many years: {before.expected} → {after.expected} incidents.
          </p>
        </div>
      )}
      <Btn onClick={onDebrief} disabled={!done} className="mt-auto w-full">
        See the debrief →
      </Btn>
    </>
  )
}

function Debrief({
  tier,
  hs,
  fixes,
  cls,
  rates,
  ev,
  verdictProblems,
  speed,
  speedRes,
  defendOk,
  defendTotal,
  result,
  onFinish,
}: {
  tier: number
  hs: Hazard[]
  fixes: Record<string, string>
  cls: Record<string, { done: boolean; first: boolean }>
  rates: Record<string, { l: number; s: number; ok: boolean }>
  ev: Evaluation
  verdictProblems: string[]
  speed: number | null
  speedRes: { safe: boolean; timely: boolean; stop: number } | null
  defendOk: number
  defendTotal: number
  result: RoundResult
  onFinish: () => void
}) {
  return (
    <>
      <h2 className="font-display text-xl font-bold text-[#EEF2F8]">Debrief: why it happened</h2>
      <p className="text-[15px] text-[#A7B0C0]">
        Risk {ev.before} → <b className="text-[#EEF2F8]">{ev.total}</b> ({reduction(ev)}% removed){tier >= 2 ? ` · ${ev.cost} coins spent` : ''}.
      </p>
      <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        {hs.map((h) => {
          const f = h.fixes.find((x) => x.id === fixes[h.id])
          const best = bestFix(h)
          const isBest = f?.id === best.id
          const q = harmQ(h.cat)
          const b = fixBand(f)
          return (
            <li key={h.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[14px] leading-snug text-[#EEF2F8]">
              <p className="flex items-center gap-2 font-display font-bold">
                <span className="rounded-full px-2 py-0.5 text-[12px] text-[#0A1120]" style={{ background: q.color }}>
                  {q.icon} {q.name}
                </span>
                {h.label}
              </p>
              <p className="mt-1">
                <span style={{ color: BAND_COLOR[b] }} className="font-bold">
                  {b === 'green' ? '✓' : b === 'amber' ? '!' : '✕'} {f?.label}
                </span>
              </p>
              <p className="mt-1 text-[#A7B0C0]">{f?.why}</p>
              {!isBest && tier < 2 && (
                <p className="mt-1 text-emerald-200">
                  Best fix: {best.label}. {best.why}
                </p>
              )}
              {tier >= 1 && cls[h.id] && !cls[h.id].first && <p className="mt-1 text-[12px] text-[#6E7888]">Named on a later try — it was question {q.n}: {q.question}</p>}
              {tier === 3 && rates[h.id] && (
                <p className="mt-1 text-[12px] text-[#6E7888]">
                  Your rating {rates[h.id].l}×{rates[h.id].s}, expert {h.l}×{h.s} {rates[h.id].ok ? '✓' : ''}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {tier >= 2 && verdictProblems.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-rose-200">
          {verdictProblems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {tier === 3 && speed !== null && speedRes && (
        <p className={`text-sm font-bold ${speedRes.safe && speedRes.timely ? 'text-emerald-300' : 'text-rose-300'}`}>
          Top speed {speed.toFixed(1)} m/s: stops in {speedRes.stop.toFixed(2)} m{speedRes.safe ? ' (inside the field)' : ' (outside the field!)'}
          {speedRes.timely ? '' : ', too slow for the nurses'}. Board challenges: {defendOk} of {defendTotal}.
        </p>
      )}
      <p className="rounded-2xl bg-[#19263F] p-3 text-[15px] text-[#EEF2F8]">{result.message}</p>
      <Btn onClick={onFinish} className="w-full">
        {result.stars > 0 ? 'See my stars ★' : 'See my result'}
      </Btn>
    </>
  )
}
