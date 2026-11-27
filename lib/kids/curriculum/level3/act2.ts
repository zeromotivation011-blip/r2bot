// lib/kids/curriculum/level3/act2.ts
// Level 3, Act 2 (sessions 7–12): "The Weather Mast".
// Keeping a steady gap behind the supply sled (proportional speed control),
// tuning the gain, state machines, logging data (min / max / average), an
// energy budget, and the second project: the weather mast inspection run.

import type { ArenaSpec, Session } from '../types'
import {
  BATTERY, CREW, DIST, GUIDE_LINE, LINE_OFFSET, LINE_SEEN, LOGIC, MAST_LOOP, MEASURING_HALL, MOVE, SAY, SLED_TRACK, TALK, TIMER, TURN, VARS_MATH,
} from './shared'
import {
  arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong,
} from './kit'

const L = 3 as const

/** Four snow-depth gauges beside a straight track (Session 10). */
const GAUGE_ROW: ArenaSpec = arena(MEASURING_HALL, {
  id: 'l3-gauge-row',
  name: 'The Gauge Row',
  description: 'A straight track with four snow-depth gauges standing to its left, each a different distance from the track.',
  goal: 'Stop at each gauge, face it, log the distance, and report the minimum, maximum and average.',
  features: ['Gauges at rows 6, 4, 2 and 0, standing 30–90 cm to the left of the track (random each run).'],
  requires: ['move', 'see-wall'],
})

/** Two routes to the far mast with an energy table (Session 11). */
const ROUTE_CHOICE: ArenaSpec = {
  id: 'l3-route-choice',
  name: 'Two Ways to the Far Mast',
  description: 'A short route over a snow ridge (steep, 6 m) and a long route round it (flat, 10 m). The battery meter shows 100 %.',
  gridTiles: { cols: 8, rows: 6 },
  tileCm: 50,
  floor: 'mixed',
  start: { col: 0, row: 5, heading: 'up' },
  goal: 'Choose and drive the route that arrives at the far mast with the most battery left, and report the battery you predicted you would use.',
  features: ['Energy table on the wall: flat 2 % per metre at 40 % speed, 3 % per metre at 80 %; uphill 6 % per metre; each 100 g of load adds 10 %.', 'Ridge route: 3 m up, 3 m down (downhill 1 % per metre).'],
  physics: 'Mixed snow and matting. Battery use follows the energy table (the course simulator’s battery model, roadmap #39).',
  requires: ['move'],
}

export const ACT2: Session[] = [
  // ── 7 ────────────────────────────────────────────────────────────────────
  makeSession(L, 7, {
    objectives: [
      o('Uses proportional control on distance error (distance − target) to set the robot’s speed and keep a steady gap.', 'I can make my robot keep a steady distance behind something that moves.', ['programming', 'algorithms']),
      o('Explains why the robot speeds up, slows down and even reverses as the error changes sign.', 'I can explain what happens when the error is positive, zero and negative.', ['mathematics-measurement'], { concepts: ['feedback-control'] }),
    ],
    episode: episode('The Supply Sled', 'The rover’s mail round worked for any set of huts — and the weather mast went dark.', [
      scene('The station yard. Kenji hitches the supply sled to the snow tractor.', 'A box of spare cables for the mast rides on the sled. The rover must follow it up the track.', 60, [
        ['guest', 'Stay 30 centimetres behind the sled. Closer and you’ll hit it when it stops. Farther and the tractor driver can’t see you in the mirror.', CREW.sato],
        ['myrobot', 'But the sled keeps changing speed.'],
      ]),
      scene('A head-on X-ray of the rover: a new, narrow-beam Distance Eyes sensor clicks into the head.', 'A beam shoots straight ahead and bounces off the sled: 47 cm.', 60, [
        ['spark', 'Distance Eyes look straight ahead with a narrow beam — perfect for one target. Error is distance minus 30.'],
        ['myrobot', 'Error 17: I’m too far — speed up. Error zero: match its speed. Error negative: I’m too close — back off!'],
        ['spark', 'Speed equals gain times error. The same rule as steering — now it controls speed.'],
      ]),
      scene('The track. The sled speeds up, slows, stops. The rover breathes in and out behind it like a shadow.', 'The gap meter hovers round 30.', 50, [
        ['guest', 'Like a good dog on a lead. Now — let’s get those cables to the mast.', CREW.sato],
      ]),
    ], 'At the first gentle hill the rover begins to rock back and forth behind the sled. Something isn’t tuned.'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'swap',
      narration: 'Swap the camera for Distance Eyes: a narrow beam that looks straight ahead.',
      why: 'One narrow beam measures the distance to the thing directly in front of you — exactly what following needs.',
      tryWithout: 'With no distance sensor the rover can only drive a fixed speed: it rams the sled when the sled stops.',
      physicsEffect: 'Range 2–200 cm; reads 200 when nothing echoes back. Lighter than the camera.',
      realWorld: 'Adaptive cruise control in cars and platooning delivery robots keep a safe gap with radar or ultrasonic sensors.',
    },
    code: challenge({
      title: 'Gap Control',
      mission: 'Follow the sled for 30 s: every 0.1 s set speed = 2 × (distance − 30) and drive both motors at that speed.',
      arena: SLED_TRACK,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER],
      example: [
        'variable_set(gain, 2)',
        'repeat_until(compare(timer_s > 30)) {',
        '  variable_set(error, math(distance_cm − 30))',
        '  variable_set(speed, math(variable_get(gain) × variable_get(error)))',
        '  set_motors(variable_get(speed), variable_get(speed))  ← negative speed reverses',
        '  wait(0.1)',
        '}',
        'stop',
      ],
      success: [crit('no-collision', 'Never touches the sled.'), crit('within-time', 'Gap stays 15–50 cm for the whole 30 s.')],
      two: 'You predicted what the robot would do when the sled stopped, before running.',
      three: 'You can say what speed the robot uses when the gap is exactly 30 cm, and why.',
      hints: ['How far from the target gap are you? That is the error.', 'speed = gain × error, the same for both motors.', 'error = distance_cm − 30; speed = 2 × error; set_motors(speed, speed); repeat until the timer passes 30.'],
    }),
    challenge: challenge({
      title: 'Thirty, Steady',
      mission: 'Keep 25–35 cm behind the sled for the whole tow. Report the closest and farthest gap you measured.',
      arena: SLED_TRACK,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER, SAY],
      example: [
        'variable_set(gain, 2.5); variable_set(closest, 200); variable_set(farthest, 0)',
        'repeat_until(compare(timer_s > 30)) {',
        '  variable_set(gap, distance_cm)',
        '  if (compare(variable_get(gap) < variable_get(closest))) { variable_set(closest, variable_get(gap)) }',
        '  if (compare(variable_get(gap) > variable_get(farthest))) { variable_set(farthest, variable_get(gap)) }',
        '  variable_set(speed, math(variable_get(gain) × math(variable_get(gap) − 30)))',
        '  set_motors(variable_get(speed), variable_get(speed))',
        '  wait(0.1)',
        '}',
        'stop; say(variable_get(closest)); say(variable_get(farthest))',
      ],
      success: [crit('no-collision', 'Never touches the sled.'), crit('within-time', 'Gap stays between 25 and 35 cm after the first 3 s.'), crit('uses-blocks', 'Reports the closest and farthest gap.')],
      two: 'Your reported closest and farthest match the gap graph.',
      three: 'You found the smallest gain that still stays within 25–35 cm.',
      hints: ['First get the following right, then add the logging.', 'Keep two memories: closest so far (start high) and farthest so far (start low).', 'Start closest at 200 and farthest at 0; update them every loop before you set the speed.'],
    }),
    quiz: [
      q('Target gap 30 cm, the sensor reads 22 cm, gain 2. What speed does the rule give?', [
        right('−16: the robot backs off', '⏪'),
        wrong('+16: it speeds up', '⏩', 'error-sign-ignored'),
        wrong('44: gain times the reading', '✖️', 'error-is-reading'),
      ], 'error = 22 − 30 = −8; speed = 2 × −8 = −16. Negative means reverse: the robot is too close, so it backs away.'),
      q('When the gap is exactly 30 cm, what does the robot do?', [
        right('Speed is 0 for that instant; it moves again as soon as the sled moves away', '⏸️'),
        wrong('It keeps its last speed', '➡️', 'zero-error-stops'),
        wrong('It stops for good because it reached the target', '🏁', 'zero-error-stops'),
      ], 'With error 0, gain × 0 = 0. But the loop keeps measuring: as soon as the sled pulls away the error grows and the robot follows again.'),
      q('Why use proportional speed instead of “if too far, drive at 60 %; if too close, stop”?', [
        right('It slows down smoothly as the gap closes, instead of lurching', '〰️'),
        wrong('If / else is always better because it is simpler', '🧱', 'simple-is-always-better'),
        wrong('Proportional control never makes errors', '💯', 'feedback-is-perfect'),
      ], 'Two-speed control lurches between 60 % and stopped. Proportional control matches the effort to the error. It still has errors — it just handles them more gently.'),
    ],
    badge: { id: 'l3-steady-gap', name: 'Steady Gap', icon: '🛷', earnedFor: 'You kept a steady distance behind a moving sled with proportional speed control.' },
    reward: { note: 'Distance Eyes fitted: narrow-beam ranging for following and docking.' },
    teacher: teacher({
      timing: lessonPlan(5, 'The human sled', 'what does the sign of the error tell the robot?'),
      warmup: {
        title: 'The human sled',
        minutes: 5,
        steps: ['A “sled” student walks a line, changing speed and stopping. A “rover” student follows, keeping one arm’s length behind.', 'Freeze. Ask the rover: are you too close or too far? By how much? That is the error.', 'Swap roles; the sled tries to catch the rover out.'],
        materials: ['Floor space or a corridor'],
      },
      discussion: ['Where else does something keep a gap? (Cars in traffic, birds in a flock, a dancer with a partner.)', 'Why is a negative speed sometimes the right answer?'],
      misconceptions: [
        mc('error-sign-ignored', 'The error is always positive: it is a distance.', 'The error has a sign: negative means you passed the target (too close), so the correction reverses.', 'Number line from 0 to 60 with the target at 30. Mark readings 22, 30, 41. Students write the error under each, then the speed with gain 2. Ask what a minus sign means for the wheels.'),
        mc('error-is-reading', 'The error is the sensor reading.', 'The error is how far the reading is from what you want: reading − target.', 'Thermostat: the room is 22 °C, you want 20 °C. Is the error 22? Students compute 2, then repeat with headings 97/90 and 84/90.'),
        mc('zero-error-stops', 'When the error is 0 the robot stops.', 'Zero error means no steering correction; the base speed keeps the robot moving.', 'Write set_motors(50 − steer, 50 + steer) with steer = 0. What are the motor powers? Both 50: it drives on.'),
        mc('simple-is-always-better', 'The simplest controller is always the best one.', 'Simple is a good start; the best controller is the one that meets the need (smooth, safe, efficient).', 'Show two gap graphs: the jagged two-speed one and the smooth proportional one. Ask which the tractor driver would prefer, and why.'),
        mc('feedback-is-perfect', 'Feedback control removes all error.', 'Feedback reduces error and reacts to change, but there is always some error and some delay.', 'Show the gap graph from the challenge: it is never a flat line at 30. Ask where the error is biggest (when the sled changes speed) and why.'),
      ],
      faster: ['Limit the speed to ±60 % (if speed > 60 set it to 60) and see whether following improves.', 'Follow with a 20 cm gap and compare.'],
      slower: ['Provide the error and speed lines; students set the gain and the target.', 'Watch the gap graph while running and describe it in words first.'],
      notes: ['Remind pairs that a reverse speed is safe in the simulator; on real robots reversing near people needs a warning beep.'],
    }),
    parent: {
      today: 'Your child made their robot follow a moving sled at a steady 30 cm gap, using the gap error to set its speed.',
      tryAtHome: 'In a car or on a bus, notice how the driver keeps a gap: more braking when much too close, a little when slightly close.',
      askYourChild: 'What does your robot do when the error is negative?',
    },
  }),

  // ── 8 ────────────────────────────────────────────────────────────────────
  makeSession(L, 8, {
    objectives: [
      o('Tunes a proportional gain by testing at least three values and recording overshoot, wobble and drift.', 'I can tune a gain by testing it and writing down what happens.', ['data', 'debugging']),
      o('Describes the effect of a gain that is too high (oscillation) and too low (sluggish, large error).', 'I can explain what happens when the gain is too big or too small.', ['science-forces'], { concepts: ['feedback-control', 'debugging'] }),
    ],
    episode: episode('Wobble on the Hill', 'The rover learned to keep a steady gap behind the supply sled.', [
      scene('The mast track’s first hill. The sled slows on the slope.', 'The rover surges, brakes, surges: back and forth, back and forth.', 55, [
        ['guest', 'It’s rocking like a boat. If it does that with the cables, they’ll fall off.', CREW.sato],
        ['myrobot', 'I made the gain bigger so I’d react faster. Now I over-react.'],
      ]),
      scene('Priya’s laptop in the tractor cab. Three graphs of gap over time.', 'Gain 6: big swings. Gain 0.5: slow drift, the sled pulls away. Gain 2: a small bump, then steady.', 75, [
        ['guest', 'Too much: wobble. Too little: you lag behind and never quite catch up. In between: good enough — and you only find it by testing.', CREW.raman],
        ['spark', 'Tuning is an experiment. Change one number at a time, run it, write down what you see.'],
        ['myrobot', 'Gain 2: one small overshoot, then steady. Gain 2 it is.'],
      ]),
      scene('The hill again. The rover rolls smoothly behind the sled.', 'The cable box stays put.', 40, [
        ['guest', 'Science, not guessing. Keep that log — someone will thank you for it.', CREW.raman],
      ]),
    ], 'At the mast, the guide line starts somewhere out in the snow. How does a rover find a line before it can follow it?'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'inspect',
      narration: 'Look at the gap graph from your Distance Eyes: every wobble in the graph is the robot over-correcting.',
      why: 'The sensor is fine; the gain decides how hard the robot reacts to what the sensor says.',
      tryWithout: 'Without a graph or a log, “it feels a bit wobbly” is all you have — and you cannot compare gains fairly.',
      physicsEffect: 'Slopes slow the sled and change how much motor power the rover needs to keep up.',
      realWorld: 'Engineers tuning drones, robot arms and lift motors log a step response for every gain they try.',
    },
    code: challenge({
      title: 'Three Gains',
      mission: 'Run the gap controller with gain 0.5, then 2, then 6. Say the closest gap after each run and record what you saw (lag, steady, wobble).',
      arena: arena(SLED_TRACK, { features: ['The sled goes up a gentle hill between 10 s and 20 s.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER, SAY],
      example: [
        'variable_set(gain, 0.5)  ← then 2, then 6: change one thing at a time',
        'variable_set(closest, 200)',
        'repeat_until(compare(timer_s > 30)) {',
        '  if (compare(distance_cm < variable_get(closest))) { variable_set(closest, distance_cm) }',
        '  variable_set(speed, math(variable_get(gain) × math(distance_cm − 30)))',
        '  set_motors(variable_get(speed), variable_get(speed)); wait(0.1)',
        '}',
        'stop; say(variable_get(closest))',
      ],
      success: [crit('uses-blocks', 'Three runs recorded, one per gain, with only the gain changed.'), crit('no-collision', 'Gain 2 never touches the sled.')],
      two: 'Your log has gain, closest gap and a one-word description for each run.',
      three: 'You predicted the order of the closest gaps before running.',
      hints: ['Only change the gain between runs.', 'Write down the closest gap the robot says after each run.', 'Gains 0.5, 2 and 6: one should lag, one settle and one wobble.'],
    }),
    challenge: challenge({
      title: 'Tune for the Hill',
      mission: 'Find a gain that keeps 25–35 cm behind the sled over the hill with at most one overshoot. Log at least three gains you tried.',
      arena: arena(SLED_TRACK, { features: ['The sled goes up a gentle hill between 10 s and 20 s, then stops suddenly at 25 s.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER, SAY],
      example: [
        'variable_set(gain, 2.5)  ← chosen from the log: 1 lagged, 4 wobbled, 2.5 settled',
        'repeat_until(compare(timer_s > 30)) {',
        '  variable_set(speed, math(variable_get(gain) × math(distance_cm − 30)))',
        '  set_motors(variable_get(speed), variable_get(speed)); wait(0.1)',
        '}',
        'stop',
      ],
      success: [crit('no-collision', 'Never touches the sled, including at the sudden stop.'), crit('within-time', 'After 3 s the gap stays within 25–35 cm.'), crit('uses-blocks', 'A gain log of at least three tested values (recorded by the simulator).')],
      two: 'Your log shows at least three gains and what each did.',
      three: 'You explained, using your log, why your chosen gain is “good enough”.',
      hints: ['Start from a gain that worked on flat ground.', 'If it wobbles, go smaller; if it lags, go bigger.', 'Try halfway between your best “lag” and your best “wobble” gain.'],
    }),
    quiz: [
      q('Your rover rocks back and forth behind the sled. What should you try first?', [
        right('A smaller gain', '🔽'),
        wrong('A bigger gain, so it reacts faster and settles', '🔼', 'gain-bigger-is-better'),
        wrong('A faster loop with no change to the gain', '⏱️', 'tuning-is-guessing'),
      ], 'Rocking means over-correcting: the gain is too high. A smaller gain makes each correction gentler.'),
      q('With a very small gain the rover…', [
        right('Reacts slowly and lags behind the sled', '🐢'),
        wrong('Wobbles wildly', '🌊', 'gain-bigger-is-better'),
        wrong('Stays exactly at 30 cm, because small changes are precise', '🎯', 'small-gain-is-precise'),
      ], 'A small gain gives small corrections, so the robot is slow to respond and leaves a big error when the sled moves.'),
      q('What makes gain tuning a fair experiment?', [
        right('Change only the gain, run the same course, and record each result', '🧪'),
        wrong('Change the gain and the speed together to save time', '⏩', 'tuning-is-guessing'),
        wrong('Keep trying until one run looks good, then stop', '🎲', 'tuning-is-guessing'),
      ], 'Change one thing at a time on the same course, and write it down. Otherwise you cannot tell what caused the difference.'),
    ],
    badge: { id: 'l3-gain-tuner', name: 'Gain Tuner', icon: '🎛️', earnedFor: 'You tuned a controller by testing gains and recording the results.' },
    reward: { note: 'Your gain log is saved in your gallery — the Level 3 certificate asks for it.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Shower tap', 'why can’t you find the right gain by thinking alone?'),
      warmup: {
        title: 'Shower tap',
        minutes: 5,
        steps: ['Story: a shower where the water takes 3 s to change temperature. One student is the tap; the class shouts “too cold / too hot”.', 'The tap student turns a lot each time (big gain): hot-cold-hot. Then a tiny bit each time (small gain): cold for ages.', 'Ask: what would a good shower-tap turner do?'],
        materials: ['None'],
      },
      discussion: ['Where have you seen over-correction? (Steering a shopping trolley, a wobbly bike, a nervous goalkeeper.)', 'Why keep a log instead of remembering?'],
      misconceptions: [
        mc('gain-bigger-is-better', 'A bigger gain always means better, faster control.', 'Too big a gain over-corrects and oscillates; there is a sweet spot.', 'Show the three gap graphs (gain 0.5, 2, 6). Pairs label each “lag”, “steady” or “wobble” and rank them for the tractor driver.'),
        mc('small-gain-is-precise', 'A small gain is more precise.', 'A small gain reacts weakly, so the error stays large for longer.', 'Push a toy car with a tiny nudge each second towards a line: count how many seconds to arrive. Then medium nudges. Compare.'),
        mc('tuning-is-guessing', 'Tuning is trying numbers until one looks right.', 'Tuning is an experiment: change one variable, keep the rest fixed, record, compare.', 'Give a messy log where gain and speed both changed. Pairs try to decide which change helped. Then redo it as a fair test table.'),
      ],
      faster: ['Find the gain where wobble just starts (the edge of stability) and report half of it.', 'Plot closest gap against gain from the class’s logs.'],
      slower: ['Test only two gains (0.5 and 2) and describe the difference.', 'Use the gap graph instead of the variable for the closest gap.'],
      notes: ['The gain log is a certificate criterion (Session 8): make sure each pair saves it.', 'Sky Port: Drone Pilot (Pilot tier) is this session’s playable tuning challenge.'],
    }),
    parent: {
      today: 'Your child tuned a robot controller like an engineer: testing gains, recording what happened and choosing one with evidence.',
      tryAtHome: 'Adjust a shower or tap temperature with big turns, then small ones. Which gets you there faster without overshooting?',
      askYourChild: 'What happens when the gain is too big — and how did you find a good one?',
    },
  }),

  // ── 9 ────────────────────────────────────────────────────────────────────
  makeSession(L, 9, {
    objectives: [
      o('Uses a state variable to switch between behaviours (search, follow, done) and draws the matching state diagram.', 'I can use a state variable to make my robot switch between jobs.', ['programming', 'algorithms']),
      o('Breaks a mission into states and the events that move the robot between them.', 'I can break a mission into states and the events that change them.', ['algorithms'], { concepts: ['decomposition'] }),
    ],
    episode: episode('Where Does the Line Start?', 'The rover tuned its gain and carried the cables up the hill without a wobble.', [
      scene('The mast’s base, deep snow. The guide line begins somewhere ahead, buried at the edge.', 'The rover runs its line follower — and spins on the spot, searching for a line it can’t see.', 55, [
        ['myrobot', 'My follower only knows how to follow. Without a line, it just turns and turns.'],
        ['guest', 'In rescue we have phases: search, then reach, then stabilise. You don’t do them all at once.', CREW.quispe],
      ]),
      scene('Spark draws three bubbles on the snow: SEARCH → FOLLOW → DONE, with arrows.', 'Each arrow has a label: “line seen”, “something close ahead”.', 70, [
        ['spark', 'A state is a mode the robot is in. One variable — state — remembers which mode. Each loop: check the state, do that job, and change state when an event happens.'],
        ['myrobot', 'State 1: drive forward slowly until the line appears. Then state 2: follow it. When the mast foot is close ahead, state 3: stop and say done.'],
      ]),
      scene('The rover runs the state machine. A label floats above it: SEARCH… FOLLOW… DONE.', 'It parks neatly at the mast.', 40, [
        ['guest', 'Calm and in order. That’s how rescues go right.', CREW.quispe],
      ]),
    ], 'The mast is reached — and its gauges hold a week of readings no one has collected.'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'inspect',
      narration: 'Look at the line sensor: “line seen” is the event that moves the robot from searching to following.',
      why: 'Sensors turn the world into events; states decide what each event means right now.',
      tryWithout: 'Without states, one loop tries to search and follow at the same time — and does neither well.',
      physicsEffect: 'No change. The line is first visible 60 cm from the start.',
      realWorld: 'Robot vacuums switch between states — clean, spot-clean, return to dock — and so do warehouse robots and Mars rovers.',
    },
    code: challenge({
      title: 'Search, Then Follow',
      mission: 'Use state = 1 for search (creep forward until line seen) and state = 2 for follow (proportional steering). Run until the timer reaches 25 s.',
      arena: arena(GUIDE_LINE, { start: { col: 1, row: 7, heading: 'up' }, features: ['The line starts 60 cm ahead of the start box.', 'The mast foot (a wall) stands at the end of the line.'], requires: ['move', 'follow-line', 'see-wall'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, DIST, TIMER],
      example: [
        'variable_set(state, 1)',
        'repeat_until(compare(timer_s > 25)) {',
        '  if (compare(variable_get(state) = 1)) { set_motors(25, 25); if (line_seen) { variable_set(state, 2) } }',
        '  if (compare(variable_get(state) = 2)) { set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset))) }',
        '}',
        'stop',
      ],
      success: [crit('uses-blocks', 'Uses a state variable that changes from 1 to 2 when the line is seen.'), crit('reach-zone', 'Gets onto the line and follows it.')],
      two: 'You drew the state diagram before coding.',
      three: 'Each state’s job is short enough to read aloud in one breath.',
      hints: ['What does the robot do while it has not found the line yet?', 'Check the state at the top of every loop.', 'state 1: creep and look for the line; when line_seen, set state to 2; state 2: follow.'],
    }),
    challenge: challenge({
      title: 'Search, Follow, Done',
      mission: 'Add a third state: when the mast foot is less than 20 cm ahead, stop, say “At the mast” and finish. Your state diagram must match your program.',
      arena: arena(GUIDE_LINE, { start: { col: 1, row: 7, heading: 'up' }, features: ['The line starts 60 cm ahead of the start box.', 'The mast foot (a wall) stands at the end of the line.'], requires: ['move', 'follow-line', 'see-wall'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, DIST, TIMER, SAY],
      example: [
        'variable_set(state, 1)',
        'repeat_until(compare(variable_get(state) = 3)) {',
        '  if (compare(variable_get(state) = 1)) { set_motors(25, 25); if (line_seen) { variable_set(state, 2) } }',
        '  if (compare(variable_get(state) = 2)) {',
        '    set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset)))',
        '    if (compare(distance_cm < 20)) { variable_set(state, 3) }',
        '  }',
        '}',
        'stop; say("At the mast")',
      ],
      success: [crit('stop-in-zone', 'Stops at the mast foot, 10–20 cm from it, without touching it.'), crit('uses-blocks', 'Three states in one variable; the teacher checks the diagram matches.')],
      two: 'It works from three start positions along the bottom edge.',
      three: 'You added a say block when each state begins, so you can hear the robot change mode.',
      hints: ['What event should end following?', 'Check the distance only while following.', 'In state 2, if distance_cm < 20 then set state to 3; the outer loop stops when state is 3.'],
    }),
    quiz: [
      q('What does the state variable hold?', [
        right('Which mode the robot is in right now', '🗂️'),
        wrong('The robot’s position', '📍', 'state-is-position'),
        wrong('How many loops have run', '🔢', 'state-is-position'),
      ], 'A state variable remembers the mode (search, follow, done). Position and loop counts are other variables.'),
      q('In the FOLLOW state the line is lost for a moment. With only SEARCH → FOLLOW → DONE, what happens?', [
        right('It keeps following with its last offset — there is no arrow back to SEARCH', '➡️'),
        wrong('It automatically goes back to SEARCH', '↩️', 'states-switch-themselves'),
        wrong('It stops, because states stop when something goes wrong', '🛑', 'states-switch-themselves'),
      ], 'A state only changes when your program changes it. If you want “lost the line → search again”, you must add that arrow and that if block.'),
      q('Why split the mission into states instead of one big loop full of ifs?', [
        right('Each state has one small job, so it is easier to read, test and fix', '🧩'),
        wrong('States make the robot faster', '⚡', 'states-are-faster'),
        wrong('Robots can only do one thing per program', '1️⃣', 'states-are-faster'),
      ], 'States are about clarity: you can test SEARCH on its own, then FOLLOW. The robot is not faster — the program is easier to get right.'),
    ],
    badge: { id: 'l3-state-machine', name: 'State Machine', icon: '🔀', earnedFor: 'You structured a mission as states and switched between them with a variable.' },
    reward: { note: 'State diagrams: a blank state-diagram sheet is added to your project tools.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Traffic light states', 'what event moves the robot from one state to the next?'),
      warmup: {
        title: 'Traffic light states',
        minutes: 6,
        steps: ['Draw a traffic light as three bubbles: RED → GREEN → AMBER → RED. Label each arrow with its event (timer).', 'Ask a student to “be” the light while the class calls out events.', 'Then draw a second machine together: a phone (LOCKED → UNLOCKED → ASLEEP).'],
        materials: ['Board or paper'],
      },
      discussion: ['What states does a washing machine have? What events move it on?', 'What should happen if the robot loses the line while following?'],
      misconceptions: [
        mc('state-is-position', 'The state is where the robot is (or a count).', 'The state is the robot’s current mode of behaviour; position and counts are separate variables.', 'Give three variables on cards: x = 120, laps = 4, state = FOLLOW. Students sort them into “where”, “how many” and “what mode”.'),
        mc('states-switch-themselves', 'States change automatically when something goes wrong.', 'A state changes only when the program sets it, on an event you wrote.', 'Students act the FOLLOW state; hide the line. With no “lost line” rule, what do they do? Add the arrow FOLLOW → SEARCH (event: line not seen for 1 s) and re-act it.'),
        mc('states-are-faster', 'States make the robot run faster.', 'States make programs clearer and easier to test; speed is unchanged.', 'Show the same behaviour written as one tangled loop and as three states. Time how long pairs take to find a planted bug in each.'),
      ],
      faster: ['Add the arrow FOLLOW → SEARCH when the line is lost for more than 1 s (use the timer).', 'Make the robot say its state whenever it changes.'],
      slower: ['Give the state diagram ready-made and the state 1 code; students write state 2.', 'Use numbers 1 and 2 only, then add 3.'],
      notes: ['The certificate asks for a state diagram that matches the final program (Session 24). Start the habit now: diagram first, then code.', 'Robo Sumo Arena (Pilot tier) is a state machine in disguise: search → charge → recover.'],
    }),
    parent: {
      today: 'Your child used a state variable so their robot could switch between searching for a line, following it and stopping.',
      tryAtHome: 'Draw the “states” of a washing machine or microwave together, with arrows for what moves it to the next state.',
      askYourChild: 'What states did your robot have, and what made it switch?',
    },
  }),

  // ── 10 ───────────────────────────────────────────────────────────────────
  makeSession(L, 10, {
    objectives: [
      o('Logs a series of readings into variables and computes the minimum, maximum and average with a program.', 'I can make my robot log readings and report the smallest, largest and average.', ['data', 'programming']),
      o('Explains why the starting values for min and max matter.', 'I can explain how to start a “smallest so far” variable.', ['mathematics-measurement'], { concepts: ['data'] }),
    ],
    episode: episode('A Week of Snow', 'The rover reached the mast with a search–follow–done state machine.', [
      scene('The weather mast: gauges round its base, one buried, one leaning.', 'Priya scrolls an empty data file on her tablet.', 55, [
        ['guest', 'The mast stopped sending a week ago. I need the snow depth at four gauges — and I don’t want four numbers, I want a summary.', CREW.raman],
        ['myrobot', 'Which summary?'],
        ['guest', 'Smallest, biggest and average. That’s what goes in the report.', CREW.raman],
      ]),
      scene('The gauge row. The rover stops at each gauge, turns to face it, and reads the distance.', 'Three boxes float above it: SMALLEST, BIGGEST, TOTAL.', 70, [
        ['spark', 'Start “smallest so far” very high, so the first reading beats it. Start “biggest so far” at zero. Each reading: is it smaller? Bigger? Add it to the total.'],
        ['myrobot', 'Four readings: 42, 67, 35, 80. Smallest 35, biggest 80, total 224, average 56.'],
      ]),
      scene('The tractor cab. Priya’s report fills in.', 'A tiny chart appears: four bars.', 35, [
        ['guest', 'Summaries make data useful. But I keep the raw numbers too — in case the summary hides something.', CREW.raman],
      ]),
    ], 'Kenji looks at the battery meter after the gauge run: 61 % left. “The far mast is twice as far. Will we make it?”'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'inspect',
      narration: 'Your Distance Eyes become a measuring tool: face a gauge and read how far away its marker is.',
      why: 'A sensor reading becomes data the moment you store it and use it later.',
      tryWithout: 'Without variables to log into, each reading vanishes as soon as the next one comes.',
      physicsEffect: 'Accuracy about ±1 cm on a flat face up to 200 cm.',
      realWorld: 'Autonomous weather stations and ocean gliders log readings for weeks and send back summaries when they can.',
    },
    code: challenge({
      title: 'Log Four Gauges',
      mission: 'At each of the four gauges: stop, turn left to face it, read the distance into total (add it), turn back. At the end say the average (total ÷ 4).',
      arena: GAUGE_ROW,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, SAY],
      example: [
        'variable_set(total, 0)',
        'repeat(4) {',
        '  drive_distance(100, 40)',
        '  turn_degrees(90, 40); wait(0.3)',
        '  variable_change(total, distance_cm)',
        '  turn_degrees(−90, 40)',
        '}',
        'say(math(variable_get(total) ÷ 4))',
      ],
      success: [crit('action-at-zone', 'Faces each gauge and reads it.'), crit('uses-blocks', 'Says the correct average (within 1 cm).')],
      two: 'You wrote all four readings down and checked the average by hand.',
      three: 'You explained why you divide by 4, and what you would divide by with 6 gauges.',
      hints: ['Add each reading to a running total.', 'The average is total ÷ number of readings.', 'total starts at 0; change total by distance_cm at each gauge; say total ÷ 4.'],
    }),
    challenge: challenge({
      title: 'Min, Max, Average',
      mission: 'Log the four gauges and report the smallest, the biggest and the average reading.',
      arena: GAUGE_ROW,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, SAY],
      example: [
        'variable_set(total, 0); variable_set(smallest, 999); variable_set(biggest, 0)',
        'repeat(4) {',
        '  drive_distance(100, 40); turn_degrees(90, 40); wait(0.3)',
        '  variable_set(r, distance_cm)',
        '  variable_change(total, variable_get(r))',
        '  if (compare(variable_get(r) < variable_get(smallest))) { variable_set(smallest, variable_get(r)) }',
        '  if (compare(variable_get(r) > variable_get(biggest))) { variable_set(biggest, variable_get(r)) }',
        '  turn_degrees(−90, 40)',
        '}',
        'say(variable_get(smallest)); say(variable_get(biggest)); say(math(variable_get(total) ÷ 4))',
      ],
      success: [crit('uses-blocks', 'Reports min, max and average correctly on three random gauge layouts.'), crit('no-collision', 'Never touches a gauge.')],
      two: 'Correct on three different gauge layouts.',
      three: 'You stored each reading in its own variable (r1–r4) too, so the raw data is kept.',
      hints: ['Store the reading once in r, then use r three times.', 'smallest must start bigger than any possible reading.', 'smallest = 999, biggest = 0 before the loop; update both with ifs after each reading.'],
    }),
    quiz: [
      q('Before the loop, what should “smallest so far” start at?', [
        right('A number bigger than any possible reading, like 999', '⬆️'),
        wrong('0', '0️⃣', 'min-starts-at-zero'),
        wrong('It doesn’t matter', '🤷', 'min-starts-at-zero'),
      ], 'If smallest starts at 0, no reading is ever smaller, so it stays 0. Starting very high means the first real reading always replaces it.'),
      q('Readings 40, 60, 20, 80. What is the average?', [
        right('50', '✅'),
        wrong('200', '➕', 'average-is-total'),
        wrong('60 — the middle of 40 and 80', '↔️', 'average-is-middle-value'),
      ], 'Average = total ÷ count = 200 ÷ 4 = 50. The total is not the average, and picking a middle-looking value skips the other readings.'),
      q('Priya keeps the raw readings as well as the summary. Why?', [
        right('A summary can hide things, like one strange reading', '🔍'),
        wrong('In case the robot’s maths is wrong — computers often add up wrongly', '🧮', 'summary-is-enough'),
        wrong('There is no reason; the summary says everything', '📋', 'summary-is-enough'),
      ], 'An average of 56 could come from four similar readings or from one huge and three tiny ones. Raw data lets you look again.'),
    ],
    badge: { id: 'l3-data-logger', name: 'Data Logger', icon: '📈', earnedFor: 'You logged readings and summarised them with min, max and average.' },
    reward: { note: 'Data sheet unlocked: your robot’s readings appear as a table you can copy into a report.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Smallest so far', 'how did you choose the starting values?'),
      warmup: {
        title: 'Smallest so far',
        minutes: 5,
        steps: ['Students line up; the first student holds a card “smallest so far: 999”.', 'Each student says their shoe size; if smaller, the card is wiped and updated.', 'Ask: what if the card started at 0?'],
        materials: ['A mini whiteboard as the “smallest so far” card'],
      },
      discussion: ['Where do you see min, max and average reported? (Weather apps, sports stats, school reports.)', 'When could an average mislead you?'],
      misconceptions: [
        mc('min-starts-at-zero', 'A minimum variable should start at 0.', 'A “smallest so far” must start higher than any reading (or at the first reading); 0 is never beaten.', 'Run the shoe-size warm-up with the card starting at 0. Nobody beats it. Discuss what number to start at, and why “the first reading” also works.'),
        mc('average-is-total', 'The total is the average.', 'The average is the total divided by how many readings there are.', 'Share 12 sweets between 4 people. The total is 12; each gets 3 — that is the average. Repeat with the gauge readings.'),
        mc('average-is-middle-value', 'The average is the value halfway between the smallest and biggest.', 'The average uses every reading: total ÷ count. Halfway between min and max ignores the middle readings.', 'Readings 10, 12, 14, 64: halfway between min and max is 37, but the average is 25. Pairs compute both and decide which describes the data better.'),
        mc('summary-is-enough', 'Once you have a summary, the raw data is not needed.', 'Summaries hide detail (outliers, patterns); keeping raw data lets you check and look again.', 'Show two data sets with the same average and very different spread. Ask which gauge Priya should worry about.'),
      ],
      faster: ['Report the range (biggest − smallest).', 'Ignore any reading of 200 (no echo) and divide by the number of good readings instead of 4.'],
      slower: ['Do the average only; add min and max as a second step.', 'Use a printed table to fill in readings as the robot says them.'],
      notes: ['The “ignore 200” extension prepares Session 20 (fail-safes): a no-echo reading is not snow depth.'],
    }),
    parent: {
      today: 'Your child programmed their robot to log readings and report the smallest, biggest and average — real data handling.',
      tryAtHome: 'Track the temperature (or bedtime, or steps) for four days and work out the min, max and average together.',
      askYourChild: 'Why does “smallest so far” have to start at a big number?',
    },
  }),

  // ── 11 ───────────────────────────────────────────────────────────────────
  makeSession(L, 11, {
    objectives: [
      o('Uses an energy table and variables to predict the battery used on two routes and choose the one that fits the budget.', 'I can work out which route my robot can afford with its battery.', ['science-energy', 'mathematics-measurement']),
      o('Explains how speed, slope and mass change the energy a robot uses.', 'I can explain why speed, hills and heavy loads use more battery.', ['science-energy', 'engineering-design'], { concepts: ['physics', 'design-process'] }),
    ],
    episode: episode('Twice as Far', 'The rover logged a week of snow depths and summarised them.', [
      scene('The battery charger in the hut. The meter reads 61 % after one run.', 'Kenji holds up two route cards: OVER THE RIDGE (6 m, steep) and ROUND THE RIDGE (10 m, flat).', 65, [
        ['guest', 'Out there, a flat battery means a rescue mission for a rescue robot. We plan energy before we go.', CREW.sato],
        ['myrobot', 'The short route must be cheaper. It’s shorter.'],
        ['guest', 'Is it? Climbing costs. Speed costs. Carrying things costs. Check the table.', CREW.sato],
      ]),
      scene('The energy table on the hut wall. Spark animates the rover’s battery draining on each route.', 'Uphill metres glow red; flat metres glow green.', 65, [
        ['spark', 'Ridge: 3 metres uphill at 6 % each is 18 %, and 3 down at 1 % is 3 %. That’s 21 %. Round: 10 metres flat at 2 % is 20 %.'],
        ['myrobot', 'Nearly the same! But if I take the gripper off — 100 grams less — every metre costs 10 % less.'],
        ['guest', 'Now you’re thinking like an engineer: every gram has to earn its place.', CREW.sato],
      ]),
      scene('The hut door. The rover rolls out without its gripper, the battery meter at 100 %.', 'Kenji writes the prediction on the whiteboard: 20 % used.', 35, [
        ['guest', 'Write the prediction down before you go. When you come back, we check it. That’s how we get better at planning.', CREW.sato],
      ]),
    ], 'The rover sets off light and slow, with the far mast still out of sight.'),
    build: {
      part: { slot: 'tool', id: 'none' },
      action: 'swap',
      narration: 'Take the tool off for the long run. Lighter means less energy per metre.',
      why: 'A motor has to push every gram up every hill; mass that is not needed is energy wasted.',
      tryWithout: 'Keep the tool on and the energy table adds 10 % to every metre — enough to arrive with too little battery to get home.',
      physicsEffect: 'Removing the gripper takes 0.12 kg off; on the energy table that saves about one tenth of the battery per metre.',
      realWorld: 'Mars rover teams plan every drive against the power available that day, and drones are designed gram by gram.',
    },
    code: challenge({
      title: 'Price the Routes',
      mission: 'Using the energy table, compute the battery each route costs in two variables and say which is cheaper.',
      arena: ROUTE_CHOICE,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, BATTERY, SAY],
      example: [
        'variable_set(ridge, math(math(3 × 6) + math(3 × 1)))  ← 3 m up at 6 %/m, 3 m down at 1 %/m',
        'variable_set(round, math(10 × 2))  ← 10 m flat at 2 %/m',
        'if_else(compare(variable_get(ridge) < variable_get(round))) { say("Ridge is cheaper") } else { say("Round is cheaper") }',
        'say(variable_get(ridge)); say(variable_get(round))',
      ],
      success: [crit('uses-blocks', 'Both route costs computed from the table in variables.'), crit('uses-blocks', 'Says the cheaper route correctly (round: 20 % against 21 %).')],
      two: 'You wrote the calculation for each route on paper first.',
      three: 'You found how much the gripper adds to each route.',
      hints: ['Cost = metres × % per metre, for each part of the route.', 'The ridge has an uphill part and a downhill part.', 'ridge = 3 × 6 + 3 × 1 = 21; round = 10 × 2 = 20.'],
    }),
    challenge: challenge({
      title: 'Arrive with Power to Spare',
      mission: 'Choose speed and route so the rover reaches the far mast and could still drive home: it must arrive with at least 50 % battery. Your program computes the prediction, says it, then drives.',
      arena: ROUTE_CHOICE,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, BATTERY, SAY, TURN],
      example: [
        'variable_set(battery, 100)',
        'variable_set(cost, math(10 × 2))  ← round route, 40 % speed, no tool',
        'say(math(variable_get(battery) − variable_get(cost)))',
        'drive_distance(400, 40); turn_degrees(−90, 40); drive_distance(200, 40); turn_degrees(−90, 40); drive_distance(400, 40)',
        'stop',
      ],
      success: [crit('reach-zone', 'Reaches the far mast zone.'), crit('within-time', 'Arrives with at least 50 % battery (battery model).'), crit('uses-blocks', 'The prediction it says is within 5 % of the battery actually used.')],
      two: 'Your prediction was within 5 % of the real battery used.',
      three: 'You tested the same route at two speeds and explained the difference.',
      hints: ['Which costs more: speed, the hill, or the load?', 'Price both routes at 40 % speed with no tool.', 'Round route at 40 % with no tool: 20 % predicted, about 80 % left.'],
    }),
    quiz: [
      q('Which route uses less energy: 6 m with 3 m steep uphill, or 10 m flat?', [
        right('It depends on the costs per metre: you have to calculate', '🧮'),
        wrong('The shorter one, always', '📏', 'shorter-uses-less'),
        wrong('The longer one, always', '🛣️', 'shorter-uses-less'),
      ], 'Distance is only one factor: uphill metres cost three times as much as flat ones here. With these numbers the routes cost 21 % and 20 %.'),
      q('Why does taking the gripper off save battery?', [
        right('Less mass means the motors push less weight up every hill and through every start', '🪶'),
        wrong('The gripper uses battery even when it is not moving', '🔌', 'mass-does-not-matter'),
        wrong('It doesn’t: mass doesn’t matter to a motor', '🤷', 'mass-does-not-matter'),
      ], 'Moving mass costs energy, especially uphill and when speeding up. A closed gripper draws almost no current; its weight is the cost.'),
      q('Driving the same route at 80 % instead of 40 % speed…', [
        right('Uses more battery per metre, but arrives sooner', '⚡'),
        wrong('Uses less battery because it is on for less time', '⏱️', 'faster-saves-energy'),
        wrong('Uses exactly the same battery', '⚖️', 'faster-saves-energy'),
      ], 'Faster driving loses more energy to friction and to speeding up and slowing down. The table shows 3 % per metre at 80 % against 2 % at 40 %.'),
    ],
    badge: { id: 'l3-energy-planner', name: 'Energy Planner', icon: '🔋', earnedFor: 'You planned a route within a battery budget, using maths and evidence.' },
    reward: { note: 'Battery meter on: from now on your projects show the battery your plan predicts.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Carry the backpack', 'what costs a robot the most energy, and how would you know?'),
      warmup: {
        title: 'Carry the backpack',
        minutes: 6,
        steps: ['Two volunteers walk up and down the stairs (or step up on a low, safe step 10 times): once with an empty bag, once with books in it.', 'Ask: which felt harder? Which was faster? What about running vs walking?', 'Write three energy costs on the board: mass, hills, speed.'],
        materials: ['A backpack with a few books', 'A low, stable step (or stairs, supervised)'],
      },
      discussion: ['What else has an energy budget? (Phones, electric cars, your own body on a hike.)', 'Would you rather arrive faster or with spare battery on a mountain? Why?'],
      misconceptions: [
        mc('shorter-uses-less', 'The shortest route always uses the least energy.', 'Energy depends on distance AND what each metre costs (slope, surface, speed, load).', 'Two paper routes on the board: short and steep, long and flat, with per-metre costs. Pairs calculate both before guessing, then reveal.'),
        mc('mass-does-not-matter', 'Extra mass does not change the energy a robot uses.', 'Every kilogram must be accelerated and lifted; more mass costs more energy, especially uphill.', 'Push an empty and a loaded toy car (or chair on castors) up a ramp with a spring balance or by feel. Discuss what the motor “feels”.'),
        mc('faster-saves-energy', 'Driving faster saves energy because it takes less time.', 'Faster driving usually costs more energy per metre (friction, acceleration losses) even though it is on for less time.', 'Compare cycling slowly and sprinting the same distance: which leaves you more tired? Then check the energy table rows for 40 % and 80 %.'),
      ],
      faster: ['Work out the heaviest load the rover can carry on the round route and still arrive with 50 %.', 'Add the return journey to the budget.'],
      slower: ['Price one route only, with a worked example for the other.', 'Use a calculator and fill in a cost table.'],
      notes: ['The simulator models the battery (roadmap #39): every robot carries the pack its power upgrade gives it, the “battery %” block reads it and the Flight Recorder graphs it. The playable challenge is the Power Lab arena “Home before flat” (/kids/lab/power?demo=power-home-before-flat), where the battery is real and can run flat; the energy prediction is still checked against the energy table, and the Skill Galaxy designer “Power for a 90-minute lesson” is the practice.'],
    }),
    parent: {
      today: 'Your child planned a robot route against a battery budget, discovering that hills, speed and weight all cost energy.',
      tryAtHome: 'Plan a family walk or cycle: is the short hilly way or the long flat way easier? Try both and compare how you feel.',
      askYourChild: 'Why isn’t the shortest route always the cheapest for a robot’s battery?',
    },
  }),

  // ── 12 ───────────────────────────────────────────────────────────────────
  makeSession(L, 12, {
    objectives: [
      o('Designs an inspection run that combines proportional line following, data logging and an energy budget, and meets stated constraints.', 'I can design a complete inspection run that follows, logs and saves battery.', ['engineering-design', 'programming']),
      o('Uses a test log to justify design choices (gain, speed, route).', 'I can use my test log to explain my design choices.', ['data', 'communication'], { concepts: ['data', 'design-process'] }),
    ],
    episode: episode('Weather Mast Inspector', 'The rover planned a route within its battery budget.', [
      scene('The far weather mast, its cables iced over, four feet buried in snow.', 'Dr Owusu’s voice on the radio. Priya holds up the inspection checklist.', 60, [
        ['guest', 'This is the big one. Lap the mast on its guide line, log a reading at each foot, and come home with battery to spare. Your design.', CREW.owusu],
        ['guest', 'And I want min, max and average — plus the raw numbers.', CREW.raman],
      ]),
      scene('The planning table. The robot sketches a state diagram and an energy sum.', 'Two designs: fast with a high gain, steady with a tuned gain.', 50, [
        ['myrobot', 'Fast is tempting. But the log from Session 8 says a high gain wobbles — and wobbles waste battery.'],
      ]),
    ], 'The mast data comes in — and it shows the ice beneath the ridge is moving fast.'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Choose your inspection tool — or none, to save battery. Your design, your trade-off.',
      why: 'Every part must earn its place on a long run: the tool you pick changes both the job and the energy.',
      tryWithout: 'A tool you never use is mass you carry round the whole loop.',
      physicsEffect: 'Each tool adds 0.10–0.12 kg; on the energy table that is about one tenth more per metre.',
      realWorld: 'Power-line and wind-turbine inspection robots carry only the sensors the inspection needs.',
    },
    code: challenge({
      title: 'One Lap, Four Feet',
      mission: 'Follow the mast loop with proportional steering and stop briefly at each foot (when a post is less than 90 cm ahead). Count the feet.',
      arena: MAST_LOOP,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_OFFSET, LINE_SEEN, DIST, TIMER, ...TALK],
      example: [
        'variable_set(feet, 0); variable_set(gain, 30)',
        'repeat_until(compare(variable_get(feet) = 4)) {',
        '  set_motors(math(35 + math(variable_get(gain) × line_offset)), math(35 − math(variable_get(gain) × line_offset)))',
        '  if (compare(distance_cm < 90)) { stop; beep; variable_change(feet, 1); drive_distance(30, 35) }',
        '}',
        'stop; say(variable_get(feet))',
      ],
      success: [crit('action-at-zone', 'Stops once at each of the four feet.'), crit('reach-zone', 'Completes the lap.')],
      two: 'Your gain comes from your Session 8 log.',
      three: 'You drew the state diagram (follow → at foot → follow → home).',
      hints: ['What tells the robot it has reached a foot?', 'After a stop, drive past the post before checking again.', 'Count feet; stop the loop when feet = 4.'],
    }),
    challenge: challenge({
      title: 'Weather Mast Inspector',
      mission: 'Your design: lap the mast with proportional line following, log the reading at each foot, report min / max / average, and finish back at the start with at least 20 % battery.',
      arena: MAST_LOOP,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_OFFSET, LINE_SEEN, DIST, TIMER, ...TALK],
      example: [
        'variable_set(feet, 0); variable_set(total, 0); variable_set(smallest, 999); variable_set(biggest, 0)',
        'repeat_until(compare(variable_get(feet) = 4)) {',
        '  set_motors(math(35 + math(30 × line_offset)), math(35 − math(30 × line_offset)))',
        '  if (compare(distance_cm < 90)) {',
        '    stop; variable_set(r, distance_cm); variable_change(feet, 1); variable_change(total, variable_get(r))',
        '    if (compare(variable_get(r) < variable_get(smallest))) { variable_set(smallest, variable_get(r)) }',
        '    if (compare(variable_get(r) > variable_get(biggest))) { variable_set(biggest, variable_get(r)) }',
        '    drive_distance(30, 35)',
        '  }',
        '}',
        'say(variable_get(smallest)); say(variable_get(biggest)); say(math(variable_get(total) ÷ 4))',
      ],
      success: [crit('reach-zone', 'Completes the lap and returns to the start box.'), crit('uses-blocks', 'Proportional line following; four logged readings reported as min / max / average.'), crit('within-time', 'Finishes with at least 20 % battery.')],
      two: 'Your reported numbers match the simulator’s gauge readings.',
      three: 'Your test log shows at least three runs and the change you made after each.',
      hints: ['Build it in layers: follow, then stop at feet, then log.', 'Reuse your Session 10 min/max code inside the “at a foot” branch.', 'Slower and smoother saves battery; check your gain log.'],
    }),
    quiz: [
      q('Your inspector wobbles on the bends and runs low on battery. What is the best first change?', [
        right('Lower the gain (and maybe the speed), test, and log the result', '🎛️'),
        wrong('Raise the gain so it corrects faster', '🔼', 'gain-bigger-is-better'),
        wrong('Change the gain, the speed and the route all at once', '🌀', 'change-everything-at-once'),
      ], 'Wobble is over-correction, and wobbling wastes energy. Change one thing, test, and record — then you know what helped.'),
      q('Two runs report averages of 55 and 58 for the same gauges. What does that tell you?', [
        right('The measurements vary a little run to run; report the spread honestly', '📊'),
        wrong('One run must be fake', '🚫', 'one-run-is-truth'),
        wrong('Only the first run counts', '1️⃣', 'one-run-is-truth'),
      ], 'Repeat measurements are never identical. Small differences are normal; reporting them is part of honest data.'),
      q('Why does the brief demand 20 % battery at the end?', [
        right('A safety margin: real runs use more than the plan', '🛟'),
        wrong('To make the challenge harder for no reason', '😤', 'margins-are-waste'),
        wrong('Batteries break below 20 %, so it is a rule of the hardware', '🔋', 'margins-are-waste'),
      ], 'Plans are predictions. Snow, wind or a retry can use more energy than expected, so engineers keep a margin.'),
    ],
    badge: { id: 'l3-mast-inspector', name: 'Mast Inspector', icon: '🗼', earnedFor: 'You designed an inspection run that follows, logs and returns with battery to spare.' },
    reward: { note: 'Project saved to your gallery: Weather Mast Inspector, with its data table.' },
    teacher: teacher({
      timing: projectPlan(4, 'What could go wrong? (pairs list three risks for the inspection run)'),
      warmup: {
        title: 'What could go wrong?',
        minutes: 4,
        steps: ['Pairs list three things that could go wrong on the inspection run (lost line, wobble, flat battery).', 'Share one per pair; the class groups them.', 'Each pair picks one risk to design against.'],
        materials: ['Sticky notes'],
      },
      discussion: ['Which part of your design came from evidence (a log) and which from a guess?', 'How would you know your data is trustworthy?'],
      misconceptions: [
        mc('gain-bigger-is-better', 'A bigger gain always means better, faster control.', 'Too big a gain over-corrects and oscillates; there is a sweet spot.', 'Show the three gap graphs (gain 0.5, 2, 6). Pairs label each “lag”, “steady” or “wobble” and rank them for the tractor driver.'),
        mc('change-everything-at-once', 'Changing several things at once finds the fix faster.', 'Change one thing per test so you know which change caused the result.', 'Pairs get a robot “bug report” and two plans: change three things at once, or one at a time. Simulate both with dice outcomes; which plan tells them what worked?'),
        mc('one-run-is-truth', 'One run gives the true answer; different results mean a mistake.', 'Real measurements vary; repeat runs show the spread, and you report it.', 'Each pair measures the same desk with a ruler; collect results on the board. Discuss why they differ and how to report “the length”.'),
        mc('margins-are-waste', 'Safety margins are wasted capacity.', 'Margins cover the gap between plan and reality; without them small surprises become failures.', 'Ask: how much earlier do you leave for the bus than the timetable says? Why? Connect to the 20 % rule.'),
      ],
      faster: ['Report the raw readings in order as well as the summary.', 'Add a fail-safe: if the line is lost for 2 s, stop and say so.'],
      slower: ['Provide the follow-and-stop program; pairs add logging.', 'Log only the average; add min and max if time allows.'],
      notes: ['Self-checks are reflection only and never gate a badge.', 'Share in the class gallery only; never public.'],
    }),
    parent: {
      today: 'Your child designed a full robot inspection run: following a line, logging data at four points, and returning with battery to spare.',
      tryAtHome: 'Plan a short “inspection walk” of your home (check four windows are closed) and write a mini report: what you checked, what you found.',
      askYourChild: 'Which design choice in your inspector came from your test log?',
    },
  }),
]
