'use client'

// components/kids/ai/talk/TalkClient.tsx
// TALK TO YOUR ROBOT — the app screen. The child picks a mission, says or
// types the plan, sees how the robot understood it (words → intents →
// blocks), answers the robot's questions, runs it on THEIR robot in a
// real-physics arena, and debugs it by fixing the words or the blocks.
//
// Light on purpose: the parser is plain TypeScript and runs on the device
// (works offline). The physics stage (Rapier + three.js) and the block editor
// (Blockly) are next/dynamic({ ssr: false }) behind skeletons of the same
// size; the editor loads only once there is a program to show.

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BAND_ORDER, getBand, KIDS_BANDS, type BandId } from '@/lib/kids/bands'
import { getProgress } from '@/lib/kids-progress'
import { capabilitiesOf, DEFAULT_DESIGN, getPart, loadDesign, ROBOT_CHANGED_EVENT, type RobotDesign, type Slot } from '@/lib/kids/robot-design'
import { reportActivity } from '@/lib/kids/universe/rewards'
import { playSound, sparkListen, sparkSays, speechRecognitionSupported, speechSupported } from '@/lib/kids-audio'
import { countStmts, missingParts, type Program, type Stmt } from '@/lib/kids/sim/program'
import type { ChallengeResult } from '@/lib/kids/sim/challenge'
import type { BlocklyEditorHandle } from '@/components/kids/sim/BlocklyEditorClient'
import type { CameraMode } from '@/components/kids/sim/renderer'
import type { StageRunRequest } from '@/components/kids/sim/ChallengeStageClient'
import { EXAMPLE_PHRASES, LIMITS, parsePlan, withBlocksAtUnknown, type ParseResult, type Question, type Step } from '@/lib/kids/ai/talk/parser'
import { looksPrivate } from '@/lib/kids/ai/talk/privacy'
import { classifySpark, isCrisis } from '@/lib/kids/ai/spark/safety'
import HelplineCardClient from '@/components/kids/ai/spark/HelplineCardClient'
import { canonicalise, FREE_PLAY, missionDesign, missionsFor, type TalkMission } from '@/lib/kids/ai/talk/missions'
import { validateProgram } from '@/lib/kids/ai/talk/schema'
import { stmtText } from '@/lib/kids/ai/talk/describe'
import UnderstandingClient, { ROLE_LEGEND, stepOfBlock } from './UnderstandingClient'
import { KIDS_STANDALONE } from '@/lib/kids/app-context'

function StageSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0A1120] text-slate-300" aria-busy="true">
      <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
      <p className="text-sm font-bold">Getting your robot ready…</p>
    </div>
  )
}

function EditorSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-[20px] bg-[#111C32]" aria-busy="true" aria-label="Loading the block editor" />
}

const Stage = dynamic(() => import('@/components/kids/sim/ChallengeStageClient'), { ssr: false, loading: StageSkeleton })
const Editor = dynamic(() => import('./TalkEditorClient'), { ssr: false, loading: EditorSkeleton })

const PB = (id: string) => `talk-${id}`
const FREE_ID = 'free'
const SHOW_ME_AFTER = 3

type Tab = 'words' | 'blocks'

/** Same program, ignoring block ids (Blockly gives new blocks new ids). */
function sameProgram(a: Program, b: Program): boolean {
  const strip = (list: Stmt[]): unknown =>
    list.map((s) => {
      const o: Record<string, unknown> = { ...s }
      delete o.id
      if ('body' in s) o.body = strip(s.body)
      if (s.op === 'if') {
        o.then = strip(s.then)
        if (s.else) o.else = strip(s.else)
      }
      return o
    })
  return JSON.stringify(strip(a.body)) === JSON.stringify(strip(b.body))
}

function hasLoop(list: Stmt[]): boolean {
  return list.some((s) => {
    if (s.op === 'repeat' || s.op === 'repeat_until' || s.op === 'forever') return true
    return s.op === 'if' && (hasLoop(s.then) || hasLoop(s.else ?? []))
  })
}
function usesSensor(list: Stmt[], sensor: string): boolean {
  return JSON.stringify(list).includes(`"s":"${sensor}"`)
}

interface Outcome {
  result: ChallengeResult
  stars: number
  reasons: string[]
  improved: boolean
  xp: number
}

export default function TalkClient() {
  // ── Who and what ──────────────────────────────────────────────────────
  const [band, setBand] = useState<BandId>('builders')
  const [missionId, setMissionId] = useState<string>(FREE_ID)
  const [mine, setMine] = useState<RobotDesign | null>(null)
  const [bests, setBests] = useState<Record<string, number>>({})

  useEffect(() => {
    const p = getProgress()
    const b = p.band ?? 'builders'
    setBand(b)
    setMissionId(missionsFor(b)[0]?.id ?? FREE_ID)
    setBests(p.personalBests)
    setMine(loadDesign())
    const onRobot = () => setMine(loadDesign())
    window.addEventListener(ROBOT_CHANGED_EVENT, onRobot)
    return () => window.removeEventListener(ROBOT_CHANGED_EVENT, onRobot)
  }, [])

  const missions = useMemo(() => missionsFor(band), [band])
  const mission: TalkMission | null = missions.find((m) => m.id === missionId) ?? null
  const challenge = mission?.challenge ?? FREE_PLAY
  const design = useMemo(() => missionDesign(mission, mine ?? DEFAULT_DESIGN), [mission, mine])
  const caps = useMemo(() => capabilitiesOf(design), [design])
  const fitted = useMemo(() => {
    if (!mission || !mine) return []
    return (Object.entries(mission.parts) as [Slot, string][]).filter(([slot, id]) => mine[slot] !== id).map(([slot, id]) => getPart(slot, id)?.name ?? id)
  }, [mission, mine])

  // ── Words and understanding ───────────────────────────────────────────
  const [text, setText] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  /** The program the words produced (or the AI helper / "show me" gave). */
  const [wordProgram, setWordProgram] = useState<Program | null>(null)
  const [tab, setTab] = useState<Tab>('words')
  const [editorWanted, setEditorWanted] = useState(false)
  const editorRef = useRef<BlocklyEditorHandle | null>(null)
  const pendingLoad = useRef<Program | null>(null)
  const [listening, setListening] = useState(false)
  const stopListen = useRef<(() => void) | null>(null)
  const [canListen, setCanListen] = useState(false)
  const [canSpeak, setCanSpeak] = useState(false)
  const [online, setOnline] = useState(true)
  const [aiState, setAiState] = useState<'idle' | 'asking' | 'off' | 'error'>('idle')
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  // A disclosure typed into the robot box ("someone hits me") gets the same
  // helpline card as Ask Spark and is never sent to the AI helper.
  const [serverCrisis, setServerCrisis] = useState(false)
  useEffect(() => setServerCrisis(false), [text])
  const crisis = useMemo(() => serverCrisis || (parsed !== null && isCrisis(classifySpark(text))), [serverCrisis, parsed, text])
  /** null = not asked yet / offline; the button only shows once the server says the helper is on. */
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [micMessage, setMicMessage] = useState<string | null>(null)
  const [usedHelp, setUsedHelp] = useState(false)

  useEffect(() => {
    setCanListen(speechRecognitionSupported())
    setCanSpeak(speechSupported())
    setOnline(navigator.onLine)
    let cancelled = false
    const checkAi = () => {
      // The standalone app has no server: the on-device parser only (the AI button never shows).
      if (KIDS_STANDALONE || !navigator.onLine) return
      fetch('/api/kids/talk', { cache: 'no-store' })
        .then((g) => (g.ok ? (g.json() as Promise<{ enabled?: boolean }>) : { enabled: false }))
        .then((j) => {
          if (!cancelled) setAiAvailable(j.enabled === true)
        })
        .catch(() => {})
    }
    checkAi()
    const on = () => {
      setOnline(true)
      checkAi()
    }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      cancelled = true
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      stopListen.current?.()
    }
  }, [])

  const loadIntoEditor = useCallback((p: Program) => {
    if (editorRef.current) editorRef.current.setProgram(p)
    else {
      pendingLoad.current = p
      setEditorWanted(true)
    }
  }, [])

  const understand = useCallback(
    (words: string, ans: Record<string, string> = answers) => {
      const r = parsePlan(words, { answers: ans })
      setParsed(r)
      setWordProgram(r.program)
      setAiMessage(null)
      setAiState('idle')
      loadIntoEditor(r.program)
      playSound(r.unknown.length > 0 ? 'wrong' : 'click')
      return r
    },
    [answers, loadIntoEditor],
  )

  const onAnswer = (q: Question, value: string) => {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    understand(text, next)
  }

  // ── Mission changes ───────────────────────────────────────────────────
  const [attempts, setAttempts] = useState(0)
  const [failedOnce, setFailedOnce] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [failure, setFailure] = useState<ChallengeResult | null>(null)
  const [failedStep, setFailedStep] = useState<number | null>(null)

  useEffect(() => {
    const words = mission?.starterWords ?? ''
    setText(words)
    setAnswers({})
    setAttempts(0)
    setFailedOnce(false)
    setOutcome(null)
    setFailure(null)
    setFailedStep(null)
    setUsedHelp(false)
    setBubble(null)
    setActiveId(null)
    if (words) {
      const r = parsePlan(words)
      setParsed(r)
      setWordProgram(r.program)
      loadIntoEditor(r.program)
    } else {
      setParsed(null)
      setWordProgram(null)
      if (editorRef.current) editorRef.current.setProgram({ body: [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the mission changes
  }, [missionId])

  // ── Running ───────────────────────────────────────────────────────────
  const [runReq, setRunReq] = useState<StageRunRequest | null>(null)
  const [resetNonce, setResetNonce] = useState(0)
  const [running, setRunning] = useState(false)
  const [stageReady, setStageReady] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [camera, setCamera] = useState<CameraMode>('follow')
  const [bubble, setBubble] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const lastActive = useRef<string | null>(null)
  const runProgram = useRef<Program>({ body: [] })
  const runEdited = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCamera(mission && /draw|star|hexagon|square/i.test(mission.id) ? 'top' : 'follow')
  }, [mission])

  const currentProgram = (): { program: Program; edited: boolean } => {
    const fromEditor = editorRef.current?.getProgram()
    const words = wordProgram ?? { body: [] }
    if (fromEditor && (fromEditor.body.length > 0 || words.body.length === 0)) return { program: fromEditor, edited: !sameProgram(fromEditor, words) }
    return { program: words, edited: false }
  }

  const missing = useMemo(() => (wordProgram ? missingParts(wordProgram, design) : []), [wordProgram, design])
  const blocked = parsed !== null && parsed.questions.length > 0

  const onRun = () => {
    if (!stageReady) return
    const { program, edited } = currentProgram()
    if (program.body.length === 0) {
      setBubble('Tell me what to do first! Type or say a plan, then press Understand.')
      playSound('wrong')
      return
    }
    const p = canonicalise(program, mission?.canonicalSays)
    runProgram.current = p
    runEdited.current = edited
    setOutcome(null)
    setFailure(null)
    setFailedStep(null)
    lastActive.current = null
    setRunning(true)
    setRunReq({ nonce: Date.now(), program: p, nodes: [] })
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const r = stageRef.current?.getBoundingClientRect()
    if (r && (r.top < 0 || r.bottom > window.innerHeight)) stageRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const onReset = () => {
    setRunning(false)
    setRunReq(null)
    setResetNonce((n) => n + 1)
    setBubble(null)
    setActiveId(null)
    editorRef.current?.highlight(null)
  }

  const onActive = useCallback((id: string | null) => {
    setActiveId(id)
    if (id) lastActive.current = id
    editorRef.current?.highlight(id)
  }, [])

  const onDone = useCallback(
    (res: ChallengeResult) => {
      setRunning(false)
      setActiveId(null)
      const n = attempts + 1
      setAttempts(n)
      if (!mission) {
        // Free play: no score, just what happened.
        setBubble(res.message && !res.success ? res.message : 'Done! Change the words and try something new.')
        if (res.reason === 'missing-part') setFailure(res)
        return
      }
      if (!res.success) {
        setFailure(res)
        setFailedOnce(true)
        const idx = parsed ? stepOfBlock(parsed, lastActive.current) : null
        setFailedStep(idx)
        playSound('wrong')
        return
      }
      const program = runProgram.current
      const blocks = countStmts(program.body)
      const wordsOnly = !runEdited.current && !usedHelp
      let stars = 1
      const reasons = ['Mission complete!']
      if (blocks <= mission.parBlocks) {
        stars = 2
        reasons.push(`Short and clear: ${blocks} block${blocks === 1 ? '' : 's'} (par ${mission.parBlocks}).`)
      } else reasons.push(`Two stars: get it done in ${mission.parBlocks} blocks or fewer (you used ${blocks}).`)
      if (stars === 2 && wordsOnly) {
        stars = 3
        reasons.push('Your words alone were clear enough for the robot.')
      } else if (stars === 2) reasons.push('Three stars: solve it with words only — no block edits, no help.')
      const prev = bests[PB(mission.id)] ?? 0
      const improved = stars > prev
      let xp = 0
      if (improved) {
        const badges: string[] = []
        if (hasLoop(program.body)) badges.push('loop-master')
        if (usesSensor(program.body, 'distance_cm')) badges.push('wall-whisperer')
        if (usesSensor(program.body, 'line_offset')) badges.push('line-rider')
        if (usesSensor(program.body, 'floor_color')) badges.push('colour-coder')
        if (failedOnce) badges.push('debugger')
        const rr = reportActivity({
          kind: mission.kind === 'fix' || failedOnce ? 'bugfix' : 'challenge',
          id: PB(mission.id),
          stars,
          score: stars,
          attempts: n,
          badges,
        })
        xp = rr.xpGained
        setBests(rr.progress.personalBests)
      }
      setOutcome({ result: res, stars, reasons, improved, xp })
      playSound(stars === 3 ? 'star' : 'correct')
    },
    [attempts, bests, failedOnce, mission, parsed, usedHelp],
  )

  // ── Voice ─────────────────────────────────────────────────────────────
  const toggleListen = () => {
    if (listening) {
      stopListen.current?.()
      setListening(false)
      return
    }
    setListening(true)
    setMicMessage(null)
    stopListen.current = sparkListen(
      (heard) => {
        setListening(false)
        if (!heard) {
          setMicMessage('I didn’t catch that. Try again, or type it instead.')
          return
        }
        const words = (text ? `${text.replace(/[\s,.]*$/, '')}, ` : '') + heard
        setText(words.slice(0, LIMITS.maxChars))
        understand(words)
      },
      () => {
        setListening(false)
        setMicMessage(
          navigator.onLine
            ? 'The microphone didn’t work this time. Check it is allowed, or type your plan instead.'
            : 'The microphone needs the internet. You can still type your plan — your robot understands typing offline.',
        )
      },
    )
  }

  const readAloud = () => {
    if (!parsed) return
    const lines = parsed.steps.filter((s) => s.understood).map((s) => s.intent.replace(/·/g, ',').replace(/°/g, ' degrees'))
    const q = parsed.questions[0]?.ask
    sparkSays(lines.length ? `I understood: ${lines.join('. Then ')}.${q ? ` But ${q}` : ''}` : 'I did not understand that yet.')
  }

  // ── The optional AI helper ────────────────────────────────────────────
  const askAi = async () => {
    if (!parsed || parsed.unknown.length === 0) return
    if (!navigator.onLine) {
      setAiState('error')
      setAiMessage('You’re offline, so only your robot’s own brain can help. Try shorter steps: “drive 50 cm, then turn left”.')
      return
    }
    // Only the pieces the robot did not understand are sent — never the whole plan.
    const pieces = parsed.unknown.slice(0, 4)
    const joined = pieces.join(', then ')
    if (isCrisis(classifySpark(text)) || isCrisis(classifySpark(joined))) {
      setServerCrisis(true)
      return
    }
    // Checked on the whole text box too: if anything private is anywhere in it, nothing is sent at all.
    const priv = looksPrivate(text) ?? looksPrivate(joined)
    if (priv) {
      setAiState('error')
      setAiMessage(`That looks like ${priv}, so I won’t send it anywhere. Keep private things private — robots only need moves!`)
      return
    }
    if (joined.length > LIMITS.maxChars) {
      setAiState('error')
      setAiMessage('That is a lot of words! Try saying it in smaller steps.')
      return
    }
    setAiState('asking')
    try {
      const res = await fetch('/api/kids/talk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pieces }) })
      const j = (await res.json()) as { ok?: boolean; program?: unknown; message?: string; reason?: string }
      if (j.reason === 'crisis') {
        setAiState('idle')
        setServerCrisis(true)
        return
      }
      if (j.reason === 'disabled') {
        setAiAvailable(false)
        setAiState('off')
        return
      }
      const v = j.ok ? validateProgram(j.program, joined) : null
      if (!v || !v.ok) {
        setAiState('error')
        setAiMessage(j.message ?? 'The AI helper could not turn that into blocks.')
        return
      }
      // The AI's blocks go where the not-understood words were; everything else stays the child's own.
      const merged = withBlocksAtUnknown(parsed, v.program.body)
      const aiIds = new Set(v.program.body.map((s) => s.id))
      setWordProgram(merged)
      const aiStep: Step = {
        words: joined,
        tokens: [{ t: '🤖 AI helper', role: 'words' }],
        intent: 'The AI helper’s guess',
        stmtIds: [...aiIds],
        blocks: v.program.body.map(stmtText),
        notes: ['An AI made this guess from the words I didn’t understand. Check every block — AI can be wrong too! Press Run to test it.'],
        understood: true,
        depth: parsed.steps.find((st) => !st.understood)?.depth ?? 0,
      }
      let placedStep = false
      const steps: Step[] = []
      for (const st of parsed.steps) {
        if (st.understood) steps.push(st)
        else if (!placedStep) {
          steps.push(aiStep)
          placedStep = true
        }
      }
      if (!placedStep) steps.push(aiStep)
      setParsed({
        program: merged,
        steps,
        questions: parsed.questions,
        unknown: [],
        ok: parsed.questions.length === 0,
        blockCount: countStmts(merged.body),
      })
      setUsedHelp(true)
      loadIntoEditor(merged)
      setAiState('idle')
    } catch {
      setAiState('error')
      setAiMessage('The AI helper is not answering. Your robot’s own brain still works — try simpler words.')
    }
  }

  const showMe = () => {
    if (!mission) return
    setText(mission.solution)
    setAnswers(mission.solutionAnswers ?? {})
    setUsedHelp(true)
    understand(mission.solution, mission.solutionAnswers ?? {})
  }

  const onEditorReady = useCallback((h: BlocklyEditorHandle) => {
    editorRef.current = h
    if (pendingLoad.current) {
      h.setProgram(pendingLoad.current)
      pendingLoad.current = null
    }
  }, [])

  const bandInfo = getBand(band)
  const compact = band === 'engineers'
  const starsFor = (id: string) => bests[PB(id)] ?? 0

  return (
    <div className="mx-auto max-w-7xl px-3 pb-24 sm:px-4">
      {!online && (
        <p className="mb-3 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100" role="status">
          {KIDS_STANDALONE ? '📴 No internet needed: your robot’s on-device brain understands you right here.' : '📴 You’re offline. Your robot’s on-device brain still understands you — only the optional AI helper needs the internet.'}
        </p>
      )}

      {/* Band */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Age band">
        {BAND_ORDER.map((id) => {
          const b = KIDS_BANDS.find((x) => x.id === id)!
          const on = id === band
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setBand(id)
                setMissionId(missionsFor(id)[0]?.id ?? FREE_ID)
              }}
              className={`min-h-[48px] shrink-0 rounded-2xl border px-4 text-left transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                on ? 'border-amber-400 bg-amber-400 text-[#1A1103]' : 'border-white/10 bg-[#111C32] text-slate-200'
              }`}
            >
              <span className="block font-display text-sm font-bold">
                {b.emoji} {b.name}
              </span>
              <span className={`block text-xs ${on ? 'text-[#1A1103]/80' : 'text-slate-400'}`}>Ages {b.ages}</span>
            </button>
          )
        })}
      </div>

      {/* Missions */}
      <nav aria-label="Missions" className="-mx-1 mt-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {missions.map((m, i) => {
          const on = m.id === missionId
          const s = starsFor(m.id)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMissionId(m.id)}
              aria-pressed={on}
              data-testid={`mission-${m.id}`}
              className={`min-h-[64px] w-[164px] shrink-0 snap-start rounded-[20px] border p-3 text-left transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                on ? 'border-amber-300 bg-amber-300/10' : 'border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02]'
              }`}
            >
              <span className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>
                  {i + 1}. {m.kind === 'fix' ? 'Fix it' : 'Describe'}
                </span>
                <span aria-label={`${s} of 3 stars`} className="text-amber-300">
                  {'★'.repeat(s)}
                  <span className="text-slate-600">{'★'.repeat(3 - s)}</span>
                </span>
              </span>
              <span className="mt-1 block font-display text-[15px] font-bold leading-tight text-white">
                {m.icon} {m.title}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setMissionId(FREE_ID)}
          aria-pressed={missionId === FREE_ID}
          className={`min-h-[64px] w-[130px] shrink-0 snap-start rounded-[20px] border p-3 text-left transition active:scale-[.97] ${
            missionId === FREE_ID ? 'border-amber-300 bg-amber-300/10' : 'border-white/[0.08] bg-white/[0.03]'
          }`}
        >
          <span className="block text-xs font-bold text-slate-400">Any words</span>
          <span className="mt-1 block font-display text-[15px] font-bold text-white">🎈 Free play</span>
        </button>
      </nav>

      <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ── Left: mission + stage ─────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-3">
          <section className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4" aria-live="polite">
            {mission ? (
              <>
                <p className="font-display text-xl font-bold text-white">
                  {mission.icon} {mission.title}
                </p>
                <p className="mt-1 text-[17px] text-slate-200">{mission.story}</p>
                <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-[15px] font-bold text-amber-200">🎯 {mission.goal}</p>
                <p className="mt-2 text-sm text-slate-400">
                  Robot: <strong className="text-slate-200">{design.name}</strong>
                  {fitted.length > 0 ? ` + ${fitted.join(', ')} for this mission` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-bold text-white">🎈 Free play</p>
                <p className="mt-1 text-[17px] text-slate-200">A playground with a wall, colours, a parcel, a dark corner and a line. Say anything and see what your robot makes of it.</p>
              </>
            )}
          </section>

          <div ref={stageRef} className="scroll-mt-2">
            <div className="relative h-[40vh] min-h-[260px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0A1120] shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:h-[48vh] lg:h-[460px]">
              {mine ? (
                <Stage
                  challenge={challenge}
                  design={design}
                  run={runReq}
                  resetNonce={resetNonce}
                  speed={speed}
                  camera={camera}
                  onActive={onActive}
                  onBubble={setBubble}
                  onDone={onDone}
                  onReady={() => setStageReady(true)}
                  onStart={() => undefined}
                />
              ) : (
                <StageSkeleton />
              )}
              {bubble && (
                <p className="pointer-events-none absolute left-3 right-3 top-3 rounded-2xl bg-[#0A1120]/90 px-3 py-2 text-center text-[15px] font-bold text-white shadow" role="status">
                  {bubble}
                </p>
              )}
              {running && activeId && parsed && (
                <p className="pointer-events-none absolute bottom-3 left-3 right-3 truncate rounded-xl bg-amber-400/90 px-3 py-1.5 text-sm font-bold text-[#1A1103]" data-testid="now-running">
                  Now: {parsed.steps[stepOfBlock(parsed, activeId) ?? -1]?.intent ?? 'running…'}
                </p>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2" role="toolbar" aria-label="Run controls">
              <button
                type="button"
                onClick={onRun}
                disabled={!stageReady || running || blocked}
                data-testid="talk-run"
                className="min-h-[56px] flex-1 rounded-2xl bg-amber-400 px-5 font-display text-lg font-bold text-[#1A1103] shadow transition active:scale-[.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                {blocked ? 'Answer the question first' : running ? 'Running…' : '▶ Run'}
              </button>
              <button type="button" onClick={onReset} disabled={!stageReady} aria-label="Reset the robot" className="min-h-[56px] min-w-[56px] rounded-2xl bg-white/10 font-bold text-white transition active:scale-[.97] disabled:opacity-40">
                ↺
              </button>
              <button
                type="button"
                onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
                aria-label={`Speed ${speed}×, tap to change`}
                className="min-h-[56px] min-w-[56px] rounded-2xl bg-white/10 font-display font-bold text-white transition active:scale-[.97]"
              >
                {speed}×
              </button>
              <button
                type="button"
                onClick={() => setCamera((c) => (c === 'follow' ? 'top' : c === 'top' ? 'orbit' : 'follow'))}
                aria-label={`Camera: ${camera}, tap to change`}
                className="min-h-[56px] min-w-[56px] rounded-2xl bg-white/10 text-xl text-white transition active:scale-[.97]"
              >
                {camera === 'top' ? '🗺️' : camera === 'orbit' ? '🔄' : '🎥'}
              </button>
            </div>
            {missing.length > 0 && (
              <p className="mt-2 rounded-2xl bg-rose-400/15 px-3 py-2 text-sm font-bold text-rose-100" role="note">
                🔒 {missing[0].message}
              </p>
            )}
          </div>

          {/* Result */}
          {outcome && mission && (
            <section className="rounded-[20px] border border-emerald-300/50 bg-emerald-400/10 p-4" data-testid="talk-success" aria-live="polite">
              <p className="font-display text-2xl font-bold text-white">
                <span className="text-amber-300">{'★'.repeat(outcome.stars)}</span>
                <span className="text-slate-600">{'★'.repeat(3 - outcome.stars)}</span> {outcome.reasons[0]}
              </p>
              <ul className="mt-1 space-y-0.5 text-[15px] text-slate-200">
                {outcome.reasons.slice(1).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
              {outcome.improved && outcome.xp > 0 && <p className="mt-1 text-sm font-bold text-emerald-200">+{outcome.xp} XP</p>}
              <p className="mt-2 text-sm text-slate-300">
                <strong className="text-slate-100">What you learned:</strong> {mission.teach}
              </p>
              {(() => {
                const i = missions.findIndex((m) => m.id === mission.id)
                const next = missions[i + 1]
                return next ? (
                  <button type="button" onClick={() => setMissionId(next.id)} className="mt-3 min-h-[48px] rounded-2xl bg-amber-400 px-4 font-bold text-[#1A1103] transition active:scale-[.97]">
                    Next: {next.icon} {next.title} →
                  </button>
                ) : (
                  <p className="mt-3 text-sm font-bold text-amber-200">You finished every {bandInfo?.name} mission! Try the next band up.</p>
                )
              })()}
            </section>
          )}
          {failure && (
            <section className="rounded-[20px] border border-rose-300/50 bg-rose-400/10 p-4" data-testid="talk-failure" aria-live="polite">
              <p className="font-display text-lg font-bold text-white">🐞 Not yet — time to debug!</p>
              <p className="mt-1 text-[16px] text-rose-100">{failure.message}</p>
              {failure.problems.length > 1 && (
                <ul className="mt-1 text-sm text-rose-100/90">
                  {failure.problems.slice(1).map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm text-slate-300">
                Your robot did exactly what the words said — not what you meant. {failedStep !== null ? 'Look at the step marked 🐞 below, ' : 'Look at the steps below, '}
                change the words (or the blocks), and run it again.
              </p>
              {mission && attempts >= SHOW_ME_AFTER && (
                <button type="button" onClick={showMe} className="mt-3 min-h-[48px] rounded-2xl border border-amber-300/60 px-4 text-sm font-bold text-amber-200 transition active:scale-[.97]">
                  💡 Show me a way
                </button>
              )}
            </section>
          )}
        </div>

        {/* ── Right: words and blocks ───────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex gap-2 lg:hidden" role="tablist" aria-label="Words or blocks">
            {(['words', 'blocks'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t)
                  if (t === 'blocks') setEditorWanted(true)
                }}
                className={`min-h-[48px] flex-1 rounded-2xl font-display font-bold transition active:scale-[.97] ${tab === t ? 'bg-white text-[#0A1120]' : 'bg-[#111C32] text-slate-300'}`}
              >
                {t === 'words' ? '🗣 Words' : `🧩 Blocks${parsed ? ` (${parsed.blockCount})` : ''}`}
              </button>
            ))}
          </div>

          <div className={`${tab === 'words' ? '' : 'hidden'} space-y-3 lg:block`} role="region" aria-label="Tell your robot">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                understand(text)
              }}
              className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-3"
            >
              <label htmlFor="talk-words" className="font-display text-lg font-bold text-white">
                {mission?.kind === 'fix' ? '🐞 Fix these words' : '🗣 Tell your robot what to do'}
              </label>
              <div className="mt-2 flex gap-2">
                <textarea
                  id="talk-words"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, LIMITS.maxChars))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      understand(text)
                    }
                  }}
                  rows={3}
                  maxLength={LIMITS.maxChars}
                  placeholder={mission ? `e.g. ${mission.wordChips.slice(0, 2).join(' … ')} …` : EXAMPLE_PHRASES[1]}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck
                  enterKeyHint="go"
                  className="min-h-[96px] w-full resize-none rounded-2xl border border-white/10 bg-[#0A1120] px-3 py-2 text-[18px] leading-snug text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40"
                  data-testid="talk-input"
                />
                {canListen && (
                  <button
                    type="button"
                    onClick={toggleListen}
                    aria-pressed={listening}
                    aria-label={listening ? 'Stop listening' : 'Say it out loud'}
                    className={`min-h-[56px] min-w-[56px] self-start rounded-2xl text-2xl transition active:scale-[.97] ${listening ? 'animate-pulse bg-rose-500 text-white' : 'bg-white/10 text-white'}`}
                  >
                    🎤
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Word ideas">
                {(mission?.wordChips ?? EXAMPLE_PHRASES.slice(0, 4)).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setText((t) => `${t}${t && !/\s$/.test(t) ? ' ' : ''}${c}`.slice(0, LIMITS.maxChars))}
                    className="min-h-[44px] rounded-xl bg-white/[0.06] px-3 text-[15px] text-slate-200 ring-1 ring-white/10 transition active:scale-[.97]"
                  >
                    + {c}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="submit" data-testid="talk-understand" className="min-h-[52px] flex-1 rounded-2xl bg-cyan-400 px-4 font-display text-[17px] font-bold text-[#04202A] transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60">
                  🧠 Understand
                </button>
                {canSpeak && parsed && (
                  <button type="button" onClick={readAloud} className="min-h-[52px] rounded-2xl bg-white/10 px-4 font-bold text-white transition active:scale-[.97]" aria-label="Hear what the robot understood">
                    🔊 Hear it
                  </button>
                )}
              </div>
              {micMessage && (
                <p className="mt-2 text-sm text-amber-200" role="status">
                  {micMessage}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                What you type is understood right here on this device and isn’t saved.{canListen ? ' The 🎤 button uses your browser’s speech service, which may send your voice to that company to turn it into words.' : ''} Never type or say your name or anything private.
              </p>
            </form>

            {crisis && (
              <section className="rounded-[20px] border border-amber-400/40 bg-[#111C32] p-4" aria-label="Help from a grown-up" role="status">
                <p className="font-display text-lg font-bold text-white">That sounds important.</p>
                <p className="mt-1 text-[15px] text-slate-200">Please tell a grown-up you trust, like a parent or a teacher. You can also call a helpline. It is free and kind.</p>
                <HelplineCardClient />
              </section>
            )}

            {parsed ? (
              <section className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-3" aria-label="How I understood you">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-white">🧠 How I understood you</h2>
                  <p className="text-xs text-slate-400">
                    {parsed.blockCount} block{parsed.blockCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="mb-2 mt-1 flex flex-wrap gap-1 text-[11px]" aria-label="Colour key">
                  {ROLE_LEGEND.map((l) => (
                    <span key={l.role} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-slate-400">
                      <span aria-hidden className={`mr-1 inline-block h-2 w-2 rounded-full ${DOT[l.role]}`} />
                      {l.label}
                    </span>
                  ))}
                </div>
                {parsed.steps.length === 0 ? (
                  <p className="text-slate-300">I didn’t hear any instructions. Try “drive forward 50 cm”.</p>
                ) : (
                  <UnderstandingClient result={parsed} activeId={activeId} failedStep={failedStep} onAnswer={onAnswer} compact={compact} />
                )}
                {parsed.unknown.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-[#0A1120] p-3">
                    <p className="text-[15px] text-slate-200">
                      My on-device brain only knows robot words. Say it in smaller steps{aiAvailable && online && aiState !== 'off' ? ' — or ask the AI helper to have a go.' : '.'}
                    </p>
                    {aiAvailable && online && aiState !== 'off' && !crisis && (
                      <button
                        type="button"
                        onClick={askAi}
                        disabled={aiState === 'asking'}
                        data-testid="talk-ai"
                        className="mt-2 min-h-[48px] rounded-2xl border border-cyan-300/60 px-4 font-bold text-cyan-100 transition active:scale-[.97] disabled:opacity-60"
                      >
                        {aiState === 'asking' ? 'Asking…' : '✨ Ask the AI helper'}
                      </button>
                    )}
                    {aiAvailable && online && aiState !== 'off' && (
                      <p className="mt-1 text-xs text-slate-500">
                        Only the words I didn’t understand are sent, and only when you press it. R2BOT doesn’t save them; the AI company may keep them for a short time for safety checks. Never include names, addresses or anything private.
                      </p>
                    )}
                    {aiMessage && <p className="mt-2 text-sm text-rose-200">{aiMessage}</p>}
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-[20px] border border-dashed border-white/15 p-4 text-slate-300">
                <p className="font-display text-lg font-bold text-white">🤖 Spark says:</p>
                <p className="mt-1 text-[16px]">
                  Robots don’t understand people the way people do. I turn your words into blocks — and I’ll show you every step, every guess, and ask when you’re not clear.
                </p>
              </section>
            )}
          </div>

          <div className={`${tab === 'blocks' ? '' : 'hidden'} lg:block`} role="region" aria-label="Blocks">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-white">🧩 Your blocks</h2>
              <p className="text-xs text-slate-400">Edit them here, or change the words and press Understand.</p>
            </div>
            <div className="h-[420px] overflow-hidden rounded-[20px] border border-white/10 lg:h-[480px]" data-testid="talk-editor">
              {editorWanted ? (
                <Editor caps={caps} initial={wordProgram ?? { body: [] }} resetKey={missionId} onReady={onEditorReady} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#111C32] p-6 text-center text-slate-300">
                  <p className="text-4xl" aria-hidden>
                    🧩
                  </p>
                  <p className="text-[16px]">Your blocks appear here when your robot understands you.</p>
                  <button type="button" onClick={() => setEditorWanted(true)} className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-bold text-white transition active:scale-[.97]">
                    Open the block editor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const DOT: Record<string, string> = {
  action: 'bg-amber-300',
  direction: 'bg-cyan-300',
  amount: 'bg-emerald-300',
  unit: 'bg-emerald-100',
  condition: 'bg-sky-300',
  loop: 'bg-rose-300',
  filler: 'bg-slate-500',
}
