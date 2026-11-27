// lib/kids/curriculum/level2/act1.ts
// Level 2, Act 1 (sessions 1–6): "Measuring the Islands".
// The bottle from Lantern Hill leads to the Windward Isles, whose ferry broke
// in the storm. The child's robot becomes the islands' post rover: exact
// distances with wheel encoders, any angle, four wheels for heavy mail, curves
// with two motors, and the first project — a map of an island.

import { levelByNumber } from '../levels'
import type { Project } from '../types'
import { episode, L2_LESSON_MIN, lessonTiming, obj, projectTiming, teacher } from './shared'
import type { L2Quiz, L2Session } from './types'

export function l2Project(session: number): Project {
  const p = levelByNumber(2).projects.find((x) => x.session === session)
  if (!p) throw new Error(`Level 2 has no project at session ${session}`)
  return p
}

// ── 1 ────────────────────────────────────────────────────────────────────
const Q1: L2Quiz = [
  {
    prompt: 'Which part of the post rover THINKS?',
    options: [
      { text: 'The wheels', icon: '🛞', misconception: 'parts-do-everything' },
      { text: 'The program running on its tiny computer', icon: '🧠' },
      { text: 'The person holding the remote control', icon: '🎮', misconception: 'robot-is-remote-control' },
    ],
    answer: 1,
    why: 'Wheels and motors ACT, sensors SENSE, and the program on the robot’s computer THINKS. If a person steers every move with a remote, the machine is not deciding anything.',
  },
  {
    prompt: 'Your rover drives forward and the program ends. What makes sure it stops right there?',
    options: [
      { text: 'A Stop block at the end', icon: '✋' },
      { text: 'Nothing — robots always stop when the program ends', icon: '🤷', misconception: 'stop-not-needed' },
      { text: 'A bigger number in the drive block', icon: '🔢', misconception: 'bigger-number-faster' },
    ],
    answer: 0,
    why: 'Motors and a moving robot can keep going for a moment. A Stop block ends the move on purpose, where you planned.',
  },
  {
    prompt: 'The Distance Eyes on your rover are…',
    options: [
      { text: 'Act — they move the rover', icon: '💪', misconception: 'parts-do-everything' },
      { text: 'Think — they decide where to go', icon: '💭', misconception: 'parts-do-everything' },
      { text: 'Sense — they measure how far away things are', icon: '👂' },
    ],
    answer: 2,
    keepOrder: true,
    why: 'The Distance Eyes send out a sound and time the echo, so they SENSE distance. The program uses that number to decide.',
  },
]

const S01: L2Session = {
  id: 'L2-S01', level: 2, number: 1, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Welcome to Windward',
  objective: 'Rebuild your robot for the islands and explain each part as sense, think or act.',
  objectives: [
    obj('L2-S01-O1', 'Classifies each robot part as sensing, thinking (the program on the controller) or acting, and explains why the program is the “think” part.', 'I can say which parts of my robot sense, think and act.', ['sense-think-act'], ['computing-systems']),
    obj('L2-S01-O2', 'Uses typed numbers and an explicit Stop block so a move ends where it was planned.', 'I can type my own numbers and stop my robot on purpose.', ['sequences'], ['programming']),
    obj('L2-S01-O3', 'Describes the needs of the islanders as a design problem for the post rover.', 'I can say what the islanders need from a post rover.', ['design-process'], ['engineering-design', 'communication'], true),
  ],
  concepts: ['sense-think-act', 'design-process'],
  newBlocks: ['stop', 'number'],
  episode: episode('A Bottle from the Islands', [
    {
      setting: 'Lantern Hill beach at sunrise. The bottle from the last episode lies open on the sand; inside, a hand-drawn map of five small islands.',
      action: 'Amara unrolls the map. Spark reads a note pinned to it. Bolt sniffs the bottle and sneezes sand.',
      lines: [
        { who: 'narrator', line: 'The bottle came from the Windward Isles: five small islands, far across the bay.' },
        { who: 'amara', line: '“Our ferry broke in the storm. We cannot get letters, medicine or school books. Please help.” It is signed: Postmaster Yusuf.' },
        { who: 'spark', line: 'No ferry means no post. But a robot could carry the post!' },
      ],
      seconds: 35,
    },
    {
      setting: 'The island harbour: a little post office with a red door, a jetty, sacks of letters.',
      action: 'The robot rolls off a fishing boat onto the jetty. Postmaster Yusuf waves a long list.',
      lines: [
        { who: 'guest', guestName: 'Postmaster Yusuf', line: 'Welcome! The lighthouse needs a parcel, the turtle beach needs nets, the farm needs seeds and the school needs books.' },
        { who: 'guest', guestName: 'Postmaster Yusuf', line: 'Every road here is different: sand, rock, a causeway the sea covers twice a day.' },
        { who: 'spark', line: 'Then we need to know exactly what every part of our robot does.' },
      ],
      seconds: 40,
    },
    {
      setting: 'Inside the post office. The robot sits on the counter under a lamp, its panels open.',
      action: 'Spark points to each part; labels pop up — SENSE (Distance Eyes, bumper), THINK (the computer), ACT (motors, tool).',
      lines: [
        { who: 'spark', line: 'Distance Eyes and bumper: they sense. The motors and the tool: they act.' },
        { who: 'amara', line: 'And the thinking happens in the program, on the tiny computer. That is the part we write.' },
        { who: 'lucia', line: 'Over the radio: Remember, a robot does exactly what you write. Even stopping.', direction: 'Nana Lucía’s voice crackles from a small radio.' },
      ],
      seconds: 40,
    },
    {
      setting: 'The jetty. A chalk circle marks the post office door, 120 cm away.',
      action: 'The robot drives, the program ends, and it keeps rolling a little past the circle. Everyone winces.',
      lines: [
        { who: 'spark', line: 'It went past! The program ended, but the robot was still rolling.' },
        { who: 'amara', line: 'We need a Stop block. And we type our own numbers now — no more picture chips.' },
        { who: 'spark', line: 'Which parts of YOUR robot sense, think and act? Tell your partner!', direction: 'Spark turns to the camera and waits.' },
      ],
      seconds: 35,
    },
  ], 'The first sack is sorted — but the lighthouse is exactly 3 metres down the jetty, and “about right” will not do.'),
  theatre: 'what-makes-a-robot',
  build: {
    part: { slot: 'body', id: 'box' },
    action: 'inspect',
    narration: 'Open your robot’s body. Find the battery, the tiny computer and the motor wires.',
    why: 'The body carries the battery (energy) and the computer (where the program thinks). Every other part plugs into it.',
    tryWithout: 'Unplug the computer and the robot has sensors and motors but nothing to decide what to do with them.',
    physicsEffect: 'Same robot as Level 1: your body choice keeps its mass, so it starts and stops at the same rate as before.',
    realWorld: 'Delivery robots on pavements in many cities have a sealed body with the battery low down and the computer protected from rain.',
  },
  arena: { kind: 'code-lab', id: 'gem-hop', task: 'Warm-up from Level 1: plan the whole path first, then build it and add a Stop at the end of your plan.', why: 'A quick recap of planned sequences so a child who joined at Level 2 (after the bridge missions) starts level with everyone.' },
  activities: [
    { id: 'sensors-bu-01', why: 'Find every sensor on a robot vacuum: what does each one sense?' },
    { id: 'sensors-bu-06', why: 'Pick the sensors a robot lawn mower needs — and see what goes wrong without them.' },
    { id: 'design-bu-01', why: 'Put the steps of the design process in order — you will use them all season.' },
  ],
  challenge: { game: 'sumo-arena', tier: 0, goal: 'Win a round on Cadet with one of the ready-made behaviours.', link: 'A sumo robot senses its rival, decides with its behaviour and acts with its motors. Sense, think, act — in a ring!' },
  quiz: Q1,
  badge: { id: 'l2-postmaster', name: 'Island Post Rover', icon: '📮', earnedFor: 'You can explain every part of your robot as sense, think or act, and stop it on purpose.' },
  reward: { note: 'Your robot is now the Windward Isles post rover. The post office sign has its name on it.' },
  teacher: teacher({
    timing: lessonTiming('Sense, think or act? Sorting cards'),
    unpluggedWarmup: {
      title: 'Sense, think or act? Sorting cards', minutes: 5,
      steps: [
        'Each table gets 12 cards: camera, wheel, motor, program, bumper, speaker, gripper, microphone, light, computer, distance sensor, battery.',
        'Sort into three piles: SENSE, THINK, ACT. One card (the battery) fits none — ask why (it gives energy to all three).',
        'Ask: where does the “think” really happen? (In the program on the computer.)',
      ],
      materials: ['Part cards (print from the teacher guide, one set per table)'],
    },
    discussion: [
      'Is a remote-control car a robot? What would it need to become one?',
      'Why does the post rover need to stop exactly at the door, not just near it?',
      'What do the islanders need most, and what would you build first?',
    ],
    differentiation: {
      faster: ['Write a program that drives, stops, says “Post!” and drives back, with every number typed.', 'Sort the part cards for a robot you invent.'],
      slower: ['Do the Code Lab warm-up with an adult pointing to each square as the robot moves.', 'Sort only six cards: two of each.'],
    },
  }, Q1),
  parent: {
    today: 'Your child rebuilt their robot as the post rover for the Windward Isles and learned to name every part as sense, think or act. They also met two new blocks: typing their own numbers and a Stop block.',
    tryAtHome: 'Look at a machine at home (a washing machine, a microwave, a phone). Ask: what does it sense? What decides? What does it do?',
    askYourChild: 'Which part of your robot does the thinking — and how do you know?',
  },
}

// ── 2 ────────────────────────────────────────────────────────────────────
const Q2: L2Quiz = [
  {
    prompt: 'Your rover carries a heavy sack. Which program still arrives at the lighthouse door, 300 cm away?',
    options: [
      { text: 'drive_for 50% for 6 seconds', icon: '⏱️', misconception: 'time-equals-distance' },
      { text: 'drive_distance 300 cm at 50%', icon: '📏' },
      { text: 'drive_for 100% for 6 seconds', icon: '⚡', misconception: 'time-equals-distance' },
    ],
    answer: 1,
    why: 'A heavy load makes the robot slower, so the same time covers less ground. drive_distance counts wheel turns with the encoders and keeps going until the wheels have rolled 300 cm.',
  },
  {
    prompt: 'On loose sand the wheels spin a little. The encoders say 300 cm. Where is the robot?',
    options: [
      { text: 'A bit short of 300 cm', icon: '⬅️' },
      { text: 'Exactly 300 cm — encoders measure the ground', icon: '🎯', misconception: 'encoders-measure-ground' },
      { text: 'Further than 300 cm', icon: '➡️', misconception: 'encoders-measure-ground' },
    ],
    answer: 0,
    why: 'Encoders count how many times the WHEELS turned. When a wheel slips, it turns without carrying the robot forward, so the robot ends up a bit short.',
  },
  {
    prompt: 'In drive_distance(120, 40), what is the 40?',
    options: [
      { text: 'How far, in centimetres', icon: '📏', misconception: 'bigger-number-faster' },
      { text: 'How many seconds', icon: '⏱️', misconception: 'time-equals-distance' },
      { text: 'How much power, in percent', icon: '🔋' },
    ],
    answer: 2,
    why: 'The first number is the distance (120 cm). The second is the motor power (40%). A slower power still goes 120 cm — it just takes longer.',
  },
]

const S02: L2Session = {
  id: 'L2-S02', level: 2, number: 2, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Wheels That Count',
  objective: 'Use wheel encoders to drive an exact wheel distance in centimetres, whatever the load or slope — and see that on ice or loose sand the wheels can still slip (measured properly in Level 3).',
  objectives: [
    obj('L2-S02-O1', 'Uses drive_distance (closed loop on wheel encoders) to cover a measured distance under different loads.', 'I can drive my robot an exact distance in centimetres.', ['feedback-control'], ['programming', 'mathematics-measurement']),
    obj('L2-S02-O2', 'Explains that encoders count wheel turns, so wheel slip on sand or ice still causes an error.', 'I can explain why a slipping wheel makes the robot come up short.', ['physics', 'feedback-control'], ['science-forces', 'computing-systems']),
  ],
  concepts: ['feedback-control', 'physics'],
  newBlocks: ['drive_distance'],
  episode: episode('Exactly Three Metres', [
    {
      setting: 'The long wooden jetty to the lighthouse path. A sack of letters and a heavy box of lamp oil.',
      action: 'The robot drives for 6 seconds with the letters and stops at the lighthouse gate. With the heavy box it stops a metre short.',
      lines: [
        { who: 'amara', line: 'Same program, same six seconds. With the letters it reached the gate. With the oil it stopped way short!' },
        { who: 'spark', line: 'Heavy means slower. Slower for six seconds means less far.' },
      ],
      seconds: 35,
    },
    {
      setting: 'Close-up inside the wheel hub: a disc with slots spins past a tiny light.',
      action: 'X-ray view. Each slot flickers the light; a counter ticks up: 1, 2, 3… The wheel rolls one full turn and the counter shows 20.',
      lines: [
        { who: 'spark', line: 'This is an encoder. Every slot that passes the light is one click. Twenty clicks, one whole turn of the wheel.' },
        { who: 'lucia', line: 'Over the radio: Measure the wheel once — say it rolls 20 centimetres in one turn — and the robot can count its way to any distance.' },
        { who: 'amara', line: 'So instead of “drive for six seconds” we say “drive until the wheels have rolled 300 centimetres”!' },
      ],
      seconds: 45,
    },
    {
      setting: 'The jetty again, then a short stretch of soft beach sand before the lighthouse steps.',
      action: 'With drive_distance the robot arrives exactly at the gate with letters AND with oil. On the sand stretch it stops a hand’s width short; the wheels spun a little.',
      lines: [
        { who: 'spark', line: 'It worked with the light sack and the heavy box!' },
        { who: 'amara', line: 'But on the sand it is a little short. The wheels counted 300… but they slipped.' },
        { who: 'spark', line: 'The encoders count wheel turns, not ground. Why does a slipping wheel make the robot fall short? Tell your partner.', direction: 'Spark turns to the camera.' },
      ],
      seconds: 45,
    },
  ], 'The lamp oil reaches the lighthouse — but Keeper Mele wants a sign painted on the beach, and signs need angles.', 'Last time, the robot became the Windward Isles post rover.'),
  build: {
    part: { slot: 'drive', id: 'wheels2' },
    action: 'inspect',
    narration: 'Look inside a wheel. See the slotted disc? That is the encoder.',
    why: 'The encoder counts wheel turns, so the program knows how far the wheels have rolled and can stop at an exact distance.',
    tryWithout: 'Without encoders the robot can only drive for a time — and a heavy load, a slope or a tired battery change how far that time takes it.',
    physicsEffect: 'drive_distance runs a closed loop on the encoders: in the simulator it reaches the target wheel distance with any load or slope, but on ice or soft sand wheel slip leaves it short.',
    realWorld: 'Warehouse robots and robot lawn mowers count wheel turns to know how far they have gone between their other position checks.',
  },
  arena: { kind: 'physics', id: 'first-drive', task: 'Reach the yellow circle twice: once with drive_for, once with drive_distance. Then swap to legs and try both again — which program still arrives?', why: 'The arena’s reference shows that time-based driving falls short with slower legs; drive_distance counts its way there either way.' },
  activities: [
    { id: 'sensors-bu-07', why: 'Twenty slots in a wheel: turn encoder clicks into centimetres.' },
    { id: 'motion-bu-05', why: 'Pick the wheel size that rolls the right distance.' },
    { id: 'control-bu-01', why: 'On–off or a little bit? Meet feedback: check, then correct.' },
  ],
  challenge: { game: 'orbit-repair', tier: 0, goal: 'On Cadet, collect the wrench and the camera, then park on the charger gently enough for the magnet to latch.', link: 'In space nothing stops you except your own careful corrections. Watch the distance, correct a little, check again — that is feedback, just like the encoders.' },
  quiz: Q2,
  badge: { id: 'l2-measurer', name: 'Measurer', icon: '📏', earnedFor: 'You can drive an exact distance with encoders and explain why slipping wheels still come up short.' },
  reward: { note: 'Your robot’s wheels now show their encoder discs in the Garage.' },
  teacher: teacher({
    timing: lessonTiming('Walk 3 metres, two ways'),
    unpluggedWarmup: {
      title: 'Walk 3 metres, two ways', minutes: 5,
      steps: [
        'Mark 3 m on the floor. One child walks for 4 seconds (counted out loud) carrying nothing, then carrying a pile of books.',
        'Then the same child counts STEPS (heel to toe) to 3 m, with and without the books. Which way arrives both times?',
        'Ask: what is your body’s encoder here? (Counting steps.) What if the floor were slippery?',
      ],
      materials: ['Masking tape', 'A metre stick', 'A pile of books'],
    },
    discussion: [
      'Why did the same six seconds take the robot less far with the heavy box?',
      'Where else do people count turns or steps to measure distance (a bicycle computer, a pedometer)?',
      'If the robot must be exact on sand, what extra information would help? (Something that sees the ground move — Level 3.)',
    ],
    differentiation: {
      faster: ['Measure your robot’s wheel in the simulator (one turn = ? cm) and predict how many encoder clicks 300 cm needs.', 'Find the power at which drive_for 6 s reaches the circle with the heavy load, then explain why it is the wrong fix.'],
      slower: ['Use only drive_distance with 100, 200 and 300 cm, and say which one reaches the circle.', 'Do the encoder activity with a real bicycle wheel and a chalk mark if one is available.'],
    },
  }, Q2),
  parent: {
    today: 'Your child learned that driving for a fixed time goes a different distance when the robot is loaded, and used wheel encoders (which count wheel turns) to drive an exact distance. They also found the catch: a slipping wheel still fools the count.',
    tryAtHome: 'Measure one of your strides along a hallway, then predict how many strides it takes to cross a room. Walk it. Try again in socks on a smooth floor.',
    askYourChild: 'Why does a slipping wheel make the robot stop short?',
  },
}

// ── 3 ────────────────────────────────────────────────────────────────────
const Q3: L2Quiz = [
  {
    prompt: 'To draw a triangle with three equal sides, how far does the robot turn at each corner?',
    options: [
      { text: '60°', icon: '◢', misconception: 'inside-angle-is-turn' },
      { text: '90°', icon: '⌐', misconception: 'turn-360-is-nothing' },
      { text: '120°', icon: '↺' },
    ],
    answer: 2,
    why: 'The robot turns by the OUTSIDE angle. Three equal turns must add up to one full turn, 360°, so each is 360 ÷ 3 = 120°.',
  },
  {
    prompt: 'A robot draws any closed shape and ends facing the way it started. How much has it turned altogether?',
    options: [
      { text: '360° — one full turn', icon: '🔄' },
      { text: '0° — it is back where it started', icon: '0️⃣', misconception: 'turn-360-is-nothing' },
      { text: 'It depends on how long the sides are', icon: '📏', misconception: 'inside-angle-is-turn' },
    ],
    answer: 0,
    why: 'Walk round a shape and you turn all the way round once. That is why the turns of a square (4 × 90°), a triangle (3 × 120°) and a hexagon (6 × 60°) all make 360°.',
  },
  {
    prompt: 'Which program draws a hexagon (six equal sides)?',
    options: [
      { text: 'repeat 6 { drive 20 cm, turn 60° }', icon: '⬡' },
      { text: 'repeat 6 { drive 20 cm, turn 120° }', icon: '🔺', misconception: 'inside-angle-is-turn' },
      { text: 'repeat 1 { drive 20 cm, turn 60° }', icon: '1️⃣', misconception: 'loop-runs-once' },
    ],
    answer: 0,
    why: '360° ÷ 6 = 60° at each corner, six times. Turning 120° six times goes round twice and draws a triangle twice over.',
  },
]

const S03: L2Session = {
  id: 'L2-S03', level: 2, number: 3, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Any Angle',
  objective: 'Turn any number of degrees and draw triangles and hexagons: to get back where you started, the robot turns all the way round once (360°).',
  objectives: [
    obj('L2-S03-O1', 'Programs turns of any angle in degrees and uses a loop to draw regular polygons.', 'I can turn my robot any angle and draw shapes with a loop.', ['sequences', 'loops'], ['programming', 'mathematics-geometry']),
    obj('L2-S03-O2', 'Explains that the exterior turns of a closed shape total 360°, and computes the turn as 360 ÷ number of sides.', 'I can work out the turn for any shape: 360 divided by the number of sides.', ['loops'], ['mathematics-geometry', 'algorithms']),
  ],
  concepts: ['sequences', 'loops'],
  newBlocks: [],
  episode: episode('Signs on the Sand', [
    {
      setting: 'The lighthouse at noon. Keeper Mele, tall in a yellow coat, stands by a huge empty beach.',
      action: 'She shows a paper with three signs: a triangle (danger: rocks), a square (post drop) and a hexagon (turtle nests).',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'Boats need signs they can see from the sea. Can your robot draw them on the sand, big and exact?' },
        { who: 'spark', line: 'A square is easy: four sides, four quarter turns. But a triangle?' },
      ],
      seconds: 30,
    },
    {
      setting: 'The beach. The robot with its pen draws a triangle using 60° turns.',
      action: 'The lines do not meet: the shape spirals open. Amara walks the shape herself, arms out, turning at each corner.',
      lines: [
        { who: 'amara', line: 'The corners inside are 60°, so I turned 60°… and it never closed!' },
        { who: 'amara', line: 'Wait — when I walk it, I turn much more than that at each corner. I turn all the way round once by the end!' },
        { who: 'spark', line: 'All the way round is 360°. Three corners: 360 divided by 3 is 120!' },
      ],
      seconds: 45,
    },
    {
      setting: 'The beach from the lighthouse balcony, high up.',
      action: 'A perfect triangle, square and hexagon appear on the sand. A fishing boat changes course around the triangle.',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'Perfect! The boats can read them.' },
        { who: 'spark', line: 'Square: 360 ÷ 4 = 90. Hexagon: 360 ÷ 6 = 60. What turn would a shape with eight sides need? Work it out with your partner.', direction: 'Spark looks at the camera.' },
      ],
      seconds: 35,
    },
  ], 'Keeper Mele asks for one more thing: the heavy mail sacks for the school are tipping the robot over on the hill.', 'Last time, encoders let the robot drive exact distances.'),
  build: {
    part: { slot: 'tool', id: 'pen' },
    action: 'swap',
    narration: 'Swap in the drawing pen from your toolbox.',
    why: 'The pen draws exactly where the robot goes, so you can SEE whether your angles close the shape.',
    tryWithout: 'Without the pen the robot drives the shape but leaves no trace — you cannot check if the ends meet.',
    physicsEffect: 'The pen draws at the turning centre, so a turn on the spot leaves a dot and the corners are sharp.',
    realWorld: 'Line-marking robots paint sports pitches and building layouts on floors, accurate to a few millimetres.',
  },
  arena: { kind: 'code-lab', id: 'square-dance', task: 'Draw the square with a loop. Then say what you would change to draw a triangle or a hexagon.', why: 'A verified loop-drawing mission: four equal sides and four equal turns. Children generalise to 360 ÷ n.' },
  activities: [
    { id: 'code-bu-06', why: 'Program a lap of the field — spot the repeating part.' },
    { id: 'motion-bu-04', why: 'Loop the night patrol so it closes up where it started.' },
    { id: 'space-bu-02', why: 'Up the crater terraces: a repeating move on Mars.' },
  ],
  challenge: { game: 'arm-factory', tier: 0, goal: 'On Cadet, move three parts into their bins using the joint sliders.', link: 'A robot arm moves by turning joints through angles. Thinking in degrees is how engineers tell every joint exactly what to do.' },
  quiz: Q3,
  badge: { id: 'l2-angle', name: 'Angle Ace', icon: '📐', earnedFor: 'You can turn any angle and know why a closed shape always turns 360°.' },
  reward: { note: 'The three signs you drew appear on the beach in your season map.' },
  teacher: teacher({
    timing: lessonTiming('Walk the shape'),
    unpluggedWarmup: {
      title: 'Walk the shape', minutes: 5,
      steps: [
        'Tape a large triangle on the floor. A child walks it, pointing straight ahead with one arm; at each corner the class counts how far the arm swings.',
        'After three corners: which way is the child facing? (The same way as at the start: one full turn.)',
        'Repeat on a square. Write on the board: turns add up to 360°.',
      ],
      materials: ['Masking tape', 'A large protractor or a paper angle wheel'],
    },
    discussion: [
      'Why did the 60° triangle spiral open?',
      'What turn would an octagon need? A shape with 10 sides?',
      'Where do you see robots or machines turning exact angles?',
    ],
    differentiation: {
      faster: ['Draw a five-pointed star: work out the turn (144°) and why the total is 720°.', 'Write a loop that draws a hexagon, then change ONE number to draw a triangle.'],
      slower: ['Draw the square, then the triangle with the turn given (120°); say why it closes.', 'Use a paper angle wheel to see 90°, 120° and 60°.'],
    },
  }, Q3),
  parent: {
    today: 'Your child used degrees to turn their robot any angle and drew a triangle, square and hexagon. The big idea: walking round any closed shape you turn all the way round once — 360° — so each turn is 360 divided by the number of sides.',
    tryAtHome: 'Walk round a table or a rug, pointing ahead. Count the corners and how far you turned at each. Did you end facing the same way?',
    askYourChild: 'Why does a triangle need 120° turns and not 60°?',
  },
}

// ── 4 ────────────────────────────────────────────────────────────────────
const Q4: L2Quiz = [
  {
    prompt: 'Which rover is hardest to tip over on the hill?',
    options: [
      { text: 'Tall and narrow, sacks on top', icon: '🗼', misconception: 'taller-is-stronger' },
      { text: 'Wide and low, sacks low down', icon: '🚙' },
      { text: 'Any rover — tipping is just bad luck', icon: '🎲', misconception: 'one-run-proves' },
    ],
    answer: 1,
    why: 'A wide base and weight kept low (a low centre of mass) make a robot hard to tip. Tall and narrow with weight on top tips easily.',
  },
  {
    prompt: 'You swap two wheels for four. What changes most?',
    options: [
      { text: 'The robot goes twice as fast', icon: '⚡', misconception: 'more-wheels-faster' },
      { text: 'The base is wider and steadier, and the load is spread out', icon: '⚖️' },
      { text: 'Nothing at all', icon: '🤷', misconception: 'more-wheels-faster' },
    ],
    answer: 1,
    why: 'Speed comes from the motors and wheel size. Four wheels make a steadier base and share the load, which helps with heavy mail.',
  },
  {
    prompt: 'You test four wheels on the hill once and it does not tip. What should you do next?',
    options: [
      { text: 'Test again a few times, and with the heaviest sack', icon: '🔁' },
      { text: 'Nothing — one good run proves it', icon: '✅', misconception: 'worked-once-done' },
      { text: 'Change the wheels and the load together and test once', icon: '🔀', misconception: 'change-everything-fair' },
    ],
    answer: 0,
    why: 'One run can be lucky. Repeat the test, and try the hardest case (the heaviest sack), changing one thing at a time.',
  },
]

const S04: L2Session = {
  id: 'L2-S04', level: 2, number: 4, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Four Wheels for Heavy Mail',
  objective: 'Swap to four wheels and test stability: wider and lower is harder to tip.',
  objectives: [
    obj('L2-S04-O1', 'Explains stability in terms of base width and the height of the centre of mass, and predicts which design tips first.', 'I can explain why wide and low is harder to tip.', ['physics'], ['science-forces', 'engineering-design']),
    obj('L2-S04-O2', 'Tests a design change more than once, including the hardest case, before deciding.', 'I can test a change several times before I decide.', ['design-process'], ['engineering-design', 'data']),
  ],
  concepts: ['physics', 'design-process'],
  newBlocks: [],
  episode: episode('The Sack That Tipped', [
    {
      setting: 'The steep track up to the island school, Ms Hana waiting at the gate with an empty bookshelf.',
      action: 'The two-wheeled robot climbs with a tall stack of book sacks on its back. Halfway up it wobbles and tips backwards; books slide out.',
      lines: [
        { who: 'guest', guestName: 'Ms Hana, the island teacher', line: 'Our books! Is the robot all right?' },
        { who: 'spark', line: 'It is fine — but it tipped. Tall pile, narrow robot, steep hill.' },
      ],
      seconds: 35,
    },
    {
      setting: 'The post office floor. Amara builds two towers of matchboxes: one tall and thin, one wide and low.',
      action: 'She tilts a board under both. The tall one falls first; the wide one slides but stays upright.',
      lines: [
        { who: 'amara', line: 'The wide, low one stays up much longer. Its weight is low and its feet are far apart.' },
        { who: 'spark', line: 'Then the rover needs a wider base. Four wheels!' },
        { who: 'lucia', line: 'Over the radio: And pack the heavy sacks low, near the wheels. Then test it more than once.' },
      ],
      seconds: 40,
    },
    {
      setting: 'The school track again.',
      action: 'The four-wheeled robot climbs with sacks packed low. It tries three times, once with an extra sack; it never tips. Ms Hana cheers.',
      lines: [
        { who: 'guest', guestName: 'Ms Hana, the island teacher', line: 'Three times up and not one wobble!' },
        { who: 'spark', line: 'Is four wheels FASTER, though? Or just steadier? What do you think — and how could you test it?', direction: 'Spark asks the camera.' },
      ],
      seconds: 35,
    },
  ], 'The books arrive — but the farm road has a sharp bend round a pond, and the rover can only drive straight lines and corners.', 'Last time, the robot drew signs on the beach with exact angles.'),
  build: {
    part: { slot: 'drive', id: 'wheels4' },
    action: 'swap',
    narration: 'Swap your two wheels for four wheels. Look at how much wider your robot stands now.',
    why: 'Four wheels make a wider base and share the weight, so heavy mail on a slope is much less likely to tip the robot.',
    tryWithout: 'With two wheels and a tall load, the hill tips the robot backwards.',
    physicsEffect: 'Four wheels widen the support base and carry more load; in the simulator they are steadier on slopes but turn on the spot a little less easily (the wheels scrub sideways).',
    realWorld: 'Planetary rovers and farm robots use four or six wheels spread wide so they do not tip on rocks and slopes.',
  },
  arena: { kind: 'physics', id: 'sand-trap', task: 'Cross the sand with two wheels, then with four. Run each twice. Which one gets across, and how do you know it was not luck?', why: 'A verified arena where the drive changes the result. Children run it twice per drive: the habit the fair test in session 13 needs.' },
  activities: [
    { id: 'mechanics-bu-06', why: 'The tall parcel problem: where should the heavy box go?' },
    { id: 'motion-bu-10', why: 'Over the hill and down again without tipping.' },
    { id: 'design-bu-05', why: 'Balance the robot for the ramp, then test it.' },
  ],
  challenge: { game: 'bio-bots', tier: 1, goal: 'On Pilot, get the four-legged walker across the swaying bridge by choosing how many feet stay on the ground.', link: 'Animals stay up by keeping enough feet down and a wide stance. Wide and low, again!' },
  quiz: Q4,
  badge: { id: 'l2-steady', name: 'Steady Builder', icon: '🚙', earnedFor: 'You can explain why wide and low is hard to tip, and you tested your change more than once.' },
  reward: { unlocks: { slot: 'drive', id: 'wheels4' }, note: 'Four wheels join your toolbox for good.' },
  teacher: teacher({
    timing: lessonTiming('Tip the tower'),
    unpluggedWarmup: {
      title: 'Tip the tower', minutes: 5,
      steps: [
        'Two towers of the same blocks: one tall and thin, one wide and low. Put both on a book and lift one end slowly.',
        'Before lifting: predict which falls first. Record the prediction.',
        'Repeat with a heavy rubber on top of the wide tower. Ask: what made the difference?',
      ],
      materials: ['Building blocks or matchboxes', 'A hardback book or board', 'A heavy rubber'],
    },
    discussion: [
      'Why did packing the sacks low help?',
      'Name a vehicle that is wide and low on purpose. Why?',
      'Four wheels were steadier. What might they make worse?',
    ],
    extra: ['more-wheels-faster'],
    differentiation: {
      faster: ['Design a test that checks whether four wheels are faster on the flat. What must stay the same?', 'Explain why a racing car is low and a lorry carries heavy loads low down.'],
      slower: ['Do the tipping test with real blocks before the simulator.', 'Compare only two wheels and four wheels, once each, then talk about why we repeat.'],
    },
  }, Q4),
  parent: {
    today: 'Your child swapped their robot to four wheels and found out why wide and low is harder to tip, then practised testing a change more than once before deciding.',
    tryAtHome: 'Stack plastic cups tall and narrow, then wide and low. Tilt a tray under each. Which tips first? Try it three times.',
    askYourChild: 'Why did the rover stop tipping on the school hill?',
  },
}

// ── 5 ────────────────────────────────────────────────────────────────────
const Q5: L2Quiz = [
  {
    prompt: 'set_motors(left 60, right 30). Which way does the rover curve?',
    options: [
      { text: 'Right', icon: '↪️' },
      { text: 'Left', icon: '↩️', misconception: 'steer-needs-wheel-turn' },
      { text: 'Straight on', icon: '⬆️', misconception: 'same-power-curves' },
    ],
    answer: 0,
    why: 'The left wheels go faster than the right, so the left side travels further and the robot swings round to the right.',
  },
  {
    prompt: 'How do you make the curve round the pond TIGHTER?',
    options: [
      { text: 'Give both motors more power', icon: '⏫', misconception: 'same-power-curves' },
      { text: 'Make the difference between left and right bigger', icon: '↔️' },
      { text: 'Make the difference smaller', icon: '↕️', misconception: 'same-power-curves' },
    ],
    answer: 1,
    why: 'The bigger the difference between the two sides, the tighter the curve. No difference at all means (nearly) straight.',
  },
  {
    prompt: 'Your rover has no steering wheel and its wheels cannot swivel. Can it still steer?',
    options: [
      { text: 'No — it can only go straight', icon: '🚫', misconception: 'steer-needs-wheel-turn' },
      { text: 'Only if a person pushes it', icon: '🫸', misconception: 'robot-is-remote-control' },
      { text: 'Yes — by driving the two sides at different speeds', icon: '🔀' },
    ],
    answer: 2,
    why: 'This is called differential steering. Tanks, robot vacuums and most rovers steer by speed difference, not by turning wheels.',
  },
]

const S05: L2Session = {
  id: 'L2-S05', level: 2, number: 5, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Curves with Two Motors',
  objective: 'Steer with different left and right motor power to drive smooth curves.',
  objectives: [
    obj('L2-S05-O1', 'Uses set_motors with unequal left and right power to drive a curve, and predicts its direction.', 'I can make my robot curve by giving the two sides different power.', ['physics', 'sequences'], ['programming', 'science-forces']),
    obj('L2-S05-O2', 'Relates the size of the power difference to how tight the curve is.', 'I can make a curve tighter or wider.', ['physics'], ['science-forces', 'mathematics-measurement']),
  ],
  concepts: ['physics', 'sequences'],
  newBlocks: ['set_motors'],
  episode: episode('Round the Duck Pond', [
    {
      setting: 'The farm road on the second island. A round pond with ducks sits right in the middle of the bend.',
      action: 'The robot drives straight, stops, turns 90° on the spot, drives straight. Its corner clips the pond edge and a duck flaps away, cross.',
      lines: [
        { who: 'guest', guestName: 'Farmer Anahí', line: 'Careful! Those ducks have eggs. Can your robot go round smoothly, like my bicycle?' },
        { who: 'amara', line: 'Our robot only knows straight lines and sharp corners.' },
      ],
      seconds: 35,
    },
    {
      setting: 'Close-up under the robot: two motors, one for each side.',
      action: 'The left motor spins faster (a long glowing arrow), the right slower (a short arrow). The robot traces a gentle arc.',
      lines: [
        { who: 'spark', line: 'Each side has its own motor. If the left side goes faster than the right, the left side travels further…' },
        { who: 'amara', line: '…so the robot swings round to the right, like runners on the outside lane of a track!' },
        { who: 'spark', line: 'The new block, set_motors, gives each side its own power.' },
      ],
      seconds: 40,
    },
    {
      setting: 'The pond bend, early evening, ducks settled on their nest.',
      action: 'The robot sweeps around the pond in one smooth curve. Farmer Anahí rings her bicycle bell in approval.',
      lines: [
        { who: 'guest', guestName: 'Farmer Anahí', line: 'Smooth as a bicycle. The ducks did not even look up!' },
        { who: 'spark', line: 'To curve LEFT round the pond on the way back, which side gets more power? Show your partner with your hands.', direction: 'Spark holds up two hands.' },
      ],
      seconds: 35,
    },
  ], 'With curves, angles and exact distances, the robot could draw a whole island. Postmaster Yusuf has an idea.', 'Last time, four wheels kept the heavy mail from tipping.'),
  build: {
    part: { slot: 'drive', id: 'wheels4' },
    action: 'inspect',
    narration: 'Look underneath: the left wheels share one motor, the right wheels share another.',
    why: 'Two motors that can run at different speeds let the robot steer without any wheel turning sideways.',
    tryWithout: 'If both sides always ran at the same speed, the robot could only go straight or spin on the spot.',
    physicsEffect: 'set_motors sets each side’s power from −100 to 100%. In the simulator the curve radius grows as the difference shrinks; four wheels scrub a little in tight curves.',
    realWorld: 'Robot vacuums, tanks, diggers and the Mars rovers’ cousins on Earth all steer by running their sides at different speeds.',
  },
  arena: { kind: 'physics', id: 'first-drive', task: 'Reach the yellow circle without a single turn block: use set_motors to curve into it, then stop.', why: 'An open, verified arena: any program that reaches the circle passes, so a curve is a fair alternative route.' },
  activities: [
    { id: 'motion-bu-01', why: 'Drive for the right time — then see why a curve is longer than a straight line.' },
    { id: 'motion-bu-08', why: 'Predict what happens as a motor speeds up.' },
    { id: 'space-bu-03', why: 'Drive to the rock slowly: speed, time and distance on Mars.' },
  ],
  challenge: { game: 'robot-surgeon', tier: 0, goal: 'On Cadet, drive the delivery robot from the pharmacy to three ward doors and back to its charger without bumping anyone.', link: 'Hospital delivery robots curve smoothly round people and corners, steering by speed difference — exactly what you just did.' },
  quiz: Q5,
  badge: { id: 'l2-curves', name: 'Smooth Steerer', icon: '〰️', earnedFor: 'You can make a curve with two motors and make it tighter or wider.' },
  reward: { note: 'The duck pond on your season map now has a smooth tyre track round it.' },
  teacher: teacher({
    timing: lessonTiming('Two-person wheelbarrow walk'),
    unpluggedWarmup: {
      title: 'Two-person curve walk', minutes: 5,
      steps: [
        'Two children link arms side by side. The left child takes big steps, the right child small steps. Which way do they curve?',
        'Swap: small left, big right. Then both equal.',
        'Ask: how would you make the curve tighter?',
      ],
      materials: ['Space to walk in pairs'],
    },
    discussion: [
      'Why do runners on the outside lane start further ahead?',
      'What happens if one side goes forwards and the other backwards?',
      'When is a smooth curve better than stop–turn–go? When is it worse?',
    ],
    differentiation: {
      faster: ['Find the set_motors values that drive a full circle and return to the start.', 'Spin on the spot with set_motors (one side forwards, one backwards) and compare with turn_degrees.'],
      slower: ['Try three pairs only: (60, 30), (30, 60), (50, 50). Say what each does before running it.', 'Do the arm-linked walk again and match it to the blocks.'],
    },
  }, Q5),
  parent: {
    today: 'Your child learned that their robot steers by running its left and right motors at different speeds — no steering wheel needed — and drove smooth curves around a pond.',
    tryAtHome: 'Push a toy car with one hand on each side, one hand moving faster. Which way does it curve? Or watch a robot vacuum or a digger turn.',
    askYourChild: 'How does your robot turn left without turning any wheels?',
  },
}

// ── 6 ────────────────────────────────────────────────────────────────────
const Q6: L2Quiz = [
  {
    prompt: 'Your island has 4 bays, each drawn the same way. How do you draw them with the fewest blocks?',
    options: [
      { text: 'Put one bay inside a repeat 4 loop', icon: '🔁' },
      { text: 'Copy the bay blocks four times', icon: '📋', misconception: 'loop-runs-once' },
      { text: 'Draw one bay and hope', icon: '🤞', misconception: 'worked-once-done' },
    ],
    answer: 0,
    why: 'A loop repeats the same blocks. One bay inside repeat 4 is shorter, and if you fix the bay once, all four are fixed.',
  },
  {
    prompt: 'repeat 3 { repeat 4 { drive 10 cm, turn 90° } } — how many sides are drawn?',
    options: [
      { text: '7', icon: '7️⃣', misconception: 'nested-loop-adds' },
      { text: '4', icon: '4️⃣', misconception: 'loop-runs-once' },
      { text: '12', icon: '🔢' },
    ],
    answer: 2,
    why: 'The inner loop draws 4 sides, and the outer loop does that 3 times: 3 × 4 = 12 sides (three squares on top of each other).',
  },
  {
    prompt: 'Your coastline does not close: the end misses the start. What do you check first?',
    options: [
      { text: 'Do the turns add up to 360°?', icon: '🔄' },
      { text: 'Delete it all and start again', icon: '🗑️', misconception: 'bug-means-start-again' },
      { text: 'Change every distance and every turn at once', icon: '🔀', misconception: 'change-many-at-once' },
    ],
    answer: 0,
    why: 'A closed shape turns all the way round once. Add up your turns; if they are not 360°, fix that one thing and test again.',
  },
]

const S06: L2Session = {
  id: 'L2-S06', level: 2, number: 6, kind: 'project', durationMin: L2_LESSON_MIN,
  title: 'Make It Yours: Map of My Island',
  objective: 'Design an island map and draw it with the pen using measured distances and angles.',
  objectives: [
    obj('L2-S06-O1', 'Plans a map as measured distances and chosen angles on squared paper, then programs it with drive_distance and turn_degrees.', 'I can plan my map on paper and draw it with measured moves.', ['design-process'], ['engineering-design', 'mathematics-measurement', 'mathematics-geometry']),
    obj('L2-S06-O2', 'Uses a loop (including a loop inside a loop) for repeated features, and checks a closed shape totals 360°.', 'I can use a loop for the parts of my map that repeat.', ['loops'], ['programming', 'algorithms']),
  ],
  concepts: ['design-process', 'loops'],
  newBlocks: [],
  episode: episode('A Map for the Post Office Wall', [
    {
      setting: 'The post office. A big empty frame on the wall; Postmaster Yusuf holds a roll of paper two metres wide.',
      action: 'He unrolls the paper on the floor.',
      lines: [
        { who: 'guest', guestName: 'Postmaster Yusuf', line: 'Our old map washed away in the storm. Every island deserves a map — even an island you invent!' },
        { who: 'spark', line: 'Distances you measured, angles you chose, curves round the bays. Everything you have learned!' },
      ],
      seconds: 25,
    },
    {
      setting: 'Amara’s planning sheet: squared paper with a coastline, a path and a lighthouse.',
      action: 'She writes “20 cm” beside each line and “90°” at each corner, and circles a repeated bay shape: “×4”.',
      lines: [
        { who: 'amara', line: 'Plan first: every line a distance, every corner an angle. And this bay repeats four times — a loop!' },
        { who: 'spark', line: 'Then build it one piece at a time and test each piece. Designers never draw the whole thing in one go.' },
      ],
      seconds: 30,
    },
  ], 'The maps are hung on the post office wall. On one of them, a thin painted line runs to the lighthouse — and the keeper has stopped answering the radio.', 'Last time, the robot learned to curve with two motors.'),
  build: {
    part: { slot: 'tool', id: 'pen' },
    action: 'swap',
    narration: 'Fit the drawing pen. Today your robot is a map-maker.',
    why: 'The pen turns every move into a line on the map, so the plan and the drawing can be compared side by side.',
    tryWithout: 'Without the pen your map exists only in the program — nobody on the island can read it.',
    physicsEffect: 'The pen draws at the turning centre; set_motors curves leave smooth arcs for bays and coastlines.',
    realWorld: 'Surveyors and mapping robots measure distances and angles to build maps — the same two numbers your program uses.',
  },
  arena: { kind: 'code-lab', id: 'twin-windows', task: 'Warm-up for your map: draw two windows with a loop inside a loop. Then plan your island on paper and draw it.', why: 'A verified nested-loop drawing mission: the exact skill the map’s repeated features need.' },
  activities: [
    { id: 'design-bu-04', why: 'Pick the wheel for 50 cm/s: plan with numbers before you build.' },
    { id: 'station-loop-inspection-lap', why: 'An inspection lap: find the repeating unit and loop it.' },
    { id: 'code-bu-02', why: 'Which code idea does each job need — a sequence, a loop or something new?' },
  ],
  challenge: { game: 'smart-farm', tier: 1, goal: 'On Pilot, place the soil sensors and plan a drone survey that covers the field.', link: 'A survey drone draws an invisible map of the field, row by row, with measured moves — your island map, from the sky.' },
  quiz: Q6,
  badge: { id: 'l2-mapmaker', name: 'Map Maker', icon: '🗺️', earnedFor: 'You planned and drew a whole map from measured distances and angles, with a loop for the parts that repeat.' },
  reward: { note: 'Your island map hangs in the Windward Isles post office (shown to your class and family only).' },
  project: l2Project(6),
  teacher: teacher({
    timing: projectTiming(),
    unpluggedWarmup: {
      title: 'Paper plan', minutes: 7,
      steps: [
        'Hand out squared paper (1 square = 10 cm). Each pair writes the problem in one sentence: “A map of … that shows …”.',
        'Two quick sketches, then choose one. Label every line with a distance and every corner with an angle.',
        'Circle anything that repeats and write ×N beside it: that will be a loop.',
      ],
      materials: ['Squared paper', 'Rulers and paper angle wheels', 'Planning sheets'],
    },
    discussion: [
      'Which part of your map uses a loop, and why?',
      'What was your first bug, and how did you find it?',
      'Where did your plan and your drawing differ?',
    ],
    differentiation: {
      faster: ['Add a curved bay drawn with set_motors and measure it against the plan.', 'Draw a compass rose: a loop with an angle that is not 90°.'],
      slower: ['A square island with one repeated bay (repeat 4), using distances given on the sheet.', 'Draw the map with only drive_distance and 90° turns first.'],
    },
  }, Q6),
  parent: {
    today: 'Your child designed their own island and drew its map with their robot’s pen, using measured distances, chosen angles and a loop for the parts that repeat. Maps are shared with the class and family only.',
    tryAtHome: 'Draw a map of your street or a room on squared paper: one square for each big step. Ask your child to give you robot instructions to walk part of it.',
    askYourChild: 'Which part of your island map repeats, and how did a loop help?',
  },
}

export const ACT1: L2Session[] = [S01, S02, S03, S04, S05, S06]
