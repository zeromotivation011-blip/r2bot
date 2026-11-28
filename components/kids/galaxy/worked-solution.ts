// components/kids/galaxy/worked-solution.ts
// Roadmap #26 — "Spark shows me". The third rung of the hint ladder is a
// WORKED EXAMPLE on a twin: another verified activity of the same template
// (same band where possible), solved step by step in plain words, with the
// template's own "why it works" feedback. Then the child gets "your turn" on
// their own activity, which is the matching problem.
//
// Pedagogy: worked example → matching problem (Sweller's worked-example
// effect). The twin is solved, never the child's own activity, so the hint
// never hands over the answer they are being asked to find.
//
// Pure: no React, no DOM. The describers are safe anywhere; `workedTwinFor`
// reads every activity and every template's check(), so call it on the SERVER
// (the activity page) and pass the small `WorkedTwin` (words only — no params,
// no solution JSON) to the player.

import type { Activity, CheckResult, TemplateId } from '@/lib/kids/activities/types'
import { BAND_ORDER } from '@/lib/kids/bands'
import type { AnswerOf, ParamsOf } from '@/lib/kids/activities/logic-registry'
import { SENSORS } from '@/components/kids/activities/templates/sensor-choice/logic'
import type { Cmd } from '@/components/kids/activities/templates/sequence-path/engine'
import { describeNumberBox } from '@/components/kids/activities/templates/number-box/logic'

/** What the player needs to show "Spark shows me". Words only. */
export interface WorkedTwin {
  /** The twin activity's id (for keys and tests). */
  id: string
  title: string
  /** The twin's mission, in story form. */
  intro: string
  /** What Spark did, in order, in plain words. 1–12 steps. */
  steps: string[]
  /** Why it works: the template's own feedback for the twin's verified solution. */
  why: string
  /** The twin's big idea. */
  takeaway: string
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '?'
  const r = Math.round(n * 100) / 100
  return r.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}

function ordinal(n: number): string {
  const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
  return words[n - 1] ?? `number ${n}`
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function withIcon(icon: string | undefined, label: string): string {
  return icon ? `${icon} ${label}` : label
}

/** Keep the worked example short enough to follow on a phone. */
function cap(steps: string[], max = 12): string[] {
  const clean = steps.map((s) => s.trim()).filter(Boolean)
  if (clean.length <= max) return clean
  return [...clean.slice(0, max - 1), `…and ${clean.length - (max - 1)} more steps like these.`]
}

// ── Programs (sequence-path, debug-program) ────────────────────────────────

const OP_WORDS: Record<'forward' | 'back' | 'left' | 'right', [string, string]> = {
  forward: ['Forward', 'Forward'],
  back: ['Back', 'Back'],
  left: ['Turn left', 'Turn left'],
  right: ['Turn right', 'Turn right'],
}

function programLines(cmds: Cmd[], depth = 0): string[] {
  const pad = depth > 0 ? `${'· '.repeat(depth)}` : ''
  const out: string[] = []
  let i = 0
  while (i < cmds.length) {
    const c = cmds[i]
    if (c.op === 'forward' || c.op === 'back' || c.op === 'left' || c.op === 'right') {
      let n = 1
      while (i + n < cmds.length && cmds[i + n].op === c.op) n++
      const word = OP_WORDS[c.op][0]
      out.push(`${pad}${word}${n > 1 ? ` × ${n}` : ''}`)
      i += n
      continue
    }
    if (c.op === 'repeat') {
      out.push(`${pad}Repeat ${c.times} times:`)
      out.push(...programLines(c.body, depth + 1))
    } else if (c.op === 'untilGoal') {
      out.push(`${pad}Repeat until at the goal:`)
      out.push(...programLines(c.body, depth + 1))
    } else {
      out.push(`${pad}If a wall is ahead:`)
      out.push(...programLines(c.then, depth + 1))
      out.push(`${pad}Otherwise:`)
      out.push(...programLines(c.else, depth + 1))
    }
    i++
  }
  return out
}

// ── One describer per template ─────────────────────────────────────────────

type Describer<T extends TemplateId> = (p: ParamsOf<T>, a: AnswerOf<T>) => string[]

const describeBinary: Describer<'binary-encoder'> = (p, a) => {
  const rows = a.bits.map((r) => r.join(''))
  switch (p.mode) {
    case 'number': {
      const bits = a.bits[0] ?? []
      const values = bits.map((b, i) => (b ? 2 ** (bits.length - 1 - i) : 0)).filter((v) => v > 0)
      return [`Spark switched the lamps to ${rows[0] ?? ''}.`, values.length ? `The lit lamps are worth ${values.join(' + ')} = ${values.reduce((s, v) => s + v, 0)}.` : 'Every lamp is off: that is 0.']
    }
    case 'pixels':
      return rows.map((r, i) => `Row ${i + 1}: ${r} (1 = light it, 0 = leave it dark).`)
    case 'message':
      return rows.map((r, i) => `Character ${i + 1}${p.text[i] ? ` “${p.text[i]}”` : ''}: ${r}.`)
    case 'parity': {
      if (p.task === 'fix') {
        const steps = ['Spark counted the 1s in every row, then in every column.']
        for (let r = 0; r < a.bits.length; r++)
          for (let c = 0; c < a.bits[r].length; c++)
            if (p.data[r]?.[c] !== undefined && p.data[r][c] !== a.bits[r][c]) steps.push(`Row ${r + 1} and column ${c + 1} were the odd ones, so the wrong bit is where they cross. Spark flipped it.`)
        return steps
      }
      return ['Spark counted the 1s in each row and column.', ...rows.map((r, i) => `Row ${i + 1} became ${r}, so it has an even number of 1s.`)]
    }
  }
}

const describeCom: Describer<'centre-of-mass'> = (p, a) => {
  const many = p.deck.levels.length > 1
  return a.placed.map((pl) => {
    const item = p.items[pl.item]
    const name = item ? withIcon(item.emoji, `${item.label} (${fmt(item.mass)} kg)`) : `Part ${pl.item + 1}`
    const where = `the ${ordinal(pl.slot + 1)} spot from the back`
    const level = many ? `, on the shelf ${fmt(p.deck.levels[pl.level] ?? 0)} cm up` : ''
    return `${name} → ${where}${level}.`
  })
}

const PART_WORDS: Record<string, string> = { battery: 'battery', bulb: 'bulb', led: 'LED', resistor: 'resistor', motor: 'motor', wire: 'wire', insulator: 'rubber block (no current)' }

const describeCircuit: Describer<'circuit-snap'> = (p, a) => {
  const slots = p.edges.filter((e) => e.slot)
  return slots.map((e, i) => {
    const pl = a.placed[e.id]
    if (!pl) return `Gap ${i + 1}: left open.`
    const inv = p.inventory.find((x) => x.id === pl.item)
    const part = inv?.part
    let name = part?.label ?? (part ? PART_WORDS[part.kind] ?? part.kind : pl.item)
    if (part && !part.label) {
      if (part.kind === 'resistor' && part.ohms) name = `${fmt(part.ohms)} Ω resistor`
      if (part.kind === 'battery' && part.volts) name = `${fmt(part.volts)} V battery`
      if (part.kind === 'led' && part.colour) name = `${part.colour} LED`
    }
    return `Gap ${i + 1}: the ${name}${pl.flipped ? ', turned round' : ''}.`
  })
}

const describeClassify: Describer<'classify-sort'> = (p, a) => {
  const steps: string[] = []
  const cat = (id: string) => {
    const c = p.categories.find((x) => x.id === id)
    return c ? withIcon(c.icon, c.label) : id
  }
  if (a.placements) {
    for (const c of p.categories) {
      const items = p.items.filter((it) => a.placements?.[it.id] === c.id).map((it) => withIcon(it.icon, it.label))
      const shown = items.slice(0, 4).join(' · ')
      if (items.length) steps.push(`${cat(c.id)}: ${shown}${items.length > 4 ? ` · and ${items.length - 4} more` : ''}.`)
    }
  }
  if (a.rule) {
    const f = p.features.find((x) => x.key === a.rule?.feature)
    const fname = f?.label ?? a.rule.feature
    const test = a.rule.equals !== undefined ? `“${fname}” is “${a.rule.equals}”` : `“${fname}” is above ${fmt(a.rule.threshold ?? 0)}${f?.unit ? ` ${f.unit}` : ''}`
    steps.push(`Spark looked for ONE feature that splits the cards: ${fname}.`)
    steps.push(`The rule: if ${test} → ${cat(a.rule.ifTrue)}. Otherwise → ${cat(a.rule.ifFalse)}.`)
  }
  return steps
}

const CONTROLLER_WORDS: Record<string, string> = { 'bang-bang': 'an on/off (bang-bang) controller', p: 'a P controller', pi: 'a PI controller', pd: 'a PD controller', pid: 'a PID controller' }

const describeControl: Describer<'control-tuner'> = (p, a) => {
  const steps: string[] = []
  const kind = a.controller ?? (Array.isArray(p.controller) ? undefined : p.controller)
  if (kind) steps.push(`Spark used ${CONTROLLER_WORDS[kind] ?? kind}.`)
  const gains: string[] = []
  if (a.kp !== undefined) gains.push(`Kp = ${fmt(a.kp)} (how hard it pushes towards the target)`)
  if (a.ki !== undefined) gains.push(`Ki = ${fmt(a.ki)} (fixes the last bit of error over time)`)
  if (a.kd !== undefined) gains.push(`Kd = ${fmt(a.kd)} (brakes as it gets close)`)
  for (const g of gains) steps.push(`Set ${g}.`)
  steps.push(`Then Spark ran it and watched the line settle on the target of ${fmt(p.target)}.`)
  return steps
}

const describeProgram = (a: { program: Cmd[] }): string[] => ['Spark’s program, block by block:', ...programLines(a.program)]

const describeEstimate: Describer<'estimate'> = (p, a) => {
  const steps: string[] = []
  if (p.factors && a.factors) {
    steps.push('Spark broke the big question into smaller numbers it could guess:')
    p.factors.forEach((f, i) => {
      const v = a.factors?.[i]
      if (v !== undefined) steps.push(`${f.label}: about ${fmt(v)} ${f.unit}${f.op === 'div' ? ' (divide by it)' : ''}.`)
    })
    if (p.constant !== undefined) steps.push(`${p.constantNote ?? 'A fixed number'}: ${fmt(p.constant)}.`)
  } else {
    steps.push('Spark compared it with something it already knew the size of.')
  }
  steps.push(`Estimate: about ${fmt(a.value)} ${p.unit}.`)
  return steps
}

const describeEthics: Describer<'ethics-dilemma'> = (p, a) => {
  const steps: string[] = []
  for (const s of p.situations) {
    const c = s.choices.find((x) => x.id === a.choices[s.id])
    if (c) steps.push(`${withIcon(s.icon, s.prompt)} → ${c.label}.`)
  }
  if (a.predictions) {
    const words = { up: 'goes up', down: 'goes down', same: 'stays the same' } as const
    for (const st of p.stakeholders) {
      const d = a.predictions[st.id]
      if (d) steps.push(`Spark predicted: ${withIcon(st.icon, st.label)} ${words[d]}.`)
    }
  }
  steps.push('Spark checked that no red line was crossed and nobody was left badly off.')
  return steps
}

const describeFlow: Describer<'flowchart-builder'> = (p, a) => {
  const steps: string[] = []
  for (const n of p.nodes) {
    const cardId = a.slots[n.id]
    if (!cardId) continue
    const c = p.cards.find((x) => x.id === cardId)
    if (!c) continue
    steps.push(`${n.kind === 'decision' || c.kind === 'decision' ? 'Question box' : 'Action box'}: ${withIcon(c.icon, c.label)}.`)
  }
  if (a.swapped?.length) steps.push(`Spark swapped the yes and no arrows on ${a.swapped.length === 1 ? 'one question' : `${a.swapped.length} questions`}.`)
  steps.push('Then Spark ran every test case through the chart, one box at a time.')
  return steps
}

const describeGears: Describer<'gear-train'> = (p, a) => {
  if (p.mode === 'compound') {
    const steps: string[] = []
    for (let i = 0; i + 1 < a.gears.length; i += 2) steps.push(`Stage ${i / 2 + 1}: a ${a.gears[i]}-tooth gear drives a ${a.gears[i + 1]}-tooth gear (× ${fmt(a.gears[i] / a.gears[i + 1])}).`)
    return steps
  }
  const first = a.gears[0]
  const last = a.gears[a.gears.length - 1]
  return [
    `Spark chained the gears: ${a.gears.map((g) => `${g} teeth`).join(' → ')}.`,
    `Only the first and last count for speed: ${first} ÷ ${last} = ${fmt(first / last)}.`,
  ]
}

const describeLever: Describer<'lever-balance'> = (p, a) => {
  const steps: string[] = []
  if (p.fulcrumMovable) steps.push(`Spark put the pivot at peg ${a.fulcrum}.`)
  for (const pl of a.placed) {
    const it = p.tray[pl.item]
    const name = it ? withIcon(it.emoji, `${it.label ?? 'weight'} (${fmt(it.mass)} kg)`) : `Weight ${pl.item + 1}`
    const dist = Math.abs(pl.pos - a.fulcrum)
    steps.push(`${name} on peg ${pl.pos}, ${dist} ${dist === 1 ? 'peg' : 'pegs'} from the pivot.`)
  }
  steps.push('Each side: weight × distance from the pivot. Spark made both sides match.')
  return steps
}

const describeGates: Describer<'logic-gates'> = (p, a) => {
  const label = (id: string) => p.inputs.find((x) => x.id === id)?.label ?? (p.gates.findIndex((g) => g.id === id) >= 0 ? `gate ${p.gates.findIndex((g) => g.id === id) + 1}` : id)
  const steps: string[] = []
  p.gates.forEach((g, i) => {
    const placed = a.gates[g.id]
    if (!placed || g.fixed) return
    const ins = placed.inputs ?? g.inputs
    steps.push(`Gate ${i + 1}: ${placed.type ?? '?'}${ins.length ? `, fed by ${list(ins.map(label))}` : ''}.`)
  })
  steps.push('Spark tried every on/off combination of the inputs to check the output each time.')
  return steps
}

const describeMotor: Describer<'motor-math'> = (p, a) => {
  const steps: string[] = []
  const given: string[] = []
  if (p.fixed.diameterCm !== undefined) given.push(`a ${fmt(p.fixed.diameterCm)} cm wheel`)
  if (p.fixed.rpm !== undefined) given.push(`a motor at ${fmt(p.fixed.rpm)} turns a minute`)
  if (p.fixed.timeS !== undefined) given.push(`${fmt(p.fixed.timeS)} s of driving`)
  if (given.length) steps.push(`Spark started from what it was given: ${list(given)}.`)
  if (a.rpm !== undefined) steps.push(`Motor speed: ${fmt(a.rpm)} turns a minute (${fmt(a.rpm / 60)} a second).`)
  if (a.diameterCm !== undefined) steps.push(`Wheel: ${fmt(a.diameterCm)} cm across, so one turn rolls π × ${fmt(a.diameterCm)} = ${fmt(Math.PI * a.diameterCm)} cm.`)
  if (a.timeS !== undefined) steps.push(`Run time: ${fmt(a.timeS)} s.`)
  if (a.ticks !== undefined) steps.push((p.ticksPerRev ?? 1) === 1 ? `Wheel turns: ${fmt(a.ticks)}.` : `Encoder count: ${fmt(a.ticks)} ticks (${fmt(p.ticksPerRev ?? 1)} ticks = one wheel turn).`)
  steps.push('Distance = turns × one turn’s distance. Spark checked it lands in the target zone.')
  return steps
}

const describeOhms: Describer<'ohms-law'> = (p, a) => {
  if (p.mode === 'predict') {
    const q = p.ask?.quantity ?? 'I'
    const unit = q === 'I' ? 'mA' : q === 'V' ? 'V' : 'Ω'
    const formula = q === 'I' ? 'I = V ÷ R' : q === 'V' ? 'V = I × R' : 'R = V ÷ I'
    return [`Spark wrote down what it knew, then used ${formula}${p.led ? ' (taking away the LED’s share of the voltage first)' : ''}.`, `Answer: ${fmt(a.value ?? 0)} ${unit}.`]
  }
  const steps: string[] = []
  if (a.volts !== undefined) steps.push(`Battery: ${fmt(a.volts)} V.`)
  if (a.ohms !== undefined) steps.push(`Resistor: ${fmt(a.ohms)} Ω.`)
  steps.push(`Current = (battery volts${p.led ? ' − LED volts' : ''}) ÷ resistor ohms. Spark checked it lands in the safe, bright range.`)
  return steps
}

function dirWord(dr: number, dc: number): string {
  const v = dr < 0 ? 'up' : dr > 0 ? 'down' : ''
  const h = dc < 0 ? 'left' : dc > 0 ? 'right' : ''
  return v && h ? `${v}-${h}` : v || h
}

const describePath: Describer<'path-planner'> = (_p, a) => {
  const runs: string[] = []
  for (let i = 1; i < a.path.length; i++) {
    const [r0, c0] = a.path[i - 1]
    const [r1, c1] = a.path[i]
    const w = dirWord(r1 - r0, c1 - c0)
    const last = runs[runs.length - 1]
    const m = last ? /^(.+) (\d+)$/.exec(last) : null
    if (m && m[1] === w) runs[runs.length - 1] = `${w} ${Number(m[2]) + 1}`
    else runs.push(`${w} 1`)
  }
  return ['Spark planned the route from the start square:', ...runs.map((r) => `Go ${r.replace(/ (\d+)$/, (_s, n: string) => ` ${n} ${n === '1' ? 'square' : 'squares'}`)}.`), 'Then it added up the cost of every square it entered and checked no cheaper route exists.']
}

const describePredict: Describer<'predict-output'> = (p, a) => {
  const steps = ['Spark ran the program in its head, one line at a time, writing each variable down as it changed.']
  if (p.ask.kind === 'variable') steps.push(`At the end, ${p.ask.name} = ${a.values[0] ?? '?'}.`)
  else steps.push(`It printed: ${a.values.join(', ')}.`)
  return steps
}

const describeDesigner: Describer<'robot-designer'> = (p, a) => {
  const steps: string[] = []
  for (const s of p.slots) {
    const chosen = s.parts.filter((pt) => a.parts.includes(pt.id))
    if (chosen.length) steps.push(`${s.label}: ${list(chosen.map((pt) => withIcon(pt.icon, pt.name)))}.`)
  }
  steps.push(`Spark added up the cost (budget ${fmt(p.budget)} coins)${p.maxMassKg !== undefined ? ', the weight' : ''}${p.minRuntimeMin !== undefined ? ' and the battery time' : ''} before testing.`)
  return steps
}

const describeMatch: Describer<'robot-match'> = (p, a) =>
  p.robots.map((r) => {
    const j = a.matches[r.id]
    const job = j ? p.jobs.find((x) => x.id === j) : null
    return `${withIcon(r.icon, r.name)} → ${job ? withIcon(job.icon, job.label) : 'not needed here'}.`
  })

const describeSensors: Describer<'sensor-choice'> = (p, a) => {
  const steps = a.sensors.map((id) => {
    const s = SENSORS[id]
    return s ? `Fit the ${withIcon(s.icon, s.name)}: ${s.how}` : `Fit the ${id}.`
  })
  steps.push(`Spark walked the robot through all ${p.needs.length} checkpoints to make sure each one has a sensor that works there.`)
  return steps
}

const describeSignal: Describer<'signal-graph'> = (p, a) => {
  const t = p.task
  if (t.kind === 'mark') return ['Spark watched for each sudden jump in the line.', `Marked at ${list((a.marks ?? []).map((m) => `${fmt(m)} s`))}.`]
  if (t.kind === 'level') return ['Spark looked through the wobble to the middle of the calm stretch.', `Reading: about ${fmt(a.level ?? 0)} ${p.sensor.unit}.`]
  const span = a.span ?? [0, 0]
  return ['Spark found where the change starts and where it ends.', `From ${fmt(span[0])} s to ${fmt(span[1])} s: about ${fmt(span[1] - span[0])} s.`]
}

const MACHINE_WORDS: Record<string, (v: number) => string> = {
  ramp: (v) => `a ramp ${fmt(v)} m long`,
  pulley: (v) => `a pulley with ${fmt(v)} rope strands holding the load`,
  lever: (v) => `a lever with an effort arm ${fmt(v)} m long`,
  'wheel-axle': (v) => `a wheel and axle with a ${fmt(v)} cm crank`,
}

const describeMachines: Describer<'simple-machines'> = (p, a) => [
  `Spark chose ${(MACHINE_WORDS[a.machine] ?? ((v: number) => `${a.machine} set to ${fmt(v)}`))(a.setting)}.`,
  `It checked the push needed is under the robot’s limit${p.maxDistance !== undefined ? ' and the rope or path is not too long' : ''}.`,
]

const describeScene: Describer<'spot-in-scene'> = (p, a) => {
  const steps = a.found.map((id) => {
    const o = p.objects.find((x) => x.id === id)
    const kind = a.labels?.[id] ? p.kinds?.find((k) => k.id === a.labels?.[id])?.label : undefined
    return o ? `Found ${withIcon(o.icon, o.label)}${kind ? ` — it is a ${kind}` : ''}.` : `Found ${id}.`
  })
  steps.unshift('Spark searched the picture slowly, from one side to the other.')
  return steps
}

const describeThreshold: Describer<'threshold-tuner'> = (p, a) => {
  const steps = [`The readings sit near ${fmt(p.states.low.level)} for “${p.states.low.label}” and near ${fmt(p.states.high.level)} for “${p.states.high.label}”.`, `Spark set the threshold in the gap: ${fmt(a.threshold)} ${p.sensor.unit}.`]
  if (a.hysteresis) steps.push(`It added a hysteresis band of ${fmt(a.hysteresis)}, so a little noise cannot flip the decision.`)
  if (a.window && a.window > 1) steps.push(`It averaged ${a.window} readings to smooth the noise.`)
  return steps
}

const describeTrain: Describer<'train-mini'> = (p, a) => {
  const steps = a.added.map((pt) => {
    const c = p.classes.find((x) => x.id === pt.cls)
    return `Added a ${c ? withIcon(c.icon, c.label) : pt.cls} example at (${fmt(pt.x)}, ${fmt(pt.y)}), where that kind was missing.`
  })
  steps.push(a.k === 1 ? 'k = 1: each guess copies the single nearest example.' : `k = ${a.k}: each guess is a vote of the ${a.k} nearest examples.`)
  steps.push('Then Spark pressed Test to see the new points it had never trained on.')
  return steps
}

const LOCO_WORDS: Record<string, string> = { wheels: 'wheels', tracks: 'tracks', legs: 'legs' }

const describeTerrain: Describer<'wheel-terrain'> = (p, a) => {
  const preset = p.presets?.find((x) => x.kind === a.kind && x.diameterCm === a.diameterCm && x.widthCm === a.widthCm)
  if (preset) return [`Spark picked ${withIcon(preset.emoji, preset.name)} (${LOCO_WORDS[preset.kind] ?? preset.kind}).`, 'It checked every part of the course: soft ground, bumps and slopes.']
  const size = a.kind === 'legs' ? `legs ${fmt(a.diameterCm)} cm long with ${fmt(a.widthCm)} cm feet` : `${fmt(a.diameterCm)} cm across and ${fmt(a.widthCm)} cm wide`
  return [`Spark chose ${LOCO_WORDS[a.kind] ?? a.kind}: ${size}.`, 'Wide spreads the weight on soft ground; tall climbs bumps; then it checked the time.']
}

/**
 * Describe a verified solution in plain words, step by step. Never throws:
 * unknown shapes come back as one generic step.
 */
export function describeSolution(template: TemplateId, params: unknown, solution: unknown): string[] {
  try {
    const run = <T extends TemplateId>(d: Describer<T>) => cap(d(params as ParamsOf<T>, solution as AnswerOf<T>))
    switch (template) {
      case 'binary-encoder': return run(describeBinary)
      case 'centre-of-mass': return run(describeCom)
      case 'circuit-snap': return run(describeCircuit)
      case 'classify-sort': return run(describeClassify)
      case 'control-tuner': return run(describeControl)
      case 'debug-program': return cap(describeProgram(solution as AnswerOf<'debug-program'>))
      case 'estimate': return run(describeEstimate)
      case 'ethics-dilemma': return run(describeEthics)
      case 'flowchart-builder': return run(describeFlow)
      case 'gear-train': return run(describeGears)
      case 'lever-balance': return run(describeLever)
      case 'logic-gates': return run(describeGates)
      case 'motor-math': return run(describeMotor)
      case 'number-box': return run<'number-box'>(describeNumberBox)
      case 'ohms-law': return run(describeOhms)
      case 'path-planner': return run(describePath)
      case 'predict-output': return run(describePredict)
      case 'robot-designer': return run(describeDesigner)
      case 'robot-match': return run(describeMatch)
      case 'sensor-choice': return run(describeSensors)
      case 'sequence-path': return cap(describeProgram(solution as AnswerOf<'sequence-path'>))
      case 'signal-graph': return run(describeSignal)
      case 'simple-machines': return run(describeMachines)
      case 'spot-in-scene': return run(describeScene)
      case 'threshold-tuner': return run(describeThreshold)
      case 'train-mini': return run(describeTrain)
      case 'wheel-terrain': return run(describeTerrain)
    }
  } catch {
    /* fall through */
  }
  return ['Spark tried one idea, tested it, and changed one thing at a time until it worked.']
}

// ── Choosing the twin ──────────────────────────────────────────────────────

/** The "shape" of a template's params: twins should ask the same KIND of question. */
function shapeKey(template: TemplateId, params: unknown): string {
  const p = (params ?? {}) as Record<string, unknown>
  switch (template) {
    case 'binary-encoder':
    case 'ohms-law':
    case 'gear-train':
      return String(p.mode)
    case 'classify-sort':
      return String(p.mode)
    case 'motor-math':
      return String(p.command)
    case 'signal-graph':
      return String((p.task as Record<string, unknown> | undefined)?.kind)
    case 'number-box':
    case 'predict-output':
      return String((p.ask as Record<string, unknown> | undefined)?.kind)
    case 'spot-in-scene':
      return p.kinds ? 'label' : 'find'
    default:
      return ''
  }
}

type TwinCandidate = Pick<Activity, 'id' | 'template' | 'band' | 'track' | 'difficulty' | 'params' | 'solution'>

/**
 * The best twin for an activity: same template, a verified solution, not the
 * activity itself; then same band, same question shape, same track, closest
 * difficulty. Deterministic (ties break on id). Null when the template has no
 * other activity.
 */
export function pickTwin<A extends TwinCandidate>(activity: TwinCandidate, pool: readonly A[]): A | null {
  const key = shapeKey(activity.template, activity.params)
  const own = activity.solution === undefined ? null : JSON.stringify(activity.solution)
  let best: A | null = null
  let bestScore = -Infinity
  for (const c of pool) {
    if (c.id === activity.id || c.template !== activity.template || c.solution === undefined) continue
    let s = 0
    if (c.band === activity.band) s += 100
    // Another band only as a near neighbour: an Explorer must never get an Engineers twin.
    s -= Math.abs(BAND_ORDER.indexOf(c.band) - BAND_ORDER.indexOf(activity.band)) * 40
    if (shapeKey(c.template, c.params) === key) s += 50
    if (c.track === activity.track) s += 20
    s -= Math.abs(c.difficulty - activity.difficulty) * 6
    // Slightly prefer an easier twin: a worked example should be a step down, not up.
    if (c.difficulty <= activity.difficulty) s += 2
    // Never show a twin whose answer IS the child's answer: that would hand it over.
    if (own !== null && JSON.stringify(c.solution) === own) s -= 1000
    if (s > bestScore || (s === bestScore && best && c.id < best.id)) {
      best = c
      bestScore = s
    }
  }
  return best
}

/**
 * Server-side: the worked twin for an activity, as words only. `check` is the
 * twin template's check() (TEMPLATE_LOGIC[t].check on the server).
 */
export function workedTwinFor(
  activity: TwinCandidate,
  pool: readonly Activity[],
  check: (template: TemplateId, params: unknown, solution: unknown) => CheckResult,
): WorkedTwin | null {
  const twin = pickTwin(activity, pool)
  if (!twin || twin.solution === undefined) return null
  let why = ''
  try {
    const r = check(twin.template, twin.params, twin.solution)
    if (r.correct) why = r.feedback
  } catch {
    why = ''
  }
  return {
    id: twin.id,
    title: twin.title,
    intro: twin.intro,
    steps: describeSolution(twin.template, twin.params, twin.solution),
    why,
    takeaway: twin.takeaway,
  }
}
