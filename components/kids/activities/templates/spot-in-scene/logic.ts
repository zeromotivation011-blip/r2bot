// components/kids/activities/templates/spot-in-scene/logic.ts
// SPOT IN THE SCENE — an illustrated scene (street, warehouse, home, farm,
// Mars, ocean, hospital, factory) full of objects. The child finds every
// TARGET ("all the robots", "every sensor on this self-driving car", "the
// hazards a delivery robot must avoid") by tapping. Tapping a non-target
// explains why it isn't one. On harder levels each found target must also be
// LABELLED with its kind ("lidar", "camera", "radar"…), and there is a
// limited number of wrong taps.
//
// The real idea: robots are everywhere, and each sensor/hazard has a reason.
//
// Coordinates are on a 0–100 × 0–62.5 canvas (16:10), x right, y down.
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export const SCENE_W = 100
export const SCENE_H = 62.5

export interface SceneObject {
  id: string
  /** Emoji, or a built-in vector glyph 'svg:<name>' (see glyphs.tsx: vacuum, mower, lidar, camera, radar, ultrasonic, car, amr, dock, arm, drone). */
  icon: string
  /** Centre position on the 100 × 62.5 canvas. */
  x: number
  y: number
  /** Icon size (canvas units, 4–16). Tap area is at least 44 px on any screen. */
  size: number
  /** Name, shown when tapped. */
  label: string
  /** Is it something to find? */
  target: boolean
  /** Targets in label mode: the correct kind id. */
  kind?: string
  /** Shown when tapped: why it is (or is not) a target. True and specific. */
  fact: string
}

export interface Params {
  /** What to find, e.g. "Find every robot in the warehouse." */
  prompt: string
  /** Painted background. */
  backdrop: 'street' | 'warehouse' | 'home' | 'farm' | 'mars' | 'ocean' | 'hospital' | 'factory'
  /**
   * Big decorative pieces that are NOT tappable (the car the sensors sit on,
   * the robot itself, furniture). Drawn under the objects.
   */
  decor?: { icon: string; x: number; y: number; size: number }[]
  /** 2–16 objects, at least 1 target. */
  objects: SceneObject[]
  /** Label mode (ages 11+): each found target must be given its kind from this list. */
  kinds?: { id: string; label: string }[]
  /** Wrong taps allowed before the check fails (default: unlimited for ages 5–10 — set 2–3 for older). */
  maxWrongTaps?: number
}

export interface Answer {
  /** Ids of objects the child marked as targets. */
  found: string[]
  /** Label mode: target id → kind id. */
  labels?: Record<string, string>
  /** How many non-targets were tapped along the way. */
  wrongTaps?: number
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.objects)) return ['objects are required']
  if (!p.prompt?.trim()) out.push('prompt is required')
  if (!['street', 'warehouse', 'home', 'farm', 'mars', 'ocean', 'hospital', 'factory'].includes(p.backdrop)) out.push('unknown backdrop')
  if (p.objects.length < 2 || p.objects.length > 16) out.push('objects: 2–16')
  if (!p.objects.some((o) => o.target)) out.push('at least one object must be a target')
  const ids = new Set<string>()
  const kindIds = new Set((p.kinds ?? []).map((k) => k.id))
  if (p.kinds && (p.kinds.length < 2 || p.kinds.length > 6)) out.push('kinds: 2–6')
  for (const o of p.objects) {
    if (ids.has(o.id)) out.push(`duplicate object id ${o.id}`)
    ids.add(o.id)
    if (!(o.size >= 4 && o.size <= 16)) out.push(`object ${o.id}: size 4–16`)
    if (!(o.x - o.size / 2 >= 0 && o.x + o.size / 2 <= SCENE_W && o.y - o.size / 2 >= 0 && o.y + o.size / 2 <= SCENE_H)) out.push(`object ${o.id}: must sit fully inside the scene`)
    if (!o.fact?.trim()) out.push(`object ${o.id}: fact is required`)
    if (p.kinds && o.target && (!o.kind || !kindIds.has(o.kind))) out.push(`target ${o.id}: needs a kind from kinds`)
  }
  // Objects must not overlap so each tap is unambiguous.
  for (let i = 0; i < p.objects.length; i++)
    for (let j = i + 1; j < p.objects.length; j++) {
      const a = p.objects[i]
      const b = p.objects[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) < (a.size + b.size) / 2 * 0.85) out.push(`objects ${a.id} and ${b.id} overlap`)
    }
  if (p.maxWrongTaps !== undefined && !(Number.isInteger(p.maxWrongTaps) && p.maxWrongTaps >= 0)) out.push('maxWrongTaps: integer ≥ 0')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const found = new Set(a?.found ?? [])
  const targets = p.objects.filter((o) => o.target)
  const falsePos = p.objects.filter((o) => !o.target && found.has(o.id))
  const missed = targets.filter((o) => !found.has(o.id))
  const hit = targets.length - missed.length
  if (falsePos.length) {
    const f = falsePos[0]
    return { correct: false, score: Math.max(0, hit / targets.length - 0.2), feedback: `“${f.label}” isn’t one: ${f.fact}` }
  }
  if (missed.length)
    return { correct: false, score: hit / targets.length, feedback: `You found ${hit} of ${targets.length}. ${missed.length === 1 ? 'One is' : `${missed.length} are`} still hiding — look ${hintArea(missed[0])}.` }
  if (p.maxWrongTaps !== undefined && (a.wrongTaps ?? 0) > p.maxWrongTaps)
    return { correct: false, score: 0.7, feedback: `You found them all, but with ${a.wrongTaps} wrong taps (allowed ${p.maxWrongTaps}). A robot’s vision has to be careful too — try again and think before each tap.` }
  if (p.kinds) {
    const lab = a.labels ?? {}
    const unl = targets.filter((o) => !lab[o.id])
    if (unl.length) return { correct: false, score: 0.6, feedback: `Now say what each one is — ${unl.length} still need a label.` }
    const wrong = targets.filter((o) => lab[o.id] !== o.kind)
    if (wrong.length) {
      const w = wrong[0]
      const kl = (id: string | undefined) => p.kinds!.find((k) => k.id === id)?.label ?? id
      return { correct: false, score: 0.6 + 0.4 * (1 - wrong.length / targets.length), feedback: `${w.label} isn’t a ${kl(lab[w.id])}. Clue: ${w.fact}` }
    }
  }
  return {
    correct: true,
    score: 1,
    feedback: `You found all ${targets.length}${p.kinds ? ' and named every one' : ''}! ${targets.length > 1 ? 'Each one is there for a reason — tap them again to reread why.' : targets[0].fact}`,
  }
}

function hintArea(o: SceneObject): string {
  const h = o.x < 34 ? 'left' : o.x > 66 ? 'right' : 'middle'
  const v = o.y < SCENE_H / 3 ? 'top' : o.y > (2 * SCENE_H) / 3 ? 'bottom' : ''
  return `near the ${v ? `${v} ` : ''}${h === 'middle' && !v ? 'centre' : h}`
}

export const logic: TemplateLogic<Params, Answer> = { id: 'spot-in-scene', name: 'Spot in the scene', validate, check }
