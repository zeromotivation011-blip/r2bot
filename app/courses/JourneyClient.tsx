'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export interface JourneyCourse {
  slug: string; title: string; tagline: string; level: string; order: number
  lessons: number; videosReady: number; minutes: number; prerequisites: string
}
interface Prog { signedIn: boolean; counts?: Record<string, number>; certificates?: Record<string, string> }

export default function JourneyClient({ courses }: { courses: JourneyCourse[] }) {
  const [prog, setProg] = useState<Prog | null>(null)
  useEffect(() => {
    fetch(`/api/courses/progress?courses=${courses.map((c) => c.slug).join(',')}`).then((r) => r.json()).then(setProg).catch(() => setProg({ signedIn: false }))
  }, [courses])
  const counts = prog?.counts ?? {}
  const totalLessons = courses.reduce((a, c) => a + c.lessons, 0)
  const doneLessons = courses.reduce((a, c) => a + Math.min(c.lessons, counts[c.slug] ?? 0), 0)
  const certs = Object.keys(prog?.certificates ?? {}).length
  const firstOpen = courses.find((c) => (counts[c.slug] ?? 0) < c.lessons && c.videosReady > 0) ?? courses[0]

  return (
    <div className="mt-10">
      {prog?.signedIn && (
        <div className="rounded-2xl border border-white/10 p-5 mb-8">
          <div className="flex justify-between text-sm text-gray-300"><span>Your journey</span><span>{doneLessons} of {totalLessons} lessons · {certs} of {courses.length} certificates</span></div>
          <div className="h-2 rounded bg-white/10 mt-2 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${Math.round((doneLessons / totalLessons) * 100)}%` }} /></div>
          <Link href={`/courses/${firstOpen.slug}`} className="inline-block mt-3 text-amber-500 underline text-sm">Continue: {firstOpen.title} →</Link>
        </div>
      )}
      <ol className="relative space-y-5">
        {courses.map((c, i) => {
          const done = Math.min(c.lessons, counts[c.slug] ?? 0)
          const pct = Math.round((done / c.lessons) * 100)
          const cert = prog?.certificates?.[c.slug]
          return (
            <li key={c.slug} className="relative pl-14">
              {i < courses.length - 1 && <span aria-hidden className="absolute left-[19px] top-11 bottom-[-20px] w-0.5 bg-amber-500/30" />}
              <span aria-hidden className={`absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center font-black ${cert ? 'bg-green-500 text-black' : 'bg-amber-500 text-black'}`}>{cert ? '✓' : c.order}</span>
              <Link href={`/courses/${c.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-amber-500/60 transition">
                <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Course {c.order} · {c.level} · Free</p>
                <h2 className="text-xl font-extrabold text-white mt-1">{c.title}</h2>
                <p className="text-gray-300 mt-1 text-sm">{c.tagline}</p>
                <p className="text-gray-500 mt-3 text-xs">{c.lessons} lessons · about {c.minutes} min · quizzes · final activity · certificate</p>
                <p className="text-gray-500 mt-1 text-xs">Before you start: {c.prerequisites}</p>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {c.videosReady === 0 ? (
                    <span className="text-[11px] rounded-full border border-white/20 text-gray-400 px-2 py-0.5">Recording now · read the plan</span>
                  ) : c.videosReady < c.lessons ? (
                    <span className="text-[11px] rounded-full border border-sky-500/40 text-sky-300 px-2 py-0.5">{c.videosReady} of {c.lessons} videos live</span>
                  ) : (
                    <span className="text-[11px] rounded-full border border-green-500/40 text-green-300 px-2 py-0.5">All {c.lessons} videos live</span>
                  )}
                  {prog?.signedIn && done > 0 && <span className="text-[11px] text-green-400">{done}/{c.lessons} done ({pct}%)</span>}
                  {cert && <span className="text-[11px] text-green-400">🎓 Certificate earned</span>}
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
