'use client'

// components/kids/profiles/NewProfileClient.tsx — make a profile on this device.
// Four short steps, no personal data: a nickname (checkNickname: no full
// names, emails or numbers), an age that only picks the band (the age itself is
// not kept), a picture, and — for Explorers (5–7) — a 3-picture password.
// Older children may add the picture password too, or skip it.

import { useId, useState } from 'react'
import { checkNickname } from '@/lib/kids/classroom'
import { bandForAge, type BandId } from '@/lib/kids/bands'
import { PROFILE_PICTURES, createProfile, type KidsProfile } from '@/lib/kids/profiles'
import { playSound } from '@/lib/kids-audio'
import PicturePasswordClient from './PicturePasswordClient'

export interface NewProfileProps {
  onCreated: (p: KidsProfile) => void
  onCancel: () => void
  /** Heading, e.g. "I'm new here" or "Add a child". */
  title?: string
}

type Step = 'name' | 'age' | 'picture' | 'password' | 'optional'

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const AGES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

export default function NewProfileClient({ onCreated, onCancel, title }: NewProfileProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [band, setBand] = useState<BandId | null>(null)
  const [picture, setPicture] = useState<string>(PROFILE_PICTURES[0])
  const [error, setError] = useState('')
  const nameId = useId()
  const errId = useId()

  const make = (password?: string[]) => {
    const nick = checkNickname(name)
    if (!nick.ok) {
      setError(nick.error)
      setStep('name')
      return
    }
    const r = createProfile({ nickname: nick.nickname, band, picture, password })
    if (!r.ok) {
      setError(r.reason === 'full' ? 'This device has as many profiles as it can hold. A grown-up can remove one in the parent hub.' : 'Could not save on this device. Try again.')
      return
    }
    playSound('unlock')
    onCreated(r.profile)
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-center text-sm font-bold uppercase tracking-wider text-amber-300">{title ?? 'New explorer'}</p>

      {step === 'name' && (
        <form
          className="mt-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            const nick = checkNickname(name)
            if (!nick.ok) return setError(nick.error)
            setError('')
            setName(nick.nickname)
            setStep('age')
          }}
        >
          <label htmlFor={nameId} className="block text-center font-display text-2xl font-bold text-[#EEF2F8]">What should we call you?</label>
          <p className="mt-1 text-center text-base text-[#A7B0C0]">Your first name or a made-up robot name. Not your full name.</p>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoComplete="off"
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
            placeholder="Asha, Leo, RoboMax…"
            className="mt-4 w-full rounded-2xl border-2 border-white/20 bg-[#0A1120] px-4 py-4 text-2xl font-bold text-white placeholder:text-[#6E7888] focus:border-amber-400 focus:outline-none"
          />
          {error && <p id={errId} role="alert" className="mt-3 rounded-2xl bg-rose-500/15 p-3 text-base font-semibold text-rose-200">{error}</p>}
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={onCancel} className={`min-h-[52px] flex-1 rounded-2xl border border-white/15 bg-[#19263F] font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}>Back</button>
            <button type="submit" className={`min-h-[52px] flex-[2] rounded-2xl bg-amber-500 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}>Next</button>
          </div>
        </form>
      )}

      {step === 'age' && (
        <div className="mt-3 text-center">
          <p className="font-display text-2xl font-bold text-[#EEF2F8]">How old are you, {name}?</p>
          <p className="mt-1 text-base text-[#A7B0C0]">So R2BOT picks the right level. We only keep the level, not your age.</p>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {AGES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setBand(bandForAge(a).id)
                  setStep('picture')
                }}
                className={`min-h-[56px] rounded-2xl border border-white/10 bg-[#111C32] font-display text-2xl font-bold text-[#EEF2F8] hover:border-amber-400/60 active:scale-[.97] motion-reduce:transform-none ${focus}`}
              >
                {a}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep('name')} className={`mt-4 min-h-[48px] rounded-2xl px-5 font-bold text-[#A7B0C0] hover:text-white ${focus}`}>Back</button>
        </div>
      )}

      {step === 'picture' && (
        <div className="mt-3 text-center">
          <p className="font-display text-2xl font-bold text-[#EEF2F8]">Pick your picture</p>
          <p className="mt-1 text-base text-[#A7B0C0]">It goes on your card, so you can find yourself fast.</p>
          <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Your picture">
            {PROFILE_PICTURES.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={picture === e}
                onClick={() => setPicture(e)}
                className={`grid min-h-[64px] place-items-center rounded-2xl border-2 text-4xl ${picture === e ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-[#111C32] hover:border-white/30'} ${focus}`}
              >
                <span aria-hidden>{e}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => setStep('age')} className={`min-h-[52px] flex-1 rounded-2xl border border-white/15 bg-[#19263F] font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}>Back</button>
            <button
              type="button"
              onClick={() => setStep(band === 'explorers' ? 'password' : 'optional')}
              className={`min-h-[52px] flex-[2] rounded-2xl bg-amber-500 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 'password' && (
        <div className="mt-3">
          <PicturePasswordClient mode="set" onDone={(seq) => make(seq)} onCancel={() => setStep('picture')} />
          {error && <p role="alert" className="mt-3 rounded-2xl bg-rose-500/15 p-3 text-center text-base font-semibold text-rose-200">{error}</p>}
        </div>
      )}

      {step === 'optional' && (
        <div className="mt-3 text-center">
          <p className="font-display text-2xl font-bold text-[#EEF2F8]">Add a secret picture key?</p>
          <p className="mt-1 text-base text-[#A7B0C0]">Then nobody else on this device can open your robot by accident. You can skip this.</p>
          <div className="mt-5 grid gap-3">
            <button type="button" onClick={() => setStep('password')} className={`min-h-[52px] rounded-2xl border border-cyan-400/40 bg-cyan-400/10 font-bold text-cyan-100 hover:bg-cyan-400/20 ${focus}`}>Yes, pick 3 pictures</button>
            <button type="button" onClick={() => make()} className={`min-h-[52px] rounded-2xl bg-amber-500 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}>Skip: just tap my name</button>
          </div>
          {error && <p role="alert" className="mt-3 rounded-2xl bg-rose-500/15 p-3 text-base font-semibold text-rose-200">{error}</p>}
        </div>
      )}
    </div>
  )
}
