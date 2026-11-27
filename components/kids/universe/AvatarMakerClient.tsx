'use client'

// components/kids/universe/AvatarMakerClient.tsx — "Draw me" (roadmap #87).
// A child builds an avatar that looks like them: seven skin tones, eight hair
// types, seven hair colours, a headscarf, turban/patka or kippah, glasses,
// hearing aids, a wheelchair, a bionic hand. No boy/girl question and no
// gendered defaults. The result is an avatar id ("me-…", encodeMeLook) saved
// through the same `progress.avatar` as the robot avatars. No photo, no upload,
// nothing leaves the device.

import type React from 'react'
import { playSound } from '@/lib/kids-audio'
import {
  Avatar,
  DEFAULT_ME_LOOK,
  ME_COVERS,
  ME_HAIR,
  ME_HAIR_COLOURS,
  ME_SKINS,
  decodeMeLook,
  encodeMeLook,
  isMeAvatar,
  type MeLook,
} from './avatars'

const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-[14px] font-semibold text-[#EEF2F8]">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

export interface AvatarMakerProps {
  /** The current avatar id (any kind). A robot id starts the maker from the neutral default. */
  value: string
  /** Outfit colour (the avatar colour the child picked). */
  colour: string
  onChange: (id: string) => void
}

export default function AvatarMakerClient({ value, colour, onChange }: AvatarMakerProps) {
  const look: MeLook = isMeAvatar(value) ? decodeMeLook(value) : DEFAULT_ME_LOOK
  const set = (patch: Partial<MeLook>) => {
    playSound('click')
    onChange(encodeMeLook({ ...look, ...patch }))
  }
  const chip = (on: boolean) =>
    `min-h-[44px] rounded-2xl border-2 border-solid px-3 text-[15px] font-semibold transition active:scale-95 ${ring} ${
      on ? 'border-amber-400 bg-amber-500/15 text-[#EEF2F8]' : 'border-white/10 bg-white/[0.04] text-[#A7B0C0] hover:border-white/30'
    }`
  const swatch = (on: boolean) => `grid h-12 w-12 place-items-center rounded-full border-2 border-solid transition active:scale-90 ${ring} ${on ? 'border-white' : 'border-transparent'}`
  const hidesHair = look.cover === 'scarf' || look.cover === 'turban'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <Row label="Skin tone">
        {ME_SKINS.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={look.skin === s.id} aria-label={s.name} className={swatch(look.skin === s.id)} onClick={() => set({ skin: s.id })}>
            <span className="block h-9 w-9 rounded-full" style={{ background: s.value }} />
          </button>
        ))}
      </Row>
      <Row label="Head covering">
        {ME_COVERS.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={look.cover === c.id} className={chip(look.cover === c.id)} onClick={() => set({ cover: c.id })}>
            {c.id === 'none' ? 'None' : c.name}
          </button>
        ))}
      </Row>
      {!hidesHair && (
        <>
          <Row label="Hair">
            {ME_HAIR.map((h) => {
              const on = look.hair === h.id
              return (
                <button key={h.id} type="button" role="radio" aria-checked={on} aria-label={h.name} className={`${chip(on)} flex items-center gap-1.5 pl-1`} onClick={() => set({ hair: h.id })}>
                  <Avatar id={encodeMeLook({ ...look, hair: h.id })} color={colour} size={34} />
                  <span>{h.name}</span>
                </button>
              )
            })}
          </Row>
          <Row label="Hair colour">
            {ME_HAIR_COLOURS.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={look.hairColour === c.id} aria-label={c.name} className={swatch(look.hairColour === c.id)} onClick={() => set({ hairColour: c.id })}>
                <span className="block h-9 w-9 rounded-full" style={{ background: c.value }} />
              </button>
            ))}
          </Row>
        </>
      )}
      <div className="mt-3">
        <p className="text-[14px] font-semibold text-[#EEF2F8]">Add</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(
            [
              ['glasses', 'Glasses'],
              ['hearingAid', 'Hearing aids'],
              ['wheelchair', 'Wheelchair'],
              ['bionicHand', 'Bionic hand'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={look[k]} className={chip(look[k])} onClick={() => set({ [k]: !look[k] } as Partial<MeLook>)}>
              {look[k] ? '✓ ' : '+ '}
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-[#6E7888]">Your drawing stays on this device. No photo needed, ever.</p>
    </div>
  )
}
