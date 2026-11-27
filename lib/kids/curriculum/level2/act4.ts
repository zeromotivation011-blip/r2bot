// lib/kids/curriculum/level2/act4.ts
// Level 2, Act 4 (sessions 19–24): "Storm Season".
// Sensors that lie, search patterns, designing for everyone, running it ten
// times, the people behind sea and farm robots, and the Island Post Grand Route.

import { l2Project } from './act1'
import { episode, L2_LESSON_MIN, lessonTiming, obj, projectTiming, teacher } from './shared'
import type { L2Quiz, L2Session } from './types'

// ── 19 ───────────────────────────────────────────────────────────────────
const Q19: L2Quiz = [
  {
    prompt: 'Rain soaks a fluffy sack in front of the rover and the Distance Eyes read 200 cm (nothing there). What happened?',
    options: [
      { text: 'The sack really is not there', icon: '👻', misconception: 'sensors-always-right' },
      { text: 'The soft, wet sack swallowed the echo, so the sensor missed it', icon: '🌧️' },
      { text: 'The sensor is broken for ever', icon: '💥', misconception: 'bug-means-start-again' },
    ],
    answer: 1,
    why: 'Echo sensors need the sound to bounce back. Soft or angled things can swallow or deflect it, so the reading says “nothing” even though something is there.',
  },
  {
    prompt: 'The line sensor loses the line for a moment where the paint is worn. What is a careful fix?',
    options: [
      { text: 'Stop for ever as soon as the line is lost', icon: '🛑', misconception: 'sensors-always-right' },
      { text: 'Trust every single reading straight away', icon: '✅', misconception: 'sensors-always-right' },
      { text: 'If the line is lost, drive on a little and check again before deciding it is really gone', icon: '🔁' },
    ],
    answer: 2,
    why: 'Checking twice (or for a short time) stops one bad reading from fooling the robot.',
  },
  {
    prompt: 'Why do real robots often carry two different kinds of sensor for the same job?',
    options: [
      { text: 'If one is fooled, the other can still catch the problem', icon: '🤝' },
      { text: 'To make them look clever', icon: '😎', misconception: 'parts-do-everything' },
      { text: 'Because one sensor is always wrong', icon: '❌', misconception: 'sensors-always-right' },
    ],
    answer: 0,
    why: 'Different sensors are fooled by different things. A camera and an echo sensor together miss far less than either alone.',
  },
]

const S19: L2Session = {
  id: 'L2-S19', level: 2, number: 19, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Sensors Can Be Wrong',
  objective: 'Find a false reading (glare, a gap in the line) and make the program more careful.',
  objectives: [
    obj('L2-S19-O1', 'Identifies situations that fool a sensor (soft objects, glare, gaps) and reports readings to find them.', 'I can find out when my robot’s sensor is fooled.', ['sensors', 'debugging'], ['debugging', 'computing-systems']),
    obj('L2-S19-O2', 'Makes a program robust by checking twice or combining sensors before acting.', 'I can make my program check twice before it trusts a reading.', ['sensors'], ['programming', 'algorithms']),
  ],
  concepts: ['sensors', 'debugging'],
  newBlocks: [],
  episode: episode('The Storm That Fooled the Sensors', [
    {
      setting: 'The harbour in the first storm of the season: rain, wind, the sun flashing between clouds on wet stones.',
      action: 'The robot drives straight into a soggy sack of wool. Its screen says: distance 200 cm.',
      lines: [
        { who: 'amara', line: 'It said nothing was there — and then it bumped right into the sack!' },
        { who: 'spark', line: 'The wet wool swallowed the echo. The sensor never heard it come back.' },
      ],
      seconds: 30,
    },
    {
      setting: 'The causeway. Sunlight glares off a puddle over the painted line; a patch of paint is worn away.',
      action: 'The line sensor flickers LINE / NO LINE / LINE. The robot turns the wrong way and stops.',
      lines: [
        { who: 'amara', line: 'The glare and the worn paint fooled the line sensor too.' },
        { who: 'spark', line: 'Sensors are not magic. They can be fooled. A careful program does not trust one reading.' },
        { who: 'lucia', line: 'Over the radio: Check twice. And when you can, use two different senses.' },
      ],
      seconds: 40,
    },
    {
      setting: 'The causeway again, rain easing.',
      action: 'The robot loses the line, drives on a hand’s width, checks again, finds it. At the sack it uses the camera too and stops in time.',
      lines: [
        { who: 'amara', line: 'It checked again before giving up — and it saw the sack with the camera!' },
        { who: 'spark', line: 'What else could fool a robot’s sensors in a storm? List three with your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 35,
    },
  ], 'A parcel of medicine was lost from a boat in the storm, somewhere in the harbour shallows.', 'Last time, every pair designed a beach clean-up robot.'),
  build: {
    part: { slot: 'head', id: 'distance' },
    action: 'swap',
    narration: 'Swap the Distance Eyes back in and listen to how it measures.',
    why: 'Knowing HOW a sensor works tells you what can fool it: an echo sensor needs a hard surface to bounce from.',
    tryWithout: 'If you think a sensor is never wrong, one false reading can send the robot into trouble.',
    physicsEffect: 'distance_cm reads 200 when no echo comes back; low or soft objects can be missed at some angles.',
    realWorld: 'Self-driving cars combine cameras, radar and lidar because each one is fooled by different weather and light.',
  },
  arena: { kind: 'physics', id: 'stop-before-wall', task: 'Stop in the green zone without touching the wall — and say the distance out loud every time round the loop, so you can see what the sensor reads.', why: 'The verified arena offers distance_cm, if / else and say: children report readings, then add a second check.' },
  activities: [
    { id: 'sensors-bu-03', why: 'Echo or no echo? Which things bounce sound back?' },
    { id: 'ai-bu-05', why: 'Is someone at the door? Set a threshold that is not fooled by a cat.' },
    { id: 'city-graph-lidar-sees-people', why: 'What the lidar saw: find the real person in a noisy trace.' },
  ],
  challenge: { game: 'ocean-rescue', tier: 1, goal: 'On Pilot, balance the robot, cross the current and find the buoy with a sonar that only tells you the distance.', link: 'Underwater, sonar is all you have — and currents and rocks can fool it. Check, move, check again.' },
  quiz: Q19,
  badge: { id: 'l2-skeptic', name: 'Careful Checker', icon: '🧐', earnedFor: 'You can find out when a sensor is fooled and make your program check before it trusts a reading.' },
  reward: { note: 'The storm clouds on your season map now show a lightning-proof rover.' },
  teacher: teacher({
    timing: lessonTiming('Fool the sensor'),
    unpluggedWarmup: {
      title: 'Fool the sensor', minutes: 5,
      steps: [
        'A “sensor” child, eyes closed, says “near” or “far” from the sound of a partner clapping at different distances.',
        'Now the partner claps into a cushion. Is it easier or harder to judge?',
        'Ask: what fooled the sensor? How could you be more sure? (Listen twice; also look.)',
      ],
      materials: ['A cushion or a soft jumper'],
    },
    discussion: [
      'Name three things that could fool a robot’s sensors outside.',
      'Why is checking twice slower, and when is it worth it?',
      'Why do robots that work near people often have two kinds of sensor?',
    ],
    differentiation: {
      faster: ['Use AND to require two readings in a row before stopping.', 'Compare the camera and Distance Eyes on the same course; record when each is fooled.'],
      slower: ['Report the sensor value with say and spot the odd reading.', 'Do the clapping game again with different materials.'],
    },
  }, Q19),
  parent: {
    today: 'Your child found out that robot sensors can be fooled — by soft objects that swallow echoes, glare and worn paint — and made their program check twice before trusting a reading.',
    tryAtHome: 'Look at a reflection in a shop window or a puddle together. How could a robot’s camera be fooled by it?',
    askYourChild: 'What fooled your robot’s sensors, and what did you change?',
  },
}

// ── 20 ───────────────────────────────────────────────────────────────────
const Q20: L2Quiz = [
  {
    prompt: 'The medicine parcel is somewhere in a big square of water. What is the best way to search?',
    options: [
      { text: 'Drive around at random until you find it', icon: '🎲', misconception: 'random-search-ok' },
      { text: 'Back and forth in rows, like mowing a lawn', icon: '🟰' },
      { text: 'Drive in one straight line across the middle', icon: '➖', misconception: 'random-search-ok' },
    ],
    answer: 1,
    why: 'A back-and-forth pattern covers every part of the area once. Random driving misses spots and repeats others.',
  },
  {
    prompt: 'repeat 5 { repeat 2 { drive 100 cm, turn 90° } } — how many times does the inner part run?',
    options: [
      { text: '7', icon: '7️⃣', misconception: 'nested-loop-adds' },
      { text: '2', icon: '2️⃣', misconception: 'loop-runs-once' },
      { text: '10', icon: '🔟' },
    ],
    answer: 2,
    why: 'The inner loop runs 2 times for each of the 5 outer passes: 5 × 2 = 10.',
  },
  {
    prompt: 'In a back-and-forth sweep, what changes between one row and the next?',
    options: [
      { text: 'The turn direction: left at the end of one row, right at the end of the next', icon: '↩️' },
      { text: 'Nothing — every row is exactly the same', icon: '🟰', misconception: 'loop-runs-once' },
      { text: 'The robot goes faster each row', icon: '⏩', misconception: 'bigger-number-faster' },
    ],
    answer: 0,
    why: 'The rows alternate direction. That is why a sweep is often written as a loop of TWO rows: one turning left, one turning right.',
  },
]

const S20: L2Session = {
  id: 'L2-S20', level: 2, number: 20, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Search Pattern',
  objective: 'Sweep an area with nested loops (back and forth) so nothing is missed.',
  objectives: [
    obj('L2-S20-O1', 'Programs a back-and-forth sweep using a loop of two alternating rows, nested in an outer loop.', 'I can program a back-and-forth search with loops.', ['loops'], ['programming', 'algorithms']),
    obj('L2-S20-O2', 'Explains why a systematic pattern beats random searching and predicts the number of runs of nested loops.', 'I can explain why a pattern finds things a random search misses.', ['decomposition', 'loops'], ['algorithms', 'mathematics-measurement']),
  ],
  concepts: ['loops', 'decomposition'],
  newBlocks: [],
  episode: episode('Lost in the Shallows', [
    {
      setting: 'The harbour shallows after the storm, the water clear and calm. A boat captain points at the water.',
      action: 'Captain Lars, soaked, explains with his hands.',
      lines: [
        { who: 'guest', guestName: 'Captain Lars', line: 'A parcel of medicine for the farm fell off my boat somewhere here. It is sealed — but I cannot see it.' },
        { who: 'amara', line: 'Our robot can drive in the shallows. But where do we start?' },
      ],
      seconds: 30,
    },
    {
      setting: 'The beach. The robot with the pen draws its search on the sand map first.',
      action: 'Try one: random driving — loops and gaps everywhere. Try two: neat rows, back and forth, like a lawn.',
      lines: [
        { who: 'spark', line: 'Random driving goes over some places three times and misses others completely.' },
        { who: 'amara', line: 'Rows! Across, turn, back, turn, across. Like mowing a lawn.' },
        { who: 'spark', line: 'Two rows make one pattern: one turning left, one turning right. Repeat that pattern, and nothing is missed.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The shallows, the sweep drawn as glowing rows on the water.',
      action: 'On the seventh row the camera spots the parcel. The robot grips it and brings it to shore.',
      lines: [
        { who: 'guest', guestName: 'Captain Lars', line: 'Found it! The farm will have its medicine tonight.' },
        { who: 'spark', line: 'Who else uses search patterns — on land, at sea or in the air? Tell your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 35,
    },
  ], 'The medicine is found. On the farm island, Farmer Anahí needs a delivery that works for her grandfather too.', 'Last time, the robot learned that sensors can be fooled.'),
  build: {
    part: { slot: 'tool', id: 'pen' },
    action: 'swap',
    narration: 'Fit the pen for a moment: it will draw your search pattern.',
    why: 'Drawing the sweep shows instantly whether the rows overlap, leave gaps or cover everything.',
    tryWithout: 'Without the trace you cannot see the gaps — and the parcel might be in one.',
    physicsEffect: 'The pen draws the robot’s path; row spacing must be smaller than what the sensor can see sideways, or gaps appear.',
    realWorld: 'Search-and-rescue drones, lawn-mowing robots and seabed-mapping boats all sweep in rows.',
  },
  arena: { kind: 'code-lab', id: 'staircase', task: 'Find the repeating unit of the path and loop it. Then plan a sweep on paper: which two rows make the repeating unit?', why: 'A verified loop mission about finding the repeating unit — the key step in writing a sweep as nested loops.' },
  activities: [
    { id: 'ocean-loop-lawnmower-search', why: 'Lawn-mower search under the sea: program the rows.' },
    { id: 'motion-bu-09', why: 'Around the puddle: plan before you drive.' },
    { id: 'ai-bu-03', why: 'Round the muddy grass: the best path, not a random one.' },
  ],
  challenge: { game: 'swarm-reef', tier: 1, goal: 'On Pilot, get the swarm through the narrow gap with as few bumps as you can.', link: 'Many robots searching together need a plan, not random wandering — or they crowd and crash.' },
  quiz: Q20,
  badge: { id: 'l2-searcher', name: 'Search Leader', icon: '🔎', earnedFor: 'You can program a back-and-forth search with nested loops so nothing is missed.' },
  reward: { note: 'The medicine parcel appears safe in the farm’s barn on your season map.' },
  teacher: teacher({
    timing: lessonTiming('Find the coin'),
    unpluggedWarmup: {
      title: 'Find the coin', minutes: 5,
      steps: [
        'Hide a paper coin on a 5 × 5 grid drawn on the board, covered by sticky notes.',
        'Team A lifts notes at random; Team B goes row by row. Count lifts for each.',
        'Repeat twice. Which method always finds it, and in how many lifts at most?',
      ],
      materials: ['Sticky notes', 'A paper coin'],
    },
    discussion: [
      'Why does a sweep need rows closer together than the sensor can see?',
      'Where have you seen machines move in rows?',
      'What is the most rows a 5 × 5 search can take? Why is that useful?',
    ],
    differentiation: {
      faster: ['Make the sweep stop early when the camera finds the target (repeat until).', 'Work out how row spacing changes the total distance driven.'],
      slower: ['Draw the sweep on squared paper with arrows before coding.', 'Use a single loop of identical moves first, then fix the turn direction.'],
    },
  }, Q20),
  parent: {
    today: 'Your child programmed a back-and-forth search pattern with loops inside loops, so their robot could find a lost parcel without missing any part of the area.',
    tryAtHome: 'Hide a small object in a room and search it row by row together. Then search randomly. Which way felt surer?',
    askYourChild: 'Why is driving in rows better than driving randomly when you search?',
  },
}

// ── 21 ───────────────────────────────────────────────────────────────────
const Q21: L2Quiz = [
  {
    prompt: 'You are designing a delivery for Mr Tavita, who uses a wheelchair and cannot read small print. What do you do FIRST?',
    options: [
      { text: 'Build what works for me — it will work for him', icon: '🙋', misconception: 'design-for-me' },
      { text: 'Ask him what would help, and watch how he gets his post now', icon: '👂' },
      { text: 'Finish the robot, then add something for him at the end', icon: '🔚', misconception: 'accessibility-extra' },
    ],
    answer: 1,
    why: 'Good designers start by listening to the people who will use the design. They often notice needs nobody else thought of.',
  },
  {
    prompt: 'The robot will deliver at night and in noisy wind. Which message design helps EVERYONE?',
    options: [
      { text: 'Tiny writing on the screen only', icon: '🔍', misconception: 'design-for-me' },
      { text: 'A beep only', icon: '🔔', misconception: 'accessibility-extra' },
      { text: 'A spoken message, big words on the screen and a light', icon: '💡' },
    ],
    answer: 2,
    why: 'Two or three ways of telling (sound, big text, light) help someone who cannot see well, someone who cannot hear well, and everyone in the dark or the wind.',
  },
  {
    prompt: 'Where should the parcel be when the robot arrives at Mr Tavita’s door?',
    options: [
      { text: 'At a height he can reach from his chair', icon: '♿' },
      { text: 'On the top shelf by the door, like everyone else’s', icon: '⬆️', misconception: 'design-for-me' },
      { text: 'It does not matter — the robot delivered it', icon: '🤷', misconception: 'worked-once-done' },
    ],
    answer: 0,
    why: 'A delivery is only done when the person can actually take it. Designing for reach is part of the job.',
  },
]

const S21: L2Session = {
  id: 'L2-S21', level: 2, number: 21, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Design for Everyone',
  objective: 'Interview a “user” and design a delivery that works for someone who cannot reach high shelves or see well.',
  objectives: [
    obj('L2-S21-O1', 'Gathers needs by interviewing a user (role-play) and turns them into design requirements.', 'I can ask a user what they need and turn it into a design.', ['design-process'], ['engineering-design', 'communication', 'collaboration']),
    obj('L2-S21-O2', 'Designs robot feedback with more than one channel (sound, large text, light) and explains who it helps.', 'I can make my robot tell people things in more than one way.', ['safety-ethics', 'design-process'], ['impacts-of-computing', 'programming']),
  ],
  concepts: ['design-process', 'safety-ethics'],
  newBlocks: [],
  episode: episode('Post for Mr Tavita', [
    {
      setting: 'The farm island. A low house with a ramp; Mr Tavita, Farmer Anahí’s grandfather, in his wheelchair on the porch, a magnifying glass in hand.',
      action: 'The robot arrives, beeps once and shows tiny words on its screen. The parcel sits on top of the robot, too high to reach.',
      lines: [
        { who: 'guest', guestName: 'Mr Tavita', line: 'A beep? I thought it was a bird. And I cannot read that tiny writing, or reach up there.' },
        { who: 'amara', line: 'It worked for us. But it did not work for him at all.' },
      ],
      seconds: 35,
    },
    {
      setting: 'The porch, everyone sitting at Mr Tavita’s height.',
      action: 'Amara asks questions; Spark writes the answers on a big card: SPEAK CLEARLY. BIG WORDS. A LIGHT. PARCEL AT KNEE HEIGHT.',
      lines: [
        { who: 'amara', line: 'What would help you, Mr Tavita?' },
        { who: 'guest', guestName: 'Mr Tavita', line: 'Say who it is from, out loud. Big words. A light at night. And put it where I can reach.' },
        { who: 'spark', line: 'Asking the user first — that is what real designers do.' },
      ],
      seconds: 40,
    },
    {
      setting: 'The porch at dusk.',
      action: 'The robot rolls up, its light glowing, says “Post from the island school!”, shows BIG letters, and lowers the parcel to knee height.',
      lines: [
        { who: 'guest', guestName: 'Mr Tavita', line: 'Now THAT is a postman.' },
        { who: 'spark', line: 'His ideas help everyone: who else is helped by a spoken message and a light?', direction: 'Spark faces the camera.' },
      ],
      seconds: 30,
    },
  ], 'Mr Tavita is delighted. But storm season tests every robot: will the post rover work every single time?', 'Last time, a search pattern found the lost medicine.'),
  build: {
    part: { slot: 'head', id: 'screen' },
    action: 'swap',
    narration: 'Fit the face screen. Today your robot speaks clearly and shows big words.',
    why: 'The face screen shows what Say says, so a message can be heard AND read — two ways to reach more people.',
    tryWithout: 'With only a beep, people who cannot hear it well, or who do not know what it means, miss the delivery.',
    physicsEffect: 'say speaks aloud and shows its words on the face screen; light_on adds a visible signal.',
    realWorld: 'Accessible robots and kiosks combine speech, large text, lights and reachable heights — designed with disabled users.',
  },
  arena: { kind: 'code-lab', id: 'say-hello', task: 'Make the delivery announce itself in words people can hear AND read: who the post is from, and where it is.', why: 'A verified mission about robots acting through messages for people — the channel this session designs.' },
  activities: [
    { id: 'design-bu-10', why: 'The library robot: design for every visitor.' },
    { id: 'world-bu-07', why: '“Excuse me, coming through”: how should a robot tell people it is there?' },
    { id: 'world-bu-03', why: 'A robot tutor in class: who might it help, and who might it leave out?' },
  ],
  challenge: { game: 'safety-inspector', tier: 1, goal: 'On Pilot, find each hazard in the smart home, name its Harm Check question and fix it.', link: 'A home robot must be safe and fair for everyone who lives there — young, old, and people who see or move differently.' },
  quiz: Q21,
  badge: { id: 'l2-inclusive', name: 'Designer for Everyone', icon: '♿', earnedFor: 'You asked a user what they need and designed a robot message that reaches everyone.' },
  reward: { note: 'Mr Tavita’s porch, with its ramp and the rover’s light, appears on your season map.' },
  teacher: teacher({
    timing: lessonTiming('User interview role-play'),
    unpluggedWarmup: {
      title: 'User interview role-play', minutes: 5,
      steps: [
        'Role cards: “I use a wheelchair”, “I cannot see small print”, “I am deaf”, “I am four years old”, “I only speak a little English”.',
        'In pairs, one plays the user (respectfully, from the card) and one asks: What do you need from a delivery robot?',
        'Each pair writes two requirements on sticky notes; group them on the board.',
      ],
      materials: ['Role cards', 'Sticky notes'],
      },
    discussion: [
      'Which requirement surprised you?',
      'How does designing for one person end up helping many?',
      'Why is it better to ask real users than to guess?',
    ],
    extra: ['accessibility-extra'],
    differentiation: {
      faster: ['Add a second user with different needs and make one design that works for both.', 'Write a test the user could do to check the design works for them.'],
      slower: ['One user card and two requirements.', 'Choose from a list of message ideas (speak, big words, light) and justify one.'],
    },
    notes: ['Role-play with respect: children play needs, not people to laugh at. If a child in the class has a disability, never single them out; let them choose whether to share their own experience.'],
  }, Q21),
  parent: {
    today: 'Your child practised designing for everyone: they “interviewed” a user and changed their robot’s delivery so it speaks clearly, shows big words, lights up and puts the parcel within reach.',
    tryAtHome: 'Look around your home or street for things designed for everyone (ramps, captions, talking lifts, big buttons). Who does each one help?',
    askYourChild: 'How did you change your robot for Mr Tavita, and who else does it help?',
  },
}

// ── 22 ───────────────────────────────────────────────────────────────────
const Q22: L2Quiz = [
  {
    prompt: 'Your route worked once. What does an engineer do next?',
    options: [
      { text: 'Call it finished', icon: '🏁', misconception: 'worked-once-done' },
      { text: 'Run it many times from different starts and conditions', icon: '🔁' },
      { text: 'Make it faster', icon: '⚡', misconception: 'bigger-number-faster' },
    ],
    answer: 1,
    why: 'One success can be luck. Running it many times, from different starts, shows whether it is reliable.',
  },
  {
    prompt: 'Your test log: 9 successes, 1 failure (from the left start). What now?',
    options: [
      { text: 'Fix the failure — it will happen again on a real delivery', icon: '🔧' },
      { text: '9 out of 10 is fine, ignore it', icon: '👌', misconception: 'one-run-proves' },
      { text: 'Rewrite the whole program', icon: '🗑️', misconception: 'bug-means-start-again' },
    ],
    answer: 0,
    why: 'A failure that happens once in ten will happen on real deliveries. Find what was different (the left start) and fix that.',
  },
  {
    prompt: 'To find out why the left start fails, what should you change?',
    options: [
      { text: 'The start, the speed and the route all at once', icon: '🔀', misconception: 'change-many-at-once' },
      { text: 'Nothing — failures are random', icon: '🎲', misconception: 'one-run-proves' },
      { text: 'One thing at a time, testing from the left start after each change', icon: '1️⃣' },
    ],
    answer: 2,
    why: 'Change one thing, test from the start that failed, and write it down. Then you know what fixed it.',
  },
]

const S22: L2Session = {
  id: 'L2-S22', level: 2, number: 22, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Run It Ten Times',
  objective: 'Test a program from different starts and conditions; fix what fails even once.',
  objectives: [
    obj('L2-S22-O1', 'Runs a program repeatedly from varied starts and conditions, recording results in a test log.', 'I can test my program ten times and record what happens.', ['debugging', 'data'], ['debugging', 'data']),
    obj('L2-S22-O2', 'Treats any single failure as a bug to investigate, isolating the condition that causes it.', 'I can fix something that fails even once.', ['debugging'], ['debugging', 'algorithms']),
  ],
  concepts: ['debugging', 'data'],
  newBlocks: [],
  episode: episode('Ten Times, Every Time', [
    {
      setting: 'The post office, a big chart on the wall: RUN 1 … RUN 10, with ticks.',
      action: 'Postmaster Yusuf looks at the sky; storm clouds roll in.',
      lines: [
        { who: 'guest', guestName: 'Postmaster Yusuf', line: 'In storm season people depend on the post. Medicine, food, letters. It has to arrive EVERY time.' },
        { who: 'spark', line: 'Then we do not test once. We test ten times, from different starts, in sun and in rain.' },
      ],
      seconds: 30,
    },
    {
      setting: 'The harbour route. Runs 1 to 9 succeed. Run 10, from the left side of the jetty, the robot clips a post.',
      action: 'Amara writes a cross on the chart and circles “LEFT START”.',
      lines: [
        { who: 'amara', line: 'Nine out of ten! That is good… isn’t it?' },
        { who: 'spark', line: 'If one in ten fails, one parcel in every ten is lost. Find what was different.' },
        { who: 'amara', line: 'Only run ten started on the left. From there the first turn is too late.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The jetty, rain falling.',
      action: 'Amara changes one thing (the robot checks for the post with its Distance Eyes before turning). Ten more runs from three starts: ten ticks.',
      lines: [
        { who: 'guest', guestName: 'Postmaster Yusuf', line: 'Ten out of ten, in the rain. That I can trust.' },
        { who: 'spark', line: 'What else could you change between runs to test your program? Make a list with your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 35,
    },
  ], 'The post is reliable. Captain Lars arrives with news: robots are coming to the islands for real jobs — and he wants the children to meet the people who build them.', 'Last time, the delivery was redesigned for Mr Tavita.'),
  build: {
    part: { slot: 'body', id: 'box' },
    action: 'inspect',
    narration: 'Check your whole robot before testing: parts tight, battery full.',
    why: 'Reliable tests start with a known robot. If a part changes between runs, the test is not fair.',
    tryWithout: 'If you change the robot halfway through testing, you will not know whether the program or the robot caused a failure.',
    physicsEffect: 'Different starts and floors are the conditions that change; keep the robot the same through all ten runs.',
    realWorld: 'Robot makers test the same robot thousands of times, in heat, cold and rain, before it is allowed to work with people.',
  },
  arena: { kind: 'code-lab', id: 'right-hand-maze', task: 'Stretch (pairs): use the right-hand rule. It must solve EVERY maze, not just one. Keep a test log of each maze.', why: 'A verified mission with several mazes: a rule that works every time is exactly what reliability means.' },
  activities: [
    { id: 'electronics-bu-06', why: 'When was the button pressed? Read real data carefully.' },
    { id: 'electronics-bu-09', why: 'The battery’s real voltage: one reading or many?' },
    { id: 'ai-bu-10', why: 'The nearest example wins: predict from data.' },
  ],
  challenge: { game: 'orbit-repair', tier: 1, goal: 'On Pilot, catch the drifting cargo ship’s grapple pin with the arm, slowly enough to grab.', link: 'In space you get one chance. Engineers test docking again and again on the ground until it works every time.' },
  quiz: Q22,
  badge: { id: 'l2-reliable', name: 'Ten-Out-of-Ten', icon: '🔟', earnedFor: 'You tested a program many times, recorded the results and fixed what failed even once.' },
  reward: { note: 'A “10 out of 10” stamp appears on the post office chart in your season map.' },
  teacher: teacher({
    timing: lessonTiming('Paper plane reliability'),
    unpluggedWarmup: {
      title: 'Paper plane reliability', minutes: 5,
      steps: [
        'Each pair throws one paper plane five times at a target hoop and records hits in a table.',
        'Ask: did it work every time? What was different when it missed (throw, angle, draught)?',
        'Change ONE thing and throw five more times.',
      ],
      materials: ['Paper', 'A hoop or a target on the wall'],
    },
    discussion: [
      'Why is 9 out of 10 not good enough for medicine delivery?',
      'What conditions did you vary between runs?',
      'How did the test log help you find the bug?',
    ],
    differentiation: {
      faster: ['Test from three starts × two floors and fill a 6-row table.', 'Find a condition that breaks a partner’s program, then help them fix it.'],
      slower: ['Five runs from two starts.', 'A test log template with ticks only.'],
    },
  }, Q22),
  parent: {
    today: 'Your child tested their robot’s program many times from different starts, kept a test log and fixed a failure that happened only once — because real deliveries must work every time.',
    tryAtHome: 'Try something ten times (a basketball shot, a paper aeroplane, a card trick) and keep score. What changed when it failed?',
    askYourChild: 'Why did you keep testing after it worked the first time?',
  },
}

// ── 23 ───────────────────────────────────────────────────────────────────
const Q23: L2Quiz = [
  {
    prompt: 'Robots now help on the island’s farm and boats. What happens to jobs for people?',
    options: [
      { text: 'There are no jobs left for people', icon: '🚫', misconception: 'robots-replace-all-jobs' },
      { text: 'New jobs appear: designing, programming, repairing and supervising robots', icon: '👩‍🔧' },
      { text: 'Robots decide who gets which job', icon: '🤖', misconception: 'autonomous-means-alone' },
    ],
    answer: 1,
    why: 'Robots change jobs and create new ones. People design, build, program, test, repair and supervise them.',
  },
  {
    prompt: 'The rescue boat robot steers itself through the storm. Does it still need people?',
    options: [
      { text: 'No — autonomous means it never needs anyone', icon: '🙅', misconception: 'autonomous-means-alone' },
      { text: 'Only to switch it on', icon: '🔌', misconception: 'autonomous-means-alone' },
      { text: 'Yes — people set the mission, watch for trouble and can stop it', icon: '🧑‍✈️' },
    ],
    answer: 2,
    why: 'Autonomous robots decide small things alone, but people choose the mission, keep watch and can always take over.',
  },
  {
    prompt: 'Which job is done by a person who works with robots?',
    options: [
      { text: 'A field technician who repairs farm robots', icon: '🔧' },
      { text: 'None — robots repair themselves', icon: '🪄', misconception: 'robots-replace-all-jobs' },
      { text: 'A robot that hires other robots', icon: '🤖', misconception: 'robots-replace-all-jobs' },
    ],
    answer: 0,
    why: 'Robot technicians, engineers, programmers, testers and pilots are all real jobs — and many need people who are good with their hands and with people, not only with code.',
  },
]

const S23: L2Session = {
  id: 'L2-S23', level: 2, number: 23, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Robots of the Sea and Farm',
  objective: 'Meet the jobs behind marine, farm and rescue robots and run a storm rescue mission.',
  objectives: [
    obj('L2-S23-O1', 'Names jobs people do with marine, farm and rescue robots and the skills each needs.', 'I can name jobs people do with robots.', ['careers'], ['impacts-of-computing', 'communication'], true),
    obj('L2-S23-O2', 'Explains what an autonomous robot decides alone and what people still decide, and runs a rescue mission that combines sensor and actuator.', 'I can explain what a robot decides alone and what people decide.', ['autonomy'], ['computing-systems', 'impacts-of-computing']),
  ],
  concepts: ['careers', 'autonomy'],
  newBlocks: [],
  episode: episode('The People Behind the Robots', [
    {
      setting: 'The harbour on a bright day between storms. A ship unloads: an underwater robot on a cable, a farm robot, a rescue drone.',
      action: 'Three people step off with them: a marine engineer, a farm-robot technician and a rescue pilot.',
      lines: [
        { who: 'guest', guestName: 'Captain Lars', line: 'These robots will help the islands — and so will the people who look after them.' },
        { who: 'guest', guestName: 'Dr Imani, a marine engineer', line: 'I design robots that check the sea wall underwater. A cable sends me pictures; I decide where it looks.' },
      ],
      seconds: 35,
    },
    {
      setting: 'The farm. A robot weeds between rows while a technician in overalls checks its wheels.',
      action: 'The technician wipes a sensor clean; the robot beeps and carries on.',
      lines: [
        { who: 'guest', guestName: 'Sam, a farm-robot technician', line: 'The robot weeds by itself. I keep it working, plan its jobs and stop it if a lamb wanders in.' },
        { who: 'amara', line: 'So the robot is autonomous… but people are still in charge.' },
      ],
      seconds: 35,
    },
    {
      setting: 'A dark sea cave at the edge of the harbour, storm waves outside.',
      action: 'The post rover, headlight on, follows the cave wall to a trapped crab-fishing buoy beacon and brings it out. The rescue pilot watches on a screen.',
      lines: [
        { who: 'guest', guestName: 'Captain Lars', line: 'You switched on the light and let your sensor guide the way. That is how rescue robots work.' },
        { who: 'spark', line: 'Which robot job would you like to try one day, and what would you need to learn? Tell your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 40,
    },
  ], 'The ferry is nearly fixed. The islanders ask one last thing: a grand delivery round, designed by you.', 'Last time, the post rover passed ten runs in a row.'),
  theatre: 'rover-on-mars',
  build: {
    part: { slot: 'tool', id: 'light' },
    action: 'swap',
    narration: 'Swap in the headlight for the cave rescue.',
    why: 'In a dark cave the light lets the camera and the people watching see — light and sensor work together in one control loop.',
    tryWithout: 'Without the light the camera sees nothing and the rescue pilot is blind too.',
    physicsEffect: 'light_on takes effect at once; in dark arenas camera readings only work with the light on.',
    realWorld: 'Rescue robots that search collapsed buildings and underwater robots that inspect dams carry bright lights and cameras.',
  },
  arena: { kind: 'code-lab', id: 'cave-rescue', task: 'Stretch (pairs): combine the light and the wall sensor in one loop to reach the rescue target.', why: 'A verified mission that combines an actuator (light) and a sensor (walls) in one control loop — a real rescue robot pattern.' },
  activities: [
    { id: 'space-bu-01', why: 'Robots of the deep blue: who builds and runs them?' },
    { id: 'world-bu-01', why: 'Robots on the job, worldwide.' },
    { id: 'ocean-sort-rov-or-auv', why: 'Cable robot or free robot? What the robot decides, and what people do.' },
  ],
  challenge: { game: 'smart-farm', tier: 1, goal: 'On Pilot, place soil sensors in sandy, loam and clay soil, set each valve’s threshold, and plan a drone survey.', link: 'Farm-robot technicians and agronomists do exactly this: decide where sensors go and what the robots should do with the readings.' },
  quiz: Q23,
  badge: { id: 'l2-careers', name: 'Robot Crew', icon: '👩‍🔧', earnedFor: 'You can name jobs people do with robots and explain what people still decide.' },
  reward: { note: 'The new robot crew appears in the harbour on your season map.' },
  teacher: teacher({
    timing: lessonTiming('Who does what?'),
    unpluggedWarmup: {
      title: 'Who does what?', minutes: 5,
      steps: [
        'Show three robot pictures (underwater, farm, rescue drone). For each, pairs list everyone who works with it: who designs, builds, programs, drives, repairs, decides.',
        'Collect answers on the board; add any missing ones (tester, safety inspector, trainer).',
        'Ask: which of these jobs need people skills? Hands-on skills?',
      ],
      materials: ['Three robot pictures'],
    },
    discussion: [
      'What does an autonomous robot decide, and what do people decide?',
      'Which robot job would you choose, and why?',
      'What school subjects help with these jobs?',
    ],
    differentiation: {
      faster: ['Write a job advert for a robot technician on the islands: skills, tasks, why it matters.', 'Compare a tethered and an autonomous underwater robot: who decides what?'],
      slower: ['Match job cards to robot pictures.', 'Draw yourself doing one robot job and say one thing you would do.'],
    },
    notes: ['Careers for everyone: show robot jobs done by people of every background, and jobs that need hands-on, people and creative skills as well as coding.'],
  }, Q23),
  parent: {
    today: 'Your child met the jobs behind sea, farm and rescue robots — engineers, technicians, pilots — talked about what robots decide alone and what people still decide, and ran a cave rescue with a light and a sensor.',
    tryAtHome: 'Next time you see a machine at work (a street sweeper, a delivery van, a farm machine), wonder together: who designs, drives, repairs and supervises it?',
    askYourChild: 'Which robot job would you like, and what would you need to learn?',
  },
}

// ── 24 ───────────────────────────────────────────────────────────────────
const Q24: L2Quiz = [
  {
    prompt: 'Your grand route has three stops with different challenges. How do you build it?',
    options: [
      { text: 'One leg at a time, testing each before joining them', icon: '🧩' },
      { text: 'All at once, then run it', icon: '📜', misconception: 'worked-once-done' },
      { text: 'Copy the lighthouse route and hope', icon: '🤞', misconception: 'one-run-proves' },
    ],
    answer: 0,
    why: 'Decompose: build and test each leg, then join them, then test the whole route many times.',
  },
  {
    prompt: 'Your route must stop for anything in the way. Where does that check go?',
    options: [
      { text: 'Once, at the very start', icon: '1️⃣', misconception: 'if-checks-forever' },
      { text: 'Inside every loop that moves the robot', icon: '🔁' },
      { text: 'Nowhere — obstacles never appear', icon: '🙈', misconception: 'sensors-always-right' },
    ],
    answer: 1,
    why: 'An obstacle can appear at any moment, so the check must be made again and again while the robot moves.',
  },
  {
    prompt: 'Your route worked ten times from one start, but the brief says two starts. Is it finished?',
    options: [
      { text: 'Yes — ten times is plenty', icon: '🔟', misconception: 'worked-once-done' },
      { text: 'Yes — the other start is the same really', icon: '🟰', misconception: 'one-run-proves' },
      { text: 'No — test it from the second start too, and fix anything that fails', icon: '🧪' },
    ],
    answer: 2,
    why: 'A design is finished when it meets the whole brief. Different starts can reveal new bugs.',
  },
]

const S24: L2Session = {
  id: 'L2-S24', level: 2, number: 24, kind: 'project', durationMin: L2_LESSON_MIN,
  title: 'Make It Yours: The Island Post Grand Route',
  objective: 'Plan and run a multi-stop delivery across the islands using everything from the season.',
  objectives: [
    obj('L2-S24-O1', 'Plans a three-stop route where each leg needs a different skill (measure, line, colour or distance), decomposes it and tests each leg.', 'I can plan a route with three different challenges and build it leg by leg.', ['decomposition', 'design-process'], ['algorithms', 'engineering-design']),
    obj('L2-S24-O2', 'Uses if / else, a loop and a sensor-based obstacle stop, and tests from two starts until it is reliable.', 'I can make my route safe and reliable from two starts.', ['conditions', 'sensors'], ['programming', 'debugging']),
  ],
  concepts: ['design-process', 'decomposition', 'sensors', 'conditions'],
  newBlocks: [],
  episode: episode('The Grand Route', [
    {
      setting: 'The harbour at sunset. The repaired ferry sounds its horn. Islanders crowd the jetty: Keeper Mele, Kofi, Farmer Anahí, Mr Tavita, Ms Hana, Postmaster Yusuf.',
      action: 'Postmaster Yusuf unrolls the post office map with every child’s island on it.',
      lines: [
        { who: 'guest', guestName: 'Postmaster Yusuf', line: 'The ferry is back — but we want to keep our robot post. One last job: a grand round. Three stops. Your design.' },
        { who: 'spark', line: 'Measure, follow, sort, sense, stop for people. Everything you learned this season!' },
      ],
      seconds: 30,
    },
    {
      setting: 'Across the islands at night, lanterns along the paths.',
      action: 'Robot after robot sets off: following the line to the lighthouse, measuring across the rocks, sorting at the beach, stopping for a lamb on the farm road. The islanders cheer at every stop.',
      lines: [
        { who: 'guest', guestName: 'Mr Tavita', line: 'Post from the island school — spoken loud and clear. Wonderful.' },
        { who: 'amara', line: 'Every robot, a different route. Every route, ten times out of ten.' },
        { who: 'guest', guestName: 'Dr Imani, a marine engineer', line: 'From the ferry: I work on a research station on a mountain ridge. We could use engineers like you.', direction: 'A hook to Level 3.' },
      ],
      seconds: 40,
    },
  ], 'The islands keep their robot post — and a scientist on the ferry asks for help on a mountain ridge.', 'Last time, the children met the people who build sea and farm robots.'),
  build: {
    part: { slot: 'tool', id: 'child-choice' },
    action: 'choose',
    narration: 'Choose the tool your grand route needs.',
    why: 'Every stop needs a reason for each part. Pick the tool your plan uses most, and be ready to explain why.',
    tryWithout: 'The wrong tool means a stop you cannot complete.',
    physicsEffect: 'Your whole robot — drive, sensor, head and tool — behaves as you have learned all season.',
    realWorld: 'Real delivery robots are configured for their route: the parts depend on the job.',
  },
  arena: { kind: 'code-lab', id: 'colour-maze', task: 'Warm-up (pairs): combine two sensors — one decides WHEN to turn, the other WHICH way. Then build your grand route leg by leg.', why: 'A verified two-sensor mission: the combination the grand route needs, before children build their own legs.' },
  activities: [
    { id: 'farm-plan-tractor-to-the-barn', why: 'Plan the tractor home round the muddy patch.' },
    { id: 'city-flow-crossing-robot', why: 'Program the crossing robot: stop for people, every time.' },
    { id: 'farm-flowchart-smart-sprinkler', why: 'The smart sprinkler: a sensor, a choice and a loop.' },
  ],
  challenge: { game: 'robot-surgeon', tier: 0, goal: 'On Cadet, deliver to all three ward doors and return to the charger without bumping anyone — beat your session 5 best.', link: 'A three-stop hospital round is the same design as your grand route: plan the legs, stop for people, come home safely.' },
  quiz: Q24,
  badge: { id: 'l2-grandroute', name: 'Island Post Engineer', icon: '🏝️', earnedFor: 'You designed, built and tested a three-stop delivery that uses everything from the season.' },
  reward: { note: 'All five islands light up on your season map. Level 3 is waiting on the ridge.' },
  project: l2Project(24),
  teacher: teacher({
    timing: projectTiming(),
    unpluggedWarmup: {
      title: 'Grand route plan', minutes: 7,
      steps: [
        'Choose three stops and the skill each needs (measure, follow a line, colour or distance). Draw the route and label each leg.',
        'Mark where the obstacle check goes (inside every moving loop) and how the robot knows it is home.',
        'Write the test plan: two starts, ten runs, a column for what went wrong.',
      ],
      materials: ['Planning sheets', 'Test-log sheets'],
    },
    discussion: [
      'Which design decision are you proudest of?',
      'Which bug was hardest to find, and how did you find it?',
      'What would the islanders say about your route?',
    ],
    differentiation: {
      faster: ['Add a fourth stop or a time-out that calls for help.', 'Explain your design to someone who has never seen it, using only your plan.'],
      slower: ['Three stops, two different skills; use earlier session programs as legs.', 'Five runs from each start instead of ten.'],
    },
  }, Q24),
  parent: {
    today: 'Your child finished Level 2 by designing and testing their own three-stop delivery across the Windward Isles, using measuring, line following, sensors, if / else and loops — reliable from two different starts.',
    tryAtHome: 'Ask your child to plan a three-stop errand at home as a robot route (“to the kitchen, follow the hall, stop at the door”). Then follow it exactly.',
    askYourChild: 'Explain your grand route to me as if I had never seen it.',
  },
}

export const ACT4: L2Session[] = [S19, S20, S21, S22, S23, S24]
