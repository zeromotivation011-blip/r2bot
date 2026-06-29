// lib/kids-world-data.ts
// Robot World — 6 zones, 14 levels, 6 boss challenges, 6 robot parts.
// Ages 5-14. Indian context. No jargon.

export type SparkMood = 'happy' | 'excited' | 'thinking' | 'proud' | 'surprised'

export type ActivityType =
  | 'tap-to-reveal'
  | 'drag-sort'
  | 'sequence-builder'
  | 'spot-the-robot'
  | 'match-pairs'
  | 'fill-blank'
  | 'mini-simulate'
  | 'draw-path'

export interface Activity {
  type: ActivityType
  instruction: string
  content: unknown
  successMessage: string
  tryAgainMessage: string
}

export interface KidsLevel {
  id: string
  title: string
  emoji: string
  duration: string
  storyHook: string
  conceptName: string
  laymanExplanation: string
  analogy: string
  realRobotExample: string
  activities: Activity[]
  starReward: number
  funFact: string
  sparkSays: string[]
}

export interface KidsMission {
  id: string
  title: string
  story: string
  challenge: string
  type: 'block-code' | 'sequence' | 'logic-puzzle'
  starsToUnlock: number
}

export interface KidsZone {
  id: string
  name: string
  emoji: string
  tagline: string
  ageRange: string
  color: string
  bgGradient: string
  sparkMood: SparkMood
  worldMap: string
  levels: KidsLevel[]
  bossChallenge: KidsMission
  rewardPart: string
}

// ────────────────────────────────────────────────────────────────────────────
// Activity content shapes (referenced by `content: unknown` above for clarity)
// ────────────────────────────────────────────────────────────────────────────
export interface SpotTheRobotContent {
  items: string[]
  robots: number[]
  scene?: string
}
export interface MatchPairsContent {
  pairs: { left: string; right: string }[]
}
export interface TapToRevealContent {
  reveals: { front: string; back: string; fact?: string }[]
}
export interface DragSortContent {
  items: string[]
  categories: string[]
  answers: Record<string, string>
}
export interface SequenceBuilderContent {
  situation: string
  correctOrder: string[]
}
export interface FillBlankContent {
  prompt: string
  options: string[]
  correct: number
  hint?: string
}
export interface MiniSimulateContent {
  gridSize: number
  start: [number, number]
  goal: [number, number]
  startHeading: 'right' | 'left' | 'up' | 'down'
  hint?: string
  obstacles?: [number, number][]
}
export interface DrawPathContent {
  start: [number, number]
  end: [number, number]
  obstacles?: { x: number; y: number; w: number; h: number }[]
  hint?: string
}

// ────────────────────────────────────────────────────────────────────────────
// ZONE 1 — Spark's Garden  (ages 5–6)
// ────────────────────────────────────────────────────────────────────────────
const sparkGarden: KidsZone = {
  id: 'spark-garden',
  name: "Spark's Garden",
  emoji: '🌱',
  tagline: 'Where robot adventures begin!',
  ageRange: '5–6',
  color: '#10B981',
  bgGradient: 'from-emerald-900 via-green-900 to-emerald-950',
  sparkMood: 'happy',
  worldMap: 'Colourful garden with giant flowers, a small watering can, friendly robot bugs',
  rewardPart: 'robot-head',
  levels: [
    {
      id: 'what-is-spark',
      title: 'Meet Spark!',
      emoji: '🤖',
      duration: '4 min',
      storyHook: "A little robot named Spark just woke up — but doesn't know what robots ARE yet!",
      conceptName: 'What is a Robot?',
      laymanExplanation:
        'A robot is a machine that gets instructions and does jobs on its own — without a person doing it every single time.',
      analogy:
        "You know how your pressure cooker whistles by itself when the food is ready? It got instructions (the whistle setting) and does its job on its own. That's like a robot!",
      realRobotExample:
        'The dishwasher at fancy restaurants — it washes 500 plates a night all by itself!',
      activities: [
        {
          type: 'spot-the-robot',
          instruction: 'Tap everything that IS a robot! 🤔',
          content: {
            items: ['🤖 Robot arm', '🍎 Apple', '🏧 ATM machine', '✏️ Pencil', '🚗 Self-driving car', '🪣 Bucket'],
            robots: [0, 2, 4],
          } satisfies SpotTheRobotContent,
          successMessage: "🌟 You found them all! You're already a robot expert!",
          tryAgainMessage: "Hmm! Spark tripped too. Robots do jobs BY THEMSELVES — try again! 🤖",
        },
        {
          type: 'match-pairs',
          instruction: 'Match each robot to its job!',
          content: {
            pairs: [
              { left: '🏧 ATM',                right: 'Gives you money' },
              { left: '🧹 Roomba',             right: 'Cleans the floor' },
              { left: '🚗 Car factory robot',  right: 'Builds cars' },
              { left: '📦 Warehouse arm',      right: 'Picks boxes' },
            ],
          } satisfies MatchPairsContent,
          successMessage: 'Perfect matching! Spark is doing a happy dance! 💃',
          tryAgainMessage: 'Oops! Each robot does ONE special job. Try again!',
        },
      ],
      starReward: 3,
      funFact:
        'South Korea has 1,012 robots for every 10,000 workers. India has 4. YOU could help change that! 🇮🇳',
      sparkSays: [
        "Hi! I'm SPARK! I'm a robot — and today YOU'RE going to learn what that means!",
        'Psst… your pressure cooker is kind of a robot! Shh, don\'t tell it I said that.',
        'AMAZING! You found all the robots! I knew you could do it!',
      ],
    },
    {
      id: 'robot-senses',
      title: 'How Robots Feel Things',
      emoji: '👁️',
      duration: '5 min',
      storyHook: "Spark can't find the garden — help teach Spark to sense the world!",
      conceptName: 'Sensors — Robot Superpowers',
      laymanExplanation:
        "Sensors are how robots FEEL the world. They SEE, HEAR, TOUCH and even SMELL — using tiny electronic eyes, ears and noses!",
      analogy:
        "Close your eyes. You still know when amma walks in — you HEAR her bangles, you SMELL the dal. Robots feel the world the same way, just with electronic ears and noses!",
      realRobotExample:
        'The parking sensors in your car (the beep beep beep) — ultrasonic sensors detecting how close the wall is!',
      activities: [
        {
          type: 'tap-to-reveal',
          instruction: 'Tap each body part — then see which sensor does the same job!',
          content: {
            reveals: [
              { front: '👁️ Eyes',  back: '📷 Camera sensor',     fact: 'Robots use cameras to "see" — just like you!' },
              { front: '👂 Ears',  back: '🎤 Microphone',         fact: 'Smart speakers listen using microphone sensors' },
              { front: '🖐️ Skin', back: '📡 Ultrasonic sensor',  fact: 'Car parking sensors work like skin — feeling nearby things' },
              { front: '👃 Nose',  back: '💨 Gas sensor',          fact: 'Kitchen gas leak detectors smell danger like your nose!' },
            ],
          } satisfies TapToRevealContent,
          successMessage: '4 sensors learned! Spark is SO impressed! 🤩',
          tryAgainMessage: 'Tap each card to flip it — find the matching sensor!',
        },
      ],
      starReward: 3,
      funFact: "A robot's camera can see in complete darkness using infrared — like a superpower you don't have! 😎",
      sparkSays: [
        'Did you know I have a camera, microphone AND ultrasonic sensor? I am basically a superhero!',
        "Your nose can smell samosas from two streets away — a gas sensor smells things YOU can't even smell.",
      ],
    },
    {
      id: 'robot-moves',
      title: 'How Robots Move',
      emoji: '💪',
      duration: '5 min',
      storyHook: 'Spark wants to dance at the robot party — but doesn\'t know how to move!',
      conceptName: 'Motors — Robot Muscles',
      laymanExplanation:
        "If sensors are robot EYES, motors are robot MUSCLES! They turn electricity into MOVEMENT — spinning, pushing, gripping, lifting.",
      analogy:
        "Flex your arm! Your brain told your muscle to move. A motor is the SAME — the robot brain says 'go!' and the motor moves. Easy as that!",
      realRobotExample:
        'The fan in your house is a motor spinning blades. Your electric toothbrush is a motor spinning bristles. The robot arm building your phone uses 6 motors!',
      activities: [
        {
          type: 'drag-sort',
          instruction: 'Drag each movement to the right type of motor!',
          content: {
            items: ['Spinning fan blade', 'Opening a sliding door', 'Lifting a box', 'Turning a screw', 'Moving a wheel'],
            categories: ['🔄 Rotation motor', '↔️ Linear motor'],
            answers: {
              'Spinning fan blade': '🔄 Rotation motor',
              'Opening a sliding door': '↔️ Linear motor',
              'Lifting a box': '↔️ Linear motor',
              'Turning a screw': '🔄 Rotation motor',
              'Moving a wheel': '🔄 Rotation motor',
            },
          } satisfies DragSortContent,
          successMessage: 'Motor master! You know more about motors than most adults! 🏆',
          tryAgainMessage: 'Think: does it SPIN around, or does it push in a STRAIGHT line? Try again!',
        },
      ],
      starReward: 3,
      funFact:
        'The robot arm that builds iPhones moves with 0.01mm precision — 10× thinner than a human hair! 🤯',
      sparkSays: [
        'I have 6 motors just to move my arm! How many can you count in your body?',
        'Every whirring sound from a machine — that\'s a motor at work! Listen for them today!',
      ],
    },
  ],
  bossChallenge: {
    id: 'garden-boss',
    title: 'Help Spark Water the Plants!',
    story: "Spark's garden is dry! The watering robot is broken. Can you fix the code?",
    challenge: 'Put the watering steps in the right order to water all 3 plants',
    type: 'sequence',
    starsToUnlock: 7,
  },
}

// ────────────────────────────────────────────────────────────────────────────
// ZONE 2 — Robot Home  (ages 6–7)
// ────────────────────────────────────────────────────────────────────────────
const robotHome: KidsZone = {
  id: 'robot-home',
  name: 'Robot Home',
  emoji: '🏠',
  tagline: 'Robots live in your house already!',
  ageRange: '6–7',
  color: '#3B82F6',
  bgGradient: 'from-blue-900 via-indigo-900 to-indigo-950',
  sparkMood: 'surprised',
  worldMap: "Cozy Indian living room — TV, sofa, pressure cooker visible through kitchen door",
  rewardPart: 'robot-body',
  levels: [
    {
      id: 'kitchen-robots',
      title: 'Robots in Your Kitchen',
      emoji: '🍳',
      duration: '5 min',
      storyHook: 'Spark is visiting YOUR house — and finding robots everywhere you didn\'t know about!',
      conceptName: 'Robots in Daily Life',
      laymanExplanation:
        'You live with robots every day — pressure cooker, mixer grinder, washing machine, microwave. They each get instructions and do their job without you doing it manually every time.',
      analogy:
        "Your amma's washing machine: she puts clothes in, sets temperature, presses start. The machine does the rest — wash, rinse, spin — all by itself. That IS a robot.",
      realRobotExample: 'The world\'s most used household robot is the washing machine — 700 million homes have one!',
      activities: [
        {
          type: 'spot-the-robot',
          instruction: 'Tap every robot hiding in this kitchen! 🔍',
          content: {
            items: ['🍲 Pressure cooker', '📺 Microwave', '🥤 Mixer grinder', '🔪 Knife', '🧺 Washing machine', '❄️ Smart fridge', '🍳 Gas stove', '💧 Auto water purifier'],
            robots: [0, 1, 2, 4, 5, 7],
            scene: 'kitchen',
          } satisfies SpotTheRobotContent,
          successMessage: "WOW! 6 robots in one kitchen! You'll never look at your house the same way! 🏠🤖",
          tryAgainMessage: 'If it gets instructions and works by itself — it\'s a robot! Look again!',
        },
      ],
      starReward: 3,
      funFact: 'The average Indian home has 8–12 robots. You\'re already living in a robot house! 🏠🤖',
      sparkSays: [
        'Your washing machine is my COUSIN!',
        'I bet your pressure cooker has been working harder than me all morning!',
      ],
    },
    {
      id: 'robot-brain',
      title: 'The Robot\'s Brain',
      emoji: '🧠',
      duration: '6 min',
      storyHook: 'Spark forgot how to think! Help rebuild the robot brain step by step.',
      conceptName: 'The Robot Brain',
      laymanExplanation:
        "Every robot has a brain — a tiny chip that READS the sensors, THINKS, and TELLS the motors what to do. It does this thousands of times every second!",
      analogy:
        "You touch a hot pan → your skin (sensor) sends signal → brain thinks 'HOT! DANGER!' → brain tells arm muscles (motor) → you pull back. A robot's brain follows the same 3-step loop: SENSE → THINK → ACT.",
      realRobotExample:
        'The Arduino UNO — a ₹350 chip the size of a credit card — IS a robot brain. It can control motors, read sensors and make decisions. Kids your age use it to build robots!',
      activities: [
        {
          type: 'sequence-builder',
          instruction: 'Put the SENSE → THINK → ACT steps in the right order!',
          content: {
            situation: 'Robot is about to hit a wall',
            correctOrder: [
              'Distance sensor detects wall 10 cm away',
              'Brain calculates: TOO CLOSE! Turn!',
              'Motors spin to turn robot left',
            ],
          } satisfies SequenceBuilderContent,
          successMessage: "You just programmed a robot brain! That's literally what engineers do! 🧠⚡",
          tryAgainMessage: 'Think about YOU — do you move first, or do you feel something first? Robots are the same way!',
        },
        {
          type: 'sequence-builder',
          instruction: 'One more! Sort a red box on a conveyor.',
          content: {
            situation: 'Robot needs to sort a red box',
            correctOrder: [
              'Colour sensor scans the box',
              'Brain compares: RED = go right!',
              'Arm motor pushes box to right bin',
            ],
          } satisfies SequenceBuilderContent,
          successMessage: 'Brain-builder pro! You\'re thinking like a robot now! 🤖',
          tryAgainMessage: 'Sense first, think next, then ACT. Try again!',
        },
      ],
      starReward: 4,
      funFact:
        'An Arduino brain makes 16 MILLION decisions per second. Your brain makes about 100 decisions per second. Robot wins on speed — you win on wisdom! 😄',
      sparkSays: [
        'My brain runs at 16 million cycles per second — but I still can\'t beat you at chess!',
        'SENSE → THINK → ACT. That\'s literally how I work. Now you know my secret!',
      ],
    },
  ],
  bossChallenge: {
    id: 'home-boss',
    title: "Program Spark's Morning Routine",
    story: 'Spark needs to wake up, make chai and water the plants — in the right order!',
    challenge: 'Sequence 6 morning steps in the correct order',
    type: 'sequence',
    starsToUnlock: 10,
  },
}

// ────────────────────────────────────────────────────────────────────────────
// ZONE 3 — Build-It Bay  (ages 7–9)
// ────────────────────────────────────────────────────────────────────────────
const buildItBay: KidsZone = {
  id: 'build-it-bay',
  name: 'Build-It Bay',
  emoji: '🔧',
  tagline: 'Take robots apart and put them back together!',
  ageRange: '7–9',
  color: '#F59E0B',
  bgGradient: 'from-amber-900 via-orange-900 to-amber-950',
  sparkMood: 'thinking',
  worldMap: 'A workshop with floating robot parts, wrenches, and rolling toolboxes',
  rewardPart: 'robot-arm',
  levels: [
    {
      id: 'robot-parts',
      title: "Every Robot's 4 Parts",
      emoji: '🔩',
      duration: '7 min',
      storyHook: "Spark's robot friend exploded into pieces! Help put it back together!",
      conceptName: 'The 4 Parts of Every Robot',
      laymanExplanation:
        "Every robot — tiny Roomba or giant Mars rover — has 4 parts. SENSORS to feel. BRAIN to think. MOTORS to move. POWER to run. Mix them differently — get a different robot!",
      analogy:
        'Like every food dish has: ingredients + recipe + cooking method + heat. Change the ingredients = different dish. Change the robot parts = different robot. Same 4 categories, infinite possibilities.',
      realRobotExample:
        'Mars Rover Perseverance: Sensors (17 cameras + weather + spectrometers), Brain (RAD750 computer), Actuators (6 wheels + arm), Power (nuclear battery lasting 14 years).',
      activities: [
        {
          type: 'drag-sort',
          instruction: 'Drag each part to the right category to rebuild Spark!',
          content: {
            items: ['Camera', 'Battery', 'DC Motor', 'Arduino', 'Ultrasonic sensor', 'Wheels', 'Solar panel', 'Temperature sensor', 'Servo arm', 'Raspberry Pi'],
            categories: ['🎯 Sensors', '🧠 Brain', '💪 Actuators', '⚡ Power'],
            answers: {
              'Camera': '🎯 Sensors',
              'Ultrasonic sensor': '🎯 Sensors',
              'Temperature sensor': '🎯 Sensors',
              'Arduino': '🧠 Brain',
              'Raspberry Pi': '🧠 Brain',
              'DC Motor': '💪 Actuators',
              'Wheels': '💪 Actuators',
              'Servo arm': '💪 Actuators',
              'Battery': '⚡ Power',
              'Solar panel': '⚡ Power',
            },
          } satisfies DragSortContent,
          successMessage: 'SPARK IS REBUILT! 🎉 You know more about robot architecture than most engineering students!',
          tryAgainMessage: 'Think about what that part DOES — feel? think? move? give energy? Try again!',
        },
        {
          type: 'fill-blank',
          instruction: 'Finish the robot description!',
          content: {
            prompt: "A Roomba's _____ detects furniture so it doesn't crash.",
            options: ['sensor', 'motor', 'battery'],
            correct: 0,
            hint: 'Which part FEELS things around it?',
          } satisfies FillBlankContent,
          successMessage: 'Flawless! 🔒🧠',
          tryAgainMessage: 'Think about the 4 parts: Sense, Think, Move, Power. Which one fits?',
        },
      ],
      starReward: 5,
      funFact: 'The Mars Perseverance Rover has 17 cameras — more eyes than any creature on Earth OR Mars! 👁️×17',
      sparkSays: [
        'Every robot ever made has my same 4 parts. Every. Single. One. We\'re all cousins!',
        'A bee has sensors (eyes/antennae), brain, actuators (wings/legs), power (honey energy). Bees are biological robots! 🐝',
      ],
    },
  ],
  bossChallenge: {
    id: 'bay-boss',
    title: 'Design Your First Robot!',
    story: 'A farmer needs a robot to water crops. Design it using the 4 parts!',
    challenge: 'Choose the right sensors, brain, actuators and power source for the farm robot',
    type: 'logic-puzzle',
    starsToUnlock: 14,
  },
}

// ────────────────────────────────────────────────────────────────────────────
// ZONE 4 — Think Tank  (ages 8–10)
// ────────────────────────────────────────────────────────────────────────────
const thinkTank: KidsZone = {
  id: 'think-tank',
  name: 'Think Tank',
  emoji: '💡',
  tagline: 'How do robots make decisions?',
  ageRange: '8–10',
  color: '#7C3AED',
  bgGradient: 'from-purple-900 via-violet-900 to-purple-950',
  sparkMood: 'thinking',
  worldMap: 'A glowing library with floating thought bubbles and decision trees',
  rewardPart: 'robot-legs',
  levels: [
    {
      id: 'if-then-logic',
      title: 'If This, Then That',
      emoji: '🔀',
      duration: '7 min',
      storyHook: 'Spark needs to learn how to make decisions — just like you do all day!',
      conceptName: 'IF This → THEN That',
      laymanExplanation:
        "Every robot choice is an IF-THEN rule. IF something is true, THEN do something. You do this all day without noticing!",
      analogy:
        "IF it rains → take umbrella. IF amma calls → answer FAST. IF dabbawala arrives → grab tiffin. Robots think the same way — just written as code.",
      realRobotExample:
        "Ola dispatch: IF driver within 2 km AND rating > 4.5 → assign this driver. Millions of these IF-THEN checks per second!",
      activities: [
        {
          type: 'fill-blank',
          instruction: 'Pick the right THEN action!',
          content: {
            prompt: 'IF distance < 20 cm  →  THEN _____',
            options: ['turn left', 'speed up', 'play music'],
            correct: 0,
            hint: "Spark's about to hit a wall — what's the safe choice?",
          } satisfies FillBlankContent,
          successMessage: 'You\'re writing robot logic! This IS computer science! 💻🏆',
          tryAgainMessage: 'What would YOU do? Robots follow the same common sense!',
        },
        {
          type: 'fill-blank',
          instruction: 'One more — sorting boxes!',
          content: {
            prompt: 'IF colour = RED  →  THEN _____',
            options: ['go to blue bin', 'go to red bin', 'stop'],
            correct: 1,
            hint: 'Red goes with red!',
          } satisfies FillBlankContent,
          successMessage: 'Sorting expert! 📦',
          tryAgainMessage: 'Match the colours!',
        },
      ],
      starReward: 5,
      funFact:
        'Every time you open Amazon and see product recommendations — an AI runs 50+ IF-THEN checks about your history in milliseconds. You just learned how it works! 🛒',
      sparkSays: [
        'I run about 10,000 IF-THEN checks every second. Right now I\'m checking: IF kid is learning → THEN feel proud! ✅',
        'When you dodged that ball earlier — that was IF ball_coming → THEN duck. Instant!',
      ],
    },
    {
      id: 'loops-and-repeat',
      title: 'Do It Again and Again',
      emoji: '🔄',
      duration: '6 min',
      storyHook: 'Spark has to water 100 plants but only knows how to water 1. There must be a shortcut!',
      conceptName: 'Loops — Do It Again!',
      laymanExplanation:
        "A loop tells a robot: 'Do this X times!' Instead of writing the SAME instruction 100 times, you write it ONCE and the robot repeats it.",
      analogy:
        "Teacher says: 'Practice 10 sums.' That's a LOOP! REPEAT [solve sum] 10 TIMES. Or auntie's chai: REPEAT [stir spoon] 20 TIMES till it's perfect!",
      realRobotExample:
        'A car painting robot runs a loop: [move arm left, spray, move arm right, spray] — repeated thousands of times until the whole car is painted.',
      activities: [
        {
          type: 'fill-blank',
          instruction: 'Spark needs to water 5 plants. Fill in the loop!',
          content: {
            prompt: 'REPEAT _____ TIMES:  move_forward()  →  spray_water()',
            options: ['2', '5', '10', '100'],
            correct: 1,
            hint: 'How many plants are there?',
          } satisfies FillBlankContent,
          successMessage: 'LOOP MASTER! 10 instructions reduced to 3! That\'s elegant code! 🎨',
          tryAgainMessage: 'Count the plants: 🌱🌱🌱🌱🌱',
        },
      ],
      starReward: 4,
      funFact:
        'The code running your YouTube app contains thousands of loops — one is running RIGHT NOW checking if you paused or liked the video. Loops never stop! 🔄',
      sparkSays: [
        'Loops changed everything in programming. Before loops: code for 100 plants was HUGE. After loops: 3 lines.',
        'I use a loop just to walk — left, right, left, right — REPEAT forever until I reach the destination!',
      ],
    },
  ],
  bossChallenge: {
    id: 'think-boss',
    title: "Program Spark's Entire Day",
    story: 'Spark needs a full day schedule using IF-THEN rules AND loops!',
    challenge: 'Build a 6-step program using loops and IF-THEN conditions',
    type: 'logic-puzzle',
    starsToUnlock: 22,
  },
}

// ────────────────────────────────────────────────────────────────────────────
// ZONE 5 — Code Cave  (ages 9–11)
// ────────────────────────────────────────────────────────────────────────────
const codeCave: KidsZone = {
  id: 'code-cave',
  name: 'Code Cave',
  emoji: '💻',
  tagline: 'Write real code. Control real robots.',
  ageRange: '9–11',
  color: '#06B6D4',
  bgGradient: 'from-cyan-900 via-teal-900 to-slate-950',
  sparkMood: 'excited',
  worldMap: 'A glowing cave with floating code blocks and a small robot waiting for instructions',
  rewardPart: 'robot-sensor-pack',
  levels: [
    {
      id: 'block-coding',
      title: 'Tell Spark What To Do',
      emoji: '🧩',
      duration: '8 min',
      storyHook: 'Spark can\'t move unless YOU give instructions. Time to become a programmer!',
      conceptName: 'Block Coding',
      laymanExplanation:
        "Programming is just giving a robot clear instructions, step by step. Block coding uses puzzle pieces — snap them together, the robot follows them.",
      analogy:
        "Like giving an auto-rickshaw bhaiya directions: 'Straight, left at the temple, third building on the right.' Code is the same — step, step, step. No skipping!",
      realRobotExample:
        'Scratch (made by MIT) is used by 100 million kids worldwide. NASA uses similar block-based tools to test satellite programs!',
      activities: [
        {
          type: 'mini-simulate',
          instruction: 'Drag code blocks to make Spark reach the ⭐!',
          content: {
            gridSize: 5,
            start: [0, 2],
            goal: [4, 2],
            startHeading: 'right',
            hint: 'Spark is facing right — just go forward!',
          } satisfies MiniSimulateContent,
          successMessage: 'YOU JUST WROTE YOUR FIRST PROGRAM! 🎊 Spark reached the star because of YOUR code!',
          tryAgainMessage: 'Look at where Spark is facing. Count the squares! Try a different path!',
        },
        {
          type: 'mini-simulate',
          instruction: 'Trickier! Spark needs to TURN to reach the star.',
          content: {
            gridSize: 5,
            start: [0, 0],
            goal: [3, 3],
            startHeading: 'right',
            hint: 'Go forward, then turn right, then forward again!',
          } satisfies MiniSimulateContent,
          successMessage: 'You just used a TURN! That\'s how every self-driving car works!',
          tryAgainMessage: 'Try turning when you reach the right column. Then go forward!',
        },
      ],
      starReward: 6,
      funFact:
        'The average smartphone app has 50,000 lines of code. You just wrote your first 8 lines — only 49,992 to go! 😂',
      sparkSays: [
        'I moved because of YOUR code! You\'re my programmer now!',
        'The first computer program was written in 1843 by Ada Lovelace — a woman! Before computers even existed! 🌟',
      ],
    },
  ],
  bossChallenge: {
    id: 'cave-boss',
    title: 'Navigate the Crystal Maze!',
    story: 'Spark is trapped in a crystal cave. Only your code can guide the way out!',
    challenge: 'Write a multi-step block-code program to navigate Spark through the maze',
    type: 'block-code',
    starsToUnlock: 32,
  },
}

// ────────────────────────────────────────────────────────────────────────────
// ZONE 6 — Launch Pad  (ages 10–12)
// ────────────────────────────────────────────────────────────────────────────
const launchPad: KidsZone = {
  id: 'launch-pad',
  name: 'Launch Pad',
  emoji: '🚀',
  tagline: 'Build robots that do real things.',
  ageRange: '11–14',
  color: '#F43F5E',
  bgGradient: 'from-rose-900 via-red-900 to-red-950',
  sparkMood: 'proud',
  worldMap: 'A space station with a rocket on the launch pad and a Mars rover in the bay',
  rewardPart: 'robot-rocket-pack',
  levels: [
    {
      id: 'python-first-look',
      title: 'Your First Python Code',
      emoji: '🐍',
      duration: '8 min',
      storyHook: 'Spark is upgrading from blocks to REAL code. Want to upgrade too?',
      conceptName: 'Python for Robotics',
      laymanExplanation:
        'Python is the most popular robot programming language in the world. It reads almost like English. Companies like Google, NASA and Instagram use Python. Now so will you.',
      analogy:
        'Block code is like training wheels. Python is riding without them. The road is the same — you\'re just going faster and further.',
      realRobotExample:
        'The Raspberry Pi robot brain runs Python. ROS (Robot Operating System) uses Python. Every robotics competition in India accepts Python code.',
      activities: [
        {
          type: 'fill-blank',
          instruction: 'Complete the Python line to move Spark forward!',
          content: {
            prompt: 'spark._____(3)   # move forward 3 steps',
            options: ['move_forward', 'go_forward', 'forwards', 'fwd'],
            correct: 0,
            hint: 'It\'s two words connected by an underscore.',
          } satisfies FillBlankContent,
          successMessage: 'You wrote Python! Real Python! The same language used on the actual Mars Rover! 🚀🐍',
          tryAgainMessage: 'Python loves clear names. Look at the comment — what does it say?',
        },
        {
          type: 'fill-blank',
          instruction: 'How many degrees in a right turn?',
          content: {
            prompt: 'spark.turn(____)   # turn right',
            options: ['45', '90', '180', '360'],
            correct: 1,
            hint: 'A square has four right turns to come back. 360 ÷ 4 = ?',
          } satisfies FillBlankContent,
          successMessage: '90° right! You speak my language now! 🐍',
          tryAgainMessage: '360° is a full circle. A quarter turn is one-fourth of that.',
        },
      ],
      starReward: 7,
      funFact:
        'Python was named after Monty Python\'s Flying Circus — a British comedy show. The creator wanted programming to be fun! 😄🐍',
      sparkSays: [
        'You just wrote Python! I run on Python. You\'re now speaking my language!',
        'Most Python programmers started older than you. You\'re ahead!',
      ],
    },
  ],
  bossChallenge: {
    id: 'launch-boss',
    title: 'Build the Robot Rocket!',
    story: 'Spark is going to space! Program the launch sequence in Python.',
    challenge: 'Sequence the rocket launch countdown and liftoff in the right order',
    type: 'sequence',
    starsToUnlock: 44,
  },
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────
export const KIDS_ZONES: KidsZone[] = [sparkGarden, robotHome, buildItBay, thinkTank, codeCave, launchPad]

export function getZone(id: string): KidsZone | undefined {
  return KIDS_ZONES.find(z => z.id === id)
}

export function getLevel(zoneId: string, levelId: string): KidsLevel | undefined {
  return getZone(zoneId)?.levels.find(l => l.id === levelId)
}

export function getMission(missionId: string): { zone: KidsZone; mission: KidsMission } | undefined {
  for (const z of KIDS_ZONES) {
    if (z.bossChallenge.id === missionId) return { zone: z, mission: z.bossChallenge }
  }
  return undefined
}

export const ROBOT_PARTS = [
  { id: 'robot-head',         name: "Spark's Head",          emoji: '🤖', zone: 'spark-garden',  description: 'Camera eyes and microphone ears — the thinking part!' },
  { id: 'robot-body',         name: 'Control Center Body',   emoji: '⬛', zone: 'robot-home',    description: 'Houses the Arduino brain and all the wires!' },
  { id: 'robot-arm',          name: 'Mighty Arm',            emoji: '🦾', zone: 'build-it-bay',  description: 'A 3-joint servo arm — picks and places objects!' },
  { id: 'robot-legs',         name: 'Speedy Wheels',         emoji: '⚙️', zone: 'think-tank',    description: 'Differential drive wheels — turn by spinning at different speeds!' },
  { id: 'robot-sensor-pack',  name: 'Sensor Backpack',       emoji: '📡', zone: 'code-cave',     description: 'Ultrasonic + colour + temperature combo!' },
  { id: 'robot-rocket-pack',  name: 'Rocket Booster',        emoji: '🚀', zone: 'launch-pad',    description: 'For reaching new heights!' },
] as const

export function partForZone(zoneId: string): string | undefined {
  return ROBOT_PARTS.find(p => p.zone === zoneId)?.id
}

// Zone-unlock star thresholds — matches bossChallenge.starsToUnlock semantically.
export const ZONE_UNLOCK_STARS: Record<string, number> = {
  'spark-garden': 0,
  'robot-home': 7,
  'build-it-bay': 14,
  'think-tank': 22,
  'code-cave': 32,
  'launch-pad': 44,
}

export function getRecommendedZone(age: number): string {
  if (age <= 6) return 'spark-garden'
  if (age <= 7) return 'robot-home'
  if (age <= 9) return 'build-it-bay'
  if (age <= 10) return 'think-tank'
  if (age <= 11) return 'code-cave'
  return 'launch-pad'
}

// ────────────────────────────────────────────────────────────────────────────
// Random praise + try-again phrases (kid-friendly)
// ────────────────────────────────────────────────────────────────────────────
export const PRAISE = [
  '⭐ Amazing!',
  '🔥 You got it!',
  '🎉 Brilliant!',
  '🌟 Robot legend!',
  '✨ Crushed it!',
  '💪 Strong work!',
  '🏆 Top scientist!',
  '🚀 Onwards!',
]

export const TRY_AGAIN = [
  'Oops! Try again!',
  'Almost! One more go!',
  'So close! Have another look!',
  'Hmm — let\'s try a different path!',
]

// ────────────────────────────────────────────────────────────────────────────
// Spark random tips (for the floating guide)
// ────────────────────────────────────────────────────────────────────────────
export const SPARK_TIPS = [
  'Did you know every ATM is secretly a robot? 🏧',
  'The Roomba vacuum was invented in 2002 — only 22 years old!',
  'India has 4 robots per 10,000 workers. South Korea has 1,012. Big opportunity!',
  'Mars Perseverance Rover is controlled from Earth — with a 20 MINUTE signal delay!',
  'Ada Lovelace wrote the first computer program in 1843 — before computers existed!',
  'The world\'s fastest robot runs 45 km/h — faster than Usain Bolt! 🏃',
  'The robot that built your phone screen has 8 motors in one arm!',
  'A Boeing 787 has more code than your laptop runs in a year — 14 million lines!',
  'The first humanoid robot, WABOT-1, was built in 1973 in Japan.',
  'Self-driving cars decide what to do 1,000 times per second!',
  'A bee has eyes (sensor), brain (think) and wings (actuators) — it\'s a biological robot! 🐝',
  'The DJI drone is a flying robot — and India is one of its biggest markets.',
  'ISRO\'s rovers are robots — programmed entirely by Indian engineers! 🇮🇳',
  'A washing machine uses 8 sensors to decide when to stop washing!',
  'The world has 4.28 million industrial robots — and we just keep building more.',
  'NASA\'s rovers can wait 18 months for a new instruction. Patience!',
  'The smart fridge in fancy homes can order milk by itself when you\'re running low!',
  'In 1997, IBM Deep Blue (a chess robot) beat the world champion!',
  'Pixar\'s Wall-E is fictional but inspired by real garbage-sorting robots!',
  'Most surgery robots are controlled by surgeons — but they don\'t shake like human hands.',
  'A robot in a Japanese factory can build a car in 17 hours, working non-stop.',
  'Boston Dynamics Spot can climb stairs better than most humans on bad knees! 🐕',
]
