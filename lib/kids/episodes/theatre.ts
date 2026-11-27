// lib/kids/episodes/theatre.ts
//
// Episodes Theatre (roadmap #8): the 24 Piper-voiced 3D episodes of Level 1
// ("Lantern Hill") as a public cinema, each with "play this mission" below it.
// Server-safe catalogue built from the voicing manifest (audio-manifest.json,
// generate.py) and the Level 1 sessions; used by the Theatre shelf on
// /kids/stories and the episode pages /kids/stories/episodes/<sessionId>.

import manifest from './audio-manifest.json'
import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { planEpisode } from './plan'
import { normaliseSessionId, type EpisodeData } from './types'

interface ManifestShape {
  episodes: Record<string, EpisodeData>
}

export interface TheatreEpisode {
  sessionId: string
  number: number
  title: string
  sessionTitle: string
  /** What the child will be able to do after the session (curriculum objective). */
  objective: string
  /** Running time as the player plans it (voices, music, join-in pauses), rounded up to whole minutes. */
  minutes: number
  /** Cinema page for this episode. */
  href: string
  /** The course session the episode opens ("play this mission"). */
  missionHref: string
}

export const THEATRE_BASE = '/kids/stories/episodes'

const DATA: EpisodeData[] = Object.values((manifest as unknown as ManifestShape).episodes).sort((a, b) => a.number - b.number)

export const THEATRE_EPISODES: TheatreEpisode[] = DATA.map((e) => {
  const s = LEVEL1_SESSIONS.find((x) => x.id === e.sessionId)
  return {
    sessionId: e.sessionId,
    number: e.number,
    title: e.title,
    sessionTitle: e.sessionTitle,
    objective: s?.objective ?? '',
    minutes: Math.max(1, Math.ceil(planEpisode(e).duration / 60)),
    href: `${THEATRE_BASE}/${e.sessionId}`,
    missionHref: `/kids/course/1/${e.number}`,
  }
})

export function theatreEpisode(raw: string): { meta: TheatreEpisode; data: EpisodeData } | null {
  const id = normaliseSessionId(raw)
  if (!id) return null
  const i = THEATRE_EPISODES.findIndex((e) => e.sessionId === id)
  if (i < 0) return null
  return { meta: THEATRE_EPISODES[i], data: DATA[i] }
}

/** Character names for the transcript. */
export const THEATRE_NAMES: Record<string, string> = {
  narrator: 'Narrator',
  spark: 'Spark',
  amara: 'Amara',
  lucia: 'Nana Lucía',
  bolt: 'Bolt',
  myrobot: 'Your robot',
  noor: 'Noor',
  okafor: 'Mr Okafor',
  adaeze: 'Ms Adaeze',
  mei: 'Ms Mei',
  haruto: 'Mr Haruto',
  diego: 'Mr Diego',
  ingrid: 'Captain Ingrid',
}

export function speakerName(who: string, guestName?: string | null): string {
  if (who === 'guest') return (guestName ?? 'Guest').split(',')[0]
  return THEATRE_NAMES[who] ?? who
}
