// lib/kids/teach/guides.ts
//
// SERVER ONLY (imports the full Level 1 curriculum and the activity list).
// Turns a curriculum session into a printable teacher's lesson plan: the
// 40-minute timing, the unplugged warm-up, what the children do on screen,
// discussion questions, misconceptions, differentiation, materials and the
// note for families — all from lib/kids/curriculum (teacherNotes + parent),
// never re-written by hand, so the guide and the session cannot drift apart.
//
// The returned TeacherGuide is plain data (a few KB): the page renders it on
// the server and hands the same object to the PDF button.

import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { levelByNumber } from '../curriculum/levels'
import type { ConceptId, Session } from '../curriculum/types'
import { ALL_ACTIVITIES } from '../activities/content'
import { orderActivities } from '../activities/progress'
import { TRACKS, type TrackId } from '../activities/types'
import { getPart } from '../robot-design'
import { activityHref } from './catalogue'

/** Last time the guides' wording or structure changed (for the sitemap's lastmod). */
export const TEACH_GUIDES_UPDATED = '2026-11-26'

export const CONCEPT_LABEL: Record<ConceptId, string> = {
  'sense-think-act': 'Sense, think, act',
  sequences: 'Sequences',
  decomposition: 'Breaking problems down',
  loops: 'Loops',
  debugging: 'Debugging',
  'events-timing': 'Events and timing',
  sensors: 'Sensors',
  conditions: 'Conditions (if)',
  variables: 'Variables',
  'feedback-control': 'Feedback control',
  physics: 'Forces and motion',
  autonomy: 'Autonomy',
  data: 'Data',
  'design-process': 'Engineering design',
  'safety-ethics': 'Safety and ethics',
  careers: 'Robotics careers',
}

const CONCEPT_TRACK: Record<ConceptId, TrackId> = {
  'sense-think-act': 'sensors',
  sequences: 'code',
  decomposition: 'code',
  loops: 'code',
  debugging: 'code',
  'events-timing': 'code',
  sensors: 'sensors',
  conditions: 'code',
  variables: 'code',
  'feedback-control': 'control',
  physics: 'mechanics',
  autonomy: 'ai',
  data: 'ai',
  'design-process': 'design',
  'safety-ethics': 'world',
  careers: 'world',
}

export interface GuideActivity {
  step: string
  title: string
  detail: string
}

export interface GuideExtension {
  id: string
  title: string
  track: string
  trackIcon: string
  href: string
}

export interface TeacherGuide {
  level: 1
  number: number
  id: string
  title: string
  objective: string
  kind: 'lesson' | 'project'
  durationMin: number
  act: { title: string; sessions: [number, number] } | null
  concepts: string[]
  objectives: { text: string; kidText: string; discussionOnly: boolean }[]
  timing: { minutes: number; activity: string }[]
  warmup: { title: string; minutes: number; steps: string[]; materials: string[] }
  activities: GuideActivity[]
  discussion: string[]
  misconceptions: { idea: string; correction: string }[]
  differentiation: { faster: string[]; slower: string[] }
  materials: string[]
  notes: string[]
  parent: { today: string; tryAtHome: string; askYourChild: string }
  extensions: GuideExtension[]
  /** The child's session page. */
  sessionHref: string
  /** This guide. */
  guideHref: string
  prev: { number: number; title: string } | null
  next: { number: number; title: string } | null
}

function partName(slot: string, id: string): string {
  const p = getPart(slot as Parameters<typeof getPart>[0], id)
  return p?.name ?? id
}

function materialsFor(s: Session): string[] {
  const out = new Set<string>()
  for (const m of s.teacher.unpluggedWarmup.materials) if (m && m.toLowerCase() !== 'none') out.add(m)
  out.add('A big screen with sound, for the episode (captions on)')
  out.add('One tablet or computer per pair, signed in to the class with its join code')
  if (s.kind === 'project') {
    out.add('Paper planning sheets and pencils (one per pair)')
    out.add('Sticky notes for “a star and a wish”')
  }
  return [...out]
}

function extensionsFor(s: Session): GuideExtension[] {
  const tracks: TrackId[] = []
  for (const c of s.concepts) {
    const t = CONCEPT_TRACK[c]
    if (!tracks.includes(t)) tracks.push(t)
  }
  if (tracks.length === 0) tracks.push('code')
  const out: GuideExtension[] = []
  const used = new Set<string>()
  for (let round = 0; out.length < 3 && round < 3; round++) {
    for (const t of tracks) {
      if (out.length >= 3) break
      const list = orderActivities(ALL_ACTIVITIES.filter((a) => a.band === 'explorers' && a.track === t))
      if (list.length === 0) continue
      // Walk through the track as the course goes on, so session 2 and 20 differ.
      const start = Math.floor(((s.number - 1) / 24) * list.length)
      for (let i = 0; i < list.length; i++) {
        const a = list[(start + round + i) % list.length]
        if (used.has(a.id)) continue
        used.add(a.id)
        const track = TRACKS.find((x) => x.id === a.track)
        out.push({ id: a.id, title: a.title, track: track?.name ?? a.track, trackIcon: track?.icon ?? '✨', href: activityHref(a.track, a.id) })
        break
      }
    }
  }
  return out
}

export function buildGuide(s: Session): TeacherGuide {
  const level = levelByNumber(1)
  const act = level.season.arc.find((a) => s.number >= a.sessions[0] && s.number <= a.sessions[1]) ?? null
  const idx = LEVEL1_SESSIONS.findIndex((x) => x.id === s.id)
  const prev = idx > 0 ? LEVEL1_SESSIONS[idx - 1] : null
  const next = idx >= 0 && idx < LEVEL1_SESSIONS.length - 1 ? LEVEL1_SESSIONS[idx + 1] : null

  const activities: GuideActivity[] = [
    {
      step: 'Watch',
      title: `Episode: ${s.episode.title}`,
      detail: `${s.episode.previously ? `${s.episode.previously} ` : ''}Ends with: ${s.episode.cliffhanger}`,
    },
    {
      step: 'Build',
      title: `${s.build.action === 'inspect' ? 'Look at' : s.build.action === 'swap' ? 'Swap in' : s.build.action === 'choose' ? 'Choose' : 'Add'} the ${partName(s.build.part.slot, s.build.part.id).toLowerCase()}`,
      detail: `${s.build.why} Try without it: ${s.build.tryWithout}`,
    },
    { step: 'Code', title: s.code.title, detail: s.code.mission },
    { step: 'Challenge', title: s.challenge.title, detail: `${s.challenge.mission} Two stars: ${s.challenge.stars.two} Three stars: ${s.challenge.stars.three}` },
    { step: 'Check', title: 'Three spoken questions', detail: s.quiz.map((q) => q.prompt).join(' · ') },
    { step: 'Badge', title: `${s.badge.icon} ${s.badge.name}`, detail: `Earned because ${s.badge.earnedFor.replace(/^you /i, 'the child ')}` },
  ]
  if (s.project) {
    activities.splice(1, 0, {
      step: 'Project',
      title: s.project.title,
      detail: `${s.project.brief} Limits: ${s.project.constraints.join('; ')}.`,
    })
  }

  return {
    level: 1,
    number: s.number,
    id: s.id,
    title: s.title,
    objective: s.objective,
    kind: s.kind,
    durationMin: s.durationMin,
    act: act ? { title: act.title, sessions: act.sessions } : null,
    concepts: s.concepts.map((c) => CONCEPT_LABEL[c] ?? c),
    objectives: s.objectives.map((o) => ({ text: o.text, kidText: o.kidText, discussionOnly: !!o.discussionOnly })),
    timing: s.teacher.timing.map((t) => ({ minutes: t.minutes, activity: t.activity })),
    warmup: {
      title: s.teacher.unpluggedWarmup.title,
      minutes: s.teacher.unpluggedWarmup.minutes,
      steps: s.teacher.unpluggedWarmup.steps,
      materials: s.teacher.unpluggedWarmup.materials,
    },
    activities,
    discussion: s.teacher.discussion,
    misconceptions: s.teacher.misconceptions,
    differentiation: s.teacher.differentiation,
    materials: materialsFor(s),
    notes: s.teacher.notes ?? [],
    parent: s.parent,
    extensions: extensionsFor(s),
    sessionHref: `/kids/course/1/${s.number}`,
    guideHref: `/kids/teach/1/${s.number}`,
    prev: prev ? { number: prev.number, title: prev.title } : null,
    next: next ? { number: next.number, title: next.title } : null,
  }
}

export function guideFor(level: string, session: string): TeacherGuide | null {
  if (level !== '1' || !/^\d{1,2}$/.test(session)) return null
  const s = LEVEL1_SESSIONS.find((x) => x.number === Number(session))
  return s ? buildGuide(s) : null
}

/** The index: every Level 1 session with its act, in order. */
export function guideIndex(): {
  act: { title: string; summary: string; sessions: [number, number] }
  sessions: { number: number; title: string; objective: string; kind: 'lesson' | 'project'; concepts: string[] }[]
}[] {
  const level = levelByNumber(1)
  return level.season.arc.map((a) => ({
    act: { title: a.title, summary: a.summary, sessions: a.sessions },
    sessions: LEVEL1_SESSIONS.filter((s) => s.number >= a.sessions[0] && s.number <= a.sessions[1]).map((s) => ({
      number: s.number,
      title: s.title,
      objective: s.objective,
      kind: s.kind,
      concepts: s.concepts.map((c) => CONCEPT_LABEL[c] ?? c),
    })),
  }))
}

export const LEVEL1_SESSION_COUNT = LEVEL1_SESSIONS.length
