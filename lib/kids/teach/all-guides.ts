// lib/kids/teach/all-guides.ts — SERVER ONLY. One entry point for the teacher
// guides of every level: Level 1 (./guides), Level 2 (./guides-level2) and
// Levels 3–4 (curriculum/level3/teacher-guide). Kept out of ./guides so the
// level modules (which import ./guides) never form an import cycle.

import type { LevelNumber } from '../curriculum/types'
import { guideFor, guideIndex, LEVEL1_SESSION_COUNT, type TeacherGuide } from './guides'
import { level2GuideFor, level2GuideIndex, LEVEL2_SESSION_COUNT, type Level2TeacherGuide } from './guides-level2'
import { guideForL34, guideIndexL34, guideParamsL34, type TeacherGuideL34 } from '../curriculum/level3/teacher-guide'
import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { LEVEL2_SESSIONS } from '../curriculum/level2'

/** Any level's guide: the Level 1 shape plus that level's extras. */
export type AnyTeacherGuide = TeacherGuide | Level2TeacherGuide | TeacherGuideL34

export function anyGuideFor(level: string, session: string): AnyTeacherGuide | null {
  if (level === '1') return guideFor(level, session)
  if (level === '2') return level2GuideFor(session)
  return guideForL34(level, session)
}

/** Every guide path, for generateStaticParams and the sitemap. */
export function allGuideParams(): { level: string; session: string }[] {
  return [
    ...LEVEL1_SESSIONS.map((s) => ({ level: '1', session: String(s.number) })),
    ...LEVEL2_SESSIONS.map((s) => ({ level: '2', session: String(s.number) })),
    ...guideParamsL34(),
  ]
}

export type GuideIndexAct = ReturnType<typeof guideIndex>[number]

/** Each level's acts and sessions, in order, for /kids/teach. */
export function allGuideIndexes(): { level: LevelNumber; count: number; acts: GuideIndexAct[] }[] {
  const l3 = guideIndexL34(3)
  const l4 = guideIndexL34(4)
  return [
    { level: 1, count: LEVEL1_SESSION_COUNT, acts: guideIndex() },
    { level: 2, count: LEVEL2_SESSION_COUNT, acts: level2GuideIndex() },
    { level: 3, count: l3.acts.reduce((n, a) => n + a.sessions.length, 0), acts: l3.acts },
    { level: 4, count: l4.acts.reduce((n, a) => n + a.sessions.length, 0), acts: l4.acts },
  ]
}

export function isLevel2Guide(g: AnyTeacherGuide): g is Level2TeacherGuide {
  return g.level === 2
}

export function isL34Guide(g: AnyTeacherGuide): g is TeacherGuideL34 {
  return g.level === 3 || g.level === 4
}

export { guideIndexL34 }
