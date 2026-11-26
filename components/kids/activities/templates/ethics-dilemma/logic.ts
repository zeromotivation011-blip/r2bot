// components/kids/activities/templates/ethics-dilemma/logic.ts
// ETHICS DILEMMA — the child writes the POLICY of a robot that works among
// people. Each situation is a moment the robot meets ("a child asks the
// delivery robot to cross the road with it"); the child picks how the robot
// should act. Every choice moves meters for the people affected (safety,
// privacy, fairness, helpfulness…). With liveMeters the meters move as the
// child chooses (ages 5–10); without, the child PREDICTS which way each meter
// will go and the test shows whether they were right. What each choice leads
// to ("consequence") is only shown after "Test my rules", so the child has to
// reason about the effects instead of trying every option.
//
// There is rarely one right answer in ethics, so the check is not "match the
// key". A policy passes when:
//   1. it crosses no RED LINE — choices real-world rules and engineering
//      ethics treat as unacceptable (endangering people, secretly recording,
//      deceiving), each with a reason; and
//   2. every stakeholder meter ends at or above its floor (nobody is left
//      badly worse off).
// Many policies can pass; the feedback names the trade-off the child made,
// and a discussion question closes the activity.
//
// Real ideas: robots act on rules people choose; safety first (Asimov is
// fiction, but ISO 10218 / ISO 13482 safety standards are real); privacy and
// consent; fairness to everyone affected; honesty about being a machine.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface Stakeholder {
  id: string
  /** e.g. "Safety", "Privacy", "Shop owner", "Neighbours". */
  label: string
  icon: string
  /** The meter must end at or above this (meters start at 0, each choice moves them −2…+2). Default −1. */
  floor?: number
}

export interface Choice {
  id: string
  /** What the robot does, in the child's words. */
  label: string
  /** Effect on each stakeholder meter (−2…+2). Missing = 0. */
  effects: Record<string, number>
  /** If set, this choice crosses a red line; the text explains why (kindly). */
  redLine?: string
  /** One sentence: what happens next if the robot does this (shown after choosing). */
  consequence: string
}

export interface Situation {
  id: string
  /** The moment, ≤ 30 words. */
  prompt: string
  icon: string
  /** 2–4 choices. */
  choices: Choice[]
}

export interface Params {
  /** The robot and its job, e.g. "SidewalkBot delivers groceries in a busy town." */
  scenario: string
  robotIcon: string
  /** 2–6 stakeholders / values with meters. */
  stakeholders: Stakeholder[]
  /** 1–5 situations (one decision each). Ages 5–7: 1–2. Ages 14+: 4–5 with real tension. */
  situations: Situation[]
  /** Asked after the policy passes, for talking about at home or in class. */
  discussion: string
  /**
   * Show meters live while choosing (default true, ages 5–10). false = the
   * child predicts each meter's final direction (up / same / down) before
   * testing; the test reveals the meters and grades the predictions (ages 11+).
   */
  liveMeters?: boolean
  /**
   * Require real tension (use for ages 11+): every situation must offer at
   * least 2 choices that cross no red line, and each of those must cost some
   * stakeholder something (an effect below 0). No free "obviously good" option.
   */
  tension?: boolean
}

export type Direction = 'up' | 'same' | 'down'

export interface Answer {
  /** situation id → choice id. */
  choices: Record<string, string>
  /** liveMeters false: stakeholder id → predicted direction of its final meter. */
  predictions?: Record<string, Direction>
}

export const directionOf = (v: number): Direction => (v > 0 ? 'up' : v < 0 ? 'down' : 'same')

export function meters(p: Params, a: Answer): Record<string, number> {
  const m: Record<string, number> = Object.fromEntries(p.stakeholders.map((s) => [s.id, 0]))
  for (const s of p.situations) {
    const c = s.choices.find((x) => x.id === a?.choices?.[s.id])
    if (!c) continue
    for (const [k, v] of Object.entries(c.effects)) if (k in m) m[k] += v
  }
  return m
}

function passes(p: Params, a: Answer): boolean {
  for (const s of p.situations) {
    const c = s.choices.find((x) => x.id === a.choices[s.id])
    if (!c || c.redLine) return false
  }
  const m = meters(p, a)
  return p.stakeholders.every((s) => m[s.id] >= (s.floor ?? -1))
}

/** Count of passing policies (the child should know there is more than one good answer). */
export function passingPolicies(p: Params): number {
  let n = 0
  const rec = (i: number, acc: Record<string, string>) => {
    if (i === p.situations.length) {
      if (passes(p, { choices: acc })) n++
      return
    }
    for (const c of p.situations[i].choices) rec(i + 1, { ...acc, [p.situations[i].id]: c.id })
  }
  rec(0, {})
  return n
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.stakeholders) || !Array.isArray(p.situations)) return ['stakeholders and situations are required']
  if (!p.scenario?.trim()) out.push('scenario is required')
  if (!p.discussion?.trim()) out.push('discussion question is required')
  if (p.stakeholders.length < 2 || p.stakeholders.length > 6) out.push('stakeholders: 2–6')
  const sk = new Set(p.stakeholders.map((s) => s.id))
  if (sk.size !== p.stakeholders.length) out.push('stakeholder ids must be unique')
  if (p.situations.length < 1 || p.situations.length > 5) out.push('situations: 1–5')
  const sids = new Set<string>()
  for (const s of p.situations) {
    if (sids.has(s.id)) out.push(`duplicate situation id ${s.id}`)
    sids.add(s.id)
    if (!s.prompt?.trim()) out.push(`situation ${s.id}: prompt is required`)
    if (!s.choices || s.choices.length < 2 || s.choices.length > 4) out.push(`situation ${s.id}: 2–4 choices`)
    const cids = new Set((s.choices ?? []).map((c) => c.id))
    if (cids.size !== (s.choices ?? []).length) out.push(`situation ${s.id}: choice ids must be unique`)
    if ((s.choices ?? []).every((c) => c.redLine)) out.push(`situation ${s.id}: every choice is a red line`)
    if (p.tension) {
      const ok = (s.choices ?? []).filter((c) => !c.redLine)
      if (ok.length < 2) out.push(`situation ${s.id}: tension needs at least 2 choices that cross no red line`)
      for (const c of ok) if (!Object.values(c.effects ?? {}).some((v) => v < 0)) out.push(`situation ${s.id}/${c.id}: tension — every acceptable choice must cost some stakeholder something`)
    }
    for (const c of s.choices ?? []) {
      if (!c.consequence?.trim()) out.push(`choice ${s.id}/${c.id}: consequence is required`)
      for (const [k, v] of Object.entries(c.effects ?? {})) {
        if (!sk.has(k)) out.push(`choice ${s.id}/${c.id}: unknown stakeholder ${k}`)
        if (!(Number.isInteger(v) && v >= -2 && v <= 2)) out.push(`choice ${s.id}/${c.id}: effects are integers −2…+2`)
      }
    }
  }
  if (out.length) return out
  const n = passingPolicies(p)
  if (n === 0) out.push('no policy passes every red line and floor — raise a floor or soften an effect')
  if (p.tension && n < 2) out.push('tension: at least 2 different policies should pass (people can reasonably disagree)')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const unanswered = p.situations.filter((s) => !s.choices.some((c) => c.id === a?.choices?.[s.id]))
  if (unanswered.length) return { correct: false, score: 0, feedback: `Decide what the robot does in every situation first (${unanswered.length} left).` }
  const live = p.liveMeters ?? true
  const unpredicted = live ? [] : p.stakeholders.filter((s) => !a.predictions?.[s.id])
  if (unpredicted.length) return { correct: false, score: 0, feedback: `Predict which way every meter will go first (${unpredicted.length} left).` }
  const red = p.situations.map((s) => s.choices.find((c) => c.id === a.choices[s.id])!).find((c) => c.redLine)
  const m = meters(p, a)
  const label = (id: string) => p.stakeholders.find((s) => s.id === id)?.label ?? id
  // Predictions are explained, not part of pass/fail: the policy is what is judged.
  let pred = ''
  if (!live) {
    const wrongP = p.stakeholders.filter((s) => a.predictions![s.id] !== directionOf(m[s.id]))
    const right = p.stakeholders.length - wrongP.length
    if (!wrongP.length) pred = ` You predicted all ${right} meters correctly — you thought through every effect.`
    else {
      const w = wrongP[0]
      const word = { up: 'go up', same: 'stay level', down: 'go down' } as const
      const mover = p.situations
        .map((s) => s.choices.find((c) => c.id === a.choices[s.id])!)
        .filter((c) => (c.effects[w.id] ?? 0) !== 0)
        .sort((x, y) => Math.abs(y.effects[w.id] ?? 0) - Math.abs(x.effects[w.id] ?? 0))[0]
      pred = ` Your predictions: ${right} of ${p.stakeholders.length} right. You expected ${w.label.toLowerCase()} to ${word[a.predictions![w.id]]}, but it ended at ${m[w.id] > 0 ? '+' : ''}${m[w.id]}${mover ? ` — mostly because of “${mover.label}”` : ''}.`
    }
  }
  if (red) return { correct: false, score: 0.3, feedback: `“${red.label}” crosses a line: ${red.redLine} Pick another way for the robot to act.${pred}` }
  const low = p.stakeholders.find((s) => m[s.id] < (s.floor ?? -1))
  if (low)
    return {
      correct: false,
      score: 0.6,
      feedback: `Your rules cross no red line, but ${low.icon} ${low.label} ends up at ${m[low.id]} — worse off than anyone should be (lowest OK is ${low.floor ?? -1}). Good robot rules look after everyone affected. Which choice could treat ${low.label.toLowerCase()} better?${pred}`,
    }
  const sorted = [...p.stakeholders].sort((x, y) => m[y.id] - m[x.id])
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]
  const n = passingPolicies(p)
  const tradeoff = m[top.id] !== m[bottom.id] ? ` Your rules favour ${label(top.id).toLowerCase()} most and ask the most of ${label(bottom.id).toLowerCase()} — that is the trade-off you chose.` : ' Your rules balance everyone evenly.'
  return {
    correct: true,
    score: 1,
    feedback: `A fair, safe policy: no red lines crossed and nobody left badly off.${tradeoff}${n > 1 ? ` (${n} different policies pass — people can reasonably disagree.)` : ''}${pred}`,
  }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'ethics-dilemma', name: 'Ethics dilemma', validate, check }
