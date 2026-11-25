// lib/kids/stories/index.ts
// The Story Theatre catalogue: every episode, lookups, the transcript and a
// running-time estimate. Safe to import from server and client code.

import { BAND_ORDER, type BandId } from '../bands'
import { CAST } from './cast'
import { sparkGetsLost, whatMakesARobot } from './episodes/explorers'
import { loopDeLoopGarden, robotThatCouldntSee } from './episodes/builders'
import { trafficLightRobot, wobblyBot } from './episodes/inventors'
import { lineFollowerRace, roverOnMars } from './episodes/engineers'
import type { Beat, Episode, TranscriptLine } from './types'
import { lineMs } from './timing'

export type { Episode } from './types'

/** In watching order: by band, then by order within the band. */
export const EPISODES: Episode[] = [
  whatMakesARobot,
  sparkGetsLost,
  robotThatCouldntSee,
  loopDeLoopGarden,
  trafficLightRobot,
  wobblyBot,
  lineFollowerRace,
  roverOnMars,
].sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band) || a.order - b.order)

export function getEpisode(slug: string): Episode | undefined {
  return EPISODES.find((e) => e.slug === slug)
}

export function episodesForBand(band: BandId): Episode[] {
  return EPISODES.filter((e) => e.band === band)
}

/** The episode after this one, wrapping to the first. */
export function nextEpisode(slug: string): Episode {
  const i = EPISODES.findIndex((e) => e.slug === slug)
  return EPISODES[(i + 1) % EPISODES.length]
}

// ─── Timing ────────────────────────────────────────────────────────────────
// lineMs lives in ./timing so the player can use it without importing the
// whole catalogue; re-exported here for everyone else.

export { lineMs }

function beatMs(b: Beat): number {
  switch (b.kind) {
    case 'say':
    case 'narrate':
      return lineMs(b.text) + 250
    case 'move':
      return b.wait === false ? 0 : b.ms ?? (b.motion === 'teleport' ? 0 : 1200)
    case 'act':
      return 900
    case 'camera':
      return b.wait === false ? 0 : b.ms ?? 900
    case 'pause':
      return b.ms
    case 'choice': {
      // Prompt + a child thinking + the right answer's beats.
      const good = b.options.find((o) => o.correct)
      return lineMs(b.prompt) + 9000 + (good ? good.beats.reduce((t, x) => t + beatMs(x), 0) : 0)
    }
    case 'prop':
      return 500
    default:
      return 250
  }
}

const SCENE_CHANGE_MS = 1800
const QUIZ_MS = 3 * 15000

export function episodeSeconds(ep: Episode): number {
  const ms = ep.scenes.reduce(
    (t, s) => t + SCENE_CHANGE_MS + s.beats.reduce((u, b) => u + beatMs(b), 0),
    0,
  )
  return Math.round((ms + QUIZ_MS) / 1000)
}

export function episodeMinutes(ep: Episode): number {
  return Math.max(1, Math.round(episodeSeconds(ep) / 60))
}

// ─── Transcript ────────────────────────────────────────────────────────────

function beatLines(b: Beat, out: TranscriptLine[]) {
  if (b.kind === 'say') out.push({ type: 'line', speaker: CAST[b.who].name, text: b.text })
  else if (b.kind === 'narrate') out.push({ type: 'line', speaker: CAST.narrator.name, text: b.text })
  else if (b.kind === 'choice') {
    out.push({ type: 'choice', speaker: CAST[b.who].name, text: b.prompt })
    for (const o of b.options) out.push({ type: 'option', speaker: '', text: o.label, correct: o.correct })
    const good = b.options.find((o) => o.correct)
    good?.beats.forEach((x) => beatLines(x, out))
  }
}

/** The whole episode as text, following the right answer at each choice. */
export function transcript(ep: Episode): TranscriptLine[] {
  const out: TranscriptLine[] = []
  for (const s of ep.scenes) {
    out.push({ type: 'scene', speaker: '', text: s.title })
    s.beats.forEach((b) => beatLines(b, out))
  }
  return out
}

export function wordCount(ep: Episode): number {
  return transcript(ep).reduce((n, l) => n + (l.type === 'scene' ? 0 : l.text.split(/\s+/).length), 0)
}
