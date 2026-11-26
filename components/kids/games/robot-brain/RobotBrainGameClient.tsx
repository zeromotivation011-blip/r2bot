'use client'

// components/kids/games/robot-brain/RobotBrainGameClient.tsx
// Train the Robot Brain — the playable game (loaded with next/dynamic, ssr:false).
// The child draws labelled examples; ./brain turns drawings into features and
// classifies with k-nearest-neighbours; Sorta the sorter robot acts on every
// prediction in the depot scene. Scores come only from seeded test parcels.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import {
  evaluate,
  exampleName,
  explainMistake,
  featurize,
  inkLength,
  predict,
  similarity,
  train,
  trainingAccuracy,
  type Evaluation,
  type Example,
  type MistakeCause,
  type Representation,
  type TrainedBrain,
} from './brain'
import { augmentDrawing, generateDrawing, makeRng, SYMBOLS, VARIATION, type ClassId, type Drawing } from './symbols'
import { DEFAULT_REP, glyph, newId, starterData, tierTestSet, tierValidationSet, TIERS, type TierConfig } from './tiers'
import { DrawPadClient } from './DrawPadClient'
import { DrawingThumb, GridView } from './DrawingThumb'
import { SorterSceneClient, type SorterSceneHandle } from './SorterSceneClient'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

type Phase = 'train' | 'running' | 'debrief' | 'quiz'

interface LogRow {
  k: number
  rep: Representation
  n: number
  trainAcc: number
  valAcc: number
}

interface RunResult {
  kind: 'test' | 'exam'
  ev: Evaluation
  brain: TrainedBrain
}

/** Kept across rounds of the same tier, so "Try again" never throws away a child's drawings. */
const CACHE = new Map<number, { examples: Example[]; k: number; rep: Representation; log: LogRow[] }>()

const pct = (x: number) => Math.round(x * 100)
const K_CHOICES = [1, 3, 5, 7, 9]

function starsFor(acc: number, cfg: TierConfig): number {
  if (acc >= cfg.stars[2] && cfg.index < 3) return 3
  if (acc >= cfg.stars[1]) return 2
  if (acc >= cfg.stars[0]) return 1
  return 0
}

const PERFECT: string[] = [
  'Every arrow went the right way: your examples showed Sorta that the pointy end decides left or right.',
  'Not one mistake on drawings by strangers: your examples covered the ways people draw, so the brain generalised.',
  'You fixed the data — correct labels and enough of every class — so every vote counted fairly.',
  'Perfect on unseen, messy drawings: good features ignored where and how big things were drawn, and k smoothed out bad examples.',
]

const CAUSE_LESSON: Record<MistakeCause, string> = {
  mislabel: 'Some training examples had the WRONG label, and the robot copied that mistake. Find them in your data and delete or relabel them.',
  outvoted: 'Your data was lopsided: one label had far fewer examples, so it kept getting out-voted. Add more examples of the rare label.',
  position: 'Raw pixels only compare which squares have ink, so moved, small or tilted drawings look different. Try engineered features.',
  unfamiliar: 'Some test drawings looked unlike anything in your data. Add more varied examples: bigger, smaller, tilted, messier.',
  lookalike: 'Some test drawings were closer to the wrong examples. Draw more examples of the labels that got mixed up, in different styles.',
}

function summarize(run: RunResult, cfg: TierConfig): { headline: string; causes: { text: string; cause: MistakeCause; index: number; exampleId: number | null; also?: number[] }[] } {
  const wrong = run.ev.graded.map((g, index) => ({ g, index })).filter((x) => !x.g.correct)
  if (!wrong.length) return { headline: PERFECT[cfg.index], causes: [] }
  const causes = wrong.map(({ g, index }) => {
    const r = explainMistake(run.brain, g, glyph)
    const nb = g.pred.neighbours[0]
    return { ...r, index, exampleId: nb ? run.brain.examples[nb.index].id : null }
  })
  const tally = new Map<MistakeCause, number>()
  causes.forEach((c) => tally.set(c.cause, (tally.get(c.cause) ?? 0) + 1))
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
  // Most common mix-up, e.g. "→ read as ←"
  const pairs = new Map<string, number>()
  wrong.forEach(({ g }) => {
    const key = `${glyph(g.item.truth)} read as ${g.pred.label ? glyph(g.pred.label) : '?'}`
    pairs.set(key, (pairs.get(key) ?? 0) + 1)
  })
  const [pair, pn] = [...pairs.entries()].sort((a, b) => b[1] - a[1])[0]
  // Same reason for several parcels → one row ("Parcels 1, 2, 7: …").
  const grouped: typeof causes = []
  const others = new Map<string, number[]>()
  for (const c of causes) {
    const key = c.text.replace(/\(.*?\)/g, '')
    if (others.has(key)) others.get(key)!.push(c.index)
    else {
      others.set(key, [c.index])
      grouped.push(c)
    }
  }
  return {
    headline: `Most mistakes: ${pair} (${pn}×). ${CAUSE_LESSON[top]}`,
    causes: grouped.map((c) => ({ ...c, also: others.get(c.text.replace(/\(.*?\)/g, ''))!.slice(1) })),
  }
}

function ConfusionMatrix({ ev, classes }: { ev: Evaluation; classes: ClassId[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-center font-display text-sm">
        <caption className="pb-1 text-left text-xs font-bold text-white/60">Confusion matrix — rows: what it really was · columns: what the robot said</caption>
        <thead>
          <tr>
            <th className="w-10" />
            {classes.map((c) => (
              <th key={c} scope="col" className="w-11 text-lg" style={{ color: SYMBOLS[c].color }}>
                {SYMBOLS[c].glyph}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map((r, i) => {
            const rowTotal = ev.matrix[i].reduce((a, b) => a + b, 0) || 1
            return (
              <tr key={r}>
                <th scope="row" className="text-lg" style={{ color: SYMBOLS[r].color }}>
                  {SYMBOLS[r].glyph}
                </th>
                {classes.map((c, j) => {
                  const v = ev.matrix[i][j]
                  const a = v / rowTotal
                  const diag = i === j
                  return (
                    <td
                      key={c}
                      className={`h-10 w-11 rounded-lg font-black ${v ? 'text-white' : 'text-white/30'}`}
                      style={{ background: v ? (diag ? `rgba(34,197,94,${0.25 + a * 0.6})` : `rgba(239,68,68,${0.3 + a * 0.6})`) : 'rgba(255,255,255,0.04)' }}
                    >
                      {v}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const QUIZ = {
  q: 'With raw pixels and k = 1, a brain can score 100% on its own training drawings but about 55% on new ones. Why?',
  options: [
    'The training set was too big, so the robot got confused.',
    'It memorised its exact training drawings — positions, sizes, wobbles and wrong labels — instead of learning the shape. That is overfitting.',
    'The test was unfair: 100% on training data proves the brain is perfect.',
  ],
  answer: 1,
  explain:
    'With k = 1 every training drawing is its own nearest neighbour, so training accuracy is always 100% — it measures memory, not understanding. Only unseen data tells you how a model will really do. That gap is overfitting; more varied data, better features and a larger k all shrink it.',
}

export default function RobotBrainGameClient({ tier, onFinish }: Props) {
  const cfg = TIERS[Math.min(TIERS.length - 1, Math.max(0, tier))]
  const cached = CACHE.get(cfg.index)
  const [examples, setExamples] = useState<Example[]>(() => cached?.examples ?? starterData(cfg))
  const [k, setK] = useState(cached?.k ?? cfg.k)
  const [rep, setRep] = useState<Representation>(cached?.rep ?? DEFAULT_REP[cfg.index])
  const [log, setLog] = useState<LogRow[]>(cached?.log ?? [])
  const [current, setCurrent] = useState<ClassId>(cfg.classes[0])
  const [drawing, setDrawing] = useState<Drawing>([])
  const [drawingSource, setDrawingSource] = useState<'you' | 'sample'>('you')
  const [phase, setPhase] = useState<Phase>('train')
  const [run, setRun] = useState<RunResult | null>(null)
  const [valEval, setValEval] = useState<Evaluation | null>(null)
  const [tally, setTally] = useState({ done: 0, good: 0 })
  const [speed, setSpeed] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [note, setNote] = useState<string | null>(cfg.intro)
  const [quizPick, setQuizPick] = useState<number | null>(null)
  const sceneRef = useRef<SorterSceneHandle>(null)
  const sampleSeed = useRef(1)
  const debriefRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    CACHE.set(cfg.index, { examples, k, rep, log })
  }, [cfg.index, examples, k, rep, log])

  const brain = useMemo(() => train(examples, cfg.classes, rep, k), [examples, cfg.classes, rep, k])
  const testItems = useMemo(() => tierTestSet(cfg), [cfg])
  const valItems = useMemo(() => (cfg.hasValidation ? tierValidationSet(cfg) : []), [cfg])

  const hasInk = drawing.length > 0 && inkLength(drawing) > 0.05
  const livePred = useMemo(() => (hasInk && examples.length ? predict(brain, drawing) : null), [brain, drawing, hasInk, examples.length])
  const liveFeat = useMemo(() => (hasInk ? featurize(drawing, rep) : null), [drawing, rep, hasInk])

  const counts = useMemo(() => {
    const own: Record<ClassId, number> = { left: 0, right: 0, circle: 0, stop: 0 }
    const all: Record<ClassId, number> = { left: 0, right: 0, circle: 0, stop: 0 }
    for (const e of examples) {
      all[e.label]++
      if (e.source === 'you' || e.source === 'sample') own[e.label]++
    }
    return { own, all }
  }, [examples])
  const maxCount = Math.max(1, ...cfg.classes.map((c) => counts.all[c]))
  const missing = cfg.classes.filter((c) => counts.own[c] < cfg.minPerClass || counts.all[c] < 1)
  const ready = missing.length === 0

  // What Sorta says right now.
  const speech = useMemo(() => {
    if (phase !== 'train') return null
    if (note) return note
    if (!hasInk) return examples.length ? 'Draw on the pad — I’ll guess live while you draw.' : `Draw a ${SYMBOLS[current].glyph} and press “Add”.`
    if (!livePred || !livePred.label) return 'I need at least one example before I can guess.'
    const nb = livePred.neighbours[0]
    const ex = nb ? brain.examples[nb.index] : null
    if (livePred.unfamiliar) return `Hmm… that doesn’t look like anything I’ve been shown. My best guess is ${glyph(livePred.label)}.`
    return `I think that’s a ${glyph(livePred.label)} — ${pct(livePred.votes[livePred.label])}% sure. It looks most like ${ex ? exampleName(ex, glyph(ex.label)) : 'one of my examples'}.`
  }, [phase, note, hasInk, examples.length, current, livePred, brain.examples])

  const onDraw = useCallback((d: Drawing) => {
    setDrawing(d)
    setDrawingSource('you')
    setNote(null)
  }, [])

  const clearPad = useCallback(() => {
    setDrawing([])
    setNote(null)
  }, [])

  const addExample = useCallback(() => {
    primeAudio()
    if (!hasInk || inkLength(drawing) < 0.25) {
      setNote('That’s too small for me to learn from — draw the whole symbol, nice and big.')
      playSound('wrong')
      return
    }
    if (examples.length >= cfg.maxExamples) {
      setNote(`My memory is full (${cfg.maxExamples} examples). Delete some to make room.`)
      playSound('wrong')
      return
    }
    const n = examples.filter((e) => e.label === current && e.source === drawingSource).length + 1
    const ex: Example = { id: newId(), label: current, drawing, source: drawingSource, n }
    setExamples((xs) => [...xs, ex])
    setDrawing([])
    const ownNow = counts.own[current] + 1
    if (cfg.minPerClass > 0 && ownNow === cfg.minPerClass) {
      playSound('star')
      const left = missing.filter((c) => c !== current)
      setNote(left.length ? `Enough ${glyph(current)} for now! Next teach me ${left.map(glyph).join(' and ')}.` : 'I have enough examples of everything. Run the test when you’re ready — or add more to make me smarter!')
    } else {
      playSound('click')
      setNote(`Learned! That’s ${exampleName(ex, glyph(current))}.`)
    }
  }, [hasInk, drawing, examples, cfg.maxExamples, cfg.minPerClass, current, drawingSource, counts.own, missing])

  const sample = useCallback(() => {
    primeAudio()
    const rng = makeRng(cfg.index * 1000 + sampleSeed.current++ * 7919)
    setDrawing(generateDrawing(current, VARIATION.everyday, rng).drawing)
    setDrawingSource('sample')
    setNote(`Here’s a sample ${glyph(current)}. Press “Add” to teach it to me.`)
    playSound('click')
  }, [cfg.index, current])

  const removeExample = (id: number) => {
    setExamples((xs) => xs.filter((e) => e.id !== id))
    setSelected(null)
    setNote('Deleted. Data is cleaner now — run me again to see if it helped.')
    playSound('click')
  }

  const relabel = (id: number, to: ClassId) => {
    setExamples((xs) => {
      const n = xs.filter((e) => e.label === to).length + 1
      return xs.map((e) => (e.id === id ? { ...e, label: to, n, truth: e.truth && e.truth !== to ? e.truth : undefined } : e))
    })
    setSelected(null)
    setNote(`Relabelled as ${glyph(to)}. Good data detective work!`)
    playSound('correct')
  }

  const augment = () => {
    const base = examples.filter((e) => e.source !== 'augment')
    const own = base.filter((e) => e.source === 'you' || e.source === 'sample')
    const room = cfg.maxExamples - base.length
    const copies: Example[] = []
    const per: Record<ClassId, number> = { left: 0, right: 0, circle: 0, stop: 0 }
    for (const e of own) {
      const rng = makeRng(e.id * 131 + 17)
      for (let j = 0; j < 2 && copies.length < room; j++) {
        per[e.label]++
        copies.push({ id: newId(), label: e.label, drawing: augmentDrawing(e.drawing, VARIATION.augment, rng), source: 'augment', n: per[e.label] })
      }
    }
    setExamples([...base, ...copies])
    setNote(copies.length ? `Added ${copies.length} tilted, moved and resized copies of your drawings. That’s data augmentation!` : 'Draw some examples first, then I can make copies of them.')
    playSound(copies.length ? 'unlock' : 'wrong')
  }

  const removeCopies = () => {
    setExamples((xs) => xs.filter((e) => e.source !== 'augment'))
    setNote('Removed the augmented copies.')
    playSound('click')
  }

  const resetData = () => {
    setExamples(starterData(cfg))
    setLog([])
    setValEval(null)
    setK(cfg.k)
    setRep(DEFAULT_REP[cfg.index])
    setNote('Fresh start! ' + cfg.intro)
    playSound('click')
  }

  const validate = () => {
    primeAudio()
    const ev = evaluate(brain, valItems)
    const row: LogRow = { k, rep, n: examples.length, trainAcc: trainingAccuracy(brain), valAcc: ev.accuracy }
    setLog((l) => [row, ...l].slice(0, 8))
    setValEval(ev)
    setNote(
      row.trainAcc - row.valAcc > 0.2
        ? `Training ${pct(row.trainAcc)}% but validation only ${pct(row.valAcc)}%. I’m memorising, not understanding!`
        : `Validation: ${pct(row.valAcc)}% (${ev.correct}/${ev.total}). Training: ${pct(row.trainAcc)}%.`,
    )
    playSound(ev.accuracy >= cfg.stars[0] ? 'correct' : 'click')
  }

  const startRun = (kind: 'test' | 'exam') => {
    primeAudio()
    if (!ready) return
    const items = testItems
    const ev = evaluate(brain, items)
    const r: RunResult = { kind, ev, brain }
    setRun(r)
    setAttempts((a) => a + 1)
    setTally({ done: 0, good: 0 })
    setSelected(null)
    setNote(null)
    setPhase('running')
    playSound('click')
    sceneRef.current?.run(
      ev.graded.map((g) => ({ drawing: g.item.drawing, truth: g.item.truth, pred: g.pred.label, confidence: g.pred.label ? g.pred.votes[g.pred.label] : 0 })),
      {
        onParcel: (_i, good) => {
          setTally((t) => ({ done: t.done + 1, good: t.good + (good ? 1 : 0) }))
          playSound(good ? 'correct' : 'wrong')
        },
        onDone: () => endRun(r),
      },
    )
  }

  const endRun = (r: RunResult) => {
    setTally({ done: r.ev.total, good: r.ev.correct })
    setPhase('debrief')
    if (r.ev.accuracy >= cfg.stars[0]) playSound('zonecomplete')
    requestAnimationFrame(() => debriefRef.current?.focus())
  }

  const skipRun = () => {
    if (!run) return
    sceneRef.current?.stop()
    endRun(run)
  }

  const backToTraining = () => {
    sceneRef.current?.stop()
    setPhase('train')
    setNote(cfg.index === 2 ? 'Look at my data on the right. Do the counts look fair? Are any labels wrong? Tap a drawing to inspect it.' : 'Add examples that look like the parcels I got wrong.')
  }

  const finishRound = (quizRight: boolean | null) => {
    if (!run) return
    const acc = run.ev.accuracy
    let stars = starsFor(acc, cfg)
    if (cfg.index === 3 && stars > 0) stars = Math.min(3, stars + (quizRight ? 1 : 0))
    const sum = summarize(run, cfg)
    const message =
      stars > 0
        ? `${run.ev.correct} of ${run.ev.total} parcels sorted correctly. ${sum.headline}`
        : `${run.ev.correct} of ${run.ev.total} — the target was ${pct(cfg.stars[0])}%. ${sum.headline}`
    onFinish({
      stars,
      score: pct(acc),
      scoreLabel: '% accuracy',
      message,
      badges: stars > 0 ? ['robot-teacher'] : undefined,
      attempts,
    })
  }

  const onPadKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (phase !== 'train' || e.target !== e.currentTarget) return
    const n = Number(e.key)
    if (n >= 1 && n <= cfg.classes.length) {
      setCurrent(cfg.classes[n - 1])
      e.preventDefault()
    } else if (e.key === 'Enter' || e.key === 'a') {
      addExample()
      e.preventDefault()
    } else if (e.key === 's') {
      sample()
      e.preventDefault()
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'c') {
      clearPad()
      e.preventDefault()
    }
  }

  const sel = selected !== null ? examples.find((e) => e.id === selected) ?? null : null
  const summary = run && phase !== 'running' ? summarize(run, cfg) : null
  const passed = !!run && run.ev.accuracy >= cfg.stars[0]
  const ownTotal = cfg.classes.reduce((s, c) => s + counts.own[c], 0)

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_370px]">
      {/* ── Left: mission, scene, pad / debrief ── */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p className="text-xs font-black uppercase tracking-wider text-amber-300">Mission · {['Cadet', 'Pilot', 'Ace', 'Legend'][cfg.index]}</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug text-white sm:text-base">{cfg.goal}</p>
        </div>

        <div className="relative">
          <SorterSceneClient
            ref={sceneRef}
            classes={cfg.classes}
            idleDrawing={phase === 'train' ? drawing : []}
            idlePred={phase === 'train' ? livePred?.label ?? null : null}
            idleConf={livePred?.label ? livePred.votes[livePred.label] : 0}
            speed={speed}
            label={phase === 'running' ? `Sorting parcels: ${tally.good} correct out of ${tally.done}` : 'Sorta the sorter robot at the parcel depot'}
          />
          {phase === 'running' && (
            <div className="absolute inset-x-2 top-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950/80 px-3 py-1 font-display text-sm font-black text-white" aria-live="polite">
                Parcel {Math.min(tally.done + 1, run?.ev.total ?? 0)} / {run?.ev.total} · <span className="text-green-400">✓ {tally.good}</span>{' '}
                <span className="text-red-400">✗ {tally.done - tally.good}</span>
              </span>
              <div className="ml-auto flex gap-1">
                {[1, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    aria-pressed={speed === s}
                    className={`min-h-[44px] min-w-[44px] rounded-xl px-2 font-black ${speed === s ? 'bg-amber-400 text-slate-900' : 'bg-slate-950/80 text-white'}`}
                  >
                    {s}×
                  </button>
                ))}
                <button type="button" onClick={skipRun} className="min-h-[44px] rounded-xl bg-slate-950/80 px-3 font-black text-white">
                  Skip ⏭
                </button>
              </div>
            </div>
          )}
        </div>

        {speech && (
          <div className="flex items-start gap-2" aria-live="polite">
            <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-lg">
              🤖
            </span>
            <p className="rounded-2xl rounded-tl-sm bg-white/[0.07] px-3 py-2 text-[15px] text-white/90">
              <b className="text-amber-300">Sorta: </b>
              {speech}
            </p>
          </div>
        )}

        {phase === 'train' && (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
            <div className="flex flex-col gap-2 outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 rounded-[20px]" tabIndex={0} onKeyDown={onPadKey} aria-label="Drawing pad controls. Keys: number keys choose a label, Enter adds, S adds a sample, C clears." aria-keyshortcuts="1 2 3 4 Enter S C">
              <div className="flex gap-1.5" role="radiogroup" aria-label="Which label are you drawing?">
                {cfg.classes.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={current === c}
                    onClick={() => {
                      setCurrent(c)
                      playSound('click')
                    }}
                    className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-2xl border-2 font-display font-black transition-transform active:scale-[.97] ${current === c ? SYMBOLS[c].tw : 'border-white/10 bg-white/5 text-white/60'}`}
                    title={`${SYMBOLS[c].name} (key ${i + 1})`}
                  >
                    <span className="text-xl leading-none">{SYMBOLS[c].glyph}</span>
                    <span className="text-[10px] uppercase tracking-wide">{counts.own[c]}{cfg.minPerClass ? `/${cfg.minPerClass}` : ''}</span>
                  </button>
                ))}
              </div>
              <DrawPadClient drawing={drawing} onChange={onDraw} ink="#0f172a" label={`Drawing pad. Draw a ${SYMBOLS[current].name}.`} />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={addExample}
                  className="min-h-[48px] flex-[2] rounded-2xl bg-amber-400 px-3 font-black text-slate-900 transition-transform active:scale-[.97] disabled:opacity-40"
                  disabled={!hasInk}
                >
                  Add as {SYMBOLS[current].glyph}
                </button>
                <button type="button" onClick={clearPad} className="min-h-[48px] flex-1 rounded-2xl border border-white/15 bg-white/5 px-2 font-bold text-white">
                  Clear
                </button>
                <button type="button" onClick={sample} className="min-h-[48px] flex-1 rounded-2xl border border-white/15 bg-white/5 px-2 font-bold text-white" title="Can’t draw right now? Get a sample drawing">
                  ✨ Sample
                </button>
              </div>
            </div>

            {/* Live brain panel */}
            <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-slate-950/60 p-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Live brain · k = {k}</p>
                <div className="mt-2 space-y-1.5">
                  {cfg.classes.map((c) => {
                    const v = livePred ? livePred.votes[c] : 0
                    return (
                      <div key={c} className="flex items-center gap-2">
                        <span className="w-6 text-center font-display text-lg font-black" style={{ color: SYMBOLS[c].color }}>
                          {SYMBOLS[c].glyph}
                        </span>
                        <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${pct(v)}%`, background: SYMBOLS[c].color }} />
                        </div>
                        <span className="w-10 text-right font-display text-sm font-black text-white/80">{pct(v)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div>
                  <p className="text-xs font-bold text-white/60">What the robot sees</p>
                  <div className="mt-1">
                    {liveFeat ? <GridView grid={liveFeat.grid} n={liveFeat.gridN} size={88} /> : <div className="h-[88px] w-[88px] rounded-lg bg-slate-950" />}
                  </div>
                  <p className="mt-1 text-[11px] text-white/50">{rep === 'raw' ? '16×16 raw pixels' : '10×10 centred + line directions'}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white/60">Closest examples</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {livePred?.neighbours.slice(0, Math.max(3, Math.min(5, k))).map((nb, i) => {
                      const ex = brain.examples[nb.index]
                      return (
                        <li key={ex.id} className={`flex flex-col items-center rounded-xl border p-1 ${i < k ? 'border-white/20' : 'border-white/5 opacity-50'}`}>
                          <DrawingThumb drawing={ex.drawing} size={40} className="rounded-md bg-slate-50" label={exampleName(ex, glyph(ex.label))} />
                          <span className="font-display text-xs font-black" style={{ color: SYMBOLS[ex.label].color }}>
                            {glyph(ex.label)} {similarity(nb.dist)}%
                          </span>
                        </li>
                      )
                    }) ?? <li className="text-sm text-white/40">Draw to see them</li>}
                  </ul>
                  {livePred && <p className="mt-1 text-[11px] text-white/50">The {k} closest vote; closer votes count more.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'running' && (
          <p className="rounded-2xl bg-white/5 p-3 text-center text-white/80">
            Sorta is using ONLY what you taught it. Watch where each parcel goes…
          </p>
        )}

        {(phase === 'debrief' || phase === 'quiz') && run && summary && (
          <div ref={debriefRef} tabIndex={-1} className="rounded-[20px] border-2 border-amber-300/40 bg-slate-950/70 p-4 outline-none" aria-label="Test results">
            <div className="flex flex-wrap items-end gap-3">
              <p className="font-display text-5xl font-black text-white">{pct(run.ev.accuracy)}%</p>
              <p className="pb-1 font-bold text-white/70">
                {run.ev.correct} of {run.ev.total} correct · target {pct(cfg.stars[0])}%
                {run.kind === 'exam' && ' · final exam on unseen drawings'}
              </p>
              <p className={`ml-auto rounded-full px-3 py-1 text-sm font-black ${passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{passed ? 'Target beaten!' : 'Not yet'}</p>
            </div>
            <p className="mt-3 text-white/90">
              <b className="text-amber-300">Why it happened: </b>
              {summary.headline}
            </p>

            {cfg.showMatrix && (
              <div className="mt-3">
                <ConfusionMatrix ev={run.ev} classes={cfg.classes} />
              </div>
            )}

            {summary.causes.length > 0 && (
              <ul className="mt-3 space-y-2">
                {summary.causes.slice(0, 4).map((c) => {
                  const g = run.ev.graded[c.index]
                  return (
                    <li key={c.index} className="flex items-start gap-2 rounded-2xl bg-white/5 p-2">
                      <DrawingThumb drawing={g.item.drawing} size={48} className="shrink-0 rounded-md bg-slate-50" label={`Parcel ${c.index + 1}: a ${SYMBOLS[g.item.truth].name}`} />
                      <div className="min-w-0 flex-1 text-sm text-white/85">
                        <p>
                          <b>
                            {c.also && c.also.length ? `Parcels ${[c.index, ...c.also].map((i) => i + 1).join(', ')}` : `Parcel ${c.index + 1}`}:
                          </b>{' '}
                          {c.text}
                        </p>
                        {phase === 'debrief' && run.kind === 'test' && c.exampleId !== null && examples.some((e) => e.id === c.exampleId) && (
                          <button
                            type="button"
                            className="mt-1 min-h-[44px] rounded-xl border border-cyan-300/40 px-3 text-sm font-bold text-cyan-200"
                            onClick={() => {
                              backToTraining()
                              setSelected(c.exampleId)
                            }}
                          >
                            Show me that example
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
                {summary.causes.length > 4 && <li className="text-sm text-white/50">…and {summary.causes.length - 4} more kinds of mistake.</li>}
              </ul>
            )}

            {phase === 'quiz' ? (
              <fieldset className="mt-4 rounded-2xl border border-cyan-300/30 p-3">
                <legend className="px-1 text-sm font-black text-cyan-300">Bonus star · explain overfitting</legend>
                <p className="font-semibold text-white">{QUIZ.q}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {QUIZ.options.map((o, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={quizPick !== null}
                      onClick={() => {
                        setQuizPick(i)
                        playSound(i === QUIZ.answer ? 'correct' : 'wrong')
                      }}
                      className={`min-h-[48px] rounded-2xl border-2 p-2 text-left text-sm font-semibold ${
                        quizPick === null
                          ? 'border-white/15 bg-white/5 text-white hover:border-white/30'
                          : i === QUIZ.answer
                            ? 'border-green-400 bg-green-500/15 text-green-100'
                            : i === quizPick
                              ? 'border-red-400 bg-red-500/15 text-red-100'
                              : 'border-white/10 text-white/50'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {quizPick !== null && <p className="mt-2 text-sm text-white/85">{QUIZ.explain}</p>}
                <button
                  type="button"
                  disabled={quizPick === null}
                  onClick={() => finishRound(quizPick === QUIZ.answer)}
                  className="mt-3 min-h-[48px] w-full rounded-2xl bg-amber-400 font-black text-slate-900 disabled:opacity-40"
                >
                  Collect my stars
                </button>
              </fieldset>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {run.kind === 'exam' ? (
                  passed ? (
                    <button type="button" onClick={() => setPhase('quiz')} className="min-h-[48px] rounded-2xl bg-amber-400 px-5 font-black text-slate-900">
                      Next: the overfitting question →
                    </button>
                  ) : (
                    <button type="button" onClick={() => finishRound(null)} className="min-h-[48px] rounded-2xl bg-amber-400 px-5 font-black text-slate-900">
                      End round (your data is kept)
                    </button>
                  )
                ) : (
                  <>
                    {passed && (
                      <button type="button" onClick={() => finishRound(null)} className="min-h-[48px] rounded-2xl bg-amber-400 px-5 font-black text-slate-900">
                        Collect {'⭐'.repeat(starsFor(run.ev.accuracy, cfg))}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={backToTraining}
                      className={`min-h-[48px] rounded-2xl px-5 font-black ${passed ? 'border-2 border-amber-300/60 text-amber-200' : 'bg-amber-400 text-slate-900'}`}
                    >
                      {passed ? 'Improve & re-test' : 'Fix my data'}
                    </button>
                    {!passed && (
                      <button type="button" onClick={() => finishRound(null)} className="min-h-[48px] rounded-2xl border border-white/15 px-4 font-bold text-white/70">
                        End round
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: the training data ── */}
      <aside className="flex min-w-0 flex-col gap-3" aria-label="Training data">
        {cfg.chooseK && (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Brain design</p>
            <div className="mt-2" role="radiogroup" aria-label="Representation">
              <p className="text-sm font-bold text-white/80">What the brain compares</p>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {(['raw', 'features'] as Representation[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={rep === r}
                    disabled={phase !== 'train'}
                    onClick={() => {
                      setRep(r)
                      playSound('click')
                    }}
                    className={`min-h-[48px] rounded-2xl border-2 px-2 text-sm font-black ${rep === r ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/5 text-white/70'}`}
                  >
                    {r === 'raw' ? 'Raw pixels' : 'Engineered features'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3" role="radiogroup" aria-label="k: how many neighbours vote">
              <p className="text-sm font-bold text-white/80">k — how many neighbours vote</p>
              <div className="mt-1 flex gap-1.5">
                {K_CHOICES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={k === v}
                    disabled={phase !== 'train'}
                    onClick={() => {
                      setK(v)
                      playSound('click')
                    }}
                    className={`min-h-[44px] flex-1 rounded-xl border-2 font-display font-black ${k === v ? 'border-amber-300 bg-amber-400 text-slate-900' : 'border-white/10 bg-white/5 text-white/70'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" onClick={augment} disabled={phase !== 'train'} className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-white/5 px-2 text-sm font-bold text-white">
                Augment my drawings
              </button>
              {examples.some((e) => e.source === 'augment') && (
                <button type="button" onClick={removeCopies} disabled={phase !== 'train'} className="min-h-[44px] rounded-xl border border-white/15 px-2 text-sm font-bold text-white/70">
                  Remove copies
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={validate}
              disabled={phase !== 'train' || !ready}
              className="mt-2 min-h-[48px] w-full rounded-2xl border-2 border-cyan-300/60 bg-cyan-400/10 font-black text-cyan-100 disabled:opacity-40"
            >
              Check on validation set (free)
            </button>
            {log.length > 0 && (
              <table className="mt-2 w-full text-left text-xs text-white/80">
                <caption className="pb-1 text-left font-bold text-white/60">Experiment log (newest first)</caption>
                <thead>
                  <tr className="text-white/50">
                    <th className="font-bold">brain</th>
                    <th className="font-bold">k</th>
                    <th className="font-bold">data</th>
                    <th className="font-bold">train</th>
                    <th className="font-bold">valid.</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((r, i) => (
                    <tr key={i} className={i === 0 ? 'text-white' : ''}>
                      <td>{r.rep === 'raw' ? 'pixels' : 'features'}</td>
                      <td>{r.k}</td>
                      <td>{r.n}</td>
                      <td>{pct(r.trainAcc)}%</td>
                      <td className={r.valAcc >= cfg.stars[0] ? 'font-black text-green-300' : 'text-red-300'}>{pct(r.valAcc)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {valEval && (
              <div className="mt-2">
                <ConfusionMatrix ev={valEval} classes={cfg.classes} />
              </div>
            )}
          </div>
        )}

        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-amber-300">
              Training data · {examples.length}/{cfg.maxExamples}
            </p>
            <button type="button" onClick={resetData} disabled={phase !== 'train'} className="min-h-[44px] rounded-xl px-2 text-xs font-bold text-white/60 hover:text-white">
              Start over
            </button>
          </div>
          {cfg.classes.map((c) => {
            const list = examples.filter((e) => e.label === c)
            return (
              <div key={c} className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center font-display text-lg font-black" style={{ color: SYMBOLS[c].color }}>
                    {SYMBOLS[c].glyph}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${(counts.all[c] / maxCount) * 100}%`, background: SYMBOLS[c].color }} />
                  </div>
                  <span className="w-8 text-right font-display text-sm font-black text-white/80">{counts.all[c]}</span>
                </div>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        disabled={phase !== 'train'}
                        onClick={() => setSelected(selected === e.id ? null : e.id)}
                        aria-pressed={selected === e.id}
                        aria-label={`${exampleName(e, glyph(e.label))}. Tap to inspect.`}
                        className={`grid h-11 w-11 place-items-center rounded-lg bg-slate-50 transition-transform active:scale-[.95] ${selected === e.id ? 'ring-4 ring-amber-400' : ''} ${e.source === 'augment' ? 'opacity-70' : ''}`}
                      >
                        <DrawingThumb drawing={e.drawing} size={38} />
                      </button>
                    </li>
                  ))}
                  {!list.length && <li className="text-sm text-white/40">No examples yet</li>}
                </ul>
              </div>
            )
          })}
          {sel && phase === 'train' && (
            <div className="mt-3 rounded-2xl border border-amber-300/40 bg-slate-950/70 p-3">
              <div className="flex items-center gap-3">
                <DrawingThumb drawing={sel.drawing} size={72} className="rounded-lg bg-slate-50" />
                <div className="text-sm text-white/85">
                  <p className="font-bold text-white">{exampleName(sel, glyph(sel.label))}</p>
                  <p>
                    Labelled <b style={{ color: SYMBOLS[sel.label].color }}>{glyph(sel.label)}</b>. Does the drawing match its label?
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => removeExample(sel.id)} className="min-h-[44px] rounded-xl bg-red-500/80 px-3 text-sm font-black text-white">
                  Delete
                </button>
                {cfg.classes
                  .filter((c) => c !== sel.label)
                  .map((c) => (
                    <button key={c} type="button" onClick={() => relabel(sel.id, c)} className="min-h-[44px] rounded-xl border border-white/20 px-3 text-sm font-bold text-white">
                      Relabel as {glyph(c)}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {phase === 'train' && (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
            {!ready && (
              <p className="mb-2 text-sm text-white/75">
                Still needed:{' '}
                {missing.map((c) => (
                  <b key={c} className="mr-2" style={{ color: SYMBOLS[c].color }}>
                    {Math.max(cfg.minPerClass - counts.own[c], counts.all[c] < 1 ? 1 : 0)}× {glyph(c)}
                  </b>
                ))}
                {cfg.index === 3 && <span className="block text-xs text-white/50">(your own drawings — the factory data doesn’t count)</span>}
              </p>
            )}
            <button
              type="button"
              onClick={() => startRun(cfg.hasValidation ? 'exam' : 'test')}
              disabled={!ready}
              className="min-h-[56px] w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 text-lg font-black text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform active:scale-[.97] disabled:opacity-40"
            >
              {cfg.hasValidation ? 'Take the final exam (one shot!)' : attempts ? 'Run the sorter again ▶' : 'Run the sorter ▶'}
            </button>
            <p className="mt-1 text-center text-xs text-white/50">
              {cfg.hasValidation
                ? '24 unseen parcels: tilted, resized, moved, smudged.'
                : `${testItems.length} test parcels the robot has never seen${ownTotal ? '' : ' — draw first!'}`}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
