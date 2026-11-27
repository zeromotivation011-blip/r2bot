// lib/kids/curriculum/level3/teacher-guide.ts
//
// SERVER ONLY (imports the full Level 3 and Level 4 sessions and the activity
// list). Builds the printable teacher's lesson plan for a Level 3 or Level 4
// session in the SAME shape lib/kids/teach/guides.ts returns for Level 1
// (TeacherGuide), plus the Level 3–4 extras: what the session reuses (the
// playable challenge and practice activities), materials and what to look for
// from the level's guide data, and a 5-minute reteach for every misconception
// the check can reveal.
//
// Integration: widen TeacherGuide['level'] to LevelNumber in guides.ts and
// route guideFor('3' | '4', n) here (see the hand-off notes).

import { ALL_ACTIVITIES } from '../../activities/content'
import { TRACKS } from '../../activities/types'
import { getGame } from '../../universe/worlds'
import { getMission } from '../../code-lab/missions'
import { DEMOS } from '../../sim/demos'
import { POWER_DEMOS } from '../../sim/power-demos'
import { getPart } from '../../robot-design'
import { levelByNumber } from '../levels'
import type { Session } from '../types'
import { CONCEPT_LABEL, type GuideActivity, type GuideExtension, type TeacherGuide } from '../../teach/guides'
import { activityHref } from '../../teach/catalogue'
import { TIER_LABEL, type LevelGuide, type Misconception, type SessionReuse } from './kit'
import { LEVEL3_SESSIONS } from './index'
import { LEVEL3_REUSE } from './reuse'
import { LEVEL3_GUIDE } from './guide'
import { LEVEL4_SESSIONS } from '../level4'
import { LEVEL4_REUSE } from '../level4/reuse'
import { LEVEL4_GUIDE } from '../level4/guide'
import { gameTierHref, labDemoHref } from '../../sim/lab-links'

/** Last time the Level 3–4 guides' wording or structure changed (for the sitemap's lastmod). */
export const L34_GUIDES_UPDATED = '2026-11-27'

type L34 = 3 | 4

const DATA: Record<L34, { sessions: Session[]; reuse: SessionReuse[]; guide: LevelGuide }> = {
  3: { sessions: LEVEL3_SESSIONS, reuse: LEVEL3_REUSE, guide: LEVEL3_GUIDE },
  4: { sessions: LEVEL4_SESSIONS, reuse: LEVEL4_REUSE, guide: LEVEL4_GUIDE },
}

/** A Level 1 TeacherGuide with the level widened, plus the Level 3–4 extras. */
export interface TeacherGuideL34 extends Omit<TeacherGuide, 'level'> {
  level: L34
  /** The challenge as it can be played today. */
  play: { title: string; detail: string; href: string | null }
  lookFor: string[]
  /** Misconceptions with their 5-minute reteach (the same ids the check's wrong options carry). */
  reteach: Misconception[]
}

function partName(slot: string, id: string): string {
  if (id === 'child-choice') return 'part of the child’s choice'
  const p = getPart(slot as Parameters<typeof getPart>[0], id)
  return p?.name ?? id
}

function trackHref(id: string): string | null {
  const a = ALL_ACTIVITIES.find((x) => x.id === id)
  return a ? activityHref(a.track, a.id) : null
}

function playOf(r: SessionReuse | undefined): TeacherGuideL34['play'] {
  if (!r) return { title: 'Challenge', detail: '', href: null }
  const p = r.play
  switch (p.kind) {
    case 'game': {
      const g = getGame(p.id)
      return { title: `${g?.name ?? p.id} — ${TIER_LABEL[p.tier]} tier`, detail: p.goal, href: gameTierHref(p.id, p.tier) }
    }
    case 'code-lab':
      return { title: `Code Lab: ${getMission(p.id)?.title ?? p.id}`, detail: p.goal, href: `/kids/code-lab/${p.id}` }
    case 'sim-demo':
      return { title: `${p.id.startsWith('power-') ? 'Power Lab' : 'Physics Lab'}: ${[...DEMOS, ...POWER_DEMOS].find((d) => d.id === p.id)?.title ?? p.id}`, detail: p.goal, href: labDemoHref(p.id) }
    case 'activity': {
      const a = ALL_ACTIVITIES.find((x) => x.id === p.id)
      return { title: `Skill Galaxy: ${a?.title ?? p.id}`, detail: p.goal, href: trackHref(p.id) }
    }
  }
}

function extensionsOf(r: SessionReuse | undefined): GuideExtension[] {
  if (!r) return []
  const out: GuideExtension[] = []
  for (const id of r.practice) {
    const a = ALL_ACTIVITIES.find((x) => x.id === id)
    if (!a) continue
    const t = TRACKS.find((x) => x.id === a.track)
    out.push({ id: a.id, title: a.title, track: t?.name ?? a.track, trackIcon: t?.icon ?? '✨', href: activityHref(a.track, a.id) })
  }
  return out
}

export function buildGuideL34(level: L34, s: Session): TeacherGuideL34 {
  const { sessions, reuse, guide } = DATA[level]
  const lvl = levelByNumber(level)
  const act = lvl.season.arc.find((a) => s.number >= a.sessions[0] && s.number <= a.sessions[1]) ?? null
  const idx = sessions.findIndex((x) => x.id === s.id)
  const prev = idx > 0 ? sessions[idx - 1] : null
  const next = idx >= 0 && idx < sessions.length - 1 ? sessions[idx + 1] : null
  const r = reuse.find((x) => x.session === s.id)
  const play = playOf(r)
  const extra = guide.sessions[s.number] ?? { materials: [], lookFor: [] }

  const verb = s.build.action === 'inspect' ? 'Inspect' : s.build.action === 'swap' ? 'Swap in' : s.build.action === 'choose' ? 'Choose' : 'Add'
  const activities: GuideActivity[] = [
    { step: 'Watch', title: `Episode: ${s.episode.title}`, detail: `${s.episode.previously ? `${s.episode.previously} ` : ''}Ends with: ${s.episode.cliffhanger}` },
    { step: 'Build', title: `${verb} the ${partName(s.build.part.slot, s.build.part.id).toLowerCase()}`, detail: `${s.build.why} Try without it: ${s.build.tryWithout}` },
    { step: 'Code', title: s.code.title, detail: s.code.mission },
    { step: 'Challenge', title: play.title, detail: `${play.detail} In the course: ${s.challenge.mission} Two stars: ${s.challenge.stars.two} Three stars: ${s.challenge.stars.three}` },
    { step: 'Check', title: 'Three questions (each wrong answer names a misconception)', detail: s.quiz.map((q) => q.prompt).join(' · ') },
    { step: 'Badge', title: `${s.badge.icon} ${s.badge.name}`, detail: `Earned because ${s.badge.earnedFor.replace(/^you /i, 'the student ')}` },
  ]
  if (s.project) activities.splice(1, 0, { step: 'Project', title: s.project.title, detail: `${s.project.brief} Limits: ${s.project.constraints.join('; ')}.` })

  const materials = [...extra.materials]
  for (const m of s.teacher.unpluggedWarmup.materials) if (m && m.toLowerCase() !== 'none' && !materials.includes(m)) materials.unshift(m)
  materials.push('A big screen with sound, for the episode (captions on)')
  if (s.kind === 'project') materials.push('Planning sheets and sticky notes for “two stars and a wish”')

  return {
    level,
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
    warmup: { ...s.teacher.unpluggedWarmup },
    activities,
    discussion: s.teacher.discussion,
    misconceptions: s.teacher.misconceptions.map((m) => ({ idea: m.idea, correction: m.correction })),
    differentiation: s.teacher.differentiation,
    materials: [...new Set(materials)],
    notes: s.teacher.notes ?? [],
    parent: s.parent,
    extensions: extensionsOf(r),
    sessionHref: `/kids/course/${level}/${s.number}`,
    guideHref: `/kids/teach/${level}/${s.number}`,
    prev: prev ? { number: prev.number, title: prev.title } : null,
    next: next ? { number: next.number, title: next.title } : null,
    play,
    lookFor: extra.lookFor,
    reteach: s.teacher.misconceptions as Misconception[],
  }
}

/** guideFor('3' | '4', '<n>'), or null for anything else. */
export function guideForL34(level: string, session: string): TeacherGuideL34 | null {
  if ((level !== '3' && level !== '4') || !/^\d{1,2}$/.test(session)) return null
  const l = Number(level) as L34
  const s = DATA[l].sessions.find((x) => x.number === Number(session))
  return s ? buildGuideL34(l, s) : null
}

/** The index for /kids/teach: each level's acts and sessions, plus its front matter. */
export function guideIndexL34(level: L34): {
  guide: LevelGuide
  acts: { act: { title: string; summary: string; sessions: [number, number] }; sessions: { number: number; title: string; objective: string; kind: 'lesson' | 'project'; concepts: string[] }[] }[]
} {
  const lvl = levelByNumber(level)
  const { sessions, guide } = DATA[level]
  return {
    guide,
    acts: lvl.season.arc.map((a) => ({
      act: { title: a.title, summary: a.summary, sessions: a.sessions },
      sessions: sessions
        .filter((s) => s.number >= a.sessions[0] && s.number <= a.sessions[1])
        .map((s) => ({ number: s.number, title: s.title, objective: s.objective, kind: s.kind, concepts: s.concepts.map((c) => CONCEPT_LABEL[c] ?? c) })),
    })),
  }
}

/** Every Level 3–4 guide path, for generateStaticParams and the sitemap. */
export function guideParamsL34(): { level: string; session: string }[] {
  return ([3, 4] as const).flatMap((l) => DATA[l].sessions.map((s) => ({ level: String(l), session: String(s.number) })))
}

/**
 * The reused challenge for a Level 3–4 session as the course page needs it:
 * title, goal and a resolved href (Galaxy activities need their track, which
 * only the server-side activity list knows). Pass `href` to the runner.
 */
export function playForL34(sessionId: string): TeacherGuideL34['play'] | null {
  const level = sessionId.startsWith('L3-') ? 3 : sessionId.startsWith('L4-') ? 4 : null
  if (!level) return null
  const r = DATA[level].reuse.find((x) => x.session === sessionId)
  return r ? playOf(r) : null
}
