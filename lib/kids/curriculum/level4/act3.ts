// lib/kids/curriculum/level4/act3.ts
// Level 4, Act 3 (sessions 13–18): "Sample Science".
// Camera-guided reach and grasp, test plans with normal, edge and failure
// cases, detecting faults by comparing commands with measurements, a mass and
// energy design review, making robot intent readable to people, and the third
// project: a sample fetch that survives an injected fault.

import type { Session } from '../types'
import { CREW, HABITAT, SAMPLE_SITE, TEST_TRACK, VALLEY_FLOOR } from './shared'
import { DIST, FLOOR_COLOR, GRIP_CLOSE, GRIP_OPEN, HEADING, LIGHT_OFF, LIGHT_ON, LOGIC, MOVE, TALK, TIMER, VARS_MATH } from '../level3/shared'
import { arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong } from '../level3/kit'

const L = 4 as const

export const ACT3: Session[] = [
  // ── 13 ───────────────────────────────────────────────────────────────────
  makeSession(L, 13, {
    objectives: [
      o('Aligns with a target using camera colour and distance, approaches with proportional control and grasps it reliably.', 'I can make my rover find a target by colour, line up with it and pick it up.', ['programming', 'algorithms']),
      o('Measures grasp reliability over repeated trials and identifies the main cause of failures.', 'I can measure how reliable my grasp is and find what makes it fail.', ['data', 'debugging'], { concepts: ['sensors', 'feedback-control'] }),
    ],
    episode: episode('Reach and Grasp', 'The autonomous survey revealed a sample site the scientists must have.', [
      scene('The sample site. A red canister half-buried among grey rocks of the same size.', 'Dr Petrova kneels beside it with a hand lens.', 60, [
        ['guest', 'Grey rocks are decoys — they look the same to a distance sensor. Only colour tells them apart.', CREW.petrova],
        ['myrobot', 'Then I need eyes that see colour and distance at once.'],
        ['guest', 'And a grasp that works every time, not one time in three. Samples don’t grow back.', CREW.petrova],
      ]),
      scene('The rover’s camera view: a red pad under the canister turns the image warm as it lines up.', 'SEARCH (turn until red ahead) → ALIGN (centre it) → APPROACH (slow down) → GRASP.', 70, [
        ['spark', 'Colour finds WHICH object. Distance says HOW FAR. Proportional speed brings you in gently. Close the gripper only when stopped.'],
        ['myrobot', 'Ten tries: eight grasps. The two misses were both when I came in at an angle.'],
        ['spark', 'That’s a finding. Align better before the final approach.'],
      ]),
      scene('The sample site. The rover lines up, rolls in and closes its gripper round the red canister.', 'Dr Petrova lifts the canister out of the jaws and checks the seal.', 30, [
        ['guest', 'Intact. Now do that every time, and I’ll stop holding my breath.', CREW.petrova],
      ]),
    ], 'Hana: “Eight in ten. Before Mars, I want a test plan. What about the edge cases?”'),
    build: {
      part: { slot: 'head', id: 'camera' },
      action: 'swap',
      narration: 'Swap Distance Eyes for the Camera Eye: distance AND colour in one head.',
      why: 'Telling the sample from look-alike rocks needs colour; reaching it needs distance — the camera gives both.',
      tryWithout: 'With Distance Eyes only, the rover grasps the nearest rock — usually a decoy.',
      physicsEffect: 'Camera distance is a little noisier than Distance Eyes; colour is read from the pad under the target, within about 1 m.',
      realWorld: 'Mars rovers and fruit-picking robots use cameras to choose targets and measure range before every grasp.',
    },
    code: challenge({
      title: 'Find the Red One',
      mission: 'Turn in 10° steps until the camera reports red ahead, then approach with speed = 0.5 × (distance − 8), minimum 13 %, and stop at 8 cm.',
      arena: SAMPLE_SITE,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, TIMER, ...TALK],
      example: [
        'repeat_until(compare(floor_color = red)) { turn_degrees(−10, 30); wait(0.2) }',
        'grip_open',
        'repeat_until(compare(distance_cm < 9)) {',
        '  variable_set(v, math(0.5 × math(distance_cm − 8))); if (compare(variable_get(v) < 13)) { variable_set(v, 13) }',
        '  set_motors(variable_get(v), variable_get(v))',
        '}',
        'stop',
      ],
      success: [crit('stop-in-zone', 'Stops 6–10 cm from the red canister.'), crit('no-collision', 'Never touches a grey rock.')],
      two: 'Works with the canister in three different places.',
      three: 'You explained why colour must come before distance here.',
      hints: ['Search first: turn until you see red.', 'Then approach slowly in proportion to the distance left.', 'Stop before you touch it; grasp is next.'],
    }),
    challenge: challenge({
      title: 'Ten Grasps',
      mission: 'Add align (small turns until the red reading is steady), approach, grip and a 20 cm retreat. Run ten trials from random starts, log success and failure causes, and improve the weakest step once.',
      arena: SAMPLE_SITE,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, HEADING, TIMER, ...TALK],
      example: [
        '… search until red, as before …',
        'variable_set(steady, 0)',
        'repeat_until(compare(variable_get(steady) = 3)) { if_else(compare(floor_color = red)) { variable_change(steady, 1) } else { variable_set(steady, 0); turn_degrees(5, 25) }; wait(0.1) }',
        '… approach, stop, grip_close, wait(0.5), drive_distance(−20, 25) …',
        'if_else(compare(distance_cm < 12)) { say("Grasped") } else { say("Missed") }  ← held canister reads close',
      ],
      success: [crit('deliver-object', 'At least eight of ten trials end with the canister held 20 cm back.'), crit('uses-blocks', 'A ten-trial log with a failure cause for each miss.')],
      two: 'Your log names a cause for every miss.',
      three: 'You changed one step, re-ran ten trials and showed the success rate rose.',
      hints: ['Align until red is seen three readings in a row.', 'Check the grasp: a held canister stays close to the camera.', 'Fix the most common failure first.'],
    }),
    quiz: [
      q('Why does the rover use colour before distance to choose the target?', [
        right('The decoy rocks are the same size and distance, so only colour tells them apart', '🔴'),
        wrong('Colour sensors are more accurate than distance sensors', '🎯', 'one-sensor-does-everything'),
        wrong('Distance alone would work if the rover went slower', '🐢', 'one-sensor-does-everything'),
      ], 'Different sensors answer different questions. Distance says how far; colour says which. Speed doesn’t help a sensor tell look-alikes apart.'),
      q('Eight of ten grasps worked. Both misses came from angled approaches. What should you change?', [
        right('The align step, then rerun all ten trials', '📐'),
        wrong('Nothing: 80 % is good enough for Mars', '✅', 'average-hides-failures'),
        wrong('The gripper — it must be weak', '🦾', 'blame-the-hardware'),
      ], 'The failures point to a cause (alignment). Fix it and rerun the full set; a fix can change other trials too.'),
      q('How can the rover check that the grasp worked without a camera on the gripper?', [
        right('After retreating, a held canister still reads very close to the camera', '📏'),
        wrong('It can’t; only a human can check', '🙅', 'one-sensor-does-everything'),
        wrong('If the gripper closed, the grasp must have worked', '✊', 'command-equals-result'),
      ], 'A closed gripper is a command, not a result. Measuring afterwards (the object still in front, moving with the rover) is evidence.'),
    ],
    badge: { id: 'l4-reach-grasp', name: 'Reach and Grasp', icon: '🦾', earnedFor: 'You aligned, approached and grasped a target by colour and distance, and measured how reliable it was.' },
    reward: { note: 'Camera Eye fitted: colour and distance for target selection.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Pick the red one', 'why does each sensor answer a different question?'),
      warmup: {
        title: 'Pick the red one',
        minutes: 5,
        steps: ['Place five same-size objects on a desk, one red. A blindfolded student may ask a partner only “how far?” or only “what colour?”.', 'Which question finds the red one? Which question lets them reach it?', 'Discuss using both.'],
        materials: ['Five same-size objects, one red', 'A blindfold'],
      },
      discussion: ['Why do fruit-picking robots check both colour and size?', 'How many successful grasps out of ten would you want before sending a rover to Mars?'],
      misconceptions: [
        mc('one-sensor-does-everything', 'One good sensor can answer every question.', 'Different sensors measure different things; tasks often need several (which object, how far, did it work).', 'Card sort: tasks (find the red one, judge distance, confirm a grasp) against sensors (colour, distance, bumper). Some tasks need two.'),
        mc('average-hides-failures', 'A good average means the design works.', 'An average can hide a pattern of failures; look at the failing cases and their causes.', 'Show a log where the average error looks fine but three runs failed from the same start. Ask what a Mars team would do.'),
        mc('blame-the-hardware', 'Wrong numbers mean the hardware is faulty.', 'Most wrong results come from the program; check where each variable changes first.', 'Trace the buggy program with a table (hut, post?, stops). Students find the row where stops changes without a delivery.'),
        mc('command-equals-result', 'If the robot was told to do something, it did it.', 'A command is not a result; robots must check with sensors that the action actually happened.', 'Ask a student to “close the door” while another quietly holds it open. Did the command succeed? How would you check?'),
      ],
      faster: ['Grasp two canisters and return both.', 'Report the success rate with its uncertainty (e.g. “8/10”, not “80 %”).'],
      slower: ['Search and approach only; add the grasp as a second step.', 'Run five trials instead of ten.'],
      notes: ['Arm Factory (Legend tier) is the playable challenge: reach, grasp and place under time pressure with inverse kinematics.'],
    }),
    parent: {
      today: 'Your teen made the rover find a sample by colour, line up, approach gently and grasp it — and measured how reliable that was over ten tries.',
      tryAtHome: 'With eyes closed, try to pick one specific item from a few similar ones using only touch. Then with eyes open. What extra “sensor” helped?',
      askYourChild: 'How did you find out what made your grasp fail?',
    },
  }),

  // ── 14 ───────────────────────────────────────────────────────────────────
  makeSession(L, 14, {
    objectives: [
      o('Writes a test plan with normal, edge and failure cases (input, expected result, actual result) and runs it.', 'I can write and run a test plan with normal, edge and failure cases.', ['debugging', 'data']),
      o('Uses test results to find and fix a defect, then re-runs the plan (regression).', 'I can use my test results to fix a bug and check nothing else broke.', ['debugging'], { concepts: ['debugging'] }),
    ],
    episode: episode('Break It on Purpose', 'The rover could find and grasp a sample eight times in ten.', [
      scene('The garage. Hana writes three column headings: NORMAL · EDGE · FAILURE.', 'Under NORMAL: canister straight ahead. Under EDGE: at the very edge of the camera view; 1 cm from a rock. Under FAILURE: no canister at all.', 70, [
        ['guest', 'Normal cases show it works. Edge cases show where it stops working. Failure cases show what it does when it can’t work. You need all three.', CREW.kim],
        ['myrobot', 'No canister at all… my search loop would turn forever.'],
        ['guest', 'And now you know — on Earth, not on Mars.', CREW.kim],
      ]),
      scene('A test log fills in: input, expected, actual, pass/fail.', 'Two reds: “no canister” spins forever; “canister touching a rock” grabs the rock.', 55, [
        ['spark', 'Fix one defect, then run the WHOLE plan again. Fixes have a habit of breaking something else.'],
      ]),
      scene('The garage. The fixed program runs the whole plan again: all green.', 'Hana signs the bottom of the test log.', 30, [
        ['guest', 'Green after a fix and a full re-run. That signature means something now.', CREW.kim],
      ]),
    ], 'Diego reads the log over Hana’s shoulder: “What about when the rover itself is broken?”'),
    build: {
      part: { slot: 'tool', id: 'gripper' },
      action: 'inspect',
      narration: 'Inspect the gripper: what should happen if it closes on nothing? That is a test case.',
      why: 'Every part has normal, edge and failure behaviour — the test plan has to cover each one.',
      tryWithout: 'Without a test plan, the first time you meet an edge case is during the mission.',
      physicsEffect: 'Gripper jaws close round objects 4–9 cm wide; on nothing, they close fully.',
      realWorld: 'Spacecraft, medical devices and car software go through test plans with thousands of cases, and every fix is followed by re-running the plan.',
    },
    code: challenge({
      title: 'The Missing Canister',
      mission: 'Run your Session 13 program on a site with NO canister. Then add a timeout to the search: after 36 turns (a full circle) with no red, stop and say “No target found”.',
      arena: arena(SAMPLE_SITE, { features: ['No canister (failure case).', 'Grey rocks only.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, TIMER, ...TALK],
      example: [
        'variable_set(turns, 0)',
        'repeat_until(or(compare(floor_color = red), compare(variable_get(turns) > 35))) { turn_degrees(−10, 30); variable_change(turns, 1); wait(0.2) }',
        'if (compare(variable_get(turns) > 35)) { stop; say("No target found") }',
      ],
      success: [crit('uses-blocks', 'With no canister, stops after a full circle and says why.'), crit('no-collision', 'Never grasps a grey rock.')],
      two: 'You predicted the old program’s behaviour before running it.',
      three: 'You ran the normal case again afterwards to check the fix broke nothing.',
      hints: ['Count the search turns.', 'A full circle is 36 turns of 10°.', 'Stop and report instead of searching forever.'],
    }),
    challenge: challenge({
      title: 'Test Plan',
      mission: 'Write a test plan with at least two normal, two edge and two failure cases for your reach-and-grasp program. Run every case, record expected and actual, fix one defect, and re-run the whole plan.',
      arena: arena(SAMPLE_SITE, { features: ['Teacher-set layouts: canister ahead; at the view edge; touching a rock; behind the rover; absent; two red canisters.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, HEADING, TIMER, ...TALK],
      example: [
        '(test plan) N1 canister ahead → grasp · N2 canister at 45° → grasp · E1 view edge → grasp · E2 touching a rock → grasp the canister, not the rock · F1 absent → “No target found” · F2 gripper fault → “Grasp failed”',
        '… the Session 13 program with the search timeout and a grasp check …',
        'if_else(compare(distance_cm < 12)) { say("Grasped") } else { say("Grasp failed") }',
      ],
      success: [crit('uses-blocks', 'Six cases run and logged (expected, actual, pass/fail) by the simulator.'), crit('uses-blocks', 'One defect fixed and the whole plan re-run.')],
      two: 'Every case has an expected result written BEFORE it was run.',
      three: 'Your regression run shows the fix did not break another case.',
      hints: ['Expected first, then run, then actual.', 'Edge cases sit at the limits: the edge of view, the edge of reach.', 'Failure cases ask: what if it can’t succeed?'],
    }),
    quiz: [
      q('Which of these is an edge case for the grasp program?', [
        right('The canister at the very edge of the camera’s view', '📐'),
        wrong('The canister straight ahead at 50 cm', '🎯', 'tests-show-it-works'),
        wrong('Running the same normal case five times', '🔁', 'tests-show-it-works'),
      ], 'Edge cases sit at the limits of what the design should handle. The straight-ahead case is normal; repeats of it test reliability, not edges.'),
      q('After fixing the “no canister” bug, why re-run every test?', [
        right('A fix can break something that used to work (a regression)', '🔄'),
        wrong('To make the log longer', '📜', 'fix-only-the-failing-test'),
        wrong('There is no need: only the failing test changed', '✔️', 'fix-only-the-failing-test'),
      ], 'Changing code can affect other cases in ways you did not expect. Re-running the plan catches regressions before the mission does.'),
      q('What is the main purpose of failure cases in a test plan?', [
        right('To check the robot behaves safely and says why when it cannot succeed', '🛟'),
        wrong('To prove the robot never fails', '💯', 'tests-show-it-works'),
        wrong('There is no point testing cases you expect to fail', '🙅', 'tests-show-it-works'),
      ], 'You expect it to fail — the test checks HOW it fails. A safe, explained failure is a pass; spinning forever is not.'),
    ],
    badge: { id: 'l4-test-engineer', name: 'Test Engineer', icon: '🧪', earnedFor: 'You wrote and ran a test plan with normal, edge and failure cases, and used it to fix a defect.' },
    reward: { note: 'Test-plan sheet: a printable plan template is added to your portfolio tools.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Test a calculator', 'why test edges and failures, not just normal use?'),
      warmup: {
        title: 'Test a calculator',
        minutes: 6,
        steps: ['Pairs write test cases for a phone calculator’s “÷”: normal (6 ÷ 3), edge (1 ÷ 3, huge numbers), failure (÷ 0).', 'Write the expected result first, then try them.', 'Share the most surprising result.'],
        materials: ['A calculator or phone'],
      },
      discussion: ['What edge cases would you test for a lift, a door lock or a game?', 'Who should write the tests — the person who built the code, or someone else? Why?'],
      misconceptions: [
        mc('tests-show-it-works', 'The purpose of testing is to show the program works.', 'Testing tries to find where and how it fails — edges and failure cases matter most.', 'Pairs swap programs and try to break each other’s with one edge case each. Count how many bugs were found that the author’s own tests missed.'),
        mc('fix-only-the-failing-test', 'After a fix, only re-run the test that failed.', 'Fixes can break other behaviour; re-run the whole plan (regression testing).', 'Show a fix (a longer timeout) that solves “no canister” but slows every normal case past the time limit. Only a full re-run reveals it.'),
      ],
      faster: ['Automate part of the plan: one program that runs three cases in sequence (using extra starts).', 'Add a “gripper closes on nothing” case and design the check.'],
      slower: ['Four cases (two normal, one edge, one failure).', 'Provide the test-plan table with columns drawn.'],
      notes: ['The test plan is reused in the Session 18 project and the capstone write-up.'],
    }),
    parent: {
      today: 'Your teen wrote a proper test plan — normal, edge and failure cases — ran it on their rover and used it to fix a bug.',
      tryAtHome: 'Test a household gadget together like an engineer: a normal use, an edge use (the very top of the range) and a “what if it can’t” case.',
      askYourChild: 'What is an edge case, and which one found a bug in your rover?',
    },
  }),

  // ── 15 ───────────────────────────────────────────────────────────────────
  makeSession(L, 15, {
    objectives: [
      o('Detects a stalled or slipping wheel by comparing what was commanded with what the sensors measure (distance shrinking, heading holding), and recovers or stops.', 'I can make my rover notice when its wheels aren’t doing what it told them.', ['debugging', 'programming']),
      o('Chooses a safe recovery for each detected fault: retry once, then stop and report.', 'I can choose what my rover should do when it detects a fault.', ['impacts-of-computing'], { concepts: ['safety-ethics', 'conditions'] }),
    ],
    episode: episode('Commanded vs Measured', 'The engineer’s test plan caught two defects before Mars could.', [
      scene('The valley floor. The rover is told to drive forward; one wheel sinks in soft sand and spins.', 'The motors are at 40 %. The rover isn’t moving. Its program doesn’t notice.', 60, [
        ['guest', 'The code said “drive”. The motors drove. The rover didn’t. The code never checked.', CREW.ramirez],
        ['myrobot', 'I command, but I never compare.'],
      ]),
      scene('Diego draws two lines on a graph: COMMANDED (a steady slope) and MEASURED (flat).', 'A gap opens between them — and a red flag appears where it passes a limit.', 70, [
        ['guest', 'If you drive at a wall at 40 %, the distance should shrink by roughly 15 centimetres every second. If it doesn’t, something’s wrong. If you drive straight and the heading swings, a wheel is slipping.', CREW.ramirez],
        ['spark', 'Fault detection is a comparison: expected against measured, with a threshold so noise doesn’t trigger it.'],
        ['myrobot', 'Then: back off and retry once. If it happens again — stop, report, wait for a human.'],
      ]),
      scene('The valley floor. The rover hits the soft sand, notices it isn’t moving, backs out and tries a second line.', 'The second try gets through.', 30, [
        ['guest', 'It noticed, it recovered, and it would have told us if it couldn’t. That’s fault tolerance.', CREW.ramirez],
      ]),
    ], 'Hana, holding a datasheet: “Before we add more checks — let’s talk about what every gram costs.”'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'swap',
      narration: 'Swap the bumper back for the line sensor. Fault detection today uses the camera’s distance and the gyro.',
      why: 'The best fault detectors use sensors you already have, in a new way: as a check on your own commands.',
      tryWithout: 'Without a comparison, a stuck rover spins its wheels until the battery is flat.',
      physicsEffect: 'Soft-sand patches make one wheel slip; a stall shows as “motors on, distance unchanged”.',
      realWorld: 'Mars rovers compare commanded wheel turns with visual odometry and stop when slip is too high — Spirit got stuck in soft sand in 2009.',
    },
    code: challenge({
      title: 'Is the Wall Getting Closer?',
      mission: 'Drive at the wall at 40 %. Every second, compare the distance with a second ago; if it shrank by less than 5 cm, stop and say “Stalled”.',
      arena: arena(TEST_TRACK, { features: ['End wall 450 cm away.', 'A soft-sand patch at 200 cm that stalls the wheels.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(last, distance_cm); variable_set(t, timer_s); variable_set(stalled, 0)',
        'set_motors(40, 40)',
        'repeat_until(or(compare(distance_cm < 30), compare(variable_get(stalled) = 1))) {',
        '  if (compare(math(timer_s − variable_get(t)) > 1)) {',
        '    if (compare(math(variable_get(last) − distance_cm) < 5)) { variable_set(stalled, 1) }',
        '    variable_set(last, distance_cm); variable_set(t, timer_s)',
        '  }',
        '}',
        'stop',
        'if (compare(variable_get(stalled) = 1)) { say("Stalled") }',
      ],
      success: [crit('uses-blocks', 'Detects the stall within 2 s of it starting and stops.'), crit('no-collision', 'Never hits the wall.')],
      two: 'You explained the 5 cm threshold using your Session 2 motor curve.',
      three: 'You showed the detector does NOT trigger on a normal run.',
      hints: ['Remember the distance and the time; check once a second.', 'Expected progress at 40 % is about 15 cm per second.', 'If progress < 5 cm, call it a stall.'],
    }),
    challenge: challenge({
      title: 'Detect, Recover, Report',
      mission: 'Drive to the beacon. Detect two fault types — a stall (no progress) and a slip (heading swings more than 10° in 1 s while driving straight). For each: back off 20 cm and retry once; if it happens again, stop and say which fault and where.',
      arena: arena(VALLEY_FLOOR, { requires: ['move', 'see-wall'], features: ['Soft-sand patch (stall) and a loose-gravel patch (one-wheel slip).', 'Beacon wall at the far end.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(retries, 0); variable_set(lastD, distance_cm); variable_set(lastH, heading_deg); variable_set(t, timer_s); variable_set(fault, 0)',
        'repeat_until(or(compare(distance_cm < 30), compare(variable_get(retries) > 1))) {',
        '  set_motors(40, 40)',
        '  if (compare(math(timer_s − variable_get(t)) > 1)) {',
        '    if (compare(math(variable_get(lastD) − distance_cm) < 5)) { variable_set(fault, 1) }',
        '    variable_set(dh, math(heading_deg − variable_get(lastH))); if (or(compare(variable_get(dh) > 10), compare(variable_get(dh) < −10))) { variable_set(fault, 2) }',
        '    if (compare(variable_get(fault) > 0)) { drive_distance(−20, 25); variable_change(retries, 1); variable_set(fault, 0) }',
        '    variable_set(lastD, distance_cm); variable_set(lastH, heading_deg); variable_set(t, timer_s)',
        '  }',
        '}',
        'stop',
        'if (compare(variable_get(retries) > 1)) { say("Fault repeated: stopping for help") } else { say("Arrived") }',
      ],
      success: [crit('uses-blocks', 'Both fault types detected when injected, each with one retry.'), crit('uses-blocks', 'A repeated fault ends in a safe stop with a spoken reason.'), crit('no-collision', 'No false alarms on a fault-free run.')],
      two: 'Your report names the fault type, not just “error”.',
      three: 'You measured your detector’s false-alarm rate over five fault-free runs.',
      hints: ['Compare every second: did distance shrink? Did heading hold?', 'Retry once; count retries.', 'Name the fault in the report.'],
    }),
    quiz: [
      q('The motors are at 40 % but the distance to the wall hasn’t changed for 2 s. What has most likely happened?', [
        right('The wheels are stalled or spinning: the command is not producing motion', '🛞'),
        wrong('Nothing — the motors are on, so the rover is moving', '✅', 'command-equals-result'),
        wrong('The distance sensor is broken', '📏', 'blame-the-hardware'),
      ], 'Commanded and measured disagree. With a working sensor (it still reads sensibly), the likeliest cause is that the wheels aren’t moving the rover.'),
      q('Why does the stall check use a threshold (less than 5 cm in 1 s), not “any change”?', [
        right('Sensor noise means the reading always wobbles a little; the threshold avoids false alarms', '〰️'),
        wrong('To make detection slower on purpose', '🐢', 'any-glitch-means-stop'),
        wrong('Thresholds are not needed: any difference means a fault', '🚨', 'any-glitch-means-stop'),
      ], 'Readings vary even when all is well. A threshold set from known behaviour (your motor curve) separates a real stall from noise.'),
      q('A fault is detected twice in a row. What is the safest response?', [
        right('Stop, report the fault type and position, and wait for a human', '🛑'),
        wrong('Keep retrying until it works', '🔁', 'keep-going-default'),
        wrong('Ignore it and continue the mission', '➡️', 'keep-going-default'),
      ], 'One retry handles a passing problem. A repeated fault suggests something real; retrying forever can make it worse (digging in deeper).'),
    ],
    badge: { id: 'l4-fault-detective', name: 'Fault Detective', icon: '🔎', earnedFor: 'You made your rover compare what it commanded with what it measured, and recover safely from faults.' },
    reward: { note: 'Fault injector: slip and stall faults can now be switched on in any of your runs.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Wheels on ice', 'how can a robot tell that its own command did not work?'),
      warmup: {
        title: 'Wheels on ice',
        minutes: 5,
        steps: ['Story: a car on ice, wheels spinning, driver pressing the accelerator. What does the driver feel and see?', 'List what tells the driver it is stuck (no movement past the window, engine revs high).', 'Map each to a robot sensor.'],
        materials: ['None'],
      },
      discussion: ['Spirit, a Mars rover, got stuck in soft sand in 2009 and never drove again. What might earlier detection have changed?', 'Where else do machines compare commanded and measured? (Anti-lock brakes, a printer jam sensor.)'],
      misconceptions: [
        mc('command-equals-result', 'If the robot was told to do something, it did it.', 'A command is not a result; robots must check with sensors that the action actually happened.', 'Ask a student to “close the door” while another quietly holds it open. Did the command succeed? How would you check?'),
        mc('blame-the-hardware', 'Wrong numbers mean the hardware is faulty.', 'Most wrong results come from the program; check where each variable changes first.', 'Trace the buggy program with a table (hut, post?, stops). Students find the row where stops changes without a delivery.'),
        mc('any-glitch-means-stop', 'A robot should stop on every unexpected reading.', 'Single glitches are common; filtering over a short time window catches real faults without constant false alarms.', 'Show a reading list with one odd value in a normal run, and one with a long run of odd values. Which should stop the robot? Why?'),
        mc('keep-going-default', 'When unsure, a robot should keep doing what it was doing.', 'When a robot cannot trust its information, the safe default is to stop (or move to a known safe state) and report.', 'Act it: a student walks forward; at a signal they lose their “sight” (close eyes). Do they keep walking? Discuss the safe choice.'),
      ],
      faster: ['Estimate slip as a percentage: 1 − (measured progress ÷ expected progress).', 'Detect a third fault: the dead zone grown (motors need 25 % to move) from a slow start.'],
      slower: ['Detect the stall only.', 'Provide the timing variables; students write the comparison.'],
      notes: ['levels.ts records the contract request for a wheel-distance reporter; until then, distance-to-wall and heading are the comparisons, as here.'],
    }),
    parent: {
      today: 'Your teen made the rover notice when its wheels weren’t doing what they were told — by comparing commands with sensor measurements — and recover safely.',
      tryAtHome: 'Talk about how you know a car is skidding or a bike chain has slipped. What “sensors” do you use?',
      askYourChild: 'How does your rover know it’s stuck?',
    },
  }),

  // ── 16 ───────────────────────────────────────────────────────────────────
  makeSession(L, 16, {
    objectives: [
      o('Computes a rover configuration’s mass and energy per metre from a part table, compares options and justifies one in a design review.', 'I can calculate what each part costs in mass and energy and justify my choice.', ['science-energy', 'engineering-design']),
      o('Responds to review questions with evidence (numbers, test results) rather than preference.', 'I can answer design-review questions with evidence.', ['communication'], { concepts: ['design-process'] }),
    ],
    episode: episode('Every Gram, Every Watt', 'The rover learned to detect its own faults.', [
      scene('The design-review room: a long table, a projector, Hana and Commander Adeyemi with red pens.', 'A slide: the rover’s part list with masses and power draws.', 65, [
        ['guest', 'On Mars, every gram had to be launched on a rocket. Every watt has to come from a battery the sun charges. So: why is each part on your rover?', CREW.adeyemi],
        ['myrobot', 'The camera’s there because… I like it.'],
        ['guest', 'Not an answer. What does it let you do, and what does it cost?', CREW.kim],
      ]),
      scene('The engineer redoes the slide: three configurations side by side with mass, energy per metre and capability.', 'A light rover (wheels, distance eyes), a heavy rover (tracks, camera, gripper), and a middle one.', 60, [
        ['spark', 'Capability against cost. A design review asks you to show your working.'],
        ['myrobot', 'Tracks cost 30 % more energy per metre — but my Session 15 log shows wheels stall in soft sand. That’s worth paying for.'],
        ['guest', 'That’s an answer.', CREW.adeyemi],
      ]),
      scene('After the review. The engineer updates the slide: every part now has a number beside it.', 'Commander Adeyemi initials the corner.', 30, [
        ['guest', 'Approved — with your energy prediction to be checked on the next drive.', CREW.adeyemi],
      ]),
    ], 'Diego: “One more review question. What happens when the rover meets a person?”'),
    build: {
      part: { slot: 'drive', id: 'tracks' },
      action: 'choose',
      narration: 'Choose your drive for the rest of the season — and be ready to defend it with numbers.',
      why: 'Every part must earn its place: you choose by comparing what it lets you do with what it costs.',
      tryWithout: 'Choosing by preference leaves you with no answer when the review asks “why?”.',
      physicsEffect: 'Drive masses and energy per metre come from the part table on the review slide.',
      realWorld: 'Every spacecraft and product goes through design reviews where engineers justify mass, power and cost line by line.',
    },
    code: challenge({
      title: 'Price Three Rovers',
      mission: 'Using the part table, compute total mass and energy per 10 m for three configurations in variables, and say which meets the job (soft sand) for the least energy.',
      arena: TEST_TRACK,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, ...TALK],
      example: [
        'variable_set(lightE, math(10 × 2.0))  ← wheels: 2.0 %/m, but stalls in soft sand',
        'variable_set(midE, math(10 × 2.4))  ← four wheels: 2.4 %/m, crosses soft sand slowly',
        'variable_set(heavyE, math(10 × 2.6))  ← tracks: 2.6 %/m, crosses soft sand',
        'say(variable_get(lightE)); say(variable_get(midE)); say(variable_get(heavyE))',
        'say("Mid: the cheapest that meets the soft-sand need")',
      ],
      success: [crit('uses-blocks', 'Three configurations priced in variables.'), crit('uses-blocks', 'The choice names the requirement it meets.')],
      two: 'Your numbers come from the table, with units.',
      three: 'You stated which requirement rules out the cheapest option.',
      hints: ['Energy = metres × % per metre.', 'First remove options that fail a requirement.', 'Of those left, pick the cheapest — and say why.'],
    }),
    challenge: challenge({
      title: 'Design Review',
      mission: 'Present your rover configuration to a review panel (classmates with question cards). Back each part with a number or a test result. Then prove one claim live: drive 3 m on the valley floor and compare the energy used with your prediction.',
      arena: arena(VALLEY_FLOOR, { features: ['Soft-sand patch mid-course.', 'Battery model on: energy used is shown at the end.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(pred, math(3 × 2.6))  ← tracks, from the table',
        'say(variable_get(pred))',
        '… heading hold for 300 cm, from Session 4 …',
        'stop',
      ],
      success: [crit('reach-zone', 'Crosses 3 m including the soft-sand patch.'), crit('within-time', 'Energy used within 15 % of the prediction (battery model).'), crit('uses-blocks', 'Every part on the slide is justified with a number or a test result (teacher checks).')],
      two: 'You answered every review question with evidence.',
      three: 'You changed one part after the review and said why.',
      hints: ['Prepare the numbers before the review.', 'Quote your own logs (Sessions 2, 4, 15).', 'If a claim fails live, say so and explain.'],
    }),
    quiz: [
      q('A review asks why your rover has tracks. Which answer is strongest?', [
        right('“Wheels stalled in soft sand in 3 of 5 runs (Session 15 log); tracks crossed every time, for 30 % more energy per metre.”', '📊'),
        wrong('“Tracks look tougher.”', '💪', 'preference-is-justification'),
        wrong('“Real Mars rovers have tracks.”', '🚀', 'preference-is-justification'),
      ], 'A justification names the need, the evidence and the cost. (And real Mars rovers have used six wheels, not tracks — check claims too.)'),
      q('Option A meets every requirement and uses 24 % per 10 m. Option B uses 20 % but stalls in soft sand. Which is the better design?', [
        right('A: the cheapest option that meets the requirements', '✅'),
        wrong('B: it uses the least energy', '🔋', 'cheapest-is-best'),
        wrong('Neither can be chosen without trying both on Mars', '🙅', 'cheapest-is-best'),
      ], 'First rule out options that fail a requirement; then choose the cheapest of the rest. Saving energy is worthless if the rover gets stuck.'),
      q('Your live test used 9.1 % against a prediction of 7.8 %. What should you say?', [
        right('It used 17 % more than predicted; here is a likely reason, and how I will update the model', '📝'),
        wrong('The test went wrong, so it doesn’t count', '🙈', 'hide-bad-data'),
        wrong('Round both to 8 % — close enough', '🔢', 'hide-bad-data'),
      ], 'Reviews reward honesty: state the gap, explain it, and improve the prediction. Hiding or rounding away the gap loses the reviewers’ trust.'),
    ],
    badge: { id: 'l4-design-review', name: 'Design Reviewer', icon: '📐', earnedFor: 'You justified every part of your rover with numbers and evidence in a design review.' },
    reward: { note: 'Spec sheet: your rover’s mass and energy per metre are shown in the Garage.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Pack for a hike', 'what makes an answer to “why this part?” convincing?'),
      warmup: {
        title: 'Pack for a hike',
        minutes: 6,
        steps: ['Show ten items with weights (water 1 kg, tent 2 kg, a book 0.5 kg…). The bag can carry 6 kg.', 'Pairs choose and justify each item in one line.', 'Swap lists; challenge one item each.'],
        materials: ['An item list with weights (printed or on the board)'],
      },
      discussion: ['What questions would you ask in a design review of a phone?', 'Why should reviewers be kind but tough?'],
      misconceptions: [
        mc('preference-is-justification', '“I like it” or “others use it” justifies a design choice.', 'A justification links a requirement to evidence and cost.', 'Pairs rewrite three weak justifications (“it looks cool”, “everyone uses it”, “it’s the best”) into need + evidence + cost.'),
        mc('cheapest-is-best', 'The cheapest (lightest, lowest-energy) option is always best.', 'Rule out options that fail requirements first; then compare cost.', 'Give three umbrellas: cheap but breaks in wind, mid, expensive. Requirement: a windy city. Which is “best”?'),
        mc('hide-bad-data', 'It is fine to drop bad data without saying so.', 'Honest reports state what was excluded and why, so others can judge how reliable the result is.', 'Give two reports of the same experiment, one transparent and one silent. Pairs act as reviewers: which would they sign off, and what would they ask?'),
      ],
      faster: ['Add cost in money (from the part table) as a third column and discuss three-way trade-offs.', 'Write the review minutes: questions asked, answers, actions.'],
      slower: ['Price two configurations instead of three.', 'Use question cards with sentence starters.'],
      notes: ['Run the review with structured roles: presenter, two questioners, a note-taker. No scores — feedback is two stars and a wish.', 'Honest limit: the battery model is roadmap #39; until it ships, the live energy check uses the part table and the run’s distance.'],
    }),
    parent: {
      today: 'Your teen ran a design review: justifying every part of their rover with mass, energy and test results, and answering questions with evidence.',
      tryAtHome: 'Plan a day-bag or school-bag together like a design review: every item must justify its weight.',
      askYourChild: 'Which part of your rover was hardest to justify, and how did you do it?',
    },
  }),

  // ── 17 ───────────────────────────────────────────────────────────────────
  makeSession(L, 17, {
    objectives: [
      o('Makes robot intent readable to people with light, speech and motion (announce before moving, slow near people, stop at a safe distance).', 'I can make my robot show people what it is about to do.', ['impacts-of-computing', 'programming']),
      o('Designs a safe handover of an object between robot and person.', 'I can design a safe handover between a robot and a person.', ['engineering-design', 'impacts-of-computing'], { concepts: ['safety-ethics', 'design-process'] }),
    ],
    episode: episode('Working with People', 'The engineer defended every gram of the rover in a design review.', [
      scene('The habitat yard. Crew in suits walk between the airlock and the greenhouse.', 'The rover glides silently round a corner; a crew member jumps back.', 55, [
        ['guest', 'It didn’t hit me. But I didn’t know it was coming, or where it was going. That’s not safe — that’s lucky.', CREW.ramirez],
        ['myrobot', 'I knew where I was going. I just didn’t tell anyone.'],
      ]),
      scene('Diego chalks rules on the yard wall: SAY BEFORE YOU MOVE · LIGHT ON WHEN MOVING · SLOW NEAR PEOPLE · STOP AT ARM’S LENGTH · HAND OVER, DON’T DROP.', 'The rover tries again: a chime, a light, “Going to the greenhouse”, slowing as a person approaches.', 75, [
        ['guest', 'People can’t read your code. They read your light, your voice and how you move. Make your intent obvious.', CREW.ramirez],
        ['spark', 'Slow near people: speed in proportion to distance, with a stop zone. You’ve built that controller before.'],
        ['guest', 'And for handing things over: stop, offer, wait until I’ve taken it, then let go. Never the other way round.', CREW.ramirez],
      ]),
      scene('The habitat yard. A crew member takes the sample case; only then does the rover let go and back away, light still on.', 'She gives it a thumbs-up.', 30, [
        ['guest', 'I knew what it was going to do before it did it. That’s the whole point.', CREW.ramirez],
      ]),
    ], 'Sol 18. The sample site again — and Hana has a fault injector in her hand.'),
    build: {
      part: { slot: 'tool', id: 'light' },
      action: 'swap',
      narration: 'Fit the headlight: on whenever the rover moves, so people can see it coming.',
      why: 'Lights and sounds turn hidden intent into something people can see and hear.',
      tryWithout: 'A silent, dark rover can be perfectly safe and still frighten people — and frightened people make unsafe moves.',
      physicsEffect: 'Headlight 0.08 kg; a small extra battery draw while on.',
      realWorld: 'Warehouse robots project light paths on the floor, delivery robots chime, and cobots slow down when people come close (speed and separation monitoring).',
    },
    code: challenge({
      title: 'Announce and Slow',
      mission: 'Before moving, light on and say where you are going. Drive to the greenhouse; if anyone is closer than 80 cm, slow to 20 %; closer than 40 cm, stop and wait. Light off when you arrive.',
      arena: arena(HABITAT, { requires: ['move', 'see-wall', 'light'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, LIGHT_ON, LIGHT_OFF, ...TALK],
      example: [
        'light_on; say("Going to the greenhouse")',
        'repeat_until(compare(timer_s > 20)) {',
        '  if_else(compare(distance_cm < 40)) { stop } else {',
        '    if_else(compare(distance_cm < 80)) { set_motors(20, 20) } else { set_motors(45, 45) }',
        '  }',
        '}',
        'stop; light_off; say("Arrived")',
      ],
      success: [crit('no-collision', 'Never comes within 40 cm of a crew member.'), crit('uses-blocks', 'Announces before the first move; light on while moving.')],
      two: 'The rover says why it has stopped when it waits.',
      three: 'You used a proportional slow-down instead of two fixed speeds.',
      hints: ['Speak and light up BEFORE the first motor block.', 'Two zones: slow, then stop.', 'Say “Waiting for you to pass” when stopped.'],
    }),
    challenge: challenge({
      title: 'Hand It Over',
      mission: 'Deliver a sample case to a crew member at the greenhouse: announce, travel with the people rules, stop at arm’s length (50–60 cm), say “Ready to hand over”, wait until the case is taken (the teacher presses the bumper, as the crew member), then say “Thank you” and leave slowly.',
      arena: arena(HABITAT, { requires: ['move', 'see-wall', 'light'], features: ['Two crew members cross the path at random times.', 'A crew member waits at the greenhouse door to take the case.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, LIGHT_ON, LIGHT_OFF, ...TALK],
      example: [
        'light_on; say("Delivery to the greenhouse")',
        '… travel with the slow and stop zones …',
        'repeat_until(compare(distance_cm < 60)) { set_motors(20, 20) }',
        'stop; say("Ready to hand over")',
        'wait(5)  ← the crew member takes the case (the teacher confirms)',
        'say("Thank you"); drive_distance(−30, 20); light_off',
      ],
      success: [crit('stop-in-zone', 'Stops 50–60 cm from the crew member at the door.'), crit('no-collision', 'Never within 40 cm of anyone while moving.'), crit('uses-blocks', 'Announces, waits for the handover, then leaves slowly.')],
      two: 'Your rover never moves while someone is within 40 cm.',
      three: 'You tested the handover from three approach angles.',
      hints: ['Make every step visible: light, words, slow movement.', 'Let go only after the person has it.', 'Back away slowly after the handover.'],
    }),
    quiz: [
      q('A rover avoids a person perfectly but startles them. Is it safe?', [
        right('Not fully: people who can’t predict a robot may move suddenly into its path', '😨'),
        wrong('Yes: it didn’t touch anyone', '✅', 'safe-means-no-contact'),
        wrong('Yes: being startled is the person’s problem', '🤷', 'safe-means-no-contact'),
      ], 'Safety around people includes being predictable. A startled person may step the wrong way; announcing intent prevents that.'),
      q('What is the safest handover order?', [
        right('Stop, offer, wait until the person has it, then release', '🤝'),
        wrong('Release as soon as the person reaches out', '✋', 'robot-knows-best'),
        wrong('Drive past slowly and drop it in their hands', '📦', 'robot-knows-best'),
      ], 'The robot should let go only once the person has a firm hold, and never move while handing over. Otherwise objects get dropped or people get bumped.'),
      q('Why does the rover slow down near people instead of only stopping when very close?', [
        right('Lower speed means shorter stopping distance and less harm if something goes wrong', '🐢'),
        wrong('To save battery', '🔋', 'safe-means-no-contact'),
        wrong('It doesn’t matter how fast it goes if it stops in time', '⚡', 'safe-means-no-contact'),
      ], 'Speed near people changes both the stopping distance and how much harm a mistake causes. Slowing first gives margin; that is the idea behind speed-and-separation monitoring.'),
    ],
    badge: { id: 'l4-people-safe', name: 'People-Safe', icon: '🙋', earnedFor: 'You made your rover’s intent clear to people and designed a safe handover.' },
    reward: { note: 'Headlight fitted: your rover now signals when it moves.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Silent robot, chatty robot', 'what makes a robot predictable to people?'),
      warmup: {
        title: 'Silent robot, chatty robot',
        minutes: 5,
        steps: ['A student “robot” walks across the room silently towards someone; then again saying “Coming through on your left” and slowing down near them.', 'Ask the person approached how each felt.', 'List the signals that helped.'],
        materials: ['A cleared space'],
      },
      discussion: ['How do cars, bikes and delivery robots tell people what they are about to do?', 'Who should design robot behaviour around people — engineers alone, or with the people who will meet it?'],
      misconceptions: [
        mc('safe-means-no-contact', 'A robot is safe as long as it never touches anyone.', 'Safety also means being predictable, slow near people, and limiting harm if something goes wrong.', 'Pairs list three ways a no-contact robot could still cause harm (startling, blocking an exit, frightening a child). Discuss design fixes.'),
        mc('robot-knows-best', 'The robot should decide when a handover happens.', 'In a handover the person must be in control: the robot offers, waits and releases only when the person has the object.', 'Pairs act a handover with a book: release before vs after the receiver grips. Which drops the book? Agree the rule.'),
      ],
      faster: ['Make the slow zone proportional (speed = 0.5 × (distance − 40), capped at 45 %).', 'Add a sound pattern for “waiting” and test whether classmates understand it without explanation.'],
      slower: ['Announce and stop only; add slowing after.', 'Provide the zone thresholds.'],
      notes: ['In the simulator the handover is confirmed by the teacher (pressing the crew member’s bumper); explain that real handovers sense the pull on the object.', 'Robot City (Legend tier) is the playable challenge: right-of-way and safe stopping around people and vehicles.'],
    }),
    parent: {
      today: 'Your teen made the rover show its intentions to people — lights, speech, slowing down — and designed a safe way to hand an object to a person.',
      tryAtHome: 'Notice how drivers and cyclists signal intent (indicators, hand signals, eye contact). What would a robot need to do the same?',
      askYourChild: 'Why isn’t “it didn’t hit anyone” enough for a robot to be safe around people?',
    },
  }),

  // ── 18 ───────────────────────────────────────────────────────────────────
  makeSession(L, 18, {
    objectives: [
      o('Designs a sample-fetch mission that detects at least two kinds of injected fault and recovers or stops safely, never continuing blind.', 'I can design a mission that still succeeds — or stops safely — when something breaks.', ['engineering-design', 'debugging']),
      o('Documents a written test plan with results and one failure that led to a design change.', 'I can document my tests and a failure that improved my design.', ['communication', 'data'], { concepts: ['debugging', 'design-process'] }),
    ],
    episode: episode('Fetch Under Faults', 'The rover learned to work safely around people.', [
      scene('Sol 18. The sample site at dawn. Hana holds a small box with three switches: SLIP · BLIND · DEAD ZONE.', 'She flips one at random and hides the box.', 55, [
        ['guest', 'On Mars, something will break. I won’t tell you what or when. Get the sample — or stop safely and tell me why. Never keep going blind.', CREW.kim],
        ['guest', 'And I want the test plan in writing, with what you changed after it failed.', CREW.ramirez],
      ]),
      scene('The engineer’s desk: the reach-and-grasp program, the fault detectors from Session 15, the test-plan template.', 'Arrows join them into one design.', 45, [
        ['myrobot', 'Everything I built this act, together — and a safe stop wherever it can go wrong.'],
      ]),
    ], 'The sample comes home. Then the weather station chirps: a dust storm is coming, and it will last for days.'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Choose your fetch tool: gripper for the canister, or another — and test that choice too.',
      why: 'Your tool choice is part of the design the faults will test.',
      tryWithout: 'With no tool, the mission can only end in a safe stop.',
      physicsEffect: 'Gripper 0.12 kg; scoop 0.10 kg (cannot hold an upright canister).',
      realWorld: 'Missions are tested with “fault injection”: engineers deliberately break things in testing to check the system copes.',
    },
    code: challenge({
      title: 'Blind Sensor Drill',
      mission: 'Inject the BLIND fault (camera reads 200 for 3 s) during the approach. Detect it (200 for more than 1 s while a target should be close), back off 20 cm, wait 3 s and retry once; if still blind, stop and say why.',
      arena: SAMPLE_SITE,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(blindSince, −1); variable_set(retries, 0)',
        '… during the approach loop …',
        'if_else(compare(distance_cm > 199)) { if (compare(variable_get(blindSince) < 0)) { variable_set(blindSince, timer_s) } } else { variable_set(blindSince, −1) }',
        'if (and(compare(variable_get(blindSince) > −1), compare(math(timer_s − variable_get(blindSince)) > 1))) { stop; drive_distance(−20, 25); wait(3); variable_change(retries, 1); variable_set(blindSince, −1) }',
        'if (compare(variable_get(retries) > 1)) { stop; say("Camera blind twice: stopping for help") }',
      ],
      success: [crit('uses-blocks', 'Detects the blind fault, retries once, and stops safely if it repeats.'), crit('no-collision', 'Never drives forward while blind.')],
      two: 'Your detector does not trigger on a normal approach.',
      three: 'You explained why you retry once, not forever.',
      hints: ['Remember when the blindness started.', 'Retry once after backing off.', 'Never move forward while blind.'],
    }),
    challenge: challenge({
      title: 'Sample Fetch Under Faults',
      mission: 'Your design: fetch the canister while the simulator injects one unknown fault per run (slip, blind or dead zone). Detect at least two kinds, recover or stop safely, never continue blind. Submit a written test plan with results and one failure you used to improve the design.',
      arena: arena(SAMPLE_SITE, { requires: ['move', 'see-wall', 'see-color'], features: ['Red canister among grey rocks.', 'One random injected fault per run: slip, blind (3 s) or dead zone (motors need 25 %).'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(state, 1)  ← 1 search · 2 align · 3 approach · 4 grasp · 5 return · 9 safe stop',
        'repeat_until(or(compare(variable_get(state) = 6), compare(variable_get(state) = 9))) {',
        '  … each state as built in Sessions 13–15 …',
        '  … every loop: stall check, slip check, blind check → retry once, then state 9 …',
        '}',
        'if (compare(variable_get(state) = 9)) { say("Safe stop: fault"); say(variable_get(lastFault)) } else { say("Sample home") }',
      ],
      success: [crit('deliver-object', 'Fetches the canister in runs where recovery is possible.'), crit('uses-blocks', 'Detects at least two fault types; never continues while a fault is active.'), crit('uses-blocks', 'A written test plan with results and one documented failure.')],
      two: 'Each run ends in “Sample home” or a named safe stop — never in a crash or a wander.',
      three: 'Your write-up shows the failure, the change you made and the re-test.',
      hints: ['Start from your state machine and add checks to every state.', 'One retry per fault, then the safe stop.', 'Test each fault on its own before random runs.'],
    }),
    quiz: [
      q('The dead-zone fault means motors need 25 % to move, and your approach commands 13 %. What should your design do?', [
        right('Notice no progress (stall check), then raise the minimum command once — or stop safely', '📈'),
        wrong('Keep commanding 13 %: it worked in testing', '🔁', 'keep-going-default'),
        wrong('Jump straight to 100 % to force it through', '💥', 'keep-going-default'),
      ], 'The stall detector spots that commands aren’t producing motion. A bounded recovery (one step up, then stop) is safe; slamming to full power near a sample is not.'),
      q('Why must the rover never “continue blind”?', [
        right('Without valid sensing it cannot know it is safe, so moving could cause harm', '🙈'),
        wrong('Because blind runs are slower', '🐢', 'no-reading-means-clear'),
        wrong('It can continue if the last reading said the path was clear', '✅', 'no-reading-means-clear'),
      ], 'A reading from before the fault is out of date. Moving without valid sensing is a gamble with the sample, the rover and anyone nearby.'),
      q('What makes your test plan useful to another engineer?', [
        right('It lists each case, the expected and actual results, and what you changed after a failure', '📋'),
        wrong('It only lists the runs that passed', '✅', 'tests-show-it-works'),
        wrong('It says “tested lots, works”', '👍', 'tests-show-it-works'),
      ], 'Someone else should be able to rerun your tests and check your conclusions. That needs cases, expectations, results and changes.'),
    ],
    badge: { id: 'l4-fault-tolerant', name: 'Fault Tolerant', icon: '🛡️', earnedFor: 'You designed a mission that copes with injected faults and documented how you tested it.' },
    reward: { note: 'Project saved to your portfolio: Sample Fetch Under Faults, with your test plan.' },
    teacher: teacher({
      timing: projectPlan(3, 'Fault matrix (pairs list each fault against each state: detected? recovery?)'),
      warmup: {
        title: 'Fault matrix',
        minutes: 3,
        steps: ['Pairs draw a table: rows = states (search, align, approach, grasp, return), columns = faults (slip, blind, dead zone).', 'Mark each cell: detected? what happens?', 'Circle empty cells — those are the design work.'],
        materials: ['Paper'],
      },
      discussion: ['Which fault was hardest to detect, and why?', 'Is a safe stop a success or a failure for this mission?'],
      misconceptions: [
        mc('keep-going-default', 'When unsure, a robot should keep doing what it was doing.', 'When a robot cannot trust its information, the safe default is to stop (or move to a known safe state) and report.', 'Act it: a student walks forward; at a signal they lose their “sight” (close eyes). Do they keep walking? Discuss the safe choice.'),
        mc('no-reading-means-clear', 'A “no echo” reading always means the way is clear.', 'No echo can mean nothing is there OR the sensor cannot see; the robot must treat it carefully.', 'Cover a phone’s camera: the screen goes black. Does that mean the room is dark? Pairs list three reasons a sensor might report “nothing”.'),
        mc('tests-show-it-works', 'The purpose of testing is to show the program works.', 'Testing tries to find where and how it fails — edges and failure cases matter most.', 'Pairs swap programs and try to break each other’s with one edge case each. Count how many bugs were found that the author’s own tests missed.'),
      ],
      faster: ['Handle two simultaneous faults.', 'Report a fault log at the end: each fault, when, which state, what the rover did.'],
      slower: ['Handle the blind fault and one other.', 'Use the Session 15 detectors unchanged.'],
      notes: ['Self-checks are reflection only and never gate the badge.', 'The test plan feeds the capstone safety case (Session 20).'],
    }),
    parent: {
      today: 'Your teen designed a sample-fetch mission that copes with deliberately injected faults, and documented their tests like a real engineering team.',
      tryAtHome: 'Ask your teen which fault was hardest to deal with and what their rover does when it can’t cope.',
      askYourChild: 'Is a safe stop a success or a failure? Why?',
    },
  }),
]

