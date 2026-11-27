// components/kids/codelab/worked-twin.ts
// Roadmap #26 — "Spark shows me" for Code Lab. The worked example is a TWIN
// mission (same band, the same lesson blocks where possible, never one with
// the same answer) solved block by block; then the child's own mission is
// "your turn". Loaded on demand by MissionClient only when a child opens the
// third hint step, so the reference solutions never ship in the first load.

import { blockText } from '@/lib/kids/code-lab/blocks'
import { MISSIONS } from '@/lib/kids/code-lab/missions'
import { hasElse, type Block, type Mission } from '@/lib/kids/code-lab/types'
import type { WorkedExample } from '@/components/kids/galaxy/HintLadderClient'

type TwinCandidate = Pick<Mission, 'id' | 'band' | 'order' | 'palette' | 'mustUse' | 'solution'>

/** The twin mission: same band, shared lesson blocks, closest order, earlier first; never the same answer. */
export function codeLabTwin<M extends TwinCandidate>(mission: Pick<Mission, 'id' | 'band' | 'order' | 'palette' | 'mustUse'> & { solution?: Block[] }, pool: readonly M[]): M | null {
  const own = mission.solution ? JSON.stringify(strip(mission.solution)) : null
  const must = new Set(mission.mustUse ?? [])
  const pal = new Set(mission.palette)
  let best: M | null = null
  let bestScore = -Infinity
  for (const c of pool) {
    if (c.id === mission.id) continue
    let s = 0
    if (c.band === mission.band) s += 100
    for (const t of c.mustUse ?? []) if (must.has(t)) s += 20
    const overlap = c.palette.filter((t) => pal.has(t)).length / Math.max(1, Math.max(c.palette.length, pal.size))
    s += Math.round(overlap * 15)
    if (c.band === mission.band) {
      s -= Math.abs(c.order - mission.order) * 3
      if (c.order < mission.order) s += 4 // one the child has probably met
    }
    if (own !== null && JSON.stringify(strip(c.solution)) === own) s -= 1000
    if (s > bestScore || (s === bestScore && best && c.id < best.id)) {
      best = c
      bestScore = s
    }
  }
  return best
}

/** Block ids differ between missions; compare programs by shape only. */
function strip(list: Block[]): unknown[] {
  return list.map((b) => {
    const { id: _id, ...rest } = b
    void _id
    const out: Record<string, unknown> = { ...rest }
    if ('body' in b) out.body = strip(b.body)
    if (hasElse(b)) out.elseBody = strip(b.elseBody)
    return out
  })
}

/** The program as indented lines, the way the editor shows it. */
export function programLines(list: Block[], depth = 0): string[] {
  const pad = '   '.repeat(depth)
  const out: string[] = []
  for (const b of list) {
    out.push(`${pad}${blockText(b)}${'body' in b ? ':' : ''}`)
    if ('body' in b) out.push(...programLines(b.body, depth + 1))
    if (hasElse(b) && b.elseBody.length) {
      out.push(`${pad}Otherwise:`)
      out.push(...programLines(b.elseBody, depth + 1))
    }
  }
  return out
}

/** The worked example for the hint ladder, or null when no twin exists. */
export function codeLabWorked(missionId: string): WorkedExample | null {
  const m = MISSIONS.find((x) => x.id === missionId)
  if (!m) return null
  const twin = codeLabTwin(m, MISSIONS)
  if (!twin) return null
  return {
    title: `${twin.emoji} ${twin.title}`,
    intro: twin.task,
    steps: programLines(twin.solution),
    why: twin.learningGoal,
    code: true,
  }
}
