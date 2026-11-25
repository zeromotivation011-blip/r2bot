'use client'

// components/kids/sim/SimLabClient.tsx
// The light half of the physics lab: picks the challenge and the robot's parts.
// It imports no three.js, Rapier or Blockly; the workbench that does is
// next/dynamic({ ssr: false }) behind a skeleton with the same size, so the
// page lays out once and never shifts.

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { capabilitiesOf, getPart, loadDesign, partsForSlot, DEFAULT_DESIGN, type RobotDesign, type Slot } from '@/lib/kids/robot-design'
import { SLOT_LABEL } from '@/lib/kids/code-lab/labels'
import { DEMOS, designFor, type Demo } from '@/lib/kids/sim/demos'
import { missingParts, type Program } from '@/lib/kids/sim/program'

function WorkbenchSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-busy="true">
      <div className="flex flex-col gap-3">
        <div className="flex h-[52vh] min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-[#120A2E] lg:h-[540px]">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
          <span className="sr-only">Loading the robot simulator…</span>
        </div>
        <div className="h-[48px] rounded-2xl bg-white/5" />
        <div className="h-[196px] rounded-2xl bg-white/5 sm:h-[132px]" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-[44px]" />
        <div className="h-[460px] animate-pulse rounded-3xl border border-white/10 bg-[#140C33] lg:h-[540px]" />
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
}

const SWITCH_SLOTS: Slot[] = ['drive', 'head', 'sensor']

export default function SimLabClient() {
  const [demo, setDemo] = useState<Demo>(DEMOS[0])
  const [base, setBase] = useState<RobotDesign>(DEFAULT_DESIGN)
  const [design, setDesign] = useState<RobotDesign>(() => designFor(DEFAULT_DESIGN, DEMOS[0].goodParts))

  // The child's own robot (colours, name, body) from the Workshop, if they built one.
  useEffect(() => {
    const mine = loadDesign()
    setBase(mine)
    setDesign(designFor(mine, DEMOS[0].goodParts))
  }, [])

  const pickDemo = (d: Demo) => {
    setDemo(d)
    setDesign(designFor(base, d.goodParts))
  }

  const caps = useMemo(() => capabilitiesOf(design), [design])
  const locked = useMemo(() => missingParts(demo.reference, design), [demo, design])
  const starter = STARTERS[demo.id] ?? { body: [] }
  const usingWrong = Object.entries(demo.wrongParts).every(([k, v]) => design[k as keyof RobotDesign] === v)

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      {/* Challenges */}
      <nav aria-label="Challenges" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {DEMOS.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => pickDemo(d)}
            aria-pressed={demo.id === d.id}
            data-testid={`demo-${d.id}`}
            className={`min-h-[56px] shrink-0 rounded-2xl border px-4 py-2 text-left ${
              demo.id === d.id ? 'border-amber-300 bg-amber-300/15 text-white' : 'border-white/10 bg-white/[0.03] text-purple-100 hover:bg-white/10'
            }`}
          >
            <span className="block text-sm font-black">
              {i + 1}. {d.title}
            </span>
            <span className="block text-xs text-purple-200">{d.ageHint}</span>
          </button>
        ))}
      </nav>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-lg font-black text-white">🎯 {demo.task}</p>
          <p className="mt-1 text-sm text-purple-100">
            <strong className="text-amber-200">Why parts matter:</strong> {demo.lesson}
          </p>
          {locked.length > 0 && (
            <p className="mt-2 rounded-xl bg-rose-400/15 px-3 py-2 text-sm font-bold text-rose-100" role="note">
              🔒 {locked[0].message}
            </p>
          )}
        </div>

        {/* Part switcher: swap a part and run again to SEE the difference. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3" aria-label="Swap parts">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-white">🔧 {design.name}&rsquo;s parts</p>
            <button
              type="button"
              onClick={() => setDesign(designFor(design, usingWrong ? demo.goodParts : demo.wrongParts))}
              data-testid="swap-wrong"
              className="min-h-[44px] rounded-xl border border-white/20 px-3 text-xs font-black text-purple-100 hover:bg-white/10"
            >
              {usingWrong ? '✅ Use the right part' : '🤔 Try a different part'}
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {SWITCH_SLOTS.map((slot) => (
              <div key={slot} className="flex flex-wrap items-center gap-1" role="group" aria-label={SLOT_LABEL[slot]}>
                <span className="w-24 text-xs font-bold text-purple-200">{SLOT_LABEL[slot]}</span>
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
          <p className="mt-2 text-xs text-purple-200" aria-live="polite">
            {getPart('drive', design.drive)?.name} · {getPart('head', design.head)?.name}
            {design.sensor !== 'none' ? ` · ${getPart('sensor', design.sensor)?.name}` : ''}
            {caps.has('rough-ground') ? ' · grips rough ground' : ''}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <SimWorkbench demo={demo} design={design} starter={starter} />
      </div>
    </div>
  )
}
