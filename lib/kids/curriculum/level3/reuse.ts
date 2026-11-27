// lib/kids/curriculum/level3/reuse.ts
// What each Level 3 session is built from (roadmap #23: "build each session
// mostly from existing parts"). `play` is the challenge beat as a child can
// play it TODAY — a Universe game at a tier, a Code Lab mission, a Physics Lab
// arena or a Skill Galaxy activity — and `practice` lists 2–3 Inventors-band
// Galaxy activities on the session's concepts (practice, Recharge missions and
// the teacher guide's extensions). verify.ts checks every id, band and
// concept overlap.
//
// Light: ids and short goals only, safe to import into a client island.

import type { SessionReuse } from './reuse-kit'

export const LEVEL3_REUSE: SessionReuse[] = [
  // Act 1 — Arrival at the Ridge
  { session: 'L3-S01', play: { kind: 'activity', id: 'code-in-02', goal: 'Store a number in a byte: see that a variable is a named place that holds a value.' }, practice: ['design-in-01', 'code-in-01'] },
  { session: 'L3-S02', play: { kind: 'activity', id: 'design-in-04', goal: 'Three metres in six seconds: speed × time = distance, then check it.' }, practice: ['motion-in-05', 'space-in-02'] },
  { session: 'L3-S03', play: { kind: 'activity', id: 'control-in-03', goal: 'Tune a camera slider: a proportional correction that settles on its target.' }, practice: ['control-in-01', 'sensors-in-04'] },
  { session: 'L3-S04', play: { kind: 'sim-demo', id: 'faded-line', goal: 'Physics Lab “Find the faded line”: read the white and black pads with the reflectance block, set the threshold halfway, and stop on the faded line.' }, practice: ['sensors-in-05', 'sensors-in-02', 'electronics-in-07'] },
  { session: 'L3-S05', play: { kind: 'sim-demo', id: 'follow-line', goal: 'Physics Lab “Follow the line”: reach the green zone steering in proportion to the line offset.' }, practice: ['control-in-06', 'control-in-07'] },
  { session: 'L3-S06', play: { kind: 'code-lab', id: 'parcel-picker', goal: 'Parcel Picker: sense, decide and deliver at the right places, every time.' }, practice: ['design-in-02', 'world-in-08'] },
  // Act 2 — The Weather Mast
  { session: 'L3-S07', play: { kind: 'activity', id: 'city-tune-robot-cruise', goal: 'Cruise control for a delivery robot: hold a speed and a gap with proportional control.' }, practice: ['control-in-08', 'code-in-04'] },
  { session: 'L3-S08', play: { kind: 'game', id: 'drone-hover', tier: 1, goal: 'Sky Port, Pilot tier: tune the drone until it holds height through gusts without wobbling.' }, practice: ['control-in-05', 'hospital-tune-imaging-arm'], story: 'wobbly-bot' },
  { session: 'L3-S09', play: { kind: 'game', id: 'sumo-arena', tier: 1, goal: 'Robo Sumo, Pilot tier: a search → charge → recover state machine that pushes the Champion bot out.' }, practice: ['ai-in-03', 'code-in-05'] },
  { session: 'L3-S10', play: { kind: 'activity', id: 'ai-in-06', goal: 'Smooth the score: trace a program that keeps a running total and an average.' }, practice: ['farm-graph-ndvi-from-the-drone', 'ocean-graph-read-the-hover-depth'] },
  { session: 'L3-S11', play: { kind: 'sim-demo', id: 'power-home-before-flat', goal: 'Power Lab “Home before flat”: reach the flag and stop on the charger before the battery runs flat, watching the battery % block.' }, practice: ['electronics-in-08', 'zoo-estimate-walking-energy', 'space-in-03'] },
  { session: 'L3-S12', play: { kind: 'code-lab', id: 'line-follower', goal: 'Line Follower: check, correct, repeat — all the way round the course.' }, practice: ['hospital-graph-steady-the-shake', 'farm-trace-irrigation-controller'] },
  // Act 3 — The Boulder Field
  { session: 'L3-S13', play: { kind: 'game', id: 'bio-bots', tier: 2, goal: 'Robo Zoo, Ace tier: choose gait or wheels for the terrain and prove it on the course.' }, practice: ['motion-in-03', 'zoo-terrain-mud-and-rocks', 'zoo-rule-static-or-dynamic'] },
  { session: 'L3-S14', play: { kind: 'activity', id: 'space-in-08', goal: 'A rover that survives the slope: place the load so it does not tip.' }, practice: ['motion-in-07', 'zoo-com-quadruped-carry', 'mechanics-in-04'] },
  { session: 'L3-S15', play: { kind: 'activity', id: 'ocean-predict-dead-reckoning-drift', goal: 'Where does the AUV think it is? Trace dead reckoning and see the drift.' }, practice: ['sensors-in-07', 'motion-in-10'] },
  { session: 'L3-S16', play: { kind: 'game', id: 'mars-rover', tier: 1, goal: 'Mars Rover Command, Pilot tier: plan with dead reckoning, check against what the rover senses.' }, practice: ['space-in-05', 'ai-in-04'] },
  { session: 'L3-S17', play: { kind: 'game', id: 'orbit-repair', tier: 1, goal: 'Orbit Repair, Pilot tier: a slow, precise approach and a gentle grapple.' }, practice: ['station-tune-pd-approach', 'ocean-tune-pd-pipeline-stop'] },
  { session: 'L3-S18', play: { kind: 'game', id: 'mars-rover', tier: 2, goal: 'Mars Rover Command, Ace tier: reach two science targets and return, without a hazard.' }, practice: ['space-in-07', 'farm-plan-drone-to-three-trees'] },
  // Act 4 — Whiteout
  { session: 'L3-S19', play: { kind: 'activity', id: 'station-sort-live-or-plan', goal: 'Joystick or mission plan? Sort tasks by who should be in control.' }, practice: ['space-in-04', 'world-in-06'] },
  { session: 'L3-S20', play: { kind: 'activity', id: 'space-in-10', goal: 'Power first, then progress: a flowchart that puts safe defaults first.' }, practice: ['world-in-04', 'station-flow-capture-checklist'] },
  { session: 'L3-S21', play: { kind: 'activity', id: 'electronics-in-10', goal: 'Two out of three: let several sensors vote on one decision.' }, practice: ['code-in-09', 'guardians-in-night-ward'] },
  { session: 'L3-S22', play: { kind: 'activity', id: 'guardians-in-fair-detector', goal: 'Is the detector fair enough to ship? Read the data honestly.' }, practice: ['design-in-09', 'world-in-05'] },
  { session: 'L3-S23', play: { kind: 'activity', id: 'world-in-09', goal: 'Search and rescue after an earthquake: design the robot a rescue team needs.' }, practice: ['city-match-real-street-robots', 'world-in-02'] },
  { session: 'L3-S24', play: { kind: 'game', id: 'ocean-rescue', tier: 2, goal: 'Deep Sea Rescue, Ace tier: navigate without GPS, find the lost buoy and bring it home.' }, practice: ['world-in-10', 'ai-in-10'] },
]

export function level3Reuse(sessionId: string): SessionReuse | undefined {
  return LEVEL3_REUSE.find((r) => r.session === sessionId)
}
