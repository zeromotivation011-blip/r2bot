// lib/kids/episodes/plan.ts
// Turns a voiced episode (episode.json) into a shooting plan for the 3D player:
// which set each scene happens on, the time of day and weather, who is in
// shot, which props and effects explain the idea, the camera shot for every
// line, and a timeline of beats (title card → "Last time…" → scenes →
// "Next time…"). Pure and deterministic — the same episode always gives the
// same film, which is what lets record-episode.mjs mux audio to the video.

import type { CharacterId } from '../curriculum/types'
import type { EpisodeData, EpisodeLineData, EpisodeSceneData, VoicedText } from './types'
import joinAudio from './interaction-audio.json'
import { interactionsFor, type ChoiceOption, type TurnIcon } from './interactions'

export type SetId =
  | 'hill'
  | 'workshop'
  | 'garden'
  | 'street'
  | 'bakery'
  | 'square'
  | 'market'
  | 'school'
  | 'library'
  | 'townhall'
  | 'harbour'
  | 'beach'
  | 'bridge'
  | 'lighthouse'
  | 'tunnel'
  | 'house'
  | 'maze'
  | 'tower'

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'
export type GuestId = 'okafor' | 'noor' | 'adaeze' | 'mei' | 'haruto' | 'diego' | 'ingrid' | 'lollipop'
export type CastId = 'spark' | 'amara' | 'lucia' | 'bolt' | 'myrobot' | GuestId
export type CloseUp = 'under' | 'xray' | 'top' | 'robot-eye' | 'table' | null

export type SceneEffect =
  | 'lights-fly'
  | 'clock-light'
  | 'wind'
  | 'bats'
  | 'grid'
  | 'ball'
  | 'sketch'
  | 'festival'
  | 'if-sign'
  | 'distance'
  | 'headlight'
  | 'splash'
  | 'thought'
  | 'kit'
  | 'crowd'
  | 'ship'
  | 'boat-bottle'
  | 'toaster'

export type LineEffect = 'beam' | 'think' | 'arrow-forward' | 'arrow-left' | 'arrow-right' | 'drive' | 'cheer'

/** ots = over the listener's shoulder onto the speaker; insert = a cut-in on the child's robot (the part being explained). */
export type ShotKind = 'establish' | 'wide' | 'close' | 'close-front' | 'two' | 'ots' | 'top' | 'robot-eye' | 'low' | 'under' | 'insert'

export interface Shot {
  kind: ShotKind
  subject: CastId | null
  other: CastId | null
  /** −1 or 1: which side of the 180° line the close-up is taken from. */
  side: number
}

export interface ScenePlan {
  index: number
  set: SetId
  time: TimeOfDay
  fog: boolean
  closeUp: CloseUp
  cast: CastId[]
  effects: SceneEffect[]
  /** Scenes written to play after the child shares a project. */
  afterShare: boolean
  /** Extras (townspeople) in the background. */
  extras: number
  setting: string
  action: string
}

/** A voiced clip outside the script: Spark reading a question, a reply or a "your turn". */
export interface AsideClip {
  file: string
  dur: number
  env: string
}

export interface ChoiceBeat {
  prompt: string
  options: ChoiceOption[]
  /** Spark reads the question and its options (for children who cannot read yet). */
  promptClip: AsideClip | null
  /** One reply per option, same order. */
  replyClips: (AsideClip | null)[]
}

type JoinAudio = Record<string, Record<string, { prompt: AsideClip; replies: AsideClip[] }>>

function joinClips(sessionId: string, after: number): { prompt: AsideClip; replies: AsideClip[] } | null {
  const e = (joinAudio as unknown as JoinAudio)[sessionId]?.[String(after)]
  if (!e?.prompt?.file) return null
  const strip = (c: AsideClip): AsideClip => ({ file: c.file, dur: c.dur, env: c.env })
  return { prompt: strip(e.prompt), replies: (e.replies ?? []).map(strip) }
}

export interface TurnBeat {
  prompt: string
  say: string | null
  icon: TurnIcon
}

/**
 * title / previously / next: the bookends. establish: the scene's opening shot
 * (the cast walks on). line: a voiced line. react: a reaction cutaway to a
 * listener. insert: a cut-in on the child's robot with the part's label.
 * choice: the film waits for the child's answer. turn: a timed "your turn" hold.
 */
export type BeatKind = 'title' | 'previously' | 'card' | 'establish' | 'line' | 'react' | 'insert' | 'choice' | 'turn' | 'next'

export interface Beat {
  kind: BeatKind
  /** Scene index, or −1 for the title / previously / next beats. */
  scene: number
  start: number
  dur: number
  shot: Shot
  /** The voiced clip for this beat (title, previously, a line, next). */
  clip: VoicedText | EpisodeLineData | null
  who: CharacterId | null
  /** The speaking actor in the 3D scene, if any. */
  speaker: CastId | null
  lineEffects: LineEffect[]
  labels: string[]
  choice: ChoiceBeat | null
  /** For 'turn' beats. */
  turn?: TurnBeat
  /** For 'card' beats. */
  cardText?: string
}

export interface EpisodePlan {
  scenes: ScenePlan[]
  beats: Beat[]
  duration: number
  /** The set shown under the title card and "Last time…". */
  openingSet: SetId
}

// ── Scene classification ─────────────────────────────────────────────────────

function low(s: string): string {
  return s.toLowerCase().replace(/[’‘]/g, "'")
}

/** Which set a scene happens on, or null to stay where the last scene was. */
export function classifySet(setting: string): SetId | null {
  const s = low(setting)
  const has = (...w: string[]) => w.some((x) => s.includes(x))
  if (has('clock tower') && has('inside', 'ramp', 'gear', 'door')) return 'tower'
  if (has('ramp after ramp', 'clock face', 'top of the tower', 'halfway up')) return 'tower'
  if (has('lantern hill at night', 'climbing a hill')) return 'hill'
  if (has('tunnel')) return 'tunnel'
  if (has('maze', 'hedge')) return 'maze'
  if (has('lighthouse')) return 'lighthouse'
  if (has('bridge')) return 'bridge'
  if (has('fish market', 'beach')) return 'beach'
  if (has('harbour', 'dock', 'slipway', 'on the ramp', 'chalkboard')) return 'harbour'
  if (has('library')) return 'library'
  if (has('town hall') || s.startsWith('the banner')) return 'townhall'
  if (has('square', 'fountain', 'bandstand', 'stage area', 'festival')) return 'square'
  if (has('market', 'stall')) return 'market'
  if (has('bakery lane', 'kerb', 'outside the bakery', 'zebra crossing', 'on the street', 'street')) return 'street'
  if (has('school', 'playground', 'slide')) return 'school'
  if (has('bakery', 'bread basket')) return 'bakery'
  if (has("nana lucía's cosy house", "nana lucia's cosy house", "lucía's house", 'kitchen', 'living room')) return 'house'
  if (has('garden', 'doorstep', 'flowerpot', 'hillside')) return 'garden'
  if (has('workshop')) return 'workshop'
  return null
}

function classifyTime(text: string): TimeOfDay | null {
  const s = low(text)
  if (/\b(night|pitch black|darkness)\b/.test(s) && !s.includes('night of a hundred')) return 'night'
  if (/\b(evening|sunset|dusk)\b/.test(s)) return 'evening'
  if (/\bmorning\b/.test(s)) return 'morning'
  if (/\b(noon|sun in|sunny)\b/.test(s)) return 'day'
  return null
}

function classifyCloseUp(setting: string): CloseUp {
  const s = low(setting)
  if (s.includes('x-ray')) return 'xray'
  if (s.includes('under the robot')) return 'under'
  if (s.includes("robot's-eye")) return 'robot-eye'
  if (s.includes('from above')) return 'top'
  if (/^(close|the robot with|the cards laid|workshop table\. the robot)/.test(s)) return 'table'
  return null
}

const GUEST_KEYS: [RegExp, GuestId][] = [
  [/okafor/i, 'okafor'],
  [/noor/i, 'noor'],
  [/adaeze/i, 'adaeze'],
  [/\bmei\b/i, 'mei'],
  [/haruto/i, 'haruto'],
  [/diego/i, 'diego'],
  [/ingrid/i, 'ingrid'],
  [/lollipop/i, 'lollipop'],
]

export function guestIdOf(name: string | null | undefined): GuestId | null {
  if (!name) return null
  for (const [re, id] of GUEST_KEYS) if (re.test(name)) return id
  return null
}

export function castIdOf(who: CharacterId, guestName: string | null): CastId | null {
  if (who === 'narrator') return null
  if (who === 'guest') return guestIdOf(guestName) ?? 'okafor'
  return who
}

function sceneEffects(text: string, set: SetId): SceneEffect[] {
  const s = low(text)
  const out = new Set<SceneEffect>()
  if (/(blow|blew|fly away|flew away|pop off)/.test(s) && s.includes('light')) out.add('lights-fly')
  if (/(clock light|light glows|glows inside|glowing float|glow inside|faint(ly)? glow|pale glow|glows faintly|the light )/.test(s)) out.add('clock-light')
  if (/\bwind\b/.test(s)) out.add('wind')
  if (/\bbats?\b/.test(s)) out.add('bats')
  if (/(grid map|squares drawn)/.test(s)) out.add('grid')
  if (/\bball\b/.test(s)) out.add('ball')
  if (/(sketch|planning sheet|chalkboard|cards laid|step plan|program cards|eight blocks|patterns)/.test(s)) out.add('sketch')
  if (/(festival day|garlands|paper lanterns|after the dance|after the children|hundred lights|juggler)/.test(s)) out.add('festival')
  if (/"if"|“if”|\bif\b sign/.test(text.toLowerCase())) out.add('if-sign')
  if (/distance number/.test(s)) out.add('distance')
  if (/(headlight|torch|lit by the robot)/.test(s)) out.add('headlight')
  if (/(puddle|splash|plops)/.test(s)) out.add('splash')
  if (/thought bubble/.test(s)) out.add('thought')
  if (/four different robot bodies/.test(s)) out.add('kit')
  if (/(crowd|townspeople|families|children waiting|people setting up|children running|class\b)/.test(s)) out.add('crowd')
  if (set === 'bridge' && /(ship|sails)/.test(s)) out.add('ship')
  if (/paper boat/.test(s)) out.add('boat-bottle')
  if (/toaster/.test(s)) out.add('toaster')
  return [...out]
}

function sceneCast(sc: EpisodeSceneData, episodeNumber: number, sceneIndex: number, set: SetId): CastId[] {
  const text = `${sc.setting} ${sc.action}`
  const cast = new Set<CastId>()
  for (const l of sc.lines) {
    const id = castIdOf(l.who, l.guestName)
    if (id) cast.add(id)
  }
  if (/spark/i.test(text)) cast.add('spark')
  if (/amara/i.test(text)) cast.add('amara')
  if (/nana|lucía|lucia/i.test(text)) cast.add('lucia')
  if (/\bBolt\b/.test(text)) cast.add('bolt')
  for (const [re, id] of GUEST_KEYS) if (re.test(text)) cast.add(id)
  const robotMentioned = /\bthe robot\b|child’s new robot|child's new robot|robot’s|robot's|its eyes light/i.test(text)
  const robotExists = episodeNumber > 1 || /new robot|its eyes light|workshop floor/i.test(text) || sceneIndex >= 5
  if (robotExists && (robotMentioned || episodeNumber > 1)) cast.add('myrobot')
  const narratorOnly = sc.lines.every((l) => l.who === 'narrator')
  if (narratorOnly && set === 'hill') return []
  if (!narratorOnly) cast.add('spark')
  const order: CastId[] = ['myrobot', 'bolt', 'spark', 'amara', 'lucia', 'okafor', 'noor', 'adaeze', 'mei', 'haruto', 'diego', 'ingrid', 'lollipop']
  return order.filter((c) => cast.has(c))
}

// ── Line analysis ───────────────────────────────────────────────────────────

const CONCEPTS: [RegExp, string][] = [
  [/\bsense\b/i, 'SENSE'],
  [/\bthink\b/i, 'THINK'],
  [/\bact\b/i, 'ACT'],
  [/\bprogram\b/i, 'PROGRAM'],
  [/\brepeat\b/i, 'REPEAT'],
  [/\bloop\b/i, 'LOOP'],
  [/\bbug\b/i, 'BUG'],
  [/\bbattery\b/i, 'BATTERY'],
  [/\bbrain\b/i, 'BRAIN'],
  [/\bmotors?\b/i, 'MOTOR'],
  [/\bwheels?\b/i, 'WHEELS'],
  [/\bsensors?\b/i, 'SENSOR'],
  [/\bbumper\b/i, 'BUMPER'],
  [/\becho\b/i, 'ECHO'],
  [/\bfriction\b|\bgrip\b/i, 'GRIP'],
  [/\bheavy\b|\bload\b/i, 'LOAD'],
  [/\bslope\b|\bramp\b/i, 'SLOPE'],
  [/\bwait\b/i, 'WAIT'],
  [/\bpen down\b/i, 'PEN DOWN'],
  [/\bpen up\b/i, 'PEN UP'],
  [/\bIF\b|[“"]if[”"]/, 'IF'],
  [/\bsquare\b/i, 'SQUARE'],
  [/\bsteps?\b/i, 'STEPS'],
  [/\bsafe(ty)?\b/i, 'SAFE'],
  [/\bplan\b/i, 'PLAN'],
  [/\bcentimet/i, 'CM'],
]

export function lineLabels(text: string): string[] {
  const out: string[] = []
  for (const [re, label] of CONCEPTS) if (re.test(text) && !out.includes(label)) out.push(label)
  return out.slice(0, 3)
}

export function lineEffects(text: string, who: CharacterId): LineEffect[] {
  const s = low(text)
  const out: LineEffect[] = []
  if (/\b(see|sees|sensor|sensors|eyes|echo|distance|camera|feel|feels|bumper|touch|hear|hears|listen)\b/.test(s)) out.push('beam')
  if (/\b(think|thinks|brain|program|decide|computer|rule|plan)\b/.test(s)) out.push('think')
  if (/\b(turn|turning)\b.*\bleft\b|\bleft\b.*\bturn/.test(s)) out.push('arrow-left')
  else if (/\b(turn|turning)\b.*\bright\b|\bright\b.*\bturn/.test(s)) out.push('arrow-right')
  else if (/\b(forward|go|drive|drives|roll|rolls|wheee|move|moves)\b/.test(s)) out.push('arrow-forward')
  if (who === 'myrobot' && /\b(forward|go|going|drive|wheee|crossing|made it|hop|turn|turning|bump)\b/.test(s)) out.push('drive')
  if (/\b(found|made it|hooray|yay|well done|we did it|done)\b/.test(s)) out.push('cheer')
  return out
}

// ── The plan ────────────────────────────────────────────────────────────────

const GAP = 0.45
/** Labels worth a cut-in on the robot itself. */
const PART_LABELS = new Set(['BATTERY', 'BRAIN', 'MOTOR', 'WHEELS', 'SENSOR', 'BUMPER', 'ECHO', 'PEN DOWN', 'PEN UP'])
const SCENE_GAP = 0.55

function addressesChild(text: string): boolean {
  return /\byou\b|\byour\b/i.test(text) && !/thank you/i.test(text)
}

export function planEpisode(ep: EpisodeData): EpisodePlan {
  const scenes: ScenePlan[] = []
  let lastSet: SetId = 'workshop'
  let lastTime: TimeOfDay = 'day'
  let lastFog = false
  ep.scenes.forEach((sc, i) => {
    const set = classifySet(sc.setting) ?? (i === 0 ? classifySet(sc.action) ?? 'workshop' : lastSet)
    const text = `${sc.setting} ${sc.action}`
    const tod = classifyTime(i === 0 ? `${ep.title}. ${sc.setting}` : sc.setting) ?? (i === 0 && set === 'hill' ? 'night' : lastTime)
    const fogNow = /\bfog/i.test(text) ? true : set !== lastSet && !['house', 'garden', 'maze', 'tunnel'].includes(set) ? false : lastFog
    const closeUp = classifyCloseUp(sc.setting)
    const effects = sceneEffects(text, set)
    const cast = sceneCast(sc, ep.number, i, set)
    const afterShare = /after (the child|sharing|the children)|plays after|certificate moment/i.test(text)
    let extras = effects.includes('crowd') || effects.includes('festival') ? 7 : 0
    if (set === 'market' || set === 'square') extras = Math.max(extras, 3)
    if (set === 'school' && /children|class/i.test(text)) extras = 6
    scenes.push({ index: i, set, time: tod, fog: fogNow, closeUp, cast, effects, afterShare, extras, setting: sc.setting, action: sc.action })
    lastSet = set
    lastTime = tod
    lastFog = fogNow
  })

  const beats: Beat[] = []
  let t = 0
  const none: Shot = { kind: 'establish', subject: null, other: null, side: 1 }
  const push = (b: Omit<Beat, 'start'>) => {
    beats.push({ ...b, start: t })
    t += b.dur
  }

  const openingSet: SetId = ep.number === 1 ? 'hill' : scenes[0]?.set ?? 'hill'
  push({ kind: 'title', scene: -1, dur: Math.max(4.4, ep.titleCard.dur + 1.6), shot: none, clip: ep.titleCard, who: 'narrator', speaker: null, lineEffects: [], labels: [], choice: null })
  if (ep.previously) {
    push({ kind: 'previously', scene: -1, dur: ep.previously.dur + 0.9, shot: { ...none, kind: 'wide' }, clip: ep.previously, who: 'narrator', speaker: null, lineEffects: [], labels: [], choice: null })
  }

  const interactions = new Map(interactionsFor(ep.sessionId).map((x) => [x.after, x]))
  let inserts = 0
  let reacts = 0
  let lastFront = -9
  let lineCount = 0
  ep.scenes.forEach((sc, si) => {
    const plan = scenes[si]
    if (plan.afterShare) {
      push({ kind: 'card', scene: si, dur: 2.6, shot: none, clip: null, who: null, speaker: null, lineEffects: [], labels: [], choice: null, cardText: 'After you share your project…' })
    }
    const firstIsNarrator = sc.lines[0]?.who === 'narrator'
    // The action moment before the dialogue: long enough for the cast to walk on
    // and the set to read, longer when the script gives the scene time for it.
    const voiced = sc.lines.reduce((n, l) => n + l.dur + GAP, 0)
    const estDur = plan.closeUp ? 2 : firstIsNarrator ? 1.8 : Math.min(4.6, Math.max(3, (sc.seconds - voiced) * 0.3))
    const estKind: ShotKind = plan.closeUp === 'top' ? 'top' : plan.closeUp === 'robot-eye' ? 'robot-eye' : 'establish'
    push({ kind: 'establish', scene: si, dur: estDur, shot: { kind: estKind, subject: null, other: null, side: 1 }, clip: null, who: null, speaker: null, lineEffects: [], labels: [], choice: null })

    let prevSpeaker: CastId | null = null
    let side = 1
    let run = 0
    const robotOnSet = plan.cast.includes('myrobot')
    sc.lines.forEach((ln, li) => {
      lineCount++
      const speaker = castIdOf(ln.who, ln.guestName)
      const listener = (except: CastId | null): CastId | null =>
        (prevSpeaker && prevSpeaker !== except ? prevSpeaker : null) ??
        plan.cast.find((c) => c !== except && (c === 'amara' || c === 'spark' || c === 'lucia')) ??
        plan.cast.find((c) => c !== except) ??
        null
      // "Watch Bolt…": cut to the one we are told to watch.
      const watch = /\bwatch (bolt|the robot|amara|spark|nana)\b/i.exec(ln.text)?.[1].toLowerCase()
      const watched: CastId | null = watch === 'bolt' ? 'bolt' : watch === 'the robot' ? 'myrobot' : watch === 'amara' ? 'amara' : watch === 'spark' ? 'spark' : watch === 'nana' ? 'lucia' : null
      let shot: Shot
      if (plan.closeUp === 'top') shot = { kind: 'top', subject: speaker, other: null, side }
      else if (plan.closeUp === 'robot-eye') shot = { kind: 'robot-eye', subject: speaker, other: null, side }
      else if (plan.closeUp === 'under' || plan.closeUp === 'xray') shot = { kind: li % 2 === 0 ? 'under' : 'close', subject: li % 2 === 0 ? 'myrobot' : speaker, other: null, side }
      else if (!speaker) shot = { kind: li % 2 === 0 ? 'wide' : 'establish', subject: null, other: null, side }
      else if (watched && plan.cast.includes(watched) && watched !== speaker) shot = { kind: 'close', subject: watched, other: speaker, side: -side }
      else if (speaker === 'myrobot') shot = { kind: 'low', subject: 'myrobot', other: null, side }
      else if (addressesChild(ln.text) && (speaker === 'lucia' || speaker === 'spark' || speaker === 'amara') && lineCount - lastFront >= 3) {
        // Talking to the child: straight down the lens — but not every time.
        lastFront = lineCount
        shot = { kind: 'close-front', subject: speaker, other: null, side }
      } else if (li === 0 && !firstIsNarrator) shot = { kind: 'wide', subject: speaker, other: null, side }
      else if (prevSpeaker && prevSpeaker !== speaker && li % 3 === 1) shot = { kind: 'ots', subject: speaker, other: prevSpeaker, side }
      else if (prevSpeaker && prevSpeaker !== speaker && li % 3 === 2) shot = { kind: 'two', subject: speaker, other: prevSpeaker, side }
      else if (prevSpeaker === speaker) {
        // The same character again: vary the size of the shot, not just the side.
        run++
        side = -side
        const l = listener(speaker)
        if (run % 3 === 1 && l) shot = { kind: 'two', subject: speaker, other: l, side }
        else if (run % 3 === 2 && l) shot = { kind: 'ots', subject: speaker, other: l, side }
        else shot = { kind: 'wide', subject: speaker, other: null, side }
      } else {
        run = 0
        const l = listener(speaker)
        shot = l && addressesChild(ln.text) ? { kind: 'two', subject: speaker, other: l, side } : { kind: 'close', subject: speaker, other: prevSpeaker, side }
      }
      const effects = lineEffects(ln.text, ln.who)
      const labels = lineLabels(ln.text)
      const lastInScene = li === sc.lines.length - 1
      // The robot keeps driving a moment after it speaks: the demo, not just the words.
      const demo = speaker === 'myrobot' && effects.includes('drive') ? 1.2 : 0
      const inter = interactions.get(ln.i)
      push({ kind: 'line', scene: si, dur: ln.dur + GAP + demo + (lastInScene && !inter ? SCENE_GAP : 0), shot, clip: ln, who: ln.who, speaker, lineEffects: effects, labels, choice: null })

      const audio = inter ? joinClips(ep.sessionId, ln.i) : null
      const host: CastId | null = plan.cast.includes('spark') ? 'spark' : speaker
      if (inter?.kind === 'choice') {
        // Everyone turns to the child. The film waits here until they answer;
        // the beat itself is the reaction after the answer.
        push({
          kind: 'choice',
          scene: si,
          dur: 1.1,
          shot: { kind: 'wide', subject: speaker ?? 'spark', other: null, side },
          clip: null,
          who: null,
          speaker: null,
          lineEffects: [],
          labels: [],
          choice: { prompt: inter.prompt, options: inter.options, promptClip: audio?.prompt ?? null, replyClips: inter.options.map((_, k) => audio?.replies[k] ?? null) },
        })
      } else if (inter?.kind === 'turn') {
        // Spark says "Your turn!…", then the film holds while the child joins in.
        const clip = audio && host === 'spark' ? { ...audio.prompt, text: inter.prompt, words: [] } : null
        push({
          kind: 'turn',
          scene: si,
          dur: inter.seconds + (clip ? clip.dur + 0.2 : 0),
          shot: { kind: 'close-front', subject: host ?? 'spark', other: null, side },
          clip,
          who: clip ? 'spark' : null,
          speaker: clip ? 'spark' : null,
          lineEffects: [],
          labels: [],
          choice: null,
          turn: { prompt: inter.prompt, say: inter.say ?? null, icon: inter.icon },
        })
        lastFront = lineCount
      } else if (robotOnSet && inserts < 4 && labels.some((l) => PART_LABELS.has(l)) && speaker !== 'myrobot' && !plan.closeUp) {
        // Cut in on the part being explained.
        inserts++
        push({ kind: 'insert', scene: si, dur: 2.2, shot: { kind: 'insert', subject: 'myrobot', other: speaker, side: inserts % 2 ? 1 : -1 }, clip: null, who: null, speaker: null, lineEffects: [], labels: labels.filter((l) => PART_LABELS.has(l)), choice: null })
      } else if (speaker && !lastInScene && !plan.closeUp && reacts < 6 && li % 3 === 2) {
        // A reaction cutaway: a listener takes the line in.
        const next = castIdOf(sc.lines[li + 1].who, sc.lines[li + 1].guestName)
        const r = (['bolt', 'myrobot', 'amara', 'spark', 'lucia'] as CastId[]).find((c) => plan.cast.includes(c) && c !== speaker && c !== next)
        if (r) {
          reacts++
          push({ kind: 'react', scene: si, dur: 1.15, shot: { kind: 'close', subject: r, other: speaker, side: -side }, clip: null, who: null, speaker: null, lineEffects: [], labels: [], choice: null })
        }
      }
      if (lastInScene && inter) t += SCENE_GAP
      if (speaker) prevSpeaker = speaker
    })
  })

  const last = scenes[scenes.length - 1]
  push({
    kind: 'next',
    scene: last ? last.index : -1,
    dur: ep.cliffhanger.dur + 1.8,
    shot: { kind: 'establish', subject: null, other: null, side: 1 },
    clip: ep.cliffhanger,
    who: 'narrator',
    speaker: null,
    lineEffects: [],
    labels: [],
    choice: null,
  })
  return { scenes, beats, duration: t, openingSet }
}

/** The beat playing at episode time t (binary search). */
export function beatAt(plan: EpisodePlan, t: number): number {
  const b = plan.beats
  let lo = 0
  let hi = b.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (b[mid].start <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}
