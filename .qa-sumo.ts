import { loadRapier } from '@/lib/kids/sim/rapier'
import { DEFAULT_DESIGN, type RobotDesign } from '@/lib/kids/robot-design'
import { createMatch, botStats } from '@/components/kids/games/sumo-arena/sim'
import { buildSetups, boutSeed } from '@/components/kids/games/sumo-arena/bouts'
import { fsmController, cadetToFsm, ruleController, senseiTactic, roundMemory, DEFAULT_ACE, DEFAULT_PILOT, type FsmProgram, type PilotProgram, type SenseiTactic, type RuleAction } from '@/components/kids/games/sumo-arena/brain'

async function main() {
  const R = await loadRapier()
  const run = (tier: number, design: RobotDesign, ballast: number, mk: () => {ctrl: any, th: number}, round=0, tactic?: SenseiTactic) => {
    const {ctrl, th} = mk()
    const m = createMatch(R, buildSetups({ tier, seed: boutSeed(tier, round), youDesign: design, youBallast: ballast, youController: ctrl, youThreshold: th, tactic }))
    const r = m.runToEnd(); m.dispose(); return r
  }
  const d = { ...DEFAULT_DESIGN }
  console.log('default design', d.body, d.drive, d.tool, botStats(d))
  // Cadet presets
  for (const preset of ['hunter','bulldozer','statue'] as const) for (const speed of [30,50,70,100]) {
    const r = run(0, d, 0, () => ({ctrl: fsmController(cadetToFsm({preset, speed})), th: 50}))
    console.log('cadet', preset, speed, r.winner, r.t, r.pushedOut, r.hitSide)
  }
  // Pilot: all action combos
  const acts: RuleAction[] = ['backturn','charge','spin','creep','forward','stop']
  let pw: string[] = []
  for (const order of [['see','line'],['line','see']] as const) for (const a1 of acts) for (const a2 of acts) for (const a3 of acts) for (const sp of [60,100]) {
    const rules = [{cond: order[0], action: a1}, {cond: order[1], action: a2}, {cond: 'always' as const, action: a3}]
    const r = run(1, d, 0, () => ({ctrl: ruleController({rules, speed: sp}), th: 50}))
    if (r.winner === 'you') pw.push(`${order.join('>')} ${a1}/${a2}/${a3} @${sp} t=${r.t} pushed=${r.pushedOut}`)
  }
  console.log('pilot wins', pw.length); console.log(pw.slice(0,60).join('\n'))
  // Ace / Legend cheese: wait + charge100
  const cheese: Record<string, FsmProgram> = {
    waitCharge: { ...DEFAULT_ACE, search: { mode: 'wait', dir: 1, speed: 0 }, seeCm: 80, charge: { speed: 100 }, lostMs: 1500, pushThroughEdge: true },
    spinCharge: { ...DEFAULT_ACE, search: { mode: 'spin', dir: 1, speed: 100 }, seeCm: 80, charge: { speed: 100 }, lostMs: 1500, pushThroughEdge: true, recover: { backMs: 400, turnMs: 400, speed: 100, dir: 1 } },
    spinChargeL: { ...DEFAULT_ACE, search: { mode: 'spin', dir: -1, speed: 100 }, seeCm: 80, charge: { speed: 100 }, lostMs: 1500, pushThroughEdge: true, recover: { backMs: 400, turnMs: 400, speed: 100, dir: 1 } },
    noEdge: { ...DEFAULT_ACE, search: { mode: 'spin', dir: 1, speed: 100 }, seeCm: 80, charge: { speed: 100 }, lostMs: 1500, edgeThreshold: 100, pushThroughEdge: true },
    def: DEFAULT_ACE,
  }
  for (const [k, p] of Object.entries(cheese)) {
    const r = run(2, d, 0, () => ({ctrl: fsmController(p), th: p.edgeThreshold}))
    console.log('ace', k, r.winner, r.t, r.hitSide)
  }
  // Legend series with designs
  const legendSeries = (p: FsmProgram, des: RobotDesign, ballast: number) => {
    const hist: {tactic: SenseiTactic, memory: any}[] = []; const out: string[] = []
    let yw=0, rw=0
    while (yw<2 && rw<2 && hist.length<5) {
      const tactic = senseiTactic(hist)
      const r = run(3, des, ballast, () => ({ctrl: fsmController(p), th: p.edgeThreshold}), hist.length, tactic)
      hist.push({tactic, memory: roundMemory(r)}); out.push(`${tactic}:${r.winner}@${r.t}`)
      if (r.winner==='you') yw++; else if (r.winner==='rival') rw++
    }
    return `${yw}-${rw} ${out.join(' ')}`
  }
  let legWins: string[] = []
  for (const drive of ['wheels2','wheels4','tracks','legs'] as const) for (const wedge of [false,true]) for (const ballast of [0,0.4,0.8]) {
    const des = { ...d, drive, tool: wedge ? 'scoop' as const : 'none' as const }
    const st = botStats(des, ballast); if (st.massKg > 2.5) continue
    for (const [k,p] of Object.entries(cheese)) {
      const s = legendSeries(p, des, ballast)
      if (s.startsWith('2-')) legWins.push(`${drive} wedge=${wedge} b=${ballast} ${k}: ${s}`)
    }
  }
  console.log('legend wins:'); console.log(legWins.join('\n'))
  console.log('unchanged default design, cheese:'); for (const [k,p] of Object.entries(cheese)) console.log(k, legendSeries(p, d, 0))
}
main()
