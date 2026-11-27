// lib/kids/curriculum/level4/shared.ts
// Building blocks for Level 4 (Engineers, ages 14–17, "Red Valley"): the Red
// Valley Analog Station's arenas and crew. The word blocks are Level 3's
// (../level3/shared.ts) — Level 4 adds no new blocks; it uses the full set for
// measurement, kinematics, PID-style control, mapping, behaviours, fault
// detection and filtering, with a read-only text view as the bridge to Python
// and ROS 2 (BLOCK_STYLE[4] in ../levels.ts).
//
// Conventions carried from Level 3: line_offset is positive when the line is
// to the right; heading_deg is a compass heading that grows clockwise (hold
// targets avoid the 0/360 wrap); distance_cm reads 200 with no echo.
// Physical claims about Mars are real (round-trip light time 6–44 minutes,
// so 3–22 minutes each way; dust storms; rover speeds of a few cm/s).

import type { ArenaSpec } from '../types'

/** Analog-station floor: grippy, 50 cm grid. */
const PAD_PHYSICS = 'Hard-packed red sand, grip 0.75. 50 cm tiles. Motors with a dead zone below about 12 % power (the robot does not move).'
const ROUGH_PHYSICS = 'Loose red sand and gravel, grip 0.5, rocks to 3 cm. Wheels slip on hard starts; tracks and legs lose less. A steady crosswind pushes left (a constant disturbance).'

export const DOCK_BAY: ArenaSpec = {
  id: 'l4-dock-bay',
  name: 'The Charging Bay',
  description: 'The rover garage at Red Valley: a charging pad against the end wall (on the right of the map, so the docked heading is 90°), and the habitat door behind.',
  gridTiles: { cols: 6, rows: 4 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 2, heading: 'right' },
  goal: 'Stop on the charging pad with the front 5 cm (±2 cm) from the end wall and the heading within 3° of 90°.',
  features: ['Charging pad at col 5, contacts 5 cm from the wall.', 'End wall flat and square to the room.'],
  physics: PAD_PHYSICS,
  requires: ['move', 'see-wall'],
}

export const TEST_TRACK: ArenaSpec = {
  id: 'l4-test-track',
  name: 'The Motor Test Track',
  description: 'A straight, flat test lane with a wall at the end and a speed trap painted across it.',
  gridTiles: { cols: 2, rows: 10 },
  tileCm: 50,
  floor: 'wood',
  start: { col: 0, row: 9, heading: 'up' },
  goal: 'Measure speed at several motor powers and report them.',
  features: ['End wall 450 cm from the start.', 'Painted 50 cm marks for checking by eye.'],
  physics: 'Smooth test floor, grip 0.8. Motor dead zone below about 12 % power. 50 cm tiles.',
  requires: ['move', 'see-wall'],
}

export const TURN_PAD: ArenaSpec = {
  id: 'l4-turn-pad',
  name: 'The Turning Pad',
  description: 'A wide, empty pad with concentric circles painted every 25 cm, for measuring turning radius.',
  gridTiles: { cols: 8, rows: 8 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 4, row: 4, heading: 'right' },
  goal: 'Drive a predicted circle and compare the measured radius with the prediction.',
  features: ['Circles at radii 25, 50, 75, 100, 125, 150 cm round the start.'],
  physics: PAD_PHYSICS,
  requires: ['move'],
}

export const VALLEY_FLOOR: ArenaSpec = {
  id: 'l4-valley-floor',
  name: 'The Valley Floor',
  description: 'A rough traverse across the valley with a steady crosswind, to a survey beacon 4.5 m away.',
  gridTiles: { cols: 10, rows: 4 },
  tileCm: 50,
  floor: 'sand',
  start: { col: 0, row: 2, heading: 'right' },
  goal: 'Reach the beacon zone at col 9, row 2, holding heading 90° (±3°).',
  features: ['Rocks to 3 cm scattered across the floor.', 'Crosswind from the right (pushes the rover left).'],
  physics: ROUGH_PHYSICS,
  requires: ['move', 'rough-ground'],
}

export const CRATER: ArenaSpec = {
  id: 'l4-crater',
  name: 'The Unmapped Crater',
  description: 'A crater floor with rock outcrops at unknown places; the rover starts in the middle.',
  gridTiles: { cols: 8, rows: 8 },
  tileCm: 50,
  floor: 'sand',
  start: { col: 4, row: 4, heading: 'up' },
  goal: 'Scan the surroundings and report the distance to the nearest obstacle in each direction.',
  features: ['Three to five rock outcrops (walls) at random places each run.', 'Crater rim beyond 2 m (reads 200).'],
  physics: ROUGH_PHYSICS,
  requires: ['move', 'see-wall'],
}

export const SURVEY_LANES: ArenaSpec = {
  id: 'l4-survey-lanes',
  name: 'The Survey Lanes',
  description: 'Five parallel survey lanes across the crater floor, each 50 cm wide, with obstacles somewhere along some lanes.',
  gridTiles: { cols: 5, rows: 8 },
  tileCm: 50,
  floor: 'sand',
  start: { col: 0, row: 7, heading: 'up' },
  extraStarts: [
    { col: 1, row: 7, heading: 'up' },
    { col: 2, row: 7, heading: 'up' },
    { col: 3, row: 7, heading: 'up' },
    { col: 4, row: 7, heading: 'up' },
  ],
  goal: 'In each lane, report the distance to the first obstacle (or 200 for none), within 10 cm of the truth.',
  features: ['Obstacles in 3–4 of the 5 lanes, at random distances.', 'Base marker at the start row.'],
  physics: ROUGH_PHYSICS,
  requires: ['move', 'see-wall'],
}

export const GRID_PATH: ArenaSpec = {
  id: 'l4-grid-path',
  name: 'The Rubble Grid',
  description: 'An 8 × 8 grid of 50 cm cells; blocked cells are rubble the rover must not enter. The map is given.',
  gridTiles: { cols: 8, rows: 8 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Drive a shortest path (found by wavefront on paper) to the goal cell (7, 0) without entering a blocked cell.',
  features: ['Fourteen blocked cells (a fixed layout printed on the worksheet).', 'Goal cell marked green.'],
  physics: PAD_PHYSICS,
  requires: ['move'],
}

export const SAMPLE_SITE: ArenaSpec = {
  id: 'l4-sample-site',
  name: 'The Sample Site',
  description: 'A science target: a small red sample canister on the sand among grey rocks.',
  gridTiles: { cols: 6, rows: 6 },
  tileCm: 50,
  floor: 'sand',
  start: { col: 1, row: 5, heading: 'up' },
  goal: 'Align with the red canister using the camera, approach, and grip it.',
  features: ['Red canister, 0.15 kg, 6 cm wide, at a random place in rows 0–2.', 'Grey rocks are decoys of the same size.'],
  physics: ROUGH_PHYSICS,
  requires: ['move', 'see-wall', 'see-color', 'grab'],
}

export const HABITAT: ArenaSpec = {
  id: 'l4-habitat',
  name: 'The Habitat Yard',
  description: 'The yard outside the habitat where crew walk between the airlock, the greenhouse and the rover bay.',
  gridTiles: { cols: 8, rows: 6 },
  tileCm: 50,
  floor: 'mat',
  start: { col: 0, row: 5, heading: 'right' },
  goal: 'Deliver to the greenhouse while crew members cross the path, making the robot’s intent clear and keeping a safe distance.',
  features: ['Two crew members (movers) cross the path at walking pace at random times.', 'Yellow crew walkway across the middle.', 'Greenhouse door at col 7, row 0.'],
  physics: PAD_PHYSICS,
  requires: ['move', 'see-wall'],
}

export const DUST: ArenaSpec = {
  id: 'l4-dust',
  name: 'Dust Storm Approach',
  description: 'The charging-bay approach during a dust storm: blowing dust makes distance readings jump by several centimetres.',
  gridTiles: { cols: 2, rows: 8 },
  tileCm: 50,
  floor: 'sand',
  start: { col: 0, row: 7, heading: 'up' },
  goal: 'Stop 20 cm (±3 cm) from the bay wall despite noisy readings.',
  features: ['Sensor noise: each distance reading is off by up to ±8 cm (random); one reading in twenty is a spike.'],
  physics: `${ROUGH_PHYSICS} Dust: distance noise ±8 cm.`,
  requires: ['move', 'see-wall'],
}

export const RED_VALLEY: ArenaSpec = {
  id: 'l4-red-valley',
  name: 'Red Valley (capstone)',
  description: 'The whole valley: the charging bay, the habitat yard, the crater, the survey lanes and the sample site, linked by a marked track.',
  gridTiles: { cols: 12, rows: 12 },
  tileCm: 50,
  floor: 'mixed',
  start: { col: 1, row: 11, heading: 'up' },
  goal: 'The student’s own mission goal and success measure, stated in their write-up.',
  features: ['Marked track (a line) between sites.', 'Optional faults: wheel slip, blinded sensor, dead zone, dust noise.', 'Crew movers in the habitat yard.'],
  physics: `${ROUGH_PHYSICS} Faults injected on request.`,
  requires: ['move'],
}

/** Red Valley Analog Station's crew (fictional, original). Used as `guest` speakers. */
export const CREW = {
  adeyemi: 'Commander Ngozi Adeyemi, the mission lead',
  petrova: 'Dr Sofia Petrova, the planetary geologist',
  mehta: 'Arjun Mehta, the flight controller',
  kim: 'Hana Kim, the systems engineer',
  ramirez: 'Diego Ramírez, the safety officer',
} as const
