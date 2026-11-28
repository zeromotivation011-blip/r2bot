'use client'

// components/kids/classroom/BandLockPanelClient.tsx
//
// Teacher: which age band children play at (roadmap #29). Two switches:
//   - the whole class plays at the class band (kids_classes.band_locked);
//   - one child plays at a band the teacher picks (kids_class_members.band_lock),
//     which wins over the class.
// In a mixed class (club, family, library — roadmap #84) there is no
// whole-class switch: each child keeps their own band, and the leader can still
// set one child's band.
// The child's device follows on its next sync (it opens R2BOT Kids, or a
// change is saved). Needs migration 0058: before it runs the panel says so and
// nothing else on the class page changes. A band is a range, never an age.

import { useState } from 'react'
import { BAND_ORDER, getBand, type BandId } from '@/lib/kids/bands'
import { effectiveBandLock, isBandId, type KidsClassSummary, type KidsMemberRow } from '@/lib/kids/classroom'
import { teacherFetch } from '@/lib/kids/classroom-api'

export interface BandLockPanelProps {
  classId: string
  cls: KidsClassSummary
  members: KidsMemberRow[]
  onClassLocked: (locked: boolean) => void
  onMemberLock: (memberId: string, band: BandId | null) => void
  /** Roadmap #84: a club, family or library class — each child keeps their own band. */
  mixed?: boolean
}

function bandLabel(id: BandId | null | undefined): string {
  const b = getBand(id ?? null)
  return b ? `${b.emoji} ${b.name} (${b.ages})` : 'Not chosen yet'
}

export function BandLockPanelClient({ classId, cls, members, onClassLocked, onMemberLock, mixed = false }: BandLockPanelProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const ready = cls.bandLockReady === true
  const locked = cls.bandLocked === true && !mixed
  const classBand = getBand(cls.band)

  async function setClassLock(next: boolean) {
    setBusy('class')
    setMsg(null)
    const r = await teacherFetch<{ bandLocked: boolean }>(`/api/kids/classroom/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'band-lock-class', locked: next }),
    })
    setBusy(null)
    if (r.kind === 'ok') {
      onClassLocked(r.data.bandLocked)
      setMsg(next ? `Everyone will play at ${bandLabel(cls.band)} from their next sync.` : 'Children can choose their own band again.')
    } else setMsg(r.kind === 'error' ? r.message : 'Could not save. Try again.')
  }

  async function setMemberLock(memberId: string, raw: string) {
    const band: BandId | null = isBandId(raw) ? raw : null
    setBusy(memberId)
    setMsg(null)
    const r = await teacherFetch<{ bandLock: BandId | null }>(`/api/kids/classroom/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'band-lock-member', memberId, band }),
    })
    setBusy(null)
    if (r.kind === 'ok') onMemberLock(memberId, band)
    else setMsg(r.kind === 'error' ? r.message : 'Could not save. Try again.')
  }

  return (
    <section aria-labelledby="band-h" className="rounded-[28px] border border-white/10 bg-[#111C32] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Age bands</p>
      <h2 id="band-h" className="font-display text-2xl font-bold text-white">Which band children play at</h2>
      <p className="mt-1 max-w-3xl text-[15px] text-slate-300">
        {mixed
          ? 'This is a mixed-age group: every child keeps the band they chose, and the roster shows it. You can still set the band for one child — say, a confident nine-year-old ready for Inventors. Their device switches the next time it syncs. A band is an age range, never an age or a birthday.'
          : 'Children choose a band when they start. You can set it for the whole class or for one child — a younger reader in an older class, or someone ready for more. Their device switches the next time it syncs. A band is an age range, never an age or a birthday.'}
      </p>

      {!ready ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-slate-300" role="status">
          Band settings are being switched on. Until then each child keeps the band they chose; everything else on this page works.
        </p>
      ) : (
        <>
          {!mixed && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] p-4">
            <button
              type="button"
              role="switch"
              aria-checked={locked}
              disabled={busy !== null}
              onClick={() => void setClassLock(!locked)}
              className={`inline-flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60 ${locked ? 'bg-amber-500 text-[#1A1103]' : 'border border-white/15 text-slate-100 hover:bg-white/5'}`}
            >
              <span aria-hidden className={`relative h-6 w-11 rounded-full ${locked ? 'bg-[#1A1103]/30' : 'bg-white/15'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] motion-reduce:transition-none ${locked ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
              Everyone plays at {classBand ? `${classBand.emoji} ${classBand.name}` : cls.band}
            </button>
            <p className="text-sm text-slate-400">{locked ? 'On: every child’s device switches to this band whenever it syncs.' : 'Off: each child chooses (or follows the band you set for them below).'}</p>
          </div>}

          {members.length > 0 && (
            <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10" aria-label={`Band for each child in ${cls.className}`}>
              {members.map((m) => {
                const target = effectiveBandLock(cls.band, locked, m.bandLock ?? null, mixed ? 'club' : 'school')
                const pending = target !== null && m.snapshot.band !== null && m.snapshot.band !== target
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{m.nickname}</p>
                      <p className="text-sm text-slate-300">
                        Playing at {bandLabel(m.snapshot.band)}
                        {pending && <span className="ml-2 text-xs text-amber-200">switches on next sync</span>}
                      </p>
                    </div>
                    <label className="sr-only" htmlFor={`band-${m.id}`}>Band for {m.nickname}</label>
                    <select
                      id={`band-${m.id}`}
                      value={m.bandLock ?? ''}
                      disabled={busy !== null}
                      onChange={(e) => void setMemberLock(m.id, e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#19263F] px-3 text-sm font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60 sm:w-auto"
                    >
                      <option value="">{locked ? `Follow the class (${classBand?.name ?? cls.band})` : 'Child chooses'}</option>
                      {BAND_ORDER.map((b) => (
                        <option key={b} value={b}>{bandLabel(b)}</option>
                      ))}
                    </select>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      {msg && <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-200" role="status">{msg}</p>}
    </section>
  )
}

export default BandLockPanelClient
