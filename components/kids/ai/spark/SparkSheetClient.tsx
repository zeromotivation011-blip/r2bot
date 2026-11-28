'use client'

// components/kids/ai/spark/SparkSheetClient.tsx
// The full-screen Ask Spark sheet. App-first: fills the phone screen, every
// control is a 48px+ thumb target in the bottom half, the Android back button
// closes it, and it keeps working with no network (Spark's notebook is bundled
// with this chunk). Loaded only when the child first opens Spark.
//
// Privacy: the conversation lives in this component's memory only. Nothing is
// saved on the device or the server; closing the sheet forgets it.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { bandForAge, type BandId } from '@/lib/kids/bands'
import { getProgress } from '@/lib/kids-progress'
import { reportActivity } from '@/lib/kids/universe/rewards'
import { profileKey } from '@/lib/kids/profiles'
import { cleanRequest, offlineReply, safetyReply, withPrivacyNote } from '@/lib/kids/ai/spark/offline'
import { isOlderBand } from '@/lib/kids/ai/spark/match'
import { STARTER_QUESTIONS } from '@/lib/kids/ai/spark/faq'
import type { OpenSparkDetail } from '@/lib/kids/ai/spark/open'
import { isLiveKidsHref } from '@/lib/kids/ai/spark/live'
import { SPARK_MAX_QUESTION, type SparkContext, type SparkMode, type SparkReply } from '@/lib/kids/ai/spark/types'
import { canSpeak, setVoiceMuted, speakNatural, stopSpeaking, voiceMuted, warmNaturalVoices } from '@/components/kids/activities/speech'
import { SparkFace } from './AskSparkClient'
import HelplineCardClient from './HelplineCardClient'
import { KIDS_STANDALONE } from '@/lib/kids/app-context'

interface Turn {
  id: number
  who: 'child' | 'spark'
  text: string
  reply?: SparkReply
  pending?: boolean
}

interface SheetProps {
  initial: OpenSparkDetail | null
  onClose: () => void
  /**
   * A grown-up switched Ask Spark off on this device (lib/kids/parent-controls.ts).
   * The sheet then answers nothing, but "Get help" and the helpline card still
   * work: safety help is never behind a switch or a parental gate.
   */
  helpOnly?: boolean
}

/** What "Worried or not safe?" shows. Local, offline, never sent anywhere. */
const HELP_REPLY: SparkReply = {
  answer:
    "If something is worrying you, or you don't feel safe, you are not in trouble. Tell a grown-up you trust right now — a parent, a teacher or another adult you feel safe with. You can also call a free helpline for kids:",
  source: 'safety',
  links: [],
  followUps: [],
  crisis: true,
}

const REWARD_KEY = 'r2bot_kids_spark_reward_day'
const REQUEST_TIMEOUT_MS = 15_000

function childBand(): BandId {
  const p = getProgress()
  if (p.band) return p.band
  if (typeof p.age === 'number') return bandForAge(p.age).id
  return 'builders'
}

function localDay(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Reward asking once per day (kind 'activity', id 'ask-spark'). */
function rewardOncePerDay(): void {
  try {
    const today = localDay()
    if (window.localStorage.getItem(profileKey(REWARD_KEY)) === today) return
    window.localStorage.setItem(profileKey(REWARD_KEY), today)
    reportActivity({ kind: 'activity', id: 'ask-spark', xp: 5 })
  } catch {
    /* storage blocked: skip the reward rather than risk repeating it */
  }
}

// ── Speech recognition (Web Speech API, where the browser has it) ──────────
interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}
type RecognitionCtor = new () => RecognitionLike

function recognitionCtor(): RecognitionCtor | null {
  // The standalone app has no microphone permission: typing only.
  if (typeof window === 'undefined' || KIDS_STANDALONE) return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function SparkSheetClient({ initial, onClose, helpOnly = false }: SheetProps) {
  const [band] = useState<BandId>(() => childBand())
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(true)
  const [online, setOnline] = useState(true)
  const [listening, setListening] = useState(false)
  const [micOk, setMicOk] = useState(false)
  const [shown, setShown] = useState(false)
  const [speakingId, setSpeakingId] = useState<number | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(1)
  const stopRec = useRef<(() => void) | null>(null)
  const context = useRef<SparkContext>({})
  const closing = useRef(false)
  const asked = useRef(false)

  const older = isOlderBand(band)
  const router = useRouter()
  const onCloseRef = useRef(onClose)
  const pendingHref = useRef<string | null>(null)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // ── Mount: voice, network, scroll lock, back button, slide-in ────────────
  useEffect(() => {
    setMuted(voiceMuted() || !canSpeak())
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    setMicOk(recognitionCtor() !== null)
    const unwarm = warmNaturalVoices()
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Android back button / swipe-back closes the sheet instead of leaving the page.
    // The current history state is copied so the Next.js router treats the
    // extra entry as the same page.
    const base: unknown = window.history.state
    window.history.pushState({ ...(typeof base === 'object' && base ? base : {}), r2botSpark: true }, '')
    const onPop = () => {
      closing.current = true
      const href = pendingHref.current
      onCloseRef.current()
      if (href) router.push(href)
    }
    window.addEventListener('popstate', onPop)

    const raf = requestAnimationFrame(() => setShown(true))
    return () => {
      cancelAnimationFrame(raf)
      unwarm()
      stopSpeaking()
      stopRec.current?.()
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('popstate', onPop)
      document.body.style.overflow = prevOverflow
    }
    // Mount-only: re-running would push another history entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    stopSpeaking()
    const st: unknown = window.history.state
    if (st && typeof st === 'object' && (st as { r2botSpark?: boolean }).r2botSpark) window.history.back()
    else {
      const href = pendingHref.current
      onCloseRef.current()
      if (href) router.push(href)
    }
  }, [router])

  /** "Show me": pop the sheet's history entry first, then navigate, so Back works as expected. */
  const navigateTo = useCallback(
    (href: string) => {
      pendingHref.current = href
      close()
    },
    [close],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns])

  const say = useCallback(
    (id: number, text: string) => {
      if (muted) return
      setSpeakingId(id)
      speakNatural(text, () => setSpeakingId((cur) => (cur === id ? null : cur)))
    },
    [muted],
  )

  // ── Ask ───────────────────────────────────────────────────────────────
  const ask = useCallback(
    async (rawQuestion: string, mode: SparkMode) => {
      if (helpOnly) return
      const request = cleanRequest(rawQuestion, context.current)
      const { question, context: ctx, removedPersonal } = request
      // Safety runs on this device first: a child telling Spark something
      // serious (or anything else Spark must not answer) is answered here and
      // the words never leave the phone — not to R2BOT, not to the AI.
      const local = safetyReply(request, band)
      if (!local && !question && mode === 'ask') return
      stopSpeaking()
      setBusy(true)
      const childId = nextId.current++
      const sparkId = nextId.current++
      // A blocked message is shown as typed (it is on the child's own screen only).
      const shownQuestion = local && rawQuestion.trim() ? rawQuestion.trim().slice(0, SPARK_MAX_QUESTION) : mode === 'hint' && !question ? 'Can I have a hint?' : question
      setTurns((t) => [...t, { id: childId, who: 'child', text: shownQuestion }, { id: sparkId, who: 'spark', text: '', pending: true }])
      setDraft('')

      let reply: SparkReply
      const offlineAnswer = (note?: string): SparkReply => {
        const r = withPrivacyNote(offlineReply(request, band, mode), removedPersonal)
        return note ? { ...r, note: r.note ? `${note} ${r.note}` : note } : r
      }

      if (local) {
        reply = withPrivacyNote(local, removedPersonal)
      } else if (KIDS_STANDALONE) {
        // The standalone app has no server: Spark answers from its notebook (the offline FAQ).
        reply = offlineAnswer()
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        reply = offlineAnswer("You're offline, so this answer is from Spark's notebook.")
      } else {
        const ctrl = new AbortController()
        const timer = window.setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
        try {
          const res = await fetch('/api/kids/spark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, band, mode, context: ctx }),
            signal: ctrl.signal,
          })
          if (res.status === 429) reply = offlineAnswer('Lots of questions! Spark is answering from its notebook for a minute.')
          else if (!res.ok) reply = offlineAnswer()
          else reply = (await res.json()) as SparkReply
        } catch {
          reply = offlineAnswer("Spark couldn't reach the internet, so this answer is from its notebook.")
        } finally {
          window.clearTimeout(timer)
        }
      }

      setTurns((t) => t.map((x) => (x.id === sparkId ? { ...x, text: reply.answer, reply, pending: false } : x)))
      setBusy(false)
      // The voice is English-only for now: a Hindi or Spanish answer is read, not spoken.
      if (!reply.lang || reply.lang === 'en') say(sparkId, reply.answer)
      if (reply.source !== 'safety' && reply.source !== 'unknown') rewardOncePerDay()
    },
    [band, say, helpOnly],
  )

  /** "Worried or not safe?": the helpline card, straight away, with no typing. */
  const showHelp = useCallback(() => {
    stopSpeaking()
    const id = nextId.current++
    setTurns((t) => [...t, { id, who: 'spark', text: HELP_REPLY.answer, reply: HELP_REPLY }])
    say(id, HELP_REPLY.answer)
  }, [say])

  // Opened from another screen with a question or a hint request.
  useEffect(() => {
    if (asked.current || !initial || helpOnly) return
    asked.current = true
    context.current = { topic: initial.topic, programSummary: initial.programSummary, failureReason: initial.failureReason }
    const hint = Boolean(initial.failureReason || initial.programSummary)
    if (hint || initial.question) void ask(initial.question ?? '', hint ? 'hint' : 'ask')
  }, [initial, ask, helpOnly])

  // ── Voice input ───────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (listening) {
      stopRec.current?.()
      stopRec.current = null
      setListening(false)
      return
    }
    const Ctor = recognitionCtor()
    if (!Ctor) return
    stopSpeaking()
    try {
      const rec = new Ctor()
      const lang = typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language) ? navigator.language : 'en-US'
      rec.lang = lang
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onresult = (e) => {
        const said = e.results[0]?.[0]?.transcript ?? ''
        if (said.trim()) void ask(said.slice(0, SPARK_MAX_QUESTION), 'ask')
      }
      rec.onerror = () => setListening(false)
      rec.onend = () => setListening(false)
      rec.start()
      stopRec.current = () => {
        try {
          rec.abort()
        } catch {
          /* ignore */
        }
      }
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [listening, ask])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      setVoiceMuted(next)
      if (next) {
        stopSpeaking()
        setSpeakingId(null)
      }
      return next
    })
  }, [])

  const starters = older ? STARTER_QUESTIONS.older : STARTER_QUESTIONS.young
  const hintContext = context.current.topic

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-spark-title"
      className={`fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-[#0A1120] text-[#EEF2F8] transition-[opacity,transform] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/[0.08] px-3 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
        <SparkFace size={44} />
        <div className="min-w-0 flex-1">
          <h2 id="ask-spark-title" className="font-display text-xl font-extrabold leading-tight">
            Ask Spark
          </h2>
          <p className="truncate text-sm text-[#A7B0C0]">{hintContext ? `Helping with: ${hintContext}` : 'Your robot helper'}</p>
        </div>
        {canSpeak() && (
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={!muted}
            aria-label={muted ? 'Turn Spark’s voice on' : 'Turn Spark’s voice off'}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.16] bg-white/[0.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95"
          >
            <SpeakerIcon off={muted} />
          </button>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Close Ask Spark"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.16] bg-white/[0.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {!online && (
        <p role="status" className="bg-[#19263F] px-4 py-2 text-center text-sm font-semibold text-amber-300">
          You’re offline. Spark can still answer from its notebook.
        </p>
      )}

      {/* Conversation */}
      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {helpOnly && turns.length === 0 && (
            <div className="rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
              <p className="font-display text-lg font-bold">Spark is resting 😴</p>
              <p className="mt-1 text-[17px] leading-relaxed text-[#A7B0C0]">
                A grown-up has switched Ask Spark off on this device. If something is worrying you, tap the button below.
              </p>
            </div>
          )}
          {!helpOnly && turns.length === 0 && (
            <div className="rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
              <p className="font-display text-lg font-bold">Hi! I’m Spark. 👋</p>
              <p className="mt-1 text-[17px] leading-relaxed text-[#A7B0C0]">
                {older
                  ? 'Ask me how robots sense, move, think and learn — or tap Help in an activity when you’re stuck.'
                  : 'Ask me anything about robots! Type, or tap the microphone and talk.'}
              </p>
            </div>
          )}

          {turns.map((t) =>
            t.who === 'child' ? (
              <div key={t.id} className="ml-10 self-end rounded-[20px] rounded-br-md bg-amber-500 px-4 py-3 text-[17px] font-semibold leading-snug text-[#1A1103]">
                {t.text}
              </div>
            ) : (
              <SparkBubble
                key={t.id}
                turn={t}
                speaking={speakingId === t.id}
                canReplay={!muted}
                onReplay={() => say(t.id, t.text)}
                onFollowUp={(q) => void ask(q, 'ask')}
                onNavigate={navigateTo}
                busy={busy}
              />
            ),
          )}
        </div>
      </div>

      {/* Composer: thumb zone */}
      <div className="border-t border-white/[0.08] bg-[#111C32] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        <div className="mx-auto max-w-2xl">
          {!helpOnly && turns.length === 0 && (
            <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Questions to try">
              {starters.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void ask(q, 'ask')}
                  disabled={busy}
                  className="min-h-[48px] shrink-0 rounded-2xl border border-white/[0.16] bg-white/[0.04] px-4 text-[15px] font-semibold text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            hidden={helpOnly}
            className={`${helpOnly ? 'hidden' : 'flex'} items-center gap-2`}
            onSubmit={(e) => {
              e.preventDefault()
              if (!busy) void ask(draft, 'ask')
            }}
          >
            {micOk && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={busy}
                aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Ask with your voice'}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95 disabled:opacity-50 ${listening ? 'border-amber-400 bg-amber-500/20 text-amber-300 motion-safe:animate-pulse' : 'border-white/[0.16] bg-white/[0.04]'}`}
              >
                <MicIcon />
              </button>
            )}
            <label htmlFor="ask-spark-input" className="sr-only">
              Your question for Spark
            </label>
            <input
              id="ask-spark-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, SPARK_MAX_QUESTION))}
              placeholder={listening ? 'Listening…' : 'Ask about robots…'}
              autoComplete="off"
              autoCorrect="on"
              enterKeyHint="send"
              maxLength={SPARK_MAX_QUESTION}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-white/[0.16] bg-[#0A1120] px-4 text-[17px] text-[#EEF2F8] placeholder:text-[#6E7888] focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send question"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-[#1A1103] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95 disabled:opacity-40"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <button
            type="button"
            onClick={showHelp}
            className={`mx-auto mt-2 flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60 active:scale-95 ${helpOnly ? 'w-full bg-amber-500 text-[#1A1103]' : 'text-cyan-300 underline underline-offset-2'}`}
          >
            <span aria-hidden="true">💛</span> Worried or not safe? Get help
          </button>
          <p hidden={helpOnly} className="mt-1 text-center text-[13px] leading-snug text-[#A7B0C0]">
            {KIDS_STANDALONE
              ? 'Spark can make mistakes. Grown-ups: Spark answers from a notebook inside the app. Questions stay on this device and are never sent anywhere.'
              : 'Spark can make mistakes. Grown-ups: R2BOT doesn’t store questions; they may be sent to an AI service (Anthropic) to answer.'}
            {micOk ? ' The mic uses your browser’s speech service (such as Google or Apple).' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Pieces ─────────────────────────────────────────────────────────────────

interface BubbleProps {
  turn: Turn
  speaking: boolean
  canReplay: boolean
  busy: boolean
  onReplay: () => void
  onFollowUp: (q: string) => void
  onNavigate: (href: string) => void
}

const SOURCE_LABEL: Record<SparkReply['source'], string> = {
  ai: 'Spark (AI)',
  faq: 'From Spark’s notebook',
  hint: 'Hint',
  safety: 'Spark',
  unknown: 'Spark',
}

function SparkBubble({ turn, speaking, canReplay, busy, onReplay, onFollowUp, onNavigate }: BubbleProps) {
  if (turn.pending) {
    return (
      <div className="mr-10 flex items-center gap-2 self-start rounded-[20px] rounded-bl-md border border-white/[0.08] bg-[#19263F] px-4 py-3" aria-label="Spark is thinking">
        <span className="sr-only">Spark is thinking…</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full bg-amber-400 motion-safe:animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    )
  }
  const r = turn.reply
  // Belt and braces: never show a link that leaves R2BOT Kids or leads to an unbuilt page.
  const links = (r?.links ?? []).filter((l) => isLiveKidsHref(l.href))
  return (
    <div className="mr-6 flex flex-col gap-2 self-start">
      <div className="rounded-[20px] rounded-bl-md border border-white/[0.08] bg-[#19263F] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,.35)]">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-amber-300">{r ? SOURCE_LABEL[r.source] : 'Spark'}</span>
          {canReplay && (!r?.lang || r.lang === 'en') && (
            <button
              type="button"
              onClick={onReplay}
              aria-label="Hear that again"
              className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-[#A7B0C0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95"
            >
              <SpeakerIcon off={false} active={speaking} />
            </button>
          )}
        </div>
        {r?.note && <p className="mb-2 text-sm text-[#A7B0C0]">{r.note}</p>}
        <p lang={r?.lang ?? 'en'} className="whitespace-pre-line text-[17px] leading-relaxed">
          {turn.text}
        </p>
      </div>

      {r?.crisis && <HelplineCardClient lang={r.lang ?? 'en'} />}

      {links.length > 0 && (
        <div className="flex flex-col gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                e.preventDefault()
                onNavigate(l.href)
              }}
              className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-[16px] font-bold text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.98]"
            >
              <span aria-hidden="true" className="text-xl">
                {l.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-[#A7B0C0]">Show me</span>
                <span className="block truncate">{l.label}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {r && r.followUps.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Ask next">
          {r.followUps.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => onFollowUp(q)}
              className="min-h-[48px] rounded-2xl border border-white/[0.16] bg-white/[0.04] px-3 text-left text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SpeakerIcon({ off, active = false }: { off: boolean; active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={active ? 'text-amber-300' : undefined}>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {off ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
