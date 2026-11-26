'use client'
// components/kids/ai/vision/VisionLabClient.tsx
// VISION LAB — teach your robot to see, entirely on this device.
//
// The child makes 2–4 classes, shows examples (camera or built-in sample
// pictures), and a classifier written from scratch learns them live: k-NN for
// everyone, a tiny neural network with a visible loss curve from Ace up. Live
// predictions with confidence bars drive the child's own 3D robot.
//
// Privacy: camera frames are shrunk to 32×32 in memory and never leave the
// device; nothing is stored except which missions are finished. The camera is
// only requested after a tap and an explanation, and it is always stopped when
// the child leaves, switches to samples, or the app goes to the background.
// No network calls, no AI API — it works offline once loaded.

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { extractFeatures, FEATURE_GROUPS, GROUP_LABEL, relight, THUMB, type Features, type Thumb } from '@/lib/kids/ai/vision/features'
import { drawSample, SAMPLE_KINDS, sampleInfo, type SampleKind } from '@/lib/kids/ai/vision/samples'
import { argmax, type Score } from '@/lib/kids/ai/vision/classifiers'
import { ALL_ON, evaluateKnn, knnK, knnProbs, NetTrainer, toSamples, type Example, type GroupsOn } from '@/lib/kids/ai/vision/lab'
import {
  ACTIONS,
  actionInfo,
  loadDoneMissions,
  missionsForTier,
  PRESETS,
  saveDoneMissions,
  starsFor,
  tierForBand,
  tierInfo,
  VISION_TIERS,
  type EvalStat,
  type LabStats,
  type Mission,
  type RobotAction,
} from '@/lib/kids/ai/vision/missions'
import { getProgress } from '@/lib/kids-progress'
import { reportActivity } from '@/lib/kids/universe/rewards'
import { playSound } from '@/lib/kids-audio'
import type { TierName } from '@/lib/kids/universe/tiers'
import { ConfidenceBars, FeatureView, LossChart, ScoreView, ThumbCanvas, type ClassView } from './VisionWidgetsClient'

// ── 3D robot (lazy; a friendly message if it cannot load offline) ───────────

interface SceneProps {
  action: RobotAction
  onFollow?: (dt: number) => void
}

function SceneSkeleton() {
  return <div className="h-full w-full animate-pulse bg-[#111C32]" aria-hidden="true" />
}

function SceneOffline() {
  return (
    <div className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-slate-300">
      The 3D robot needs a connection the first time. Your robot brain still works!
    </div>
  )
}

const VisionRobotScene = dynamic<SceneProps>(() => import('./VisionRobotSceneClient').catch(() => ({ default: SceneOffline })), {
  ssr: false,
  loading: SceneSkeleton,
})

// ── Types and constants ─────────────────────────────────────────────────────

interface LabClass {
  id: string
  name: string
  sample: SampleKind
  action: RobotAction
  color: string
}

interface Stored {
  id: number
  classId: string
  thumb: Thumb
  feats: Features
  dim: boolean
}

type Source = 'samples' | 'camera'
type CamState = 'off' | 'explain' | 'starting' | 'on' | 'paused' | 'denied' | 'nocam' | 'unsupported' | 'error'
type Show = SampleKind | 'shuffle'

const CLASS_COLORS = ['#FF8A4C', '#00E5FF', '#22C55E', '#F472B6']
const MAX_PER_CLASS = 60
const TICK_MS = 200
const VIEW = 192

let classSeq = 0
const newClassId = () => `c${++classSeq}-${Date.now().toString(36)}`

function presetClasses(tier: TierName): LabClass[] {
  return PRESETS[tier].map((p, i) => ({
    id: `${tier}-${i}`,
    name: p.name,
    sample: p.sample,
    action: p.action,
    color: CLASS_COLORS[i % CLASS_COLORS.length],
  }))
}

function Card({ title, children, className = '', id }: { title?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={`rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5 ${className}`}
    >
      {title && <h2 className="mb-3 font-display text-lg font-bold text-white sm:text-xl">{title}</h2>}
      {children}
    </section>
  )
}

const btn =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 font-semibold transition-transform active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40'
const btnPrimary = `${btn} bg-amber-500 text-[#1A1103]`
const btnGhost = `${btn} border border-white/15 bg-white/5 text-slate-100`

// ── The lab ─────────────────────────────────────────────────────────────────

export default function VisionLabClient() {
  const [tier, setTier] = useState<TierName>('Cadet')
  const [classes, setClasses] = useState<LabClass[]>(() => presetClasses('Cadet'))
  const examplesRef = useRef<Stored[]>([])
  const [version, setVersion] = useState(0)
  const nextExampleId = useRef(1)

  const [source, setSource] = useState<Source>('samples')
  const [camState, setCamState] = useState<CamState>('off')
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [light, setLight] = useState(1)
  const [show, setShow] = useState<Show>('thumbs')
  const [capturing, setCapturing] = useState<string | null>(null)

  const [feats, setFeats] = useState<Features | null>(null)
  const [probs, setProbs] = useState<number[] | null>(null)
  const [action, setAction] = useState<RobotAction>('idle')
  const [unsure, setUnsure] = useState(false)
  const [threshold, setThreshold] = useState(0.55)

  const [modelKind, setModelKind] = useState<'knn' | 'net'>('knn')
  const [hidden, setHidden] = useState(16)
  const [lr, setLr] = useState(0.01)
  const [epochs, setEpochs] = useState(60)
  const [groups, setGroups] = useState<GroupsOn>(ALL_ON)
  const trainerRef = useRef<NetTrainer | null>(null)
  const [trainerClassIds, setTrainerClassIds] = useState<string[]>([])
  const [trainView, setTrainView] = useState<{
    train: number[]
    test: number[]
    epochs: number
  } | null>(null)
  const [training, setTraining] = useState(false)
  const [netVersion, setNetVersion] = useState(-1)
  const [result, setResult] = useState<{
    score: Score
    dark: Score | null
    classIds: string[]
    model: 'knn' | 'net'
  } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [done, setDone] = useState<string[]>([])
  const [celebrate, setCelebrate] = useState<Mission | null>(null)

  const info = tierInfo(tier)

  // Observed facts for mission checks.
  const statsRef = useRef<{
    evals: EvalStat[]
    actionsDone: Set<RobotAction>
    stoppedUnsure: boolean
    followSeconds: number
    netTrained: boolean
  }>({
    evals: [],
    actionsDone: new Set(),
    stoppedUnsure: false,
    followSeconds: 0,
    netTrained: false,
  })

  // Start at the child's band, if they picked one.
  useEffect(() => {
    const t = tierForBand(getProgress().band)
    setDone(loadDoneMissions())
    if (t !== 'Cadet') {
      setTier(t)
      setClasses(presetClasses(t))
    }
  }, [])

  // ── Canvas + camera plumbing ─────────────────────────────────────────────
  const viewRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const thumbCanvas = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sampleState = useRef<{ kind: SampleKind; seed: number }>({
    kind: 'thumbs',
    seed: 1,
  })

  const getThumbCtx = useCallback((): CanvasRenderingContext2D | null => {
    if (!thumbCanvas.current) {
      const c = document.createElement('canvas')
      c.width = THUMB
      c.height = THUMB
      thumbCanvas.current = c
    }
    return thumbCanvas.current.getContext('2d', { willReadFrequently: true })
  }, [])

  const renderSample = useCallback((kind: SampleKind, keepSeed = false) => {
    const ctx = viewRef.current?.getContext('2d')
    if (!ctx) return
    if (!keepSeed) sampleState.current = { kind, seed: Math.floor(Math.random() * 1e9) }
    drawSample(ctx, VIEW, sampleState.current.kind, sampleState.current.seed, lightRef.current)
  }, [])

  const lightRef = useRef(light)
  lightRef.current = light

  const grabThumb = useCallback((): Thumb | null => {
    const tctx = getThumbCtx()
    if (!tctx) return null
    tctx.imageSmoothingEnabled = true
    tctx.imageSmoothingQuality = 'high'
    if (sourceRef.current === 'camera') {
      const v = videoRef.current
      if (!v || v.readyState < 2 || !v.videoWidth) return null
      const s = Math.min(v.videoWidth, v.videoHeight)
      tctx.save()
      if (facingRef.current === 'user') {
        tctx.translate(THUMB, 0)
        tctx.scale(-1, 1)
      }
      tctx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, THUMB, THUMB)
      tctx.restore()
      const t: Thumb = { data: tctx.getImageData(0, 0, THUMB, THUMB).data }
      return Math.abs(lightRef.current - 1) > 0.02 ? relight(t, lightRef.current, nextExampleId.current) : t
    }
    const c = viewRef.current
    if (!c) return null
    tctx.drawImage(c, 0, 0, VIEW, VIEW, 0, 0, THUMB, THUMB)
    return { data: tctx.getImageData(0, 0, THUMB, THUMB).data }
  }, [getThumbCtx])

  const sourceRef = useRef(source)
  sourceRef.current = source
  const facingRef = useRef(facing)
  facingRef.current = facing

  // Every start gets a token. stopCamera (leave, background, "Sample pictures")
  // bumps it, so a getUserMedia that resolves late is stopped, never shown.
  const camReqRef = useRef(0)
  const camPendingRef = useRef(false)
  const mountedRef = useRef(false)

  const stopCamera = useCallback(() => {
    camReqRef.current += 1
    camPendingRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(
    async (face: 'user' | 'environment') => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCamState('unsupported')
        return
      }
      stopCamera()
      const token = camReqRef.current
      const stale = () => token !== camReqRef.current || !mountedRef.current || document.hidden
      camPendingRef.current = true
      setCamState('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: face,
            width: { ideal: 320 },
            height: { ideal: 320 },
          },
          audio: false,
        })
        if (stale()) {
          // The child left, backgrounded the app or chose sample pictures while
          // the permission prompt was open: end this stream at once.
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        camPendingRef.current = false
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => undefined)
        }
        if (stale()) {
          if (streamRef.current === stream) stopCamera()
          else stream.getTracks().forEach((t) => t.stop())
          return
        }
        setCamState('on')
        setSource('camera')
      } catch (e) {
        if (stale()) return
        camPendingRef.current = false
        const name = e instanceof Error ? e.name : ''
        setCamState(
          name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocam' : 'error',
        )
        setSource('samples')
      }
    },
    [stopCamera],
  )

  // Camera is always stopped on leave, and paused when the app goes to the background.
  useEffect(() => {
    mountedRef.current = true
    const onHide = () => {
      if (document.hidden && (streamRef.current || camPendingRef.current)) {
        stopCamera()
        setCamState('paused')
      }
    }
    const onPageHide = () => stopCamera()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      mountedRef.current = false
      stopCamera()
    }
  }, [stopCamera])

  const switchToSamples = () => {
    stopCamera()
    setCamState((s) => (s === 'on' || s === 'starting' || s === 'paused' || s === 'explain' ? 'off' : s))
    setSource('samples')
  }

  // First sample picture, and redraw when the room light changes.
  useEffect(() => {
    if (source === 'samples') renderSample(sampleState.current.kind, true)
  }, [source, light, renderSample])

  // ── Examples ─────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const m: Record<string, { n: number; dim: number }> = {}
    for (const c of classes) m[c.id] = { n: 0, dim: 0 }
    for (const e of examplesRef.current) {
      const s = m[e.classId]
      if (s) {
        s.n++
        if (e.dim) s.dim++
      }
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, version])

  const examplesFor = useCallback((list: LabClass[]): Example[] => {
    const idx = new Map(list.map((c, i) => [c.id, i]))
    return examplesRef.current
      .filter((e) => idx.has(e.classId))
      .map((e) => ({
        id: e.id,
        cls: idx.get(e.classId) ?? 0,
        thumb: e.thumb,
        feats: e.feats,
        dim: e.dim,
      }))
  }, [])

  const addExample = useCallback(
    (classId: string) => {
      const cls = classesRef.current.find((c) => c.id === classId)
      if (!cls) return false
      if (examplesRef.current.filter((e) => e.classId === classId).length >= MAX_PER_CLASS) {
        setNotice(`“${cls.name}” has ${MAX_PER_CLASS} examples — that’s plenty! Try teaching it somewhere new instead.`)
        return false
      }
      if (sourceRef.current === 'samples') renderSample(cls.sample)
      const t = grabThumb()
      if (!t) return false
      examplesRef.current.push({
        id: nextExampleId.current++,
        classId,
        thumb: t,
        feats: extractFeatures(t),
        dim: lightRef.current < 0.8,
      })
      setVersion((v) => v + 1)
      return true
    },
    [grabThumb, renderSample],
  )
  const classesRef = useRef(classes)
  classesRef.current = classes

  const removeLast = (classId: string) => {
    for (let i = examplesRef.current.length - 1; i >= 0; i--) {
      if (examplesRef.current[i].classId === classId) {
        examplesRef.current.splice(i, 1)
        break
      }
    }
    setVersion((v) => v + 1)
  }
  const clearClass = (classId: string) => {
    examplesRef.current = examplesRef.current.filter((e) => e.classId !== classId)
    setVersion((v) => v + 1)
  }

  // ── Model (k-NN samples cached per version + feature groups) ─────────────
  const knnTrain = useMemo(() => toSamples(examplesFor(classes), groups), [classes, groups, version, examplesFor]) // eslint-disable-line react-hooks/exhaustive-deps
  const trainable = useMemo(() => classes.filter((c) => (counts[c.id]?.n ?? 0) > 0).length >= 2, [classes, counts])
  const classIds = classes.map((c) => c.id).join('|')
  const netUsable = modelKind === 'net' && !!trainerRef.current?.done && trainerClassIds.join('|') === classIds
  const netStale = netUsable && netVersion !== version

  const predictRef = useRef<(f: Features) => number[] | null>(() => null)
  predictRef.current = (f: Features) => {
    if (!trainable) return null
    if (netUsable && trainerRef.current) return trainerRef.current.predict(f)
    return knnProbs(knnTrain, f, groups, classes.length)
  }

  // ── Live loop: capture while held, predict, decide the robot's action ────
  const capturingRef = useRef(capturing)
  capturingRef.current = capturing
  const showRef = useRef(show)
  showRef.current = show
  const thresholdRef = useRef(threshold)
  thresholdRef.current = threshold
  const decision = useRef<{ cand: string; streak: number; committed: string }>({
    cand: '',
    streak: 0,
    committed: '',
  })
  const lastShuffle = useRef(0)

  const checkMissionsRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return
      const cap = capturingRef.current
      if (cap) {
        addExample(cap)
      } else if (sourceRef.current === 'samples' && showRef.current === 'shuffle') {
        const now = performance.now()
        if (now - lastShuffle.current > 1600) {
          lastShuffle.current = now
          const kinds = Array.from(new Set(classesRef.current.map((c) => c.sample)))
          renderSample(kinds[Math.floor(Math.random() * kinds.length)] ?? 'nothing')
        }
      }
      const t = grabThumb()
      if (!t) return
      const f = extractFeatures(t)
      setFeats(f)
      const p = predictRef.current(f)
      setProbs(p)
      if (!p) {
        setAction('idle')
        setUnsure(false)
        return
      }
      const top = argmax(p)
      const sure = p[top] >= thresholdRef.current
      const cls = classesRef.current[top]
      const cand = sure && cls ? cls.id : 'unsure'
      const d = decision.current
      d.streak = d.cand === cand ? d.streak + 1 : 1
      d.cand = cand
      if (d.streak >= 2 && d.committed !== cand) {
        d.committed = cand
        if (cand === 'unsure') {
          setAction('stop')
          setUnsure(true)
          if (thresholdRef.current >= 0.7) statsRef.current.stoppedUnsure = true
        } else if (cls) {
          setAction(cls.action)
          setUnsure(false)
          statsRef.current.actionsDone.add(cls.action)
        }
        checkMissionsRef.current()
      }
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [addExample, grabThumb, renderSample])

  // ── Following the ball (counts toward a Legend mission) ──────────────────
  const lastFollowCheck = useRef(0)
  const onFollow = useCallback((dt: number) => {
    statsRef.current.followSeconds += dt
    const s = Math.floor(statsRef.current.followSeconds)
    if (s !== lastFollowCheck.current) {
      lastFollowCheck.current = s
      checkMissionsRef.current()
    }
  }, [])

  // ── Missions ─────────────────────────────────────────────────────────────
  const buildStats = useCallback((): LabStats => {
    const st = statsRef.current
    return {
      classes: classesRef.current.map((c) => {
        const list = examplesRef.current.filter((e) => e.classId === c.id)
        return {
          count: list.length,
          dimCount: list.filter((e) => e.dim).length,
          action: c.action,
        }
      }),
      evals: st.evals,
      actionsDone: Array.from(st.actionsDone),
      stoppedUnsure: st.stoppedUnsure,
      threshold: thresholdRef.current,
      followSeconds: st.followSeconds,
      netTrained: st.netTrained,
    }
  }, [])

  const doneRef = useRef(done)
  doneRef.current = done
  const tierRef = useRef(tier)
  tierRef.current = tier

  checkMissionsRef.current = () => {
    const stats = buildStats()
    const newly = missionsForTier(tierRef.current).filter((m) => !doneRef.current.includes(m.id) && m.check(stats))
    if (!newly.length) return
    const next = [...doneRef.current, ...newly.map((m) => m.id)]
    doneRef.current = next
    setDone(next)
    saveDoneMissions(next)
    for (const m of newly) {
      reportActivity({
        kind: 'activity',
        id: `vision-lab:${m.id}`,
        xp: 30,
        stars: starsFor(stats),
        badges: ['robot-teacher'],
      })
    }
    setCelebrate(newly[newly.length - 1])
    playSound('star')
  }

  // ── Testing and training ─────────────────────────────────────────────────
  const recordEval = (model: 'knn' | 'net', score: Score, dark: Score | null) => {
    const off = FEATURE_GROUPS.filter((g) => !groups[g]).length
    statsRef.current.evals.push({
      model,
      accuracy: score.accuracy,
      dimAccuracy: dark ? dark.accuracy : null,
      recall: score.recall,
      classes: classes.length,
      counts: classes.map((c) => counts[c.id]?.n ?? 0),
      groupsOff: off,
      hidden: model === 'net' && info.advanced ? hidden : 0,
    })
    setResult({ score, dark, classIds: classes.map((c) => c.id), model })
    checkMissionsRef.current()
  }

  const runTest = (withDark: boolean) => {
    setNotice(null)
    if (FEATURE_GROUPS.every((g) => !groups[g])) {
      setNotice('Switch on at least one feature group — with none, the robot sees nothing at all.')
      return
    }
    const ex = examplesFor(classes)
    const enough = classes.filter((c) => (counts[c.id]?.n ?? 0) >= 2).length
    if (enough < 2) {
      setNotice('Give at least two classes 2 or more examples first — the test hides one picture at a time and asks the robot what it is.')
      return
    }
    if (modelKind === 'net') {
      const tr = trainerRef.current
      if (!netUsable || !tr) {
        setNotice('Train the neural network first, then test it.')
        return
      }
      const r = tr.evaluate(withDark)
      recordEval('net', r.score, r.dark)
      playSound(r.score.accuracy >= 0.8 ? 'correct' : 'click')
      return
    }
    const r = evaluateKnn(ex, groups, classes.length, withDark)
    recordEval('knn', r.score, r.dark)
    playSound(r.score.accuracy >= 0.8 ? 'correct' : 'click')
  }

  const rafRef = useRef(0)
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const train = () => {
    setNotice(null)
    const enough = classes.filter((c) => (counts[c.id]?.n ?? 0) >= 4).length
    if (enough < classes.length || classes.length < 2) {
      setNotice('Give every class at least 4 examples before training — a quarter are kept aside to test the network fairly.')
      return
    }
    if (FEATURE_GROUPS.every((g) => !groups[g])) {
      setNotice('Switch on at least one feature group first.')
      return
    }
    cancelAnimationFrame(rafRef.current)
    const tr = new NetTrainer(examplesFor(classes), classes.length, groups, {
      hidden: info.advanced ? hidden : 0,
      learningRate: lr,
      epochs,
      seed: 1 + (version % 997),
    })
    trainerRef.current = tr
    setTrainerClassIds(classes.map((c) => c.id))
    setNetVersion(version)
    setTraining(true)
    setModelKind('net')
    const per = Math.max(1, Math.round(epochs / 60))
    const frame = () => {
      const finished = tr.step(per)
      setTrainView({
        train: [...tr.trainLoss],
        test: [...tr.testLoss],
        epochs: tr.epochs,
      })
      if (!finished) {
        rafRef.current = requestAnimationFrame(frame)
        return
      }
      setTraining(false)
      statsRef.current.netTrained = true
      const r = tr.evaluate(false)
      recordEvalRef.current('net', r.score, r.dark)
      playSound(r.score.accuracy >= 0.8 ? 'levelup' : 'click')
    }
    rafRef.current = requestAnimationFrame(frame)
  }
  const recordEvalRef = useRef(recordEval)
  recordEvalRef.current = recordEval

  // ── Classes editing ──────────────────────────────────────────────────────
  const updateClass = (id: string, patch: Partial<LabClass>) => setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const addClass = () => {
    if (classes.length >= info.maxClasses) return
    const used = new Set(classes.map((c) => c.sample))
    const pick = PRESETS.Legend.concat(PRESETS.Ace).find((p) => !used.has(p.sample)) ?? {
      name: 'New class',
      sample: 'nothing' as SampleKind,
      action: 'idle' as RobotAction,
    }
    const usedColors = new Set(classes.map((c) => c.color))
    setClasses((cs) => [
      ...cs,
      {
        id: newClassId(),
        name: pick.name,
        sample: pick.sample,
        action: pick.action,
        color: CLASS_COLORS.find((x) => !usedColors.has(x)) ?? CLASS_COLORS[0],
      },
    ])
  }
  const removeClass = (id: string) => {
    if (classes.length <= 2) return
    examplesRef.current = examplesRef.current.filter((e) => e.classId !== id)
    setClasses((cs) => cs.filter((c) => c.id !== id))
    setVersion((v) => v + 1)
  }
  const startFresh = (t: TierName) => {
    examplesRef.current = []
    trainerRef.current = null
    setTrainerClassIds([])
    setTrainView(null)
    setResult(null)
    setModelKind('knn')
    setClasses(presetClasses(t))
    setVersion((v) => v + 1)
    setCelebrate(null)
  }
  const chooseTier = (t: TierName) => {
    setTier(t)
    setCelebrate(null)
    const max = tierInfo(t).maxClasses
    if (!examplesRef.current.length) startFresh(t)
    else if (classes.length > max) {
      const keep = classes.slice(0, max)
      const ids = new Set(keep.map((c) => c.id))
      examplesRef.current = examplesRef.current.filter((e) => ids.has(e.classId))
      setClasses(keep)
      setVersion((v) => v + 1)
    }
    if (!tierInfo(t).net) setModelKind('knn')
    if (!tierInfo(t).advanced) {
      setGroups(ALL_ON)
      setHidden(16)
    }
  }

  // ── Derived view data ────────────────────────────────────────────────────
  const classViews: ClassView[] = classes.map((c) => ({
    id: c.id,
    name: c.name || 'Unnamed',
    color: c.color,
    icon: sampleInfo(c.sample).emoji,
  }))
  const resultViews = result && result.classIds.join('|') === classIds ? result : null
  const missions = missionsForTier(tier)
  const nextMission = missions.find((m) => !done.includes(m.id))
  const nCounts = classes.map((c) => counts[c.id]?.n ?? 0)
  const imbalance = trainable && Math.min(...nCounts) * 3 <= Math.max(...nCounts) && Math.max(...nCounts) >= 6
  const smallest = classes[nCounts.indexOf(Math.min(...nCounts))]
  const top = probs ? argmax(probs) : -1
  const recent = (classId: string) => examplesRef.current.filter((e) => e.classId === classId).slice(-6)

  const sparkSays = (() => {
    if (!trainable) return 'Hold a button below to show me examples of each class. I learn from what you show me!'
    if (imbalance && smallest) return `“${smallest.name}” has far fewer examples than the others. I might be unfair to it — that’s called bias.`
    if (unsure) return 'I’m not sure what that is, so I stopped. Stopping is the safe choice!'
    if (light < 0.7) return 'It’s dark! If you only taught me in bright light, I may get confused. Teach me in the dark too.'
    if (probs && top >= 0) return `I think that’s “${classes[top]?.name}” — ${Math.round(probs[top] * 100)}% sure. ${actionInfo(action).says}`
    return 'Show me something!'
  })()

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-3 pb-28 sm:px-4">
      {/* Tier picker */}
      <nav aria-label="Choose your level" className="-mx-3 overflow-x-auto px-3">
        <ul className="flex gap-2">
          {VISION_TIERS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => chooseTier(t.id)}
                aria-pressed={tier === t.id}
                className={`${btn} min-w-[7rem] flex-col !gap-0 py-1.5 ${tier === t.id ? 'bg-amber-500 text-[#1A1103]' : 'border border-white/15 bg-white/5 text-slate-100'}`}
              >
                <span className="font-display text-base font-bold">{t.id}</span>
                <span className="text-xs opacity-80">Ages {t.ages}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Current mission */}
      <Card className="!p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden="true">
            {celebrate ? '🏆' : '🎯'}
          </span>
          <div className="min-w-0 flex-1">
            {celebrate ? (
              <>
                <p className="font-display text-lg font-bold text-green-400">Mission complete: {celebrate.title}!</p>
                <p className="mt-1 text-slate-200">{celebrate.lesson}</p>
                <button type="button" className={`${btnGhost} mt-3`} onClick={() => setCelebrate(null)}>
                  {nextMission ? 'Next mission' : 'Keep experimenting'}
                </button>
              </>
            ) : nextMission ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  {tier} mission {missions.indexOf(nextMission) + 1} of {missions.length}
                </p>
                <p className="font-display text-lg font-bold text-white">{nextMission.title}</p>
                <p className="mt-1 text-slate-200">{nextMission.goal}</p>
              </>
            ) : (
              <>
                <p className="font-display text-lg font-bold text-white">Every {tier} mission done!</p>
                <p className="mt-1 text-slate-200">Try the next level, or invent your own signs and teach them.</p>
              </>
            )}
          </div>
          <ol className="flex shrink-0 gap-1" aria-label="Missions finished">
            {missions.map((m) => (
              <li key={m.id} title={m.title} className={`h-3 w-3 rounded-full ${done.includes(m.id) ? 'bg-green-500' : 'bg-white/20'}`}>
                <span className="sr-only">
                  {m.title}: {done.includes(m.id) ? 'done' : 'not yet'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {/* Eye + robot */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:mx-auto lg:w-full lg:max-w-4xl">
        <figure className="relative aspect-square overflow-hidden rounded-[20px] border border-white/10 bg-black">
          <canvas
            ref={viewRef}
            width={VIEW}
            height={VIEW}
            className={`h-full w-full ${source === 'samples' ? '' : 'hidden'}`}
            aria-label="Sample picture the robot is looking at"
            role="img"
          />
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="Your camera"
            className={`h-full w-full object-cover ${source === 'camera' && camState === 'on' ? '' : 'hidden'} ${facing === 'user' ? '-scale-x-100' : ''}`}
            style={light !== 1 ? { filter: `brightness(${light})` } : undefined}
          />
          {source === 'camera' && camState !== 'on' && (
            <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm text-slate-300">
              {camState === 'starting' ? 'Starting camera…' : 'Camera is off'}
            </div>
          )}
          {capturing && <span className="absolute inset-0 rounded-[20px] ring-4 ring-inset ring-amber-400 motion-safe:animate-pulse" aria-hidden="true" />}
          <figcaption className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Robot sees</figcaption>
        </figure>

        <figure className="relative aspect-square overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
          <VisionRobotScene action={action} onFollow={onFollow} />
          <figcaption className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Robot does</figcaption>
          <p
            className={`absolute inset-x-2 bottom-2 rounded-xl px-2 py-1 text-center text-sm font-bold ${unsure ? 'bg-amber-500 text-[#1A1103]' : 'bg-black/65 text-white'}`}
            aria-live="polite"
          >
            {unsure ? '🤔 Not sure → stop' : `${actionInfo(action).icon} ${actionInfo(action).label}`}
          </p>
        </figure>
      </div>

      {/* Teach: hold-to-capture */}
      <Card title="Teach your robot">
        <p className="mb-3 text-sm text-slate-300">
          Hold a button to add examples (5 a second).{' '}
          {source === 'samples' ? 'Each one is a new sample picture.' : 'Move your hand around a little for variety.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => {
            const n = counts[c.id]?.n ?? 0
            return (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <button
                  type="button"
                  className={`${btn} w-full touch-none select-none text-[#1A1103] ${capturing === c.id ? 'scale-[.97] ring-4 ring-white/70' : ''}`}
                  style={{ background: c.color }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    ;(e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId)
                    setNotice(null)
                    addExample(c.id)
                    setCapturing(c.id)
                  }}
                  onPointerUp={() => setCapturing(null)}
                  onPointerCancel={() => setCapturing(null)}
                  onLostPointerCapture={() => setCapturing(null)}
                  onContextMenu={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      addExample(c.id)
                    }
                  }}
                  aria-label={`Add an example of ${c.name}. ${n} so far.`}
                >
                  <span aria-hidden="true">{sampleInfo(c.sample).emoji}</span>
                  <span className="truncate">Hold: {c.name}</span>
                  <span className="ml-auto rounded-full bg-black/20 px-2 font-display tabular-nums">{n}</span>
                </button>
                <div className="mt-2 flex min-h-[40px] items-center gap-1 overflow-hidden">
                  {recent(c.id).map((e) => (
                    <ThumbCanvas key={e.id} thumb={e.thumb} size={36} label={`Example of ${c.name}`} />
                  ))}
                  {n === 0 && <span className="text-xs text-slate-400">No examples yet</span>}
                  {n > 0 && (
                    <span className="ml-auto flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="min-h-[44px] rounded-xl px-2 text-xs text-slate-300 underline-offset-2 hover:underline"
                        onClick={() => removeLast(c.id)}
                      >
                        Undo
                      </button>
                      <button
                        type="button"
                        className="min-h-[44px] rounded-xl px-2 text-xs text-slate-300 underline-offset-2 hover:underline"
                        onClick={() => clearClass(c.id)}
                      >
                        Clear
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {notice && (
          <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-slate-100" role="status">
            {notice}
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-start gap-2">
            <span className="text-2xl" aria-hidden="true">
              🤖
            </span>
            <p className="text-sm text-slate-200" aria-live="polite">
              {sparkSays}
            </p>
          </div>
          <ConfidenceBars classes={classViews} probs={probs} threshold={threshold} showThreshold={tier === 'Ace' || tier === 'Legend'} />
          {(tier === 'Ace' || tier === 'Legend') && (
            <label className="mt-4 block text-sm text-slate-200">
              Confidence threshold: <strong className="font-display text-white">{Math.round(threshold * 100)}%</strong>
              <span className="block text-xs text-slate-400">Below this, the robot stops instead of guessing.</span>
              <input
                type="range"
                min={0.3}
                max={0.95}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-2 h-8 w-full accent-amber-500"
              />
            </label>
          )}
        </Card>

        {/* Picture source + light */}
        <Card>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={source === 'samples' ? btnPrimary : btnGhost} aria-pressed={source === 'samples'} onClick={switchToSamples}>
              🖼️ Sample pictures
            </button>
            <button
              type="button"
              className={source === 'camera' && camState === 'on' ? btnPrimary : btnGhost}
              aria-pressed={source === 'camera' && camState === 'on'}
              onClick={() => {
                if (camState !== 'on' && camState !== 'starting') setCamState('explain')
              }}
            >
              📷 Use my camera
            </button>
            {source === 'camera' && camState === 'on' && (
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  const f = facing === 'user' ? 'environment' : 'user'
                  setFacing(f)
                  void startCamera(f)
                }}
              >
                🔄 Flip camera
              </button>
            )}
          </div>

          {camState === 'explain' && (
            <div className="mt-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-slate-100">
              <p className="font-semibold">Why does the robot need the camera?</p>
              <p className="mt-1 text-sm">
                So it can learn from your hands and things around you. The pictures stay on this device — they are shrunk to tiny 32×32 squares, used to learn,
                and forgotten when you leave. Nothing is uploaded or saved.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={() => void startCamera(facing)}>
                  Turn on camera
                </button>
                <button type="button" className={btnGhost} onClick={() => setCamState('off')}>
                  Not now
                </button>
              </div>
            </div>
          )}
          {camState === 'paused' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
              The camera was switched off while you were away.
              <button type="button" className={btnPrimary} onClick={() => void startCamera(facing)}>
                Turn it back on
              </button>
            </div>
          )}
          {(camState === 'denied' || camState === 'nocam' || camState === 'unsupported' || camState === 'error') && (
            <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-slate-100" role="status">
              {camState === 'denied'
                ? 'The camera is blocked for R2BOT Kids. That’s okay! You can allow it in your phone’s settings later — for now, the sample pictures work just as well.'
                : camState === 'nocam'
                  ? 'We couldn’t find a camera on this device. The sample pictures work just as well!'
                  : camState === 'unsupported'
                    ? 'This browser can’t share its camera here. The sample pictures work just as well!'
                    : 'The camera didn’t start (another app may be using it). Try again, or use the sample pictures.'}
            </p>
          )}

          {source === 'samples' && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-200">Show the robot:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_KINDS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={show === s.id}
                    className={`${btn} border px-3 ${show === s.id ? 'border-amber-400 bg-amber-500/20 text-white' : 'border-white/15 bg-white/5 text-slate-100'}`}
                    onClick={() => {
                      setShow(s.id)
                      renderSample(s.id)
                    }}
                  >
                    <span aria-hidden="true">{s.emoji}</span> {s.name}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={show === 'shuffle'}
                  className={`${btn} border px-3 ${show === 'shuffle' ? 'border-amber-400 bg-amber-500/20 text-white' : 'border-white/15 bg-white/5 text-slate-100'}`}
                  onClick={() => setShow('shuffle')}
                >
                  🔀 Surprise me
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">Every picture is drawn fresh: a new place, size, angle, skin tone and wall — like real life.</p>
            </div>
          )}

          {tier !== 'Cadet' && (
            <label className="mt-4 block text-sm text-slate-200">
              Room light: <strong className="text-white">{light < 0.7 ? 'Dim' : light > 1.15 ? 'Very bright' : 'Normal'}</strong> ({Math.round(light * 100)}%)
              <input
                type="range"
                min={0.3}
                max={1.5}
                step={0.05}
                value={light}
                onChange={(e) => setLight(Number(e.target.value))}
                className="mt-2 h-8 w-full accent-amber-500"
              />
            </label>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Brain */}
        <Card title="Robot brain">
          {info.net ? (
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose the brain">
              <button
                type="button"
                aria-pressed={modelKind === 'knn'}
                className={modelKind === 'knn' ? btnPrimary : btnGhost}
                onClick={() => setModelKind('knn')}
              >
                Nearest neighbours
              </button>
              <button
                type="button"
                aria-pressed={modelKind === 'net'}
                className={modelKind === 'net' ? btnPrimary : btnGhost}
                onClick={() => setModelKind('net')}
              >
                Neural network
              </button>
            </div>
          ) : null}
          {modelKind === 'knn' ? (
            <p className="text-sm text-slate-200">
              <strong className="text-white">Nearest neighbours (k-NN):</strong> the robot keeps every example. To decide, it finds the {knnK(knnTrain.length)}{' '}
              example{knnK(knnTrain.length) === 1 ? '' : 's'} most like what it sees now and lets them vote. No training needed — add an example and it already
              knows a bit more.
            </p>
          ) : (
            <div className="space-y-3 text-sm text-slate-200">
              <p>
                <strong className="text-white">Neural network:</strong>{' '}
                {info.advanced && hidden > 0
                  ? `${hidden} hidden neurons (ReLU) between the features and the answer.`
                  : 'one layer of weights from every feature to every class (softmax regression).'}{' '}
                Training nudges the weights again and again to make the <em>loss</em> (how wrong it is) smaller. A quarter of your examples are kept aside as a
                fair test.
              </p>
              {info.advanced && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    Hidden neurons
                    <select
                      value={hidden}
                      onChange={(e) => setHidden(Number(e.target.value))}
                      className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-[#111C32] px-2 text-white"
                    >
                      {[0, 4, 8, 16, 32].map((h) => (
                        <option key={h} value={h}>
                          {h === 0 ? '0 (one layer)' : h}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Learning rate
                    <select
                      value={lr}
                      onChange={(e) => setLr(Number(e.target.value))}
                      className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-[#111C32] px-2 text-white"
                    >
                      {[0.001, 0.003, 0.01, 0.03, 0.1].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Epochs
                    <select
                      value={epochs}
                      onChange={(e) => setEpochs(Number(e.target.value))}
                      className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-[#111C32] px-2 text-white"
                    >
                      {[20, 60, 150, 300].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <button type="button" className={btnPrimary} onClick={train} disabled={training}>
                {training ? 'Training…' : trainView ? 'Train again' : 'Train the network'}
              </button>
              {netStale && !training && <p className="text-xs text-amber-300">Your examples changed since training. Train again so the network learns them.</p>}
              {modelKind === 'net' && !netUsable && !training && trainable && (
                <p className="text-xs text-slate-400">Until you train it, the robot uses nearest neighbours.</p>
              )}
              {trainView && <LossChart train={trainView.train} test={trainView.test} epochs={trainView.epochs} />}
            </div>
          )}

          {info.advanced && (
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-200">Features the brain may use</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FEATURE_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={groups[g]}
                    className={`${btn} border px-3 text-sm ${groups[g] ? 'border-cyan-300 bg-cyan-400/15 text-white' : 'border-white/15 bg-white/5 text-slate-400 line-through'}`}
                    onClick={() => setGroups((s) => ({ ...s, [g]: !s[g] }))}
                  >
                    {GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">Switch one off and test again: which one was doing the work?</p>
            </fieldset>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button type="button" className={btnPrimary} onClick={() => runTest(false)} disabled={training}>
              ✅ Test my robot
            </button>
            {tier !== 'Cadet' && (
              <button type="button" className={btnGhost} onClick={() => runTest(true)} disabled={training}>
                🌙 Test in the dark
              </button>
            )}
          </div>
          {resultViews && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-slate-400">
                {resultViews.model === 'knn'
                  ? 'Test: each example is hidden in turn and the robot guesses it from all the others.'
                  : 'Test: examples the network never trained on.'}
              </p>
              <ScoreView classes={classViews} score={resultViews.score} dark={resultViews.dark} showMatrix={tier === 'Ace' || tier === 'Legend'} />
            </div>
          )}
        </Card>

        {/* Classes */}
        <Card title="Your classes">
          <ul className="space-y-3">
            {classes.map((c) => (
              <li key={c.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                  <label className="sr-only" htmlFor={`name-${c.id}`}>
                    Class name
                  </label>
                  <input
                    id={`name-${c.id}`}
                    value={c.name}
                    maxLength={16}
                    autoComplete="off"
                    onChange={(e) => updateClass(c.id, { name: e.target.value })}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-[#111C32] px-3 text-white"
                  />
                  {classes.length > 2 && (
                    <button type="button" className={`${btnGhost} !min-h-[48px] !px-3`} onClick={() => removeClass(c.id)} aria-label={`Remove ${c.name}`}>
                      ✕
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-300">
                  <label>
                    Robot action
                    <select
                      value={c.action}
                      onChange={(e) =>
                        updateClass(c.id, {
                          action: e.target.value as RobotAction,
                        })
                      }
                      className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-[#111C32] px-2 text-white"
                    >
                      {ACTIONS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.icon} {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sample pictures
                    <select
                      value={c.sample}
                      onChange={(e) =>
                        updateClass(c.id, {
                          sample: e.target.value as SampleKind,
                        })
                      }
                      className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-[#111C32] px-2 text-white"
                    >
                      {SAMPLE_KINDS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.emoji} {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {classes.length < info.maxClasses && (
              <button type="button" className={btnGhost} onClick={addClass}>
                ＋ Add a class
              </button>
            )}
            <button type="button" className={btnGhost} onClick={() => startFresh(tier)}>
              Start fresh
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Names stay on this device. Up to {info.maxClasses} classes at {tier} level.
          </p>
        </Card>
      </div>

      {/* What the robot sees */}
      <Card title="This is what the robot sees">
        <p className="mb-3 text-sm text-slate-300">
          A robot doesn’t see a “hand”. It sees numbers. Every picture is shrunk to 32×32 dots and turned into {`${256 + 15 + 24}`} numbers in three groups —
          and those numbers are all it learns from.
        </p>
        <FeatureView feats={feats} />
      </Card>

      {/* All missions */}
      <Card title={`${tier} missions`}>
        <ol className="space-y-2">
          {missions.map((m) => {
            const isDone = done.includes(m.id)
            return (
              <li key={m.id} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${isDone ? 'bg-green-500 text-[#06240F]' : 'bg-white/10 text-slate-300'}`}
                  aria-hidden="true"
                >
                  {isDone ? '✓' : missions.indexOf(m) + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">
                    {m.title}
                    <span className="sr-only">{isDone ? ' (done)' : ''}</span>
                  </p>
                  <p className="text-sm text-slate-300">{isDone ? m.lesson : m.goal}</p>
                </div>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-sm text-slate-300">
          Finish a mission to earn the <strong className="text-white">🧠 Robot Teacher</strong> badge and XP. Want to build a robot with a camera eye?{' '}
          <Link href="/kids/workshop" className="inline-flex min-h-11 items-center text-amber-300 underline underline-offset-2">
            Open the Workshop
          </Link>
          .
        </p>
      </Card>
    </div>
  )
}
