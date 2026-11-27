// lib/kids/curriculum/level4/act2.ts
// Level 4, Act 2 (sessions 7–12): "Mapping the Valley".
// Scanning with a distance sensor, grid maps of free and blocked cells, the
// wavefront (flood-fill) shortest path by hand, layered behaviours with
// priorities, designing for a 3–22-minute communication delay, and the second
// project: the autonomous survey.

import type { Session } from '../types'
import { CRATER, CREW, GRID_PATH, SURVEY_LANES, VALLEY_FLOOR } from './shared'
import { BUMPED, DIST, HEADING, LOGIC, MOVE, TALK, TIMER, VARS_MATH } from '../level3/shared'
import { arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong } from '../level3/kit'

const L = 4 as const

export const ACT2: Session[] = [
  // ── 7 ────────────────────────────────────────────────────────────────────
  makeSession(L, 7, {
    objectives: [
      o('Programs a scan: turns on the spot in fixed steps, takes a distance reading at each and reports angle–distance pairs.', 'I can make my robot scan around itself and report what it measures.', ['programming', 'data']),
      o('Sketches the surroundings from scan data and explains the limits of one narrow beam (gaps, max range, angle step).', 'I can draw a map from scan data and say what it might miss.', ['data', 'mathematics-geometry'], { concepts: ['sensors', 'data'] }),
    ],
    episode: episode('The Unmapped Crater', 'The rover learned to dock itself to within two centimetres.', [
      scene('The crater rim at sunrise. Below, a floor of red sand and dark outcrops no one has surveyed.', 'Dr Petrova points at a smudge on the satellite image.', 60, [
        ['guest', 'The satellite gives us one pixel per metre. Not good enough to drive through. We need the rover’s own eyes.', CREW.petrova],
        ['myrobot', 'My Distance Eyes only look one way.'],
        ['guest', 'Then turn around and look everywhere — one direction at a time.', CREW.petrova],
      ]),
      scene('The crater floor. The rover turns 30° at a time; a beam sweeps out and a dot appears wherever it hits.', 'After a full turn, twelve dots outline three rocks.', 70, [
        ['spark', 'Angle and distance: a polar map. Each reading is one dot on a spoke.'],
        ['myrobot', 'Between my spokes there are gaps. A thin rock could hide in one.'],
        ['spark', 'Smaller steps, more readings, more time. Every map is a trade-off between detail and effort.'],
        ['guest', 'This is how lidar works — the same idea, a thousand times a second.', CREW.petrova],
      ]),
      scene('The habitat map table. Twelve dots on polar paper outline three rocks — and a gap where a fourth might hide.', 'Dr Petrova circles the gap in pencil.', 30, [
        ['guest', 'Good map. Better still: it tells me where it might be wrong.', CREW.petrova],
      ]),
    ], 'Dr Petrova: “Dots are nice. I need a grid: which squares can a rover drive through?”'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'inspect',
      narration: 'Your Distance Eyes measure along one narrow beam. Turning the whole rover turns the beam.',
      why: 'A single beam plus a turn gives a scan; that is how many early robots — and today’s lidars — build a picture.',
      tryWithout: 'Without turning, the rover sees one direction only and drives into whatever is beside it.',
      physicsEffect: 'Beam cone about ±5°; range 2–200 cm (200 = no echo).',
      realWorld: 'Lidar sensors on self-driving cars and robot vacuums spin a laser to take hundreds of thousands of distance readings a second.',
    },
    code: challenge({
      title: 'Twelve Spokes',
      mission: 'Turn on the spot in twelve 30° steps. At each step say the angle turned so far and the distance.',
      arena: CRATER,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, ...TALK],
      example: [
        'variable_set(a, 0)',
        'repeat(12) {',
        '  wait(0.3); say(variable_get(a)); say(distance_cm)',
        '  turn_degrees(−30, 30); variable_change(a, 30)',
        '}',
      ],
      success: [crit('uses-blocks', 'Twelve angle–distance pairs reported.'), crit('no-collision', 'Never touches an outcrop.')],
      two: 'You plotted the twelve dots on polar paper.',
      three: 'You marked where a thin rock could hide between spokes.',
      hints: ['Turn, wait, read, say.', 'Keep the angle in a variable.', 'Twelve steps of 30° is a full turn.'],
    }),
    challenge: challenge({
      title: 'Nearest in Each Quarter',
      mission: 'Scan in 15° steps and report, for each quarter (front, right, back, left), the nearest obstacle distance and its angle.',
      arena: CRATER,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(a, 0)',
        'repeat(4) {',
        '  variable_set(best, 200); variable_set(bestA, −1)',
        '  repeat(6) {',
        '    wait(0.3)',
        '    if (compare(distance_cm < variable_get(best))) { variable_set(best, distance_cm); variable_set(bestA, variable_get(a)) }',
        '    turn_degrees(−15, 30); variable_change(a, 15)',
        '  }',
        '  say(variable_get(bestA)); say(variable_get(best))',
        '}',
      ],
      success: [crit('uses-blocks', 'Four (angle, nearest distance) pairs, each within 5 cm and 15° of the truth.'), crit('no-collision', 'Never touches an outcrop.')],
      two: 'Your sketch from the data matches the simulator’s top view.',
      three: 'You compared 30° and 15° scans: time taken against detail found.',
      hints: ['Four quarters, six steps each.', 'Track the smallest distance in each quarter.', 'Reset best to 200 at the start of each quarter.'],
    }),
    quiz: [
      q('A scan in 30° steps misses a thin pole. Why?', [
        right('The pole sat in the gap between two beams', '🕳️'),
        wrong('Distance sensors cannot see thin objects at all', '🙈', 'scan-sees-everything'),
        wrong('The pole must be further than 200 cm', '📏', 'scan-sees-everything'),
      ], 'A scan only samples the directions it points in. Between spokes there is no information, so small objects can hide there. Smaller steps reduce the gaps at the cost of time.'),
      q('At one angle the sensor reads 200. What does that tell you?', [
        right('No echo within range — open space, or something the beam did not return from', '❓'),
        wrong('A rock exactly 200 cm away', '🪨', 'no-reading-means-clear'),
        wrong('Definitely open space', '✅', 'no-reading-means-clear'),
      ], '200 is the “no echo” value: nothing within 2 m reflected the beam back. That usually means open space, but not certainly (a dark, angled or soft surface can return nothing).'),
      q('What is the cost of scanning in 5° steps instead of 30°?', [
        right('Six times more readings and time, for more detail', '⏱️'),
        wrong('No cost: smaller steps are always better', '🆓', 'scan-sees-everything'),
        wrong('Less accurate readings', '📉', 'scan-sees-everything'),
      ], 'Each reading takes time (and energy). Finer scans find more but take longer — a design trade-off.'),
    ],
    badge: { id: 'l4-scanner', name: 'Scanner', icon: '📡', earnedFor: 'You scanned the surroundings and turned distance readings into a sketch map.' },
    reward: { note: 'Polar plot: scan results now draw as dots in the top view.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Torch in the dark', 'what can a scan miss, and how would you know?'),
      warmup: {
        title: 'Torch in the dark',
        minutes: 5,
        steps: ['Darken the room (or imagine it). A student holds a torch with a narrow beam and turns in 45° steps, naming what the beam lands on.', 'Repeat at 15° steps.', 'Compare what each scan found and how long it took.'],
        materials: ['A torch (or a phone torch)'],
      },
      discussion: ['Where are scans used? (Lidar, sonar on ships, radar at airports, medical CT.)', 'How would you choose the step size for a Mars rover?'],
      misconceptions: [
        mc('scan-sees-everything', 'A scan sees everything around the robot.', 'A scan samples only the directions it points in, up to its range; gaps and limits mean it can miss things.', 'Draw twelve spokes on the board round a dot. Place small paper “rocks” between spokes. Which would the scan see? Halve the step and repeat.'),
        mc('no-reading-means-clear', 'A “no echo” reading always means the way is clear.', 'No echo can mean nothing is there OR the sensor cannot see; the robot must treat it carefully.', 'Cover a phone’s camera: the screen goes black. Does that mean the room is dark? Pairs list three reasons a sensor might report “nothing”.'),
      ],
      faster: ['Convert each (angle, distance) to (x, y) with a protractor and ruler, then draw a map to scale.', 'Write the conversion with sin and cos and check two points.'],
      slower: ['Do the 30° scan and plot only.', 'Provide polar paper with spokes drawn.'],
      notes: ['Maze Mapper (Pilot tier) is the playable challenge: sensing walls and building a map while exploring.'],
    }),
    parent: {
      today: 'Your teen made the rover scan its surroundings with a distance sensor and drew a map from the readings — the idea behind lidar.',
      tryAtHome: 'In a dim room, sweep a torch slowly in steps. What do big steps miss that small steps catch?',
      askYourChild: 'What could your scan miss, and how could you make it miss less?',
    },
  }),

  // ── 8 ────────────────────────────────────────────────────────────────────
  makeSession(L, 8, {
    objectives: [
      o('Drives survey lanes and reports the distance to the first obstacle in each, within 10 cm of the truth.', 'I can make my rover survey lanes and report what it finds.', ['programming', 'data']),
      o('Turns the rover’s readings into a grid map of free, blocked and unknown cells, following the data rather than what was seen.', 'I can turn my rover’s readings into a grid map.', ['data', 'mathematics-geometry'], { concepts: ['data', 'autonomy'] }),
    ],
    episode: episode('Free, Blocked, Unknown', 'The rover scanned the crater floor and sketched it from its readings.', [
      scene('The habitat map table. A grid drawn over the crater: five lanes, eight rows.', 'Dr Petrova colours three squares black, the rest white — then stops.', 60, [
        ['guest', 'I coloured these from the satellite. But I don’t KNOW them. A map has to say what’s free, what’s blocked — and what we just don’t know yet.', CREW.petrova],
        ['myrobot', 'So three colours: free, blocked, unknown. Everything starts unknown.'],
      ]),
      scene('The survey lanes. The rover sits at the start of each lane and reads straight down it.', 'Each reading fills a lane: free up to the obstacle, blocked at it, unknown beyond.', 70, [
        ['spark', 'One reading per lane: free cells up to the hit, a blocked cell at the hit, unknown behind it — the beam can’t see past.'],
        ['myrobot', 'Lane three: 140 centimetres. Two free cells, then blocked, then unknown.'],
        ['guest', 'And the map must follow from the readings — not from what you saw in the video. That’s the discipline.', CREW.petrova],
      ]),
      scene('The map table. Five lanes, coloured white, black and grey for unknown.', 'Arjun leans over it.', 30, [
        ['guest', 'Grey is honest. I’d rather plan round grey than drive into a white square that was really a guess.', CREW.mehta],
      ]),
    ], 'With a map in hand, Arjun asks the obvious question: “So what’s the shortest safe way across?”'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'inspect',
      narration: 'Each lane reading becomes a row of map cells: free up to the hit, blocked at it, unknown beyond.',
      why: 'A distance reading says what is free AND what is blocked — and implies what cannot be seen.',
      tryWithout: 'Without a map, every trip across the crater starts from zero knowledge.',
      physicsEffect: 'Lane cells are 50 cm; a reading of 140 cm means two free cells, then blocked.',
      realWorld: 'Robots build “occupancy grids” — maps of free, occupied and unknown cells — to plan safe routes, from vacuums to Mars rovers.',
    },
    code: challenge({
      title: 'One Lane',
      mission: 'At the start of lane 1, read the distance down the lane and say how many free cells (distance ÷ 50, rounded down) come before the obstacle.',
      arena: SURVEY_LANES,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, ...TALK],
      example: [
        'variable_set(d, distance_cm)',
        'say(variable_get(d))',
        'variable_set(free, 0)',
        'repeat_until(compare(math(math(variable_get(free) + 1) × 50) > variable_get(d))) { variable_change(free, 1) }  ← rounds down without a round block',
        'say(variable_get(free))',
      ],
      success: [crit('uses-blocks', 'Says the reading and the number of free cells.'), crit('no-collision', 'Does not move into the lane.')],
      two: 'You coloured lane 1 on the grid from the reading.',
      three: 'You marked the cells beyond the obstacle as unknown, not free.',
      hints: ['Each cell is 50 cm.', 'Count whole cells that fit before the obstacle.', 'Cells past the obstacle are unknown.'],
    }),
    challenge: challenge({
      title: 'Five Lanes, One Map',
      mission: 'Your program runs from each lane’s start (the simulator resets the rover to all five). In each, it says the distance to the first obstacle (or 200). Then draw the grid map from the readings only.',
      arena: SURVEY_LANES,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, ...TALK],
      example: ['wait(0.3)', 'variable_set(d, distance_cm)', 'say(variable_get(d))  ← the simulator runs this from each of the five lane starts'],
      success: [crit('uses-blocks', 'Each lane’s reported distance is within 10 cm of the truth (at least four of five lanes).'), crit('uses-blocks', 'The student’s grid map follows from the readings (free, blocked, unknown).')],
      two: 'Your map has three kinds of cell.',
      three: 'You took three readings per lane and reported the median.',
      hints: ['Wait for the rover to settle before reading.', 'The same program runs in every lane.', 'Draw from the numbers, not the picture.'],
    }),
    quiz: [
      q('A lane reads 140 cm. Which cells are free?', [
        right('The first two (0–100 cm); the third holds the obstacle', '⬜'),
        wrong('All eight: the rover was not blocked', '⬜', 'unknown-is-free'),
        wrong('None: there is an obstacle in the lane', '⬛', 'unknown-is-free'),
      ], 'The beam passed freely for 140 cm: cells 0–50 and 50–100 are free; the obstacle sits in the 100–150 cell. Beyond that, nothing is known.'),
      q('What should the map say about the cells behind the obstacle?', [
        right('Unknown: the beam could not see past it', '❔'),
        wrong('Free, unless proven blocked', '⬜', 'unknown-is-free'),
        wrong('Blocked, to be safe — and that’s the same as unknown', '⬛', 'unknown-is-free'),
      ], 'Unknown is its own state. A planner may treat unknown cautiously, but the map must not pretend to know.'),
      q('Why must the map follow from the rover’s readings, not from the video?', [
        right('On Mars the readings are the only evidence; the map must be checkable', '🔬'),
        wrong('Videos are always wrong', '🎥', 'map-from-memory'),
        wrong('It doesn’t matter where the map comes from if it looks right', '🖼️', 'map-from-memory'),
      ], 'A map made from evidence can be checked and repeated by others. A map drawn from memory or a picture you would not have on Mars cannot.'),
    ],
    badge: { id: 'l4-grid-mapper', name: 'Grid Mapper', icon: '🗺️', earnedFor: 'You built a grid map of free, blocked and unknown cells from your rover’s own readings.' },
    reward: { note: 'Map overlay: your grid map can be drawn over the simulator’s top view to compare.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Three colours', 'why is “unknown” different from “free”?'),
      warmup: {
        title: 'Three colours',
        minutes: 5,
        steps: ['Hide a few books under a sheet on a desk grid. Pairs may “probe” each lane once with a ruler from one edge.', 'They colour a grid: free, blocked, unknown.', 'Lift the sheet and compare.'],
        materials: ['A sheet', 'Some books', 'A ruler', 'Grid paper'],
      },
      discussion: ['What would a planner do with unknown cells — avoid them, explore them?', 'Why do maps on Mars carry the date and the rover that made them?'],
      misconceptions: [
        mc('unknown-is-free', 'If nothing was seen there, it is free.', 'Cells the sensor could not observe are unknown, not free; free means “observed and empty”.', 'Under the sheet game: compare a map where unseen cells were coloured free with the real layout. How many “free” cells held a book?'),
        mc('map-from-memory', 'A map can be drawn from what you remember seeing.', 'A trustworthy map is built from recorded measurements, so it can be checked and repeated.', 'Two pairs map the same hidden layout: one from probe readings, one from a quick peek. Swap maps and test them with a probe: which holds up?'),
      ],
      faster: ['Scan from two lane ends (both directions) and fill in more unknown cells.', 'Mark each cell with how many readings support it (confidence).'],
      slower: ['Map three lanes only.', 'Provide the free-cell counting code.'],
      notes: ['There are no list blocks, so the grid map lives on paper (and in the simulator overlay), as levels.ts says.'],
    }),
    parent: {
      today: 'Your teen made a grid map of a crater from their rover’s distance readings, marking cells free, blocked or unknown.',
      tryAtHome: 'Make a rough map of a room from one doorway only. Which parts are free, which blocked — and which can’t you see from there?',
      askYourChild: 'Why does your map have an “unknown” colour?',
    },
  }),

  // ── 9 ────────────────────────────────────────────────────────────────────
  makeSession(L, 9, {
    objectives: [
      o('Finds a shortest path on a grid by the wavefront (flood-fill) method by hand, and programs the rover to drive it.', 'I can find a shortest path on a grid map and drive it.', ['algorithms', 'mathematics-geometry']),
      o('Explains why the wavefront always finds a shortest path on a grid with equal-cost moves.', 'I can explain why the wavefront finds the shortest way.', ['algorithms'], { concepts: ['autonomy', 'decomposition'] }),
    ],
    episode: episode('The Wavefront', 'The rover turned its readings into a grid map of the crater.', [
      scene('Flight control. Arjun spreads the grid map; rubble cells are shaded.', 'Three crew members draw three different routes — all different lengths.', 55, [
        ['guest', 'Everyone has a favourite route. I want the shortest — and proof that it is.', CREW.mehta],
      ]),
      scene('Spark writes 0 in the goal cell, then 1 in every free neighbour, then 2 in theirs…', 'Numbers ripple out across the map like rings in a pond until they reach the rover.', 80, [
        ['spark', 'A wave from the goal: each free cell gets one more than its smallest numbered neighbour. When the wave reaches the start, the number is the length of the shortest path.'],
        ['myrobot', 'Then I just walk downhill: from 11 to any neighbour with 10, then 9… down to 0.'],
        ['guest', 'And because the wave spreads one step at a time, nothing shorter can exist. That’s my proof.', CREW.mehta],
      ]),
      scene('The rubble grid. The rover follows the numbers downhill, 11 to 0, and stops in the green cell.', 'Arjun ticks the route on his map.', 30, [
        ['guest', 'Eleven moves. Exactly what the wave said. That’s a plan you can defend.', CREW.mehta],
      ]),
    ], 'The planned route crosses a dust devil’s path. Plans are good — but the rover also needs reflexes.'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'inspect',
      narration: 'The plan is made on paper; the rover executes it with drive and turn blocks — the line sensor rests today.',
      why: 'Planning and acting are separate jobs: a planner finds the route; the controller drives it.',
      tryWithout: 'Without a plan the rover can only wander or follow a wall — and might take ten times as long.',
      physicsEffect: 'Grid cells 50 cm; the rubble layout is fixed and printed on the worksheet.',
      realWorld: 'Robot route planners (breadth-first search, Dijkstra, A*) all grow a wave of explored cells from the start or the goal.',
    },
    code: challenge({
      title: 'Drive the Plan',
      mission: 'Your wavefront on paper gives a sequence of moves. Program it as drive_distance and turn_degrees blocks and reach the goal without entering a rubble cell.',
      arena: GRID_PATH,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, ...TALK],
      example: [
        'drive_distance(150, 40)  ← up 3 cells (wave 11 → 8)',
        'turn_degrees(−90, 40); drive_distance(200, 40)  ← right 4 cells (8 → 4)',
        'turn_degrees(90, 40); drive_distance(100, 40)  ← up 2 cells (4 → 2)',
        'turn_degrees(−90, 40); drive_distance(150, 40)  ← right 3 cells (2 → … 0 is reached after the final leg)',
        '… exact moves depend on the printed layout …',
      ],
      success: [crit('stop-in-zone', 'Ends in the goal cell.'), crit('no-collision', 'Never enters a rubble cell.')],
      two: 'Your wavefront numbers are on the worksheet next to the program.',
      three: 'Your path length equals the wave number at the start.',
      hints: ['Number from the goal outwards, not from the start.', 'Walk downhill one number at a time.', 'Group straight runs into one drive block.'],
    }),
    challenge: challenge({
      title: 'Prove It Is Shortest',
      mission: 'The teacher changes two rubble cells. Redo the wavefront, drive the new shortest path, and say its length in cells — which must equal the wave number at the start.',
      arena: arena(GRID_PATH, { features: ['Fourteen blocked cells, then two changed by the teacher (second worksheet).', 'Goal cell marked green.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, ...TALK],
      example: ['variable_set(cells, 0)', 'drive_distance(100, 40); variable_change(cells, 2)', '… one block per straight run, adding its cells …', 'say(variable_get(cells))  ← equals the wavefront number at the start'],
      success: [crit('stop-in-zone', 'Ends in the goal cell on the changed map.'), crit('no-collision', 'Never enters a rubble cell.'), crit('uses-blocks', 'Says the path length, equal to the wave number at the start.')],
      two: 'You redid the whole wave, not just patched the old path.',
      three: 'You found a second, equally short path and explained why both are shortest.',
      hints: ['Start the wave again from the goal on the new map.', 'Count cells as you drive and say the total.', 'Several shortest paths can exist; any one is fine.'],
    }),
    quiz: [
      q('In the wavefront, why do you start numbering from the goal?', [
        right('Then every cell’s number is its distance to the goal, so you can walk downhill from anywhere', '🎯'),
        wrong('Because the goal is always closer to the rover', '📍', 'greedy-is-shortest'),
        wrong('It makes no difference which end you start from', '🔁', 'greedy-is-shortest'),
      ], 'Numbering from the goal gives every cell its distance-to-goal, so the rover can follow decreasing numbers from wherever it is. (Numbering from the start also works, but then you trace back from the goal.)'),
      q('A route that always moves towards the goal in a straight line…', [
        right('Can get trapped behind rubble and is not guaranteed shortest', '🧱'),
        wrong('Is always the shortest path', '➡️', 'greedy-is-shortest'),
        wrong('Is what the wavefront produces', '🌊', 'greedy-is-shortest'),
      ], 'Heading straight for the goal is greedy: it can lead into a dead end. The wavefront considers every route by spreading out evenly.'),
      q('The wave number at the rover’s start cell is 11. What does that mean?', [
        right('The shortest path is 11 moves', '1️⃣1️⃣'),
        wrong('There are 11 possible paths', '🔢', 'wave-number-is-paths'),
        wrong('The goal is 11 cells away in a straight line', '📏', 'wave-number-is-paths'),
      ], 'Each ring of the wave is one more move from the goal, so 11 is the shortest number of moves around the obstacles — not a straight-line distance or a count of paths.'),
    ],
    badge: { id: 'l4-path-planner', name: 'Path Planner', icon: '🌊', earnedFor: 'You found a provably shortest path with the wavefront method and drove it.' },
    reward: { note: 'Wavefront sheet: a printable grid for planning is added to your tools.' },
    teacher: teacher({
      timing: lessonPlan(7, 'Ripples on the grid', 'how do you know nothing shorter exists?'),
      warmup: {
        title: 'Ripples on the grid',
        minutes: 7,
        steps: ['On a 6 × 6 grid with a few blocked squares, write 0 in the goal.', 'Pairs write 1 in every free neighbour (up, down, left, right), then 2, and so on.', 'Find the start’s number; trace a path downhill. Compare paths between pairs.'],
        materials: ['A 6 × 6 grid worksheet per pair'],
      },
      discussion: ['Where do you see shortest-path planning? (Maps apps, delivery robots, game characters.)', 'What changes if some cells cost more (sand vs rock)?'],
      misconceptions: [
        mc('greedy-is-shortest', 'Always heading towards the goal gives the shortest path.', 'Greedy moves can lead into dead ends; a systematic search (the wavefront) is guaranteed shortest on a grid.', 'Draw a U-shaped wall between start and goal. Pairs try “always move towards the goal” and then the wavefront. Compare lengths.'),
        mc('wave-number-is-paths', 'The wave number counts paths or straight-line distance.', 'The wave number is the number of moves on the shortest path around obstacles.', 'On a small grid, students count moves along their path and compare with the start’s wave number.'),
      ],
      faster: ['Add diagonal moves (cost 1.4) and see how the wave changes.', 'Read about A* (the Skill Galaxy activity “A* across the crater field”) and say what it adds.'],
      slower: ['Use a 5 × 5 grid with three blocked cells.', 'Provide the wave numbers; students trace the path and program it.'],
      notes: ['The wavefront is breadth-first search on a grid: name it, so students recognise it later in computer science.'],
    }),
    parent: {
      today: 'Your teen found a provably shortest route across a grid map with the wavefront method — the idea behind route planners.',
      tryAtHome: 'Draw a small maze on squared paper together and number the squares outwards from the exit. Then walk “downhill” from the entrance.',
      askYourChild: 'How do you know the wavefront found the shortest path?',
    },
  }),

  // ── 10 ───────────────────────────────────────────────────────────────────
  makeSession(L, 10, {
    objectives: [
      o('Layers behaviours with explicit priorities — a bump beats avoiding, avoiding beats heading to the goal, heading beats exploring — and runs one per loop.', 'I can layer behaviours so the most important one always wins.', ['programming', 'algorithms']),
      o('Explains how a behaviour-based robot stays safe while still making progress.', 'I can explain how priorities keep a robot safe and moving.', ['algorithms'], { concepts: ['autonomy', 'conditions'] }),
    ],
    episode: episode('Reflexes', 'The rover planned the shortest path across the crater.', [
      scene('The crater floor. A dust devil skitters across the planned route, blowing a small rock into the path.', 'The rover, executing its plan, nudges the rock and stalls.', 55, [
        ['guest', 'Plans assume the world holds still. It doesn’t. You need reflexes that run underneath the plan.', CREW.ramirez],
        ['myrobot', 'Like flinching before you think.'],
      ]),
      scene('Diego draws four layers like a stack of trays: BUMP · AVOID · GO TO GOAL · EXPLORE.', 'A higher tray, when active, hides the ones beneath.', 75, [
        ['guest', 'Bottom: wander if you have nothing better to do. Above it: head for the goal. Above that: steer away from anything close. On top: if you touch something — back off, now.', CREW.ramirez],
        ['spark', 'Each loop, check from the top. The first layer that wants control gets it.'],
        ['myrobot', 'So the goal layer never has to worry about rocks. The avoid layer does that.'],
      ]),
      scene('The crater floor. A rock rolls into the path; the rover’s avoid layer swings it round, then the goal layer takes over again.', 'Diego nods slowly.', 30, [
        ['guest', 'It didn’t think about it. It just did the safe thing first. That’s what reflexes are for.', CREW.ramirez],
      ]),
    ], 'Arjun’s console beeps: “Message from Earth — sent fourteen minutes ago.”'),
    build: {
      part: { slot: 'sensor', id: 'bumper' },
      action: 'swap',
      narration: 'Swap the line sensor for the bumper: the top layer’s trigger, the last line of defence.',
      why: 'Touch is the most certain sense: if the bumper presses, something is definitely there.',
      tryWithout: 'Without a bumper, a rock the distance beam misses (too low, too thin) stalls the rover with nobody noticing.',
      physicsEffect: 'Bumper switch across the front; presses at a few newtons of contact.',
      realWorld: 'Robot vacuums layer exactly these behaviours, and Rodney Brooks’s “subsumption” robots in the 1980s made the idea famous.',
    },
    code: challenge({
      title: 'Two Layers',
      mission: 'Each loop: if something is closer than 30 cm, turn right 30° (AVOID); otherwise hold heading 90° towards the beacon (GO TO GOAL).',
      arena: arena(VALLEY_FLOOR, { requires: ['move', 'see-wall'], features: ['Three rocks (walls) between the start and the beacon.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'repeat_until(compare(timer_s > 25)) {',
        '  if_else(compare(distance_cm < 30)) { turn_degrees(−30, 40); drive_distance(20, 35) } else {',
        '    variable_set(e, math(heading_deg − 90))',
        '    set_motors(math(40 − math(1.5 × variable_get(e))), math(40 + math(1.5 × variable_get(e))))',
        '  }',
        '}',
        'stop',
      ],
      success: [crit('reach-zone', 'Reaches the beacon zone.'), crit('no-collision', 'Never touches a rock.')],
      two: 'You drew the two layers and their trigger.',
      three: 'You explained why AVOID must be checked first.',
      hints: ['Check the most urgent layer first.', 'Only if AVOID does not fire, run GO TO GOAL.', 'Use if_else so only one layer acts per loop.'],
    }),
    challenge: challenge({
      title: 'Four Layers',
      mission: 'Add BUMP on top (back off 20 cm, turn 60°) and EXPLORE at the bottom (if the beacon heading is lost — the timer passes 20 s — wander). Reach the beacon through rocks and a low rock the beam can’t see.',
      arena: arena(VALLEY_FLOOR, { requires: ['move', 'see-wall', 'feel-bump'], features: ['Three rocks (walls) and one low rock below the distance beam.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, BUMPED, TIMER, ...TALK],
      example: [
        'repeat_until(compare(timer_s > 40)) {',
        '  if_else(bumped) { drive_distance(−20, 30); turn_degrees(−60, 40) } else {',
        '    if_else(compare(distance_cm < 30)) { turn_degrees(−30, 40); drive_distance(20, 35) } else {',
        '      if_else(compare(timer_s < 20)) {',
        '        variable_set(e, math(heading_deg − 90)); set_motors(math(40 − math(1.5 × variable_get(e))), math(40 + math(1.5 × variable_get(e))))',
        '      } else { set_motors(40, 30) }  ← EXPLORE: a gentle curve',
        '    }',
        '  }',
        '}',
        'stop',
      ],
      success: [crit('reach-zone', 'Reaches the beacon zone.'), crit('touch-and-react', 'When the low rock is bumped, the rover backs off and recovers.')],
      two: 'Your layer diagram matches the order of your checks.',
      three: 'You logged which layer was active each second and found the busiest one.',
      hints: ['Top of the ladder: the bumper.', 'Each layer is one rung of an if_else ladder.', 'EXPLORE only runs when nothing above it wants control.'],
    }),
    quiz: [
      q('The goal layer says “go straight”; the avoid layer says “turn right”. Which acts?', [
        right('Avoid — it is higher priority, so it wins this loop', '🛡️'),
        wrong('Both: the rover blends the two commands', '🔀', 'behaviours-blend'),
        wrong('Goal — it is the reason the robot exists', '🎯', 'behaviours-blend'),
      ], 'In a priority stack, the highest active layer takes control and the others wait. (Some robots blend behaviours, but this design does not.)'),
      q('Why put BUMP above AVOID?', [
        right('A bump means contact has already happened — the most urgent situation', '💥'),
        wrong('Bumpers are more accurate than distance sensors at long range', '📏', 'priority-equals-frequency'),
        wrong('BUMP is used most often', '🔁', 'priority-equals-frequency'),
      ], 'Priority follows urgency and safety, not how often a layer is used. Contact is the clearest sign that something must change right now.'),
      q('What does the EXPLORE layer do in this design?', [
        right('Runs only when no higher layer wants control, so the rover keeps moving', '🧭'),
        wrong('Overrides the others every few seconds', '⏰', 'priority-equals-frequency'),
        wrong('Plans the shortest path', '🌊', 'behaviours-blend'),
      ], 'The lowest layer fills the gaps: if nothing more important is happening, explore. It never interrupts a higher layer.'),
    ],
    badge: { id: 'l4-behaviour-stack', name: 'Behaviour Stack', icon: '🥞', earnedFor: 'You layered behaviours with priorities so the rover stays safe and keeps moving.' },
    reward: { note: 'Bumper fitted: the top layer of every behaviour stack.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Reflex, then plan', 'how do priorities keep a robot both safe and useful?'),
      warmup: {
        title: 'Reflex, then plan',
        minutes: 5,
        steps: ['Students walk to a corner (goal) while a partner may gently tap a shoulder (bump) or say “close!” (avoid).', 'Rules: a tap beats “close”, “close” beats “go to the corner”.', 'Discuss: did they still reach the corner?'],
        materials: ['A cleared space'],
      },
      discussion: ['Which human reflexes override what you planned to do?', 'What could go wrong if two layers had the same priority?'],
      misconceptions: [
        mc('behaviours-blend', 'All active behaviours act together (or the main goal always wins).', 'In a priority stack, only the highest active layer acts each loop; the goal waits while safety acts.', 'Act it out with three students holding layer cards; call out situations; only the highest raised card “speaks”.'),
        mc('priority-equals-frequency', 'The most-used behaviour should have the highest priority.', 'Priority follows urgency and safety, not frequency; the most-used layer is often the lowest.', 'Log which layer was active each second in a run. The busiest is usually GO TO GOAL — near the bottom. Discuss why.'),
      ],
      faster: ['Add a fifth layer: LOW BATTERY → head home (simulate with the timer).', 'Make the AVOID turn direction depend on which side has more space (scan left and right).'],
      slower: ['Two layers only (AVOID over GOAL).', 'Provide the ladder; students choose the thresholds.'],
      notes: ['Robo Sumo’s search → charge → recover and robot vacuums are good examples to name.'],
    }),
    parent: {
      today: 'Your teen gave the rover layered behaviours — bump, avoid, go to goal, explore — where the most urgent one always wins.',
      tryAtHome: 'Talk about reflexes: you pull your hand off something hot before you think. How is that like a robot’s top-priority behaviour?',
      askYourChild: 'Why does the bump behaviour beat everything else?',
    },
  }),

  // ── 11 ───────────────────────────────────────────────────────────────────
  makeSession(L, 11, {
    objectives: [
      o('Calculates the one-way and round-trip communication delay to Mars and explains why a rover cannot be driven by joystick.', 'I can work out the delay to Mars and explain why rovers need autonomy.', ['mathematics-measurement', 'impacts-of-computing']),
      o('Designs a command sequence the rover executes on its own, with on-board hazard checks and a status report, for a delayed link.', 'I can design commands that a rover carries out safely on its own.', ['programming', 'engineering-design'], { concepts: ['autonomy', 'events-timing'] }),
    ],
    episode: episode('Fourteen Minutes', 'The rover learned reflexes: layered behaviours with priorities.', [
      scene('Flight control at Red Valley, where the crew simulate Earth’s delay. A clock reads DELAY 14:00.', 'Arjun presses “stop” on a joystick. Fourteen minutes later, on screen, the rover stops — at the bottom of a ditch.', 70, [
        ['guest', 'Light takes between about three and twenty-two minutes to reach Mars, depending on where the planets are. One way. You see what happened fourteen minutes ago, and your answer arrives fourteen minutes from now.', CREW.mehta],
        ['myrobot', 'So by the time you see a cliff, I’ve already driven off it.'],
        ['guest', 'Which is why real rover teams send a day’s plan, and the rover checks for hazards itself.', CREW.mehta],
      ]),
      scene('The planning room. A command list on the wall: DRIVE 2 m · TURN 30 · DRIVE 1 m · SCAN · REPORT.', 'Beside each command: “IF HAZARD: STOP, REPORT.”', 60, [
        ['spark', 'Earth decides WHAT. The rover decides HOW, and WHEN TO STOP.'],
        ['guest', 'And the report tells us why it stopped, so tomorrow’s plan can fix it.', CREW.mehta],
      ]),
      scene('Flight control. Fourteen minutes after the plan was sent, a report arrives: “Stopped at step 3. Rock at 62 cm. Waiting.”', 'Arjun smiles and starts writing tomorrow’s plan.', 30, [
        ['guest', 'It stopped, it told us why, and it’s safe. That’s a good day on Mars.', CREW.mehta],
      ]),
    ], 'Sol 12: a crater no one has mapped, a rover on its own, and Earth fourteen minutes away.'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'inspect',
      narration: 'With Earth minutes away, the rover’s own sensors are the only ones that can stop it in time.',
      why: 'Hazard checks on board act in milliseconds; a human on Earth acts minutes later.',
      tryWithout: 'Without on-board checks, a delayed “stop” arrives long after the hazard.',
      physicsEffect: 'No change. Simulated delay: 14 minutes each way is replaced by 14 seconds in the arena (same idea, shorter wait).',
      realWorld: 'Mars rovers receive a plan each day and use on-board hazard avoidance (AutoNav on Perseverance) to drive safely between check-ins.',
    },
    code: challenge({
      title: 'Joystick with a Delay',
      mission: 'Simulate a delayed joystick: wait 14 s (the “delay”), then drive 100 cm, whatever is ahead. Watch what happens, then add one hazard check before the drive.',
      arena: arena(VALLEY_FLOOR, { requires: ['move', 'see-wall'], features: ['A rock 80 cm ahead of the start.', 'The simulated delay is 14 s each way.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER, ...TALK],
      example: ['wait(14)  ← the command is on its way', 'if_else(compare(distance_cm < 110)) { say("Hazard: command refused") } else { drive_distance(100, 40) }'],
      success: [crit('no-collision', 'With the hazard check, the rover never hits the rock.'), crit('uses-blocks', 'Says why it refused.')],
      two: 'You ran it once without the check and recorded the result.',
      three: 'You worked out the real one-way delay for two different Earth–Mars distances.',
      hints: ['The command arrives late, but the rock is already there.', 'Check before acting, on board.', 'Refuse and report if the way is blocked.'],
    }),
    challenge: challenge({
      title: 'A Day’s Plan',
      mission: 'Write a command sequence to reach the beacon (no joystick allowed). Each command checks for hazards on board; if one is found, the rover stops, says what and where, and waits for the next plan.',
      arena: arena(VALLEY_FLOOR, { requires: ['move', 'see-wall'], features: ['Two rocks on the direct line; the planner (you) knows only one of them.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(step, 0); variable_set(ok, 1)',
        'repeat(6) {',
        '  if (compare(variable_get(ok) = 1)) {',
        '    if_else(compare(distance_cm < 80)) { stop; variable_set(ok, 0); say("Hazard at step"); say(variable_get(step)); say(distance_cm) }',
        '    else { drive_distance(70, 35); variable_change(step, 1) }',
        '  }',
        '}',
        'if (compare(variable_get(ok) = 1)) { say("Plan complete") }',
      ],
      success: [crit('no-collision', 'Never touches a rock.'), crit('uses-blocks', 'Every command is preceded by an on-board hazard check; a stop is reported with the step and distance.')],
      two: 'Your report would let the planners write tomorrow’s plan.',
      three: 'You extended the rover’s authority: it steers round small hazards itself and only stops for big ones.',
      hints: ['Check, then act, for every command.', 'If stopped, say enough for Earth to understand.', 'Give the rover the right to avoid small rocks on its own.'],
    }),
    quiz: [
      q('Light takes about 3–22 minutes each way between Earth and Mars. Why can’t a rover be joysticked?', [
        right('By the time the driver sees a hazard and reacts, the rover has been moving for minutes', '⏳'),
        wrong('Radio signals can’t reach Mars', '📡', 'delay-is-just-slow'),
        wrong('It can — the driver just needs to drive slowly', '🐢', 'delay-is-just-slow'),
      ], 'The round trip is 6–44 minutes. Even driving very slowly, the rover would act on minutes-old commands. Hazard checks must happen on board.'),
      q('In a day’s plan, who decides what?', [
        right('Earth sets the goals and route; the rover handles hazards and when to stop', '🤝'),
        wrong('Earth decides everything, including each wheel turn', '🕹️', 'autonomy-all-or-nothing'),
        wrong('The rover decides everything; Earth just watches', '🤖', 'autonomy-all-or-nothing'),
      ], 'Delay pushes split control: humans plan, the robot executes with local autonomy, and reports back.'),
      q('Why should a rover’s stop report say what and where?', [
        right('So the next plan can deal with the cause without wasting a day', '📝'),
        wrong('It doesn’t matter: the rover can try again on its own', '🔁', 'reports-are-optional'),
        wrong('Reports are only needed when the rover breaks', '🔧', 'reports-are-optional'),
      ], 'Every exchange costs at least one delayed round trip. A clear report lets planners fix the problem in the next plan instead of asking questions first.'),
    ],
    badge: { id: 'l4-delay-designer', name: 'Delay Designer', icon: '⏳', earnedFor: 'You designed commands a rover can carry out safely on its own, minutes from Earth.' },
    reward: { note: 'Plan mode: your missions can now be written as a day’s plan with on-board checks.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Fourteen-second delay', 'what should Earth decide, and what should the rover decide?'),
      warmup: {
        title: 'Fourteen-second delay',
        minutes: 6,
        steps: ['A “driver” guides a “rover” student across the room, but every instruction must be written on paper and only read out 14 s later.', 'Then repeat with the rover allowed to stop itself if close to something.', 'Compare.'],
        materials: ['Paper slips', 'A stopwatch'],
      },
      discussion: ['Where else do delays force autonomy? (Deep-sea robots, satellites, robots in disaster zones with poor signal.)', 'How much authority should a rover have? What should always need a human?'],
      misconceptions: [
        mc('delay-is-just-slow', 'Communication delay only means the rover must go slowly.', 'With minutes of delay, the rover acts on old information; safety decisions must be made on board.', 'Delayed-instruction game: even at a slow walk, the 14 s delay causes a bump. Ask what would actually prevent it.'),
        mc('autonomy-all-or-nothing', 'A robot is either fully controlled by a human or fully autonomous.', 'There is a range; shared control splits decisions between human and robot.', 'Draw a line from “human does everything” to “robot does everything”. Students place a car with cruise control, a robot vacuum, a drone with return-home and a surgical robot on it.'),
        mc('reports-are-optional', 'Status reports are only needed when something breaks.', 'Under delay, every report shapes the next plan; clear, routine reports save whole days.', 'Two report cards: “Stopped.” vs “Stopped at step 3, rock 62 cm ahead, heading 90°.” Pairs write the next plan from each.'),
      ],
      faster: ['Compute the delay for Earth–Moon (about 1.3 s) and discuss why the Moon can be teleoperated.', 'Write a fallback: if no new plan arrives in 60 s, return to the last safe point.'],
      slower: ['Do the single-command challenge only.', 'Provide the report sentence: “Stopped at step __ because __ was __ cm ahead.”'],
      notes: ['Mars Rover Command (Ace tier) is the playable challenge: planning under latency with hazards.'],
    }),
    parent: {
      today: 'Your teen worked out why Mars rovers can’t be driven like a remote-control car (minutes of delay) and designed commands the rover carries out safely on its own.',
      tryAtHome: 'Try giving directions by text message with a 30-second wait before each one is read. What goes wrong?',
      askYourChild: 'What should the rover decide for itself, and what should Earth decide?',
    },
  }),

  // ── 12 ───────────────────────────────────────────────────────────────────
  makeSession(L, 12, {
    objectives: [
      o('Designs an autonomous survey that reports each lane’s first-obstacle distance accurately and returns to base within a time limit, with no pre-loaded map.', 'I can design a rover that surveys unknown ground by itself and comes back.', ['engineering-design', 'programming']),
      o('Builds a grid map from the rover’s own reports and explains why autonomy is needed here.', 'I can draw a map from my rover’s reports and explain why it had to work alone.', ['data', 'communication'], { concepts: ['data', 'design-process'] }),
    ],
    episode: episode('Autonomous Survey', 'The engineer learned to design for a 14-minute delay.', [
      scene('Sol 12. The crater floor. Flight control is on a simulated delay; nobody can help in time.', 'Dr Petrova pins an empty grid to the wall.', 55, [
        ['guest', 'I want a map good enough for the next rover to plan a route. Five lanes, first obstacle in each, back at base before the battery window closes.', CREW.petrova],
        ['guest', 'And no peeking. The map comes from your rover’s reports or it doesn’t count.', CREW.mehta],
      ]),
      scene('The engineer’s plan: SCAN LANE → REPORT → SHIFT → … → RETURN, with a timer and a hazard layer underneath.', 'The grid waits to be filled.', 45, [
        ['myrobot', 'Reflexes underneath, a plan on top, and a report from every lane.'],
      ]),
    ], 'The map reveals a sample site the science team must have — on rough, failure-prone ground.'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Choose what to carry on the survey — every gram costs time and battery.',
      why: 'A survey needs sensing, not tools; carrying nothing is a valid engineering choice.',
      tryWithout: 'Carrying a tool you never use makes every lane slower.',
      physicsEffect: 'Tools add 0.10–0.12 kg.',
      realWorld: 'Survey robots — from ocean gliders to Mars rovers — carry the instruments the survey needs and little else.',
    },
    code: challenge({
      title: 'Lane by Lane',
      mission: 'From base, survey lanes 1 and 2: at each lane start, read three times, report the median, then move 50 cm right to the next lane.',
      arena: SURVEY_LANES,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, BUMPED, ...TALK],
      example: [
        'repeat(2) {',
        '  wait(0.3); variable_set(a, distance_cm); wait(0.3); variable_set(b, distance_cm); wait(0.3); variable_set(c, distance_cm)',
        '  … median of a, b, c with compare blocks …',
        '  say(variable_get(med))',
        '  turn_degrees(−90, 40); drive_distance(50, 35); turn_degrees(90, 40)',
        '}',
      ],
      success: [crit('uses-blocks', 'Two lane reports within 10 cm of the truth.'), crit('no-collision', 'Never touches an obstacle.')],
      two: 'You explained why the median, not the mean, of three readings.',
      three: 'Your hazard layer runs during the shifts between lanes.',
      hints: ['Three readings, then pick the middle one.', 'Shift right 50 cm between lanes.', 'Keep a bump/avoid layer active while moving.'],
    }),
    challenge: challenge({
      title: 'Autonomous Survey',
      mission: 'Your design: survey all five lanes with no pre-loaded map, report each lane’s first-obstacle distance (or 200), and return to base within 90 s. Then draw the grid map from the reports only.',
      arena: arena(SURVEY_LANES, { extraStarts: undefined, features: ['Obstacles in 3–4 of the 5 lanes, at random distances.', 'Base marker at lane 1’s start; 90 s time limit.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, BUMPED, ...TALK],
      example: [
        'variable_set(lane, 1)',
        'repeat(5) {',
        '  … three readings, median, say(lane) and say(med) …',
        '  if (compare(variable_get(lane) < 5)) { turn_degrees(−90, 40); drive_distance(50, 35); turn_degrees(90, 40) }',
        '  variable_change(lane, 1)',
        '}',
        'turn_degrees(90, 40); drive_distance(200, 40); turn_degrees(−90, 40)  ← back to base',
        'if (compare(timer_s > 90)) { say("Over time") } else { say("Survey complete") }',
      ],
      success: [crit('uses-blocks', 'At least four of five lane reports within 10 cm of the truth.'), crit('within-time', 'Back at base within 90 s.'), crit('uses-blocks', 'The student’s grid map follows from the reports.')],
      two: 'Your map uses free, blocked and unknown correctly.',
      three: 'Your write-up says in two sentences why this survey had to be autonomous.',
      hints: ['Build one lane perfectly, then loop it.', 'Watch the timer: leave time for the drive home.', 'Draw the map only from what the rover said.'],
    }),
    quiz: [
      q('Why take the median of three readings rather than one reading?', [
        right('One odd reading (a spike) is ignored, because the middle value is used', '🎯'),
        wrong('The median is always more accurate than every single reading', '📈', 'average-everything'),
        wrong('Three readings take less time than one', '⏱️', 'more-runs-not-needed'),
      ], 'With three readings, a single spike ends up first or last when sorted, so the middle value ignores it. It costs a little time.'),
      q('Lane 4 reported 200. On the map, lane 4 is…', [
        right('Free as far as the sensor reaches; unknown beyond its range', '⬜'),
        wrong('Blocked at 200 cm', '⬛', 'unknown-is-free'),
        wrong('Free all the way across the crater', '⬜', 'unknown-is-free'),
      ], '200 means no echo within 2 m: free up to the sensor’s range. What lies further is unknown until a reading reaches it.'),
      q('Your rover reported four lanes correctly and got lane 2 wrong by 40 cm. What is the honest summary?', [
        right('Four of five lanes within 10 cm; lane 2 off by 40 cm, with a likely cause', '📋'),
        wrong('All five lanes surveyed successfully', '✅', 'hide-bad-data'),
        wrong('The survey failed', '❌', 'hide-bad-data'),
      ], 'Report what worked, what did not, and why you think so. That is more useful — and more trustworthy — than “success” or “failure”.'),
    ],
    badge: { id: 'l4-autonomous-survey', name: 'Autonomous Surveyor', icon: '🛰️', earnedFor: 'You designed an autonomous survey and built a map from your rover’s own reports.' },
    reward: { note: 'Project saved to your portfolio: Autonomous Survey, with your map and lane reports.' },
    teacher: teacher({
      timing: projectPlan(4, 'Time budget (pairs split the 90 s across five lanes and the return)'),
      warmup: {
        title: 'Time budget',
        minutes: 4,
        steps: ['Pairs estimate the time for one lane (readings + shift) from Session 8.', 'Multiply by five, add the return drive, compare with 90 s.', 'Decide what to cut if it doesn’t fit.'],
        materials: ['Paper', 'Session 8 notes'],
      },
      discussion: ['Would you trust your map to plan a route for another rover? What would make you trust it more?', 'What did your rover decide on its own that a human would normally decide?'],
      misconceptions: [
        mc('average-everything', 'When two estimates disagree, average them.', 'When one source is known to be far more accurate (a surveyed landmark), trust it; averaging adds the other’s error back in.', 'Ask: your watch says 9:07, the station clock (set by satellite) says 9:00. Do you average to 9:03? Discuss which to trust and why.'),
        mc('more-runs-not-needed', 'One careful measurement is enough.', 'Repeated runs show the spread and catch odd results; you need them to trust a number.', 'Pairs measure the same 2 s run three times and write all three on the board. Compute the spread for the class.'),
        mc('unknown-is-free', 'If nothing was seen there, it is free.', 'Cells the sensor could not observe are unknown, not free; free means “observed and empty”.', 'Under the sheet game: compare a map where unseen cells were coloured free with the real layout. How many “free” cells held a book?'),
        mc('hide-bad-data', 'It is fine to drop bad data without saying so.', 'Honest reports state what was excluded and why, so others can judge how reliable the result is.', 'Give two reports of the same experiment, one transparent and one silent. Pairs act as reviewers: which would they sign off, and what would they ask?'),
      ],
      faster: ['Survey each lane from both ends to shrink the unknown area.', 'Add a confidence mark to each lane (how much the three readings agreed).'],
      slower: ['Survey three lanes, then return.', 'Use single readings; add the median as a stretch.'],
      notes: ['Self-checks are reflection only and never gate the badge.', 'The map and reports go into the portfolio (no personal data).'],
    }),
    parent: {
      today: 'Your teen designed a rover that surveys unknown ground on its own and comes back with data good enough to draw a map.',
      tryAtHome: 'Ask your teen to show you the map their rover made and explain one place it might be wrong.',
      askYourChild: 'Why did your survey rover have to work on its own?',
    },
  }),
]
