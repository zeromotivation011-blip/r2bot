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
  featurize,
  inkLength,
  leaveOneOutAccuracy,
  predict,
  similarity,
  train,
  trainingAccuracy,
  type Evaluation,
  type Example,
  type Representation,
} from './brain'
import { augmentDataset, CAP_NOTE, deleteExample, finishStars, nextNumber, relabelExample, runStars, summarize, usedSamples, wrongLeft, type RunResult } from './debrief'
import { shuffledQuiz } from './quiz'
import { generateDrawing, makeRng, SYMBOLS, VARIATION, type ClassId, type Drawing } from './symbols'
import { DEFAULT_REP, glyph, needed, newId, starterData, tierTestSet, tierValidationSet, TIERS, type TierConfig } from './tiers'
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
  looAcc: number
  valAcc: number
}

/**
 * Kept across rounds of the same tier, so "Try again" never throws away a
 * child's drawings. `runs` counts test runs: each run gets brand-new parcels.
 */
const CACHE = new Map<number, { examples: Example[]; k: number; rep: Representation; log: LogRow[]; runs: number }>()

const pct = (x: number) => Math.round(x * 100)
const K_CHOICES = [1, 3, 5, 7, 9]

/**
 * Where this page load's run numbering starts. Each run's parcels come from its
 * run number, so a reload (which also forgets the data) never brings back an
 * exam the child has already seen the answers to.
 */
const SESSION_RUN0 = Math.floor(Math.random() * 100_000) * 10

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

export default function RobotBrainGameClient({ tier, onFinish }: Props) {
  const cfg = TIERS[Math.min(TIERS.length - 1, Math.max(0, tier))]
  const cached = CACHE.get(cfg.index)
  const [examples, setExamples] = useState<Example[]>(() => cached?.examples ?? starterData(cfg))
  const [k, setK] = useState(cached?.k ?? cfg.k)
  const [rep, setRep] = useState<Representation>(cached?.rep ?? DEFAULT_REP[cfg.index])
  const [log, setLog] = useState<LogRow[]>(cached?.log ?? [])
  const [runs, setRuns] = useState(cached?.runs ?? SESSION_RUN0)
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
    CACHE.set(cfg.index, { examples, k, rep, log, runs })
  }, [cfg.index, examples, k, rep, log, runs])

  const brain = useMemo(() => train(examples, cfg.classes, rep, k), [examples, cfg.classes, rep, k])
  // A fresh set of parcels for every run: the robot is never re-tested on parcels it (or you) have seen.
  const testItems = useMemo(() => tierTestSet(cfg, runs), [cfg, runs])
  const quiz = useMemo(() => shuffledQuiz(runs), [runs])
  const valItems = useMemo(() => (cfg.hasValidation ? tierValidationSet(cfg) : []), [cfg])

  const hasInk = drawing.length > 0 && inkLength(drawing) > 0.05
  const livePred = useMemo(() => (hasInk && examples.length ? predict(brain, drawing) : null), [brain, drawing, hasInk, examples.length])
  const liveFeat = useMemo(() => (hasInk ? featurize(drawing, rep) : null), [drawing, rep, hasInk])

  const counts = useMemo(() => {
    const own: Record<ClassId, number> = { left: 0, right: 0, circle: 0, tri: 0, stop: 0 }
    const all: Record<ClassId, number> = { left: 0, right: 0, circle: 0, tri: 0, stop: 0 }
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
    const n = nextNumber(examples, current, drawingSource)
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
    setDrawing(generateDrawing(current, VARIATION.neat, rng).drawing)
    setDrawingSource('sample')
    setNote(`Here’s a neat textbook ${glyph(current)}. Press “Add” to teach it to me — but real parcels are messier than this, and a round taught with samples can earn at most 2 stars.`)
    playSound('click')
  }, [cfg.index, current])

  const removeExample = (id: number) => {
    const hadCopies = examples.some((e) => e.parent === id)
    setExamples((xs) => deleteExample(xs, id))
    setSelected(null)
    setNote(`Deleted${hadCopies ? ', with its augmented copies' : ''}. Run me again to see if it helped — and check every label still has enough examples.`)
    playSound('click')
  }

  const relabel = (id: number, to: ClassId) => {
    const copies = examples.filter((e) => e.parent === id).length
    setExamples((xs) => relabelExample(xs, id, to))
    setSelected(null)
    setNote(`Relabelled as ${glyph(to)}${copies ? ` (and its ${copies} augmented cop${copies === 1 ? 'y' : 'ies'})` : ''}. Good data detective work!`)
    playSound('correct')
  }

  const augment = () => {
    const out = augmentDataset(examples, cfg.maxExamples)
    setExamples(out.examples)
    setNote(
      out.added
        ? `Added ${out.added} turned, moved and resized copies of the training data — up to 45°. That’s data augmentation!${out.added < out.wanted ? ' (My memory filled up, so not every drawing got two copies.)' : ''}${out.wrongCopies ? ` Careful: ${out.wrongCopies} cop${out.wrongCopies === 1 ? 'y carries' : 'ies carry'} a WRONG label, because copies keep the label of the drawing they came from. Clean first!` : ''}`
        : cfg.maxExamples - examples.filter((e) => e.source !== 'augment').length <= 0
          ? 'My memory is full. Delete some examples to make room for copies.'
          : 'Draw some examples first, then I can make copies of them.',
    )
    playSound(out.added ? 'unlock' : 'wrong')
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
    const row: LogRow = { k, rep, n: examples.length, trainAcc: trainingAccuracy(brain), looAcc: leaveOneOutAccuracy(brain), valAcc: ev.accuracy }
    setLog((l) => [row, ...l].slice(0, 8))
    setValEval(ev)
    setNote(
      row.trainAcc - row.valAcc > 0.2
        ? `Training ${pct(row.trainAcc)}% but validation only ${pct(row.valAcc)}%. I’m memorising, not understanding!`
        : `Validation: ${pct(row.valAcc)}% (${ev.correct}/${ev.total}). Leave-one-out: ${pct(row.looAcc)}%. Training: ${pct(row.trainAcc)}%.`,
    )
    playSound(ev.correct >= needed(cfg.stars[0], ev.total) ? 'correct' : 'click')
  }

  const startRun = (kind: 'test' | 'exam') => {
    primeAudio()
    if (!ready) return
    const items = testItems
    const ev = evaluate(brain, items)
    const r: RunResult = { kind, ev, brain }
    setRun(r)
    // The next run (or the next round) gets brand-new parcels.
    setRuns((x) => x + 1)
    setQuizPick(null)
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
    if (r.ev.correct >= needed(cfg.stars[0], r.ev.total)) playSound('zonecomplete')
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
    setNote(
      cfg.index === 2
        ? 'Look at my data. Do the counts look fair? Are any labels wrong? Tap a drawing to inspect it. Next run uses brand-new parcels.'
        : 'Next run uses brand-new parcels, so don’t copy the ones I got wrong — teach me the general idea behind the mistake.',
    )
  }

  const finishRound = (quizRight: boolean | null) => {
    if (!run) return
    const acc = run.ev.accuracy
    const { stars, capped } = finishStars(run, cfg, quizRight)
    const sum = summarize(run, cfg)
    const message =
      stars > 0
        ? `${run.ev.correct} of ${run.ev.total} parcels sorted correctly. ${sum.headline}${capped === 'samples' ? ` ${CAP_NOTE.samples}` : ''}`
        : `${run.ev.correct} of ${run.ev.total} — the target was ${needed(cfg.stars[0], run.ev.total)}. ${sum.headline}`
    const result: RoundResult & { hintsUsed?: boolean } = {
      stars,
      score: pct(acc),
      scoreLabel: '% accuracy',
      message,
      badges: stars > 0 ? ['robot-teacher'] : undefined,
      attempts,
      // ✨ Sample drawings are the game doing the drawing: the shared hint rule (max 2 stars).
      hintsUsed: usedSamples(run.brain.examples),
    }
    onFinish(result)
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
  const passed = !!run && run.ev.correct >= needed(cfg.stars[0], run.ev.total)
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
              {/* Phones: the live bars sit below the fold, so mirror them right above the pad. */}
              <div className="flex gap-1 sm:hidden" aria-hidden>
                {cfg.classes.map((c) => {
                  const v = livePred ? livePred.votes[c] : 0
                  const top = livePred?.label === c
                  return (
                    <div key={c} className={`relative h-8 flex-1 overflow-hidden rounded-lg border ${top ? 'border-white/60' : 'border-white/10'} bg-white/5`}>
                      <div className="absolute inset-y-0 left-0 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${pct(v)}%`, background: SYMBOLS[c].color, opacity: 0.55 }} />
                      <span className="relative flex h-full items-center justify-center gap-1 font-display text-sm font-black text-white">
                        <span style={{ color: top ? '#fff' : SYMBOLS[c].color }}>{SYMBOLS[c].glyph}</span>
                        {pct(v)}%
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Phones: cap the pad by the screen height so labels, live bars, pad and Add all fit in one view. */}
              <div className="mx-auto w-full max-w-[min(100%,36svh)] sm:max-w-none">
                <DrawPadClient drawing={drawing} onChange={onDraw} ink="#0f172a" label={`Drawing pad. Draw a ${SYMBOLS[current].name}.`} />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={addExample}
                  className="min-h-[48px] flex-[1.6] whitespace-nowrap rounded-2xl bg-amber-400 px-3 font-black text-slate-900 transition-transform active:scale-[.97] disabled:opacity-40"
                  disabled={!hasInk}
                >
                  Add as {SYMBOLS[current].glyph}
                </button>
                <button type="button" onClick={clearPad} className="min-h-[48px] flex-1 whitespace-nowrap rounded-2xl border border-white/15 bg-white/5 px-2 font-bold text-white">
                  Clear
                </button>
                <button type="button" onClick={sample} className="min-h-[48px] flex-1 whitespace-nowrap rounded-2xl border border-white/15 bg-white/5 px-2 font-bold text-white" title="Can’t draw right now? Get a sample drawing (max 2 stars)">
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
                {run.ev.correct} of {run.ev.total} correct · target {needed(cfg.stars[0], run.ev.total)} · ⭐⭐ at {needed(cfg.stars[1], run.ev.total)}
                {cfg.index < 3 && <> · ⭐⭐⭐ at {needed(cfg.stars[2], run.ev.total)}</>}
                {run.kind === 'exam' && ' · final exam on unseen drawings'}
              </p>
              <p className={`ml-auto rounded-full px-3 py-1 text-sm font-black ${passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{passed ? 'Target beaten!' : 'Not yet'}</p>
            </div>
            <p className="mt-3 text-white/90">
              <b className="text-amber-300">Why it happened: </b>
              {summary.headline}
            </p>

            {passed && runStars(run, cfg).capped === 'samples' && (
              <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">✨ {CAP_NOTE.samples}</p>
            )}

            {cfg.index === 2 && passed && wrongLeft(run.brain.examples) > 0 && (
              <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">
                ⚠ {wrongLeft(run.brain.examples)} training example{wrongLeft(run.brain.examples) === 1 ? ' still has' : 's still have'} the wrong label. The 3rd star needs clean data.
              </p>
            )}

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
                <legend className="px-1 text-sm font-black text-cyan-300">Bonus star · think like a data scientist</legend>
                <p className="font-semibold text-white">{quiz.quiz.q}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {quiz.order.map((i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={quizPick !== null}
                      onClick={() => {
                        setQuizPick(i)
                        playSound(i === 0 ? 'correct' : 'wrong')
                      }}
                      className={`min-h-[48px] rounded-2xl border-2 p-2 text-left text-sm font-semibold ${
                        quizPick === null
                          ? 'border-white/15 bg-white/5 text-white hover:border-white/30'
                          : i === 0
                            ? 'border-green-400 bg-green-500/15 text-green-100'
                            : i === quizPick
                              ? 'border-red-400 bg-red-500/15 text-red-100'
                              : 'border-white/10 text-white/50'
                      }`}
                    >
                      {quiz.quiz.options[i]}
                    </button>
                  ))}
                </div>
                {quizPick !== null && <p className="mt-2 text-sm text-white/85">{quiz.quiz.explain}</p>}
                <button
                  type="button"
                  disabled={quizPick === null}
                  onClick={() => finishRound(quizPick === 0)}
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
                      Next: the bonus question →
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
                        Collect {'⭐'.repeat(runStars(run, cfg).stars)}
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
                Augment the training data
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
                    <th className="font-bold" title="Each drawing may vote for itself">train</th>
                    <th className="font-bold" title="Leave-one-out: each drawing (and its copies) hidden while it is tested">LOO</th>
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
                      <td>{pct(r.looAcc)}%</td>
                      <td className={r.valAcc >= cfg.stars[0] ? 'font-black text-green-300' : 'text-red-300'}>{pct(r.valAcc)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {log.length > 0 && (
              <p className="mt-1 text-[11px] text-white/50">
                train = each drawing may vote for itself (k = 1 always gives 100%). LOO = leave-one-out: each drawing and its copies are hidden while
                it is tested.
              </p>
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
                {cfg.index === 3 && <span className="block text-xs text-white/50">(your own drawings or ✨ samples — the factory data doesn’t count)</span>}
              </p>
            )}
            <button
              type="button"
              onClick={() => startRun(cfg.hasValidation ? 'exam' : 'test')}
              disabled={!ready}
              className="min-h-[56px] w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 text-lg font-black text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform active:scale-[.97] disabled:opacity-40"
            >
              {cfg.hasValidation ? 'Take the final exam ▶' : attempts ? 'Run the sorter again ▶' : 'Run the sorter ▶'}
            </button>
            <p className="mt-1 text-center text-xs text-white/50">
              {cfg.hasValidation
                ? `One go per round: ${testItems.length} brand-new parcels, tilted, squashed, smudged and hurried. Win at ${needed(cfg.stars[0], testItems.length)} of ${testItems.length}, ⭐⭐ at ${needed(cfg.stars[1], testItems.length)}; the bonus question gives ⭐⭐⭐.`
                : `${testItems.length} brand-new parcels the robot has never seen. Win at ${needed(cfg.stars[0], testItems.length)}, ⭐⭐ at ${needed(cfg.stars[1], testItems.length)}, ⭐⭐⭐ at ${needed(cfg.stars[2], testItems.length)}.${ownTotal ? '' : ' Draw first!'}`}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
