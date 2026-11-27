'use client'

// components/kids/portfolio/ClassCertificatesClient.tsx — a teacher prints a
// class set of certificates (roadmap #45): pick any certificate (course level,
// World, milestone, or "taking part"), type the school name and the signer,
// paste the children's first names (one per line) and get ONE PDF with a page
// per child. Names are checked like class nicknames (first name or made-up,
// no emails) and never leave the device. The teacher decides who has earned
// it: this tool cannot see the children's devices.
//
//   <ClassCertificatesClient worlds={…} initialNames={['Asha', 'Leo']} />

import { useId, useMemo, useState } from 'react'
import { checkNickname } from '@/lib/kids/classroom'
import { certificateCatalogue, type CertificateDef, type WorldInfo } from './certificates'

export const MAX_CLASS_NAMES = 60

const TAKING_PART: Pick<CertificateDef, 'id' | 'title' | 'earnedFor' | 'skills'> = {
  id: 'taking-part',
  title: 'Young Roboticist',
  earnedFor: 'taken part in R2BOT Kids robotics lessons with curiosity and care',
  skills: ['Asks questions about how robots work', 'Builds, tests and improves', 'Works safely with others'],
}

export interface ClassCertificatesProps {
  worlds: WorldInfo[]
  initialNames?: string[]
}

const field =
  'mt-1.5 min-h-[48px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-[17px] text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40'
const label = 'block font-display text-[17px] font-bold text-[#EEF2F8]'

export default function ClassCertificatesClient({ worlds, initialNames = [] }: ClassCertificatesProps) {
  const catalogue = useMemo(() => certificateCatalogue(worlds), [worlds])
  const [certId, setCertId] = useState('taking-part')
  const [school, setSchool] = useState('')
  const [signer, setSigner] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [names, setNames] = useState(initialNames.join('\n'))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ids = { cert: useId(), school: useId(), signer: useId(), date: useId(), names: useId() }

  const parsed = useMemo(() => {
    const lines = names.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const ok: string[] = []
    const bad: { line: string; why: string }[] = []
    for (const l of lines) {
      const c = checkNickname(l)
      if (c.ok) ok.push(c.nickname)
      else bad.push({ line: l, why: c.error })
    }
    return { ok: [...new Set(ok)], bad }
  }, [names])

  const cert = certId === 'taking-part' ? TAKING_PART : catalogue.find((c) => c.id === certId) ?? TAKING_PART

  async function make(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (!parsed.ok.length) return setError('Add at least one name, one per line.')
    if (parsed.ok.length > MAX_CLASS_NAMES) return setError(`At most ${MAX_CLASS_NAMES} names in one set — make two sets for a bigger group.`)
    if (parsed.bad.length) return setError('Some lines are not first names. Fix or remove them first (see the list below the box).')
    if (school.trim().length > 60 || signer.trim().length > 60) return setError('School and signer names: 60 letters at most.')
    setError(null)
    setBusy(true)
    try {
      const { downloadClassCertificates } = await import('./certificate-pdf')
      const kicker = certId.startsWith('level-') ? 'Certificate of achievement' : certId.startsWith('world-') ? 'World certificate' : certId === 'taking-part' ? 'Certificate of taking part' : 'Milestone certificate'
      const [y, m, d] = date.split('-').map(Number)
      await downloadClassCertificates({
        names: parsed.ok,
        title: cert.title,
        kicker,
        earnedFor: cert.earnedFor,
        skills: cert.skills,
        date: y && m && d ? new Date(y, m - 1, d) : new Date(),
        school: school.trim() || undefined,
        signer: signer.trim() || undefined,
      })
      setStatus(`Made ${parsed.ok.length} certificate${parsed.ok.length === 1 ? '' : 's'} in one PDF.`)
    } catch {
      setError('The PDF could not be made in this browser. Try another browser or fewer names.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={make} noValidate className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={ids.cert} className={label}>
            Certificate
          </label>
          <select id={ids.cert} value={certId} onChange={(e) => setCertId(e.target.value)} className={field}>
            <option value="taking-part">Taking part: {TAKING_PART.title}</option>
            <optgroup label="Course levels">
              {catalogue.filter((c) => c.group === 'level').map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </optgroup>
            <optgroup label="Worlds">
              {catalogue.filter((c) => c.group === 'world').map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </optgroup>
            <optgroup label="Milestones">
              {catalogue.filter((c) => c.group === 'milestone' && !c.liveSkills).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </optgroup>
          </select>
          <p className="mt-1 text-[14px] text-[#A7B0C0]">
            For having {cert.earnedFor}. {cert.skills.length > 0 && <>Skills printed: {cert.skills.join(' · ')}.</>}
          </p>
        </div>
        <div>
          <label htmlFor={ids.school} className={label}>
            School name
          </label>
          <input id={ids.school} value={school} onChange={(e) => setSchool(e.target.value)} maxLength={60} autoComplete="organization" placeholder="e.g. Hillside Primary School" className={field} />
        </div>
        <div>
          <label htmlFor={ids.signer} className={label}>
            Signed by
          </label>
          <input id={ids.signer} value={signer} onChange={(e) => setSigner(e.target.value)} maxLength={60} autoComplete="off" placeholder="e.g. Ms Okafor, Class teacher" className={field} />
          <p className="mt-1 text-[13px] text-[#A7B0C0]">Printed under the signature line; sign each one by hand too if you like.</p>
        </div>
        <div>
          <label htmlFor={ids.date} className={label}>
            Date
          </label>
          <input id={ids.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={ids.names} className={label}>
            Children’s first names, one per line
          </label>
          <textarea
            id={ids.names}
            value={names}
            onChange={(e) => setNames(e.target.value)}
            rows={8}
            autoComplete="off"
            placeholder={'Asha\nLeo\nMei'}
            className={`${field} min-h-[180px] py-2`}
          />
          <p className="mt-1 text-[14px] text-[#A7B0C0]" aria-live="polite">
            {parsed.ok.length} name{parsed.ok.length === 1 ? '' : 's'} ready{parsed.bad.length ? `, ${parsed.bad.length} to fix` : ''}. First names or class nicknames only: no surnames, emails or numbers.
          </p>
          {parsed.bad.length > 0 && (
            <ul className="mt-2 space-y-1 text-[14px] text-amber-200">
              {parsed.bad.slice(0, 8).map((b) => (
                <li key={b.line}>
                  “{b.line}”: {b.why}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60"
      >
        {busy ? 'Making the PDF…' : 'Make the class set (PDF)'}
      </button>
      <div aria-live="polite" className="min-h-[26px]">
        {error && (
          <p role="alert" className="mt-2 font-semibold text-red-200">
            {error}
          </p>
        )}
        {status && !error && <p className="mt-2 font-semibold text-emerald-200">{status}</p>}
      </div>
    </form>
  )
}
