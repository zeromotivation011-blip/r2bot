'use client'

import Link from 'next/link'
import { SchoolSideNav } from '../_components/SchoolSideNav'
import { PROJECTS, type Difficulty } from '@/lib/school-curriculum'

const DIFFICULTY_COLOUR: Record<Difficulty, string> = {
  Beginner:     'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Advanced:     'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Expert:       'bg-red-500/15 text-red-300 border-red-500/30',
}

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        <header className="border-b border-gray-800 px-4 py-6">
          <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link href="/schools/student" className="text-amber-400 text-sm hover:underline">← Dashboard</Link>
              <h1 className="mt-1 text-3xl font-bold">🚀 Project Lab</h1>
              <p className="text-sm text-gray-400 mt-0.5">10 real-world buildable projects — Indian parts, Indian prices.</p>
            </div>
            <div className="text-xs text-gray-500">All costs sourced from Robu.in (approximate, 2024)</div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROJECTS.map(p => (
            <Link
              key={p.id}
              href={`/schools/projects/${p.id}`}
              className="rounded-2xl border border-gray-800 bg-gray-900 hover:border-amber-500/40 hover:bg-gray-900/80 transition-colors p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-5xl bg-gray-800 rounded-full w-16 h-16 grid place-items-center">{p.emoji}</div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${DIFFICULTY_COLOUR[p.difficulty]}`}>
                  {p.difficulty}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-white">{p.title}</h2>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.tagline}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.skills.slice(0, 3).map(s => (
                  <span key={s} className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-amber-400 font-bold">{p.cost}</span>
                <span className="text-sm text-amber-300">Start →</span>
              </div>

              {p.realWorldLink && (
                <p className="mt-3 text-[10px] text-gray-500 italic">{p.realWorldLink}</p>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
