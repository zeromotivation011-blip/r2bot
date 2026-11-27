// lib/kids/code-lab/shared-vocabulary.ts
//
// ONE BLOCK LANGUAGE (roadmap #21) — what is shared today, and why Code Lab is
// not (yet) a Blockly editor.
//
// R2BOT Kids has one block vocabulary, the SHARED BLOCK SET in
// lib/kids/sim/program.ts (Blockly in the Physics Lab and course challenges,
// the tap-only picture blocks for ages 5–7 in PictureProgramClient). Code Lab's
// 24 missions run on a flat GRID (one tile per step, quarter turns), with its own
// interpreter, so its blocks are the grid-sized versions of shared blocks:
// "Move forward 2" is `drive_distance` measured in tiles, "If wall ahead" is
// `if` + the `distance_cm` sensor, "Pick up" is `grip_close`, and so on.
//
// This file makes that relation explicit and checked (code-lab/verify.ts):
//   - every Code Lab block names the shared block it stands for;
//   - the same robot part locks it in both editors (BLOCK_NEEDS here ==
//     blockNeeds() of the shared block, `move` aside: every robot moves);
//   - the colours are the shared set's colours (the `STYLE_COLOURS` in
//     components/kids/sim/blockly-blocks.ts), group for group, and the emoji are
//     the shared blocks' emoji — so a child who moves from Code Lab (5–10) to the
//     Physics Lab (8–17) recognises every block by colour and picture.
//
// Why not port the missions to Blockly now (recorded 27 Nov 2026):
//   1. Code Lab's editor is tap-only with ≥48 px targets and full switch/keyboard
//      access; Blockly is drag-first and its touch targets on a 390 px phone are
//      ~28 px. For 5–7-year-olds that is a regression the access checklist
//      (lib/kids/access.verify.ts) would flag, and PictureProgramClient — the
//      shared set's own young-child editor — exists precisely to avoid it.
//   2. The grid interpreter is what makes the missions fair and verifiable
//      (code-lab/verify.ts runs every reference solution on every arena). The
//      continuous Rapier sim cannot replace it without re-tuning all 24 missions
//      and their 3-star budgets.
//   3. The product review (§ "Move #21 out of Wave 1") schedules the port with
//      Level 2, the first course that needs blocks beyond the picture set.
// The port path, when it comes: render Code Lab palettes with the Blockly
// blocks named below (grid-unit fields instead of cm/degrees), compile the
// workspace to the Code Lab `Block` tree, keep this interpreter and verify.

import type { BlockType } from './types'

/** The shared set's block-style colours (mirror of STYLE_COLOURS in components/kids/sim/blockly-blocks.ts). */
export const SHARED_STYLE_COLOURS = {
  hat_blocks: '#EA580C',
  motion_blocks: '#2563EB',
  sensor_blocks: '#059669',
  control_blocks: '#D97706',
  logic_blocks: '#B45309',
  math_blocks: '#0891B2',
  var_blocks: '#0E7490',
  action_blocks: '#DB2777',
} as const

export type SharedStyle = keyof typeof SHARED_STYLE_COLOURS

export interface SharedBlockRef {
  /** The shared-set statement this block is the grid version of. */
  stmt: string
  /** For the sensing IFs: the shared sensor reporter the condition reads. */
  sensor?: string
  /** The shared style (colour family) it is drawn in. */
  style: SharedStyle
  /** The emoji the shared block carries, shown on the Code Lab chip too. */
  emoji: string
}

export const CODE_LAB_TO_SHARED: Record<BlockType, SharedBlockRef> = {
  forward: { stmt: 'drive_distance', style: 'motion_blocks', emoji: '🚗' },
  left: { stmt: 'turn_degrees', style: 'motion_blocks', emoji: '↺' },
  right: { stmt: 'turn_degrees', style: 'motion_blocks', emoji: '↻' },
  repeat: { stmt: 'repeat', style: 'control_blocks', emoji: '🔁' },
  repeatUntil: { stmt: 'repeat_until', style: 'control_blocks', emoji: '🔁' },
  ifWall: { stmt: 'if_else', sensor: 'distance_cm', style: 'sensor_blocks', emoji: '👀' },
  ifColor: { stmt: 'if_else', sensor: 'floor_color', style: 'sensor_blocks', emoji: '🎨' },
  ifLine: { stmt: 'if_else', sensor: 'line_seen', style: 'sensor_blocks', emoji: '〰️' },
  pickup: { stmt: 'grip_close', style: 'action_blocks', emoji: '🦾' },
  drop: { stmt: 'grip_open', style: 'action_blocks', emoji: '🦾' },
  penDown: { stmt: 'pen_down', style: 'action_blocks', emoji: '🖊️' },
  penUp: { stmt: 'pen_up', style: 'action_blocks', emoji: '🖊️' },
  lightOn: { stmt: 'light_on', style: 'action_blocks', emoji: '🔦' },
  say: { stmt: 'say', style: 'action_blocks', emoji: '💬' },
}

/**
 * Chip classes per shared style: the shared colour as the fill, with the ink
 * that passes WCAG AA for the chip's 15–16 px bold label (white on blue 5.2:1 and
 * pink 4.6:1; dark ink #1A1103 on green 5.0:1 and amber 5.9:1).
 */
export const SHARED_STYLE_CHIP: Record<'motion_blocks' | 'sensor_blocks' | 'control_blocks' | 'action_blocks', string> = {
  motion_blocks: 'bg-[#2563EB] text-white',
  sensor_blocks: 'bg-[#059669] text-[#1A1103]',
  control_blocks: 'bg-[#D97706] text-[#1A1103]',
  action_blocks: 'bg-[#DB2777] text-white',
}
