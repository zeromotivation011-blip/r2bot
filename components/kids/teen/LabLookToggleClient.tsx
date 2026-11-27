'use client'

// components/kids/teen/LabLookToggleClient.tsx — "How R2BOT looks" (roadmap #83).
// Three choices for the playing child: Automatic (Lab look for Engineers 14–17),
// R2BOT Lab, R2BOT Kids. Device-only, per child (lib/kids/teen.ts). For Settings
// and the Garage. Native radio buttons: keyboard and screen readers for free.

import { useId } from 'react'
import { playSound } from '@/lib/kids-audio'
import { setLookPref, useKidsLook, type KidsLookPref } from '@/lib/kids/teen'

const OPTIONS: { id: KidsLookPref; label: string; line: string }[] = [
  { id: 'auto', label: 'Automatic', line: 'R2BOT Lab for ages 14–17, R2BOT Kids for everyone younger.' },
  { id: 'lab', label: 'R2BOT Lab', line: 'Clean, technical look with spec-sheet words.' },
  { id: 'kids', label: 'R2BOT Kids', line: 'Bright and playful, with the Kids name.' },
]

export default function LabLookToggleClient() {
  const { pref, look } = useKidsLook()
  const name = useId()
  return (
    <fieldset className="rounded-[20px] border border-white/10 bg-[#111C32] p-4 sm:p-5">
      <legend className="px-1 font-display text-lg font-bold text-[#EEF2F8]">How R2BOT looks</legend>
      <p className="text-[15px] text-[#A7B0C0]">
        Now showing: <span className="font-semibold text-[#EEF2F8]">{look === 'lab' ? 'R2BOT Lab' : 'R2BOT Kids'}</span>. Saved on this device for whoever is playing.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <label
            key={o.id}
            className={`flex min-h-[56px] cursor-pointer gap-3 rounded-2xl border-2 p-3 transition focus-within:ring-4 focus-within:ring-amber-400/60 ${
              pref === o.id ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={pref === o.id}
              onChange={() => {
                playSound('click')
                setLookPref(o.id)
              }}
              className="mt-1 h-5 w-5 shrink-0 accent-amber-500"
            />
            <span>
              <span className="block font-display text-[16px] font-bold text-[#EEF2F8]">{o.label}</span>
              <span className="block text-[14px] leading-snug text-[#A7B0C0]">{o.line}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
