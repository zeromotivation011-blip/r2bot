'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { SchoolSideNav } from '../../../_components/SchoolSideNav'
import {
  SCHOOL_CURRICULUM,
  SCHOOL_GRADES,
  getUnit,
  type SchoolGradeId,
} from '@/lib/school-curriculum'

const LS_COMPLETED = 'r2bot_school_completed_lessons'
const LS_XP = 'r2bot_school_xp'

export default function LessonPage() {
  const params = useParams<{ grade: string; unit: string }>()
  const grade = (params?.grade ?? '') as SchoolGradeId
  const unitId = String(params?.unit ?? '')

  const grading = SCHOOL_CURRICULUM[grade]
  const unit = getUnit(grade, unitId)
  const gradeMeta = SCHOOL_GRADES.find(g => g.id === grade)

  const nextUnit = useMemo(() => {
    if (!grading || !unit) return undefined
    const i = grading.units.findIndex(u => u.id === unit.id)
    return grading.units[i + 1]
  }, [grading, unit])

  const [openDeep, setOpenDeep] = useState<number | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [completed, setCompleted] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!unit) return
    try {
      const done = JSON.parse(window.localStorage.getItem(LS_COMPLETED) || '[]')
      setCompleted(done.includes(unit.id))
    } catch {}
  }, [unit])

  const markComplete = () => {
    if (!unit) return
    try {
      const done = JSON.parse(window.localStorage.getItem(LS_COMPLETED) || '[]')
      if (!done.includes(unit.id)) {
        done.push(unit.id)
        window.localStorage.setItem(LS_COMPLETED, JSON.stringify(done))
        const xp = parseInt(window.localStorage.getItem(LS_XP) || '0', 10) || 0
        window.localStorage.setItem(LS_XP, String(xp + unit.xpReward))
      }
    } catch {}
    setCompleted(true)
  }

  if (!grading || !unit || !gradeMeta) {
    return (
      <div className="min-h-screen bg-gray-950 text-white grid place-items-center px-4">
        <div className="text-center">
          <p className="text-xl">Unit not found.</p>
          <Link href="/schools/learn" className="mt-3 inline-block text-amber-400 hover:underline">← Back to lessons</Link>
        </div>
      </div>
    )
  }

  const quizScore = quizAnswers.reduce((acc, a, i) => acc + (a === unit.quiz[i]?.correct ? 1 : 0), 0)
  const quizPassed = submitted && quizScore >= 2

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        {/* Breadcrumb header */}
        <header className="border-b border-gray-800 bg-gray-900/60 px-4 py-3 sticky top-0 z-20 backdrop-blur">
          <div className="mx-auto max-w-4xl flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-gray-400">
              <Link href="/schools" className="hover:underline">Schools</Link>
              <span className="mx-1.5">›</span>
              <Link href="/schools/learn" className="hover:underline">{gradeMeta.label}</Link>
              <span className="mx-1.5">›</span>
              <span className="text-gray-300">{unit.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-amber-300">⚡ {unit.xpReward} XP</span>
              <span className="rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-gray-300">⏱ {unit.duration}</span>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-b border-amber-500/20 px-4 py-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="text-7xl">{unit.emoji}</div>
            <h1 className="mt-4 text-3xl md:text-5xl font-black leading-tight">{unit.title}</h1>
            <p className="mt-2 text-lg text-gray-300">{unit.tagline}</p>
          </div>
        </section>

        {/* Concepts */}
        <section className="mx-auto max-w-4xl px-4 py-10 space-y-5">
          <h2 className="text-xs uppercase tracking-wide text-amber-400 mb-3">Concepts</h2>
          {unit.concepts.map((c, i) => (
            <article key={c.term} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{c.emoji}</span>
                <h3 className="text-xl font-bold">{c.term}</h3>
              </div>
              <p className="mt-3 text-lg text-gray-100 leading-relaxed">{c.layman}</p>
              <p className="mt-3 italic text-amber-200 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-sm">
                💡 Think of it like… {c.analogy}
              </p>
              {c.types && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.types.map(t => (
                    <span key={t} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
              {c.deepDive && (
                <details
                  className="mt-3 group"
                  open={openDeep === i}
                  onToggle={(e) => setOpenDeep((e.target as HTMLDetailsElement).open ? i : null)}
                >
                  <summary className="cursor-pointer text-sm text-amber-300 hover:underline list-none">Go deeper →</summary>
                  <p className="mt-2 text-sm text-gray-400">{c.deepDive}</p>
                </details>
              )}
            </article>
          ))}
        </section>

        {/* Video */}
        <section className="mx-auto max-w-4xl px-4 pb-10">
          <h2 className="text-xs uppercase tracking-wide text-amber-400 mb-3">{unit.videoTitle}</h2>
          <div className="aspect-video rounded-2xl overflow-hidden border border-gray-800">
            <iframe
              src={unit.videoUrl}
              title={unit.videoTitle}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </section>

        {/* Quiz */}
        <section className="mx-auto max-w-4xl px-4 pb-10">
          <h2 className="text-xs uppercase tracking-wide text-amber-400 mb-3">Quick quiz</h2>
          <div className="space-y-4">
            {unit.quiz.map((q, qi) => {
              const picked = quizAnswers[qi]
              return (
                <div key={qi} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                  <p className="font-semibold text-white">{qi + 1}. {q.question}</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const isCorrect = oi === q.correct
                      const isPicked = picked === oi
                      const showState = submitted && (isPicked || isCorrect)
                      return (
                        <button
                          key={oi}
                          disabled={submitted}
                          onClick={() => setQuizAnswers(a => { const n = [...a]; n[qi] = oi; return n })}
                          className={`text-left rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                            showState
                              ? isCorrect
                                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                                : 'border-red-500/60 bg-red-500/15 text-red-200'
                              : isPicked
                                ? 'border-amber-500 bg-amber-500/10 text-white'
                                : 'border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-700'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {submitted && (
                    <p className="mt-3 text-sm text-gray-400">
                      <span className="text-amber-400 font-semibold">Why:</span> {q.explanation}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              disabled={quizAnswers.filter(a => a !== undefined).length < unit.quiz.length}
              className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-black disabled:opacity-40"
            >
              Check answers
            </button>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-semibold">You scored {quizScore} / {unit.quiz.length}</p>
                <p className="text-sm text-gray-300">{quizPassed ? 'Great job — concept locked in 🔒' : 'Re-read the concepts and try again.'}</p>
              </div>
              <button
                onClick={() => { setSubmitted(false); setQuizAnswers([]) }}
                className="text-sm rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-gray-200"
              >Retry quiz</button>
            </div>
          )}
        </section>

        {/* Mission CTA */}
        {unit.nextMission && (
          <section className="mx-auto max-w-4xl px-4 pb-10">
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 text-center">
              <p className="text-xs uppercase tracking-wide text-amber-400">🚀 Mission Unlocked</p>
              <p className="mt-2 text-xl font-bold">Apply what you learned in the simulator</p>
              <Link
                href={`/schools/simulate?m=${unit.nextMission}`}
                onClick={markComplete}
                className="mt-4 inline-block rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-black hover:bg-amber-400"
              >
                Launch mission →
              </Link>
            </div>
          </section>
        )}

        {/* Done / next */}
        <section className="mx-auto max-w-4xl px-4 pb-10 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={markComplete}
            disabled={completed}
            className={`rounded-xl px-5 py-2.5 font-semibold ${completed ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            {completed ? '✓ Lesson complete' : 'Mark lesson complete'}
          </button>

          {nextUnit ? (
            <Link
              href={`/schools/learn/${grade}/${nextUnit.id}`}
              className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-black hover:bg-amber-400"
            >
              Next: {nextUnit.title} →
            </Link>
          ) : (
            <Link
              href="/schools/student"
              className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-black hover:bg-amber-400"
            >
              Back to dashboard →
            </Link>
          )}
        </section>
      </main>
    </div>
  )
}
