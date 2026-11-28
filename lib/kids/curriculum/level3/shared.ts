// lib/kids/curriculum/level3/shared.ts
// Building blocks for Level 3 (Inventors, ages 11–13, "Ridgeback Station"):
// the word blocks, the station's arenas and the cast.
//
// Level 3 conventions (the simulator contract in ../types.ts and the engine):
// - Blocks are word blocks with real units, and children type the numbers.
//   Variables are named by the child (count, gain, error, state…).
// - line_offset runs −1…1 and is POSITIVE when the line is to the robot's
//   right (the Physics Lab "Follow the line" reference steers with
//   left = base + k × offset, right = base − k × offset).
// - heading_deg is a compass heading: 0 = "up" the map, 90 = right. It GROWS
//   as the robot turns right (clockwise). Heading-hold arenas use a target of
//   90° so the 359° → 0° wrap never appears in a child's maths.
// - distance_cm reads 200 when no echo comes back (the sensor's maximum).
// - The playable challenge for each session is listed in ./reuse.ts (a game
//   tier, Code Lab mission, Physics Lab arena or Galaxy activity, all live
//   today). The arena specs here are what the course simulator implements
//   once its picture-block compiler accepts variables and maths (see the
//   integration notes in docs, and OPEN_QUESTIONS in ../levels.ts).

import type { AllowedBlock, ArenaSpec } from '../types'

// ── Word blocks ───────────────────────────────────────────────────────────

export const DRIVE_DIST: AllowedBlock = { id: 'drive_distance', label: 'drive (cm) at (%)' }
export const DRIVE_FOR: AllowedBlock = { id: 'drive_for', label: 'drive at (%) for (s)' }
export const TURN: AllowedBlock = { id: 'turn_degrees', label: 'turn (°) at (%)' }
export const SET_MOTORS: AllowedBlock = { id: 'set_motors', label: 'set motors left (%) right (%)' }
export const STOP: AllowedBlock = { id: 'stop', label: 'stop' }
export const WAIT: AllowedBlock = { id: 'wait', label: 'wait (s)' }
export const SAY: AllowedBlock = { id: 'say', label: 'say (text)' }
export const BEEP: AllowedBlock = { id: 'beep', label: 'beep' }

export const REPEAT: AllowedBlock = { id: 'repeat', label: 'repeat (n) times' }
export const REPEAT_UNTIL: AllowedBlock = { id: 'repeat_until', label: 'repeat until (condition)' }
export const FOREVER: AllowedBlock = { id: 'forever', label: 'forever' }
export const IF: AllowedBlock = { id: 'if', label: 'if (condition)' }
export const IF_ELSE: AllowedBlock = { id: 'if_else', label: 'if (condition) else' }
export const COMPARE: AllowedBlock = { id: 'compare', label: '( ) < = > ( )' }
export const AND: AllowedBlock = { id: 'and', label: '( ) and ( )' }
export const OR: AllowedBlock = { id: 'or', label: '( ) or ( )' }
export const NOT: AllowedBlock = { id: 'not', label: 'not ( )' }
export const NUMBER: AllowedBlock = { id: 'number', label: 'number' }
export const MATH: AllowedBlock = { id: 'math', label: '( ) + − × ÷ ( )' }

export const SET_VAR: AllowedBlock = { id: 'variable_set', label: 'set (variable) to ( )' }
export const CHANGE_VAR: AllowedBlock = { id: 'variable_change', label: 'change (variable) by ( )' }
export const GET_VAR: AllowedBlock = { id: 'variable_get', label: '(variable)' }

export const DIST: AllowedBlock = { id: 'distance_cm', label: 'distance (cm)' }
export const LINE_SEEN: AllowedBlock = { id: 'line_seen', label: 'line seen?' }
export const LINE_OFFSET: AllowedBlock = { id: 'line_offset', label: 'line offset (−1…1)' }
export const REFLECTANCE: AllowedBlock = { id: 'reflectance', label: 'reflectance (0–100)' }
export const BATTERY: AllowedBlock = { id: 'battery_pct', label: 'battery (%)' }
export const FLOOR_COLOR: AllowedBlock = { id: 'floor_color', label: 'floor colour' }
export const BUMPED: AllowedBlock = { id: 'bumped', label: 'bumped?' }
export const HEADING: AllowedBlock = { id: 'heading_deg', label: 'heading (°)' }
export const TIMER: AllowedBlock = { id: 'timer_s', label: 'timer (s)' }

export const GRIP_OPEN: AllowedBlock = { id: 'grip_open', label: 'open gripper' }
/** Where the claw or scoop holds its load (Physics Lab `set_carry`). */
export const SET_CARRY: AllowedBlock = { id: 'set_carry', label: 'carry load', choices: { pos: ['low', 'high', 'normal'] } }
export const GRIP_CLOSE: AllowedBlock = { id: 'grip_close', label: 'close gripper' }
export const LIGHT_ON: AllowedBlock = { id: 'light_on', label: 'light on' }
export const LIGHT_OFF: AllowedBlock = { id: 'light_off', label: 'light off' }
export const PEN_DOWN: AllowedBlock = { id: 'pen_down', label: 'pen down' }
export const PEN_UP: AllowedBlock = { id: 'pen_up', label: 'pen up' }

/** Motion every Level 3 robot has (Level 2 blocks). */
export const MOVE: AllowedBlock[] = [DRIVE_DIST, DRIVE_FOR, TURN, SET_MOTORS, STOP, WAIT]
/** Control and logic (Level 2 blocks). */
export const LOGIC: AllowedBlock[] = [REPEAT, REPEAT_UNTIL, FOREVER, IF, IF_ELSE, COMPARE, AND, OR, NOT, NUMBER]
/** Variables (Session 1) and maths (Session 2). */
export const VARS: AllowedBlock[] = [SET_VAR, CHANGE_VAR, GET_VAR]
export const VARS_MATH: AllowedBlock[] = [...VARS, MATH]
export const TALK: AllowedBlock[] = [SAY, BEEP]

// ── Ridgeback Station arenas ──────────────────────────────────────────────

/** The station floor: grippy rubber matting, 50 cm grid. */
const STATION_PHYSICS = 'Rubber station matting, grip 0.9. 50 cm tiles. Motors and battery as the robot spec; no wind.'
/** Packed snow: low grip, the wheels slip a little on every start and turn. */
const SNOW_PHYSICS = 'Packed snow, grip 0.35 (wheels slip on fast starts and turns; tracks and legs lose less). A gentle cross-slope of 3° pushes a robot slowly to the right. 50 cm tiles.'

export const HUT_ROW: ArenaSpec = {
  id: 'l3-hut-row',
  name: 'The Hut Row',
  description: 'Five station huts along a matted corridor, each with a numbered post box on the right and a red flag if it has post today.',
  gridTiles: { cols: 3, rows: 12 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 1, row: 11, heading: 'up' },
  goal: 'Visit every hut whose flag is up, then stop at the post room (row 0) and report.',
  features: ['Huts at rows 9, 7, 5, 3 and 1 (one tile apart); post boxes on the right wall.', 'Flags set by the teacher or at random each run.', 'Post room: a green zone at row 0.'],
  physics: STATION_PHYSICS,
  requires: ['move', 'grab'],
}

export const MEASURING_HALL: ArenaSpec = {
  id: 'l3-measuring-hall',
  name: 'The Measuring Hall',
  description: 'A long, straight hall with a wall at the far end and a tape measure painted along the floor.',
  gridTiles: { cols: 2, rows: 8 },
  tileCm: 50,
  floor: 'wood',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Drive, then report how far you went — by calculation and by measurement — and how far apart the two answers are.',
  features: ['End wall at row −1 (the robot starts 340 cm from it).', 'Painted tape measure every 10 cm.'],
  physics: 'Polished wooden floor, grip 0.7. 50 cm tiles.',
  requires: ['move', 'see-wall'],
}

export const SNOWFIELD: ArenaSpec = {
  id: 'l3-snowfield',
  name: 'The Snowfield',
  description: 'A wide field of packed snow between the huts and the weather mast, with a marker pole at the far side.',
  gridTiles: { cols: 10, rows: 4 },
  tileCm: 50,
  floor: 'ice',
  start: { col: 0, row: 2, heading: 'right' },
  goal: 'Reach the marker pole zone at col 9, row 2 (one tile wide), facing right (heading 90°).',
  features: ['Cross-slope that pushes right (towards row 3).', 'Snow banks along rows 0 and 3 (soft walls).'],
  physics: SNOW_PHYSICS,
  requires: ['move'],
}

export const CALIBRATION_STRIP: ArenaSpec = {
  id: 'l3-calibration-strip',
  name: 'The Calibration Strip',
  description: 'A strip of new white matting with an old, sun-faded grey guide line that is no longer black.',
  gridTiles: { cols: 2, rows: 8 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Stop with the line sensor over the faded line at row 2 — wherever the line’s shade is that day.',
  features: ['Faded line across row 2 (shade changes between runs: 35–70 % dark).', 'A white “light” pad at row 6 and a black “dark” pad at row 5 for calibration.'],
  physics: STATION_PHYSICS,
  requires: ['move', 'follow-line'],
}

export const GUIDE_LINE: ArenaSpec = {
  id: 'l3-guide-line',
  name: 'The Guide Line to the Mast',
  description: 'A black guide line that curves round snow drifts from the huts to the weather mast.',
  gridTiles: { cols: 6, rows: 8 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Follow the line to the green mast zone without losing it, in under 40 s.',
  features: ['Black line 2.5 cm wide, three S-bends.', 'Green zone at the mast (col 5, row 0).'],
  physics: STATION_PHYSICS,
  requires: ['move', 'follow-line'],
}

export const SLED_TRACK: ArenaSpec = {
  id: 'l3-sled-track',
  name: 'The Supply Sled Track',
  description: 'A straight track where the station’s supply sled is towed at changing speeds; the robot follows behind it.',
  gridTiles: { cols: 2, rows: 12 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 11, heading: 'up' },
  goal: 'Keep 25–35 cm behind the sled for the whole 30 s tow, and never touch it.',
  features: ['Sled starts 60 cm ahead; it speeds up, slows and stops twice (same pattern every run).'],
  physics: STATION_PHYSICS,
  requires: ['move', 'see-wall'],
}

export const MAST_LOOP: ArenaSpec = {
  id: 'l3-mast-loop',
  name: 'The Weather Mast Loop',
  description: 'A black line loop round the weather mast with a coloured post at each of its four feet.',
  gridTiles: { cols: 6, rows: 6 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 5, heading: 'up' },
  goal: 'Lap the mast once, stopping briefly at each foot, and return to the start box.',
  features: ['Line loop; four feet marked by posts 30–80 cm from the line (the reading to log).', 'Battery meter on screen.'],
  physics: STATION_PHYSICS,
  requires: ['move', 'follow-line', 'see-wall'],
}

export const BOULDER_FIELD: ArenaSpec = {
  id: 'l3-boulder-field',
  name: 'The Boulder Field',
  description: 'Snow scattered with fist-sized rocks and two larger boulders; ice-core sample tubes stand in marked circles.',
  gridTiles: { cols: 8, rows: 8 },
  tileCm: 50,
  floor: 'mixed',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Reach the sample circle at col 6, row 1.',
  features: ['Rocks up to 4 cm high (wheels jolt and slip; tracks and legs climb).', 'Boulders at (3,4) and (5,2).', 'Sample tubes 8 cm tall.'],
  physics: `${SNOW_PHYSICS} Rocks: rigid, 2–4 cm.`,
  requires: ['move', 'rough-ground'],
}

export const ICE_SLOPE: ArenaSpec = {
  id: 'l3-ice-slope',
  name: 'The Ice Ramp',
  description: 'A ramp up to the core store, with a load to carry.',
  gridTiles: { cols: 2, rows: 8 },
  tileCm: 50,
  floor: 'ramp',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Carry the 0.3 kg core box up the 20° ramp to the store at row 0 without tipping backwards.',
  features: ['Ramp rows 5–2 at 20°.', 'Core box 0.3 kg, carried in the scoop (high or low position).'],
  physics: 'Grippy ramp (tile grip 0.8), 20°. The carry load block holds the box high (centre of mass up and back) or low (down and forward). Physics Lab arena “Low and slow”.',
  requires: ['move', 'grab'],
}

export const SURVEY_GRID: ArenaSpec = {
  id: 'l3-survey-grid',
  name: 'The Survey Grid',
  description: 'A snowy grid with coloured marker mats at known places, used to check where the rover thinks it is.',
  gridTiles: { cols: 8, rows: 8 },
  tileCm: 50,
  floor: 'ice',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Drive a square route of four 150 cm sides and report your estimated x and y after each side; finish within 10 cm of the start.',
  features: ['Marker mats: red at (0,4), blue at (3,4), yellow at (3,7) — each exactly placed on the survey map.'],
  physics: SNOW_PHYSICS,
  requires: ['move'],
}

export const CORE_BAY: ArenaSpec = {
  id: 'l3-core-bay',
  name: 'The Ice-Core Bay',
  description: 'A short bay with a fragile ice-core sample standing at the end, in front of a wall.',
  gridTiles: { cols: 2, rows: 6 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 5, heading: 'up' },
  goal: 'Stop with the gripper around the core (distance 6–9 cm), close it, back away 30 cm without dropping it.',
  features: ['Core 0.2 kg, 8 cm tall; it cracks if hit faster than 8 cm/s.', 'Wall 10 cm behind the core.'],
  physics: STATION_PHYSICS,
  requires: ['move', 'see-wall', 'grab'],
}

export const WHITEOUT: ArenaSpec = {
  id: 'l3-whiteout',
  name: 'Whiteout',
  description: 'The snowfield in a whiteout: the camera is useless beyond a metre, drifts block the old route, and the remote weather station waits at the end of a buried guide line.',
  gridTiles: { cols: 8, rows: 8 },
  tileCm: 50,
  floor: 'ice',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Find the guide line, follow it to the weather station dock (green), and stop safely if a sensor fails.',
  features: ['Drifts at random places each run.', 'Guide line visible only from 2 tiles in.', 'Optional fault: the distance sensor drops out (reads 200) for 3 s.'],
  physics: SNOW_PHYSICS,
  requires: ['move', 'follow-line', 'see-wall'],
}

// ── Cast ──────────────────────────────────────────────────────────────────

/** Ridgeback Station's crew (fictional, original). Used as `guest` speakers. */
export const CREW = {
  owusu: 'Dr Ama Owusu, the station glaciologist',
  sato: 'Kenji Sato, the station engineer',
  raman: 'Priya Raman, the data scientist',
  quispe: 'Mateo Quispe, the mountain rescue guide',
  haddad: 'Leila Haddad, field robotics engineer',
} as const
