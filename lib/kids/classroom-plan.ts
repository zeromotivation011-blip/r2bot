// lib/kids/classroom-plan.ts
//
// A suggested six-week plan per grade band, for the teacher dashboard and the
// schools page. Every week names a REAL Story Theatre episode and REAL Code Lab
// missions: a teacher who clicks through must find exactly what the plan says.
// When you add, rename or reorder an episode (lib/kids/stories) or a mission
// (lib/kids/code-lab/missions.ts), update the slugs, ids and titles here in the
// same commit.
//
// Two facts shape the Code Lab lines:
//   - missions unlock in order WITHIN a band (previousInBand), so a week never
//     points at a mission before the ones that unlock it;
//   - only Inventors and Engineers missions have decision blocks (wall ahead?,
//     on colour?, on the line?). Explorers missions are moves only; Builders add
//     repeat, pen and gripper. Where a band has no mission for the idea, the plan
//     says so and either keeps it unplugged or names the other band's mission.
//
// Titles are copied here rather than imported: missions.ts carries reference
// solutions and must stay out of the client bundle (the teacher dashboard is a
// client component).
//
// One 40-minute lesson a week: 5 min hook (story) → 10 min unplugged activity →
// 20 min on devices (workshop or code lab) → 5 min share and reflect.

import type { BandId } from './bands'

export interface PlanEpisode {
  /** Slug under /kids/stories/. */
  slug: string
  title: string
}

export interface PlanMission {
  /** Id under /kids/code-lab/. */
  id: string
  title: string
}

export interface PlanWeek {
  week: number
  concept: string
  /** What children can do by the end of the week. */
  goal: string
  story: string
  /** The episode the story line refers to. */
  episode: PlanEpisode
  workshop: string
  codeLab: string
  /** The missions the Code Lab line refers to, in unlock order. Empty when the week has none. */
  missions: PlanMission[]
  unplugged: string
}

export const PLAN_LINKS = {
  story: '/kids/stories',
  workshop: '/kids/workshop',
  codeLab: '/kids/code-lab',
} as const

export const episodeHref = (slug: string): string => `${PLAN_LINKS.story}/${slug}`
export const missionHref = (id: string): string => `${PLAN_LINKS.codeLab}/${id}`

export const LESSON_SHAPE: { minutes: number; label: string; detail: string }[] = [
  { minutes: 5, label: 'Hook', detail: 'Watch a Story Theatre episode together on the board.' },
  { minutes: 10, label: 'Unplugged', detail: 'Act the idea out — no screens, the whole class moving.' },
  { minutes: 20, label: 'Hands on', detail: 'Pairs build in the Workshop or solve Code Lab missions on any device.' },
  { minutes: 5, label: 'Share', detail: 'Two pairs show their robot or program; the class names the idea.' },
]

// ── Episodes (lib/kids/stories/episodes) ─────────────────────────────────────
const EP = {
  whatMakesARobot: { slug: 'what-makes-a-robot', title: 'What Makes a Robot a Robot?' },
  sparkGetsLost: { slug: 'spark-gets-lost', title: 'Spark Gets Lost' },
  couldntSee: { slug: 'robot-that-couldnt-see', title: 'The Robot That Couldn’t See' },
  loopGarden: { slug: 'loop-de-loop-garden', title: 'Loop-de-Loop Garden' },
  trafficLight: { slug: 'traffic-light-robot', title: 'The Traffic-Light Robot' },
  wobblyBot: { slug: 'wobbly-bot', title: 'Wobbly Bot' },
  lineRace: { slug: 'line-follower-race', title: 'The Line-Follower Race' },
  roverOnMars: { slug: 'rover-on-mars', title: 'Rover on Mars' },
} as const satisfies Record<string, PlanEpisode>

// ── Missions (lib/kids/code-lab/missions.ts), in unlock order per band ───────
const M = {
  // Explorers: forward / turn (+ say) only
  firstSteps: { id: 'first-steps', title: 'First Steps' },
  turnTheCorner: { id: 'turn-the-corner', title: 'Turn the Corner' },
  upAndOver: { id: 'around-the-rock', title: 'Up and Over' },
  gemHop: { id: 'gem-hop', title: 'Gem Hop' },
  zigZag: { id: 'zig-zag', title: 'Zig-Zag Road' },
  sayHello: { id: 'say-hello', title: 'Say Hello' },
  // Builders: + repeat, pen, gripper
  staircase: { id: 'staircase', title: 'Robot Staircase' },
  squareDance: { id: 'square-dance', title: 'Square Dance' },
  boxMover: { id: 'box-mover', title: 'Box Mover' },
  hopTheHedges: { id: 'hop-the-hedges', title: 'Hop the Hedges' },
  tidyUp: { id: 'tidy-up', title: 'Tidy Up Time' },
  twinWindows: { id: 'twin-windows', title: 'Twin Windows' },
  // Inventors: + wall ahead?, on colour?, on the line?
  feelTheWay: { id: 'wall-sensor', title: 'Feel the Way' },
  colourSignals: { id: 'colour-signals', title: 'Colour Signals' },
  lineFollower: { id: 'line-follower', title: 'Line Follower' },
  intoTheCave: { id: 'cave-light', title: 'Into the Cave' },
  desertPatrol: { id: 'desert-patrol', title: 'Desert Patrol' },
  parcelPicker: { id: 'parcel-picker', title: 'Parcel Picker' },
  // Engineers: nested decisions and efficiency
  rightHandRule: { id: 'right-hand-maze', title: 'The Right-Hand Rule' },
  efficiencyExpert: { id: 'gem-ring', title: 'Efficiency Expert' },
  twistyLine: { id: 'twisty-line', title: 'Twisty Line' },
  colourCorridors: { id: 'colour-maze', title: 'Colour-Coded Corridors' },
  caveRescue: { id: 'cave-rescue', title: 'Cave Rescue' },
  warehouseLoop: { id: 'warehouse-loop', title: 'Warehouse Loop' },
} as const satisfies Record<string, PlanMission>

const EXPLORERS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act',
    goal: 'Say what makes a robot a robot: it notices, decides and moves.',
    story: 'Spark asks whether the toaster is a robot; stop at each "sense, think, act" moment.',
    episode: EP.whatMakesARobot,
    workshop: 'Build a first robot; name its eyes (sense), brain (think) and wheels (act).',
    codeLab: 'The first Explorers mission: one "move forward" block — press Run and watch.',
    missions: [M.firstSteps],
    unplugged: '"Robot, Robot": one child is the robot and only moves when they SEE a card held up.',
  },
  {
    week: 2, concept: 'Sequences',
    goal: 'Give step-by-step instructions in the right order.',
    story: '"Go that way-ish" is not an instruction a robot understands — spot the steps Spark needs.',
    episode: EP.sparkGetsLost,
    workshop: 'Pick wheels or legs and talk about which moves better on a road.',
    codeLab: 'Move, turn, move: short sequences to reach the flag, then a path with two gems.',
    missions: [M.turnTheCorner, M.upAndOver, M.gemHop],
    unplugged: 'Make a jam sandwich by following the class\'s instructions exactly as said.',
  },
  {
    week: 3, concept: 'Loops',
    goal: 'Spot when the same steps repeat and say "do it 4 times".',
    story: 'A Builders episode, watched together: ten plants, one watering job, and a shortcut called a loop.',
    episode: EP.loopGarden,
    workshop: 'Add a tool (scoop or pen) the robot will use over and over.',
    codeLab: 'Zig-Zag Road takes nine blocks. Explorers missions have no repeat block, so circle the pair of steps that keeps coming back and count how often.',
    missions: [M.zigZag],
    unplugged: 'Clap-pattern loops: "clap, stamp — repeat 3 times".',
  },
  {
    week: 4, concept: 'Sensors',
    goal: 'Match a sensor to what it notices: light, touch, distance.',
    story: 'A Builders episode, watched together: the lights go out and Spark\'s camera eyes stop working.',
    episode: EP.couldntSee,
    workshop: 'Try each sensor and read its "with it / without it" card aloud.',
    codeLab: 'No Explorers mission uses a sensor, so spend the device time in the Workshop. Finish Say Hello, the last Explorers mission, if there is time.',
    missions: [M.sayHello],
    unplugged: 'Blindfolded "bumper walk": a partner taps a shoulder when there is a wall.',
  },
  {
    week: 5, concept: 'If / else',
    goal: 'Say a simple rule: "if I see a wall, I turn".',
    story: 'Rewatch it and pause at each "think" moment: what did the robot notice, and what did it choose?',
    episode: EP.whatMakesARobot,
    workshop: 'Give the robot distance eyes so it can tell when a wall is close.',
    codeLab: 'Explorers missions have no "wall ahead?" block — keep the decisions unplugged this week. On devices, replay a mission and say each step out loud before pressing Run.',
    missions: [],
    unplugged: '"If red, hop; if green, walk" — the class follows coloured cards.',
  },
  {
    week: 6, concept: 'Robots that help',
    goal: 'Design a helper robot for home or school and explain its parts.',
    story: 'Rewatch Spark\'s cake delivery and spot every sense-think-act moment.',
    episode: EP.sparkGetsLost,
    workshop: 'Build a helper robot and give it a name and a job.',
    codeLab: 'Replay any Explorers mission to earn a third star.',
    missions: [],
    unplugged: 'Robot show-and-tell: each pair presents their robot\'s job in one sentence.',
  },
]

const BUILDERS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act',
    goal: 'Explain any robot as sensors, a controller and actuators.',
    story: 'Is a toaster a robot? Use the episode\'s robot test on three machines in the room.',
    episode: EP.whatMakesARobot,
    workshop: 'Build a robot and label each part as sense, think or act.',
    codeLab: 'Warm up on the first Explorers missions; predict where the robot ends before pressing Run.',
    missions: [M.firstSteps, M.turnTheCorner],
    unplugged: 'Sort real-world machines (lift, washing machine, toaster) into robot / not robot and argue why.',
  },
  {
    week: 2, concept: 'Sequences and debugging',
    goal: 'Write a sequence, run it, find the wrong step and fix it.',
    story: 'Spark\'s vague directions go wrong; find the exact step where the plan breaks.',
    episode: EP.sparkGetsLost,
    workshop: 'Choose a drive (wheels, tracks, legs) for a given terrain.',
    codeLab: 'The longer Explorers sequences (each unlocks the next); when a run fails, find the one wrong block.',
    missions: [M.upAndOver, M.gemHop, M.zigZag],
    unplugged: 'Grid-floor game: a "programmer" writes arrows on cards, the "robot" walks them; swap and debug.',
  },
  {
    week: 3, concept: 'Loops',
    goal: 'Replace repeated steps with a loop and count the blocks saved.',
    story: 'Watering ten plants one line at a time is boring — until a loop saves twenty lines.',
    episode: EP.loopGarden,
    workshop: 'Add a pen and imagine the shape the robot will draw.',
    codeLab: 'The first Builders missions: a repeat block for stairs, then a pen to draw a square.',
    missions: [M.staircase, M.squareDance],
    unplugged: 'Dance loops: compose a routine with "repeat" cards.',
  },
  {
    week: 4, concept: 'Sensors',
    goal: 'Choose the right sensor for a job and explain what goes wrong without it.',
    story: 'Camera eyes are useless in the dark; watch which sensor takes over and why.',
    episode: EP.couldntSee,
    workshop: 'Swap heads and sensors; read each part\'s "without it" line.',
    codeLab: 'Builders missions use parts, not sensors: fit a gripper to move boxes, then loop the pattern. A block stays locked until the robot has the part it needs.',
    missions: [M.boxMover, M.hopTheHedges, M.tidyUp],
    unplugged: 'Sensor detectives: find 10 sensors in the classroom and school.',
  },
  {
    week: 5, concept: 'If / else',
    goal: 'Write programs that make a choice from a sensor reading.',
    story: 'An Inventors episode: a robot car runs a red light until it learns to decide.',
    episode: EP.trafficLight,
    workshop: 'Fit distance eyes and a colour sensor, and plan what each colour should mean.',
    codeLab: 'Builders missions have no decision blocks, so step up to the first two Inventors missions: "wall ahead?" and "on colour?".',
    missions: [M.feelTheWay, M.colourSignals],
    unplugged: 'Human "if/else" relay: cards say "if you see blue, go left, else go right".',
  },
  {
    week: 6, concept: 'Line following',
    goal: 'Combine a loop, a sensor and if/else to follow a line.',
    story: 'An Engineers episode, watched for the idea: a line-follower that zigzags all the way.',
    episode: EP.lineRace,
    workshop: 'Build a line-follower: line sensor, two wheels, light body.',
    codeLab: 'Line Follower, the third Inventors mission (it unlocks after last week\'s two); explain the loop in your own words. Finish with Twin Windows, the last Builders mission.',
    missions: [M.lineFollower, M.twinWindows],
    unplugged: 'Tape a line on the floor; a blindfolded "robot" follows it by touch with a partner\'s if/else calls.',
  },
]

const INVENTORS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act',
    goal: 'Describe a robot as a loop of sensing, deciding and acting, many times a second.',
    story: 'A short hook: the robot test from the kitchen; then ask how often a real robot runs it.',
    episode: EP.whatMakesARobot,
    workshop: 'Build a robot for a named job and justify every part.',
    codeLab: 'Learn the blocks on the first Builders missions.',
    missions: [M.staircase, M.squareDance],
    unplugged: 'Robot or not? Debate cases (thermostat, self-checkout, drone) using sense-think-act as the test.',
  },
  {
    week: 2, concept: 'Sequences, loops and efficiency',
    goal: 'Refactor a long sequence into loops and measure the saving.',
    story: 'Twenty lines of watering code become a short loop.',
    episode: EP.loopGarden,
    workshop: 'Compare drives for speed vs. rough ground.',
    codeLab: 'The rest of the Builders missions; chase three stars with the fewest blocks (Twin Windows needs a loop inside a loop).',
    missions: [M.boxMover, M.hopTheHedges, M.tidyUp, M.twinWindows],
    unplugged: 'Write "code" for tying a shoelace; trade with another group and test it literally.',
  },
  {
    week: 3, concept: 'Sensors and their limits',
    goal: 'Explain that every sensor has limits, and why robots carry more than one kind.',
    story: 'A camera fails in the dark and another sensor takes over; list what each one cannot notice.',
    episode: EP.couldntSee,
    workshop: 'Try a camera vs. distance eyes; list what each can and cannot notice.',
    codeLab: 'The first Inventors missions: one program that must work on two maps, so it has to sense.',
    missions: [M.feelTheWay, M.colourSignals],
    unplugged: 'Estimate distances by eye, then measure; chart the errors.',
  },
  {
    week: 4, concept: 'If / else and nested decisions',
    goal: 'Write programs with two or more conditions.',
    story: 'Red and green are easy; yellow is the problem. Count the conditions the robot needs.',
    episode: EP.trafficLight,
    workshop: 'Design a robot that must handle walls AND colours.',
    codeLab: 'Decisions inside a loop on the line, then a headlight for the dark cave. Draw the decision tree first.',
    missions: [M.lineFollower, M.intoTheCave],
    unplugged: 'Build a paper flowchart for crossing a road safely; test it with edge cases.',
  },
  {
    week: 5, concept: 'Feedback',
    goal: 'Explain feedback: measure, compare with the goal, correct, repeat.',
    story: 'A two-wheeled robot keeps falling over until it learns to correct itself.',
    episode: EP.wobblyBot,
    workshop: 'Build a line-follower and predict how it wobbles.',
    codeLab: 'Replay Line Follower and explain why the robot zig-zags; then cross the canyons with one sensing program.',
    missions: [M.lineFollower, M.desertPatrol],
    unplugged: 'Balance a ruler on a finger — notice you are a feedback controller.',
  },
  {
    week: 6, concept: 'Autonomy',
    goal: 'Design an autonomous robot for a real problem and present its program.',
    story: 'An Engineers episode: messages to Mars take minutes, so the rover must decide for itself.',
    episode: EP.roverOnMars,
    workshop: 'Final build: a robot for a problem the group chose.',
    codeLab: 'The last Inventors mission: a colour sensor decides when the gripper picks and drops. Present the cleverest solution.',
    missions: [M.parcelPicker],
    unplugged: 'Mini design review: groups pitch their robot; classmates ask "what if the sensor fails?"',
  },
]

const ENGINEERS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act as a control loop',
    goal: 'Model a robot as inputs, a control loop and outputs, and name real examples.',
    story: 'Start with an episode as a shared hook; discuss what is simplified.',
    episode: EP.whatMakesARobot,
    workshop: 'Spec a robot for a warehouse, farm or hospital and defend each part.',
    codeLab: 'Speed-run the first Inventors sensor missions; read the Python view of each program.',
    missions: [M.feelTheWay, M.colourSignals],
    unplugged: 'Draw the control loop of a car\'s cruise control on the board.',
  },
  {
    week: 2, concept: 'Algorithms: sequences and loops',
    goal: 'Write and compare algorithms by length and clarity.',
    story: 'Planning a route across a city: what makes an instruction precise enough for a robot?',
    episode: EP.sparkGetsLost,
    workshop: 'Trade-offs: tracks vs. wheels on energy and terrain.',
    codeLab: 'An algorithm that solves any connected maze, then the smallest program for a job; translate one into Python by hand.',
    missions: [M.rightHandRule, M.efficiencyExpert],
    unplugged: 'Sort a deck of cards with written steps only; count the steps.',
  },
  {
    week: 3, concept: 'Sensors and noise',
    goal: 'Explain noise, range and field of view, and choose sensors with trade-offs.',
    story: 'A camera fails in the dark; list each sensor\'s limits, then add what the episode leaves out: noise.',
    episode: EP.couldntSee,
    workshop: 'Compare camera, distance and line sensors for one task.',
    codeLab: 'Nested line checks on two tracks; note what fails when the part is missing.',
    missions: [M.twistyLine],
    unplugged: 'Measure the same length 10 times; compute the spread.',
  },
  {
    week: 4, concept: 'Conditionals and state',
    goal: 'Write if/else logic and describe a robot\'s "states".',
    story: 'Red, yellow, green: treat each light as a state and draw the transitions.',
    episode: EP.trafficLight,
    workshop: 'Design a robot with two modes (explore / return).',
    codeLab: 'Two sensors, one decides WHEN to turn and the other WHICH way; refactor the nested conditions.',
    missions: [M.colourCorridors],
    unplugged: 'Draw a state machine for a traffic light or a lift.',
  },
  {
    week: 5, concept: 'Feedback control',
    goal: 'Explain proportional correction and why line-followers oscillate.',
    story: 'Bang-bang control zigzags; one carefully chosen number wins the race.',
    episode: EP.lineRace,
    workshop: 'Build a line-follower; reason about sensor placement.',
    codeLab: 'Replay Twisty Line and predict each correction before running; then a sensor loop that also drives a light.',
    missions: [M.twistyLine, M.caveRescue],
    unplugged: 'Walk to a line with eyes closed, correcting after each step from a partner\'s "how far off".',
  },
  {
    week: 6, concept: 'Autonomy and next steps',
    goal: 'Present an autonomous robot design and map the path to ROS 2 and real hardware.',
    story: 'Why a Mars rover cannot be driven like a remote-control car; critique it as an engineer.',
    episode: EP.roverOnMars,
    workshop: 'Capstone robot with a one-page spec.',
    codeLab: 'The last Engineers mission, in 6 blocks or fewer; then continue in the main R2BOT Academy.',
    missions: [M.warehouseLoop],
    unplugged: 'Capstone pitches with peer review against a simple rubric.',
  },
]

export const CLASS_PLANS: Record<BandId, PlanWeek[]> = {
  explorers: EXPLORERS,
  builders: BUILDERS,
  inventors: INVENTORS,
  engineers: ENGINEERS,
}
