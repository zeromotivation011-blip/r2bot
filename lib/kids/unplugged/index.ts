// lib/kids/unplugged/index.ts
//
// SERVER ONLY (imports the full Level 1 curriculum). Unplugged lessons for
// classrooms with no devices (roadmap #85): one no-device version of every
// Level 1 session, for a teacher with only a projector or with nothing at all.
//
// Each lesson = the hand-written core in ./lessons (story told aloud, the main
// activity, the floor-grid mission, sorting cards, the paper-gear demo) + the
// session's own objective, warm-up, discussion questions, check and family
// note from lib/kids/curriculum/level1. The 40 minutes always add up (checked
// by ./verify.ts).

import { LEVEL1_SESSIONS } from '../curriculum/level1'
import type { Session } from '../curriculum/types'
import { CARDS, cardForLabel, type CardId } from './cards'
import { programText, type FloorMission } from './grid'
import { UNPLUGGED_CORES, type KitId, type SortItem } from './lessons'

export { CARDS, CARD_ORDER, GROUP_STYLE, cardForLabel, type CardId, type CommandCard } from './cards'
export { runMission, programText, findCell, countCards, type FloorMission, type Step } from './grid'
export type { KitId, SortItem } from './lessons'

/** Last change to the unplugged lessons' wording or structure (sitemap lastmod). */
export const UNPLUGGED_UPDATED = '2026-11-27'

export const KIT_LABEL: Record<KitId, { name: string; line: string }> = {
  'command-cards': { name: 'Command cards', line: 'The paper twins of the on-screen picture blocks, to lay out as a program.' },
  'floor-grid': { name: 'Human-robot floor grid', line: 'A map of squares on the floor (or on paper at desks); one child is the robot.' },
  sorting: { name: 'Sense–think–act sorting cards', line: 'Picture cards to sort under SENSE, THINK and ACT.' },
  'paper-gears': { name: 'Paper gears', line: 'Three gears to cut from card and pin on cardboard with a pencil.' },
  experiment: { name: 'Table-top experiment', line: 'A fair test with everyday things: a ramp, a toy car, a tray.' },
}

export interface UnpluggedPlanBlock {
  minutes: number
  title: string
  steps: string[]
}

export interface UnpluggedLesson {
  sessionId: string
  number: number
  title: string
  kind: 'lesson' | 'project'
  objective: string
  idea: string
  iCan: string[]
  kits: KitId[]
  plan: UnpluggedPlanBlock[]
  totalMinutes: number
  storyHook: string
  mission: FloorMission | null
  /** The mission's answer key in words. */
  answerKey: string | null
  buggyKey: string | null
  sorting: { prompt: string; items: SortItem[] } | null
  gears: { title: string; steps: string[] } | null
  /** The command cards for this lesson: the mission deck, or the session's picture blocks. */
  cards: CardId[]
  materials: string[]
  discussion: string[]
  check: { prompt: string; options: { text: string; icon: string }[]; answer: number; why: string }[]
  parent: { today: string; tryAtHome: string; askYourChild: string }
  /** Run with a single device or a projector. */
  withOneScreen: string[]
  /** The child's on-screen session and its teacher guide. */
  sessionHref: string
  guideHref: string
  href: string
  prev: { number: number; title: string } | null
  next: { number: number; title: string } | null
}

export function unpluggedHref(n: number): string {
  return `/kids/teach/unplugged/${n}`
}

function cardsFor(s: Session, mission: FloorMission | undefined): CardId[] {
  if (mission) return mission.deck
  const ids = new Set<CardId>()
  for (const b of s.challenge.allowedBlocks) {
    const card = cardForLabel(b.label)
    if (card) ids.add(card.id)
  }
  return [...ids]
}

function build(s: Session, i: number): UnpluggedLesson {
  const core = UNPLUGGED_CORES.find((c) => c.number === s.number)
  if (!core) throw new Error(`No unplugged lesson for ${s.id}`)
  const w = s.teacher.unpluggedWarmup
  const warmMin = Math.max(3, Math.min(8, w.minutes))
  const storyMin = 5
  const checkMin = 5
  const mainMin = core.main.minutes
  const shareMin = 40 - warmMin - storyMin - mainMin - checkMin
  if (shareMin < 3) throw new Error(`${s.id}: the unplugged plan runs over 40 minutes`)

  const label = (id: CardId) => CARDS[id].label
  const plan: UnpluggedPlanBlock[] = [
    { minutes: warmMin, title: `Warm up: ${w.title}`, steps: w.steps },
    {
      minutes: storyMin,
      title: `Story time: ${s.episode.title}`,
      steps: [
        core.storyHook,
        'Tell it in your own words, with a soft toy or a drawing as Spark. Stop before the problem is solved and ask: “What should Spark do?”',
      ],
    },
    { minutes: mainMin, title: core.main.title, steps: core.main.steps },
    {
      minutes: checkMin,
      title: 'Hands-up check',
      steps: [
        'Read each question and its picture options aloud. Children hold up one, two or three fingers for the option they choose — no names, no scores.',
        'Count the hands for each option, then explain the answer. A wrong option tells you which idea to revisit.',
      ],
    },
    {
      minutes: shareMin,
      title: 'Share and say “I can”',
      steps: [
        'Two pairs show what they did. Ask one discussion question below.',
        `Read the “I can” lines together: ${s.objectives.map((o) => `“${o.kidText}”`).join(' ')}`,
      ],
    },
  ]

  const materials = new Set<string>()
  materials.add('The printed sheets for this lesson (below): ' + core.kits.map((k) => KIT_LABEL[k].name.toLowerCase()).join(', '))
  for (const m of w.materials) if (m && m.toLowerCase() !== 'none') materials.add(m)
  for (const m of core.materials) materials.add(m)

  const prevS = LEVEL1_SESSIONS[i - 1]
  const nextS = LEVEL1_SESSIONS[i + 1]
  return {
    sessionId: s.id,
    number: s.number,
    title: s.title,
    kind: s.kind,
    objective: s.objective,
    idea: core.idea,
    iCan: s.objectives.map((o) => o.kidText),
    kits: core.kits,
    plan,
    totalMinutes: plan.reduce((a, b) => a + b.minutes, 0),
    storyHook: core.storyHook,
    mission: core.mission ?? null,
    answerKey: core.mission ? programText(core.mission.solution, label) : null,
    buggyKey: core.mission?.buggy ? programText(core.mission.buggy, label) : null,
    sorting: core.sorting ?? null,
    gears: core.gears ?? null,
    cards: cardsFor(s, core.mission),
    materials: [...materials],
    discussion: s.teacher.discussion,
    check: s.quiz.map((q) => ({ prompt: q.prompt, options: q.options.map((o) => ({ text: o.text, icon: o.icon })), answer: q.answer, why: q.why })),
    parent: s.parent,
    withOneScreen: [
      'Project this page or the Present mode for the class: the story, the mission map and the hands-up check read well from the back of the room.',
      'If you have one device, let pairs take turns to run the on-screen challenge after the unplugged mission, while the rest of the class predicts what will happen.',
    ],
    sessionHref: `/kids/course/1/${s.number}`,
    guideHref: `/kids/teach/1/${s.number}`,
    href: unpluggedHref(s.number),
    prev: prevS ? { number: prevS.number, title: prevS.title } : null,
    next: nextS ? { number: nextS.number, title: nextS.title } : null,
  }
}

let cache: UnpluggedLesson[] | null = null

export function allUnpluggedLessons(): UnpluggedLesson[] {
  if (!cache) cache = LEVEL1_SESSIONS.map(build)
  return cache
}

export function unpluggedLesson(n: string | number): UnpluggedLesson | null {
  const num = typeof n === 'number' ? n : /^\d{1,2}$/.test(n) ? Number(n) : NaN
  return allUnpluggedLessons().find((l) => l.number === num) ?? null
}
