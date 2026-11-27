'use client'

// components/kids/portfolio/CertificatesClient.tsx — certificates for everything
// (roadmap #45) inside the portfolio: every course level, every World and every
// milestone (certificates.ts). Earned ones print as a PDF on the device (jsPDF,
// loaded on the click); the rest show how far the child has got, never a
// comparison with anyone else. The name typed here never leaves the device.

import { useId, useMemo, useState } from 'react'
import { checkNickname } from '@/lib/kids/classroom'
import { certificateCatalogue, isEarned, skillsFor, type CertEvidence, type CertGroup, type CertificateDef, type WorldInfo } from './certificates'

export interface CertificatesProps {
  evidence: CertEvidence
  worlds: WorldInfo[]
  defaultName: string
  robotName: string
  badges: number
}

const GROUPS: { id: CertGroup; title: string; kicker: string }[] = [
  { id: 'level', title: 'Course levels', kicker: 'Certificate of achievement' },
  { id: 'world', title: 'Worlds', kicker: 'World certificate' },
  { id: 'milestone', title: 'Milestones', kicker: 'Milestone certificate' },
]

export default function CertificatesClient({ evidence, worlds, defaultName, robotName, badges }: CertificatesProps) {
  const catalogue = useMemo(() => certificateCatalogue(worlds), [worlds])
  const [name, setName] = useState(defaultName)
  const [busy, setBusy] = useState<string | null>(null)
  const [made, setMade] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nameId = useId()
  const earnedCount = catalogue.filter((c) => isEarned(c, evidence)).length

  async function print(c: CertificateDef, kicker: string) {
    const check = checkNickname(name)
    if (!check.ok) {
      setError(check.error)
      document.getElementById(nameId)?.focus()
      return
    }
    setError(null)
    setBusy(c.id)
    try {
      if (c.level) {
        const [{ levelByNumber }, { downloadKidCertificate }] = await Promise.all([import('@/lib/kids/curriculum/levels'), import('@/lib/kids/teach/pdf')])
        const lvl = levelByNumber(c.level)
        await downloadKidCertificate({
          name: check.nickname,
          robotName,
          level: c.level,
          title: lvl.certificate.title.replace(/^R2BOT Kids\s*·\s*/, '') || lvl.name,
          wording: lvl.certificate.wording,
          sessions: evidence.sessions[c.level],
          badges,
          date: new Date(),
        })
      } else {
        const { downloadAchievementCertificate } = await import('./certificate-pdf')
        await downloadAchievementCertificate({ name: check.nickname, title: c.title, kicker, earnedFor: c.earnedFor, skills: skillsFor(c, evidence), date: new Date() })
      }
      setMade(c.id)
    } catch {
      setError('The certificate could not be made on this device. Ask a grown-up to try another browser.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-3">
      <div className="no-print rounded-[20px] border border-amber-400/40 bg-amber-500/[0.08] p-4">
        <label htmlFor={nameId} className="block font-display text-lg font-bold text-[#EEF2F8]">
          Name on your certificates
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="off"
          placeholder="Your explorer name"
          className="mt-1.5 min-h-[48px] w-full max-w-sm rounded-xl border border-white/15 bg-black/40 px-3 text-lg text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40"
        />
        <p className="mt-1 text-[13px] text-[#A7B0C0]">First name or a made-up name. It stays on this device. You have {earnedCount} certificate{earnedCount === 1 ? '' : 's'} ready.</p>
        <div aria-live="polite" className="min-h-[22px]">
          {error && (
            <p role="alert" className="mt-1 text-[15px] font-semibold text-red-200">
              {error}
            </p>
          )}
          {made && !error && <p className="mt-1 text-[15px] font-semibold text-emerald-200">Saved! Ask a grown-up to print it.</p>}
        </div>
      </div>

      {GROUPS.map((g) => {
        const list = catalogue.filter((c) => c.group === g.id)
        return (
          <div key={g.id} className={`mt-6 ${list.some((c) => isEarned(c, evidence)) ? '' : 'print:hidden'}`}>
            <h3 className="font-display text-xl font-bold text-[#EEF2F8]">{g.title}</h3>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => {
                const pr = c.progress(evidence)
                const earned = pr.have >= pr.need
                const skills = skillsFor(c, evidence)
                return (
                  <li
                    key={c.id}
                    className={`flex flex-col rounded-[20px] border p-4 ${earned ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/15 to-white/[0.03]' : 'border-white/[0.08] bg-white/[0.03] print:hidden'}`}
                  >
                    <p className="flex items-start gap-3">
                      <span aria-hidden className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl ${earned ? 'bg-amber-500' : 'bg-white/[0.06] grayscale'}`}>
                        {c.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-lg font-bold leading-snug text-[#EEF2F8]">{c.title}</span>
                        <span className="block text-[14px] text-[#A7B0C0]">For having {c.earnedFor}.</span>
                      </span>
                    </p>
                    {skills.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[14px] text-[#A7B0C0]" aria-label="Skills shown">
                        {skills.slice(0, 5).map((sk) => (
                          <li key={sk}>✓ {sk}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto pt-3">
                      {earned ? (
                        <button
                          type="button"
                          onClick={() => void print(c, g.kicker)}
                          disabled={busy !== null}
                          className="no-print inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-amber-500 px-4 font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60"
                        >
                          {busy === c.id ? 'Making it…' : made === c.id ? 'Download again' : 'Get my certificate'}
                        </button>
                      ) : (
                        <>
                          <p className="text-[13px] font-semibold text-[#A7B0C0]">
                            {pr.have} of {pr.need} — {pr.need - pr.have} to go
                          </p>
                          <div
                            className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"
                            role="progressbar"
                            aria-label={`${c.title} progress`}
                            aria-valuemin={0}
                            aria-valuemax={pr.need}
                            aria-valuenow={pr.have}
                          >
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.round((pr.have / pr.need) * 100)}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
