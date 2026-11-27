'use client'

// components/kids/classroom/GradebookClient.tsx
//
// Teacher: the gradebook by concept (roadmap #31). Children × concepts, each
// cell the child's mastery state from lib/kids/universe/mastery.ts (secure /
// learning / needs a recharge / not started, "!" when finding it hard). Tap a
// cell for the evidence: the numbers behind the letter, the Skill Galaxy runs
// with their stars and tries, the course sessions finished on that concept,
// and the misconceptions the child's checks revealed. CSV and PDF export.
//
// Rows keep the roster's order. There is no total, no rank and no sort by
// attainment, by design.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { KidsClassSummary, KidsMemberRow } from '@/lib/kids/classroom'
import { CONCEPT_IDS, CONCEPT_INFO, STATUS_LABEL, type ConceptId } from '@/lib/kids/universe/mastery'
import {
  STATUS_STYLE,
  activeConcepts,
  cellEvidence,
  cellSentence,
  conceptColumnCounts,
  gradebook,
  gradebookCsv,
  type GradeRow,
  type InsightCatalogue,
} from '@/lib/kids/classroom-insights'
import { downloadText, fileSlug } from '@/lib/kids/classroom-api'

export interface GradebookProps {
  cls: KidsClassSummary
  members: KidsMemberRow[]
  catalogue: InsightCatalogue | null
}

const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export function GradebookClient({ cls, members, catalogue }: GradebookProps) {
  const rows = useMemo(() => gradebook(members), [members])
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState<{ row: GradeRow; concept: ConceptId } | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const concepts = useMemo(() => (all ? [...CONCEPT_IDS] : activeConcepts(rows)), [all, rows])
  const waiting = rows.filter((r) => !r.hasData).length

  function csv() {
    downloadText(gradebookCsv(rows), `r2bot-kids-gradebook-${fileSlug(cls.className)}-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  async function pdf() {
    setPdfBusy(true)
    try {
      const { downloadGradebookPdf } = await import('@/lib/kids/classroom-pdf')
      await downloadGradebookPdf({ className: cls.className, teacherName: cls.teacherName, rows, concepts, date: new Date() })
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <section aria-labelledby="gradebook-h" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="gradebook-h" className="font-display text-2xl font-bold text-white">Gradebook by concept</h2>
          <p className="max-w-2xl text-[15px] text-slate-300">
            Secure means three first-try wins on three different Skill Galaxy activities, of two kinds, in 21 days. Tap any cell for the evidence.{' '}
            <Link href="/kids/teach/standards" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 underline underline-offset-2">How concepts map to standards</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAll((v) => !v)} aria-pressed={all} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>
            {all ? 'Only concepts in use' : `All ${CONCEPT_IDS.length} concepts`}
          </button>
          <button type="button" onClick={csv} disabled={!rows.length} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5 disabled:opacity-50`}>⬇️ CSV</button>
          <button type="button" onClick={() => void pdf()} disabled={!rows.length || pdfBusy} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5 disabled:opacity-50`}>{pdfBusy ? 'Making PDF…' : '⬇️ PDF'}</button>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2 text-xs" aria-label="Key">
        {(['secure', 'learning', 'fading', 'new'] as const).map((s) => (
          <li key={s} className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 ${STATUS_STYLE[s].cls}`}>
            <span className="font-display font-bold">{STATUS_STYLE[s].letter}</span> {STATUS_LABEL[s]}
          </li>
        ))}
        <li className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-2.5 text-rose-100">
          <span className="font-display font-bold">!</span> Finding it hard (3+ misses, no first-try win)
        </li>
      </ul>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-slate-300">The gradebook fills in as children join and play the Skill Galaxy.</p>
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-white/10 bg-[#111C32]">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">Each child’s state for each concept. Buttons open the evidence.</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 border-b border-white/10 bg-[#111C32] px-3 py-2 text-xs uppercase tracking-wider text-slate-400">Nickname</th>
                {concepts.map((id) => (
                  <th key={id} scope="col" className="w-[64px] border-b border-white/10 px-1 py-2 text-center align-bottom text-[11px] font-semibold leading-tight text-slate-300">
                    <span aria-hidden className="block text-lg">{CONCEPT_INFO[id].icon}</span>
                    {CONCEPT_INFO[id].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.member.id}>
                  <th scope="row" className="sticky left-0 z-10 max-w-[9rem] truncate border-b border-white/5 bg-[#111C32] px-3 py-1 font-bold text-white">
                    {r.member.nickname}
                    {!r.hasData && <span className="block text-[11px] font-normal text-slate-500">Syncs on next play</span>}
                  </th>
                  {concepts.map((id) => {
                    const c = r.cells[id]
                    const st = STATUS_STYLE[c.status]
                    return (
                      <td key={id} className="border-b border-white/5 px-1 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => setOpen({ row: r, concept: id })}
                          disabled={!r.hasData}
                          aria-label={`${r.member.nickname}, ${CONCEPT_INFO[id].name}: ${r.hasData ? `${STATUS_LABEL[c.status]}${c.needsHelp ? ', finding it hard' : ''}` : 'no data yet'}. Show evidence.`}
                          className={`relative grid h-11 w-14 place-items-center rounded-xl border font-display text-base font-bold transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:cursor-default disabled:opacity-40 ${st.cls} ${c.needsHelp ? 'ring-2 ring-rose-400/70' : ''}`}
                        >
                          {r.hasData ? st.letter : '–'}
                          {c.needsHelp && <span aria-hidden className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] text-white">!</span>}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="sticky left-0 z-10 bg-[#111C32] px-3 py-2 text-xs font-semibold text-slate-400">Class, per concept</th>
                {concepts.map((id) => {
                  const n = conceptColumnCounts(rows, id)
                  return (
                    <td key={id} className="px-1 py-2 text-center text-[11px] leading-tight text-slate-400">
                      <span className="block text-emerald-300">{n.secure} S</span>
                      <span className="block">{n.learning + n.fading} L/F</span>
                      {n.help > 0 && <span className="block text-rose-300">{n.help} !</span>}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {waiting > 0 && rows.length > 0 && (
        <p className="text-xs text-slate-400">{waiting} {waiting === 1 ? 'child has' : 'children have'} not synced concept data yet: it arrives the next time they play.</p>
      )}

      {open && <EvidenceDialog row={open.row} concept={open.concept} catalogue={catalogue} onClose={() => setOpen(null)} />}
    </section>
  )
}

function EvidenceDialog({ row, concept, catalogue, onClose }: { row: GradeRow; concept: ConceptId; catalogue: InsightCatalogue | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const ev = useMemo(() => (catalogue ? cellEvidence(row, concept, catalogue) : null), [row, concept, catalogue])
  const cell = row.cells[concept]
  const info = CONCEPT_INFO[concept]

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-h"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#111C32] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:rounded-[28px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Evidence</p>
            <h3 id="evidence-h" className="font-display text-2xl font-bold text-white">
              {row.member.nickname} · <span aria-hidden>{info.icon}</span> {info.name}
            </h3>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>Close</button>
        </div>
        <p className={`mt-3 rounded-2xl border p-3 text-[15px] ${STATUS_STYLE[cell.status].cls}`}>{cellSentence(cell)}</p>
        {!ev ? (
          <p className="mt-4 text-sm text-slate-400">Loading the activity names…</p>
        ) : (
          <div className="mt-4 space-y-5 text-[15px]">
            <EvidenceList title="Skill Galaxy runs on this concept" empty="None finished yet.">
              {ev.activities.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-100">{a.title} <span className="text-xs text-slate-400">· {a.track}</span></span>
                  <span className="text-sm text-slate-300">
                    {a.stars !== null ? <><span aria-label={`${a.stars} stars`}>{'★'.repeat(a.stars)}<span className="text-slate-600">{'★'.repeat(3 - a.stars)}</span></span> · {a.attempts === 1 ? 'first try' : `${a.attempts === 9 ? '9+' : a.attempts} tries`}</> : 'finished'}
                  </span>
                </li>
              ))}
            </EvidenceList>
            {ev.stuckActivities.length > 0 && (
              <EvidenceList title="Tried, not solved first time yet" empty="">
                {ev.stuckActivities.map((a) => <li key={a.id} className="text-slate-100">{a.title} <span className="text-sm text-slate-400">· {a.misses} misses</span></li>)}
              </EvidenceList>
            )}
            <EvidenceList title="Course sessions finished on this concept" empty="None yet.">
              {ev.sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                  {s.href ? <Link href={s.href} className="inline-flex min-h-[44px] items-center text-cyan-200 underline underline-offset-2">{s.label}</Link> : <span>{s.label}</span>}
                  <span className="text-sm text-slate-300" aria-label={`${s.stars} stars`}>{'★'.repeat(s.stars)}</span>
                </li>
              ))}
            </EvidenceList>
            <EvidenceList title="What the course checks revealed" empty="No misconceptions picked up on this concept.">
              {ev.misconceptions.map((m) => (
                <li key={m.key}>
                  <span className="text-slate-100">“{m.idea}”</span>{' '}
                  <span className="text-sm text-slate-400">· chosen {m.times === 1 ? 'once' : `${m.times} times`} in {m.href ? <Link href={m.href} className="text-cyan-200 underline-offset-2 hover:underline">{m.session}</Link> : m.session}</span>
                </li>
              ))}
            </EvidenceList>
          </div>
        )}
        <p className="mt-5 text-xs text-slate-400">Counts only: the class never receives a child’s typed answers. Evidence is from this child’s own device, synced when they play.</p>
      </div>
    </div>
  )
}

function EvidenceList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-white">{title}</h4>
      {children.length === 0 ? <p className="mt-1 text-sm text-slate-400">{empty}</p> : <ul className="mt-2 space-y-1.5">{children}</ul>}
    </div>
  )
}

export default GradebookClient
