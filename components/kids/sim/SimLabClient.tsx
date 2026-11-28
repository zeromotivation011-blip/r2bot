'use client'

// components/kids/sim/SimLabClient.tsx
// The light half of the physics lab: picks the challenge and the robot's parts.
// It imports no three.js, Rapier or Blockly; the workbench that does is
// next/dynamic({ ssr: false }) behind a skeleton with the same size, so the
// page lays out once and never shifts.

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { capabilitiesOf, DEFAULT_DESIGN, getPart, getUpgrade, loadDesign, partsForSlot, saveDesign, upgradesOf, UPGRADE_DEFAULT, type RobotDesign, type Slot } from '@/lib/kids/robot-design'
import { SLOT_LABEL } from '@/lib/kids/code-lab/labels'
import { DEMOS, designFor, type Demo } from '@/lib/kids/sim/demos'
import { missingParts, type Program } from '@/lib/kids/sim/program'
import { hasPhysicsUpgrades } from '@/lib/kids/sim/robot-spec'
import { labSolved } from '@/lib/kids/sim/lab-links'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'

/** Same boxes, same order and same sizes as SimWorkbenchClient, so nothing shifts when it arrives. */
function WorkbenchSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]" aria-busy="true">
      <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
        <div className="flex h-[42vh] min-h-[280px] items-center justify-center rounded-3xl border border-white/10 bg-[#111C32] sm:h-[52vh] sm:min-h-[320px] lg:h-[540px]">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
          <span className="sr-only">Loading the robot simulator…</span>
        </div>
        <div className="h-[48px] rounded-2xl bg-white/5" />
      </div>
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="h-[44px]" />
        <div className="h-[460px] animate-pulse rounded-3xl border border-white/10 bg-[#111C32] lg:h-[540px]" />
      </div>
      <div className="lg:col-start-1 lg:row-start-2">
        <div className="h-[44px] rounded-2xl bg-white/5 lg:hidden" />
        <div className="hidden h-[132px] rounded-2xl bg-white/5 lg:block" />
      </div>
    </div>
  )
}

const SimWorkbench = dynamic(() => import('./SimWorkbenchClient'), { ssr: false, loading: WorkbenchSkeleton })

/** What the editor shows when a challenge opens: a first block to start from, never the answer. */
const STARTERS: Record<string, Program> = {
  'first-drive': { body: [{ op: 'drive_for', id: 'start-1', speedPct: { k: 'number', v: 50 }, seconds: { k: 'number', v: 2 } }] },
  'sand-trap': { body: [{ op: 'drive_distance', id: 'start-1', cm: { k: 'number', v: 50 }, speedPct: { k: 'number', v: 80 } }] },
  'stop-before-wall': { body: [] },
  'follow-line': { body: [] },
  'faded-line': { body: [{ op: 'drive_distance', id: 'start-1', cm: { k: 'number', v: 50 }, speedPct: { k: 'number', v: 30 } }] },
  // A careful creep at 8 %: run it and watch the wheels not turn (the dead zone).
  'dead-zone': {
    body: [
      { op: 'set_motors', id: 'start-1', leftPct: { k: 'number', v: 8 }, rightPct: { k: 'number', v: 8 } },
      { op: 'wait', id: 'start-2', seconds: { k: 'number', v: 3 } },
      { op: 'stop', id: 'start-3' },
    ],
  },
  'core-store-ramp': { body: [{ op: 'grip_close', id: 'start-1' }] },
  'curve-dock': {
    body: [
      { op: 'set_motors', id: 'start-1', leftPct: { k: 'number', v: 50 }, rightPct: { k: 'number', v: 50 } },
      { op: 'wait', id: 'start-2', seconds: { k: 'number', v: 2 } },
      { op: 'stop', id: 'start-3' },
    ],
  },
  'lighthouse-route': { body: [] },
}

/** Upgrades that change the physics here (roadmap #33), in words: "Torque Motors · Big Power Pack". */
function upgradeWords(d: RobotDesign): string {
  const up = upgradesOf(d)
  const names: string[] = []
  for (const slot of ['motor', 'power', 'arm', 'sensor2'] as const) {
    if (up[slot] !== UPGRADE_DEFAULT[slot]) names.push(getUpgrade(slot, up[slot])?.name ?? up[slot])
  }
  return names.join(' · ')
}

const SWITCH_SLOTS: Slot[] = ['drive', 'head', 'sensor']

/** The parts a challenge needs that this robot does not have yet, in words. */
function suggestion(design: RobotDesign, demo: Demo): string | null {
  const names: string[] = []
  for (const [slot, id] of Object.entries(demo.goodParts) as [Slot, string][]) {
    if (design[slot] !== id) names.push(getPart(slot, id)?.name ?? id)
  }
  return names.length > 0 ? names.join(' + ') : null
}

export default function SimLabClient() {
  const [demo, setDemo] = useState<Demo>(DEMOS[0])
  /** The child's own robot from the Workshop. null until read (it lives in this browser's storage). */
  const [mine, setMine] = useState<RobotDesign | null>(null)
  /** What the child fitted in each challenge (kept when they switch tabs and come back). */
  const [fitted, setFitted] = useState<Record<string, RobotDesign>>({})
  const [saved, setSaved] = useState(false)
  /** Arenas this child has solved (the lab's result store, lab-results.ts). */
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    const read = () => {
      const pb = getProgress().personalBests
      setSolvedIds(new Set(DEMOS.filter((d) => labSolved(pb, d.id)).map((d) => d.id)))
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    return () => window.removeEventListener(KIDS_PROGRESS_EVENT, read)
  }, [])

  // Read the saved robot once, BEFORE the simulator mounts, so the 3D scene and the physics are built once.
  // ?demo=<id> opens that arena (a course session links straight to its challenge).
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('demo')
    const d = want ? DEMOS.find((x) => x.id === want) : undefined
    if (d) setDemo(d)
    setMine(loadDesign())
  }, [])

  // Every challenge starts with the child's own robot; parts they swap here are remembered per challenge.
  const design: RobotDesign = fitted[demo.id] ?? mine ?? DEFAULT_DESIGN
  const setDesign = (d: RobotDesign) => {
    setFitted((f) => ({ ...f, [demo.id]: d }))
    setSaved(false)
  }
  const saveToMyRobot = () => {
    saveDesign(design)
    setMine(design)
    setSaved(true)
  }

  const caps = useMemo(() => capabilitiesOf(design), [design])
  const locked = useMemo(() => missingParts(demo.reference, design), [demo, design])
  const starter = STARTERS[demo.id] ?? { body: [] }
  const tip = suggestion(design, demo)
  const usingWrong = Object.entries(demo.wrongParts).every(([k, v]) => design[k as keyof RobotDesign] === v)
  const differsFromMine = mine !== null && SWITCH_SLOTS.some((slot) => design[slot] !== mine[slot])

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      {/* Challenges */}
      <nav aria-label="Challenges" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {DEMOS.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDemo(d)}
            aria-pressed={demo.id === d.id}
            data-testid={`demo-${d.id}`}
            className={`min-h-[56px] shrink-0 rounded-2xl border px-4 py-2 text-left ${
              demo.id === d.id ? 'border-amber-300 bg-amber-300/15 text-white' : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10'
            }`}
          >
            <span className="block text-sm font-black">
              {i + 1}. {d.title}
              {solvedIds.has(d.id) && (
                <span className="ml-1 text-emerald-300" aria-label="solved">
                  ✓
                </span>
              )}
            </span>
            <span className="block text-xs text-slate-300">{d.ageHint}</span>
          </button>
        ))}
      </nav>

      {/* Phone order: the task, then the robot and the editor, then the parts. Desktop: task + parts above the simulator. */}
      <div className="mt-3 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="order-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:order-none">
          <p className="text-lg font-black text-white">🎯 {demo.task}</p>
          <p className="mt-1 hidden text-sm text-slate-200 sm:block">
            <strong className="text-amber-200">Why parts matter:</strong> {demo.lesson}
          </p>
          {tip && (
            <p className="mt-2 rounded-xl bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100" role="note" data-testid="part-tip">
              💡 Tip: this challenge was made for <strong>{tip}</strong>. Try it with {design.name} first — then fit {tip.includes('+') ? 'them' : 'it'} and see what changes.
            </p>
          )}
          {locked.length > 0 && (
            <p className="mt-2 rounded-xl bg-rose-400/15 px-3 py-2 text-sm font-bold text-rose-100" role="note">
              🔒 {locked[0].message}
            </p>
          )}
        </div>

        {/* Part switcher: swap a part and run again to SEE the difference. */}
        <div className="order-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 lg:order-none" aria-label="Swap parts">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-white">🔧 {design.name}&rsquo;s parts</p>
            <button
              type="button"
              onClick={() => setDesign(designFor(design, usingWrong || tip ? demo.goodParts : demo.wrongParts))}
              data-testid="swap-wrong"
              className="min-h-[44px] rounded-xl border border-white/20 px-3 text-xs font-black text-slate-200 hover:bg-white/10"
            >
              {usingWrong || tip ? '✅ Fit the suggested part' : '🤔 Try a different part'}
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {SWITCH_SLOTS.map((slot) => (
              <div key={slot} className="flex flex-wrap items-center gap-1" role="group" aria-label={SLOT_LABEL[slot]}>
                <span className="w-24 text-xs font-bold text-slate-300">{SLOT_LABEL[slot]}</span>
                {partsForSlot(slot).map((p) => {
                  const on = design[slot] === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.name}
                      aria-label={p.name}
                      aria-pressed={on}
                      data-testid={`part-${slot}-${p.id}`}
                      onClick={() => setDesign({ ...design, [slot]: p.id })}
                      className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-xl ${
                        on ? 'bg-amber-400 shadow' : 'bg-white/5 hover:bg-white/15'
                      }`}
                    >
                      <span aria-hidden>{p.emoji}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-300" aria-live="polite">
            {getPart('drive', design.drive)?.name} · {getPart('head', design.head)?.name}
            {design.sensor !== 'none' ? ` · ${getPart('sensor', design.sensor)?.name}` : ''}
            {caps.has('rough-ground') ? ' · grips rough ground' : ''}
          </p>
          {hasPhysicsUpgrades(design) && (
            <p className="mt-1 text-xs font-bold text-cyan-200" data-testid="upgrades-in-physics">
              ⚙️ Upgrades in the physics: {upgradeWords(design)}
            </p>
          )}
          {(differsFromMine || saved) && (
            <button
              type="button"
              onClick={saveToMyRobot}
              disabled={saved}
              data-testid="save-robot"
              className="mt-2 min-h-[44px] w-full rounded-xl bg-white/10 px-3 text-xs font-black text-white hover:bg-white/20 disabled:opacity-70"
            >
              {saved ? `✓ Saved — this is ${design.name} now` : `💾 Keep these parts on ${design.name}`}
            </button>
          )}
        </div>

        <div className="order-2 lg:order-none lg:col-span-2">
          {/* Wait for the saved robot so the simulator builds the right one, once. */}
          {mine ? <SimWorkbench demo={demo} design={design} starter={starter} /> : <WorkbenchSkeleton />}
        </div>
      </div>
    </div>
  )
}
