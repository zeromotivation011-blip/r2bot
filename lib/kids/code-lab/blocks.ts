// lib/kids/code-lab/blocks.ts
// The block catalogue: labels, colours, which capability each block needs,
// creating fresh blocks, counting them, and the Python-style view.

import type { Capability } from '../robot-design'
import type { Block, BlockType, TileColor } from './types'

export interface BlockInfo {
  type: BlockType
  label: string
  emoji: string
  /** Tailwind classes for the block chip. */
  tone: string
  group: 'move' | 'loop' | 'sense' | 'tool'
}

export const BLOCK_INFO: Record<BlockType, BlockInfo> = {
  forward: { type: 'forward', label: 'Move forward', emoji: '⬆️', tone: 'bg-sky-500 text-white', group: 'move' },
  left: { type: 'left', label: 'Turn left', emoji: '↺', tone: 'bg-sky-500 text-white', group: 'move' },
  right: { type: 'right', label: 'Turn right', emoji: '↻', tone: 'bg-sky-500 text-white', group: 'move' },
  repeat: { type: 'repeat', label: 'Repeat', emoji: '🔁', tone: 'bg-amber-500 text-black', group: 'loop' },
  repeatUntil: { type: 'repeatUntil', label: 'Repeat until at 🏁', emoji: '🔂', tone: 'bg-amber-500 text-black', group: 'loop' },
  ifWall: { type: 'ifWall', label: 'If wall ahead', emoji: '🧱', tone: 'bg-violet-500 text-white', group: 'sense' },
  ifColor: { type: 'ifColor', label: 'If on colour', emoji: '🎨', tone: 'bg-violet-500 text-white', group: 'sense' },
  ifLine: { type: 'ifLine', label: 'If line ahead', emoji: '〰️', tone: 'bg-violet-500 text-white', group: 'sense' },
  pickup: { type: 'pickup', label: 'Pick up', emoji: '🦾', tone: 'bg-emerald-500 text-black', group: 'tool' },
  drop: { type: 'drop', label: 'Drop', emoji: '📥', tone: 'bg-emerald-500 text-black', group: 'tool' },
  penDown: { type: 'penDown', label: 'Pen down', emoji: '🖊️', tone: 'bg-emerald-500 text-black', group: 'tool' },
  penUp: { type: 'penUp', label: 'Pen up', emoji: '✋', tone: 'bg-emerald-500 text-black', group: 'tool' },
  lightOn: { type: 'lightOn', label: 'Light on', emoji: '🔦', tone: 'bg-emerald-500 text-black', group: 'tool' },
  say: { type: 'say', label: 'Say', emoji: '💬', tone: 'bg-pink-500 text-white', group: 'tool' },
}

/** The capability a block needs. Blocks not listed work on every robot that can move. */
export const BLOCK_NEEDS: Partial<Record<BlockType, Capability>> = {
  forward: 'move',
  left: 'move',
  right: 'move',
  ifWall: 'see-wall',
  ifColor: 'see-color',
  ifLine: 'follow-line',
  pickup: 'grab',
  drop: 'grab',
  penDown: 'draw',
  penUp: 'draw',
  lightOn: 'light',
}

export const TILE_COLORS: TileColor[] = ['red', 'green', 'blue', 'yellow']
export const COLOR_HEX: Record<TileColor, string> = { red: '#EF4444', green: '#22C55E', blue: '#3B82F6', yellow: '#FACC15' }

/** Friendly phrases for the Say block. Fixed choices: children never type free text that could hold personal details. */
export const SAY_PHRASES = ['Hello!', 'Beep boop!', 'I did it!', 'Found a gem!', 'Stop!', 'Watch out!'] as const

let seq = 0
export function newId(): string {
  seq += 1
  return `b${Date.now().toString(36)}${seq.toString(36)}`
}

export function createBlock(type: BlockType): Block {
  const id = newId()
  switch (type) {
    case 'forward':
      return { id, type, n: 1 }
    case 'repeat':
      return { id, type, n: 2, body: [] }
    case 'repeatUntil':
      return { id, type, body: [] }
    case 'ifWall':
    case 'ifLine':
      return { id, type, body: [], elseBody: [] }
    case 'ifColor':
      return { id, type, color: 'blue', body: [], elseBody: [] }
    case 'say':
      return { id, type, text: SAY_PHRASES[0] }
    default:
      return { id, type }
  }
}

export function countBlocks(list: Block[]): number {
  let n = 0
  for (const b of list) {
    n += 1
    if (b.type === 'repeat' || b.type === 'repeatUntil') n += countBlocks(b.body)
    else if (b.type === 'ifWall' || b.type === 'ifLine' || b.type === 'ifColor') n += countBlocks(b.body) + countBlocks(b.elseBody)
  }
  return n
}

export function usedTypes(list: Block[], into: Set<BlockType> = new Set()): Set<BlockType> {
  for (const b of list) {
    into.add(b.type)
    if (b.type === 'repeat' || b.type === 'repeatUntil') usedTypes(b.body, into)
    else if (b.type === 'ifWall' || b.type === 'ifLine' || b.type === 'ifColor') {
      usedTypes(b.body, into)
      usedTypes(b.elseBody, into)
    }
  }
  return into
}

/** A one-line, human label for a block, as shown in the editor. */
export function blockText(b: Block): string {
  switch (b.type) {
    case 'forward':
      return `Move forward ${b.n}`
    case 'repeat':
      return `Repeat ${b.n} times`
    case 'ifColor':
      return `If on ${b.color}`
    case 'say':
      return `Say “${b.text}”`
    default:
      return BLOCK_INFO[b.type].label
  }
}

// ── Python-style view ──────────────────────────────────────────────────────
const LOOP_VARS = ['i', 'j', 'k', 'm', 'n']

export function toPython(list: Block[]): string {
  const lines: string[] = []
  const emit = (blocks: Block[], depth: number, loopDepth: number) => {
    const pad = '    '.repeat(depth)
    if (blocks.length === 0) {
      lines.push(`${pad}pass`)
      return
    }
    for (const b of blocks) {
      switch (b.type) {
        case 'forward':
          lines.push(`${pad}robot.forward(${b.n})`)
          break
        case 'left':
          lines.push(`${pad}robot.turn_left()`)
          break
        case 'right':
          lines.push(`${pad}robot.turn_right()`)
          break
        case 'pickup':
          lines.push(`${pad}robot.pick_up()`)
          break
        case 'drop':
          lines.push(`${pad}robot.drop()`)
          break
        case 'penDown':
          lines.push(`${pad}robot.pen_down()`)
          break
        case 'penUp':
          lines.push(`${pad}robot.pen_up()`)
          break
        case 'lightOn':
          lines.push(`${pad}robot.light_on()`)
          break
        case 'say':
          lines.push(`${pad}robot.say(${JSON.stringify(b.text)})`)
          break
        case 'repeat':
          lines.push(`${pad}for ${LOOP_VARS[loopDepth % LOOP_VARS.length]} in range(${b.n}):`)
          emit(b.body, depth + 1, loopDepth + 1)
          break
        case 'repeatUntil':
          lines.push(`${pad}while not robot.at_goal():`)
          emit(b.body, depth + 1, loopDepth)
          break
        case 'ifWall':
        case 'ifLine':
        case 'ifColor': {
          const cond =
            b.type === 'ifColor' ? `robot.on_color("${b.color}")` : b.type === 'ifWall' ? 'robot.wall_ahead()' : 'robot.line_ahead()'
          lines.push(`${pad}if ${cond}:`)
          emit(b.body, depth + 1, loopDepth)
          if (b.elseBody.length > 0) {
            lines.push(`${pad}else:`)
            emit(b.elseBody, depth + 1, loopDepth)
          }
          break
        }
      }
    }
  }
  if (list.length === 0) return '# Tap a block to start your program'
  emit(list, 0, 0)
  return lines.join('\n')
}
