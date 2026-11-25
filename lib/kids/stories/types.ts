// lib/kids/stories/types.ts
// The Story Theatre script format. An episode is plain data (no functions) so
// the server page can render its transcript and hand the same object to the
// client player as a prop.

import type { BandId } from '../bands'

/** Everyone who can stand on the stage. `narrator` never appears on stage. */
export type CharacterId = 'spark' | 'amara' | 'lucia' | 'bolt' | 'zippy' | 'rover'
export type SpeakerId = CharacterId | 'narrator'

export type Emotion = 'neutral' | 'happy' | 'sad' | 'surprised' | 'worried' | 'thinking' | 'excited'

/** One-off body animations a character can play. */
export type Action = 'hop' | 'spin' | 'shake' | 'nod' | 'bounce' | 'tumble' | 'wobble' | 'zigzag'

export type Motion = 'walk' | 'fly' | 'hop' | 'drive' | 'teleport'

export type BackgroundId =
  | 'workshop'
  | 'kitchen'
  | 'street'
  | 'garden'
  | 'mars'
  | 'hospital'
  | 'factory'
  | 'classroom'
  | 'control-room'

export type PropId =
  | 'sense-think-act'
  | 'robot-vacuum'
  | 'rc-car'
  | 'teddy'
  | 'instruction-cards'
  | 'street-map'
  | 'bump-sensor'
  | 'ultrasonic'
  | 'bat-echo'
  | 'light-sensor'
  | 'repeat-block'
  | 'watering-can'
  | 'traffic-light'
  | 'if-else'
  | 'colour-sensor'
  | 'broom-balance'
  | 'gyro'
  | 'feedback-loop'
  | 'line-sensor'
  | 'p-control'
  | 'earth-mars'
  | 'rover-cameras'

export type Sfx = 'boing' | 'whoosh' | 'beep' | 'bonk' | 'pop' | 'splash' | 'zap' | 'woof' | 'ding' | 'crash' | 'rumble'

export interface CastMember {
  who: CharacterId
  /** Horizontal position, 0 (left edge) to 100 (right edge). Off-stage: < 0 or > 100. */
  x: number
  /** Lift above the floor in stage units (0 = standing on the floor). */
  lift?: number
  facing?: 'left' | 'right'
  emotion?: Emotion
  /** 1 = normal size. */
  scale?: number
  /** Costume change, e.g. Spark on two wheels instead of hover jets. */
  variant?: 'wheels'
}

export type Lighting = 'day' | 'dim' | 'dark'

export type Beat =
  | { kind: 'say'; who: CharacterId; text: string; emotion?: Emotion }
  | { kind: 'narrate'; text: string }
  | {
      kind: 'move'
      who: CharacterId
      to: number
      lift?: number
      motion?: Motion
      ms?: number
      face?: 'left' | 'right'
      /** false = start the move and carry straight on (moves run in parallel). */
      wait?: boolean
    }
  | { kind: 'act'; who: CharacterId; action: Action; emotion?: Emotion }
  | { kind: 'emote'; who: CharacterId; emotion: Emotion }
  | { kind: 'face'; who: CharacterId; face: 'left' | 'right' }
  | { kind: 'camera'; zoom: number; x?: number; y?: number; ms?: number; wait?: boolean }
  | { kind: 'prop'; prop: PropId; label: string; at?: 'left' | 'center' | 'right' }
  | { kind: 'hideProp' }
  | { kind: 'sfx'; sound: Sfx }
  | { kind: 'pause'; ms: number }
  | { kind: 'lights'; level: Lighting }
  | { kind: 'choice'; who: CharacterId; prompt: string; options: ChoiceOption[] }

export interface ChoiceOption {
  label: string
  correct: boolean
  /** Played after the pick. Wrong picks then return to the choice; right picks continue the story. */
  beats: Beat[]
}

export interface Scene {
  id: string
  title: string
  background: BackgroundId
  lighting?: Lighting
  cast: CastMember[]
  beats: Beat[]
}

export interface QuizQuestion {
  q: string
  options: string[]
  /** Index into options. */
  answer: number
  explain: string
}

export interface Episode {
  slug: string
  band: BandId
  /** Order within the band (1, 2). */
  order: number
  title: string
  /** One line that sells the story. */
  logline: string
  /** The single concept the episode teaches. */
  concept: string
  /** Where the story happens, in words. */
  setting: string
  /** Two or three sentences for parents and search engines. */
  synopsis: string
  /** What your child learns: 3–4 plain-language outcomes. */
  learns: string[]
  /** A grown-up note on the real-world facts in the episode. */
  factNote: string
  /** Where to try the idea hands-on. */
  handsOn: { href: string; label: string; why: string }
  /** Short ISO date for lastmod / dateModified. */
  updated: string
  scenes: Scene[]
  quiz: [QuizQuestion, QuizQuestion, QuizQuestion]
}

export interface TranscriptLine {
  speaker: string
  text: string
  /** 'line' = spoken; 'choice' = a decision point; 'option' = one choice option; 'scene' = scene heading. */
  type: 'line' | 'scene' | 'choice' | 'option'
  correct?: boolean
}
