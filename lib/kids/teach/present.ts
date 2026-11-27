// lib/kids/teach/present.ts
//
// SERVER ONLY (imports the curricula). Builds the slide deck that Present
// mode (/kids/present, roadmap #42) puts on the classroom projector:
//   - a course session of any level   ?session=<level>-<n>          e.g. ?session=1-5
//   - its unplugged version (Level 1)  ?session=1-5&unplugged=1
//   - a Story Theatre episode          ?episode=<slug>
//   - a simulator or its replays       ?sim=lab | ?sim=power
//   - any other kids page              ?path=/kids/...   (a game, a Code Lab mission, a replay)
// A deck is plain JSON: the page renders it on the server and hands the same
// object to the presenter. The lesson timer follows LESSON_SHAPE (5/10/20/5)
// unless the deck has its own timing (the unplugged plans).
//
// presentHref() is the one helper every "Present" button uses.

import { LESSON_SHAPE } from '../classroom-plan'
import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { LEVEL2_SESSIONS } from '../curriculum/level2'
import { LEVEL3_SESSIONS } from '../curriculum/level3'
import { LEVEL4_SESSIONS } from '../curriculum/level4'
import { levelByNumber } from '../curriculum/levels'
import { EPISODES, getEpisode } from '../stories'
import { unpluggedLesson, CARDS, type FloorMission } from '../unplugged'
import { anyGuideFor } from './all-guides'
import type { PresentSource } from './present-href'

export interface VoteQuestion {
  prompt: string
  options: { text: string; icon?: string }[]
  /** Index of the right option, or null for a prediction vote with no right answer. */
  answer: number | null
  why: string
}

export type PresentSlide =
  | { kind: 'title'; phase: number; title: string; kicker: string; lines: string[] }
  | { kind: 'steps'; phase: number; title: string; kicker: string; steps: string[] }
  | { kind: 'story'; phase: number; title: string; text: string }
  | { kind: 'embed'; phase: number; title: string; src: string; note: string }
  | { kind: 'map'; phase: number; title: string; mission: FloorMission; cards: { label: string; icon: string }[] }
  | { kind: 'ask'; phase: number; title: string; prompts: string[]; listenFor: string[] }
  | { kind: 'vote'; phase: number; title: string; questions: VoteQuestion[] }

export interface PresentDeck {
  id: string
  title: string
  kicker: string
  /** The lesson timer's phases. */
  phases: { label: string; minutes: number }[]
  slides: PresentSlide[]
  /** Where "Exit" goes. */
  backHref: string
  backLabel: string
}

export { presentHref, type PresentSource } from './present-href'

const SHAPE_PHASES = LESSON_SHAPE.map((p) => ({ label: p.label, minutes: p.minutes }))

/** A kids path that may be framed: same site, under /kids, not Present mode itself, no protocol tricks. */
export function safeKidsPath(raw: string | undefined | null): string | null {
  if (!raw || raw.length > 200) return null
  if (!/^\/kids(\/[A-Za-z0-9_\-./]*)?(\?[A-Za-z0-9_\-=&%.]*)?$/.test(raw)) return null
  if (raw.includes('..') || raw.includes('//')) return null
  if (raw.startsWith('/kids/present')) return null
  return raw
}

/** Add ?present=1 so the framed page knows (lib/kids/teach/present-bridge.ts). */
function framed(src: string): string {
  return `${src}${src.includes('?') ? '&' : '?'}present=1`
}

function sessionsOf(level: number) {
  return level === 1 ? LEVEL1_SESSIONS : level === 2 ? LEVEL2_SESSIONS : level === 3 ? LEVEL3_SESSIONS : level === 4 ? LEVEL4_SESSIONS : []
}

function sessionDeck(level: number, number: number): PresentDeck | null {
  const s = sessionsOf(level).find((x) => x.number === number)
  const g = anyGuideFor(String(level), String(number))
  if (!s || !g) return null
  const lv = levelByNumber(g.level)
  const watchSrc =
    level === 1 ? `/kids/lab/episodes/${s.id}` : level === 2 && 'theatre' in s && s.theatre ? `/kids/stories/${s.theatre}` : g.sessionHref
  const slides: PresentSlide[] = [
    {
      kind: 'title',
      phase: 0,
      kicker: `Level ${g.level} · ${lv.name} · Session ${g.number}`,
      title: g.title,
      lines: g.objectives.map((o) => o.kidText),
    },
    {
      kind: 'embed',
      phase: 0,
      title: `Watch together: ${s.episode.title}`,
      src: framed(watchSrc),
      note: 'Captions on. Pause at each “sense, think, act” moment and ask what Spark will do next.',
    },
    { kind: 'steps', phase: 1, kicker: `Unplugged · ${g.warmup.minutes} minutes`, title: g.warmup.title, steps: g.warmup.steps },
    {
      kind: 'embed',
      phase: 2,
      title: 'Hands on: build, code, challenge',
      src: framed(g.sessionHref),
      note: 'Show the first step together, then pairs carry on at their devices. Use slow motion to replay a tricky run.',
    },
    { kind: 'ask', phase: 3, title: 'Ask the class', prompts: g.discussion, listenFor: g.misconceptions.map((m) => `${m.idea} → ${m.correction}`) },
    {
      kind: 'vote',
      phase: 3,
      title: 'Hands-up check',
      questions: s.quiz.map((q) => ({ prompt: q.prompt, options: q.options.map((o) => ({ text: o.text, icon: o.icon })), answer: q.answer, why: q.why })),
    },
    {
      kind: 'steps',
      phase: 3,
      kicker: 'Share',
      title: 'Show, tell, and take it home',
      steps: [`Two pairs show their run. The class names today’s idea.`, `Try at home: ${g.parent.tryAtHome}`, `Ask at home: ${g.parent.askYourChild}`],
    },
  ]
  return {
    id: `session-${level}-${number}`,
    title: g.title,
    kicker: `Level ${g.level}, session ${g.number}`,
    phases: SHAPE_PHASES,
    slides,
    backHref: g.guideHref,
    backLabel: 'Teacher guide',
  }
}

function unpluggedDeck(number: number): PresentDeck | null {
  const l = unpluggedLesson(number)
  if (!l) return null
  const phases = l.plan.map((p) => ({ label: p.title.replace(/:.*$/, ''), minutes: p.minutes }))
  const slides: PresentSlide[] = [
    { kind: 'title', phase: 0, kicker: `Unplugged · Level 1 · Lesson ${l.number}`, title: l.title, lines: l.iCan },
    { kind: 'steps', phase: 0, kicker: l.plan[0].title, title: 'Warm up', steps: l.plan[0].steps },
    { kind: 'story', phase: 1, title: 'Story time', text: l.storyHook },
    { kind: 'steps', phase: 2, kicker: `${l.plan[2].minutes} minutes`, title: l.plan[2].title, steps: l.plan[2].steps },
  ]
  if (l.mission) {
    slides.push({ kind: 'map', phase: 2, title: l.mission.title, mission: l.mission, cards: l.mission.deck.map((id) => ({ label: CARDS[id].label, icon: CARDS[id].icon })) })
  }
  slides.push(
    { kind: 'vote', phase: 3, title: 'Hands-up check', questions: l.check.map((q) => ({ prompt: q.prompt, options: q.options, answer: q.answer, why: q.why })) },
    { kind: 'ask', phase: 4, title: 'Ask the class', prompts: l.discussion, listenFor: [] },
  )
  return { id: `unplugged-${number}`, title: l.title, kicker: `Unplugged lesson ${l.number}`, phases, slides, backHref: l.href, backLabel: 'Unplugged lesson' }
}

function episodeDeck(slug: string): PresentDeck | null {
  const ep = getEpisode(slug)
  if (!ep) return null
  return {
    id: `episode-${slug}`,
    title: ep.title,
    kicker: 'Story Theatre',
    phases: SHAPE_PHASES,
    slides: [
      { kind: 'title', phase: 0, kicker: `Story Theatre · ${ep.concept}`, title: ep.title, lines: [ep.logline] },
      { kind: 'embed', phase: 0, title: ep.title, src: framed(`/kids/stories/${ep.slug}`), note: 'Let the class choose at each choice point by a show of hands.' },
      {
        kind: 'ask',
        phase: 1,
        title: 'Ask the class',
        prompts: [
          `What did the robot sense, what did it think, and what did it do?`,
          ...ep.learns.map((t) => `Who can explain this: ${t.replace(/\.$/, '')}?`),
          `Where could a robot like this help in real life?`,
        ],
        listenFor: [ep.factNote],
      },
      { kind: 'vote', phase: 3, title: 'Hands-up check', questions: ep.quiz.map((q) => ({ prompt: q.q, options: q.options.map((text) => ({ text })), answer: q.answer, why: q.explain })) },
      { kind: 'embed', phase: 2, title: `Try it: ${ep.handsOn.label}`, src: framed(ep.handsOn.href), note: ep.handsOn.why },
    ].sort((a, b) => a.phase - b.phase) as PresentSlide[],
    backHref: `/kids/stories/${ep.slug}`,
    backLabel: 'Episode page',
  }
}

const SIMS = {
  lab: { title: 'Robot Physics Lab', src: '/kids/lab/sim', idea: 'weight, motor limits, slip and momentum' },
  power: { title: 'Power Lab', src: '/kids/lab/power', idea: 'batteries, energy and why robots slow down' },
} as const

function predictVote(): VoteQuestion[] {
  return [
    {
      prompt: 'Before we press Run: will the robot reach the goal?',
      options: [{ text: 'Yes, first time', icon: '✅' }, { text: 'No, it needs a fix', icon: '🔧' }, { text: 'Not sure yet', icon: '🤔' }],
      answer: null,
      why: 'Now run it and watch. Use the replay and slow motion to see exactly where it went right or wrong.',
    },
  ]
}

function simDeck(id: 'lab' | 'power'): PresentDeck {
  const sim = SIMS[id]
  return {
    id: `sim-${id}`,
    title: sim.title,
    kicker: 'Simulator',
    phases: SHAPE_PHASES,
    slides: [
      { kind: 'title', phase: 0, kicker: 'Simulator', title: sim.title, lines: [`Today we test ${sim.idea}.`, 'Predict, run, watch the replay, explain.'] },
      { kind: 'vote', phase: 1, title: 'Predict', questions: predictVote() },
      { kind: 'embed', phase: 2, title: sim.title, src: framed(sim.src), note: 'After a run, open the Flight Recorder replay and use slow motion. Freeze and draw where it slipped.' },
      {
        kind: 'ask',
        phase: 3,
        title: 'Ask the class',
        prompts: ['What happened that you did not expect?', 'Point to the moment it went wrong in the replay. What was the robot sensing then?', 'What one change would you test next, and why?'],
        listenFor: ['“The program was wrong” when the physics (slip, a heavy load, a flat battery) was the cause.'],
      },
    ],
    backHref: sim.src,
    backLabel: sim.title,
  }
}

function pathDeck(path: string): PresentDeck {
  return {
    id: `path-${path}`,
    title: 'R2BOT Kids',
    kicker: 'Present',
    phases: SHAPE_PHASES,
    slides: [
      { kind: 'embed', phase: 2, title: 'R2BOT Kids', src: framed(path), note: 'Freeze to draw on it; slow motion for replays.' },
      { kind: 'vote', phase: 3, title: 'Predict', questions: predictVote() },
      { kind: 'ask', phase: 3, title: 'Ask the class', prompts: ['What did you notice?', 'What would you try next?', 'How could a real robot do this?'], listenFor: [] },
    ],
    backHref: path,
    backLabel: 'Back',
  }
}

/** Parse the URL's search params into a source, or null for the chooser. */
export function parsePresentSource(q: Record<string, string | string[] | undefined>): PresentSource | null {
  const one = (k: string) => (Array.isArray(q[k]) ? q[k]?.[0] : q[k]) as string | undefined
  const session = one('session')
  if (session) {
    const m = /^([1-4])-(\d{1,2})$/.exec(session)
    if (m) return { kind: 'session', level: Number(m[1]), number: Number(m[2]), unplugged: one('unplugged') === '1' && m[1] === '1' }
  }
  const ep = one('episode')
  if (ep && /^[a-z0-9-]{1,64}$/.test(ep)) return { kind: 'episode', slug: ep }
  const sim = one('sim')
  if (sim === 'lab' || sim === 'power') return { kind: 'sim', id: sim }
  const path = safeKidsPath(one('path'))
  if (path) return { kind: 'path', path }
  return null
}

export function buildDeck(src: PresentSource): PresentDeck | null {
  switch (src.kind) {
    case 'session':
      return src.unplugged ? unpluggedDeck(src.number) : sessionDeck(src.level, src.number)
    case 'episode':
      return episodeDeck(src.slug)
    case 'sim':
      return simDeck(src.id)
    case 'path':
      return pathDeck(src.path)
  }
}

/** What the chooser lists. */
export function presentCatalogue() {
  return {
    levels: [1, 2, 3, 4].map((level) => ({
      level,
      name: levelByNumber(level as 1 | 2 | 3 | 4).name,
      ages: levelByNumber(level as 1 | 2 | 3 | 4).ages,
      sessions: sessionsOf(level).map((s) => ({ number: s.number, title: s.title })),
    })),
    episodes: EPISODES.map((e) => ({ slug: e.slug, title: e.title, band: e.band })),
    sims: (Object.keys(SIMS) as (keyof typeof SIMS)[]).map((id) => ({ id, title: SIMS[id].title })),
  }
}
