// lib/kids/stories/script.ts
// Tiny builders so episode scripts read like a screenplay. They return plain
// Beat objects; nothing here runs at play time.

import type { Action, Beat, CharacterId, ChoiceOption, Emotion, Lighting, Motion, PropId, Sfx } from './types'

export const say = (who: CharacterId, text: string, emotion?: Emotion): Beat => ({ kind: 'say', who, text, emotion })
export const narrate = (text: string): Beat => ({ kind: 'narrate', text })
export const move = (
  who: CharacterId,
  to: number,
  opts: { motion?: Motion; ms?: number; face?: 'left' | 'right'; wait?: boolean; lift?: number } = {},
): Beat => ({ kind: 'move', who, to, ...opts })
export const act = (who: CharacterId, action: Action, emotion?: Emotion): Beat => ({ kind: 'act', who, action, emotion })
export const emote = (who: CharacterId, emotion: Emotion): Beat => ({ kind: 'emote', who, emotion })
export const face = (who: CharacterId, dir: 'left' | 'right'): Beat => ({ kind: 'face', who, face: dir })
export const camera = (zoom: number, x?: number, y?: number, ms?: number): Beat => ({ kind: 'camera', zoom, x, y, ms })
export const prop = (p: PropId, label: string, at?: 'left' | 'center' | 'right'): Beat => ({ kind: 'prop', prop: p, label, at })
export const hideProp = (): Beat => ({ kind: 'hideProp' })
export const sfx = (sound: Sfx): Beat => ({ kind: 'sfx', sound })
export const pause = (ms: number): Beat => ({ kind: 'pause', ms })
export const lights = (level: Lighting): Beat => ({ kind: 'lights', level })
export const choice = (who: CharacterId, prompt: string, options: ChoiceOption[]): Beat => ({ kind: 'choice', who, prompt, options })
export const right = (label: string, beats: Beat[]): ChoiceOption => ({ label, correct: true, beats })
export const wrong = (label: string, beats: Beat[]): ChoiceOption => ({ label, correct: false, beats })
