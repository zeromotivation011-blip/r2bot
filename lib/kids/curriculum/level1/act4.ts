// lib/kids/curriculum/level1/act4.ts
// Level 1, Act 4 (sessions 19–24): "Feel, Hear, Shine".
// Fog covers the top of Lantern Hill, so seeing is no help. The robot learns
// to feel its way with a bumper, to make a choice ("if I feel a bump…"), to
// hear echoes like a bat, to stop for people, and to climb the clock tower
// with a sensor instead of counting. The season ends with the Night of a
// Hundred Lights — the fourth "Make it yours" project — and the certificate.
//
// Sensors arrive gently and late, as decided: one sensor at a time, always
// wrapped in a single picture block ("Keep going until I feel a bump").
// The point each time is the same big idea: counting hops only works when you
// already know the map; a sensor lets the robot find out for itself.

import type { AllowedBlock, Session } from '../types'
import {
  BACK_OFF, BEEP, CLEAR_CM, CLOSE_CM, CREEP, CREEP_CM, FLAT_MAT_PHYSICS, HOP, HOP_BACK, HOP_PCT, IF_BUMP, LEFT, LIGHT_OFF, LIGHT_ON,
  OBSTACLE_MIN_CM, PART_MASS_KG, PEN_DOWN, PEN_UP, REPEAT, RIGHT, SCOOP_UP, TILE_CM, TIP_OUT, UNTIL_BUMP, UNTIL_CLOSE, WAIT, WAIT_CLEAR,
  arena, episode, kg, lessonTiming, obj, projectTiming, say, teacher,
} from './shared'
import { L1_PROJECTS } from './projects'

// ── Act 4 picture blocks ──────────────────────────────────────────────────

/** A loop with a big count, for sensor programs where the child does not know the map. */
const REPEAT_LOTS: AllowedBlock = { id: 'repeat', label: 'Repeat lots of times', choices: { n: [10, 20, 40] } }

// ── Act 4 physics ─────────────────────────────────────────────────────────

const FOG_PHYSICS =
  `${FLAT_MAT_PHYSICS} Visual fog: the 3D view and any camera see about one tile. ` +
  'Fog does not change touch (bumper) or sound (echo distance sensor) readings. ' +
  `Creep = drive_for(30 %, 0.5 s) ≈ ${CREEP_CM} cm. Back off = drive_for(−30 %, 1 s) ≈ ${2 * CREEP_CM} cm. The bumper is a soft foam strip on a switch: it clicks at a light touch (about 1 N) and absorbs the small push of the rest of a creep.`

const ECHO_PHYSICS =
  `${FOG_PHYSICS} Distance Eyes: ultrasonic, measures 3–200 cm straight ahead in a narrow cone (±12° to the sides, tilting down to 30° so low things ahead are found too), about ±1 cm on hard flat surfaces; reads 200 when nothing echoes. ` +
  'Soft surfaces (hay bales, curtains, fur costumes) return a weaker echo; the simulator still detects them at this range but shows a fainter echo ring.'

const RAMP_PHYSICS =
  `${ECHO_PHYSICS} Tower ramps rise at 10°: the same creep covers less ground uphill (part of the motor’s push goes into lifting the robot). Ramp surfaces are not seen as obstacles; the walls at the end of each ramp are ${OBSTACLE_MIN_CM} cm tall or more.`

// ── Sessions ──────────────────────────────────────────────────────────────

export const ACT4: Session[] = [
  // ── 19 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S19', level: 1, number: 19, kind: 'lesson', durationMin: 40,
    title: 'Feel Your Way',
    objective: 'Add a bumper — a touch sensor — and make the robot keep going until it feels a bump.',
    objectives: [
      obj('L1-S19-O1', 'Identifies a bumper as a touch sensor: the part that lets a robot sense touching something.', 'I know a bumper helps my robot feel a touch.', ['sensors', 'sense-think-act'], ['computing-systems']),
      obj('L1-S19-O2', 'Uses a "repeat until" loop that stops when a sensor detects something, and explains why counting fails when the distance is unknown.', 'I can make my robot keep going until it feels a bump.', ['loops', 'sensors'], ['programming', 'algorithms']),
    ],
    concepts: ['sensors', 'sense-think-act', 'loops'],
    newBlocks: ['repeat_until', 'bumped'],
    episode: episode('Lost in the Fog', [
      {
        setting: 'Morning at Nana Lucía’s house at the top of the hill. Thick white fog outside every window.',
        action: 'Amara opens the door: she can barely see her own hand. Spark switches on the robot’s headlight — the beam just makes the fog glow white.',
        lines: [
          { who: 'amara', line: 'I can’t see anything! Not the clock, not the garden.' },
          { who: 'spark', line: 'The light bounces off the fog, right back at us. Seeing is no help today.' },
        ],
        seconds: 35,
      },
      {
        setting: 'Inside. Nana Lucía closes her eyes and walks across the room with one hand out, touching the wall.',
        action: 'She reaches the door frame by touch. The children copy her, giggling, hands out.',
        lines: [
          { who: 'lucia', line: 'When I can’t see, I feel my way. My hand tells me: wall!' },
          { who: 'lucia', line: 'Your robot can feel too — with a bumper.' },
        ],
        seconds: 35,
      },
      {
        setting: 'Close-up of the robot. A soft foam strip clicks onto its front. Inside, a tiny switch.',
        action: 'Spark presses the foam with one finger: “click!” A little light flashes on the robot.',
        lines: [
          { who: 'spark', line: 'Touch the bumper… click! Now your robot knows: I touched something!' },
          { who: 'spark', line: 'That is a sensor. A sensor helps a robot feel or see the world.' },
        ],
        seconds: 35,
      },
      {
        setting: 'The foggy garden path. The garden wall is somewhere ahead — nobody knows how far.',
        action: 'Amara counts hops: “three hops!” The robot stops in the middle of nowhere. She tries five: it bumps hard. Spark shakes his head.',
        lines: [
          { who: 'amara', line: 'I don’t know how far the wall is. How many hops?' },
          { who: 'spark', line: 'You don’t need to know! Tell your robot: keep going until you feel a bump.' },
          { who: 'myrobot', line: 'Going… going… click! Found the wall!' },
        ],
        seconds: 45,
      },
      {
        setting: 'Along the garden wall to the gate.',
        action: 'The robot feels its way: forward to the wall, a little back, turn, forward to the corner. In the corner, half hidden in the ivy, something glows warm and yellow.',
        lines: [
          { who: 'amara', line: 'Light number ten! It was in the ivy by the gate!' },
          { who: 'bolt', line: 'Woof!', direction: 'Bolt runs off into the fog, chasing a sound.' },
          { who: 'amara', line: 'Bolt! Come back!' },
        ],
        seconds: 40,
      },
    ], 'Ten lights! But Bolt has run off into the foggy hedge maze. How will the robot find him when it cannot see the paths?', 'They sheltered at Nana’s house. Nine lights found — but fog covered the whole hill…'),
    build: {
      part: { slot: 'sensor', id: 'bumper' },
      action: 'add',
      narration: 'Click the soft bumper onto the front of your robot. Press it with your finger. Click!',
      why: 'A bumper is a touch sensor. It tells the robot “I touched something”, even in fog or in the dark.',
      tryWithout: 'Without a bumper, the robot cannot tell it reached the wall. It keeps pushing, its wheels spin, and it wastes battery.',
      physicsEffect: `Adds ${kg(PART_MASS_KG.sensor.bumper)} at the front. The switch closes at a light touch (about 1 newton) and the foam softens the bump.`,
      realWorld: 'Robot vacuum cleaners have a bumper that clicks when they touch a sofa leg; then they back up and turn.',
    },
    code: {
      title: 'Find the Wall',
      mission: 'The garden wall is somewhere ahead in the fog. Keep going until you feel a bump, then say “Found the wall!”.',
      arena: arena({
        id: 'l1-fog-lane', name: 'Foggy garden path',
        description: 'A straight garden path in thick fog. The wall at the end is hidden. Each time you press Go, the wall is a different distance away (3, 4 or 5 squares).',
        gridTiles: { cols: 1, rows: 6 }, floor: 'grass',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Touch the garden wall with the bumper, then say the words.',
        features: ['Garden wall placed at random 3, 4 or 5 tiles ahead on each run', 'Fog: the child sees about one tile ahead', 'The bumper flashes when it clicks'],
        physics: FOG_PHYSICS.replace('a printed mat', 'short grass'), requires: ['move', 'feel-bump'],
      }),
      allowedBlocks: [HOP, CREEP, UNTIL_BUMP, say('Found the wall!')],
      starter: ['drive_for(80, 3)  ← counting does not work when the wall moves!'],
      exampleSolution: ['repeat_until(bumped) {', '  drive_for(30, 0.5)', '}', 'say("Found the wall!")'],
      success: [
        { kind: 'touch-and-react', detail: 'The bumper clicks against the wall and the say block runs after the click, on three runs in a row with different wall distances.' },
      ],
      stars: { two: 'It works when the wall moves.', three: 'You can say why counting hops did not work.' },
      hints: [
        'You don’t know how far the wall is. So don’t count. Feel!',
        'Put “Creep forward” inside “Keep going until I feel a bump”.',
        'Keep going until I feel a bump → Creep forward. Then Say.',
      ],
    },
    challenge: {
      title: 'Feel Along to the Gate',
      mission: 'Light number ten is in the corner by the gate. Feel your way to the wall, back off a little, turn right, and feel your way to the corner.',
      arena: arena({
        id: 'l1-fog-garden', name: 'Foggy garden',
        description: 'A small walled garden in fog. You start somewhere on the left side. The gate is in the top-right corner.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'grass',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Bumper touches the right-hand wall in tile (3,0), where light 10 glows in the ivy.',
        features: ['Walls on all four sides', 'Start row is random (row 2 or 3) on each run', 'Light 10 in the ivy at (3,0)'],
        physics: FOG_PHYSICS.replace('a printed mat', 'short grass'), requires: ['move', 'feel-bump'],
      }),
      allowedBlocks: [CREEP, BACK_OFF, LEFT, RIGHT, UNTIL_BUMP, say('Found it!')],
      exampleSolution: [
        'repeat_until(bumped) { drive_for(30, 0.5) }', 'drive_for(-30, 0.5)', 'turn_degrees(-90, 40)',
        'repeat_until(bumped) { drive_for(30, 0.5) }', 'say("Found it!")',
      ],
      success: [
        { kind: 'touch-and-react', detail: 'The bumper touches the top wall, the robot backs off and turns right, then touches the right wall in tile (3,0).' },
        { kind: 'stop-in-zone', detail: 'Robot centre ends in tile (3,0), on two runs with different start rows.' },
      ],
      stars: { two: 'You backed off before turning.', three: 'It worked from both starting places.' },
      hints: [
        'Two walls to find. Feel for the first one, then turn, then feel for the second.',
        'After the bump, back off a little so your robot has room to turn.',
        'Until bump (creep) → Back off → Turn right → Until bump (creep) → Say.',
      ],
    },
    quiz: [
      {
        prompt: 'What does a bumper help a robot do?',
        options: [{ text: 'See the wall before it gets there', icon: '👀' }, { text: 'Feel a touch', icon: '✋' }, { text: 'Go faster', icon: '💨' }],
        answer: 1,
        why: 'A bumper is a touch sensor. When it touches something, a switch clicks and the robot knows. Before the touch, it knows nothing.',
      },
      {
        prompt: 'The wall is a different distance every time. What works?',
        options: [{ text: 'Hop 3, always', icon: '3️⃣' }, { text: 'Keep going until I feel a bump', icon: '🛡️' }],
        answer: 1,
        why: 'Counting only works if you know the distance. The sensor finds the wall wherever it is.',
      },
      {
        prompt: 'Why back off a little before turning?',
        options: [{ text: 'So the robot has room to turn', icon: '↩️' }, { text: 'To say sorry to the wall', icon: '🙇' }],
        answer: 0,
        why: 'Right up against a wall, the robot’s corners scrape when it turns. A little space lets it turn freely.',
      },
    ],
    badge: { id: 'l1-feeler', name: 'Touch Sensor', icon: '🛡️', earnedFor: 'You gave your robot a sense of touch and made it keep going until it felt a bump.' },
    reward: { unlocks: { slot: 'sensor', id: 'bumper' }, note: 'Light 10 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Feel your way'),
      unpluggedWarmup: {
        title: 'Feel your way', minutes: 4,
        steps: [
          'Pairs: one child is the “robot” with eyes closed (or a soft blindfold if they are happy to), one hand out in front like a bumper.',
          'The partner says only “step” until the robot’s hand touches a wall or the teacher’s held-up book, then the robot says “Bump!” and stops.',
          'Move the book closer or further each time. Ask: did counting steps help? What did?',
        ],
        materials: ['A big book or cushion as the “wall”', 'Optional soft blindfolds (never force; eyes closed is fine)'],
      },
      discussion: [
        'How do you find your way in the dark at home?',
        'What other machines know when they touch something? (lift doors that open again, robot vacuums)',
      ],
      misconceptions: [
        { idea: 'The bumper lets the robot see the wall.', correction: 'It only feels the wall when it touches it. It knows nothing before the touch.' },
        { idea: 'Bumping is always bad.', correction: 'A soft bumper is made for touching gently. Hard, fast crashes are bad — that is why we creep slowly.' },
      ],
      differentiation: {
        faster: ['Feel your way all the way round the garden: four walls, four turns (use Repeat 4 around the whole thing).', 'Explain why we creep instead of hop when feeling our way.'],
        slower: ['Only the code task, run three times; celebrate that the same program works every time.'],
      },
      notes: ['Blindfold games: always optional, eyes-closed is fine, walls must be soft. Clear the floor first.'],
    }),
    parent: {
      today: 'Your child gave their robot a bumper — a touch sensor — and used it so the robot could find a wall in fog without knowing how far away it was.',
      tryAtHome: 'Play “feel your way”: with eyes closed, your child walks slowly with one hand out until it touches a cushion you hold up. Move the cushion each time.',
      askYourChild: 'How did your robot find the wall when nobody knew how far it was?',
    },
  },

  // ── 20 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S20', level: 1, number: 20, kind: 'lesson', durationMin: 40,
    title: 'Bump, Then Think',
    objective: 'Use “if” so the robot makes a choice: if it feels a bump, it backs off and turns.',
    objectives: [
      obj('L1-S20-O1', 'Uses a simple condition ("if bumped") so a program does something only when a sensor detects something.', 'I can make my robot choose: if I feel a bump, I turn.', ['conditions', 'sense-think-act'], ['programming', 'algorithms']),
      obj('L1-S20-O2', 'Recognises that one sensor-based rule can solve many different maps, unlike a counted route.', 'I know one good rule can work in many mazes.', ['autonomy', 'loops'], ['algorithms']),
    ],
    concepts: ['conditions', 'sense-think-act', 'autonomy', 'loops'],
    newBlocks: ['if'],
    episode: episode('The Hedge Maze', [
      {
        setting: 'The foggy hedge maze behind Nana’s garden. Tall green hedges, white fog.',
        action: 'From somewhere deep inside: “Woof! Woof!” Amara peers in.',
        lines: [
          { who: 'amara', line: 'Bolt is somewhere in the maze. I can’t see the paths!' },
          { who: 'spark', line: 'We could count hops… but we don’t have a map of this maze.' },
        ],
        seconds: 30,
      },
      {
        setting: 'At the maze entrance. Nana Lucía puts one hand on the right-hand hedge.',
        action: 'She walks slowly. Each time she meets a hedge in front, she turns right. A dotted line shows her path winding inward.',
        lines: [
          { who: 'lucia', line: 'In this maze, I have one rule. If I bump into a hedge… I turn right.' },
          { who: 'lucia', line: 'I don’t need the map. I just need my rule.' },
        ],
        seconds: 40,
      },
      {
        setting: 'A big glowing “IF” sign floats over the robot, like a road sign.',
        action: 'Two paths split from the sign: one where the bumper clicks (the robot backs off and turns), one where nothing touches (the robot keeps going).',
        lines: [
          { who: 'spark', line: 'If is a choice. IF I feel a bump, I back off and turn right.' },
          { who: 'spark', line: 'If I don’t feel a bump, I just keep creeping on.' },
          { who: 'spark', line: 'Sense. Think. Act! The “if” is the thinking part!', direction: 'Pause: let children say “Sense, think, act!”.' },
        ],
        seconds: 45,
      },
      {
        setting: 'Inside the maze, robot’s-eye view: hedge, fog, hedge.',
        action: 'The robot creeps, bumps, backs off, turns, creeps. Bolt’s barks get louder. In the middle sits Bolt, wagging, next to a glowing puddle of fog.',
        lines: [
          { who: 'myrobot', line: 'Bump. Turn. Bump. Turn… Found you, Bolt!' },
          { who: 'bolt', line: 'Beep-woof!', direction: 'Licks the robot’s bumper.' },
        ],
        seconds: 45,
      },
      {
        setting: 'Edge of the maze. Faint music drifts up the hill. Through the fog, a pale glow above the bandstand in the town square.',
        action: 'Something on the bandstand roof flickers — then a ringing sound: “ting… ting…”.',
        lines: [
          { who: 'amara', line: 'Listen! Something is ringing on the bandstand.' },
          { who: 'spark', line: 'I hear it — but in this fog I can’t see how far away it is.' },
        ],
        seconds: 30,
      },
    ], 'Something glows and rings on the bandstand in the fog. Can a robot “hear” how far away things are?', 'The robot learned to feel with a bumper. Ten lights! But Bolt ran into the foggy maze…'),
    build: {
      part: { slot: 'sensor', id: 'bumper' },
      action: 'inspect',
      narration: 'Look at your bumper. Press it: click, the light flashes. Let go: the light goes off.',
      why: 'The bumper says “yes, touching” or “no, not touching”. The “if” block listens to that yes or no.',
      tryWithout: 'Unplug the bumper: the robot never hears “yes”, so the “if” never turns it, and it pushes against the hedge.',
      physicsEffect: 'No change. The bumper reports true while the switch is pressed and false when it is released.',
      realWorld: 'Lift doors re-open when their edge touches someone; robot lawn mowers turn when their bumper touches a tree.',
    },
    code: {
      title: 'One Corner',
      mission: 'Bolt’s ball is round the corner. Creep again and again. If you feel a bump, back off and turn right.',
      arena: arena({
        id: 'l1-hedge-corner', name: 'Hedge corner',
        description: 'A hedge path going up, then turning right. The ball is at the end. Every other tile is solid hedge.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'grass',
        start: { col: 0, row: 2, heading: 'up' },
        goal: 'Reach the ball in tile (2,0).',
        features: ['Hedges around the L-shaped path (0,2)→(0,0)→(2,0)', 'Ball at (2,0)', 'Fog'],
        physics: FOG_PHYSICS.replace('a printed mat', 'short grass'), requires: ['move', 'feel-bump'],
      }),
      allowedBlocks: [CREEP, BACK_OFF, RIGHT, LEFT, IF_BUMP, REPEAT_LOTS],
      starter: ['repeat(20) {', '  drive_for(30, 0.5)', '  (put the “if” here)', '}'],
      exampleSolution: ['repeat(20) {', '  drive_for(30, 0.5)', '  if (bumped) {', '    drive_for(-30, 0.5)', '    turn_degrees(-90, 40)', '  }', '}'],
      success: [{ kind: 'reach-zone', detail: 'Robot centre enters tile (2,0); the run ends there with a ball animation.' }],
      stars: { two: 'You used “if” inside “repeat”.', three: 'You can say the rule out loud: “If I feel a bump, I turn right.”' },
      hints: [
        'Your robot needs to check for a bump after every creep.',
        'Inside Repeat: Creep, then “If I feel a bump” with Back off and Turn right inside it.',
        'Repeat 20 → Creep → If bump → Back off → Turn right.',
      ],
    },
    challenge: {
      title: 'Find Bolt in the Maze',
      mission: 'Bolt is in the middle of the maze. You have no map. Use your one rule to find him.',
      arena: arena({
        id: 'l1-hedge-spiral', name: 'Hedge maze',
        description: 'A small maze that winds inward. Every corner turns right. Bolt waits in the middle.',
        gridTiles: { cols: 3, rows: 3 }, floor: 'grass',
        start: { col: 0, row: 2, heading: 'up' },
        goal: 'Reach Bolt in tile (1,1).',
        features: [
          'Corridor (0,2)→(0,0)→(2,0)→(2,2)→(1,2)→(1,1). It uses all nine tiles, so its inner walls are thin hedges (1 cm, ' + OBSTACLE_MIN_CM + ' cm tall) on these tile edges: (0,2)|(1,2), (0,1)|(1,1), (1,0)|(1,1), (2,1)|(1,1); plus hedges round the outside',
          'Clear corridor width ' + (TILE_CM - 1) + ' cm: wider than every Level 1 robot’s turning circle (see the robot geometry in Physics)',
          'Bolt at (1,1)', 'Fog',
        ],
        physics: FOG_PHYSICS.replace('a printed mat', 'short grass'), requires: ['move', 'feel-bump'],
      }),
      allowedBlocks: [CREEP, BACK_OFF, RIGHT, LEFT, IF_BUMP, REPEAT_LOTS],
      exampleSolution: ['repeat(40) {', '  drive_for(30, 0.5)', '  if (bumped) {', '    drive_for(-30, 0.5)', '    turn_degrees(-90, 40)', '  }', '}'],
      success: [
        { kind: 'reach-zone', detail: 'Robot centre enters tile (1,1); the run ends with Bolt’s happy dance.' },
        { kind: 'within-blocks', detail: 'No more than 6 blocks — the same rule as the corner, with a bigger repeat.' },
      ],
      stars: { two: 'You found Bolt with the same rule.', three: 'You noticed your corner program needed only a bigger number.' },
      hints: [
        'Did your corner program work? Try it here!',
        'The maze is longer. Your robot needs more tries. Choose a bigger number.',
        'Repeat 40 → Creep → If bump → Back off → Turn right.',
      ],
    },
    quiz: [
      {
        prompt: '“If I feel a bump, I turn.” When does the robot turn?',
        options: [{ text: 'Only when it feels a bump', icon: '🛡️' }, { text: 'Every time', icon: '🔁' }],
        answer: 0,
        why: '“If” means only sometimes: only when the bumper clicks.',
      },
      {
        prompt: 'Sense, think, act. Which part is the “if”?',
        options: [{ text: 'Sense', icon: '👂' }, { text: 'Think', icon: '💭' }, { text: 'Act', icon: '🏃' }],
        answer: 1,
        keepOrder: true,
        why: 'The bumper senses. The “if” thinks — it decides what to do. Turning is the act.',
      },
      {
        prompt: 'Look at this new maze picture. Every corner turns right, like ours. Will your bump-and-turn-right rule find Bolt?',
        options: [{ text: 'No — it only works in our maze', icon: '❌' }, { text: 'Yes — the same rule works', icon: '✅' }],
        answer: 1,
        why: 'The rule does not need the map. In any maze where every corner turns right, bump-and-turn-right works.',
      },
    ],
    badge: { id: 'l1-thinker', name: 'Choice Maker', icon: '🔀', earnedFor: 'You used “if” so your robot made its own choice when it felt a bump.' },
    reward: { note: 'Bolt is safe! A new paint pattern (hedge leaves) for your robot.' },
    teacher: teacher({
      timing: lessonTiming('“If” game'),
      unpluggedWarmup: {
        title: 'The “if” game', minutes: 4,
        steps: [
          'Teacher says rules: “IF I clap, you jump. IF I don’t clap, stand still.” Then clap or don’t, at random.',
          'Next rule: “IF I touch my head, turn around.” Children notice they only act when the thing happens.',
          'Ask: what is the “sense” (watching the teacher), the “think” (the if), and the “act” (jump)?',
        ],
        materials: ['None'],
      },
      discussion: [
        'What “if” rules do you follow? (If it rains, I take an umbrella. If the light is red, we wait.)',
        'Why did our rule work without a map?',
      ],
      misconceptions: [
        { idea: 'The “if” blocks run every time.', correction: 'The blocks inside “if” run only when the bumper is pressed. Show it: watch the bumper light and the turn together.' },
        { idea: 'The robot knows the maze.', correction: 'It knows nothing about the maze. It only follows the rule each time it bumps.' },
      ],
      differentiation: {
        faster: ['Design a maze (on squared paper) where the right-turn rule FAILS (needs a left turn). Then explain why.', 'Change the rule to turn left: which maze does that solve?'],
        slower: ['Do the corner first with the “if” already in place; the child only chooses the repeat number.'],
      },
      notes: ['This is many children’s first condition. Keep the language fixed: “If I feel a bump, I…”.'],
    }),
    parent: {
      today: 'Your child used “if” for the first time: the robot made its own choice — when its bumper felt a hedge, it backed off and turned — and found its way through a maze without a map.',
      tryAtHome: 'Play the “if” game: “If I say ‘banana’, hop. Otherwise stay still.” Swap so your child makes the rule for you.',
      askYourChild: 'What was your robot’s rule in the maze?',
    },
  },

  // ── 21 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S21', level: 1, number: 21, kind: 'lesson', durationMin: 40,
    title: 'Ears Like a Bat',
    objective: 'Swap in Distance Eyes and make the robot stop before it touches something, using echoes.',
    objectives: [
      obj('L1-S21-O1', 'Describes a distance sensor as sending a sound and listening for the echo, and that it works in fog where cameras fail.', 'I know Distance Eyes listen for echoes, like a bat.', ['sensors'], ['computing-systems', 'science-energy']),
      obj('L1-S21-O2', 'Chooses between a touch sensor and a distance sensor for a task and stops the robot before contact.', 'I can make my robot stop before it touches something.', ['sensors', 'loops', 'safety-ethics'], ['programming', 'engineering-design']),
    ],
    concepts: ['sensors', 'loops', 'safety-ethics'],
    newBlocks: ['distance_cm', 'compare'],
    episode: episode('The Bell in the Fog', [
      {
        setting: 'Dusk on the foggy hillside. Bats flit between the trees.',
        action: 'A bat flies straight at a tree and swerves at the last moment. Close-up: little rings of sound leave the bat and bounce back from the tree.',
        lines: [
          { who: 'amara', line: 'How do bats not crash? It’s dark AND foggy!' },
          { who: 'lucia', line: 'They shout a tiny squeak — too high for us to hear — and listen for the echo.' },
          { who: 'lucia', line: 'A quick echo means: something is close!' },
        ],
        seconds: 40,
      },
      {
        setting: 'Nana’s toolbox. A pair of round “eyes” that are really a tiny speaker and a tiny microphone.',
        action: 'The Face Screen clicks off and goes into the toolbox. The Distance Eyes click on. Rings of sound pulse out and bounce back.',
        lines: [
          { who: 'spark', line: 'Distance Eyes! One sends a sound. One listens for the echo.' },
          { who: 'spark', line: 'Fog can hide light. But sound goes right through it.' },
        ],
        seconds: 40,
      },
      {
        setting: 'Amara stands in front of the robot and slowly steps closer.',
        action: `A number above the robot shrinks: 80… 50… ${CLOSE_CM}. At ${CLOSE_CM}, the robot’s eyes glow amber.`,
        lines: [
          { who: 'spark', line: 'The bumper feels a touch. Distance Eyes know BEFORE the touch.' },
          { who: 'spark', line: 'Which is better for not bumping into a friend?', direction: 'Pause for answers: Distance Eyes!' },
        ],
        seconds: 40,
      },
      {
        setting: 'The town square in fog. The bandstand is a dim shape; something rings on its steps: “ting… ting…”.',
        action: 'The robot rolls forward and stops just before the bandstand steps — no bump. It turns, rolls, stops again. On the top step sits a little bell with a glowing light caught inside its handle.',
        lines: [
          { who: 'myrobot', line: 'Something is close. Stopping!' },
          { who: 'amara', line: 'Light eleven! It was ringing the bell every time the wind blew.' },
        ],
        seconds: 45,
      },
      {
        setting: 'The square fills with the shapes of people setting up stalls for tonight. Bolt dashes between their legs.',
        action: 'A delivery cart rolls by; someone steps out right in front of the robot. Everyone freezes.',
        lines: [
          { who: 'guest', guestName: 'Mr Okafor, the baker', line: 'Careful! The square is full of people today — and so many children!' },
          { who: 'spark', line: 'A robot in a crowd has a very big job: keep everyone safe.' },
        ],
        seconds: 30,
      },
    ], 'Eleven lights! The square is filling with people for tonight’s festival. How can a robot move safely in a crowd?', 'Bolt was found with one clever rule. Then they heard a bell ringing in the fog…'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'swap',
      narration: 'Put the Face Screen in your toolbox. Click the Distance Eyes onto the head.',
      why: 'Distance Eyes measure how far away things are, so the robot can stop before it touches them.',
      tryWithout: 'With only the bumper, the robot finds the bandstand by bumping into it — not kind to steps, flowers or people.',
      physicsEffect: `Distance Eyes ${kg(PART_MASS_KG.head.distance)}, a little lighter than the Face Screen (${kg(PART_MASS_KG.head.screen)}). Measures 3–200 cm straight ahead; fog does not change it.`,
      realWorld: 'Car parking sensors use the same echo trick; some underwater robots use sonar to measure distance in murky water.',
    },
    code: {
      title: 'Stop Before the Steps',
      mission: 'Roll toward the bandstand. Keep going until something is close, then stop and say “Hello, bandstand!”. No bumping!',
      arena: arena({
        id: 'l1-square-lane', name: 'Foggy square',
        description: 'A straight path across the square in fog. The bandstand is somewhere ahead (a different distance each run).',
        gridTiles: { cols: 1, rows: 6 }, floor: 'mat',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Stop within one tile of the steps without touching them.',
        features: ['Bandstand 3–5 tiles ahead, random each run. Its front is a railing ' + OBSTACLE_MIN_CM + ' cm tall with the steps behind it, so every body’s Distance Eyes find it', 'A live number shows the distance reading', 'Both sensor blocks are offered on purpose: try “until bump” once and see the railing get bumped (the foam bumper makes that harmless)'],
        physics: ECHO_PHYSICS, requires: ['move', 'see-wall', 'feel-bump'],
      }),
      allowedBlocks: [CREEP, UNTIL_CLOSE, UNTIL_BUMP, say('Hello, bandstand!')],
      exampleSolution: [`repeat_until(distance_cm < ${CLOSE_CM}) {`, '  drive_for(30, 0.5)', '}', 'say("Hello, bandstand!")'],
      success: [
        { kind: 'no-collision', detail: 'The robot never touches the railing.' },
        { kind: 'stop-in-zone', detail: `Front of the robot ends 5–${CLOSE_CM} cm from the railing, on three runs in a row.` },
      ],
      stars: { two: 'You stopped before touching, every time.', three: 'You can say why “until close” is kinder than “until bump”.' },
      hints: [
        'The bumper only knows after a touch. Which block knows before?',
        'Use “Keep going until something is close” with Creep inside.',
        'Until close → Creep. Then Say.',
      ],
    },
    challenge: {
      title: 'Round the Bandstand',
      mission: 'Light eleven is on the far side of the bandstand. Go until something is close, then turn left. Do that two times. Then ring the bell!',
      arena: arena({
        id: 'l1-bandstand', name: 'The bandstand',
        description: 'The bandstand in the middle of the square, with tall flower stands around the edge. You go up one side, along the top, and stop by the bell.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'mat',
        start: { col: 3, row: 3, heading: 'up' },
        goal: 'End in tile (0,0) facing down, with the bell at (0,1) just in front, without touching anything.',
        features: [
          'Bandstand fills (1,1)–(2,2), railing ' + OBSTACLE_MIN_CM + ' cm tall',
          'Flower stands (' + OBSTACLE_MIN_CM + ' cm tall) form the walls along the top edge and the left edge',
          'Bell with light 11 at (0,1), against the left wall',
          'Geometry: “until close” stops every body with its centre inside the end tile and room to turn (checked by the doc script, checkL1Geometry), so after each left turn the robot faces along the next side, never into the bandstand',
        ],
        physics: ECHO_PHYSICS, requires: ['move', 'see-wall'],
      }),
      allowedBlocks: [CREEP, LEFT, RIGHT, UNTIL_CLOSE, REPEAT, say('Ding!')],
      exampleSolution: ['repeat(2) {', `  repeat_until(distance_cm < ${CLOSE_CM}) { drive_for(30, 0.5) }`, '  turn_degrees(90, 40)', '}', 'say("Ding!")'],
      success: [
        { kind: 'no-collision', detail: 'No flower stand, bandstand or bell touched.' },
        { kind: 'stop-in-zone', detail: `Robot centre within ${TILE_CM} cm of the top wall and of the left wall (tile (0,0)), facing down, with the bell less than ${TILE_CM} cm in front.` },
      ],
      stars: { two: 'No touches at all.', three: 'You used Repeat 2 because the two parts are the same.' },
      hints: [
        'Up the side until close. Turn left. Along the top until close. Turn left. Look: the bell!',
        'The two parts are the same: until close, then turn left.',
        'Repeat 2 → (Until close → Creep), Turn left. Then Say “Ding!”.',
      ],
    },
    quiz: [
      {
        prompt: 'How do Distance Eyes know something is close?',
        options: [{ text: 'They touch it', icon: '✋' }, { text: 'They see it, like our eyes', icon: '👁️' }, { text: 'They listen for an echo', icon: '🦇' }],
        answer: 2,
        why: 'They send a sound and listen for the echo. A quick echo means something is close. They do not see pictures at all.',
      },
      {
        prompt: 'In thick fog, which still works?',
        options: [{ text: 'A camera', icon: '📷' }, { text: 'Distance Eyes', icon: '👀' }],
        answer: 1,
        why: 'Fog hides light, so cameras struggle. Sound travels through fog, so echoes still work.',
      },
      {
        prompt: 'To never bump into a friend, use…',
        options: [{ text: 'Until something is close', icon: '👀' }, { text: 'Until I feel a bump', icon: '🛡️' }],
        answer: 0,
        why: 'A bumper only knows after the touch. Distance Eyes stop the robot before it touches.',
      },
    ],
    badge: { id: 'l1-echo', name: 'Bat Ears', icon: '🦇', earnedFor: 'You used echoes to stop your robot before it touched anything.' },
    reward: { unlocks: { slot: 'head', id: 'distance' }, note: 'Light 11 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Echo clap'),
      unpluggedWarmup: {
        title: 'Echo clap', minutes: 4,
        steps: [
          'In a big room or corridor, clap once and listen. Is there an echo?',
          'Bat game: one child is the “bat” with eyes closed; a partner stands somewhere ahead. The bat says “squeak!”; the partner answers “echo!” quickly if close, slowly if far. The bat walks and stops when the echo is quick.',
          'Same game without sound (for deaf or hard-of-hearing children, or a noisy room): the bat holds out a hand; the partner taps it quickly when close and slowly when far, or holds up an “echo card” — the closer they are, the faster they flash it.',
        ],
        materials: ['A big room or a corridor', 'Optional: a bright card per pair for the silent version'],
      },
      discussion: [
        'Which animals find their way with sound? (bats, dolphins, some whales)',
        'Where have you heard a car beeping faster as it backs up to something?',
      ],
      misconceptions: [
        { idea: 'Distance Eyes are real eyes that see.', correction: 'They do not see pictures at all. They only measure how far away the nearest thing in front is.' },
        { idea: 'Distance Eyes see everything around the robot.', correction: 'Only straight ahead, in a narrow cone. Things to the side are not noticed.' },
      ],
      differentiation: {
        faster: ['Try a soft hay bale instead of the steps: the echo ring is fainter. Why might soft things be harder to hear?', 'Change the stop distance: is closer or further safer near people?'],
        slower: ['Code task only. Watch the distance number go down as the robot creeps.'],
      },
      notes: ['Access: the echo is also shown — rings pulse out from the Distance Eyes and the number shrinks — so the session works fully without sound.', 'Accuracy note for teachers: real ultrasonic sensors struggle with very soft or steeply angled surfaces, which absorb or deflect the echo. The simulator models a fainter echo, not a miss, at Level 1.'],
    }),
    parent: {
      today: 'Your child swapped in a distance sensor that works like a bat’s echo, and programmed the robot to stop before touching things — even in fog.',
      tryAtHome: 'Find a place with an echo (a stairwell, a tunnel, a big empty room). Clap and listen. Talk about how bats use echoes to find their way.',
      askYourChild: 'Why is stopping BEFORE a bump better than feeling a bump?',
    },
  },

  // ── 22 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S22', level: 1, number: 22, kind: 'lesson', durationMin: 40,
    title: 'Stop for Friends',
    objective: 'Make the robot wait until the path is clear before each move, and talk about who keeps robots safe.',
    objectives: [
      obj('L1-S22-O1', 'Uses a sensor check before each move so the robot waits for people, and explains why safety comes before speed.', 'I can make my robot wait until the path is clear.', ['sensors', 'safety-ethics', 'loops'], ['programming', 'impacts-of-computing']),
      { ...obj('L1-S22-O2', 'Recognises that the people who design and program robots are responsible for making them safe.', 'I know robot makers must keep people safe.', ['safety-ethics'], ['impacts-of-computing', 'communication']), discussionOnly: true },
    ],
    concepts: ['safety-ethics', 'sensors', 'loops'],
    newBlocks: [],
    episode: episode('The Busy Square', [
      {
        setting: 'The town square on festival day. The fog is lifting. Stalls, garlands, a juggler, children running.',
        action: 'The robot has to carry the eleventh light to the clock tower door across the square. People cross in front of it again and again.',
        lines: [
          { who: 'amara', line: 'There are people everywhere! How do we get across?' },
          { who: 'spark', line: 'A good robot never rushes through people. It waits.' },
        ],
        seconds: 35,
      },
      {
        setting: 'A zebra crossing at the edge of the square. Noor, the little girl from the bakery street, holds her father’s hand.',
        action: 'They stop, look, wait for a cart to pass, then cross. Spark copies them.',
        lines: [
          { who: 'guest', guestName: 'Noor, age 5', line: 'We stop. We look. We wait. Then we go!' },
          { who: 'spark', line: 'Your robot can do that too. Before each hop: wait until the path is clear.' },
        ],
        seconds: 40,
      },
      {
        setting: 'Robot’s-eye view: the distance number above the robot.',
        action: 'A juggler steps in front: the number drops to 30 and the robot waits. He steps away: the number jumps to 150, and the robot hops.',
        lines: [
          { who: 'myrobot', line: 'Path not clear. Waiting… Clear! Hop!' },
          { who: 'guest', guestName: 'Noor, age 5', line: 'It waited for the juggler! Good robot!' },
        ],
        seconds: 40,
      },
      {
        setting: 'Nana Lucía sits on a bench with the children.',
        action: 'She shows an old photo: young Lucía in a workshop with a big robot arm behind a yellow safety fence.',
        lines: [
          { who: 'lucia', line: 'When I built robots, the first question was always: how do we keep people safe?' },
          { who: 'amara', line: 'Who keeps a robot safe? The robot?' },
          { who: 'lucia', line: 'The people who build it and program it. That’s you now.', direction: 'Looks at the camera.' },
        ],
        seconds: 45,
      },
      {
        setting: 'The clock tower door. It creaks open onto a dark ramp spiralling up inside the tower.',
        action: 'Far above, a faint glow and a soft “tick… tock…”. The ramp disappears round a corner.',
        lines: [
          { who: 'spark', line: 'The last light must be at the top of the tower!' },
          { who: 'amara', line: 'The ramp goes round and round. And it’s a hill — hops get shorter on a hill.' },
        ],
        seconds: 30,
      },
    ], 'The twelfth light is at the top of the clock tower, up a winding ramp. Counting hops on a hill went wrong before. What will work?', 'Distance Eyes found light eleven by its echo. The square filled with people for the festival…'),
    build: {
      part: { slot: 'tool', id: 'scoop' },
      action: 'swap',
      narration: 'Light eleven has to go to the tower door. Put your tool in the toolbox and click the scoop on to carry it. Then wave your hand in front of your Distance Eyes and watch the number.',
      why: 'The scoop carries the light. The Distance Eyes that found walls also notice people, so the robot can wait for them.',
      tryWithout: 'Without checking, a robot hops on a timer — right into someone who has just stepped in front.',
      physicsEffect: `Scoop ${kg(PART_MASS_KG.tool.scoop)} at the front. People in the simulator are detected like any object in the sensor cone (they are taller than ${OBSTACLE_MIN_CM} cm).`,
      realWorld: 'Delivery robots on footpaths and robot carts in hospitals slow down and stop for people in their way.',
    },
    code: {
      title: 'Cross the Square',
      mission: 'Hop to the tower door. Before every hop, wait until the path is clear.',
      arena: arena({
        id: 'l1-square-cross', name: 'Festival square',
        description: 'A straight path across the square. Festival visitors walk across your path now and then and stop to look at the stalls.',
        gridTiles: { cols: 1, rows: 6 }, floor: 'mat',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Reach the tower door at tile (0,0).',
        features: ['Visitors step into the path at random times and stand 2–4 s before moving on', 'Visitors never step into the tile the robot is already hopping into (Level 1 checks only between hops)', `The tower door beyond (0,0) is open and the tower is far away, so nothing static is within ${CLEAR_CM} cm at any waiting place`],
        physics: ECHO_PHYSICS.replace(/Visual fog[^.]*\. /, ''), requires: ['move', 'see-wall'],
      }),
      allowedBlocks: [HOP, WAIT_CLEAR, REPEAT, WAIT, say('Excuse me!', 'Thank you!')],
      exampleSolution: ['repeat(5) {', `  repeat_until(distance_cm > ${CLEAR_CM}) { }  ← wait until clear`, `  drive_for(${HOP_PCT}, 1)`, '}'],
      success: [
        { kind: 'no-collision', detail: 'No visitor is touched.' },
        { kind: 'reach-zone', detail: 'Robot centre ends in tile (0,0).' },
      ],
      stars: { two: 'You checked before every hop.', three: 'Your robot said “Excuse me!” or “Thank you!”.' },
      hints: [
        'Stop, look, wait — then go. Your robot can do that before every hop.',
        'Inside Repeat: first “Wait until the path is clear”, then Hop 1.',
        'Repeat 5 → Wait until clear → Hop 1.',
      ],
    },
    challenge: {
      title: 'The Lantern Delivery',
      mission: 'Carry light eleven in your scoop through the busy square to the tower door. Wait for people, turn right at the corner, and tip it out at the door.',
      arena: arena({
        id: 'l1-square-delivery', name: 'Festival square',
        description: 'Up the square, a right turn at the top corner, then along to the tower door. Visitors cross at both parts.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'mat',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Tip light 11 out in the open doorway tile (3,0), with the robot at (2,0) facing right.',
        features: [
          'Light 11 already in the scoop (the scoop was clicked on in this session’s build; if another tool is fitted, the arena asks for the scoop with one tap before it loads)',
          'Fountain at (1,1)',
          'Visitors cross column 0 and row 0 at random times, never into the tile the robot is hopping into',
          `Nothing static within ${CLEAR_CM} cm of the Distance Eyes at any waiting place: the square carries on past the top edge above column 0 (open, no wall), and the tower doorway at (3,0) is open with the tower far beyond`,
        ],
        physics: ECHO_PHYSICS.replace(/Visual fog[^.]*\. /, ''), requires: ['move', 'see-wall', 'grab'],
      }),
      allowedBlocks: [HOP, LEFT, RIGHT, WAIT_CLEAR, REPEAT, TIP_OUT, say('Excuse me!', 'Thank you!')],
      exampleSolution: [
        `repeat(3) { repeat_until(distance_cm > ${CLEAR_CM}) { }  drive_for(${HOP_PCT}, 1) }`, 'turn_degrees(-90, 40)',
        `repeat(2) { repeat_until(distance_cm > ${CLEAR_CM}) { }  drive_for(${HOP_PCT}, 1) }`, 'grip_open', 'say("Thank you!")',
      ],
      success: [
        { kind: 'no-collision', detail: 'No visitor, fountain or stall touched.' },
        { kind: 'deliver-object', detail: 'Light 11 ends in the doorway tile (3,0).' },
      ],
      stars: { two: 'You waited for people the whole way.', three: 'You used Repeat for both parts.' },
      hints: [
        'Two parts: up, then along. Each part is “wait until clear, hop”, again and again.',
        'Up is 3 hops, along is 2 hops. Turn right in between. Tip out at the end.',
        'Repeat 3 (Wait until clear, Hop 1) → Turn right → Repeat 2 (Wait until clear, Hop 1) → Tip out.',
      ],
    },
    quiz: [
      {
        prompt: 'Someone steps in front of the robot. What should it do?',
        options: [{ text: 'Go around fast', icon: '💨' }, { text: 'Wait until the path is clear', icon: '✋' }],
        answer: 1,
        why: 'Safety comes first. Waiting is always safe; rushing past people is not.',
      },
      {
        prompt: 'Who must make sure a robot is safe?',
        options: [{ text: 'The people who build and program it', icon: '🧑‍🔧' }, { text: 'The robot, on its own', icon: '🤖' }],
        answer: 0,
        why: 'A robot only follows its program. The people who build and program it decide how careful it is.',
      },
      {
        prompt: 'Why check before EVERY hop, not just once?',
        options: [{ text: 'People keep moving', icon: '🚶' }, { text: 'It doesn’t matter — checking once at the start is enough', icon: '1️⃣' }],
        answer: 0,
        why: 'The square changes all the time. A path that was clear a moment ago may not be clear now.',
      },
    ],
    badge: { id: 'l1-safe', name: 'Safe Robot Maker', icon: '🦺', earnedFor: 'You made your robot wait for people, and you know robot makers keep people safe.' },
    reward: { note: 'The tower door is open.' },
    teacher: teacher({
      timing: lessonTiming('Stop, look, wait'),
      unpluggedWarmup: {
        title: 'Stop, look, wait', minutes: 4,
        steps: [
          'Half the class are “robots” crossing the room in single hops; the other half are “people” who walk across their path.',
          'Rule: before each hop, a robot looks; if a person is within arm’s reach in front, it waits.',
          'Swap roles. Ask: what made it safe?',
        ],
        materials: ['Masking tape lines on the floor (optional)'],
      },
      discussion: [
        'Where have you seen machines that stop for people? (automatic doors, lifts, escalators with sensors)',
        'If a robot bumps someone, whose job was it to stop that from happening?',
      ],
      misconceptions: [
        { idea: 'Robots are careful because they want to be.', correction: 'Robots have no feelings or wishes. They are careful only if people program them to be.' },
        { idea: 'Checking once at the start is enough.', correction: 'Things move. Our robot checks before every hop; real robots check many times every second.' },
      ],
      differentiation: {
        faster: ['Add “Excuse me!” while waiting and “Thank you!” after. Where in the loop does each go?', 'Draw a safety poster for a robot in a school corridor.'],
        slower: ['Do the code task with Repeat already placed; the child adds the wait block in the right place.'],
      },
      notes: ['Honest note: our Level 1 robot checks only before each hop. Say so if a child asks “what if someone steps in during the hop?” — that is exactly what Level 2 fixes with continuous checking.'],
    }),
    parent: {
      today: 'Your child made their robot wait until the path was clear before every move, and talked about why the people who build robots are responsible for keeping everyone safe.',
      tryAtHome: 'When you cross a road together, say the robot rule out loud: stop, look, wait — then go.',
      askYourChild: 'Who has to make sure a robot is safe?',
    },
  },

  // ── 23 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S23', level: 1, number: 23, kind: 'lesson', durationMin: 40,
    title: 'Up the Clock Tower',
    objective: 'Climb a winding ramp by repeating a sensor rule, and meet the people whose job is robots.',
    objectives: [
      obj('L1-S23-O1', 'Repeats a sensor-based step (go until close, turn) inside a loop to solve a longer task, and explains why it works on a slope where counted hops do not.', 'I can repeat a sensor rule to climb the tower.', ['loops', 'sensors', 'physics'], ['programming', 'algorithms', 'science-forces']),
      { ...obj('L1-S23-O2', 'Names some jobs people do with robots (design, build, program, test, repair) and robots that help people.', 'I can name jobs people do with robots.', ['careers'], ['impacts-of-computing', 'communication']), discussionOnly: true },
    ],
    concepts: ['loops', 'sensors', 'physics', 'careers'],
    newBlocks: [],
    episode: episode('The Top of the Tower', [
      {
        setting: 'Inside the clock tower: a ramp that winds up around the walls, corner after corner. Big brass gears turn slowly.',
        action: 'Amara counts hops on the first ramp. The robot stops short — the ramp is a hill.',
        lines: [
          { who: 'amara', line: 'Three hops… but it stopped too early! Just like the iron lantern hill.' },
          { who: 'spark', line: 'On a hill, each hop is shorter. Counting goes wrong. What never goes wrong?', direction: 'Pause.' },
          { who: 'amara', line: 'The Distance Eyes! Go until the wall is close!' },
        ],
        seconds: 45,
      },
      {
        setting: 'Ramp after ramp, from above.',
        action: 'The robot goes until close, turns left, goes until close, turns left. Spark counts the corners on his fingers: one, two, three, four.',
        lines: [
          { who: 'spark', line: 'Go until close. Turn. Go until close. Turn. It’s a pattern!' },
          { who: 'myrobot', line: 'Four times. Repeat!' },
        ],
        seconds: 40,
      },
      {
        setting: 'Halfway up, a window looks out over Lantern Hill. Nana Lucía rests on a step.',
        action: 'Picture-in-picture: real-looking scenes of people working with robots — an engineer at a drawing table, a technician fixing a robot arm, a programmer at a laptop, a doctor beside a hospital delivery robot, a farmer with a fruit-picking robot.',
        lines: [
          { who: 'lucia', line: 'Lots of people work with robots. Some draw the plans. Some build them. Some write programs.' },
          { who: 'lucia', line: 'Some test them, and some fix them when they break.' },
          { who: 'amara', line: 'I’ve done ALL of those this year!' },
        ],
        seconds: 45,
      },
      {
        setting: 'The top of the tower, inside the great clock face. Twelve empty round holders in a circle.',
        action: 'In the middle of the gears sits the twelfth light, stuck in a cog. The robot stops just in front, the scoop gently lifts it free.',
        lines: [
          { who: 'amara', line: 'Twelve! We found all twelve!' },
          { who: 'bolt', line: 'Beep-woof! Woof!', direction: 'Spins in circles.' },
        ],
        seconds: 35,
      },
      {
        setting: 'Looking out from the clock face at sunset. Below, the whole town is getting ready for the Night of a Hundred Lights.',
        action: 'Eleven lights in a basket, one in the scoop. Nana Lucía puts a hand on the child’s robot.',
        lines: [
          { who: 'lucia', line: 'Tonight is the festival. The town will want a show from the robot that brought the lights home.' },
          { who: 'spark', line: 'A show that YOU design!', direction: 'Looks at the camera.' },
        ],
        seconds: 30,
      },
    ], 'All twelve lights are found! Tonight is the Night of a Hundred Lights — and the town wants a show from your robot.', 'The robot waited for people in the busy square. The last light was at the top of the clock tower…'),
    build: {
      part: { slot: 'tool', id: 'scoop' },
      action: 'inspect',
      narration: 'Your robot has lots of parts now. Look at them all: wheels, bumper, Distance Eyes — and the scoop, still on from the square, ready for the last light. Tap each part to hear what it does.',
      why: 'Each part does a job: wheels move, the bumper feels, Distance Eyes hear echoes, the scoop carries.',
      tryWithout: 'Take off the Distance Eyes and try counted hops on the ramp: the robot stops short on the hill.',
      physicsEffect: `Scoop ${kg(PART_MASS_KG.tool.scoop)}. On the 10° ramp, gravity pulls back on the robot, so each creep covers less ground than on the flat.`,
      realWorld: 'Climbing and inspection robots use sensors to know where they are, because wheels slip and slopes change distances.',
    },
    code: {
      title: 'One Ramp, One Turn',
      mission: 'Go up the first ramp until the wall is close, then turn left. Do it twice.',
      arena: arena({
        id: 'l1-tower-half', name: 'Clock tower (lower half)',
        description: 'Two ramps winding up inside the tower. Each ends at a flat corner landing with a wall. They slope upward.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'ramp',
        start: { col: 3, row: 3, heading: 'up' },
        goal: 'Stop near the wall at the end of the second ramp, at tile (0,0), without touching.',
        features: [
          'Corner tiles (3,3), (3,0) and (0,0) are flat landings; the two tiles between landings slope up at 10° (70 cm of ramp rises about 12 cm)',
          'Ramp 1: column 3 up to the landing at (3,0)', 'Ramp 2: row 0 left to the landing at (0,0)',
          `Central gear shaft fills (1,1)–(2,2); outer and shaft walls are ${OBSTACLE_MIN_CM} cm tall or more`,
        ],
        physics: RAMP_PHYSICS, requires: ['move', 'see-wall'],
      }),
      allowedBlocks: [HOP, CREEP, LEFT, RIGHT, UNTIL_CLOSE, REPEAT],
      starter: ['drive_for(80, 3)  ← stops short on the hill. Try it, then fix it!'],
      exampleSolution: ['repeat(2) {', `  repeat_until(distance_cm < ${CLOSE_CM}) { drive_for(30, 0.5) }`, '  turn_degrees(90, 40)', '}'],
      success: [
        { kind: 'no-collision', detail: 'No wall touched.' },
        { kind: 'stop-in-zone', detail: `Robot centre within ${TILE_CM} cm of the top wall and of the left wall (the landing at (0,0)).` },
      ],
      stars: { two: 'You used the sensor instead of counting.', three: 'You can say why counting failed on the ramp.' },
      hints: [
        'Hop 3 stopped short on the hill. What does not care about hills?',
        'Until close (with Creep inside), then Turn left. Two times.',
        'Repeat 2 → (Until close → Creep), Turn left.',
      ],
    },
    challenge: {
      title: 'To the Top!',
      mission: 'Climb all four ramps to the clock face. Then scoop up the twelfth light.',
      arena: arena({
        id: 'l1-tower-full', name: 'Clock tower',
        description: 'One ramp that winds up four sides of the tower, like a helix, to the clock room landing.',
        gridTiles: { cols: 4, rows: 4 }, floor: 'ramp',
        start: { col: 3, row: 3, heading: 'up' },
        goal: 'After the 4th ramp the robot is on the clock-room landing above (3,3). After the 4th left turn it faces north; light 12 is in the cog on the clock-face wall right in front of it. Scoop it up.',
        features: [
          'One continuous helix around the gear shaft: up column 3, left along row 0, down column 0, right along row 3. Corner tiles are flat landings; the two tiles between landings slope up at 10° (about 12 cm per side, about 50 cm in all).',
          `Total rise about 50 cm. The clock-room landing over (3,3) is a deck 2 cm thick, so there is about 48 cm of headroom over the start tile — more than the tallest Level 1 robot (under ${OBSTACLE_MIN_CM} cm). It overlaps nothing else.`,
          'The clock-room landing has a wall on its east side (the 4th “until close” stops at it) and the clock-face wall on its north side, about half a tile (17.5 cm) from the robot’s centre after the last turn. Light 12 sits in a cog that sticks out about 6 cm from that wall, inside the scoop’s reach for every body.',
          `Every wall is ${OBSTACLE_MIN_CM} cm tall or more; each landing has a guard rail on its open edge.`,
        ],
        physics: RAMP_PHYSICS, requires: ['move', 'see-wall', 'grab'],
      }),
      allowedBlocks: [CREEP, LEFT, RIGHT, UNTIL_CLOSE, REPEAT, SCOOP_UP, say('Twelve!')],
      exampleSolution: ['repeat(4) {', `  repeat_until(distance_cm < ${CLOSE_CM}) { drive_for(30, 0.5) }`, '  turn_degrees(90, 40)', '}', 'grip_close', 'say("Twelve!")'],
      success: [
        { kind: 'no-collision', detail: 'No wall touched on any floor (gentle contact of the scoop with the cog at the end is allowed).' },
        { kind: 'deliver-object', detail: 'Light 12 is in the scoop at the end of the run.' },
        { kind: 'within-blocks', detail: 'No more than 7 blocks (a loop is needed).' },
      ],
      stars: { two: 'You climbed all four ramps without a bump.', three: 'You used one loop for all four ramps.' },
      hints: [
        'Every ramp is the same: until close, then turn left.',
        'How many ramps? Four. Put your ramp program inside Repeat 4.',
        'Repeat 4 → (Until close → Creep), Turn left. Then Scoop up.',
      ],
    },
    quiz: [
      {
        prompt: 'On a hill, “Hop 3” goes…',
        options: [{ text: 'Further', icon: '🏃' }, { text: 'Less far', icon: '⛰️' }, { text: 'Just the same', icon: '🟰' }],
        answer: 1,
        why: 'Going uphill, part of the motor’s push lifts the robot, so each hop is shorter.',
      },
      {
        prompt: 'Why did “until close” work on every ramp?',
        options: [{ text: 'Every ramp is the same length, so it was counted for us', icon: '📏' }, { text: 'It measures the real wall, wherever it is', icon: '👀' }],
        answer: 1,
        why: 'The sensor measures the world as it really is, so hills and slips don’t fool it.',
      },
      {
        prompt: 'Who can work with robots when they grow up?',
        options: [{ text: 'Anyone who learns — fixers, testers, designers, builders', icon: '🧑‍🔧' }, { text: 'Only grown-up scientists', icon: '🥼' }],
        answer: 0,
        why: 'Many kinds of people work with robots: technicians fix them, others design, build, program and test them. You have done all of those this year!',
      },
    ],
    badge: { id: 'l1-climber', name: 'Tower Climber', icon: '🗼', earnedFor: 'You repeated a sensor rule to climb the tower, and you can name jobs people do with robots.' },
    reward: { note: 'Light 12 of 12 found! All the lights are home.' },
    teacher: teacher({
      timing: lessonTiming('Robot jobs charades'),
      unpluggedWarmup: {
        title: 'Robot jobs charades', minutes: 4,
        steps: [
          'Show picture cards: designer (drawing), builder (screwing parts), programmer (typing), tester (pressing go and watching), technician (fixing).',
          'Children act one out; the class guesses the job.',
          'Ask: which of these jobs have YOU done with your robot this term?',
        ],
        materials: ['Five job picture cards'],
      },
      discussion: [
        'Which robot job would you like to try? Why?',
        'Why did counting go wrong on the ramp, but the sensor didn’t?',
      ],
      misconceptions: [
        { idea: 'Only grown-up scientists work with robots.', correction: 'Many kinds of people do: designers, builders, programmers, testers, technicians, farmers, doctors… and children learning, like us.' },
        { idea: 'Hills don’t change anything for robots.', correction: 'Uphill, part of the push lifts the robot, so it goes less far for the same time.' },
      ],
      differentiation: {
        faster: ['Write the tower program with the fewest blocks possible, then explain each block to a partner.', 'Design a tower with five ramps: what changes in the program?'],
        slower: ['Do only the two-ramp code task; then press Go on the full tower with Repeat 4 already placed and watch it climb.'],
      },
      notes: [
        'Show a diverse range of people in the robot jobs pictures (gender, age, background, disability).',
        'The careers objective (O2) is met in the warm-up, the episode and the share circle, not the challenge: in the share circle each pair says which robot job they did most today (“We were the testers!”).',
      ],
    }),
    parent: {
      today: 'Your child used a distance sensor inside a loop to climb a winding ramp — and learned why counting fails on hills. They also met the many jobs people do with robots.',
      tryAtHome: 'Roll a toy car with the same push on the flat and up a book used as a ramp. Which goes further? Talk about why.',
      askYourChild: 'Which robot job would you like to do one day?',
    },
  },

  // ── 24 · PROJECT ─────────────────────────────────────────────────────────
  {
    id: 'L1-S24', level: 1, number: 24, kind: 'project', durationMin: 40,
    title: 'Make It Yours: The Night of a Hundred Lights',
    objective: 'Design, test and share a festival show that uses a loop, a sensor, a tool and kind words.',
    objectives: [
      obj('L1-S24-O1', 'Plans, builds, tests and improves an original program combining sequences, a loop, a sensor-based step and a tool action.', 'I can design my own robot show and make it work.', ['design-process', 'loops', 'sensors', 'sequences'], ['programming', 'engineering-design', 'algorithms']),
      obj('L1-S24-O2', 'Explains to others what the program does and one problem they fixed, using robotics words (sense, think, act; loop; sensor; bug).', 'I can explain my robot show and a bug I fixed.', ['debugging', 'design-process'], ['communication', 'debugging', 'collaboration']),
    ],
    concepts: ['design-process', 'sense-think-act', 'loops', 'sensors', 'sequences', 'debugging'],
    newBlocks: [],
    episode: episode('The Night of a Hundred Lights', [
      {
        setting: 'Evening. The town square, the clock tower above it. Families with paper lanterns. Everyone from the season is there: Mr Okafor, Noor, Ms Mei, Mr Diego, Ms Adaeze, Mr Haruto, Captain Ingrid.',
        action: 'The twelve lights are put back one by one into the clock. Each one glows as it clicks in. The crowd counts with them.',
        lines: [
          { who: 'narrator', line: 'One, two, three… ten, eleven… twelve!' },
          { who: 'narrator', line: 'The Lantern Clock shines again!' },
        ],
        seconds: 35,
      },
      {
        setting: 'A stage area in the square, marked with a festival mat.',
        action: 'Spark flies to the middle with a tiny microphone. Amara holds up a planning sheet with drawings and arrows.',
        lines: [
          { who: 'spark', line: 'And now — a robot show! Designed by YOU.' },
          { who: 'amara', line: 'Plan it first. Then build it, test it, fix it — and show everyone!' },
          { who: 'lucia', line: 'Use what you have learned: a loop, a sensor, a tool, and kind words.' },
        ],
        seconds: 40,
      },
      {
        setting: 'The same square, after the children’s shows. This scene and the next play at the certificate moment — straight after sharing, or in a separate short slot (see the teacher notes).',
        action: 'Fireworks of light from the clock. Nana Lucía holds up a scroll tied with ribbon: the certificate. Bolt wears a tiny lantern on his collar.',
        lines: [
          { who: 'lucia', line: 'You built a robot. You taught it to move, to draw, to carry, to feel and to listen. And you kept everyone safe.' },
          { who: 'lucia', line: 'When your Explorer badges are all done, this scroll has your name on it. You are a real Robot Explorer.' },
          { who: 'spark', line: 'Thank you for bringing the lights home!' },
        ],
        seconds: 45,
      },
      {
        setting: 'Late night. Everyone has gone home. A paper boat drifts into the harbour carrying a sealed glass bottle.',
        action: 'Amara pulls out a map of islands across the sea, and a message: “Our island needs a robot builder. Come soon.”',
        lines: [
          { who: 'amara', line: 'A map of islands! And a message for us!' },
          { who: 'spark', line: 'A new adventure… for when you’re ready.' },
        ],
        seconds: 30,
      },
    ], 'A bottle washes into the harbour with a map of islands across the sea: “Our island needs a robot builder.” (Level 2 begins here.)', 'All twelve lights were found at the top of the clock tower. Tonight is the festival…'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Your robot is all yours. Choose its colours, and choose one tool for your show: pen, scoop or headlight.',
      why: 'Designers choose the parts that fit their idea. Every part should have a reason.',
      tryWithout: 'Try your show without your sensor: what could go wrong when people walk onto the stage?',
      physicsEffect: `The chosen tool’s mass is applied (pen ${kg(PART_MASS_KG.tool.pen)}, scoop ${kg(PART_MASS_KG.tool.scoop)}, headlight ${kg(PART_MASS_KG.tool.light)}). The bumper and Distance Eyes stay fitted.`,
      realWorld: 'Engineers choose parts by what the robot must do: a drawing robot gets a pen, a delivery robot gets a box, a night robot gets lights.',
    },
    code: {
      title: 'Plan My Show',
      mission: 'Draw your show on the planning sheet. Then build the first part and test it.',
      arena: arena({
        id: 'l1-festival-stage', name: 'Festival stage',
        description: 'A 5×5 festival mat in the square at night, edged with a lantern fence. Paper lies on the stage for drawing; lantern baskets sit on two tiles; one corner is dark.',
        gridTiles: { cols: 5, rows: 5 }, floor: 'mat',
        start: { col: 2, row: 4, heading: 'up' },
        goal: 'The child’s own plan.',
        features: [`Lantern fence around the stage, ${OBSTACLE_MIN_CM} cm tall, so Distance Eyes and the bumper both find it`, 'Paper for pen drawings', 'Lantern baskets at (0,1) and (4,1) for scoop shows: small, light pick-ups (the scoop takes them from the tile in front), not obstacles', 'Dark corner at (4,0)–(4,1) for light shows', 'Visitors sometimes step onto the stage edge'],
        physics: ECHO_PHYSICS.replace(/Visual fog[^.]*\. /, ''), requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK, CREEP, BACK_OFF, LEFT, RIGHT, WAIT, REPEAT, UNTIL_BUMP, UNTIL_CLOSE, WAIT_CLEAR, IF_BUMP, PEN_DOWN, PEN_UP, SCOOP_UP, TIP_OUT, LIGHT_ON, LIGHT_OFF, BEEP, say('Welcome!', 'Thank you!', 'Happy festival!', 'Excuse me!')],
      exampleSolution: ['say("Welcome!")', `repeat_until(distance_cm > ${CLEAR_CM}) { }`, `drive_for(${HOP_PCT}, 2)`],
      success: [{ kind: 'no-collision', detail: 'The first part of the child’s plan runs without touching the fence, a basket or a visitor (a gentle bumper touch on the fence is allowed).' }],
      stars: { two: 'Your plan has a beginning, a middle and an end.', three: 'You tested the first part before adding more.' },
      hints: [
        'What will your robot do first? Say hello? Draw? Light up?',
        'Build just the first part. Press Go. Does it do what your plan says?',
        'If something goes wrong, that’s a bug — find the block where it went wrong.',
      ],
    },
    challenge: {
      title: 'Showtime!',
      mission: 'Finish your show. It must have a loop, a sensor block, your tool, and kind words. Then show everyone!',
      arena: arena({
        id: 'l1-festival-stage', name: 'Festival stage',
        description: 'The festival stage, with the audience around the edge.',
        gridTiles: { cols: 5, rows: 5 }, floor: 'mat',
        start: { col: 2, row: 4, heading: 'up' },
        goal: 'Run the whole show from start to end without touching anything.',
        features: ['As in the code task'],
        physics: ECHO_PHYSICS.replace(/Visual fog[^.]*\. /, ''), requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK, CREEP, BACK_OFF, LEFT, RIGHT, WAIT, REPEAT, UNTIL_BUMP, UNTIL_CLOSE, WAIT_CLEAR, IF_BUMP, PEN_DOWN, PEN_UP, SCOOP_UP, TIP_OUT, LIGHT_ON, LIGHT_OFF, BEEP, say('Welcome!', 'Thank you!', 'Happy festival!', 'Excuse me!')],
      exampleSolution: [
        'say("Welcome!")', 'light_on', 'repeat(4) {', `  repeat_until(distance_cm < ${CLOSE_CM}) { drive_for(30, 0.5) }`, '  turn_degrees(90, 40)', '  beep', '}',
        'light_off', 'say("Happy festival!")',
      ],
      success: [
        { kind: 'uses-blocks', detail: 'The program contains at least one loop, one sensor block (until bump, until close, wait until clear or if bump), one tool block and one say block — and each of them runs during the show.' },
        { kind: 'no-collision', detail: 'No basket or visitor touched; the fence is touched only by the bumper, gently (a bumper touch on purpose against the fence is allowed).' },
      ],
      stars: { two: 'Your show has all four ingredients.', three: 'You fixed at least one bug and can say what it was.' },
      hints: [
        'Check your four ingredients: a loop, a sensor, your tool, kind words.',
        'A sensor keeps your show safe: “Wait until the path is clear” or “Until something is close”.',
        'Test, watch, fix, test again. Every engineer does it many times.',
      ],
    },
    project: L1_PROJECTS[3],
    quiz: [
      {
        prompt: 'What do engineers do after testing finds a bug?',
        options: [{ text: 'Fix it and test again', icon: '🔧' }, { text: 'Hide it, because a good show has no bugs', icon: '🙈' }],
        answer: 0,
        why: 'Bugs are normal. Find where it went wrong, fix it, and test again.',
      },
      {
        prompt: 'Your robot feels, hears echoes, and moves. Which is “act”?',
        options: [{ text: 'Hearing an echo', icon: '🦇' }, { text: 'Feeling a bump', icon: '🛡️' }, { text: 'Moving its wheels', icon: '🛞' }],
        answer: 2,
        why: 'Feeling and hearing are sensing. Moving is acting. The program in between is thinking.',
      },
      {
        prompt: 'Why use a loop in your show?',
        options: [{ text: 'To make the program longer, because longer is better', icon: '📜' }, { text: 'To repeat steps with fewer blocks', icon: '🔁' }],
        answer: 1,
        why: 'A loop repeats steps, so you don’t have to put the same blocks in again and again.',
      },
    ],
    badge: { id: 'l1-explorer', name: 'Robot Explorer', icon: '🏮', earnedFor: 'You designed and shared your own robot show and finished the Explorers season.' },
    reward: { note: 'The Lantern Clock shines again! Explorers certificate unlocked. A treasure map of islands appears in your robot’s toolbox…' },
    teacher: teacher({
      timing: projectTiming(),
      unpluggedWarmup: {
        title: 'Show storyboard', minutes: 3,
        steps: ['Pairs fold a paper into three boxes: beginning, middle, end. Draw what the robot does in each box.'],
        materials: ['Planning sheet (stage grid + three boxes)', 'Crayons'],
      },
      discussion: [
        'What part of your robot was the most useful this season? Why?',
        'What bug did you fix today? How did you find it?',
        'What would you like your robot to learn next?',
      ],
      misconceptions: [
        { idea: 'A good show has no bugs.', correction: 'Every show had bugs. A good engineer finds and fixes them — that is what we celebrate.' },
        { idea: 'A longer program is a better program.', correction: 'A clear program that works and keeps people safe is best. Loops make it shorter.' },
      ],
      differentiation: {
        faster: ['Add a second part with a different tool (swap explained in words; one tool in the sim).', 'Teach your show to a younger child or a family member, step by step.'],
        slower: ['Start from a template show (say → repeat with sensor → say) and change the numbers, the tool and the words to make it yours.'],
      },
      notes: [
        'Celebrate every show equally: same applause, same certificate. No “best show”.',
        'Big class (30+)? Run S24 over two periods: period 1 = episode, plan, build and test; period 2 = finish, pair share, big-screen share and check. Either way, hold the certificate moment (the last two episode scenes, about 1:15, plus handing out) in its own short slot — it is not inside the 40 minutes.',
        'Certificates are earned by learning (see the Level 1 certificate criteria: what the simulator recorded and what you observed), not by attendance and never by the child’s own self-check ticks. A child still missing a core badge gets it in a catch-up session and receives the certificate then; on the night, every child is celebrated for their show.',
      ],
    }),
    parent: {
      today: 'Your child designed, tested and shared their own robot show, using everything from the season: steps, loops, a sensor and a tool. They finished Level 1 and earned the Explorers certificate.',
      tryAtHome: 'Ask your child to “program” you: they give you step-by-step instructions (hop, turn, repeat) to walk from the sofa to the door. Can you find a bug together?',
      askYourChild: 'What was the hardest bug you fixed this season, and how did you fix it?',
    },
  },
]

