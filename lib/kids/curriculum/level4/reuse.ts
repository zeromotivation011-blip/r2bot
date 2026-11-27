// lib/kids/curriculum/level4/reuse.ts
// What each Level 4 session is built from (roadmap #23). `play` is the
// challenge beat as a teen can play it TODAY — a Universe game at a tier, or a
// Skill Galaxy activity — and `practice` lists 2–3 Engineers-band Galaxy
// activities on the session's concepts. verify.ts (../level3/verify.ts) checks
// every id, band and concept overlap. Light: safe in a client island.

import type { SessionReuse } from '../level3/reuse-kit'

export const LEVEL4_REUSE: SessionReuse[] = [
  // Act 1 — Landing
  { session: 'L4-S01', play: { kind: 'activity', id: 'sensors-en-03', goal: 'Name the sensors in a robot cell: map each to the subsystem it feeds.' }, practice: ['sensors-en-04', 'ai-en-09'] },
  { session: 'L4-S02', play: { kind: 'activity', id: 'motion-en-01', goal: 'Half a metre by encoder: relate motor turns to distance travelled.' }, practice: ['design-en-03', 'mechanics-en-01'] },
  { session: 'L4-S03', play: { kind: 'activity', id: 'motion-en-07', goal: 'Differential-drive kinematics: predict the motion from two wheel speeds.' }, practice: ['motion-en-02', 'mechanics-en-06'] },
  { session: 'L4-S04', play: { kind: 'activity', id: 'ocean-tune-pid-station-keeping', goal: 'Hold still in the current: reject a constant disturbance with feedback.' }, practice: ['control-en-04', 'city-tune-platoon-gap'], story: 'line-follower-race' },
  { session: 'L4-S05', play: { kind: 'game', id: 'drone-hover', tier: 3, goal: 'Sky Port, Legend tier: tune P, I and D to hold height through gusts.' }, practice: ['control-en-10', 'hospital-tune-pid-exo-step', 'control-en-05'] },
  { session: 'L4-S06', play: { kind: 'game', id: 'orbit-repair', tier: 3, goal: 'Orbit Repair, Legend tier: a precise, controlled approach and capture.' }, practice: ['space-en-05', 'station-tune-pid-stuck-thruster'] },
  // Act 2 — Mapping the Valley
  { session: 'L4-S07', play: { kind: 'game', id: 'maze-mapper', tier: 1, goal: 'Maze Mapper, Pilot tier: sense the walls and build the map as you explore.' }, practice: ['sensors-en-08', 'city-graph-radar-gap'] },
  { session: 'L4-S08', play: { kind: 'game', id: 'maze-mapper', tier: 2, goal: 'Maze Mapper, Ace tier: an occupancy grid with sensor noise.' }, practice: ['sensors-en-10', 'space-en-04'] },
  { session: 'L4-S09', play: { kind: 'activity', id: 'space-en-06', goal: 'A* across the crater field: a provably short path round hazards.' }, practice: ['ai-en-04', 'motion-en-04', 'ocean-plan-astar-canyon'] },
  { session: 'L4-S10', play: { kind: 'activity', id: 'control-en-08', goal: 'Balance first, but safety before that: order the behaviours by priority.' }, practice: ['city-flow-av-priorities', 'station-flow-abort-priorities'] },
  { session: 'L4-S11', play: { kind: 'game', id: 'mars-rover', tier: 2, goal: 'Mars Rover Command, Ace tier: plan under minutes of delay with hazards.' }, practice: ['space-en-01', 'station-predict-delayed-stop', 'station-ethics-autonomy-with-delay'], story: 'rover-on-mars' },
  { session: 'L4-S12', play: { kind: 'game', id: 'maze-mapper', tier: 3, goal: 'Maze Mapper, Legend tier: explore an unknown maze, map it and escape.' }, practice: ['space-en-07', 'motion-en-10'] },
  // Act 3 — Sample Science
  { session: 'L4-S13', play: { kind: 'game', id: 'arm-factory', tier: 3, goal: 'Arm Factory, Legend tier: reach, grasp and place reliably under time pressure.' }, practice: ['sensors-en-02', 'mechanics-en-09'] },
  { session: 'L4-S14', play: { kind: 'activity', id: 'code-en-10', goal: 'Two bugs in the mower: find and fix defects with test cases.' }, practice: ['code-en-06', 'design-en-09'] },
  { session: 'L4-S15', play: { kind: 'activity', id: 'sensors-en-09', goal: 'Detect a stalled motor: compare what was commanded with what was measured.' }, practice: ['guardians-en-fail-safe-logic', 'electronics-en-05'] },
  { session: 'L4-S16', play: { kind: 'activity', id: 'electronics-en-07', goal: 'A two-hour delivery shift: size the robot for the job, gram by gram.' }, practice: ['design-en-01', 'design-en-04', 'zoo-design-generalist-explorer'] },
  { session: 'L4-S17', play: { kind: 'game', id: 'robot-city', tier: 3, goal: 'Robot City, Legend tier: right of way and safe stopping around people.' }, practice: ['guardians-en-medirun-design', 'ai-en-07'] },
  { session: 'L4-S18', play: { kind: 'activity', id: 'code-en-09', goal: 'Try three times, then ask: bounded retries and a safe hand-back to a human.' }, practice: ['control-en-06', 'world-en-05'] },
  // Act 4 — Dust Storm
  { session: 'L4-S19', play: { kind: 'activity', id: 'code-en-08', goal: 'A filter that lags: trace a smoothing filter and measure its delay.' }, practice: ['sensors-en-07', 'farm-tune-filter-soil-spikes', 'ocean-threshold-forward-sonar-filter'] },
  { session: 'L4-S20', play: { kind: 'game', id: 'safety-inspector', tier: 3, goal: 'Robot Safety Inspector, Legend tier: find every hazard and its fix.' }, practice: ['guardians-en-risk-matrix-rule', 'guardians-en-kinetic-energy', 'control-en-09'] },
  { session: 'L4-S21', play: { kind: 'activity', id: 'world-en-07', goal: 'A people-detector that misses people: find the bias and the fix.' }, practice: ['world-en-03', 'design-en-08'] },
  { session: 'L4-S22', play: { kind: 'activity', id: 'world-en-01', goal: 'Robots in the real economy — and the hype: who does what work.' }, practice: ['world-en-10', 'guardians-en-warehouse-policy'] },
  { session: 'L4-S23', play: { kind: 'activity', id: 'design-en-10', goal: 'Capstone: a disaster-response robot designed and defended with evidence.' }, practice: ['world-en-09', 'motion-en-09'] },
  { session: 'L4-S24', play: { kind: 'game', id: 'mars-rover', tier: 3, goal: 'Mars Rover Command, Legend tier: a full autonomous mission under delay.' }, practice: ['ai-en-10', 'world-en-02'] },
]

export function level4Reuse(sessionId: string): SessionReuse | undefined {
  return LEVEL4_REUSE.find((r) => r.session === sessionId)
}
