// lib/kids/classroom-plan.ts
//
// A suggested six-week plan per grade band, for the teacher dashboard and the
// schools page. Written against CONCEPTS, not specific episode slugs or mission
// ids (those are authored separately and change); each week points the teacher
// at the right surface: /kids/stories, /kids/workshop, /kids/code-lab.
//
// One 40-minute lesson a week: 5 min hook (story) → 10 min unplugged activity →
// 20 min on devices (workshop or code lab) → 5 min share and reflect.

import type { BandId } from './bands'

export interface PlanWeek {
  week: number
  concept: string
  /** What children can do by the end of the week. */
  goal: string
  story: string
  workshop: string
  codeLab: string
  unplugged: string
}

export const PLAN_LINKS = {
  story: '/kids/stories',
  workshop: '/kids/workshop',
  codeLab: '/kids/code-lab',
} as const

export const LESSON_SHAPE: { minutes: number; label: string; detail: string }[] = [
  { minutes: 5, label: 'Hook', detail: 'Watch a Story Theatre episode together on the board.' },
  { minutes: 10, label: 'Unplugged', detail: 'Act the idea out — no screens, the whole class moving.' },
  { minutes: 20, label: 'Hands on', detail: 'Pairs build in the Workshop or solve Code Lab missions on any device.' },
  { minutes: 5, label: 'Share', detail: 'Two pairs show their robot or program; the class names the idea.' },
]

const EXPLORERS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act',
    goal: 'Say what makes a robot a robot: it notices, decides and moves.',
    story: 'An episode where a robot notices something, decides, and does something about it.',
    workshop: 'Build a first robot; name its eyes (sense), brain (think) and wheels (act).',
    codeLab: 'The first "move forward" missions — press Run and watch.',
    unplugged: '"Robot, Robot": one child is the robot and only moves when they SEE a card held up.',
  },
  {
    week: 2, concept: 'Sequences',
    goal: 'Give step-by-step instructions in the right order.',
    story: 'An episode where steps in the wrong order cause a funny muddle.',
    workshop: 'Pick wheels or legs and talk about which moves better on a road.',
    codeLab: 'Missions that need 3–5 moves in a row to reach a star.',
    unplugged: 'Make a jam sandwich by following the class\'s instructions exactly as said.',
  },
  {
    week: 3, concept: 'Loops',
    goal: 'Spot when the same step repeats and say "do it 4 times".',
    story: 'An episode about a robot that has to do the same job again and again.',
    workshop: 'Add a tool (scoop or pen) the robot will use over and over.',
    codeLab: 'Missions where a repeat block makes the program shorter.',
    unplugged: 'Clap-pattern loops: "clap, stamp — repeat 3 times".',
  },
  {
    week: 4, concept: 'Sensors',
    goal: 'Match a sensor to what it notices: light, touch, distance.',
    story: 'An episode where a robot is stuck until it gets a new sense.',
    workshop: 'Try each sensor and read its "with it / without it" card aloud.',
    codeLab: 'Missions that only a robot with the right sensor can finish.',
    unplugged: 'Blindfolded "bumper walk": a partner taps a shoulder when there is a wall.',
  },
  {
    week: 5, concept: 'If / else',
    goal: 'Say a simple rule: "if I see a wall, I turn".',
    story: 'An episode where a robot has to choose between two paths.',
    workshop: 'Give the robot distance eyes so it can tell when a wall is close.',
    codeLab: 'Early missions with a single "wall ahead?" choice.',
    unplugged: '"If red, hop; if green, walk" — the class follows coloured cards.',
  },
  {
    week: 6, concept: 'Robots that help',
    goal: 'Design a helper robot for home or school and explain its parts.',
    story: 'Rewatch a favourite episode and spot every sense-think-act moment.',
    workshop: 'Build a helper robot and give it a name and a job.',
    codeLab: 'Replay any mission to earn a third star.',
    unplugged: 'Robot show-and-tell: each pair presents their robot\'s job in one sentence.',
  },
]

const BUILDERS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act',
    goal: 'Explain any robot as sensors, a controller and actuators.',
    story: 'An episode introducing a robot that senses, decides and acts.',
    workshop: 'Build a robot and label each part as sense, think or act.',
    codeLab: 'Warm-up movement missions; predict before pressing Run.',
    unplugged: 'Sort real-world machines (lift, washing machine, toaster) into robot / not robot and argue why.',
  },
  {
    week: 2, concept: 'Sequences and debugging',
    goal: 'Write a sequence, run it, find the wrong step and fix it.',
    story: 'An episode where a robot\'s plan goes wrong at one step.',
    workshop: 'Choose a drive (wheels, tracks, legs) for a given terrain.',
    codeLab: 'Sequence missions; aim for the fewest blocks.',
    unplugged: 'Grid-floor game: a "programmer" writes arrows on cards, the "robot" walks them; swap and debug.',
  },
  {
    week: 3, concept: 'Loops',
    goal: 'Replace repeated steps with a loop and count the blocks saved.',
    story: 'An episode where repetition becomes boring until a loop helps.',
    workshop: 'Add a pen and imagine the shape the robot will draw.',
    codeLab: 'Loop missions — draw a square, patrol a corridor.',
    unplugged: 'Dance loops: compose a routine with "repeat" cards.',
  },
  {
    week: 4, concept: 'Sensors',
    goal: 'Choose the right sensor for a job and explain what goes wrong without it.',
    story: 'An episode about a robot that cannot see an obstacle.',
    workshop: 'Swap heads and sensors; read each part\'s "without it" line.',
    codeLab: 'Missions that need a distance, colour or bumper sensor.',
    unplugged: 'Sensor detectives: find 10 sensors in the classroom and school.',
  },
  {
    week: 5, concept: 'If / else',
    goal: 'Write programs that make a choice from a sensor reading.',
    story: 'An episode where a robot must decide at a fork.',
    workshop: 'Fit a colour sensor and plan what each colour should mean.',
    codeLab: 'If/else missions — turn at walls, stop on red.',
    unplugged: 'Human "if/else" relay: cards say "if you see blue, go left, else go right".',
  },
  {
    week: 6, concept: 'Line following',
    goal: 'Combine a loop, a sensor and if/else to follow a line.',
    story: 'An episode about a delivery robot following a path.',
    workshop: 'Build a line-follower: line sensor, two wheels, light body.',
    codeLab: 'Line-following missions; explain the loop in your own words.',
    unplugged: 'Tape a line on the floor; a blindfolded "robot" follows it by touch with a partner\'s if/else calls.',
  },
]

const INVENTORS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act',
    goal: 'Describe a robot as a loop of sensing, deciding and acting, many times a second.',
    story: 'An episode introducing the sense-think-act loop.',
    workshop: 'Build a robot for a named job and justify every part.',
    codeLab: 'Quick movement missions to learn the blocks.',
    unplugged: 'Robot or not? Debate cases (thermostat, self-checkout, drone) using sense-think-act as the test.',
  },
  {
    week: 2, concept: 'Sequences, loops and efficiency',
    goal: 'Refactor a long sequence into loops and measure the saving.',
    story: 'An episode where a long plan becomes a short, clever one.',
    workshop: 'Compare drives for speed vs. rough ground.',
    codeLab: 'Sequence and loop missions; chase three stars with the fewest blocks.',
    unplugged: 'Write "code" for tying a shoelace; trade with another group and test it literally.',
  },
  {
    week: 3, concept: 'Sensors and uncertainty',
    goal: 'Explain that sensors can be wrong and why robots check more than once.',
    story: 'An episode where a sensor gives a misleading reading.',
    workshop: 'Try a camera vs. distance eyes; list what each can and cannot notice.',
    codeLab: 'Sensor missions that need the right part fitted.',
    unplugged: 'Estimate distances by eye, then measure; chart the errors.',
  },
  {
    week: 4, concept: 'If / else and nested decisions',
    goal: 'Write programs with two or more conditions.',
    story: 'An episode where a robot faces several choices in a row.',
    workshop: 'Design a robot that must handle walls AND colours.',
    codeLab: 'Harder if/else missions; draw the decision tree first.',
    unplugged: 'Build a paper flowchart for crossing a road safely; test it with edge cases.',
  },
  {
    week: 5, concept: 'Feedback',
    goal: 'Explain feedback: measure, compare with the goal, correct, repeat.',
    story: 'An episode about a robot that keeps correcting itself.',
    workshop: 'Build a line-follower and predict how it wobbles.',
    codeLab: 'Line-following missions; explain why the robot zig-zags.',
    unplugged: 'Balance a ruler on a finger — notice you are a feedback controller.',
  },
  {
    week: 6, concept: 'Autonomy',
    goal: 'Design an autonomous robot for a real problem and present its program.',
    story: 'An episode about a robot working with no one controlling it.',
    workshop: 'Final build: a robot for a problem the group chose.',
    codeLab: 'Open challenge missions; present the cleverest solution.',
    unplugged: 'Mini design review: groups pitch their robot; classmates ask "what if the sensor fails?"',
  },
]

const ENGINEERS: PlanWeek[] = [
  {
    week: 1, concept: 'Sense → think → act as a control loop',
    goal: 'Model a robot as inputs, a control loop and outputs, and name real examples.',
    story: 'Start with an episode as a shared hook; discuss what is simplified.',
    workshop: 'Spec a robot for a warehouse, farm or hospital and defend each part.',
    codeLab: 'Speed-run the movement missions; read the Python view of each program.',
    unplugged: 'Draw the control loop of a car\'s cruise control on the board.',
  },
  {
    week: 2, concept: 'Algorithms: sequences and loops',
    goal: 'Write and compare algorithms by length and clarity.',
    story: 'An episode about planning a route.',
    workshop: 'Trade-offs: tracks vs. wheels on energy and terrain.',
    codeLab: 'Loop missions; translate one block program into Python by hand.',
    unplugged: 'Sort a deck of cards with written steps only; count the steps.',
  },
  {
    week: 3, concept: 'Sensors and noise',
    goal: 'Explain noise, range and field of view, and choose sensors with trade-offs.',
    story: 'An episode where a sensor misleads the robot.',
    workshop: 'Compare camera, distance and line sensors for one task.',
    codeLab: 'Sensor missions; note what fails when the part is missing.',
    unplugged: 'Measure the same length 10 times; compute the spread.',
  },
  {
    week: 4, concept: 'Conditionals and state',
    goal: 'Write if/else logic and describe a robot\'s "states".',
    story: 'An episode with a robot switching between behaviours.',
    workshop: 'Design a robot with two modes (explore / return).',
    codeLab: 'Hard if/else missions; refactor nested conditions.',
    unplugged: 'Draw a state machine for a traffic light or a lift.',
  },
  {
    week: 5, concept: 'Feedback control',
    goal: 'Explain proportional correction and why line-followers oscillate.',
    story: 'An episode about a robot that keeps correcting itself.',
    workshop: 'Build a line-follower; reason about sensor placement.',
    codeLab: 'Line-following missions; predict behaviour before running.',
    unplugged: 'Walk to a line with eyes closed, correcting after each step from a partner\'s "how far off".',
  },
  {
    week: 6, concept: 'Autonomy and next steps',
    goal: 'Present an autonomous robot design and map the path to ROS 2 and real hardware.',
    story: 'Rewatch any episode and critique it as an engineer.',
    workshop: 'Capstone robot with a one-page spec.',
    codeLab: 'Open challenges; then continue in the main R2BOT Academy.',
    unplugged: 'Capstone pitches with peer review against a simple rubric.',
  },
]

export const CLASS_PLANS: Record<BandId, PlanWeek[]> = {
  explorers: EXPLORERS,
  builders: BUILDERS,
  inventors: INVENTORS,
  engineers: ENGINEERS,
}
