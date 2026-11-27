// lib/kids/unplugged/grid.ts
//
// The "human robot" floor grid (roadmap #85). A mission is a small map of
// squares — taped on the floor, chalked in the yard, or printed on paper for
// a desk — and a program of command cards. One child is the robot and does
// exactly what the cards say; the class checks the result.
//
// runMission() plays a program on the map the way the human robot would, so
// lib/kids/unplugged/verify.ts can prove every printed answer key is right
// (and every printed "buggy" program really has a bug).
//
// Map legend (one character per square, top row first):
//   .  floor           #  blocked (a chair, a box, a bucket — the robot must not walk into it)
//   S  start           G  goal
//   L  a light (lantern, ball, tin) the robot can scoop up
//   +  a square the pen must draw on (drawing missions)
//   ~  ice: "Hop forward" onto ice slides one extra square; "Creep forward" does not
//   D  dark: the robot must have its light on when it steps here
//   P  people cross here (use "Wait until the path is clear")
//   W  a lift bridge (wait for the bridge keeper's arms to come down)

import type { CardId } from './cards'

export type Heading = 'up' | 'right' | 'down' | 'left'

export interface Step {
  card: CardId
  /** Repeat count, wait seconds. */
  n?: number
  /** Words for "Say". */
  text?: string
  /** Cards inside a Repeat / If. */
  body?: Step[]
}

export interface FloorMission {
  title: string
  /** What the class is asked, read aloud. */
  ask: string
  rows: string[]
  heading: Heading
  /** The cards handed out for this mission (the deck). */
  deck: CardId[]
  /** One correct program (the answer key on the teacher's sheet). */
  solution: Step[]
  /** A program with one bug, for "find the bug" lessons. */
  buggy?: Step[]
  /** The robot starts holding something (it was scooped earlier in the story). */
  startCarrying?: boolean
  /** Finish when the robot reaches G at any moment (sensor rules that keep going). */
  stopAtGoal?: boolean
  /** Must end back on the start square. */
  endAtStart?: boolean
  /** The light must be delivered to G (scoop it, carry it, tip it out at G). */
  deliver?: boolean
  /** Cards the program must use (e.g. a Repeat, a Say). */
  mustUse?: CardId[]
  /** Most cards allowed (counting a loop and its insides). */
  maxCards?: number
}

export interface RunResult {
  ok: boolean
  /** Kind words for the answer sheet and the verify output. */
  reason: string
  end: { col: number; row: number; heading: Heading }
  /** Squares visited, in order, including the start. */
  path: { col: number; row: number }[]
  cardsUsed: number
}

const DIRS: Record<Heading, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }
const ORDER: Heading[] = ['up', 'right', 'down', 'left']
const turn = (h: Heading, by: 1 | -1): Heading => ORDER[(ORDER.indexOf(h) + by + 4) % 4]

export function findCell(rows: string[], ch: string): { col: number; row: number } | null {
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].indexOf(ch)
    if (c >= 0) return { col: c, row: r }
  }
  return null
}

export function countCards(steps: Step[]): number {
  return steps.reduce((n, s) => n + 1 + (s.body ? countCards(s.body) : 0), 0)
}

function usesCard(steps: Step[], id: CardId): boolean {
  return steps.some((s) => s.card === id || (s.body ? usesCard(s.body, id) : false))
}

class Fail extends Error {}

/** Play a program on a mission's map, as the human robot would. */
export function runMission(m: FloorMission, program: Step[]): RunResult {
  const rows = m.rows
  const start = findCell(rows, 'S')
  if (!start) throw new Error(`${m.title}: no start square`)
  const goal = findCell(rows, 'G')
  let col = start.col
  let row = start.row
  let heading = m.heading
  let carrying = Boolean(m.startCarrying)
  let light = false
  let pen = false
  let bumped = false
  let delivered = false
  let reachedGoal = false
  let ticks = 0
  const taken = new Set<string>()
  const drawn = new Set<string>()
  const path = [{ col, row }]

  const at = (c: number, r: number): string => (r < 0 || r >= rows.length || c < 0 || c >= rows[r].length ? 'X' : rows[r][c])
  const blocked = (c: number, r: number): boolean => at(c, r) === 'X' || at(c, r) === '#'
  const key = (c: number, r: number) => `${c},${r}`
  const ahead = (): [number, number] => [col + DIRS[heading][0], row + DIRS[heading][1]]

  const enter = (c: number, r: number) => {
    col = c
    row = r
    path.push({ col, row })
    if (at(col, row) === 'D' && !light) throw new Fail(`walked into the dark at square (${col + 1}, ${row + 1}) with the light off`)
    if (pen) drawn.add(key(col, row))
    if (at(col, row) === 'G') reachedGoal = true
  }

  const move = (dc: number, dr: number, slide: boolean) => {
    const nc = col + dc
    const nr = row + dr
    if (blocked(nc, nr)) throw new Fail(`bumped into ${at(nc, nr) === 'X' ? 'the edge of the map' : 'something'} at square (${nc + 1}, ${nr + 1})`)
    enter(nc, nr)
    if (slide && at(col, row) === '~') {
      // A hop onto ice slides one more square — into whatever is there.
      if (blocked(col + dc, row + dr)) throw new Fail(`hopped onto the ice at square (${col + 1}, ${row + 1}) and slid into ${at(col + dc, row + dr) === 'X' ? 'the edge' : 'the canal'}`)
      enter(col + dc, row + dr)
    }
  }

  const exec = (steps: Step[]) => {
    for (const s of steps) {
      if (m.stopAtGoal && reachedGoal) return
      if (++ticks > 500) throw new Fail('never stopped')
      switch (s.card) {
        case 'forward':
          move(DIRS[heading][0], DIRS[heading][1], true)
          bumped = false
          break
        case 'back':
          move(-DIRS[heading][0], -DIRS[heading][1], false)
          bumped = false
          break
        case 'creep': {
          const [nc, nr] = ahead()
          if (blocked(nc, nr)) bumped = true
          else {
            enter(nc, nr)
            bumped = false
          }
          break
        }
        case 'back-off':
          // After a bump the robot only leans back off the wall; otherwise it steps back.
          if (!bumped) move(-DIRS[heading][0], -DIRS[heading][1], false)
          bumped = false
          break
        case 'left':
          heading = turn(heading, -1)
          break
        case 'right':
          heading = turn(heading, 1)
          break
        case 'until-bump': {
          let guard = 0
          while (!blocked(...ahead())) {
            if (++guard > 50) throw new Fail('never felt a bump')
            enter(...ahead())
            if (m.stopAtGoal && reachedGoal) return
          }
          bumped = true
          break
        }
        case 'until-close': {
          let guard = 0
          while (!blocked(...ahead())) {
            if (++guard > 50) throw new Fail('never found anything close')
            enter(...ahead())
            if (m.stopAtGoal && reachedGoal) return
          }
          bumped = false
          break
        }
        case 'scoop':
          if (at(col, row) !== 'L' || taken.has(key(col, row))) throw new Fail(`scooped at square (${col + 1}, ${row + 1}) but there is nothing to pick up there`)
          if (carrying) throw new Fail('tried to scoop while already carrying something')
          taken.add(key(col, row))
          carrying = true
          break
        case 'tip':
          if (!carrying) throw new Fail('tipped out with nothing in the scoop')
          carrying = false
          if (at(col, row) === 'G') delivered = true
          break
        case 'pen-down':
          pen = true
          drawn.add(key(col, row))
          break
        case 'pen-up':
          pen = false
          break
        case 'light-on':
          light = true
          break
        case 'light-off':
          light = false
          break
        case 'repeat': {
          const n = s.n ?? 2
          for (let i = 0; i < n; i++) exec(s.body ?? [])
          break
        }
        case 'repeat-lots': {
          const n = s.n ?? 40
          for (let i = 0; i < n; i++) {
            if (m.stopAtGoal && reachedGoal) return
            exec(s.body ?? [])
          }
          break
        }
        case 'if-bump':
          if (bumped) exec(s.body ?? [])
          break
        case 'wait':
        case 'beep':
        case 'say':
        case 'until-clear':
          break
      }
    }
  }

  const cardsUsed = countCards(program)
  const result = (ok: boolean, reason: string): RunResult => ({ ok, reason, end: { col, row, heading }, path, cardsUsed })

  try {
    exec(program)
  } catch (e) {
    if (e instanceof Fail) return result(false, `The robot ${e.message}.`)
    throw e
  }

  for (const id of m.mustUse ?? []) {
    if (!usesCard(program, id)) return result(false, `The program needs a “${id}” card.`)
  }
  if (m.maxCards && cardsUsed > m.maxCards) return result(false, `The program uses ${cardsUsed} cards; the most allowed is ${m.maxCards}.`)
  if (m.deliver && !delivered) return result(false, 'The light was not tipped out at the goal.')
  if (light) return result(false, 'The light was left on at the end (switch it off to save the battery).')
  if (m.endAtStart) {
    if (col !== start.col || row !== start.row) return result(false, 'The robot did not end back where it started.')
  } else if (goal && !(m.stopAtGoal ? reachedGoal : col === goal.col && row === goal.row)) {
    return result(false, `The robot finished at square (${col + 1}, ${row + 1}), not on the goal.`)
  }

  const mustDraw = new Set<string>()
  rows.forEach((line, r) => line.split('').forEach((ch, c) => { if (ch === '+') mustDraw.add(key(c, r)) }))
  if (mustDraw.size) {
    for (const k of mustDraw) if (!drawn.has(k)) return result(false, 'Part of the picture was not drawn.')
    for (const k of drawn) {
      const [c, r] = k.split(',').map(Number)
      const ch = at(c, r)
      if (ch !== '+' && ch !== 'S' && ch !== 'G') return result(false, `The pen drew outside the picture at square (${c + 1}, ${r + 1}).`)
    }
  }
  return result(true, 'The robot did it.')
}

/** The program as words, for the printed answer key: "Hop forward ×2, Turn right, …". */
export function programText(steps: Step[], label: (id: CardId) => string): string {
  const out: string[] = []
  let i = 0
  while (i < steps.length) {
    const s = steps[i]
    if (s.body) {
      const inner = programText(s.body, label)
      out.push(s.card === 'repeat' ? `Repeat ${s.n ?? 2} × [ ${inner} ]` : `${label(s.card)} [ ${inner} ]`)
      i++
      continue
    }
    let run = 1
    while (i + run < steps.length && !steps[i + run].body && steps[i + run].card === s.card && !s.text && !s.n) run++
    const base = s.card === 'say' && s.text ? `Say “${s.text}”` : s.card === 'wait' && s.n ? `Wait ${s.n}` : label(s.card)
    out.push(run > 1 ? `${base} ×${run}` : base)
    i += run
  }
  return out.join(', ')
}
