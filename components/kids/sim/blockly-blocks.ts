// components/kids/sim/blockly-blocks.ts
// Blockly definitions for the SHARED BLOCK SET (block types = the ids in
// lib/kids/sim/program.ts), the kids theme, and the per-challenge toolbox with
// blocks locked when the robot lacks the part. Only imported by the sim page's
// client code, which is itself loaded with next/dynamic({ ssr: false }).

import * as Blockly from 'blockly/core'
import type { Capability } from '@/lib/kids/robot-design'
import { CAPABILITY_NEEDS } from '@/lib/kids/robot-design'
import { HAT } from '@/lib/kids/sim/blockly-json'
import { blockNeeds } from '@/lib/kids/sim/program'

type Style = 'hat_blocks' | 'motion_blocks' | 'sensor_blocks' | 'control_blocks' | 'logic_blocks' | 'math_blocks' | 'action_blocks' | 'var_blocks'

const STYLE_COLOURS: Record<Style, string> = {
  hat_blocks: '#F59E0B',
  motion_blocks: '#3B82F6',
  sensor_blocks: '#10B981',
  control_blocks: '#F59E0B',
  logic_blocks: '#F97316',
  math_blocks: '#8B5CF6',
  action_blocks: '#EC4899',
  var_blocks: '#A855F7',
}

let defined = false
let theme: Blockly.Theme | null = null

const num = (name: string) => ({ type: 'input_value', name, check: 'Number' })
const stmt = (style: Style, type: string, message0: string, args0: object[] = [], tooltip = '') => ({
  type,
  message0,
  args0,
  previousStatement: null,
  nextStatement: null,
  inputsInline: true,
  style,
  tooltip,
})
const reporter = (type: string, message0: string, output: 'Number' | 'Boolean' | 'String', tooltip: string) => ({
  type,
  message0,
  output,
  style: 'sensor_blocks',
  tooltip,
})

export function defineBlocks(): void {
  if (defined) return
  defined = true
  Blockly.common.defineBlocksWithJsonArray([
    { type: HAT, message0: '▶ when Run is pressed', nextStatement: null, style: 'hat_blocks', tooltip: 'Your program starts here.' },
    // Motion
    stmt('motion_blocks', 'drive_for', '🚗 drive at %1 %% speed for %2 seconds', [num('SPEED'), num('SECONDS')], 'Drive straight. Negative speed drives backwards.'),
    stmt('motion_blocks', 'drive_distance', '📏 drive %1 cm at %2 %% speed', [num('CM'), num('SPEED')], 'Counts wheel turns (encoders). If the wheels slip, the robot goes less far than it thinks!'),
    stmt('motion_blocks', 'turn_degrees', '↻ turn %1 ° at %2 %% speed', [num('DEG'), num('SPEED')], 'Positive turns left, negative turns right (like maths and real robots). Uses the gyro. Fast turns can overshoot.'),
    stmt('motion_blocks', 'set_motors', '⚙️ motors: left %1 %% right %2 %%', [num('LEFT'), num('RIGHT')], 'Set each side’s motor and keep going. Different speeds make the robot curve.'),
    stmt('motion_blocks', 'stop', '✋ stop motors', [], 'Stop both motors. A fast robot still rolls a little!'),
    stmt('motion_blocks', 'wait', '⏳ wait %1 seconds', [num('SECONDS')], 'Do nothing for a while (the motors keep doing what they were doing).'),
    // Sensors
    reporter('distance_cm', '👀 distance cm', 'Number', 'How far the nearest thing ahead is, in centimetres. Needs Distance Eyes or a Camera Eye.'),
    reporter('line_seen', '〰️ line seen?', 'Boolean', 'True when the line sensor sees the black line. Needs a Line Sensor.'),
    reporter('line_offset', '〰️ line offset', 'Number', 'From -1 (line is to the left) to 1 (line is to the right). Needs a Line Sensor.'),
    reporter('floor_color', '🎨 floor colour', 'String', 'The colour of the floor. Needs a Colour Sensor or a Camera Eye (a camera needs light!).'),
    reporter('bumped', '🛡️ bumped?', 'Boolean', 'True while the bumper is pressed. Needs a Bumper Switch.'),
    reporter('heading_deg', '🧭 heading °', 'Number', 'Which way the robot faces, 0–360, from the built-in gyro.'),
    reporter('timer_s', '⏱️ timer s', 'Number', 'Seconds since Run was pressed.'),
    // Control
    {
      type: 'repeat',
      message0: '🔁 repeat %1 times',
      args0: [num('TIMES')],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
      tooltip: 'Do the blocks inside again and again.',
    },
    {
      type: 'repeat_until',
      message0: '🔁 repeat until %1',
      args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
      tooltip: 'Keep doing the blocks inside until the question is true. Checks every moment.',
    },
    {
      type: 'forever',
      message0: '♾️ forever',
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      style: 'control_blocks',
      tooltip: 'Keep going until the time runs out.',
    },
    {
      type: 'if',
      message0: '❓ if %1 then',
      args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'if_else',
      message0: '❓ if %1 then',
      args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      message2: 'else',
      message3: '%1',
      args3: [{ type: 'input_statement', name: 'ELSE' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'compare',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A' },
        { type: 'field_dropdown', name: 'OP', options: [['<', '<'], ['>', '>'], ['=', '=']] },
        { type: 'input_value', name: 'B' },
      ],
      inputsInline: true,
      output: 'Boolean',
      style: 'logic_blocks',
    },
    { type: 'and', message0: '%1 and %2', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'input_value', name: 'B', check: 'Boolean' }], inputsInline: true, output: 'Boolean', style: 'logic_blocks' },
    { type: 'or', message0: '%1 or %2', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'input_value', name: 'B', check: 'Boolean' }], inputsInline: true, output: 'Boolean', style: 'logic_blocks' },
    { type: 'not', message0: 'not %1', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }], inputsInline: true, output: 'Boolean', style: 'logic_blocks' },
    { type: 'number', message0: '%1', args0: [{ type: 'field_number', name: 'NUM', value: 0 }], output: 'Number', style: 'math_blocks' },
    { type: 'text', message0: '“%1”', args0: [{ type: 'field_input', name: 'TEXT', text: 'green' }], output: 'String', style: 'math_blocks' },
    {
      type: 'math',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A', check: 'Number' },
        { type: 'field_dropdown', name: 'OP', options: [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/']] },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      style: 'math_blocks',
    },
    stmt('var_blocks', 'set_var', '📦 set %1 to %2', [{ type: 'field_input', name: 'VAR', text: 'x' }, num('VALUE')]),
    stmt('var_blocks', 'change_var', '📦 change %1 by %2', [{ type: 'field_input', name: 'VAR', text: 'x' }, num('BY')]),
    { type: 'get_var', message0: '📦 %1', args0: [{ type: 'field_input', name: 'VAR', text: 'x' }], output: 'Number', style: 'var_blocks' },
    // Actions
    stmt('action_blocks', 'grip_open', '🦾 open claw', [], 'Needs a Gripper Claw or a Scoop.'),
    stmt('action_blocks', 'grip_close', '🦾 close claw', [], 'Grabs a thing touching the claw. Needs a Gripper Claw or a Scoop.'),
    stmt('action_blocks', 'pen_down', '🖊️ pen down', [], 'Start drawing. Needs a Drawing Pen.'),
    stmt('action_blocks', 'pen_up', '🖊️ pen up', [], 'Stop drawing. Needs a Drawing Pen.'),
    stmt('action_blocks', 'light_on', '🔦 light on', [], 'Needs a Headlight.'),
    stmt('action_blocks', 'light_off', '🔦 light off', [], 'Needs a Headlight.'),
    stmt('action_blocks', 'say', '💬 say %1', [{ type: 'input_value', name: 'TEXT' }]),
    stmt('action_blocks', 'beep', '🔔 beep'),
  ])
}

export function kidsTheme(): Blockly.Theme {
  if (theme) return theme
  const blockStyles: Record<string, Partial<Blockly.Theme.BlockStyle>> = {}
  for (const [k, c] of Object.entries(STYLE_COLOURS)) blockStyles[k] = { colourPrimary: c, hat: k === 'hat_blocks' ? 'cap' : '' }
  theme = Blockly.Theme.defineTheme('r2kids', {
    name: 'r2kids',
    base: Blockly.Themes.Classic,
    blockStyles,
    categoryStyles: {},
    componentStyles: {
      workspaceBackgroundColour: '#111C32',
      toolboxBackgroundColour: '#19263F',
      toolboxForegroundColour: '#F5F3FF',
      flyoutBackgroundColour: '#19263F',
      flyoutForegroundColour: '#EEF2F8',
      flyoutOpacity: 0.96,
      scrollbarColour: '#3A4A66',
      insertionMarkerColour: '#FFFFFF',
      insertionMarkerOpacity: 0.3,
      cursorColour: '#F59E0B',
    },
    fontStyle: { family: 'ui-rounded, system-ui, sans-serif', weight: '700', size: 14 },
    startHats: true,
  })
  return theme
}

// ── Toolbox ───────────────────────────────────────────────────────────────
type Shadow = { shadow: { type: string; fields: Record<string, string | number> } }
const n = (v: number): Shadow => ({ shadow: { type: 'number', fields: { NUM: v } } })
const t = (v: string): Shadow => ({ shadow: { type: 'text', fields: { TEXT: v } } })

const DEFAULT_INPUTS: Record<string, Record<string, Shadow>> = {
  drive_for: { SPEED: n(50), SECONDS: n(2) },
  drive_distance: { CM: n(30), SPEED: n(50) },
  turn_degrees: { DEG: n(90), SPEED: n(40) },
  set_motors: { LEFT: n(50), RIGHT: n(50) },
  wait: { SECONDS: n(1) },
  repeat: { TIMES: n(4) },
  compare: { A: n(0), B: n(15) },
  math: { A: n(0), B: n(1) },
  set_var: { VALUE: n(0) },
  change_var: { BY: n(1) },
  say: { TEXT: t('Hello!') },
}

const GROUPS: { name: string; colour: string; ids: string[] }[] = [
  { name: '🚗 Move', colour: STYLE_COLOURS.motion_blocks, ids: ['drive_for', 'drive_distance', 'turn_degrees', 'set_motors', 'stop', 'wait'] },
  { name: '👀 Sense', colour: STYLE_COLOURS.sensor_blocks, ids: ['distance_cm', 'line_seen', 'line_offset', 'floor_color', 'bumped', 'heading_deg', 'timer_s'] },
  { name: '🔁 Control', colour: STYLE_COLOURS.control_blocks, ids: ['repeat', 'repeat_until', 'forever', 'if', 'if_else', 'compare', 'and', 'or', 'not'] },
  { name: '🔢 Maths', colour: STYLE_COLOURS.math_blocks, ids: ['number', 'text', 'math', 'set_var', 'change_var', 'get_var'] },
  { name: '✋ Do', colour: STYLE_COLOURS.action_blocks, ids: ['grip_open', 'grip_close', 'pen_down', 'pen_up', 'light_on', 'light_off', 'say', 'beep'] },
]

export interface LockedBlock {
  id: string
  needs: Capability
}

/** Category toolbox with only the challenge's blocks. Blocks the robot cannot use are shown greyed out with a padlock note. */
export function buildToolbox(allowed: string[], caps: Set<Capability>): { toolbox: Blockly.utils.toolbox.ToolboxDefinition; locked: LockedBlock[] } {
  const locked: LockedBlock[] = []
  const contents: Blockly.utils.toolbox.ToolboxItemInfo[] = []
  for (const g of GROUPS) {
    const items: Blockly.utils.toolbox.FlyoutItemInfo[] = []
    for (const id of g.ids) {
      if (!allowed.includes(id)) continue
      const need = blockNeeds(id)
      const isLocked = need !== null && !caps.has(need)
      if (isLocked && need) locked.push({ id, needs: need })
      const inputs = DEFAULT_INPUTS[id]
      items.push({ kind: 'block', type: id, ...(inputs ? { inputs } : {}), ...(isLocked ? { disabled: true } : {}) } as Blockly.utils.toolbox.BlockInfo)
      if (isLocked && need) items.push({ kind: 'label', text: `🔒 needs ${CAPABILITY_NEEDS[need]}` })
    }
    if (items.length > 0) contents.push({ kind: 'category', name: g.name, colour: g.colour, contents: items })
  }
  return { toolbox: { kind: 'categoryToolbox', contents }, locked }
}
