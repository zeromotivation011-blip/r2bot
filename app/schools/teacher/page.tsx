'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { SchoolSideNav } from '../_components/SchoolSideNav'

interface ClassRow {
  id: string
  class_name: string
  grade: string
  section: string | null
  join_code: string
  school_name: string | null
  created_at: string
  student_count?: number
}

function genJoinCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'  // omit confusing chars
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

export default function TeacherDashboardPage() {
  const [authState, setAuthState] = useState<'loading' | 'in' | 'out'>('loading')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [showWorksheet, setShowWorksheet] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthState('out'); return }
      setAuthState('in')
      const { data } = await supabase
        .from('school_classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      setClasses((data || []) as ClassRow[])
    })
  }, [])

  const createClass = async (name: string, grade: string, section: string, schoolName: string) => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const join_code = genJoinCode()
    const { data, error } = await supabase
      .from('school_classes')
      .insert({ teacher_id: user.id, class_name: name, grade, section, school_name: schoolName, join_code })
      .select()
      .single()
    if (!error && data) setClasses(cs => [data as ClassRow, ...cs])
    setShowCreate(false)
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 text-white grid place-items-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (authState === 'out') {
    return (
      <div className="min-h-screen bg-gray-950 text-white grid place-items-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold">Sign in to access the teacher dashboard</h1>
          <p className="mt-2 text-gray-400">You need a R2BOT account to create classes and track students.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/login" className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-black">Sign in</Link>
            <Link href="/schools/register" className="rounded-xl border border-gray-700 bg-gray-900 px-5 py-2.5 font-semibold text-white">Register school</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        <header className="border-b border-gray-800 px-4 py-6">
          <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link href="/schools" className="text-amber-400 text-sm hover:underline">← Schools</Link>
              <h1 className="mt-1 text-3xl font-bold">👩‍🏫 Teacher Dashboard</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage classes · generate lesson plans · print worksheets</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400"
            >+ Create class</button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
          {/* My Classes */}
          <section>
            <h2 className="text-lg font-bold mb-3">My classes</h2>
            {classes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-10 text-center">
                <p className="text-gray-400">No classes yet. Create your first one to get a 6-character join code.</p>
                <button onClick={() => setShowCreate(true)} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-black">+ Create class</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {classes.map(c => (
                  <Link
                    key={c.id}
                    href={`/schools/teacher/class/${c.id}`}
                    className="rounded-2xl border border-gray-800 bg-gray-900 hover:border-amber-500/40 p-5 block"
                  >
                    <p className="text-xs text-gray-500 uppercase">{c.grade}{c.section ? ` · ${c.section}` : ''}</p>
                    <h3 className="mt-1 font-bold text-lg">{c.class_name}</h3>
                    {c.school_name && <p className="text-xs text-gray-400">{c.school_name}</p>}
                    <div className="mt-4 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">Join code</span>
                      <span className="font-mono font-bold text-amber-400">{c.join_code}</span>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Created {new Date(c.created_at).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Lesson plan + worksheet tools */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToolCard
              title="📝 Generate Lesson Plan"
              body="Get a printable 45-minute plan for any topic, aligned to a CBSE/ICSE chapter."
              cta="Open generator"
              onClick={() => setShowPlan(true)}
            />
            <ToolCard
              title="📄 Worksheet Generator"
              body="Pick a unit and get a 10-question worksheet with answer key — ready to print."
              cta="Generate worksheet"
              onClick={() => setShowWorksheet(true)}
            />
          </section>
        </div>

        {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} onSubmit={createClass} />}
        {showPlan && <LessonPlanModal onClose={() => setShowPlan(false)} />}
        {showWorksheet && <WorksheetModal onClose={() => setShowWorksheet(false)} />}
      </main>
    </div>
  )
}

function ToolCard({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{body}</p>
      <button onClick={onClick} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-black">{cta}</button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Modals
// ────────────────────────────────────────────────────────────────────────────
function CreateClassModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (n: string, g: string, s: string, school: string) => void }) {
  const [n, setN] = useState('')
  const [g, setG] = useState('Grade 8')
  const [s, setS] = useState('A')
  const [school, setSchool] = useState('')

  return (
    <ModalShell onClose={onClose} title="Create a class">
      <Field label="Class name (e.g. 'Robotics Wednesdays')" value={n} onChange={setN} />
      <Field label="Grade" value={g} onChange={setG} />
      <Field label="Section" value={s} onChange={setS} />
      <Field label="School name (optional)" value={school} onChange={setSchool} />
      <button
        disabled={!n}
        onClick={() => onSubmit(n, g, s, school)}
        className="mt-2 w-full rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-black disabled:opacity-40"
      >Create — generates a 6-char join code</button>
    </ModalShell>
  )
}

function LessonPlanModal({ onClose }: { onClose: () => void }) {
  const [topic, setTopic] = useState('Sensors and actuators')
  const [duration, setDuration] = useState<'30' | '45' | '60'>('45')
  const [grade, setGrade] = useState('Grade 8')

  const plan = useMemo(() => buildPlan(topic, parseInt(duration, 10), grade), [topic, duration, grade])

  return (
    <ModalShell onClose={onClose} title="📝 Lesson plan generator" wide>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:hidden">
        <Field label="Topic" value={topic} onChange={setTopic} />
        <div>
          <p className="text-xs text-gray-400 mb-1">Duration</p>
          <select value={duration} onChange={e => setDuration(e.target.value as '30' | '45' | '60')}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm">
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
        </div>
        <Field label="Grade" value={grade} onChange={setGrade} />
      </div>

      <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950 p-5 print:border-0 print:bg-white print:text-black">
        <p className="text-xs text-gray-500 print:text-gray-700">R2BOT for Schools · Lesson plan</p>
        <h3 className="text-xl font-bold mt-1 print:text-black">{topic} ({grade})</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {plan.map((p, i) => (
            <li key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-3 print:bg-white print:border-gray-300">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-400 print:text-black">{p.section}</span>
                <span className="text-gray-500 print:text-gray-700">{p.minutes} min</span>
              </div>
              <p className="mt-1 text-gray-200 print:text-black">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-black print:hidden"
      >🖨 Print</button>
    </ModalShell>
  )
}

function WorksheetModal({ onClose }: { onClose: () => void }) {
  const [unit, setUnit] = useState('What Even IS a Robot?')

  const Qs = useMemo(() => buildWorksheet(unit), [unit])

  return (
    <ModalShell onClose={onClose} title="📄 Worksheet generator" wide>
      <Field label="Unit" value={unit} onChange={setUnit} />

      <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950 p-5 print:border-0 print:bg-white print:text-black">
        <p className="text-xs text-gray-500 print:text-gray-700">R2BOT · Worksheet</p>
        <h3 className="text-lg font-bold print:text-black">{unit}</h3>
        <ol className="mt-3 space-y-2 text-sm list-decimal pl-5">
          {Qs.map((q, i) => (
            <li key={i} className="text-gray-200 print:text-black">
              {q.q}
              <p className="mt-1 text-xs text-gray-500 print:text-gray-700">Ans: {q.a}</p>
            </li>
          ))}
        </ol>
      </div>
      <button
        onClick={() => window.print()}
        className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-black print:hidden"
      >🖨 Print</button>
    </ModalShell>
  )
}

function ModalShell({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 print:hidden" />
      <div className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-md'} rounded-2xl border border-gray-800 bg-gray-900 p-6 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
    </label>
  )
}

// Plan + worksheet templates
function buildPlan(topic: string, mins: number, grade: string): { section: string; minutes: number; body: string }[] {
  const f = mins / 45  // scaling factor
  return [
    { section: '1. Warm-up',         minutes: Math.round(5 * f),
      body: `Show a video of a real robot doing "${topic}". Ask: "Where have you seen this before?" Collect 3 answers from students.` },
    { section: '2. Concept intro',   minutes: Math.round(10 * f),
      body: `Explain the concept in plain English using a relatable Indian analogy (UPI / ATM / rice mill). Avoid jargon. Use the corresponding R2BOT unit as your script.` },
    { section: '3. Video',           minutes: Math.round(5 * f),
      body: 'Play the 3-minute video embedded in the R2BOT lesson page. Pause once and ask students to predict what will happen next.' },
    { section: '4. Hands-on (sim)',  minutes: Math.round(15 * f),
      body: `Have students open /schools/simulate on their laptops or phones. Assign the matching mission. Walk the room.` },
    { section: '5. Quiz',            minutes: Math.round(5 * f),
      body: 'Open the 3-question quiz in the R2BOT lesson. Discuss each correct answer.' },
    { section: '6. Wrap-up',         minutes: Math.round(5 * f),
      body: `Closure question: "What is one real-world place where '${topic}' is already being used in India today?"  Take 3 hands.` },
  ]
}

function buildWorksheet(unit: string): { q: string; a: string }[] {
  return [
    { q: `In your own words, define the topic of "${unit}".`, a: 'Open response — accept any reasonable explanation.' },
    { q: 'Name 3 sensors used in everyday devices.', a: 'Camera (phone), IR (TV remote), ultrasonic (smart dustbin).' },
    { q: 'Why is a robot vacuum a robot but a regular vacuum is not?', a: 'It senses, decides and acts on its own.' },
    { q: 'Match: ATM → ___ , Roomba → ___ , Microwave → ___ .', a: 'All three are robots — they each sense, decide and act.' },
    { q: 'Which part of a robot is the "brain"?', a: 'Microcontroller / processor.' },
    { q: 'Differential drive turns by ___.', a: 'Spinning the two wheels at different speeds.' },
    { q: 'Give one example of a sensor and one example of an actuator.', a: 'Sensor: ultrasonic. Actuator: DC motor.' },
    { q: 'What does PWM stand for?', a: 'Pulse Width Modulation — controls motor speed by switching on/off rapidly.' },
    { q: 'Why are loops useful in robot code?', a: 'To repeat an action (e.g. "keep moving forward while the path is clear").' },
    { q: 'Name one robot built or used in India.', a: 'ISRO Vyommitra (humanoid), GreyOrange Butler (warehouse), or DRDO Daksh.' },
  ]
}
