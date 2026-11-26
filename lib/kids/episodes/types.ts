// lib/kids/episodes/types.ts
// The shape of a voiced episode, as written by scripts/kids-voices/generate.py
// into public/kids/audio/l1/<sessionId>/episode.json (fetched by the player)
// and lib/kids/episodes/audio-manifest.json (the full index).
// Pure types: safe on server and client.

import type { CharacterId } from '../curriculum/types'

/** [word, startSec, endSec] — estimated, for karaoke captions. */
export type WordTiming = [string, number, number]

export interface VoicedClip {
  /** Public URL of the Opus .ogg (an AAC .m4a twin sits beside it). */
  file: string
  /** Seconds (ffprobe). */
  dur: number
  /** Loudness at 30 fps, one base-36 digit per frame (0 silent … z loudest). */
  env: string
  words: WordTiming[]
}

export interface VoicedText extends VoicedClip {
  text: string
}

export interface EpisodeLineData extends VoicedClip {
  /** Index through the whole episode (= the .ogg file name). */
  i: number
  who: CharacterId
  guestName: string | null
  text: string
  direction: string | null
}

export interface EpisodeSceneData {
  setting: string
  action: string
  seconds: number
  lines: EpisodeLineData[]
}

export interface EpisodeData {
  sessionId: string
  number: number
  sessionTitle: string
  title: string
  titleCard: VoicedText
  previously: VoicedText | null
  scenes: EpisodeSceneData[]
  cliffhanger: VoicedText
  voicedSec?: number
}

export const ENV_FPS = 30

/** Normalise "1", "s1", "L1-S01", "l1-s1" → "L1-S01" (Level 1 only for now). */
export function normaliseSessionId(raw: string): string | null {
  const s = decodeURIComponent(raw).trim().toUpperCase()
  const m = /^(?:L1-?)?S?0*(\d{1,2})$/.exec(s)
  if (!m) return null
  const n = Number(m[1])
  if (n < 1 || n > 24) return null
  return `L1-S${String(n).padStart(2, '0')}`
}

export function episodeUrl(sessionId: string): string {
  return `/kids/audio/l1/${sessionId}/episode.json`
}

/** Loudness 0..1 of a clip at time t (seconds into the clip). */
export function envelopeAt(env: string, t: number): number {
  if (t < 0) return 0
  const f = t * ENV_FPS
  const i = Math.floor(f)
  if (i >= env.length) return 0
  const a = parseInt(env[i], 36) / 35
  const b = i + 1 < env.length ? parseInt(env[i + 1], 36) / 35 : 0
  const k = f - i
  return a + (b - a) * k
}
