// lib/kids/curriculum/level1/act3.ts
// Level 1, Act 3 (sessions 13–18): "Heavy, Slippery, Dark".
// Down at the harbour: carrying with a scoop, how load, slopes and floors
// change what the same program does (real physics), waiting for the world,
// light and energy; the third "Make it yours" project.

import type { Session } from '../types'
import {
  BEEP, CREEP, FLAT_MAT_PHYSICS, HOP, HOP_BACK, HOP_PCT, LEFT, LIGHT_OFF, LIGHT_ON, MOVE_SET, PART_MASS_KG, PEN_DOWN, PEN_UP,
  REPEAT, RIGHT, SCOOP_UP, TIP_OUT, WAIT,
  arena, episode, kg, lessonTiming, obj, projectTiming, say, teacher,
} from './shared'
import { L1_PROJECTS } from './projects'

/** A quarter turn at 40 % in the simulator (timing arenas are set from it). */
const QUARTER_TURN_S = 1.0

const DOCK_PHYSICS = `${FLAT_MAT_PHYSICS} Glass float: 0.1 kg. The scoop reaches an object on the tile directly in front of the robot.`

export const ACT3: Session[] = [
  // ── 13 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S13', level: 1, number: 13, kind: 'lesson', durationMin: 40,
    title: 'The Scoop',
    objective: 'Swap the pen for a scoop and program the robot to pick something up, carry it and tip it out.',
    objectives: [
      obj('L1-S13-O1', 'Chooses a tool to match a job and explains the choice.', 'I can pick the right tool for the job.', ['design-process'], ['engineering-design']),
      obj('L1-S13-O2', 'Sequences movement and tool actions to move an object from one place to another.', 'I can make my robot pick up, carry and drop something.', ['sequences'], ['programming']),
    ],
    concepts: ['design-process', 'sequences'],
    newBlocks: ['grip_close', 'grip_open'],
    episode: episode('Floats in the Net', [
      {
        setting: 'Lantern Hill harbour: wooden docks, colourful boats, gulls, nets drying in the sun.',
        action: 'The team arrives following the six lights. Captain Ingrid, the harbour master, is tangled up in a fishing net full of glass floats.',
        lines: [
          { who: 'guest', guestName: 'Captain Ingrid, the harbour master', line: 'The storm filled my nets with floats! And one of them is glowing!' },
          { who: 'spark', line: 'A clock light, hiding with the floats!' },
        ],
        seconds: 30,
      },
      {
        setting: 'The dock. The robot tries to push a float with its pen — the float rolls away and plops into a bucket of water.',
        action: 'Bolt shakes off a splash.',
        lines: [
          { who: 'amara', line: 'A pen can’t carry things. We need a different tool.' },
          { who: 'lucia', line: 'Engineers choose the tool for the job. A pen for drawing. For carrying… a scoop!' },
        ],
        seconds: 35,
      },
      {
        setting: 'Nana’s toolbox, opened on the dock.',
        action: 'Close-up: the pen clicks off; the scoop clicks on. The scoop tips up to hold, tips down to let go.',
        lines: [
          { who: 'spark', line: 'Scoop up — it holds. Tip out — it lets go.' },
          { who: 'spark', line: 'What else could a robot scoop? Sand? Rice? Toys?', direction: 'Pause.' },
        ],
        seconds: 35,
      },
      {
        setting: 'The dock with a row of floats and Captain Ingrid’s basket.',
        action: 'The robot rolls up, scoops a float, carries it, and tips it into the basket. The captain cheers. The glowing float is not among these — it rolled further, down the slipway.',
        lines: [
          { who: 'myrobot', line: 'Scoop up! Tip out!' },
          { who: 'guest', guestName: 'Captain Ingrid, the harbour master', line: 'Splendid! But the glowing one rolled down to the old slipway.' },
        ],
        seconds: 40,
      },
      {
        setting: 'The bottom of the slipway: a steep ramp up from the water.',
        action: 'At the bottom sits a big iron lantern — the glowing float stuck inside it. It looks very heavy.',
        lines: [
          { who: 'amara', line: 'It’s inside that big iron lantern. That looks SO heavy.' },
          { who: 'spark', line: 'And it has to go UP the ramp…' },
        ],
        seconds: 25,
      },
    ], 'The seventh light is stuck inside a heavy iron lantern at the bottom of a steep ramp. Can a small robot carry something heavy uphill?', 'Halfway! Six lights pointed to the harbour…'),
    build: {
      part: { slot: 'tool', id: 'scoop' },
      action: 'swap',
      narration: 'Take off the pen and put it in your toolbox. Click on the scoop.',
      why: 'A scoop can lift and carry things. Robots change tools for different jobs, like you change from a spoon to a fork.',
      tryWithout: 'With the pen, the robot only pushes the float, and it rolls away.',
      physicsEffect: `Scoop adds ${kg(PART_MASS_KG.tool.scoop)} at the front of the robot. A carried float adds 0.1 kg.`,
      realWorld: 'Mars rovers have scoops to collect soil; factory robot arms swap tools automatically.',
    },
    code: {
      title: 'One Float to the Basket',
      mission: 'Drive to the float, scoop it up, carry it to the basket and tip it out.',
      arena: arena({
        id: 'l1-dock-a', name: 'Harbour dock',
        description: 'A 3×4 dock. A glass float sits in front of you. Captain Ingrid’s basket is to the right.',
        gridTiles: { cols: 3, rows: 4 }, floor: 'wood',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Float in the basket at tile (2,1).',
        features: ['Glass float on tile (0,1)', 'Basket on tile (2,1)'],
        physics: DOCK_PHYSICS, requires: ['move', 'grab'],
      }),
      allowedBlocks: [...MOVE_SET, SCOOP_UP, TIP_OUT],
      exampleSolution: ['drive_for(80, 1)', 'grip_close', 'turn_degrees(-90, 40)', 'drive_for(80, 2)', 'turn_degrees(90, 40)', 'grip_open'],
      success: [{ kind: 'deliver-object', detail: 'The float ends inside the basket on tile (2,1).' }],
      stars: { two: 'You scooped and tipped at the right moments.', three: 'You planned the path on the map first.' },
      hints: [
        'Get close to the float first — stop on the square just before it.',
        'Scoop up, then go to the square just below the basket and face it.',
        'Hop 1, Scoop up, Turn right, Hop 2, Turn left, Tip out.',
      ],
    },
    challenge: {
      title: 'Float to the Boat',
      mission: 'This float is further away. Bring it to the boat at the bottom of the dock.',
      arena: arena({
        id: 'l1-dock-b', name: 'Long dock',
        description: 'A 3×5 dock with crates. The float waits at the top. A little boat is moored at the bottom.',
        gridTiles: { cols: 3, rows: 5 }, floor: 'wood',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Float tipped into the boat at tile (1,4).',
        features: ['Glass float on tile (2,1)', 'Crates on tiles (2,2) and (2,3)', 'Boat on tile (1,4)'],
        physics: DOCK_PHYSICS, requires: ['move', 'grab'],
      }),
      allowedBlocks: [...MOVE_SET, SCOOP_UP, TIP_OUT, say('Here you go!')],
      exampleSolution: ['drive_for(80, 3)', 'turn_degrees(-90, 40)', 'drive_for(80, 1)', 'grip_close', 'turn_degrees(-90, 40)', 'drive_for(80, 2)', 'grip_open'],
      success: [
        { kind: 'deliver-object', detail: 'The float ends in the boat on tile (1,4).' },
        { kind: 'no-collision', detail: 'No crate touched.' },
      ],
      stars: { two: 'The float arrived without touching a crate.', three: 'You said "Here you go!" to the captain.' },
      hints: [
        'Trace the path: up to the top, right towards the float, then down to the boat.',
        'Stop next to the float, facing it. Then scoop. Then turn to face the boat.',
        'Hop 3, Turn right, Hop 1, Scoop up, Turn right, Hop 2, Tip out.',
      ],
    },
    quiz: [
      {
        prompt: 'Which tool carries a ball?',
        options: [{ text: 'Pen', icon: '🖊️' }, { text: 'Scoop', icon: '🥄' }],
        answer: 1,
        why: 'A scoop can hold things. A pen draws — it can only push a ball away.',
      },
      {
        prompt: 'Your robot has the float. Which block lets it go?',
        options: [{ text: 'Tip out', icon: '⤵️' }, { text: 'Scoop up', icon: '⤴️' }],
        answer: 0,
        why: 'Tip out lets go of what the scoop holds.',
      },
      {
        prompt: 'Why do robots change tools?',
        options: [{ text: 'Different jobs need different tools', icon: '🧰' }, { text: 'They don’t — a robot wears every tool at once', icon: '🤹' }],
        answer: 0,
        why: 'Just like you use a spoon for soup and a pencil for drawing, robots use the tool that fits the job.',
      },
    ],
    badge: { id: 'l1-carrier', name: 'Careful Carrier', icon: '🥄', earnedFor: 'You chose a scoop for the job and moved an object from place to place.' },
    reward: { unlocks: { slot: 'tool', id: 'scoop' }, note: 'The scoop joins your toolbox.' },
    teacher: teacher({
      timing: lessonTiming('Spoon relay'),
      unpluggedWarmup: {
        title: 'Spoon relay', minutes: 4,
        steps: [
          'Children move a small ball from one bowl to another three ways: pushing with a pencil, with a spoon, with a fork.',
          'Ask: which tool worked best, and why?',
        ],
        materials: ['Spoons, pencils, forks, small balls or pom-poms, two bowls per group'],
      },
      discussion: [
        'What tools do people at home use for different jobs?',
        'What tool would a robot need to water plants? To paint a wall?',
      ],
      misconceptions: [
        { idea: 'A robot can have every tool at once.', correction: 'Our robot has one tool place. Engineers choose — more tools mean more weight and more cost.' },
        { idea: 'The scoop picks things up from far away.', correction: 'The scoop only reaches things right in front of it. The robot must drive close first.' },
      ],
      differentiation: {
        faster: ['Move two floats, one after the other.', 'Find a path with fewer turns.'],
        slower: ['Do the code task with the scoop-up and tip-out blocks already placed; add the moves.'],
      },
    }),
    parent: {
      today: 'Your child swapped their robot’s pen for a scoop, and programmed it to pick up, carry and tip out a float.',
      tryAtHome: 'At mealtime, ask: which tool is best for soup, rice, noodles, bread? Why? (Spoon, fork, chopsticks, hands — every family has its own answer.)',
      askYourChild: 'Why couldn’t your robot carry the float with its pen?',
    },
  },

  // ── 14 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S14', level: 1, number: 14, kind: 'lesson', durationMin: 40,
    title: 'Heavy Load, Steep Hill',
    objective: 'See that the same program goes less far up a slope with a heavy load, and fix it by testing.',
    objectives: [
      obj('L1-S14-O1', 'Observes that a heavier load and a slope make the robot travel less far in the same time.', 'I know heavy things and hills make my robot go less far.', ['physics'], ['science-forces']),
      obj('L1-S14-O2', 'Predicts, tests and adjusts a program based on what happened.', 'I can guess, test and change my program.', ['debugging', 'design-process'], ['debugging', 'engineering-design']),
    ],
    concepts: ['physics', 'debugging'],
    newBlocks: [],
    episode: episode('The Iron Lantern', [
      {
        setting: 'Bottom of the slipway. The iron lantern with the glowing float inside.',
        action: 'The robot scoops the iron lantern. Its wheels strain. It hops up the ramp — and stops halfway, slowly.',
        lines: [
          { who: 'myrobot', line: 'Hop 3… ugh… only got this far.' },
          { who: 'amara', line: 'Yesterday Hop 3 went all the way. What changed?' },
        ],
        seconds: 35,
      },
      {
        setting: 'Nana sits on the ramp with Bolt on her lap.',
        action: 'Nana pushes an empty pram up the ramp easily, then a pram full of shopping bags — slowly, puffing.',
        lines: [
          { who: 'lucia', line: 'Pushing something heavy uphill is hard work. You go slower.' },
          { who: 'lucia', line: 'The hill pulls everything back down. The heavier it is, the more it pulls.' },
          { who: 'spark', line: 'Our Hop block drives for the same time. But slower… means less far!' },
        ],
        seconds: 45,
      },
      {
        setting: 'A chalkboard on the dock. Three pictures: flat + empty, ramp + empty, ramp + heavy.',
        action: 'Spark asks the audience to guess. Then the robot tests each one; a mark shows where it stops each time.',
        lines: [
          { who: 'spark', line: 'Which one goes the least far? Guess!', direction: 'Pause.' },
          { who: 'spark', line: 'Up the ramp with the heavy lantern! That’s our problem.' },
          { who: 'amara', line: 'So we test, and add a hop!' },
        ],
        seconds: 40,
      },
      {
        setting: 'Top of the ramp, the lighthouse platform.',
        action: 'With one more hop, the robot reaches the top. It tips out the lantern; the glowing float pops out — light 7! Counter: 7 of 12. Captain Ingrid opens the iron lantern for good.',
        lines: [
          { who: 'myrobot', line: 'Made it! Found a light!' },
          { who: 'guest', guestName: 'Captain Ingrid, the harbour master', line: 'Seven! Next: the fish market. Mind the floor — it’s icy from the cold store!' },
        ],
        seconds: 35,
      },
      {
        setting: 'The fish market door slides open: a shiny wet floor, and past it, the sandy beach.',
        action: 'Bolt runs in and slides across the floor on his tummy — wheee — and lands in a heap.',
        lines: [
          { who: 'bolt', line: 'Beep-woooooof!', direction: 'Sliding.' },
          { who: 'spark', line: 'Slippery! Will our robot slide too?' },
        ],
        seconds: 20,
      },
    ], 'The next way goes over an icy floor and soft sand. Will the same program still work?', 'The robot got a scoop and carried floats. The seventh light was inside a heavy iron lantern…'),
    build: {
      part: { slot: 'body', id: 'box' },
      action: 'inspect',
      narration: 'Put your robot on the scale. Now add the iron lantern. See how much heavier it is?',
      why: 'Motors have to work harder to move more weight, especially uphill.',
      tryWithout: 'Without the heavy lantern, the same program goes further up the ramp.',
      physicsEffect: 'Iron lantern 0.8 kg. Ramp slope 10°. At a fixed motor power, extra load and the slope lower the robot’s speed, so drive_for covers less distance.',
      realWorld: 'Delivery robots slow down going up hills with heavy parcels, just like a person pushing a pram.',
    },
    code: {
      title: 'Test the Ramp',
      mission: 'Run "Hop 3" three times: on the flat, up the ramp, and up the ramp with the lantern. Watch where it stops each time.',
      arena: arena({
        id: 'l1-slipway-test', name: 'Slipway test track',
        description: 'Three lanes side by side: flat, ramp, ramp with the lantern already in the scoop. A mark shows 3 squares.',
        gridTiles: { cols: 3, rows: 5 }, floor: 'ramp',
        start: { col: 0, row: 4, heading: 'up' },
        extraStarts: [{ col: 1, row: 4, heading: 'up' }, { col: 2, row: 4, heading: 'up' }],
        goal: 'Run the same program in all three lanes and compare where the robot stops.',
        features: ['Lane 1 flat, lane 2 a 10° ramp, lane 3 a 10° ramp with the iron lantern (0.8 kg) pre-loaded in the scoop', 'Press Go once: the robot runs in lane 1, is reset to the start of lane 2, then lane 3 (one start per lane)', 'Chalk marks appear where the robot stops'],
        physics: 'Gravity 9.81 m/s². Wood ramp at 10°. Motors at fixed % power slow down as load rises (DC motor torque–speed behaviour). No wheel slip.',
        requires: ['move', 'grab'],
      }),
      allowedBlocks: [HOP],
      exampleSolution: ['drive_for(80, 3)  (run in each lane)'],
      success: [{ kind: 'action-at-zone', detail: 'Program has run in all three lanes; the child taps the lane that went least far.' }],
      stars: { two: 'You guessed before testing.', three: 'You said why the heavy lane went least far.' },
      hints: [
        'Same program, three places. Press Go in each lane.',
        'Look at the chalk marks. Which is lowest?',
        'Tap lane 3 — heavy AND uphill.',
      ],
    },
    challenge: {
      title: 'Up to the Lighthouse',
      mission: 'Scoop the iron lantern and carry it to the top of the ramp. Test, look, and fix your hops.',
      arena: arena({
        id: 'l1-slipway', name: 'Slipway',
        description: 'The iron lantern at the bottom of the slipway; the lighthouse platform at the top.',
        gridTiles: { cols: 1, rows: 6 }, floor: 'ramp',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Tip the lantern out on the platform (tiles (0,0)–(0,1)).',
        features: ['Iron lantern on tile (0,4)', 'Ramp from row 4 to row 2 (10°)', 'Flat platform on rows 0–1 with a railing at the top'],
        physics: `Gravity 9.81 m/s². 10° wood ramp. Iron lantern 0.8 kg. Fixed-power motors slow under load. Calibration target (with the lantern, from the start tile): Hop 3 ends with the robot centre in row 3 or row 2 — short of where it would reach on the flat — and Hop 3 + Hop 1 ends with the centre in row 2 or row 1, so Tip out lands the lantern on the platform without the robot reaching the railing. With no load on the flat, Hop 4 reaches row 1.`,
        requires: ['move', 'grab'],
      }),
      allowedBlocks: [HOP, HOP_BACK, SCOOP_UP, TIP_OUT, say('Found a light!')],
      starter: ['grip_close  ← the robot starts right behind the lantern'],
      exampleSolution: ['grip_close', 'drive_for(80, 3)', 'drive_for(80, 1)  ← the extra hop found by testing', 'grip_open', 'say("Found a light!")'],
      success: [
        { kind: 'deliver-object', detail: 'Lantern tipped out on rows 0–1.' },
        { kind: 'no-collision', detail: 'Robot does not hit the railing at the top.' },
      ],
      stars: { two: 'You tested first, then added the hop that was missing.', three: 'You said "heavy and uphill means less far".' },
      hints: [
        'Try your plan from the flat ground first. Where does it stop?',
        'It stops short because of the heavy load and the hill. Add one more hop.',
        'Scoop up, Hop 3, Hop 1, Tip out.',
      ],
    },
    quiz: [
      {
        prompt: 'Same Hop block. Which goes less far?',
        options: [{ text: 'Uphill with a heavy load', icon: '⛰️🧱' }, { text: 'On the flat, empty', icon: '➖' }],
        answer: 0,
        why: 'Heavy loads and hills make the motors work harder, so the robot goes slower — and less far in the same time.',
      },
      {
        prompt: 'Your robot stopped short. What do you do?',
        options: [{ text: 'Wait for tomorrow — the robot is weaker today', icon: '😴' }, { text: 'Test, then add a hop', icon: '🧪' }],
        answer: 1,
        why: 'Nothing is broken! Test, see where it stops, and change the program.',
      },
      {
        prompt: 'Why is pushing a full pram uphill harder?',
        options: [{ text: 'Prams don’t like hills', icon: '😠' }, { text: 'The hill pulls heavy things back down', icon: '⬇️' }],
        answer: 1,
        why: 'Gravity pulls everything down. Going uphill, you push against it — more weight, more push.',
      },
    ],
    badge: { id: 'l1-strong', name: 'Hill Climber', icon: '⛰️', earnedFor: 'You discovered that load and slope change how far a robot goes — and fixed it by testing.' },
    reward: { note: 'Light 7 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Ramp race (cars, not children)'),
      unpluggedWarmup: {
        title: 'Push it uphill', minutes: 4,
        steps: [
          'Make a ramp with a book and a board. Children push a toy car up it with one finger: empty, then with a few coins taped on.',
          'Ask: which needed a harder push? Which went less far with the same push?',
        ],
        materials: ['A board or tray', 'Books', 'A toy car', 'Coins or washers and tape'],
      },
      discussion: [
        'When is it harder to ride a bicycle? (uphill, with a heavy bag)',
        'Why did Hop 3 work yesterday but not today?',
      ],
      misconceptions: [
        { idea: 'The robot is weaker today.', correction: 'The robot is the same. The load and the hill changed. Testing tells us how much.' },
        { idea: 'Heavy things always go faster downhill so they always go further.', correction: 'Today we went uphill. Uphill, heavy means slower. (Downhill is a different story — and needs care!)' },
      ],
      differentiation: {
        faster: ['Predict what happens with a lighter body (Bug Body) and test it.', 'Try the ramp going down: what happens?'],
        slower: ['Do the three-lane test together as a class, one child per lane.'],
      },
      notes: ['This is the first "same program, different result" lesson. Keep the language simple: heavy + uphill = slower = less far.'],
    }),
    parent: {
      today: 'Your child discovered that the same robot program goes less far uphill with a heavy load, and fixed it by testing.',
      tryAtHome: 'Roll a toy car up a book ramp with one push — then tape a few coins to it and push the same way. What changed?',
      askYourChild: 'Why did your robot stop halfway up the ramp?',
    },
  },

  // ── 15 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S15', level: 1, number: 15, kind: 'lesson', durationMin: 40,
    title: 'Slippery and Sticky',
    objective: 'Discover that ice makes the robot slide and sand slows it down, and drive slowly on ice to stay in control.',
    objectives: [
      obj('L1-S15-O1', 'Observes that the floor surface changes how a robot moves (slipping on ice, slowing in sand).', 'I know floors can be slippery or sticky for my robot.', ['physics'], ['science-forces']),
      obj('L1-S15-O2', 'Chooses a slower movement to keep control on a slippery surface.', 'I can go slowly on ice so my robot doesn’t slide.', ['physics', 'debugging'], ['programming', 'science-forces']),
    ],
    concepts: ['physics', 'debugging'],
    newBlocks: [],
    episode: episode('The Icy Fish Market', [
      {
        setting: 'The fish market: a cold store has leaked, and a patch of the floor is frozen and shiny. Past the door, soft beach sand.',
        action: 'The robot hops onto the ice. It stops its wheels — but keeps sliding, spinning slowly, and bumps a stack of empty boxes.',
        lines: [
          { who: 'myrobot', line: 'Stop! I said stop! Wheee!' },
          { who: 'amara', line: 'The wheels stopped, but the robot kept going!' },
        ],
        seconds: 35,
      },
      {
        setting: 'Nana walks onto the ice in tiny, careful steps, arms out.',
        action: 'Then she steps onto the mat at the edge and walks normally.',
        lines: [
          { who: 'lucia', line: 'On ice, nothing holds your feet. Wheels can’t grip either.' },
          { who: 'lucia', line: 'So go slowly. Slow things slide less.' },
        ],
        seconds: 35,
      },
      {
        setting: 'The beach outside. The robot drives onto the sand.',
        action: 'The wheels sink a little and churn. The robot stops early, half-way to the mark.',
        lines: [
          { who: 'spark', line: 'Now the opposite! Sand is soft. The wheels sink in and it is hard to roll.' },
          { who: 'amara', line: 'Ice — too slippy. Sand — too sticky!' },
          { who: 'spark', line: 'What will happen on ice? On sand? Show me with your hands!', direction: 'Pause: children slide or push.' },
        ],
        seconds: 45,
      },
      {
        setting: 'Fish market and beach together.',
        action: 'The robot creeps slowly over the ice, then pushes with an extra hop through the sand. It reaches the far side.',
        lines: [
          { who: 'myrobot', line: 'Slow on ice… extra push in sand… made it!' },
          { who: 'spark', line: 'Same robot, different floors, different plan!' },
        ],
        seconds: 30,
      },
      {
        setting: 'The far side of the beach: the lift bridge over the harbour channel, raised high. A ship’s horn sounds.',
        action: 'Across the bridge, at the foot of the lighthouse, something glows.',
        lines: [
          { who: 'amara', line: 'The eighth light is across the bridge — but the bridge is up!' },
          { who: 'bolt', line: 'Beep-woof?', direction: 'Looks up at the raised bridge.' },
        ],
        seconds: 25,
      },
    ], 'The eighth light is across the harbour bridge — and the bridge keeps going up and down for ships. When is it safe to cross?', 'The robot carried the heavy iron lantern up the ramp. Seven lights! Then Bolt slid across an icy floor…'),
    build: {
      part: { slot: 'drive', id: 'wheels2' },
      action: 'inspect',
      narration: 'Look at your robot’s tyres. They are rubber, with little bumps, to grip the floor.',
      why: 'Grip lets the wheels push the robot forward and stop it. Less grip means slipping and sliding.',
      tryWithout: 'On ice there is hardly any grip — the robot slides past where it stopped.',
      physicsEffect: 'Friction: mat high, ice very low (friction 0.05 against 0.8 on the mat), sand adds rolling resistance (wheels sink 1 cm).',
      realWorld: 'Rescue robots use tank tracks to cross sand and rubble — you will meet tracks in Level 2.',
    },
    code: {
      title: 'Three Floors',
      mission: 'Run "Hop 2" on the mat, on ice and on sand. Guess first. Where does it stop each time?',
      arena: arena({
        id: 'l1-floors-test', name: 'Floor test lanes',
        description: 'Three lanes: mat, ice, sand. A flag marks 2 squares.',
        gridTiles: { cols: 3, rows: 5 }, floor: 'mixed',
        start: { col: 0, row: 4, heading: 'up' },
        extraStarts: [{ col: 1, row: 4, heading: 'up' }, { col: 2, row: 4, heading: 'up' }],
        goal: 'Run the same program in all three lanes and compare.',
        features: ['Lane 1 mat', 'Lane 2 ice', 'Lane 3 sand', 'Press Go once: the robot is reset to the start of each lane in turn', 'Flag at 2 squares in each lane', 'Chalk marks show where the robot ends'],
        physics: 'Mat: tyre friction high. Ice: friction very low — after the motors stop, the robot keeps sliding. Sand: wheels sink and lose speed (rolling resistance).',
        requires: ['move'],
      }),
      allowedBlocks: [HOP],
      exampleSolution: ['drive_for(80, 2)  (run in each lane)'],
      success: [{ kind: 'action-at-zone', detail: 'Program has run in all three lanes; the child taps "too far" (ice) and "too short" (sand).' }],
      stars: { two: 'You guessed before each run.', three: 'You explained "slippy" and "sticky" with your hands.' },
      hints: [
        'Press Go in each lane and watch the chalk mark.',
        'Which one went past the flag? Which one did not reach it?',
        'Ice went too far. Sand fell short.',
      ],
    },
    challenge: {
      title: 'Across the Fish Market',
      mission: 'Cross the mat, the ice and the sand to the bridge. Go slowly on the ice!',
      arena: arena({
        id: 'l1-fish-market', name: 'Fish market to the beach',
        description: 'A straight path: one square of mat, two squares of ice, two squares of sand, then the bridge stop line. Empty fish boxes stand beside the ice.',
        gridTiles: { cols: 1, rows: 7 }, floor: 'mixed',
        start: { col: 0, row: 6, heading: 'up' },
        goal: 'Stop in the stop zone at tile (0,0) — not past the bridge line.',
        features: ['Row 5 mat', 'Rows 3–4 ice', 'Rows 1–2 sand', 'Row 0 stop zone with the bridge line just beyond it', 'Fish boxes beside the ice lane (topple if touched)'],
        physics: `As in the floor test. Creep (30 % power) slides much less on ice than Hop (${HOP_PCT} %). Sand here is Level 1 “soft sand”: it slows two-wheel drive to about half speed, it does not stop it (see OPEN_QUESTIONS).`,
        requires: ['move'],
      }),
      allowedBlocks: [HOP, CREEP, HOP_BACK, REPEAT],
      exampleSolution: ['drive_for(80, 1)', 'repeat(5) { drive_for(30, 0.5) }  ← slow over the ice (count tuned in playtesting)', 'drive_for(80, 3)  ← extra push through the sand'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,0) and never crosses the bridge line.' },
        { kind: 'no-collision', detail: 'No fish box touched.' },
      ],
      stars: { two: 'You used Creep on the ice.', three: 'You tested, looked and changed a number at least once.' },
      hints: [
        'Plan it in three parts: mat, ice, sand.',
        'On ice use Creep — inside a Repeat. In sand, give an extra hop.',
        'Hop 1, Repeat 5 { Creep }, Hop 3. Then test and change the numbers.',
      ],
    },
    quiz: [
      {
        prompt: 'On ice, the robot stops its wheels. What happens?',
        options: [{ text: 'It stops at once', icon: '🛑' }, { text: 'It keeps sliding', icon: '⛸️' }],
        answer: 1,
        why: 'Ice is slippery, so the wheels cannot grip to stop the robot. It slides on.',
      },
      {
        prompt: 'How should a robot drive on ice?',
        options: [{ text: 'Slowly', icon: '🐢' }, { text: 'Fast', icon: '🐇' }],
        answer: 0,
        why: 'Going slowly means less sliding when you stop — the same is true for people and cars!',
      },
      {
        prompt: 'Why does the robot go less far in sand?',
        options: [{ text: 'Sand is slippery, like ice', icon: '🧊' }, { text: 'The wheels sink and it is hard to roll', icon: '🏖️' }],
        answer: 1,
        why: 'Soft sand lets the wheels sink in, so rolling takes more push.',
      },
    ],
    badge: { id: 'l1-floors', name: 'Floor Explorer', icon: '⛸️', earnedFor: 'You found out how ice and sand change a robot’s movement, and planned for both.' },
    reward: { note: 'You crossed the fish market. The bridge is next.' },
    teacher: teacher({
      timing: lessonTiming('Slide test'),
      unpluggedWarmup: {
        title: 'Slide test', minutes: 4,
        steps: [
          'Slide the same block across three surfaces: a table, a tray with a few drops of oil or water, a towel.',
          'Children guess first, then watch. Which slid furthest? Which stopped soonest?',
        ],
        materials: ['A wooden block or eraser', 'A tray, a little water or oil, a towel'],
      },
      discussion: [
        'Have you ever slipped on a wet floor? What did you do next time?',
        'Why do cars drive slowly when roads are icy or muddy?',
      ],
      misconceptions: [
        { idea: 'When the wheels stop, the robot stops.', correction: 'Only if the wheels can grip. On ice the robot keeps sliding after the wheels stop.' },
        { idea: 'Sand is slippery like ice.', correction: 'Sand is the opposite: soft and draggy. The robot slows down instead of sliding.' },
      ],
      differentiation: {
        faster: ['Find the fewest Creep blocks that still stop safely.', 'Explain why a heavier robot might slide further on ice.'],
        slower: ['Do the three-lane test only and talk about it; the challenge with Repeat is optional.'],
      },
      notes: ['Water/oil in the warm-up: wipe up at once, keep it on a tray, and keep children seated — never ask them to slide on a wet floor.'],
    }),
    parent: {
      today: 'Your child found that the same program makes their robot slide too far on ice and stop short in sand, and planned slow, careful moves to stay in control.',
      tryAtHome: 'Slide a toy across a table, a tray with a little water, and a towel. Guess first which goes furthest. (Wipe up afterwards!)',
      askYourChild: 'Why should robots — and people — go slowly on ice?',
    },
  },

  // ── 16 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S16', level: 1, number: 16, kind: 'lesson', durationMin: 40,
    title: 'Wait for the Bridge',
    objective: 'Time the robot’s moves to a world that changes (a lift bridge) by waiting the right amount.',
    objectives: [
      obj('L1-S16-O1', 'Sequences movement with waits to match events in the environment.', 'I can wait for the right moment to go.', ['events-timing', 'sequences'], ['programming', 'algorithms']),
      obj('L1-S16-O2', 'Recognises that a robot without sensors cannot know when the world changes.', 'I know my robot can’t see the bridge — so I plan the waiting.', ['sense-think-act', 'sensors'], ['computing-systems']),
    ],
    concepts: ['events-timing', 'sense-think-act', 'sensors'],
    newBlocks: [],
    episode: episode('Up Goes the Bridge', [
      {
        setting: 'The lift bridge over the harbour channel. A ship toots and sails through as the bridge rises.',
        action: 'The bridge goes up, a boat passes, the bridge comes down, cars cross, then up again. A big clock on the bridge tower ticks.',
        lines: [
          { who: 'guest', guestName: 'Captain Ingrid, the harbour master', line: 'The bridge goes up for boats and down for people. Up, down, up, down!' },
          { who: 'amara', line: 'Like a breathing bridge!' },
        ],
        seconds: 35,
      },
      {
        setting: 'At the stop line before the bridge.',
        action: 'Spark counts with the bridge clock: “It comes down… now! And stays down for a while.”',
        lines: [
          { who: 'spark', line: 'Let’s count together. The bridge comes down after 1… 2… 3… 4!', direction: 'Children count along.' },
          { who: 'lucia', line: 'Our robot can’t see the bridge. It has no eyes for that.' },
          { who: 'lucia', line: 'So we count for it. Go to the line, wait, then cross.' },
        ],
        seconds: 45,
      },
      {
        setting: 'The bridge, down.',
        action: 'The robot waits at the stop line, its face showing a little timer. The bridge lands. The robot crosses.',
        lines: [
          { who: 'myrobot', line: 'Waiting… waiting… crossing now!' },
          { who: 'spark', line: 'Good waiting!' },
        ],
        seconds: 30,
      },
      {
        setting: 'The foot of the lighthouse.',
        action: 'The robot finds the eighth light among the rocks. Counter: 8 of 12. Amara frowns at the bridge.',
        lines: [
          { who: 'amara', line: 'Eight lights! But… what if the bridge changes its timing? Our count would be wrong.' },
          { who: 'lucia', line: 'Then one day your robot will need senses, to notice things for itself.' },
        ],
        seconds: 35,
      },
      {
        setting: 'The old railway tunnel entrance in the hillside behind the lighthouse. Pitch black inside.',
        action: 'The eight lights all point into the tunnel. Spark peeks in — her camera eyes see only darkness.',
        lines: [
          { who: 'spark', line: 'The lights point into the old tunnel. But I can’t see a thing in there!' },
          { who: 'bolt', line: 'Beep… woof…', direction: 'Hides behind Amara.' },
        ],
        seconds: 25,
      },
    ], 'The lights point into a pitch-dark tunnel. Spark’s camera eyes can’t see in the dark. What does a robot need in the dark?', 'The robot crossed ice and sand. The eighth light was across the lift bridge…'),
    build: {
      part: { slot: 'head', id: 'screen' },
      action: 'inspect',
      narration: 'While your robot waits, its face can show a little clock, so people know it is waiting, not broken.',
      why: 'Showing "I am waiting" helps people understand the robot.',
      tryWithout: 'A robot that just stands still might look broken or stuck.',
      physicsEffect: 'No change. During wait blocks the face screen shows a timer.',
      realWorld: 'Lifts, ticket machines and robot couriers show "please wait" signs.',
    },
    code: {
      title: 'Cross When It’s Down',
      mission: 'Go to the stop line, wait for the bridge to come down, then cross.',
      arena: arena({
        id: 'l1-lift-bridge', name: 'Lift bridge',
        description: 'A stop line, then a two-square lift bridge, then the lighthouse rocks.',
        gridTiles: { cols: 1, rows: 6 }, floor: 'wood',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Reach the lighthouse foot at tile (0,1).',
        features: [
          'Stop line at row 4',
          'Lift bridge on rows 2–3: UP until 3.7 s after Go, then DOWN until 14 s, then up again',
          'Timing check: Hop 1 ends at about 1 s with the robot’s front about 10 cm from the bridge, which it reaches about 0.35 s after it moves off. Wait 3 → reaches the bridge at about 4.35 s (down: passes, 0.65 s to spare). Wait 2 → about 3.35 s (still up: stops at the barrier, 0.35 s early). So the “too short” wait fails and the right one passes with slack',
          'If the bridge is up, the robot stops at a barrier (no fall)',
        ],
        physics: FLAT_MAT_PHYSICS.replace('a printed mat', 'wooden planks'), requires: ['move'],
      }),
      allowedBlocks: [HOP, WAIT],
      exampleSolution: ['drive_for(80, 1)', 'wait(3)', 'drive_for(80, 3)'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (0,1).' },
        { kind: 'no-collision', detail: 'Robot never touches the barrier.' },
      ],
      stars: { two: 'You crossed while the bridge was down.', three: 'You counted the bridge timing before building.' },
      hints: [
        'Watch the bridge once without your robot. When does it come down?',
        'Hop 1 to the stop line takes about 1 second. Then wait until the bridge is down.',
        'Hop 1, Wait 3, Hop 3.',
      ],
    },
    challenge: {
      title: 'Two Bridges',
      mission: 'A second, slower bridge is round the corner. Wait for both!',
      arena: arena({
        id: 'l1-two-bridges', name: 'Two bridges',
        description: 'The first bridge, a corner on the lighthouse rocks, then a second little footbridge to the light.',
        gridTiles: { cols: 4, rows: 6 }, floor: 'wood',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Reach the light at tile (3,1).',
        features: [
          'Bridge A on (0,3)–(0,2): down from 3.7 s to 14 s',
          'Rocks at (0,1) with a turn to the right',
          'Bridge B on (1,1)–(2,1): down from 12.8 s to 25 s',
          `Timing check: Hop 1 (0–1 s), Wait 3, Hop 3 (4–7 s), Turn right (7–${7 + QUARTER_TURN_S} s). Bridge B’s edge is about 10 cm ahead of the robot’s front, about 0.35 s of driving. Waits 3 + 2 → reaches bridge B at about 13.35 s (down: passes, 0.55 s to spare). Waits 3 + 1 → about 12.35 s (still up: stops at the barrier, 0.45 s early)`,
          'Light at (3,1)',
        ],
        physics: `${FLAT_MAT_PHYSICS.replace('a printed mat', 'wooden planks')} A quarter turn at 40 % takes ${QUARTER_TURN_S} s; the bridge times assume it (re-time the bridges if the sim’s turn changes).`,
        requires: ['move'],
      }),
      allowedBlocks: [HOP, WAIT, LEFT, RIGHT, say('Found a light!')],
      exampleSolution: ['drive_for(80, 1)', 'wait(3)', 'drive_for(80, 3)', 'turn_degrees(-90, 40)', 'wait(3)', 'wait(2)', 'drive_for(80, 3)', 'say("Found a light!")'],
      success: [
        { kind: 'stop-in-zone', detail: 'Robot centre ends inside tile (3,1).' },
        { kind: 'no-collision', detail: 'Robot never touches a barrier.' },
      ],
      stars: { two: 'You waited for both bridges.', three: 'You explained why the second wait is longer.' },
      hints: [
        'Do the first bridge like before. Then turn right and look at bridge B.',
        'Bridge B comes down later. You may need two Wait blocks.',
        'Hop 1, Wait 3, Hop 3, Turn right, Wait 3, Wait 2, Hop 3.',
      ],
    },
    quiz: [
      {
        prompt: 'Can our robot see when the bridge is down?',
        options: [{ text: 'Yes — the Wait block watches the bridge', icon: '⏳' }, { text: 'No — we plan the wait for it', icon: '🙈' }],
        answer: 1,
        why: 'Our robot has no sensor that can see the bridge. So we count the time and plan a wait.',
      },
      {
        prompt: 'The bridge changes its timing. What happens to our plan?',
        options: [{ text: 'It might not work any more', icon: '⚠️' }, { text: 'It still works', icon: '✅' }],
        answer: 0,
        why: 'A plan with fixed waits only works if the world keeps the same timing. Sensors can help — soon!',
      },
      {
        prompt: 'What should a robot do while it waits?',
        options: [{ text: 'Show people it is waiting', icon: '⏳' }, { text: 'Hide', icon: '🫣' }],
        answer: 0,
        why: 'Showing a waiting sign tells people it is not stuck or broken.',
      },
    ],
    badge: { id: 'l1-timing', name: 'Good Timer', icon: '⏳', earnedFor: 'You timed your robot to a changing world with the right waits.' },
    reward: { note: 'Light 8 of 12 found!' },
    teacher: teacher({
      timing: lessonTiming('Bridge up, bridge down'),
      unpluggedWarmup: {
        title: 'Bridge up, bridge down', minutes: 4,
        steps: [
          'Two children make a bridge with their arms, raising and lowering it on a slow count the teacher calls.',
          'The others line up and must cross only when the arms are down. First they watch and count; then they cross.',
        ],
        materials: ['None'],
      },
      discussion: [
        'What else goes up and down or on and off on a timer? (traffic lights, a bus, a lift)',
        'How could a robot know the bridge is down without counting?',
      ],
      misconceptions: [
        { idea: 'Wait makes the robot wait until the bridge is down.', correction: 'Wait only waits for a time. The robot does not know about the bridge. We chose the time.' },
      ],
      differentiation: {
        faster: ['Find the smallest total wait that still works for both bridges.', 'Predict what happens if the bridge comes down 2 seconds later.'],
        slower: ['Watch the bridge cycle twice and count aloud with Spark before building.'],
      },
      notes: ['This sets up sensing: end by asking "what would help the robot know for itself?" Collect answers on a poster for session 19.'],
    }),
    parent: {
      today: 'Your child timed their robot to cross a lift bridge by counting and waiting, and noticed that a robot without sensors cannot tell when the world changes.',
      tryAtHome: 'At a traffic light or a lift, count together how long it takes to change. Would that count work every time?',
      askYourChild: 'How did your robot know when to cross the bridge? Did it see it?',
    },
  },

  // ── 17 ───────────────────────────────────────────────────────────────────
  {
    id: 'L1-S17', level: 1, number: 17, kind: 'lesson', durationMin: 40,
    title: 'Light in the Dark',
    objective: 'Swap in a headlight and switch it on in the dark and off in the light to save energy.',
    objectives: [
      obj('L1-S17-O1', 'Explains that cameras (and eyes) need light to see, and that lights help others see a robot.', 'I know cameras and eyes need light to see.', ['sensors', 'safety-ethics'], ['science-energy', 'computing-systems']),
      obj('L1-S17-O2', 'Turns an output on and off at the right points in a sequence and links it to saving battery energy.', 'I can switch the light on and off at the right time.', ['sequences'], ['programming', 'science-energy']),
    ],
    concepts: ['sensors', 'sequences', 'safety-ethics'],
    newBlocks: ['light_on', 'light_off'],
    episode: episode('The Old Railway Tunnel', [
      {
        setting: 'The tunnel mouth. Inside: pure darkness.',
        action: 'Spark flies in a little and immediately bumps the wall — “ow!” — and flies back out.',
        lines: [
          { who: 'spark', line: 'My camera eyes see nothing! Cameras need light, just like your eyes.' },
          { who: 'amara', line: 'And in the dark, nobody could see our robot coming.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Nana Lucía holds up a torch, switching it on and off.',
        action: 'Off: black. On: the beam hits a wall and the wall appears. Little arrows show light bouncing from the wall into Spark’s eye.',
        lines: [
          { who: 'lucia', line: 'Light shines out, bounces off things and comes back into eyes and cameras. That is how we see.' },
          { who: 'lucia', line: 'A light uses battery energy. So we switch it on in the dark, and off in the light.' },
        ],
        seconds: 45,
      },
      {
        setting: 'Toolbox on the dock.',
        action: 'The scoop clicks off; the headlight clicks on.',
        lines: [
          { who: 'spark', line: 'Scoop off. Headlight on! A new tool for a new job.' },
          { who: 'spark', line: 'When should we switch the light on? Before the tunnel or after?', direction: 'Pause.' },
        ],
        seconds: 30,
      },
      {
        setting: 'Inside the tunnel, lit by the robot’s headlight.',
        action: 'The beam shows old rails, puddles and, on the ceiling, tiny blue glow-worms. Spark gasps. They walk through together.',
        lines: [
          { who: 'myrobot', line: 'Light on!' },
          { who: 'amara', line: 'Glow-worms! Like the caves in New Zealand!' },
          { who: 'spark', line: 'Now I can see — and everyone can see us!' },
        ],
        seconds: 40,
      },
      {
        setting: 'The far end of the tunnel opens near the top of the hill, by Nana’s little house. Thick white fog everywhere.',
        action: 'The robot switches its light off at the exit. Fog swallows the path. Somewhere, a light glows faintly — inside Nana’s house.',
        lines: [
          { who: 'myrobot', line: 'Light off. Saving my battery!' },
          { who: 'lucia', line: 'We’re home. The fog is too thick to go on tonight. Come in and get warm.' },
        ],
        seconds: 30,
      },
    ], 'Fog covers the top of the hill. They shelter in Nana’s house — where something is glowing…', 'The robot waited for the bridges. Eight lights! They pointed into a dark tunnel…'),
    build: {
      part: { slot: 'tool', id: 'light' },
      action: 'swap',
      narration: 'Put the scoop in your toolbox. Click on the headlight.',
      why: 'A headlight lets cameras (and people) see in the dark, and lets everyone see the robot coming.',
      tryWithout: 'In the dark tunnel without a light, Spark’s camera sees nothing and people cannot see your robot.',
      physicsEffect: `Adds ${kg(PART_MASS_KG.tool.light)}. While on, the battery meter goes down a little faster.`,
      realWorld: 'Underwater and cave robots carry bright lights; delivery robots show lights at night so people see them.',
    },
    code: {
      title: 'Through the Tunnel',
      mission: 'Switch the light on before the tunnel, drive through, and switch it off when you come out.',
      arena: arena({
        id: 'l1-tunnel-straight', name: 'Straight tunnel',
        description: 'Daylight, then a dark tunnel 3 squares long, then daylight again.',
        gridTiles: { cols: 1, rows: 6 }, floor: 'mat',
        start: { col: 0, row: 5, heading: 'up' },
        goal: 'Reach tile (0,0). Light on in the dark (rows 1–3), off in the daylight at the end.',
        features: ['Dark zone on rows 1–3', 'Spark follows the robot and can only see while it is lit'],
        physics: FLAT_MAT_PHYSICS, requires: ['move', 'light'],
      }),
      allowedBlocks: [HOP, LIGHT_ON, LIGHT_OFF],
      exampleSolution: ['light_on', 'drive_for(80, 3)', 'drive_for(80, 2)', 'light_off'],
      success: [
        { kind: 'action-at-zone', detail: 'The light is on whenever the robot is inside rows 1–3.' },
        { kind: 'action-at-zone', detail: 'The light is off at the end of the program.' },
        { kind: 'stop-in-zone', detail: 'Robot centre ends in tile (0,0).' },
      ],
      stars: { two: 'Light on before the dark, off after.', three: 'You said why we switch it off.' },
      hints: [
        'Switch the light on before you go into the dark.',
        'Light on, then hops through the tunnel, then light off.',
        'Light on, Hop 3, Hop 2, Light off.',
      ],
    },
    challenge: {
      title: 'The Winding Tunnel',
      mission: 'This tunnel turns. Keep the light on in the dark part only, and don’t bump the walls.',
      arena: arena({
        id: 'l1-tunnel-winding', name: 'Winding tunnel',
        description: 'Into the dark, up 2 squares, a right turn, along 2 squares, out into the fog.',
        gridTiles: { cols: 3, rows: 4 }, floor: 'mat',
        start: { col: 0, row: 3, heading: 'up' },
        goal: 'Exit at tile (2,1); light off at the end.',
        features: ['Dark zone on (0,2), (0,1), (1,1)', 'Tunnel walls everywhere else', 'Glow-worms on the ceiling sparkle when lit'],
        physics: FLAT_MAT_PHYSICS, requires: ['move', 'light'],
      }),
      allowedBlocks: [HOP, LEFT, RIGHT, LIGHT_ON, LIGHT_OFF, say('Hello, glow-worms!')],
      exampleSolution: ['light_on', 'drive_for(80, 2)', 'turn_degrees(-90, 40)', 'drive_for(80, 2)', 'light_off'],
      success: [
        { kind: 'action-at-zone', detail: 'Light on in every dark tile the robot visits.' },
        { kind: 'stop-in-zone', detail: 'Robot centre ends in tile (2,1) with the light off.' },
        { kind: 'no-collision', detail: 'No tunnel wall touched.' },
      ],
      stars: { two: 'Light on in the dark, off at the end, no bumps.', three: 'You said hello to the glow-worms on the way.' },
      hints: [
        'Light first. Then plan the path: up, turn, along.',
        'Up 2, turn right, along 2 — then light off.',
        'Light on, Hop 2, Turn right, Hop 2, Light off.',
      ],
    },
    quiz: [
      {
        prompt: 'Spark’s camera is an ordinary camera, like your eyes. Can it see in total darkness?',
        options: [{ text: 'Yes — it sends out its own beam to see', icon: '🔦' }, { text: 'No, it needs light', icon: '🌑' }],
        answer: 1,
        why: 'Ordinary cameras, like eyes, catch light that bounces off things. They do not send out a beam. No light, nothing to see.',
      },
      {
        prompt: 'Why switch the light off when you leave the tunnel?',
        options: [{ text: 'To save battery energy', icon: '🔋' }, { text: 'The robot cannot drive with its light on', icon: '🚫' }],
        answer: 0,
        why: 'A light uses energy from the battery. Switching it off when it’s not needed saves energy.',
      },
      {
        prompt: 'Why is a light good for safety at night?',
        options: [{ text: 'People can see the robot coming', icon: '🚶' }, { text: 'The robot needs it to follow its plan', icon: '🗺️' }],
        answer: 0,
        why: 'A light helps people notice the robot, so nobody gets surprised or bumped.',
      },
    ],
    badge: { id: 'l1-light', name: 'Light Bringer', icon: '🔦', earnedFor: 'You used a light in the dark and switched it off to save energy.' },
    reward: { unlocks: { slot: 'tool', id: 'light' }, note: 'The headlight joins your toolbox.' },
    teacher: teacher({
      timing: lessonTiming('Shoebox dark'),
      unpluggedWarmup: {
        title: 'What’s in the box?', minutes: 4,
        steps: [
          'Put a toy inside a closed shoebox with a small peephole. Children look: they see nothing.',
          'Open a second hole and shine a torch in: now they see the toy. Light in, light bounces, light to your eye.',
        ],
        materials: ['A shoebox with two holes', 'A small torch', 'A toy'],
      },
      discussion: [
        'What things at home have lights that turn on and off by themselves?',
        'Why do bicycles have lights?',
      ],
      misconceptions: [
        { idea: 'Eyes and cameras send out a beam to see.', correction: 'They catch light that comes in. That is why they need light around. (For curious children: some special cameras see heat instead of light, so they work in total darkness — rescue teams use them. Spark’s camera is an ordinary one.)' },
        { idea: 'Our robot needs the light to follow its plan.', correction: 'Our robot follows its plan without seeing. The light is for Spark’s camera and for people to see the robot.' },
      ],
      differentiation: {
        faster: ['Make the light flash three times at the tunnel exit with Repeat.', 'Explain why cars dip their headlights.'],
        slower: ['Do the straight tunnel twice: once without the light (watch Spark bump), once with.'],
      },
      notes: ['Torches: no shining into eyes. Make "beam at the floor" the class rule.'],
    }),
    parent: {
      today: 'Your child swapped in a headlight, learned that eyes and cameras need light to see, and switched it on in the dark and off to save energy.',
      tryAtHome: 'In a dark room, shine a torch at different things. Talk about how light bounces off things into our eyes. Switch it off when you are done — saving the battery!',
      askYourChild: 'Why can’t Spark’s camera eyes see in the dark tunnel?',
    },
  },

  // ── 18 · PROJECT ─────────────────────────────────────────────────────────
  {
    id: 'L1-S18', level: 1, number: 18, kind: 'project', durationMin: 40,
    title: 'Make It Yours: A Helper for My Home',
    objective: 'Choose a job at home, pick the right tool for it, and program a helper routine.',
    objectives: [
      obj('L1-S18-O1', 'Identifies a real need, chooses a tool to meet it and explains why.', 'I can choose a job and the right tool for my robot.', ['design-process'], ['engineering-design', 'impacts-of-computing']),
      obj('L1-S18-O2', 'Plans and develops a program that combines movement, tool actions and waits.', 'I can make a helper program with many parts.', ['sequences', 'design-process'], ['programming', 'algorithms']),
    ],
    concepts: ['design-process', 'sequences', 'safety-ethics'],
    newBlocks: [],
    episode: episode('Nana’s Foggy Night', [
      {
        setting: 'Nana Lucía’s cosy house: a kitchen, a living room with an armchair, a hallway. Fog presses at the windows.',
        action: 'Nana sits down slowly; her knees are tired after the long day. Amara brings her tea, but her hands are full.',
        lines: [
          { who: 'lucia', line: 'Oof. My knees have walked a long way today.' },
          { who: 'amara', line: 'A robot could help at home! Carry things. Light the hallway at night.' },
          { who: 'lucia', line: 'The best robots help people where they live — kindly and safely.' },
        ],
        seconds: 40,
      },
      {
        setting: 'The toolbox on the kitchen table: pen, scoop, headlight.',
        action: 'Spark holds up each tool and imagines a home job for it: a scoop carrying a tea biscuit, a light guiding the way to bed, a pen drawing a "welcome home" path.',
        lines: [
          { who: 'spark', line: 'Which job will your robot do? Which tool will you choose?' },
          { who: 'lucia', line: 'Ask first: what does the person need? Then choose the tool.' },
        ],
        seconds: 35,
      },
      {
        setting: 'Nana’s living room after the children’s helpers have run (plays after sharing).',
        action: 'One helper rolls under the sofa to fetch Nana’s slipper — and pushes out a glowing ball: the ninth light! Counter: 9 of 12. Outside, the fog is even thicker.',
        lines: [
          { who: 'spark', line: 'Nine! It rolled in under the door during the storm!' },
          { who: 'amara', line: 'Three more. But the fog is so thick, even the headlight can’t help — the light just bounces off the fog.' },
          { who: 'lucia', line: 'When you can’t see… you can still feel your way.' },
        ],
        seconds: 45,
      },
    ], 'Nine lights! But the fog is so thick that seeing is no help. How can a robot find its way by touch?', 'The robot lit up the dark tunnel. Fog covered the hill, and they sheltered at Nana’s house…'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Open your toolbox. Choose the tool your home helper needs: pen, scoop or headlight.',
      why: 'Engineers start with the person’s need, then choose the part.',
      tryWithout: 'The wrong tool for the job makes the job impossible — try it and see!',
      physicsEffect: `The chosen tool’s mass is applied (pen ${kg(PART_MASS_KG.tool.pen)}, scoop ${kg(PART_MASS_KG.tool.scoop)}, headlight ${kg(PART_MASS_KG.tool.light)}).`,
      realWorld: 'Home robots today vacuum, mop and mow; researchers are building robots that help older people fetch and carry.',
    },
    code: {
      title: 'Plan My Helper',
      mission: 'Choose a job and a tool. Draw the path on the house plan. Build the first part and test it.',
      arena: arena({
        id: 'l1-home', name: 'Nana’s house',
        description: 'A 5×5 house plan: kitchen top-left, living room with the armchair top-right, hallway along the bottom, bedroom door bottom-right. Furniture is solid.',
        gridTiles: { cols: 5, rows: 5 }, floor: 'wood',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Depends on the job the child chooses (see project brief).',
        features: ['Kitchen table on (1,1)', 'Biscuit tin on (0,0) (scoop job)', 'Armchair on (4,0) with Nana', 'Sofa on (3,2)', 'Dark hallway on row 4 (light job)', 'Paper runner in the hallway (pen job)', 'Bedroom door at (4,4)'],
        physics: FLAT_MAT_PHYSICS.replace('a printed mat', 'a wooden floor'), requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK, LEFT, RIGHT, WAIT, REPEAT, SCOOP_UP, TIP_OUT, LIGHT_ON, LIGHT_OFF, PEN_DOWN, PEN_UP, BEEP, say('Here you go!', 'Good night!', 'Welcome home!', 'Excuse me!')],
      exampleSolution: ['drive_for(80, 3)', 'grip_close  (biscuit tin is in front at (0,0))'],
      success: [{ kind: 'within-blocks', detail: 'The first part of the chosen job runs without bumping furniture.' }],
      stars: { two: 'Your tool matches your job.', three: 'You can say who your helper helps and how.' },
      hints: [
        'Who needs help? Nana in her chair? Someone going to bed in the dark?',
        'Scoop for carrying, light for the dark hallway, pen for drawing a welcome path.',
        'Draw the path with your finger on the plan, then build the first part.',
      ],
    },
    challenge: {
      title: 'My Helper at Work',
      mission: 'Finish your helper routine. It must use your tool, be polite, and not bump anything.',
      arena: arena({
        id: 'l1-home', name: 'Nana’s house',
        description: 'The same house. Nana is waiting in her armchair.',
        gridTiles: { cols: 5, rows: 5 }, floor: 'wood',
        start: { col: 0, row: 4, heading: 'up' },
        goal: 'Example jobs: deliver the biscuit tin to the armchair (tip out at (4,1) facing the chair); or light the hallway from (0,4) to the bedroom door (4,4) and switch off there; or draw a welcome path along the hallway.',
        features: ['As in the code task'],
        physics: FLAT_MAT_PHYSICS.replace('a printed mat', 'a wooden floor'), requires: ['move'],
      }),
      allowedBlocks: [HOP, HOP_BACK, LEFT, RIGHT, WAIT, REPEAT, SCOOP_UP, TIP_OUT, LIGHT_ON, LIGHT_OFF, PEN_DOWN, PEN_UP, BEEP, say('Here you go!', 'Good night!', 'Welcome home!', 'Excuse me!')],
      exampleSolution: [
        'drive_for(80, 3)  ← to (0,1), the tin is in front', 'grip_close',
        'drive_for(-80, 1)', 'drive_for(-80, 1)  ← back to (0,3), clear of the table and sofa',
        'turn_degrees(-90, 40)', 'drive_for(80, 3)', 'drive_for(80, 1)  ← along row 3 to (4,3)',
        'turn_degrees(90, 40)', 'drive_for(80, 2)  ← up to (4,1), facing the armchair', 'grip_open', 'say("Here you go!")',
      ],
      success: [
        { kind: 'action-at-zone', detail: 'The chosen tool is used at the right place for the chosen job.' },
        { kind: 'no-collision', detail: 'No furniture touched.' },
        { kind: 'within-blocks', detail: 'The routine includes at least one say block.' },
      ],
      stars: { two: 'Your helper does its job without bumps.', three: 'Your helper tells people what it is doing.' },
      hints: [
        'Split your job into parts: go there, do the job, say something kind.',
        'Use your tool’s blocks at the right place: scoop up/tip out, light on/off, or pen down/up.',
        'Test one part at a time. Fix, then add the next part.',
      ],
    },
    project: L1_PROJECTS[2],
    quiz: [
      {
        prompt: 'What do engineers ask first?',
        options: [{ text: 'What colour is cool?', icon: '🌈' }, { text: 'What does the person need?', icon: '🙋' }],
        answer: 1,
        why: 'Good design starts with the person and what they need. Then you choose the parts.',
      },
      {
        prompt: 'Someone walks down a dark hallway at night. Which tool helps?',
        options: [{ text: 'Headlight', icon: '🔦' }, { text: 'Scoop', icon: '🥄' }, { text: 'Pen', icon: '🖊️' }],
        answer: 0,
        why: 'A light helps people see in the dark — and see the robot too.',
      },
      {
        prompt: 'A home robot should be…',
        options: [{ text: 'Kind and safe', icon: '💛' }, { text: 'As fast as possible', icon: '💨' }],
        answer: 0,
        why: 'At home there are people, pets and things that can break. Safe and kind comes first.',
      },
    ],
    badge: { id: 'l1-helper', name: 'Home Helper Designer', icon: '🏠', earnedFor: 'You designed a helper for a real need and chose the right tool for it.' },
    reward: { note: 'Light 9 of 12 found!' },
    teacher: teacher({
      timing: projectTiming(),
      unpluggedWarmup: {
        title: 'Helper interviews', minutes: 3,
        steps: ['Pairs ask each other: "What job at home is hard or boring for someone in your family?" Draw it in one picture.'],
        materials: ['House-plan planning sheet', 'Tool picture cards (pen, scoop, headlight)'],
      },
      discussion: [
        'Who did your helper help? Why did you choose that tool?',
        'What should a robot NEVER do at home? (bump people or pets, go near stairs, take things that aren’t its own)',
      ],
      misconceptions: [
        { idea: 'A bigger, faster robot is a better helper.', correction: 'At home, small, slow and careful is often best.' },
      ],
      differentiation: {
        faster: ['Make a helper that does two jobs with a tool swap explained in words (and pick the one tool for the sim).', 'Add a return trip to the start.'],
        slower: ['Choose the light-the-hallway job: one straight line with light on/off.'],
      },
      notes: ['Children’s home situations differ. Keep the "who needs help" question open — a pet, a sibling, themselves are all fine.'],
    }),
    parent: {
      today: 'Your child chose a real job at home, picked the right tool for it, and programmed a polite, safe helper routine.',
      tryAtHome: 'Ask your child which job at home they would give a robot, and which tool it would need. Draw that robot together.',
      askYourChild: 'Who did your helper robot help, and how?',
    },
  },
]

void PEN_DOWN; void PEN_UP
