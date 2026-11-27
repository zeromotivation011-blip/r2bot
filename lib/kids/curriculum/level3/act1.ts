// lib/kids/curriculum/level3/act1.ts
// Level 3, Act 1 (sessions 1–6): "Arrival at the Ridge".
// The rover arrives at Ridgeback Station and learns to remember (variables),
// calculate (maths), hold a heading on snow (the gyro), calibrate its own
// sensors and follow a line smoothly (proportional steering); the first
// "Make it yours" project is the station mail rover.

import type { Session } from '../types'
import {
  BEEP, CALIBRATION_STRIP, CREW, DIST, FLOOR_COLOR, GRIP_CLOSE, GRIP_OPEN, GUIDE_LINE, HEADING, HUT_ROW, LINE_OFFSET, LINE_SEEN,
  LOGIC, MEASURING_HALL, MOVE, SAY, SNOWFIELD, TALK, TIMER, VARS, VARS_MATH,
} from './shared'
import {
  arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong,
} from './kit'

const L = 3 as const

export const ACT1: Session[] = [
  // ── 1 ────────────────────────────────────────────────────────────────────
  makeSession(L, 1, {
    objectives: [
      o('Creates a named variable, sets its starting value once and changes it inside a loop to count events.', 'I can make my robot remember a number and count with it.', ['programming', 'data']),
      o('Explains where a robot keeps information (memory) and why a counter must start at zero.', 'I can explain why a counter starts at zero, once.', ['computing-systems'], { discussionOnly: true }),
    ],
    episode: episode('The Mail That Never Came', undefined, [
      scene('Ridgeback Station at dawn: five red-roofed huts on a glacier ridge, a supply sled, snow blowing off the peaks.', 'The robot arrives on the sled, crated. Dr Owusu and Kenji unpack it. A pile of letters sits in the post room.', 70, [
        ['narrator', 'High on a glacier ridge, a research station watches the ice. A rockfall has cut its paths — and winter is three weeks away.'],
        ['guest', 'Welcome to Ridgeback. We need a field rover, and the first job is the post. Five huts, every day.', CREW.owusu],
        ['guest', 'Last week the old rover delivered to hut three. Twice. Hut five got nothing. And it had no idea.', CREW.sato],
      ]),
      scene('The post room. Spark projects the old rover’s program on the wall.', 'The program is a long list of moves with no memory at all.', 60, [
        ['spark', 'This rover could move — but it couldn’t remember. Every hut looked like the first hut.'],
        ['myrobot', 'Then give me a memory. One number I can change: deliveries.'],
        ['spark', 'A variable: a named box in the robot’s brain that holds one value. You set it, change it, read it.', 'A glowing box labelled “deliveries” appears with 0 inside.'],
      ]),
      scene('The hut row, morning. Red flags flutter on huts that have post.', 'The robot drives the row; the box ticks 0 → 1 → 2 → 3 at each flagged hut.', 60, [
        ['guest', 'Three deliveries, three flags. And it can tell me the number when it gets back. That’s a rover I can trust.', CREW.owusu],
        ['spark', 'One rule: set the counter to zero once, before the round. Not at every hut — or it forgets everything.'],
      ]),
    ], 'The radio crackles from the weather mast: “Readings look odd…” Then silence.'),
    build: {
      part: { slot: 'tool', id: 'gripper' },
      action: 'inspect',
      narration: 'Look at the gripper: every time it opens at a hut, a letter is delivered.',
      why: 'Each “open gripper” is one event worth counting. The program, not the gripper, does the remembering.',
      tryWithout: 'Without a counter the rover can deliver perfectly and still not know how many letters it left.',
      physicsEffect: 'No change to mass. Opening and closing takes about 0.4 s each.',
      realWorld: 'Hospital delivery robots count every drop-off so nurses can check that each ward got its medicines.',
    },
    code: challenge({
      title: 'Count the Round',
      mission: 'Drive the hut row, open the gripper at all five huts, and count every delivery in a variable called deliveries. Say the count at the end.',
      arena: HUT_ROW,
      blocks: [...MOVE, ...LOGIC, ...VARS, GRIP_OPEN, GRIP_CLOSE, SAY],
      example: [
        'variable_set(deliveries, 0)  ← once, before the round',
        'repeat(5) {',
        '  drive_distance(100, 40)',
        '  grip_open; wait(0.5); grip_close',
        '  variable_change(deliveries, 1)',
        '}',
        'say(variable_get(deliveries))',
      ],
      success: [crit('action-at-zone', 'The gripper opens once in front of each of the five huts.'), crit('uses-blocks', 'The program sets a variable once and changes it inside the loop; say reports 5.')],
      two: 'Your variable has a clear name (not “x” or “a”).',
      three: 'You can explain why set is outside the loop and change is inside.',
      hints: ['Which block makes the number go up by one each time?', 'Put “set deliveries to 0” before the repeat, and “change deliveries by 1” inside it.', 'variable_set(deliveries, 0), then repeat 5 { drive 100 cm, open, close, change deliveries by 1 }, then say deliveries.'],
    }),
    challenge: challenge({
      title: 'Only Where the Flag Is Up',
      mission: 'Today only some huts have post. A red mat lies in front of each hut that does. Deliver only there, count the deliveries and the huts you passed, and report both.',
      arena: arena(HUT_ROW, { requires: ['move', 'grab', 'see-color'], features: ['Huts at rows 9, 7, 5, 3 and 1.', 'Red mat in front of each hut with post (2–4 huts, random each run).', 'Post room: a green zone at row 0.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS, GRIP_OPEN, GRIP_CLOSE, FLOOR_COLOR, SAY],
      example: [
        'variable_set(deliveries, 0)',
        'variable_set(huts, 0)',
        'repeat(5) {',
        '  drive_distance(100, 40)',
        '  variable_change(huts, 1)',
        '  if (floor_color = red) { grip_open; wait(0.5); grip_close; variable_change(deliveries, 1) }',
        '}',
        'drive_distance(50, 40)',
        'say(variable_get(deliveries)); say(variable_get(huts))',
      ],
      success: [crit('action-at-zone', 'The gripper opens at every red-mat hut and at no other hut.'), crit('stop-in-zone', 'Ends stopped in the post room.'), crit('uses-blocks', 'Says the right count of deliveries and of huts, on three different flag patterns.')],
      two: 'It works on three different flag patterns without changing the program.',
      three: 'Your rover also says how many huts had NO post (huts − deliveries).',
      hints: ['You need two memories: one for deliveries, one for huts passed.', 'Check the floor colour after each 100 cm. Only change deliveries inside the if.', 'Both variables start at 0 before the repeat; huts goes up every time round, deliveries only inside if floor colour = red.'],
    }),
    quiz: [
      q('Your program sets deliveries to 0, then changes it by 1 at three huts. What does say(deliveries) report?', [
        right('3', '3️⃣'),
        wrong('1 — each change replaces the number with 1', '1️⃣', 'change-replaces'),
        wrong('The word “deliveries”', '🔤', 'variable-is-a-label'),
      ], 'Change adds to what is already in the box: 0 + 1 + 1 + 1 = 3. The name is only the label on the box; say reads the value inside.'),
      q('Where should “set deliveries to 0” go?', [
        right('Once, before the repeat loop', '⬆️'),
        wrong('Inside the loop, before each hut', '🔁', 'reset-inside-loop'),
        wrong('Nowhere: a new variable already holds the right count', '✨', 'variables-start-right'),
      ], 'Setting it inside the loop wipes the count at every hut, so it can never pass 1. Set it once at the start so every run begins from a known value.'),
      q('Kenji asks the rover how many huts had no post. It knows deliveries and huts. Which expression answers him?', [
        right('huts − deliveries', '➖'),
        wrong('deliveries − huts', '🔄', 'order-does-not-matter'),
        wrong('It can’t: it would need a third sensor', '📡', 'variable-is-a-label'),
      ], 'Two remembered numbers can make a new one. Subtraction depends on order: 5 − 3 = 2 huts without post, but 3 − 5 = −2.'),
    ],
    badge: { id: 'l3-memory-keeper', name: 'Memory Keeper', icon: '🧠', earnedFor: 'You made your robot remember and count with its own variables.' },
    reward: { note: 'Variables unlocked: set, change and read your own named memories in every challenge from now on.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Human counters', 'why does a counter start at zero, and only once?'),
      warmup: {
        title: 'Human counters',
        minutes: 5,
        steps: ['One student is “the variable”: they hold a mini whiteboard labelled deliveries.', 'A second student walks past five chairs; at chairs with a sticky note, the class says “change by 1” and the variable updates the board.', 'Repeat, but this time the class says “set to 0” at every chair. Ask: what went wrong?'],
        materials: ['A mini whiteboard and marker', 'Five chairs, three sticky notes'],
      },
      discussion: ['What else in the station might a rover need to remember? (Battery used, distance driven, samples carried.)', 'Why is a clear variable name kinder to the next programmer — including you, next week?'],
      misconceptions: [
        mc('change-replaces', '“Change by 1” replaces the value with 1.', 'Change ADDS to the current value; set replaces it.', 'On the board write deliveries = 4. Ask pairs: what is it after “change by 1”? After “set to 1”? Act it out with the whiteboard, twice each, then run both in the simulator and watch the variable monitor.'),
        mc('variable-is-a-label', 'A variable is just a name; saying it says the word.', 'A variable is a named place that holds a value; reading it gives the value, not the name.', 'Hold up a labelled box with three counters inside. “What is in deliveries?” Students answer “3”, not “deliveries”. Then show say(“deliveries”) with quotes against say(deliveries) without, and run both.'),
        mc('reset-inside-loop', 'Setting the counter to 0 inside the loop is fine.', 'Anything inside the loop runs every time round: a set inside it wipes the count each lap.', 'Trace on paper with a table (lap, value before, value after) for the version with set inside the loop. Students see the value never passes 1. Move the block and trace again.'),
        mc('variables-start-right', 'A new variable already holds the right number.', 'A variable holds whatever was last put in it; always set a starting value.', 'Run the program twice without the set block (the simulator keeps the old value between runs in the monitor). The second run reports 10, not 5. Ask why, then add the set.'),
        mc('order-does-not-matter', 'a − b is the same as b − a.', 'Subtraction and division depend on order; addition and multiplication do not.', 'Pairs compute 5 − 3 and 3 − 5, then 6 ÷ 2 and 2 ÷ 6. Agree a rule: “the thing you start with goes first”. Fix the expression in the simulator.'),
      ],
      faster: ['Count total distance driven in a second variable (change it by 100 at each hut).', 'Report the percentage of huts that had post (deliveries × 100 ÷ huts).'],
      slower: ['Start with the counting program for three huts only.', 'Use the variable monitor (it shows the box and its value live) and pause after each hut.'],
      notes: ['Variables are new for many 11-year-olds even after Level 2: keep the “named box” picture on the wall for the whole act.', 'Students starting at Level 3 should complete the bridge missions first (about 2 × 30 min).'],
    }),
    parent: {
      today: 'Your child gave their robot a memory: a variable that counts deliveries on a mountain research station.',
      tryAtHome: 'Count something together for one day (cups of water, stairs climbed) on a sticky note: start at 0, add 1 each time. At bedtime ask what the “variable” says.',
      askYourChild: 'Why does a counter have to start at zero — and why only once?',
    },
  }),

  // ── 2 ────────────────────────────────────────────────────────────────────
  makeSession(L, 2, {
    objectives: [
      o('Uses distance = speed × time to predict how far the robot travels, and checks the prediction with a sensor measurement.', 'I can predict how far my robot goes and check it with a measurement.', ['mathematics-measurement', 'programming'], { concepts: ['physics', 'variables'] }),
      o('Records predicted and measured values and explains the difference (slip, start-up time).', 'I can explain why a prediction and a measurement are not exactly the same.', ['data', 'science-forces'], { concepts: ['data', 'physics'] }),
    ],
    episode: episode('How Far Is the Mast?', 'The rover learned to remember: it counted its deliveries with a variable.', [
      scene('The station map room, a big paper map pinned to the wall.', 'Kenji measures the map with a ruler; Spark overlays the rover’s speed.', 65, [
        ['guest', 'The mast is 34 metres out. The rover drives at 20 centimetres a second. How long will it take?', CREW.sato],
        ['myrobot', 'Distance equals speed times time. So time equals distance divided by speed: 3400 ÷ 20 = 170 seconds.'],
        ['spark', 'That’s a prediction. Engineers always check a prediction against a measurement.'],
      ]),
      scene('The measuring hall: a long wooden floor and a wall at the far end.', 'The robot reads the wall distance, drives, reads again. Two numbers glow: before and after.', 70, [
        ['spark', 'Read the wall before, read it after — subtract — and you have measured how far you really went.'],
        ['myrobot', 'I calculated 100. I measured 96.'],
        ['guest', 'Four centimetres missing. Where did they go?', CREW.raman],
        ['spark', 'The motors take a moment to get up to speed, and the wheels slip a little. Real life is never exactly the maths — that’s why we measure.'],
      ]),
      scene('Evening in the hut. Priya pins a results table to the wall.', 'Three rows: predicted, measured, difference.', 40, [
        ['guest', 'Write both numbers down. The difference tells you something about the world.', CREW.raman],
      ]),
    ], 'Outside, the wind picks up. On the snowfield the rover’s straight line starts to bend…'),
    build: {
      part: { slot: 'head', id: 'camera' },
      action: 'inspect',
      narration: 'Your camera eye measures distance to the wall ahead — up to 200 centimetres.',
      why: 'A measurement before and after a move tells you how far you really went, whatever the wheels think.',
      tryWithout: 'Without the measurement you only have the prediction, and you never find out the wheels slipped.',
      physicsEffect: 'The camera’s distance reading is accurate to about a centimetre on a flat wall within range.',
      realWorld: 'Survey robots and self-driving cars check their own wheel-based estimates against laser and camera measurements many times a second.',
    },
    code: challenge({
      title: 'Predict, Then Measure',
      mission: 'Store the wall distance in before, drive at 40 % for 3 s, store it in after, and say how far you went (before − after).',
      arena: MEASURING_HALL,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, SAY],
      example: [
        'variable_set(before, distance_cm)',
        'drive_for(40, 3)',
        'wait(0.5)  ← let the robot settle before measuring',
        'variable_set(after, distance_cm)',
        'say(math(variable_get(before) − variable_get(after)))',
      ],
      success: [crit('uses-blocks', 'Uses distance_cm twice and math to report the distance travelled.'), crit('within-time', 'The reported distance is within 2 cm of the true distance driven.')],
      two: 'You wrote your prediction (speed × time) on the results sheet before pressing Go.',
      three: 'Your program also says the difference between predicted and measured.',
      hints: ['Measure before the move and after it.', 'Store each reading in its own variable, then subtract.', 'before − after is how far you went towards the wall.'],
    }),
    challenge: challenge({
      title: 'Stop at 150',
      mission: 'Kenji needs the rover exactly 150 cm from the wall to load the sled. Calculate how far to drive from your first reading, drive it, and report the final distance.',
      arena: MEASURING_HALL,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, SAY],
      example: [
        'variable_set(start, distance_cm)',
        'variable_set(toGo, math(variable_get(start) − 150))',
        'drive_distance(variable_get(toGo), 40)',
        'wait(0.5)',
        'say(distance_cm)',
      ],
      success: [crit('stop-in-zone', 'Ends stopped with the front 145–155 cm from the wall.'), crit('uses-blocks', 'The drive distance is calculated from a reading, not typed in (checked from two different start rows).')],
      two: 'It works from two different start positions without changing the program.',
      three: 'You recorded predicted and measured distance for three runs and wrote one reason they differ.',
      hints: ['How far is the wall now? How far do you want it to be?', 'toGo = start − 150.', 'Read distance_cm into start, set toGo to start − 150, then drive_distance(toGo, 40).'],
    }),
    quiz: [
      q('The rover drives at 25 cm/s for 4 s. How far should it go?', [
        right('100 cm', '📏'),
        wrong('29 cm (25 + 4)', '➕', 'add-speed-and-time'),
        wrong('6.25 cm (25 ÷ 4)', '➗', 'add-speed-and-time'),
      ], 'Distance = speed × time: 25 cm every second, for 4 seconds, is 100 cm.'),
      q('You predicted 100 cm but measured 96 cm. What is the best conclusion?', [
        right('The world added something the maths left out, like slip or start-up time', '🌨️'),
        wrong('The sensor must be broken', '💥', 'measurement-is-wrong'),
        wrong('I must have made a mistake: a correct prediction always matches', '🙈', 'prediction-must-match'),
      ], 'Small gaps between prediction and measurement are normal. They point to real effects — wheels slip, motors take time to speed up. A broken sensor gives wild or impossible numbers, not a steady 4 cm.'),
      q('before = 180 cm, after = 60 cm. How far did the rover drive towards the wall?', [
        right('120 cm', '✅'),
        wrong('240 cm', '➕', 'add-speed-and-time'),
        wrong('60 cm — the after reading is the distance driven', '📍', 'reading-is-distance-driven'),
      ], 'A distance sensor measures how far away the wall IS, not how far you went. The distance driven is the change: 180 − 60 = 120 cm.'),
    ],
    badge: { id: 'l3-measure-twice', name: 'Measure Twice', icon: '📏', earnedFor: 'You predicted a distance with maths and checked it with a real measurement.' },
    reward: { note: 'Maths blocks unlocked: add, subtract, multiply and divide inside your programs.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Walk the metre', 'what made the measured distance differ from the prediction?'),
      warmup: {
        title: 'Walk the metre',
        minutes: 5,
        steps: ['A volunteer walks heel-to-toe for 10 s while a partner counts steps; measure the distance with a tape.', 'Compute their speed (cm/s). Predict how far they get in 20 s.', 'Test it. Write predicted and measured on the board.'],
        materials: ['A tape measure or metre stick', 'A stopwatch (a phone is fine)'],
      },
      discussion: ['Where do predictions and measurements disagree in real life? (Bus times, cooking times, sports.)', 'Why do engineers write down both numbers rather than only the right one?'],
      misconceptions: [
        mc('add-speed-and-time', 'Distance comes from adding (or dividing) speed and time.', 'Distance = speed × time; check the units: cm/s × s = cm.', 'Draw a number line. Jump 25 cm per second for 4 seconds: four jumps of 25. Write 25 + 25 + 25 + 25 = 4 × 25. Then ask what 25 + 4 would even mean in units.'),
        mc('measurement-is-wrong', 'If a measurement differs from a prediction, the sensor is broken.', 'Small, steady differences usually come from the world (slip, start-up). Broken sensors give impossible or jumpy readings.', 'Show three “measured” columns on the board: 96, 97, 95 (steady) and 96, 12, 200 (jumpy). Which suggests a broken sensor? Which suggests slip? Pairs explain.'),
        mc('prediction-must-match', 'A correct prediction always matches the measurement exactly.', 'A prediction uses a simple model; it is good when it is close and you can explain the gap.', 'Weather forecast: “18 °C” and it was 17 °C. Was the forecast wrong? Agree a tolerance, then apply it to the robot data.'),
        mc('reading-is-distance-driven', 'A distance sensor tells you how far you have driven.', 'It tells you how far away something is now. Distance driven = reading before − reading after.', 'Stand 5 m from a wall, walk 2 m. “How far is the wall now?” (3 m). “How far did I walk?” (5 − 3). Repeat once with different numbers.'),
      ],
      faster: ['Compute the robot’s actual speed from measured distance ÷ time, and use it to improve the prediction.', 'Find the time to reach the mast at the measured speed.'],
      slower: ['Give the prediction table with speed and time already filled in.', 'Use a calculator for the subtraction; focus on why we measure twice.'],
      notes: ['The 0.5 s wait before measuring matters: a moving robot’s reading is taken mid-motion. Ask the class why the example includes it.'],
    }),
    parent: {
      today: 'Your child used distance = speed × time to predict how far their robot would go, then measured it with a sensor and explained the difference.',
      tryAtHome: 'On a walk, time 10 steps and measure them. Predict how long it takes to reach a landmark, then check.',
      askYourChild: 'Why didn’t your robot go exactly as far as the maths said?',
    },
  }),

  // ── 3 ────────────────────────────────────────────────────────────────────
  makeSession(L, 3, {
    objectives: [
      o('Reads the gyro heading and computes an error (heading − target) to correct a drifting robot.', 'I can use the robot’s heading to keep it going straight.', ['programming', 'algorithms']),
      o('Explains why open-loop driving drifts on slippery ground and how feedback fixes it.', 'I can explain why a robot needs feedback on slippery ground.', ['science-forces'], { concepts: ['feedback-control', 'physics'] }),
    ],
    episode: episode('The Bending Line', 'The rover measured distances and learned that real life never quite matches the maths.', [
      scene('The snowfield between the huts and the mast. Wind, a gentle slope.', 'The rover drives “straight” and curves slowly right, ending far from the marker pole.', 65, [
        ['myrobot', 'Both wheels at 50 %. That should be straight!'],
        ['guest', 'On snow? The slope pushes you, the wheels slip. Fifty and fifty only means straight on a perfect floor.', CREW.quispe],
        ['narrator', 'Mateo has guided climbers across this ridge for twenty years. He never walks without checking his compass.'],
      ]),
      scene('Inside the rover, an X-ray view: a tiny chip glows — the gyro.', 'A dial shows heading: 90°… 94°… 99°.', 60, [
        ['spark', 'You have a compass inside: the gyro. It says which way you are facing. Target 90. You’re at 99 — nine degrees too far right.'],
        ['myrobot', 'Then turn back a bit — more if I’m far off, less if I’m nearly right.'],
        ['spark', 'Error equals heading minus target. Correction equals gain times error. That’s feedback: measure, compare, correct, many times a second.'],
      ]),
      scene('Snowfield again. The rover’s path wiggles slightly but stays true.', 'It reaches the marker pole, facing 90°.', 45, [
        ['guest', 'Straight as a rope. Now you walk like a mountaineer.', CREW.quispe],
      ]),
    ], 'Back at the station, the old line sensor reads “dark” everywhere on the faded guide line…'),
    build: {
      part: { slot: 'drive', id: 'wheels4' },
      action: 'choose',
      narration: 'Choose the drive you will take onto the snow — then watch the gyro, whichever you choose.',
      why: 'Every drive slips a little on snow. The gyro inside the robot tells you which way you really face, so you can correct.',
      tryWithout: 'Without heading feedback, the cross-slope bends the path: the robot misses the pole by about a metre on a 4.5 m run.',
      physicsEffect: 'Snow grip 0.35: wheels slip most, tracks and legs less, but every drive drifts on the 3° cross-slope.',
      realWorld: 'Planetary rovers and farm tractors use gyros and compasses to hold a heading over loose ground.',
    },
    code: challenge({
      title: 'Watch the Drift',
      mission: 'Drive at 50 % on both motors for 6 s, then say your heading. Run it three times and record how far off 90° you end up.',
      arena: SNOWFIELD,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, SAY],
      example: ['set_motors(50, 50)', 'wait(6)', 'stop', 'say(heading_deg)  ← more than 90 means you drifted right'],
      success: [crit('uses-blocks', 'Reads heading_deg after an open-loop run and reports it.'), crit('reach-zone', 'The robot ends somewhere on the snowfield (any heading).')],
      two: 'You recorded the heading from three runs.',
      three: 'You worked out the average drift from your three runs.',
      hints: ['The gyro block is called heading.', 'Drive, stop, then say heading_deg.', 'set_motors(50, 50), wait 6, stop, say heading_deg.'],
    }),
    challenge: challenge({
      title: 'Hold 90°',
      mission: 'Cross the snowfield to the marker pole facing 90°. Every loop, compute error = heading − 90 and steer against it.',
      arena: SNOWFIELD,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, ...TALK],
      example: [
        'variable_set(gain, 2)',
        'repeat(60) {',
        '  variable_set(error, math(heading_deg − 90))',
        '  variable_set(steer, math(variable_get(gain) × variable_get(error)))',
        '  set_motors(math(50 − variable_get(steer)), math(50 + variable_get(steer)))  ← drifted right (error > 0): left slower, right faster',
        '  wait(0.1)',
        '}',
        'stop',
      ],
      success: [crit('stop-in-zone', 'Ends in the marker pole zone (col 9, row 2).'), crit('within-time', 'Heading at the end is within 5° of 90.'), crit('no-collision', 'Never touches the snow banks.')],
      two: 'It works with two different drives (fair test: same program).',
      three: 'You tried three gains and wrote which one wiggled and which one drifted.',
      hints: ['How far are you from 90° right now? That is the error.', 'Make the correction bigger when the error is bigger: steer = gain × error.', 'If heading is more than 90 you drifted right: slow the left motor and speed the right one by steer.'],
    }),
    quiz: [
      q('The target is 90° and the gyro reads 97°. What is the error (heading − target)?', [
        right('+7°: the robot has drifted right', '↪️'),
        wrong('−7°: the robot has drifted left', '↩️', 'heading-sign'),
        wrong('97°: the error is the reading', '🧭', 'error-is-reading'),
      ], 'Error = heading − target = 97 − 90 = +7. On a compass, heading grows as you turn right, so a positive error means drifted right.'),
      q('Why did 50 % on both motors not drive straight on snow?', [
        right('Slip and the slope push the robot off course, and nothing measures it', '🌨️'),
        wrong('One motor must be broken', '🔧', 'equal-power-straight'),
        wrong('50 % is too slow to go straight', '🐢', 'equal-power-straight'),
      ], 'Equal power only gives a straight line on a perfect floor. On real ground the world pushes the robot; only feedback from a sensor (the gyro) can notice and correct it.'),
      q('With steer = gain × error, what happens when the robot is already pointing exactly at 90°?', [
        right('Steer is 0: both motors run the same', '⚖️'),
        wrong('It still steers left by the gain amount', '↩️', 'gain-is-a-push'),
        wrong('It stops, because the error is 0', '✋', 'zero-error-stops'),
      ], 'Gain × 0 = 0, so no correction: the robot keeps driving straight. The correction shrinks as the error shrinks — that is what makes it smooth.'),
    ],
    badge: { id: 'l3-true-heading', name: 'True Heading', icon: '🧭', earnedFor: 'You used the gyro and feedback to hold a straight course on slippery snow.' },
    reward: { note: 'The heading block is yours: the gyro works in every challenge from now on.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Blindfold straight line', 'why can’t the robot just “try harder” to go straight?'),
      warmup: {
        title: 'Blindfold straight line',
        minutes: 6,
        steps: ['A volunteer closes their eyes and walks “straight” to a chair 5 m away. Most curve.', 'Repeat with a partner saying “left a bit / right a bit” — more when far off, less when close.', 'Name it: the partner is the gyro; “how far off” is the error.'],
        materials: ['A chair as a target', 'Clear floor space (5 m)'],
      },
      discussion: ['Where do people use feedback to stay on course? (Cycling, steering a boat, carrying a full cup.)', 'What would a very big gain feel like on the blindfold walk?'],
      misconceptions: [
        mc('heading-sign', 'A heading above the target means the robot turned left.', 'Compass headings grow clockwise: more than the target means it turned right.', 'Students stand facing the board (= 0°) and turn to 90° (right wall). Call out 100°: which way did they go past it? Write “bigger = further right” beside a compass drawing.'),
        mc('error-is-reading', 'The error is the sensor reading.', 'The error is how far the reading is from what you want: reading − target.', 'Thermostat: the room is 22 °C, you want 20 °C. Is the error 22? Students compute 2, then repeat with headings 97/90 and 84/90.'),
        mc('equal-power-straight', 'Equal motor power always gives a straight path.', 'The ground, slope and wheel slip all push the robot; only measured feedback keeps it straight.', 'Roll a toy car (or a ball) across a slightly tilted book: it curves. Ask what would have to happen for it to go straight — someone has to see it and correct.'),
        mc('gain-is-a-push', 'The gain is a fixed push that is always applied.', 'The gain multiplies the error; with zero error there is zero correction.', 'Table on the board: error −10, −5, 0, 5, 10 with gain 2. Students fill in steer. Circle the 0 row.'),
        mc('zero-error-stops', 'When the error is 0 the robot stops.', 'Zero error means no steering correction; the base speed keeps the robot moving.', 'Write set_motors(50 − steer, 50 + steer) with steer = 0. What are the motor powers? Both 50: it drives on.'),
      ],
      faster: ['Add a second target: drive to the pole at 90°, then turn and hold 180° back towards the huts.', 'Log the largest error in a variable and report it.'],
      slower: ['Give the error line ready-made; students choose only the gain.', 'Use gain 1, then 2, and describe the difference.'],
      notes: ['Targets of 90° or 180° avoid the 0/360 wrap. If a student targets 0°, point out that 359° is only 1° away — a good extension question.'],
    }),
    parent: {
      today: 'Your child used the robot’s gyro (its inner compass) and a feedback rule to drive straight across slippery snow.',
      tryAtHome: 'Try walking a straight line with eyes closed, then with someone saying “a bit left / a bit right”. Which works better, and why?',
      askYourChild: 'What is an “error” to a robot — and why does a bigger error get a bigger correction?',
    },
  }),

  // ── 4 ────────────────────────────────────────────────────────────────────
  makeSession(L, 4, {
    objectives: [
      o('Measures a sensor’s light and dark readings, stores them in variables and computes a threshold halfway between.', 'I can calibrate my sensor using my own measurements.', ['data', 'programming']),
      o('Explains why a fixed threshold fails when lighting or surfaces change.', 'I can explain why sensors need calibrating.', ['computing-systems'], { concepts: ['sensors', 'data'] }),
    ],
    episode: episode('The Faded Line', 'The rover learned to hold its heading with the gyro and feedback.', [
      scene('The old guide line from the huts: sun and snow have faded it from black to pale grey.', 'The rover drives over it without stopping. Its line sensor reads 41.', 60, [
        ['myrobot', 'My program says “dark” means below 30. This line is 41. To me it isn’t there.'],
        ['guest', 'The old rover was set up in a lab with a fresh black line. Out here, everything changes.', CREW.sato],
      ]),
      scene('The calibration strip: a white pad and a black pad side by side.', 'The rover rolls over white (reads 85), then black (reads 12). The numbers are stored in two glowing boxes.', 70, [
        ['spark', 'Calibrate: measure the lightest and the darkest here, today. Then put the threshold halfway between.'],
        ['myrobot', '85 plus 12 is 97. Halved: 48.5. Anything below 48.5 is the line.'],
        ['guest', 'And tomorrow, when the light changes, it measures again. That’s why we store the readings, not just the answer.', CREW.raman],
      ]),
      scene('Back at the faded line. The rover stops right on it.', 'Kenji gives a thumbs-up.', 35, [
        ['guest', 'Same robot. Same sensor. It just learned what “dark” means here.', CREW.sato],
      ]),
    ], 'Next: following the line all the way to the mast — and smoothly, not zig-zagging.'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'inspect',
      narration: 'Look at the line sensor: it shines light down and measures how much bounces back.',
      why: 'White bounces a lot of light back (a big number); black bounces little (a small number). Faded grey is in between.',
      tryWithout: 'With a fixed threshold from another place, the faded line reads as “not dark enough” and the robot drives straight over it.',
      physicsEffect: 'Readings run 0–100. Bright station lights and dirty snow both shift every reading.',
      realWorld: 'Factory robots recalibrate their colour and light sensors at the start of every shift, because lighting changes.',
    },
    code: challenge({
      title: 'Measure Light and Dark',
      mission: 'Drive onto the white pad and store the reading in light, then onto the black pad and store it in dark. Say both.',
      arena: CALIBRATION_STRIP,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, SAY],
      example: [
        'drive_distance(50, 30)  ← onto the white pad',
        'variable_set(light, reflectance)  ← the line sensor’s raw brightness, 0–100 (see the teacher note)',
        'drive_distance(50, 30)  ← onto the black pad',
        'variable_set(dark, reflectance)',
        'say(variable_get(light)); say(variable_get(dark))',
      ],
      success: [crit('uses-blocks', 'Stores two readings in two variables.'), crit('stop-in-zone', 'Ends on the black pad.')],
      two: 'Your variables are named for what they hold (light, dark).',
      three: 'You predicted which number would be bigger before running.',
      hints: ['Stop on each pad before you read it.', 'One variable per reading.', 'Drive 50, store light; drive 50, store dark.'],
    }),
    challenge: challenge({
      title: 'Find the Faded Line',
      mission: 'Calibrate on the pads, compute threshold = (light + dark) ÷ 2, then creep forward until the reading drops below the threshold and stop on the faded line.',
      arena: CALIBRATION_STRIP,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, SAY],
      example: [
        'drive_distance(50, 30); variable_set(light, reflectance)',
        'drive_distance(50, 30); variable_set(dark, reflectance)',
        'variable_set(threshold, math(math(variable_get(light) + variable_get(dark)) ÷ 2))',
        'repeat_until(compare(reflectance < variable_get(threshold))) { drive_distance(2, 20) }',
        'stop',
        'say(variable_get(threshold))',
      ],
      success: [crit('stop-in-zone', 'Stops with the sensor over the faded line (row 2).'), crit('uses-blocks', 'The threshold is calculated from the two stored readings; works for three different line shades.')],
      two: 'Works on three different shades of faded line without changing the program.',
      three: 'You explained why halfway is a good place for the threshold.',
      hints: ['First calibrate, then search.', 'The threshold is the average of light and dark.', 'Creep 2 cm at a time until the reading is below the threshold.'],
    }),
    quiz: [
      q('White reads 80 and black reads 20. Where should the threshold go?', [
        right('50, halfway between', '🎯'),
        wrong('20, the black reading', '⬛', 'threshold-equals-dark'),
        wrong('100, the biggest possible reading', '💯', 'threshold-fixed-number'),
      ], 'Halfway (80 + 20) ÷ 2 = 50 leaves the most room on both sides, so small changes in light do not confuse the robot. At exactly 20, a line reading 21 would be missed.'),
      q('Why does the rover recalibrate every morning?', [
        right('Light and surfaces change, so yesterday’s numbers may be wrong today', '🌅'),
        wrong('Sensors wear out every night', '🔋', 'sensor-is-perfect'),
        wrong('It doesn’t need to: a good sensor always reads the same', '🔬', 'sensor-is-perfect'),
      ], 'The sensor is fine; the world changes. Brighter light, dirtier snow or a faded line all shift the readings. Calibration measures what light and dark mean here, now.'),
      q('Kenji’s program uses threshold = 30, copied from the lab. The faded line reads 41. What happens?', [
        right('The rover drives over the line without noticing', '😶'),
        wrong('It stops, because 41 is still quite dark', '🛑', 'threshold-fixed-number'),
        wrong('It stops, because sensors round to the nearest line', '🧮', 'sensor-is-perfect'),
      ], 'The program only stops when the reading is below 30. 41 is not below 30, so to this program the faded line is invisible. Calibrated, the threshold might be 48 — and 41 is below it.'),
    ],
    badge: { id: 'l3-calibrator', name: 'Calibrator', icon: '🎚️', earnedFor: 'You calibrated a sensor from your own measurements and set its threshold.' },
    reward: { note: 'Calibration routine saved: every line challenge in Level 3 can start with your own light and dark readings.' },
    teacher: teacher({
      timing: lessonPlan(5, 'How bright is bright?', 'why store the readings, not just the threshold?'),
      warmup: {
        title: 'How bright is bright?',
        minutes: 5,
        steps: ['Show three paper strips: white, mid-grey, black. Students rate each 0–100 for brightness.', 'Close the blinds (or switch off half the lights) and rate again.', 'Ask: did the paper change, or did the light? What should a robot do about it?'],
        materials: ['White, grey and black paper strips'],
      },
      discussion: ['Name other devices that calibrate. (Kitchen scales “tare”, phone screens adjusting brightness, a tuner for a guitar.)', 'Why is halfway safer than just above dark?'],
      misconceptions: [
        mc('threshold-equals-dark', 'The threshold should be the dark reading itself.', 'At exactly the dark value, anything slightly lighter (a faded line, a shadow) is missed; halfway leaves a margin both ways.', 'Draw a number line 0–100 with light at 80 and dark at 20. Mark readings 22, 35, 60 from a faded line. Where would 20 or 50 put each? Discuss which threshold copes.'),
        mc('threshold-fixed-number', 'A threshold is a fixed number that works everywhere.', 'A threshold only makes sense relative to the light and dark measured in that place.', 'Give two sets of calibration data (lab: 90/10, snow at noon: 95/45). Pairs compute both thresholds and check whether the lab threshold would ever detect the noon line.'),
        mc('sensor-is-perfect', 'A good sensor always gives the same reading for the same colour.', 'Readings depend on lighting, distance to the surface and dirt; calibration accounts for that.', 'Shine a phone torch at the grey strip while one student reads a light-meter app (or simply judges); move it closer and farther. The colour did not change — the reading did.'),
      ],
      faster: ['Calibrate on three pads (white, grey, black) and choose two thresholds for three zones.', 'Re-calibrate automatically whenever the robot crosses the white pad again.'],
      slower: ['Supply light and dark values; students only compute the halfway point.', 'Use a calculator and the variable monitor.'],
      notes: [
        'Honest limit: the course simulator’s line sensor reports “line seen” and “line offset”, not raw brightness, so the worked program’s “reflectance” reading is shown as a worked example only. The playable challenge is the Skill Galaxy threshold tuner “A worn-out line”, which uses real reflectance traces; the classroom idea (store light and dark, threshold halfway) is the same on any real robot.',
        'Real line sensors (an IR LED and a phototransistor) work exactly as the episode says: more reflected light, bigger reading.',
      ],
    }),
    parent: {
      today: 'Your child calibrated a robot sensor: measuring light and dark, then setting a threshold halfway between them.',
      tryAtHome: 'Look at how your phone adjusts its screen brightness in a dark room and outside. Talk about why it needs to measure the light first.',
      askYourChild: 'Why can’t a robot use the same “dark” number everywhere?',
    },
  }),

  // ── 5 ────────────────────────────────────────────────────────────────────
  makeSession(L, 5, {
    objectives: [
      o('Implements proportional line following: steer = gain × line_offset, applied to the two motors.', 'I can make my robot follow a line smoothly by steering in proportion to how far off it is.', ['programming', 'algorithms']),
      o('Compares bang-bang (if / else) steering with proportional steering using time and smoothness.', 'I can compare two ways of following a line and say which is better and why.', ['data', 'engineering-design'], { concepts: ['feedback-control', 'data'] }),
    ],
    episode: episode('Zig-Zag to the Mast', 'The rover calibrated its line sensor and found the faded guide line.', [
      scene('The guide line to the weather mast: three S-bends round snow drifts.', 'The rover follows with if / else: hard left, hard right, hard left. It wobbles and nearly loses the line on a bend.', 65, [
        ['guest', 'It gets there — like a nervous penguin. And it wastes battery on every wobble.', CREW.sato],
        ['myrobot', 'If line is left, turn left. If line is right, turn right. It’s always all or nothing.'],
      ]),
      scene('Spark draws the line sensor as five little eyes in a row; a needle shows −1 … 0 … +1.', 'The needle moves smoothly as the line drifts under the sensor.', 65, [
        ['spark', 'Your sensor can say HOW FAR off you are: line offset, from minus one to plus one. Plus means the line is to your right.'],
        ['myrobot', 'So a little off means steer a little. A lot off means steer a lot.'],
        ['spark', 'Steer equals gain times offset. Same idea as the gyro yesterday — this time the error comes from the line.'],
      ]),
      scene('The guide line again. The rover flows round the S-bends.', 'A stopwatch shows 31 s against the old 44 s.', 35, [
        ['guest', 'Smooth, faster, and kinder to the motors. That’s engineering.', CREW.sato],
      ]),
    ], 'The post is piling up again — and now the rover knows enough to design its own mail round.'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'inspect',
      narration: 'Look closely: the line sensor has a row of little eyes, so it can tell how far the line is from the middle.',
      why: 'An offset from −1 to +1 says not just “left or right” but “how far”, which is what smooth steering needs.',
      tryWithout: 'With only “line seen: yes or no”, the robot can only swing hard one way or the other.',
      physicsEffect: 'Offset 0 = centred; +1 = the line under the right-most eye; it keeps the last side when the line is lost.',
      realWorld: 'Warehouse robots that follow floor tape and car lane-keeping systems both steer in proportion to how far off-centre they are.',
    },
    code: challenge({
      title: 'Steer by the Offset',
      mission: 'Follow the guide line with proportional steering: base speed 40 %, gain 35, until the floor turns green.',
      arena: arena(GUIDE_LINE, { requires: ['move', 'follow-line', 'see-color'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_OFFSET, LINE_SEEN, FLOOR_COLOR],
      example: [
        'variable_set(gain, 35)',
        'repeat_until(compare(floor_color = green)) {',
        '  variable_set(steer, math(variable_get(gain) × line_offset))',
        '  set_motors(math(40 + variable_get(steer)), math(40 − variable_get(steer)))  ← line to the right (+): speed up the left wheel',
        '}',
        'drive_distance(20, 40)',
        'stop',
      ],
      success: [crit('reach-zone', 'Reaches the green mast zone.'), crit('no-collision', 'Stays on the line at least 85 % of the way.')],
      two: 'Faster than your if / else version on the same line.',
      three: 'You can explain why + offset speeds up the LEFT wheel.',
      hints: ['How far off the line are you? That number is the offset.', 'Multiply the offset by a gain, add it to one motor and take it from the other.', 'left = 40 + 35 × offset, right = 40 − 35 × offset, until the floor is green.'],
    }),
    challenge: challenge({
      title: 'Race the Old Rover',
      mission: 'Run the guide line twice: once with your if / else follower, once with proportional steering. Record both times and how often each lost the line, and say the faster time.',
      arena: arena(GUIDE_LINE, { requires: ['move', 'follow-line', 'see-color'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_OFFSET, LINE_SEEN, FLOOR_COLOR, TIMER, SAY],
      starter: ['repeat_until(compare(floor_color = green)) {', '  if_else(compare(line_offset > 0)) { set_motors(60, 10) } else { set_motors(10, 60) }', '}'],
      example: [
        'variable_set(gain, 35)',
        'repeat_until(compare(floor_color = green)) {',
        '  variable_set(steer, math(variable_get(gain) × line_offset))',
        '  set_motors(math(45 + variable_get(steer)), math(45 − variable_get(steer)))',
        '}',
        'drive_distance(20, 40); stop',
        'say(timer_s)',
      ],
      success: [crit('reach-zone', 'Reaches the mast with the proportional follower.'), crit('within-time', 'The proportional run is faster than the if / else run (both recorded).')],
      two: 'Your results table has times for both followers.',
      three: 'You found a base speed and gain that finish under 30 s without losing the line.',
      hints: ['Run the starter first and write down its time.', 'Then swap the if / else for steer = gain × offset.', 'Keep gain 35 and try base speeds 40, 45, 50.'],
    }),
    quiz: [
      q('The line offset is +0.5 and the gain is 30. What is steer?', [
        right('15', '🧮'),
        wrong('30.5', '➕', 'add-gain'),
        wrong('60', '✖️', 'add-gain'),
      ], 'steer = gain × offset = 30 × 0.5 = 15. Adding the gain to the offset (30.5) or dividing (60) gives a number with no meaning for the motors.'),
      q('Why is proportional steering smoother than if / else?', [
        right('It steers a little when slightly off and a lot when far off', '〰️'),
        wrong('It turns harder every time, so it corrects faster', '💪', 'harder-is-better'),
        wrong('It ignores the sensor until the line is lost', '🙈', 'harder-is-better'),
      ], 'If / else only has two answers — hard left or hard right — so it overshoots back and forth. Proportional steering makes the correction match the error, so near the line it barely steers at all.'),
      q('The line is to the robot’s RIGHT (offset +0.6). Which motor should speed up?', [
        right('The left motor, so the robot turns right', '⬅️'),
        wrong('The right motor, so the robot turns right', '➡️', 'motor-side-confusion'),
        wrong('Both equally — the offset only matters on bends', '⚖️', 'motor-side-confusion'),
      ], 'A robot turns towards the side of its slower wheel. To turn right, the left wheel must go faster than the right one — which is why left = base + steer.'),
    ],
    badge: { id: 'l3-smooth-operator', name: 'Smooth Operator', icon: '〰️', earnedFor: 'You made your robot follow a line smoothly with proportional steering.' },
    reward: { note: 'Line offset unlocked: smooth steering in every line challenge.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Bang-bang vs smooth', 'when is if / else good enough, and when do we need proportional control?'),
      warmup: {
        title: 'Bang-bang vs smooth',
        minutes: 5,
        steps: ['Tape a wavy line on the floor. A “robot” student walks it while a “sensor” student can only shout LEFT or RIGHT.', 'Repeat: now the sensor says “tiny bit left”, “a lot right”.', 'Compare the two walks: wobble, speed, effort.'],
        materials: ['Masking tape for a wavy floor line'],
      },
      discussion: ['Where do you see bang-bang control in real life? (A thermostat clicking on and off.) And proportional? (A dimmer switch, steering a bike.)', 'What might go wrong with a very large gain?'],
      misconceptions: [
        mc('add-gain', 'The gain is added to (or divides) the offset.', 'The gain multiplies: it scales the error into a motor correction.', 'Table: offsets −1, −0.5, 0, 0.5, 1 with gain 30. Students compute gain × offset and gain + offset side by side; which column gives 0 when the robot is centred?'),
        mc('harder-is-better', 'Turning harder always corrects faster and better.', 'Over-correcting overshoots and wobbles; a correction that matches the error settles smoothly.', 'Replay the warm-up: “sensor” must say LEFT/RIGHT loudly vs quietly-to-loudly. Time both walks on the tape line. Then run the simulator with gain 35 and 120.'),
        mc('motor-side-confusion', 'To turn right, speed up the right wheel.', 'A differential-drive robot turns towards its slower wheel: to turn right, the left wheel goes faster.', 'Two students link arms and walk in a circle; the outer one must walk faster. Ask which side is the outside when turning right.'),
      ],
      faster: ['Lower the gain as speed rises (gain = 50 − base speed ÷ 2) and test whether it still holds the line.', 'Log how many loops the offset was beyond ±0.8 (a “wobble count”).'],
      slower: ['Give the set_motors line complete; students change only the gain.', 'Use the Physics Lab “Follow the line” arena first: its reference uses the same rule.'],
      notes: ['The Physics Lab (/kids/lab/sim) “Follow the line” arena runs this exact rule today and is the session’s playable challenge.'],
    }),
    parent: {
      today: 'Your child replaced “hard left / hard right” steering with proportional control: steering more the further the robot is from the line.',
      tryAtHome: 'When riding a bike or pushing a trolley, notice how small corrections keep you straight, and big ones make you wobble.',
      askYourChild: 'Why did the robot wobble less when it steered “in proportion”?',
    },
  }),

  // ── 6 ────────────────────────────────────────────────────────────────────
  makeSession(L, 6, {
    objectives: [
      o('Designs and programs a mail round that works for any combination of huts, using at least two named variables.', 'I can design a program that works for any set of huts and reports a correct count.', ['engineering-design', 'programming']),
      o('Tests a design on several cases and explains one change made after testing.', 'I can test my design in different cases and improve it.', ['engineering-design', 'collaboration'], { concepts: ['design-process'] }),
    ],
    episode: episode('The Station Mail Rover', 'The rover learned variables, maths, the gyro, calibration and smooth line following.', [
      scene('The post room, piled with parcels and letters. Huts call on the radio.', 'Dr Owusu pins a hut list to the wall: which huts have post changes every day.', 60, [
        ['guest', 'From today, you run the post. Every day a different set of huts. And at the end, tell me exactly how many stops you made.', CREW.owusu],
        ['spark', 'Your design, your variables, your program. It has to work for ANY set of huts — not just today’s.'],
      ]),
      scene('A planning table. The robot’s holo-sketches: two ideas side by side.', 'Idea one: a fixed list of moves. Idea two: drive every hut, decide at each one.', 50, [
        ['myrobot', 'A fixed list breaks tomorrow. Deciding at each hut works every day.'],
      ]),
    ], 'As the rover finishes its round, the weather mast’s light blinks — then goes dark.'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Choose the tool for your mail rover: gripper for letters, scoop for parcels — your call.',
      why: 'Engineers pick the tool that fits the job; your choice changes how you deliver at each hut.',
      tryWithout: 'With no tool at all, the rover can visit the huts but cannot hand anything over.',
      physicsEffect: 'Gripper 0.12 kg, scoop 0.10 kg: the difference is small, but you will see it in Session 11’s energy budget.',
      realWorld: 'Delivery robots on university campuses carry parcels in a locked box that opens only for the right person.',
    },
    code: challenge({
      title: 'Plan the Round',
      mission: 'Write down which huts have post, as variables: post1 … post5 (1 = yes, 0 = no). Then drive the row and deliver where postN is 1.',
      arena: HUT_ROW,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, GRIP_OPEN, GRIP_CLOSE, SAY],
      example: [
        'variable_set(post1, 1); variable_set(post2, 0); variable_set(post3, 1); variable_set(post4, 0); variable_set(post5, 1)',
        'variable_set(stops, 0)',
        'drive_distance(100, 40)',
        'if (compare(variable_get(post1) = 1)) { grip_open; wait(0.5); grip_close; variable_change(stops, 1) }',
        '… the same for huts 2–5 …',
        'say(variable_get(stops))',
      ],
      success: [crit('action-at-zone', 'Delivers at exactly the huts whose variable is 1.'), crit('uses-blocks', 'Uses at least two named variables.')],
      two: 'Changing only the five post variables changes the round.',
      three: 'You noticed the repeated part of the program and wondered how to shorten it.',
      hints: ['Five variables describe today’s post.', 'Before each hut, check that hut’s variable.', 'Set post1…post5 at the top, then drive 100 and check each in turn.'],
    }),
    challenge: challenge({
      title: 'The Station Mail Rover',
      mission: 'Your design: deliver to whichever huts have post (set by variables at the start, or by the red mats if you use your camera), and report how many stops you made. It must work for any combination.',
      arena: arena(HUT_ROW, { requires: ['move'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, GRIP_OPEN, GRIP_CLOSE, FLOOR_COLOR, DIST, SAY, BEEP],
      example: [
        'variable_set(stops, 0); variable_set(hut, 0)',
        'repeat(5) {',
        '  drive_distance(100, 40); variable_change(hut, 1)',
        '  if (compare(floor_color = red)) { grip_open; wait(0.5); grip_close; variable_change(stops, 1); beep }',
        '}',
        'drive_distance(50, 40)',
        'say(variable_get(stops))',
      ],
      success: [crit('action-at-zone', 'Delivers at every hut with post and at no other, on three different combinations.'), crit('stop-in-zone', 'Ends in the post room.'), crit('uses-blocks', 'Uses at least two named variables; says the correct count.')],
      two: 'It worked for three different hut combinations without editing the program logic.',
      three: 'You can explain what each of your variables remembers, and one bug you fixed.',
      hints: ['What changes from day to day? Make that a variable (or read it from the mats).', 'Loop over the huts; decide at each one.', 'Count stops only inside the “deliver” branch.'],
    }),
    quiz: [
      q('Why is a program that drives every hut and decides at each one better than a fixed list of moves for today?', [
        right('It works for any combination of huts, not just today’s', '🔁'),
        wrong('It is always shorter', '✂️', 'shorter-is-better-design'),
        wrong('A fixed list is better: it never makes mistakes', '📜', 'fixed-plan-is-safe'),
      ], 'A general design handles tomorrow too. Shorter is nice but not the point, and a fixed list “never makes mistakes” only until the post changes.'),
      q('Your rover reports 4 stops but only 3 huts had post. Where is the bug most likely?', [
        right('The count changes outside the “deliver” branch, on a hut without post', '🐞'),
        wrong('The gripper is broken', '🦾', 'blame-the-hardware'),
        wrong('Variables sometimes add 1 by themselves', '👻', 'blame-the-hardware'),
      ], 'Variables only change when a block changes them. An extra count means a change block ran when it should not have — most often placed outside the if.'),
      q('Which test plan gives you the most confidence in your mail rover?', [
        right('Run it on three different hut combinations, including none and all five', '🧪'),
        wrong('Run today’s combination three times', '🔂', 'one-case-is-enough'),
        wrong('Run it once: if it works, it works', '1️⃣', 'one-case-is-enough'),
      ], 'Repeating the same case only shows it works for that case. Different cases — especially the extremes, no post and all post — find the bugs.'),
    ],
    badge: { id: 'l3-postmaster', name: 'Postmaster', icon: '📮', earnedFor: 'You designed a mail rover that works for any day’s post and reports its stops.' },
    reward: { note: 'Project saved to your gallery: The Station Mail Rover.' },
    teacher: teacher({
      timing: projectPlan(3, 'Yesterday’s post, today’s post (two hut lists: will one fixed program work for both?)'),
      warmup: {
        title: 'Yesterday’s post, today’s post',
        minutes: 3,
        steps: ['Show two hut lists on the board. Ask: could one fixed list of moves deliver both days?', 'Collect ideas for what should change and what should stay the same.'],
        materials: ['Board or projector'],
      },
      discussion: ['What makes a design general rather than a one-off?', 'Which test case found your best bug?'],
      misconceptions: [
        mc('shorter-is-better-design', 'The best program is always the shortest one.', 'The best design meets the need (works every day, is clear, can be checked); shortness is a bonus.', 'Show two programs: a short one that only works today, and a longer one that works for any day. Vote, then test both on a new hut list.'),
        mc('fixed-plan-is-safe', 'A fixed plan is safest because it never changes.', 'A fixed plan fails as soon as the situation changes; sensing or variables make it adapt.', 'Give pairs a fixed route card and change one hut. Ask them to “run” the card by hand. What happens at the changed hut?'),
        mc('blame-the-hardware', 'Wrong numbers mean the hardware is faulty.', 'Most wrong results come from the program; check where each variable changes first.', 'Trace the buggy program with a table (hut, post?, stops). Students find the row where stops changes without a delivery.'),
        mc('one-case-is-enough', 'One successful run proves the program works.', 'You need several different cases, especially extremes, to trust a design.', 'Pairs list every combination of 3 huts (8 cases). Which 3 would they test if they could test only 3? Discuss why “none” and “all” are good choices.'),
      ],
      faster: ['Use a single variable as a 5-bit code (e.g. 10101) and decode it with maths.', 'Report the hut numbers delivered to, not just the count.'],
      slower: ['Start from the Session 1 counting program and add the if.', 'Test on two combinations instead of three.'],
      notes: ['Self-checks are reflection only; they never gate the badge.', 'Share in the class gallery only; never public.'],
    }),
    parent: {
      today: 'Your child designed their own station mail rover: a program that works for any set of huts and counts its stops.',
      tryAtHome: 'Plan a family errand route that must work for any day’s list (which shops are needed changes). What stays the same? What changes?',
      askYourChild: 'How did you make sure your mail rover worked on every day, not just today?',
    },
  }),
]
