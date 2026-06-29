// lib/diagnostic-questions.ts
// Adaptive question tree for the "Find Your Starting Point" experience.
// Phase 1 (warmup, 2 q) → Phase 2 (adaptive 4-7 q) → Phase 3 (path puzzle, client).
//
// Each question has explicit `onCorrect` / `onWrong` branches; the client walks
// the tree using these ids and never needs to know the structure.

export type QuestionType =
  | 'multi-image-select'  // tap all that apply (warmup Q1)
  | 'self-report'         // self-described experience (warmup Q2)
  | 'labelled-diagram'    // point at the right part
  | 'analogy'             // robot's X is like a human's ___
  | 'scenario-strip'      // 3-panel comic, pick the next frame
  | 'calculation'         // small numeric reasoning
  | 'path-puzzle'         // sentinel — handled by client (Phase 3)
  | 'true-false'          // simple visual yes/no
  | 'component-id'        // identify a labelled component
  | 'debug-scenario'      // pick the right diagnostic move

export type DiagnosticBand = 'warmup' | 'A' | 'B' | 'C'

export interface DiagnosticOption {
  label: string
  image?: string         // optional /public/images/diagnostic/*.svg
  emoji?: string         // optional inline glyph for big tap-target options
  correct: boolean
  explanation?: string   // one-line teaching note shown after picking
  // When set, this option fast-routes to a specific id (used by self-report Q).
  route?: string
}

export type SparkMoodHint =
  | 'happy' | 'celebrating' | 'oops' | 'thinking' | 'surprised' | 'proud'

export interface DiagnosticQuestion {
  id: string
  band: DiagnosticBand
  type: QuestionType
  prompt: string
  subprompt?: string
  image?: string                // hero illustration (svg)
  multi?: boolean               // multi-image-select uses this
  options: DiagnosticOption[]
  onCorrect: string             // next id, or 'path-puzzle', or 'result'
  onWrong: string               // easier id, or 'path-puzzle', or 'result'
  sparkReaction: {
    correct: string
    wrong: string
  }
  // Difficulty hint for end-of-run track scoring (1=easiest).
  difficulty: 1 | 2 | 3 | 4 | 5
}

// ── Phase 1: Warm-up (always shown, always in this order) ───────────────────

const WARMUP: DiagnosticQuestion[] = [
  {
    id: 'w-spot-robots',
    band: 'warmup',
    type: 'multi-image-select',
    prompt: 'Which of these is a robot?',
    subprompt: 'Tap all the ones you think count. There are no wrong answers — promise!',
    multi: true,
    options: [
      {
        label: 'Roomba (the round vacuum)',
        image: '/images/diagnostic/roomba.svg',
        correct: true,
        explanation: 'Yes! It senses dust, decides where to go, and moves — that\'s a robot.',
      },
      {
        label: 'Calculator',
        image: '/images/diagnostic/calculator.svg',
        correct: false,
        explanation: 'Not quite — it computes, but it doesn\'t sense or move on its own.',
      },
      {
        label: 'Smart traffic light',
        image: '/images/diagnostic/traffic-light.svg',
        correct: true,
        explanation: 'Surprise! Modern traffic lights sense car counts and decide signals.',
      },
      {
        label: 'Self-driving car',
        image: '/images/diagnostic/self-driving-car.svg',
        correct: true,
        explanation: 'Yes — sensors, computer, motors. A robot on wheels.',
      },
    ],
    onCorrect: 'w-experience',
    onWrong: 'w-experience',
    sparkReaction: {
      correct: 'Nice — robots are everywhere once you start spotting them!',
      wrong: 'No worries — we\'re going to learn how to spot them.',
    },
    difficulty: 1,
  },
  {
    id: 'w-experience',
    band: 'warmup',
    type: 'self-report',
    prompt: 'Have you ever built or programmed anything?',
    subprompt: 'Tap whatever feels closest. No wrong answer.',
    options: [
      {
        label: 'No, never tried',
        emoji: '🧱',
        correct: false,
        route: 'a-arm-hand',
      },
      {
        label: 'I\'ve used apps or games',
        emoji: '📱',
        correct: false,
        route: 'a-sensor-analogy',
      },
      {
        label: 'I\'ve built something physical',
        emoji: '🔧',
        correct: false,
        route: 'b-component-id',
      },
      {
        label: 'I\'ve written some code',
        emoji: '💻',
        correct: false,
        route: 'c-delivery-loop',
      },
    ],
    onCorrect: 'a-arm-hand',
    onWrong: 'a-arm-hand',
    sparkReaction: {
      correct: 'Got it — let\'s pick the right starting line for you.',
      wrong: 'Got it — let\'s pick the right starting line for you.',
    },
    difficulty: 1,
  },
]

// ── Phase 2 — Band A (curious beginner, max difficulty 2/5) ─────────────────

const BAND_A: DiagnosticQuestion[] = [
  {
    id: 'a-arm-hand',
    band: 'A',
    type: 'labelled-diagram',
    prompt: 'Look at this robot arm. Which part is the "hand"?',
    image: '/images/diagnostic/robot-arm.svg',
    options: [
      { label: 'A — the base', correct: false, explanation: 'The base holds the arm steady but doesn\'t grab anything.' },
      { label: 'B — the elbow joint', correct: false, explanation: 'The elbow lets it bend — but doesn\'t grip.' },
      { label: 'C — the gripper at the tip', correct: true, explanation: 'Yes! Engineers call this the "end effector" — the part that actually does the job.' },
      { label: 'D — the wrist motor', correct: false, explanation: 'The wrist rotates the gripper, but the gripper does the gripping.' },
    ],
    onCorrect: 'a-sensor-analogy',
    onWrong: 'a-true-roomba',
    sparkReaction: {
      correct: 'Yes! In robot-speak that\'s the "end effector".',
      wrong: 'Tricky! Let me show you the easier version.',
    },
    difficulty: 2,
  },
  {
    id: 'a-true-roomba',
    band: 'A',
    type: 'true-false',
    prompt: 'A robot vacuum cleaner like a Roomba is a real robot.',
    image: '/images/diagnostic/roomba-big.svg',
    options: [
      { label: 'True — it senses, decides, and moves', emoji: '✅', correct: true, explanation: 'Exactly! That\'s the recipe for a robot.' },
      { label: 'False — it\'s just a vacuum', emoji: '❌', correct: false, explanation: 'It does more than vacuum — it senses dirt and walls and decides where to go.' },
    ],
    onCorrect: 'a-sensor-analogy',
    onWrong: 'a-sensor-analogy',
    sparkReaction: {
      correct: 'You\'re getting it!',
      wrong: 'Sneaky — but it really is a robot.',
    },
    difficulty: 1,
  },
  {
    id: 'a-sensor-analogy',
    band: 'A',
    type: 'analogy',
    prompt: 'A robot\'s SENSOR is like a human\'s ___',
    options: [
      { label: 'Eyes and ears', emoji: '👀', correct: true, explanation: 'Yes! Sensors are how a robot sees, hears, and feels the world.' },
      { label: 'Muscles', emoji: '💪', correct: false, explanation: 'Muscles MOVE — sensors SENSE. Easy to mix up.' },
      { label: 'Brain', emoji: '🧠', correct: false, explanation: 'The brain THINKS — sensors feed it information.' },
      { label: 'Stomach', emoji: '🍔', correct: false, explanation: 'Cute guess! But the stomach is more like a battery.' },
    ],
    onCorrect: 'a-brain-analogy',
    onWrong: 'a-brain-analogy',
    sparkReaction: {
      correct: 'Boom! Sensors = eyes, ears, fingertips.',
      wrong: 'No problem — here\'s the rule of thumb: sensors take info IN.',
    },
    difficulty: 2,
  },
  {
    id: 'a-brain-analogy',
    band: 'A',
    type: 'analogy',
    prompt: 'A robot\'s CONTROLLER (its brain) decides what to do next. The closest human equivalent is…',
    options: [
      { label: 'Your brain making a decision', emoji: '🧠', correct: true, explanation: 'Exactly — the controller is the decision-maker.' },
      { label: 'Your heart pumping blood', emoji: '❤️', correct: false, explanation: 'That\'s more like the power system.' },
      { label: 'Your hands typing', emoji: '✋', correct: false, explanation: 'Those would be the motors (actuators) — they do, they don\'t decide.' },
      { label: 'Your skin', emoji: '🤲', correct: false, explanation: 'Skin is a sensor — it feels.' },
    ],
    onCorrect: 'path-puzzle',
    onWrong: 'a-true-roomba',
    sparkReaction: {
      correct: 'Spot on! You just learned the 3 parts of every robot.',
      wrong: 'No worries — let\'s nail one easier idea first.',
    },
    difficulty: 2,
  },
]

// ── Phase 2 — Band B (some experience, max difficulty 3/5) ─────────────────

const BAND_B: DiagnosticQuestion[] = [
  {
    id: 'b-component-id',
    band: 'B',
    type: 'component-id',
    prompt: 'Which component reads how far a wheel has turned?',
    image: '/images/diagnostic/components.svg',
    options: [
      { label: 'IR sensor', correct: false, explanation: 'IR sensors detect light — used for line following, not wheel rotation.' },
      { label: 'Encoder', correct: true, explanation: 'Yes! An encoder counts pulses per wheel turn.' },
      { label: 'Buzzer', correct: false, explanation: 'A buzzer makes sound — fun, but it doesn\'t measure anything.' },
      { label: 'LED', correct: false, explanation: 'An LED just lights up — it\'s an output, not a sensor.' },
    ],
    onCorrect: 'b-scenario-comic',
    onWrong: 'a-sensor-analogy',
    sparkReaction: {
      correct: 'Yes — encoders give robots a sense of distance!',
      wrong: 'Easy mix-up. Let\'s back up a step.',
    },
    difficulty: 3,
  },
  {
    id: 'b-scenario-comic',
    band: 'B',
    type: 'scenario-strip',
    prompt: 'The robot sees a wall. Pick the right next panel.',
    image: '/images/diagnostic/comic-strip.svg',
    options: [
      { label: 'Panel A — Robot speeds up', correct: false, explanation: 'Not yet — speeding INTO a wall is a crash.' },
      { label: 'Panel B — Robot stops and turns', correct: true, explanation: 'Yes! Sense → think → act.' },
      { label: 'Panel C — Robot keeps going', correct: false, explanation: 'Robots use sensors to AVOID obstacles — not ignore them.' },
      { label: 'Panel D — Robot goes invisible', correct: false, explanation: 'Sadly, no robots do this yet!' },
    ],
    onCorrect: 'b-light-calc',
    onWrong: 'a-sensor-analogy',
    sparkReaction: {
      correct: 'Perfect — sense → decide → act.',
      wrong: 'Tricky one. Let\'s rebuild the basics.',
    },
    difficulty: 3,
  },
  {
    id: 'b-light-calc',
    band: 'B',
    type: 'calculation',
    prompt: 'A robot wheel is 10 cm across. It spins 5 full turns. About how far did the robot move?',
    subprompt: 'Hint: a wheel "rolls out" its circumference each turn. Circumference ≈ 3.14 × diameter.',
    image: '/images/diagnostic/wheel-diagram.svg',
    options: [
      { label: '15 cm', correct: false, explanation: 'A bit low — that\'s less than one full turn would give.' },
      { label: '50 cm', correct: false, explanation: 'Close, but we forgot to multiply by π (~3.14).' },
      { label: '157 cm', correct: true, explanation: 'Right — 10 × 3.14 × 5 ≈ 157 cm. That\'s how odometry works!' },
      { label: '500 cm', correct: false, explanation: 'Too high — we don\'t need to multiply by 10.' },
    ],
    onCorrect: 'b-feedback',
    onWrong: 'a-brain-analogy',
    sparkReaction: {
      correct: 'Excellent — that math is exactly how a robot tracks its own movement.',
      wrong: 'No problem — let\'s go simpler.',
    },
    difficulty: 3,
  },
  {
    id: 'b-feedback',
    band: 'B',
    type: 'analogy',
    prompt: 'You ride a bicycle. Your eyes see you\'re drifting left, so you steer right. That loop — sense, decide, correct — is called a…',
    options: [
      { label: 'Feedback loop', correct: true, explanation: 'Yes! Robots use the same loop, just faster.' },
      { label: 'Power loop', correct: false, explanation: 'No — power is about battery, not correction.' },
      { label: 'Mind reading', correct: false, explanation: 'Fun guess! But it\'s really about reacting to information.' },
      { label: 'Open-loop control', correct: false, explanation: 'Open-loop means NO feedback — you just commit and hope.' },
    ],
    onCorrect: 'path-puzzle',
    onWrong: 'a-brain-analogy',
    sparkReaction: {
      correct: 'Big concept unlocked: feedback loops are everywhere.',
      wrong: 'Tricky! Let\'s anchor on the brain idea first.',
    },
    difficulty: 3,
  },
]

// ── Phase 2 — Band C (code/build experience, max difficulty 5/5) ───────────

const BAND_C: DiagnosticQuestion[] = [
  {
    id: 'c-delivery-loop',
    band: 'C',
    type: 'scenario-strip',
    prompt: 'A delivery robot reaches a door but no one is there. It waits 30 s, then leaves and marks the delivery "attempted". Which subsystem made that call?',
    options: [
      { label: 'The actuator system — it moved the robot away', correct: false, explanation: 'Actuators move on command — they don\'t decide WHY.' },
      { label: 'The controller — it processed inputs and chose an action', correct: true, explanation: 'Yes — the brain of the system, often a state machine.' },
      { label: 'The battery — low power triggered departure', correct: false, explanation: 'Battery thresholds matter, but the policy lives in the controller.' },
      { label: 'The GPS module — it detected the handler missing', correct: false, explanation: 'GPS gives location — not behaviour rules.' },
    ],
    onCorrect: 'c-debug-drift',
    onWrong: 'b-component-id',
    sparkReaction: {
      correct: 'Sharp — that\'s a classic state-machine call.',
      wrong: 'Let\'s step back to the building blocks.',
    },
    difficulty: 4,
  },
  {
    id: 'c-debug-drift',
    band: 'C',
    type: 'debug-scenario',
    prompt: 'You command both motors forward at equal PWM. The robot curves left every time. Same motor model. First debugging move?',
    options: [
      { label: 'Swap the left motor — must be defective', correct: false, explanation: 'Almost never the right first move — too expensive a guess.' },
      { label: 'Trim PWM values to match real-world output (small offsets cause drift)', correct: true, explanation: 'Yes — motors are never perfectly identical; PWM trim or closed-loop fixes it.' },
      { label: 'Add weight to the right side', correct: false, explanation: 'Weight hacks mask the real cause.' },
      { label: 'Recalibrate the IMU', correct: false, explanation: 'IMU has nothing to do with motor mismatch.' },
    ],
    onCorrect: 'c-redundancy',
    onWrong: 'b-feedback',
    sparkReaction: {
      correct: 'Exactly — first check the signal, not the silicon.',
      wrong: 'Reasonable thought, but the cheap fix wins first.',
    },
    difficulty: 4,
  },
  {
    id: 'c-redundancy',
    band: 'C',
    type: 'scenario-strip',
    prompt: 'A self-driving car\'s camera fails in glare. The car continues safely using LiDAR + radar. Which engineering principle is at work?',
    options: [
      { label: 'Redundancy — backup sensors take over when primary fails', correct: false, explanation: 'Close! Redundancy is duplicate sensors. This is different.' },
      { label: 'Graceful degradation — reduced capability, still operational', correct: true, explanation: 'Yes! The system loses one sense but keeps driving safely.' },
      { label: 'Fail-safe — shuts down to prevent harm', correct: false, explanation: 'Fail-safe means stop. Here, the car keeps going.' },
      { label: 'Hot-swapping — camera replaced while driving', correct: false, explanation: 'Cool idea, but not a real engineering principle for cars.' },
    ],
    onCorrect: 'c-slam',
    onWrong: 'b-feedback',
    sparkReaction: {
      correct: 'Big-leagues thinking — that\'s exactly the right distinction.',
      wrong: 'Subtle one. Let\'s reset on basics.',
    },
    difficulty: 5,
  },
  {
    id: 'c-slam',
    band: 'C',
    type: 'scenario-strip',
    prompt: 'A ROS2 robot must localise indoors without GPS or external markers. Which approach actually works?',
    options: [
      { label: 'Hard-code starting position and count steps', correct: false, explanation: 'Steps drift fast — errors compound.' },
      { label: 'Use wheel odometry + IMU and fuse with LiDAR for SLAM', correct: true, explanation: 'Yes — that\'s the textbook SLAM stack.' },
      { label: 'Bluetooth signal strength from nearby phones', correct: false, explanation: 'Way too noisy for robotics-grade localisation.' },
      { label: 'Camera-only — look at the ceiling', correct: false, explanation: 'Works sometimes, but fragile without depth cues.' },
    ],
    onCorrect: 'path-puzzle',
    onWrong: 'b-feedback',
    sparkReaction: {
      correct: 'You\'re thinking like a robotics engineer.',
      wrong: 'No shame — SLAM is genuinely tricky.',
    },
    difficulty: 5,
  },
]

// ── Tree assembly ──────────────────────────────────────────────────────────

const ALL: DiagnosticQuestion[] = [...WARMUP, ...BAND_A, ...BAND_B, ...BAND_C]

const BY_ID: Record<string, DiagnosticQuestion> = Object.fromEntries(
  ALL.map(q => [q.id, q]),
)

export function getQuestion(id: string): DiagnosticQuestion | null {
  return BY_ID[id] ?? null
}

export const FIRST_QUESTION_ID = 'w-spot-robots'

// ── Result mapping ─────────────────────────────────────────────────────────

export type DiagnosticTrack = 'spark' | 'wire' | 'forge' | 'edge'

export interface RunOutcome {
  track: DiagnosticTrack
  highestBand: DiagnosticBand
  correctCount: number
  totalAnswered: number
  pathPuzzleSolved: boolean
  bandsVisited: DiagnosticBand[]
  insights: string[]
}

/**
 * Map a completed run to a track. Mirrors prompt rules:
 *  - Ends in Band A → spark
 *  - Ends in Band B → wire (or forge if all correct + puzzle solved)
 *  - Ends in Band C → forge (or edge if all correct + puzzle solved)
 */
export function chooseTrack(input: {
  highestBand: DiagnosticBand
  correctCount: number
  totalAnswered: number
  pathPuzzleSolved: boolean
}): DiagnosticTrack {
  const { highestBand, correctCount, totalAnswered, pathPuzzleSolved } = input
  const accuracy = totalAnswered > 0 ? correctCount / totalAnswered : 0
  if (highestBand === 'C') {
    return accuracy >= 0.75 && pathPuzzleSolved ? 'edge' : 'forge'
  }
  if (highestBand === 'B') {
    return accuracy >= 0.75 && pathPuzzleSolved ? 'forge' : 'wire'
  }
  return 'spark'
}

/**
 * Build a personalised "what we learned about you" list (max 3 bullets).
 */
export function buildInsights(args: {
  spottedRobots: number    // 0-3 correct spots in warmup Q1
  experience: 'none' | 'apps' | 'physical' | 'code' | 'unknown'
  bandsVisited: DiagnosticBand[]
  correctCount: number
  totalAnswered: number
  pathPuzzleSolved: boolean
}): string[] {
  const out: string[] = []

  if (args.spottedRobots >= 2) {
    out.push('You spot robots in real life ✓')
  } else {
    out.push('Spotting robots in the wild is a new superpower for you 👀')
  }

  switch (args.experience) {
    case 'none':
      out.push('We start completely from scratch — no prior knowledge needed')
      break
    case 'apps':
      out.push('You\'re comfortable around tech — let\'s connect it to robots')
      break
    case 'physical':
      out.push('You\'ve made things in the real world — that hands-on brain helps a lot')
      break
    case 'code':
      out.push('You\'ve got code muscles — we\'ll point them at robotics fast')
      break
    case 'unknown':
      // skip
      break
  }

  if (args.pathPuzzleSolved) {
    out.push('You think in sequences — the path puzzle showed that')
  } else if (args.correctCount / Math.max(1, args.totalAnswered) >= 0.6) {
    out.push('You\'re already reasoning like a roboticist')
  } else {
    out.push('You\'re curious and willing to try — the most important trait')
  }

  return out.slice(0, 3)
}

// Lightweight question count for the progress dots — adapts to band reached.
export function expectedQuestionCount(maxBand: DiagnosticBand): number {
  if (maxBand === 'A') return 6
  if (maxBand === 'B') return 7
  return 8
}
