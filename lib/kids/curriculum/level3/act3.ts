// lib/kids/curriculum/level3/act3.ts
// Level 3, Act 3 (sessions 13–18): "The Boulder Field".
// Legs against tracks from measured trade-offs, centre of mass on a slope,
// odometry (and why it drifts), landmarks that fix drift, a slow proportional
// approach to a fragile sample, and the third project: the sample return.

import type { Session } from '../types'
import {
  BOULDER_FIELD, CORE_BAY, CREW, DIST, FLOOR_COLOR, GRIP_CLOSE, GRIP_OPEN, HEADING, ICE_SLOPE, LOGIC, MOVE, SAY, SURVEY_GRID, TALK, TIMER, VARS_MATH,
} from './shared'
import {
  arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong,
} from './kit'

const L = 3 as const

export const ACT3: Session[] = [
  // ── 13 ───────────────────────────────────────────────────────────────────
  makeSession(L, 13, {
    objectives: [
      o('Runs a fair test of two drives on the same terrain (same program, several runs each) and records time and failures.', 'I can run a fair test of two drives and record the results.', ['data', 'engineering-design']),
      o('Chooses a drive for the boulder field by weighing measured trade-offs (speed, reliability, energy).', 'I can choose a drive from evidence and explain the trade-off.', ['engineering-design', 'science-forces'], { concepts: ['design-process', 'physics'] }),
    ],
    episode: episode('Legs or Tracks?', 'The mast data showed the ice is moving fast — the scientists need ice cores, now.', [
      scene('The edge of the boulder field: snow, fist-sized rocks and two huge boulders. Ice-core tubes stand in marked circles.', 'Leila Haddad arrives on the supply sled with two crates: TRACKS and LEGS.', 65, [
        ['guest', 'I build field robots for a living. Here’s what I’ve learned: the best drive depends on the ground — and you only know by testing.', CREW.haddad],
        ['myrobot', 'Legs climb rocks. Tracks are fast on snow. Which wins?'],
        ['guest', 'Neither, until you measure. Same course, same program, three runs each. Time and failures.', CREW.haddad],
      ]),
      scene('Test runs. A stopwatch, a clipboard, the rover swapping drives.', 'Tracks: 18 s, 17 s, stuck once. Legs: 26 s, 25 s, 27 s, never stuck.', 70, [
        ['spark', 'Tracks are faster when they get through. Legs are slower but never stuck. That’s a trade-off.'],
        ['myrobot', 'The cores are fragile and far apart. Getting stuck out there costs more than a few seconds.'],
        ['guest', 'Then you’ve made an engineering decision — with data, not with a favourite.', CREW.haddad],
      ]),
      scene('The sample circle at the far side of the boulder field.', 'The rover on legs stands beside the first core, steady on the rocks.', 30, [
        ['myrobot', 'Slower, but here. Every single time.'],
      ]),
    ], 'Beyond the boulders the ground tilts towards the core store. Heavy cores, steep ramp…'),
    build: {
      part: { slot: 'drive', id: 'legs' },
      action: 'choose',
      narration: 'Fit the drive you are testing: walking legs or tank tracks. You will swap and test both.',
      why: 'Legs step over rocks; tracks spread the weight and roll fast. Which is better depends on the ground — so you measure.',
      tryWithout: 'On two wheels, the first 4 cm rock stops the robot dead.',
      physicsEffect: 'Legs and tracks both give rough-ground ability; legs are slower on flat snow, tracks can jam on large rocks.',
      realWorld: 'Field robots for mines, farms and disaster sites are chosen after trials on the real ground — legged robots for stairs and rubble, tracks for mud and snow.',
    },
    code: challenge({
      title: 'Time the Crossing',
      mission: 'Drive across the boulder field to the sample circle and say how long it took. Run it three times with your drive.',
      arena: BOULDER_FIELD,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, TIMER, SAY],
      example: [
        'variable_set(start, timer_s)',
        'drive_distance(150, 50); turn_degrees(−90, 40); drive_distance(300, 50); turn_degrees(90, 40); drive_distance(150, 50)',
        'stop',
        'say(math(timer_s − variable_get(start)))',
      ],
      success: [crit('reach-zone', 'Reaches the sample circle.'), crit('uses-blocks', 'Reports the crossing time from the timer.')],
      two: 'Three runs recorded in your table.',
      three: 'You noted any run where the robot got stuck or slipped.',
      hints: ['Store the timer at the start.', 'Subtract at the end to get the time taken.', 'start = timer_s; drive the route; say timer_s − start.'],
    }),
    challenge: challenge({
      title: 'The Fair Test',
      mission: 'Run the same crossing program three times with legs and three times with tracks. Record time and failures, then choose and justify your drive in one sentence.',
      arena: BOULDER_FIELD,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, TIMER, SAY],
      example: [
        'variable_set(start, timer_s)',
        'drive_distance(150, 50); turn_degrees(−90, 40); drive_distance(300, 50); turn_degrees(90, 40); drive_distance(150, 50)',
        'stop',
        'say(math(timer_s − variable_get(start)))',
        '(results table: legs 26 / 25 / 27 s, 0 stuck; tracks 18 / 17 / stuck, 1 stuck → legs, because a stuck rover cannot fetch fragile cores)',
      ],
      success: [crit('uses-blocks', 'Six runs recorded by the simulator, the same program each time.'), crit('reach-zone', 'At least one drive reaches the sample circle on all three runs.')],
      two: 'Your table has time AND failures for every run.',
      three: 'Your justification names the trade-off (what you gave up to get what).',
      hints: ['Fair test: only the drive changes.', 'Record failures as well as times.', 'Choose the drive that best fits the mission, and say what you gave up.'],
    }),
    quiz: [
      q('What makes the legs-against-tracks comparison a fair test?', [
        right('The same program on the same course, several runs each, with only the drive changed', '🧪'),
        wrong('Letting each drive use its own best program', '🏆', 'unfair-test'),
        wrong('One run each is enough if you watch carefully', '👀', 'one-run-is-truth'),
      ], 'Only one thing may change, and you need several runs because results vary. Different programs would hide what the drive itself does.'),
      q('Tracks were faster on average but got stuck once in three runs. Legs were slower and never stuck. Which is better?', [
        right('It depends on the mission: weigh speed against reliability', '⚖️'),
        wrong('Tracks: the fastest average always wins', '🏎️', 'fastest-is-best'),
        wrong('Legs: slower always means safer', '🐢', 'fastest-is-best'),
      ], 'This is a trade-off. For fragile samples far away, never getting stuck may matter more than speed. For a short, smooth trip, speed might win.'),
      q('Why did the rover’s two-wheel drive fail in the boulder field?', [
        right('The rocks are taller than the wheels can climb, so it stops dead', '🪨'),
        wrong('Wheels are always worse than legs', '🦿', 'one-drive-is-best'),
        wrong('It needed a faster program', '⏩', 'one-drive-is-best'),
      ], 'A wheel can only roll over a step smaller than about a third of its radius. On flat floors wheels are the most efficient drive; the ground decides.'),
    ],
    badge: { id: 'l3-trade-off', name: 'Trade-off Thinker', icon: '⚖️', earnedFor: 'You chose a drive from a fair test and explained the trade-off.' },
    reward: { note: 'Walking legs and tank tracks are now both in your toolbox.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Shoes for the job', 'what did you give up to get what you wanted?'),
      warmup: {
        title: 'Shoes for the job',
        minutes: 6,
        steps: ['Show pictures: football boots, wellies, trainers, flip-flops.', 'Pairs choose the best for a muddy field, a sprint and a beach — and say what each choice gives up.', 'Introduce “trade-off”: you can rarely have everything.'],
        materials: ['Four shoe pictures (or real shoes)'],
      },
      discussion: ['Name a trade-off in a phone, a bike or a school bag.', 'Why do engineers record failures, not just the best time?'],
      misconceptions: [
        mc('unfair-test', 'Each option should use its own best set-up when compared.', 'A fair test changes one thing; everything else stays the same.', 'Two paper planes, two throwers, two rooms: which plane is better? Pairs list what is unfair, then redesign the test.'),
        mc('one-run-is-truth', 'One run gives the true answer; different results mean a mistake.', 'Real measurements vary; repeat runs show the spread, and you report it.', 'Each pair measures the same desk with a ruler; collect results on the board. Discuss why they differ and how to report “the length”.'),
        mc('fastest-is-best', 'The fastest option is always the best.', 'The best option meets the mission’s needs; speed is one factor among reliability, energy and cost.', 'Mission cards (“deliver a fragile egg”, “win a race”, “carry water uphill”) and two robots (fast but unreliable, slow but sure). Pairs choose per card.'),
        mc('one-drive-is-best', 'One kind of drive is the best everywhere.', 'Each drive suits some ground; the environment decides.', 'Sort pictures of terrain (floor, stairs, sand, rubble, road) under wheels, tracks, legs. Discuss where they disagree.'),
      ],
      faster: ['Add energy to the table (battery used per run) and include it in the decision.', 'Test a third drive (four wheels) on the flat part only.'],
      slower: ['Supply the results table with two runs already filled in.', 'Compare only time, then add failures.'],
      notes: ['The fair-test results table is part of the Session 18 project brief: make sure pairs keep it.', 'Robo Zoo: Bio-Bot Lab (Ace tier) is the playable challenge: gait against wheels on real terrain.'],
    }),
    parent: {
      today: 'Your child compared walking legs and tank tracks in a fair test and chose one from the data, explaining the trade-off.',
      tryAtHome: 'Talk about a choice your family made with a trade-off (cheaper vs better, faster vs safer). What did you give up?',
      askYourChild: 'Why did you choose legs or tracks — and what did you give up?',
    },
  }),

  // ── 14 ───────────────────────────────────────────────────────────────────
  makeSession(L, 14, {
    objectives: [
      o('Predicts whether a robot tips on a slope from where its centre of mass sits, and moves the load to make it stable.', 'I can move a load to stop my robot tipping on a slope.', ['science-forces', 'mathematics-geometry']),
      o('Explains tipping using the centre of mass and the base of support.', 'I can explain why robots tip over.', ['science-forces'], { discussionOnly: true }),
    ],
    episode: episode('The Core Store Ramp', 'The rover chose its drive from a fair test in the boulder field.', [
      scene('The ramp up to the core store, steep and icy. The rover carries a heavy core box held high in its scoop.', 'Halfway up, it rears back — and tumbles slowly onto its back.', 60, [
        ['myrobot', 'I was going straight up! Why did I flip?'],
        ['guest', 'Not your program. Your load. Held high and back, it pulls your balance point behind your wheels.', CREW.haddad],
      ]),
      scene('Spark draws the robot side-on: a dot for the centre of mass, a line straight down, the wheels’ footprint.', 'As the ramp steepens the line slides back past the rear wheel.', 70, [
        ['spark', 'The centre of mass is the balance point of the whole robot. While the line straight down from it lands between your wheels, you stay up. When it falls outside — you tip.'],
        ['myrobot', 'So carry the box low and forward. The dot moves down and ahead.'],
        ['spark', 'Lower and forward. And go slower — a sudden start throws the weight back too.'],
      ]),
      scene('Second try. Box low in the scoop, a gentle start.', 'The rover climbs the ramp and parks at the store.', 30, [
        ['guest', 'Same robot, same ramp. Only the load moved.', CREW.haddad],
      ]),
    ], 'In the store, a map of the boulder field — and the rover realises it doesn’t actually know where it is out there.'),
    build: {
      part: { slot: 'tool', id: 'scoop' },
      action: 'swap',
      narration: 'Fit the scoop: it can carry the core box high, or low and forward.',
      why: 'Where the load sits moves the robot’s balance point — and that decides whether it tips on a slope.',
      tryWithout: 'With the box held high, the robot flips backwards at about two-thirds of the way up the 20° ramp.',
      physicsEffect: 'Scoop 0.10 kg; core box 0.3 kg. Carried high, the centre of mass rises by about 4 cm and moves 3 cm back.',
      realWorld: 'Forklifts keep heavy loads low when moving, and planetary rovers place their heaviest parts low in the body.',
    },
    code: challenge({
      title: 'Carry It High',
      mission: 'Scoop up the core box in the high position, drive up the ramp at 70 %, and watch what happens. Then say what you think went wrong.',
      arena: ICE_SLOPE,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, GRIP_CLOSE, GRIP_OPEN, SAY],
      example: ['grip_close  ← high carry position', 'drive_distance(350, 70)', 'stop', 'say("I tipped back")  ← the taught failure: the centre of mass passed behind the rear wheels'],
      success: [crit('uses-blocks', 'Runs the high-carry climb once and records the result (the robot is expected to tip).'), crit('reach-zone', 'Reaches the start of the ramp.')],
      two: 'You predicted the tip before running.',
      three: 'You drew where you think the centre of mass was when it tipped.',
      hints: ['Watch the side view during the climb.', 'Where is the heavy box relative to the wheels?', 'High and back on a steep slope: the balance point falls behind the rear wheels.'],
    }),
    challenge: challenge({
      title: 'Low and Slow',
      mission: 'Get the core box up to the store without tipping. You can change the carry position, the speed and the start.',
      arena: ICE_SLOPE,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, GRIP_CLOSE, GRIP_OPEN, SAY],
      example: ['grip_close  ← then choose the LOW carry position in the scoop settings', 'drive_distance(100, 30)  ← gentle start', 'drive_distance(250, 40)', 'stop', 'grip_open'],
      success: [crit('deliver-object', 'The core box ends in the store zone.'), crit('no-collision', 'The robot never tips (pitch stays under 35°).')],
      two: 'You changed only one thing at a time and recorded each try.',
      three: 'You found the fastest speed that still does not tip, with evidence.',
      hints: ['Where should a heavy load be on a slope?', 'Lower and further forward keeps the balance point inside the wheels.', 'Low carry, gentle start at 30 %, then 40 %.'],
    }),
    quiz: [
      q('A robot tips over backwards on a ramp when…', [
        right('the line straight down from its centre of mass falls behind its rear wheels', '📐'),
        wrong('it is too heavy overall', '🏋️', 'heavy-tips'),
        wrong('its motors are too strong', '💪', 'heavy-tips'),
      ], 'Tipping is about where the weight is, not how much. A heavy robot with its mass low and centred is very stable.'),
      q('Where should the rover carry the heavy core box on a steep climb?', [
        right('Low and towards the front', '⬇️'),
        wrong('High, so it doesn’t drag on the ramp', '⬆️', 'high-is-safe'),
        wrong('It makes no difference where the box is', '🤷', 'heavy-tips'),
      ], 'Low and forward keeps the centre of mass inside the wheels on an uphill slope.'),
      q('Why does a sudden fast start make tipping more likely on a slope?', [
        right('Speeding up quickly throws the weight backwards, like being pushed into your seat', '🚀'),
        wrong('Fast motors get hot and lose grip', '🔥', 'speed-unrelated-to-tipping'),
        wrong('It doesn’t: speed has nothing to do with tipping', '❌', 'speed-unrelated-to-tipping'),
      ], 'When the wheels accelerate the robot, the body “lags” and pitches back — the same push you feel in a bus that pulls away fast.'),
    ],
    badge: { id: 'l3-balance-keeper', name: 'Balance Keeper', icon: '🎯', earnedFor: 'You kept a loaded robot stable on a slope by moving its centre of mass.' },
    reward: { note: 'Scoop carry positions (high and low) are now in your part settings.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Tip the box', 'why does a lower load make a robot more stable?'),
      warmup: {
        title: 'Tip the box',
        minutes: 5,
        steps: ['Tape a heavy object (a stapler) to the top of an empty cereal box; tilt the box until it tips. Measure the angle by eye.', 'Move the object to the bottom and tilt again. Compare.', 'Draw the “line straight down” from the balance point on the board.'],
        materials: ['An empty cereal box', 'A stapler or similar weight', 'Tape'],
      },
      discussion: ['Why do racing cars sit low? Why are buses tested on tilt tables?', 'How do people keep their balance when carrying a heavy bag up a hill?'],
      misconceptions: [
        mc('heavy-tips', 'Heavier robots tip more easily.', 'Tipping depends on where the centre of mass is relative to the base of support, not on the total weight.', 'Tip the cereal box with the weight high, then with a heavier weight low. The heavier, lower box is more stable. Discuss why.'),
        mc('high-is-safe', 'Carrying a load high keeps it safe.', 'A high load raises the centre of mass, which makes tipping on slopes and turns more likely.', 'Balance a ruler with a rubber on top vs at the bottom on a finger. Which falls first when you walk?'),
        mc('speed-unrelated-to-tipping', 'Speed has nothing to do with tipping.', 'Acceleration shifts the effective load backwards (or forwards when braking); hard starts and stops can tip a robot.', 'Stand on a bus or step with knees soft; a partner tugs gently forward (accelerating). Which way do you lean? Connect to the robot.'),
      ],
      faster: ['Find the steepest ramp the robot can climb with the box low.', 'Explain what happens going DOWN the ramp with the box at the front.'],
      slower: ['Start with the box low and try two speeds.', 'Use the side view with the centre-of-mass dot switched on.'],
      notes: ['Honest limit: the carry-position setting is part of the Level 3 simulator work; the playable challenge today is the Skill Galaxy centre-of-mass activity “A rover that survives the slope”, which uses the same physics.'],
    }),
    parent: {
      today: 'Your child found out why robots tip over on slopes, and fixed it by carrying the load lower and further forward.',
      tryAtHome: 'Carry a full shopping bag up stairs high on your shoulder, then low by your side. Which feels steadier? Talk about the balance point.',
      askYourChild: 'Why did your robot tip — and how did you stop it?',
    },
  }),

  // ── 15 ───────────────────────────────────────────────────────────────────
  makeSession(L, 15, {
    objectives: [
      o('Keeps x and y variables up to date from its own moves and 90° turns (odometry), and reports the position estimate.', 'I can make my robot keep track of where it thinks it is.', ['programming', 'mathematics-geometry']),
      o('Compares the estimate with the true position and explains why odometry drifts when wheels slip.', 'I can explain why a robot’s position estimate drifts.', ['data', 'science-forces'], { concepts: ['sensors', 'autonomy'] }),
    ],
    episode: episode('Where Am I?', 'The rover learned to keep its balance on the core store ramp.', [
      scene('The core store. A wall map of the boulder field with a grid drawn on it.', 'Dr Owusu taps a spot: “The first core is at x 300, y 450.”', 55, [
        ['guest', 'GPS is useless down in the ice valleys. Out there you have to keep track of yourself.', CREW.owusu],
        ['myrobot', 'I know every move I make. 150 forward, turn right, 150 forward… I could add them up.'],
        ['spark', 'That’s odometry: counting your own moves to estimate where you are. x and y in two variables.'],
      ]),
      scene('The survey grid. The rover drives a square. Two dots on the map: where it THINKS it is (orange) and where it REALLY is (cyan).', 'After each side the dots drift further apart.', 70, [
        ['myrobot', 'I drove a perfect square — in my head. In the snow I’m 20 centimetres off.'],
        ['spark', 'Every slip is a move you counted but didn’t make. The errors add up. Odometry is good for a while — then it drifts.'],
      ]),
      scene('The store. Priya overlays the two tracks on the map.', 'The gap widens like a fan.', 40, [
        ['guest', 'That’s why sailors used lighthouses. You need something fixed to check against.', CREW.raman],
      ]),
    ], 'Leila points at coloured marker mats on the survey grid: “What if each of those knew its own exact position?”'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'inspect',
      narration: 'Your sensors can’t see where you are on the map. For now, the rover counts its own moves.',
      why: 'Odometry needs no sensor outside the robot — which is why it is always available, and why it drifts.',
      tryWithout: 'Without odometry, the rover has no idea where it is between landmarks at all.',
      physicsEffect: 'On packed snow (grip 0.35) each 150 cm move falls short by 2–8 cm, more after a turn.',
      realWorld: 'Underwater robots and Mars rovers use odometry (dead reckoning) between position fixes, and correct it whenever they can.',
    },
    code: challenge({
      title: 'Count Your Moves',
      mission: 'Start at x = 0, y = 0 facing up. Drive 150 cm, then turn right and drive 150 cm. Update x and y after each move and say them.',
      arena: SURVEY_GRID,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, SAY],
      example: [
        'variable_set(x, 0); variable_set(y, 0)',
        'drive_distance(150, 40); variable_change(y, 150)  ← facing up: y grows',
        'turn_degrees(−90, 40)  ← now facing right',
        'drive_distance(150, 40); variable_change(x, 150)  ← facing right: x grows',
        'say(variable_get(x)); say(variable_get(y))',
      ],
      success: [crit('uses-blocks', 'x and y updated after each move; says 150 and 150.'), crit('reach-zone', 'Ends near (150, 150).')],
      two: 'You wrote which variable changes for each direction before coding.',
      three: 'You compared the estimate with where the robot really is.',
      hints: ['Which way are you facing for each move?', 'Facing up changes y; facing right changes x.', 'After the first move change y by 150; after the turn, change x by 150.'],
    }),
    challenge: challenge({
      title: 'The Square Survey',
      mission: 'Drive a 150 cm square (four sides, four right turns). Keep x, y and a direction variable up to date, report your estimate after each side, and compare the final estimate with the truth.',
      arena: SURVEY_GRID,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, SAY],
      example: [
        'variable_set(x, 0); variable_set(y, 0); variable_set(dir, 0)  ← 0 up, 1 right, 2 down, 3 left',
        'repeat(4) {',
        '  drive_distance(150, 40)',
        '  if (compare(variable_get(dir) = 0)) { variable_change(y, 150) }',
        '  if (compare(variable_get(dir) = 1)) { variable_change(x, 150) }',
        '  if (compare(variable_get(dir) = 2)) { variable_change(y, −150) }',
        '  if (compare(variable_get(dir) = 3)) { variable_change(x, −150) }',
        '  say(variable_get(x)); say(variable_get(y))',
        '  turn_degrees(−90, 40); variable_change(dir, 1)',
        '  if (compare(variable_get(dir) = 4)) { variable_set(dir, 0) }',
        '}',
      ],
      success: [crit('uses-blocks', 'Reports the estimate after every side (ends at 0, 0).'), crit('within-time', 'The simulator shows the true end point; the student records the drift.')],
      two: 'Your direction variable wraps from 3 back to 0.',
      three: 'You ran it on the station mat AND on snow and compared the drift.',
      hints: ['Keep a direction variable: which way am I facing?', 'After each side, change x or y depending on the direction.', 'After each right turn, add 1 to dir; when it reaches 4, set it back to 0.'],
    }),
    quiz: [
      q('The rover faces right (along +x) and drives 150 cm. Which update is correct?', [
        right('change x by 150', '➡️'),
        wrong('change y by 150', '⬆️', 'axes-confused'),
        wrong('change x and y by 150 each', '↗️', 'axes-confused'),
      ], 'Facing right means moving along x only. y changes only when moving up or down the map.'),
      q('The rover thinks it is back at (0, 0) but it is really 20 cm away. Why?', [
        right('Its wheels slipped: it counted moves it didn’t fully make, and the errors added up', '🌨️'),
        wrong('The maths in the program must be wrong', '🧮', 'odometry-is-exact'),
        wrong('Odometry is always exact; the map must be wrong', '🗺️', 'odometry-is-exact'),
      ], 'The program’s maths can be perfect. Odometry assumes every commanded move happened exactly; slips break that assumption, and the error grows with every move.'),
      q('What happens to the odometry error as the rover drives further?', [
        right('It usually grows, because small errors add up', '📈'),
        wrong('It stays the same size', '➖', 'errors-cancel'),
        wrong('It shrinks, because errors cancel out', '📉', 'errors-cancel'),
      ], 'Some errors might cancel, but on average they accumulate. That is why a long odometry-only trip ends far from where you think.'),
    ],
    badge: { id: 'l3-dead-reckoner', name: 'Dead Reckoner', icon: '🧭', earnedFor: 'You kept track of your robot’s position from its own moves — and measured how it drifts.' },
    reward: { note: 'Map overlay: the “estimate” dot now follows your x and y variables.' },
    teacher: teacher({
      timing: lessonPlan(6, 'Blind walk on a grid', 'why do the estimate and the truth drift apart?'),
      warmup: {
        title: 'Blind walk on a grid',
        minutes: 6,
        steps: ['Mark a 3 × 3 grid of floor tiles (or chalk squares). A student starts on a corner with eyes closed.', 'The class calls moves (“two forward, turn right, one forward”). The student says where they THINK they are.', 'Open eyes: compare. Repeat with longer routes.'],
        materials: ['Masking tape or chalk for a grid'],
      },
      discussion: ['How did sailors know where they were before GPS? (Dead reckoning, then stars and lighthouses.)', 'What could the rover use to check its estimate?'],
      misconceptions: [
        mc('axes-confused', 'Every forward move changes y.', 'Which variable changes depends on the direction the robot faces: up/down changes y, left/right changes x.', 'Students stand on a taped x–y grid, face different ways and step forward. The class calls out which coordinate changed, and by how much.'),
        mc('odometry-is-exact', 'If the maths is right, odometry is exact.', 'Odometry assumes every commanded move happened exactly; slip and bumps make the real moves differ.', 'Roll a toy car “one metre” by pushing it a fixed effort on a rug and on a table; measure both. Same command, different result.'),
        mc('errors-cancel', 'Small errors cancel out over a long trip.', 'Errors usually accumulate; the uncertainty grows with distance unless something corrects it.', 'Each student draws a 5 cm line without a ruler, ten times end to end. Measure the total against 50 cm. Compare the class: errors grew.'),
      ],
      faster: ['Add a heading check: compare dir with heading_deg and report any mismatch.', 'Drive the square twice and measure whether the drift doubles.'],
      slower: ['Drive two sides only (an L), updating x and y by hand on paper first.', 'Use the map overlay to watch the estimate dot.'],
      notes: ['Odometry is grid-aligned here (90° turns only), as levels.ts notes; full odometry needs sin and cos (Level 4 extension).'],
    }),
    parent: {
      today: 'Your child made the robot keep track of its own position by counting its moves (odometry) — and saw how slips make the estimate drift.',
      tryAtHome: 'Walk a route with eyes shut while someone guides you, and guess where you are before opening them. How far off were you?',
      askYourChild: 'Why does your robot get more lost the further it goes?',
    },
  }),

  // ── 16 ───────────────────────────────────────────────────────────────────
  makeSession(L, 16, {
    objectives: [
      o('Resets odometry variables to a landmark’s known position when the colour sensor detects the landmark.', 'I can use landmarks to fix my robot’s position estimate.', ['programming', 'algorithms']),
      o('Explains why combining counted moves with occasional fixed references keeps the estimate accurate.', 'I can explain why landmarks stop drift growing.', ['data'], { concepts: ['autonomy', 'sensors'] }),
    ],
    episode: episode('Lighthouses in the Snow', 'The rover’s odometry drifted on the snow — the further it went, the more lost it got.', [
      scene('The survey grid. Coloured marker mats lie half-buried: red, blue, yellow.', 'Leila brushes snow off the red mat. Painted on it: x 0, y 150.', 60, [
        ['guest', 'Each marker was surveyed to the centimetre. When you’re on it, you KNOW where you are.', CREW.haddad],
        ['myrobot', 'So when I see red, I stop guessing — I set x and y to the marker’s numbers.'],
      ]),
      scene('An X-ray of the rover’s underside: the line sensor clicks out, a colour sensor clicks in.', 'The orange estimate dot drifts — then snaps back onto the cyan true dot as the rover rolls over the red mat.', 70, [
        ['spark', 'Count your moves between landmarks. Reset at every landmark. The drift never gets the chance to grow big.'],
        ['myrobot', 'Like a walker counting steps between signposts.'],
        ['guest', 'Every real rover does this: wheels for the short term, landmarks or stars for the truth.', CREW.haddad],
      ]),
      scene('Back at the start box after a full square.', 'The orange and cyan dots sit almost on top of each other.', 35, [
        ['guest', 'Four centimetres off after six metres of snow. That’s a survey I’d sign.', CREW.raman],
      ]),
    ], 'Now the rover can find its way to the cores. But they are fragile — one bump and they shatter.'),
    build: {
      part: { slot: 'sensor', id: 'color' },
      action: 'swap',
      narration: 'Swap the line sensor for the colour sensor: it reads the colour of the floor right under you.',
      why: 'Each marker colour means a known place on the map; the colour sensor recognises it.',
      tryWithout: 'Without a way to recognise the markers, the rover drives right over them and keeps drifting.',
      physicsEffect: 'Reads red, green, blue, yellow, white or black under its own LED light.',
      realWorld: 'Warehouse robots drive between floor QR codes or markers, resetting their position at each one.',
    },
    code: challenge({
      title: 'Snap to Red',
      mission: 'Drive up the left edge, keeping y up to date. When the floor is red, set x and y to the red marker’s position (0, 150) and say them.',
      arena: arena(SURVEY_GRID, { requires: ['move', 'see-color'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, FLOOR_COLOR, SAY],
      example: [
        'variable_set(x, 0); variable_set(y, 0)',
        'repeat_until(compare(floor_color = red)) { drive_distance(10, 30); variable_change(y, 10) }',
        'say(variable_get(y))  ← the drifted estimate',
        'variable_set(x, 0); variable_set(y, 150)  ← the landmark’s surveyed position',
        'say(variable_get(y))',
      ],
      success: [crit('stop-in-zone', 'Stops on the red marker.'), crit('uses-blocks', 'Resets x and y to (0, 150) when red is seen.')],
      two: 'You said the drifted estimate before resetting it, so you can see the error.',
      three: 'You worked out the drift (estimate − true).',
      hints: ['Count in small steps until the floor is red.', 'On the landmark, replace the estimate with the surveyed numbers.', 'When floor colour is red: set x to 0, set y to 150.'],
    }),
    challenge: challenge({
      title: 'The Square with Landmarks',
      mission: 'Drive the square survey again, but whenever you cross a marker (red, blue or yellow), reset x and y to its surveyed position. Finish within 10 cm of the start.',
      arena: arena(SURVEY_GRID, { requires: ['move', 'see-color'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, FLOOR_COLOR, SAY],
      example: [
        'variable_set(x, 0); variable_set(y, 0); variable_set(dir, 0)',
        'repeat(4) {',
        '  repeat(15) {',
        '    drive_distance(10, 30)',
        '    if (compare(variable_get(dir) = 0)) { variable_change(y, 10) }  … same for dir 1–3 …',
        '    if (compare(floor_color = red)) { variable_set(x, 0); variable_set(y, 150) }',
        '    if (compare(floor_color = blue)) { variable_set(x, 150); variable_set(y, 150) }',
        '    if (compare(floor_color = yellow)) { variable_set(x, 150); variable_set(y, 0) }',
        '  }',
        '  turn_degrees(−90, 40); variable_change(dir, 1); if (compare(variable_get(dir) = 4)) { variable_set(dir, 0) }',
        '}',
        'say(variable_get(x)); say(variable_get(y))',
      ],
      success: [crit('stop-in-zone', 'Ends within 10 cm of the start.'), crit('uses-blocks', 'Resets the estimate at every marker crossed.')],
      two: 'Your end error is smaller than in Session 15 (both recorded).',
      three: 'You used the landmark resets to correct the remaining distance, not just the report.',
      hints: ['Move in small steps so you notice each marker.', 'Each colour means one known (x, y).', 'Use the corrected estimate to decide how far is left on each side.'],
    }),
    quiz: [
      q('The rover’s estimate says (0, 162) when it rolls onto the red marker surveyed at (0, 150). What should it do?', [
        right('Set its estimate to (0, 150): the landmark is more trustworthy', '📍'),
        wrong('Keep (0, 162): its own counting is more accurate', '🧮', 'odometry-is-exact'),
        wrong('Average them to (0, 156)', '➗', 'average-everything'),
      ], 'The marker was surveyed exactly; the counted estimate has drifted. A landmark fix replaces the drifted estimate.'),
      q('Why not use only landmarks and skip odometry?', [
        right('Between landmarks the rover still needs to know where it is', '🛤️'),
        wrong('Landmarks are less accurate than counting', '🎯', 'odometry-is-exact'),
        wrong('No reason: landmarks alone are enough', '✔️', 'landmarks-everywhere'),
      ], 'Landmarks are occasional. Odometry fills the gaps between them; landmarks stop the drift growing. Together they work.'),
      q('After a landmark reset, the drift…', [
        right('starts again from zero and grows until the next landmark', '🔄'),
        wrong('is gone for the rest of the trip', '✨', 'landmarks-everywhere'),
        wrong('keeps growing from where it was', '📈', 'errors-cancel'),
      ], 'A reset removes the error built up so far; new slips start a fresh, small error until the next landmark.'),
    ],
    badge: { id: 'l3-landmark-navigator', name: 'Landmark Navigator', icon: '🗺️', earnedFor: 'You used landmarks to correct your robot’s drifting position estimate.' },
    reward: { note: 'Colour sensor fitted: landmarks now snap your map estimate back to the truth.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Signposts', 'why do counting and landmarks work better together?'),
      warmup: {
        title: 'Signposts',
        minutes: 5,
        steps: ['Repeat last session’s blind walk, but put two coloured sheets on the grid with their coordinates written on them.', 'When the walker’s foot touches a sheet, a partner reads the coordinates aloud and the walker updates their guess.', 'Compare the final error with last time.'],
        materials: ['Two coloured A4 sheets with coordinates', 'The taped grid from Session 15'],
      },
      discussion: ['What landmarks do you use to find your way? (A shop, a tree, a station sign.)', 'What happens if a landmark is moved or hidden by snow?'],
      misconceptions: [
        mc('odometry-is-exact', 'If the maths is right, odometry is exact.', 'Odometry assumes every commanded move happened exactly; slip and bumps make the real moves differ.', 'Roll a toy car “one metre” by pushing it a fixed effort on a rug and on a table; measure both. Same command, different result.'),
        mc('average-everything', 'When two estimates disagree, average them.', 'When one source is known to be far more accurate (a surveyed landmark), trust it; averaging adds the other’s error back in.', 'Ask: your watch says 9:07, the station clock (set by satellite) says 9:00. Do you average to 9:03? Discuss which to trust and why.'),
        mc('landmarks-everywhere', 'With landmarks you never need to count moves.', 'Landmarks are only sometimes in view; between them the robot still estimates by counting.', 'Walk the grid with only the landmark sheets and no counting: where are you between them? Students realise they need both.'),
        mc('errors-cancel', 'Small errors cancel out over a long trip.', 'Errors usually accumulate; the uncertainty grows with distance unless something corrects it.', 'Each student draws a 5 cm line without a ruler, ten times end to end. Measure the total against 50 cm. Compare the class: errors grew.'),
      ],
      faster: ['Add a fourth landmark and compare end errors with three and four markers.', 'Report the size of each correction (how far the estimate jumped).'],
      slower: ['Use only the red marker on one straight run.', 'Write the three marker positions on a card next to the screen.'],
      notes: ['Mars Rover Command (Pilot tier) is the playable challenge: dead reckoning against sensing, with landmarks to check against.'],
    }),
    parent: {
      today: 'Your child made their robot correct its own position using coloured landmarks with known positions on a map.',
      tryAtHome: 'On a walk, count steps between two landmarks (a lamp post, a gate). Next time, check your count when you reach the landmark.',
      askYourChild: 'Why does your robot trust a landmark more than its own counting?',
    },
  }),

  // ── 17 ───────────────────────────────────────────────────────────────────
  makeSession(L, 17, {
    objectives: [
      o('Approaches an object with speed proportional to the remaining distance (with a minimum speed) and stops within a tolerance before gripping.', 'I can make my robot slow down as it gets close and stop gently.', ['programming', 'algorithms']),
      o('Sequences approach, grip and retreat so a fragile object is never hit fast.', 'I can plan the steps to pick up something fragile safely.', ['algorithms'], { concepts: ['sequences'] }),
    ],
    episode: episode('Handle With Care', 'The rover learned to fix its drifting position with landmarks.', [
      scene('The ice-core bay. A long, glassy core stands upright against the wall.', 'Dr Owusu wears gloves. Her voice is quiet.', 55, [
        ['guest', 'This core holds snow from a thousand winters. Hit it at more than eight centimetres a second and it cracks.', CREW.owusu],
        ['myrobot', 'If I go slowly all the way, it takes forever. If I go fast, I crack it.'],
      ]),
      scene('Spark draws a speed graph: high far away, sloping down as the distance shrinks.', 'A little floor under the slope: the minimum speed, so the rover never stalls just short.', 70, [
        ['spark', 'Speed in proportion to the distance left: fast when far, slow when near. Like parking a car.'],
        ['myrobot', 'Speed equals gain times distance-to-go. But near zero it would crawl forever — so a minimum speed, and stop at seven centimetres.'],
        ['guest', 'Then close the gripper. Then back away slowly — the core is heavier than it looks.', CREW.owusu],
      ]),
      scene('The rover glides in, slows to a crawl, stops, grips and backs off.', 'The core rises intact. A cheer over the radio.', 35, [
        ['guest', 'A thousand winters, safe in your claw.', CREW.owusu],
      ]),
    ], 'Two cores. A whole boulder field. And the scientists want both by nightfall.'),
    build: {
      part: { slot: 'tool', id: 'gripper' },
      action: 'swap',
      narration: 'Fit the gripper: two soft jaws that close around a fragile core.',
      why: 'A gripper holds an object from both sides, so it can lift and carry without crushing or dropping it.',
      tryWithout: 'The scoop can tip a box but cannot hold an upright core: the core falls over.',
      physicsEffect: 'Gripper 0.12 kg; the jaws close round anything 4–9 cm in front of the head.',
      realWorld: 'Lab robots handle test tubes and archaeological robots lift fragile finds with soft grippers and slow, measured approaches.',
    },
    code: challenge({
      title: 'Slow Down to Stop',
      mission: 'Drive towards the core with speed = 1.5 × (distance − 7), never slower than 8 %, and stop when the distance is 7 cm or less.',
      arena: CORE_BAY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, GRIP_CLOSE, GRIP_OPEN],
      example: [
        'grip_open',
        'repeat_until(compare(distance_cm < 8)) {',
        '  variable_set(speed, math(1.5 × math(distance_cm − 7)))',
        '  if (compare(variable_get(speed) < 8)) { variable_set(speed, 8) }  ← a minimum, so it never stalls',
        '  if (compare(variable_get(speed) > 60)) { variable_set(speed, 60) }',
        '  set_motors(variable_get(speed), variable_get(speed))',
        '}',
        'stop',
      ],
      success: [crit('stop-in-zone', 'Stops 6–9 cm from the core.'), crit('no-collision', 'Never touches the core faster than 8 cm/s.')],
      two: 'You predicted the speed at 50 cm and at 10 cm before running.',
      three: 'You explained why the minimum speed is needed.',
      hints: ['How far is left? That is your error.', 'Speed = gain × (distance − 7), with a floor of 8 %.', 'Clamp the speed between 8 and 60 each loop, then set both motors to it.'],
    }),
    challenge: challenge({
      title: 'Lift the Core',
      mission: 'Approach, grip the core and back away 30 cm without dropping it. Then say “Core secured”.',
      arena: CORE_BAY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, GRIP_CLOSE, GRIP_OPEN, ...TALK],
      example: [
        'grip_open',
        'repeat_until(compare(distance_cm < 8)) {',
        '  variable_set(speed, math(1.5 × math(distance_cm − 7)))',
        '  if (compare(variable_get(speed) < 8)) { variable_set(speed, 8) }',
        '  if (compare(variable_get(speed) > 60)) { variable_set(speed, 60) }',
        '  set_motors(variable_get(speed), variable_get(speed))',
        '}',
        'stop; grip_close; wait(0.5)',
        'drive_distance(−30, 20)',
        'say("Core secured")',
      ],
      success: [crit('deliver-object', 'The core is held in the gripper 30 cm back from the wall.'), crit('no-collision', 'Never hits the core faster than 8 cm/s or the wall at all.')],
      two: 'Works from three different start distances.',
      three: 'Your approach is faster than driving the whole way at 8 %, with evidence from the timer.',
      hints: ['Approach first; grip only when stopped.', 'Wait a moment after closing so the jaws hold.', 'Reverse slowly: drive_distance(−30, 20).'],
    }),
    quiz: [
      q('The core is 47 cm away and the rule is speed = 1.5 × (distance − 7). What speed does the rover use?', [
        right('60 %', '🧮'),
        wrong('70.5 %', '✖️', 'forget-the-offset'),
        wrong('8 %, because the minimum is always used near objects', '🐢', 'minimum-always-applies'),
      ], 'distance − 7 = 40; 1.5 × 40 = 60. Forgetting the 7 gives 1.5 × 47 = 70.5. The minimum only applies when the rule gives less than 8.'),
      q('Why does the approach need a minimum speed?', [
        right('Without it the speed shrinks towards zero and the rover stalls just short of the core', '🛑'),
        wrong('To make it faster overall', '⚡', 'minimum-always-applies'),
        wrong('It doesn’t; proportional control always reaches the target', '🎯', 'proportional-reaches-target'),
      ], 'As the distance left shrinks, gain × distance gets tiny — too small to overcome friction. A small minimum keeps the robot creeping until it is close enough to stop.'),
      q('What is the safest order for picking up the core?', [
        right('Approach slowly, stop, close the gripper, then back away slowly', '✅'),
        wrong('Close the gripper while still driving in, to save time', '⏩', 'grip-while-moving'),
        wrong('Drive in fast and let the gripper’s softness absorb the hit', '💥', 'grip-while-moving'),
      ], 'Grip only when stopped, so the jaws close round the core rather than knocking it. Every step stays below the cracking speed.'),
    ],
    badge: { id: 'l3-gentle-hands', name: 'Gentle Hands', icon: '🤲', earnedFor: 'You approached and lifted a fragile object with a smooth, proportional approach.' },
    reward: { note: 'Gripper refitted: soft jaws for fragile samples.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Park the toy car', 'why slow down in proportion, instead of braking at the last moment?'),
      warmup: {
        title: 'Park the toy car',
        minutes: 5,
        steps: ['A student pushes a toy car towards a pencil “wall” and tries to stop 1 cm from it without touching.', 'First at constant speed, then slowing down as they get closer.', 'Ask: which was easier, and why?'],
        materials: ['A toy car', 'A pencil or ruler as the wall'],
      },
      discussion: ['Where do people slow down in proportion to the distance left? (Parking, catching a ball, putting a glass down.)', 'Why might a real robot also limit its maximum speed near people?'],
      misconceptions: [
        mc('forget-the-offset', 'The error is just the distance reading.', 'The error is the distance still to go: reading − target (here, distance − 7).', 'Ask: you want to stop 7 cm from the wall and you are 47 cm away. How far is left? Write the expression together and test it with three readings.'),
        mc('minimum-always-applies', 'A minimum speed means the robot always goes at that speed near objects.', 'The minimum only takes over when the proportional rule asks for less; otherwise the rule decides.', 'Table: distance 47, 27, 12, 9 → rule speed 60, 30, 7.5, 3 → used speed 60, 30, 8, 8. Students fill in the last column.'),
        mc('proportional-reaches-target', 'Proportional control always reaches the target exactly.', 'A pure proportional rule gets slower and slower near the target and can stall short (a steady-state error).', 'Halve the distance to the wall each step with a toy car: 40, 20, 10, 5… When do you arrive? Never — unless you add a minimum or a stop rule.'),
        mc('grip-while-moving', 'Grabbing while moving saves time safely.', 'Gripping while moving knocks fragile objects; stop first, then grip.', 'Try to pick up a paper cup while walking past it versus stopping first. Which squashes or tips it?'),
      ],
      faster: ['Make the retreat proportional too: slow at first, faster once clear.', 'Find the largest gain that never exceeds 8 cm/s at contact.'],
      slower: ['Give the clamping lines; students set the gain and the stop distance.', 'Approach only; add the grip as a second step.'],
      notes: ['Orbit Repair Crew (Pilot tier) is the playable challenge: a slow, precise approach to grapple a supply ship.'],
    }),
    parent: {
      today: 'Your child programmed a gentle approach: the robot slows down in proportion to the distance left and picks up a fragile ice core.',
      tryAtHome: 'Put a full glass down on a table without a sound. Notice how you slow down more as you get closer.',
      askYourChild: 'Why does your robot need a minimum speed when it gets close?',
    },
  }),

  // ── 18 ───────────────────────────────────────────────────────────────────
  makeSession(L, 18, {
    objectives: [
      o('Designs a two-sample mission that combines a justified drive choice, landmark-corrected navigation and a proportional approach.', 'I can design a mission that brings back two fragile samples.', ['engineering-design', 'programming']),
      o('Justifies a design trade-off using data from earlier sessions.', 'I can justify my design with my own data.', ['communication', 'data'], { concepts: ['design-process'] }),
    ],
    episode: episode('Sample Return', 'The rover lifted a fragile core with a gentle, proportional approach.', [
      scene('The boulder field at dusk. Two sample circles glow on the map.', 'Dr Owusu and Leila look at the forecast: a storm front by morning.', 55, [
        ['guest', 'Two cores, both intact, back before the weather turns. How you do it is up to you.', CREW.owusu],
        ['guest', 'Bring your fair-test data. I want to know WHY you chose your drive.', CREW.haddad],
      ]),
      scene('The planning table: a map, the Session 13 results table, the Session 17 approach graph.', 'The robot plans a route past two landmarks.', 50, [
        ['myrobot', 'Legs for the rocks, landmarks to stay on course, the slow approach for each core. One thing at a time.'],
      ]),
    ], 'Both cores come home. And then the sky turns white.'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Choose your sample tool: gripper or scoop. Your mission, your choice.',
      why: 'The tool must hold an upright core securely over rough ground — choose the one your tests support.',
      tryWithout: 'With no tool the rover can reach the cores but not bring them home.',
      physicsEffect: 'Gripper 0.12 kg (holds upright cores); scoop 0.10 kg (holds boxes, tips cores over).',
      realWorld: 'NASA’s Perseverance rover collects rock cores in sealed tubes so they survive the journey.',
    },
    code: challenge({
      title: 'First Core Home',
      mission: 'Navigate to the first sample circle using your landmark-corrected estimate, pick up the core with your gentle approach, and return to the start.',
      arena: arena(BOULDER_FIELD, { requires: ['move', 'rough-ground', 'see-wall', 'see-color', 'grab'], features: ['Rocks up to 4 cm; boulders at (3,4) and (5,2).', 'Core A at (6,1), core B at (1,2), each in front of a small snow wall.', 'Marker mats: red at (0,4), blue at (6,4).'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, ...TALK],
      example: [
        'variable_set(y, 0)',
        'repeat_until(compare(floor_color = red)) { drive_distance(10, 40); variable_change(y, 10) }',
        'variable_set(y, 150)  ← landmark fix',
        'drive_distance(150, 40); turn_degrees(−90, 40); drive_distance(250, 40); turn_degrees(90, 40)',
        '… gentle approach from Session 17, grip, reverse, drive home …',
      ],
      success: [crit('deliver-object', 'Core A returns to the start box, still upright in the tool.'), crit('no-collision', 'Never hits a core faster than 8 cm/s.')],
      two: 'You used at least one landmark fix on the way.',
      three: 'You reused your Session 17 approach without changing its gain.',
      hints: ['Break it down: go, approach, grip, return.', 'Fix your position at the red marker before the long leg.', 'Reuse the approach loop you already tested.'],
    }),
    challenge: challenge({
      title: 'Sample Return Mission',
      mission: 'Your design: collect both cores from the boulder field and bring them back without dropping them. Justify your drive with your Session 13 data, approach with proportional control and correct your position with landmarks.',
      arena: arena(BOULDER_FIELD, { requires: ['move', 'rough-ground'], features: ['Rocks up to 4 cm; boulders at (3,4) and (5,2).', 'Core A at (6,1), core B at (1,2), each in front of a small snow wall.', 'Marker mats: red at (0,4), blue at (6,4).', 'Sample rack in the start box holds two cores.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, FLOOR_COLOR, GRIP_OPEN, GRIP_CLOSE, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(samples, 0)',
        '… go to core A with landmark fixes; gentle approach; grip; return; open at the rack; change samples by 1 …',
        '… the same for core B …',
        'say(variable_get(samples))',
      ],
      success: [crit('deliver-object', 'Both cores end in the sample rack, intact.'), crit('no-collision', 'No core is hit faster than 8 cm/s or dropped.'), crit('uses-blocks', 'Uses proportional approach and at least one landmark fix.')],
      two: 'Your written justification quotes your Session 13 numbers.',
      three: 'You can explain the trade-off you made and one failure you fixed.',
      hints: ['Plan the route on paper first, with the landmarks marked.', 'Get one core home reliably before adding the second.', 'If a core is dropped, slow the retreat down.'],
    }),
    quiz: [
      q('Your rover brought back core A but dropped core B on the way home over the rocks. What is the best next step?', [
        right('Find the moment it was dropped, change one thing (like retreat speed), and test again', '🔍'),
        wrong('Start the whole design again from scratch', '🗑️', 'restart-on-failure'),
        wrong('Run it again unchanged — it was probably bad luck', '🎲', 'restart-on-failure'),
      ], 'Debug from evidence: replay, find when and where it failed, change one thing, retest. Starting over throws away what already works.'),
      q('Why justify your drive choice with your Session 13 data?', [
        right('Evidence shows the choice fits this mission; a preference does not', '📊'),
        wrong('Because legs are always the right answer for snow', '🦿', 'one-drive-is-best'),
        wrong('Data doesn’t matter if the robot finishes', '🏁', 'data-after-the-fact'),
      ], 'A justified choice can be checked and improved by others. “It finished once” does not tell you whether it will finish tomorrow.'),
      q('Which part of your mission gives the most protection against hitting a core too fast?', [
        right('The proportional approach with a speed limit near the core', '🤲'),
        wrong('Driving the whole route at top speed to save battery', '⚡', 'faster-saves-energy'),
        wrong('The landmark fixes', '🗺️', 'data-after-the-fact'),
      ], 'Landmarks keep you on course; the approach controls contact speed. Each part of the design has its own job.'),
    ],
    badge: { id: 'l3-sample-return', name: 'Sample Return', icon: '🧊', earnedFor: 'You designed and ran a two-sample mission backed by your own data.' },
    reward: { note: 'Project saved to your gallery: Sample Return Mission, with your design justification.' },
    teacher: teacher({
      timing: projectPlan(3, 'Mission map (pairs mark the route, landmarks and both cores on a paper map)'),
      warmup: {
        title: 'Mission map',
        minutes: 3,
        steps: ['Hand out a paper copy of the boulder field grid.', 'Pairs mark the start, both cores, both landmarks and a first route.', 'Circle the riskiest part of the route.'],
        materials: ['Printed boulder field grid (one per pair)', 'Coloured pencils'],
      },
      discussion: ['Which earlier session’s work did you reuse, and how did that save time?', 'What would you change if the cores were twice as far apart?'],
      misconceptions: [
        mc('restart-on-failure', 'When a design fails, start again or just rerun it.', 'Use the failure as evidence: locate it, change one thing, retest.', 'Show a replay where the core drops at the second rock. Pairs list three possible causes and design one test for each.'),
        mc('one-drive-is-best', 'One kind of drive is the best everywhere.', 'Each drive suits some ground; the environment decides.', 'Sort pictures of terrain (floor, stairs, sand, rubble, road) under wheels, tracks, legs. Discuss where they disagree.'),
        mc('data-after-the-fact', 'Data is only needed after something goes wrong.', 'Data guides choices before the mission and shows why they work; it is part of the design.', 'Two design pitches: one says “legs feel right”, one quotes a results table. Which would a scientist fund? Why?'),
        mc('faster-saves-energy', 'Driving faster saves energy because it takes less time.', 'Faster driving usually costs more energy per metre (friction, acceleration losses) even though it is on for less time.', 'Compare cycling slowly and sprinting the same distance: which leaves you more tired? Then check the energy table rows for 40 % and 80 %.'),
      ],
      faster: ['Bring both cores in one trip (the rack holds two? design a way).', 'Add a fail-safe: if a core is not held after gripping (distance > 12), retry once.'],
      slower: ['Collect one core reliably; the second is a stretch goal.', 'Reuse the Session 17 program unchanged for each approach.'],
      notes: ['Self-checks are reflection only and never gate the badge.', 'Share in the class gallery only; never public.'],
    }),
    parent: {
      today: 'Your child designed a two-sample return mission, combining their drive choice, landmark navigation and a gentle approach.',
      tryAtHome: 'Plan a “two-stop errand” with your child: what order, what to carry, what could go wrong, and how you would know.',
      askYourChild: 'What evidence did you use to choose your robot’s drive?',
    },
  }),
]
