// lib/kids/ai/spark/hints.ts
// Rule-based hints: what Spark says when a screen asks for help with the
// current activity and the AI is off, capped or offline. A hint points the
// child at WHERE to look and WHAT to try — never the full solution.

import type { BandId } from '../../bands'
import type { SparkContext } from './types'
import { isOlderBand, normalise } from './match'

interface HintRule {
  test: RegExp
  young: string
  older: string
}

// Order matters: the first rule whose pattern matches the failure reason wins.
const RULES: HintRule[] = [
  {
    test: /\b(hit|crash|bump|collid|wall|touch(ed)? the|ran into|smash)/,
    young: 'Your robot bumped into something. Can it notice the wall BEFORE it touches it? Look for a sensor block, and try "if something is close, stop or turn".',
    older: 'The robot is colliding, so it is acting without checking. Where in your loop does it read the distance sensor? Try checking it before every move and choosing a stopping distance with some margin.',
  },
  {
    test: /\b(fell|fall|off the (edge|table|track)|cliff|tip(ped)? over|toppl)/,
    young: 'Uh-oh, it fell! Could it look down for the edge first? Or slow down near the edge so it can stop in time.',
    older: 'It is leaving the safe area. Is a sensor watching the edge, and is the robot slow enough to stop within the distance the sensor can see?',
  },
  {
    test: /\b(overshoot|too far|past the|went past|missed the (target|spot)|over the line)/,
    young: 'It went a little too far! Try smaller steps, or slow down when you get close to the target.',
    older: 'It overshoots: it is still moving fast when it reaches the target. Make the speed depend on the distance left — big gap, big speed; small gap, small speed. That is proportional control.',
  },
  {
    test: /\b(short|not far enough|didn'?t reach|did not reach|stopped (too )?early|before the)/,
    young: 'So close! Your robot stopped too soon. Count the squares to the target and compare with the number in your move block.',
    older: 'It stops short. Check the numbers: how far does one "move" go, and how many do you need? A loop count that is one too small is a very common bug.',
  },
  {
    test: /\b(wobbl|zigzag|oscillat|shak|jitter|swing)/,
    young: 'It is wobbling because it turns too hard each time. Try gentler turns!',
    older: 'Oscillation means the correction is too strong. Lower the gain (the number you multiply the error by), or add damping so it slows its corrections as it gets close.',
  },
  {
    test: /\b(wrong way|wrong direction|left|right|turn(ed)? the wrong|backwards)/,
    young: 'It turned the wrong way. Pretend YOU are the robot facing the same way — which hand points to where it should go?',
    older: 'Direction bug. Turns are from the robot’s point of view, not yours. Trace the heading after each turn block on paper.',
  },
  {
    test: /\b(never stop|forever|doesn'?t stop|does not stop|infinite|keeps going|loop)/,
    young: 'Your robot keeps going and going! Does your loop have a way to end? Try "repeat until" with something it can notice.',
    older: 'It never exits the loop. What condition ends it, and can that condition ever become true? Print or watch the sensor value the loop is waiting for.',
  },
  {
    test: /\b(nothing happen|doesn'?t move|does not move|didn'?t move|not moving|stuck|frozen)/,
    young: 'Your robot didn’t move. Is there a start block at the top, and are all the blocks clicked together?',
    older: 'Nothing runs. Check that every block is attached under the start block, that speeds are not zero, and that the first condition is not stopping it straight away.',
  },
  {
    test: /\b(colou?r|red|green|blue|sort)/,
    young: 'Check the colours! Is the robot asking "is it red?" at the right moment — when the thing is in front of its sensor?',
    older: 'Colour logic: print what the sensor actually reads. Lighting changes values, so compare against a range rather than one exact number.',
  },
  {
    test: /\b(slip|slid|ice|sand|grip)/,
    young: 'The wheels are slipping! Go slower, or start gently so the wheels can grip.',
    older: 'Wheel slip: the motors push harder than friction allows. Lower the speed or ramp it up gradually so the force stays under the grip limit.',
  },
  {
    test: /\b(heavy|load|drop(ped)?|weight|lift)/,
    young: 'Heavy things are tricky! Try moving more slowly, or lifting with the load closer to the robot.',
    older: 'A heavier load needs more torque and takes longer to stop. Slow the motion, keep the load close to the joint, or choose a stronger gear ratio.',
  },
  {
    test: /\b(time|slow|too long|ran out)/,
    young: 'Out of time! Could a shorter path or a loop help your robot get there faster?',
    older: 'Too slow: look for wasted moves. Is there a shorter path, or can one loop replace several separate blocks?',
  },
]

const GENERIC = {
  young: 'Let’s be bug detectives! Press play and watch closely. Find the FIRST moment the robot does something you did not expect, then look at the block running right then. Change one thing and try again.',
  older: 'Debug it like an engineer: run it slowly, find the first moment behaviour differs from your plan, and check the block running then. Change one thing at a time so you know what fixed it.',
}

/** Offline hint for the current activity. */
export function ruleHint(ctx: SparkContext, band: BandId): string {
  const reason = normalise(ctx.failureReason ?? '')
  const program = normalise(ctx.programSummary ?? '')
  const older = isOlderBand(band)
  const rule = reason ? RULES.find((r) => r.test.test(reason)) : undefined
  let hint = rule ? (older ? rule.older : rule.young) : older ? GENERIC.older : GENERIC.young

  // Program-shape nudges that never give the answer away.
  if (program) {
    const repeated = /\b(\w+(?: \w+)?)\b(?:[ ,;>|-]+\1\b){2,}/.test(program)
    const hasLoop = /\b(repeat|loop|forever|while|until)\b/.test(program)
    const hasSensor = /\b(sensor|distance|see|sees|touch|colou?r|bump|light|if)\b/.test(program)
    if (repeated && !hasLoop) hint += older ? ' Also: you repeat the same blocks several times — a loop would make it shorter and easier to fix.' : ' Tip: you used the same block lots of times — a repeat block can do that for you!'
    else if (rule === RULES[0] && !hasSensor) hint += older ? ' Your program never reads a sensor, so the robot cannot know the wall is there.' : ' Your program has no sensor block yet — a robot can’t notice a wall without one!'
  }
  return hint
}
