// lib/kids/code-lab/blockly-defs.ts
//
// Blockly JSON definitions of the Code Lab grid blocks (roadmap #21). Pure
// data (no Blockly import): the browser registers them with
// Blockly.common.defineBlocksWithJsonArray next to the shared set
// (components/kids/sim/blockly-blocks.ts), and verify.ts registers the same
// array in a headless Blockly to prove every reference solution is a valid
// Blockly program.
//
// Every block is drawn in its shared style (colour family) and starts with the
// shared emoji, so a picture comes first on every block. Numbers, colours and
// phrases are dropdowns: tap to choose, never type.

import { BLOCK_INFO, SAY_PHRASES } from './blocks'
import { FORWARD_MAX, GRID_TYPE, REPEAT_MAX } from './blockly-format'
import { CODE_LAB_TO_SHARED } from './shared-vocabulary'
import type { BlockType, TileColor } from './types'

export type GridBlockDef = Record<string, unknown> & { type: string; style: string }

const range = (lo: number, hi: number): [string, string][] => Array.from({ length: hi - lo + 1 }, (_, i) => [String(lo + i), String(lo + i)])

/** Colour choices with a picture first (🟥 red …), for the If-on-colour block. */
export const COLOR_OPTIONS: [string, TileColor][] = [
  ['🟦 blue', 'blue'],
  ['🟨 yellow', 'yellow'],
  ['🟥 red', 'red'],
  ['🟩 green', 'green'],
]

const style = (t: BlockType) => CODE_LAB_TO_SHARED[t].style
const label = (t: BlockType) => `${BLOCK_INFO[t].emoji} ${BLOCK_INFO[t].label}`

const statement = (t: BlockType, message0: string, args0: object[], tooltip: string): GridBlockDef => ({
  type: GRID_TYPE[t],
  message0,
  args0,
  previousStatement: null,
  nextStatement: null,
  inputsInline: true,
  style: style(t),
  tooltip,
})

const ifElse = (t: BlockType, message0: string, args0: object[], tooltip: string): GridBlockDef => ({
  type: GRID_TYPE[t],
  message0,
  args0,
  message1: '%1',
  args1: [{ type: 'input_statement', name: 'DO' }],
  message2: 'else (otherwise)',
  message3: '%1',
  args3: [{ type: 'input_statement', name: 'ELSE' }],
  previousStatement: null,
  nextStatement: null,
  style: style(t),
  tooltip,
})

export const GRID_BLOCK_DEFS: GridBlockDef[] = [
  statement('forward', `${label('forward')} %1`, [{ type: 'field_dropdown', name: 'N', options: range(1, FORWARD_MAX) }], 'Drive forward this many squares.'),
  statement('left', label('left'), [], 'Turn a quarter turn to the robot’s own left.'),
  statement('right', label('right'), [], 'Turn a quarter turn to the robot’s own right.'),
  {
    type: GRID_TYPE.repeat,
    message0: `${BLOCK_INFO.repeat.emoji} Repeat %1 times`,
    args0: [{ type: 'field_dropdown', name: 'TIMES', options: range(1, REPEAT_MAX) }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    style: style('repeat'),
    tooltip: 'Do the blocks inside again and again.',
  },
  {
    type: GRID_TYPE.repeatUntil,
    message0: label('repeatUntil'),
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    style: style('repeatUntil'),
    tooltip: 'Keep doing the blocks inside until the robot is on the flag.',
  },
  ifElse('ifWall', label('ifWall'), [], 'Checks the square in front. Needs eyes that see walls.'),
  ifElse('ifColor', `${BLOCK_INFO.ifColor.emoji} If on %1`, [{ type: 'field_dropdown', name: 'COLOR', options: COLOR_OPTIONS }], 'Checks the colour under the robot. Needs a colour sensor.'),
  ifElse('ifLine', label('ifLine'), [], 'Checks for the black line in front. Needs a line sensor.'),
  statement('pickup', label('pickup'), [], 'Pick up the box the robot is standing on. Needs a gripper.'),
  statement('drop', label('drop'), [], 'Put the box down here. Needs a gripper.'),
  statement('penDown', label('penDown'), [], 'Start drawing. Needs a drawing pen.'),
  statement('penUp', label('penUp'), [], 'Stop drawing. Needs a drawing pen.'),
  statement('lightOn', label('lightOn'), [], 'Turn the headlight on for dark caves. Needs a headlight.'),
  statement('say', `${BLOCK_INFO.say.emoji} Say %1`, [{ type: 'field_dropdown', name: 'TEXT', options: SAY_PHRASES.map((p) => [p, p]) }], 'Show a message. Pick one of the phrases.'),
]
