'use client'

// app/diagnostic/DiagnosticClient.tsx — Find My Level v3
// 10 questions, Q7 conditional on Q1, multi-select on Q4, card-based UI.
// Result → one of Spark / Wire / Forge / Edge → saved to profile + localStorage.

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Track = 'spark' | 'wire' | 'forge' | 'edge'

interface Option {
  id: string
  label: string
  emoji?: string
  points?: number // contribution to skill score
}

interface Question {
  id: string
  prompt: string
  helper?: string
  multiSelect?: boolean
  multiSelectCap?: number // max points contributed by this question
  showIf?: (answers: Answers) => boolean
  options: Option[]
}

type Answers = Record<string, string[]> // questionId → list of selected option IDs

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: 'Have you ever written code before?',
    options: [
      { id: 'comfort', label: 'Yes, comfortably', points: 2 },
      { id: 'little',  label: 'A little',         points: 1 },
      { id: 'no',      label: 'Not yet',          points: 0 },
    ],
  },
  {
    id: 'q2',
    prompt: 'Pick what excites you most.',
    helper: 'Just for personalisation — there is no wrong answer.',
    options: [
      { id: 'arms',     emoji: '🦾', label: 'Robot Arms & Manufacturing' },
      { id: 'cars',     emoji: '🚗', label: 'Self-Driving Cars' },
      { id: 'drones',   emoji: '🚁', label: 'Drones & Aerial Robots' },
      { id: 'humanoid', emoji: '🤖', label: 'Humanoid Robots' },
    ],
  },
  {
    id: 'q3',
    prompt: "What's your goal?",
    options: [
      { id: 'job',     label: 'Get a robotics job',        points: 1 },
      { id: 'build',   label: 'Build something cool',      points: 1 },
      { id: 'learn',   label: 'Understand how robots work', points: 0 },
      { id: 'unsure',  label: 'Still figuring out',         points: 0 },
    ],
  },
  {
    id: 'q4',
    prompt: 'Have you studied any of these?',
    helper: 'Select all that apply.',
    multiSelect: true,
    multiSelectCap: 3,
    options: [
      { id: 'python',      label: 'Python',         points: 1 },
      { id: 'electronics', label: 'Electronics',    points: 1 },
      { id: 'maths',       label: 'Maths',          points: 1 },
      { id: 'linux',       label: 'Linux',          points: 1 },
      { id: 'none',        label: 'None of these',  points: 0 },
    ],
  },
  {
    id: 'q5',
    prompt: 'What does a sensor do in a robot?',
    options: [
      { id: 'measures', label: 'Measures the environment', points: 1 },
      { id: 'powers',   label: 'Powers the motors',         points: 0 },
      { id: 'stores',   label: 'Stores the code',           points: 0 },
      { id: 'unsure',   label: 'Not sure',                  points: 0 },
    ],
  },
  {
    id: 'q6',
    prompt: 'A robot arm needs to reach a point in space. What field solves this?',
    options: [
      { id: 'kin',     label: 'Kinematics',       points: 1 },
      { id: 'cv',      label: 'Computer Vision',  points: 0 },
      { id: 'path',    label: 'Path Planning',    points: 0 },
      { id: 'unsure',  label: 'Not sure',         points: 0 },
    ],
  },
  {
    id: 'q7',
    prompt: 'Which of these have you used?',
    helper: 'Select all that apply.',
    multiSelect: true,
    multiSelectCap: 3,
    showIf: (a) => a.q1?.[0] === 'comfort',
    options: [
      { id: 'ros',     label: 'ROS / ROS2',     points: 2 },
      { id: 'opencv',  label: 'OpenCV',         points: 1 },
      { id: 'arduino', label: 'Arduino',        points: 1 },
      { id: 'rpi',     label: 'Raspberry Pi',   points: 1 },
      { id: 'none',    label: 'None',           points: 0 },
    ],
  },
  {
    id: 'q8',
    prompt: 'How comfortable are you with the Linux terminal?',
    options: [
      { id: 'daily', label: 'Daily use',          points: 2 },
      { id: 'few',   label: 'Used it a few times', points: 1 },
      { id: 'never', label: 'Never used it',       points: 0 },
    ],
  },
  {
    id: 'q9',
    prompt: 'Pick the concept you know best.',
    options: [
      { id: 'pid',  label: 'PID Controller',   points: 1 },
      { id: 'slam', label: 'SLAM',             points: 1 },
      { id: 'nn',   label: 'Neural Networks',  points: 1 },
      { id: 'servo', label: 'Servo Motors',    points: 1 },
      { id: 'none', label: 'None of these',    points: 0 },
    ],
  },
  {
    id: 'q10',
    prompt: 'How much time can you commit per week?',
    helper: "Used only to set your pace — doesn't affect your level.",
    options: [
      { id: 'low',  label: '1–2 hours' },
      { id: 'mid',  label: '3–5 hours' },
      { id: 'high', label: '6+ hours' },
    ],
  },
]

const TRACK_META: Record<Track, { icon: string; name: string; tagline: string; firstCourseHref: string; firstCourseLabel: string }> = {
  spark: {
    icon: '⚡',
    name: 'Spark',
    tagline: 'Robotics from absolute zero. We start with the words.',
    firstCourseHref: '/academy/spark',
    firstCourseLabel: 'Spark · Beginner Track',
  },
  wire: {
    icon: '🔌',
    name: 'Wire',
    tagline: 'You know enough to be dangerous. Time to wire it up.',
    firstCourseHref: '/academy/wire',
    firstCourseLabel: 'Wire · Intermediate Track',
  },
  forge: {
    icon: '🔥',
    name: 'Forge',
    tagline: 'You can build. Now we make you ship-ready.',
    firstCourseHref: '/academy/forge',
    firstCourseLabel: 'Forge · Advanced Track',
  },
  edge: {
    icon: '⚡️',
    name: 'Edge',
    tagline: "You've done the basics. Let's push the frontier.",
    firstCourseHref: '/academy/edge',
    firstCourseLabel: 'Edge · Research Track',
  },
}

function pointsForOption(q: Question, optionId: string): number {
  return q.options.find((o) => o.id === optionId)?.points ?? 0
}

function scoreAnswers(answers: Answers, visible: Question[]): number {
  let score = 0
  for (const q of visible) {
    const picks = answers[q.id] ?? []
    if (q.multiSelect) {
      const sum = picks.reduce((acc, id) => acc + pointsForOption(q, id), 0)
      const cap = q.multiSelectCap ?? Infinity
      score += Math.min(sum, cap)
    } else {
      score += picks.slice(0, 1).reduce((acc, id) => acc + pointsForOption(q, id), 0)
    }
  }
  return score
}

function chooseTrack(answers: Answers, score: number): Track {
  // Spec: Spark if Q1 = "Not yet" OR score < 3
  if (answers.q1?.[0] === 'no' || score < 3) return 'spark'
  if (score >= 10) return 'edge'
  if (score >= 7) return 'forge'
  return 'wire'
}

function whyExplanation(track: Track, score: number, answers: Answers): string {
  const codingLabel = answers.q1?.[0] === 'comfort' ? 'comfortable coder' : answers.q1?.[0] === 'little' ? 'some coding experience' : 'new to coding'
  switch (track) {
    case 'spark':
      return `You scored ${score} — and you're ${codingLabel}. Spark teaches robotics from absolute zero with plain-English explanations, no jargon, and one hands-on project per module.`
    case 'wire':
      return `You scored ${score} — you've got the basics down. Wire teaches you the electronics, sensors, and ROS2 fundamentals so you can build your first real robot.`
    case 'forge':
      return `You scored ${score} — you're ahead of most learners. Forge skips the warm-up and goes straight to the engineering: motion planning, perception, and real-robot deployment.`
    case 'edge':
      return `You scored ${score} — you're at research level. Edge covers cutting-edge topics: reinforcement learning, multi-robot systems, and current robotics papers.`
  }
}

export function DiagnosticClient() {
  const [answers, setAnswers] = useState<Answers>({})
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recompute the visible-question list every render based on current answers.
  const visibleQuestions = useMemo(
    () => QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)),
    [answers],
  )

  const isDone = step >= visibleQuestions.length
  const current = isDone ? null : visibleQuestions[step]
  const total = visibleQuestions.length
  const stepLabel = isDone ? total : Math.min(step + 1, total)

  const finalScore = useMemo(
    () => (isDone ? scoreAnswers(answers, visibleQuestions) : 0),
    [isDone, answers, visibleQuestions],
  )
  const finalTrack = useMemo(
    () => (isDone ? chooseTrack(answers, finalScore) : null),
    [isDone, answers, finalScore],
  )

  const handleSelect = (q: Question, optionId: string) => {
    setAnswers((prev) => {
      const existing = prev[q.id] ?? []
      let next: string[]
      if (q.multiSelect) {
        // Toggle.
        next = existing.includes(optionId) ? existing.filter((id) => id !== optionId) : [...existing, optionId]
      } else {
        next = [optionId]
      }
      return { ...prev, [q.id]: next }
    })

    if (!q.multiSelect) {
      // Single-select advances automatically with a brief delay for visual feedback.
      window.setTimeout(() => setStep((s) => s + 1), 220)
    }
  }

  const handleMultiNext = () => setStep((s) => s + 1)
  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  // Persist track when finished.
  const persistTrack = (track: Track) => {
    if (saved) return
    setSaved(true)
    setError(null)
    try {
      window.localStorage.setItem('r2bot_track', track)
    } catch { /* ignore */ }
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error } = await supabase
          .from('profiles')
          .update({ diagnostic_track: track, diagnostic_done: true })
          .eq('id', user.id)
        if (error) setError(`Saved locally — but couldn't sync to your account: ${error.message}`)
      } catch (e) {
        setError(e instanceof Error ? `Saved locally — but couldn't sync: ${e.message}` : 'Save failed.')
      }
    })
  }

  // When transitioning to the result step, persist track once.
  if (isDone && finalTrack && !saved) persistTrack(finalTrack)

  return (
    <main style={{ paddingTop: 110, paddingBottom: 80, minHeight: '100vh', position: 'relative', zIndex: 2 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            <span>{isDone ? 'Your result' : `Step ${stepLabel} of ${total}`}</span>
            <span>{Math.round(((isDone ? total : step) / total) * 100)}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${((isDone ? total : step) / total) * 100}%`,
                height: '100%', background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                transition: 'width .35s ease',
              }}
            />
          </div>
        </div>

        {!isDone && current && (
          <section key={current.id} className="diagnostic-fade">
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, margin: '0 0 8px', color: '#fff', lineHeight: 1.2 }}>
              {current.prompt}
            </h1>
            {current.helper && (
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 22px' }}>{current.helper}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {current.options.map((opt) => {
                const isSelected = (answers[current.id] ?? []).includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(current, opt.id)}
                    style={{
                      minHeight: 72,
                      width: '100%',
                      padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: isSelected ? 'rgba(245, 158, 11, 0.12)' : '#111118',
                      border: `1.5px solid ${isSelected ? '#f59e0b' : '#1f1f2a'}`,
                      borderRadius: 14,
                      color: '#fff',
                      fontSize: 17,
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color .15s, background .15s, transform .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = isSelected ? '#f59e0b' : '#1f1f2a' }}
                  >
                    {opt.emoji && <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden>{opt.emoji}</span>}
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    {current.multiSelect && (
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `1.5px solid ${isSelected ? '#f59e0b' : '#475569'}`,
                        background: isSelected ? '#f59e0b' : 'transparent',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: '#1a0f00', fontSize: 14, fontWeight: 900,
                      }} aria-hidden>{isSelected ? '✓' : ''}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                style={{
                  background: 'transparent', color: '#94a3b8', border: 'none',
                  fontSize: 14, fontWeight: 700, cursor: step === 0 ? 'not-allowed' : 'pointer',
                  opacity: step === 0 ? 0.4 : 1, padding: '8px 12px',
                }}
              >
                ← Back
              </button>
              {current.multiSelect && (
                <button
                  type="button"
                  onClick={handleMultiNext}
                  disabled={(answers[current.id] ?? []).length === 0}
                  style={{
                    background: '#f59e0b', color: '#1a0f00',
                    border: 'none', borderRadius: 12,
                    padding: '12px 22px', fontSize: 15, fontWeight: 900,
                    cursor: (answers[current.id] ?? []).length === 0 ? 'not-allowed' : 'pointer',
                    opacity: (answers[current.id] ?? []).length === 0 ? 0.4 : 1,
                  }}
                >
                  Continue →
                </button>
              )}
            </div>
          </section>
        )}

        {isDone && finalTrack && (
          <section className="diagnostic-fade" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 14 }}>{TRACK_META[finalTrack].icon}</div>
            <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 8px' }}>
              You are a {TRACK_META[finalTrack].name} learner
            </p>
            <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, margin: '0 0 12px', color: '#fff', lineHeight: 1.15 }}>
              {TRACK_META[finalTrack].tagline}
            </h1>
            <p style={{ fontSize: 16, color: '#cbd5e1', maxWidth: 560, margin: '0 auto 28px', lineHeight: 1.7 }}>
              {whyExplanation(finalTrack, finalScore, answers)}
            </p>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href={TRACK_META[finalTrack].firstCourseHref}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  minHeight: 52, padding: '0 26px',
                  background: '#f59e0b', color: '#1a0f00',
                  borderRadius: 12, fontWeight: 900, fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(245,158,11,0.30)',
                }}
              >
                Start learning · {TRACK_META[finalTrack].firstCourseLabel} →
              </Link>
              <Link
                href="/academy"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  minHeight: 52, padding: '0 22px',
                  background: 'rgba(255,255,255,0.06)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 12, fontWeight: 700, fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Browse all tracks
              </Link>
            </div>
            {pending && (
              <p style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>Saving your track…</p>
            )}
            {error && (
              <p style={{ marginTop: 14, fontSize: 12, color: '#fca5a5' }}>{error}</p>
            )}
          </section>
        )}
      </div>

      <style>{`
        .diagnostic-fade { animation: r2-diag-fade .35s ease both; }
        @keyframes r2-diag-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
