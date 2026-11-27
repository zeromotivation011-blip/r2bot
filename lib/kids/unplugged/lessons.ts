// lib/kids/unplugged/lessons.ts
//
// The hand-written half of the unplugged Level 1 lessons (roadmap #85): for
// each of the 24 Level 1 sessions, the no-device main activity, the story told
// without a screen, the floor-grid mission, the sorting cards and the gear
// demo. Everything else (objective, "I can" lines, warm-up, discussion
// questions, the three check questions, the note for families) is read from
// the curriculum by ./index.ts, so the unplugged lesson and the on-screen
// session can never teach different things.
//
// Every mission's answer key is played on its map by ./verify.ts.

import type { CardId } from './cards'
import type { FloorMission, Step } from './grid'

export type KitId = 'command-cards' | 'floor-grid' | 'sorting' | 'paper-gears' | 'experiment'

export interface SortItem {
  text: string
  icon: string
  answer: 'sense' | 'think' | 'act'
}

export interface UnpluggedCore {
  number: number
  /** The big idea, one line, for the teacher. */
  idea: string
  /** The episode told aloud in two or three sentences (no screen needed). */
  storyHook: string
  main: { title: string; minutes: number; steps: string[] }
  kits: KitId[]
  mission?: FloorMission
  sorting?: { prompt: string; items: SortItem[] }
  gears?: { title: string; steps: string[] }
  /** Extra things to gather, beyond the printables and the warm-up's own list. */
  materials: string[]
}

// ── Shorthand for answer keys ────────────────────────────────────────────────
const c = (card: CardId, extra: Omit<Step, 'card'> = {}): Step => ({ card, ...extra })
const F = c('forward')
const B = c('back')
const L = c('left')
const R = c('right')
const CR = c('creep')
const times = (n: number, s: Step): Step[] => Array.from({ length: n }, () => s)
const say = (text: string) => c('say', { text })
const wait = (n: number) => c('wait', { n })
const repeat = (n: number, body: Step[]) => c('repeat', { n, body })

const MOVE: CardId[] = ['forward', 'back', 'left', 'right']

export const UNPLUGGED_CORES: UnpluggedCore[] = [
  {
    number: 1,
    idea: 'A robot is a machine that senses, thinks and acts — and it follows instructions in order.',
    storyHook:
      'Spark the robot wakes up in Lantern Hill on the morning of the light festival. Before it can help anyone, it has to learn what a robot is: it notices things, it decides, and it moves or makes a sound. Today our class teaches Spark its very first song.',
    main: {
      title: 'Sense, think or act? Sorting cards, then a wake-up song',
      minutes: 18,
      steps: [
        'Groups of four get one set of sorting cards and the three header cards SENSE (ear), THINK (head), ACT (hand). Read each picture aloud for non-readers.',
        'Groups place every card under a header. Walk round and ask “How do you know?” — never “wrong”.',
        'Come back together and check each card with the body actions from the warm-up: hand to ear, finger to head, jump.',
        'Hand out Beep, Wait and Say command cards. The class builds the song on the floor: Beep, Wait, Beep, Say “Good morning!”.',
        'One child is the robot and performs the cards exactly. Swap the order of two cards and perform again: same cards, different song. Order matters.',
      ],
    },
    kits: ['sorting', 'command-cards'],
    sorting: {
      prompt: 'Which part of a robot senses, which part thinks, and which part acts?',
      items: [
        { text: 'Camera eye', icon: '📷', answer: 'sense' },
        { text: 'Bumper that feels a touch', icon: '🛡️', answer: 'sense' },
        { text: 'Microphone ear', icon: '🎤', answer: 'sense' },
        { text: 'Computer brain', icon: '🧠', answer: 'think' },
        { text: 'A list of steps (a program)', icon: '📜', answer: 'think' },
        { text: 'Wheels', icon: '🛞', answer: 'act' },
        { text: 'Speaker', icon: '🔊', answer: 'act' },
        { text: 'Gripper claw', icon: '🦾', answer: 'act' },
        { text: 'Light', icon: '💡', answer: 'act' },
      ],
    },
    materials: ['Scissors to cut the sorting cards (or cut them before class)'],
  },
  {
    number: 2,
    idea: 'Motors turn wheels; the robot moves one equal step at a time.',
    storyHook:
      'Spark has a body but no way to move. Amara snaps on two wheels, and a motor inside turns them. The first light of the festival is waiting at the end of the garden path, and Spark must stop right on it without knocking the flowerpot.',
    main: {
      title: 'Human robot: the garden path',
      minutes: 14,
      steps: [
        'Lay the floor grid (tape, chalk, or sheets of paper as squares). Put a paper light on the goal square and a cup “flowerpot” on the blocked square.',
        'One child is the robot, standing on the start square facing up the map. They may only take one-square steps.',
        'The class lays Hop forward cards in a line. Count the squares together before anyone moves.',
        'Run it: the class reads each card, the robot does exactly that. Did it stop on the light?',
        'Try the paper gears (below) at the end: the motor turns a small gear, the small gear turns the wheel.',
      ],
    },
    kits: ['floor-grid', 'command-cards', 'paper-gears'],
    mission: {
      title: 'The first light',
      ask: 'Drive down the garden path and stop right on the light. Do not knock the flowerpot.',
      rows: ['.G.', '...', '#..', '...', '.S.'],
      heading: 'up',
      deck: ['forward', 'back'],
      solution: times(4, F),
    },
    gears: {
      title: 'How a motor turns a wheel',
      steps: [
        'Push a pencil through the centre of the small gear (the motor) and the big gear (the wheel), on a piece of cardboard, with the teeth touching.',
        'Turn the small gear once. How far did the big gear turn? (Less than once.)',
        'Ask: which way does the big gear turn when the small one goes clockwise? (The other way.)',
      ],
    },
    materials: ['Masking tape or chalk for the grid (or 15 sheets of paper)', 'A paper cup', 'Card, a pencil and scissors for the paper gears'],
  },
  {
    number: 3,
    idea: 'Wait pauses a program; changing the order of steps changes what happens.',
    storyHook:
      'The bakery needs its morning bell, but a cart rattles across the lane outside. If Spark rolls straight on, it will be in the cart’s way. Spark has to stop, wait for the cart to pass, then go on and ring the bell.',
    main: {
      title: 'Human robot: morning delivery with a cart',
      minutes: 15,
      steps: [
        'Lay the grid. Two children are the “cart” and walk slowly along the cart lane, back and forth, while the teacher counts.',
        'The class plans the robot’s cards: hop, wait for the cart, hop on to the bakery door, beep, say “Good morning!”.',
        'Run it. If the robot reaches the lane while the cart is there, freeze the game and ask: which card do we need, and where?',
        'Move the Wait card to a different place and run again. Ask: same cards, same result?',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'Morning delivery',
      ask: 'Get past the cart to the bakery door, ring the bell with a beep, and say good morning.',
      rows: ['.G.', '...', 'PPP', '...', '.S.'],
      heading: 'up',
      deck: ['forward', 'wait', 'beep', 'say'],
      solution: [F, wait(3), ...times(3, F), c('beep'), say('Good morning!')],
      mustUse: ['wait', 'beep', 'say'],
    },
    materials: ['Masking tape or chalk for the grid'],
  },
  {
    number: 4,
    idea: 'A robot that tells people what it will do helps them feel safe.',
    storyHook:
      'The market is crowded, and people jump when a robot suddenly rolls towards them. Spark gets a face screen so it can say what it is about to do. Today Spark must say “Excuse me!” before it drives to the bread baskets.',
    main: {
      title: 'Human robot: say it, then do it',
      minutes: 15,
      steps: [
        'Lay the grid. Two children stand on the “people” squares as shoppers.',
        'Round 1: the robot does the cards without speaking. Ask the shoppers how it felt.',
        'Round 2: add Say cards: “Excuse me!” at the start and “Found a light!” at the end. Ask again.',
        'Talk: where have you seen machines that warn people? (A reversing lorry’s beep, a lift that says “doors closing”.)',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The bread basket light',
      ask: 'Say “Excuse me!”, drive to the bread baskets, beep, and say you found the light.',
      rows: ['G.P', '..P', '...', 'S..'],
      heading: 'up',
      deck: ['forward', 'back', 'beep', 'say'],
      solution: [say('Excuse me!'), ...times(3, F), c('beep'), say('Found a light!')],
      mustUse: ['say', 'beep'],
    },
    materials: ['Masking tape or chalk for the grid'],
  },
  {
    number: 5,
    idea: 'A robot turns on the spot; its left and right are its own, not ours.',
    storyHook:
      'A fountain stands in the middle of the square, and the next light is on the bench on the far side. Spark cannot drive through water. It has to go round the fountain, turning at each corner.',
    main: {
      title: 'Human robot: round the fountain',
      minutes: 15,
      steps: [
        'Lay a 3 × 3 grid with a bucket or chair as the fountain in the middle square.',
        'Give out Hop forward, Turn left and Turn right cards. Stickers on right hands help.',
        'The class plans the route aloud first: “up two, turn, along two, turn, down two”. Which way is each turn for the robot?',
        'Run it. When the robot faces the class, check: is the robot’s left the same as our left? (No — it is our right.)',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'Over the top',
      ask: 'Go all the way round the top of the fountain to the bench in the bottom-left corner.',
      rows: ['...', '.#.', 'G.S'],
      heading: 'up',
      deck: MOVE,
      solution: [F, F, L, F, F, L, F, F],
    },
    materials: ['Masking tape or chalk', 'A bucket or chair for the fountain', 'Small stickers for right hands'],
  },
  {
    number: 6,
    idea: 'Engineers plan, build, test and improve — and a dance is a program.',
    storyHook:
      'Lantern Hill is having a festival dance, and every robot gets a turn on stage. Spark wants its dance to be really its own. First we plan it on paper, then we try it, then we make it better.',
    main: {
      title: 'Plan and perform a five-step robot dance',
      minutes: 20,
      steps: [
        'Pairs get a full set of move and sound cards and a strip of paper to lay them on.',
        'Plan: lay out at least five cards. Can the dance end where it started, facing the same way?',
        'Test: one partner is the robot and performs the cards on a 3 × 3 square of floor. The other watches the cards, not the robot.',
        'Improve: change one card, test again. Ask: what did you change, and why?',
        'Share: three pairs perform for the class, who clap the beat.',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'Show time!',
      ask: 'Plan a dance of at least five steps. Can it end where it started?',
      rows: ['...', '.S.', '...'],
      heading: 'up',
      deck: ['forward', 'back', 'left', 'right', 'wait', 'beep', 'say'],
      solution: [say('Let’s dance!'), F, c('beep'), R, R, F, R, R, say('Ta-da!')],
      endAtStart: true,
      mustUse: ['say'],
    },
    materials: ['A strip of paper per pair to lay the cards on'],
  },
  {
    number: 7,
    idea: 'An algorithm is a plan of steps in order, made before you start.',
    storyHook:
      'Ms Mei, the teacher at the Lantern Hill school, has moved her table to the back of the room, and the light is on it. The straight way is blocked. The class must plan the whole route first, then send Spark.',
    main: {
      title: 'Program your teacher: the back way',
      minutes: 15,
      steps: [
        'Lay a 4 × 4 grid with two chairs as the blocked squares and a teddy on the goal.',
        'You are the robot. The class lays the arrow cards on the board or floor; you follow them exactly — even wrong ones.',
        'Before running, count the corners: one turn card per corner.',
        'Pairs then plan the same route on the paper grid with a pencil, drawing an arrow for each card.',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The back way',
      ask: 'The table moved to the back. Plan a path with two turns, then drive there.',
      rows: ['G...', '.##.', '....', '..S.'],
      heading: 'up',
      deck: MOVE,
      solution: [L, F, F, R, F, F, F],
    },
    materials: ['A teddy or soft toy', 'Two chairs'],
  },
  {
    number: 8,
    idea: 'A bug is a mistake in the steps; we find it by watching where the robot goes wrong.',
    storyHook:
      'Spark wrote a program to reach the flower stall, but on the way it crashes into the buckets. The program is nearly right: just one card is wrong. Our class are the debuggers.',
    main: {
      title: 'Find the bug',
      minutes: 15,
      steps: [
        'Lay the grid and put buckets (or bags) on the blocked square. Lay out the BUGGY program from the answer sheet.',
        'Run it with a human robot. Shout “Bug!” at the moment it goes wrong — and freeze.',
        'Ask: which card was the robot doing when it went wrong? Fix only that card.',
        'Run it again from the start. Debuggers test after every fix.',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The marigold light',
      ask: 'Spark’s program to the flower stall has a bug: the robot bumps the buckets. Find it and fix it.',
      rows: ['...#.', 'G....', '.....', '...S.'],
      heading: 'up',
      deck: [...MOVE, 'say'],
      buggy: [F, F, F, L, F, F, F, say('Found a light!')],
      solution: [F, F, L, F, F, F, say('Found a light!')],
    },
    materials: ['Two bags or buckets'],
  },
  {
    number: 9,
    idea: 'Pen down leaves a trail of the path; pen up moves without drawing.',
    storyHook:
      'The children of Lantern Hill keep getting lost on the way to school. Spark gets a drawing pen so it can draw the path for them. It must lift the pen at the gate, or it will scribble on the school wall.',
    main: {
      title: 'Draw the way to school',
      minutes: 15,
      steps: [
        'On the floor grid, the robot’s partner holds a stack of paper strips. While the pen is down, they lay a strip on every square the robot steps on.',
        'Run the class’s cards. Does the trail match the dotted path on the map?',
        'At desks: pairs do the same on the paper grid with a crayon — one says the cards, one draws.',
        'Then play one move with the pen up. What is drawn? (Nothing.)',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The way to school',
      ask: 'Draw the path to the school gate: up, then turn right, then along. Lift the pen at the gate.',
      rows: ['++G', '+..', 'S..'],
      heading: 'up',
      deck: [...MOVE, 'pen-down', 'pen-up'],
      solution: [c('pen-down'), F, F, R, F, F, c('pen-up')],
      mustUse: ['pen-down', 'pen-up'],
    },
    materials: ['Strips of scrap paper (about 10)', 'Crayons'],
  },
  {
    number: 10,
    idea: 'Repeat does the same steps again and again, with fewer cards.',
    storyHook:
      'The festival needs a big square for the games. Spark could write “forward, forward, turn” over and over — but that is a lot of cards. Nana Lucía shows Spark a card that says: do it again.',
    main: {
      title: 'A square in four cards',
      minutes: 16,
      steps: [
        'First, without Repeat: the class lays out every card for the square. Count them (13).',
        'Show the Repeat card. Lay a loop of string (or draw a big bracket) and put “Hop forward, Hop forward, Turn right” inside it, with the number 4.',
        'Count again: Pen down, Repeat, and three cards inside — 5 cards instead of 13. (On screen the Hop block carries its own number, so the same program is 4 blocks.)',
        'Run it with a human robot and the paper-strip trail. Then draw it on the paper grid.',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The big game square',
      ask: 'Draw a big square with sides of 2 squares, using Repeat. Use 5 cards or fewer.',
      rows: ['+++', '+.+', 'S++'],
      heading: 'up',
      deck: ['forward', 'left', 'right', 'pen-down', 'pen-up', 'repeat'],
      solution: [c('pen-down'), repeat(4, [F, F, R])],
      endAtStart: true,
      mustUse: ['repeat'],
      maxCards: 5,
    },
    materials: ['A long piece of string or wool for the loop', 'Strips of scrap paper'],
  },
  {
    number: 11,
    idea: 'Find the part that repeats; a loop draws the whole pattern.',
    storyHook:
      'The library has a tall staircase, and the next light is at the very top. Spark wants to draw the stairs for the festival map. Look closely: every step is the same.',
    main: {
      title: 'Spot the pattern, draw the staircase',
      minutes: 15,
      steps: [
        'Show the staircase on the paper grid. Ask: what is the part that repeats? (Up one, along one.)',
        'Pairs write that part as cards: Hop forward, Turn right, Hop forward, Turn left. Put it inside Repeat 4.',
        'Run it on the floor grid with the paper-strip trail.',
        'Challenge: 6 cards or fewer, counting the Repeat and Pen down.',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The tall staircase',
      ask: 'The library stairs have four steps. Draw them all with 6 cards or fewer.',
      rows: ['...+G', '..++.', '.++..', '++...', 'S....'],
      heading: 'up',
      deck: ['forward', 'left', 'right', 'pen-down', 'pen-up', 'repeat'],
      solution: [c('pen-down'), repeat(4, [F, R, F, L])],
      mustUse: ['repeat'],
      maxCards: 6,
    },
    materials: ['Pictures of repeating patterns from several cultures (a rangoli, a kente strip, mosaic tiles)', 'Strips of scrap paper'],
  },
  {
    number: 12,
    idea: 'Design your own picture with at least one loop, then share it.',
    storyHook:
      'The festival banner is blank, and every robot may add a picture. Spark asks the class for ideas. The only rule: each picture must use at least one Repeat.',
    main: {
      title: 'Banner pictures on squared paper',
      minutes: 22,
      steps: [
        'Ask: pairs choose a picture that has a repeating part (a flower of squares, a zig-zag, a row of windows).',
        'Imagine and plan: draw it on the paper grid, then write the cards beside it. Circle the part that repeats and put it in a Repeat.',
        'Test: one partner reads the cards, the other draws on a fresh grid without looking at the plan. Do the two drawings match?',
        'Improve and share: fix one thing, then pin the pictures up as the class banner.',
      ],
    },
    kits: ['command-cards'],
    materials: ['Two paper grids per pair', 'Crayons', 'Sticky notes for “a star and a wish”'],
  },
  {
    number: 13,
    idea: 'Choose the right tool for the job: a scoop picks up, carries and tips out.',
    storyHook:
      'At the harbour, a float has come loose and bobs by the dock. Spark swaps its pen for a scoop. It must drive to the float, scoop it up, carry it to the boat and tip it out.',
    main: {
      title: 'Human robot: scoop, carry, tip',
      minutes: 15,
      steps: [
        'Lay the grid. Put a ball (the float) on the L square and a box (the boat) on the goal.',
        'The robot holds a big spoon or a cup as the scoop. It may only pick up with a Scoop up card and put down with a Tip out card.',
        'Plan the cards as a class, then run it.',
        'Ask: what would go wrong with the pen instead of the scoop? Which tool for a drink? For a drawing?',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'Float to the boat',
      ask: 'Bring the float to the boat at the bottom of the dock.',
      rows: ['L..', '..#', 'G..', '.S.'],
      heading: 'up',
      deck: [...MOVE, 'scoop', 'tip', 'say'],
      solution: [F, F, F, L, F, c('scoop'), L, F, F, c('tip')],
      deliver: true,
    },
    materials: ['A soft ball', 'A box or basket', 'A big spoon or a cup'],
  },
  {
    number: 14,
    idea: 'The same push goes less far uphill with a heavy load; we find out by testing.',
    storyHook:
      'The lighthouse lantern is made of iron and very heavy, and the path to the lighthouse is a steep ramp. Spark’s usual hops are not enough. Engineers do not guess: they test, look, and fix.',
    main: {
      title: 'A fair test on a ramp',
      minutes: 18,
      steps: [
        'Make a ramp with a board on a pile of books. Mark the start line with tape.',
        'Groups push a toy car with the same flick each time: empty on the flat, empty up the ramp, loaded with coins up the ramp. Measure how far with hand spans.',
        'Record on the board in a simple table. Which went least far? Why?',
        'Then the paper gears: a small gear driving a big gear turns slower — but stronger. That is how robots climb hills.',
      ],
    },
    kits: ['experiment', 'paper-gears'],
    gears: {
      title: 'Slow and strong: gears for a hill',
      steps: [
        'Pin the small gear (motor) to the big gear (wheel) on cardboard.',
        'Count: turn the small gear four times. How many times does the big one turn? (Fewer.)',
        'Explain: the big wheel turns slower, but each push is stronger. Bikes do this with low gears on hills.',
      ],
    },
    materials: ['A board or tray and a pile of books for the ramp', 'A toy car', 'Coins and tape', 'Card and a pencil for the paper gears'],
  },
  {
    number: 15,
    idea: 'Ice makes a robot slide and sand slows it down; go slowly on ice to stay in control.',
    storyHook:
      'The fish market floor is half ice and half sand. When Spark hops onto the ice it keeps sliding — straight towards the canal. To cross safely, it has to creep on the slippery squares.',
    main: {
      title: 'Human robot: across the ice',
      minutes: 15,
      steps: [
        'Do the slide test from the warm-up first, so children have seen sliding.',
        'Lay the grid with blue paper squares as ice. Rule: if the robot HOPS onto ice, it slides one extra square. If it CREEPS onto ice, it stops.',
        'Run the class’s plan. If the robot slides into the canal, freeze and ask: which card should change?',
        'Ask: where else do machines slow down on purpose? (Cars on icy roads, a bike in sand.)',
      ],
    },
    kits: ['floor-grid', 'command-cards', 'experiment'],
    mission: {
      title: 'Across the fish market',
      ask: 'Cross the ice to the bridge without sliding into the canal. Creep on the ice!',
      rows: ['#...', '~~G.', '....', 'S...'],
      heading: 'up',
      deck: ['forward', 'creep', 'back', 'left', 'right'],
      solution: [F, CR, R, CR, F],
      buggy: [F, F, R, F, F],
    },
    materials: ['Blue paper for the ice squares', 'A tray, a few drops of water and a towel for the slide test'],
  },
  {
    number: 16,
    idea: 'Our robot cannot see the bridge: we plan the waits by watching and counting first.',
    storyHook:
      'Lantern Hill’s canal has lift bridges that go up for boats and down for people. Spark has no eyes for bridges yet. It must wait just long enough — so the class watches the bridges and counts first.',
    main: {
      title: 'Two bridges: watch, count, plan',
      minutes: 15,
      steps: [
        'Two pairs of children are bridge keepers on the W squares. They raise and lower their arms on the counts you give (bridge 1: 3 counts up; bridge 2: 5 counts up).',
        'The class watches and counts before planning. Then they put Wait cards with the right numbers into the robot’s program.',
        'Run it. If a bridge is up when the robot arrives, freeze: which Wait was too short?',
        'Ask: could the robot do this without counting? What would it need? (A sensor — coming soon.)',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'Two bridges',
      ask: 'Cross the first bridge, turn the corner and cross the second, slower bridge. Wait for both!',
      rows: ['G.W.', '....', '...W', '....', '...S'],
      heading: 'up',
      deck: ['forward', 'wait', 'left', 'right', 'say'],
      solution: [F, wait(3), F, F, F, L, wait(5), F, F, F, say('Found a light!')],
      mustUse: ['wait', 'say'],
    },
    materials: ['Masking tape or chalk'],
  },
  {
    number: 17,
    idea: 'A camera needs light to see; switch the light on in the dark and off again to save energy.',
    storyHook:
      'The tunnel under the old town is completely dark, and Spark’s camera sees nothing in the dark — just like our eyes. Spark swaps in a headlight. It must switch it on in the tunnel and off again when it comes out, so the battery lasts.',
    main: {
      title: 'Human robot: the winding tunnel',
      minutes: 15,
      steps: [
        'Make the tunnel squares dark with a blanket over two chairs, or mark them with black paper. The robot holds a paper torch.',
        'Rule: the robot may only step on a dark square with its light on. It must finish with the light off.',
        'Plan, run, and check both rules.',
        'Ask: why switch off at the end? (To save the battery.) Where do lights switch on by themselves? (Porch lights, phone screens.)',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The winding tunnel',
      ask: 'Keep the light on in the dark part only, and do not bump the walls.',
      rows: ['#..', 'DDG', 'D..', 'S..'],
      heading: 'up',
      deck: ['forward', 'left', 'right', 'light-on', 'light-off', 'say'],
      solution: [c('light-on'), F, F, R, F, F, c('light-off')],
      mustUse: ['light-on', 'light-off'],
    },
    materials: ['Black paper squares or a blanket over two chairs', 'A paper torch (a cone of yellow paper)'],
  },
  {
    number: 18,
    idea: 'Engineers start with what a person needs, then choose the tool and plan the steps.',
    storyHook:
      'Spark visits Amara’s home. Grandad cannot reach the biscuit tin on the shelf behind the sofa. Spark asks: what does the person need? Then it picks a tool and plans a helper routine.',
    main: {
      title: 'Design a home helper',
      minutes: 22,
      steps: [
        'Pairs share their helper interview pictures and choose one job.',
        'Choose the tool card that fits the job (scoop, pen, light) and say why.',
        'Plan the routine with cards on the floor grid “living room”: a polite Say, the moves, the tool, no bumps.',
        'Test with a human robot, improve one card, and share: “Our helper is for … because …”.',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'My helper at work',
      ask: 'Fetch the tin from behind the sofa and bring it to Grandad’s chair. Be polite and do not bump anything.',
      rows: ['.#..', 'L#..', '....', 'S..G'],
      heading: 'up',
      deck: ['forward', 'back', 'left', 'right', 'wait', 'repeat', 'scoop', 'tip', 'light-on', 'light-off', 'pen-down', 'pen-up', 'beep', 'say'],
      solution: [F, F, c('scoop'), B, B, R, F, F, F, c('tip'), say('Here you are!')],
      deliver: true,
      mustUse: ['say'],
    },
    materials: ['A small tin or box', 'The helper-interview drawings from the warm-up'],
  },
  {
    number: 19,
    idea: 'A bumper is a touch sensor: keep going until you feel a bump.',
    storyHook:
      'The tenth light is in the dark corner by the gate, and nobody knows how far away the walls are. Spark gets a bumper on its front. Now it can creep until it feels a wall — no counting needed.',
    main: {
      title: 'Human robot: feel your way to the corner',
      minutes: 15,
      steps: [
        'The robot holds one hand out as a bumper. Eyes closed only if the child is happy to; otherwise they look at the floor.',
        'Play “Keep going until I feel a bump”: the robot creeps square by square until the hand touches the wall (or a held-up book).',
        'Plan the whole program with the new card. Ask: why does this card work even if we move the wall? (The robot senses instead of counting.)',
        'Sort the sense–think–act cards for a robot vacuum cleaner.',
      ],
    },
    kits: ['floor-grid', 'command-cards', 'sorting'],
    mission: {
      title: 'Feel along to the gate',
      ask: 'Feel your way to the wall, back off a little, turn right, and feel your way to the corner.',
      rows: ['...G', '....', '....', 'S...'],
      heading: 'up',
      deck: ['creep', 'back-off', 'left', 'right', 'until-bump', 'say'],
      solution: [c('until-bump'), c('back-off'), R, c('until-bump'), say('Found it!')],
      mustUse: ['until-bump'],
    },
    sorting: {
      prompt: 'A robot vacuum cleaner is tidying a room. Which moment is sense, which is think, which is act?',
      items: [
        { text: 'Its bumper is pushed by a chair leg', icon: '🪑', answer: 'sense' },
        { text: 'It feels the edge of the stairs', icon: '🪜', answer: 'sense' },
        { text: 'It decides to turn away', icon: '🧠', answer: 'think' },
        { text: 'It chooses where to clean next', icon: '🗺️', answer: 'think' },
        { text: 'Its wheels turn it round', icon: '🛞', answer: 'act' },
        { text: 'Its brush sweeps up crumbs', icon: '🧹', answer: 'act' },
      ],
    },
    materials: ['A big book to hold up as a wall'],
  },
  {
    number: 20,
    idea: '“If” lets a robot choose: if it feels a bump, it backs off and turns.',
    storyHook:
      'Bolt is lost in the middle of the hedge maze, and there is no map. Spark cannot plan every step. Instead it gets one rule: creep forward, and if you feel a bump, back off and turn right.',
    main: {
      title: 'One rule finds Bolt',
      minutes: 16,
      steps: [
        'Build the maze with chairs, bags or tape walls. Put a toy (Bolt) on the goal square.',
        'Write the rule on the board as cards: Repeat lots of times [ Creep forward, If I feel a bump… [ Back off a little, Turn right ] ].',
        'The robot follows the rule, the class reads it aloud each time round. Stop when the robot reaches Bolt.',
        'Ask: the robot did not know the maze. How did it find Bolt? (It sensed and decided each time.) Then sort the cards for other machines that use “if”.',
      ],
    },
    kits: ['floor-grid', 'command-cards', 'sorting'],
    mission: {
      title: 'Find Bolt in the maze',
      ask: 'Bolt is in the middle of the maze. You have no map. Use your one rule to find him.',
      rows: ['.....', '.###.', '.#G..', '.####', 'S....'],
      heading: 'up',
      deck: ['creep', 'back-off', 'left', 'right', 'if-bump', 'repeat-lots'],
      solution: [c('repeat-lots', { n: 40, body: [CR, c('if-bump', { body: [c('back-off'), R] })] })],
      stopAtGoal: true,
      mustUse: ['if-bump'],
    },
    sorting: {
      prompt: 'Each machine follows an “if” rule. Which part senses, which part decides, and which part acts?',
      items: [
        { text: 'The door’s sensor sees someone walking up', icon: '🚪', answer: 'sense' },
        { text: '“If someone is near, open”', icon: '❓', answer: 'think' },
        { text: 'The doors slide open', icon: '↔️', answer: 'act' },
        { text: 'The fridge feels that its door is open', icon: '🧊', answer: 'sense' },
        { text: '“If the door is open too long, beep”', icon: '❓', answer: 'think' },
        { text: 'The fridge beeps', icon: '🔔', answer: 'act' },
      ],
    },
    materials: ['Chairs, bags or tape for maze walls', 'A small toy to be Bolt'],
  },
  {
    number: 21,
    idea: 'Distance Eyes send a sound and listen for the echo, so the robot stops before it touches.',
    storyHook:
      'The eleventh light is on the far side of the bandstand. Bumping into the musicians would be rude! Spark swaps in Distance Eyes: like a bat, it squeaks and listens for the echo, and stops when something is close.',
    main: {
      title: 'Human robot: bat ears',
      minutes: 15,
      steps: [
        'Play the bat game from the warm-up once more on the grid: the robot says “squeak” each step; a partner answers “echo!” fast only when the next square is blocked.',
        'Use the card “Keep going until something is close”. Unlike the bumper, the robot stops BEFORE it touches.',
        'Plan with Repeat 2: go until close, turn left. Run it. Ring the bell at the end (“Ding!”).',
        'Ask: the bumper or Distance Eyes — which would you want on a robot near people? Why?',
      ],
    },
    kits: ['floor-grid', 'command-cards', 'sorting'],
    mission: {
      title: 'Round the bandstand',
      ask: 'Go until something is close, then turn left. Do that two times. Then ring the bell!',
      rows: ['G...', '.##.', '.##.', '...S'],
      heading: 'up',
      deck: ['creep', 'left', 'right', 'until-close', 'repeat', 'say'],
      solution: [repeat(2, [c('until-close'), L]), say('Ding!')],
      mustUse: ['until-close', 'repeat'],
    },
    sorting: {
      prompt: 'Sensing without touching. Which is sense, which is think, which is act?',
      items: [
        { text: 'A bat hears the echo of its squeak', icon: '🦇', answer: 'sense' },
        { text: 'The bat works out the wall is close', icon: '🧠', answer: 'think' },
        { text: 'The bat swerves away', icon: '↪️', answer: 'act' },
        { text: 'A parking sensor hears an echo from the wall', icon: '🚗', answer: 'sense' },
        { text: '“If the wall is close, beep faster”', icon: '❓', answer: 'think' },
        { text: 'The car beeps faster', icon: '🔔', answer: 'act' },
      ],
    },
    materials: ['Masking tape', 'Two chairs for the bandstand'],
  },
  {
    number: 22,
    idea: 'A robot that waits until the path is clear keeps people safe; people decide the safety rules.',
    storyHook:
      'The square is busy with festival-goers, and Spark must carry a lantern through the crowd to the tower door. A robot that pushes past people is not a good robot. Before every hop, Spark looks: is the path clear?',
    main: {
      title: 'Human robot: through the busy square',
      minutes: 15,
      steps: [
        'Some children walk slowly across the P squares as festival-goers. The robot carries a ball in a cup (the lantern).',
        'Use “Wait until the path is clear” before every hop. The robot looks: is someone in the next square?',
        'Run it with walkers moving. Then swap: the walkers become robots.',
        'Ask: who decides the safety rules for real robots? (Engineers, testers, and laws people agree on.)',
      ],
    },
    kits: ['floor-grid', 'command-cards'],
    mission: {
      title: 'The lantern delivery',
      ask: 'Carry the lantern through the busy square. Wait for people, turn right at the corner, and tip it out at the door.',
      rows: ['.PG', 'P..', '...', 'S..'],
      heading: 'up',
      deck: ['forward', 'left', 'right', 'until-clear', 'repeat', 'tip', 'say'],
      solution: [repeat(3, [c('until-clear'), F]), R, repeat(2, [c('until-clear'), F]), c('tip'), say('Thank you!')],
      startCarrying: true,
      deliver: true,
      mustUse: ['until-clear', 'repeat'],
    },
    materials: ['A ball and a cup for the lantern'],
  },
  {
    number: 23,
    idea: 'A repeated sensor rule climbs any winding path; and real people design, build, program, test and fix robots.',
    storyHook:
      'The last light before the festival is at the very top of the clock tower, up four winding ramps. Spark does not know how long each ramp is. It uses one rule four times: go until something is close, then turn.',
    main: {
      title: 'Up the clock tower, then robot jobs',
      minutes: 16,
      steps: [
        'Lay the spiral map. Put a ball (the twelfth light) on the L square.',
        'Plan with Repeat 4 [ Keep going until something is close, Turn right ], then Scoop up.',
        'Run it. Ask: did we need to count any squares? Why not?',
        'Paper gears: clock towers are full of gears. Show how two gears turn opposite ways.',
        'Finish with the robot-jobs charades from the warm-up: which job did each of you do today?',
      ],
    },
    kits: ['floor-grid', 'command-cards', 'paper-gears'],
    mission: {
      title: 'To the top!',
      ask: 'Climb all four ramps to the clock face. Then scoop up the twelfth light.',
      rows: ['....#', '.....', '.#L..', '...#.', 'S....'],
      heading: 'up',
      deck: ['creep', 'left', 'right', 'until-close', 'repeat', 'scoop', 'say'],
      solution: [repeat(4, [c('until-close'), R]), c('scoop'), say('Twelve!')],
      mustUse: ['until-close', 'repeat', 'scoop'],
    },
    gears: {
      title: 'Gears in the clock',
      steps: [
        'Mesh three paper gears in a row on cardboard.',
        'Turn the first one clockwise. Which way does the middle one turn? And the last one?',
        'Ask: why might a clock use a big gear and a small gear together? (One hand goes round faster than the other.)',
      ],
    },
    materials: ['A ball', 'Chairs or boxes for the walls', 'Card and pencils for the paper gears'],
  },
  {
    number: 24,
    idea: 'Design, test and share a show that uses a loop, a sensor card, a tool and kind words.',
    storyHook:
      'It is the Night of a Hundred Lights. Every robot in Lantern Hill puts on a show, and Spark has saved the last spot for our class. The show must use a loop, a sensor card, a tool, and kind words.',
    main: {
      title: 'Plan, test and perform the festival show',
      minutes: 24,
      steps: [
        'Storyboard (from the warm-up): beginning, middle and end in three boxes.',
        'Turn each box into cards: at least one Repeat, one sensor card (bump, close, or path clear), one tool card and one Say with kind words.',
        'Test on the floor grid with a human robot; fix one thing.',
        'Show: each pair performs. The audience gives “a star and a wish”. Sort the review cards together at the end.',
      ],
    },
    kits: ['command-cards', 'floor-grid', 'sorting'],
    sorting: {
      prompt: 'Everything we learned this term. Sense, think or act?',
      items: [
        { text: 'Bumper feels a wall', icon: '🛡️', answer: 'sense' },
        { text: 'Distance Eyes hear an echo', icon: '👀', answer: 'sense' },
        { text: 'Repeat 4 times', icon: '🔁', answer: 'think' },
        { text: '“If I feel a bump, turn”', icon: '❓', answer: 'think' },
        { text: 'Wait until the path is clear', icon: '🚦', answer: 'think' },
        { text: 'Scoop up a lantern', icon: '🥄', answer: 'act' },
        { text: 'Switch the light on', icon: '💡', answer: 'act' },
        { text: 'Say “Happy festival!”', icon: '💬', answer: 'act' },
      ],
    },
    materials: ['A paper storyboard (folded in three) per pair', 'Sticky notes for “a star and a wish”'],
  },
]
