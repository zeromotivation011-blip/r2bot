'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SchoolSideNav } from '../_components/SchoolSideNav'
import { SCHOOL_GRADES, SCHOOL_CURRICULUM, type SchoolGradeId } from '@/lib/school-curriculum'

export default function LearnIndex() {
  const router = useRouter()
  const [grade, setGrade] = useState<SchoolGradeId | null>(null)

  useEffect(() => {
    try {
      const g = window.localStorage.getItem('r2bot_school_grade') as SchoolGradeId | null
      if (g) setGrade(g)
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <main className="flex-1 min-w-0 px-4 py-8 pb-24 md:pb-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/schools/student" className="text-amber-400 text-sm hover:underline">← Dashboard</Link>
          <h1 className="mt-3 text-3xl font-bold">📚 Lessons</h1>
          <p className="text-gray-400 mt-1">Pick a grade and a unit to begin.</p>

          {SCHOOL_GRADES.map(g => {
            const isCurrent = g.id === grade
            return (
              <section key={g.id} className={`mt-8 rounded-2xl border p-5 ${isCurrent ? 'border-amber-500/40 bg-amber-500/5' : 'border-gray-800 bg-gray-900'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{g.emoji}</span>
                    <div>
                      <h2 className="font-bold text-lg">{g.label}{isCurrent && <span className="ml-2 text-xs text-amber-400">· your grade</span>}</h2>
                      <p className="text-sm text-gray-400">{g.tagline}</p>
                    </div>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        try { window.localStorage.setItem('r2bot_school_grade', g.id) } catch {}
                        setGrade(g.id); router.refresh()
                      }}
                      className="text-xs rounded-full border border-gray-700 px-2.5 py-1 text-gray-300 hover:bg-gray-800"
                    >Set as my grade</button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SCHOOL_CURRICULUM[g.id].units.map(u => (
                    <Link
                      key={u.id}
                      href={`/schools/learn/${g.id}/${u.id}`}
                      className="block rounded-xl border border-gray-800 bg-gray-900 hover:border-amber-500/40 p-4"
                    >
                      <p className="text-2xl">{u.emoji}</p>
                      <p className="mt-2 font-semibold">{u.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{u.tagline}</p>
                      <p className="mt-3 text-xs text-amber-300">⚡ {u.xpReward} XP · {u.duration}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
