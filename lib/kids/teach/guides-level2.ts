// lib/kids/teach/guides-level2.ts
//
// SERVER ONLY. The printable teacher's lesson plans for Level 2 (Builders,
// 8–10, "The Island Post"), in the SAME TeacherGuide shape as Level 1
// (./guides.ts), built from lib/kids/curriculum/level2 — never re-written by
// hand, so a guide and its session cannot drift apart.
//
// Level 2 sessions are composed (see lib/kids/curriculum/level2/types.ts):
// the "what children do" steps name the real arena, the Skill Galaxy
// activities and the game tier the session uses, with links; the
// misconceptions come from the check's tagged wrong answers.
//
// Wiring (integrator): guides.ts' guideFor()/guideIndex() dispatch level '2'
// here, and TeacherGuide.level widens to `1 | 2`.

import { levelByNumber } from '../curriculum/levels'
import { LEVEL2_SESSIONS } from '../curriculum/level2'
import { resolveActivities, resolveArena, resolveGame, resolveTheatre } from '../curriculum/level2/resolve'
import type { L2Session } from '../curriculum/level2/types'
import { getPart } from '../robot-design'
import { CONCEPT_LABEL, type GuideActivity, type GuideExtension, type TeacherGuide } from './guides'

/** Last time the Level 2 guides' wording or structure changed (for the sitemap's lastmod). */
export const TEACH_GUIDES_L2_UPDATED = '2026-11-27'

export type Level2TeacherGuide = Omit<TeacherGuide, 'level'> & {
  level: 2
  /** The arena, activities and game the session uses, with links (Level 2 only). */
  practise: { arena: { title: string; href: string; task: string; why: string }; game: { title: string; href: string; goal: string } }
}

function partName(slot: string, id: string): string {
  if (id === 'child-choice') return 'part of the child’s choice'
  const p = getPart(slot as Parameters<typeof getPart>[0], id)
  return p?.name ?? id
}

function materialsFor(s: L2Session): string[] {
  const out = new Set<string>()
  for (const m of s.teacher.unpluggedWarmup.materials) if (m && m.toLowerCase() !== 'none') out.add(m)
  out.add('A big screen with sound, for the episode (captions on)')
  out.add('One tablet or computer per pair (or three), signed in to the class with its join code')
  out.add('A test-log sheet per pair: prediction, what happened, what we changed')
  if (s.kind === 'project') {
    out.add('Planning sheets (problem in one sentence, two sketches, the chosen plan) and squared paper')
    out.add('Sticky notes for “a star and a wish”')
  }
  return [...out]
}

export function buildLevel2Guide(s: L2Session): Level2TeacherGuide {
  const level = levelByNumber(2)
  const act = level.season.arc.find((a) => s.number >= a.sessions[0] && s.number <= a.sessions[1]) ?? null
  const idx = LEVEL2_SESSIONS.findIndex((x) => x.id === s.id)
  const prev = idx > 0 ? LEVEL2_SESSIONS[idx - 1] : null
  const next = idx >= 0 && idx < LEVEL2_SESSIONS.length - 1 ? LEVEL2_SESSIONS[idx + 1] : null
  const arena = resolveArena(s)
  const game = resolveGame(s)
  const theatre = resolveTheatre(s)
  const acts = resolveActivities(s)

  const activities: GuideActivity[] = [
    {
      step: 'Watch',
      title: `Episode: ${s.episode.title}`,
      detail: `${s.episode.previously ? `${s.episode.previously} ` : ''}Ends with: ${s.episode.cliffhanger}${theatre ? ` Optional cartoon for the same idea: “${theatre.title}” (Story Theatre, about ${theatre.minutes} min).` : ''}`,
    },
    {
      step: 'Build',
      title: `${s.build.action === 'inspect' ? 'Look at' : s.build.action === 'swap' ? 'Swap in' : s.build.action === 'choose' ? 'Choose' : 'Add'} the ${partName(s.build.part.slot, s.build.part.id).toLowerCase()}`,
      detail: `${s.build.why} Try without it: ${s.build.tryWithout}`,
    },
    {
      step: 'Practise',
      title: arena ? `${arena.emoji} ${arena.title}` : 'Arena',
      detail: `${s.arena.task} Why this arena: ${s.arena.why}`,
    },
    {
      step: 'Galaxy',
      title: `${acts.length} Skill Galaxy activities`,
      detail: acts.map((a) => `${a.trackIcon} ${a.title} — ${a.why}`).join(' · '),
    },
    {
      step: 'Challenge',
      title: game ? `${game.emoji} ${game.name} · ${game.tierName}` : s.challenge.game,
      detail: `${s.challenge.goal} Before playing, Spark says: ${s.challenge.link}`,
    },
    { step: 'Check', title: 'Three questions, answered alone', detail: s.quiz.map((q) => q.prompt).join(' · ') },
    { step: 'Badge', title: `${s.badge.icon} ${s.badge.name}`, detail: `Earned because ${s.badge.earnedFor.replace(/^you /i, 'the child ')}` },
  ]
  if (s.project) {
    activities.splice(1, 0, {
      step: 'Project',
      title: s.project.title,
      detail: `${s.project.brief} Limits: ${s.project.constraints.join('; ')}.`,
    })
  }

  const extensions: GuideExtension[] = acts.map((a) => ({ id: a.id, title: a.title, track: a.trackName, trackIcon: a.trackIcon, href: a.href }))

  return {
    level: 2,
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
    extensions,
    sessionHref: `/kids/course/2/${s.number}`,
    guideHref: `/kids/teach/2/${s.number}`,
    prev: prev ? { number: prev.number, title: prev.title } : null,
    next: next ? { number: next.number, title: next.title } : null,
    practise: {
      arena: { title: arena?.title ?? s.arena.id, href: arena?.href ?? '/kids/code-lab', task: s.arena.task, why: s.arena.why },
      game: { title: game ? `${game.name} · ${game.tierName}` : s.challenge.game, href: game?.href ?? '/kids/play', goal: s.challenge.goal },
    },
  }
}

export function level2GuideFor(session: string): Level2TeacherGuide | null {
  if (!/^\d{1,2}$/.test(session)) return null
  const s = LEVEL2_SESSIONS.find((x) => x.number === Number(session))
  return s ? buildLevel2Guide(s) : null
}

/** The Level 2 index: every session with its act, in order (same shape as guideIndex()). */
export function level2GuideIndex(): {
  act: { title: string; summary: string; sessions: [number, number] }
  sessions: { number: number; title: string; objective: string; kind: 'lesson' | 'project'; concepts: string[] }[]
}[] {
  const level = levelByNumber(2)
  return level.season.arc.map((a) => ({
    act: { title: a.title, summary: a.summary, sessions: a.sessions },
    sessions: LEVEL2_SESSIONS.filter((s) => s.number >= a.sessions[0] && s.number <= a.sessions[1]).map((s) => ({
      number: s.number,
      title: s.title,
      objective: s.objective,
      kind: s.kind,
      concepts: s.concepts.map((c) => CONCEPT_LABEL[c] ?? c),
    })),
  }))
}

export const LEVEL2_SESSION_COUNT = LEVEL2_SESSIONS.length
