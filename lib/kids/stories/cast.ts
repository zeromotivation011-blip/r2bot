// lib/kids/stories/cast.ts
// Who is who in the Story Theatre. All original characters.

import type { SpeakerId } from './types'

export interface CastInfo {
  id: SpeakerId
  name: string
  /** One line for the cast list on the episodes page. */
  bio: string
  /** Caption colour (Tailwind text class). */
  captionClass: string
  /** Speech voice: pitch 0–2, rate 0.1–10. Different per character so kids can tell them apart. */
  voice: { pitch: number; rate: number; prefer: 'female' | 'male' | 'any' }
}

export const CAST: Record<SpeakerId, CastInfo> = {
  spark: {
    id: 'spark',
    name: 'Spark',
    bio: 'A small orange robot who hovers, asks a lot of questions and is still learning how the world works.',
    captionClass: 'text-orange-300',
    voice: { pitch: 1.6, rate: 1.02, prefer: 'any' },
  },
  amara: {
    id: 'amara',
    name: 'Amara',
    bio: 'A nine-year-old inventor with goggles on her head and a screwdriver in every pocket. Builds first, asks questions second.',
    captionClass: 'text-teal-300',
    voice: { pitch: 1.3, rate: 1.0, prefer: 'female' },
  },
  lucia: {
    id: 'lucia',
    name: 'Nana Lucía',
    bio: 'Amara’s grandmother, a retired engineer who helped build robots for factories and space. Patient, funny, and never gives the answer away too soon.',
    captionClass: 'text-fuchsia-300',
    voice: { pitch: 0.9, rate: 0.88, prefer: 'female' },
  },
  bolt: {
    id: 'bolt',
    name: 'Bolt',
    bio: 'A robot puppy with a wiggly antenna tail. Says “beep-woof”. Chases anything that moves.',
    captionClass: 'text-sky-300',
    voice: { pitch: 1.95, rate: 1.2, prefer: 'any' },
  },
  zippy: {
    id: 'zippy',
    name: 'Zippy',
    bio: 'A little wheeled robot car Amara builds for races and toy towns.',
    captionClass: 'text-lime-300',
    voice: { pitch: 1.4, rate: 1.1, prefer: 'any' },
  },
  rover: {
    id: 'rover',
    name: 'Rover',
    bio: 'A six-wheeled exploration rover working on Mars.',
    captionClass: 'text-amber-300',
    voice: { pitch: 0.8, rate: 0.95, prefer: 'male' },
  },
  narrator: {
    id: 'narrator',
    name: 'Narrator',
    bio: 'Tells the story between the scenes.',
    captionClass: 'text-white',
    voice: { pitch: 1.0, rate: 0.92, prefer: 'any' },
  },
}

/** The characters shown in the cast list (the machines are guest stars). */
export const MAIN_CAST: SpeakerId[] = ['spark', 'amara', 'lucia', 'bolt']
