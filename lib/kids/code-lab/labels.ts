// lib/kids/code-lab/labels.ts
// Child-friendly words for capabilities and slots, shared by the Workshop and the Code Lab.

import type { Capability, Slot } from '../robot-design'

export const CAPABILITY_LABEL: Record<Capability, string> = {
  move: 'drive around',
  'see-wall': 'see walls',
  'see-color': 'see colours',
  'follow-line': 'follow lines',
  'feel-bump': 'feel bumps',
  grab: 'pick things up',
  draw: 'draw pictures',
  light: 'light up the dark',
  'rough-ground': 'cross sand and rocks',
  'show-face': 'show feelings',
}

export const SLOT_LABEL: Record<Slot, string> = {
  body: 'Body',
  drive: 'Moves with',
  head: 'Head',
  tool: 'Tool',
  sensor: 'Floor sensor',
}

export const SLOT_ORDER: Slot[] = ['body', 'drive', 'head', 'tool', 'sensor']
