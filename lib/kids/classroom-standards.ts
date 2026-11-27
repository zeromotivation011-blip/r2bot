// lib/kids/classroom-standards.ts
//
// SERVER ONLY (imports every level's sessions). The standards alignment for
// /kids/teach/standards and its per-level PDF (roadmap #31), built from
// lib/kids/curriculum/mapping.ts — the curriculum team's alignment rules for
// CSTA, NGSS and NEP 2020 — per objective, so every standard lists the exact
// sessions that address it. England's National Curriculum (computing, and the
// computing strands of design and technology) for Key Stages 1–3 is added
// here with the same honesty rules: statements are PARAPHRASED from the
// programmes of study, carry no invented codes, and each is matched to
// sessions by the objectives' tags and concepts.
//
// Alignment notes only — never a certification or endorsement.

import { ALIGNMENT_DISCLAIMER, CSTA, CSTA_LEVEL_FOR, INDIA_ALIGNMENT, LEVEL_CSTA, NGSS, alignObjective } from './curriculum/mapping'
import { CONCEPT_SPIRAL, LEVELS } from './curriculum/levels'
import { LEVEL1_SESSIONS } from './curriculum/level1'
import { LEVEL2_SESSIONS } from './curriculum/level2'
import { LEVEL3_SESSIONS } from './curriculum/level3'
import { LEVEL4_SESSIONS } from './curriculum/level4'
import type { ConceptId, LearningObjective, LevelNumber, MappingTag } from './curriculum/types'
import { CONCEPT_INFO, CONCEPT_IDS } from './universe/mastery'

/** Last time this page's wording or rules changed (sitemap lastmod via lib/content-dates.ts). */
export const STANDARDS_UPDATED = '2026-11-27'

export interface StandardsLevel {
  level: LevelNumber
  band: string
  ages: string
  season: string
  sessionCount: number
  cstaLevel: string
  cstaGrades: string
  csta: { id: string; summary: string; focus: boolean; strength: 'addresses' | 'contributes'; sessions: number[] }[]
  cstaNotCovered: string[]
  ngss: { id: string; summary: string; sessions: number[] }[]
  uk: { stage: string; statements: { subject: string; text: string; sessions: number[] }[] }
  india: { stage: string; themes: string[] }
  concepts: { id: ConceptId; name: string; spiral: string; sessions: number[] }[]
  disclaimer: string
}

// ── England: National Curriculum (2013), paraphrased ─────────────────────────

interface UkRule {
  subject: string
  text: string
  tags?: MappingTag[]
  concepts?: ConceptId[]
}

const UK: Record<LevelNumber, { stage: string; rules: UkRule[] }> = {
  1: {
    stage: 'Key Stage 1 (Years 1–2, ages 5–7). Level 1 is written for this stage.',
    rules: [
      { subject: 'KS1 Computing', text: 'Understand what algorithms are, that they are carried out as programs on digital devices, and that programs follow precise, unambiguous instructions.', tags: ['algorithms'], concepts: ['sequences'] },
      { subject: 'KS1 Computing', text: 'Create and debug simple programs.', tags: ['programming', 'debugging'] },
      { subject: 'KS1 Computing', text: 'Use logical reasoning to predict the behaviour of simple programs.', concepts: ['sequences', 'loops', 'conditions', 'debugging'] },
      { subject: 'KS1 Computing', text: 'Recognise common uses of information technology beyond school.', tags: ['impacts-of-computing'], concepts: ['careers'] },
      { subject: 'KS1 Computing', text: 'Use technology safely and respectfully.', concepts: ['safety-ethics'] },
      { subject: 'KS1 Design and technology', text: 'Design purposeful, functional products, and generate, develop, model and communicate ideas (talking, drawing, templates, mock-ups).', tags: ['engineering-design'], concepts: ['design-process'] },
      { subject: 'KS1 Design and technology', text: 'Explore and use mechanisms such as wheels and axles in their products.', concepts: ['physics'] },
    ],
  },
  2: {
    stage: 'Key Stage 2 (Years 3–6, ages 7–11). Level 2 is written for ages 8–10, inside this stage.',
    rules: [
      { subject: 'KS2 Computing', text: 'Design, write and debug programs that accomplish specific goals, including controlling or simulating physical systems; solve problems by breaking them into smaller parts.', tags: ['programming', 'debugging'], concepts: ['decomposition'] },
      { subject: 'KS2 Computing', text: 'Use sequence, selection and repetition in programs; work with variables and various forms of input and output.', concepts: ['sequences', 'conditions', 'loops', 'variables', 'sensors'] },
      { subject: 'KS2 Computing', text: 'Use logical reasoning to explain how some simple algorithms work, and to detect and correct errors in algorithms and programs.', tags: ['algorithms', 'debugging'] },
      { subject: 'KS2 Computing', text: 'Collect, analyse, evaluate and present data and information.', tags: ['data'], concepts: ['data'] },
      { subject: 'KS2 Computing', text: 'Use technology safely, respectfully and responsibly.', concepts: ['safety-ethics'] },
      { subject: 'KS2 Design and technology', text: 'Apply their understanding of computing to program, monitor and control their products.', concepts: ['sensors', 'feedback-control'] },
      { subject: 'KS2 Design and technology', text: 'Understand and use mechanical systems in their products, such as gears and levers.', concepts: ['physics'] },
      { subject: 'KS2 Design and technology', text: 'Investigate and analyse existing products, and evaluate their ideas against their own design criteria, considering the views of others.', tags: ['engineering-design'], concepts: ['design-process'] },
    ],
  },
  3: {
    stage: 'Key Stage 3 (Years 7–9, ages 11–14). Level 3 is written for ages 11–13, inside this stage.',
    rules: [
      { subject: 'KS3 Computing', text: 'Design, use and evaluate computational abstractions that model the state and behaviour of real-world problems and physical systems.', concepts: ['feedback-control', 'autonomy', 'physics'] },
      { subject: 'KS3 Computing', text: 'Understand several key algorithms that reflect computational thinking, and use logical reasoning to compare alternative algorithms for the same problem.', tags: ['algorithms'] },
      { subject: 'KS3 Computing', text: 'Design and develop structured programs that use variables and control structures (block-based here: KS3 also asks for a textual language, which R2BOT Kids does not cover).', tags: ['programming'], concepts: ['variables'] },
      { subject: 'KS3 Computing', text: 'Understand simple Boolean logic (AND, OR, NOT) and its uses in programming (binary representation is not covered).', concepts: ['conditions'] },
      { subject: 'KS3 Computing', text: 'Understand the hardware and software components that make up computer systems and how they work together.', tags: ['computing-systems'], concepts: ['sensors'] },
      { subject: 'KS3 Computing', text: 'Undertake creative projects that collect and analyse data and meet the needs of known users.', tags: ['data'], concepts: ['design-process'] },
      { subject: 'KS3 Computing', text: 'Understand a range of ways to use technology safely, respectfully, responsibly and securely.', concepts: ['safety-ethics'] },
      { subject: 'KS3 Design and technology', text: 'Apply computing and electronics to embed intelligence in products that respond to inputs (sensors) and control outputs (actuators) using programmable components.', concepts: ['sensors', 'feedback-control'] },
      { subject: 'KS3 Design and technology', text: 'Understand how mechanical systems in their products change movement and force.', concepts: ['physics'] },
    ],
  },
  4: {
    stage: 'Ages 14–17 sit in Key Stage 4 and beyond; R2BOT Kids makes no claim against GCSE computing. Level 4 deepens these Key Stage 3 statements and is best used as enrichment alongside them.',
    rules: [
      { subject: 'KS3 Computing (extended)', text: 'Design, use and evaluate computational abstractions that model the state and behaviour of real-world problems and physical systems.', concepts: ['feedback-control', 'autonomy', 'physics'] },
      { subject: 'KS3 Computing (extended)', text: 'Use logical reasoning to compare alternative algorithms for the same problem.', tags: ['algorithms'] },
      { subject: 'KS3 Computing (extended)', text: 'Undertake creative projects that collect and analyse data and meet the needs of known users.', tags: ['data'], concepts: ['design-process'] },
      { subject: 'KS3 Computing (extended)', text: 'Understand a range of ways to use technology safely, respectfully, responsibly and securely.', concepts: ['safety-ethics'] },
      { subject: 'KS3 Design and technology (extended)', text: 'Apply computing and electronics to embed intelligence in products that respond to inputs (sensors) and control outputs (actuators).', concepts: ['sensors', 'feedback-control'] },
    ],
  },
}

// ── Build ────────────────────────────────────────────────────────────────────

interface SessionLike {
  number: number
  concepts: ConceptId[]
  objectives: LearningObjective[]
}

const SESSIONS: Record<LevelNumber, SessionLike[]> = {
  1: LEVEL1_SESSIONS,
  2: LEVEL2_SESSIONS,
  3: LEVEL3_SESSIONS,
  4: LEVEL4_SESSIONS,
}

function uniqSorted(ns: Iterable<number>): number[] {
  return [...new Set(ns)].sort((a, b) => a - b)
}

const cache = new Map<LevelNumber, StandardsLevel>()

export function standardsForLevel(level: LevelNumber): StandardsLevel {
  const hit = cache.get(level)
  if (hit) return hit
  const lv = LEVELS.find((l) => l.number === level)
  if (!lv) throw new Error(`No level ${level}`)
  const sessions = SESSIONS[level]

  const csta = new Map<string, { strength: 'addresses' | 'contributes'; sessions: number[] }>()
  const ngss = new Map<string, number[]>()
  for (const s of sessions) {
    for (const o of s.objectives) {
      const a = alignObjective(level, o)
      for (const c of a.csta) {
        const cur = csta.get(c.id) ?? { strength: c.strength, sessions: [] }
        if (c.strength === 'addresses') cur.strength = 'addresses'
        cur.sessions.push(s.number)
        csta.set(c.id, cur)
      }
      for (const id of a.ngss) ngss.set(id, [...(ngss.get(id) ?? []), s.number])
    }
  }
  const focus = new Set(LEVEL_CSTA[level].focus)
  for (const id of focus) if (!csta.has(id)) csta.set(id, { strength: 'addresses', sessions: [] })
  const cstaRows = [...csta.entries()]
    .map(([id, v]) => ({
      id,
      summary: CSTA.find((c) => c.id === id)?.summary ?? id,
      focus: focus.has(id),
      strength: v.strength,
      sessions: uniqSorted(v.sessions),
    }))
    .sort((a, b) => Number(b.focus) - Number(a.focus) || a.id.localeCompare(b.id))

  const ukStatements = UK[level].rules.map((r) => {
    const hits: number[] = []
    for (const s of sessions) {
      const match = s.objectives.some((o) =>
        (r.tags ?? []).some((t) => o.tags.includes(t)) || (r.concepts ?? []).some((c) => o.concepts.includes(c)),
      )
      if (match) hits.push(s.number)
    }
    return { subject: r.subject, text: r.text, sessions: uniqSorted(hits) }
  }).filter((r) => r.sessions.length > 0)

  const concepts = CONCEPT_IDS.map((id) => ({
    id,
    name: CONCEPT_INFO[id].name,
    spiral: CONCEPT_SPIRAL[id][level - 1],
    sessions: uniqSorted(sessions.filter((s) => s.concepts.includes(id)).map((s) => s.number)),
  })).filter((c) => c.sessions.length > 0)

  const out: StandardsLevel = {
    level,
    band: lv.name,
    ages: lv.ages,
    season: lv.season.title,
    sessionCount: sessions.length,
    cstaLevel: CSTA_LEVEL_FOR[level].level,
    cstaGrades: CSTA_LEVEL_FOR[level].grades,
    csta: cstaRows,
    cstaNotCovered: LEVEL_CSTA[level].notCovered,
    ngss: [...ngss.entries()].map(([id, ss]) => ({ id, summary: NGSS[id] ?? id, sessions: uniqSorted(ss) })).sort((a, b) => a.id.localeCompare(b.id)),
    uk: { stage: UK[level].stage, statements: ukStatements },
    india: INDIA_ALIGNMENT[level],
    concepts,
    disclaimer: `${ALIGNMENT_DISCLAIMER} England's National Curriculum statements are likewise our paraphrases of the programmes of study (no codes exist and none are invented); R2BOT Kids is not endorsed by the Department for Education.`,
  }
  cache.set(level, out)
  return out
}

export function allStandards(): StandardsLevel[] {
  return ([1, 2, 3, 4] as LevelNumber[]).map(standardsForLevel)
}
