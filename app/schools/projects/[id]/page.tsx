'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { SchoolSideNav } from '../../_components/SchoolSideNav'
import { getProject, type Difficulty } from '@/lib/school-curriculum'

type Tab = 'overview' | 'parts' | 'circuit' | 'simulate' | 'code' | 'build'

const DIFFICULTY_COLOUR: Record<Difficulty, string> = {
  Beginner:     'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Advanced:     'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Expert:       'bg-red-500/15 text-red-300 border-red-500/30',
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id || ''
  const project = getProject(id)
  const [tab, setTab] = useState<Tab>('overview')
  const [showCode, setShowCode] = useState<'arduino' | 'python'>('arduino')

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-950 text-white grid place-items-center px-4">
        <div className="text-center">
          <p className="text-xl">Project not found.</p>
          <Link href="/schools/projects" className="text-amber-400 hover:underline">← Back to projects</Link>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'parts',    label: 'Parts List' },
    { id: 'circuit',  label: 'Circuit' },
    { id: 'simulate', label: 'Simulate' },
    { id: 'code',     label: 'Code' },
    { id: 'build',    label: 'Build Guide' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        <header className="border-b border-gray-800 bg-gray-900/60 px-4 py-4">
          <div className="mx-auto max-w-5xl">
            <Link href="/schools/projects" className="text-amber-400 text-sm hover:underline">← Projects</Link>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-5xl">{project.emoji}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{project.title}</h1>
                <p className="text-gray-400 text-sm mt-0.5">{project.tagline}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              <span className={`font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${DIFFICULTY_COLOUR[project.difficulty]}`}>
                {project.difficulty}
              </span>
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">{project.cost}</span>
              {project.duration && <span className="bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full">⏱ {project.duration}</span>}
              {project.steps && <span className="bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{project.steps} steps</span>}
            </div>
          </div>
        </header>

        <nav className="border-b border-gray-800 bg-gray-900/40 px-4">
          <div className="mx-auto max-w-5xl flex gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
                  tab === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >{t.label}</button>
            ))}
          </div>
        </nav>

        <div className="mx-auto max-w-5xl px-4 py-8">
          {tab === 'overview' && (
            <div className="space-y-6">
              <Section title="What you're building">
                <p className="text-gray-300">{project.tagline}</p>
                {project.realWorldLink && (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
                    🌎 Real-world link: {project.realWorldLink}
                  </div>
                )}
              </Section>
              <Section title="Skills you'll pick up">
                <div className="flex flex-wrap gap-1.5">
                  {project.skills.map(s => (
                    <span key={s} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </Section>
              <Section title="Learning outcomes">
                <ul className="space-y-2 text-sm text-gray-300">
                  <Bullet>How each component contributes to the final behaviour</Bullet>
                  <Bullet>Reading a circuit and wiring it without mistakes</Bullet>
                  <Bullet>Writing & uploading the firmware</Bullet>
                  <Bullet>Debugging when things don&apos;t move as expected</Bullet>
                </ul>
              </Section>
              {project.simulationMission && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                  <p className="text-xs uppercase tracking-wide text-amber-400">Try before you build</p>
                  <p className="mt-2 font-semibold">Run this exact behaviour in the browser simulator first.</p>
                  <Link
                    href={`/schools/simulate?m=${project.simulationMission}`}
                    className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
                  >
                    Launch simulation →
                  </Link>
                </div>
              )}
            </div>
          )}

          {tab === 'parts' && (
            <div className="overflow-hidden rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400">Part</th>
                    <th className="text-left px-4 py-3 text-gray-400">Purpose (in plain words)</th>
                    <th className="text-right px-4 py-3 text-gray-400">Cost</th>
                    <th className="text-right px-4 py-3 text-gray-400">Buy</th>
                  </tr>
                </thead>
                <tbody>
                  {project.parts.map(p => (
                    <tr key={p.name} className="border-t border-gray-800 odd:bg-gray-900/40">
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-300">{p.purpose}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-300">{p.cost}</td>
                      <td className="px-4 py-3 text-right">
                        {p.link ? (
                          <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Robu.in →</a>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-700 bg-gray-900">
                    <td colSpan={2} className="px-4 py-3 font-semibold">Approx total</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-400 font-bold">{project.cost}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {tab === 'circuit' && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Wiring</p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-amber-100 bg-gray-950 rounded-xl p-4 border border-gray-800">{project.circuit}</pre>
              <p className="mt-3 text-xs text-gray-500">Tip: always check GND is common between Arduino and the motor driver.</p>
            </div>
          )}

          {tab === 'simulate' && (
            <div className="space-y-3">
              {project.simulationMission ? (
                <>
                  <p className="text-sm text-gray-300">Run the simulator with this project&apos;s mission pre-loaded.</p>
                  <iframe
                    src={`/schools/simulate?m=${project.simulationMission}`}
                    className="w-full h-[700px] rounded-2xl border border-gray-800 bg-gray-950"
                    title="Simulator"
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
                  No matching simulation for this project yet — try the simulator directly.
                  <div className="mt-3">
                    <Link href="/schools/simulate" className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black inline-block">Open simulator →</Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'code' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCode('arduino')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showCode === 'arduino' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300'}`}
                >Arduino C</button>
                <button
                  onClick={() => setShowCode('python')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showCode === 'python' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300'}`}
                >Python</button>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs text-amber-100 bg-gray-950 rounded-xl p-4 border border-gray-800 overflow-x-auto">
                {showCode === 'arduino' ? project.arduinoCode : project.pythonCode}
              </pre>
              <p className="text-xs text-gray-500">💡 Try the block-coding version inside the simulator before flashing your Arduino — you&apos;ll save hours.</p>
            </div>
          )}

          {tab === 'build' && (
            <ol className="space-y-3">
              {project.buildSteps.map((s, i) => (
                <li key={i} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-black grid place-items-center font-bold flex-shrink-0">{i + 1}</div>
                  <div>
                    <p className="font-semibold text-white">{s.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-amber-400 mb-2">{title}</h2>
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">{children}</div>
    </section>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2"><span className="text-amber-400">→</span><span>{children}</span></li>
  )
}
