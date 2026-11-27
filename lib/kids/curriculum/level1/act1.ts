// lib/kids/curriculum/level1/act1.ts
// Level 1, Act 1 (sessions 1–6): "A Helper in a Box".
// The storm, the kit, the first build; robots sense, think and act; moving,
// stopping, waiting, turning; the first "Make it yours" project.
// `{robot}` in a line is replaced by the name the child gave their robot.

import type { Session } from '../types'
import {
  mis,
  BEEP, FLAT_MAT_PHYSICS, HOP, HOP_BACK, LEFT, MOVE_SET, PART_MASS_KG, RIGHT, WAIT, kg,
  arena, episode, lessonTiming, obj, projectTiming, say, teacher,
} from './shared'
import { L1_PROJECTS } from './projects'

export const ACT1: Session[] = [
  // ── 1 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S01', level: 1, number: 1, kind: 'lesson', durationMin: 40,
    title: 'Hello, Robot!',
    objective: 'Say what makes a robot a robot — it senses, thinks and acts — and give it its first instructions.',
    objectives: [
      { ...obj('L1-S01-O1', 'Distinguishes a robot from a toy or simple machine using sense–think–act.', 'I can tell if something is a robot: it senses, thinks and acts.', ['sense-think-act'], ['computing-systems']), discussionOnly: true },
      obj('L1-S01-O2', 'Understands that a robot follows a program: steps carried out in order.', 'I can give my robot steps to do, one after another.', ['sequences'], ['algorithms', 'programming']),
    ],
    concepts: ['sense-think-act', 'sequences'],
    newBlocks: ['say', 'beep', 'wait'],
    episode: episode('The Night the Lights Blew Away', [
      {
        setting: 'Lantern Hill at night: a small town of colourful houses climbing a hill, the sea at the bottom. At the top, the Lantern Clock, its twelve round lights glowing.',
        action: 'Slow camera up the hill. Wind rises; clouds roll in. The twelve lights wobble, pop off and fly away over the roofs like fireflies.',
        lines: [
          { who: 'narrator', line: 'This is Lantern Hill. At the very top is the Lantern Clock. It has twelve lights.' },
          { who: 'narrator', line: 'One night, a big wind came. Whooosh!' },
          { who: 'narrator', line: 'And all twelve lights blew away!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Morning. Nana Lucía’s workshop: shelves of jars full of bolts, a big wooden table, sun through the window.',
        action: 'Amara runs in with a newspaper. Spark hovers, worried. Bolt chases his own antenna tail.',
        lines: [
          { who: 'amara', line: 'Nana! The clock has no lights! And the Night of a Hundred Lights is coming soon!' },
          { who: 'spark', line: 'Twelve lights, lost all over town. We have to find them!' },
          { who: 'bolt', line: 'Beep-woof!' },
          { who: 'lucia', line: 'Then we need one more helper.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Same workshop. A dusty box on a high shelf, tied with string. The label says: FOR A NEW HELPER.',
        action: 'Nana Lucía lifts the box down and blows off the dust. She turns to the camera — to the child.',
        lines: [
          { who: 'lucia', line: 'When I was young, I built robots. I kept this box for someone new.' },
          { who: 'lucia', line: 'Someone just like you.', direction: 'Smiles at the camera.' },
          { who: 'spark', line: 'A robot kit! You can build your very own robot!' },
        ],
        seconds: 25,
      },
      {
        setting: 'Workshop table. A toaster, a toy car and Bolt sit in a row.',
        action: 'Spark points at each one in turn. A ball rolls past Bolt: Bolt’s ears twitch (a glow on his ears), a thought bubble shows a ball, then he runs after it.',
        lines: [
          { who: 'spark', line: 'Is a toaster a robot? Hmm. It cannot see you. It cannot decide anything.' },
          { who: 'spark', line: 'Is a toy car a robot? Not if you push it. It does what your hand does.' },
          { who: 'spark', line: 'Watch Bolt. He sees the ball. He thinks, "Ball!" And he runs!' },
          { who: 'spark', line: 'Sense. Think. Act. That is what a robot does!' },
          { who: 'spark', line: 'Can you say it with me? Sense! Think! Act!', direction: 'Pause for the children to answer.' },
        ],
        seconds: 40,
      },
      {
        setting: 'The kit is open on the table: four different robot bodies in a row.',
        action: 'Spark taps each body. Inside each one we glimpse a small battery and a tiny computer “brain”.',
        lines: [
          { who: 'spark', line: 'Every robot needs a body. It keeps the battery and the brain safe inside.' },
          { who: 'amara', line: 'The battery gives it energy. The brain is a tiny computer that follows the plan.' },
          { who: 'spark', line: 'Pick the body you like best!' },
        ],
        seconds: 25,
      },
      {
        setting: 'The child’s new robot body on the table. Its eyes light up for the first time.',
        action: 'The robot blinks. It does nothing else. Spark leans in, puzzled.',
        lines: [
          { who: 'spark', line: 'Hello? Hello, robot?' },
          { who: 'lucia', line: 'A robot only does what its program tells it. A program is a list of steps.' },
          { who: 'lucia', line: 'Let’s teach it to say hello.' },
          { who: 'myrobot', line: 'Beep! Hello!', direction: 'Its first words. Everyone cheers.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Workshop floor near the door. Evening light.',
        action: 'Bolt sniffs under the door. A soft golden glow slips past outside — one of the clock lights, rolling away down the path.',
        lines: [
          { who: 'bolt', line: 'Beep-woof? Beep-woof!' },
          { who: 'spark', line: 'A clock light! Right outside! But… our robot has no wheels yet!' },
        ],
        seconds: 20,
      },
    ], 'A clock light rolls past the door — and the new robot cannot move yet. Next time: wheels!'),
    build: {
      part: { slot: 'body', id: 'box' },
      action: 'choose',
      narration: 'Pick a body for your robot. Every body is good — they are just good at different things.',
      why: 'The body holds the battery (the robot’s energy) and the brain (a tiny computer) and keeps them safe.',
      tryWithout: 'Without a body the battery and brain fall on the floor — nothing works.',
      physicsEffect: `Body mass in the simulator: Bug ${kg(PART_MASS_KG.body.bug)}, Dome ${kg(PART_MASS_KG.body.dome)}, Box ${kg(PART_MASS_KG.body.box)}, Tall Tower ${kg(PART_MASS_KG.body.tall)}. Heavier bodies start and stop a little more slowly (felt in session 14).`,
      realWorld: 'Robot vacuum cleaners are round and flat so they fit under sofas; warehouse robots are big boxes so they can carry shelves.',
    },
    code: {
      title: 'First Words',
      mission: 'Make your robot say hello, then beep.',
      arena: arena({
        id: 'l1-workshop-table', name: 'Workshop table',
        description: 'Your robot sits on Nana Lucía’s table. Spark and Bolt are watching.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'wood',
        start: { col: 1, row: 1, heading: 'down' },
        goal: 'No moving today — the robot has no wheels yet. It just has to talk.',
        features: ['Spark and Bolt react to each sound the robot makes'],
        physics: FLAT_MAT_PHYSICS, requires: [],
      }),
      allowedBlocks: [say('Hello!', 'Good morning!'), BEEP],
      exampleSolution: ['say("Hello!")', 'beep'],
      success: [{ kind: 'action-at-zone', detail: 'Program runs say then beep, in that order.' }],
      stars: { two: 'Your robot said hello first, then beeped — in the right order.', three: 'You pressed Go and listened, then told Spark what the robot did first.' },
      hints: [
        'What should your robot do first? Find the talking block.',
        'Put the "Say" block at the top. Then the "Beep" block under it.',
        'Tap "Say Hello!", then tap "Beep" — they line up in that order — and press the green Go button.',
      ],
    },
    challenge: {
      title: 'Good Morning Song',
      mission: 'Make a wake-up song: beep, wait, beep, then say "Good morning!"',
      arena: arena({
        id: 'l1-workshop-table', name: 'Workshop table',
        description: 'The sun is coming up. Wake up the whole workshop!',
        gridTiles: { cols: 3, rows: 3 }, floor: 'wood',
        start: { col: 1, row: 1, heading: 'down' },
        goal: 'Spark and Bolt wake up on screen when they get: beep … beep … "Good morning!"',
        features: ['Sleeping Spark and Bolt with "Zzz" bubbles', 'Every sound is also shown: each beep flashes a ring around the robot and Say shows a speech bubble with the words, so a child who cannot hear it can still see the song'],
        physics: FLAT_MAT_PHYSICS, requires: [],
      }),
      allowedBlocks: [BEEP, WAIT, say('Good morning!', 'Hello!')],
      exampleSolution: ['beep', 'wait(1)', 'beep', 'say("Good morning!")'],
      success: [{ kind: 'action-at-zone', detail: 'The sounds (and their visual rings and bubble) happen in this order: beep, a pause of at least 1 s, beep, say "Good morning!". Then Spark and Bolt visibly wake up: eyes open, "Zzz" bubbles pop, Bolt wags.' }],
      stars: { two: 'You used a Wait so the beeps are not squashed together.', three: 'You added your own extra step at the end and said what it does.' },
      hints: [
        'Listen to the song: beep … beep … good morning. What comes first?',
        'Between the two beeps there is a little rest. Which block makes the robot rest?',
        'Beep, then Wait 1, then Beep, then Say "Good morning!"',
      ],
    },
    quiz: [
      {
        prompt: 'Which one is a robot?',
        options: [{ text: 'A robot vacuum that turns when it bumps a chair', icon: '🤖' }, mis('A spoon', '🥄', 'tools-are-robots'), mis('A torch with a battery', '🔦', 'battery-means-robot')],
        answer: 0,
        why: 'The robot vacuum senses the chair, thinks "turn!", and acts by turning. Sense, think, act! A torch has a battery, but it cannot sense or decide.',
      },
      {
        prompt: 'What does the battery give a robot?',
        options: [mis('Eyes', '👀', 'battery-gives-senses'), { text: 'Energy', icon: '⚡' }, { text: 'A name', icon: '🏷️' }],
        answer: 1,
        why: 'A battery stores energy. The robot uses that energy to think and to move.',
      },
      {
        prompt: 'Your robot does what…?',
        options: [mis('It wants to', '💭', 'machines-have-feelings'), { text: 'Its program says, step by step', icon: '📋' }],
        answer: 1,
        why: 'A robot follows its program, one step after another. It does not guess what you want.',
      },
    ],
    badge: { id: 'l1-hello', name: 'Robot Waker', icon: '👋', earnedFor: 'You know a robot senses, thinks and acts — and you gave yours its first steps.' },
    reward: { note: 'Your robot body is yours to keep and colour.' },
    teacher: teacher({
      timing: lessonTiming('"Sense, think, act" freeze game'),
      unpluggedWarmup: {
        title: 'Sense, Think, Act freeze game', minutes: 4,
        steps: [
          'Children walk around. When you clap (sense!), they freeze and think where to go (think!), then hop to a new spot (act!).',
          'Say the three words with an action each: hand to ear (sense), finger to head (think), jump (act).',
          'Ask: "What did you use to sense the clap?" (ears).',
        ],
        materials: ['None'],
      },
      discussion: [
        'Is a fan a robot? Why or why not?',
        'What senses do you have? What could a robot use instead of ears or eyes?',
        'What does "follow the steps in order" mean when you brush your teeth?',
      ],
      misconceptions: [
        { idea: 'Robots are alive and have feelings.', correction: 'Robots are machines. They can look friendly and show faces, but they follow programs people write.' },
        { idea: 'Anything with a battery is a robot.', correction: 'A torch has a battery but cannot sense or decide. A robot senses, thinks and acts.' },
        { idea: 'Robots must look like people.', correction: 'Most robots look nothing like people: vacuums, arms in factories, rovers.' },
      ],
      differentiation: {
        faster: ['Make a longer song (four steps or more) and teach it to a friend.', 'Sort pictures of machines into "robot" and "not a robot" and explain one.'],
        slower: ['Do the code task with two blocks only, with a teacher pointing to the top of the screen.', 'Act out sense–think–act with Bolt before touching the screen.'],
      },
    }),
    parent: {
      today: 'Your child learned that a robot senses, thinks and acts, chose a body for their own robot, and gave it its first two-step program.',
      tryAtHome: 'Play "robot breakfast": your child gives you steps to make toast or pour cereal, and you do exactly what they say — even when it is silly. Laugh together when a step is missing.',
      askYourChild: 'Is our washing machine a robot? What would it need to be one?',
    },
  },

  // ── 2 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S02', level: 1, number: 2, kind: 'lesson', durationMin: 40,
    title: 'Wheels to Roll',
    objective: 'Add wheels, explain that motors turn them, and drive forward to a spot.',
    objectives: [
      obj('L1-S02-O1', 'Names motor and wheel and explains that the motor turns the wheel using energy from the battery.', 'I can say what makes my robot’s wheels turn.', ['physics', 'sense-think-act'], ['computing-systems', 'science-energy']),
      obj('L1-S02-O2', 'Uses a forward block with a number of steps to reach a target, counting tiles.', 'I can count the steps and drive my robot to a spot.', ['sequences'], ['programming', 'mathematics-measurement']),
    ],
    concepts: ['physics', 'sequences'],
    newBlocks: ['drive_for'],
    episode: episode('Follow That Light!', [
      {
        setting: 'Workshop table. The robot body from last time.',
        action: 'Spark lays out two wheels, two small motors and a little ball wheel.',
        lines: [
          { who: 'spark', line: 'That light is rolling away! Let’s give your robot wheels!' },
          { who: 'lucia', line: 'Each wheel has a motor. A motor is a little spinner.' },
          { who: 'lucia', line: 'Energy from the battery makes it spin. The spin turns the wheel.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Close-up under the robot.',
        action: 'X-ray view: battery glows, a line of light runs to each motor, motors spin, wheels turn. Then the little ball at the back rolls freely.',
        lines: [
          { who: 'amara', line: 'Only two wheels? Won’t it fall over?' },
          { who: 'lucia', line: 'See this little ball at the back? It rolls any way. It holds the robot up.' },
          { who: 'spark', line: 'Two wheels to push, one ball to balance!' },
        ],
        seconds: 30,
      },
      {
        setting: 'The workshop doorstep, then the garden path outside, lined with flowerpots.',
        action: 'The robot rolls out of the door for the first time. It goes too far and stops in the grass. Bolt laughs (beep-woof!).',
        lines: [
          { who: 'myrobot', line: 'Wheee!' },
          { who: 'spark', line: 'Too far! The robot does not know where the light is. We must tell it how far to go.' },
          { who: 'amara', line: 'Look — the path has squares. Let’s count them. One, two, three!' },
          { who: 'spark', line: 'How many squares to the light? Count with me!', direction: 'Pause for the children to count.' },
        ],
        seconds: 45,
      },
      {
        setting: 'Garden path. A golden clock light glows beside a flowerpot.',
        action: 'The robot hops exactly to the light and stops. The light jumps happily onto the robot’s back. Counter on screen: 1 of 12.',
        lines: [
          { who: 'spark', line: 'You found the first light! One!' },
          { who: 'lucia', line: 'Good counting makes good robots.' },
        ],
        seconds: 30,
      },
      {
        setting: 'The light on the robot’s back starts to flicker and points like a compass down the hill.',
        action: 'An arrow of light points at the bakery at the bottom of the street.',
        lines: [
          { who: 'amara', line: 'It’s pointing! Another light must be near Mr Okafor’s bakery!' },
          { who: 'bolt', line: 'Beep-woof! Sniff sniff… bread!' },
        ],
        seconds: 25,
      },
    ], 'The first light points the way down the hill — to the busiest street in town.', 'The clock lights blew away. You built your robot’s body. A light rolled past the door…'),
    build: {
      part: { slot: 'drive', id: 'wheels2' },
      action: 'add',
      narration: 'Snap on two wheels with motors, and the little ball at the back.',
      why: 'Motors use battery energy to spin the wheels. Spinning wheels push on the floor and the robot rolls.',
      tryWithout: 'Without wheels, pressing Go does nothing — the robot sits still like a statue.',
      physicsEffect: `Two driven wheels plus a free-rolling caster ball (differential drive). Adds ${kg(PART_MASS_KG.drive.wheels2)}.`,
      realWorld: 'Most robot vacuum cleaners move on two wheels and a small free wheel.',
    },
    code: {
      title: 'Out of the Door',
      mission: 'Drive out of the door to the doormat. Count the squares first!',
      arena: arena({
        id: 'l1-doorstep', name: 'Workshop doorstep',
        description: 'A straight path of squares from the workshop door to the doormat.',
        gridTiles: { cols: 1, rows: 5 }, floor: 'mat',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Stop on the doormat at tile (0,1) — 3 squares ahead.',
        features: ['Wall at row 0 (the garden fence)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: [HOP],
      exampleSolution: ['drive_for(80, 3)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,1).' },
        { kind: 'no-collision', detail: 'Robot does not touch the fence at row 0.' },
      ],
      stars: { two: 'You counted the squares before pressing Go.', three: 'You used just one block.' },
      hints: [
        'Count the squares from your robot to the doormat.',
        'There are 3 squares. Which number goes in the Hop block?',
        'Use "Hop forward 3".',
      ],
    },
    challenge: {
      title: 'The First Light',
      mission: 'Drive down the garden path and stop right on the light. Don’t knock the flowerpot!',
      arena: arena({
        id: 'l1-garden-path', name: 'Garden path',
        description: 'A path of six squares. The clock light glows on square four. A flowerpot sits right after it.',
        gridTiles: { cols: 1, rows: 6 }, floor: 'mat',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Stop on the light at tile (0,1) — 4 squares ahead.',
        features: ['Clock light on tile (0,1)', 'Flowerpot on tile (0,0) (knocks over if touched)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK],
      exampleSolution: ['drive_for(80, 2)', 'drive_for(80, 2)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,1).' },
        { kind: 'no-collision', detail: 'The flowerpot is not touched.' },
      ],
      stars: { two: 'You stopped on the light without touching the flowerpot.', three: 'You found a way using only 2 blocks (the biggest hop is 3).' },
      hints: [
        'Count the squares to the light. Is it more than 3?',
        'It is 4 squares. The biggest hop is 3. Can you use two hop blocks?',
        'Try "Hop forward 2" and then "Hop forward 2" — or 3 and then 1.',
      ],
    },
    quiz: [
      {
        prompt: 'What makes the wheels turn?',
        options: [mis('Wind', '🌬️', 'motor-not-needed'), mis('The robot knows where to go, so they turn by themselves', '💭', 'robot-knows-where-to-go'), { text: 'A motor', icon: '⚙️' }],
        answer: 2,
        why: 'A motor spins when it gets energy from the battery, and the spin turns the wheel.',
      },
      {
        prompt: 'The light is 2 squares away. Which block?',
        options: [{ text: 'Hop forward 2', icon: '2️⃣' }, mis('Hop forward 3', '3️⃣', 'count-the-start-square')],
        answer: 0,
        why: 'Count the squares: one, two. Hop 2 lands right on it. Hop 3 goes too far.',
      },
      {
        prompt: 'Why does the robot have a little ball at the back?',
        options: [mis('To make it go faster', '💨', 'extra-parts-make-it-faster'), { text: 'To hold it up and roll any way', icon: '⚪' }],
        answer: 1,
        why: 'The ball is called a caster. It balances the robot and rolls in any direction.',
      },
    ],
    badge: { id: 'l1-roller', name: 'Roller', icon: '🛞', earnedFor: 'You gave your robot wheels and drove it to the right spot by counting.' },
    reward: { unlocks: { slot: 'drive', id: 'wheels2' }, note: 'Light 1 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Human wheels'),
      unpluggedWarmup: {
        title: 'Human wheels', minutes: 4,
        steps: [
          'Tape a line of 5 squares on the floor (or use floor tiles).',
          'A child is the robot. The class calls out "Forward 2!" and the robot takes exactly 2 steps, one per square.',
          'Ask: "What happens if the robot takes giant steps?" (it goes too far — steps must be the same size).',
        ],
        materials: ['Masking tape or floor tiles'],
      },
      discussion: [
        'What else has motors that spin? (fan, blender, toy car)',
        'Why did the robot go too far the first time in the story?',
        'Why do we count before we press Go?',
      ],
      misconceptions: [
        { idea: 'The robot knows where the light is.', correction: 'It doesn’t. It has no eyes yet. It only goes as far as we tell it.' },
        { idea: 'Bigger number = faster.', correction: 'In the hop block the number is how many squares (how long it drives), not how fast.' },
      ],
      differentiation: {
        faster: ['Find two different block plans that reach the light (2+2, 3+1, 1+3).', 'Predict out loud where the robot will stop before pressing Go.'],
        slower: ['Point to each square with a finger while counting.', 'Start with the 3-square doorstep twice before the challenge.'],
      },
    }),
    parent: {
      today: 'Your child added motors and wheels to their robot and learned to count squares to drive it to a spot.',
      tryAtHome: 'Lay 5 cushions or books in a line. Your child is the robot: you say "Forward 3", they step exactly 3. Then swap — you are the robot.',
      askYourChild: 'What is inside a motor that makes it spin? (Let them guess — the answer is magnets and electricity.)',
    },
  },

  // ── 3 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S03', level: 1, number: 3, kind: 'lesson', durationMin: 40,
    title: 'Stop, Wait, Go!',
    objective: 'Use Wait to pause at the right moment and see that the order of steps changes what happens.',
    objectives: [
      obj('L1-S03-O1', 'Uses a wait instruction to time an action safely around a moving object.', 'I can make my robot wait, then go.', ['events-timing', 'sequences'], ['programming']),
      obj('L1-S03-O2', 'Recognises that changing the order of instructions changes the outcome.', 'I know the order of my steps matters.', ['sequences'], ['algorithms']),
    ],
    concepts: ['sequences', 'events-timing'],
    newBlocks: [],
    episode: episode('The Bread Cart', [
      {
        setting: 'Bakery Lane: a busy street going down the hill. Mr Okafor’s bakery, warm smells drawn as swirls.',
        action: 'The team follows the light’s arrow. A bread cart rolls across the street.',
        lines: [
          { who: 'spark', line: 'The light points into the bakery! Let’s go!' },
          { who: 'guest', guestName: 'Mr Okafor, the baker', line: 'Careful, little ones! My bread cart crosses here every morning!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Bakery Lane. The robot rolls towards the cart’s path.',
        action: 'The robot rolls straight on. Just in time the cart stops. Crumbs fly; nobody is hurt; a loaf lands on Bolt’s head.',
        lines: [
          { who: 'amara', line: 'Stop! The robot didn’t wait!' },
          { who: 'bolt', line: 'Beep-woof?', direction: 'Wearing a loaf like a hat.' },
          { who: 'lucia', line: 'Our robot does every step right away. It needs a step that says: wait.' },
        ],
        seconds: 35,
      },
      {
        setting: 'Kerb at the side of the street.',
        action: 'Spark draws three cards in the air: GO, WAIT, GO. Then shuffles them: GO, GO, WAIT — and the cartoon robot bumps the cart.',
        lines: [
          { who: 'spark', line: 'Go one. Wait. Then go again!' },
          { who: 'spark', line: 'What if we mix the cards up? Go, go, then wait?' },
          { who: 'amara', line: 'Then it waits AFTER the crash. The order is important!' },
          { who: 'spark', line: 'Which card comes first? You choose!', direction: 'Pause for answers.' },
        ],
        seconds: 45,
      },
      {
        setting: 'Bakery Lane, second try.',
        action: 'Robot hops once, waits as the cart rolls by, then hops to the bakery door. Mr Okafor claps with floury hands.',
        lines: [
          { who: 'guest', guestName: 'Mr Okafor, the baker', line: 'What a polite robot!' },
          { who: 'myrobot', line: 'Beep! Good morning!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Inside the bakery. Shelves of bread from around the world: flatbread, round loaves, buns.',
        action: 'The clock light glows from inside a tall stack of bread baskets. People bustle everywhere. A small girl hides behind her dad’s leg, afraid of the robot.',
        lines: [
          { who: 'spark', line: 'There’s the light! But the bakery is so busy…' },
          { who: 'amara', line: 'And that little girl looks scared of our robot.' },
        ],
        seconds: 25,
      },
    ], 'The second light is inside the crowded bakery — and a little girl is frightened of the robot. How can people know what a robot will do?', 'Your robot got wheels and found the first light. The light pointed to the bakery…'),
    build: {
      part: { slot: 'body', id: 'box' },
      action: 'inspect',
      narration: 'Let’s look inside your robot’s body. See the brain? It reads one step, does it, then reads the next.',
      why: 'The brain (a tiny computer) runs the program in order, very fast — but it only waits if a step tells it to.',
      tryWithout: 'Without a Wait step the brain jumps straight to the next step, even when that is a bad idea.',
      physicsEffect: 'No change to the robot. The sim shows the steps lighting up one by one as they run.',
      realWorld: 'Traffic lights and level-crossing gates run timed programs: wait, then change.',
    },
    code: {
      title: 'Let the Cart Pass',
      mission: 'Hop to the kerb, wait for the bread cart to pass, then hop to the bakery door.',
      arena: arena({
        id: 'l1-bakery-lane', name: 'Bakery Lane',
        description: 'A street with the bread cart rolling across the middle. The bakery door is at the far end.',
        gridTiles: { cols: 1, rows: 6 }, floor: 'mat',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Reach the bakery door at tile (0,2).',
        features: ['Bread cart crosses row 3 from left to right, between 1 s and 3.5 s after Go (once)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: [HOP, WAIT],
      exampleSolution: ['drive_for(80, 1)', 'wait(3)', 'drive_for(80, 2)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,2).' },
        { kind: 'no-collision', detail: 'Robot never touches the cart.' },
      ],
      stars: { two: 'You waited long enough for the cart.', three: 'You explained out loud why Wait goes in the middle.' },
      hints: [
        'Watch the cart first. When does it cross?',
        'Hop 1 to the kerb, then wait before you cross.',
        'Hop 1, Wait 3, Hop 2.',
      ],
    },
    challenge: {
      title: 'Morning Delivery',
      mission: 'Get past the cart to the bakery door, ring the bell with a beep, and say good morning.',
      arena: arena({
        id: 'l1-bakery-lane-long', name: 'Bakery Lane (long)',
        description: 'The same street, but the door is one square further.',
        gridTiles: { cols: 1, rows: 6 }, floor: 'mat',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Stop at the door, tile (0,1), then beep, then say "Good morning!".',
        features: ['Bread cart crosses row 3 between 1 s and 3.5 s after Go', 'Door bell at tile (0,0)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: [HOP, WAIT, BEEP, say('Good morning!', 'Bread, please!')],
      exampleSolution: ['drive_for(80, 1)', 'wait(3)', 'drive_for(80, 3)', 'beep', 'say("Good morning!")'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,1).' },
        { kind: 'no-collision', detail: 'Robot never touches the cart.' },
        { kind: 'action-at-zone', detail: 'beep then say happen after the robot has stopped at the door.' },
      ],
      stars: { two: 'You beeped and spoke only after you arrived.', three: 'You tried a different Wait number and explained what changed.' },
      hints: [
        'This is like last time, but the door is further and you must ring the bell.',
        'Hop, Wait, Hop… then what do you do at a door?',
        'Hop 1, Wait 3, Hop 3, Beep, Say "Good morning!".',
      ],
    },
    quiz: [
      {
        prompt: 'A cart is crossing. What should the robot do?',
        options: [mis('Keep going — the robot will see the cart and stop', '👀', 'robot-can-see-without-sensor'), { text: 'Wait', icon: '✋' }],
        answer: 1,
        why: 'Wait until the way is clear, then go. That is how robots — and people — stay safe.',
      },
      {
        prompt: 'Go, Go, Wait. Or Go, Wait, Go. Which lets the cart pass?',
        options: [{ text: 'Go, Wait, Go', icon: '🟢✋🟢' }, mis('Go, Go, Wait', '🟢🟢✋', 'order-does-not-matter')],
        answer: 0,
        why: 'The wait must come before the crossing. The same steps in a different order do something different.',
      },
      {
        prompt: 'Does a robot wait by itself if we forget the Wait block?',
        options: [{ text: 'No', icon: '👎' }, mis('Yes', '👍', 'robot-fills-in-steps')],
        answer: 0,
        why: 'No. The robot only does what the program says. If there is no Wait, it does not wait.',
      },
    ],
    badge: { id: 'l1-waiter', name: 'Patient Driver', icon: '✋', earnedFor: 'You used Wait at the right moment and put your steps in the right order.' },
    reward: { note: 'The bakery is open to your robot.' },
    teacher: teacher({
      timing: lessonTiming('Red light, green light with cards'),
      unpluggedWarmup: {
        title: 'Go and Wait cards', minutes: 4,
        steps: [
          'Make three big cards: GO, GO, WAIT. A child holds them in a line; the class does each card (step forward, step forward, freeze for 3 counts).',
          'Swap the card order and do it again. Ask: "Did we do the same thing?"',
        ],
        materials: ['Three paper cards: GO, GO, WAIT'],
      },
      discussion: [
        'Where do you wait in real life before you go? (crossing a road, queue, lift door)',
        'Why did the order of the cards matter?',
      ],
      misconceptions: [
        { idea: 'The robot can see the cart and will stop.', correction: 'This robot has no eyes yet. It cannot see the cart. That is why we tell it to wait.' },
        { idea: 'Wait makes the robot slower everywhere.', correction: 'Wait only pauses at the place it is in the program.' },
      ],
      differentiation: {
        faster: ['Find the shortest Wait that still works and explain why.', 'Add a second wait and see what changes.'],
        slower: ['Do the cards activity again with the screen program side by side.', 'Use only the code task; the challenge is optional.'],
      },
      notes: ['Road safety link: tell children the robot waits at the kerb just like they do — stop, look, wait.'],
    }),
    parent: {
      today: 'Your child used a Wait step so their robot let a cart pass safely, and saw that the same steps in a different order do something different.',
      tryAtHome: 'Make a sandwich in the wrong order (butter on the plate, then bread on top). Ask your child to fix the order of the steps.',
      askYourChild: 'Why did the robot need a Wait step? Couldn’t it just see the cart?',
    },
  },

  // ── 4 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S04', level: 1, number: 4, kind: 'lesson', durationMin: 40,
    title: 'A Face That Talks',
    objective: 'Add a face screen and use it to tell people what the robot will do, so they feel safe.',
    objectives: [
      obj('L1-S04-O1', 'Explains that robots should show people what they are about to do, and why that keeps people safe.', 'I can make my robot tell people what it will do.', ['safety-ethics'], ['impacts-of-computing', 'communication']),
      obj('L1-S04-O2', 'Combines speech and movement in a sequence of at least four steps.', 'I can mix talking and moving in my program.', ['sequences'], ['programming']),
    ],
    concepts: ['safety-ethics', 'sequences'],
    newBlocks: [],
    episode: episode('Don’t Be Scared', [
      {
        setting: 'Inside the busy bakery.',
        action: 'The robot rolls in. People step back. The small girl, Noor, hides behind her dad.',
        lines: [
          { who: 'guest', guestName: 'Noor, age 5', line: 'Is it going to bump me?' },
          { who: 'amara', line: 'She can’t tell what our robot will do next.' },
        ],
        seconds: 25,
      },
      {
        setting: 'Bakery corner. Nana Lucía crouches next to Noor.',
        action: 'Nana pulls a small round screen from her bag. On it, two friendly eyes blink.',
        lines: [
          { who: 'lucia', line: 'When you cross the road, the driver waves. You know they saw you.' },
          { who: 'lucia', line: 'A robot can show a face and tell people what it will do.' },
          { who: 'spark', line: 'A face screen!' },
        ],
        seconds: 35,
      },
      {
        setting: 'The robot with its new face screen.',
        action: 'The screen shows an arrow and a smile. The robot speaks before it moves.',
        lines: [
          { who: 'myrobot', line: 'Hello! I am going forward now.' },
          { who: 'guest', guestName: 'Noor, age 5', line: 'Oh! It told me! Hello, robot!', direction: 'Steps out, waving.' },
          { who: 'spark', line: 'When people know what a robot will do, they feel safe.' },
          { who: 'spark', line: 'What would YOUR robot say before it moves?', direction: 'Pause for answers.' },
        ],
        seconds: 45,
      },
      {
        setting: 'Bread basket stack. The clock light glows inside.',
        action: 'The robot says "Excuse me!", rolls to the baskets, beeps. The light floats out and lands on its back. Counter: 2 of 12.',
        lines: [
          { who: 'myrobot', line: 'Excuse me! Found a light!' },
          { who: 'amara', line: 'Two lights! Ten more to go!' },
        ],
        seconds: 35,
      },
      {
        setting: 'Outside the bakery. The town square below, with a round fountain.',
        action: 'The second light points down to the fountain. But the path to it bends around a corner.',
        lines: [
          { who: 'spark', line: 'The next light is by the fountain. But the street turns a corner!' },
          { who: 'bolt', line: 'Beep-woof?', direction: 'Spins in a circle, confused.' },
          { who: 'spark', line: 'Our robot only goes straight. How will it turn?' },
        ],
        seconds: 30,
      },
    ], 'The next light is around a corner, and the robot only knows how to go straight. How do robots turn?', 'The robot learned to wait. The second light was hidden in the busy bakery…'),
    build: {
      part: { slot: 'head', id: 'screen' },
      action: 'add',
      narration: 'Click on the face screen. Choose your robot’s eyes and smile.',
      why: 'The face screen shows people how the robot is "feeling" and what it is about to do, so nobody is surprised.',
      tryWithout: 'Without it, people in the bakery step away — they cannot tell what the robot will do.',
      physicsEffect: `Adds ${kg(PART_MASS_KG.head.screen)} to the top of the robot. Say blocks now also show the words on the screen.`,
      realWorld: 'Delivery robots on footpaths and helper robots in airports show faces or lights so people know what they will do.',
    },
    code: {
      title: 'Hello Before Moving',
      mission: 'Tell Noor what you will do, then drive forward and say hello.',
      arena: arena({
        id: 'l1-bakery-floor', name: 'Bakery floor',
        description: 'A short aisle inside the bakery. Noor stands at the side.',
        gridTiles: { cols: 1, rows: 4 }, floor: 'wood',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Say what you will do BEFORE moving, then stop at tile (0,1) and say hello.',
        features: ['Noor beside tile (0,2) — smiles if the robot spoke before moving, hides if not'],
        physics: FLAT_MAT_PHYSICS.replace('a printed mat', 'a wooden floor'), requires: ['move'],
      }),
      allowedBlocks: [HOP, say('I am going forward!', 'Hello!', 'Excuse me!')],
      exampleSolution: ['say("I am going forward!")', 'drive_for(80, 2)', 'say("Hello!")'],
      success: [
        { kind: 'action-at-zone', detail: 'A say block runs before the first movement block.' },
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,1).' },
      ],
      stars: { two: 'Noor smiled because your robot spoke first.', three: 'Your robot said hello at the end too.' },
      hints: [
        'Before your robot moves, what should it tell Noor?',
        'Put a Say block at the very top.',
        'Say "I am going forward!", Hop 2, Say "Hello!".',
      ],
    },
    challenge: {
      title: 'The Bread Basket Light',
      mission: 'Say "Excuse me!", drive to the bread baskets, beep, and say you found the light.',
      arena: arena({
        id: 'l1-bakery-baskets', name: 'Bakery baskets',
        description: 'A longer aisle with customers on both sides. The light glows in the baskets at the end.',
        gridTiles: { cols: 1, rows: 5 }, floor: 'wood',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Stop at tile (0,1) in front of the baskets (tile (0,0)), beep, say "Found a light!".',
        features: ['Bread baskets on tile (0,0) (topple if touched)', 'Customers beside rows 2 and 3'],
        physics: FLAT_MAT_PHYSICS.replace('a printed mat', 'a wooden floor'), requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK, BEEP, say('Excuse me!', 'Found a light!', 'Thank you!')],
      exampleSolution: ['say("Excuse me!")', 'drive_for(80, 3)', 'beep', 'say("Found a light!")'],
      success: [
        { kind: 'action-at-zone', detail: 'say("Excuse me!") runs before the first movement.' },
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,1).' },
        { kind: 'no-collision', detail: 'Baskets not touched.' },
      ],
      stars: { two: 'You were polite first and stopped before the baskets.', three: 'You said "Thank you!" to the baker at the end.' },
      hints: [
        'What does a polite robot say before it goes through a crowd?',
        'Excuse me, then hop. How many squares to the baskets?',
        'Say "Excuse me!", Hop 3, Beep, Say "Found a light!".',
      ],
    },
    quiz: [
      {
        prompt: 'Why does a robot show a face or say what it will do?',
        options: [mis('Because talking makes it move', '🗣️', 'say-makes-it-move'), { text: 'So people know what it will do', icon: '🙂' }],
        answer: 1,
        why: 'When people know what a robot will do next, they feel safe and are not surprised.',
      },
      {
        prompt: 'When should the robot say "I am going forward"?',
        options: [mis('After it moves', '⏭️', 'announce-after'), { text: 'Before it moves', icon: '⏮️' }],
        answer: 1,
        why: 'Telling people before you move gives them time to get out of the way.',
      },
      {
        prompt: 'Is the robot’s face really feeling happy?',
        options: [mis('Yes, robots feel like us', '💗', 'machines-have-feelings'), { text: 'No, it is a picture to help people', icon: '🖼️' }],
        answer: 1,
        why: 'The face is a picture on a screen. It helps people understand the robot. Robots do not feel like we do.',
      },
    ],
    badge: { id: 'l1-friendly', name: 'Friendly Robot', icon: '🙂', earnedFor: 'You made your robot tell people what it will do, so they feel safe.' },
    reward: { unlocks: { slot: 'head', id: 'screen' }, note: 'Light 2 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Announce your move'),
      unpluggedWarmup: {
        title: 'Announce your move', minutes: 4,
        steps: [
          'In pairs: one child is a robot and must SAY what they will do before doing it ("I will take two steps forward").',
          'Then try without announcing — the partner says how it felt not to know.',
        ],
        materials: ['None'],
      },
      discussion: [
        'How do you know a car is about to turn? (indicator lights)',
        'What would you want a robot in your school to tell you?',
        'Are robot faces real feelings?',
      ],
      misconceptions: [
        { idea: 'If a robot smiles, it is happy.', correction: 'The screen shows a picture chosen by people to communicate. The robot does not feel.' },
        { idea: 'Talking makes the robot move.', correction: 'Say only speaks. It is the Hop block that moves the robot.' },
      ],
      differentiation: {
        faster: ['Write a short "robot manners" list of three things a polite robot does.', 'Add a goodbye at the end and a back hop.'],
        slower: ['Pick the Say phrase together; focus on putting it at the top.', 'Act out the code with a toy before building it.'],
      },
    }),
    parent: {
      today: 'Your child gave their robot a face screen and learned that robots should tell people what they will do, so everyone feels safe.',
      tryAtHome: 'On a walk, spot the ways machines "tell" us what they will do: car indicator lights, a beeping reversing truck, a lift that dings.',
      askYourChild: 'What did your robot say to Noor, and why did that help?',
    },
  },

  // ── 5 ────────────────────────────────────────────────────────────────────
  {
    id: 'L1-S05', level: 1, number: 5, kind: 'lesson', durationMin: 40,
    title: 'Left and Right',
    objective: 'Turn the robot left and right on the spot to follow a path around a corner.',
    objectives: [
      obj('L1-S05-O1', 'Uses quarter-turn left and right instructions from the robot’s point of view.', 'I can turn my robot left and right.', ['sequences'], ['programming', 'mathematics-geometry']),
      obj('L1-S05-O2', 'Explains that a two-wheeled robot turns by spinning its wheels opposite ways.', 'I can say how my robot turns.', ['physics'], ['computing-systems', 'science-forces']),
    ],
    concepts: ['sequences', 'physics'],
    newBlocks: ['turn_degrees'],
    episode: episode('Around the Fountain', [
      {
        setting: 'The town square of Lantern Hill: a round fountain in the middle, benches, pigeons, a fruit stall.',
        action: 'The robot faces a corner. It hops forward and bumps gently into a bench.',
        lines: [
          { who: 'spark', line: 'Oops! Straight is not always the way.' },
          { who: 'amara', line: 'We need to turn. But how does a robot turn?' },
        ],
        seconds: 25,
      },
      {
        setting: 'Close-up under the robot, X-ray view.',
        action: 'Left wheel spins backwards, right wheel spins forwards: the robot spins on the spot like a dancer. Then the other way.',
        lines: [
          { who: 'lucia', line: 'Watch the wheels. One goes forward. One goes back.' },
          { who: 'lucia', line: 'The robot spins right on the spot!' },
          { who: 'spark', line: 'Like when you push one side of a roundabout and pull the other!' },
        ],
        seconds: 40,
      },
      {
        setting: 'The square. The robot faces the camera; Amara stands behind it.',
        action: 'Amara holds up her right hand. The robot turns — to ITS right, which looks like left to us. Bolt tilts his head.',
        lines: [
          { who: 'amara', line: 'Turn right! Wait… it went the other way?' },
          { who: 'lucia', line: 'It turned to ITS right. Pretend you are sitting inside the robot.' },
          { who: 'spark', line: 'Stand up and turn like your robot. Turn right! Now turn left!', direction: 'Pause for children to stand and turn.' },
        ],
        seconds: 45,
      },
      {
        setting: 'The square, seen from above. Squares drawn on the stones; the fountain in the middle.',
        action: 'The robot goes up, turns right, goes along the top. A sparkle near the fountain wall: the light! It jumps up — and lands IN the fountain bowl.',
        lines: [
          { who: 'myrobot', line: 'Turning right!' },
          { who: 'spark', line: 'There it is! Oh no, it jumped into the fountain!' },
        ],
        seconds: 35,
      },
      {
        setting: 'The fountain. Townspeople gather, looking sad: the festival decorations are not ready.',
        action: 'The light glows at the bottom of the fountain bowl, out of reach. Nana Lucía has an idea and smiles.',
        lines: [
          { who: 'lucia', line: 'Everyone looks sad. A happy dance might shake the fountain — and cheer up the town.' },
          { who: 'amara', line: 'A robot dance! Can our robot dance?' },
        ],
        seconds: 25,
      },
    ], 'The third light is stuck in the fountain. Nana has an idea: a robot dance! But what kind of dance will YOUR robot do?', 'Your robot got a face. The second light was in the bread baskets. The next light was near the fountain…'),
    build: {
      part: { slot: 'drive', id: 'wheels2' },
      action: 'inspect',
      narration: 'Look under your robot. When it turns, one wheel goes forward and one goes back.',
      why: 'Two wheels that can each go forward or back let the robot turn on the spot — no steering wheel needed.',
      tryWithout: 'If both wheels could only go the same way, the robot could only go straight, like a train.',
      physicsEffect: 'Turn blocks spin the wheels opposite ways (differential drive). The built-in gyro measures the turn so it stops at a quarter turn.',
      realWorld: 'Robot vacuums and wheelchairs turn on the spot the same way.',
    },
    code: {
      title: 'Round the Corner',
      mission: 'Drive up to the top of the square, turn right, and drive to the fruit stall.',
      arena: arena({
        id: 'l1-square-a', name: 'Town square (corner)',
        description: 'A 3×3 square of stones. The fountain fills the middle square. The fruit stall is in the top-right corner.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'mat',
        start: { col: 0, row: 2, heading: 'up' },
        goal: 'Stop at the fruit stall, tile (2,0).',
        features: ['Fountain on tile (1,1) (solid)', 'Fruit stall at tile (2,0)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: MOVE_SET,
      exampleSolution: ['drive_for(80, 2)', 'turn_degrees(-90, 40)', 'drive_for(80, 2)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (2,0).' },
        { kind: 'no-collision', detail: 'Robot does not touch the fountain.' },
      ],
      stars: { two: 'You turned the right way the first time.', three: 'You stood up and turned like your robot before choosing the turn.' },
      hints: [
        'Drive to the top first. Then which way is the stall — your robot’s left or right?',
        'Pretend you sit inside the robot looking up. The stall is on your right.',
        'Hop 2, Turn right, Hop 2.',
      ],
    },
    challenge: {
      title: 'Over the Top',
      mission: 'Go all the way around the top of the fountain to the bench in the bottom-left corner.',
      arena: arena({
        id: 'l1-square-b', name: 'Town square (bench)',
        description: 'The same square. Now you start in the bottom-right corner and the bench is in the bottom-left. A flower bed blocks the bottom row in the middle.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'mat',
        start: { col: 2, row: 2, heading: 'up' },
        goal: 'Stop at the bench, tile (0,2).',
        features: ['Fountain on tile (1,1)', 'Flower bed on tile (1,2) (no shortcut)', 'Bench at tile (0,2)'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: MOVE_SET,
      exampleSolution: ['drive_for(80, 2)', 'turn_degrees(90, 40)', 'drive_for(80, 2)', 'turn_degrees(90, 40)', 'drive_for(80, 2)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,2).' },
        { kind: 'no-collision', detail: 'Robot touches neither the fountain nor the flower bed.' },
      ],
      stars: { two: 'You made both turns the right way.', three: 'You planned the path with your finger on the screen before building it.' },
      hints: [
        'Trace the path with your finger: up, along the top, then down.',
        'At the top corner your robot faces up and must go left. At the next corner it faces left and must go down — that is another left!',
        'Hop 2, Turn left, Hop 2, Turn left, Hop 2.',
      ],
    },
    quiz: [
      {
        prompt: 'How does your robot turn on the spot?',
        options: [{ text: 'One wheel forward, one wheel back', icon: '🔄' }, mis('It drives forward round a big circle', '⭕', 'turn-moves-forward')],
        answer: 0,
        why: 'When the wheels go opposite ways, the robot spins on the spot.',
      },
      {
        prompt: 'Look at the picture: you are standing behind the robot, looking the same way it looks. It turns right. Which way does it go?',
        options: [mis('To my left', '👈', 'left-right-mirror'), { text: 'To my right', icon: '👉' }],
        answer: 1,
        why: 'When you look the same way as the robot, its right is your right. Pretend you are inside the robot!',
      },
      {
        prompt: 'Turn right, then turn right again. Which way is the robot facing now?',
        options: [{ text: 'Backwards — the other way', icon: '↩️' }, mis('The same way', '⬆️', 'turns-dont-add-up')],
        answer: 0,
        why: 'Two quarter turns make a half turn. The robot now faces back the way it came.',
      },
    ],
    badge: { id: 'l1-turner', name: 'Turner', icon: '🔄', earnedFor: 'You can turn your robot left and right from its own point of view.' },
    reward: { note: 'The square is open. The third light is waiting in the fountain.' },
    teacher: teacher({
      timing: lessonTiming('Robot says turn'),
      unpluggedWarmup: {
        title: 'Robot says turn', minutes: 4,
        steps: [
          'Put a sticker on every child’s right hand. Call "Turn right!", "Turn left!", "Forward 2!" — everyone moves.',
          'Then a child faces the class and the class calls "Turn right!" — notice their right is the class’s left.',
        ],
        materials: ['Stickers or a ribbon for the right wrist'],
      },
      discussion: [
        'Why did Amara think the robot turned the wrong way?',
        'How do people in a car know which way to turn? (they sit inside, facing forward)',
      ],
      misconceptions: [
        { idea: 'Left and right are the same for everyone.', correction: 'Left and right depend on which way you face. A robot turns to its own left and right.' },
        { idea: 'A turn also moves the robot forward.', correction: 'A turn spins on the spot. You still need a hop to move after turning.' },
      ],
      differentiation: {
        faster: ['Find a second path to the bench and compare which is shorter.', 'Predict the facing direction after three right turns.', 'Mirror puzzle: the robot faces YOU and turns to ITS right. Which way does it go for you? (To your left — stand back-to-front with a partner to check.)'],
        slower: ['Rotate the tablet so the robot faces "up" from the child’s view.', 'Keep the right-hand sticker on during the code task.'],
      },
      notes: ['Left/right is genuinely hard at 5–7 (still developing). Accept body turning and pointing; do not drill.'],
    }),
    parent: {
      today: 'Your child learned to turn their robot left and right — from the robot’s own point of view — and to plan a path around a corner.',
      tryAtHome: 'Guide your child around the kitchen blindfolded (or eyes closed) with only "forward", "turn left", "turn right". Then swap.',
      askYourChild: 'If a robot faces you and turns right, which way does it go for you?',
    },
  },

  // ── 6 · PROJECT ──────────────────────────────────────────────────────────
  {
    id: 'L1-S06', level: 1, number: 6, kind: 'project', durationMin: 40,
    title: 'Make It Yours: My Robot’s Dance',
    objective: 'Design your robot’s look and name, and plan, build and share a dance of at least five steps.',
    objectives: [
      obj('L1-S06-O1', 'Plans a sequence on paper using pictures, then builds and tests it.', 'I can plan my program first, then build it.', ['design-process', 'sequences'], ['algorithms', 'engineering-design']),
      obj('L1-S06-O2', 'Shares a creation and describes one change made while testing.', 'I can show my dance and tell what I changed.', ['design-process', 'debugging'], ['communication', 'debugging']),
    ],
    concepts: ['design-process', 'sequences', 'debugging'],
    newBlocks: [],
    episode: episode('The Dance That Shook the Fountain', [
      {
        setting: 'The town square at noon. A small crowd. The light glows in the fountain bowl.',
        action: 'Nana Lucía hands the child a sketch pad. Spark draws a robot with arrows around it.',
        lines: [
          { who: 'lucia', line: 'Every great machine starts as a drawing. First plan, then build.' },
          { who: 'spark', line: 'Your robot needs a name, colours… and a dance!' },
        ],
        seconds: 30,
      },
      {
        setting: 'Amara’s sketch: arrows, turn signs and music notes.',
        action: 'Amara shows her plan: forward, spin, beep, back. She tests it with Spark — Spark bumps the bench, they laugh, and she changes one arrow.',
        lines: [
          { who: 'amara', line: 'My first plan bumped the bench. So I changed one step.' },
          { who: 'lucia', line: 'That is what engineers do. Try. Look. Fix. Try again.' },
        ],
        seconds: 40,
      },
      {
        setting: 'The square, the robot centre stage.',
        action: 'Montage of possible dances: spins, hops, beeps, songs. The crowd claps. The fountain water wobbles with the rhythm.',
        lines: [
          { who: 'spark', line: 'Now it’s your turn. Make your robot’s dance!' },
        ],
        seconds: 20,
      },
      {
        setting: 'The square after the dance (this scene plays after the child shares).',
        action: 'The water splashes; the light pops out of the fountain and lands on the robot. Counter: 3 of 12. The crowd cheers. A grey cloud drifts over the map pinned to the town notice board.',
        lines: [
          { who: 'guest', guestName: 'Ms Mei, the fruit seller', line: 'Bravo, little robot!' },
          { who: 'spark', line: 'Three lights! And look — Nana’s old town map! It shows every street.' },
          { who: 'bolt', line: 'Beep-woof!', direction: 'Grabs the map and runs off, playing.' },
          { who: 'amara', line: 'Bolt! Come back with that map!' },
        ],
        seconds: 40,
      },
    ], 'Three lights found! But Bolt has run off with Nana’s map of the whole town…', 'Your robot learned to turn. The third light jumped into the fountain…'),
    build: {
      part: { slot: 'body', id: 'box' },
      action: 'choose',
      narration: 'Make it yours! Pick your robot’s colours, its face, and its name.',
      why: 'Designers choose colours and faces so people like and understand a robot. Your robot, your choice.',
      tryWithout: 'There is no wrong choice today — every robot can dance.',
      physicsEffect: 'Colour and name only; no change to mass or motion.',
      realWorld: 'Real robot makers test many looks with people before choosing one.',
    },
    code: {
      title: 'Plan the Dance',
      mission: 'Draw your dance on the planning sheet with arrows. Then build the first three steps and test them.',
      arena: arena({
        id: 'l1-square-stage', name: 'Square stage',
        description: 'The open middle of the square, with a 3×3 dance floor and the crowd around it.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'mat',
        start: { col: 1, row: 1, heading: 'up' },
        goal: 'Stay on the dance floor.',
        features: ['Dance floor edges glow red if the robot is about to leave'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK, LEFT, RIGHT, WAIT, BEEP, say('Hello, Lantern Hill!', 'Let’s dance!', 'Ta-da!')],
      exampleSolution: ['say("Let’s dance!")', 'turn_degrees(90, 40)', 'turn_degrees(90, 40)'],
      success: [{ kind: 'within-blocks', detail: 'At least three blocks run; the robot stays inside the 3×3 floor.' }],
      stars: { two: 'Your program matches your drawing.', three: 'You found something that did not match your plan, and fixed it.' },
      hints: [
        'Look at your drawing. What is the first arrow?',
        'Each arrow is one block. A spin arrow is a Turn block.',
        'Build the first three arrows, then press Go and watch.',
      ],
    },
    challenge: {
      title: 'Show Time!',
      mission: 'Finish your dance — at least five steps — and show it to the crowd. Can it end where it started?',
      arena: arena({
        id: 'l1-square-stage', name: 'Square stage',
        description: 'The crowd is waiting. The fountain wobbles when they clap.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'mat',
        start: { col: 1, row: 1, heading: 'up' },
        goal: 'A dance of 5 or more steps that stays on the floor. Bonus: end on the start square.',
        features: ['Crowd claps along with beeps', 'Start square marked with a star'],
        physics: FLAT_MAT_PHYSICS, requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK, LEFT, RIGHT, WAIT, BEEP, say('Hello, Lantern Hill!', 'Let’s dance!', 'Ta-da!')],
      exampleSolution: ['say("Let’s dance!")', 'drive_for(80, 1)', 'beep', 'turn_degrees(90, 40)', 'turn_degrees(90, 40)', 'drive_for(80, 1)', 'turn_degrees(90, 40)', 'turn_degrees(90, 40)', 'say("Ta-da!")'],
      success: [
        { kind: 'within-blocks', detail: 'At least 5 blocks run.' },
        { kind: 'no-collision', detail: 'Robot never leaves the 3×3 dance floor.' },
      ],
      stars: { two: 'Your dance ends back on the star square, facing up.', three: 'You told the class one thing you changed after testing.' },
      hints: [
        'Mix moving, turning and sounds. Any order is fine — it’s your dance!',
        'To come back to the start, undo your moves: a hop forward needs a hop back.',
        'Two turns left and two turns left again bring the robot back to facing up.',
      ],
    },
    project: L1_PROJECTS[0],
    quiz: [
      {
        prompt: 'What do engineers do first?',
        options: [mis('Press Go and hope', '🤞', 'skip-the-plan'), { text: 'Plan and draw', icon: '✏️' }],
        answer: 1,
        why: 'Planning first helps you build the right thing. Then you test it.',
      },
      {
        prompt: 'Your dance bumped the edge. What do you do?',
        options: [{ text: 'Change a step and try again', icon: '🔧' }, mis('Throw the plan away — it was a bad plan', '🗑️', 'changed-plan-was-bad')],
        answer: 0,
        why: 'Try, look, fix, try again. Every engineer does this — mistakes help us learn.',
      },
      {
        prompt: 'Hop forward, then hop back. Where is the robot?',
        options: [mis('Two squares away', '➡️', 'back-adds-distance'), { text: 'Back where it started', icon: '⭐' }],
        answer: 1,
        why: 'Going back undoes going forward, so the robot ends where it began.',
      },
    ],
    badge: { id: 'l1-owner', name: 'Robot Designer I', icon: '🎨', earnedFor: 'You designed your robot and planned, tested and shared your own dance.' },
    reward: { note: 'Light 3 of 12 found! New colours unlocked for your robot.' },
    teacher: teacher({
      timing: projectTiming(),
      unpluggedWarmup: {
        title: 'Mirror dance', minutes: 3,
        steps: ['Pairs face each other. One makes three slow moves; the other copies. Swap. (Use during the first minutes of IMAGINE.)'],
        materials: ['Planning sheet per pair: a 3×3 grid with arrow and note stickers'],
      },
      discussion: [
        'What did you change after testing, and why?',
        'What is one thing you liked about your friend’s dance? (star) What is one idea for it? (wish)',
      ],
      misconceptions: [
        { idea: 'A plan that needs changing was a bad plan.', correction: 'Every plan changes when you test it. That is the point of testing.' },
      ],
      differentiation: {
        faster: ['Make the dance end on the star square facing up.', 'Make a dance with a repeating part (preview of loops).'],
        slower: ['Five steps can include sounds — a beep counts.', 'Use the arrow stickers to build the plan, then copy it block by block with an adult.'],
      },
      notes: ['Share circle: every child shows; no "best dance" vote. Use "a star and a wish" for feedback.'],
    }),
    parent: {
      today: 'Your child designed their robot’s look and name, and planned, tested, fixed and shared their own robot dance.',
      tryAtHome: 'Ask your child to "program" a family dance with arrows on paper, then everyone performs it. Change one step and do it again.',
      askYourChild: 'What did you change in your dance after you tested it?',
    },
  },
]
