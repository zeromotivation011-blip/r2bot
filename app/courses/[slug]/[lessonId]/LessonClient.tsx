'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/components/SiteViewCounter'

interface Q { q: string; options: string[] }
interface Lesson { id: string; title: string; summary: string; youtubeId: string; videoNo?: number; durationMin: number; quiz: Q[] }
interface Props {
  courseSlug: string; courseTitle: string; lesson: Lesson; index: number; total: number
  nextId: string | null; prevId: string | null
  /** First lesson of this course that does have a video, so an unrecorded lesson is never a dead end. */
  firstReadyId: string | null
}
interface Review { ok: boolean; why: string | null; answer: number }
interface Result { needsAssignment?: boolean; passed: boolean; score: number; review: Review[]; courseComplete?: boolean; certificateId?: string | null; completed?: number; total?: number; error?: string }

// Minimal typing for the YouTube IFrame API.
interface YTPlayer { getCurrentTime(): number; getDuration(): number; seekTo(s: number, a: boolean): void; destroy(): void }
declare global { interface Window { YT?: { Player: new (el: HTMLElement, o: unknown) => YTPlayer }; onYouTubeIframeAPIReady?: () => void } }

const NEED = 0.85

export default function LessonClient({ courseSlug, courseTitle, lesson, index, total, nextId, prevId, firstReadyId }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const watchedS = useRef(0)
  const durationS = useRef(lesson.durationMin * 60)
  const [pct, setPct] = useState(0)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<number[]>(() => lesson.quiz.map(() => -1))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const placeholder = !lesson.youtubeId.trim() || lesson.youtubeId.startsWith('REPLACE')

  // Funnel: a course lesson with a real video was opened. Paired with
  // lesson_quiz_correct this gives the Quick Lesson → course conversion that
  // the whole top-of-funnel strategy rests on.
  useEffect(() => {
    if (!placeholder) trackEvent('course_lesson_open')
  }, [placeholder, lesson.id])

  const saveWatch = useCallback(() => {
    const p = player.current
    if (!p || !signedIn) return
    const body = JSON.stringify({ courseSlug, lessonId: lesson.id, position: p.getCurrentTime(), maxPct: Math.min(1, watchedS.current / durationS.current) })
    navigator.sendBeacon?.('/api/courses/watch', new Blob([body], { type: 'application/json' }))
  }, [courseSlug, lesson.id, signedIn])

  useEffect(() => {
    fetch(`/api/courses/progress?course=${encodeURIComponent(courseSlug)}`).then((r) => r.json()).then((d) => {
      setSignedIn(!!d.signedIn)
      if (d.completed?.includes(lesson.id)) { setDone(true); watchedS.current = durationS.current; setPct(1) }
      const w = d.watch?.[lesson.id]
      if (w) { watchedS.current = Math.max(watchedS.current, (w.maxPct ?? 0) * durationS.current); setPct(Math.min(1, watchedS.current / durationS.current)); resume.current = w.position ?? 0 }
    }).catch(() => setSignedIn(false))
  }, [courseSlug, lesson.id])
  const resume = useRef(0)

  useEffect(() => {
    if (placeholder || !box.current) return
    let tick: ReturnType<typeof setInterval> | undefined
    let save: ReturnType<typeof setInterval> | undefined
    const mount = () => {
      if (!window.YT || !box.current) return
      const holder = document.createElement('div')
      box.current.innerHTML = ''
      box.current.appendChild(holder)
      let playing = false
      player.current = new window.YT.Player(holder, {
        videoId: lesson.youtubeId,
        width: '100%', height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            const d = player.current?.getDuration() ?? 0
            if (d > 0) durationS.current = d
            if (resume.current > 5) player.current?.seekTo(resume.current, true)
          },
          onStateChange: (e: { data: number }) => { playing = e.data === 1 },
        },
      })
      // Count only seconds actually played (so skipping ahead does not count).
      tick = setInterval(() => {
        if (!playing) return
        watchedS.current += 1
        setPct(Math.min(1, watchedS.current / durationS.current))
      }, 1000)
      save = setInterval(saveWatch, 15000)
    }
    if (window.YT?.Player) mount()
    else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); mount() }
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script'); s.id = 'yt-iframe-api'; s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s)
      }
    }
    window.addEventListener('pagehide', saveWatch)
    return () => { if (tick) clearInterval(tick); if (save) clearInterval(save); window.removeEventListener('pagehide', saveWatch); saveWatch(); player.current?.destroy(); player.current = null }
  }, [lesson.youtubeId, placeholder, saveWatch])

  const ready = pct >= NEED
  const answered = answers.every((a) => a >= 0)

  async function submit() {
    setBusy(true)
    try {
      const r = await fetch('/api/courses/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseSlug, lessonId: lesson.id, watched: Math.min(1, watchedS.current / durationS.current), answers }) })
      const d = await r.json()
      if (r.ok) { setResult(d); if (d.passed) setDone(true) }
      else setResult({ passed: false, score: 0, review: [], error: d.error ?? 'Something went wrong.' })
    } catch { setResult({ passed: false, score: 0, review: [], error: 'Network problem. Try again.' }) }
    setBusy(false)
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-10">
      <nav className="text-sm text-gray-500 mb-3"><Link href="/courses" className="hover:text-white">Courses</Link> / <Link href={`/courses/${courseSlug}`} className="hover:text-white">{courseTitle}</Link></nav>
      <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Lesson {index + 1} of {total}</p>
      <h1 className="text-2xl md:text-4xl font-black text-white mt-1">{lesson.title}</h1>
      <p className="text-gray-400 mt-2">{lesson.summary}</p>

      <div className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-black" style={{ aspectRatio: '16 / 9' }}>
        {placeholder
          ? <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
              <span className="text-4xl" aria-hidden>🎬</span>
              <p className="text-white font-bold">This lesson is not recorded yet</p>
              <p className="text-gray-400 text-sm max-w-sm">You have read what it covers. Keep going with a lesson that is ready — nothing here needs to wait for this one.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {firstReadyId && firstReadyId !== lesson.id && (
                  <Link href={`/courses/${courseSlug}/${firstReadyId}`} className="min-h-[44px] inline-flex items-center rounded-xl bg-amber-500 px-4 font-bold text-black">
                    Go to the first ready lesson →
                  </Link>
                )}
                <Link href="/shorts" className="min-h-[44px] inline-flex items-center rounded-xl border border-white/20 px-4 font-bold text-white">
                  Try a one-minute lesson
                </Link>
              </div>
            </div>
          : <div ref={box} className="w-full h-full" />}
      </div>

      {!placeholder && <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-400"><span>Watched</span><span>{Math.round(pct * 100)}% {ready ? '· quiz unlocked' : `· watch ${Math.round(NEED * 100)}% to unlock the quiz`}</span></div>
        <div className="h-2 rounded bg-white/10 mt-1 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${Math.round(pct * 100)}%` }} /></div>
      </div>}
      {signedIn === false && <p className="text-sm text-gray-400 mt-3"><Link href="/login" className="text-amber-500 underline">Sign in</Link> so your progress and certificate are saved.</p>}

      {ready && !placeholder && lesson.quiz.length > 0 && !done && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-white">Quick check</h2>
          <div className="mt-4 space-y-5">
            {lesson.quiz.map((q, qi) => (
              <fieldset key={qi}>
                <legend className="text-white font-semibold">{qi + 1}. {q.q}</legend>
                <div className="mt-2 space-y-2">
                  {q.options.map((o, oi) => (
                    <label key={oi} className={`flex items-center gap-3 rounded-lg border px-3 min-h-[44px] cursor-pointer ${answers[qi] === oi ? 'border-amber-500 bg-amber-500/10' : 'border-white/10'}`}>
                      <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))} />
                      <span className="text-gray-200">{o}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <button onClick={submit} disabled={!answered || busy || signedIn === false} className="btn-primary mt-5 px-6 min-h-[48px] rounded-xl font-bold disabled:opacity-50">{busy ? 'Checking…' : 'Submit answers'}</button>
          {signedIn === false && <p className="text-xs text-gray-500 mt-2">Sign in to submit.</p>}
        </section>
      )}

      {result && (
        <section className="mt-6 rounded-xl border border-white/10 p-4">
          {result.error && <p className="text-red-400">{result.error}</p>}
          {!result.error && <p className={result.passed ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}>{result.passed ? 'Passed' : 'Not quite'} — {Math.round(result.score * 100)}%{result.passed ? '' : '. You need 70%. Review the video and try again.'}</p>}
          {result.review.map((r, i) => r.why && <p key={i} className="text-sm text-gray-400 mt-2">{i + 1}. {r.ok ? '✓' : '✗'} {r.why}</p>)}
          {result.courseComplete && result.certificateId && <Link href={`/verify/${result.certificateId}`} className="inline-block mt-3 text-amber-500 underline font-semibold">🎓 Course complete — view your certificate →</Link>}
          {result.courseComplete && !result.certificateId && result.needsAssignment && <Link href={`/courses/${courseSlug}#final-activity`} className="inline-block mt-3 text-amber-500 underline font-semibold">All lessons done — complete the final activity to get your certificate →</Link>}
          {result.courseComplete && !result.certificateId && !result.needsAssignment && <p className="text-sm text-gray-400 mt-2">Course complete. Your certificate will appear on the course page shortly.</p>}
        </section>
      )}

      {done && !result && <p className="mt-6 text-green-400 font-semibold">✓ You have completed this lesson.</p>}

      <div className="flex justify-between mt-10 gap-3">
        {prevId ? <Link href={`/courses/${courseSlug}/${prevId}`} className="rounded-xl border border-white/15 px-4 min-h-[44px] inline-flex items-center text-gray-300">← Previous</Link> : <span />}
        {nextId
          ? <Link href={`/courses/${courseSlug}/${nextId}`} className={`rounded-xl px-5 min-h-[44px] inline-flex items-center font-bold ${done ? 'btn-primary' : 'border border-white/15 text-gray-400'}`}>Next lesson →</Link>
          : <Link href={`/courses/${courseSlug}`} className="rounded-xl border border-white/15 px-4 min-h-[44px] inline-flex items-center text-gray-300">Course overview</Link>}
      </div>
    </main>
  )
}
