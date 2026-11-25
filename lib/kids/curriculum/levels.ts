// lib/kids/curriculum/levels.ts
// The R2BOT Kids curriculum at a glance: four levels, one per age band
// (lib/kids/bands.ts), each a 24-session story season in which the child
// builds and upgrades ONE robot. Level 1 is written in full in ./level1;
// Levels 2–4 are specified here as outlines (title + one-line objective per
// session, projects, certificate, robot, blocks) ready to be written up.
//
// Light on purpose: no full sessions are imported here, so an overview page
// can use this file without pulling ~250 KB of Level 1 scripts into a bundle.
// scripts/kids-curriculum-doc.ts checks that the Level 1 outline below matches
// ./level1 exactly (titles, kinds, projects).

import type {
  BlockId, Certificate, ConceptId, Level, LevelNumber, PartRef, Project, RobotSpec, SessionOutline,
} from './types'
import { L1_PROJECTS } from './level1/projects'

// ── Helpers ───────────────────────────────────────────────────────────────

function s(
  number: number,
  title: string,
  objective: string,
  concepts: ConceptId[],
  extra: { newBlocks?: BlockId[]; part?: PartRef; kind?: 'lesson' | 'project' } = {},
): SessionOutline {
  const kind = extra.kind ?? (number % 6 === 0 ? 'project' : 'lesson')
  return { number, title, objective, kind, concepts, newBlocks: extra.newBlocks, part: extra.part }
}

function project(p: Project): Project {
  return p
}

const DESIGN_STEPS_8_PLUS = [
  'Ask: who is this for and what do they need? Write the problem in one sentence.',
  'Imagine: sketch at least two different ideas.',
  'Plan: choose one, list the parts and draw the route or flowchart.',
  'Build and code it in the simulator, one piece at a time.',
  'Test: run it several times and write down what happens.',
  'Improve: change one thing at a time and test again.',
  'Share: show it, explain one design decision and one bug you fixed.',
]

const SHARE_RULE = 'Shared with the class and the child’s family gallery. Never public by default; any public showcase needs the teacher’s choice and a parent’s consent, and never shows a child’s face or full name.'

// ── Blocks by level ───────────────────────────────────────────────────────

/** Blocks introduced in each level (the spiral: each level keeps everything before it). */
export const BLOCKS_INTRODUCED: Record<LevelNumber, BlockId[]> = {
  1: ['say', 'beep', 'wait', 'drive_for', 'turn_degrees', 'repeat', 'pen_down', 'pen_up', 'grip_close', 'grip_open', 'light_on', 'light_off', 'repeat_until', 'bumped', 'if', 'distance_cm', 'compare'],
  2: ['drive_distance', 'set_motors', 'stop', 'number', 'line_seen', 'if_else', 'forever', 'and', 'or', 'not', 'timer_s', 'floor_color'],
  3: ['variable_set', 'variable_change', 'variable_get', 'math', 'heading_deg', 'line_offset'],
  4: [],
}

function cumulative(level: LevelNumber): BlockId[] {
  const out: BlockId[] = []
  for (let l = 1 as LevelNumber; l <= level; l = (l + 1) as LevelNumber) out.push(...BLOCKS_INTRODUCED[l])
  return out
}

/** How blocks look and how much the child types, by level. */
export const BLOCK_STYLE: Record<LevelNumber, string> = {
  1: 'Picture blocks with the numbers fixed or chosen from 2–4 chips (“Hop forward 1 · 2 · 3”). Every block speaks its name. Sensor conditions are built into a single block (“Keep going until I feel a bump”), so a 6-year-old never assembles a comparison.',
  2: 'Word blocks with real units: centimetres, degrees, percent power, seconds. Children type numbers and build their own conditions with compare / and / or / not.',
  3: 'Full blocks including variables and maths. Children name their own variables and build expressions such as steer = gain × line_offset.',
  4: 'The full block set, used for control (PID intuition), behaviours and state machines. A read-only text view of the same program prepares the jump to Python and ROS 2 (see OPEN_QUESTIONS).',
}

// ── The concept spiral ────────────────────────────────────────────────────

/** What each strand looks like at each level. One sentence per cell. */
export const CONCEPT_SPIRAL: Record<ConceptId, [string, string, string, string]> = {
  'sense-think-act': [
    'A robot senses, thinks and acts; a toaster does not.',
    'Map every part to sense, think or act, and explain a robot as a system of parts.',
    'Draw the loop as a diagram: sensor reading → decision → motor command, many times a second.',
    'Model a rover as subsystems (power, sensing, compute, actuation, comms) and their interfaces.',
  ],
  sequences: [
    'Steps happen in order; changing the order changes what happens.',
    'Longer sequences with exact measurements (cm, degrees).',
    'Sequences broken into named stages that become states.',
    'Sequencing inside behaviours and state machines.',
  ],
  decomposition: [
    'Split a route into parts (“up, then along”).',
    'Split a delivery into legs; plan each leg separately.',
    'Split a mission into states (search, follow, done).',
    'Split a system into subsystems with test plans for each.',
  ],
  loops: [
    'Repeat n times; repeat until a sensor says stop.',
    'Nested loops, forever loops with a stop condition.',
    'Loops as control loops that run many times a second.',
    'Loop timing and rates: why a controller must run fast enough.',
  ],
  debugging: [
    'Watch where the robot goes wrong and fix that block.',
    'Predict → run → compare; change one thing at a time.',
    'Inspect values with say(); find the line where a value goes wrong.',
    'Systematic fault-finding, test cases and regression checks.',
  ],
  'events-timing': [
    'Wait for the world (a bridge going up).',
    'Use the timer and wait-until to sync with the world.',
    'Timeouts and watchdogs.',
    'Loop rates, delays and communication lag (Mars light-time).',
  ],
  sensors: [
    'Touch (bumper) and echo distance, one at a time, inside a single picture block.',
    'Line, colour and camera; choosing a sensor for a job; sensors can be wrong.',
    'Calibration, thresholds and noise; recording readings.',
    'Sensor limits, fusion by rules, averaging to reduce noise.',
  ],
  conditions: [
    '“If I feel a bump, I turn.”',
    'If / else, compare, and / or / not.',
    'Conditions on variables and ranges; state transitions.',
    'Priorities between behaviours; fault conditions.',
  ],
  variables: [
    '—',
    'Numbers on blocks change behaviour (preparing for variables).',
    'Variables as the robot’s memory: counters, calibration, state, gain.',
    'Variables for controller terms (error, sum, change) and logged data.',
  ],
  'feedback-control': [
    'Sensors let the robot stop where the world really is (not where counting says).',
    'Bang-bang control: line-following with if / else; encoders make distance exact.',
    'Proportional control: correction = gain × error; tuning the gain.',
    'PID intuition: P reacts, I removes the leftover error, D calms overshoot.',
  ],
  physics: [
    'Load, slopes, ice and sand change how far the same program goes.',
    'Friction, traction, stability and tipping; wheels vs tracks by fair test.',
    'Centre of mass, energy and battery budget; legs vs tracks trade-offs.',
    'Kinematics of differential drive; measuring motor response; energy and mass trade-offs.',
  ],
  autonomy: [
    'One sensor rule solves a maze without a map.',
    'Robots that react to lines, colours and obstacles on their own.',
    'Levels of autonomy; when a human should decide.',
    'Why far-away robots (Mars) must be autonomous; behaviours, planning, recovery.',
  ],
  data: [
    '—',
    'Fair tests recorded in a table (wheels vs tracks).',
    'Logging readings; min, max, average.',
    'Measuring a system and fitting a simple rule from data.',
  ],
  'design-process': [
    'Make it yours: imagine, plan, build, test, improve, share — with pictures.',
    'Design for a real user; two ideas before choosing one.',
    'Requirements and trade-offs; iterate with measured results.',
    'Design reviews, peer critique, documentation and a capstone.',
  ],
  'safety-ethics': [
    'Robots tell people what they will do; stop for people; makers keep people safe.',
    'Robots in nature (turtle nests); accessibility — design for everyone.',
    'Honest data; wildlife; when not to automate.',
    'Accountability for autonomy, privacy, dual use, bias in sensing; a simple safety case.',
  ],
  careers: [
    'People design, build, program, test and fix robots.',
    'Robots at sea, on farms, in rescue — and the people behind them.',
    'Field robotics roles; the maths and science behind them.',
    'Pathways: courses, portfolios, competitions without ranking, the next step (Python and ROS 2).',
  ],
}

// ── Level 1 · Explorers (5–7) — written in full in ./level1 ───────────────

const L1_SESSIONS: SessionOutline[] = [
  s(1, 'Hello, Robot!', 'Say what makes a robot a robot — it senses, thinks and acts — and give it its first instructions.', ['sense-think-act', 'sequences'], { newBlocks: ['say', 'beep', 'wait'], part: { slot: 'body', id: 'box' } }),
  s(2, 'Wheels to Roll', 'Add wheels, explain that motors turn them, and drive forward to a spot.', ['physics', 'sequences'], { newBlocks: ['drive_for'], part: { slot: 'drive', id: 'wheels2' } }),
  s(3, 'Stop, Wait, Go!', 'Use Wait to pause at the right moment and see that the order of steps changes what happens.', ['sequences', 'events-timing']),
  s(4, 'A Face That Talks', 'Add a face screen and use it to tell people what the robot will do, so they feel safe.', ['safety-ethics', 'sequences'], { part: { slot: 'head', id: 'screen' } }),
  s(5, 'Left and Right', 'Turn the robot left and right on the spot to follow a path around a corner.', ['sequences', 'physics'], { newBlocks: ['turn_degrees'] }),
  s(6, 'Make It Yours: My Robot’s Dance', 'Design your robot’s look and name, and plan, build and share a dance of at least five steps.', ['design-process', 'sequences']),
  s(7, 'Step by Step', 'Plan a whole route on a map with arrows before building it — an algorithm.', ['sequences', 'decomposition']),
  s(8, 'Oops! Fixing Bugs', 'Find and fix one wrong step (a bug) by watching where the robot goes wrong.', ['debugging']),
  s(9, 'The Drawing Pen', 'Add a pen and use pen down / pen up to draw the robot’s path.', ['sequences', 'debugging'], { newBlocks: ['pen_down', 'pen_up'], part: { slot: 'tool', id: 'pen' } }),
  s(10, 'Repeat, Repeat!', 'Use a Repeat block to do the same steps again and again — and draw a square with fewer blocks.', ['loops'], { newBlocks: ['repeat'] }),
  s(11, 'Patterns Everywhere', 'Spot a repeating pattern and use Repeat to draw it (a staircase).', ['loops', 'decomposition']),
  s(12, 'Make It Yours: The Festival Banner', 'Design and draw your own picture for the festival banner using at least one Repeat.', ['design-process', 'loops']),
  s(13, 'The Scoop', 'Swap the pen for a scoop and program the robot to pick something up, carry it and tip it out.', ['design-process', 'sequences'], { newBlocks: ['grip_close', 'grip_open'], part: { slot: 'tool', id: 'scoop' } }),
  s(14, 'Heavy Load, Steep Hill', 'See that the same program goes less far up a slope with a heavy load, and fix it by testing.', ['physics', 'debugging']),
  s(15, 'Slippery and Sticky', 'Discover that ice makes the robot slide and sand slows it down, and drive slowly on ice to stay in control.', ['physics']),
  s(16, 'Wait for the Bridge', 'Time the robot’s moves to a world that changes (a lift bridge) by waiting the right amount.', ['events-timing', 'sequences']),
  s(17, 'Light in the Dark', 'Swap in a headlight and switch it on in the dark and off in the light to save energy.', ['sensors', 'sequences', 'safety-ethics'], { newBlocks: ['light_on', 'light_off'], part: { slot: 'tool', id: 'light' } }),
  s(18, 'Make It Yours: A Helper for My Home', 'Choose a job at home, pick the right tool for it, and program a helper routine.', ['design-process', 'sequences', 'safety-ethics']),
  s(19, 'Feel Your Way', 'Add a bumper — a touch sensor — and make the robot keep going until it feels a bump.', ['sensors', 'sense-think-act', 'loops'], { newBlocks: ['repeat_until', 'bumped'], part: { slot: 'sensor', id: 'bumper' } }),
  s(20, 'Bump, Then Think', 'Use “if” so the robot makes a choice: if it feels a bump, it backs off and turns.', ['conditions', 'sense-think-act', 'autonomy', 'loops'], { newBlocks: ['if'] }),
  s(21, 'Ears Like a Bat', 'Swap in Distance Eyes and make the robot stop before it touches something, using echoes.', ['sensors', 'loops', 'safety-ethics'], { newBlocks: ['distance_cm', 'compare'], part: { slot: 'head', id: 'distance' } }),
  s(22, 'Stop for Friends', 'Make the robot wait until the path is clear before each move, and talk about who keeps robots safe.', ['safety-ethics', 'sensors', 'loops']),
  s(23, 'Up the Clock Tower', 'Climb a winding ramp by repeating a sensor rule, and meet the people whose job is robots.', ['loops', 'sensors', 'physics', 'careers']),
  s(24, 'Make It Yours: The Night of a Hundred Lights', 'Design, test and share a festival show that uses a loop, a sensor, a tool and kind words.', ['design-process', 'sense-think-act', 'loops', 'sensors', 'sequences', 'debugging']),
]

const L1_START: RobotSpec = {
  body: 'child-choice', drive: 'none', head: 'none', tool: 'none', sensor: 'none', toolbox: [],
  description: 'An empty kit from Nana Lucía’s shelf: a body the child chooses (box, dome, tower or bug) with a battery and a tiny computer inside. No wheels yet.',
}

const L1_END: RobotSpec = {
  body: 'child-choice', drive: 'wheels2', head: 'distance', tool: 'child-choice', sensor: 'bumper',
  toolbox: [{ slot: 'tool', id: 'pen' }, { slot: 'tool', id: 'scoop' }, { slot: 'tool', id: 'light' }, { slot: 'head', id: 'screen' }],
  description: 'A two-wheeled robot with a touch bumper and echo Distance Eyes, plus a toolbox of pen, scoop, headlight and face screen that the child swaps for each job.',
}

const L1_CERT: Certificate = {
  title: 'R2BOT Kids · Explorer',
  wording: '{name} built {robotName}, taught it to move, draw, carry, feel and listen, and brought the twelve lights home to Lantern Hill. {name} can give a robot step-by-step instructions, repeat them with a loop, find and fix bugs, and use a sensor to keep people safe.',
  criteria: [
    'Completed the four “Make it yours” projects (sessions 6, 12, 18, 24) with every self-check ticked.',
    'Earned the core skill badges: Roller, Turner, Bug Detective, Loop Star, Touch Sensor and Choice Maker (any missing badge can be earned in a catch-up session).',
    'Explained one bug they fixed, in their own words, to an adult or the class.',
  ],
}

// ── Level 2 · Builders (8–10) ─────────────────────────────────────────────

const L2_SESSIONS: SessionOutline[] = [
  // Act 1 — Measuring the Islands
  s(1, 'Welcome to Windward', 'Rebuild your robot for the islands and explain each part as sense, think or act.', ['sense-think-act', 'design-process'], { newBlocks: ['stop', 'number'] }),
  s(2, 'Wheels That Count', 'Use wheel encoders to drive an exact distance in centimetres, on any floor.', ['feedback-control', 'physics'], { newBlocks: ['drive_distance'] }),
  s(3, 'Any Angle', 'Turn any number of degrees and draw triangles and hexagons (exterior angles add up to 360°).', ['sequences', 'loops'] ),
  s(4, 'Four Wheels for Heavy Mail', 'Swap to four wheels and test stability: wider and lower is harder to tip.', ['physics', 'design-process'], { part: { slot: 'drive', id: 'wheels4' } }),
  s(5, 'Curves with Two Motors', 'Steer with different left and right motor power to drive smooth curves.', ['physics', 'sequences'], { newBlocks: ['set_motors'] }),
  s(6, 'Make It Yours: Map of My Island', 'Design an island map and draw it with the pen using measured distances and angles.', ['design-process', 'loops']),
  // Act 2 — The Lighthouse Line
  s(7, 'Follow the Painted Line', 'Add a line sensor and follow a line with if / else (wiggle left, wiggle right).', ['sensors', 'conditions', 'feedback-control'], { newBlocks: ['line_seen', 'if_else'], part: { slot: 'sensor', id: 'line' } }),
  s(8, 'Forever and a Stop', 'Use forever loops and repeat-until safely: every forever needs a way to end.', ['loops', 'conditions'], { newBlocks: ['forever'] }),
  s(9, 'Junctions and Choices', 'Combine conditions with and / or / not to choose at a junction.', ['conditions', 'decomposition'], { newBlocks: ['and', 'or', 'not'] }),
  s(10, 'Tide Timer', 'Use the timer to act on time (the causeway floods every 60 s).', ['events-timing', 'conditions'], { newBlocks: ['timer_s'] }),
  s(11, 'Debug Like an Engineer', 'Predict, run, compare, and change one thing at a time; report sensor values with say.', ['debugging']),
  s(12, 'Make It Yours: The Lighthouse Delivery', 'Design a route to the lighthouse that mixes line following and measured driving.', ['design-process', 'sensors', 'decomposition']),
  // Act 3 — Sand, Rocks and Turtles
  s(13, 'Tracks or Wheels? A Fair Test', 'Run a fair test on sand and rock, record results in a table, and choose a drive from evidence.', ['physics', 'data', 'design-process'], { part: { slot: 'drive', id: 'tracks' } }),
  s(14, 'The Gripper', 'Add a gripper and pick up objects of different shapes; open, approach slowly, close.', ['sequences', 'physics'], { part: { slot: 'tool', id: 'gripper' } }),
  s(15, 'Colour Sorting', 'Swap to the colour sensor and sort recycling by the colour of each drop-off zone.', ['sensors', 'conditions'], { newBlocks: ['floor_color'], part: { slot: 'sensor', id: 'color' } }),
  s(16, 'Turtle Beach', 'Keep out of marked nesting zones and explain why robots in nature need rules.', ['safety-ethics', 'conditions']),
  s(17, 'The Camera Eye', 'Swap to a camera that sees walls and colours, and compare it with single-job sensors (cost, light needed).', ['sensors', 'design-process'], { part: { slot: 'head', id: 'camera' } }),
  s(18, 'Make It Yours: Beach Clean-up Robot', 'Design a robot routine that collects and sorts litter without disturbing wildlife.', ['design-process', 'sensors', 'safety-ethics']),
  // Act 4 — Storm Season
  s(19, 'Sensors Can Be Wrong', 'Find a false reading (glare, a gap in the line) and make the program more careful.', ['sensors', 'debugging']),
  s(20, 'Search Pattern', 'Sweep an area with nested loops (back and forth) so nothing is missed.', ['loops', 'decomposition']),
  s(21, 'Design for Everyone', 'Interview a “user” and design a delivery that works for someone who cannot reach high shelves or see well.', ['design-process', 'safety-ethics']),
  s(22, 'Run It Ten Times', 'Test a program from different starts and conditions; fix what fails even once.', ['debugging', 'data']),
  s(23, 'Robots of the Sea and Farm', 'Meet the jobs behind marine, farm and rescue robots and run a storm rescue mission.', ['careers', 'autonomy']),
  s(24, 'Make It Yours: The Island Post Grand Route', 'Plan and run a multi-stop delivery across the islands using everything from the season.', ['design-process', 'decomposition', 'sensors', 'conditions']),
]

const L2_PROJECTS: Project[] = [
  project({
    id: 'l2-p1', session: 6, title: 'Map of My Island',
    brief: 'Invent an island and draw its map with your robot’s pen: the coastline, a path and a landmark. Every line is a measured distance and every corner a chosen angle.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Use drive_distance and turn_degrees only for movement.', 'At least one repeated shape made with a loop.', 'The map fits on the 2 m × 2 m paper.'],
    selfCheck: ['I planned distances and angles on squared paper first.', 'My shapes close up (the ends meet).', 'I used a loop for a repeated shape.', 'I can explain why exterior angles add to 360°.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l2-p2', session: 12, title: 'The Lighthouse Delivery',
    brief: 'The lighthouse keeper needs a parcel every evening. Design a route that follows the painted line where there is one and measures where there is not.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Use line following for at least one leg.', 'Use drive_distance for at least one leg.', 'The program must stop by itself at the lighthouse door.'],
    selfCheck: ['I split the route into legs.', 'Each leg works on its own.', 'My robot stops by itself at the end.', 'I fixed at least one bug and can say how.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l2-p3', session: 18, title: 'Beach Clean-up Robot',
    brief: 'Litter washed up after the storm. Design a robot routine that collects it, sorts it by colour into the right bin, and keeps out of the turtle nesting zones.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Never enter a nesting zone.', 'Sort at least two kinds of litter.', 'Choose your drive (wheels or tracks) from your fair-test results.'],
    selfCheck: ['My robot never entered a nest zone.', 'Items end in the right bins.', 'I chose my drive using my results table.', 'I can name one way robots can help nature and one way they can harm it.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l2-p4', session: 24, title: 'The Island Post Grand Route',
    brief: 'The ferry is fixed, but the islanders want to keep their robot post. Plan one grand delivery round: three stops, three different kinds of challenge, and a safe return home.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Three stops, each needing a different skill (measure, follow a line, use colour or distance).', 'Works from two different start positions.', 'Uses if / else and at least one loop.', 'Stops for anything in the way.'],
    selfCheck: ['My route has three stops with different challenges.', 'It worked ten times in a row.', 'It stops for obstacles.', 'I can explain my design to someone who has never seen it.'],
    share: SHARE_RULE,
  }),
]

// ── Level 3 · Inventors (11–13) ───────────────────────────────────────────

const L3_SESSIONS: SessionOutline[] = [
  // Act 1 — Arrival at the Ridge
  s(1, 'The Robot’s Memory', 'Use variables to count and remember (deliveries made, distance travelled).', ['variables', 'sense-think-act'], { newBlocks: ['variable_set', 'variable_change', 'variable_get'] }),
  s(2, 'Maths in Motion', 'Calculate distance from speed and time, and check the calculation against the encoders.', ['variables', 'physics', 'data'], { newBlocks: ['math'] }),
  s(3, 'Keep Your Heading', 'Read the gyro and correct a drifting heading on a slippery snowfield.', ['sensors', 'feedback-control'], { newBlocks: ['heading_deg'] }),
  s(4, 'Calibrate Your Sensors', 'Measure light and dark readings, store them, and set the threshold from your own data.', ['sensors', 'variables', 'data']),
  s(5, 'Smooth Line Following', 'Steer by how far off the line you are (correction = gain × offset) and compare with if / else.', ['feedback-control', 'variables'], { newBlocks: ['line_offset'] }),
  s(6, 'Make It Yours: The Station Mail Rover', 'Design a rover that delivers to several huts and reports how many deliveries it made.', ['design-process', 'variables']),
  // Act 2 — The Weather Mast
  s(7, 'Following a Wall', 'Keep a steady distance from a wall using proportional steering on distance error.', ['feedback-control', 'sensors']),
  s(8, 'Too Much, Too Little', 'Tune the gain: see wobble when it is too high and slow drift when it is too low.', ['feedback-control', 'debugging', 'data']),
  s(9, 'States: Search, Follow, Done', 'Use a state variable to switch behaviour (find the line, follow it, stop at the end).', ['autonomy', 'variables', 'decomposition']),
  s(10, 'Logging the Weather', 'Record readings into variables and report the minimum, maximum and average.', ['data', 'variables']),
  s(11, 'The Energy Budget', 'Plan a route within the battery budget; see how mass and speed use energy.', ['physics', 'design-process']),
  s(12, 'Make It Yours: Weather Mast Inspector', 'Design an inspection run that follows the mast cables, logs readings and returns before the battery runs low.', ['design-process', 'data', 'feedback-control']),
  // Act 3 — The Boulder Field
  s(13, 'Legs or Tracks?', 'Compare legs and tracks on boulders and snow, and choose from measured trade-offs.', ['physics', 'design-process', 'data'], { part: { slot: 'drive', id: 'legs' } }),
  s(14, 'Centre of Mass', 'Find where a robot tips on a slope and move its load to make it stable.', ['physics']),
  s(15, 'Where Am I? Odometry', 'Estimate position from wheel distance and heading, and watch the error grow.', ['variables', 'sensors', 'autonomy']),
  s(16, 'Landmarks Fix Drift', 'Use coloured markers to reset the position estimate.', ['sensors', 'variables', 'autonomy']),
  s(17, 'Fragile Samples', 'Approach an ice-core sample slowly, slowing down in proportion to the distance left, then grip gently.', ['feedback-control', 'sequences'], { part: { slot: 'tool', id: 'gripper' } }),
  s(18, 'Make It Yours: Sample Return Mission', 'Design a mission that collects two samples from the boulder field and brings them back without dropping them.', ['design-process', 'autonomy', 'feedback-control']),
  // Act 4 — Whiteout
  s(19, 'Who Is in Charge?', 'Compare remote control, shared control and full autonomy, and decide when a human should take over.', ['autonomy', 'safety-ethics']),
  s(20, 'Fail Safe', 'Add timeouts and safe defaults: if a reading is lost or a task takes too long, stop safely.', ['events-timing', 'safety-ethics', 'conditions']),
  s(21, 'Many Sensors, One Decision', 'Combine line, distance and colour readings with priorities to make one decision.', ['sensors', 'conditions', 'autonomy']),
  s(22, 'Honest Data, Wild Places', 'Discuss honest reporting of data and how field robots should treat wildlife and fragile places.', ['safety-ethics', 'data']),
  s(23, 'Field Robotics Careers', 'Meet the roles in field robotics and rehearse the whiteout rescue with a team.', ['careers', 'decomposition']),
  s(24, 'Make It Yours: Whiteout Rescue Rover', 'Design an autonomous rover that finds the stranded weather station in a whiteout and brings back its data.', ['design-process', 'autonomy', 'feedback-control', 'safety-ethics']),
]

const L3_PROJECTS: Project[] = [
  project({
    id: 'l3-p1', session: 6, title: 'The Station Mail Rover',
    brief: 'The station has five huts. Design a mail rover that visits the huts that have post (set by variables at the start) and reports how many stops it made.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Use at least two named variables.', 'The same program works for any combination of huts.', 'Report the count with say() at the end.'],
    selfCheck: ['My variables have clear names.', 'It works for three different hut combinations.', 'The count it reports is correct.', 'I can explain what each variable remembers.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l3-p2', session: 12, title: 'Weather Mast Inspector',
    brief: 'Inspect the weather mast: follow the guide line round it, log a reading at each of its four feet, and come home before the battery runs low.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Proportional line following.', 'Four logged readings, reported as min / max / average.', 'Must finish with at least 20 % battery.'],
    selfCheck: ['My line following is smooth (I tuned the gain).', 'The numbers I report are right.', 'I had battery to spare.', 'I wrote down my gain tests.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l3-p3', session: 18, title: 'Sample Return Mission',
    brief: 'Scientists need two ice-core samples from the boulder field. Choose your drive, plan the route, and bring both back intact.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Choose legs or tracks and justify it with your Session 13 data.', 'Approach samples with slowing-down (proportional) control.', 'Use landmarks to correct position.'],
    selfCheck: ['Both samples came back without being dropped.', 'I justified my drive choice with data.', 'My position estimate was corrected by landmarks.', 'I can explain the trade-off I made.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l3-p4', session: 24, title: 'Whiteout Rescue Rover',
    brief: 'A whiteout has hidden the remote weather station. Design an autonomous rover that finds it, downloads its data (by reaching its dock) and returns — safely, even if a sensor fails.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Uses a state variable (at least three states).', 'At least one fail-safe (timeout or lost-sensor stop).', 'Uses proportional control somewhere.', 'Works from three random start positions.'],
    selfCheck: ['My state diagram matches my program.', 'My fail-safe works when I cover a sensor.', 'It succeeded from three starts.', 'I can say when a human should take over.'],
    share: SHARE_RULE,
  }),
]

// ── Level 4 · Engineers (14–17) ───────────────────────────────────────────

const L4_SESSIONS: SessionOutline[] = [
  // Act 1 — Landing
  s(1, 'The Rover as a System', 'Break the rover into subsystems (power, sensing, compute, actuation, comms) and trace one command through them.', ['sense-think-act', 'decomposition']),
  s(2, 'Measure Your Motors', 'Measure speed against motor power, plot it, and find the dead zone where the robot does not move.', ['data', 'physics']),
  s(3, 'Differential Drive Kinematics', 'Predict the turning radius from left and right wheel speeds and test the prediction.', ['physics', 'variables']),
  s(4, 'Heading Hold', 'Hold a heading across rough ground with proportional control on gyro error.', ['feedback-control', 'sensors']),
  s(5, 'P, I and D', 'See P leave a steady error, I remove it, and D calm overshoot — and tune all three.', ['feedback-control', 'variables', 'data']),
  s(6, 'Make It Yours: Precision Docking', 'Design a controller that docks the rover to the charging pad within 2 cm and 3°.', ['design-process', 'feedback-control']),
  // Act 2 — Mapping the Valley
  s(7, 'Scanning with Distance', 'Turn on the spot taking distance readings and sketch the surroundings from the data.', ['sensors', 'data']),
  s(8, 'Maps on a Grid', 'Turn readings into a grid map of free and blocked cells (on paper and in the sim overlay).', ['data', 'autonomy']),
  s(9, 'Planning a Path', 'Find a shortest path on a grid by the wavefront (flood-fill) method, by hand, then drive it.', ['autonomy', 'decomposition']),
  s(10, 'Behaviours and Priorities', 'Layer behaviours: avoid beats follow, follow beats explore.', ['autonomy', 'conditions']),
  s(11, 'Twenty Minutes Away', 'Explain why Mars rovers cannot be joysticked (light takes about 3–22 minutes each way) and design for delay.', ['autonomy', 'events-timing']),
  s(12, 'Make It Yours: Autonomous Survey', 'Design a rover that surveys an unknown crater floor and returns a map.', ['design-process', 'autonomy', 'data']),
  // Act 3 — Sample Science
  s(13, 'Reach and Grasp', 'Align with a target by camera colour and distance, then grasp reliably.', ['feedback-control', 'sensors']),
  s(14, 'Test Plans and Edge Cases', 'Write a test plan with normal, edge and failure cases, and run it.', ['debugging', 'data']),
  s(15, 'Detecting Faults', 'Detect a stalled wheel by comparing commanded and measured motion, and recover.', ['debugging', 'safety-ethics', 'conditions']),
  s(16, 'Mass, Energy, Trade-offs', 'Run a design review: every gram and every watt must earn its place.', ['physics', 'design-process']),
  s(17, 'Working with People', 'Make robot intent readable to people (say, lights, motion) and design safe handovers.', ['safety-ethics', 'design-process']),
  s(18, 'Make It Yours: Sample Fetch Under Faults', 'Design a sample-fetch mission that still succeeds when one injected fault occurs.', ['design-process', 'debugging', 'autonomy']),
  // Act 4 — Dust Storm
  s(19, 'Noise and Filters', 'Reduce noisy readings by averaging and see the cost (delay).', ['sensors', 'data', 'variables']),
  s(20, 'A Simple Safety Case', 'List hazards, causes and mitigations for the rover and show evidence for each.', ['safety-ethics', 'design-process']),
  s(21, 'Ethics of Autonomy', 'Debate accountability, privacy, dual use and sensing bias with real cases.', ['safety-ethics']),
  s(22, 'Pathways', 'Map routes into robotics careers and build a portfolio page of your season’s work.', ['careers']),
  s(23, 'Design Review', 'Present your capstone design to peers and take structured critique.', ['design-process', 'careers']),
  s(24, 'Make It Yours: Mission Red Valley', 'Run your capstone: an autonomous rover mission with a safety case, test evidence and a public-ready write-up.', ['design-process', 'autonomy', 'feedback-control', 'safety-ethics']),
]

const L4_PROJECTS: Project[] = [
  project({
    id: 'l4-p1', session: 6, title: 'Precision Docking',
    brief: 'The rover must dock to its charging pad by itself — within 2 cm and 3° — from anywhere in the bay.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Closed-loop control on distance and heading.', 'Ten docking runs from random starts, with results logged.', 'No contact faster than 5 cm/s.'],
    selfCheck: ['I logged ten runs.', 'At least nine met the tolerance.', 'I tuned with data, not guesses.', 'I can explain what each controller term does.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l4-p2', session: 12, title: 'Autonomous Survey',
    brief: 'Survey an unknown crater floor and come back with a grid map good enough for the next rover to plan a route.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['No pre-loaded map.', 'Return to base within the time limit.', 'The map is checked against the real crater cell by cell.'],
    selfCheck: ['My map matches at least 80 % of cells.', 'My rover returned in time.', 'My behaviour priorities are documented.', 'I explained why autonomy is needed here.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l4-p3', session: 18, title: 'Sample Fetch Under Faults',
    brief: 'Fetch a sample — and keep going when something breaks. The simulator injects one unknown fault (a slipping wheel, a blinded sensor or a dead zone) per run.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['Detect at least two kinds of fault.', 'Recover or stop safely — never continue blindly.', 'Written test plan with results.'],
    selfCheck: ['My rover detected each injected fault.', 'It never kept going blind.', 'My test plan covers edge cases.', 'I documented one failure and what I changed.'],
    share: SHARE_RULE,
  }),
  project({
    id: 'l4-p4', session: 24, title: 'Mission Red Valley (capstone)',
    brief: 'Plan, build, test and present a full autonomous mission of your choosing in the Red Valley arena: a real need, a rover design, control, autonomy, a safety case and evidence it works.',
    designSteps: DESIGN_STEPS_8_PLUS,
    constraints: ['A stated user need and success measure.', 'At least one feedback controller and one behaviour layer.', 'A safety case and a test log.', 'A two-minute presentation and a one-page write-up.'],
    selfCheck: ['My success measure was met (or I explain honestly why not).', 'My safety case covers my top hazards.', 'Peers could rerun my tests from my write-up.', 'I named what I would do next.'],
    share: `${SHARE_RULE} The write-up is designed to sit in a portfolio (no personal data in it).`,
  }),
]

// ── The four levels ───────────────────────────────────────────────────────

export const LEVELS: Level[] = [
  {
    number: 1, band: 'explorers', name: 'Explorers', ages: '5–7',
    season: {
      title: 'The Lights of Lantern Hill',
      premise: 'A storm blows the twelve lights off the Lantern Clock on the night before the town’s festival. Nana Lucía, a retired engineer, gives the child an old robot kit. Part by part, the child builds a robot and, with Spark, Amara and Bolt, follows the lost lights through the town — the bakery street, the market, the harbour, a dark tunnel and a foggy hilltop.',
      setting: 'Lantern Hill, a small hillside town by the sea (deliberately not tied to one country: names, food and buildings come from many places).',
      arc: [
        { sessions: [1, 6], title: 'A Helper in a Box', summary: 'The storm, the kit, the first build. What makes a robot a robot; moving, waiting, talking and turning; the first dance.', actEnd: 'The dance shakes three lights out of the fountain — and a map of the town falls out with them.' },
        { sessions: [7, 12], title: 'The Map of Lantern Hill', summary: 'Planning routes as algorithms, fixing bugs, the drawing pen, loops and patterns; the festival banner.', actEnd: 'Six lights — halfway! The banner points down to the harbour.' },
        { sessions: [13, 18], title: 'Heavy, Slippery, Dark', summary: 'The scoop; how load, slopes, ice and sand change the same program; waiting for the bridge; a headlight in the tunnel; a helper for Nana’s home.', actEnd: 'Nine lights, but fog covers the hilltop and seeing is no help.' },
        { sessions: [19, 24], title: 'Feel, Hear, Shine', summary: 'A bumper to feel, “if” to choose, echoes to hear like a bat, stopping for people, climbing the clock tower, and the festival show.', actEnd: 'The clock shines again — and a bottle washes up with a map of islands.' },
      ],
      finale: 'The Night of a Hundred Lights: the twelve lights go back into the clock and every child’s robot performs its own show. A message in a bottle leads to Level 2.',
    },
    startRobot: L1_START,
    endRobot: L1_END,
    sessions: L1_SESSIONS,
    projects: [...L1_PROJECTS],
    certificate: L1_CERT,
    blocks: cumulative(1),
    developmentalFit: [
      'Pre-readers and early readers: every block, hint and question is spoken; icons carry meaning; screens use very few words.',
      'Short attention spans: a 40-minute class changes activity every 4–9 minutes and starts unplugged, with the body.',
      'Concrete before abstract: one hop = one tile on the mat; quarter turns only; the sensor condition is hidden inside one picture block.',
      'Left and right are still being learned at 5–7: turns are taught from the robot’s point of view with body games first.',
      'Fine motor control varies: big tap targets, no dragging required, pairs share one device (driver and navigator).',
      'Gentle stories: problems are puzzles, never danger; cliffhangers are curiosity, not fear.',
    ],
  },
  {
    number: 2, band: 'builders', name: 'Builders', ages: '8–10',
    season: {
      title: 'The Island Post',
      premise: 'The bottle came from the Windward Isles, five small islands whose only ferry was damaged in the same storm. The islanders — a lighthouse keeper, a turtle-rescue volunteer, a farmer and a school with no supplies — need deliveries. The child’s robot becomes the islands’ post rover, upgraded for beaches, causeways, cliffs and farm paths.',
      setting: 'The Windward Isles: beaches, a tidal causeway, a lighthouse, a hill farm and a turtle beach.',
      arc: [
        { sessions: [1, 6], title: 'Measuring the Islands', summary: 'Exact distances with wheel encoders, any angle, four wheels for heavy mail, curves with two motors; the island map.', actEnd: 'The map shows a painted line to the lighthouse — but the keeper has stopped answering the radio.' },
        { sessions: [7, 12], title: 'The Lighthouse Line', summary: 'Line following with if / else, forever loops that end, junction choices, the tide timer, debugging like an engineer.', actEnd: 'The keeper is fine — her lamp broke — and she has spotted rubbish washing up on the turtle beach.' },
        { sessions: [13, 18], title: 'Sand, Rocks and Turtles', summary: 'A fair test of tracks against wheels, the gripper, colour sorting, protecting nests, the camera eye; the beach clean-up.', actEnd: 'The beach is clean, but storm season is coming and the farm is cut off.' },
        { sessions: [19, 24], title: 'Storm Season', summary: 'Sensors that lie, search patterns, designing for everyone, reliability, the people behind sea and farm robots; the grand route.', actEnd: 'The ferry returns, the islands keep their robot post — and a scientist on the ferry asks for help on a mountain ridge.' },
      ],
      finale: 'The Island Post Grand Route: each child’s rover runs a three-stop delivery designed by them, cheered by every islander.',
    },
    startRobot: { ...L1_END, description: 'The Explorer robot from Lantern Hill (children starting at Level 2 build an equivalent one in Session 1).' },
    endRobot: {
      body: 'child-choice', drive: 'child-choice', head: 'camera', tool: 'gripper', sensor: 'line',
      toolbox: [{ slot: 'tool', id: 'pen' }, { slot: 'tool', id: 'scoop' }, { slot: 'tool', id: 'light' }, { slot: 'sensor', id: 'bumper' }, { slot: 'sensor', id: 'color' }, { slot: 'head', id: 'distance' }, { slot: 'drive', id: 'wheels4' }, { slot: 'drive', id: 'tracks' }],
      description: 'A rover with the drive the child chose from their own fair test (four wheels or tracks), a camera, a gripper and a line sensor, with a full toolbox of swap-in parts.',
    },
    sessions: L2_SESSIONS,
    projects: L2_PROJECTS,
    certificate: {
      title: 'R2BOT Kids · Builder',
      wording: '{name} rebuilt {robotName} as the Island Post rover. {name} can measure and steer precisely, follow lines with if / else, choose parts from a fair test, sort with sensors, test a program until it is reliable, and design for the people who will use it.',
      criteria: ['Completed the four projects with every self-check ticked.', 'Recorded and used a fair-test results table (Session 13).', 'A final route that succeeded in ten runs in a row (Session 22 method).'],
    },
    blocks: cumulative(2),
    developmentalFit: [
      'Confident readers: text appears alongside voice; children type numbers with units.',
      'Concrete operational thinking: measurement, angles and fair tests suit 8–10; abstraction stays tied to things they can see.',
      'Collaboration grows: rotating roles (driver, navigator, tester, recorder) in pairs or threes.',
      'Rules and fairness matter at this age: fair tests and “robots in nature need rules” land well.',
    ],
  },
  {
    number: 3, band: 'inventors', name: 'Inventors', ages: '11–13',
    season: {
      title: 'Ridgeback Station',
      premise: 'A mountain research station on a glacier ridge measures snow, ice and weather. A rockfall has cut the path between its huts and its far weather masts, and winter is coming. The child’s robot becomes the station’s field rover — and learns to remember, measure, correct itself and decide.',
      setting: 'Ridgeback Station: huts on a ridge, a snowfield, a weather mast, a boulder field and a remote weather station.',
      arc: [
        { sessions: [1, 6], title: 'Arrival at the Ridge', summary: 'Variables, maths, the gyro, calibration and smooth proportional line following; the mail rover.', actEnd: 'The weather mast has gone silent: something is wrong with its cables.' },
        { sessions: [7, 12], title: 'The Weather Mast', summary: 'Wall following, tuning gain, state machines, logging data, the energy budget; the mast inspection.', actEnd: 'The mast readings show the ice is moving fast — the scientists need ice cores from the boulder field, now.' },
        { sessions: [13, 18], title: 'The Boulder Field', summary: 'Legs against tracks, centre of mass, odometry and landmarks, gentle gripping; the sample return.', actEnd: 'A whiteout rolls in while the remote station’s data is still out there.' },
        { sessions: [19, 24], title: 'Whiteout', summary: 'Levels of autonomy, fail-safes, combining sensors, honest data and wild places, field-robotics careers; the rescue rover.', actEnd: 'The data comes home. A message arrives from a desert research base preparing a Mars rehearsal.' },
      ],
      finale: 'Whiteout Rescue: each child’s autonomous rover finds the remote station in a simulated whiteout and brings its data home.',
    },
    startRobot: { body: 'child-choice', drive: 'child-choice', head: 'camera', tool: 'gripper', sensor: 'line', toolbox: [{ slot: 'sensor', id: 'color' }, { slot: 'head', id: 'distance' }], description: 'The Builder rover (children starting at Level 3 assemble an equivalent rover in Session 1).' },
    endRobot: {
      body: 'child-choice', drive: 'child-choice', head: 'distance', tool: 'gripper', sensor: 'line',
      toolbox: [{ slot: 'head', id: 'camera' }, { slot: 'sensor', id: 'color' }, { slot: 'drive', id: 'legs' }, { slot: 'drive', id: 'tracks' }],
      description: 'A field rover whose drive (legs or tracks) and head were chosen from measured trade-offs, running proportional control, a state machine and fail-safes.',
    },
    sessions: L3_SESSIONS,
    projects: L3_PROJECTS,
    certificate: {
      title: 'R2BOT Kids · Inventor',
      wording: '{name} made {robotName} a field rover for Ridgeback Station. {name} can use variables and maths in programs, calibrate sensors, tune a proportional controller, structure behaviour as states, log and summarise data, and decide when a human should be in charge.',
      criteria: ['Completed the four projects with every self-check ticked.', 'A gain-tuning log showing at least three tested values (Session 8).', 'A state diagram that matches the final program (Session 24).'],
    },
    blocks: cumulative(3),
    developmentalFit: [
      'Abstract reasoning is emerging: variables, ratios and proportional control are within reach with visual feedback (graphs of error).',
      'Identity and purpose matter: real science settings and real careers motivate.',
      'Peer collaboration is strong but social comparison is risky: no rankings; feedback is structured (two stars and a wish).',
      'Ethics discussions about wildlife, data and autonomy suit this age when anchored in the story.',
    ],
  },
  {
    number: 4, band: 'engineers', name: 'Engineers', ages: '14–17',
    season: {
      title: 'Red Valley',
      premise: 'A desert research base runs a Mars rehearsal: a crew lives as if on Mars for 24 “sols”, and their rover must work with long communication delays. The teen joins as the robotics engineer and turns their robot into an autonomous planetary rover — measured, controlled, mapped, tested and justified.',
      setting: 'Red Valley Analog Station, a fictional Mars-analog base in a red desert (real analog stations exist in deserts around the world).',
      arc: [
        { sessions: [1, 6], title: 'Landing', summary: 'Systems thinking, measuring motors, kinematics, heading hold, P, I and D; precision docking.', actEnd: 'Docking works — but the crater ahead has never been mapped.' },
        { sessions: [7, 12], title: 'Mapping the Valley', summary: 'Scanning, grid maps, path planning, behaviour priorities, communication delay; the autonomous survey.', actEnd: 'The map reveals a sample site the science team must have — on rough, failure-prone ground.' },
        { sessions: [13, 18], title: 'Sample Science', summary: 'Reach and grasp, test plans, fault detection, mass and energy trade-offs, working with people; the fault-tolerant fetch.', actEnd: 'A dust storm warning: visibility and sensors will degrade for days.' },
        { sessions: [19, 24], title: 'Dust Storm', summary: 'Noise and filters, a safety case, the ethics of autonomy, pathways, design review; the capstone mission.', actEnd: 'The mission ends with a portfolio-ready write-up — and the next step: Python and ROS 2 on R2BOT.' },
      ],
      finale: 'Mission Red Valley: each teen presents and runs their own autonomous mission with evidence, a safety case and an honest account of what failed.',
    },
    startRobot: { body: 'child-choice', drive: 'child-choice', head: 'distance', tool: 'gripper', sensor: 'line', toolbox: [{ slot: 'head', id: 'camera' }, { slot: 'sensor', id: 'color' }], description: 'The Inventor field rover (students starting at Level 4 assemble an equivalent rover in Session 1).' },
    endRobot: {
      body: 'child-choice', drive: 'child-choice', head: 'camera', tool: 'gripper', sensor: 'line',
      toolbox: [{ slot: 'head', id: 'distance' }, { slot: 'sensor', id: 'line' }, { slot: 'sensor', id: 'color' }, { slot: 'sensor', id: 'bumper' }],
      description: 'An autonomous rover (floor sensor and drive chosen by the student) configured for their capstone mission and justified in a design review: tuned PID-style control, mapping, behaviour priorities, fault detection and a safety case.',
    },
    sessions: L4_SESSIONS,
    projects: L4_PROJECTS,
    certificate: {
      title: 'R2BOT Kids · Engineer',
      wording: '{name} engineered {robotName} for Mission Red Valley. {name} can measure and model a robot, tune feedback control (P, I and D), build maps and plan paths, layer behaviours, test systematically, detect faults, and argue for a design’s safety and ethics with evidence.',
      criteria: ['Completed the four projects with every self-check ticked.', 'A capstone write-up with a test log and a safety case, reviewed by peers.', 'A design-review presentation.'],
    },
    blocks: cumulative(4),
    developmentalFit: [
      'Formal reasoning: modelling, data and trade-offs; students can hold several variables in mind.',
      'Autonomy and real stakes motivate: open capstones, real engineering artefacts (test logs, safety cases).',
      'Career relevance: explicit links to courses, portfolios and the next step (Python, ROS 2).',
      'Ethics debates about accountability and bias suit 14–17 and connect to citizenship education.',
    ],
  },
]

// ── Philosophy, assessment, school use (rendered into docs/kids-curriculum.md) ──

export const PRINCIPLES: { title: string; body: string }[] = [
  { title: 'One robot that grows with the child', body: 'Every child owns one robot for years, not a new toy each lesson. It starts as an empty box at five and ends as an autonomous rover at seventeen. Each new part arrives when the story needs it and the child understands it.' },
  { title: 'Real physics, not a cartoon', body: 'The simulator models mass, friction, slopes and sensor ranges. The same program goes less far uphill, slides on ice and stops short with a heavy load — so children meet the real reason engineers use sensors and feedback, instead of being told.' },
  { title: 'Every part has a reason', body: 'A part is never decoration. Each build step has a “try it without” moment: the child sees what goes wrong without the part before they add it. A block only works if the robot has the part it needs.' },
  { title: 'Story seasons', body: 'Each level is one season of an original story with an original cast (Spark, Amara, Nana Lucía, Bolt). Each session opens with a short animated episode and ends on a cliffhanger, so children come back because they want to know what happens.' },
  { title: 'Make it yours', body: 'Every sixth session is an open design project. Children ask, imagine, plan, build, test, improve and share their own idea within fair limits. Projects are where learning becomes theirs.' },
  { title: 'No ranking, ever', body: 'No leaderboards, no comparing children, no streak pressure. Stars reward care (planning first, fixing a bug, explaining why), never speed against others. Every child who learns the skills earns the same certificate.' },
  { title: 'Accurate and global', body: 'No wrong physics or sensor claims, even for five-year-olds: simplified, never false. Characters, places and everyday examples come from many countries; India appears as one setting among many, never the default.' },
]

export const ASSESSMENT: { title: string; body: string }[] = [
  { title: 'Every session', body: 'Three spoken check questions, each followed by a “why” whatever the child answers. They are for learning, not grading: the result is never shown as a score.' },
  { title: 'Stars', body: 'Up to three per challenge: one for completing it, two and three for craft (planning, fixing, explaining). Never for speed and never compared between children.' },
  { title: 'Skill badges', body: 'One per session, named for a skill (“Bug Detective”, “Choice Maker”). A badge says what the child can now do.' },
  { title: 'Projects', body: 'Four per level, assessed by the child’s own “I can” self-checks and the teacher’s observation. Sharing uses “a star and a wish” from classmates.' },
  { title: 'Certificates', body: 'One per level, earned by learning (projects, core badges, an explained bug or design decision), not by attendance. Missing pieces can be earned in catch-up sessions. Certificates make no claim of external accreditation.' },
]

export const SCHOOL_USE: { title: string; body: string }[] = [
  { title: 'Timetable', body: '24 sessions of 40 minutes = one session a week for about two school terms, or two a week for one term. Each session has a minute-by-minute plan that adds up to 40.' },
  { title: 'Devices', body: 'One device per pair (driver and navigator, swapping halfway). Runs in a browser on school laptops, tablets and phones; headphones per pair help in Level 1.' },
  { title: 'Unplugged first', body: 'Every session opens with a five-minute unplugged warm-up using things every classroom has, so the idea is in the body before it is on the screen.' },
  { title: 'Teacher support', body: 'Every session has discussion questions, the common misconceptions with a correction, and ideas for faster and slower learners. No prior robotics or coding knowledge is assumed.' },
  { title: 'Privacy', body: 'Children join a class with a code and a nickname; they never give an email, phone number, password or birthday. Work is shared with the class and family only, unless the teacher and a parent choose otherwise.' },
  { title: 'Home use', body: 'Every session ends with a parent note: what happened today, a five-minute activity with household things, and one open question to ask the child.' },
]

/** Decisions the simulator and product teams must make or confirm. */
export const OPEN_QUESTIONS: string[] = [
  'Turn sign convention: the curriculum uses positive turn_degrees = turn LEFT (counter-clockwise, the ROS and maths convention). Confirm the simulator matches.',
  'Level 1 calibration: the robot is tuned so drive_for(50 %, 1 s) ≈ one 25 cm tile on the flat mat with no load (±5 %). Sessions 14, 15 and 23 depend on load, slope and floor changing that distance.',
  'Sensor conditions in Level 1 are single picture blocks (e.g. repeat_until with cond fixed to "bumped" or "distance_cm < 20"). The simulator needs a fixed-parameter way to render these without exposing the compare block.',
  'Is an empty repeat_until body (Level 1 “Wait until the path is clear”) acceptable to the block engine, or should it be a dedicated wait_until block? The curriculum assumes the former to keep the shared block set unchanged.',
  'Level 1 checks sensors only between blocks (e.g. before each hop). Should a motion block be interrupted the moment a repeat_until condition becomes true? The curriculum assumes NO at Level 1 (simpler, honest about the limitation) and teaches continuous checking with set_motors + forever in Level 2.',
  'The shared block set has no procedures/functions or lists. CSTA 2-AP-14 (procedures with parameters) is therefore not addressed; Level 3–4 would benefit from a “make a block” feature.',
  'say() must accept a number reporter as well as text: from Level 2 children report sensor readings and variables aloud (“say distance_cm”).',
  'Level 4 text view: a read-only Python-style view of each block program would bridge to the main R2BOT Academy and ROS 2. Not in the current block contract.',
  'Battery/energy model: Levels 1 (light), 3 (energy budget) and 4 (trade-offs) assume the simulator shows a battery meter that drops with motor power, mass and lights.',
  'Legs drive (Level 3): the curriculum assumes legs are slower on flat ground but can step over obstacles up to about half their leg height, where wheels stop. Confirm the physics model.',
  'Level 4 mapping (sessions 7–9) assumes a simulator overlay that can show a grid map the student fills in; there is no list/array block to store a map in code.',
  'Certificate language and any school-facing alignment claims should be reviewed by an education adviser before publication (see mapping.ts: alignment notes, not certification).',
  'Episodes are scripts with beats and lines for 3D animation; voice casting and localisation (the season is written for translation) are not yet planned.',
]

export function levelByNumber(n: LevelNumber): Level {
  const l = LEVELS.find((x) => x.number === n)
  if (!l) throw new Error(`No level ${n}`)
  return l
}
