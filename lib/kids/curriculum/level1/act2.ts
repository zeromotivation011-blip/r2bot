// lib/kids/curriculum/level1/act2.ts
// Level 1, Act 2 (sessions 7–12): "The Map of Lantern Hill".
// Planning routes (algorithms), fixing bugs, the drawing pen, loops and
// patterns; the second "Make it yours" project.

import type { Session } from '../types'
import {
  BEEP, FLAT_MAT_PHYSICS, HOP, HOP_BACK, LEFT, MOVE_SET, PART_MASS_KG, PEN_DOWN, PEN_UP, REPEAT, RIGHT, kg,
  arena, episode, lessonTiming, obj, projectTiming, say, teacher,
} from './shared'
import { L1_PROJECTS } from './projects'

const PAPER_PHYSICS = `${FLAT_MAT_PHYSICS} The pen draws a 1 cm line under the robot’s centre while it is down.`

export const ACT2: Session[] = [
  // ── 7 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S07', level: 1, number: 7, kind: 'lesson', durationMin: 40,
    title: 'Step by Step',
    objective: 'Plan a whole route on a map with arrows before building it — an algorithm.',
    objectives: [
      obj('L1-S07-O1', 'Creates and follows an algorithm (step-by-step plan) for a route on a grid map.', 'I can plan a path with arrows before I code it.', ['sequences', 'decomposition'], ['algorithms']),
      obj('L1-S07-O2', 'Breaks a route into straight parts and turns.', 'I can split a path into goes and turns.', ['decomposition'], ['algorithms', 'mathematics-geometry']),
    ],
    concepts: ['sequences', 'decomposition'],
    newBlocks: [],
    episode: episode('Bolt and the Map', [
      {
        setting: 'Lantern Hill market: stripy stalls of fruit, cloth, pots and spices; narrow lanes between them.',
        action: 'Bolt dashes between stalls with the map in his mouth. The team chases him and loses him in the lanes.',
        lines: [
          { who: 'amara', line: 'Bolt! Where did he go?' },
          { who: 'spark', line: 'These lanes are like a maze!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Ms Mei’s fruit stall. Bolt sits proudly, the map at his feet, a mango on his head.',
        action: 'Ms Mei waves from the far corner of the market.',
        lines: [
          { who: 'guest', guestName: 'Ms Mei, the fruit seller', line: 'Your puppy is here! Come round the back of the cloth stall!' },
          { who: 'spark', line: 'If we just go, we’ll get lost. Let’s plan the whole way first.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Spark projects a glowing grid map of the market in the air.',
        action: 'Amara puts arrow stickers on the map: turn, go 2, turn, go 3. Spark traces it with a dotted line.',
        lines: [
          { who: 'lucia', line: 'A plan with steps in order has a special name. An algorithm.' },
          { who: 'spark', line: 'Al-go-rith-m! Like a recipe — but for robots.' },
          { who: 'amara', line: 'Straight bits and turns. Straight, turn, straight!' },
          { who: 'spark', line: 'Can you find the turns on the map? Point to them!', direction: 'Pause.' },
        ],
        seconds: 45,
      },
      {
        setting: 'The market lanes.',
        action: 'The robot follows the plan exactly and arrives at the fruit stall. Bolt licks the robot. Ms Mei gives Bolt a pat and hands back the map.',
        lines: [
          { who: 'myrobot', line: 'Plan done! Hello, Bolt!' },
          { who: 'bolt', line: 'Beep-woof…', direction: 'Looks guilty.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Ms Mei’s stall. The map lies open; Nana’s old handwritten program cards are tucked inside it, now muddled.',
        action: 'The fourth light glows among the flower buckets of the stall next door. Bolt sneezes and the program cards scatter into a jumble.',
        lines: [
          { who: 'spark', line: 'The fourth light — in the flower stall! I wrote a plan to get there…' },
          { who: 'amara', line: 'But Bolt sneezed and mixed up the cards!' },
        ],
        seconds: 25,
      },
    ], 'The plan to reach the fourth light got mixed up. Is it still right? Something is wrong — but what?', 'Three lights found. Bolt ran off with Nana’s map…'),
    build: {
      part: { slot: 'body', id: 'box' },
      action: 'inspect',
      narration: 'Inside the body, the brain keeps the whole plan in its memory before it starts.',
      why: 'The robot reads all of your blocks into memory, then does them one at a time. A good plan means a good trip.',
      tryWithout: 'With no plan in memory, pressing Go does nothing at all.',
      physicsEffect: 'No change. The sim shows the plan as a dotted line on the floor before Go (preview).',
      realWorld: 'Delivery robots plan their whole route on a map before they leave.',
    },
    code: {
      title: 'Find Bolt',
      mission: 'Put arrows on the map first. Then build the same plan with blocks to reach Bolt at the fruit stall.',
      arena: arena({
        id: 'l1-market-a', name: 'Market lanes',
        description: 'A 4×4 market. Bolt is at the fruit stall in the top-right. A row of stalls runs down the middle.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'mat',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Reach Bolt at tile (3,0).',
        features: ['Cloth stall on tiles (1,1), (2,1), (1,2), (2,2)', 'Bolt at tile (3,0)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: MOVE_SET,
      exampleSolution: ['drive_for(80, 3)', 'turn_degrees(-90, 40)', 'drive_for(80, 3)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (3,0).' },
        { kind: 'no-collision', detail: 'No stall touched.' },
      ],
      stars: { two: 'You put arrow stickers on the map before building.', three: 'Your blocks match your arrows exactly.' },
      hints: [
        'Go up first or go along first? Look for the open lane.',
        'Up the left side, then turn right along the top.',
        'Hop 3, Turn right, Hop 3.',
      ],
    },
    challenge: {
      title: 'The Back Way',
      mission: 'Ms Mei moved to the back. Plan a path with two turns, then drive there.',
      arena: arena({
        id: 'l1-market-b', name: 'Market back lane',
        description: 'The same market, but a long pot stall blocks the left lane. Ms Mei waits at the top of the third lane.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'mat',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Reach Ms Mei at tile (2,0).',
        features: ['Pot stall on tiles (0,0), (0,1), (0,2) — the left lane is blocked', 'Cloth stall on tiles (1,0), (1,1), (1,2)', 'Ms Mei at tile (2,0)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: MOVE_SET,
      exampleSolution: ['turn_degrees(-90, 40)', 'drive_for(80, 2)', 'turn_degrees(90, 40)', 'drive_for(80, 3)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (2,0).' },
        { kind: 'no-collision', detail: 'No stall touched.' },
      ],
      stars: { two: 'Your plan worked on the first or second Go.', three: 'You split the path into "go" parts and "turn" parts out loud.' },
      hints: [
        'The left lane is blocked. Which way do you need to go first?',
        'Turn right first, go along the bottom, then turn left to go up.',
        'Turn right, Hop 2, Turn left, Hop 3.',
      ],
    },
    quiz: [
      {
        prompt: 'What is an algorithm?',
        options: [{ text: 'Steps in order to do a job', icon: '📋' }, { text: 'A special robot part', icon: '🔩' }],
        answer: 0,
        why: 'An algorithm is a plan of steps in order — like a recipe or the way to school.',
      },
      {
        prompt: 'Why plan the path before pressing Go?',
        options: [{ text: 'So the robot does not get lost or bump', icon: '🗺️' }, { text: 'So the robot can read our drawing', icon: '📄' }],
        answer: 0,
        why: 'A plan helps us find the right path first. Then the robot follows it exactly.',
      },
      {
        prompt: 'A path goes straight, turns, then goes straight. How many turn blocks?',
        options: [{ text: 'One', icon: '1️⃣' }, { text: 'Three', icon: '3️⃣' }],
        answer: 0,
        why: 'Straight, turn, straight has only one turn. Count the corners on the path.',
      },
    ],
    badge: { id: 'l1-planner', name: 'Map Planner', icon: '🗺️', earnedFor: 'You planned a route as steps in order — an algorithm — before coding it.' },
    reward: { note: 'Nana’s map is back. The market is open to explore.' },
    teacher: teacher({
      timing: lessonTiming('Program your teacher'),
      unpluggedWarmup: {
        title: 'Program your teacher', minutes: 4,
        steps: [
          'Make a 4×4 grid with tape. Place a teddy in one square.',
          'The class gives the teacher-robot arrow cards to reach the teddy. The teacher follows them exactly — even wrong ones.',
          'Count the corners together: one turn card per corner.',
        ],
        materials: ['Tape grid on the floor', 'Arrow cards (forward, turn left, turn right)', 'A teddy'],
      },
      discussion: [
        'What algorithms do you follow every day? (getting dressed, washing hands)',
        'Could there be two different good paths? How do we choose?',
      ],
      misconceptions: [
        { idea: 'A plan only counts if it is written in words.', correction: 'Arrows and pictures are a plan too. Engineers draw plans all the time.' },
        { idea: 'There is only one right answer.', correction: 'Many paths can work. Some are shorter or safer.' },
      ],
      differentiation: {
        faster: ['Find two paths and count which uses fewer blocks.', 'Write the plan for a friend to follow without showing the map.'],
        slower: ['Place a physical toy on a printed grid and move it with your hand for each arrow before coding.'],
      },
    }),
    parent: {
      today: 'Your child learned that an algorithm is a plan of steps in order, and planned a route on a map with arrows before coding it.',
      tryAtHome: 'Draw a simple map of your home. Your child draws arrows from their bed to the kitchen. Then walk it together, step by step.',
      askYourChild: 'What is an algorithm? Can you tell me the algorithm for brushing your teeth?',
    },
  },

  // ── 8 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S08', level: 1, number: 8, kind: 'lesson', durationMin: 40,
    title: 'Oops! Fixing Bugs',
    objective: 'Find and fix one wrong step (a bug) by watching where the robot goes wrong.',
    objectives: [
      obj('L1-S08-O1', 'Identifies and fixes an error in a sequence by comparing what happened with what was planned.', 'I can find a bug and fix it.', ['debugging'], ['debugging', 'programming']),
      obj('L1-S08-O2', 'Describes a bug using words like "this turn went the wrong way".', 'I can say what went wrong.', ['debugging'], ['communication']),
    ],
    concepts: ['debugging', 'sequences'],
    newBlocks: [],
    episode: episode('The Sneeze Bug', [
      {
        setting: 'Ms Mei’s stall. Spark gathers the jumbled program cards.',
        action: 'Spark puts the cards back in order — or thinks so — and the robot runs them. It turns the wrong way and rolls towards the pot stall.',
        lines: [
          { who: 'spark', line: 'All fixed! Go, robot!' },
          { who: 'amara', line: 'Stop! It’s going the wrong way!' },
          { who: 'myrobot', line: 'Oops!', direction: 'Face screen shows a wobbly mouth.' },
        ],
        seconds: 35,
      },
      {
        setting: 'Nana Lucía sits on a crate with a cup of tea.',
        action: 'She tells a story. A little picture shows an old room-sized computer and a small moth.',
        lines: [
          { who: 'lucia', line: 'Engineers have called mistakes "bugs" for a very long time. Once, they found a REAL moth stuck in a giant computer!' },
          { who: 'lucia', line: 'They taped it in their notebook as "the first real bug" — a joke! Any mistake in a program is a bug. Every engineer makes them. Me too!' },
          { who: 'spark', line: 'So a bug is not bad. It’s a puzzle!' },
        ],
        seconds: 40,
      },
      {
        setting: 'The cards laid out next to the map.',
        action: 'Spark becomes a detective with a magnifying glass. The robot replays its run in slow motion; at the wrong turn, a big question mark pops up.',
        lines: [
          { who: 'spark', line: 'Watch the robot. Where did it stop doing what we planned?' },
          { who: 'amara', line: 'There! It turned right, but our arrow says left!' },
          { who: 'spark', line: 'Found the bug! Change just that one card.' },
          { who: 'spark', line: 'Did you see it too? Point when the robot goes wrong!', direction: 'Pause.' },
        ],
        seconds: 45,
      },
      {
        setting: 'The flower stall: buckets of sunflowers, marigolds and roses.',
        action: 'Fixed program. The robot rolls to the flowers and stops. The fourth light rises from a bucket of marigolds. Counter: 4 of 12.',
        lines: [
          { who: 'myrobot', line: 'Found a light!' },
          { who: 'guest', guestName: 'Mr Diego, the flower seller', line: 'So THAT’S why my marigolds were glowing!' },
        ],
        seconds: 30,
      },
      {
        setting: 'A puddle by the fountain. Bolt splashes in it with the map.',
        action: 'The map is soaked. The ink of the path to the school runs and fades away.',
        lines: [
          { who: 'amara', line: 'Bolt! The path to the school is all washed away!' },
          { who: 'spark', line: 'How will we find our way now?' },
        ],
        seconds: 20,
      },
    ], 'Four lights! But Bolt splashed the map, and the path to the school has washed away. Could the robot draw a new one?', 'The robot planned a path through the market. Bolt sneezed and mixed up the program…'),
    build: {
      part: { slot: 'head', id: 'screen' },
      action: 'inspect',
      narration: 'When your robot bumps something, its face shows "oops". That tells you where the bug is.',
      why: 'A robot that shows when something went wrong helps people fix it fast.',
      tryWithout: 'Without the oops face you might not notice the moment it went wrong.',
      physicsEffect: 'No change. The sim adds slow-motion replay with the step that was running highlighted.',
      realWorld: 'Real robots flash a light or show an error message when something goes wrong.',
    },
    code: {
      title: 'The Wrong Turn',
      mission: 'Here is Spark’s program. It has one bug. Press Go, watch, find the bug and fix it.',
      arena: arena({
        id: 'l1-market-b', name: 'Market back lane',
        description: 'The back-lane market from last time. Ms Mei waits at the top of the third lane.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'mat',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Reach Ms Mei at tile (2,0).',
        features: ['Pot stall on (0,0), (0,1), (0,2)', 'Cloth stall on (1,0), (1,1), (1,2)', 'Ms Mei at (2,0)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: MOVE_SET,
      starter: ['turn_degrees(-90, 40)', 'drive_for(80, 2)', 'turn_degrees(-90, 40)  ← bug: should be a LEFT turn', 'drive_for(80, 3)'],
      exampleSolution: ['turn_degrees(-90, 40)', 'drive_for(80, 2)', 'turn_degrees(90, 40)', 'drive_for(80, 3)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (2,0).' },
        { kind: 'within-blocks', detail: 'Program still has 4 blocks (fix, do not rebuild).' },
      ],
      stars: { two: 'You changed only the one wrong block.', three: 'You said where it went wrong before you fixed it.' },
      hints: [
        'Press Go and watch. When does the robot stop following the path?',
        'Look at the second turn. Does it turn towards Ms Mei?',
        'Change the second "Turn right" to "Turn left".',
      ],
    },
    challenge: {
      title: 'The Marigold Light',
      mission: 'Spark’s program to the flower stall has a bug. The robot bumps the buckets. Fix it!',
      arena: arena({
        id: 'l1-flower-stall', name: 'Flower stall',
        description: 'A 4×4 corner of the market. The light glows on the flower stall mat. Flower buckets line the top row.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'mat',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Stop on the light at tile (3,1).',
        features: ['Flower buckets on tiles (1,0), (2,0), (3,0) (tip over if touched)', 'Crates on (1,2), (2,2)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: [...MOVE_SET, say('Found a light!')],
      starter: ['drive_for(80, 3)  ← bug: one hop too many', 'turn_degrees(-90, 40)', 'drive_for(80, 3)'],
      exampleSolution: ['drive_for(80, 2)', 'turn_degrees(-90, 40)', 'drive_for(80, 3)', 'say("Found a light!")'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (3,1).' },
        { kind: 'no-collision', detail: 'No flower bucket touched.' },
      ],
      stars: { two: 'You found that the bug was a number, not a turn.', three: 'You added "Found a light!" at the end.' },
      hints: [
        'Watch closely. Is the turn wrong, or does it turn at the wrong place?',
        'It goes up one square too far before turning. Which number is too big?',
        'Change the first Hop from 3 to 2.',
      ],
    },
    quiz: [
      {
        prompt: 'What is a bug in a program?',
        options: [{ text: 'A mistake in the steps', icon: '🐞' }, { text: 'A broken robot', icon: '💔' }],
        answer: 0,
        why: 'A bug is a mistake in the program — the robot is fine, the steps are wrong. Engineers called mistakes bugs long ago; once they even found a real moth in a computer and joked it was a real bug.',
      },
      {
        prompt: 'How do you find a bug?',
        options: [{ text: 'Watch where the robot stops doing the plan', icon: '🔍' }, { text: 'Start again from the top', icon: '🔄' }],
        answer: 0,
        why: 'Watch the robot and find the first moment it does something different from the plan. Starting again throws away all the steps that were right.',
      },
      {
        prompt: 'Do good engineers make bugs?',
        options: [{ text: 'Yes, everyone does', icon: '🙋' }, { text: 'Never', icon: '🙅' }],
        answer: 0,
        why: 'Everyone makes bugs. Good engineers are good at finding and fixing them.',
      },
    ],
    badge: { id: 'l1-bug-detective', name: 'Bug Detective', icon: '🔍', earnedFor: 'You found and fixed bugs by watching where your robot went wrong.' },
    reward: { note: 'Light 4 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Spot the silly step'),
      unpluggedWarmup: {
        title: 'Spot the silly step', minutes: 4,
        steps: [
          'Read out a "getting dressed" algorithm with one bug: "Put on shoes. Put on socks."',
          'Children shout "Bug!" when they hear it and say how to fix it.',
          'Do two more (washing hands, planting a seed).',
        ],
        materials: ['None'],
      },
      discussion: [
        'How did it feel when the robot went wrong? How did it feel when you fixed it?',
        'Why is it better to change one block than to start again?',
      ],
      misconceptions: [
        { idea: 'If the program is wrong, the robot is broken.', correction: 'The robot did exactly what the program said. The program needs fixing, not the robot.' },
        { idea: 'Making a bug means I am bad at this.', correction: 'Bugs are normal. Finding them is a skill — like a detective.' },
      ],
      differentiation: {
        faster: ['Write a buggy program for a partner to fix.', 'Find a program with two bugs (teacher-made).'],
        slower: ['Use slow-motion replay and pause on the moment it goes wrong.', 'Teacher points to the two blocks that might be wrong; the child chooses.'],
      },
      notes: ['Model it yourself: make a bug in front of the class on purpose and fix it calmly. Children copy how adults react to mistakes.'],
    }),
    parent: {
      today: 'Your child learned that a bug is a mistake in a program, and found and fixed bugs by watching exactly where the robot went wrong.',
      tryAtHome: 'Next time something goes wrong (a tower falls, a drawing smudges), say "Let’s find the bug!" and look together for the first moment it went wrong.',
      askYourChild: 'Where does the word "bug" come from?',
    },
  },

  // ── 9 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S09', level: 1, number: 9, kind: 'lesson', durationMin: 40,
    title: 'The Drawing Pen',
    objective: 'Add a pen and use pen down / pen up to draw the robot’s path.',
    objectives: [
      obj('L1-S09-O1', 'Uses pen down and pen up to make the robot’s path visible.', 'I can make my robot draw where it goes.', ['sequences'], ['programming', 'mathematics-geometry']),
      obj('L1-S09-O2', 'Explains why a tool is chosen for a job (a pen to draw).', 'I can say why my robot needs a pen today.', ['design-process'], ['engineering-design']),
    ],
    concepts: ['sequences', 'design-process'],
    newBlocks: ['pen_down', 'pen_up'],
    episode: episode('Draw the Way', [
      {
        setting: 'The fountain square. The wet map is drying on a bench.',
        action: 'The path to the school has faded. Amara looks sad. Spark hovers over the map.',
        lines: [
          { who: 'amara', line: 'We can’t find the school without the path.' },
          { who: 'spark', line: 'What if the robot drew a new path as it goes?' },
        ],
        seconds: 25,
      },
      {
        setting: 'Nana Lucía’s workshop. A drawer full of tools.',
        action: 'Nana pulls out a pen holder that clips under a robot.',
        lines: [
          { who: 'lucia', line: 'A robot can hold a pen. Pen down — it draws. Pen up — it stops drawing.' },
          { who: 'lucia', line: 'Then we can see exactly where it went.' },
          { who: 'spark', line: 'A robot artist!' },
        ],
        seconds: 35,
      },
      {
        setting: 'A long roll of paper laid on the street to the school.',
        action: 'The robot puts its pen down and rolls forward: a straight line appears. It turns — and the line bends. Bolt follows the line, sniffing.',
        lines: [
          { who: 'myrobot', line: 'Pen down! Drawing!' },
          { who: 'amara', line: 'Look, it draws a line everywhere it goes!' },
          { who: 'spark', line: 'If you forget "pen up", what will happen?', direction: 'Pause.' },
          { who: 'spark', line: 'It keeps drawing — everywhere!', direction: 'Cartoon: the robot scribbles all over the street; Bolt is covered in lines.' },
        ],
        seconds: 50,
      },
      {
        setting: 'A zebra crossing on the way to school. Cars wait; the lollipop lady holds up her sign.',
        action: 'The robot reaches the crossing. Spark holds up a paw-like hand: stop! The robot lifts its pen, crosses with everyone, and puts the pen down again on the far side.',
        lines: [
          { who: 'spark', line: 'We don’t draw on the road! Pen up to cross.' },
          { who: 'myrobot', line: 'Pen up… crossing… pen down!' },
          { who: 'amara', line: 'Now there’s a gap in the line, right where the road is!' },
        ],
        seconds: 30,
      },
      {
        setting: 'The school gate: a cheerful building with a playground.',
        action: 'The drawn path leads right to the gate. Teacher Ms Adaeze waves. Behind her the playground is half-ready for the festival games.',
        lines: [
          { who: 'guest', guestName: 'Ms Adaeze, the teacher', line: 'Welcome! We need help drawing the game squares for the festival.' },
          { who: 'spark', line: 'A square… that’s a lot of drawing!' },
        ],
        seconds: 30,
      },
    ], 'The school needs game squares drawn for the festival — lots of them. Is there a faster way than block, block, block?', 'Four lights. The map got wet and the path to the school washed away…'),
    build: {
      part: { slot: 'tool', id: 'pen' },
      action: 'add',
      narration: 'Clip the drawing pen under your robot.',
      why: 'The pen draws a line wherever the robot goes, so you can see the path your program made.',
      tryWithout: 'Without the pen, you only see where the robot ended — not the path it took.',
      physicsEffect: `Adds ${kg(PART_MASS_KG.tool.pen)}. A pen touching the floor adds a tiny drag the sim includes; no visible change in distance.`,
      realWorld: 'Line-marking robots paint lines on sports fields from a plan.',
    },
    code: {
      title: 'A Straight Line',
      mission: 'Put the pen down, draw a line to the dot, then lift the pen.',
      arena: arena({
        id: 'l1-paper-road', name: 'Paper road',
        description: 'A long sheet of paper on the street with a dot at the end.',
        gridTiles: { cols: 1, rows: 5 }, floor: 'mat',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Draw a line from the start to the dot at tile (0,1), then lift the pen.',
        features: ['Dotted guide line from (0,4) to (0,1)'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [HOP, PEN_DOWN, PEN_UP],
      exampleSolution: ['pen_down', 'drive_for(80, 3)', 'pen_up'],
      success: [
        { kind: 'draw-path', detail: 'The drawn line covers at least 90 % of the dotted guide and nothing else.' },
        { kind: 'action-at-zone', detail: 'pen_up runs at the end of the program.' },
      ],
      stars: { two: 'You lifted the pen at the end.', three: 'You said what would happen without "pen up".' },
      hints: [
        'What must happen before the robot can draw?',
        'Pen down first, then hop.',
        'Pen down, Hop 3, Pen up.',
      ],
    },
    challenge: {
      title: 'The Way to School',
      mission: 'Draw the path to the school gate: up, then turn right, then along. Lift the pen at the gate.',
      arena: arena({
        id: 'l1-school-road', name: 'Road to school',
        description: 'A big sheet of paper. A faint dotted path goes up two squares, then right two squares to the school gate.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'mat',
        start: { col: 0, row: 2, heading: 'up' },
        goal: 'Draw along the dotted path and stop at the gate, tile (2,0).',
        features: ['Dotted guide: (0,2)→(0,0)→(2,0)', 'Puddle on tile (1,1) (the pen smudges if driven through)'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [...MOVE_SET, PEN_DOWN, PEN_UP],
      exampleSolution: ['pen_down', 'drive_for(80, 2)', 'turn_degrees(-90, 40)', 'drive_for(80, 2)', 'pen_up'],
      success: [
        { kind: 'draw-path', detail: 'Drawn line covers at least 90 % of the dotted guide; no line through the puddle tile.' },
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (2,0).' },
      ],
      stars: { two: 'Your line follows the dotted path all the way.', three: 'You planned it with arrows first.' },
      hints: [
        'This is like the corner in the town square — but with the pen down.',
        'Pen down, go up 2, turn right, go along 2.',
        'Pen down, Hop 2, Turn right, Hop 2, Pen up.',
      ],
    },
    quiz: [
      {
        prompt: 'Which block makes the robot start drawing?',
        options: [{ text: 'Pen down', icon: '🖊️⬇️' }, { text: 'Pen up', icon: '🖊️⬆️' }],
        answer: 0,
        why: 'Pen down touches the paper, so the robot draws as it moves.',
      },
      {
        prompt: 'You forgot "pen up". What happens next time the robot moves?',
        options: [{ text: 'It keeps drawing', icon: '〰️' }, { text: 'It stops drawing', icon: '🚫' }],
        answer: 0,
        why: 'The pen stays down until a block lifts it. So it keeps drawing!',
      },
      {
        prompt: 'Why is a pen useful for checking a program?',
        options: [{ text: 'You can see the path it took', icon: '👀' }, { text: 'Pen down steers the robot for you', icon: '🖊️' }],
        answer: 0,
        why: 'The line shows exactly where the robot went — great for finding bugs.',
      },
    ],
    badge: { id: 'l1-artist', name: 'Robot Artist', icon: '🖊️', earnedFor: 'You added a pen and drew your robot’s path with pen down and pen up.' },
    reward: { unlocks: { slot: 'tool', id: 'pen' }, note: 'The pen goes in your toolbox.' },
    teacher: teacher({
      timing: lessonTiming('Finger trails'),
      unpluggedWarmup: {
        title: 'Finger trails', minutes: 4,
        steps: [
          'Each child has paper with a start dot. Teacher calls: "Pen down! Forward! Turn right! Forward! Pen up!"',
          'Children draw with a finger or crayon. Then call a move with the pen up — nothing is drawn.',
        ],
        materials: ['Paper and crayons'],
      },
      discussion: [
        'What other jobs need a robot to hold a tool?',
        'Why might you want to lift the pen in the middle of a drawing?',
      ],
      misconceptions: [
        { idea: 'Pen down moves the robot.', correction: 'Pen down only puts the pen on the paper. Hop moves the robot.' },
        { idea: 'The pen lifts by itself at the end.', correction: 'Only the pen up block lifts it.' },
      ],
      differentiation: {
        faster: ['Draw a letter of your name (L, T or I).', 'Draw two lines with a gap (pen up in the middle).'],
        slower: ['Start with the straight line twice; skip the turn.', 'Use the dotted path overlay to check after each run.'],
      },
    }),
    parent: {
      today: 'Your child clipped a drawing pen on their robot and used "pen down" and "pen up" to draw the path to the school.',
      tryAtHome: 'Give instructions to draw a shape on paper together: "pen down, forward 3 fingers, turn, forward 3, pen up." What did you draw?',
      askYourChild: 'What happens if you forget "pen up"?',
    },
  },

  // ── 10 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S10', level: 1, number: 10, kind: 'lesson', durationMin: 40,
    title: 'Repeat, Repeat!',
    objective: 'Use a Repeat block to do the same steps again and again — and draw a square with fewer blocks.',
    objectives: [
      obj('L1-S10-O1', 'Identifies a repeating set of instructions and uses a simple loop for it.', 'I can use Repeat when steps happen again and again.', ['loops'], ['programming', 'algorithms']),
      obj('L1-S10-O2', 'Recognises that a square has four equal sides and four quarter turns.', 'I know a square is 4 sides and 4 turns.', ['loops'], ['mathematics-geometry']),
    ],
    concepts: ['loops'],
    newBlocks: ['repeat'],
    episode: episode('Four Sides, Four Turns', [
      {
        setting: 'The school playground. Children waiting with chalk-less hands.',
        action: 'The robot draws a square, block by block. It takes ages. Bolt falls asleep, snoring "beep-zzz".',
        lines: [
          { who: 'myrobot', line: 'Forward. Turn. Forward. Turn. Forward. Turn. Forward. Turn.' },
          { who: 'amara', line: 'That’s eight blocks for one square! We need twenty squares!' },
        ],
        seconds: 35,
      },
      {
        setting: 'Close on the eight blocks.',
        action: 'Spark colours the blocks in pairs: forward+turn is blue, then blue, blue, blue.',
        lines: [
          { who: 'spark', line: 'Look! Forward, turn. Forward, turn. The same two steps, four times!' },
          { who: 'lucia', line: 'When something happens again and again, we use a Repeat block.' },
          { who: 'lucia', line: 'Put the steps inside, and say how many times.' },
        ],
        seconds: 40,
      },
      {
        setting: 'Ms Adaeze leads the class in a clapping song.',
        action: 'Clap-clap-stomp, clap-clap-stomp, clap-clap-stomp. The children do it with her.',
        lines: [
          { who: 'guest', guestName: 'Ms Adaeze, the teacher', line: 'Our songs repeat too! Clap, clap, stomp — three times!' },
          { who: 'spark', line: 'Can you do it with them? Clap, clap, stomp!', direction: 'Pause for the class to join in.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Playground.',
        action: 'With Repeat 4, the robot zooms round a square in one go. Square after square appears. The children cheer and play.',
        lines: [
          { who: 'myrobot', line: 'Repeat four times! Done!' },
          { who: 'amara', line: 'Three blocks instead of eight!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Under the playground slide.',
        action: 'A child playing in the new square sees a glow under the slide: the fifth light! Counter: 5 of 12. Then a gust of wind blows a library poster across the playground: "The library is closed — the steps are broken."',
        lines: [
          { who: 'spark', line: 'Five lights! But what about the library?' },
          { who: 'guest', guestName: 'Ms Adaeze, the teacher', line: 'The library steps need new markings. They go up, and up, and up…' },
        ],
        seconds: 30,
      },
    ], 'Five lights! The library steps need new lines — step after step after step. Is there a pattern?', 'The robot got a pen and drew the way to school. The school needed game squares…'),
    build: {
      part: { slot: 'tool', id: 'pen' },
      action: 'inspect',
      narration: 'Your pen is ready. Today it draws squares for the games!',
      why: 'A pen lets us check that a loop really drew four equal sides.',
      tryWithout: 'Without the pen, you cannot see if your square closed up.',
      physicsEffect: 'No change.',
      realWorld: 'Robots that paint road markings repeat the same stripe pattern again and again.',
    },
    code: {
      title: 'One Small Square',
      mission: 'Draw a small square. First build it the long way. Then build it again with Repeat.',
      arena: arena({
        id: 'l1-playground-small', name: 'Playground (small square)',
        description: 'A paper square on the playground with a dotted square of side one.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'mat',
        start: { col: 1, row: 2, heading: 'up' },
        goal: 'Draw the dotted square (1,2)→(1,1)→(2,1)→(2,2)→(1,2) and end where you started.',
        features: ['Dotted square guide'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [HOP, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT],
      exampleSolution: ['pen_down', 'repeat(4) { drive_for(80, 1); turn_degrees(-90, 40) }', 'pen_up'],
      success: [
        { kind: 'draw-path', detail: 'Drawn line covers at least 90 % of the dotted square.' },
        { kind: 'within-blocks', detail: 'Second version uses a repeat block (5 blocks or fewer in total).' },
      ],
      stars: { two: 'You built it the long way AND with Repeat.', three: 'You counted the blocks you saved.' },
      hints: [
        'A square has 4 sides. After each side, the robot turns.',
        'Put "Hop 1" and "Turn right" inside Repeat.',
        'Pen down, Repeat 4 { Hop 1, Turn right }, Pen up.',
      ],
    },
    challenge: {
      title: 'The Big Game Square',
      mission: 'Draw a big square with sides of 2 squares, using Repeat. Use 4 blocks or fewer.',
      arena: arena({
        id: 'l1-playground-big', name: 'Playground (big square)',
        description: 'A bigger dotted square for the hopping game, with the slide nearby.',
        gridTiles: { cols: 5, rows: 5 }, floor: 'mat',
        start: { col: 1, row: 3, heading: 'up' },
        goal: 'Draw the square (1,3)→(1,1)→(3,1)→(3,3)→(1,3).',
        features: ['Dotted big square', 'Slide on tile (4,4) — the fifth light glows underneath when the square is finished'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [HOP, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT],
      exampleSolution: ['pen_down', 'repeat(4) { drive_for(80, 2); turn_degrees(-90, 40) }'],
      success: [
        { kind: 'draw-path', detail: 'Drawn line covers at least 90 % of the dotted square.' },
        { kind: 'within-blocks', detail: '4 blocks or fewer, counting the blocks inside Repeat.' },
      ],
      stars: { two: 'You used Repeat and 4 blocks or fewer.', three: 'You said which number changed from the small square (the hop) and which did not (the 4).' },
      hints: [
        'It is like the small square, but each side is longer.',
        'Change the Hop inside the Repeat from 1 to 2.',
        'Pen down, Repeat 4 { Hop 2, Turn right }.',
      ],
    },
    quiz: [
      {
        prompt: 'When do we use a Repeat block?',
        options: [{ text: 'When steps happen again and again', icon: '🔁' }, { text: 'When a step happens only once', icon: '1️⃣' }],
        answer: 0,
        why: 'Repeat does the steps inside it again, as many times as you say.',
      },
      {
        prompt: 'How many turns does a square need?',
        options: [{ text: '4', icon: '4️⃣' }, { text: '2', icon: '2️⃣' }, { text: '8', icon: '8️⃣' }],
        answer: 0,
        why: 'A square has 4 corners, so the robot turns 4 times — once at each corner.',
      },
      {
        prompt: 'Repeat 3 { clap }. How many claps?',
        options: [{ text: '3', icon: '👏👏👏' }, { text: '4 — once, then 3 more', icon: '👏👏👏👏' }],
        answer: 0,
        why: 'Repeat 3 means do it three times: clap, clap, clap!',
      },
    ],
    badge: { id: 'l1-looper', name: 'Loop Star', icon: '🔁', earnedFor: 'You used Repeat to do steps again and again, and drew a square with fewer blocks.' },
    reward: { note: 'Light 5 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Clap loops'),
      unpluggedWarmup: {
        title: 'Clap loops', minutes: 4,
        steps: [
          'Clap a pattern: clap-clap-stomp. Write it on the board inside a big loop drawn with "× 3".',
          'Children perform it. Change the number to 2, then 4.',
          'Walk a square in the room together: "forward, turn" × 4.',
        ],
        materials: ['Whiteboard'],
      },
      discussion: [
        'What repeats in your day? (days of the week, steps when walking, a song chorus)',
        'Why is a shorter program easier to fix?',
      ],
      misconceptions: [
        { idea: 'Repeat 4 means do it 4 extra times.', correction: 'Repeat 4 means do it 4 times in total.' },
        { idea: 'Blocks after the Repeat also repeat.', correction: 'Only the blocks inside the Repeat repeat.' },
      ],
      differentiation: {
        faster: ['Draw a rectangle (2 long, 1 short). Can Repeat 2 help?', 'Draw two squares side by side.'],
        slower: ['Build the long way first, colour-match the pairs, then wrap them in Repeat.'],
      },
    }),
    parent: {
      today: 'Your child learned the Repeat block (a loop) and drew a square with 3 blocks instead of 8.',
      tryAtHome: 'Find loops in songs and rhymes ("Head, shoulders, knees and toes" repeats). Make up a dance move and say "repeat 3 times!"',
      askYourChild: 'How many times does the robot turn when it draws a square?',
    },
  },

  // ── 11 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S11', level: 1, number: 11, kind: 'lesson', durationMin: 40,
    title: 'Patterns Everywhere',
    objective: 'Spot a repeating pattern and use Repeat to draw it (a staircase).',
    objectives: [
      obj('L1-S11-O1', 'Identifies the repeating unit of a pattern and loops it.', 'I can find the part of a pattern that repeats.', ['loops', 'decomposition'], ['algorithms', 'programming']),
      obj('L1-S11-O2', 'Notices patterns in art and design from different cultures.', 'I can see patterns in things people make around the world.', ['loops'], ['mathematics-geometry', 'impacts-of-computing']),
    ],
    concepts: ['loops', 'decomposition'],
    newBlocks: [],
    episode: episode('The Library Steps', [
      {
        setting: 'The Lantern Hill library: an old building with a long staircase up to its door. The painted step lines have worn away.',
        action: 'Mr Haruto the librarian stands at the top holding a stack of books.',
        lines: [
          { who: 'guest', guestName: 'Mr Haruto, the librarian', line: 'Nobody can see the edges of the steps. People trip!' },
          { who: 'spark', line: 'Our robot can draw new lines on the step plan!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Inside the library: books open on a table showing patterns.',
        action: 'Pages show a rangoli of coloured powder, a strip of kente cloth, blue mosaic tiles and a woven basket. Spark circles the part that repeats on each one.',
        lines: [
          { who: 'lucia', line: 'People all over the world make patterns. A pattern is a part that repeats.' },
          { who: 'amara', line: 'This cloth goes stripe, zig-zag, stripe, zig-zag!' },
          { who: 'spark', line: 'Find the piece that repeats. Then you only need to say it once — and Repeat!' },
        ],
        seconds: 45,
      },
      {
        setting: 'The step plan spread out on the library floor.',
        action: 'Spark draws one step: up, turn, along, turn. Then it glows and copies itself: step, step, step.',
        lines: [
          { who: 'spark', line: 'One step is: up, turn right, along, turn left.' },
          { who: 'spark', line: 'How many steps are there? Count with me!', direction: 'Pause; the stairs show three steps.' },
          { who: 'amara', line: 'Three! So, Repeat 3!' },
        ],
        seconds: 40,
      },
      {
        setting: 'The library staircase, freshly marked.',
        action: 'The robot finishes the drawing. Mr Haruto walks down safely and gives a thumbs up. He hands Amara a rolled-up blank festival banner.',
        lines: [
          { who: 'guest', guestName: 'Mr Haruto, the librarian', line: 'Thank you! Now — the festival banner is still empty. Could your robot help?' },
          { who: 'myrobot', line: 'I can draw!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Amara unrolls the banner a little. Something inside glows faintly.',
        action: 'She rolls it back up quickly to keep the surprise.',
        lines: [
          { who: 'amara', line: 'Something is glowing inside the banner!' },
          { who: 'spark', line: 'We will find out — when we draw on it!' },
        ],
        seconds: 20,
      },
    ], 'A blank banner — and something glowing rolled up inside it. What will YOU draw?', 'Five lights. The robot learned Repeat and drew squares at the school…'),
    build: {
      part: { slot: 'tool', id: 'pen' },
      action: 'inspect',
      narration: 'Choose a pen colour for today’s pattern.',
      why: 'Clear lines help people see — on stairs, roads and crossings.',
      tryWithout: 'With no lines, people cannot see where each step ends.',
      physicsEffect: 'No change (colour only).',
      realWorld: 'Robots mark lines on roads, car parks and sports pitches.',
    },
    code: {
      title: 'One Step, Then Repeat',
      mission: 'Draw one step. Then put it inside Repeat 3 to draw the whole staircase.',
      arena: arena({
        id: 'l1-library-steps', name: 'Library step plan',
        description: 'A 4×4 plan with a dotted staircase of three steps going up to the right.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'mat',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Draw the staircase (0,3)→(0,2)→(1,2)→(1,1)→(2,1)→(2,0)→(3,0).',
        features: ['Dotted staircase guide'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [HOP, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT],
      exampleSolution: ['pen_down', 'repeat(3) { drive_for(80, 1); turn_degrees(-90, 40); drive_for(80, 1); turn_degrees(90, 40) }', 'pen_up'],
      success: [{ kind: 'draw-path', detail: 'Drawn line covers at least 90 % of the dotted staircase.' }],
      stars: { two: 'You used Repeat for the steps.', three: 'You said which four blocks make "one step".' },
      hints: [
        'Draw just one step first: up, then along.',
        'One step = Hop 1, Turn right, Hop 1, Turn left.',
        'Pen down, Repeat 3 { Hop 1, Turn right, Hop 1, Turn left }.',
      ],
    },
    challenge: {
      title: 'The Tall Staircase',
      mission: 'The big library stairs have four steps. Draw them all with 6 blocks or fewer.',
      arena: arena({
        id: 'l1-library-tall', name: 'Tall staircase plan',
        description: 'A 5×5 plan with four dotted steps going up to the library door.',
        gridTiles: { cols: 5, rows: 5 }, floor: 'mat',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Draw four steps and stop at the door, tile (4,0).',
        features: ['Dotted four-step staircase', 'Library door at (4,0)'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [HOP, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT],
      exampleSolution: ['pen_down', 'repeat(4) { drive_for(80, 1); turn_degrees(-90, 40); drive_for(80, 1); turn_degrees(90, 40) }'],
      success: [
        { kind: 'draw-path', detail: 'Drawn line covers at least 90 % of the dotted staircase.' },
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (4,0).' },
        { kind: 'within-blocks', detail: '6 blocks or fewer, counting the blocks inside Repeat.' },
      ],
      stars: { two: 'You changed only one number from the code task.', three: 'You told a friend which part of the pattern repeats.' },
      hints: [
        'It’s the same step as before. What is different?',
        'There are 4 steps now, not 3.',
        'Pen down, Repeat 4 { Hop 1, Turn right, Hop 1, Turn left }.',
      ],
    },
    quiz: [
      {
        prompt: 'Red, blue, red, blue, red, … What comes next?',
        options: [{ text: 'Blue', icon: '🔵' }, { text: 'Green', icon: '🟢' }],
        answer: 0,
        why: 'The part that repeats is "red, blue". After red comes blue.',
      },
      {
        prompt: 'One step is: up, turn, along, turn. How do we draw 3 steps?',
        options: [{ text: 'Repeat 3 around one step', icon: '🔁' }, { text: 'Draw one step only', icon: '1️⃣' }],
        answer: 0,
        why: 'Put the steps for one stair inside Repeat 3, and the robot draws all three.',
      },
      {
        prompt: 'Where can you find patterns?',
        options: [{ text: 'Cloth, tiles, songs and floors', icon: '🧶' }, { text: 'Only in maths books', icon: '📘' }],
        answer: 0,
        why: 'Patterns are everywhere: woven cloth, floor tiles, rangoli, music and more.',
      },
    ],
    badge: { id: 'l1-patterns', name: 'Pattern Finder', icon: '🧩', earnedFor: 'You found the part of a pattern that repeats and looped it.' },
    reward: { note: 'The library is open again. The banner is waiting.' },
    teacher: teacher({
      timing: lessonTiming('Bead patterns'),
      unpluggedWarmup: {
        title: 'Body patterns', minutes: 4,
        steps: [
          'Make a body pattern: hands up, hands down, turn. Repeat it 3 times.',
          'Show pictures of patterns from several cultures (a rangoli, a kente strip, mosaic tiles, a woven mat). Children point to the part that repeats.',
        ],
        materials: ['Pattern pictures (printable sheet)', 'Optional: beads or blocks in two colours'],
      },
      discussion: [
        'Which pattern did you like best? What part repeats?',
        'Is there a pattern on your clothes or in this room?',
      ],
      misconceptions: [
        { idea: 'A pattern is anything pretty.', correction: 'A pattern has a part that repeats in the same way.' },
        { idea: 'The last turn in each step is not needed.', correction: 'Without the last turn, the next step starts facing the wrong way. Try it and watch!' },
      ],
      differentiation: {
        faster: ['Draw a staircase going down instead of up.', 'Make a bead pattern with a 3-part repeat.'],
        slower: ['Draw one step and run it 3 times by pressing Go 3 times; then show how Repeat does that for you.'],
      },
      notes: ['Present cultural patterns respectfully and accurately; name where each comes from. Invite children to bring patterns from their own homes.'],
    }),
    parent: {
      today: 'Your child found patterns in art from around the world and used Repeat to draw a staircase from one repeating step.',
      tryAtHome: 'Go on a pattern hunt at home: tiles, fabric, a fence, a song. For each one, ask "which part repeats?"',
      askYourChild: 'Which part of the staircase did your robot repeat?',
    },
  },

  // ── 12 · PROJECT ─────────────────────────────────────────────────────────
  {
    id: 'L1-S12', level: 1, number: 12, kind: 'project', durationMin: 40,
    title: 'Make It Yours: The Festival Banner',
    objective: 'Design and draw your own picture for the festival banner using at least one Repeat.',
    objectives: [
      obj('L1-S12-O1', 'Develops a program with a sequence and at least one loop to express an idea.', 'I can draw my own picture with a Repeat in it.', ['loops', 'design-process'], ['programming', 'engineering-design']),
      obj('L1-S12-O2', 'Describes the steps and one change made during testing.', 'I can explain how my drawing program works.', ['design-process', 'debugging'], ['communication']),
    ],
    concepts: ['loops', 'design-process', 'debugging'],
    newBlocks: [],
    episode: episode('The Banner Surprise', [
      {
        setting: 'The town hall steps. The long blank banner is rolled out.',
        action: 'Townspeople gather. Ms Mei, Mr Okafor, Mr Haruto and Ms Adaeze each paint something small on the edge.',
        lines: [
          { who: 'lucia', line: 'Every festival banner shows what the town loves.' },
          { who: 'amara', line: 'Then everyone should draw something. Even robots!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Amara’s planning sheet: a house made of squares, a window that repeats.',
        action: 'Amara tests her house. The roof goes wrong; she fixes a turn. Spark claps.',
        lines: [
          { who: 'amara', line: 'My house uses Repeat for the windows!' },
          { who: 'spark', line: 'What will YOU draw? A house? A flower of squares? Steps up a mountain?' },
        ],
        seconds: 35,
      },
      {
        setting: 'The banner, after the children’s drawings (plays after sharing).',
        action: 'As the last line is drawn, the banner glows. The sixth light rolls out of the core of the banner. Counter: 6 of 12 — half! The six lights rise and point together, down the hill, to the harbour.',
        lines: [
          { who: 'spark', line: 'Six lights! Halfway there!' },
          { who: 'lucia', line: 'They all point to the harbour. The rest must be down by the sea.' },
          { who: 'amara', line: 'The harbour has heavy boxes, slippery docks and a dark tunnel…' },
          { who: 'bolt', line: 'Beep… woof?', direction: 'Ears droop.' },
        ],
        seconds: 45,
      },
    ], 'Halfway! Six lights point to the harbour — heavy boxes, slippery docks and a dark old tunnel.', 'The robot drew the library steps. The empty banner had a glow inside…'),
    build: {
      part: { slot: 'tool', id: 'pen' },
      action: 'choose',
      narration: 'Choose your pen colours for the banner.',
      why: 'Artists choose colours to show feelings and ideas. Your banner, your choice.',
      tryWithout: 'No wrong choice today.',
      physicsEffect: 'Colour only.',
      realWorld: 'Drawing robots and plotters make art and maps from programs.',
    },
    code: {
      title: 'Plan Your Picture',
      mission: 'Draw your picture on the grid sheet. Find the part that repeats. Build that part first and test it.',
      arena: arena({
        id: 'l1-banner', name: 'Festival banner',
        description: 'A wide paper banner with a light grid.',
        gridTiles: { cols: 7, rows: 5 }, floor: 'mat',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Your picture. Stay on the banner.',
        features: ['Banner edges glow if the robot is about to leave'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [HOP, HOP_BACK, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT],
      exampleSolution: ['pen_down', 'repeat(4) { drive_for(80, 1); turn_degrees(-90, 40) }', 'pen_up'],
      success: [{ kind: 'within-blocks', detail: 'The program contains at least one repeat and the robot stays on the banner.' }],
      stars: { two: 'Your repeating part draws what you planned.', three: 'You found and fixed a bug while testing.' },
      hints: [
        'Look at your drawing. Which part is the same again and again?',
        'Build that part, test it, then put it in Repeat.',
        'Use pen up to move to a new spot without drawing.',
      ],
    },
    challenge: {
      title: 'My Banner Picture',
      mission: 'Finish your picture. Use at least one Repeat. Then show it to the town!',
      arena: arena({
        id: 'l1-banner', name: 'Festival banner',
        description: 'The banner, with the town waiting.',
        gridTiles: { cols: 7, rows: 5 }, floor: 'mat',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'A finished picture with at least one Repeat, on the banner.',
        features: ['Townspeople cheer when the robot lifts the pen at the end'],
        physics: PAPER_PHYSICS, requires: ['move', 'draw'],
      }),
      allowedBlocks: [HOP, HOP_BACK, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT, BEEP, say('Ta-da!', 'For Lantern Hill!')],
      exampleSolution: ['drive_for(80, 2)', 'turn_degrees(-90, 40)', 'drive_for(80, 3)', 'turn_degrees(90, 40)', 'pen_down', 'repeat(4) { repeat(4) { drive_for(80, 1); turn_degrees(-90, 40) } turn_degrees(-90, 40) }', 'pen_up', 'say("Ta-da!")'],
      success: [
        { kind: 'within-blocks', detail: 'At least one repeat; at least 5 blocks in total.' },
        { kind: 'no-collision', detail: 'Robot stays on the banner.' },
      ],
      stars: { two: 'Your picture matches your plan.', three: 'You explained the repeating part to the class.' },
      hints: [
        'A square inside a Repeat with a turn makes a flower of squares!',
        'Use Pen up and Hop to start a second part somewhere else.',
        'End with Pen up and a "Ta-da!"',
      ],
    },
    project: L1_PROJECTS[1],
    quiz: [
      {
        prompt: 'What does Repeat 4 around "draw a square, turn" make?',
        options: [{ text: 'Four squares around a point, like a flower', icon: '🌸' }, { text: 'One big square', icon: '⬜' }],
        answer: 0,
        why: 'Each time round it draws a square, then turns. Four squares make a flower shape.',
      },
      {
        prompt: 'How do you move to a new spot without drawing?',
        options: [{ text: 'Pen up, then hop', icon: '🖊️⬆️' }, { text: 'Pen down, then hop', icon: '🖊️⬇️' }],
        answer: 0,
        why: 'With the pen up the robot moves without drawing a line.',
      },
      {
        prompt: 'Your picture came out wrong. What is a good first step?',
        options: [{ text: 'Watch where it went wrong', icon: '🔍' }, { text: 'Throw it away', icon: '🗑️' }],
        answer: 0,
        why: 'Watch the robot draw and find the first wrong line — then fix that block.',
      },
    ],
    badge: { id: 'l1-designer2', name: 'Robot Designer II', icon: '🖼️', earnedFor: 'You designed and drew your own picture using a loop.' },
    reward: { note: 'Light 6 of 12 — halfway! The harbour is unlocked.' },
    teacher: teacher({
      timing: projectTiming(),
      unpluggedWarmup: {
        title: 'Grid drawing', minutes: 3,
        steps: ['On squared paper, children colour a shape square by square, then trace its outline with a finger as "robot moves".'],
        materials: ['Squared planning sheet (7 × 5)', 'Coloured pencils'],
      },
      discussion: [
        'Which part of your picture repeats?',
        'What was the hardest bug? How did you find it?',
      ],
      misconceptions: [
        { idea: 'Repeat only works for squares.', correction: 'Any steps can go inside Repeat — dance moves, sounds, stairs.' },
      ],
      differentiation: {
        faster: ['Try a Repeat inside a Repeat (a flower of squares).', 'Make two separate pictures on one banner.'],
        slower: ['Choose from three starter ideas (square house, staircase, line of windows).', 'Five blocks with one Repeat is a complete project.'],
      },
      notes: ['Print or screenshot the banners for a class wall — every banner goes up. No "best banner".'],
    }),
    parent: {
      today: 'Your child designed and drew their own picture for the festival banner using a loop, then tested, fixed and shared it.',
      tryAtHome: 'Download their banner picture together and ask them to "read" the program behind it to you.',
      askYourChild: 'Which part of your picture did you put inside Repeat?',
    },
  },
]
