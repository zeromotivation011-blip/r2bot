// components/kids/activities/templates/robot-match/logic.ts
// ROBOT MATCH — real robots, real jobs. The child connects each robot to the
// job or place it was built for. On harder levels the robot's NAME is hidden
// and the child must reason from its design clues alone ("six wheels,
// nuclear battery, arm with a drill") — the way engineers read a design.
// Decoy robots may fit no job at all ("Not needed here").
//
// The real idea: FORM FOLLOWS FUNCTION. A robot's body, power source,
// sensors and tools are chosen for its environment and task.
//
// Every fact in an activity must be true and checkable (cite it in the
// activity's realWorld/takeaway when in doubt).
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface RobotCard {
  id: string
  /** The real robot's name, e.g. "Perseverance rover". */
  name: string
  icon: string
  /** Design clues: body, power, sensors, tools. 1–4 short lines. Shown always; the only info when names are hidden. */
  clues: string[]
  /** A true fact revealed when matched correctly. */
  fact: string
  /** Job id this robot belongs to, or null for a decoy that fits none. */
  job: string | null
}

export interface Job {
  id: string
  /** The job or place, e.g. "Explore Mars", "Inside a hospital operating room". */
  label: string
  icon: string
}

export interface Params {
  task: string
  /** 2–6 robots. */
  robots: RobotCard[]
  /** 2–6 jobs. Each job needs at least one robot. */
  jobs: Job[]
  /** Hide names: match from clues only (ages 11+). Default false. Names are revealed after a correct match. */
  hideNames?: boolean
  /** Wrong matches allowed (default 0). */
  allowedMistakes?: number
}

export interface Answer {
  /** robot id → job id, or null for "not needed here". */
  matches: Record<string, string | null>
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.robots) || !Array.isArray(p.jobs)) return ['robots and jobs are required']
  if (!p.task?.trim()) out.push('task is required')
  if (p.robots.length < 2 || p.robots.length > 6) out.push('robots: 2–6')
  if (p.jobs.length < 2 || p.jobs.length > 6) out.push('jobs: 2–6')
  const jobIds = new Set(p.jobs.map((j) => j.id))
  if (jobIds.size !== p.jobs.length) out.push('job ids must be unique')
  const rIds = new Set(p.robots.map((r) => r.id))
  if (rIds.size !== p.robots.length) out.push('robot ids must be unique')
  for (const r of p.robots) {
    if (r.job !== null && !jobIds.has(r.job)) out.push(`robot ${r.id}: unknown job ${r.job}`)
    if (!r.clues?.length || r.clues.length > 4) out.push(`robot ${r.id}: 1–4 clues`)
    if (!r.fact?.trim()) out.push(`robot ${r.id}: fact is required`)
    if (p.hideNames && r.clues?.some((c) => c.toLowerCase().includes(r.name.toLowerCase()))) out.push(`robot ${r.id}: a clue gives away the name`)
  }
  for (const j of p.jobs) if (!p.robots.some((r) => r.job === j.id)) out.push(`job ${j.id} has no robot`)
  if (p.allowedMistakes !== undefined && !(Number.isInteger(p.allowedMistakes) && p.allowedMistakes >= 0 && p.allowedMistakes < p.robots.length / 2))
    out.push('allowedMistakes: integer ≥ 0 and below half the robots')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const m = a?.matches ?? {}
  const unset = p.robots.filter((r) => !(r.id in m))
  if (unset.length) return { correct: false, score: 0, feedback: `Connect every robot first (${unset.length} left).` }
  const wrong = p.robots.filter((r) => m[r.id] !== r.job)
  const score = (p.robots.length - wrong.length) / p.robots.length
  if (wrong.length <= (p.allowedMistakes ?? 0)) {
    return {
      correct: true,
      score: 1,
      feedback: `Every robot is where it belongs. Notice how each body fits its job: ${p.robots
        .filter((r) => r.job)
        .slice(0, 2)
        .map((r) => `${r.name} — ${r.clues[0].toLowerCase()}`)
        .join('; ')}. Form follows function!`,
    }
  }
  const w = wrong[0]
  const jobLabel = (id: string | null | undefined) => (id ? p.jobs.find((j) => j.id === id)?.label ?? id : 'Not needed here')
  const name = p.hideNames ? 'One robot' : w.name
  const hint =
    w.job === null
      ? `${name} doesn’t fit any of these jobs — look at its clues: ${w.clues.join(', ').toLowerCase()}.`
      : `${name} is not built for “${jobLabel(m[w.id])}”. Its clues — ${w.clues.join(', ').toLowerCase()} — suit a different job better.`
  return { correct: false, score, feedback: `${p.robots.length - wrong.length} of ${p.robots.length} matched. ${hint}` }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'robot-match', name: 'Robot match', validate, check }
