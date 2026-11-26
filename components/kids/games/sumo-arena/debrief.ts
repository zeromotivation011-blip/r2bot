// components/kids/games/sumo-arena/debrief.ts
// "Why did that happen?" — turns a match log into a few plain sentences, the
// way a coach would explain a bout: who pushed whom, from which side, how hard,
// and which part of the program or the robot decided it.

import type { BotStats, MatchResult } from './sim'
import { WEDGE_LIFT } from './sim'
import { ACTION_TEXT, type RuleAction } from './brain'

export interface Debrief {
  headline: string
  tone: 'win' | 'lose' | 'draw'
  reasons: string[]
  /** One thing to try next. */
  tip: string
}

export interface DebriefInput {
  result: MatchResult
  you: BotStats
  rival: BotStats
  rivalName: string
  /** The child's charge power, % — the push they actually asked for. */
  youPowerPct: number
  rivalPowerPct: number
  /** Their own edge threshold (Ace/Legend), when they can set it. */
  edgeThreshold?: number
  /** Recover back-up time (ms) when they can set it. */
  backMs?: number
  pushThroughEdge?: boolean
  /** Pilot: what their line card does. */
  lineAction?: RuleAction
  tier: number
}

const n = (x: number) => Math.round(x * 10) / 10

/** The push a robot really makes at a given power: the motor's share, capped by its grip. */
export function pushAt(s: BotStats, powerPct: number, gripMul = 1): number {
  return Math.min((s.motorN * Math.max(0, powerPct)) / 100, s.gripN * gripMul)
}

const STATE_WORDS: Record<string, string> = {
  SEARCH: 'searching',
  CHARGE: 'charging',
  RECOVER: 'backing away from the edge',
  'BACK UP': 'backing up',
  DODGE: 'side-stepping',
  OPENING: 'swerving',
  SPIN: 'spinning to look',
  CREEP: 'creeping forward',
  FORWARD: 'driving forward',
  STOP: 'standing still',
}
const said = (s: string | null) => (s ? (STATE_WORDS[s] ?? s.toLowerCase()) : 'driving')

export function debrief(d: DebriefInput): Debrief {
  const r = d.result
  const yl = r.logs.you
  const rl = r.logs.rival
  const youPush = pushAt(d.you, d.youPowerPct)
  const rivalPush = pushAt(d.rival, d.rivalPowerPct)
  const reasons: string[] = []
  let tip = ''

  if (r.winner === 'draw') {
    reasons.push(`Time ran out after ${Math.round(r.t)} seconds and nobody left the ring. A draw is not a win.`)
    if (yl.firstSeenS === null) {
      reasons.push('Your distance sensor never saw the rival: your robot did not turn to look for it.')
      tip = 'Make your robot search: spinning on the spot sweeps the sensor all the way round.'
    } else if (yl.contactS < 1) {
      reasons.push('The robots hardly touched. Your robot saw the rival but did not go and push it.')
      tip = 'Charge sooner: start the charge when the rival is further away.'
    } else {
      reasons.push(`The robots shoved for ${Math.round(yl.contactS)} seconds and neither won: your push was about ${n(youPush)} N against ${n(rivalPush)} N.`)
      tip = youPush < d.you.pushN - 0.5 ? `Use more power: at ${d.youPowerPct}% your motors only give ${n(youPush)} N of the ${n(d.you.pushN)} N they could.` : 'Hit it from the side, or change your robot so it pushes harder.'
    }
    return { headline: 'Draw', tone: 'draw', reasons, tip }
  }

  const youWon = r.winner === 'you'
  const loserLog = youWon ? rl : yl
  const winnerLog = youWon ? yl : rl

  if (!r.pushedOut) {
    // Somebody drove out on their own.
    if (youWon) {
      reasons.push(`${d.rivalName} drove off the edge by itself while it was ${said(loserLog.stateAtOut)}. Your robot stayed on the ring.`)
      tip = 'A win is a win — but try to push it out yourself next time.'
    } else {
      reasons.push(`Your robot drove off the edge by itself while it was ${said(yl.stateAtOut)}. Nobody pushed it.`)
      if (!yl.sawEdgeBeforeOut) {
        reasons.push(
          d.edgeThreshold !== undefined && d.edgeThreshold > 88
            ? `Your edge threshold is ${d.edgeThreshold}: the white line only reflects about 92, so the sensor hardly ever says "line".`
            : 'Its edge sensors did not see the white line in time.',
        )
        tip = d.edgeThreshold !== undefined && d.edgeThreshold > 88 ? 'Lower the edge threshold to about 50: halfway between black (8) and white (92).' : 'Make sure the "line seen" rule backs the robot away.'
      } else if (d.lineAction && d.lineAction !== 'backturn') {
        reasons.push(`Its sensor DID see the white line — but your line card says “${ACTION_TEXT[d.lineAction]}”, so it did not get away from the edge.`)
        tip = 'Change the line card to “back up and turn”.'
      } else if (yl.stateAtOut === 'CHARGE' && d.pushThroughEdge) {
        reasons.push('It was charging with “keep pushing at the edge” on, and the rival slipped aside at the last moment.')
        tip = 'Keep pushing only when the rival is right on your nose — or shorten how long you chase it.'
      } else {
        reasons.push(`It saw the line, but its back-up${d.backMs !== undefined ? ` (${d.backMs} ms)` : ''} was too short to stop its momentum.`)
        tip = 'Back up for longer when the edge sensor fires — a moving robot needs room to stop.'
      }
    }
  } else {
    const side = r.hitSide
    if (side === 'side' || side === 'back') {
      const where = side === 'back' ? 'from behind' : 'from the side'
      reasons.push(
        youWon
          ? `You hit ${d.rivalName} ${where}, where it could not see you or push back.`
          : `${d.rivalName} hit your robot ${where}, where its sensor could not see it coming.`,
      )
      if (!youWon && (yl.stateAtOut === 'RECOVER' || yl.stateAtOut === 'BACK UP')) reasons.push('Your robot was busy backing away from the edge — the moment a sumo robot is weakest.')
      if (!youWon) tip = 'Keep the rival in front of you: search toward it, and charge as soon as you see it.'
    } else {
      // A head-on shove.
      const lifted = youWon ? rl.liftedS : yl.liftedS
      reasons.push(
        youWon
          ? `You won the head-on shove: your push about ${n(youPush)} N against its ${n(rivalPush)} N.`
          : `${d.rivalName} won the head-on shove: its push about ${n(rivalPush)} N against your ${n(youPush)} N.`,
      )
      if (lifted > 0.2) {
        reasons.push(
          youWon
            ? `Your wedge got under it for ${n(lifted)} s: it carried ${Math.round(WEDGE_LIFT * 100)}% of its weight, so its wheels pressed down less and lost grip.`
            : `Its wedge got under your robot for ${n(lifted)} s and carried ${Math.round(WEDGE_LIFT * 100)}% of your weight: your wheels lost grip and slid.`,
        )
      }
      const loser = youWon ? d.rival : d.you
      if (!youWon) {
        tip =
          lifted > 0.2
            ? 'Fit a wedge of your own (two wedges cancel out), or attack its side where the wedge is not.'
            : loser.limitedBy === 'traction'
              ? 'Your wheels were spinning: your robot is grip-limited. More weight or grippier tracks would push harder.'
              : 'Your motors were at full strength: more weight will not help. Use more power, or attack its side.'
      }
    }
  }
  if (youWon && winnerLog.topSpeedSeen > 0.3 && r.t < 6) reasons.push(`A fast start helps: you reached ${n(winnerLog.topSpeedSeen)} m/s, and that momentum did the first push.`)
  if (!tip) tip = youWon ? 'Can you win faster? Try a different search or more power.' : 'Change one thing, then fight again — the bout is the same every time, so you will see exactly what it did.'
  return { headline: youWon ? 'You won!' : `${d.rivalName} won`, tone: youWon ? 'win' : 'lose', reasons, tip }
}
