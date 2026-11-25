// lib/kids/code-lab/types.ts
// The shapes shared by the Code Lab interpreter, the missions, the editor and
// the 3D arena. Pure data — no React, no three.js — so the verifier can run
// every mission's reference solution in Node with the same interpreter the
// child's browser uses.

import type { Capability } from '../robot-design'
import type { BandId } from '../bands'

export type BlockType =
  | 'forward'
  | 'left'
  | 'right'
  | 'repeat'
  | 'repeatUntil'
  | 'ifWall'
  | 'ifColor'
  | 'ifLine'
  | 'pickup'
  | 'drop'
  | 'penDown'
  | 'penUp'
  | 'lightOn'
  | 'say'

export type TileColor = 'red' | 'green' | 'blue' | 'yellow'

/** 0 = north (up the grid), 1 = east, 2 = south, 3 = west. */
export type Dir = 0 | 1 | 2 | 3

interface BaseBlock {
  id: string
}
export interface ForwardBlock extends BaseBlock {
  type: 'forward'
  n: number
}
export interface SimpleBlock extends BaseBlock {
  type: 'left' | 'right' | 'pickup' | 'drop' | 'penDown' | 'penUp' | 'lightOn'
}
export interface SayBlock extends BaseBlock {
  type: 'say'
  text: string
}
export interface RepeatBlock extends BaseBlock {
  type: 'repeat'
  n: number
  body: Block[]
}
export interface RepeatUntilBlock extends BaseBlock {
  type: 'repeatUntil'
  body: Block[]
}
export interface IfSenseBlock extends BaseBlock {
  type: 'ifWall' | 'ifLine'
  body: Block[]
  elseBody: Block[]
}
export interface IfColorBlock extends BaseBlock {
  type: 'ifColor'
  color: TileColor
  body: Block[]
  elseBody: Block[]
}

export type Block = ForwardBlock | SimpleBlock | SayBlock | RepeatBlock | RepeatUntilBlock | IfSenseBlock | IfColorBlock
export type ContainerBlock = RepeatBlock | RepeatUntilBlock | IfSenseBlock | IfColorBlock
export type IfBlock = IfSenseBlock | IfColorBlock

export function isContainer(b: Block): b is ContainerBlock {
  return b.type === 'repeat' || b.type === 'repeatUntil' || b.type === 'ifWall' || b.type === 'ifLine' || b.type === 'ifColor'
}
export function hasElse(b: Block): b is IfBlock {
  return b.type === 'ifWall' || b.type === 'ifLine' || b.type === 'ifColor'
}

/**
 * One arena layout. Each character of `rows` is a tile:
 *   .  floor            #  wall             S  start (floor)      G  goal flag
 *   *  gem              r g b y  coloured floor (red/green/blue/yellow)
 *   =  black line       s  sand             k  rocks
 *   d  dark floor       D  dark floor with a gem
 *   o  box to pick up   X  drop zone        Y  yellow tile with a box   B  blue drop zone
 */
export interface ArenaDef {
  rows: string[]
  /** Direction the robot faces at the start. */
  dir: Dir
  /** For drawing missions: the polyline (grid points) the pen must trace. */
  drawPath?: [number, number][]
}

export interface WinRule {
  /** End on the goal flag. */
  goal?: boolean
  /** Collect every gem. */
  gems?: boolean
  /** Every box sits on a drop zone, and the robot is not holding one. */
  deliver?: boolean
  /** The pen trail matches the arena's drawPath exactly. */
  draw?: boolean
}

export interface Mission {
  id: string
  band: BandId
  /** Position inside the band (1-based). Missions unlock in this order. */
  order: number
  title: string
  emoji: string
  /** Two or three sentences of story. */
  story: string
  /** What the child learns, for the page and for grown-ups. */
  learningGoal: string
  /** The task in one line. */
  task: string
  /** Capabilities the robot needs for this mission. */
  needs: Capability[]
  /** Blocks offered in the palette. */
  palette: BlockType[]
  /** One or more layouts. The same program must win on every one (that is what makes a sensor necessary). */
  arenas: ArenaDef[]
  win: WinRule
  /** Block types the program must use (the lesson of the mission). */
  mustUse?: BlockType[]
  /** Blocks allowed for three stars. */
  budget: number
  hints: string[]
  /** Reference solution, checked by verify.ts against the real interpreter. */
  solution: Block[]
}

/** What the browser needs: everything except the answer. */
export type MissionPublic = Omit<Mission, 'solution'>
