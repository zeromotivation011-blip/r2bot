// lib/kids/curriculum/level3/guide.ts
// Teacher-guide data for Level 3 (Inventors, 11–13): the level's front matter
// for /kids/teach and, per session, what to gather and what to look for.
// The 40-minute plan, warm-up, discussion, misconceptions (each with a
// 5-minute reteach), differentiation and family note live in each Session's
// teacher/parent fields; lib/kids/teach/guides.ts renders both.

import type { LevelGuide } from './kit'

const SIM = 'One tablet or computer per pair, signed in to the class with its join code'

export const LEVEL3_GUIDE: LevelGuide = {
  level: 3,
  title: 'Level 3 · Inventors (ages 11–13): Ridgeback Station',
  intro:
    'Twenty-four 40-minute robotics lessons for ages 11–13, set on a mountain research station. Students give their robot a memory (variables), use maths in programs, hold a heading with the gyro, calibrate sensors, and build proportional controllers for steering, following and gentle approaches. They structure behaviour as state machines, log and summarise data honestly, plan within an energy budget, choose parts from fair tests, keep track of position with odometry and landmarks, and add fail-safes. The season ends with an autonomous whiteout rescue rover. Every lesson has an unplugged warm-up, a guided program, a challenge playable in the browser today, a three-question check whose wrong answers name the misconception behind them, and a five-minute reteach for each.',
  beforeYouStart: [
    'Students who did not take Level 2 should complete the two bridge missions first (about 2 × 30 minutes, self-paced).',
    'Pairs work best: rotate driver, navigator and recorder every run. Keep a printed results table per pair; several certificate criteria ask for logs.',
    'Each session names a playable challenge (a Universe game tier, a Code Lab mission, a Physics Lab arena or a Skill Galaxy activity) and two or three Galaxy activities for practice or homework.',
    'The check is a teaching moment, not a test: when several students pick the same wrong option, run that option’s five-minute reteach straight away.',
  ],
  pacing: [
    '40-minute periods: one session per period, as timed in each plan.',
    'Clubs of 60–90 minutes: one session plus its practice activities, or two lessons back to back (never two projects in one meeting).',
    'At home: a session is about 40 minutes; the family note says what was learned and offers a five-minute activity with things every home has.',
  ],
  assessment: [
    'Evidence comes from what students make and explain: simulator records of challenges and projects, results tables, the gain log (Session 8) and the state diagram (Session 24).',
    'The three-question check tells you which misconception to reteach; it is never a grade and never shown to other students.',
    'Project self-checks are reflection only. Peer feedback uses “two stars and a wish”. There are no rankings or leaderboards.',
  ],
  safety: [
    'No personal data: students use their class nickname; projects stay in the class gallery and are never public by default.',
    'Warm-ups use everyday materials. Supervise any step or stair activity (Session 11) and keep blindfold walks to cleared spaces with a spotter.',
    'Ethics discussions (Sessions 19, 22, 23) work best with agreed ground rules: everyone can disagree respectfully; nobody has to share a personal story.',
  ],
  sessions: {
    1: { materials: ['Mini whiteboard and marker', 'Five chairs and three sticky notes', SIM], lookFor: ['Students say the VALUE of a variable, not its name, when asked what it holds.', 'Pairs place “set to 0” before the loop without prompting by the challenge.'] },
    2: { materials: ['Tape measure or metre stick', 'Stopwatch (a phone is fine)', 'Results table: predicted / measured / difference', SIM], lookFor: ['Students write distance = speed × time with units.', 'Students explain a small gap between prediction and measurement as a real effect, not a broken sensor.'] },
    3: { materials: ['A chair as a target and 5 m of clear floor', SIM], lookFor: ['Students compute the error with the right sign (heading − target).', 'Students explain why equal motor power drifts on snow.'] },
    4: { materials: ['White, grey and black paper strips', SIM], lookFor: ['Students compute the threshold as the midpoint of their own light and dark readings.', 'Students explain why a threshold copied from elsewhere can fail.'] },
    5: { materials: ['Masking tape for a wavy floor line', SIM], lookFor: ['Students can say which wheel speeds up when the line is to the right.', 'Pairs record times for both followers and compare them fairly.'] },
    6: { materials: ['Planning sheets and pencils', 'Sticky notes for two stars and a wish', SIM], lookFor: ['The program works for several hut combinations, including none and all.', 'Students can explain what each of their variables remembers.'] },
    7: { materials: ['A corridor or clear floor for the human sled', SIM], lookFor: ['Students predict a negative speed when the gap is too small.', 'Students explain what happens at zero error.'] },
    8: { materials: ['Gain log sheet (gain / closest gap / description)', SIM], lookFor: ['Logs change one thing at a time.', 'Students choose a gain using their log, not a guess.'] },
    9: { materials: ['Paper for state diagrams', SIM], lookFor: ['State diagrams have labelled events on every arrow.', 'Code uses the same state numbers as the diagram.'] },
    10: { materials: ['A mini whiteboard for “smallest so far”', 'Printed table for four readings', SIM], lookFor: ['Students start “smallest so far” high and explain why.', 'Students distinguish total from average.'] },
    11: { materials: ['A backpack with a few books', 'A low, stable step (supervised)', 'Energy table printout', SIM], lookFor: ['Students calculate both route costs before choosing.', 'Students name mass, slope and speed as energy costs.'] },
    12: { materials: ['Sticky notes', 'Planning sheets', SIM], lookFor: ['Design choices are justified with the Session 8 log.', 'Reported numbers match the simulator readings.'] },
    13: { materials: ['Four shoe pictures (or real shoes)', 'Fair-test results table', SIM], lookFor: ['Tests change only the drive.', 'Justifications name what was given up (the trade-off).'] },
    14: { materials: ['An empty cereal box, a stapler, tape', SIM], lookFor: ['Students explain tipping with the centre of mass and the wheels’ footprint.', 'Students change one variable per try (position, then speed).'] },
    15: { materials: ['Masking tape or chalk for a floor grid', SIM], lookFor: ['Students change x or y according to the direction faced.', 'Students explain why the estimate drifts more with distance.'] },
    16: { materials: ['Two coloured A4 sheets with coordinates', 'The floor grid from Session 15', SIM], lookFor: ['Students replace (not average) the estimate at a landmark.', 'Students explain why counting and landmarks are used together.'] },
    17: { materials: ['A toy car and a pencil “wall”', SIM], lookFor: ['Students compute speed from the distance still to go.', 'Students explain why a minimum speed is needed.'] },
    18: { materials: ['Printed boulder-field grid per pair', 'Coloured pencils', 'Session 13 results tables', SIM], lookFor: ['The design justification quotes the student’s own data.', 'Students debug from a replay rather than restarting.'] },
    19: { materials: ['Blindfold, soft obstacles, a cleared space with a spotter', SIM], lookFor: ['Students describe shared control accurately (human goal, robot safety).', 'Students argue when a human must be able to take over.'] },
    20: { materials: ['None beyond devices', SIM], lookFor: ['Students treat a long run of “no echo” as “cannot see”, not “clear”.', 'Every safe stop in their program says why.'] },
    21: { materials: ['None beyond devices', SIM], lookFor: ['Safety checks are at the top of the ladder.', 'Students explain why only the first true rung acts.'] },
    22: { materials: ['Two printed versions of a results table', SIM], lookFor: ['Reports state what was left out and why.', 'Students propose rules for robots near wildlife.'] },
    23: { materials: ['Role and task cards per pair', SIM], lookFor: ['Parts hand on with the agreed state numbers.', 'Students name several field-robotics roles and the skills each uses.'] },
    24: { materials: ['Paper for the fault drill and state diagram', SIM], lookFor: ['The state diagram matches the final program.', 'The fail-safe is proven by covering a sensor.'] },
  },
}
