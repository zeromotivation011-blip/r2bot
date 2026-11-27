// lib/kids/curriculum/level4/guide.ts
// Teacher-guide data for Level 4 (Engineers, 14–17): the level's front matter
// for /kids/teach and, per session, what to gather and what to look for.
// Session plans (timing, warm-up, discussion, misconceptions with 5-minute
// reteaches, differentiation, family note) live in each Session.

import type { LevelGuide } from '../level3/kit'

const SIM = 'One device per pair, signed in to the class with its join code'

export const LEVEL4_GUIDE: LevelGuide = {
  level: 4,
  title: 'Level 4 · Engineers (ages 14–17): Red Valley',
  intro:
    'Twenty-four 40-minute robotics lessons for ages 14–17, set at a Mars-analog research base. Students treat their robot as an engineering system: they measure motor curves and dead zones, predict motion with differential-drive kinematics, build and tune P, I and D control, scan and map unknown ground, plan shortest paths with the wavefront method, layer behaviours by priority and design for minutes of communication delay. They test with normal, edge and failure cases, detect faults by comparing commands with measurements, filter noisy sensors, write a safety case backed by evidence, debate the ethics of autonomy, build a portfolio page and pass a design review. The capstone is an autonomous mission of their own design with a test log, a safety case and a write-up. Every check’s wrong answers name the misconception behind them, each with a five-minute reteach.',
  beforeYouStart: [
    'Students who did not take Level 3 should complete the two bridge missions first (variables and maths; proportional control).',
    'Work in pairs with rotating roles (driver, analyst, recorder). Keep a lab notebook per pair: logs, graphs and test plans feed the capstone and the certificate.',
    'Each session names a playable challenge (a Universe game at Ace or Legend tier, or a Skill Galaxy activity) and two or three Galaxy activities for practice or homework.',
    'The read-only text view of every program is the bridge to Python and ROS 2; point it out from Session 1.',
  ],
  pacing: [
    '40-minute periods: one session per period, as timed in each plan.',
    'Clubs of 60–90 minutes: one session plus its practice activities, or a lesson followed by extended tuning time. Projects (6, 12, 18, 24) benefit from a whole club meeting.',
    'Independent learners: a session is about 40 minutes; projects take two sittings.',
  ],
  assessment: [
    'Evidence is engineering evidence: simulator logs, ten-run results, tuning logs, test plans, a safety case and the capstone write-up.',
    'The three-question check is diagnostic: a common wrong answer points to the reteach to run, never to a grade.',
    'Design reviews use structured peer critique (two stars and a wish). No rankings, no leaderboards.',
  ],
  safety: [
    'No personal data in portfolios or write-ups: nicknames only. Sharing beyond the class and family needs a parent’s consent.',
    'Ethics sessions (17, 21) need ground rules: argue ideas, not people; nobody is asked to share personal experiences.',
    'Warm-ups use everyday objects; keep blindfold and moving activities to cleared spaces with a spotter.',
  ],
  sessions: {
    1: { materials: ['Paper and pens for system diagrams', SIM], lookFor: ['Diagrams show interfaces (arrows with what crosses them), not just boxes.', 'Students choose which subsystem to check first from evidence.'] },
    2: { materials: ['A heavy book and a table', 'Graph paper', SIM], lookFor: ['Plots have labelled axes and units; the dead zone is marked.', 'Students explain the dead zone as friction, not a fault.'] },
    3: { materials: ['Tape measure, cleared space', SIM], lookFor: ['Students rearrange R = (W/2)(vl + vr)/(vr − vl) correctly.', 'Students explain straight, spin and circle cases.'] },
    4: { materials: ['A straight floor line', SIM], lookFor: ['Students measure a steady-state error and relate it to Kp.', 'Students distinguish disturbance, measurement and error.'] },
    5: { materials: ['Tuning log sheets', SIM], lookFor: ['Tuning changes one gain at a time, in the order P, I, D.', 'Students explain what each term responds to (now, past, trend).'] },
    6: { materials: ['Results table for ten runs', SIM], lookFor: ['Ten logged runs with a success rate.', 'Failures are investigated by pattern, not dismissed.'] },
    7: { materials: ['A torch', 'Polar paper', SIM], lookFor: ['Sketches follow the data, with gaps acknowledged.', 'Students explain the step-size trade-off.'] },
    8: { materials: ['A sheet, books, rulers, grid paper', SIM], lookFor: ['Maps use free, blocked and unknown correctly.', 'Maps are drawn from the readings only.'] },
    9: { materials: ['6 × 6 wavefront worksheets', 'The printed rubble grid', SIM], lookFor: ['Wave numbers are correct and the path walks downhill.', 'Students can say why the result is shortest.'] },
    10: { materials: ['A cleared space', SIM], lookFor: ['Layer order in code matches the diagram.', 'Students justify priorities by urgency, not frequency.'] },
    11: { materials: ['Paper slips and a stopwatch', SIM], lookFor: ['Students compute delay correctly and explain why joysticking fails.', 'Stop reports carry step, cause and distance.'] },
    12: { materials: ['Session 8 notes', 'Grid paper', SIM], lookFor: ['Lane reports within 10 cm in at least four lanes.', 'The write-up explains why the survey had to be autonomous.'] },
    13: { materials: ['Five same-size objects (one red), a blindfold', SIM], lookFor: ['Grasp reliability is measured over ten trials.', 'Each miss has a named cause.'] },
    14: { materials: ['A calculator or phone', 'Test-plan template', SIM], lookFor: ['Expected results are written before running.', 'The whole plan is re-run after a fix.'] },
    15: { materials: ['None beyond devices', SIM], lookFor: ['Detectors use thresholds justified by measurements.', 'Repeated faults end in a named safe stop.'] },
    16: { materials: ['Printed item list with weights', 'Part table', SIM], lookFor: ['Every part on the slide has a number or test result beside it.', 'Students rule out options by requirement before comparing cost.'] },
    17: { materials: ['A cleared space', SIM], lookFor: ['The rover announces before moving and slows near people.', 'The handover releases only after the person has the object.'] },
    18: { materials: ['Fault matrix sheet', 'Test-plan template', SIM], lookFor: ['At least two fault types detected; never continues blind.', 'One documented failure led to a design change.'] },
    19: { materials: ['Rulers and two desks', SIM], lookFor: ['Students measure both smoothness and delay for each k.', 'Students choose a filter suited to the noise (median for spikes).'] },
    20: { materials: ['Safety-case template', SIM], lookFor: ['Each hazard row links cause, mitigation and evidence.', 'Unproven claims are marked honestly with a planned test.'] },
    21: { materials: ['Four corner signs and scenario cards', SIM], lookFor: ['The privacy pause works and is announced.', 'Arguments name specific people, data and risks.'] },
    22: { materials: ['Path cards', 'Portfolio template', SIM], lookFor: ['Portfolio claims are backed by logged evidence; no personal data.', 'Students map skills to at least three roles.'] },
    23: { materials: ['Projector or shared screen', 'Feedback cards', SIM], lookFor: ['Success measures are numeric and checkable.', 'Feedback is specific and actionable.'] },
    24: { materials: ['Write-up template', SIM], lookFor: ['The write-up lets a peer rerun the tests.', 'Results are reported honestly against the measure.'] },
  },
}
