// lib/kids/curriculum/level2/act2.ts
// Level 2, Act 2 (sessions 7–12): "The Lighthouse Line".
// A painted line to the lighthouse, followed with if / else; forever loops that
// end; choices at junctions with and / or / not; the tide timer; debugging like
// an engineer; and the Lighthouse Delivery project.

import { l2Project } from './act1'
import { episode, L2_LESSON_MIN, lessonTiming, obj, projectTiming, teacher } from './shared'
import type { L2Quiz, L2Session } from './types'

// ── 7 ────────────────────────────────────────────────────────────────────
const Q7: L2Quiz = [
  {
    prompt: 'The line sensor sits under the rover. What does it tell the program?',
    options: [
      { text: 'Where the whole line goes, like a map', icon: '🗺️', misconception: 'sensor-sees-everything' },
      { text: 'Only “dark line here” or “no line here”, right under itself', icon: '⚫' },
      { text: 'Which way to steer', icon: '🧭', misconception: 'parts-do-everything' },
    ],
    answer: 1,
    why: 'A simple line sensor only answers one question, again and again: is it dark right under me? The PROGRAM decides how to steer from that.',
  },
  {
    prompt: 'forever { if line_seen { curve left } else { curve right } }. What does the rover do?',
    options: [
      { text: 'Wiggles along the edge of the line', icon: '〰️' },
      { text: 'Curves left and right at the same time', icon: '🔀', misconception: 'else-optional-means-nothing' },
      { text: 'Checks once at the start, then drives straight', icon: '1️⃣', misconception: 'if-checks-forever' },
    ],
    answer: 0,
    why: 'Each time round the loop, exactly one branch runs. On the line it curves one way, off the line the other way — so it zig-zags along the edge.',
  },
  {
    prompt: 'You take the forever loop away and keep just the if / else. What happens?',
    options: [
      { text: 'It still follows the whole line', icon: '✅', misconception: 'if-checks-forever' },
      { text: 'It checks the sensor once and then the program ends', icon: '⏹️' },
      { text: 'It follows the line backwards', icon: '⬅️', misconception: 'not-flips-action' },
    ],
    answer: 1,
    why: 'An if checks only at the moment the program reaches it. To keep checking, it must be inside a loop.',
  },
]

const S07: L2Session = {
  id: 'L2-S07', level: 2, number: 7, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Follow the Painted Line',
  objective: 'Add a line sensor and follow a line with if / else (wiggle left, wiggle right).',
  objectives: [
    obj('L2-S07-O1', 'Programs edge-following with if / else on line_seen inside a loop, and explains the wiggle as constant correction.', 'I can make my robot follow a line with if / else.', ['sensors', 'conditions'], ['programming', 'algorithms']),
    obj('L2-S07-O2', 'Explains that an if is checked once each time the program reaches it, so following needs a loop.', 'I can explain why the if must be inside a loop.', ['conditions', 'feedback-control'], ['algorithms', 'computing-systems']),
  ],
  concepts: ['sensors', 'conditions', 'feedback-control'],
  newBlocks: ['line_seen', 'if_else'],
  episode: episode('The Painted Line', [
    {
      setting: 'The causeway path to the lighthouse, early evening. A white line painted down the middle, wiggling round rocks.',
      action: 'Spark calls on the radio. Only static. Amara looks worried at the dark lighthouse.',
      lines: [
        { who: 'amara', line: 'Keeper Mele, can you hear us? … Nothing. And her lamp is not lit.' },
        { who: 'spark', line: 'The painted line goes all the way to her door. If our robot could follow it, it could take her a radio battery tonight.' },
      ],
      seconds: 30,
    },
    {
      setting: 'Under the robot: a small sensor shining a light on the ground.',
      action: 'X-ray view: over the white paint the sensor glows; over dark rock it goes dim. A word pops up: LINE / NO LINE.',
      lines: [
        { who: 'spark', line: 'The line sensor shines a light down and measures what bounces back. Paint bounces a lot; rock, a little.' },
        { who: 'amara', line: 'But it only sees one spot. How does it follow a whole wiggly line?' },
        { who: 'spark', line: 'If I see the line, curve one way. Else, curve the other. And keep asking, forever.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The causeway at dusk, the robot’s path drawn as a glowing trail.',
      action: 'The robot zig-zags along the edge of the line, wiggle, wiggle, all the way to the lighthouse door.',
      lines: [
        { who: 'amara', line: 'It wiggles like a snake — but it never loses the line!' },
        { who: 'spark', line: 'Every wiggle is a tiny correction. Check, correct, check again. What would happen with only one check? Tell your partner.', direction: 'Spark turns to the camera.' },
      ],
      seconds: 35,
    },
  ], 'The battery reaches the door, but the robot never stops: it follows the line round the lighthouse again and again.', 'Last time, children drew their own island maps.'),
  theatre: 'line-follower-race',
  build: {
    part: { slot: 'sensor', id: 'line' },
    action: 'add',
    narration: 'Snap the line sensor under the front of your robot, close to the ground.',
    why: 'It tells the program “line” or “no line” right under the robot, many times a second, so the robot can steer back every time it drifts.',
    tryWithout: 'Without it the robot drives blind: the first bend in the line and it is gone.',
    physicsEffect: 'line_seen is true when the sensor is over the painted line. The sensor sits at the front, so the robot reacts a little after the line bends.',
    realWorld: 'Factory and hospital robots follow lines or tape on the floor to carry parts and medicine along fixed routes.',
  },
  arena: { kind: 'code-lab', id: 'line-follower', task: 'Follow the line to the flag: check the sensor, correct, repeat.', why: 'A verified mission solved by an if / else inside a loop — the exact structure of the session.' },
  activities: [
    { id: 'sensors-bu-08', why: 'Flowchart the edge-follower: what happens on the line, what happens off it?' },
    { id: 'sensors-bu-04', why: 'Read a real line-sensor trace and count the lines.' },
    { id: 'control-bu-02', why: 'Water the thirsty plant: if it is dry, water; else, wait.' },
  ],
  challenge: { game: 'sumo-arena', tier: 1, goal: 'On Pilot, win with your three rule cards — the edge sensor rule keeps you in the ring.', link: 'The sumo robot checks its edge sensor many times a second: if it sees the white edge, back off; else, keep pushing. If / else in a loop!' },
  quiz: Q7,
  badge: { id: 'l2-liner', name: 'Line Follower', icon: '〽️', earnedFor: 'You can follow a line with if / else in a loop and explain why it wiggles.' },
  reward: { unlocks: { slot: 'sensor', id: 'line' }, note: 'The line sensor joins your robot.' },
  teacher: teacher({
    timing: lessonTiming('Blindfold line walk'),
    unpluggedWarmup: {
      title: 'Feet on the line', minutes: 5,
      steps: [
        'Tape a wiggly line on the floor. A volunteer walks it looking only at their feet, saying “line!” or “no line!” at each step.',
        'Rule: on the line, step a little left; off the line, step a little right. Does it work?',
        'Ask: how many times did you have to check? (Every step: a loop.)',
      ],
      materials: ['Masking tape'],
    },
    discussion: [
      'Why does a line follower wiggle?',
      'What would make the wiggle smaller? (Smaller corrections, checking more often.)',
      'Where have you seen robots or vehicles follow lines?',
    ],
    extra: ['sensors-always-right'],
    differentiation: {
      faster: ['Make the wiggle gentler by changing the curve powers. What is the trade-off?', 'Follow the other edge of the line: what must change?'],
      slower: ['Start from a program with the if / else given; children choose the two curves.', 'Act out the rule with the tape line again, then run it.'],
    },
  }, Q7),
  parent: {
    today: 'Your child fitted a line sensor and made their robot follow a painted line using if / else inside a loop: on the line, curve one way; off it, curve the other — checking again and again.',
    tryAtHome: 'Lay a string in curves on the floor. Walk it looking only at your feet and using the same rule: on the string, step left; off it, step right.',
    askYourChild: 'Why does your robot wiggle when it follows the line?',
  },
}

// ── 8 ────────────────────────────────────────────────────────────────────
const Q8: L2Quiz = [
  {
    prompt: 'The rover follows the line forever, round and round the lighthouse. What is the safest fix?',
    options: [
      { text: 'Repeat until it sees the doormat, then stop', icon: '🛑' },
      { text: 'Leave it — forever loops are fine', icon: '♾️', misconception: 'forever-is-fine' },
      { text: 'Switch the robot off when it passes the door', icon: '🔌', misconception: 'stop-not-needed' },
    ],
    answer: 0,
    why: 'Every loop needs a way to end. “Repeat until” checks a condition each time round and stops the loop when it becomes true.',
  },
  {
    prompt: 'repeat until bumped { drive forward a little } — when does the robot check the bumper?',
    options: [
      { text: 'Only once, at the very start', icon: '1️⃣', misconception: 'if-checks-forever' },
      { text: 'Every time round the loop', icon: '🔁' },
      { text: 'Only after the loop has finished', icon: '🏁', misconception: 'loop-runs-once' },
    ],
    answer: 1,
    why: 'Repeat until asks its question each time round. As soon as the answer is “yes, bumped”, the loop ends.',
  },
  {
    prompt: 'Why does every real robot with a forever loop also have a big red stop button?',
    options: [
      { text: 'Because forever loops are always bugs', icon: '🐛', misconception: 'forever-is-fine' },
      { text: 'Because robots get tired', icon: '😴', misconception: 'robot-is-remote-control' },
      { text: 'So a person can always stop it safely if something unexpected happens', icon: '🔴' },
    ],
    answer: 2,
    why: 'A forever loop is useful (a fridge checks its temperature forever), but people must always be able to stop a moving machine.',
  },
]

const S08: L2Session = {
  id: 'L2-S08', level: 2, number: 8, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Forever and a Stop',
  objective: 'Use forever loops and repeat-until safely: every forever needs a way to end.',
  objectives: [
    obj('L2-S08-O1', 'Chooses between repeat, repeat until and forever, and gives every loop a safe ending condition.', 'I can choose the right loop and give it a way to stop.', ['loops', 'conditions'], ['programming', 'algorithms']),
    obj('L2-S08-O2', 'Explains why moving machines have an emergency stop even when their program is correct.', 'I can explain why every robot needs a stop button.', ['loops'], ['impacts-of-computing'], true),
  ],
  concepts: ['loops', 'conditions'],
  newBlocks: ['forever'],
  episode: episode('Round and Round the Lighthouse', [
    {
      setting: 'The foot of the lighthouse at night. A painted circle of line runs all the way round it.',
      action: 'The robot delivers the battery, then keeps following the circle line: round, round, round. Bolt chases it, dizzy.',
      lines: [
        { who: 'bolt', line: 'Beep-woof? Beep… woof…', direction: 'Bolt wobbles, dizzy.' },
        { who: 'amara', line: 'It delivered the battery — and then it just kept going! Forever!' },
        { who: 'spark', line: 'Because we wrote “forever”. Forever means forever.' },
      ],
      seconds: 35,
    },
    {
      setting: 'Inside the lighthouse. Keeper Mele, with a torch, opens the door; her big lamp is dark.',
      action: 'She points to a big red button on the lamp machine.',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'My lamp machine turns forever too — but it has a red stop button, and it stops when the sun comes up.' },
        { who: 'spark', line: 'A forever loop needs a way out. A sensor, a time or a person.' },
        { who: 'amara', line: 'There is a doormat at the door. Repeat until the robot sees the doormat, then stop!' },
      ],
      seconds: 45,
    },
    {
      setting: 'The lighthouse door, the robot parked neatly on the doormat.',
      action: 'The robot follows the line, reaches the mat, stops, beeps. Keeper Mele laughs.',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'Thank you for the battery. But my lamp is broken, not my radio. I could not call for help.' },
        { who: 'spark', line: 'What machines at home run forever? What stops them? Ask your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 30,
    },
  ], 'The lamp needs a new part from the post office — but the line splits at the harbour junction.', 'Last time, the robot followed the painted line with if / else.'),
  theatre: 'loop-de-loop-garden',
  build: {
    part: { slot: 'sensor', id: 'line' },
    action: 'inspect',
    narration: 'Look at the line sensor again. Today it decides when the loop ends, too.',
    why: 'The same sensor that steers can also spot a stopping place (a doormat, a crossing line), so the loop knows when to end.',
    tryWithout: 'With no way to sense the end, the only way out of a forever loop is a person pulling the plug.',
    physicsEffect: 'forever and repeat_until are capped by the simulator’s run-time limit, so a runaway program cannot run for ever on screen.',
    realWorld: 'Robot lawn mowers mow in a loop until a wire, a timer or a low battery tells them to go home.',
  },
  arena: { kind: 'code-lab', id: 'wall-sensor', task: 'Use repeat until with the wall sensor so the SAME program works in every arena — and stops by itself.', why: 'A verified mission with several arenas: one loop with an end condition solves them all.' },
  activities: [
    { id: 'code-bu-05', why: 'Fill the tank, then stop: a loop with an ending.' },
    { id: 'code-bu-04', why: 'Predict how many times the loop runs when loading the van.' },
    { id: 'control-bu-05', why: 'The night-time thermostat: a forever loop that is meant to run forever.' },
  ],
  challenge: { game: 'swarm-reef', tier: 0, goal: 'On Cadet, get most of the swarm to the food before time runs out.', link: 'Every swarm robot runs the same small loop again and again — sense, move, check — until it reaches the food.' },
  quiz: Q8,
  badge: { id: 'l2-looper', name: 'Safe Looper', icon: '🔁', earnedFor: 'You can choose the right loop and give it a safe way to stop.' },
  reward: { note: 'The lighthouse doormat appears on your season map.' },
  teacher: teacher({
    timing: lessonTiming('Forever clapping'),
    unpluggedWarmup: {
      title: 'Forever clapping', minutes: 5,
      steps: [
        'Say: “Clap forever.” Let it run a few seconds. Ask: how will this end? (It cannot, unless someone breaks the rule.)',
        'Now: “Clap UNTIL I raise my hand.” Then: “Clap 5 times.” Compare the three loops.',
        'Ask for examples of each at home: repeat 5, repeat until, forever.',
      ],
      materials: ['None'],
    },
    discussion: [
      'When is a forever loop the right choice?',
      'What are three ways a loop can end?',
      'Who should be able to stop a robot, and how?',
    ],
    differentiation: {
      faster: ['Write a loop that ends on EITHER of two things (the doormat or 20 seconds) — preview of session 9 and 10.', 'Find a loop in the Galaxy activities that should NOT end, and explain why it is safe.'],
      slower: ['Sort the three loop types with picture cards before coding.', 'Use repeat until with the condition already chosen.'],
    },
  }, Q8),
  parent: {
    today: 'Your child used forever loops and repeat-until loops and learned the rule that every loop needs a way to end safely — and that every moving machine needs a stop button.',
    tryAtHome: 'Find things at home that repeat: the washing machine, a clock, a fridge. How does each one stop or know when to change?',
    askYourChild: 'What are the ways a loop can stop?',
  },
}

// ── 9 ────────────────────────────────────────────────────────────────────
const Q9: L2Quiz = [
  {
    prompt: 'At the junction the rover may cross only if the road is clear AND the light is green. The road is clear but the light is red. Does it cross?',
    options: [
      { text: 'Yes — one of them is true', icon: '✅', misconception: 'and-or-same' },
      { text: 'No — AND needs both to be true', icon: '⛔' },
      { text: 'Yes — red means go for robots', icon: '🔴', misconception: 'not-flips-action' },
    ],
    answer: 1,
    why: 'With AND, both parts must be true. Clear is true, green is false, so “clear AND green” is false: wait.',
  },
  {
    prompt: 'The rover should stop if it sees a person OR a dog. A dog runs out. What happens?',
    options: [
      { text: 'It keeps going — it needs both a person and a dog', icon: '🏃', misconception: 'and-or-same' },
      { text: 'It does the opposite of stopping', icon: '🔄', misconception: 'not-flips-action' },
      { text: 'It stops — OR needs just one to be true', icon: '🛑' },
    ],
    answer: 2,
    why: 'OR is true when at least one part is true. A dog alone is enough to stop.',
  },
  {
    prompt: 'What does “not line_seen” mean?',
    options: [
      { text: 'The sensor sees NO line right now', icon: '⬜' },
      { text: 'The robot drives backwards', icon: '⬅️', misconception: 'not-flips-action' },
      { text: 'The sensor is broken', icon: '💥', misconception: 'sensors-always-right' },
    ],
    answer: 0,
    why: 'NOT flips true and false. line_seen is true on the line, so “not line_seen” is true when the robot is off the line.',
  },
]

const S09: L2Session = {
  id: 'L2-S09', level: 2, number: 9, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Junctions and Choices',
  objective: 'Combine conditions with and / or / not to choose at a junction.',
  objectives: [
    obj('L2-S09-O1', 'Builds compound conditions with and / or / not and predicts their value for given sensor readings.', 'I can build a choice that uses and, or and not.', ['conditions'], ['programming', 'algorithms']),
    obj('L2-S09-O2', 'Breaks a junction decision into smaller yes/no questions before coding it.', 'I can break a big choice into small yes-or-no questions.', ['decomposition'], ['algorithms']),
  ],
  concepts: ['conditions', 'decomposition'],
  newBlocks: ['and', 'or', 'not'],
  episode: episode('The Harbour Junction', [
    {
      setting: 'The harbour, busy: fishing carts, a crossing with a small traffic light, the painted line splitting in two.',
      action: 'The robot reaches the split. One line goes to the post office, one to the fish market. A cart rolls across.',
      lines: [
        { who: 'amara', line: 'Two lines, a crossing and carts everywhere. How does the robot choose?' },
        { who: 'spark', line: 'One question at a time. Is the road clear? Is the light green? Is this the post office line?' },
      ],
      seconds: 35,
    },
    {
      setting: 'A chalkboard on the post office wall. Amara draws a flowchart with three diamonds.',
      action: 'Spark lights up words between the diamonds: AND, OR, NOT.',
      lines: [
        { who: 'spark', line: 'Cross only if the road is clear AND the light is green. Both must be true.' },
        { who: 'amara', line: 'Stop if there is a person OR a cart. Either one is enough!' },
        { who: 'spark', line: 'And NOT flips an answer: NOT line_seen means “I see no line”.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The junction again, the light turning green, the road empty.',
      action: 'The robot waits for a cart, waits for green, takes the post office line and rolls to the red door. Postmaster Yusuf hands over the lamp part.',
      lines: [
        { who: 'guest', guestName: 'Postmaster Yusuf', line: 'The new lamp part! Careful, it must be at the lighthouse before high tide.' },
        { who: 'spark', line: 'Clear AND green: when is that true? Clear OR green: when is that true? Try four cases with your partner.', direction: 'Spark holds up a card with two switches.' },
      ],
      seconds: 35,
    },
  ], 'The part is ready — but the causeway to the lighthouse floods every sixty seconds in the simulator’s tide.', 'Last time, the robot learned to end its loops safely.'),
  theatre: 'traffic-light-robot',
  build: {
    part: { slot: 'head', id: 'distance' },
    action: 'inspect',
    narration: 'Your robot has two senses now: Distance Eyes in front and the line sensor underneath.',
    why: 'Two sensors can be combined in one choice: “line seen AND nothing close” means “safe to follow the line”.',
    tryWithout: 'With only the line sensor, the robot would follow the line straight into a cart crossing the junction.',
    physicsEffect: 'distance_cm reads up to 200 cm (no echo = 200). Combining it with line_seen uses and / or / not blocks.',
    realWorld: 'Self-driving shuttles combine many sensor checks in one decision: lane seen AND path clear AND signal green.',
  },
  arena: { kind: 'code-lab', id: 'twisty-line', task: 'Stretch mission (pairs): follow the twisty line by trying options in order — an if inside an else.', why: 'A verified nested-condition mission; for Builders it is a stretch, worked in pairs with the navigator reading each condition aloud.' },
  activities: [
    { id: 'code-bu-08', why: 'Neither bump nor cliff: wire AND, OR and NOT for a safe robot.' },
    { id: 'electronics-bu-05', why: 'The garage door safety beam: a choice built from two conditions.' },
    { id: 'world-bu-04', why: 'The guard-door rule: when may the robot arm move?' },
  ],
  challenge: { game: 'robot-city', tier: 0, goal: 'On Cadet, get the delivery robot across all three crossings safely, answering its “Go?” at each kerb.', link: 'At every kerb the robot needs a compound answer: light green AND road clear AND no one stepping out.' },
  quiz: Q9,
  badge: { id: 'l2-chooser', name: 'Junction Judge', icon: '🔀', earnedFor: 'You can build choices with and, or and not, and break a big decision into small questions.' },
  reward: { note: 'The harbour junction lights up on your season map.' },
  teacher: teacher({
    timing: lessonTiming('Stand up if…'),
    unpluggedWarmup: {
      title: 'Stand up if…', minutes: 5,
      steps: [
        '“Stand up if you are wearing blue AND you have a pet.” Then “…blue OR a pet.” Count how many stand each time.',
        '“Stand up if you are NOT wearing blue.”',
        'Ask: which rule made more people stand, AND or OR? Why?',
      ],
      materials: ['None'],
    },
    discussion: [
      'When would a robot need AND? When OR?',
      'Why is “clear AND green” safer than “clear OR green” at a crossing?',
      'Can you say “not line_seen” in everyday words?',
    ],
    differentiation: {
      faster: ['Fill in a truth table for AND and OR with four rows.', 'Write the junction rule for a robot that must also avoid puddles.'],
      slower: ['Use two light switches (or cards) to act out AND and OR before coding.', 'Only AND today; OR and NOT with a teacher.'],
    },
  }, Q9),
  parent: {
    today: 'Your child combined conditions with and, or and not so their robot could make a careful choice at a junction — and broke a big decision into small yes-or-no questions.',
    tryAtHome: 'Play “stand up if…” at dinner: “…if you had fruit AND toast”, then “…fruit OR toast”. Who stands each time?',
    askYourChild: 'What is the difference between AND and OR?',
  },
}

// ── 10 ───────────────────────────────────────────────────────────────────
const Q10: L2Quiz = [
  {
    prompt: 'timer_s says 42. What does that mean?',
    options: [
      { text: 'It is 42 minutes past the hour', icon: '🕐', misconception: 'timer-is-clock' },
      { text: '42 seconds have passed since the program started', icon: '⏱️' },
      { text: 'The robot has 42 seconds of battery left', icon: '🔋', misconception: 'timer-is-clock' },
    ],
    answer: 1,
    why: 'The timer is a stopwatch: it counts seconds from the start of the program (or from a reset), not the time of day.',
  },
  {
    prompt: 'The causeway floods when the timer passes 60. Which rule is safest?',
    options: [
      { text: 'Wait 30 seconds, then go, every time', icon: '⏳', misconception: 'wait-for-event-guess' },
      { text: 'Go as fast as possible and hope', icon: '🤞', misconception: 'worked-once-done' },
      { text: 'Only start crossing if timer_s < 40, so there is time to get across', icon: '✅' },
    ],
    answer: 2,
    why: 'Checking the timer works whenever the robot arrives. A fixed wait only works if the robot always arrives at the same moment.',
  },
  {
    prompt: 'if timer_s > 60 and not at_lighthouse { say "Help!" } — when does the robot say help?',
    options: [
      { text: 'After 60 seconds, if it has not reached the lighthouse', icon: '🆘' },
      { text: 'As soon as it starts', icon: '🚦', misconception: 'if-checks-forever' },
      { text: 'Only when it reaches the lighthouse', icon: '🏁', misconception: 'not-flips-action' },
    ],
    answer: 0,
    why: 'Both parts must be true: more than 60 seconds AND not at the lighthouse. That is a time-out, a classic way to make robots safe.',
  },
]

const S10: L2Session = {
  id: 'L2-S10', level: 2, number: 10, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Tide Timer',
  objective: 'Use the timer to act on time (the causeway floods every 60 s).',
  objectives: [
    obj('L2-S10-O1', 'Uses timer_s in conditions to act at the right time and to add a time-out to a loop.', 'I can use the timer to decide when to act.', ['events-timing', 'conditions'], ['programming', 'mathematics-measurement']),
    obj('L2-S10-O2', 'Explains why checking a timer or sensor beats a guessed wait when the world changes.', 'I can explain why checking is better than guessing a wait.', ['events-timing'], ['algorithms']),
  ],
  concepts: ['events-timing', 'conditions'],
  newBlocks: ['timer_s'],
  episode: episode('Beat the Tide', [
    {
      setting: 'The causeway at sunset. Waves wash over it, then pull back, again and again.',
      action: 'A big tide clock by the path counts 0 to 60, then the sea covers the stones.',
      lines: [
        { who: 'narrator', line: 'In the simulator, the sea covers the causeway every sixty seconds.' },
        { who: 'amara', line: 'If the robot is halfway when the water comes — splash. The lamp part gets soaked.' },
      ],
      seconds: 30,
    },
    {
      setting: 'The post office. Spark shows a stopwatch hovering over the robot’s head: timer_s.',
      action: 'The stopwatch starts at 0 when the program starts. Spark draws: cross if timer < 40.',
      lines: [
        { who: 'spark', line: 'Your robot has a stopwatch inside: timer_s. It counts seconds from the start of the program.' },
        { who: 'amara', line: 'Crossing takes about 15 seconds. So only start if the timer says less than 40!' },
        { who: 'spark', line: 'And if something goes wrong and it is still not there after 60? Say “Help!” and stop. That is a time-out.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The causeway at dusk; the lighthouse lamp dark above.',
      action: 'The robot waits by the path while the timer passes 60 and resets; then it crosses with time to spare. Waves splash behind it.',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'Dry as a biscuit! Now I can mend the lamp.' },
        { who: 'spark', line: 'Why not just wait 30 seconds every time? When would that go wrong? Talk with your partner.', direction: 'Spark faces the camera.' },
      ],
      seconds: 35,
    },
  ], 'The lamp part is fitted — but when Keeper Mele switches it on, it blinks in the wrong pattern. A bug!', 'Last time, the robot made careful choices at the harbour junction.'),
  build: {
    part: { slot: 'body', id: 'box' },
    action: 'inspect',
    narration: 'Open the body again. The tiny computer has a stopwatch built in.',
    why: 'The timer lets the program decide by time — when to start, and when to give up and ask for help.',
    tryWithout: 'Without a timer the robot can only guess a wait, and a guess fails as soon as it arrives at a different moment.',
    physicsEffect: 'timer_s counts simulated seconds since the program started; the tide in the arena story is a 60-second cycle.',
    realWorld: 'Robots in hospitals and warehouses use time-outs: if a job takes far too long, they stop and call a person.',
  },
  arena: { kind: 'physics', id: 'follow-line', task: 'Follow the line to the green zone — and add a time-out: if timer_s goes past 30 before you arrive, stop and say "Help!".', why: 'The verified Physics Lab line arena offers timer_s and if blocks, so a time-out can be added to a working line follower.' },
  activities: [
    { id: 'city-predict-light-cycle', why: 'Count the green seconds: predict a traffic light’s timer loop.' },
    { id: 'world-bu-09', why: 'Robots on our street: what happens when, and who goes first?' },
  ],
  challenge: { game: 'robot-city', tier: 1, goal: 'On Pilot, choose a cruise speed and following gap that keep the car safe when the car ahead brakes and the fog rolls in.', link: 'A safe following gap is really a TIME: enough seconds to stop. Self-driving cars think in seconds, just like your tide timer.' },
  quiz: Q10,
  badge: { id: 'l2-tide', name: 'Tide Timer', icon: '⏱️', earnedFor: 'You can use the timer to act at the right time and add a time-out.' },
  reward: { note: 'The tide clock on the causeway appears on your season map.' },
  teacher: teacher({
    timing: lessonTiming('Silent 60'),
    unpluggedWarmup: {
      title: 'Silent sixty', minutes: 5,
      steps: [
        'Everyone stands, eyes closed, and sits down when they think 60 seconds have passed. The teacher times it.',
        'Repeat with a stopwatch on the board. Which way is more reliable?',
        'Ask: what is the difference between a stopwatch and a clock?',
      ],
      materials: ['A stopwatch or a timer on the board'],
    },
    discussion: [
      'Why is a time-out a safety feature?',
      'When would a fixed wait be good enough?',
      'What machines at home use a timer to decide?',
    ],
    differentiation: {
      faster: ['Make the robot wait for the NEXT safe window instead of giving up.', 'Add a second rule with “or”: stop if the timer passes 60 OR something is too close.'],
      slower: ['Use one timer rule only: say "Help!" if timer_s > 30.', 'Do the silent-sixty game again with a partner counting.'],
    },
  }, Q10),
  parent: {
    today: 'Your child used their robot’s built-in timer to cross a causeway before the tide, and added a time-out: if a job takes too long, stop and ask for help.',
    tryAtHome: 'Boil an egg or make toast with a timer instead of guessing. Talk about when guessing a time goes wrong.',
    askYourChild: 'What is a time-out, and why do robots need one?',
  },
}

// ── 11 ───────────────────────────────────────────────────────────────────
const Q11: L2Quiz = [
  {
    prompt: 'The robot turns the wrong way at the second corner. What do you do FIRST?',
    options: [
      { text: 'Predict what each block should do, then run and watch where it goes wrong', icon: '🔍' },
      { text: 'Delete the program and start again', icon: '🗑️', misconception: 'bug-means-start-again' },
      { text: 'Change all the turns at once', icon: '🔀', misconception: 'change-many-at-once' },
    ],
    answer: 0,
    why: 'Engineers predict, run and compare. The first place where the robot does something different from your prediction is where the bug is.',
  },
  {
    prompt: 'You change three numbers and now it works. What is the problem?',
    options: [
      { text: 'There is no problem — it works', icon: '👍', misconception: 'worked-once-done' },
      { text: 'You do not know which change fixed it, and one might break something else', icon: '❓' },
      { text: 'Three is an unlucky number', icon: '🎲', misconception: 'change-many-at-once' },
    ],
    answer: 1,
    why: 'Change one thing, test, and keep notes. Then you know exactly what fixed the bug.',
  },
  {
    prompt: 'The line follower stops in the middle. You add say(line_seen) inside the loop. Why?',
    options: [
      { text: 'To make the robot friendlier', icon: '😊', misconception: 'parts-do-everything' },
      { text: 'To make it go faster', icon: '⚡', misconception: 'bigger-number-faster' },
      { text: 'To see what the sensor reads at the moment it goes wrong', icon: '📢' },
    ],
    answer: 2,
    why: 'Reporting a sensor value lets you see what the program sees. Often the bug is that the robot sees something different from what you expected.',
  },
]

const S11: L2Session = {
  id: 'L2-S11', level: 2, number: 11, kind: 'lesson', durationMin: L2_LESSON_MIN,
  title: 'Debug Like an Engineer',
  objective: 'Predict, run, compare, and change one thing at a time; report sensor values with say.',
  objectives: [
    obj('L2-S11-O1', 'Debugs systematically: predicts each step, runs, finds the first difference, changes one thing and retests.', 'I can find a bug by predicting, running and comparing.', ['debugging'], ['debugging']),
    obj('L2-S11-O2', 'Uses say to report a sensor or timer value while the program runs.', 'I can make my robot tell me what its sensor sees.', ['debugging'], ['debugging', 'data']),
  ],
  concepts: ['debugging'],
  newBlocks: [],
  episode: episode('The Blinking Bug', [
    {
      setting: 'The top of the lighthouse at night. The big lamp blinks: long, long, short… then stops.',
      action: 'Keeper Mele looks at a card on the wall: LONG – SHORT – LONG – SHORT, forever.',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'Every lighthouse has its own pattern so ships know which one it is. Mine is long, short, long, short.' },
        { who: 'amara', line: 'Ours goes long, long, short, and then stops. Two bugs?' },
      ],
      seconds: 30,
    },
    {
      setting: 'The lamp room. Spark projects the program on the wall, block by block.',
      action: 'Amara points to each block and predicts. Spark runs it slowly; at the second block the light does something different from the prediction.',
      lines: [
        { who: 'spark', line: 'Engineers do not start again. They predict, run, and compare.' },
        { who: 'amara', line: 'I predicted short at the second blink — it did long. The bug is right there!' },
        { who: 'spark', line: 'Change ONE thing. Test. Then look for the next difference.' },
      ],
      seconds: 45,
    },
    {
      setting: 'The lamp room, a moment later. Over the lamp a little speech bubble shows the timer: “12 s… 13 s…”.',
      action: 'The robot says the timer out loud; at 20 seconds the loop ends. Amara spots a repeat 5 that should be forever. The lamp blinks its pattern, steady and true.',
      lines: [
        { who: 'amara', line: 'The robot told us the timer — and the loop stopped at five blinks. Repeat 5 should be forever!' },
        { who: 'guest', guestName: 'Keeper Mele', line: 'Long, short, long, short. That is my lighthouse!' },
        { who: 'spark', line: 'Two bugs, two changes, one at a time. Which bug would you have found first?', direction: 'Spark faces the camera.' },
      ],
      seconds: 40,
    },
  ], 'The lamp shines again. Next: a whole delivery route of your own to the lighthouse.', 'Last time, the robot raced the tide with a timer.'),
  theatre: 'spark-gets-lost',
  build: {
    part: { slot: 'head', id: 'screen' },
    action: 'swap',
    narration: 'Swap in the face screen. Today your robot tells you what it sees.',
    why: 'The face screen shows what Say reports — a sensor value, the timer — so you can see inside the program while it runs.',
    tryWithout: 'Without a way to report values you can only guess what the robot was “thinking” when it went wrong.',
    physicsEffect: 'say shows its text on the face screen and speaks it; reporting a value does not change how the robot moves.',
    realWorld: 'Engineers testing self-driving cars and space rovers watch live readouts of every sensor to find bugs.',
  },
  arena: { kind: 'code-lab', id: 'hop-the-hedges', task: 'Predict each step on paper first. Run it. Where does the robot first differ from your prediction? Fix that one thing.', why: 'A verified loop mission where the classic bug (the wrong part inside the loop) is easy to make and to find by predicting.' },
  activities: [
    { id: 'code-bu-03', why: 'Too many stairs: find the one wrong number.' },
    { id: 'code-bu-09', why: 'The turn outside the loop: a classic bug.' },
    { id: 'control-bu-03', why: 'Past the dock: why does the robot overshoot?' },
  ],
  challenge: { game: 'circuit-city', tier: 1, goal: 'On Pilot, light three streetlights brightly and keep two on when a storm knocks one out.', link: 'Electricians debug like engineers: test one part at a time and change one thing, until every light behaves.' },
  quiz: Q11,
  badge: { id: 'l2-debugger', name: 'Bug Engineer', icon: '🔍', earnedFor: 'You can find a bug by predicting, running and comparing, and change one thing at a time.' },
  reward: { note: 'The lighthouse shines on your season map, blinking its own pattern.' },
  teacher: teacher({
    timing: lessonTiming('Human robot with a bug'),
    unpluggedWarmup: {
      title: 'Human robot with a bug', minutes: 5,
      steps: [
        'Write a five-step program on the board to walk to the door. It contains one wrong turn.',
        'A volunteer follows it exactly; the class predicts each step before it happens.',
        'Stop at the first step where the prediction and the walk differ: that is the bug. Fix only that.',
      ],
      materials: ['Board'],
    },
    discussion: [
      'Why is “start again” usually slower than finding the bug?',
      'What does it mean to change one thing at a time?',
      'How did reporting a value with Say help?',
    ],
    extra: ['bug-means-start-again'],
    differentiation: {
      faster: ['Plant a bug in a partner’s program; they find it by predicting.', 'Report two values at once (the timer and the sensor) and explain the readout.'],
      slower: ['Debug a three-block program first, with the predicted path drawn on paper.', 'Use the Galaxy debug activities with a partner reading each block.'],
    },
  }, Q11),
  parent: {
    today: 'Your child practised debugging like an engineer: predict what should happen, run it, find the first difference, and change one thing at a time. They also made the robot report what its sensor sees.',
    tryAtHome: 'Next time something goes wrong (a recipe, a game, a bike chain), try the same steps together: predict, test, change one thing.',
    askYourChild: 'Why should you change only one thing at a time when fixing a bug?',
  },
}

// ── 12 ───────────────────────────────────────────────────────────────────
const Q12: L2Quiz = [
  {
    prompt: 'Your route has three legs: follow the line, measure 150 cm, follow the line again. What is the best way to build it?',
    options: [
      { text: 'Build and test each leg on its own, then join them', icon: '🧩' },
      { text: 'Write the whole route, then run it once', icon: '📜', misconception: 'worked-once-done' },
      { text: 'Use only line following — measuring is not needed', icon: '〽️', misconception: 'sensor-sees-everything' },
    ],
    answer: 0,
    why: 'Splitting a problem into legs (decomposition) means each piece can be tested and fixed on its own.',
  },
  {
    prompt: 'There is no painted line on the rocky part. What should the rover use there?',
    options: [
      { text: 'Keep using line following', icon: '〽️', misconception: 'sensor-sees-everything' },
      { text: 'drive_distance with a measured distance', icon: '📏' },
      { text: 'drive_for 3 seconds — time is the same as distance', icon: '⏱️', misconception: 'time-equals-distance' },
    ],
    answer: 1,
    why: 'Where there is no line, measured driving (encoders) gets the robot there, whatever its load.',
  },
  {
    prompt: 'How does your program know it has reached the lighthouse door?',
    options: [
      { text: 'It does not — someone switches it off', icon: '🔌', misconception: 'stop-not-needed' },
      { text: 'It follows the line forever', icon: '♾️', misconception: 'forever-is-fine' },
      { text: 'It senses the end (the doormat, a wall close by) and stops', icon: '🛑' },
    ],
    answer: 2,
    why: 'A good delivery program stops by itself, using a sensor to recognise the end of the route.',
  },
]

const S12: L2Session = {
  id: 'L2-S12', level: 2, number: 12, kind: 'project', durationMin: L2_LESSON_MIN,
  title: 'Make It Yours: The Lighthouse Delivery',
  objective: 'Design a route to the lighthouse that mixes line following and measured driving.',
  objectives: [
    obj('L2-S12-O1', 'Decomposes a route into legs, chooses line following or measured driving for each from the terrain, and tests each leg separately.', 'I can split a route into legs and test each one.', ['decomposition', 'design-process'], ['algorithms', 'engineering-design']),
    obj('L2-S12-O2', 'Ends the route with a sensor-based stop rather than relying on a person.', 'I can make my robot stop by itself at the end.', ['sensors'], ['programming']),
  ],
  concepts: ['design-process', 'sensors', 'decomposition'],
  newBlocks: [],
  episode: episode('A Parcel Every Evening', [
    {
      setting: 'The lighthouse balcony at sunset, the lamp turning. Keeper Mele with a pair of binoculars.',
      action: 'She points: the painted line stops at the rocks, then starts again at the lighthouse steps.',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'I would love a parcel every evening — bread, letters, a newspaper. But the line has a gap at the rocks.' },
        { who: 'spark', line: 'Then the route has legs: line, measured drive, line again. You design it!' },
      ],
      seconds: 30,
    },
    {
      setting: 'From the balcony, Keeper Mele looks down at the beach.',
      action: 'Through her binoculars: plastic bottles and nets washing up on the far beach, where the turtles nest.',
      lines: [
        { who: 'guest', guestName: 'Keeper Mele', line: 'Oh no. Look at the turtle beach. The storm is washing rubbish onto the nests.' },
        { who: 'amara', line: 'First the delivery. Then we help the turtles!' },
      ],
      seconds: 25,
    },
  ], 'Every pair’s rover brings the evening parcel — and the keeper has spotted rubbish washing up on the turtle beach.', 'Last time, the robot fixed the lighthouse’s blinking bug.'),
  build: {
    part: { slot: 'head', id: 'distance' },
    action: 'swap',
    narration: 'Swap the Distance Eyes back in. With the line sensor underneath, your route has everything it needs.',
    why: 'The line sensor steers where there is paint; the encoders measure where there is none; Distance Eyes or the doormat tell the robot it has arrived.',
    tryWithout: 'With only one way of moving, the route fails at the first stretch that does not suit it.',
    physicsEffect: 'Line legs and measured legs behave differently on rock; test each leg on the surface it really crosses.',
    realWorld: 'Real delivery robots switch between modes: following a mapped path, driving measured stretches, and stopping at a sensed door.',
  },
  arena: { kind: 'physics', id: 'lighthouse-route', task: 'Leg by leg: follow the line until it ends, drive a measured 40 cm across the gap, then stop in the green zone when the lighthouse wall is close. Test each leg on its own first.', why: 'Its own verified arena (Physics Lab “Lighthouse route”) built from three legs that each need a different skill: line_seen for the line, drive_distance for the gap, distance_cm for the stop.' },
  activities: [
    { id: 'motion-bu-07', why: 'Fewest squares to the dock: plan the route before you drive it.' },
    { id: 'design-bu-06', why: 'The greenhouse helper: choose the sensors your design needs.' },
    { id: 'sensors-bu-09', why: 'How fast is an echo? The maths behind Distance Eyes.' },
  ],
  challenge: { game: 'ocean-rescue', tier: 0, goal: 'On Cadet, ping the sonar, follow the arrow to the buoy, grab it and bring it up to the ship.', link: 'A rescue route has legs too: dive, search, grab, return. Each leg uses a different skill.' },
  quiz: Q12,
  badge: { id: 'l2-lighthouse', name: 'Lighthouse Courier', icon: '🗼', earnedFor: 'You designed a route with legs, chose the right skill for each, and made your robot stop by itself.' },
  reward: { note: 'The lighthouse keeper’s evening parcel route appears on your season map.' },
  project: l2Project(12),
  teacher: teacher({
    timing: projectTiming(),
    unpluggedWarmup: {
      title: 'Route on paper', minutes: 7,
      steps: [
        'Draw the route on the planning sheet and split it into legs. Label each leg: LINE or MEASURE (with a distance).',
        'Mark the end: how will the robot know it has arrived?',
        'Agree a test order: leg 1 alone, leg 2 alone, then joined.',
      ],
      materials: ['Planning sheets', 'Rulers'],
    },
    discussion: [
      'Which leg was hardest, and why?',
      'How did testing legs separately help?',
      'How does your robot know it has arrived?',
    ],
    differentiation: {
      faster: ['Add a time-out so the robot says "Help!" if it has not arrived in time.', 'Make the route work from two different start points.'],
      slower: ['Two legs only: line, then measured drive to the door.', 'Use a leg template on the planning sheet.'],
    },
  }, Q12),
  parent: {
    today: 'Your child designed their own delivery route to the lighthouse, splitting it into legs that follow a line or drive a measured distance, and made the robot stop by itself at the end.',
    tryAtHome: 'Plan a route through your home as legs (“to the door: 6 steps; follow the hallway to the kitchen”). Can someone else follow it exactly?',
    askYourChild: 'How did you split your route into legs?',
  },
}

export const ACT2: L2Session[] = [S07, S08, S09, S10, S11, S12]
