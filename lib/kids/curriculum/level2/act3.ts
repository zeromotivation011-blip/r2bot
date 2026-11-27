// lib/kids/curriculum/level2/act3.ts
// Level 2, Act 3 (sessions 13–18): "Sand, Rocks and Turtles".
// A fair test of tracks against wheels, the gripper, sorting by colour,
// keeping out of nesting zones, the camera eye, and the Beach Clean-up project.

import { l2Project } from './act1'
import { episode, L2_LESSON_MIN, lessonTiming, obj, projectTiming, teacher } from './shared'
import type { L2Quiz, L2Session } from './types'

// ── 13 ───────────────────────────────────────────────────────────────────
const Q13: L2Quiz = [
  {
    prompt: 'You want to know if tracks beat four wheels on sand. What makes the test FAIR?',
    options: [
      { text: 'Same sand, same load, same program — only the drive changes', icon: '⚖️' },
      { text: 'Tracks on sand, wheels on the smooth jetty', icon: '🔀', misconception: 'change-everything-fair' },
      { text: 'Try tracks with a light load and wheels with a heavy one', icon: '🎒', misconception: 'change-everything-fair' },
    ],
    answer: 0,
    why: 'Change ONE thing (the drive) and keep everything else the same. Then any difference must come from the drive.',
  },
  {
    prompt: 'Tracks got across the sand in your first run; wheels did not. What next?',
    options: [
      { text: 'Done — tracks win', icon: '🏆', misconception: 'one-run-proves' },
      { text: 'Run each a few more times and write the results in the table', icon: '📋' },
      { text: 'Tracks are always best, so stop testing', icon: '🚜', misconception: 'tracks-always-best' },
    ],
    answer: 1,
    why: 'One run can be luck. Several runs each, recorded in a table, show what usually happens.',
  },
  {
    prompt: 'Your table: tracks win on sand and rock, wheels win on the smooth jetty (faster, less energy). Which drive is best?',
    options: [
      { text: 'Tracks, always', icon: '🚜', misconception: 'tracks-always-best' },
      { text: 'Wheels, always', icon: '🛞', misconception: 'one-run-proves' },
      { text: 'It depends on the route: choose from where the robot will drive most', icon: '🗺️' },
    ],
    answer: 2,
    why: 'There is no “best” drive, only the best drive for a job. Evidence from your own tests helps you choose.',
  },
]

const S13: L2Session = {
  id: 'L2-S13', level: 2, number: 13, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Tracks or Wheels? A Fair Test',
  objective: 'Run a fair test on sand and rock, record results in a table, and choose a drive from evidence.',
  objectives: [
    obj('L2-S13-O1', 'Plans and runs a fair test that changes only the drive, with repeated runs recorded in a results table.', 'I can run a fair test and record my results in a table.', ['data', 'physics'], ['data', 'science-forces', 'engineering-design']),
    obj('L2-S13-O2', 'Chooses a drive from the evidence and the route, explaining the trade-off.', 'I can choose a drive from my results and explain why.', ['design-process'], ['engineering-design', 'communication']),
  ],
  concepts: ['physics', 'data', 'design-process'],
  newBlocks: [],
  episode: episode('Sand, Rock and a Results Table', [
    {
      setting: 'The turtle beach: soft sand, black rocks, rubbish washed up along the tide line. Kofi, a turtle-rescue volunteer, with a clipboard.',
      action: 'The four-wheeled robot rolls onto the soft sand; its wheels dig in and spin.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'The rubbish is all over the soft sand and the rocks. Can your robot even get there?' },
        { who: 'amara', line: 'Wheels sink. Maybe tracks? But tracks are slower on the jetty…' },
      ],
      seconds: 30,
    },
    {
      setting: 'A test strip: sand, then rock. A results table chalked on a board: DRIVE | RUN 1 | RUN 2 | RUN 3.',
      action: 'Spark lines up the robot with the same sack, the same program, only the drive swapped.',
      lines: [
        { who: 'spark', line: 'A fair test changes one thing only. Same sand, same load, same program. Only the drive.' },
        { who: 'amara', line: 'And we run each one three times, so one lucky run cannot fool us.' },
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'That is how we count turtle nests too: same beach, same time, every year.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The results board, filled in.',
      action: 'Ticks and crosses: tracks cross the sand 3 of 3; wheels 0 of 3; on the jetty wheels are faster.',
      lines: [
        { who: 'amara', line: 'Tracks for the beach. Wheels were faster on the jetty — so it depends where we drive most.' },
        { who: 'spark', line: 'What would you choose for the beach clean-up, and what is your evidence? Tell your partner.', direction: 'Spark points at the table.' },
      ],
      seconds: 35,
    },
  ], 'The rover can reach the rubbish — now it needs a hand to pick it up.', 'Last time, every pair delivered the lighthouse parcel by their own route.'),
  build: {
    part: { slot: 'drive', id: 'tracks' },
    action: 'choose',
    narration: 'Choose your drive from YOUR results table: four wheels or tracks.',
    why: 'Tracks spread the weight over a large area so they do not sink in sand; wheels are faster and use less energy on hard ground.',
    tryWithout: 'With the wrong drive for the ground, the robot sinks in sand or crawls slowly on the jetty.',
    physicsEffect: 'In the simulator tracks keep traction in soft sand and on rock but have a lower top speed; wheels slip and dig in on soft sand.',
    realWorld: 'Beach-cleaning and planetary robots are tested on sand and rock before anyone chooses their wheels.',
  },
  arena: { kind: 'code-lab', id: 'desert-patrol', task: 'Try the patrol with your chosen drive. Then run the Physics Lab sand trap with wheels and tracks, three runs each, and fill in your table.', why: 'A verified mission about choosing parts for terrain; the Physics Lab sand trap supplies the repeatable runs for the table.' },
  activities: [
    { id: 'motion-bu-03', why: 'Wheels, tracks or legs? Match each to the ground it suits.' },
    { id: 'motion-bu-06', why: 'Don’t sink in the snow: the same problem as sand.' },
    { id: 'design-bu-03', why: 'Up the kerb: choose a drive and test it.' },
  ],
  challenge: { game: 'bio-bots', tier: 0, goal: 'On Cadet, pick the animal trick that fits each challenge and watch the robot try it.', link: 'Nature runs fair tests too: animals that live on sand, rock or snow all move differently. Pick the right “drive” for each place.' },
  quiz: Q13,
  badge: { id: 'l2-fairtest', name: 'Fair Tester', icon: '⚖️', earnedFor: 'You ran a fair test, recorded results and chose a drive from evidence.' },
  reward: { unlocks: { slot: 'drive', id: 'tracks' }, note: 'Tracks join your toolbox. Your results table is saved in your class gallery.' },
  teacher: teacher({
    timing: lessonTiming('Fair or not fair?'),
    unpluggedWarmup: {
      title: 'Fair or not fair?', minutes: 5,
      steps: [
        'Describe three “tests”: two children race, but one starts closer; two paper planes are thrown by different people; two balls rolled down the same ramp from the same spot.',
        'Children vote FAIR or NOT FAIR with thumbs and say what changed.',
        'Write the rule: change ONE thing; keep the rest the same; repeat.',
      ],
      materials: ['None'],
    },
    discussion: [
      'What did you keep the same in your test?',
      'Why three runs and not one?',
      'Is there a best drive? Best for what?',
    ],
    extra: ['tracks-always-best'],
    differentiation: {
      faster: ['Add a third surface (rock) and a fourth column for time taken.', 'Calculate the average time for each drive over three runs.'],
      slower: ['A two-row table (wheels, tracks) with ticks and crosses only.', 'Do the fair-or-not cards with a partner before testing.'],
    },
  }, Q13),
  parent: {
    today: 'Your child ran a fair test — changing only the robot’s drive, keeping everything else the same, repeating each run — and chose between wheels and tracks from their own results table.',
    tryAtHome: 'Test which paper towel soaks up the most water: same amount of water, same size of towel, three tries each. What did you keep the same?',
    askYourChild: 'What makes a test fair?',
  },
}

// ── 14 ───────────────────────────────────────────────────────────────────
const Q14: L2Quiz = [
  {
    prompt: 'What is the right order to pick up a bottle?',
    options: [
      { text: 'Close, drive to the bottle, open', icon: '🔄', misconception: 'close-before-reach' },
      { text: 'Open, drive slowly to the bottle, close', icon: '✋' },
      { text: 'Drive fast at the bottle, then close', icon: '💨', misconception: 'close-before-reach' },
    ],
    answer: 1,
    why: 'Open first so the bottle fits, approach slowly so you do not knock it away, then close.',
  },
  {
    prompt: 'The gripper crushed a soft drinks can. What went wrong?',
    options: [
      { text: 'It squeezed too hard — soft things need a gentle grip', icon: '🥫' },
      { text: 'Nothing — grippers should always squeeze as hard as they can', icon: '💪', misconception: 'grip-hard-is-best' },
      { text: 'The robot was too slow', icon: '🐢', misconception: 'bigger-number-faster' },
    ],
    answer: 0,
    why: 'Real grippers limit their force: firm enough to hold, gentle enough not to crush.',
  },
  {
    prompt: 'Why does the robot drive more slowly when it carries a heavy rock in its gripper?',
    options: [
      { text: 'It is tired', icon: '😴', misconception: 'robot-is-remote-control' },
      { text: 'It does not — load makes no difference', icon: '🤷', misconception: 'time-equals-distance' },
      { text: 'More mass needs more force to speed up, from the same motors', icon: '🏋️' },
    ],
    answer: 2,
    why: 'Heavier means harder to speed up and slow down with the same motors. That is why drive_distance helps with loads.',
  },
]

const S14: L2Session = {
  id: 'L2-S14', level: 2, number: 14, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'The Gripper',
  objective: 'Add a gripper and pick up objects of different shapes; open, approach slowly, close.',
  objectives: [
    obj('L2-S14-O1', 'Sequences a pick-up as open → slow approach → close → lift/carry → release, and explains each step.', 'I can pick something up in the right order: open, approach slowly, close.', ['sequences'], ['programming', 'algorithms']),
    obj('L2-S14-O2', 'Explains why grip force and approach speed matter for different objects and loads.', 'I can explain why some things need a gentle grip.', ['physics'], ['science-forces']),
  ],
  concepts: ['sequences', 'physics'],
  newBlocks: [],
  episode: episode('A Hand for the Beach', [
    {
      setting: 'The turtle beach. A plastic bottle, a tangle of net and a crushed can on the sand, near a nest marker.',
      action: 'The robot pushes the bottle with its body; the bottle rolls right towards the nest marker. Kofi gasps and stops it.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'Not towards the nest! We need to LIFT the rubbish, not push it.' },
        { who: 'spark', line: 'Then our robot needs a hand. A gripper!' },
      ],
      seconds: 30,
    },
    {
      setting: 'Close-up of the new gripper on the robot: two soft fingers.',
      action: 'First try: the gripper closes, then drives — and grabs only air. Second try: it rushes in and knocks the bottle away.',
      lines: [
        { who: 'amara', line: 'It closed before it got there! And then it came in too fast.' },
        { who: 'spark', line: 'Open first. Come in slowly. Then close. Like your hand picking up a cup.' },
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'And gently — some of this is soft. If it is crushed it is harder to recycle.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The beach, evening. A neat pile of rubbish in a crate.',
      action: 'The robot picks up the bottle, the can (gently) and the net, one at a time, and drops each in the crate.',
      lines: [
        { who: 'amara', line: 'Bottle, can, net — all in the crate!' },
        { who: 'spark', line: 'Some are plastic, some metal, some rope. Should they all go in one crate? What do you think?', direction: 'Spark faces the camera.' },
      ],
      seconds: 30,
    },
  ], 'The crate is full of mixed rubbish. The recycling bins on the island are coloured — and the robot cannot see colours yet.', 'Last time, a fair test chose the rover’s drive.'),
  build: {
    part: { slot: 'tool', id: 'gripper' },
    action: 'add',
    narration: 'Fit the gripper claw to the front of your robot.',
    why: 'A gripper can hold things of many shapes and carry them where they belong, instead of pushing them around.',
    tryWithout: 'Without a gripper the robot can only push: the rubbish rolls the wrong way, towards the nests.',
    physicsEffect: 'grip_close holds an object if it is between the fingers; a carried load adds mass, so the robot speeds up and slows down more gently.',
    realWorld: 'Robot arms in recycling centres pick bottles and cans off fast conveyor belts with soft grippers and suction.',
  },
  arena: { kind: 'code-lab', id: 'box-mover', task: 'Open, approach, close, carry, drop. Say each step out loud before you run it.', why: 'A verified gripper mission: the pick-and-place sequence the session teaches.' },
  activities: [
    { id: 'mechanics-bu-07', why: 'Famous robot arms: what does each one pick up?' },
    { id: 'mechanics-bu-10', why: 'Design the bakery arm: gentle enough for bread.' },
    { id: 'mechanics-bu-01', why: 'A strong, slow winch: force and speed are a trade.' },
  ],
  challenge: { game: 'arm-factory', tier: 1, goal: 'On Pilot, use the teach pendant to pick parts off the moving belt and drop them in the right bins.', link: 'Factory arms do exactly your sequence — open, approach, close, lift, place — thousands of times a day.' },
  quiz: Q14,
  badge: { id: 'l2-gripper', name: 'Gentle Grip', icon: '🦾', earnedFor: 'You can pick things up in the right order and explain why some need a gentle grip.' },
  reward: { unlocks: { slot: 'tool', id: 'gripper' }, note: 'The gripper claw joins your toolbox.' },
  teacher: teacher({
    timing: lessonTiming('Chopstick pick-up'),
    unpluggedWarmup: {
      title: 'Two-finger pick-up', minutes: 5,
      steps: [
        'Pairs pick up a cotton ball, a pencil and a paper cup using only two fingers (or tongs), eyes on the object.',
        'The partner calls each step: open, approach, close, lift.',
        'Ask: which object needed the gentlest grip? Which was hardest to approach?',
      ],
      materials: ['Cotton balls, pencils, paper cups', 'Tongs or clothes pegs (optional)'],
    },
    discussion: [
      'Why open BEFORE approaching?',
      'What could go wrong if a robot squeezes too hard? Too softly?',
      'Where do robots pick up delicate things?',
    ],
    differentiation: {
      faster: ['Program the robot to pick up two items in one trip with a loop.', 'Find the slowest approach speed that still finishes in good time.'],
      slower: ['Do the pick-up with blocks given in a jumbled order; children put them right.', 'One object only, with the teacher reading the steps.'],
    },
  }, Q14),
  parent: {
    today: 'Your child fitted a gripper and learned the order robots use to pick things up — open, approach slowly, close — and why soft things need a gentle grip.',
    tryAtHome: 'Pick up a grape, a spoon and a sock with kitchen tongs. Say the steps out loud. Which needed the gentlest grip?',
    askYourChild: 'Why does the robot open its gripper before it drives to the bottle?',
  },
}

// ── 15 ───────────────────────────────────────────────────────────────────
const Q15: L2Quiz = [
  {
    prompt: 'Where does the colour sensor look?',
    options: [
      { text: 'Across the whole beach', icon: '🔭', misconception: 'colour-sensor-sees-far' },
      { text: 'At the floor right under it, lit by its own little light', icon: '🔦' },
      { text: 'At whatever the robot is thinking about', icon: '💭', misconception: 'camera-understands' },
    ],
    answer: 1,
    why: 'A colour sensor shines its own light on the floor just below it and measures the colour that bounces back. It cannot see far.',
  },
  {
    prompt: 'if floor_color = blue { drop } else { keep driving }. The robot reaches a green zone. What happens?',
    options: [
      { text: 'It drops the item — green is close enough', icon: '🟩', misconception: 'else-optional-means-nothing' },
      { text: 'It drops the item AND keeps driving', icon: '🔀', misconception: 'else-optional-means-nothing' },
      { text: 'It keeps driving', icon: '➡️' },
    ],
    answer: 2,
    why: 'The condition is false (green is not blue), so only the else part runs: keep driving.',
  },
  {
    prompt: 'The robot drops a plastic bottle in the metal bin. What is the most likely bug?',
    options: [
      { text: 'The colour in the if does not match the colour of the plastic bin’s zone', icon: '🎨' },
      { text: 'The sensor reads the colour of the bottle in its gripper', icon: '🍾', misconception: 'colour-sensor-sees-far' },
      { text: 'Robots cannot sort — only people can', icon: '🙅', misconception: 'parts-do-everything' },
    ],
    answer: 0,
    why: 'The sensor reads the FLOOR zone. If the program says “drop on red” but plastic’s zone is yellow, the robot drops in the wrong place.',
  },
]

const S15: L2Session = {
  id: 'L2-S15', level: 2, number: 15, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Colour Sorting',
  objective: 'Swap to the colour sensor and sort recycling by the colour of each drop-off zone.',
  objectives: [
    obj('L2-S15-O1', 'Uses floor_color in if / else to act differently on each coloured zone.', 'I can make my robot act differently on each colour.', ['sensors', 'conditions'], ['programming', 'algorithms']),
    obj('L2-S15-O2', 'Explains that a colour sensor reads the surface directly beneath it with its own light.', 'I can explain what a colour sensor can and cannot see.', ['sensors'], ['computing-systems']),
  ],
  concepts: ['sensors', 'conditions'],
  newBlocks: ['floor_color'],
  episode: episode('Bins of Many Colours', [
    {
      setting: 'The island recycling point at the end of the beach path: a yellow zone (plastic), a blue zone (metal), a green zone (rope and nets).',
      action: 'The robot drops everything in the first zone it reaches. Kofi sighs and sorts it by hand.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'Plastic on yellow, metal on blue, nets on green. Mixed rubbish cannot be recycled.' },
        { who: 'amara', line: 'Our robot is colour-blind! It needs to see the zones.' },
      ],
      seconds: 30,
    },
    {
      setting: 'Under the robot: the line sensor swapped for a colour sensor with a tiny white light.',
      action: 'X-ray view: the light shines down; yellow bounces back from the yellow zone; a word appears: YELLOW.',
      lines: [
        { who: 'spark', line: 'The colour sensor shines its own light on the floor right underneath and measures the colour that comes back.' },
        { who: 'amara', line: 'So it reads the zone, not the bottle in the gripper.' },
        { who: 'spark', line: 'If floor colour is yellow and I am carrying plastic, drop. Else, keep going.' },
      ],
      seconds: 40,
    },
    {
      setting: 'The recycling point, sunset, three neat piles.',
      action: 'The robot carries each item and drops it on the matching zone. Kofi gives a thumbs-up.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'Sorted perfectly. That saves me an hour every evening!' },
        { who: 'spark', line: 'What would happen if the zones were faded by the sun? Talk with your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 30,
    },
  ], 'The beach is getting cleaner — but the robot’s tracks have passed very close to a turtle nest.', 'Last time, the gripper learned to pick up the rubbish gently.'),
  build: {
    part: { slot: 'sensor', id: 'color' },
    action: 'swap',
    narration: 'Swap the line sensor for the colour sensor.',
    why: 'The colour sensor tells the program which coloured zone the robot is on, so it can drop each item in the right place.',
    tryWithout: 'Without it the robot cannot tell the zones apart and drops everything in the first one.',
    physicsEffect: 'floor_color reads the zone directly under the sensor (white, black, red, green, blue or yellow).',
    realWorld: 'Recycling robots use colour and other light sensors to sort plastics, paper and metals on fast belts.',
  },
  arena: { kind: 'code-lab', id: 'parcel-picker', task: 'Use the colour sensor to decide when to pick and when to drop.', why: 'A verified sense → think → act mission: the colour sensor decides when the gripper picks and drops.' },
  activities: [
    { id: 'sensors-bu-05', why: 'Is a parcel on the belt? Tune when the sensor says yes.' },
    { id: 'ai-bu-09', why: 'Pick, wait or compost? A flowchart of sorting rules.' },
    { id: 'hospital-threshold-close-the-hand', why: 'When should the robot hand close? A sensor and a rule.' },
  ],
  challenge: { game: 'robot-brain', tier: 0, goal: 'On Cadet, teach Sorta two labels and get eight parcels right on the belt.', link: 'Sorting robots learn which features go with which bin. Your colour rule is a sorting rule written by hand.' },
  quiz: Q15,
  badge: { id: 'l2-sorter', name: 'Colour Sorter', icon: '🎨', earnedFor: 'You can make a robot sort by colour with if / else and explain what the colour sensor sees.' },
  reward: { unlocks: { slot: 'sensor', id: 'color' }, note: 'The colour sensor joins your toolbox.' },
  teacher: teacher({
    timing: lessonTiming('Colour card sort'),
    unpluggedWarmup: {
      title: 'Colour card sort', minutes: 5,
      steps: [
        'Three coloured sheets on the floor (yellow, blue, green). Children hold picture cards of rubbish.',
        'A “robot” child walks with one card and may only look DOWN at the floor; a partner says the rule aloud: if yellow and plastic, drop.',
        'Ask: what if two sheets were nearly the same colour?',
      ],
      materials: ['Coloured sheets of paper', 'Rubbish picture cards'],
    },
    discussion: [
      'Why does the sensor need its own light?',
      'What could fool a colour sensor?',
      'How do recycling centres sort things that are the same colour?',
    ],
    differentiation: {
      faster: ['Add a fourth zone with if / else inside else.', 'Make the robot say which zone it is on for every item (debug report).'],
      slower: ['Two zones only: yellow and everything else.', 'Act out the rule with the coloured sheets before coding.'],
    },
  }, Q15),
  parent: {
    today: 'Your child swapped in a colour sensor and programmed their robot to sort recycling onto the right coloured zones with if / else.',
    tryAtHome: 'Sort the recycling together with a rule spoken out loud: “If it is plastic, it goes in…”. What rule would a robot need?',
    askYourChild: 'What does your robot’s colour sensor actually look at?',
  },
}

// ── 16 ───────────────────────────────────────────────────────────────────
const Q16: L2Quiz = [
  {
    prompt: 'Why should a beach robot keep out of the turtle nesting zones even at night when nobody is watching?',
    options: [
      { text: 'It doesn’t need to if nobody sees', icon: '🙈', misconception: 'nature-rules-optional' },
      { text: 'Because a crushed nest is crushed whether or not anyone sees', icon: '🐢' },
      { text: 'Because robots get in trouble', icon: '🚓', misconception: 'robot-is-remote-control' },
    ],
    answer: 1,
    why: 'Harm happens whether or not someone is watching. A good program follows the rule every single time, automatically.',
  },
  {
    prompt: 'The nest zones are painted red. Which rule keeps the robot out?',
    options: [
      { text: 'if floor_color = red { back off and turn } else { keep collecting }', icon: '🔴' },
      { text: 'if floor_color = red { keep collecting }', icon: '➡️', misconception: 'not-flips-action' },
      { text: 'Check for red once at the start of the program', icon: '1️⃣', misconception: 'if-checks-forever' },
    ],
    answer: 0,
    why: 'The check must happen again and again (inside the loop), and red must make the robot back away.',
  },
  {
    prompt: 'How can a robot harm nature?',
    options: [
      { text: 'It can’t — it is just a machine', icon: '🤖', misconception: 'robots-cannot-harm-nature' },
      { text: 'Only if it is broken', icon: '💥', misconception: 'robots-cannot-harm-nature' },
      { text: 'By crushing nests, scaring animals, noise and leaking oil', icon: '⚠️' },
    ],
    answer: 2,
    why: 'Even a working robot can harm wildlife. Designers add rules, zones, quiet modes and slow speeds to prevent it.',
  },
]

const S16: L2Session = {
  id: 'L2-S16', level: 2, number: 16, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Turtle Beach',
  objective: 'Keep out of marked nesting zones and explain why robots in nature need rules.',
  objectives: [
    obj('L2-S16-O1', 'Programs a keep-out rule (colour zone → back off) checked on every pass of the loop.', 'I can program my robot to keep out of a marked zone.', ['conditions'], ['programming']),
    obj('L2-S16-O2', 'Names ways robots can harm wildlife and how rules in the program prevent them.', 'I can say how robots could harm nature and how rules protect it.', ['safety-ethics'], ['impacts-of-computing']),
  ],
  concepts: ['safety-ethics', 'conditions'],
  newBlocks: [],
  episode: episode('The Night Nest', [
    {
      setting: 'The turtle beach under the moon. Red ropes and painted red patches mark the nests.',
      action: 'The robot’s track runs right beside a red patch; Kofi kneels to check the nest, worried.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'The eggs are fine, but that was close. One wrong turn and the nest is crushed.' },
        { who: 'amara', line: 'The robot works at night, when nobody is watching. It has to follow the rule by itself.' },
      ],
      seconds: 35,
    },
    {
      setting: 'The post office. Spark and Amara write rules on a big card: ROBOT BEACH RULES.',
      action: 'Spark writes: 1. Never enter red. 2. Slow near people and animals. 3. Quiet at night.',
      lines: [
        { who: 'spark', line: 'The rules go in the program, so they happen every time: if the floor is red, back off and turn.' },
        { who: 'amara', line: 'And the check goes inside the loop, so the robot asks again and again.' },
        { who: 'lucia', line: 'Over the radio: Good robots are designed to do no harm — even when nobody is watching.' },
      ],
      seconds: 40,
    },
    {
      setting: 'The beach before dawn. Tiny turtles hatch and scramble towards the sea.',
      action: 'The robot reaches a red patch, backs off, turns and carries on collecting. Hatchlings pass safely.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'Look! The first hatchlings. And not one track in the nest zone.' },
        { who: 'spark', line: 'Name one way a robot could help nature, and one way it could harm it. Tell your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 35,
    },
  ], 'The rubbish is not just on the sand. Some is under the rocks, in the dark, where colour sensors are no help.', 'Last time, the robot sorted the recycling by colour.'),
  build: {
    part: { slot: 'sensor', id: 'color' },
    action: 'inspect',
    narration: 'Look at the colour sensor again. Today it guards the nests.',
    why: 'The same sensor that sorts can also spot a keep-out zone, so the robot backs off before it does harm.',
    tryWithout: 'Without a way to see the zones, the robot would only keep out by luck.',
    physicsEffect: 'floor_color = red inside the loop triggers the back-off; checking every pass keeps the robot from drifting in.',
    realWorld: 'Robot lawn mowers keep out of flower beds with boundary wires, and conservation drones follow no-fly rules near nesting birds.',
  },
  arena: { kind: 'code-lab', id: 'colour-signals', task: 'React to the colour signals: treat red as “keep out” and make your robot back away every time.', why: 'A verified mission where colours are signals the robot must obey — the core of a keep-out rule.' },
  activities: [
    { id: 'guardians-bu-mower-hedgehog', why: 'The robot mower and the hedgehog: what should the designers do?' },
    { id: 'world-bu-08', why: 'Tune the safety zone around a working robot.' },
    { id: 'design-bu-09', why: 'The playground robot: rules that keep everyone safe.' },
  ],
  challenge: { game: 'safety-inspector', tier: 0, goal: 'On Cadet, find the four dangers in Gearworks Factory and pick the fix that really stops each one.', link: 'Safety inspectors look for harm before it happens — the same thinking as protecting the nests.' },
  quiz: Q16,
  badge: { id: 'l2-guardian', name: 'Nest Guardian', icon: '🐢', earnedFor: 'You programmed a keep-out rule and can explain why robots in nature need rules.' },
  reward: { note: 'Turtle hatchlings appear on the beach in your season map.' },
  teacher: teacher({
    timing: lessonTiming('Rules for a beach robot'),
    unpluggedWarmup: {
      title: 'Rules for a beach robot', minutes: 5,
      steps: [
        'Show a photo or drawing of a beach with nests, people and rubbish.',
        'In pairs, write three rules a beach robot must follow. Share and agree a class top three.',
        'Ask: how could the robot follow a rule when nobody is watching? (It is in the program.)',
      ],
      materials: ['A beach picture (projected)'],
    },
    discussion: [
      'Should a robot ever break a nature rule? Who decides?',
      'How could a robot harm an animal without touching it?',
      'Who is responsible if a robot harms a nest: the robot, the programmer, the owner?',
    ],
    differentiation: {
      faster: ['Add a “slow zone” (yellow) around the red zone where the robot drives at half power.', 'Write a short beach-robot code of conduct for the class wall.'],
      slower: ['One rule only: red → back off.', 'Act out the rule with red paper patches on the floor.'],
    },
  }, Q16),
  parent: {
    today: 'Your child programmed a keep-out rule so their robot never drives into turtle nesting zones, and talked about how robots can help or harm nature.',
    tryAtHome: 'On a walk, look for signs that protect nature (keep off the grass, nesting areas, quiet zones). What rule would a robot need?',
    askYourChild: 'Why must the robot follow the nest rule even when nobody is watching?',
  },
}

// ── 17 ───────────────────────────────────────────────────────────────────
const Q17: L2Quiz = [
  {
    prompt: 'The camera eye can see walls AND colours. Why not use a camera for everything?',
    options: [
      { text: 'You should — a camera is always better', icon: '📷', misconception: 'camera-always-better' },
      { text: 'A camera needs light and more computing and power; a simple sensor can be more reliable for one job', icon: '⚖️' },
      { text: 'Cameras cannot see colours', icon: '⬛', misconception: 'colour-sensor-sees-far' },
    ],
    answer: 1,
    why: 'Every sensor is a trade-off. A camera does many jobs but needs light, costs more and uses more energy.',
  },
  {
    prompt: 'Under the rocks it is dark. What happens to the camera?',
    options: [
      { text: 'It sees just as well', icon: '😎', misconception: 'camera-always-better' },
      { text: 'It understands the dark', icon: '🧠', misconception: 'camera-understands' },
      { text: 'It struggles — a camera needs light, so the robot needs its headlight', icon: '🔦' },
    ],
    answer: 2,
    why: 'A camera measures light. No light, no picture. That is why cave and deep-sea robots carry their own lights.',
  },
  {
    prompt: 'What does a camera actually give the program?',
    options: [
      { text: 'Numbers for every tiny dot (pixel) — the program has to work out what they mean', icon: '🔢' },
      { text: 'The names of things it sees, like “bottle”', icon: '🏷️', misconception: 'camera-understands' },
      { text: 'The answer to the mission', icon: '🏁', misconception: 'parts-do-everything' },
    ],
    answer: 0,
    why: 'A camera gives a grid of numbers. Turning those numbers into “wall” or “red” is the program’s job — and it can make mistakes.',
  },
]

const S17: L2Session = {
  id: 'L2-S17', level: 2, number: 17, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'The Camera Eye',
  objective: 'Swap to a camera that sees walls and colours, and compare it with single-job sensors (cost, light needed).',
  objectives: [
    obj('L2-S17-O1', 'Compares a camera with single-purpose sensors on capability, light needed, cost and reliability, and chooses for a task.', 'I can compare a camera with simple sensors and choose one for a job.', ['sensors', 'design-process'], ['engineering-design', 'computing-systems']),
    obj('L2-S17-O2', 'Explains that a camera returns pixel values that a program must interpret.', 'I can explain that a camera gives numbers the program has to understand.', ['sensors'], ['data', 'computing-systems']),
  ],
  concepts: ['sensors', 'design-process'],
  newBlocks: [],
  episode: episode('Under the Rocks', [
    {
      setting: 'A rocky corner of the beach, rubbish wedged in a dim gap between boulders.',
      action: 'The robot’s colour sensor reads the dark sand as black, again and again; it cannot find the bottles.',
      lines: [
        { who: 'amara', line: 'The colour sensor only sees the floor right under it. The rubbish is in there somewhere.' },
        { who: 'spark', line: 'We need eyes that see further. A camera!' },
      ],
      seconds: 30,
    },
    {
      setting: 'The post office. A camera eye on the robot. On a screen, its view: a grid of tiny coloured squares.',
      action: 'Spark zooms in until the picture is just numbers.',
      lines: [
        { who: 'spark', line: 'A camera does not “see” like you. It gives the program a number for every tiny dot, called a pixel.' },
        { who: 'amara', line: 'So the program has to work out which dots are a wall and which are a red bottle.' },
        { who: 'lucia', line: 'Over the radio: And cameras need light. Bring the headlight.' },
      ],
      seconds: 40,
    },
    {
      setting: 'Between the rocks, lit by the robot’s headlight.',
      action: 'With the light on, the camera spots a wall ahead and a red bottle; the robot weaves in and grips it.',
      lines: [
        { who: 'amara', line: 'With the headlight on, the camera sees the wall AND the bottle!' },
        { who: 'spark', line: 'Camera or simple sensors: which would you put on a robot that works in the dark, and why?', direction: 'Spark faces the camera.' },
      ],
      seconds: 35,
    },
  ], 'The rocks are clean. Now every pair designs its own beach clean-up robot.', 'Last time, the robot learned to protect the turtle nests.'),
  theatre: 'robot-that-couldnt-see',
  build: {
    part: { slot: 'head', id: 'camera' },
    action: 'swap',
    narration: 'Swap the Distance Eyes for the camera eye.',
    why: 'One camera can see both walls and colours further away, so it can replace two simpler sensors — if there is enough light.',
    tryWithout: 'Without the camera the robot needs two separate sensors, and the colour sensor only sees right under itself.',
    physicsEffect: 'With the camera, distance_cm and floor_color both work; in dark arenas they need the headlight on.',
    realWorld: 'Self-driving cars, Mars rovers and fruit-picking robots all use cameras, usually together with other sensors.',
  },
  arena: { kind: 'code-lab', id: 'cave-light', task: 'Into the cave: switch the light on so your sensors work, then find the way through.', why: 'A verified mission showing that sensors need the right conditions — light — exactly the camera’s weak spot.' },
  activities: [
    { id: 'sensors-bu-02', why: 'Which senses for which job?' },
    { id: 'sensors-bu-10', why: 'Cave rescue robot: choose sensors for the dark.' },
    { id: 'farm-sensors-for-a-robot-tractor', why: 'Sensors for a robot tractor: camera or not?' },
  ],
  challenge: { game: 'robot-brain', tier: 1, goal: 'On Pilot, teach four labels and score well on parcels drawn by strangers.', link: 'A camera gives numbers; a learning program turns them into labels — and it can only be as good as its examples.' },
  quiz: Q17,
  badge: { id: 'l2-camera', name: 'Camera Eye', icon: '📷', earnedFor: 'You can compare a camera with simple sensors and explain what a camera really gives a robot.' },
  reward: { unlocks: { slot: 'head', id: 'camera' }, note: 'The camera eye joins your toolbox.' },
  teacher: teacher({
    timing: lessonTiming('Pixel picture'),
    unpluggedWarmup: {
      title: 'Pixel picture', minutes: 5,
      steps: [
        'Show a 6 × 6 grid of numbers (0 = dark, 9 = bright) on the board. Pairs colour it in on squared paper.',
        'What is the picture? (A simple shape, e.g. a bottle.) This is what a camera gives a robot.',
        'Ask: what happens to every number if the lights go out?',
      ],
      materials: ['Squared paper', 'Pencils', 'A number grid on the board'],
    },
    discussion: [
      'Why might a robot have both a camera and a bumper?',
      'What can fool a camera?',
      'Is a camera on a robot near people a privacy question? Who should see its pictures?',
    ],
    differentiation: {
      faster: ['Make a sensor table: camera, distance, colour, bumper — what each sees, light needed, cost (low/high).', 'Design a robot for a dark tunnel and justify each sensor.'],
      slower: ['Compare just two: camera and colour sensor, with picture cards.', 'Do the pixel picture with a 4 × 4 grid.'],
    },
  }, Q17),
  parent: {
    today: 'Your child swapped in a camera eye and compared it with simpler sensors: it sees more, but needs light, more computing and more power. They learned that a camera gives a robot numbers, not understanding.',
    tryAtHome: 'Take a photo in a dark room with and without a lamp. Zoom right in until you see the squares (pixels). What would a robot make of it?',
    askYourChild: 'Why is a camera not always the best sensor?',
  },
}

// ── 18 ───────────────────────────────────────────────────────────────────
const Q18: L2Quiz = [
  {
    prompt: 'Your clean-up robot collects well but once crossed a nest zone. Is it ready?',
    options: [
      { text: 'Yes — it collected nearly everything', icon: '👍', misconception: 'worked-once-done' },
      { text: 'Yes — nobody was watching', icon: '🙈', misconception: 'nature-rules-optional' },
      { text: 'No — the nest rule must hold every single time', icon: '🐢' },
    ],
    answer: 2,
    why: 'A safety rule that fails even once is not finished. Fix it, then test again from different starts.',
  },
  {
    prompt: 'You chose tracks. What is your best reason?',
    options: [
      { text: 'My results table showed tracks crossed sand 3 out of 3 times', icon: '📋' },
      { text: 'Tracks look cooler', icon: '😎', misconception: 'tracks-always-best' },
      { text: 'Tracks are always best', icon: '🚜', misconception: 'tracks-always-best' },
    ],
    answer: 0,
    why: 'Engineers choose from evidence. Your own fair-test results are the strongest reason.',
  },
  {
    prompt: 'Which design is the BEST for the beach?',
    options: [
      { text: 'The fastest one, even if it drives near nests', icon: '💨', misconception: 'robots-cannot-harm-nature' },
      { text: 'The one that collects and sorts while never harming wildlife', icon: '🌊' },
      { text: 'The one with the most parts', icon: '🔩', misconception: 'parts-do-everything' },
    ],
    answer: 1,
    why: 'A good design meets the whole problem: collect, sort AND protect the turtles.',
  },
]

const S18: L2Session = {
  id: 'L2-S18', level: 2, number: 18, kind: 'project', durationMin: L2_LESSON_MIN,
  title: 'Make It Yours: Beach Clean-up Robot',
  objective: 'Design a robot routine that collects and sorts litter without disturbing wildlife.',
  objectives: [
    obj('L2-S18-O1', 'Designs a routine that collects and sorts at least two kinds of litter by colour zone and never enters a nesting zone.', 'I can design a clean-up routine that sorts and keeps out of the nests.', ['design-process', 'sensors'], ['engineering-design', 'programming']),
    obj('L2-S18-O2', 'Justifies part choices (drive, sensor, tool) from evidence and the needs of wildlife.', 'I can explain my part choices with evidence.', ['safety-ethics', 'design-process'], ['communication', 'impacts-of-computing']),
  ],
  concepts: ['design-process', 'sensors', 'safety-ethics'],
  newBlocks: [],
  episode: episode('The Clean-up Plan', [
    {
      setting: 'The turtle beach at morning, a big map on an easel showing rubbish, nests, bins and rocks.',
      action: 'Kofi hands every pair a planning sheet.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'Storm season is coming and rubbish will keep washing up. I need a robot that works every evening — without me.' },
        { who: 'spark', line: 'Collect it, sort it, and never go near a nest. And choose your parts from your own evidence.' },
      ],
      seconds: 30,
    },
    {
      setting: 'The same beach that evening, every pair’s robot out on the sand.',
      action: 'Robots collect, sort onto coloured zones, back away from red. Kofi ticks his clipboard.',
      lines: [
        { who: 'guest', guestName: 'Kofi, the turtle volunteer', line: 'Every nest safe. Every bin sorted. You are real engineers.' },
        { who: 'amara', line: 'And look — clouds over the farm island. Storm season.' },
      ],
      seconds: 25,
    },
  ], 'The beach is clean, but storm season is coming and the farm is about to be cut off.', 'Last time, the camera eye found the rubbish under the rocks.'),
  build: {
    part: { slot: 'tool', id: 'gripper' },
    action: 'inspect',
    narration: 'Check your robot: drive from your fair test, the gripper, and the sensor your plan needs.',
    why: 'Each part should be in your design for a reason you can explain.',
    tryWithout: 'A part with no reason adds weight and cost; a missing part leaves a job undone.',
    physicsEffect: 'Your chosen drive changes speed and grip on the beach; carrying litter adds mass to every move.',
    realWorld: 'Beach-cleaning robots are tested on real sand with wildlife experts before they are allowed out.',
  },
  arena: { kind: 'code-lab', id: 'tidy-up', task: 'Warm-up: loop the pick-and-place job. Then build your own clean-up routine with sorting and a keep-out rule.', why: 'A verified pick-and-place loop mission; the project adds colour sorting and the nest rule on top.' },
  activities: [
    { id: 'design-bu-02', why: 'A litter-picker on a budget: which parts earn their place?' },
    { id: 'guardians-bu-harm-check-sort', why: 'Which Harm Check question does each problem belong to?' },
    { id: 'guardians-bu-corridor-helper', why: 'Design a helper that is safe around people.' },
  ],
  challenge: { game: 'smart-farm', tier: 0, goal: 'On Cadet, water only the plants whose sensor reads dry, then send the watering robot.', link: 'Clean-up and farming robots both act only where the sensors say — no waste, no harm.' },
  quiz: Q18,
  badge: { id: 'l2-cleanup', name: 'Beach Engineer', icon: '🌊', earnedFor: 'You designed a clean-up robot that sorts litter and never harms the nests, with parts chosen from evidence.' },
  reward: { note: 'A clean beach full of hatchlings appears on your season map.' },
  project: l2Project(18),
  teacher: teacher({
    timing: projectTiming(),
    unpluggedWarmup: {
      title: 'Design brief', minutes: 7,
      steps: [
        'Write the problem in one sentence on the planning sheet.',
        'Two sketches; choose one. List parts with one reason each (drive from your session 13 table).',
        'Draw the routine as a flowchart: collect → which colour? → drop → nest? → back off.',
      ],
      materials: ['Planning sheets', 'Results tables from session 13'],
    },
    discussion: [
      'Which part choice are you most sure of, and what is your evidence?',
      'How did you make sure the nest rule never fails?',
      'One way robots help nature, and one way they could harm it.',
    ],
    differentiation: {
      faster: ['Sort three kinds of litter and add a slow zone near the nests.', 'Test from two different starts and record both.'],
      slower: ['One kind of litter and the nest rule only.', 'Use the session 15 sorting program as a starting point.'],
    },
  }, Q18),
  parent: {
    today: 'Your child designed their own beach clean-up robot that collects and sorts litter and never enters a turtle nesting zone, choosing its parts from their own test results.',
    tryAtHome: 'Plan a “clean-up routine” for a room together: what goes where, in what order, and what must never be touched?',
    askYourChild: 'Why did you choose the parts on your clean-up robot?',
  },
}

export const ACT3: L2Session[] = [S13, S14, S15, S16, S17, S18]
