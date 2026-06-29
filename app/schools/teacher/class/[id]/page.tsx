'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { SchoolSideNav } from '../../../_components/SchoolSideNav'
import { MISSIONS, SCHOOL_CURRICULUM } from '@/lib/school-curriculum'

interface ClassRow {
  id: string
  class_name: string
  grade: string
  section: string | null
  join_code: string
  school_name: string | null
}

interface StudentRow {
  student_id: string
  joined_at: string
  email?: string
  display_name?: string | null
  school_xp?: number | null
  school_track?: string | null
}

interface Completion {
  student_id: string
  mission_id: string
  score: number
  completed_at: string
}

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>()
  const classId = params?.id || ''

  const [authReady, setAuthReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [cls, setCls] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [assignMission, setAssignMission] = useState<string>(MISSIONS[0].id)

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      setAuthReady(true)
      if (!user) { setAuthed(false); return }
      setAuthed(true)

      const { data: cRow } = await supabase.from('school_classes').select('*').eq('id', classId).single()
      if (cRow) setCls(cRow as ClassRow)

      const { data: memb } = await supabase
        .from('student_class_memberships')
        .select('student_id, joined_at, profiles:student_id ( email, display_name, school_xp, school_track )')
        .eq('class_id', classId)

      const rows: StudentRow[] = (memb || []).map((r: any) => ({
        student_id: r.student_id,
        joined_at: r.joined_at,
        email: r.profiles?.email,
        display_name: r.profiles?.display_name,
        school_xp: r.profiles?.school_xp,
        school_track: r.profiles?.school_track,
      }))
      setStudents(rows)

      if (rows.length) {
        const studentIds = rows.map(r => r.student_id)
        const { data: comps } = await supabase
          .from('school_mission_completions')
          .select('student_id, mission_id, score, completed_at')
          .in('student_id', studentIds)
        setCompletions((comps || []) as Completion[])
      }
    })()
  }, [classId])

  const byStudent = useMemo(() => {
    const map = new Map<string, { passed: number; xp: number; last?: string }>()
    completions.forEach(c => {
      const cur = map.get(c.student_id) || { passed: 0, xp: 0 }
      map.set(c.student_id, {
        passed: cur.passed + 1,
        xp: cur.xp + (c.score || 0),
        last: cur.last && cur.last > c.completed_at ? cur.last : c.completed_at,
      })
    })
    return map
  }, [completions])

  const exportCSV = () => {
    const lines = [
      ['name', 'email', 'track', 'lessons_done', 'missions_passed', 'xp', 'last_active'].join(','),
      ...students.map(s => {
        const stat = byStudent.get(s.student_id) || { passed: 0, xp: 0, last: '' }
        return [
          (s.display_name || '').replace(/,/g, ' '),
          (s.email || '').replace(/,/g, ' '),
          s.school_track || '',
          '—',
          stat.passed,
          stat.xp,
          stat.last || '',
        ].join(',')
      }),
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `class-${classId}.csv`
    a.click()
  }

  if (!authReady) return <Loading />
  if (!authed) return <NotAuthed />
  if (!cls) return <Loading />

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        <header className="border-b border-gray-800 px-4 py-5">
          <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link href="/schools/teacher" className="text-amber-400 text-sm hover:underline">← All classes</Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold">{cls.class_name}</h1>
              <p className="text-sm text-gray-400">{cls.grade}{cls.section ? ` · ${cls.section}` : ''}{cls.school_name ? ` · ${cls.school_name}` : ''}</p>
            </div>
            <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2">
              <p className="text-[10px] uppercase tracking-wide text-amber-300">Join code</p>
              <p className="font-mono font-bold text-amber-400 text-xl">{cls.join_code}</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
          {/* Student table */}
          <section className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold">Students ({students.length})</p>
              <button onClick={exportCSV} className="text-xs rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-gray-200">Export CSV</button>
            </div>
            {students.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No students yet. Share the join code <span className="font-mono text-amber-400">{cls.join_code}</span> with your class.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-400">Name</th>
                      <th className="text-left px-3 py-2 text-gray-400">Track</th>
                      <th className="text-right px-3 py-2 text-gray-400">Missions</th>
                      <th className="text-right px-3 py-2 text-gray-400">XP</th>
                      <th className="text-right px-3 py-2 text-gray-400">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const stat = byStudent.get(s.student_id) || { passed: 0, xp: 0, last: '' }
                      const maxMissions = MISSIONS.length
                      return (
                        <tr key={s.student_id} className="border-t border-gray-800 odd:bg-gray-900/40">
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{s.display_name || s.email || s.student_id.slice(0, 6)}</p>
                            {s.email && <p className="text-[11px] text-gray-500">{s.email}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-amber-300">{s.school_track || '—'}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="inline-flex flex-col items-end">
                              <span className="font-mono">{stat.passed} / {maxMissions}</span>
                              <span className="mt-1 block w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <span className="block h-full bg-amber-500" style={{ width: `${(stat.passed / maxMissions) * 100}%` }} />
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-400">{stat.xp || s.school_xp || 0}</td>
                          <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{stat.last ? new Date(stat.last).toLocaleDateString() : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Assign mission */}
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="font-semibold mb-2">Assign a mission</h3>
            <p className="text-xs text-gray-400 mb-3">Tell your class to open this mission today.</p>
            <div className="flex gap-2 flex-wrap">
              <select
                value={assignMission}
                onChange={e => setAssignMission(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {MISSIONS.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.title}</option>)}
              </select>
              <a
                href={`/schools/simulate?m=${assignMission}`}
                target="_blank"
                rel="noopener"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
              >Preview →</a>
              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/schools/simulate?m=${assignMission}`
                  navigator.clipboard?.writeText(url)
                  alert('Link copied — share it with your class.')
                }}
                className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200"
              >Copy share link</button>
            </div>
          </section>

          {/* Curriculum reference */}
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="font-semibold mb-3">Curriculum quick links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(Object.keys(SCHOOL_CURRICULUM) as (keyof typeof SCHOOL_CURRICULUM)[]).map(g => (
                <div key={g} className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                  <p className="font-semibold text-amber-300">{SCHOOL_CURRICULUM[g].label}</p>
                  <ul className="mt-2 space-y-1">
                    {SCHOOL_CURRICULUM[g].units.map(u => (
                      <li key={u.id}>
                        <Link href={`/schools/learn/${g}/${u.id}`} className="text-sm text-gray-300 hover:text-amber-300">
                          {u.emoji} {u.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 text-white grid place-items-center">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function NotAuthed() {
  return (
    <div className="min-h-screen bg-gray-950 text-white grid place-items-center px-4 text-center">
      <div>
        <div className="text-4xl mb-2">🔐</div>
        <p>Please sign in to view this class.</p>
        <Link href="/login" className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2 font-semibold text-black">Sign in</Link>
      </div>
    </div>
  )
}
