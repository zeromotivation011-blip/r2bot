// lib/school-curriculum.ts
// All learning data for R2BOT for Schools — curriculum, simulator missions, projects.

// ────────────────────────────────────────────────────────────────────────────
// Grades & tracks
// ────────────────────────────────────────────────────────────────────────────
export const SCHOOL_GRADES = [
  { id: 'grade-6-7',   label: 'Grade 6–7',   emoji: '🌱', tagline: 'Spot the robot · Day-to-day automation' },
  { id: 'grade-8-9',   label: 'Grade 8–9',   emoji: '🔌', tagline: 'How robots sense, move and think' },
  { id: 'grade-10',    label: 'Grade 10',    emoji: '🧠', tagline: 'Arduino · motors · PID basics' },
  { id: 'grade-11-12', label: 'Grade 11–12', emoji: '🚀', tagline: 'Python · vision · ROS · AI' },
] as const

export type SchoolGradeId = (typeof SCHOOL_GRADES)[number]['id']

export const SCHOOL_TRACKS = [
  { id: 'beginner', label: 'Beginner',  scoreMin: 0,  scoreMax: 8,  emoji: '🚀',
    blurb: "You're at the starting line! We'll explain everything from scratch." },
  { id: 'explorer', label: 'Explorer',  scoreMin: 9,  scoreMax: 14, emoji: '🧭',
    blurb: 'Great foundation! You know the basics. Let\'s go deeper.' },
  { id: 'builder',  label: 'Builder',   scoreMin: 15, scoreMax: 20, emoji: '🛠️',
    blurb: "Impressive! You're ready to code real robots." },
] as const

export type SchoolTrackId = (typeof SCHOOL_TRACKS)[number]['id']

// ────────────────────────────────────────────────────────────────────────────
// Concept / lesson types
// ────────────────────────────────────────────────────────────────────────────
export interface LessonConcept {
  term: string
  emoji: string
  layman: string
  analogy: string
  types?: string[]
  deepDive?: string
}

export interface LessonQuiz {
  question: string
  options: string[]
  correct: number
  explanation: string
}

export interface SchoolUnit {
  id: string
  title: string
  emoji: string
  tagline: string
  duration: string
  concepts: LessonConcept[]
  videoUrl: string
  videoTitle: string
  quiz: LessonQuiz[]
  nextMission?: string
  xpReward: number
}

export interface GradeCurriculum {
  label: string
  emoji: string
  units: SchoolUnit[]
}

// ────────────────────────────────────────────────────────────────────────────
// Full curriculum — all 4 grades have at least 3 fully-built units
// ────────────────────────────────────────────────────────────────────────────
export const SCHOOL_CURRICULUM: Record<SchoolGradeId, GradeCurriculum> = {
  'grade-6-7': {
    label: 'Grade 6–7',
    emoji: '🌱',
    units: [
      {
        id: 'what-is-a-robot',
        title: 'What Even IS a Robot?',
        emoji: '🤖',
        tagline: 'Spoiler: you already use 10 robots every day',
        duration: '15 min',
        videoUrl: 'https://www.youtube.com/embed/br0NW9i-gqs',
        videoTitle: 'Watch: What makes Spot a robot?',
        xpReward: 50,
        nextMission: 'drive-straight',
        concepts: [
          {
            term: 'Robot',
            emoji: '🤖',
            layman: 'A machine that can do a task on its own — without a human doing it manually every time.',
            analogy: 'Your dishwasher is a robot. You tell it once (press start) and it does everything by itself.',
            deepDive: 'Technically: a robot senses its environment, processes information, and acts on it.',
          },
          {
            term: 'Sensor',
            emoji: '👁️',
            layman: "A robot's sense organ. Like your eyes, ears, nose — but electronic.",
            analogy: 'When you touch something hot and pull back — your skin is acting like a sensor. A robot has electronic versions of this.',
            types: ['Camera (eyes)', 'Microphone (ears)', 'Temperature (skin)', 'Ultrasonic (bat sonar)', 'GPS (sense of direction)'],
          },
          {
            term: 'Actuator',
            emoji: '💪',
            layman: 'The part that MOVES. If a sensor is the eye, the actuator is the hand.',
            analogy: 'When you decide to pick up a glass, your arm is the actuator. In a robot: a motor, a wheel, a robotic arm.',
          },
          {
            term: 'Controller',
            emoji: '🧠',
            layman: "The robot's brain. Takes info from sensors, decides what to do, tells actuators to move.",
            analogy: 'You see a ball (sensor) → your brain decides to catch it (controller) → your hand moves (actuator). A robot works exactly the same way.',
          },
        ],
        quiz: [
          {
            question: "Your phone's screen brightness changes automatically in sunlight. Which robot part is doing this?",
            options: ['Sensor', 'Actuator', 'Battery', 'Speaker'],
            correct: 0,
            explanation: "The phone's light sensor detects bright sunlight and tells the screen to increase brightness.",
          },
          {
            question: 'An ATM counts and dispenses notes. The motor that moves the notes is the ___',
            options: ['Controller', 'Sensor', 'Actuator', 'Processor'],
            correct: 2,
            explanation: 'The motor that physically moves the banknotes is an actuator — the action part!',
          },
          {
            question: "Why isn't a calculator a robot?",
            options: ['It has no sensors', "It can't sense the world AND act on its own", 'It has no battery', "It's too small"],
            correct: 1,
            explanation: "A robot must sense, think AND act. A calculator just does math when YOU press buttons — it doesn't act on its own.",
          },
        ],
      },
      {
        id: 'robots-around-us',
        title: "Robots You've Used Today",
        emoji: '🏙️',
        tagline: 'ATM, elevator, rice mill, your car — all robots',
        duration: '12 min',
        videoUrl: 'https://www.youtube.com/embed/Ki4tBPQfvyQ',
        videoTitle: 'Watch: 10 robots hiding in your daily life',
        xpReward: 40,
        nextMission: 'drive-straight',
        concepts: [
          {
            term: 'ATM',
            emoji: '🏧',
            layman: 'An ATM is a robot bank teller. It counts notes, checks your card, and dispenses cash without a human.',
            analogy: 'Imagine a bank cashier who works 24/7 and never needs lunch — that\'s an ATM.',
          },
          {
            term: 'Elevator',
            emoji: '🛗',
            layman: 'A lift is a robot that knows which floors to visit, in what order, and waits for the right moment to open doors.',
            analogy: 'When 5 people press buttons, the lift decides who to pick up first — that decision logic is its controller.',
          },
          {
            term: 'Washing machine',
            emoji: '🧺',
            layman: 'Senses water level, weighs your clothes, picks a wash time. Acts on its own once you press start.',
            analogy: 'You decide the wash settings; the machine does the rest. That hand-off is the key idea of a robot.',
          },
          {
            term: 'UPI payment',
            emoji: '📱',
            layman: 'UPI is a software robot: it routes your money between banks in seconds, with no human in the loop.',
            analogy: "It's like a thousand bank clerks working at light speed — only there are no clerks.",
          },
        ],
        quiz: [
          {
            question: 'Is an automatic ticket gate at the metro a robot?',
            options: ['No, no battery', 'Yes — it senses your card and opens the gate', 'Only if it has a screen', 'No, gates are not robots'],
            correct: 1,
            explanation: 'It senses (RFID card), decides (valid? balance?), and acts (opens the flap). Classic robot.',
          },
          {
            question: 'Which is NOT a robot?',
            options: ['Roomba vacuum', 'Refrigerator with auto-defrost', 'A book', 'Auto-irrigation drip system'],
            correct: 2,
            explanation: "A book just sits there. The rest sense their environment and act.",
          },
          {
            question: 'A rice mill that sorts good grains from bad ones is a ___',
            options: ['Robot', 'Toy', 'Computer game', 'Filter'],
            correct: 0,
            explanation: 'It senses (camera/IR), decides (good/bad), acts (air-blasts bad grains away). Robot.',
          },
        ],
      },
      {
        id: 'parts-of-a-robot',
        title: 'Inside a Robot',
        emoji: '🔩',
        tagline: 'Tear one apart (virtually)',
        duration: '18 min',
        videoUrl: 'https://www.youtube.com/embed/Yu7Aesg6ZbQ',
        videoTitle: 'Watch: A robot, completely disassembled',
        xpReward: 60,
        nextMission: 'u-turn',
        concepts: [
          {
            term: 'Chassis',
            emoji: '🛡️',
            layman: 'The skeleton/body of the robot. Everything else bolts onto it.',
            analogy: 'Like the frame of a bicycle.',
          },
          {
            term: 'Motors',
            emoji: '⚙️',
            layman: 'The muscles. They spin wheels, move arms, lift objects.',
            analogy: 'Think bicycle pedals — but powered by electricity instead of legs.',
            types: ['DC motor (constant spin)', 'Servo motor (precise angle)', 'Stepper motor (counts steps)'],
          },
          {
            term: 'Battery',
            emoji: '🔋',
            layman: 'Where the robot stores energy.',
            analogy: 'Your stomach holds calories; the battery holds electricity.',
          },
          {
            term: 'Microcontroller',
            emoji: '💾',
            layman: 'A tiny computer that runs the robot\'s code.',
            analogy: 'Like a Raspberry Pi or Arduino — small, cheap, and dedicated to one robot.',
          },
        ],
        quiz: [
          {
            question: 'Which part decides what the robot should do next?',
            options: ['Battery', 'Microcontroller', 'Chassis', 'Wheel'],
            correct: 1,
            explanation: 'The microcontroller runs the code and makes the call.',
          },
          {
            question: 'Servo motors are different from DC motors because they ___',
            options: ['Are bigger', 'Move to a precise angle', 'Use no electricity', 'Are louder'],
            correct: 1,
            explanation: 'A servo can be told "go to 90°" exactly — a DC motor just spins.',
          },
          {
            question: 'What runs out first if you leave a robot on?',
            options: ['Wheels', 'Code', 'Battery', 'Chassis'],
            correct: 2,
            explanation: 'Energy runs out — battery dies first.',
          },
        ],
      },
    ],
  },

  'grade-8-9': {
    label: 'Grade 8–9',
    emoji: '🔌',
    units: [
      {
        id: 'how-robots-move',
        title: 'How Robots Move',
        emoji: '🏃',
        tagline: 'Wheels, legs, propellers — and the maths behind them',
        duration: '20 min',
        videoUrl: 'https://www.youtube.com/embed/tF4DML7FIWk',
        videoTitle: 'Watch: How a 4-wheel robot turns',
        xpReward: 70,
        nextMission: 'u-turn',
        concepts: [
          {
            term: 'Differential drive',
            emoji: '🛞',
            layman: 'Two wheels, two motors. Make them spin at different speeds → robot turns. Same speed → straight.',
            analogy: 'Like rowing a boat: pull harder on the left oar and the boat turns right.',
          },
          {
            term: 'Holonomic drive',
            emoji: '🔄',
            layman: 'Special wheels (omni or mecanum) let the robot slide sideways without turning.',
            analogy: 'Like a shopping trolley — it can scoot in any direction without rotating.',
          },
          {
            term: 'Legged locomotion',
            emoji: '🐾',
            layman: 'Walking with legs. Much harder than wheels — balance is the big problem.',
            analogy: 'Toddlers fall a lot for the same reason robots do: balance is computed, not given.',
          },
        ],
        quiz: [
          {
            question: 'A robot\'s left wheel spins fast, right wheel slow. Which way does it turn?',
            options: ['Left', 'Right', 'Stays put', 'Goes back'],
            correct: 1,
            explanation: 'Faster wheel on the outside → robot turns toward the slower wheel = right.',
          },
          {
            question: 'Why are walking robots harder to build than wheeled ones?',
            options: ['They are more expensive', 'Balance has to be computed every moment', 'Legs are heavier', 'Legs cost more'],
            correct: 1,
            explanation: 'Balance is the killer — wheels are statically stable, legs are not.',
          },
          {
            question: 'Mecanum wheels let a robot ___',
            options: ['Climb stairs', 'Move sideways without turning', 'Float on water', 'Run faster'],
            correct: 1,
            explanation: 'Their angled rollers let the robot slide in any direction.',
          },
        ],
      },
      {
        id: 'sensors-deep-dive',
        title: 'How Robots See and Feel',
        emoji: '👁️',
        tagline: 'Camera, ultrasonic, LIDAR — what each one does best',
        duration: '22 min',
        videoUrl: 'https://www.youtube.com/embed/dRTFq8VCK_M',
        videoTitle: 'Watch: How self-driving cars see the world',
        xpReward: 80,
        nextMission: 'stop-before-wall',
        concepts: [
          {
            term: 'Ultrasonic sensor',
            emoji: '🦇',
            layman: 'Sends out sound waves and listens for the echo to measure distance.',
            analogy: 'Exactly how bats fly in the dark.',
          },
          {
            term: 'IR sensor',
            emoji: '🔴',
            layman: 'Detects light reflection — useful for line-following and obstacle detection.',
            analogy: 'Like a torch + a light meter glued together.',
          },
          {
            term: 'LIDAR',
            emoji: '📡',
            layman: 'A laser scanner that makes a 360° map of the surroundings.',
            analogy: 'Imagine spinning a laser pointer 1,000 times a second and recording where it lands.',
          },
        ],
        quiz: [
          {
            question: 'Which sensor would you use to follow a black line on white floor?',
            options: ['Ultrasonic', 'IR', 'GPS', 'Microphone'],
            correct: 1,
            explanation: 'IR senses reflectivity — black absorbs, white reflects.',
          },
          {
            question: 'A self-driving car needs to know how far away every car is. The best sensor is ___',
            options: ['IR', 'Ultrasonic', 'LIDAR', 'Temperature'],
            correct: 2,
            explanation: 'LIDAR scans 360°, hundreds of metres, very precisely.',
          },
          {
            question: 'Bats use which type of sensing for flight?',
            options: ['LIDAR', 'GPS', 'Ultrasonic', 'IR'],
            correct: 2,
            explanation: 'Sound echolocation — the same idea as ultrasonic sensors.',
          },
        ],
      },
      {
        id: 'intro-to-coding',
        title: 'Talk to a Robot',
        emoji: '💬',
        tagline: 'Block code, then real code',
        duration: '25 min',
        videoUrl: 'https://www.youtube.com/embed/zOjov-2OZ0E',
        videoTitle: 'Watch: From blocks to Python',
        xpReward: 90,
        nextMission: 'follow-line',
        concepts: [
          {
            term: 'Algorithm',
            emoji: '🪜',
            layman: 'A precise step-by-step recipe.',
            analogy: 'Maggie noodles: boil → add masala → 2 mins → eat. That is an algorithm.',
          },
          {
            term: 'If / Else',
            emoji: '🔀',
            layman: 'Decision making in code. "IF this happens THEN do that ELSE do something else."',
            analogy: '"IF it rains, take umbrella, ELSE wear sunglasses."',
          },
          {
            term: 'Loop',
            emoji: '🔁',
            layman: 'Doing something repeatedly.',
            analogy: 'Brushing teeth: repeat 2 minutes — that is a loop.',
          },
        ],
        quiz: [
          {
            question: 'What is the right order to make tea (algorithm)?',
            options: ['Drink → Add milk → Boil', 'Boil water → Add tea leaves → Add milk', 'Add milk → Boil water → Add tea', 'Add tea → Drink → Boil'],
            correct: 1,
            explanation: 'Algorithms care about order. Mess it up = no tea.',
          },
          {
            question: 'A line-follower robot uses which structure most?',
            options: ['Loop', 'If/Else', 'Both', 'Neither'],
            correct: 2,
            explanation: 'It loops forever and uses if/else: "IF on line, go straight, ELSE turn".',
          },
          {
            question: '"Repeat 3 times: jump" is a ___',
            options: ['Variable', 'Loop', 'Sensor', 'Comment'],
            correct: 1,
            explanation: 'Repetition = loop.',
          },
        ],
      },
    ],
  },

  'grade-10': {
    label: 'Grade 10',
    emoji: '🧠',
    units: [
      {
        id: 'arduino-basics',
        title: 'Arduino: Your First Robot Brain',
        emoji: '🟦',
        tagline: 'A ₹350 board that runs millions of real robots',
        duration: '25 min',
        videoUrl: 'https://www.youtube.com/embed/nL34zDTPkcs',
        videoTitle: 'Watch: Arduino in 60 seconds',
        xpReward: 100,
        nextMission: 'drive-straight',
        concepts: [
          {
            term: 'Arduino',
            emoji: '🟦',
            layman: 'A small, cheap, easy microcontroller board. It runs code you upload from your laptop.',
            analogy: 'Like a Raspberry Pi for robots — but simpler and tougher.',
          },
          {
            term: 'Digital pin',
            emoji: '🔌',
            layman: 'A pin that can be either ON (5V) or OFF (0V).',
            analogy: 'Like a light switch — only two positions.',
          },
          {
            term: 'PWM',
            emoji: '〰️',
            layman: 'Trick to fake "in-between" voltages by flicking on/off very fast.',
            analogy: 'Like dimming a light by flicking the switch 100 times per second.',
          },
        ],
        quiz: [
          {
            question: 'An Arduino digital pin can output ___',
            options: ['Any voltage', 'Only 0V or 5V', '12V', '230V'],
            correct: 1,
            explanation: 'Digital pins are binary: on or off.',
          },
          {
            question: 'How do you make an LED glow at half brightness?',
            options: ['Use 2.5V battery', 'Use PWM', 'Use a smaller LED', 'Not possible'],
            correct: 1,
            explanation: 'PWM rapidly switches the pin to simulate analog voltage.',
          },
          {
            question: 'The Arduino code that runs first and once is ___',
            options: ['loop()', 'setup()', 'main()', 'start()'],
            correct: 1,
            explanation: 'setup() runs once at boot, loop() runs forever after.',
          },
        ],
      },
      {
        id: 'motors-and-servos',
        title: 'Making Things Move',
        emoji: '⚙️',
        tagline: 'DC motor vs servo vs stepper — when to use each',
        duration: '20 min',
        videoUrl: 'https://www.youtube.com/embed/0qwrnUeSpYQ',
        videoTitle: 'Watch: DC vs servo vs stepper',
        xpReward: 90,
        nextMission: 'pick-box',
        concepts: [
          {
            term: 'DC motor',
            emoji: '🌀',
            layman: 'Give it voltage, it spins. Reverse the voltage, it spins backward.',
            analogy: 'Like a fan — once you turn it on, it just keeps going.',
          },
          {
            term: 'Servo motor',
            emoji: '🎯',
            layman: 'You tell it an angle (0° to 180°) and it moves to that angle and holds.',
            analogy: 'Like a dial — you set it to a number, it stays there.',
          },
          {
            term: 'Stepper motor',
            emoji: '👣',
            layman: 'Moves in tiny precise steps. 200 steps = one full rotation.',
            analogy: 'A 3D printer\'s extruder uses a stepper for pinpoint accuracy.',
          },
        ],
        quiz: [
          {
            question: 'Which motor would you use for a robotic arm joint?',
            options: ['DC', 'Servo', 'Stepper', 'Any'],
            correct: 1,
            explanation: 'Arm joints need precise angles — servo is built for that.',
          },
          {
            question: '3D printers move the print head with ___',
            options: ['DC', 'Stepper', 'Servo', 'AC motor'],
            correct: 1,
            explanation: 'Steppers give the millimetric precision printers need.',
          },
          {
            question: 'The simplest robot car uses ___ motors for its wheels',
            options: ['Servo', 'Stepper', 'DC', 'Brushless'],
            correct: 2,
            explanation: 'Wheels just need to spin continuously — DC is cheapest and easiest.',
          },
        ],
      },
      {
        id: 'pid-control',
        title: 'PID: How Robots Stay Balanced',
        emoji: '⚖️',
        tagline: 'The 3-letter idea behind every self-balancing robot',
        duration: '28 min',
        videoUrl: 'https://www.youtube.com/embed/4Y7zG48uHRo',
        videoTitle: 'Watch: PID explained in 5 minutes',
        xpReward: 120,
        nextMission: 'follow-line',
        concepts: [
          {
            term: 'P — Proportional',
            emoji: '📏',
            layman: 'React in proportion to how far off you are. Big error → big correction.',
            analogy: 'Driving — the more you drift from your lane, the more you steer back.',
          },
          {
            term: 'I — Integral',
            emoji: '📚',
            layman: 'Look at the cumulative error over time and correct slow long-term drift.',
            analogy: 'If you\'re always slightly to the right of centre, slowly steer left to fix it.',
          },
          {
            term: 'D — Derivative',
            emoji: '🚀',
            layman: 'How fast the error is changing. Damp overshoot.',
            analogy: 'A bike: even if you\'re upright now, lean speed tells you to brake the lean.',
          },
        ],
        quiz: [
          {
            question: 'Which PID term reacts to how fast the error is changing?',
            options: ['P', 'I', 'D', 'None'],
            correct: 2,
            explanation: 'Derivative = rate of change.',
          },
          {
            question: 'A self-balancing robot mostly uses ___',
            options: ['Just P', 'PID', 'Just I', 'No control'],
            correct: 1,
            explanation: 'All three terms — pure P would oscillate forever.',
          },
          {
            question: 'If your robot keeps overshooting the line, increase ___',
            options: ['P', 'I', 'D', 'Speed'],
            correct: 2,
            explanation: 'D damps overshoot.',
          },
        ],
      },
    ],
  },

  'grade-11-12': {
    label: 'Grade 11–12',
    emoji: '🚀',
    units: [
      {
        id: 'python-for-robots',
        title: 'Python × Robotics',
        emoji: '🐍',
        tagline: 'Why Python is the lingua franca of robotics',
        duration: '25 min',
        videoUrl: 'https://www.youtube.com/embed/kqtD5dpn9C8',
        videoTitle: 'Watch: Python in 90 seconds',
        xpReward: 100,
        nextMission: 'sort-boxes',
        concepts: [
          {
            term: 'Why Python',
            emoji: '🐍',
            layman: 'Reads like English. Huge library ecosystem. Used by ROS, OpenCV, PyTorch.',
            analogy: 'It\'s the WhatsApp of programming — almost everyone has it.',
          },
          {
            term: 'Lists & dicts',
            emoji: '📦',
            layman: 'Lists hold ordered items. Dicts hold name → value pairs.',
            analogy: 'List = grocery bag (order matters). Dict = phonebook (name → number).',
          },
          {
            term: 'Function',
            emoji: '🛠️',
            layman: 'A reusable block of code with a name.',
            analogy: 'Like a saved recipe you can call any time.',
          },
        ],
        quiz: [
          {
            question: 'Which is a Python dict?',
            options: ['[1,2,3]', '{"name":"R2"}', '(1,2,3)', '"hi"'],
            correct: 1,
            explanation: 'Curly braces with key→value pairs.',
          },
          {
            question: 'Why is Python popular in robotics?',
            options: ['Fastest language', 'Huge library + readable', 'Cheapest', 'Has GUI'],
            correct: 1,
            explanation: 'Readability + libraries beat raw speed for prototyping.',
          },
          {
            question: 'def greet(name): return "Hi " + name — what is greet?',
            options: ['Variable', 'Function', 'List', 'Class'],
            correct: 1,
            explanation: 'def declares a function.',
          },
        ],
      },
      {
        id: 'computer-vision-intro',
        title: 'Teaching Robots to See',
        emoji: '🎥',
        tagline: 'How OpenCV turns pixels into decisions',
        duration: '30 min',
        videoUrl: 'https://www.youtube.com/embed/oXlwWbU8l2o',
        videoTitle: 'Watch: 5-minute OpenCV tour',
        xpReward: 130,
        nextMission: 'sort-boxes',
        concepts: [
          {
            term: 'Pixel',
            emoji: '🟦',
            layman: 'A single coloured dot. An image is a grid of millions of them.',
            analogy: 'Like the tiles of a mosaic.',
          },
          {
            term: 'Colour threshold',
            emoji: '🌈',
            layman: 'A rule that says "pixels in this colour range = the object I want".',
            analogy: 'Like sorting M&Ms by colour with a sieve that only lets red ones through.',
          },
          {
            term: 'Edge detection',
            emoji: '✏️',
            layman: 'Highlight only the outlines in an image.',
            analogy: 'Like turning a photo into a pencil sketch.',
          },
        ],
        quiz: [
          {
            question: 'A 1080p frame is ___ pixels wide',
            options: ['720', '1080', '1920', '4096'],
            correct: 2,
            explanation: '1080p = 1920×1080.',
          },
          {
            question: 'To detect a red ball, you would use ___',
            options: ['Edge detection', 'Colour threshold', 'GPS', 'PID'],
            correct: 1,
            explanation: 'Threshold the red colour channel.',
          },
          {
            question: 'OpenCV is a ___',
            options: ['Robot brand', 'Computer-vision library', 'Programming language', 'Sensor'],
            correct: 1,
            explanation: 'Library of CV functions — most popular in the world.',
          },
        ],
      },
      {
        id: 'ros-first-look',
        title: 'ROS: The Robot Internet',
        emoji: '🌐',
        tagline: 'How big robots talk to themselves',
        duration: '28 min',
        videoUrl: 'https://www.youtube.com/embed/HDOyW42pYBo',
        videoTitle: 'Watch: ROS in 5 minutes',
        xpReward: 140,
        nextMission: 'maze',
        concepts: [
          {
            term: 'Node',
            emoji: '🔵',
            layman: 'A small program that does one job (e.g. read a camera).',
            analogy: 'One employee in a factory who does one specific task.',
          },
          {
            term: 'Topic',
            emoji: '📡',
            layman: 'A named channel that nodes use to broadcast or receive messages.',
            analogy: 'Like a WhatsApp group — anyone subscribed gets the message.',
          },
          {
            term: 'Service',
            emoji: '☎️',
            layman: 'A request/response call. "Hey arm, lift to 90°" → "Done."',
            analogy: 'A phone call instead of a group chat.',
          },
        ],
        quiz: [
          {
            question: 'A camera-reading program in ROS is called a ___',
            options: ['Topic', 'Node', 'Service', 'Robot'],
            correct: 1,
            explanation: 'Each independent program = one node.',
          },
          {
            question: 'Nodes share data through ___',
            options: ['USB', 'Email', 'Topics', 'Pixels'],
            correct: 2,
            explanation: 'Topics are the broadcast channels.',
          },
          {
            question: 'ROS stands for ___',
            options: ['Robot OS', 'Real-time OS', 'Robotic Open Source', 'Rendered Open Server'],
            correct: 0,
            explanation: 'Robot Operating System.',
          },
        ],
      },
      {
        id: 'ai-in-robots',
        title: 'AI + Robots = ?',
        emoji: '🧠',
        tagline: 'What changes when robots can learn',
        duration: '30 min',
        videoUrl: 'https://www.youtube.com/embed/cdiD-9MMpb0',
        videoTitle: 'Watch: AI-powered robots, today',
        xpReward: 160,
        concepts: [
          {
            term: 'Machine learning',
            emoji: '📈',
            layman: 'Instead of writing rules, you show the robot examples and it figures out the rule.',
            analogy: 'Like teaching a kid what a cat is — by showing pictures, not by giving a definition.',
          },
          {
            term: 'Neural network',
            emoji: '🕸️',
            layman: 'A web of mini decision-makers stacked in layers — the engine behind most modern AI.',
            analogy: 'Like a relay race where the baton (data) is reshaped by every runner.',
          },
          {
            term: 'Reinforcement learning',
            emoji: '🏆',
            layman: 'Robot tries things, gets rewards for good actions, learns by trial and error.',
            analogy: 'Like training a dog with treats.',
          },
        ],
        quiz: [
          {
            question: 'A robot that gets +1 for picking up a cup and -1 for dropping it is using ___',
            options: ['Supervised learning', 'Reinforcement learning', 'PID', 'Rule-based'],
            correct: 1,
            explanation: 'Rewards = reinforcement learning.',
          },
          {
            question: 'Which is needed to TRAIN a neural network?',
            options: ['One example', 'Lots of examples', 'No examples', 'Battery'],
            correct: 1,
            explanation: 'NN learn statistical patterns — they need lots of data.',
          },
          {
            question: 'Tesla cars use a neural net to ___',
            options: ['Decide steering from camera', 'Charge battery', 'Lock doors', 'Play music'],
            correct: 0,
            explanation: 'Vision → steering is the famous Tesla NN.',
          },
        ],
      },
    ],
  },
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
export function countUnits(grade: SchoolGradeId): number {
  return SCHOOL_CURRICULUM[grade]?.units.length ?? 0
}

export function getUnit(grade: SchoolGradeId, unitId: string): SchoolUnit | undefined {
  return SCHOOL_CURRICULUM[grade]?.units.find(u => u.id === unitId)
}

// ────────────────────────────────────────────────────────────────────────────
// Simulator missions
// ────────────────────────────────────────────────────────────────────────────
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

export interface SimMission {
  id: string
  title: string
  emoji: string
  difficulty: Difficulty
  story: string
  objective: string
  xp: number
  requiresSensors?: ('ultrasonic' | 'colour' | 'camera' | 'touch')[]
  arena: 'empty' | 'wall' | 'line' | 'maze' | 'hospital' | 'factory' | 'farm' | 'sort'
}

export const MISSIONS: SimMission[] = [
  { id: 'drive-straight', title: 'Drive 1 Metre', emoji: '➡️', difficulty: 'Beginner',
    story: 'The warehouse robot needs to reach the shelf. Help it drive in a straight line!',
    objective: 'Drive forward for exactly 100 units without hitting a wall',
    xp: 30, arena: 'empty' },
  { id: 'u-turn', title: 'U-Turn & Return', emoji: '↩️', difficulty: 'Beginner',
    story: 'The robot delivered the package but needs to come back!',
    objective: 'Drive forward, turn 180°, drive back to start',
    xp: 40, arena: 'empty' },
  { id: 'follow-line', title: 'Follow the Line', emoji: '〰️', difficulty: 'Intermediate',
    story: 'Factory robots follow painted lines on the floor. Can you program yours?',
    objective: 'Follow the black line to the red destination marker',
    xp: 60, requiresSensors: ['colour'], arena: 'line' },
  { id: 'stop-before-wall', title: "Don't Crash!", emoji: '🛑', difficulty: 'Intermediate',
    story: 'The hospital robot must stop before hitting the patient\'s bed.',
    objective: 'Drive forward but stop when closer than 30 units to the wall',
    xp: 60, requiresSensors: ['ultrasonic'], arena: 'wall' },
  { id: 'pick-box', title: 'Pick Up the Box', emoji: '📦', difficulty: 'Intermediate',
    story: 'Warehouse robot needs to pick up a package from location A.',
    objective: 'Navigate to box, activate arm, pick up box',
    xp: 80, arena: 'empty' },
  { id: 'sort-boxes', title: 'Sort the Boxes', emoji: '🔴🔵', difficulty: 'Advanced',
    story: 'Sort red boxes to the right bin and blue boxes to the left. This is how Amazon does it!',
    objective: 'Detect box colour, navigate to correct bin, drop box',
    xp: 120, requiresSensors: ['colour'], arena: 'sort' },
  { id: 'hospital-delivery', title: 'Medicine Delivery', emoji: '🏥', difficulty: 'Advanced',
    story: "Apollo Hospital's robot delivers medicine to Bed 3.",
    objective: 'Navigate from pharmacy to Bed 3 without hitting walls',
    xp: 150, requiresSensors: ['ultrasonic'], arena: 'hospital' },
  { id: 'water-plant', title: 'Water the Plants', emoji: '🌱', difficulty: 'Advanced',
    story: 'Smart farm robot needs to water 4 different plant zones with exact amounts.',
    objective: 'Visit all 4 plant zones and activate watering for the correct duration',
    xp: 150, arena: 'farm' },
  { id: 'factory-assemble', title: 'Factory Assembly', emoji: '🏭', difficulty: 'Expert',
    story: 'Assemble 3 parts in the correct sequence. This is how Maruti builds cars!',
    objective: 'Pick Part A → place, pick Part B → attach, pick Part C → attach',
    xp: 200, arena: 'factory' },
  { id: 'maze', title: 'The Final Maze', emoji: '🌀', difficulty: 'Expert',
    story: 'The ultimate challenge. Navigate the maze using only your sensors. No peeking!',
    objective: 'Solve the maze using only distance sensor data',
    xp: 300, requiresSensors: ['ultrasonic'], arena: 'maze' },
]

export function getMission(id: string): SimMission | undefined {
  return MISSIONS.find(m => m.id === id)
}

// ────────────────────────────────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────────────────────────────────
export interface Part {
  name: string
  purpose: string
  cost: string
  link?: string
}

export interface SchoolProject {
  id: string
  title: string
  emoji: string
  difficulty: Difficulty
  tagline: string
  cost: string
  skills: string[]
  duration?: string
  steps?: number
  realWorldLink?: string
  simulationMission?: string
  parts: Part[]
  circuit: string
  arduinoCode: string
  pythonCode: string
  buildSteps: { title: string; body: string }[]
}

const COMMON_PARTS_LINE: Part[] = [
  { name: 'Arduino Uno', purpose: "The robot's brain — runs your code", cost: '₹350', link: 'https://robu.in/product/arduino-uno-r3' },
  { name: 'IR sensor module ×2', purpose: 'Eyes that detect black vs white surfaces', cost: '₹80', link: 'https://robu.in/' },
  { name: 'L298N motor driver', purpose: 'Translates code commands into motor power', cost: '₹120', link: 'https://robu.in/' },
  { name: 'DC gear motors + wheels (×2)', purpose: 'What makes the robot move', cost: '₹200', link: 'https://robu.in/' },
  { name: '9V battery + clip', purpose: 'Power', cost: '₹50' },
  { name: 'Robot chassis', purpose: 'The body — everything bolts on this', cost: '₹150' },
]

const COMMON_PARTS_OBSTACLE: Part[] = [
  { name: 'Arduino Uno', purpose: "The robot's brain", cost: '₹350' },
  { name: 'HC-SR04 ultrasonic sensor', purpose: 'Measures distance to the nearest obstacle', cost: '₹80' },
  { name: 'L298N motor driver', purpose: 'Drives the wheel motors', cost: '₹120' },
  { name: 'DC motors + wheels (×2)', purpose: 'Move the chassis', cost: '₹200' },
  { name: '9V battery', purpose: 'Power', cost: '₹50' },
]

export const PROJECTS: SchoolProject[] = [
  {
    id: 'line-follower',
    title: 'Line-Following Robot',
    emoji: '〰️',
    difficulty: 'Beginner',
    tagline: 'Build a robot that follows a black line on the floor — like factory bots at Maruti',
    cost: '₹950',
    skills: ['IR Sensors', 'Motors', 'Basic Code'],
    duration: '3 hours',
    steps: 7,
    realWorldLink: 'Maruti Suzuki uses these in their Manesar factory',
    simulationMission: 'follow-line',
    parts: COMMON_PARTS_LINE,
    circuit: `Arduino digital pins:
 D2 → Left IR OUT
 D4 → Right IR OUT
 D5 → L298N IN1   (left motor)
 D6 → L298N IN2
 D9 → L298N IN3   (right motor)
 D10 → L298N IN4
9V battery → L298N 12V input
GND common to Arduino & L298N`,
    arduinoCode: `// Line follower — Arduino C
const int L_IR = 2, R_IR = 4;
const int IN1 = 5, IN2 = 6, IN3 = 9, IN4 = 10;

void setup() {
  pinMode(L_IR, INPUT);  pinMode(R_IR, INPUT);
  pinMode(IN1, OUTPUT);  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);  pinMode(IN4, OUTPUT);
}

void drive(int l, int r) {
  digitalWrite(IN1, l > 0); digitalWrite(IN2, l < 0);
  digitalWrite(IN3, r > 0); digitalWrite(IN4, r < 0);
}

void loop() {
  int L = digitalRead(L_IR);  // 1 = black line under sensor
  int R = digitalRead(R_IR);
  if (L && R)      drive(1, 1);      // both on line → go straight
  else if (L && !R) drive(-1, 1);    // off right → steer right
  else if (!L && R) drive(1, -1);    // off left → steer left
  else              drive(0, 0);     // lost line → stop
}`,
    pythonCode: `# Equivalent in Python (e.g. on a Raspberry Pi)
while True:
    L = read_ir('left')
    R = read_ir('right')
    if L and R:    motor.drive(1, 1)
    elif L:        motor.drive(-1, 1)
    elif R:        motor.drive(1, -1)
    else:          motor.stop()`,
    buildSteps: [
      { title: 'Assemble the chassis', body: 'Bolt the two motors onto the chassis. Attach wheels. Add the caster wheel at the back.' },
      { title: 'Mount the IR sensors', body: 'Fix the two IR sensors at the front of the chassis, 2 cm apart, 5 mm above the floor.' },
      { title: 'Wire the motor driver', body: 'Connect both motors to OUT1/OUT2 and OUT3/OUT4 on the L298N.' },
      { title: 'Wire IR + Arduino', body: 'Sensors → D2, D4. Driver IN1–IN4 → D5, D6, D9, D10.' },
      { title: 'Power up', body: 'Use a 9V battery to the L298N 12V terminal and a 5V regulator to the Arduino.' },
      { title: 'Upload the code', body: 'Paste the Arduino sketch and upload via the Arduino IDE.' },
      { title: 'Test on a black-tape track', body: 'Stick black insulation tape on a white floor and watch it follow!' },
    ],
  },
  {
    id: 'obstacle-avoider',
    title: 'Obstacle Avoider',
    emoji: '🛑',
    difficulty: 'Beginner',
    tagline: 'Robot that sees walls and goes around them — exactly how Roomba works',
    cost: '₹800',
    skills: ['Ultrasonic Sensor', 'Motors', 'Logic'],
    duration: '2 hours',
    steps: 6,
    realWorldLink: 'iRobot Roomba uses this same technique',
    simulationMission: 'stop-before-wall',
    parts: COMMON_PARTS_OBSTACLE,
    circuit: `HC-SR04 → Arduino:
 VCC → 5V
 GND → GND
 TRIG → D7
 ECHO → D8
Motors via L298N as in line-follower wiring.`,
    arduinoCode: `// Obstacle avoider
const int TRIG = 7, ECHO = 8;
const int IN1 = 5, IN2 = 6, IN3 = 9, IN4 = 10;

long cm() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) / 58;
}

void setup() {
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
}

void loop() {
  long d = cm();
  if (d > 30) {                // clear path → go
    digitalWrite(IN1, HIGH); digitalWrite(IN3, HIGH);
    digitalWrite(IN2, LOW);  digitalWrite(IN4, LOW);
  } else {                     // obstacle → turn right
    digitalWrite(IN1, HIGH); digitalWrite(IN3, LOW);
    digitalWrite(IN2, LOW);  digitalWrite(IN4, HIGH);
    delay(400);
  }
}`,
    pythonCode: `# Pseudocode equivalent
while True:
    d = ultrasonic.distance()
    if d > 30: motor.drive(1, 1)
    else:      motor.turn_right(0.4)`,
    buildSteps: [
      { title: 'Build the chassis', body: 'Same as line-follower — 2 motors + caster.' },
      { title: 'Mount ultrasonic', body: 'Fix the HC-SR04 to the front facing forward.' },
      { title: 'Wire ultrasonic', body: 'VCC, GND, TRIG=D7, ECHO=D8.' },
      { title: 'Wire motors', body: 'Through L298N as in the standard wiring.' },
      { title: 'Upload code', body: 'Open Arduino IDE, paste, upload.' },
      { title: 'Test', body: 'Place a chair in front — robot should turn away.' },
    ],
  },
  {
    id: 'robotic-arm',
    title: 'Robotic Arm',
    emoji: '🦾',
    difficulty: 'Intermediate',
    tagline: 'Pick and place objects with a 3-DOF arm — like the arms in car factories',
    cost: '₹1,800',
    skills: ['Servo Motors', 'Inverse Kinematics basics', 'Python'],
    duration: '5 hours',
    steps: 8,
    realWorldLink: 'Kuka arms in every Indian car plant work this way',
    simulationMission: 'pick-box',
    parts: [
      { name: 'Arduino Uno', purpose: 'Brain', cost: '₹350' },
      { name: 'SG90 servo × 3', purpose: '3 arm joints (base, shoulder, gripper)', cost: '₹600' },
      { name: 'Arm acrylic kit', purpose: 'Pre-cut arm parts', cost: '₹650' },
      { name: 'Jumper wires + breadboard', purpose: 'Connections', cost: '₹150' },
      { name: '5V 2A adapter', purpose: 'Servos need clean power', cost: '₹250' },
    ],
    circuit: `Servo signal lines → D6 (base), D9 (shoulder), D11 (gripper)
5V → all servo Vcc, GND common.`,
    arduinoCode: `#include <Servo.h>
Servo base, shoulder, gripper;

void setup() {
  base.attach(6); shoulder.attach(9); gripper.attach(11);
}

void loop() {
  base.write(0);       delay(800);  // sweep
  shoulder.write(45);  delay(800);
  gripper.write(120);  delay(500);  // close
  base.write(120);     delay(800);
  gripper.write(60);   delay(500);  // open
}`,
    pythonCode: `# Equivalent: pyserial → Arduino, or direct on a Pi with gpiozero
import time
arm.base.angle(0);     time.sleep(0.8)
arm.shoulder.angle(45);time.sleep(0.8)
arm.gripper.close();   time.sleep(0.5)
arm.base.angle(120);   time.sleep(0.8)
arm.gripper.open()`,
    buildSteps: [
      { title: 'Mount the base servo', body: 'Bolt the base servo onto a plywood platform.' },
      { title: 'Attach the shoulder', body: 'Fix the shoulder servo on the base bracket.' },
      { title: 'Add elbow + gripper', body: 'Slot the SG90 gripper onto the elbow link.' },
      { title: 'Wire servos', body: 'Signal lines → D6/D9/D11. Power via 5V adapter.' },
      { title: 'Upload sweep code', body: 'Verify each joint moves through its full range.' },
      { title: 'Calibrate', body: 'Note each joint\'s usable angles (avoid hitting itself).' },
      { title: 'Program a pick sequence', body: 'Use the recorded angles to do a real pick & place.' },
      { title: 'Add a stand', body: 'Bolt the base to a small wooden plate for stability.' },
    ],
  },
  {
    id: 'smart-dustbin',
    title: 'Smart Dustbin',
    emoji: '🗑️',
    difficulty: 'Intermediate',
    tagline: 'Lid opens automatically when your hand comes near — using ultrasonic sensor',
    cost: '₹650',
    skills: ['Ultrasonic', 'Servo', 'Threshold logic'],
    duration: '2 hours',
    steps: 5,
    parts: [
      { name: 'Arduino Uno', purpose: 'Brain', cost: '₹350' },
      { name: 'HC-SR04', purpose: 'Detects approaching hand', cost: '₹80' },
      { name: 'SG90 servo', purpose: 'Lifts the lid', cost: '₹200' },
      { name: 'Wires + small dustbin', purpose: 'Body', cost: '₹20' },
    ],
    circuit: 'TRIG→D7, ECHO→D8, Servo signal→D9, 5V/GND common.',
    arduinoCode: `#include <Servo.h>
Servo lid;
const int TRIG = 7, ECHO = 8;

long cm() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) / 58;
}

void setup() {
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  lid.attach(9); lid.write(0);
}

void loop() {
  long d = cm();
  if (d > 0 && d < 15) { lid.write(90); delay(2500); lid.write(0); }
}`,
    pythonCode: `# Pi version (gpiozero)
while True:
    if ultrasonic.distance < 0.15:
        lid.angle = 90; sleep(2.5); lid.angle = 0`,
    buildSteps: [
      { title: 'Mount the servo', body: 'Glue/screw the servo onto the dustbin rim — its horn lifts the lid.' },
      { title: 'Fix the ultrasonic', body: 'Stick the HC-SR04 on the front of the dustbin, facing outward.' },
      { title: 'Wire and power', body: 'TRIG→D7, ECHO→D8, servo→D9, 5V and GND.' },
      { title: 'Upload code', body: 'Test by waving a hand 10 cm away.' },
      { title: 'Mount neatly', body: 'Use double-sided foam tape and hide wires inside the lid.' },
    ],
  },
  {
    id: 'plant-watering-bot',
    title: 'Plant Watering Bot',
    emoji: '🌱',
    difficulty: 'Intermediate',
    tagline: 'Waters plants automatically based on soil moisture — Israel uses this on 95% of farms',
    cost: '₹1,200',
    skills: ['Moisture sensor', 'Pump relay', 'Automation'],
    duration: '3 hours',
    steps: 6,
    simulationMission: 'water-plant',
    parts: [
      { name: 'Arduino Uno', purpose: 'Brain', cost: '₹350' },
      { name: 'Soil moisture sensor', purpose: 'Detects how dry the soil is', cost: '₹100' },
      { name: '12V mini water pump', purpose: 'Pumps water to the plant', cost: '₹250' },
      { name: 'Relay module', purpose: 'Lets Arduino switch the pump on/off', cost: '₹100' },
      { name: '12V adapter', purpose: 'Power for the pump', cost: '₹200' },
      { name: 'Tubing + nozzle', purpose: 'Carries water', cost: '₹200' },
    ],
    circuit: 'Moisture A0 + 5V/GND, Relay IN→D7, Pump on relay COM/NO.',
    arduinoCode: `const int SOIL = A0, RELAY = 7;
void setup() {
  pinMode(RELAY, OUTPUT); Serial.begin(9600);
}
void loop() {
  int v = analogRead(SOIL);   // dry ≈ 900, wet ≈ 300
  Serial.println(v);
  if (v > 700) digitalWrite(RELAY, HIGH);    // pump ON
  else         digitalWrite(RELAY, LOW);     // pump OFF
  delay(5000);
}`,
    pythonCode: `while True:
    if soil.dry():  pump.on()
    else:           pump.off()
    sleep(5)`,
    buildSteps: [
      { title: 'Insert moisture probe', body: 'Push it into the plant soil — not too deep.' },
      { title: 'Mount pump in water container', body: 'Submerge the inlet, route tubing to the plant.' },
      { title: 'Wire relay → pump', body: '12V to pump VCC via relay COM/NO. Trigger relay from D7.' },
      { title: 'Wire sensor', body: 'A0 reads soil dryness.' },
      { title: 'Upload code', body: 'Calibrate the threshold to match YOUR soil.' },
      { title: 'Run for a week', body: 'Watch your plant survive without you.' },
    ],
  },
  {
    id: 'gesture-car',
    title: 'Gesture-Controlled Car',
    emoji: '🖐️🚗',
    difficulty: 'Intermediate',
    tagline: 'Control a car with hand tilts using an accelerometer — like Nintendo Switch',
    cost: '₹1,500',
    skills: ['MPU6050 accelerometer', 'RF module', 'Wireless'],
    duration: '4 hours',
    steps: 7,
    parts: [
      { name: 'Arduino Nano (×2)', purpose: 'One on glove, one on car', cost: '₹500' },
      { name: 'MPU6050', purpose: 'Detects hand tilt', cost: '₹150' },
      { name: 'nRF24L01 pair', purpose: 'Wireless link', cost: '₹250' },
      { name: 'Motors + chassis + battery', purpose: 'The car', cost: '₹600' },
    ],
    circuit: 'Glove: MPU6050 → I2C, nRF24 → SPI. Car: nRF24 → SPI, motors via L298N.',
    arduinoCode: `// Transmitter (glove)
#include <Wire.h>
#include <MPU6050.h>
MPU6050 mpu;
void setup() { Wire.begin(); mpu.initialize(); }
void loop() {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);
  // send ax, ay via nRF24 to the car
}`,
    pythonCode: `# Pi version — read MPU6050 over I2C and send via UART/RF
while True:
    ax, ay = mpu.accel_xy()
    radio.send(ax, ay)`,
    buildSteps: [
      { title: 'Build the car', body: '2-motor chassis with Arduino Nano + nRF24.' },
      { title: 'Build the glove', body: 'Strap Nano + MPU6050 + nRF24 to a glove.' },
      { title: 'Test radio link', body: 'Send a counter from glove → confirm car receives.' },
      { title: 'Read MPU6050', body: 'Print accel X/Y to serial — should change with tilt.' },
      { title: 'Map tilt → steering', body: 'Forward tilt = throttle, side tilt = steer.' },
      { title: 'Tune dead-zones', body: 'Avoid jitter at rest.' },
      { title: 'Race a friend', body: 'It just works.' },
    ],
  },
  {
    id: 'fire-bot',
    title: 'Fire Detection Robot',
    emoji: '🔥',
    difficulty: 'Intermediate',
    tagline: 'Detects fire and sprays water — used in warehouses and data centres',
    cost: '₹1,100',
    skills: ['Flame sensor', 'Servo pump', 'Alert system'],
    duration: '3 hours',
    steps: 6,
    parts: [
      { name: 'Arduino Uno', purpose: 'Brain', cost: '₹350' },
      { name: 'Flame sensor', purpose: 'Detects IR from flame', cost: '₹100' },
      { name: 'Mini water pump + relay', purpose: 'Sprays water', cost: '₹350' },
      { name: 'Buzzer + LED', purpose: 'Audio/visual alarm', cost: '₹60' },
      { name: 'Chassis + battery', purpose: 'Robot body', cost: '₹240' },
    ],
    circuit: 'Flame sensor DO→D2, Relay IN→D7, Buzzer→D8, LED→D13.',
    arduinoCode: `const int FLAME = 2, RELAY = 7, BUZZ = 8;
void setup() {
  pinMode(FLAME, INPUT);
  pinMode(RELAY, OUTPUT);
  pinMode(BUZZ, OUTPUT);
}
void loop() {
  if (digitalRead(FLAME) == LOW) {  // flame near
    digitalWrite(RELAY, HIGH);
    tone(BUZZ, 1000);
  } else {
    digitalWrite(RELAY, LOW);
    noTone(BUZZ);
  }
}`,
    pythonCode: `while True:
    if flame.detected():
        pump.on(); buzzer.on()
    else:
        pump.off(); buzzer.off()`,
    buildSteps: [
      { title: 'Mount flame sensor on chassis', body: 'Point it forward.' },
      { title: 'Add the pump + tank', body: 'Small water tank with submerged pump.' },
      { title: 'Wire relay → pump', body: 'D7 → relay, relay → pump.' },
      { title: 'Wire buzzer + LED', body: 'Visual + audio alarm.' },
      { title: 'Upload code', body: 'Light a match nearby — sensor should trigger.' },
      { title: 'Field test (safely!)', body: 'Use a candle, away from flammables.' },
    ],
  },
  {
    id: 'warehouse-sorter',
    title: 'Colour-Sorting Bot',
    emoji: '🔴🔵',
    difficulty: 'Advanced',
    tagline: "Sorts objects by colour into bins — how Amazon's warehouse robots work",
    cost: '₹1,600',
    skills: ['Colour sensor', 'Servo arm', 'Decision logic'],
    duration: '5 hours',
    steps: 7,
    simulationMission: 'sort-boxes',
    parts: [
      { name: 'Arduino Uno', purpose: 'Brain', cost: '₹350' },
      { name: 'TCS3200 colour sensor', purpose: 'Reads object colour', cost: '₹250' },
      { name: 'SG90 servo × 2', purpose: 'Sweeps box to correct bin', cost: '₹400' },
      { name: 'Chassis + battery', purpose: 'Body + power', cost: '₹350' },
      { name: 'Wires + breadboard', purpose: 'Wiring', cost: '₹150' },
      { name: 'Plastic bins', purpose: 'Sorting bins', cost: '₹100' },
    ],
    circuit: 'TCS3200: S0–S3 → D2–D5, OUT → D6. Servos → D9 (arm), D10 (gate).',
    arduinoCode: `// Colour sensing — TCS3200 reads RGB pulses
const int S0=2,S1=3,S2=4,S3=5,OUT=6;
void setup() {
  for (int p=S0; p<=S3; p++) pinMode(p, OUTPUT);
  pinMode(OUT, INPUT);
  digitalWrite(S0, HIGH); digitalWrite(S1, LOW);  // 20% scaling
}
String readColour() {
  digitalWrite(S2, LOW);  digitalWrite(S3, LOW);  long r = pulseIn(OUT, LOW);
  digitalWrite(S2, HIGH); digitalWrite(S3, HIGH); long g = pulseIn(OUT, LOW);
  digitalWrite(S2, LOW);  digitalWrite(S3, HIGH); long b = pulseIn(OUT, LOW);
  if (r < g && r < b) return "RED";
  if (b < g && b < r) return "BLUE";
  return "OTHER";
}`,
    pythonCode: `while True:
    c = colour_sensor.read()
    if c == 'RED':  arm.sweep_right()
    elif c == 'BLUE': arm.sweep_left()`,
    buildSteps: [
      { title: 'Mount sensor over conveyor', body: 'Sensor 2 cm above where objects pass.' },
      { title: 'Add arm servo', body: 'Sweeps left/right.' },
      { title: 'Wire it all up', body: 'Per circuit notes above.' },
      { title: 'Calibrate colours', body: 'Test pulse counts for RED / BLUE / WHITE.' },
      { title: 'Write decision code', body: 'Map colour → bin direction.' },
      { title: 'Add a gate servo', body: 'Only opens when a colour is detected.' },
      { title: 'Run 10 mixed boxes', body: '100% sort accuracy = success.' },
    ],
  },
  {
    id: 'hospital-delivery-bot',
    title: 'Hospital Delivery Robot',
    emoji: '🏥',
    difficulty: 'Advanced',
    tagline: 'Navigate corridors and deliver to specific rooms — Apollo Hospitals uses this',
    cost: '₹2,200',
    skills: ['Navigation', 'RFID', 'Path planning'],
    duration: '8 hours',
    steps: 8,
    simulationMission: 'hospital-delivery',
    parts: [
      { name: 'Arduino Mega', purpose: 'More pins for sensors', cost: '₹700' },
      { name: 'Ultrasonic ×3 (front, L, R)', purpose: 'Avoid walls', cost: '₹240' },
      { name: 'RFID RC522', purpose: 'Identify rooms by tag', cost: '₹150' },
      { name: 'OLED display', purpose: 'Show destination', cost: '₹250' },
      { name: 'Chassis + motors + battery', purpose: 'Drive system', cost: '₹860' },
    ],
    circuit: 'Ultrasonics on D22–D27, RFID on SPI, OLED on I2C.',
    arduinoCode: `// Hospital delivery — simplified main loop
void loop() {
  if (frontDistance() < 30) turnAwayFromNearest();
  else                       driveForward();
  if (rfidNearby() == "BED3") deliver();
}`,
    pythonCode: `# ROS-style sketch
while True:
    if lidar.front < 30: nav.turn_to_open()
    else:                 nav.forward()
    if rfid.read() == 'BED3': deliver()`,
    buildSteps: [
      { title: 'Build a 4-wheel chassis', body: 'More stable than 2-wheel.' },
      { title: 'Mount 3 ultrasonics', body: 'Front, left, right.' },
      { title: 'Add RFID reader', body: 'For room identification.' },
      { title: 'Add OLED display', body: 'For status messages.' },
      { title: 'Wire it all up', body: 'Per circuit notes — uses Mega for the extra pins.' },
      { title: 'Write nav code', body: 'Bug2 algorithm or wall-following.' },
      { title: 'Tag the rooms', body: 'Stick RFID cards near each bed.' },
      { title: 'Test deliveries', body: 'Send the robot to specific beds.' },
    ],
  },
  {
    id: 'mini-autonomous-car',
    title: 'Mini Self-Driving Car',
    emoji: '🚗',
    difficulty: 'Expert',
    tagline: 'Combines line following + obstacle avoidance + colour sorting. Your capstone.',
    cost: '₹2,500',
    skills: ['All sensors', 'Python', 'State machine', 'PID'],
    duration: '12 hours',
    steps: 10,
    simulationMission: 'maze',
    parts: [
      { name: 'Raspberry Pi 4 (2GB)', purpose: 'Powerful brain', cost: '₹4,500 (existing OK)' },
      { name: 'Pi camera', purpose: 'Vision', cost: '₹600' },
      { name: 'Ultrasonic ×2', purpose: 'Side ranging', cost: '₹160' },
      { name: 'IR sensor ×2', purpose: 'Line following', cost: '₹80' },
      { name: 'Motors + L298N + chassis', purpose: 'Drivetrain', cost: '₹600' },
      { name: '7.4V LiPo + step-down', purpose: 'Power', cost: '₹560' },
    ],
    circuit: 'Pi GPIO drives L298N. Camera on CSI. Sensors on assorted GPIOs.',
    arduinoCode: `// Capstone is mostly Python on the Pi — see Python tab.`,
    pythonCode: `import time
from sensors import line, distance, colour
from drive import motor

STATE = 'LINE'
while True:
    if distance.front() < 25:
        STATE = 'AVOID'
    elif STATE == 'AVOID' and distance.front() > 60:
        STATE = 'LINE'

    if STATE == 'LINE':
        l, r = line.read()
        if l and r:    motor.drive(0.6, 0.6)
        elif l:        motor.drive(-0.3, 0.6)
        elif r:        motor.drive(0.6, -0.3)
        else:          motor.stop()
    elif STATE == 'AVOID':
        motor.turn_right(0.4); time.sleep(0.5)`,
    buildSteps: [
      { title: 'Build the chassis', body: 'Heavier — needs to carry Pi + battery.' },
      { title: 'Install Raspberry Pi OS Lite', body: 'Enable SSH and the camera.' },
      { title: 'Mount the camera up front', body: 'Fix the Pi camera with a 3D-printed bracket.' },
      { title: 'Connect motors via L298N', body: 'Pi GPIO → L298N.' },
      { title: 'Wire IR + ultrasonic', body: 'Two IR for line, two ultrasonic for sides.' },
      { title: 'Install OpenCV', body: '`sudo apt install python3-opencv`.' },
      { title: 'Drive test', body: 'Verify motors react to GPIO from a simple Python script.' },
      { title: 'Add line-follow Python', body: 'Reuse the line-follower logic.' },
      { title: 'Add state machine', body: 'LINE / AVOID / DONE.' },
      { title: 'Race the maze', body: 'Time yourself. Tune PID. Repeat.' },
    ],
  },
]

export function getProject(id: string): SchoolProject | undefined {
  return PROJECTS.find(p => p.id === id)
}
