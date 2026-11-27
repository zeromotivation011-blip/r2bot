// lib/kids/curriculum/level3/act4.ts
// Level 3, Act 4 (sessions 19–24): "Whiteout".
// Levels of autonomy and when a human takes over, fail-safes (timeouts and
// lost readings), several sensors feeding one decision, honest data and
// respect for wild places, field-robotics careers, and the finale: the
// Whiteout Rescue Rover.

import type { Session } from '../types'
import {
  CREW, DIST, FLOOR_COLOR, GRIP_CLOSE, GRIP_OPEN, GUIDE_LINE, LINE_OFFSET, LINE_SEEN, LOGIC, MOVE, SAY, SLED_TRACK, SNOWFIELD, TALK, TIMER, VARS_MATH, WHITEOUT, HEADING,
} from './shared'
import {
  arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong,
} from './kit'

const L = 3 as const

export const ACT4: Session[] = [
  // ── 19 ───────────────────────────────────────────────────────────────────
  makeSession(L, 19, {
    objectives: [
      o('Programs shared control: the robot follows a driver’s commands but overrides them with a safe stop when an obstacle is too close.', 'I can make my robot follow commands but stop itself when something is in the way.', ['programming', 'impacts-of-computing']),
      o('Compares remote control, shared control and full autonomy and argues when a human should take over.', 'I can explain when a human should be in charge of a robot.', ['impacts-of-computing', 'communication'], { concepts: ['safety-ethics', 'autonomy'], discussionOnly: true }),
    ],
    episode: episode('Who Is in Charge?', 'Both ice cores came home safely — and then the sky turned white.', [
      scene('The station control hut. Snow hammers the windows. The rover’s camera feed is a white blur.', 'Mateo and Dr Owusu argue over the radio desk.', 65, [
        ['guest', 'In a whiteout I can’t see. If I drive the rover by remote, I’ll crash it into a drift.', CREW.quispe],
        ['guest', 'And if it drives itself, who’s responsible if it goes wrong?', CREW.owusu],
        ['spark', 'There’s a middle way. The human gives the goal, and the robot refuses anything unsafe.'],
      ]),
      scene('Three panels light up on the wall: REMOTE · SHARED · AUTONOMOUS.', 'In each, a rover approaches a snow drift.', 70, [
        ['spark', 'Remote: the human does everything — and sees what the camera sees. Shared: the human drives, but the robot stops itself if something is too close. Autonomous: the robot decides everything.'],
        ['myrobot', 'Shared control is like a car that brakes for you when you’re about to hit something.'],
        ['guest', 'And a human should always be able to say STOP — and take over when the robot is unsure.', CREW.quispe],
      ]),
      scene('The snowfield. Mateo drives the rover by radio; it refuses to move when a drift looms out of the white.', 'A small message on the screen: TOO CLOSE — COMMAND REFUSED.', 35, [
        ['guest', 'It said no — and it told me why. I can work with a robot like that.', CREW.quispe],
      ]),
    ], 'The rover’s distance sensor ices over in the storm. What should a robot do when it suddenly goes blind?'),
    build: {
      part: { slot: 'sensor', id: 'color' },
      action: 'inspect',
      narration: 'Look at your sensors: in shared control they are the robot’s own safety check on every command.',
      why: 'The robot can see things the remote driver cannot, so it can refuse a command that would cause a crash.',
      tryWithout: 'In pure remote control, a driver who cannot see the drift drives straight into it.',
      physicsEffect: 'No change. In the whiteout the camera view is a blur beyond 1 m; the Distance Eyes still work.',
      realWorld: 'Surgical robots, cars with emergency braking and bomb-disposal robots all use shared control: a human in charge, a robot that refuses unsafe moves.',
    },
    code: challenge({
      title: 'The Robot Says No',
      mission: 'The driver’s commands are a fixed list (forward 50, forward 50, forward 50). Before each one, check the distance: if anything is closer than 40 cm, refuse, stop and say “Too close”.',
      arena: arena(SNOWFIELD, { requires: ['move', 'see-wall'], features: ['A snow drift (a wall) 120 cm ahead of the start.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, ...TALK],
      example: [
        'repeat(3) {',
        '  if_else(compare(distance_cm < 40)) { stop; say("Too close") } else { drive_distance(50, 40) }',
        '}',
      ],
      success: [crit('no-collision', 'Never touches the drift.'), crit('uses-blocks', 'At least one command is refused with a spoken reason.')],
      two: 'You predicted which command would be refused.',
      three: 'Your robot says WHY it refused, not just that it did.',
      hints: ['Check before you act.', 'If too close: stop and explain. Otherwise: do the command.', 'if_else(distance < 40) { stop; say "Too close" } else { drive 50 }, three times.'],
    }),
    challenge: challenge({
      title: 'Shared Control Run',
      mission: 'Run the drift course three ways: remote (commands only), shared (commands with your safety check) and autonomous (follow the wall gap yourself). Record crashes and time for each, then say which you would use in a whiteout and why.',
      arena: arena(SNOWFIELD, { requires: ['move', 'see-wall'], features: ['Two snow drifts across the field with a gap between them.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(mode, 2)  ← 1 remote, 2 shared, 3 autonomous',
        'repeat(6) {',
        '  if (compare(variable_get(mode) = 1)) { drive_distance(50, 40) }',
        '  if (compare(variable_get(mode) = 2)) { if_else(compare(distance_cm < 40)) { stop; say("Too close: turning") ; turn_degrees(−45, 40) } else { drive_distance(50, 40) } }',
        '  if (compare(variable_get(mode) = 3)) { if_else(compare(distance_cm < 60)) { turn_degrees(−30, 40) } else { drive_distance(30, 40) } }',
        '}',
        'stop',
      ],
      success: [crit('no-collision', 'Shared and autonomous modes never touch a drift.'), crit('uses-blocks', 'All three modes run and are recorded (crashes, time).')],
      two: 'Your table compares all three modes.',
      three: 'You wrote one sentence on when a human must take over.',
      hints: ['Use a mode variable so one program runs all three ways.', 'Shared = the command, but only if it is safe.', 'Record which mode crashed and how long each took.'],
    }),
    quiz: [
      q('In shared control, who decides what?', [
        right('The human gives commands; the robot refuses any that are unsafe', '🤝'),
        wrong('The robot decides everything; the human just watches', '🤖', 'autonomy-all-or-nothing'),
        wrong('The human decides everything; the robot just obeys', '🕹️', 'autonomy-all-or-nothing'),
      ], 'Shared control splits the job: the human sets the goal, the robot keeps the move safe. It is not all-human or all-robot.'),
      q('When should a human be able to take over from an autonomous robot?', [
        right('Always — especially when the robot is unsure or the situation is new', '✋'),
        wrong('Never: humans make more mistakes than robots', '🙅', 'robots-never-wrong'),
        wrong('Only after the robot has crashed', '💥', 'robots-never-wrong'),
      ], 'Robots can be wrong, especially in situations they were never tested in. A human must be able to stop or take over before harm, not after.'),
      q('In the whiteout, why is pure remote control risky?', [
        right('The human sees only a white blur, so they can’t see the drifts the robot’s sensors can', '🌫️'),
        wrong('Remote control is always slower', '🐢', 'remote-is-always-safer'),
        wrong('It isn’t risky: a human driver is always safest', '🧑‍✈️', 'remote-is-always-safer'),
      ], 'A remote driver depends on what the robot’s camera shows. When that fails, the robot’s other sensors know more than the human does.'),
    ],
    badge: { id: 'l3-in-charge', name: 'Who’s in Charge', icon: '🤝', earnedFor: 'You compared levels of autonomy and built a robot that refuses unsafe commands.' },
    reward: { note: 'Mode switch: your projects can now run in remote, shared or autonomous mode.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Remote, shared, solo', 'when must a human be able to take over?'),
      warmup: {
        title: 'Remote, shared, solo',
        minutes: 6,
        steps: ['A blindfolded “robot” crosses a cleared space with a few soft obstacles (bags).', 'Round 1 (remote): a partner gives every step. Round 2 (shared): the partner gives directions, but the robot may stop if their outstretched hand touches something. Round 3 (solo): the robot walks with hands out, alone.', 'Discuss which felt safest and why.'],
        materials: ['A blindfold or eyes closed', 'Soft obstacles (bags, cushions)', 'A cleared space'],
      },
      discussion: ['Name robots or machines at each level: remote, shared, autonomous.', 'If an autonomous robot causes harm, who is responsible — the robot, the programmer, the owner?'],
      misconceptions: [
        mc('autonomy-all-or-nothing', 'A robot is either fully controlled by a human or fully autonomous.', 'There is a range; shared control splits decisions between human and robot.', 'Draw a line from “human does everything” to “robot does everything”. Students place a car with cruise control, a robot vacuum, a drone with return-home and a surgical robot on it.'),
        mc('robots-never-wrong', 'Autonomous robots do not make mistakes, so humans need not intervene.', 'Robots fail in situations they were not designed or tested for; humans must be able to stop or take over.', 'Show three short cases (a robot vacuum stuck under a sofa, a car confused by snow, a chatbot giving a wrong fact). Ask what a human could have done.'),
        mc('remote-is-always-safer', 'A human driving by remote is always the safest choice.', 'A remote human only knows what the robot’s sensors show them; delay and poor views can make remote control less safe.', 'Pairs try to guide a partner using only a narrow cardboard-tube “camera view”. Compare with a partner who can see the whole room.'),
      ],
      faster: ['Add a “confidence” rule: if the distance reading jumps by more than 50 cm between loops, hand control back to the human (say “Unsure: your control”).', 'Write a one-paragraph policy for the station: who may switch modes, and when.'],
      slower: ['Run only remote and shared, and compare.', 'Provide the if_else safety check; students place it.'],
      notes: ['The second objective is discussion-only: use the class debate and exit tickets as evidence.', 'The playable challenge is the Galaxy sort “Joystick or mission plan?”.'],
    }),
    parent: {
      today: 'Your child compared remote control, shared control and full autonomy, and built a robot that refuses unsafe commands.',
      tryAtHome: 'Talk about a car’s automatic braking or a phone’s “are you sure?” message. Who decides — the person or the machine?',
      askYourChild: 'When should a human be able to stop a robot?',
    },
  }),

  // ── 20 ───────────────────────────────────────────────────────────────────
  makeSession(L, 20, {
    objectives: [
      o('Adds a timeout and lost-reading checks (no echo = 200, line not seen) that put the robot into a safe stop.', 'I can add fail-safes so my robot stops safely when something goes wrong.', ['programming', 'impacts-of-computing']),
      o('Explains what a safe default is and why “stop and say why” is safer than “keep going”.', 'I can explain what my robot should do when it is not sure.', ['impacts-of-computing'], { concepts: ['safety-ethics'] }),
    ],
    episode: episode('Gone Blind', 'The rover learned to refuse unsafe commands with shared control.', [
      scene('The snowfield in the whiteout. Ice builds on the rover’s Distance Eyes.', 'The distance reading jumps to 200 and stays there. The rover drives on, faster and faster towards a drift.', 60, [
        ['myrobot', 'The sensor says nothing is there. So… full speed?'],
        ['guest', 'STOP! Two hundred doesn’t mean “clear”. It can mean “I can’t see”!', CREW.haddad],
      ]),
      scene('Back in the hut. Leila draws two columns: WHAT THE SENSOR SAYS · WHAT IT MIGHT MEAN.', '200 → “nothing within 2 m” OR “sensor blinded”. Line not seen → “off the line” OR “line buried”.', 70, [
        ['guest', 'A fail-safe is what the robot does when it can’t trust what it knows. The safe default here is: stop, and tell a human why.', CREW.haddad],
        ['spark', 'And a timeout: if a job takes much longer than it should, something is wrong. Stop and report.'],
        ['myrobot', 'So: if no echo for more than a second, stop. If no line for two seconds, stop. If the whole trip takes over thirty seconds, stop.'],
      ]),
      scene('The snowfield. The iced sensor reads 200 again.', 'This time the rover stops after one second and its screen says: BLIND — HELP.', 30, [
        ['guest', 'Stopped, safe, and it told me why. That’s a robot I can rescue.', CREW.haddad],
      ]),
    ], 'One sensor at a time won’t do in the storm. The rover will need to listen to all of them at once.'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'swap',
      narration: 'Swap the colour sensor back for the line sensor: the buried guide line is the way home.',
      why: 'The line sensor can also tell you when the line is lost — a reading your fail-safe can use.',
      tryWithout: 'Without a lost-line check, a robot that loses the line keeps driving in a circle until the battery dies.',
      physicsEffect: 'When the line is lost, line offset keeps the last side seen (+1 or −1) and line seen becomes false.',
      realWorld: 'Lifts, trains and factory robots all have fail-safes: if a sensor stops reporting, the machine stops in a safe state.',
    },
    code: challenge({
      title: 'Timeout',
      mission: 'Follow the guide line, but if the whole run takes more than 30 s, stop and say “Timeout: help”.',
      arena: arena(GUIDE_LINE, { requires: ['move', 'follow-line'], features: ['Black line with three S-bends.', 'Part of the line is buried in snow (invisible for 40 cm).'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, TIMER, ...TALK],
      example: [
        'variable_set(done, 0)',
        'repeat_until(compare(variable_get(done) = 1)) {',
        '  set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset)))',
        '  if (compare(timer_s > 30)) { stop; say("Timeout: help"); variable_set(done, 1) }',
        '}',
      ],
      success: [crit('uses-blocks', 'The timeout stops the robot and it says why.'), crit('no-collision', 'Never leaves the arena.')],
      two: 'You tested the timeout by making it shorter (5 s) first.',
      three: 'You explained why 30 s, not 3 s or 300 s.',
      hints: ['The timer counts seconds since Go.', 'Check it every loop.', 'if timer_s > 30: stop, say why, and end the loop.'],
    }),
    challenge: challenge({
      title: 'Fail Safe',
      mission: 'Follow the line home. Add three fail-safes: no line for more than 2 s → stop and say “Lost the line”; a distance reading of 200 for more than 1 s while driving towards the hut → stop and say “Blind”; total time over 40 s → stop and say “Timeout”. Test each one by causing it.',
      arena: arena(GUIDE_LINE, { requires: ['move', 'follow-line', 'see-wall'], features: ['Black line with three S-bends; the hut wall stands at the end.', 'Fault buttons: bury the line for 3 s; ice the Distance Eyes (reads 200) for 3 s.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, DIST, TIMER, ...TALK],
      example: [
        'variable_set(lostSince, −1); variable_set(blindSince, −1); variable_set(state, 1)',
        'repeat_until(compare(variable_get(state) = 0)) {',
        '  set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset)))',
        '  if_else(line_seen) { variable_set(lostSince, −1) } else { if (compare(variable_get(lostSince) < 0)) { variable_set(lostSince, timer_s) } }',
        '  if (and(compare(variable_get(lostSince) > −1), compare(math(timer_s − variable_get(lostSince)) > 2))) { stop; say("Lost the line"); variable_set(state, 0) }',
        '  if_else(compare(distance_cm > 199)) { if (compare(variable_get(blindSince) < 0)) { variable_set(blindSince, timer_s) } } else { variable_set(blindSince, −1) }',
        '  if (and(compare(variable_get(blindSince) > −1), compare(math(timer_s − variable_get(blindSince)) > 1))) { stop; say("Blind"); variable_set(state, 0) }',
        '  if (compare(distance_cm < 15)) { stop; say("Home"); variable_set(state, 0) }',
        '  if (compare(timer_s > 40)) { stop; say("Timeout"); variable_set(state, 0) }',
        '}',
      ],
      success: [crit('uses-blocks', 'Each of the three fail-safes is triggered once on purpose and stops the robot with the right message.'), crit('stop-in-zone', 'With no faults, it reaches the hut and stops 10–15 cm from the wall.')],
      two: 'You triggered every fail-safe on purpose and recorded it.',
      three: 'Your robot never reacts to a single glitchy reading (it waits for the time limit).',
      hints: ['Remember WHEN the problem started (a variable), then check how long it has lasted.', 'Reset the “since” variable when things are fine again.', 'A safe stop always says why, so a human can help.'],
    }),
    quiz: [
      q('The distance sensor reads 200 cm. What can that mean?', [
        right('Nothing within 2 m — or the sensor can’t see (blinded or iced)', '❓'),
        wrong('There is definitely nothing in front', '✅', 'no-reading-means-clear'),
        wrong('There is a wall exactly 2 m away', '🧱', 'no-reading-means-clear'),
      ], '200 is the “no echo” value. A clear path gives it — but so does a blinded sensor. A fail-safe treats a long run of 200s while it should see something as “I can’t see”.'),
      q('What is the safest default when a robot can’t trust its sensors?', [
        right('Stop safely and tell a human why', '🛑'),
        wrong('Keep going at the last speed until the sensor works again', '➡️', 'keep-going-default'),
        wrong('Speed up to get out of trouble faster', '⚡', 'keep-going-default'),
      ], 'When the robot cannot know what is ahead, moving is the risk. Stop, then report the reason so a human can help.'),
      q('Why wait 1 s of “no echo” before stopping, instead of stopping on the first 200?', [
        right('One odd reading is often a glitch; a long run of them is a real problem', '⏱️'),
        wrong('Waiting makes the robot faster', '🏎️', 'any-glitch-means-stop'),
        wrong('You should stop on the first one — waiting is always unsafe', '🚨', 'any-glitch-means-stop'),
      ], 'Sensors glitch. Reacting to every single odd reading makes a robot stop all the time. A short time window separates glitches from real faults — chosen so it is still safe.'),
    ],
    badge: { id: 'l3-fail-safe', name: 'Fail Safe', icon: '🛑', earnedFor: 'You added timeouts and lost-reading checks so your robot stops safely and says why.' },
    reward: { note: 'Fault buttons: you can now inject faults into any of your project runs to test your fail-safes.' },
    teacher: teacher({
      timing: lessonPlan(5, 'What does silence mean?', 'what should a robot do when it is not sure?'),
      warmup: {
        title: 'What does silence mean?',
        minutes: 5,
        steps: ['Story: a friend always texts “home safe” after football. Tonight: nothing. What could it mean?', 'List possibilities: phone died, forgot, still on the bus, something wrong.', 'Ask: what is a sensible “safe default” action, and how long would you wait?'],
        materials: ['None'],
      },
      discussion: ['Where have you seen fail-safes? (Lift doors that reopen, a kettle that switches off, a train “dead man’s handle”.)', 'Why must a safe stop always say why?'],
      misconceptions: [
        mc('no-reading-means-clear', 'A “no echo” reading always means the way is clear.', 'No echo can mean nothing is there OR the sensor cannot see; the robot must treat it carefully.', 'Cover a phone’s camera: the screen goes black. Does that mean the room is dark? Pairs list three reasons a sensor might report “nothing”.'),
        mc('keep-going-default', 'When unsure, a robot should keep doing what it was doing.', 'When a robot cannot trust its information, the safe default is to stop (or move to a known safe state) and report.', 'Act it: a student walks forward; at a signal they lose their “sight” (close eyes). Do they keep walking? Discuss the safe choice.'),
        mc('any-glitch-means-stop', 'A robot should stop on every unexpected reading.', 'Single glitches are common; filtering over a short time window catches real faults without constant false alarms.', 'Show a reading list with one odd value in a normal run, and one with a long run of odd values. Which should stop the robot? Why?'),
      ],
      faster: ['Add a fourth fail-safe: if heading changes by more than 90° in 1 s (spinning), stop.', 'After a safe stop, wait for a human “resume” (a bump on the bumper) before continuing.'],
      slower: ['Add the timeout only, then the lost-line check.', 'Test each fail-safe with the fault buttons before combining.'],
      notes: ['This session connects to Robot Guardians’ “control” question in the Harm Check: a human must always be able to stop a robot.'],
    }),
    parent: {
      today: 'Your child gave their robot fail-safes: timeouts and checks for lost sensor readings, so it stops safely and says why.',
      tryAtHome: 'Spot fail-safes at home together: a kettle that switches off, a toaster that pops up, a washing machine door lock. What goes wrong without each?',
      askYourChild: 'What should a robot do when it cannot trust its sensors?',
    },
  }),

  // ── 21 ───────────────────────────────────────────────────────────────────
  makeSession(L, 21, {
    objectives: [
      o('Combines line, distance and colour readings with a priority order (safety first) to make one decision every loop.', 'I can make my robot combine several sensors to make one decision.', ['programming', 'algorithms']),
      o('Explains why the order of the checks matters when sensors disagree.', 'I can explain why safety checks come first.', ['algorithms', 'impacts-of-computing'], { concepts: ['conditions', 'autonomy'] }),
    ],
    episode: episode('Many Sensors, One Decision', 'The rover learned fail-safes: stop and say why when a sensor goes quiet.', [
      scene('The guide line home, half-buried. Mateo plants red flags around a crevasse on one side.', 'The rover’s three sensors each shout at once: LINE LEFT! WALL AHEAD! RED BELOW!', 60, [
        ['myrobot', 'The line says turn left. The colour sensor says danger. The distance sensor says something’s ahead. Which one do I listen to?'],
        ['guest', 'In the mountains we have an order. Danger first. Then obstacles. Then the path.', CREW.quispe],
      ]),
      scene('A priority ladder appears: 1 RED ZONE → stop. 2 CLOSER THAN 25 → steer round. 3 OTHERWISE → follow the line.', 'Each loop, the rover checks from the top and acts on the first rule that fires.', 70, [
        ['spark', 'If, else if, else if… The first true check wins. Put the most important check at the top.'],
        ['myrobot', 'If I put “follow the line” first, I’d follow it straight into the crevasse.'],
        ['guest', 'That’s why order matters. Write the ladder before you write the code.', CREW.quispe],
      ]),
      scene('The guide line, minutes later. The rover stops at the crevasse edge, backs off from a snow block, and rejoins the line.', 'At the hut, Mateo pulls the red flags out of the snow one by one.', 30, [
        ['guest', 'Danger first. Then obstacles. Then the path. You’ll make a mountaineer yet.', CREW.quispe],
      ]),
    ], 'The data from the storm is in. Some of it is wrong. What do you say when your data isn’t perfect?'),
    build: {
      part: { slot: 'head', id: 'camera' },
      action: 'swap',
      narration: 'Swap Distance Eyes for the Camera Eye: it sees distance AND colour, so it can spot red flags ahead.',
      why: 'One more sense gives the robot more to decide with — and more to disagree about.',
      tryWithout: 'With distance only, the robot cannot tell a red danger flag from a harmless drift.',
      physicsEffect: 'The camera’s distance reading is a little noisier than Distance Eyes; colour works under its own light.',
      realWorld: 'Self-driving cars fuse camera, radar and lidar, with rules that put safety-critical readings first.',
    },
    code: challenge({
      title: 'The Priority Ladder',
      mission: 'Each loop: if the floor is red, stop and say “Danger”; else if something is closer than 25 cm, turn right 30°; else follow the line.',
      arena: arena(GUIDE_LINE, { requires: ['move', 'follow-line', 'see-wall', 'see-color'], features: ['Black line with three S-bends.', 'A red danger patch beside the second bend.', 'A snow block on the line after the first bend.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_OFFSET, LINE_SEEN, DIST, FLOOR_COLOR, TIMER, ...TALK],
      example: [
        'repeat_until(compare(timer_s > 40)) {',
        '  if_else(compare(floor_color = red)) { stop; say("Danger") } else {',
        '    if_else(compare(distance_cm < 25)) { turn_degrees(−30, 40); drive_distance(20, 30) } else {',
        '      set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset)))',
        '    }',
        '  }',
        '}',
      ],
      success: [crit('no-collision', 'Never drives into the red patch or the snow block.'), crit('uses-blocks', 'Three sensors in one priority order, safety first.')],
      two: 'You wrote the ladder in words before coding.',
      three: 'You tested what happens if the order is reversed, and explained it.',
      hints: ['Most dangerous first.', 'Use if / else inside else to make a ladder.', 'red → stop; else close → steer; else → follow.'],
    }),
    challenge: challenge({
      title: 'Home Through the Storm',
      mission: 'Get home along the buried line: avoid two red danger zones, steer round snow blocks, rejoin the line, and stop at the hut. One decision per loop, from a priority ladder you design.',
      arena: arena(WHITEOUT, { requires: ['move', 'follow-line', 'see-wall', 'see-color'], features: ['Two red danger patches near the line.', 'Snow blocks on the line at random places.', 'Green dock at the hut.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_OFFSET, LINE_SEEN, DIST, FLOOR_COLOR, TIMER, ...TALK],
      example: [
        'variable_set(home, 0)',
        'repeat_until(compare(variable_get(home) = 1)) {',
        '  if_else(compare(floor_color = green)) { stop; say("Home"); variable_set(home, 1) } else {',
        '    if_else(compare(floor_color = red)) { drive_distance(−20, 30); turn_degrees(45, 40) } else {',
        '      if_else(compare(distance_cm < 25)) { turn_degrees(−45, 40); drive_distance(30, 30); turn_degrees(45, 40) } else {',
        '        if_else(line_seen) { set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset))) } else { set_motors(25, 25) }',
        '      }',
        '    }',
        '  }',
        '  if (compare(timer_s > 60)) { stop; say("Timeout"); variable_set(home, 1) }',
        '}',
      ],
      success: [crit('stop-in-zone', 'Stops in the green dock.'), crit('no-collision', 'Never enters a red zone or hits a snow block.'), crit('uses-blocks', 'A priority ladder of at least three sensor checks.')],
      two: 'Works on three random block layouts.',
      three: 'Your ladder is written beside your program and matches it rung for rung.',
      hints: ['Safety rungs go at the top.', 'After steering round a block, the line follower must find the line again.', 'Keep the timeout from Session 20 as the last safety net.'],
    }),
    quiz: [
      q('The line follower says “go left”, but the floor under the robot is red (danger). With a safety-first ladder, what happens?', [
        right('It stops: the danger check is higher up and wins', '🛑'),
        wrong('It goes left: the line follower runs every loop', '⬅️', 'all-ifs-run'),
        wrong('It averages the two and goes a little left', '➗', 'average-everything'),
      ], 'In an if / else ladder only the first true rung acts. Danger is at the top, so it wins and the follower never runs that loop.'),
      q('Why does the order of the checks matter?', [
        right('The first true check acts; the others are skipped that loop', '🪜'),
        wrong('It doesn’t: the robot checks everything and does all of it', '🔀', 'all-ifs-run'),
        wrong('Later checks are more important because they run last', '🔚', 'all-ifs-run'),
      ], 'An else-if ladder is a priority list. Put the most important (safety) checks first, or a less important rule can act before them.'),
      q('Two sensors disagree: the camera sees a wall at 20 cm, the line follower sees a clear line. What is the safest choice?', [
        right('Trust the obstacle reading first: avoid, then rejoin the line', '🧱'),
        wrong('Trust the line: it is the path home', '〰️', 'trust-the-favourite-sensor'),
        wrong('Ignore both and drive straight', '➡️', 'trust-the-favourite-sensor'),
      ], 'When sensors disagree, choose the reading whose mistake would be most dangerous to ignore. A wall that is really there matters more than staying on the line.'),
    ],
    badge: { id: 'l3-sensor-fusion', name: 'Sensor Fusion', icon: '🧩', earnedFor: 'You combined several sensors into one decision with a safety-first priority ladder.' },
    reward: { note: 'Camera Eye refitted: distance and colour together.' },
    teacher: teacher({
      timing: lessonPlan(5, 'The priority ladder', 'why does the order of the checks matter?'),
      warmup: {
        title: 'The priority ladder',
        minutes: 5,
        steps: ['Read out situations for crossing a road: “green man”, “a car is coming”, “your friend calls you”.', 'Pairs put the rules in order: what wins over what?', 'Agree a ladder: car coming → wait; else green man → cross; else wait.'],
        materials: ['None'],
      },
      discussion: ['What order of rules do you follow when crossing a road or in a fire drill?', 'What could go wrong if two rules have equal priority?'],
      misconceptions: [
        mc('all-ifs-run', 'In an if / else-if ladder every true check runs.', 'Only the first true rung runs; the rest are skipped that loop. Separate ifs, not else-ifs, all run.', 'Two cards: “if hungry → eat” and “if tired → sleep”. Run them as separate ifs (both happen) and as an else-if ladder (only the first). Act both with a volunteer.'),
        mc('average-everything', 'When two estimates disagree, average them.', 'When one source is known to be far more accurate (a surveyed landmark), trust it; averaging adds the other’s error back in.', 'Ask: your watch says 9:07, the station clock (set by satellite) says 9:00. Do you average to 9:03? Discuss which to trust and why.'),
        mc('trust-the-favourite-sensor', 'Always trust the same sensor when sensors disagree.', 'Which sensor to trust depends on the situation; when unsure, trust the reading whose error would be most dangerous to ignore.', 'Scenario cards: fog (camera bad), shiny floor (distance bad), buried line (line sensor bad). Pairs choose which sensor to trust in each.'),
      ],
      faster: ['Add a fourth rung: if the line has been lost for 2 s, search in a widening spiral.', 'Count how many times each rung fired and report it.'],
      slower: ['Two rungs first (danger, then follow); add the obstacle rung after.', 'Provide the ladder in words; students build it in blocks.'],
      notes: ['The playable challenge is the Galaxy logic puzzle “Two out of three”: voting between sensors is another way to fuse them.'],
    }),
    parent: {
      today: 'Your child combined three sensors with a safety-first “priority ladder” so the robot makes one sensible decision at a time.',
      tryAtHome: 'Make a priority ladder for getting ready in the morning (what must happen first, what can wait). What happens if you swap the order?',
      askYourChild: 'Why does the danger check come first in your robot’s ladder?',
    },
  }),

  // ── 22 ───────────────────────────────────────────────────────────────────
  makeSession(L, 22, {
    objectives: [
      o('Logs every reading including failed ones and reports the count of good and bad readings honestly.', 'I can make my robot report its data honestly, including what went wrong.', ['data', 'impacts-of-computing']),
      o('Discusses how field robots should behave around wildlife and fragile places, and why honest data matters to science.', 'I can explain why honest data and respect for wild places matter.', ['impacts-of-computing', 'communication'], { concepts: ['safety-ethics'], discussionOnly: true }),
    ],
    episode: episode('Honest Data, Wild Places', 'The rover combined its sensors to get home through the storm.', [
      scene('The station. Priya’s screen shows the storm data: some readings are 200, some missing.', 'Dr Owusu frowns at a draft report that only shows the good numbers.', 65, [
        ['guest', 'If I delete the bad readings and don’t say so, the report looks perfect. And it’s a lie.', CREW.raman],
        ['guest', 'Other scientists will build on these numbers. If we hide what went wrong, they’ll trust something they shouldn’t.', CREW.owusu],
        ['myrobot', 'So I report how many readings I took, how many were good — and which ones I left out, and why.'],
      ]),
      scene('Outside, the storm has passed. A ptarmigan nest sits in the snow beside the rover’s usual route.', 'Mateo marks a yellow zone round it.', 55, [
        ['guest', 'This ridge is their home before it’s our lab. The rover keeps out of yellow zones, and slows down near them.', CREW.quispe],
        ['spark', 'Field robots work in other creatures’ homes. Good engineers design for that.'],
      ]),
      scene('The control hut. The rover reads out its report: twelve readings taken, nine kept, three left out — no echo.', 'Priya nods and types it word for word.', 35, [
        ['guest', 'Nine good readings and an honest note. I’d rather have that than twelve I can’t trust.', CREW.raman],
      ]),
    ], 'Now the station is calling for help planning the biggest mission yet: the remote weather station, lost in the whiteout.'),
    build: {
      part: { slot: 'head', id: 'camera' },
      action: 'inspect',
      narration: 'Your camera sees colour: yellow means a protected zone the rover must never enter.',
      why: 'The same sensors that do the job can also protect the place where the job happens.',
      tryWithout: 'Without a way to see protected zones, the shortest route crosses the nest.',
      physicsEffect: 'No change. Yellow zones are marked on the floor; the camera reads them up to 1 m ahead.',
      realWorld: 'Ocean robots avoid coral reefs and whale routes, and farm robots slow down near nesting birds — often by law.',
    },
    code: challenge({
      title: 'Count Them All',
      mission: 'Take ten distance readings at the gauge post, one every 0.5 s. Count the good ones (under 200) and the bad ones (200), and say both counts and the average of the good readings only.',
      arena: arena(SLED_TRACK, { id: 'l3-gauge-post', name: 'The Gauge Post', description: 'A gauge post 60 cm ahead; storm snow sometimes blocks the echo.', goal: 'Report good and bad counts and the average of good readings.', features: ['Gauge post 60 cm ahead.', 'About one reading in four returns 200 (snow in the air).'], requires: ['move', 'see-wall'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, ...TALK],
      example: [
        'variable_set(good, 0); variable_set(bad, 0); variable_set(total, 0)',
        'repeat(10) {',
        '  variable_set(r, distance_cm)',
        '  if_else(compare(variable_get(r) < 200)) { variable_change(good, 1); variable_change(total, variable_get(r)) } else { variable_change(bad, 1) }',
        '  wait(0.5)',
        '}',
        'say(variable_get(good)); say(variable_get(bad))',
        'if (compare(variable_get(good) > 0)) { say(math(variable_get(total) ÷ variable_get(good))) }',
      ],
      success: [crit('uses-blocks', 'Reports good and bad counts that add up to 10.'), crit('uses-blocks', 'The average uses good readings only, and never divides by zero.')],
      two: 'Your report says how many readings were left out, and why.',
      three: 'You explained why dividing by good, not by 10, is honest.',
      hints: ['Every reading is either good or bad — count both.', 'Only add good readings to the total.', 'Average = total ÷ good, but only if good > 0.'],
    }),
    challenge: challenge({
      title: 'The Honest Survey',
      mission: 'Survey four gauges on the snowfield, never entering the yellow nesting zone and slowing to 20 % within 50 cm of it. Report readings taken, good readings, readings left out, and the average of the good ones.',
      arena: arena(SNOWFIELD, { requires: ['move', 'see-wall', 'see-color'], features: ['Four gauge posts along the route.', 'A yellow nesting zone between gauges 2 and 3.', 'Storm snow: about one reading in four returns 200.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(taken, 0); variable_set(good, 0); variable_set(total, 0)',
        '… drive to each gauge with heading hold; on yellow: back off 20 cm and steer round at 20 % …',
        'at each gauge: repeat(3) { variable_set(r, distance_cm); variable_change(taken, 1); if (compare(variable_get(r) < 200)) { variable_change(good, 1); variable_change(total, variable_get(r)) } }',
        'say(variable_get(taken)); say(variable_get(good)); say(math(variable_get(taken) − variable_get(good)))',
        'if (compare(variable_get(good) > 0)) { say(math(variable_get(total) ÷ variable_get(good))) }',
      ],
      success: [crit('no-collision', 'Never enters the yellow nesting zone (its centre never crosses the zone edge).'), crit('uses-blocks', 'Reports taken, good, left out and the average of good readings, all consistent.')],
      two: 'You never entered the yellow zone in three runs.',
      three: 'Your spoken report would let another scientist trust (or question) your numbers.',
      hints: ['Count every reading, then sort it into good or bad.', 'Check the floor colour every loop, before you move.', 'Report what you left out as well as what you kept.'],
    }),
    quiz: [
      q('Three of your ten readings were 200 (no echo). What is the honest report?', [
        right('Seven good readings, three left out because there was no echo, average of the seven', '📋'),
        wrong('The average of all ten, including the 200s', '➗', 'include-bad-readings'),
        wrong('Just the average of the seven, without mentioning the others', '🙊', 'hide-bad-data'),
      ], 'The 200s are not snow depths, so they don’t belong in the average — but hiding that you dropped them makes the report look more certain than it is.'),
      q('Why does it matter if a report quietly drops bad data?', [
        right('Others will trust the numbers more than they should and build on them', '🏗️'),
        wrong('It doesn’t: only the final number matters', '🔢', 'hide-bad-data'),
        wrong('Because computers can’t store missing values', '💾', 'hide-bad-data'),
      ], 'Science and engineering depend on knowing how reliable a number is. Saying what was dropped, and why, lets others judge it.'),
      q('A rover’s shortest route crosses a nesting zone. What should a good design do?', [
        right('Plan round it and slow down nearby, even if the trip takes longer', '🐦'),
        wrong('Cross it quickly so the birds are disturbed for less time', '⚡', 'efficiency-beats-nature'),
        wrong('Cross it: robots don’t harm wildlife because they’re quiet', '🤫', 'efficiency-beats-nature'),
      ], 'Robots can disturb animals with noise, movement and simply being there. Respecting protected places is part of the job, not an extra.'),
    ],
    badge: { id: 'l3-honest-scientist', name: 'Honest Scientist', icon: '🔬', earnedFor: 'You reported your data honestly and kept your robot out of a protected wild place.' },
    reward: { note: 'Report card: your project reports now show readings taken, kept and left out.' },
    teacher: teacher({
      timing: lessonPlan(6, 'The perfect graph', 'what should a report say about the data it left out?'),
      warmup: {
        title: 'The perfect graph',
        minutes: 6,
        steps: ['Show two versions of the same results table: one complete with a few odd values, one “cleaned” with no mention of what was removed.', 'Ask: which looks better? Which would you trust if your safety depended on it?', 'Agree a class rule for reporting data.'],
        materials: ['Two printed (or projected) versions of a results table'],
      },
      discussion: ['Can you think of a time when hiding a mistake made things worse later?', 'Should robots be allowed in nature reserves? Under what rules?'],
      misconceptions: [
        mc('include-bad-readings', 'Every reading belongs in the average.', 'Readings that are not real measurements (like “no echo”) should be left out of the average — and the report should say so.', 'Average 40, 42, 41 and 200: compare with and without the 200. Which describes the gauge? Then write the sentence that explains the exclusion.'),
        mc('hide-bad-data', 'It is fine to drop bad data without saying so.', 'Honest reports state what was excluded and why, so others can judge how reliable the result is.', 'Give two reports of the same experiment, one transparent and one silent. Pairs act as reviewers: which would they sign off, and what would they ask?'),
        mc('efficiency-beats-nature', 'The quickest route is best even through protected places; robots do not disturb wildlife.', 'Robots disturb animals through noise, movement and presence; good design avoids and protects sensitive places.', 'Show a map with a short route through a reserve and a longer one round it. Pairs list who is affected by each (birds, scientists, the public) and choose.'),
      ],
      faster: ['Add a “confidence” line to the report: good ÷ taken as a percentage.', 'Write the station’s three rules for robots near wildlife.'],
      slower: ['Do the counting challenge only; discuss the wildlife part as a class.', 'Provide the report sentence frame: “I took __, kept __, left out __ because __.”'],
      notes: ['The second objective is discussion-only: use the class rules and exit tickets as evidence.', 'The “never enters the yellow zone” criterion uses the simulator’s zone check on the robot’s centre.'],
    }),
    parent: {
      today: 'Your child made their robot report its data honestly — including what went wrong — and kept it out of a wildlife nesting zone.',
      tryAtHome: 'Look at a weather app or sports stats together. What might be missing from the numbers? How would you know?',
      askYourChild: 'Why is it important to say which readings you left out?',
    },
  }),

  // ── 23 ───────────────────────────────────────────────────────────────────
  makeSession(L, 23, {
    objectives: [
      o('Breaks the rescue rehearsal into parts owned by different team roles and integrates them into one program.', 'I can split a big mission into parts that a team can build together.', ['collaboration', 'algorithms']),
      o('Describes several real roles in field robotics and the skills each uses.', 'I can name jobs in field robotics and the skills they need.', ['communication'], { concepts: ['careers'], discussionOnly: true }),
    ],
    episode: episode('The Rescue Team', 'The rover reported its storm data honestly and steered round the nesting zone.', [
      scene('The station mess hut. The whole crew around one table, maps and mugs.', 'Each crew member says what they do.', 70, [
        ['guest', 'I design the robot’s body and drive — I break things on purpose so they don’t break out there.', CREW.haddad],
        ['guest', 'I keep it running: batteries, repairs, spare parts at minus twenty.', CREW.sato],
        ['guest', 'I turn its readings into science, and check them twice.', CREW.raman],
        ['guest', 'And I decide when it’s safe to go, and when we turn back.', CREW.quispe],
      ]),
      scene('The rehearsal. The rescue mission drawn as boxes: FIND LINE → FOLLOW → DOCK → DOWNLOAD → RETURN.', 'Each box gets a crew member’s name — and the rover’s.', 55, [
        ['spark', 'Big missions are built by teams. Each person owns a part; the parts must fit together.'],
        ['myrobot', 'Then we agree what each part receives and hands on — like the state number, or where I am.'],
      ]),
      scene('The rehearsal ends. Three pairs’ parts run one after another without a hitch.', 'The crew clap; Leila taps the state-number list pinned to the wall.', 30, [
        ['guest', 'That list is why it worked. Agree the joins first — then build.', CREW.haddad],
      ]),
    ], 'The forecast clears for one day. Tomorrow, the rover goes to find the lost weather station.'),
    build: {
      part: { slot: 'tool', id: 'gripper' },
      action: 'inspect',
      narration: 'Check the gripper: the download plug at the weather station must be held firmly for 3 seconds.',
      why: 'Each part of the rescue has an owner; the gripper is the “download” team’s job.',
      tryWithout: 'Without a tool to hold the plug, the rover reaches the station but brings back no data.',
      physicsEffect: 'Gripper 0.12 kg; holding the plug draws a little extra battery.',
      realWorld: 'Field robotics teams include mechanical, electrical and software engineers, technicians, data scientists, operators and safety leads.',
    },
    code: challenge({
      title: 'Your Part of the Plan',
      mission: 'Your pair owns one part of the rescue (FIND LINE, FOLLOW, or DOCK). Write it as one state that starts when state equals your number and hands on by setting the next number.',
      arena: arena(GUIDE_LINE, { requires: ['move', 'follow-line', 'see-wall'], start: { col: 1, row: 7, heading: 'up' }, features: ['The line starts 60 cm ahead.', 'The weather station dock (a wall) at the end of the line.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, DIST, ...TALK],
      example: [
        'variable_set(state, 1)  ← the team agreed: 1 find, 2 follow, 3 dock, 4 done',
        'repeat_until(compare(variable_get(state) = 4)) {',
        '  if (compare(variable_get(state) = 1)) { set_motors(25, 25); if (line_seen) { say("Line found"); variable_set(state, 2) } }',
        '  if (compare(variable_get(state) = 2)) { set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset))); if (compare(distance_cm < 30)) { variable_set(state, 3) } }',
        '  if (compare(variable_get(state) = 3)) { set_motors(15, 15); if (compare(distance_cm < 12)) { stop; say("Docked"); variable_set(state, 4) } }',
        '}',
      ],
      success: [crit('uses-blocks', 'Your state starts on its number and hands on with the agreed next number.'), crit('reach-zone', 'The team’s merged program reaches the dock.')],
      two: 'Your part says when it starts and when it hands on.',
      three: 'Your part worked first time when merged with the others.',
      hints: ['Agree the state numbers as a class first.', 'Your part only runs when state is your number.', 'At the end of your part, set state to the next number.'],
    }),
    challenge: challenge({
      title: 'Rescue Rehearsal',
      mission: 'As a team of three pairs, merge your parts into one rescue program: find the line, follow it, dock at the weather station, hold the download plug for 3 s, and say “Data secured”.',
      arena: arena(GUIDE_LINE, { requires: ['move', 'follow-line', 'see-wall', 'grab'], start: { col: 1, row: 7, heading: 'up' }, features: ['The line starts 60 cm ahead.', 'The weather station dock (a wall) at the end of the line, with a download plug 8 cm above the floor.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, DIST, GRIP_OPEN, GRIP_CLOSE, ...TALK],
      example: [
        'variable_set(state, 1)',
        'repeat_until(compare(variable_get(state) = 5)) {',
        '  … states 1–3 from the team parts …',
        '  if (compare(variable_get(state) = 4)) { grip_close; wait(3); grip_open; say("Data secured"); variable_set(state, 5) }',
        '}',
      ],
      success: [crit('action-at-zone', 'Holds the plug at the dock for 3 s.'), crit('uses-blocks', 'One program with every pair’s state, merged without renumbering.')],
      two: 'The merged program worked within two tries.',
      three: 'Every team member can explain the hand-on between two parts.',
      hints: ['Merge one part at a time and test after each.', 'If a hand-on fails, check both sides agree on the number.', 'Add a say at the start of each state to hear the hand-ons.'],
    }),
    quiz: [
      q('Three pairs each wrote one state. The merged program gets stuck after FOLLOW. What is the most likely cause?', [
        right('FOLLOW hands on with a state number the DOCK part does not use', '🔢'),
        wrong('Robots can only run one person’s code', '👤', 'teams-just-split-work'),
        wrong('The DOCK part is too short', '📏', 'teams-just-split-work'),
      ], 'Parts connect through agreements, like state numbers. If two parts disagree about the number, the program stalls at the join.'),
      q('Which of these is a real job in field robotics?', [
        right('All of them: field engineer, robot technician, data scientist, safety lead', '👥'),
        wrong('Only the programmer — the rest are not robotics jobs', '💻', 'robotics-is-only-coding'),
        wrong('Only people with a robotics degree', '🎓', 'robotics-is-only-coding'),
      ], 'Robotics needs designers, builders, technicians, operators, data people and safety specialists. Many routes lead in, including apprenticeships and technician courses.'),
      q('What makes a team’s parts fit together?', [
        right('Agreeing in advance what each part receives and hands on', '🤝'),
        wrong('Each pair working alone and merging at the end with no plan', '🧩', 'teams-just-split-work'),
        wrong('One person rewriting everyone else’s part', '✍️', 'teams-just-split-work'),
      ], 'The agreement (the interface) is what lets separate parts join. Teams that agree it first spend far less time fixing joins.'),
    ],
    badge: { id: 'l3-field-team', name: 'Field Team', icon: '🏔️', earnedFor: 'You built your part of a team mission and met the people who do this for real.' },
    reward: { note: 'Team mode: your rescue rehearsal is saved with every pair’s name on its part (first names only, class gallery).' },
    teacher: teacher({
      timing: lessonPlan(6, 'Who does what?', 'which field-robotics job would you try first, and why?'),
      warmup: {
        title: 'Who does what?',
        minutes: 6,
        steps: ['Show cards with five roles (field engineer, technician, data scientist, operator, safety lead) and five task cards (“repair a motor at −20 °C”, “check the readings”…).', 'Pairs match tasks to roles.', 'Discuss which tasks need more than one role.'],
        materials: ['Role and task cards (one set per pair)'],
      },
      discussion: ['Which skills from this season does each role use?', 'Which role would suit you, and what would you need to learn next?'],
      misconceptions: [
        mc('teams-just-split-work', 'Teamwork is just splitting the work and gluing it together at the end.', 'Teams agree how parts connect (interfaces) before building, and test each join.', 'Two groups draw halves of a picture without agreeing where the halves meet. Join them. Then repeat after agreeing three join points.'),
        mc('robotics-is-only-coding', 'Robotics jobs are only for programmers with degrees.', 'Robotics needs many roles — technicians, designers, operators, data and safety specialists — with many routes in.', 'Students interview each other as a crew member from the episode: “What do you do all day? What did you study?” Share the variety.'),
      ],
      faster: ['Write a one-paragraph “interface agreement” for the rescue: what each state needs when it starts.', 'Research a real field robot (an ocean glider, a polar rover) and list the roles on its team.'],
      slower: ['Teacher assigns parts and provides the state numbers on the board.', 'Merge two parts only (FIND + FOLLOW).'],
      notes: ['The second objective is discussion-only: use the role-matching and interviews as evidence.', 'Use first names only in the team record; nothing is shared beyond the class gallery.'],
    }),
    parent: {
      today: 'Your child met the roles in field robotics and built one part of a team rescue program that had to fit with everyone else’s.',
      tryAtHome: 'Plan a family meal as a team: who does which part, and what does each person hand on to the next?',
      askYourChild: 'Which job in the robotics team would you like to try, and why?',
    },
  }),

  // ── 24 ───────────────────────────────────────────────────────────────────
  makeSession(L, 24, {
    objectives: [
      o('Designs an autonomous rescue rover with at least three states, a fail-safe and proportional control, and tests it from several starts.', 'I can design an autonomous rescue rover that is safe even when a sensor fails.', ['engineering-design', 'programming']),
      o('Explains the design with a state diagram and says when a human should take over.', 'I can explain my rover’s states and when a human should take control.', ['communication', 'impacts-of-computing'], { concepts: ['safety-ethics', 'design-process'] }),
    ],
    episode: episode('Whiteout Rescue', 'The crew rehearsed the rescue as a team, each part fitting into the next.', [
      scene('Dawn. A clear sky, but the whiteout will be back by noon. The remote weather station is out there, buried.', 'The whole crew watches the rover roll out alone.', 55, [
        ['guest', 'No remote driving today — the link is too weak. Your rover has to find the station, get the data and come home. By itself. Safely.', CREW.owusu],
        ['spark', 'Everything you’ve built this season, in one rover: memory, maths, feedback, states, landmarks, fail-safes, honesty.'],
      ]),
      scene('The control hut. A big screen shows the rover’s state as it changes: SEARCH… FOLLOW… DOCK… DOWNLOAD… RETURN.', 'Snow begins to fall again.', 50, [
        ['myrobot', 'If my sensors fail, I stop and call. If they work, I bring the data home.'],
      ]),
    ], 'The data comes home. Then a message arrives from a desert research base, preparing a Mars rehearsal: “We hear you build good rovers.”'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'choose',
      narration: 'Choose the head for the rescue: Distance Eyes (precise ranging) or the Camera Eye (distance and colour). Justify it.',
      why: 'The best head depends on what your design needs most — exact distances in the whiteout, or colour markers too.',
      tryWithout: 'With no head sensor, the rover cannot find the dock or notice a drift ahead.',
      physicsEffect: 'Distance Eyes: steadier ranging in snow. Camera Eye: adds colour, slightly noisier distance, useless beyond 1 m in the whiteout.',
      realWorld: 'Polar and planetary rover teams choose sensors for the worst conditions the mission expects, not the best.',
    },
    code: challenge({
      title: 'State Diagram First',
      mission: 'Draw your rescue rover’s state diagram (at least three states, plus a SAFE STOP). Then code the first two states and test them from two starts.',
      arena: WHITEOUT,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, DIST, TIMER, HEADING, ...TALK],
      example: [
        'variable_set(state, 1)  ← 1 search, 2 follow, 3 dock, 9 safe stop',
        'repeat_until(compare(variable_get(state) > 2)) {',
        '  if (compare(variable_get(state) = 1)) { set_motors(25, 25); if (line_seen) { variable_set(state, 2) } }',
        '  if (compare(variable_get(state) = 2)) { set_motors(math(40 + math(35 × line_offset)), math(40 − math(35 × line_offset))); if (compare(distance_cm < 30)) { variable_set(state, 3) } }',
        '  if (compare(timer_s > 60)) { variable_set(state, 9) }',
        '}',
        'stop',
      ],
      success: [crit('uses-blocks', 'A state variable with at least three states including a safe stop.'), crit('reach-zone', 'Reaches the dock approach from two starts.')],
      two: 'Your diagram and code use the same state numbers.',
      three: 'You tested each state on its own before joining them.',
      hints: ['Diagram first: bubbles and arrows with events.', 'Code one state, test it, then the next.', 'Every state needs a way to the SAFE STOP.'],
    }),
    challenge: challenge({
      title: 'Whiteout Rescue Rover',
      mission: 'Your design: an autonomous rover that finds the buried guide line, follows it to the remote weather station, docks, downloads (hold the plug 3 s) and returns — from three random starts, with at least one fail-safe that you prove by covering a sensor.',
      arena: WHITEOUT,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, LINE_SEEN, LINE_OFFSET, DIST, TIMER, HEADING, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, ...TALK],
      example: [
        'variable_set(state, 1)',
        'repeat_until(or(compare(variable_get(state) = 6), compare(variable_get(state) = 9))) {',
        '  … 1 search · 2 follow (proportional) · 3 dock (slow approach) · 4 download (grip 3 s) · 5 return (follow back) …',
        '  … fail-safes: lost line > 2 s, no echo > 1 s while docking, timer > 90 s → state 9 …',
        '}',
        'if (compare(variable_get(state) = 9)) { stop; say("Safe stop: human needed") } else { say("Data home") }',
      ],
      success: [crit('action-at-zone', 'Docks and downloads from three random starts.'), crit('uses-blocks', 'At least three states, proportional control and one fail-safe.'), crit('touch-and-react', 'When a sensor is covered, the rover enters its safe stop and says why.')],
      two: 'Your state diagram matches your final program (checked by your teacher).',
      three: 'You can say exactly when a human should take over your rover.',
      hints: ['Start from your Session 23 team program.', 'Add fail-safes as transitions to a SAFE STOP state.', 'Test with the fault buttons, one fault at a time.'],
    }),
    quiz: [
      q('Your rescue rover works from start A but not from start B. What should you do?', [
        right('Replay run B, find where it went wrong, fix that state, and retest from A, B and C', '🔁'),
        wrong('Only test from start A from now on', '🙈', 'one-case-is-enough'),
        wrong('Rewrite the whole program', '🗑️', 'restart-on-failure'),
      ], 'A design must work in the cases it will meet. Use the failing case as evidence, fix the part that failed, and test every case again.'),
      q('Why does every state in your diagram need an arrow to SAFE STOP?', [
        right('A fault can happen in any state, and the robot must be able to stop safely from all of them', '🛑'),
        wrong('So the diagram looks complete', '🎨', 'fail-safe-only-at-start'),
        wrong('It doesn’t: one check at the start of the mission is enough', '1️⃣', 'fail-safe-only-at-start'),
      ], 'Sensors can fail at any moment — while searching, following or docking. Each state needs its way to a safe stop.'),
      q('Which statement best describes your autonomous rover?', [
        right('It decides by itself, but a human can always stop it and it calls for help when unsure', '🤝'),
        wrong('It never needs a human because it is autonomous', '🤖', 'robots-never-wrong'),
        wrong('It is not really autonomous if a human can stop it', '🙅', 'autonomy-all-or-nothing'),
      ], 'Autonomy and human oversight work together. A well-designed autonomous robot acts by itself and still hands control to people when it should.'),
    ],
    badge: { id: 'l3-whiteout-rescue', name: 'Whiteout Rescuer', icon: '🆘', earnedFor: 'You designed an autonomous rescue rover that works from several starts and stops safely when a sensor fails.' },
    reward: { note: 'Level 3 complete: the Inventor certificate is ready (with your gain log and state diagram).' },
    teacher: teacher({
      timing: projectPlan(4, 'Fault drill (pairs predict what their rover does if each sensor fails, one at a time)'),
      warmup: {
        title: 'Fault drill',
        minutes: 4,
        steps: ['Pairs list each sensor on their rover.', 'For each: “If this fails, our rover will…”', 'Circle any sensor whose failure the design does not handle yet.'],
        materials: ['Paper, pencils'],
      },
      discussion: ['What did your rover do when you covered a sensor? Was that safe enough?', 'When should a human take over from your rover?'],
      misconceptions: [
        mc('one-case-is-enough', 'One successful run proves the program works.', 'You need several different cases, especially extremes, to trust a design.', 'Pairs list every combination of 3 huts (8 cases). Which 3 would they test if they could test only 3? Discuss why “none” and “all” are good choices.'),
        mc('restart-on-failure', 'When a design fails, start again or just rerun it.', 'Use the failure as evidence: locate it, change one thing, retest.', 'Show a replay where the core drops at the second rock. Pairs list three possible causes and design one test for each.'),
        mc('fail-safe-only-at-start', 'A safety check at the start of a mission is enough.', 'Faults can happen at any time; every state needs a path to a safe stop.', 'Walk through the state diagram with a “fault card” played at a random state. Can the rover reach SAFE STOP from there? Add missing arrows.'),
        mc('robots-never-wrong', 'Autonomous robots do not make mistakes, so humans need not intervene.', 'Robots fail in situations they were not designed or tested for; humans must be able to stop or take over.', 'Show three short cases (a robot vacuum stuck under a sofa, a car confused by snow, a chatbot giving a wrong fact). Ask what a human could have done.'),
        mc('autonomy-all-or-nothing', 'A robot is either fully controlled by a human or fully autonomous.', 'There is a range; shared control splits decisions between human and robot.', 'Draw a line from “human does everything” to “robot does everything”. Students place a car with cruise control, a robot vacuum, a drone with return-home and a surgical robot on it.'),
      ],
      faster: ['Add a landmark fix on the way back and report the drift corrected.', 'Make the rover report an honest summary of the trip (time, faults met, readings kept).'],
      slower: ['Three states (search, follow, dock) plus one fail-safe meet the brief.', 'Use the Session 23 team program as the starting point.'],
      notes: ['Certificate criteria (levels.ts): the four projects meeting their constraints, the Session 8 gain log, and a state diagram that matches the final program, checked by the teacher.', 'Self-checks are reflection only and never gate the certificate.'],
    }),
    parent: {
      today: 'Your child finished Level 3 by designing an autonomous rescue rover that finds a lost weather station and stops safely if a sensor fails.',
      tryAtHome: 'Ask your child to draw their rover’s state diagram and walk you through it. Where would they want a human to step in?',
      askYourChild: 'What does your rover do if one of its sensors stops working?',
    },
  }),
]
