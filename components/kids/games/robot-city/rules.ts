// components/kids/games/robot-city/rules.ts
// LEGEND — Rulebook. The child writes the behaviour rules of a robotaxi as an
// ordered list "IF <what the car perceives> THEN <what it does>". Every 0.05 s
// the car checks its rules from the top; the FIRST rule whose condition is true
// decides; if none is true it drives normally at the speed limit. Rules act
// 0.3 s after the perception that triggered them (sensing + planning time).
//
// Then the rulebook must pass a safety test suite of six scenarios — the way
// real self-driving teams test software in simulation before a car ever meets
// the situation on a street:
//   1. A ball rolls into the road … and a child runs after it.
//   2. An ambulance with its siren on comes up from behind.
//   3. Low sun blinds the camera as the car approaches a red traffic light.
//   4. A plastic bag blows across the road with a car close behind us.
//   5. Road works block the lane and a worker waves traffic around them.
//   6. A normal trip with people on the pavement and a red light.
// Every scenario runs on real 1-D dynamics (speed, braking limits, reaction
// times) so ordering, over-reaction and under-reaction all have consequences.
// Pure logic: no React, no DOM. Deterministic.

export const DT = 0.05
export const LIMIT = 50 / 3.6
export const CAR_LEN = 4.5
export const LATENCY = 0.3
export const A_HARD = 7
export const A_GENTLE = 3
export const MAX_RULES = 8
export const REMOTE_DELAY = 5 // s for a remote assistant to look and send a plan

export type CondId = 'person-ahead' | 'small-object' | 'ball-recent' | 'siren' | 'camera-glare' | 'light-unknown' | 'red-light' | 'unclear' | 'people-pavement'
export type ActionId = 'brake-hard' | 'stop-gently' | 'slow-20' | 'slow-10' | 'pull-over' | 'remote-help' | 'cruise'

export const CONDITIONS: { id: CondId; label: string; icon: string; detail: string }[] = [
  { id: 'person-ahead', label: 'A person or vehicle is in my lane ahead', icon: '🧍', detail: 'Lidar, radar and camera agree: something big and solid is in the lane within 45 m.' },
  { id: 'small-object', label: 'A small object is in my lane ahead', icon: '🎈', detail: 'Something small is in the lane within 40 m: a ball, a bag, a traffic cone.' },
  { id: 'ball-recent', label: 'I saw a ball near the road (last 4 s)', icon: '⚽', detail: 'The camera recognised a ball in or near the road in the last 4 seconds.' },
  { id: 'siren', label: 'I hear a siren / see flashing blue lights', icon: '🚑', detail: 'Microphones and cameras detect an emergency vehicle within 150 m.' },
  { id: 'camera-glare', label: 'My camera is blinded by glare', icon: '☀️', detail: 'Low sun shines straight into the camera; it cannot see colours or signs. Lidar and radar still work.' },
  { id: 'light-unknown', label: 'A traffic light is ahead but I cannot read it', icon: '❔', detail: 'The map says there is a traffic light within 70 m, but the camera cannot see its colour.' },
  { id: 'red-light', label: 'The traffic light ahead is red or amber', icon: '🔴', detail: 'The camera reads a red or amber light within 70 m, and the car is before the stop line.' },
  { id: 'unclear', label: 'I do not understand the scene', icon: '🤔', detail: 'The road does not match the map and a person is giving signals the car cannot interpret.' },
  { id: 'people-pavement', label: 'People are walking on the pavement nearby', icon: '🚶', detail: 'People on the pavement within 40 m ahead (not in the road).' },
]

export const ACTIONS: { id: ActionId; label: string; icon: string; detail: string }[] = [
  { id: 'brake-hard', label: 'Emergency brake', icon: '🛑', detail: 'Brake as hard as the tyres allow (7 m/s²) and stay stopped.' },
  { id: 'stop-gently', label: 'Stop safely before it', icon: '✋', detail: 'Stop smoothly before the hazard or stop line ahead (harder only if it must).' },
  { id: 'slow-20', label: 'Slow to 20 km/h', icon: '🐢', detail: 'Ease off to 20 km/h and keep going.' },
  { id: 'slow-10', label: 'Creep at 10 km/h, ready to stop', icon: '🐌', detail: 'Slow to walking-ish pace and keep going.' },
  { id: 'pull-over', label: 'Pull over to the side and stop', icon: '↘️', detail: 'Move to the kerb, stop and leave the lane free.' },
  { id: 'remote-help', label: 'Stop and ask a remote assistant', icon: '🎧', detail: 'Stop safely and ask a trained person in a control centre. They answer in about 5 s with a plan.' },
  { id: 'cruise', label: 'Drive normally', icon: '➡️', detail: 'Drive at the 50 km/h limit in my lane.' },
]

export interface Rule {
  when: CondId
  then: ActionId
}

export type Percepts = Record<CondId, boolean>

export interface Obj {
  kind: 'ball' | 'child' | 'ambulance' | 'bag' | 'follower' | 'cone' | 'worker' | 'walker' | 'parked'
  s: number
  y: number
  len: number
}

export interface Frame {
  t: number
  s: number
  v: number
  y: number
  rule: number // index of the rule in control, −1 = default driving
  action: ActionId
  objs: Obj[]
  light: 'red' | 'green' | null
  glare: boolean
  siren: boolean
  remote: 'none' | 'asked' | 'answered'
}

export interface ScenarioResult {
  id: string
  pass: boolean
  reason: string
  frames: Frame[]
  time: number
}

interface CarState {
  t: number
  s: number // front bumper
  v: number
  y: number // lateral position: 0 lane centre, + towards the kerb, − into the other lane
  remoteAsked: number // time stopped while asking, s
  remoteCleared: boolean
}

interface Scenario {
  id: string
  name: string
  icon: string
  story: string
  length: number
  timeLimit: number
  light?: { at: number; red: (t: number) => boolean }
  init: () => Record<string, number>
  objects: (w: Record<string, number>, car: CarState) => Obj[]
  step?: (w: Record<string, number>, car: CarState, dt: number, vHist: number[]) => void
  percepts: (w: Record<string, number>, car: CarState, objs: Obj[]) => Partial<Percepts>
  /** null = fine so far, string = failure reason. */
  check: (w: Record<string, number>, car: CarState, objs: Obj[]) => string | null
  /** Where "stop safely" should stop, if there is a reason ahead (front-bumper s). */
  stopPoint?: (w: Record<string, number>, car: CarState, objs: Obj[]) => number | null
  /** Lane centre the car must follow when the remote assistant's plan is active. */
  guided?: (car: CarState) => number | null
  glare?: (t: number) => boolean
}

const inLane = (o: Obj, carY = 0) => Math.abs(o.y - carY) < 2.0
const ahead = (o: Obj, car: CarState, range: number) => o.s >= car.s - 0.5 && o.s - car.s <= range
function hitsCar(o: Obj, car: CarState) {
  return o.s <= car.s + 0.2 && o.s + o.len >= car.s - CAR_LEN && Math.abs(o.y - car.y) < 1.8
}
const lerp = (a: number, b: number, x: number) => a + (b - a) * Math.max(0, Math.min(1, x))

export const SCENARIOS: Scenario[] = [
  {
    id: 'ball',
    name: 'Ball, then a child',
    icon: '⚽',
    story: 'Cars are parked along the kerb. A ball bounces into the road from between them…',
    length: 150,
    timeLimit: 35,
    init: () => ({ ballSeenLast: -99, ballSeen: 0 }),
    objects: (w, car) => {
      const t = car.t
      const out: Obj[] = [
        { kind: 'parked', s: 40, y: 3.6, len: 4.5 },
        { kind: 'parked', s: 58, y: 3.6, len: 4.5 },
        { kind: 'parked', s: 72, y: 3.6, len: 6 },
        { kind: 'parked', s: 92, y: 3.6, len: 4.5 },
      ]
      if (t >= 2.0) {
        const y = t < 2.5 ? lerp(3.5, 1.8, (t - 2.0) / 0.5) : t < 3.7 ? lerp(1.8, -1.8, (t - 2.5) / 1.2) : lerp(-1.8, -5, (t - 3.7) / 0.6)
        if (y > -4.9) out.push({ kind: 'ball', s: 68, y, len: 0.3 })
      }
      if (t >= 4.6) {
        const y = t < 5.6 ? lerp(2.2, 0, t - 4.6) : t < 9 ? 0 : lerp(0, 3.4, (t - 9) / 1.5)
        if (t < 10.5) out.push({ kind: 'child', s: 70, y, len: 0.6 })
      }
      void w
      return out
    },
    step: (w, car) => {
      const t = car.t
      if (t >= 2.0 && t < 4.3) w.ballSeenLast = t
    },
    percepts: (w, car, objs) => ({
      'person-ahead': objs.some((o) => o.kind === 'child' && inLane(o, car.y) && ahead(o, car, 45)),
      'small-object': objs.some((o) => o.kind === 'ball' && inLane(o, car.y) && ahead(o, car, 40)),
      'ball-recent': car.t - w.ballSeenLast <= 4 && car.s < 75,
    }),
    check: (_w, car, objs) => (objs.some((o) => o.kind === 'child' && hitsCar(o, car)) ? 'The car did not stop for the child who ran out after the ball.' : null),
    stopPoint: (_w, car, objs) => {
      const o = objs.filter((x) => (x.kind === 'child' || x.kind === 'ball') && inLane(x, car.y) && x.s > car.s).sort((a, b) => a.s - b.s)[0]
      return o ? o.s - 2 : null
    },
  },
  {
    id: 'siren',
    name: 'Ambulance behind',
    icon: '🚑',
    story: 'An ambulance on an emergency call comes up fast behind the robotaxi, siren on.',
    length: 320,
    timeLimit: 45,
    init: () => ({ amb: -100, ambV: 22, blocked: 0 }),
    objects: (w) => [{ kind: 'ambulance', s: w.amb, y: 0, len: 6.5 }],
    step: (w, car, dt) => {
      const gap = car.s - CAR_LEN - w.amb
      const inWay = car.y < 2.6 && gap > -CAR_LEN - 6.5 && gap < 22
      if (inWay) {
        w.ambV = Math.max(0, Math.min(22, car.v, w.ambV))
        if (gap < 22) w.blocked += dt
      } else w.ambV = Math.min(22, w.ambV + 3 * dt)
      w.amb += w.ambV * dt
    },
    percepts: (w, car) => {
      const d = w.amb - car.s
      return { siren: d > -150 && d < 30, 'person-ahead': false }
    },
    check: (w) => (w.blocked > 3 ? 'The robotaxi blocked the ambulance. In an emergency every second counts.' : null),
  },
  {
    id: 'glare',
    name: 'Sun in the camera',
    icon: '☀️',
    story: 'Driving towards a low sun. The traffic light ahead is red — but can the camera see it?',
    length: 260,
    timeLimit: 45,
    light: { at: 150, red: (t) => t < 22 },
    glare: (t) => t >= 3 && t < 21,
    init: () => ({}),
    objects: () => [],
    percepts: (_w, car) => {
      const d = 150 - car.s
      const near = d > 0 && d <= 70
      const glare = car.t >= 3 && car.t < 21
      return { 'camera-glare': glare, 'light-unknown': near && glare, 'red-light': near && !glare && car.t < 22 }
    },
    check: (_w, car) => (car.s > 150.5 && car.s - car.v * DT <= 150.5 && car.t < 22 ? 'The car drove through a red light it could not see.' : null),
    stopPoint: (_w, car) => (car.s < 149 ? 149 : null),
  },
  {
    id: 'bag',
    name: 'Plastic bag',
    icon: '🛍️',
    story: 'A plastic bag blows across the road. A car is following close behind the robotaxi.',
    length: 260,
    timeLimit: 35,
    init: () => ({ fs: -12 - CAR_LEN, fv: LIMIT, minGap: 99, noticed: 0 }),
    objects: (w, car) => {
      const t = car.t
      const out: Obj[] = [{ kind: 'follower', s: w.fs - CAR_LEN, y: 0, len: CAR_LEN }]
      // it skids into the lane, then tumbles slowly across it
      if (t >= 3 && t < 7.6) out.push({ kind: 'bag', s: 85, y: t < 3.6 ? lerp(3.5, 1.9, (t - 3) / 0.6) : t < 7 ? lerp(1.9, -1.9, (t - 3.6) / 3.4) : lerp(-1.9, -3.5, (t - 7) / 0.6), len: 0.5 })
      return out
    },
    step: (w, car, dt, vHist) => {
      // A human driver behind. It takes them about 1.2 s to notice our brake
      // lights and move a foot to the pedal; once braking they follow what they
      // see about 0.4 s late.
      const noticeLag = Math.round(1.2 / DT)
      const seen = vHist.length > noticeLag ? vHist[vHist.length - 1 - noticeLag] : LIMIT
      if (!w.noticed && seen < w.fv - 0.4) w.noticed = 1
      const lag = w.noticed ? Math.round(0.4 / DT) : noticeLag
      const old = vHist.length > lag ? vHist.length - 1 - lag : -1
      const vLead = old >= 0 ? vHist[old] : LIMIT
      // where our car was then, and how far the driver thinks it has moved since
      let sLead = car.s
      for (let k = vHist.length - 1; k > old && k >= 0; k--) sLead -= vHist[k] * DT
      const gap = sLead + vLead * lag * DT - CAR_LEN - w.fs
      let a = 0.4 * (gap - (2 + 0.85 * w.fv)) + 1.1 * (vLead - w.fv)
      if (w.fv > vLead) a = Math.min(a, (-1.3 * (w.fv * w.fv - vLead * vLead)) / (2 * Math.max(0.5, gap - 1)))
      a = Math.max(-6.5, Math.min(2, a))
      w.fv = Math.max(0, Math.min(LIMIT, w.fv + a * dt))
      w.fs += w.fv * dt
      w.minGap = Math.min(w.minGap, car.s - CAR_LEN - w.fs)
    },
    percepts: (_w, car, objs) => ({ 'small-object': objs.some((o) => o.kind === 'bag' && inLane(o, car.y) && ahead(o, car, 40)) }),
    check: (w) => (w.minGap <= 0 ? 'The car behind crashed into the robotaxi: an emergency stop for a plastic bag surprised its driver.' : null),
    stopPoint: (_w, car, objs) => {
      const o = objs.find((x) => x.kind === 'bag' && inLane(x, car.y) && x.s > car.s)
      return o ? o.s - 2 : null
    },
  },
  {
    id: 'works',
    name: 'Road works',
    icon: '🚧',
    story: 'Cones close the lane ahead. A worker in a hi-vis vest waves traffic around them — the map knows nothing about it.',
    length: 230,
    timeLimit: 50,
    init: () => ({}),
    objects: () => {
      const out: Obj[] = [{ kind: 'worker', s: 124, y: 2.8, len: 0.6 }]
      for (let s = 130; s <= 152; s += 4.4) out.push({ kind: 'cone', s, y: s === 130 ? 1.2 : 0, len: 0.4 })
      return out
    },
    percepts: (_w, car, objs) => {
      const d = 130 - car.s
      return {
        unclear: !car.remoteCleared && d > -25 && d <= 60,
        // once the assistant's plan is active the car's path goes around the cones
        'small-object': objs.some((o) => o.kind === 'cone' && inLane(o, car.remoteCleared ? -3.3 : car.y) && ahead(o, car, 40)),
        'people-pavement': d > -5 && d < 40,
      }
    },
    check: (_w, car, objs) => (objs.some((o) => o.kind === 'cone' && hitsCar(o, car)) ? 'The car drove into the road works.' : null),
    stopPoint: (_w, car) => (car.s < 116 ? 116 : null),
    guided: (car) => (car.remoteCleared && car.s > 100 && car.s < 165 ? -3.3 : null),
  },
  {
    id: 'commute',
    name: 'Normal trip',
    icon: '🏙️',
    story: 'An ordinary trip: shoppers on the pavement and one red light. The car must still get there.',
    length: 400,
    timeLimit: 60,
    light: { at: 220, red: (t) => t >= 9 && t < 24 },
    init: () => ({}),
    objects: () => {
      const out: Obj[] = []
      for (let s = 60; s <= 180; s += 15) out.push({ kind: 'walker', s, y: 5.2 + ((s / 15) % 2) * 0.8, len: 0.6 })
      return out
    },
    percepts: (_w, car, objs) => {
      const d = 220 - car.s
      return {
        'people-pavement': objs.some((o) => o.kind === 'walker' && o.s - car.s > -3 && o.s - car.s < 40),
        'red-light': d > 0 && d <= 70 && car.t >= 9 && car.t < 24,
      }
    },
    check: (_w, car) => (car.s > 220.5 && car.s - car.v * DT <= 220.5 && car.t >= 9 && car.t < 24 ? 'The car drove through a red light.' : null),
    stopPoint: (_w, car) => (car.s < 219 ? 219 : null),
  },
]

export const ALL_FALSE: Percepts = {
  'person-ahead': false,
  'small-object': false,
  'ball-recent': false,
  siren: false,
  'camera-glare': false,
  'light-unknown': false,
  'red-light': false,
  unclear: false,
  'people-pavement': false,
}

export function runScenario(sc: Scenario, rules: Rule[], keepFrames = true): ScenarioResult {
  const w = sc.init()
  const car: CarState = { t: 0, s: 0, v: LIMIT, y: 0, remoteAsked: 0, remoteCleared: false }
  const frames: Frame[] = []
  const decisions: { rule: number; action: ActionId }[] = []
  const vHist: number[] = []
  const lag = Math.round(LATENCY / DT)
  let reason = ''
  let pass = false
  let stalled = 0
  for (let i = 0; ; i++) {
    car.t = i * DT
    const objs = sc.objects(w, car)
    const p: Percepts = { ...ALL_FALSE, ...sc.percepts(w, car, objs) }
    // decide (first matching rule)
    let rule = -1
    let action: ActionId = 'cruise'
    for (let k = 0; k < rules.length; k++)
      if (p[rules[k].when]) {
        rule = k
        action = rules[k].then
        break
      }
    decisions.push({ rule, action })
    const act = decisions.length > lag ? decisions[decisions.length - 1 - lag] : { rule: -1, action: 'cruise' as ActionId }

    // act
    let vT = LIMIT
    let dec = 2.5
    let yT = 0
    const guided = sc.guided?.(car) ?? null
    if (act.action === 'brake-hard') {
      vT = 0
      dec = A_HARD
    } else if (act.action === 'stop-gently' || act.action === 'remote-help') {
      const sp = sc.stopPoint?.(w, car, objs) ?? null
      if (sp !== null && sp > car.s) {
        const room = sp - car.s
        vT = Math.sqrt(2 * A_GENTLE * Math.max(0, room - 0.3))
        dec = Math.min(A_HARD, Math.max(A_GENTLE, (car.v * car.v) / (2 * Math.max(0.2, room))))
      } else {
        vT = 0
        dec = A_GENTLE
      }
      if (act.action === 'remote-help' && car.v < 0.1) {
        car.remoteAsked += DT
        if (car.remoteAsked >= REMOTE_DELAY && sc.guided) car.remoteCleared = true
      }
    } else if (act.action === 'slow-20') {
      vT = 20 / 3.6
    } else if (act.action === 'slow-10') {
      vT = 10 / 3.6
      dec = 3
    } else if (act.action === 'pull-over') {
      yT = 3.2
      vT = car.y < 2.9 ? 4 : 0
      dec = 3
    }
    if (guided !== null) {
      yT = guided
      vT = Math.min(vT, 15 / 3.6)
    }
    if (car.v > vT) car.v = Math.max(vT, car.v - dec * DT)
    else car.v = Math.min(vT, car.v + 2 * DT)
    const dy = yT - car.y
    car.y += Math.sign(dy) * Math.min(Math.abs(dy), (car.v > 0.3 ? 1.4 : 0) * DT)
    car.s += car.v * DT
    vHist.push(car.v)
    sc.step?.(w, car, DT, vHist)
    stalled = car.v < 0.05 ? stalled + DT : 0

    if (keepFrames && i % 2 === 0)
      frames.push({
        t: car.t,
        s: car.s,
        v: car.v,
        y: car.y,
        rule: act.rule,
        action: act.action,
        objs: sc.objects(w, car),
        light: sc.light ? (sc.light.red(car.t) ? 'red' : 'green') : null,
        glare: sc.glare?.(car.t) ?? false,
        siren: p.siren,
        remote: car.remoteCleared ? 'answered' : car.remoteAsked > 0 ? 'asked' : 'none',
      })

    const fail = sc.check(w, car, sc.objects(w, car))
    if (fail) {
      reason = fail
      break
    }
    if (car.s >= sc.length) {
      pass = true
      reason = `Arrived safely in ${car.t.toFixed(0)} s.`
      break
    }
    if (car.t >= sc.timeLimit) {
      reason =
        stalled > 5
          ? car.remoteAsked > 0 && !sc.guided
            ? 'The car stopped and never moved on: the remote assistant could not fix this one — the car’s own rules had to.'
            : 'The car stopped and never moved on. Robots that freeze block streets and emergency vehicles.'
          : 'Too slow: the car crawled and did not finish the trip in time.'
      break
    }
  }
  return { id: sc.id, pass, reason, frames, time: car.t }
}

export function runSuite(rules: Rule[], keepFrames = true): ScenarioResult[] {
  return SCENARIOS.map((sc) => runScenario(sc, rules, keepFrames))
}

export const STARTER: Rule[] = [
  { when: 'person-ahead', then: 'brake-hard' },
  { when: 'small-object', then: 'brake-hard' },
]

export function rulesStars(passedAll: boolean, runs: number): number {
  if (!passedAll) return 0
  if (runs <= 5) return 3
  if (runs <= 10) return 2
  return 1
}
