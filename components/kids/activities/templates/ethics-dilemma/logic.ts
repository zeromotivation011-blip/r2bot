// components/kids/activities/templates/ethics-dilemma/logic.ts
// ETHICS DILEMMA — the child writes the POLICY of a robot that works among
// people. Each situation is a moment the robot meets ("a child asks the
// delivery robot to cross the road with it"); the child picks how the robot
// should act. Every choice moves meters for the people affected (safety,
// privacy, fairness, helpfulness…), live, so trade-offs are visible.
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
  /** 2–5 stakeholders / values with live meters. */
  stakeholders: Stakeholder[]
  /** 1–5 situations (one decision each). Ages 5–7: 1–2. Ages 14+: 4–5 with real tension. */
  situations: Situation[]
  /** Asked after the policy passes, for talking about at home or in class. */
  discussion: string
  /** Show meters live while choosing (default true). Off = predict the effects first (ages 14+). */
  liveMeters?: boolean
}

export interface Answer {
  /** situation id → choice id. */
  choices: Record<string, string>
}

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
  if (p.stakeholders.length < 2 || p.stakeholders.length > 5) out.push('stakeholders: 2–5')
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
    for (const c of s.choices ?? []) {
      if (!c.consequence?.trim()) out.push(`choice ${s.id}/${c.id}: consequence is required`)
      for (const [k, v] of Object.entries(c.effects ?? {})) {
        if (!sk.has(k)) out.push(`choice ${s.id}/${c.id}: unknown stakeholder ${k}`)
        if (!(Number.isInteger(v) && v >= -2 && v <= 2)) out.push(`choice ${s.id}/${c.id}: effects are integers −2…+2`)
      }
    }
  }
  if (out.length) return out
  if (passingPolicies(p) === 0) out.push('no policy passes every red line and floor — raise a floor or soften an effect')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const unanswered = p.situations.filter((s) => !s.choices.some((c) => c.id === a?.choices?.[s.id]))
  if (unanswered.length) return { correct: false, score: 0, feedback: `Decide what the robot does in every situation first (${unanswered.length} left).` }
  const red = p.situations.map((s) => s.choices.find((c) => c.id === a.choices[s.id])!).find((c) => c.redLine)
  const m = meters(p, a)
  const label = (id: string) => p.stakeholders.find((s) => s.id === id)?.label ?? id
  if (red) return { correct: false, score: 0.3, feedback: `“${red.label}” crosses a line: ${red.redLine} Pick another way for the robot to act.` }
  const low = p.stakeholders.find((s) => m[s.id] < (s.floor ?? -1))
  if (low)
    return {
      correct: false,
      score: 0.6,
      feedback: `Your rules are safe, but ${low.icon} ${low.label} ends up at ${m[low.id]} — worse off than anyone should be (lowest OK is ${low.floor ?? -1}). Good robot rules look after everyone affected. Which choice could treat ${low.label.toLowerCase()} better?`,
    }
  const sorted = [...p.stakeholders].sort((x, y) => m[y.id] - m[x.id])
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]
  const n = passingPolicies(p)
  const tradeoff = m[top.id] !== m[bottom.id] ? ` Your rules favour ${label(top.id).toLowerCase()} most and ask the most of ${label(bottom.id).toLowerCase()} — that is the trade-off you chose.` : ' Your rules balance everyone evenly.'
  return {
    correct: true,
    score: 1,
    feedback: `A fair, safe policy: no red lines crossed and nobody left badly off.${tradeoff}${n > 1 ? ` (${n} different policies pass — people can reasonably disagree.)` : ''}`,
  }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'ethics-dilemma', name: 'Ethics dilemma', validate, check }
