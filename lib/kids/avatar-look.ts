// lib/kids/avatar-look.ts — the "me" avatar a child draws of themselves
// (roadmap #87): skin tones, hair types and colours, head coverings (headscarf,
// turban/patka, kippah), glasses, hearing aids, a wheelchair, a bionic hand.
// Stored as an avatar id string ("me-…") in progress.avatar.id, so the progress
// store (40-char cap), backup code and class sync need no change. Drawn by
// components/kids/universe/avatars.tsx through MakerAvatar. Also the teen
// default swap (displayAvatarId, roadmap #83).
//
// Pure: no React. Checked by lib/kids/inclusion/verify.ts.

import type { HairStyle, MakerLook } from './makers/makers'
import type { BandId } from './bands'

/** Darken/lighten a hex colour by `amt` (-1..1). */
function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Skin tones, light to deep. Seven, so nobody sits at the end of a short scale. */
export const ME_SKINS: { id: string; value: string; name: string }[] = [
  { id: '1', value: '#F8DCC6', name: 'Skin tone 1, lightest' },
  { id: '2', value: '#EDC09A', name: 'Skin tone 2' },
  { id: '3', value: '#D29A6C', name: 'Skin tone 3' },
  { id: '4', value: '#B07445', name: 'Skin tone 4' },
  { id: '5', value: '#8A5530', name: 'Skin tone 5' },
  { id: '6', value: '#61381F', name: 'Skin tone 6' },
  { id: '7', value: '#3F2416', name: 'Skin tone 7, deepest' },
]

export const ME_HAIR: { id: HairStyle; name: string }[] = [
  { id: 'short', name: 'Short' },
  { id: 'curly', name: 'Curly' },
  { id: 'afro', name: 'Afro' },
  { id: 'braids', name: 'Braids' },
  { id: 'long', name: 'Long' },
  { id: 'ponytail', name: 'Ponytail' },
  { id: 'bun', name: 'Bun' },
  { id: 'none', name: 'Shaved or none' },
]

export const ME_HAIR_COLOURS: { id: string; value: string; name: string }[] = [
  { id: '1', value: '#16110D', name: 'Black' },
  { id: '2', value: '#4A2C1A', name: 'Dark brown' },
  { id: '3', value: '#8A5A33', name: 'Brown' },
  { id: '4', value: '#B5651D', name: 'Auburn' },
  { id: '5', value: '#E2C275', name: 'Blond' },
  { id: '6', value: '#C9CED6', name: 'Grey' },
  { id: '7', value: '#00B8D4', name: 'Dyed cyan' },
]

export type MeCover = 'none' | 'scarf' | 'turban' | 'kippah'
export const ME_COVERS: { id: MeCover; name: string }[] = [
  { id: 'none', name: 'No head covering' },
  { id: 'scarf', name: 'Headscarf' },
  { id: 'turban', name: 'Turban or patka' },
  { id: 'kippah', name: 'Kippah' },
]

export interface MeLook {
  skin: string
  hair: HairStyle
  hairColour: string
  cover: MeCover
  glasses: boolean
  hearingAid: boolean
  wheelchair: boolean
  bionicHand: boolean
}

/** A neutral starting point (no gendered defaults: the middle tone, short curly hair, nothing else). */
export const DEFAULT_ME_LOOK: MeLook = { skin: '4', hair: 'curly', hairColour: '1', cover: 'none', glasses: false, hearingAid: false, wheelchair: false, bionicHand: false }

const ME_PREFIX = 'me-'

export function isMeAvatar(id: string | undefined | null): boolean {
  return typeof id === 'string' && id.startsWith(ME_PREFIX)
}

/** "me-<skin>-<hair>-<hairColour>-<cover>-<flags>", ≤ 40 chars (the progress store's cap). Flags: g a w b, or 0. */
export function encodeMeLook(l: MeLook): string {
  const flags = `${l.glasses ? 'g' : ''}${l.hearingAid ? 'a' : ''}${l.wheelchair ? 'w' : ''}${l.bionicHand ? 'b' : ''}` || '0'
  return `${ME_PREFIX}${l.skin}-${l.hair}-${l.hairColour}-${l.cover}-${flags}`
}

/** Never throws: anything unknown falls back to the default for that part. */
export function decodeMeLook(id: string): MeLook {
  const parts = id.slice(ME_PREFIX.length).split('-')
  const [skin, hair, hc, cover, flags = ''] = parts
  return {
    skin: ME_SKINS.some((x) => x.id === skin) ? skin : DEFAULT_ME_LOOK.skin,
    hair: ME_HAIR.some((x) => x.id === hair) ? (hair as HairStyle) : DEFAULT_ME_LOOK.hair,
    hairColour: ME_HAIR_COLOURS.some((x) => x.id === hc) ? hc : DEFAULT_ME_LOOK.hairColour,
    cover: ME_COVERS.some((x) => x.id === cover) ? (cover as MeCover) : 'none',
    glasses: flags.includes('g'),
    hearingAid: flags.includes('a'),
    wheelchair: flags.includes('w'),
    bionicHand: flags.includes('b'),
  }
}

/** A head covering that hides the hair draws no hair under it. */
export function meLookToMaker(l: MeLook, colour: string): MakerLook {
  const hides = l.cover === 'scarf' || l.cover === 'turban'
  const coverColour = shade(colour, -0.25)
  return {
    skin: ME_SKINS.find((x) => x.id === l.skin)?.value ?? ME_SKINS[3].value,
    hair: hides ? 'none' : l.hair,
    hairColor: ME_HAIR_COLOURS.find((x) => x.id === l.hairColour)?.value ?? ME_HAIR_COLOURS[0].value,
    headscarf: l.cover === 'scarf' ? coverColour : undefined,
    turban: l.cover === 'turban' ? coverColour : undefined,
    kippah: l.cover === 'kippah' ? coverColour : undefined,
    glasses: l.glasses || undefined,
    hearingAid: l.hearingAid || undefined,
    wheelchair: l.wheelchair || undefined,
    bionicHand: l.bionicHand || undefined,
    outfit: colour,
  }
}

/** Words for a "me" avatar, for its accessible name. */
export function describeMeLook(l: MeLook): string {
  const bits = [
    ME_SKINS.find((x) => x.id === l.skin)?.name.toLowerCase(),
    l.cover === 'scarf' || l.cover === 'turban' ? undefined : `${ME_HAIR_COLOURS.find((x) => x.id === l.hairColour)?.name.toLowerCase()} ${ME_HAIR.find((x) => x.id === l.hair)?.name.toLowerCase()} hair`,
    l.cover !== 'none' ? ME_COVERS.find((x) => x.id === l.cover)?.name.toLowerCase() : undefined,
    l.glasses ? 'glasses' : undefined,
    l.hearingAid ? 'hearing aids' : undefined,
    l.wheelchair ? 'wheelchair' : undefined,
    l.bionicHand ? 'bionic hand' : undefined,
  ].filter(Boolean)
  return `Me: ${bits.join(', ')}`
}

/** The store's untouched default (lib/kids-progress.ts DEFAULT_PROGRESS.avatar). */
const STORE_DEFAULT = { id: 'astro', color: '#F59E0B' }

/**
 * The avatar to DRAW. A teen (Engineers) who never picked an avatar sees the
 * Lab badge instead of the cartoon astronaut (roadmap #83). A chosen avatar is
 * always shown as chosen.
 */
export function displayAvatarId(avatar: { id: string; color: string } | undefined | null, band: BandId | null | undefined): string {
  const id = avatar?.id ?? STORE_DEFAULT.id
  const untouched = id === STORE_DEFAULT.id && (avatar?.color ?? STORE_DEFAULT.color).toLowerCase() === STORE_DEFAULT.color.toLowerCase()
  return band === 'engineers' && untouched ? 'lab' : id
}
