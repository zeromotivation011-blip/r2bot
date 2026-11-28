// components/kids/galaxy/hint-tips.ts
// Roadmap #26 — the second clue on the hint ladder. The first clue is always
// the check's own specific feedback on the child's last try; this is the
// strategy an engineer would use for that KIND of puzzle. One short, spoken
// sentence per template. Plain data, safe anywhere.

import type { TemplateId } from '@/lib/kids/activities/types'

export const TEMPLATE_TIP: Record<TemplateId, string> = {
  'sequence-path': 'Be the robot: put your finger on the start, then say each move out loud as you trace the route. Count squares before each turn.',
  'debug-program': 'Run it and watch for the FIRST thing that goes wrong. Fix only that block, then run it again.',
  'predict-output': 'Write each variable down and change it line by line, the way the computer does. Loops run their inside again and again.',
  'flowchart-builder': 'Follow one test case through the chart with your finger. Questions split the path: yes one way, no the other.',
  'logic-gates': 'AND needs both, OR needs at least one, NOT flips it. Try every on/off combination and check the output each time.',
  'binary-encoder': 'Each lamp is worth double the one to its right: 1, 2, 4, 8, 16… Light the biggest one that fits first.',
  'number-box': 'Put your finger on the box and go one card at a time: add, take out, or empty it first. Say the new number out loud after each card.',
  'gear-train': 'Only the first and last gear set the speed. Small driving big makes it slower and stronger; big driving small makes it faster.',
  'lever-balance': 'Weight × distance from the pivot must be the same on both sides. A light thing far away balances a heavy thing close in.',
  'simple-machines': 'Machines trade push for distance: a longer ramp, more rope strands or a longer handle means less push but more distance.',
  'wheel-terrain': 'Wide spreads the weight on soft ground, tall climbs over bumps, and speed decides the time. Check each part of the course.',
  'centre-of-mass': 'Put the heaviest parts low and between the wheels, then check the balance point on every slope.',
  'motor-math': 'One wheel turn rolls π × the wheel size. Distance = turns × that. Work out how many turns you need first.',
  'sensor-choice': 'Go checkpoint by checkpoint: what must the robot sense there, and which sensor still works in those conditions?',
  'signal-graph': 'Look for where the line changes suddenly. Ignore the tiny wobble — that is just noise.',
  'circuit-snap': 'Current needs a complete loop from + back to −. Follow the path with your finger and look for a gap.',
  'ohms-law': 'More resistance means less current: current = volts ÷ ohms. Take away the LED’s share of the volts first.',
  'threshold-tuner': 'Put the threshold in the middle of the gap between the two levels, not close to either one.',
  'control-tuner': 'Change one gain at a time. Too big wobbles and overshoots; too small is slow. Find the middle.',
  'classify-sort': 'Look for ONE feature that is different between the groups, like size, sound or colour, and sort by that.',
  'train-mini': 'Add examples where the AI is unsure — near the border between colours, or where one kind has none.',
  'path-planner': 'Count the cost of every square you enter. A longer route on smooth floor can beat a short one through mud.',
  'robot-designer': 'Start with what the job MUST have, then add up cost and weight before adding anything extra.',
  'ethics-dilemma': 'Ask who is affected by each choice, and never cross a red line, even if it is faster.',
  'robot-match': 'Look at each robot’s body: wheels, legs, wings or fins. Its shape tells you where it works best.',
  'estimate': 'Break the big question into small numbers you can guess, then multiply them together.',
  'spot-in-scene': 'Search slowly in strips, left to right, top to bottom, and ask “what is this for?” about each thing.',
}
