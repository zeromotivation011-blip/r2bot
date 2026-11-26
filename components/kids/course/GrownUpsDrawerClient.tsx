'use client'

// components/kids/course/GrownUpsDrawerClient.tsx
// "For grown-ups": the session's parent note and the teacher's 40-minute plan
// (objectives, unplugged warm-up, discussion, misconceptions, differentiation)
// in a drawer, so the child's screen stays simple and the adult is one tap away.

import { useEffect, useRef, useState } from 'react'
import type { LearningObjective, ParentNote, Project, TeacherNotes } from '@/lib/kids/curriculum/types'

interface Props {
  title: string
  objectives: LearningObjective[]
  teacher: TeacherNotes
  parent: ParentNote
  project?: Project
}

type Tab = 'parents' | 'teachers' | 'project'

export default function GrownUpsDrawerClient({ title, objectives, teacher, parent, project }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('parents')
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const opener = openerRef.current
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('button, [href], summary, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      opener?.focus()
    }
  }, [open])

  const tabs: [Tab, string][] = [['parents', 'Parents'], ['teachers', 'Teachers'], ...(project ? ([['project', 'Project']] as [Tab, string][]) : [])]

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        data-testid="grownups-open"
        className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl border border-white/15 px-3 text-sm font-bold text-[#A7B0C0] hover:bg-white/10 hover:text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="8" cy="7" r="3" fill="currentColor" />
          <circle cx="17" cy="9" r="2.4" fill="currentColor" />
          <path d="M2 20c0-3.6 2.7-6 6-6s6 2.4 6 6M13 20c.3-2.6 1.9-4.4 4-4.4s3.8 1.8 4 4.4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        For grown-ups
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="presentation">
          <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="grownups-title"
            data-testid="grownups-drawer"
            className="relative flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-white/10 bg-[#111C32] text-[16px] text-[#A7B0C0] shadow-[0_8px_24px_rgba(0,0,0,.45)] motion-safe:animate-[course-pop_.25s_cubic-bezier(.22,.61,.36,1)]"
          >
            <div className="flex items-start gap-3 border-b border-white/10 p-4 pt-[calc(16px+env(safe-area-inset-top))]">
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">For grown-ups</p>
                <h2 id="grownups-title" className="font-display text-xl font-bold leading-tight text-[#EEF2F8]">
                  {title}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex gap-1 border-b border-white/10 p-2" role="tablist">
              {tabs.map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`min-h-[44px] flex-1 rounded-xl text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${tab === t ? 'bg-amber-500 text-[#1A1103]' : 'text-[#EEF2F8] hover:bg-white/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-[calc(24px+env(safe-area-inset-bottom))]" role="tabpanel">
              {tab === 'parents' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">What happened today</h3>
                    <p className="mt-1 leading-relaxed">{parent.today}</p>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Try at home (5 minutes)</h3>
                    <p className="mt-1 leading-relaxed">{parent.tryAtHome}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-400/10 p-4">
                    <h3 className="font-display text-lg font-bold text-amber-200">Ask your child</h3>
                    <p className="mt-1 text-[17px] font-semibold leading-relaxed text-[#EEF2F8]">“{parent.askYourChild}”</p>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">What your child can now do</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {objectives.map((o) => (
                        <li key={o.id}>{o.kidText}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm">
                    Progress stays on this device. Children never give an email, phone number, password or birthday. Stars reward care, never speed, and are never compared between children.
                  </p>
                </div>
              )}
              {tab === 'teachers' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Objectives</h3>
                    <ul className="mt-1 space-y-2">
                      {objectives.map((o) => (
                        <li key={o.id}>
                          <span className="text-xs font-black text-[#6E7888]">{o.id}</span> {o.text}
                          {o.discussionOnly && <span className="ml-1 rounded bg-white/10 px-1.5 text-xs font-bold">discussion</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">40-minute plan</h3>
                    <ol className="mt-1 space-y-1">
                      {teacher.timing.map((t, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="w-12 shrink-0 font-display font-bold text-amber-300">{t.minutes} min</span>
                          <span>{t.activity}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">
                      Unplugged warm-up: {teacher.unpluggedWarmup.title} ({teacher.unpluggedWarmup.minutes} min)
                    </h3>
                    <ol className="mt-1 list-decimal space-y-1 pl-5">
                      {teacher.unpluggedWarmup.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    <p className="mt-1 text-sm">Materials: {teacher.unpluggedWarmup.materials.join(', ')}</p>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Talk about it</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {teacher.discussion.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Common misconceptions</h3>
                    <ul className="mt-1 space-y-2">
                      {teacher.misconceptions.map((m) => (
                        <li key={m.idea}>
                          <span className="font-semibold text-amber-200">“{m.idea}”</span> — {m.correction}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Differentiation</h3>
                    <p className="mt-1 font-semibold text-[#EEF2F8]">Ready for more</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {teacher.differentiation.faster.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <p className="mt-2 font-semibold text-[#EEF2F8]">Needs more support</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {teacher.differentiation.slower.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  {teacher.notes && teacher.notes.length > 0 && (
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Notes</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {teacher.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {tab === 'project' && project && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">{project.title}</h3>
                    <p className="mt-1 leading-relaxed">{project.brief}</p>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Design steps</h3>
                    <ol className="mt-1 list-decimal space-y-1 pl-5">
                      {project.designSteps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Fair limits</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {project.constraints.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Sharing</h3>
                    <p className="mt-1">{project.share}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
