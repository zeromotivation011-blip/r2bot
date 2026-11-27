// lib/kids/curriculum/level4/act4.ts
// Level 4, Act 4 (sessions 19–24): "Dust Storm".
// Noise and filters (and their cost: delay), a simple safety case, the ethics
// of autonomy (accountability, privacy, dual use, sensing bias), pathways and
// a portfolio, a structured design review, and the capstone: Mission Red
// Valley.

import type { Session } from '../types'
import { CREW, DOCK_BAY, DUST, HABITAT, RED_VALLEY } from './shared'
import {
  BUMPED, DIST, FLOOR_COLOR, GRIP_CLOSE, GRIP_OPEN, HEADING, LIGHT_OFF, LIGHT_ON, LINE_OFFSET, LINE_SEEN, LOGIC, MOVE, TALK, TIMER, VARS_MATH,
} from '../level3/shared'
import { arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong } from '../level3/kit'

const L = 4 as const

export const ACT4: Session[] = [
  // ── 19 ───────────────────────────────────────────────────────────────────
  makeSession(L, 19, {
    objectives: [
      o('Reduces sensor noise with a moving average or an exponential filter built from variables, and measures the improvement.', 'I can filter noisy sensor readings with a program.', ['programming', 'data']),
      o('Measures and explains the cost of filtering: a smoother signal that reacts later (delay).', 'I can explain why filtering makes a robot react later.', ['data', 'science-forces'], { concepts: ['sensors', 'data'] }),
    ],
    episode: episode('Static in the Storm', 'The rover fetched its sample even with faults injected.', [
      scene('The dust storm arrives: the sky turns orange, then brown. Dust streams past the habitat windows.', 'On screen, the rover’s distance reading jitters: 48, 41, 52, 39, 120, 45…', 60, [
        ['guest', 'The dust scatters the beam. Every reading is a little wrong, and some are very wrong. Your docking controller is twitching like a nervous cat.', CREW.mehta],
        ['myrobot', 'So I shouldn’t trust any single reading.'],
      ]),
      scene('Spark plots raw readings as grey dots and an orange line through them: the filtered value.', 'The orange line is smooth — but when the rover really moves closer, it lags behind.', 75, [
        ['spark', 'Average the last four readings, or blend each new reading into your estimate: estimate = estimate + 0.3 × (reading − estimate). The noise shrinks.'],
        ['myrobot', 'But the smooth line is late. When the wall really comes closer, my filter takes a moment to believe it.'],
        ['spark', 'That’s the price of every filter: smoothness costs delay. Engineers choose how much of each they can afford.'],
        ['guest', 'And spikes? A median throws them away. Pick the tool for the noise you have.', CREW.mehta],
      ]),
      scene('The charging bay in the storm. The filtered rover rolls in and stops at 20 centimetres, smooth as glass.', 'Arjun compares the raw and filtered graphs.', 30, [
        ['guest', 'Twitchy in, calm out. And you know exactly how late it reacts. Good engineering.', CREW.mehta],
      ]),
    ], 'Diego, at the airlock: “The storm will last days. Before the rover goes out, I need to know it’s safe — and I need evidence.”'),
    build: {
      part: { slot: 'head', id: 'camera' },
      action: 'inspect',
      narration: 'Look at the camera’s distance reading in the storm: every value is a little wrong. The filter lives in software.',
      why: 'You cannot fix the dust, but you can process the readings so the controller sees something steadier.',
      tryWithout: 'Unfiltered, the docking controller jerks on every noisy reading and stops at random distances.',
      physicsEffect: 'Dust adds up to ±8 cm of noise per reading and an occasional spike.',
      realWorld: 'Phones smooth their motion sensors, drones filter their gyros, and self-driving cars combine filtered readings from many sensors (Kalman filters).',
    },
    code: challenge({
      title: 'Average of Four',
      mission: 'Keep the last four distance readings in r1–r4 (shifting them each loop) and drive towards the wall using their average; stop when the average is under 20 cm.',
      arena: DUST,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER, ...TALK],
      example: [
        'variable_set(r1, distance_cm); variable_set(r2, variable_get(r1)); variable_set(r3, variable_get(r1)); variable_set(r4, variable_get(r1))',
        'repeat_until(compare(variable_get(avg) < 20)) {',
        '  variable_set(r4, variable_get(r3)); variable_set(r3, variable_get(r2)); variable_set(r2, variable_get(r1)); variable_set(r1, distance_cm)',
        '  variable_set(avg, math(math(math(variable_get(r1) + variable_get(r2)) + math(variable_get(r3) + variable_get(r4))) ÷ 4))',
        '  set_motors(20, 20); wait(0.05)',
        '}',
        'stop; say(variable_get(avg))',
      ],
      success: [crit('stop-in-zone', 'Stops 17–23 cm from the wall.'), crit('uses-blocks', 'Uses a four-reading moving average.')],
      two: 'You compared the stopping spread with and without the filter over five runs.',
      three: 'You explained why the shift goes r4 ← r3 first, not r1 first.',
      hints: ['Shift the old readings along before reading a new one.', 'Average = sum of four ÷ 4.', 'Start all four with the first reading so the average is sensible at once.'],
    }),
    challenge: challenge({
      title: 'Smooth, but Not Too Late',
      mission: 'Build an exponential filter (est = est + k × (reading − est)). Try k = 0.1, 0.3 and 0.7: for each, record the stopping error over three runs AND how late the filter reacts when the wall really moves (a step test). Choose k with evidence.',
      arena: arena(DUST, { features: ['Dust noise ±8 cm and spikes.', 'Step test: the bay door slides 30 cm closer at 5 s.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER, ...TALK],
      example: [
        'variable_set(k, 0.3); variable_set(est, distance_cm)',
        'repeat_until(compare(variable_get(est) < 20)) {',
        '  variable_set(est, math(variable_get(est) + math(variable_get(k) × math(distance_cm − variable_get(est)))))',
        '  set_motors(20, 20); wait(0.05)',
        '}',
        'stop; say(variable_get(est)); say(timer_s)',
      ],
      success: [crit('stop-in-zone', 'With the chosen k, stops 17–23 cm from the wall in three of three runs.'), crit('uses-blocks', 'A log of three k values with stopping error and reaction delay.')],
      two: 'Your log shows the trade-off: smaller k is smoother but slower to react.',
      three: 'You added a spike guard (ignore a reading more than 40 cm from the estimate) and showed it helps.',
      hints: ['k near 1 trusts the new reading; k near 0 trusts the old estimate.', 'Measure both smoothness and lag for each k.', 'Choose the k that meets the stopping spec with the least lag.'],
    }),
    quiz: [
      q('What is the main cost of a strong filter (small k, or a long average)?', [
        right('It reacts later to real changes', '⏳'),
        wrong('There is no cost: smoother is always better', '🆓', 'filters-are-free'),
        wrong('It makes the readings noisier', '📶', 'filters-are-free'),
      ], 'A filter smooths by trusting older readings; that same memory delays its response when the world really changes.'),
      q('One reading in twenty is a wild spike (120 cm when the wall is at 40). Which filter handles that best?', [
        right('A median of the last three readings', '🎯'),
        wrong('The plain average of the last two', '➗', 'average-removes-spikes'),
        wrong('No filter: spikes are too rare to matter', '🙈', 'average-removes-spikes'),
      ], 'An average spreads a spike into its neighbours; a median throws the extreme value away. Choose the filter for the kind of noise you have.'),
      q('With est = est + k × (reading − est), what does k = 1 do?', [
        right('No filtering: the estimate jumps straight to each new reading', '1️⃣'),
        wrong('Maximum smoothing', '🧈', 'k-backwards'),
        wrong('Freezes the estimate', '🧊', 'k-backwards'),
      ], 'With k = 1, est = reading every time. k = 0 would freeze the estimate. Useful values sit in between.'),
    ],
    badge: { id: 'l4-filter', name: 'Noise Filter', icon: '🌪️', earnedFor: 'You filtered noisy sensor readings and measured the trade-off between smoothness and delay.' },
    reward: { note: 'Filter graph: raw and filtered readings now plot together in every run.' },
    teacher: teacher({
      timing: lessonPlan(5, 'The noisy ruler', 'what does a filter give you, and what does it cost?'),
      warmup: {
        title: 'The noisy ruler',
        minutes: 5,
        steps: ['Five students each measure the same desk with a ruler but must call out instantly (rushed, noisy readings).', 'Average the five; then take the middle one (median). Compare with a careful measurement.', 'Now the desk is “moved” (use a second desk): how many new readings until the average catches up?'],
        materials: ['Rulers', 'Two desks of different length'],
      },
      discussion: ['Where do you meet filtering in everyday tech? (Phone step counters, noise-cancelling headphones, weather averages.)', 'When would a robot rather react fast and noisily than smoothly and late?'],
      misconceptions: [
        mc('filters-are-free', 'Filtering makes a signal better with no downside.', 'Filtering trades noise for delay (and can hide real changes); the amount is a design choice.', 'Plot a step change with three filters on the board. Students mark when each line “believes” the step. Discuss which a docking robot can afford.'),
        mc('average-removes-spikes', 'Averaging removes spikes.', 'An average spreads a spike across several outputs; a median (or a spike guard) removes it.', 'Readings 40, 41, 120, 39, 40: compute the running average and the running median of three. Which output is closer to the truth?'),
        mc('k-backwards', 'A bigger k means more smoothing.', 'In est = est + k(reading − est), bigger k trusts new readings more (less smoothing); smaller k smooths more.', 'Fill a table for k = 0.1 and 0.9 with readings 40, 40, 70, 70. Which estimate jumps to 70 faster?'),
      ],
      faster: ['Implement the median of three with compare blocks and add it before the exponential filter.', 'Measure the filter’s delay in seconds for each k and plot delay against k.'],
      slower: ['Do the four-reading average only.', 'Compare two k values (0.2 and 0.8).'],
      notes: ['Name the Kalman filter as where this leads: a filter that chooses k from how noisy each source is.'],
    }),
    parent: {
      today: 'Your teen filtered noisy sensor readings in a simulated dust storm and measured the trade-off: smoother readings arrive later.',
      tryAtHome: 'Watch a phone’s step counter or a fitness app’s heart rate. Talk about why the number lags a little behind what you are doing.',
      askYourChild: 'What does a filter cost a robot?',
    },
  }),

  // ── 20 ───────────────────────────────────────────────────────────────────
  makeSession(L, 20, {
    objectives: [
      o('Builds a simple safety case: hazards, causes, mitigations and evidence for each mitigation (a test result).', 'I can write a safety case that backs every claim with evidence.', ['engineering-design', 'impacts-of-computing']),
      o('Implements and tests at least two mitigations in code and records the evidence.', 'I can build safety features and test that they work.', ['programming', 'debugging'], { concepts: ['safety-ethics', 'design-process'] }),
    ],
    episode: episode('Prove It’s Safe', 'The rover learned to filter noisy readings in the storm.', [
      scene('The airlock control room. Diego holds a clipboard with one word at the top: HAZARDS.', 'The storm rattles the domes.', 60, [
        ['guest', 'I don’t want “it’s safe”. I want: what could go wrong, why, what you’ve done about it — and the test that proves the fix works.', CREW.ramirez],
        ['myrobot', 'Hazard: the rover hits a crew member. Cause: it can’t see them in the dust. Mitigation: slow near anything within 80 centimetres and stop at 40. Evidence: ten runs with crew crossing.'],
        ['guest', 'That’s a safety case. Now do it for every hazard that matters.', CREW.ramirez],
      ]),
      scene('A table on the wall fills in, row by row. Some evidence cells stay empty — and turn red.', 'Diego taps a red cell.', 60, [
        ['guest', 'Empty evidence means an unproven claim. Either test it, or say honestly it’s not proven yet.', CREW.ramirez],
        ['spark', 'A safety case is an argument: claims, supported by evidence, that a reviewer can check.'],
      ]),
      scene('The airlock. Diego reads the finished safety case: two rows green with evidence, two marked “not yet proven” with a planned test.', 'He signs it.', 30, [
        ['guest', 'Honest gaps and real evidence. That’s a case I can sign.', CREW.ramirez],
      ]),
    ], 'In the mess hall, the crew argue: “If the rover does hurt someone — who is to blame?”'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'inspect',
      narration: 'The line sensor keeps the rover on the marked track through the yard: staying on the track is a mitigation too.',
      why: 'Every sensor can serve safety: the line keeps the rover where people expect it.',
      tryWithout: 'Off the marked track, people cannot predict where the rover will go.',
      physicsEffect: 'No change. The yard has a marked rover track (a line) and a crew walkway that crosses it.',
      realWorld: 'Safety cases are required for trains, aircraft, medical devices and increasingly for autonomous vehicles and robots.',
    },
    code: challenge({
      title: 'Mitigation and Evidence',
      mission: 'Implement one mitigation — stay on the marked track and stop if anything is within 40 cm — and collect evidence: five runs with crew crossing, logging the closest approach each time.',
      arena: arena(HABITAT, { requires: ['move', 'see-wall', 'follow-line'], features: ['A marked rover track (line) from the bay to the greenhouse.', 'Crew cross the track at random times.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, LINE_SEEN, LINE_OFFSET, TIMER, ...TALK],
      example: [
        'variable_set(closest, 200)',
        'repeat_until(compare(timer_s > 25)) {',
        '  if (compare(distance_cm < variable_get(closest))) { variable_set(closest, distance_cm) }',
        '  if_else(compare(distance_cm < 40)) { stop } else { set_motors(math(35 + math(30 × line_offset)), math(35 − math(30 × line_offset))) }',
        '}',
        'stop; say(variable_get(closest))',
      ],
      success: [crit('no-collision', 'Never within 40 cm of a crew member while moving, in five runs.'), crit('uses-blocks', 'Logs the closest approach for each run.')],
      two: 'Your evidence table has all five runs.',
      three: 'You found the worst-case run and explained it.',
      hints: ['Track the smallest distance seen.', 'Stop has priority over following.', 'Five runs, five numbers: that is your evidence.'],
    }),
    challenge: challenge({
      title: 'A Simple Safety Case',
      mission: 'Write a safety case for your capstone rover with at least four hazards (people, collisions, lost sensing, the battery running flat). For two of them, implement the mitigation and attach test evidence from the simulator. Mark any unproven claim honestly.',
      arena: arena(HABITAT, { requires: ['move', 'see-wall', 'follow-line'], features: ['Marked rover track; crew crossings; a blind-sensor fault on request.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, LINE_SEEN, LINE_OFFSET, HEADING, TIMER, ...TALK],
      example: [
        '(safety case) H1 hits a person → slow < 80 cm, stop < 40 cm → 10 runs, closest 46 cm ✔',
        'H2 continues blind → blind > 1 s → safe stop → 5 injected faults, 5 stops ✔',
        'H3 hits a rock → avoid layer → NOT YET PROVEN (planned test: 10 runs on the valley floor)',
        'H4 battery flat → return when below budget → NOT YET PROVEN',
      ],
      success: [crit('uses-blocks', 'Two mitigations implemented and evidenced by simulator runs.'), crit('uses-blocks', 'Four hazards listed with cause, mitigation and evidence (or an honest “not yet proven”).')],
      two: 'Every evidence cell points to a specific test or says “not yet proven”.',
      three: 'A classmate reviewed your case and you answered one challenge with new evidence.',
      hints: ['Hazard → cause → mitigation → evidence, one row each.', 'Reuse your test plans from Sessions 14 and 18.', 'An honest gap is better than an unproven claim.'],
    }),
    quiz: [
      q('Which is a proper safety-case row?', [
        right('Hazard: hits a person · Cause: can’t see them in dust · Mitigation: stop < 40 cm · Evidence: 10 runs, closest 46 cm', '📋'),
        wrong('Hazard: none, the rover is safe', '✅', 'safe-by-assertion'),
        wrong('Mitigation: be careful', '🙏', 'safe-by-assertion'),
      ], 'Each row links a specific hazard and cause to a specific mitigation and to evidence a reviewer can check.'),
      q('One hazard has a mitigation but no test yet. What should the safety case say?', [
        right('“Not yet proven” — and the planned test', '🟡'),
        wrong('Leave it out so the case looks complete', '🙈', 'hide-bad-data'),
        wrong('Mark it proven: the mitigation obviously works', '✔️', 'safe-by-assertion'),
      ], 'A safety case is only as strong as its evidence. Honest gaps tell reviewers where the remaining risk is.'),
      q('Why does a safety case need evidence, not just a design?', [
        right('Designs can have bugs; tests show the mitigation actually works', '🔬'),
        wrong('Evidence is only paperwork for inspectors', '🗂️', 'command-equals-result'),
        wrong('If the code has a safety check, it must work', '💻', 'command-equals-result'),
      ], 'Writing a safety check is a command; a test shows the result. Evidence turns “we designed it” into “we know it works”.'),
    ],
    badge: { id: 'l4-safety-case', name: 'Safety Case', icon: '🦺', earnedFor: 'You argued for your rover’s safety with hazards, mitigations and evidence.' },
    reward: { note: 'Safety-case template added to your portfolio tools.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Hazards in the classroom', 'what turns a safety claim into a safety case?'),
      warmup: {
        title: 'Hazards in the classroom',
        minutes: 6,
        steps: ['Pairs list two hazards in the classroom (a trailing cable, a wet floor).', 'For each: cause, mitigation, and what evidence would show the mitigation works.', 'Share one; the class asks “how do you know?”.'],
        materials: ['Paper'],
      },
      discussion: ['Who should review a robot’s safety case — the team who built it, or someone independent? Why?', 'Is “not yet proven” a failure, or honesty?'],
      misconceptions: [
        mc('safe-by-assertion', 'Saying a system is safe (or being careful) makes it safe.', 'Safety is argued with specific hazards, mitigations and evidence that can be checked.', 'Two claims on the board: “Our rover is safe” vs one evidenced row. Pairs list the questions a reviewer would ask of each.'),
        mc('hide-bad-data', 'It is fine to drop bad data without saying so.', 'Honest reports state what was excluded and why, so others can judge how reliable the result is.', 'Give two reports of the same experiment, one transparent and one silent. Pairs act as reviewers: which would they sign off, and what would they ask?'),
        mc('command-equals-result', 'If the robot was told to do something, it did it.', 'A command is not a result; robots must check with sensors that the action actually happened.', 'Ask a student to “close the door” while another quietly holds it open. Did the command succeed? How would you check?'),
      ],
      faster: ['Rate each hazard by severity and likelihood (a risk matrix) and order the work by it.', 'Add an independent reviewer’s signature line and swap cases between pairs.'],
      slower: ['Two hazards, one with evidence.', 'Provide the table with headings and one completed row.'],
      notes: ['Robot Safety Inspector (Legend tier) is the playable challenge: find every hazard across four settings with the Harm Check.'],
    }),
    parent: {
      today: 'Your teen wrote a safety case for their rover: listing hazards, building mitigations and attaching test evidence — the way trains and aircraft are approved.',
      tryAtHome: 'Pick one hazard at home (a hot pan handle, a loose rug) and write its safety-case row together: cause, mitigation, evidence.',
      askYourChild: 'What’s the difference between saying your rover is safe and showing it?',
    },
  }),

  // ── 21 ───────────────────────────────────────────────────────────────────
  makeSession(L, 21, {
    objectives: [
      o('Implements a privacy rule: the rover pauses camera logging in the crew zone and announces it, and logs only what the mission needs.', 'I can build a privacy rule into my robot.', ['programming', 'impacts-of-computing']),
      o('Debates accountability, privacy, dual use and sensing bias using real-world cases, and reaches a reasoned position.', 'I can argue a position on the ethics of autonomous robots with reasons.', ['impacts-of-computing', 'communication'], { concepts: ['safety-ethics'], discussionOnly: true }),
    ],
    episode: episode('Who Is Responsible?', 'The engineer built a safety case backed by evidence.', [
      scene('The mess hall, storm outside. The crew around a table, mugs of tea.', 'A tablet shows a news-style headline: “DELIVERY ROBOT BLOCKS WHEELCHAIR USER ON PAVEMENT”.', 70, [
        ['guest', 'If our rover hurt someone, who would be responsible? Not the rover — it can’t be. The people who designed it, tested it, approved it, ran it.', CREW.adeyemi],
        ['guest', 'And what about the camera? It sees us every day. Should it keep that footage?', CREW.petrova],
        ['myrobot', 'I only need to see rocks and samples. I don’t need to remember faces.'],
      ]),
      scene('Four cards on the table: ACCOUNTABILITY · PRIVACY · DUAL USE · BIAS.', 'Each crew member takes one and argues it.', 65, [
        ['guest', 'Dual use: the same navigation that finds a sample can guide something harmful. Engineers have to think about where their work goes.', CREW.kim],
        ['guest', 'Bias: studies have found some person detectors miss some groups of people more often than others — often because of unbalanced training data. A rover that sees some people less well is a safety problem.', CREW.ramirez],
        ['spark', 'Ethics isn’t a separate subject from engineering. It’s part of the design.'],
      ]),
      scene('The habitat yard. The rover crosses the crew zone; its screen says “Recording paused”.', 'Dr Petrova walks past and waves at it.', 30, [
        ['guest', 'I like knowing what it keeps — and that it doesn’t keep me.', CREW.petrova],
      ]),
    ], 'The storm eases. Commander Adeyemi: “Six sols left. Time to think about what comes after Red Valley — for the rover, and for you.”'),
    build: {
      part: { slot: 'head', id: 'camera' },
      action: 'inspect',
      narration: 'Look at the camera: it can see people as well as rocks. What it records is a design decision.',
      why: 'Collect only what the mission needs: that protects people and reduces risk if data leaks.',
      tryWithout: 'A rover that records everything all the time builds a detailed record of people who never agreed to it.',
      physicsEffect: 'No change. The crew zone is marked yellow on the yard floor.',
      realWorld: 'Privacy laws in many countries (such as the EU’s GDPR) require data minimisation; some robots blur faces or switch off recording near people.',
    },
    code: challenge({
      title: 'Privacy Pause',
      mission: 'Drive the marked track through the yard. In the yellow crew zone, stop counting camera “frames” (a variable that stands for recording), say “Recording paused”, and resume afterwards. Report frames recorded.',
      arena: arena(HABITAT, { requires: ['move', 'see-wall', 'see-color', 'follow-line'], features: ['Marked rover track through the yard.', 'Yellow crew zone across the middle.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, LINE_SEEN, LINE_OFFSET, TIMER, ...TALK],
      example: [
        'variable_set(frames, 0); variable_set(paused, 0)',
        'repeat_until(compare(timer_s > 25)) {',
        '  if_else(compare(floor_color = yellow)) { if (compare(variable_get(paused) = 0)) { say("Recording paused"); variable_set(paused, 1) } } else { variable_set(paused, 0); variable_change(frames, 1) }',
        '  if_else(compare(distance_cm < 40)) { stop } else { set_motors(math(35 + math(30 × line_offset)), math(35 − math(30 × line_offset))) }',
        '}',
        'stop; say(variable_get(frames))',
      ],
      success: [crit('uses-blocks', 'No frames counted while in the yellow zone; announces the pause once per entry.'), crit('no-collision', 'Keeps the people rules from Session 17.')],
      two: 'Your rover announces when recording resumes too.',
      three: 'You wrote one sentence on what your rover should never record.',
      hints: ['Yellow floor = crew zone.', 'Only count frames outside the zone.', 'Say it once on entering, not every loop.'],
    }),
    challenge: challenge({
      title: 'The Ethics Brief',
      mission: 'Run your privacy-pause rover through the yard, then write a one-page ethics brief for your capstone: who is accountable, what data is collected and why, one dual-use risk, and one bias risk with a mitigation. Present it in the class debate.',
      arena: arena(HABITAT, { requires: ['move', 'see-wall', 'see-color', 'follow-line'], features: ['Marked rover track; yellow crew zone; crew crossings.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, LINE_SEEN, LINE_OFFSET, HEADING, TIMER, ...TALK],
      example: [
        '… the privacy-pause program …',
        '(brief) Accountable: our team (design and tests) and the station (operation). Data: obstacle distances and sample photos only; no recording in crew zones; deleted after the mission. Dual use: navigation code could guide harmful machines — we publish only the safety parts. Bias: a person detector trained on few people in suits might miss some crew — test with every crew member and slow down when unsure.',
      ],
      success: [crit('uses-blocks', 'The privacy pause works on three runs.'), crit('uses-blocks', 'A brief covering accountability, data, dual use and bias, presented in the debate (teacher checks).')],
      two: 'Each part of your brief names a specific person, data item or risk — no vague statements.',
      three: 'You changed your position on one point after hearing another argument, and said why.',
      hints: ['Who designed, tested, approved and runs the rover?', 'Data minimisation: collect only what the mission needs.', 'For bias: who might the sensors work less well for?'],
    }),
    quiz: [
      q('An autonomous rover injures someone. Who can be held responsible?', [
        right('People: the designers, testers, approvers and operators, depending on what went wrong', '👥'),
        wrong('The rover itself', '🤖', 'robot-is-responsible'),
        wrong('No one: it was autonomous', '🤷', 'robot-is-responsible'),
      ], 'Machines cannot be held morally or legally responsible; the people and organisations who built, approved and deployed them can. Autonomy shifts where decisions are made, not who answers for them.'),
      q('What does “data minimisation” mean for a rover with a camera?', [
        right('Collect and keep only the data the mission needs', '📉'),
        wrong('Compress the video so it takes less space', '🗜️', 'more-data-is-better'),
        wrong('Record everything in case it is useful later', '🎥', 'more-data-is-better'),
      ], 'Minimisation is about what you collect, not file size. Less unnecessary data means less risk to people if it is misused or leaked.'),
      q('A person detector was tested mostly on people of one height and build. What is the risk?', [
        right('It may miss other people more often — a safety and fairness problem', '⚠️'),
        wrong('None: a detector works the same on everyone', '✅', 'sensors-are-neutral'),
        wrong('Only that it runs a little slower', '🐢', 'sensors-are-neutral'),
      ], 'Systems learn and are tuned on the data they see. Studies have found real detectors performing worse for some groups; the fix is broader testing and data, plus cautious behaviour when unsure.'),
    ],
    badge: { id: 'l4-ethics', name: 'Responsible Engineer', icon: '⚖️', earnedFor: 'You built privacy into your rover and argued the ethics of autonomy with reasons.' },
    reward: { note: 'Ethics brief template added to your portfolio tools.' },
    teacher: teacher({
      timing: lessonPlan(7, 'Four corners', 'who is responsible when an autonomous robot causes harm?'),
      warmup: {
        title: 'Four corners',
        minutes: 7,
        steps: ['Label four corners: ACCOUNTABILITY, PRIVACY, DUAL USE, BIAS.', 'Read a short scenario for each (a pavement delivery robot, a home robot with a camera, a mapping drone, a person detector).', 'Students go to the corner they think matters most for that case and give one reason.'],
        materials: ['Four corner signs', 'Four short scenario cards'],
      },
      discussion: ['Should robots that work near people be allowed to record video? Under what rules?', 'Is an engineer responsible for how others use their work?'],
      misconceptions: [
        mc('robot-is-responsible', 'An autonomous robot is responsible for what it does.', 'Responsibility lies with people and organisations — designers, testers, approvers, operators — not the machine.', 'Map the chain of decisions behind a rover on a timeline (design, test, approve, deploy, operate). Students mark who could have prevented a failure at each step.'),
        mc('more-data-is-better', 'Collecting more data is always better.', 'Unneeded data creates privacy risk; collect and keep only what the purpose requires.', 'Pairs list what a delivery robot’s camera could record. Cross out everything not needed to deliver safely. Discuss what is left.'),
        mc('sensors-are-neutral', 'Sensors and detectors work equally well for everyone.', 'Performance depends on design and training data; systems can work worse for some groups unless tested broadly.', 'Show a made-up detector test table with uneven results by group. Pairs propose two fixes (more varied data, more cautious behaviour when uncertain).'),
      ],
      faster: ['Research one real regulation or standard for robots or AI in your region and summarise it in three lines.', 'Write the rover’s data policy: what, why, how long, who can see it.'],
      slower: ['Focus on accountability and privacy; dual use and bias as a class discussion.', 'Provide sentence starters for the brief.'],
      notes: ['The second objective is discussion-only: use the debate and briefs as evidence.', 'Set ground rules: argue ideas, not people; nobody has to share personal views on sensitive topics.'],
    }),
    parent: {
      today: 'Your teen built a privacy rule into their rover and debated who is responsible when autonomous robots cause harm, privacy, dual use and bias.',
      tryAtHome: 'Talk about a camera or smart device at home: what does it record, who can see it, and how long is it kept?',
      askYourChild: 'If a robot causes harm, who should be responsible — and why not the robot?',
    },
  }),

  // ── 22 ───────────────────────────────────────────────────────────────────
  makeSession(L, 22, {
    objectives: [
      o('Maps their season’s skills onto robotics roles and routes into them (university, apprenticeships, technician courses, self-directed projects).', 'I can map my skills onto robotics jobs and the routes into them.', ['communication'], { concepts: ['careers'], discussionOnly: true }),
      o('Produces a portfolio page with a re-run of their best controller, its logged results and a one-paragraph reflection (no personal data).', 'I can make a portfolio page that shows my best work with evidence.', ['communication', 'data']),
    ],
    episode: episode('Pathways', 'The crew debated the ethics of autonomy through the storm.', [
      scene('The habitat lounge. The storm has passed; red dust coats the windows.', 'Each crew member draws their path to Red Valley on a whiteboard — no two the same.', 75, [
        ['guest', 'I started as a mechanic’s apprentice. Then a technician diploma. Then systems engineering at night school.', CREW.kim],
        ['guest', 'University, physics, then rocks. Lots of rocks.', CREW.petrova],
        ['guest', 'I built robots in a school club, put the code online, and someone noticed.', CREW.mehta],
        ['guest', 'I was a firefighter first. Safety work found me.', CREW.ramirez],
      ]),
      scene('The engineer’s portfolio page on screen: a docking log, a PID graph, a safety-case row.', 'Commander Adeyemi reads it over a shoulder.', 50, [
        ['guest', 'This is better than a CV. It shows what you can do, with evidence. Keep building it.', CREW.adeyemi],
        ['spark', 'And the next step after blocks: Python and ROS 2 — the tools real rovers run on.'],
      ]),
      scene('The engineer’s screen: a portfolio page with a graph, a log and one honest paragraph about a failure.', 'Hana scrolls through it.', 30, [
        ['guest', 'Bring this to any interview. The failure paragraph is the bit they’ll remember.', CREW.kim],
      ]),
    ], 'Tomorrow: the design review of your capstone. Bring your evidence.'),
    build: {
      part: { slot: 'tool', id: 'gripper' },
      action: 'inspect',
      narration: 'Inspect the gripper — and the whole rover — as an exhibit: what does it show about what you can do?',
      why: 'A portfolio turns your season’s work into something you can show a school, a club or an employer.',
      tryWithout: 'Without a portfolio, months of work leave no trace anyone else can see.',
      physicsEffect: 'No change.',
      realWorld: 'Robotics hiring teams and university programmes often ask for project portfolios, competition work or open-source contributions.',
    },
    code: challenge({
      title: 'Best Run, Logged',
      mission: 'Re-run your best controller (docking is a good choice) three times and log the key result of each in variables; say a one-line summary the portfolio can quote.',
      arena: DOCK_BAY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        '… your Session 6 docking controller …',
        'variable_set(dErr, math(distance_cm − 5)); variable_set(hErr, math(heading_deg − 90))',
        'say("Run complete. Distance error:"); say(variable_get(dErr)); say("Heading error:"); say(variable_get(hErr))',
      ],
      success: [crit('stop-in-zone', 'Docks within tolerance on the logged runs.'), crit('uses-blocks', 'Says a summary with the measured errors.')],
      two: 'Your summary uses numbers with units.',
      three: 'You included a run that did not meet the spec and said why.',
      hints: ['Reuse your best program — no new code needed.', 'Measure the errors at the end of each run.', 'Units make numbers meaningful.'],
    }),
    challenge: challenge({
      title: 'Portfolio Page',
      mission: 'Build one portfolio page from this season: a project summary, your best controller’s logged runs (from the simulator), a graph or table, the safety-case row you are proudest of, and a reflection. Then map three skills you used onto three robotics roles.',
      arena: DOCK_BAY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: ['… the logged runs from “Best Run, Logged” …', '(portfolio) Project: Precision Docking · Result: 9/10 within 2 cm and 3° · Evidence: run log + graph · Skill → role: PID tuning → controls engineer; test plans → test engineer; safety case → safety engineer'],
      success: [crit('uses-blocks', 'Logged runs attached from the simulator.'), crit('uses-blocks', 'Portfolio page with summary, evidence, reflection and a skills-to-roles map (teacher checks; no personal data).')],
      two: 'Every claim on your page has evidence next to it.',
      three: 'Your reflection names one thing you would do differently and why.',
      hints: ['Pick ONE project and show it well.', 'Evidence beats adjectives.', 'Use your nickname only — no full name, school or photo.'],
    }),
    quiz: [
      q('Which is a real route into robotics work?', [
        right('All of these: university, apprenticeships, technician courses, and self-directed projects', '🛤️'),
        wrong('Only a university robotics degree', '🎓', 'robotics-is-only-coding'),
        wrong('Only being a programmer', '💻', 'robotics-is-only-coding'),
      ], 'Robotics needs engineers, technicians, operators, testers, safety and data specialists. People arrive through many routes.'),
      q('What makes a portfolio page convincing?', [
        right('Evidence: logged results, graphs and an honest reflection', '📊'),
        wrong('Saying you are passionate about robots', '❤️', 'portfolio-is-a-cv'),
        wrong('Only showing the runs that worked', '✅', 'hide-bad-data'),
      ], 'Evidence shows what you can do; an honest account of a failure shows how you think. Both convince more than adjectives.'),
      q('Why keep personal data off your portfolio page?', [
        right('It may be seen widely; skills and evidence are what matter, not your full name or face', '🔒'),
        wrong('Portfolios are not allowed to have names', '🚫', 'portfolio-is-a-cv'),
        wrong('There is no reason; more personal detail is better', '📸', 'portfolio-is-a-cv'),
      ], 'Share the work, protect the person. Use a nickname here; a parent or teacher can help decide what to share elsewhere and with whom.'),
    ],
    badge: { id: 'l4-pathfinder', name: 'Pathfinder', icon: '🧭', earnedFor: 'You mapped your skills onto robotics careers and built an evidence-based portfolio page.' },
    reward: { note: 'Portfolio page saved (class and family only; never public by default).' },
    teacher: teacher({
      timing: lessonPlan(5, 'Many roads', 'which robotics role would you try first, and what is your next step?'),
      warmup: {
        title: 'Many roads',
        minutes: 5,
        steps: ['Show the four crew paths from the episode on cards.', 'Pairs add a fifth path they know of (a relative, a local company, a club).', 'Discuss what all the paths have in common (projects, learning, evidence).'],
        materials: ['Four path cards'],
      },
      discussion: ['Which skills from this season would a robotics employer value most?', 'What could you build next to add to your portfolio?'],
      misconceptions: [
        mc('robotics-is-only-coding', 'Robotics jobs are only for programmers with degrees.', 'Robotics needs many roles — technicians, designers, operators, data and safety specialists — with many routes in.', 'Students interview each other as a crew member from the episode: “What do you do all day? What did you study?” Share the variety.'),
        mc('portfolio-is-a-cv', 'A portfolio is a list of personal details and claims.', 'A portfolio shows work with evidence; personal details are minimal and controlled by the student and family.', 'Pairs compare two mock pages: one full of claims and personal details, one with a project, data and reflection. Which would they trust? Which is safer to share?'),
        mc('hide-bad-data', 'It is fine to drop bad data without saying so.', 'Honest reports state what was excluded and why, so others can judge how reliable the result is.', 'Give two reports of the same experiment, one transparent and one silent. Pairs act as reviewers: which would they sign off, and what would they ask?'),
      ],
      faster: ['Translate one controller into the read-only text view and annotate it as Python-like pseudo-code.', 'Research one robotics competition or club open to your age group.'],
      slower: ['Provide a portfolio page template with headings.', 'Map one skill to one role.'],
      notes: ['The first objective is discussion-only: use the skills-to-roles map as evidence.', 'Under-18s: nickname only; any sharing beyond the class and family is the family’s decision.', 'Next steps on the main R2BOT site (Quick Lessons, the Academy, the ROS 2 Playground, Career Paths) can be shared through the parent or teacher view.'],
    }),
    parent: {
      today: 'Your teen mapped their robotics skills onto real jobs and the different routes into them, and built a portfolio page backed by evidence.',
      tryAtHome: 'Look at your teen’s portfolio page together. Ask about one result and one failure — and what they would build next.',
      askYourChild: 'Which robotics job would you like to try, and what is one step towards it?',
    },
  }),

  // ── 23 ───────────────────────────────────────────────────────────────────
  makeSession(L, 23, {
    objectives: [
      o('Presents a capstone design (need, success measure, design, safety case, test plan) and runs agreed acceptance tests from three starts.', 'I can present my capstone design and prove it with acceptance tests.', ['communication', 'engineering-design']),
      o('Gives and responds to structured critique (two stars and a wish; questions with evidence).', 'I can give and take useful feedback on a design.', ['collaboration', 'communication'], { concepts: ['design-process', 'careers'] }),
    ],
    episode: episode('Design Review', 'The engineer built a portfolio page and mapped their skills onto careers.', [
      scene('The review room, the whole crew seated. A projector, a timer: 3:00.', 'The engineer presents: the need, the success measure, the rover, the safety case.', 65, [
        ['guest', 'Three minutes. Tell us what problem it solves, how we’ll know it works, and why it’s safe. Then we ask.', CREW.adeyemi],
        ['myrobot', 'Need: map the north gully for the geologists. Success: a five-lane map within 10 centimetres, back with 20 % battery, no contact with people.'],
      ]),
      scene('Questions. Hana: “Your dead-zone fix — tested where?” Diego: “Your blind fault — what if it happens twice?”', 'The engineer answers some with logs, and one with “I don’t know yet — here’s how I’ll find out.”', 60, [
        ['guest', 'That last answer was the best one. Knowing what you don’t know is engineering.', CREW.kim],
        ['spark', 'Review isn’t a judgement of you. It’s free help finding problems before the mission does.'],
      ]),
      scene('After the review. The engineer adds one line to the design: a retry limit for the blind fault.', 'Hana nods at the change.', 30, [
        ['guest', 'A design that changes after review is a design that listened.', CREW.kim],
      ]),
    ], 'Sol 24. The last day of the rehearsal. Every rover goes out on its own mission.'),
    build: {
      part: { slot: 'drive', id: 'tracks' },
      action: 'choose',
      narration: 'Confirm your capstone drive — the review may have changed your mind.',
      why: 'A review should be able to change a design; this is where you lock in your choice with evidence.',
      tryWithout: 'A design no review can change is a design no review can improve.',
      physicsEffect: 'As your chosen drive.',
      realWorld: 'Space missions pass through formal reviews (preliminary, critical, readiness) before launch; each can send a design back.',
    },
    code: challenge({
      title: 'Acceptance Test',
      mission: 'Write down your capstone’s success measure as a pass/fail test, then run your current program from three starts and record pass or fail for each.',
      arena: arena(RED_VALLEY, { requires: ['move', 'see-wall', 'see-color', 'follow-line'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, LINE_SEEN, LINE_OFFSET, FLOOR_COLOR, TIMER, ...TALK],
      example: ['(acceptance test) PASS if: five lane reports within 10 cm AND back at base AND no contact', '… run from start A, B and C …', 'say("Run complete"); say(timer_s)'],
      success: [crit('uses-blocks', 'Three runs from different starts, each recorded pass or fail against a written measure.'), crit('no-collision', 'No contact with crew in any run.')],
      two: 'Your success measure is something a stranger could check.',
      three: 'You found a failing start and know why.',
      hints: ['A measure needs a number and a way to check it.', 'Three different starts, same program.', 'Record honestly, including failures.'],
    }),
    challenge: challenge({
      title: 'The Review',
      mission: 'Present your capstone in three minutes (need, success measure, design, safety case, test evidence). Take questions. Give two stars and a wish to two other pairs. Record one change you will make because of the review.',
      arena: arena(RED_VALLEY, { requires: ['move', 'see-wall', 'see-color', 'follow-line'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, LINE_SEEN, LINE_OFFSET, FLOOR_COLOR, TIMER, ...TALK],
      example: ['(slide 1) Need and success measure', '(slide 2) Rover and state diagram', '(slide 3) Safety case: top three hazards and evidence', '(slide 4) Acceptance-test results from three starts', '(after review) Change: add a second blind-fault retry limit; re-test planned'],
      success: [crit('uses-blocks', 'Acceptance tests from three starts attached (simulator records).'), crit('uses-blocks', 'Presentation given; feedback given to two pairs; one review change recorded (teacher checks).')],
      two: 'You answered at least one question with evidence from a log.',
      three: 'Your “two stars and a wish” for others were specific enough to act on.',
      hints: ['Need → measure → design → safety → evidence.', 'It is fine to say “not yet proven” with a plan.', 'Feedback: specific, kind, useful.'],
    }),
    quiz: [
      q('A reviewer asks a question you can’t answer. What is the best response?', [
        right('Say you don’t know yet, and how you will find out', '🔎'),
        wrong('Make up a confident answer', '🎭', 'review-is-judgement'),
        wrong('Say the question isn’t relevant', '🙅', 'review-is-judgement'),
      ], 'Reviews exist to find gaps before the mission does. An honest “not yet, here’s my plan” builds trust; a made-up answer hides risk.'),
      q('Which is useful “two stars and a wish” feedback?', [
        right('“Your safety case evidence is clear; your PID graph shows the overshoot well; I wish the success measure had a number.”', '⭐'),
        wrong('“Great job, I liked it!”', '👍', 'vague-feedback-helps'),
        wrong('“It’s bad. Start again.”', '👎', 'vague-feedback-helps'),
      ], 'Useful feedback is specific about what works and what to improve, so the designer can act on it.'),
      q('What makes a good success measure for a capstone?', [
        right('A number and a way to check it, like “five lane reports within 10 cm”', '📏'),
        wrong('“It works well”', '😊', 'vague-feedback-helps'),
        wrong('“The teacher likes it”', '🍎', 'vague-feedback-helps'),
      ], 'A measure must be checkable by someone else. Numbers with a test method turn “works well” into evidence.'),
    ],
    badge: { id: 'l4-reviewed', name: 'Design Reviewed', icon: '🗣️', earnedFor: 'You presented your design, answered questions with evidence and improved it from review.' },
    reward: { note: 'Review notes saved with your capstone in your portfolio.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Feedback that helps', 'how is a design review different from being judged?'),
      warmup: {
        title: 'Feedback that helps',
        minutes: 5,
        steps: ['Show three pieces of feedback on a made-up design (vague praise, harsh, specific).', 'Pairs rank them by usefulness and rewrite the worst one.', 'Agree the class rules for review: specific, kind, about the design not the person.'],
        materials: ['Three feedback examples (projected)'],
      },
      discussion: ['Why do professional teams invite people to find problems in their work?', 'How did a question in your review change your design?'],
      misconceptions: [
        mc('review-is-judgement', 'A design review is a judgement of the designer, so you must defend everything.', 'A review is help to find problems early; honest gaps and plans are expected.', 'Role-play two answers to a hard question: a defensive bluff and an honest “not yet, here’s how”. Ask reviewers which they would trust.'),
        mc('vague-feedback-helps', 'General praise or criticism is useful feedback.', 'Useful feedback is specific and actionable, about the design and its evidence.', 'Pairs turn “good job” and “needs work” into one specific star and one specific wish each.'),
      ],
      faster: ['Act as a lead reviewer: prepare three evidence-based questions per presentation.', 'Write formal review minutes with actions and owners.'],
      slower: ['Present with a slide template and sentence starters.', 'Give feedback to one pair instead of two.'],
      notes: ['Run reviews in small groups (3–4 pairs) to keep it safe and fast. No scores, no rankings.', 'The certificate asks for a design-review presentation: this is it.'],
    }),
    parent: {
      today: 'Your teen presented their capstone design to a review panel, answered questions with evidence and used feedback to improve it.',
      tryAtHome: 'Ask your teen to give you the three-minute pitch. Then ask one “how do you know?” question.',
      askYourChild: 'What did the review change in your design?',
    },
  }),

  // ── 24 ───────────────────────────────────────────────────────────────────
  makeSession(L, 24, {
    objectives: [
      o('Runs a self-designed autonomous mission with at least one feedback controller and one behaviour layer, a safety case and a test log, and meets (or honestly explains) its success measure.', 'I can run my own autonomous mission and show the evidence.', ['engineering-design', 'programming']),
      o('Presents a portfolio-ready write-up that a peer could use to rerun the tests, and names the next step.', 'I can write up my mission so someone else could repeat my tests.', ['communication', 'data'], { concepts: ['safety-ethics', 'design-process'] }),
    ],
    episode: episode('Mission Red Valley', 'The engineer’s capstone passed its design review — with one change.', [
      scene('Sol 24, dawn. Every rover lines up outside the garage, each with its own mission card.', 'Commander Adeyemi walks the line.', 55, [
        ['guest', 'Twenty-four sols ago, this was a crate. Now it measures, controls, maps, plans, copes with faults and works safely with people. Show us your mission.', CREW.adeyemi],
        ['guest', 'And whatever happens out there — log it. A failure with a good log is worth more than a success nobody can explain.', CREW.kim],
      ]),
      scene('Flight control. Screens show each rover’s state, battery and fault flags. The engineer’s rover rolls out alone.', 'The crew watch in silence.', 50, [
        ['myrobot', 'Need, measure, design, safety, evidence. Going.'],
      ]),
    ], 'The rehearsal ends. A message waits in the inbox: “Next: Python and ROS 2. The real rovers are waiting.”'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Fit the tool your mission needs — or none. Your design review already said why.',
      why: 'Your capstone rover is configured for YOUR mission and justified in your design review.',
      tryWithout: 'There is no default rover for the capstone: the configuration is part of the design.',
      physicsEffect: 'As your design-review spec sheet.',
      realWorld: 'Every real rover is configured for its mission and justified, part by part, before it leaves.',
    },
    code: challenge({
      title: 'Dress Rehearsal',
      mission: 'Run your full mission once with no faults and once with one injected fault. Log both runs against your success measure.',
      arena: RED_VALLEY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, LINE_SEEN, LINE_OFFSET, FLOOR_COLOR, BUMPED, TIMER, GRIP_OPEN, GRIP_CLOSE, LIGHT_ON, LIGHT_OFF, ...TALK],
      example: ['variable_set(state, 1)', '… your capstone state machine, controllers and fault checks …', 'say("Mission complete") or say("Safe stop:") + the reason'],
      success: [crit('uses-blocks', 'Two logged runs (no fault, one fault) against the success measure.'), crit('no-collision', 'No contact with crew in either run.')],
      two: 'Your fault run ends in success or a named safe stop.',
      three: 'You fixed one issue found in the rehearsal and re-ran.',
      hints: ['Run it exactly as you will on the day.', 'Inject the fault you are least sure about.', 'Log everything.'],
    }),
    challenge: challenge({
      title: 'Mission Red Valley',
      mission: 'Your capstone: run your own autonomous mission in the Red Valley arena — a stated need and success measure, at least one feedback controller and one behaviour layer, a safety case and a test log — and present a two-minute summary and a one-page write-up.',
      arena: RED_VALLEY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, LINE_SEEN, LINE_OFFSET, FLOOR_COLOR, BUMPED, TIMER, GRIP_OPEN, GRIP_CLOSE, LIGHT_ON, LIGHT_OFF, ...TALK],
      example: ['(write-up) Need · Success measure · Rover and justification · State diagram · Controllers (gains and logs) · Behaviour layers · Safety case · Test log · Results (met / not met, why) · What I would do next'],
      success: [crit('uses-blocks', 'Mission run in the simulator with logged results against the stated measure.'), crit('uses-blocks', 'At least one feedback controller and one behaviour layer in the program.'), crit('uses-blocks', 'Safety case, test log, two-minute presentation and one-page write-up (teacher checks).')],
      two: 'A peer could rerun your tests from your write-up alone.',
      three: 'You named what you would do next — including in Python or ROS 2.',
      hints: ['Your evidence is the mission: logs, graphs, safety case.', 'If the measure was not met, explain why honestly — that still meets the brief.', 'Write the write-up for a stranger.'],
    }),
    quiz: [
      q('Your mission missed its success measure by a small margin. What should your write-up say?', [
        right('The measured result, the gap, the likely cause and what you would change', '📝'),
        wrong('That it succeeded, rounding the numbers', '🔢', 'hide-bad-data'),
        wrong('Nothing about the measure — focus on what went well', '🌈', 'hide-bad-data'),
      ], 'An honest result with a clear explanation is the mark of an engineer. It also meets the brief: “met, or explain honestly why not”.'),
      q('Why must a peer be able to rerun your tests from the write-up?', [
        right('Repeatable evidence is what lets others trust and build on your work', '🔁'),
        wrong('So they can copy your work', '📋', 'review-is-judgement'),
        wrong('It is only a formality', '🗂️', 'review-is-judgement'),
      ], 'Science and engineering depend on results others can check. Clear test descriptions make your evidence count.'),
      q('Which combination does your capstone need, at minimum?', [
        right('A feedback controller AND a behaviour layer, plus a safety case and test log', '🧩'),
        wrong('Just a working program — the rest is paperwork', '💻', 'safe-by-assertion'),
        wrong('A safety statement saying the rover is safe', '✅', 'safe-by-assertion'),
      ], 'The capstone joins the season: control, autonomy, safety and evidence. A statement is not a safety case; a program alone is not evidence.'),
    ],
    badge: { id: 'l4-mission-red-valley', name: 'Mission Red Valley', icon: '🔴', earnedFor: 'You planned, ran and evidenced your own autonomous rover mission.' },
    reward: { note: 'Level 4 complete: the Engineer certificate is ready, and your capstone write-up is in your portfolio.' },
    teacher: teacher({
      timing: projectPlan(4, 'Mission check (pairs read their success measure aloud and name the one risk they fear most)'),
      warmup: {
        title: 'Mission check',
        minutes: 4,
        steps: ['Each pair reads their success measure aloud.', 'They name the one risk they fear most and what their rover does about it.', 'The class may ask one “how do you know?” question.'],
        materials: ['Capstone notes'],
      },
      discussion: ['What was the most important thing you learned this season?', 'What would you build next — and in which tools (Python, ROS 2)?'],
      misconceptions: [
        mc('hide-bad-data', 'It is fine to drop bad data without saying so.', 'Honest reports state what was excluded and why, so others can judge how reliable the result is.', 'Give two reports of the same experiment, one transparent and one silent. Pairs act as reviewers: which would they sign off, and what would they ask?'),
        mc('review-is-judgement', 'A design review is a judgement of the designer, so you must defend everything.', 'A review is help to find problems early; honest gaps and plans are expected.', 'Role-play two answers to a hard question: a defensive bluff and an honest “not yet, here’s how”. Ask reviewers which they would trust.'),
        mc('safe-by-assertion', 'Saying a system is safe (or being careful) makes it safe.', 'Safety is argued with specific hazards, mitigations and evidence that can be checked.', 'Two claims on the board: “Our rover is safe” vs one evidenced row. Pairs list the questions a reviewer would ask of each.'),
      ],
      faster: ['Translate one subsystem of the capstone into the text view and annotate it as Python-like pseudo-code.', 'Write a “mission patch” design brief for the next crew.'],
      slower: ['A capstone that reuses an earlier project (docking, survey or fetch) with a new need and measure meets the brief.', 'Provide the write-up template with headings.'],
      notes: ['Certificate criteria (levels.ts): the four projects meeting their constraints, a capstone write-up with a test log and a safety case reviewed by peers, and a design-review presentation.', 'Self-checks are reflection only. The write-up holds no personal data; sharing beyond class and family needs a parent’s consent.'],
    }),
    parent: {
      today: 'Your teen finished Level 4 by running their own autonomous rover mission, with a safety case, test evidence and a write-up for their portfolio.',
      tryAtHome: 'Ask your teen to present their two-minute summary to you. Then ask what they would like to learn next — Python and ROS 2 are the natural next step.',
      askYourChild: 'What are you proudest of in your capstone — and what would you do differently?',
    },
  }),
]
