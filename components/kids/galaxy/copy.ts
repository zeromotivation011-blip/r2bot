// components/kids/galaxy/copy.ts
// Server-rendered teaching text for the Skill Galaxy pages: what each track
// covers in real robotics, for parents, teachers and search engines. Plain data.

import type { TemplateId, TrackId } from '@/lib/kids/activities/types'

export interface TrackCopy {
  /** One paragraph: what the track teaches and the real robotics behind it. */
  about: string
  /** Real skills, short phrases. */
  skills: string[]
}

export const TRACK_COPY: Record<TrackId, TrackCopy> = {
  motion: {
    about:
      'Every robot has to get from here to there. In Motion, children work out how wheel size, motor speed and turning really decide where a robot ends up, the same sums a robot vacuum or a warehouse robot does many times a second to know where it is.',
    skills: ['wheel turns and distance', 'speed, distance and time', 'turning and steering', 'wheels, tracks and legs'],
  },
  sensors: {
    about:
      'Robots only know what their sensors tell them. Sensors missions compare distance, light, colour, touch and motion sensors, read real sensor traces with their noise and spikes, and choose which sensors a mission truly needs, as engineers do for self-driving cars and Mars rovers.',
    skills: ['choosing sensors for a job', 'reading sensor graphs', 'noise and thresholds', 'what a sensor cannot see'],
  },
  code: {
    about:
      'Code missions are about telling a robot exactly what to do: sequences, loops, conditions and variables, then tracing programs in your head and hunting bugs. Older children read the same ideas as Python, the language most robotics engineers use every day.',
    skills: ['sequences and loops', 'if/else decisions', 'tracing and predicting programs', 'finding and fixing bugs', 'logic gates and binary'],
  },
  electronics: {
    about:
      'Electronics missions run on a real circuit solver. Children close circuits, choose resistors that keep an LED safe, compare series and parallel bulbs and use Ohm’s law, the rules behind every battery, motor driver and sensor on a robot.',
    skills: ['complete circuits', 'series and parallel', 'Ohm’s law (V = I × R)', 'LEDs and resistors', 'logic in hardware'],
  },
  mechanics: {
    about:
      'Mechanics missions turn physics into puzzles: gear trains that trade speed for strength, levers that balance, ramps and pulleys that make heavy jobs possible, and a centre of mass that decides whether a robot tips over on a slope.',
    skills: ['gear ratios', 'levers and moments', 'simple machines', 'centre of mass and stability'],
  },
  control: {
    about:
      'Control is how robots stay steady. Children tune thresholds on noisy data, then tune a feedback controller and watch overshoot and wobble appear or vanish, the same proportional and PID control that holds drones in the air and arms on target.',
    skills: ['feedback loops', 'thresholds and hysteresis', 'proportional control', 'overshoot and settling'],
  },
  ai: {
    about:
      'AI & Maps missions show how machines learn from examples and find their way. Children sort examples by features, train a tiny nearest-neighbour model and test it on new points, and plan routes on a grid before comparing them with real path-planning algorithms.',
    skills: ['features and classification', 'training and testing data', 'nearest-neighbour learning', 'shortest paths and search'],
  },
  design: {
    about:
      'Design missions practise the engineering design process: read the job, respect the budget and weight limits, choose parts, test and improve. Children also make Fermi estimates, the quick back-of-the-envelope maths engineers use to check that an idea can work at all.',
    skills: ['constraints and trade-offs', 'choosing parts for a job', 'estimating', 'test and improve'],
  },
  space: {
    about:
      'Explore missions follow robots to the places people cannot easily go: Mars, the deep ocean, inside volcanoes and around the Space Station. They cover signal delay, autonomy, power and the special parts that let a robot survive far from home.',
    skills: ['signal delay and autonomy', 'robots in extreme places', 'power far from home', 'planning without help'],
  },
  world: {
    about:
      'Robots & Us is about robots in society: which robot fits which job, how robots keep people safe, and the hard questions about privacy, fairness and responsibility. Children weigh real trade-offs and explain their choices, the way engineers and policymakers have to.',
    skills: ['robots and jobs', 'safety', 'ethics and fairness', 'real robots and what they do'],
  },
}

/** How each template plays, in one sentence, for the activity page's server text. */
export const TEMPLATE_HOW: Record<TemplateId, string> = {
  'sequence-path': 'You program a robot across a grid with command blocks, then run it and watch every step.',
  'debug-program': 'You run a program that does not work, find the bug and fix it with the fewest changes.',
  'predict-output': 'You trace a program in your head and predict exactly what it will do before it runs.',
  'flowchart-builder': 'You arrange actions and questions into a flowchart, then test it on every situation.',
  'logic-gates': 'You wire AND, OR and NOT gates until the circuit matches the behaviour you need.',
  'binary-encoder': 'You flip bits to encode numbers, pictures or messages the way a computer stores them.',
  'gear-train': 'You choose and mesh gears, and the animated gear train shows the speed and direction you made.',
  'lever-balance': 'You place loads and move the pivot until the lever balances, with the turning forces shown.',
  'simple-machines': 'You choose and set up a lever, pulley, ramp or wheel, and the simulation shows the force needed.',
  'wheel-terrain': 'You pick wheels, tracks or legs and their size, then send the robot across real terrain.',
  'centre-of-mass': 'You place the heavy parts on a robot and test it on slopes to see whether it tips.',
  'motor-math': 'You set motor speed, wheel size and time with sliders and see how far the robot really goes.',
  'sensor-choice': 'You choose sensors for a mission, and the simulation shows what goes wrong without them.',
  'signal-graph': 'You read a real-looking sensor trace, mark the events and set the level that detects them.',
  'circuit-snap': 'You build a circuit from real parts and a circuit solver shows the current, brightness and danger.',
  'ohms-law': 'You use Ohm’s law to choose voltage, current or resistance and check it on a live meter.',
  'threshold-tuner': 'You tune a threshold on noisy sensor data, then test-drive the robot to see how it behaves.',
  'control-tuner': 'You tune a controller’s gains and watch the robot overshoot, wobble or settle on target.',
  'classify-sort': 'You sort examples by their features, find a rule, then let the robot sort new ones.',
  'train-mini': 'You place training points, watch a nearest-neighbour AI draw its boundary, and test it.',
  'path-planner': 'You plan the cheapest route across a map, then compare it with a real search algorithm.',
  'robot-designer': 'You choose parts to meet a job’s budget, weight and terrain limits, then test the design.',
  'ethics-dilemma': 'You decide what a robot should do in a real situation and see who gains and who loses.',
  'robot-match': 'You match real robots to the jobs and places they were built for, using clues.',
  'estimate': 'You make a quick engineer’s estimate with a slider, then see the reasoning step by step.',
  'spot-in-scene': 'You search a busy scene for robots, sensors or hazards and explain what each one does.',
}
