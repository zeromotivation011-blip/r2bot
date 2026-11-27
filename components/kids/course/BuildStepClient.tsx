'use client'

// components/kids/course/BuildStepClient.tsx
// Beat 2 of a session: Build. The part the session adds (or the body the child
// chooses, or the tool they pick for a project), what it does, the "try it
// without" moment, and one tap to snap it onto the child's own robot
// (saveDesign — the same robot the Workshop, Hangar and challenges use).

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import type { BuildStep } from '@/lib/kids/curriculum/types'
import { getPart, partsForSlot, ROBOT_COLORS, type RobotDesign, type RobotPart, type Slot } from '@/lib/kids/robot-design'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'

function BayPoster({ colour }: { colour: string }) {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#19263F_0%,#0A1120_70%)]" aria-hidden>
      <div className="absolute bottom-[12%] left-1/2 h-[16%] w-[62%] -translate-x-1/2 rounded-[50%] border-2 border-amber-500/70 shadow-[0_0_40px_rgba(252,104,24,.25)]" />
      <svg viewBox="0 0 120 120" className="absolute bottom-[17%] left-1/2 h-[46%] -translate-x-1/2 opacity-80">
        <rect x="34" y="20" width="52" height="30" rx="10" fill="#E2E8F0" />
        <circle cx="49" cy="35" r="6" fill="#0A1120" />
        <circle cx="71" cy="35" r="6" fill="#0A1120" />
        <rect x="26" y="54" width="68" height="42" rx="12" fill={colour} />
        <circle cx="32" cy="100" r="12" fill="#1F2937" />
        <circle cx="88" cy="100" r="12" fill="#1F2937" />
      </svg>
    </div>
  )
}

const Bay = dynamic(() => import('./BuildBayClient'), { ssr: false })

interface Props {
  build: BuildStep
  sessionNumber: number
  design: RobotDesign
  built: boolean
  /** Save the fitted robot (and report the build once). */
  onApply: (design: RobotDesign) => void
  onNext: () => void
}

function cleanName(s: string): string {
  return s.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 20)
}

export default function BuildStepClient({ build, sessionNumber, design, built, onApply, onNext }: Props) {
  const slot = build.part.slot as Slot
  const choice = build.action === 'choose' || build.part.id === 'child-choice'
  const options: RobotPart[] = useMemo(
    () => (choice ? partsForSlot(slot).filter((p) => !(slot === 'tool' && p.id === 'none')) : []),
    [choice, slot],
  )
  const fixedPart = !choice ? getPart(slot, build.part.id) : undefined
  const [picked, setPicked] = useState<string>(() => (choice ? (design[slot] === 'none' && options[0] ? options[0].id : design[slot]) : build.part.id))
  const part = choice ? getPart(slot, picked) : fixedPart
  const [view, setView] = useState<'with' | 'without'>('with')
  const [snap, setSnap] = useState<{ slot: Slot; n: number } | null>(null)
  const [bayOk, setBayOk] = useState(true)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState(design.name)
  const [colour, setColour] = useState(design.primary)
  const firstSession = build.action === 'choose' && slot === 'body'
  const inspectBody = build.action === 'inspect' && slot === 'body'

  useEffect(() => () => cancelSparkSpeech(), [])

  // What the robot looks like with the part on (a preview until the child taps the button).
  const preview: RobotDesign = useMemo(() => {
    if (inspectBody) return design
    const d = { ...design, primary: firstSession ? colour : design.primary }
    if (part) (d as Record<Slot, string>)[slot] = part.id
    return d
  }, [design, part, slot, inspectBody, firstSession, colour])

  const already = !inspectBody && !!part && design[slot] === part.id && !firstSession

  const apply = () => {
    const next: RobotDesign = { ...preview, name: firstSession ? cleanName(name) || design.name : design.name }
    onApply(next)
    setSnap({ slot, n: Date.now() })
    playSound('unlock')
    sparkSays(build.action === 'inspect' ? build.why : `${part?.name ?? 'Part'} fitted! ${build.why}`)
  }

  const verb = build.action === 'choose' ? 'This one!' : build.action === 'inspect' ? 'Look closely' : build.action === 'swap' ? 'Swap it in' : 'Snap it on!'

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      {/* The robot */}
      <div className="flex flex-col gap-2 lg:sticky lg:top-20">
        <div className="relative h-[42vh] min-h-[260px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0A1120] lg:h-[460px]">
          <BayPoster colour={preview.primary} />
          {bayOk && (
            <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
              <Bay design={preview} snap={snap} onReady={() => setReady(true)} onFail={() => setBayOk(false)} label={`${design.name}, your robot, in 3D. Drag to turn it.`} />
            </div>
          )}
          <p className="pointer-events-none absolute left-3 top-3 rounded-xl bg-black/50 px-3 py-1.5 text-xs font-black text-[#EEF2F8] backdrop-blur">
            {firstSession ? cleanName(name) || design.name : design.name}
          </p>
          {ready && <p className="pointer-events-none absolute bottom-3 right-3 rounded-xl bg-black/50 px-3 py-1.5 text-xs font-bold text-[#A7B0C0] backdrop-blur">Drag to turn</p>}
        </div>
      </div>

      {/* The part */}
      <div className="flex flex-col gap-3">
        <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">
            {build.action === 'choose' ? 'Choose' : build.action === 'inspect' ? 'Look closely' : build.action === 'swap' ? 'Swap' : 'New part'} · session {sessionNumber}
          </p>
          <div className="mt-1 flex items-start gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-4xl ring-1 ring-amber-400/40" aria-hidden>
              {part?.emoji ?? '🔧'}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold leading-tight text-[#EEF2F8]">{choice ? (slot === 'body' ? 'Pick a body' : 'Pick a tool') : part?.name}</h2>
              <p className="mt-1 text-[16px] leading-snug text-[#A7B0C0]">{build.narration}</p>
            </div>
            <button
              type="button"
              onClick={() => sparkSays(`${build.narration} ${build.why}`)}
              aria-label="Read it aloud"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#EEF2F8]" aria-hidden>
                <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                <path d="M16 8.5a4.5 4.5 0 010 7M18.5 6a8 8 0 010 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {choice && (
            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={slot === 'body' ? 'Bodies' : 'Tools'}>
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === o.id}
                  onClick={() => {
                    setPicked(o.id)
                    playSound('click')
                    sparkSays(`${o.name}. ${o.what}`)
                  }}
                  className={`flex min-h-[64px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-transform active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                    picked === o.id ? 'border-amber-300 bg-amber-400/20' : 'border-white/15 bg-[#19263F] hover:border-white/30'
                  }`}
                >
                  <span className="text-3xl" aria-hidden>
                    {o.emoji}
                  </span>
                  <span className="text-[15px] font-black leading-tight text-[#EEF2F8]">{o.name}</span>
                </button>
              ))}
            </div>
          )}

          {firstSession && (
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-sm font-black text-[#EEF2F8]" htmlFor="robot-name">
                Give your robot a name
              </label>
              <input
                id="robot-name"
                value={name}
                onChange={(e) => setName(cleanName(e.target.value))}
                maxLength={20}
                autoComplete="off"
                className="min-h-[48px] rounded-2xl border border-white/15 bg-[#0A1120] px-4 text-lg font-bold text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              />
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Paint">
                {ROBOT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={colour === c}
                    aria-label={`Paint ${c}`}
                    onClick={() => setColour(c)}
                    className={`h-11 w-11 rounded-full border-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${colour === c ? 'border-white ring-2 ring-amber-400' : 'border-white/20'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {part && (
          <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
            <div className="flex gap-1 rounded-2xl bg-white/[0.05] p-1" role="tablist" aria-label="With or without the part">
              {(
                [
                  ['with', `✅ With ${choice ? 'it' : 'the part'}`],
                  ['without', '🚫 Try it without'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => {
                    setView(v)
                    sparkSays(v === 'with' ? part.withIt : build.tryWithout)
                  }}
                  className={`min-h-[48px] flex-1 rounded-xl px-2 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${view === v ? (v === 'with' ? 'bg-emerald-400 text-[#06210F]' : 'bg-amber-500 text-[#1A1103]') : 'text-[#EEF2F8] hover:bg-white/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="mt-3 text-[16px] leading-relaxed">
              {view === 'with' ? (
                <>
                  <p className="text-[#EEF2F8]">{part.what}</p>
                  <p className="mt-2 font-semibold text-emerald-200">{part.withIt}</p>
                  {!choice && <p className="mt-2 text-[#A7B0C0]">{build.why}</p>}
                </>
              ) : (
                <>
                  <p className="font-semibold text-amber-200 motion-safe:animate-[course-shake_.4s_ease-in-out_1]">{build.tryWithout}</p>
                  <p className="mt-2 text-[#A7B0C0]">{part.withoutIt}</p>
                </>
              )}
            </div>
            <p className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-[14px] text-[#A7B0C0]">
              🌍 <span className="font-semibold text-[#EEF2F8]">Real robots:</span> {build.realWorld}
            </p>
            <details className="mt-2 text-[14px] text-[#A7B0C0]">
              <summary className="-mx-1 cursor-pointer rounded-lg px-1 py-2 font-bold text-cyan-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">Engineer’s note: what changes in the simulator</summary>
              <p className="pt-1">{build.physicsEffect}</p>
            </details>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!built || choice || firstSession ? (
            <button
              type="button"
              onClick={apply}
              data-testid="build-apply"
              className="min-h-[56px] flex-1 rounded-2xl bg-amber-500 px-6 font-display text-xl font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] transition-transform hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {already ? `✓ Already fitted — show me` : `🔧 ${verb}`}
            </button>
          ) : (
            <p className="flex-1 rounded-2xl bg-emerald-400/10 px-4 py-3 font-semibold text-emerald-200">✓ {part?.name ?? 'Part'} is on {design.name}.</p>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!built}
            data-testid="beat-next"
            className="min-h-[56px] rounded-2xl bg-white/[0.08] px-6 font-display text-lg font-bold text-[#EEF2F8] hover:bg-white/15 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Next: Code →
          </button>
        </div>
      </div>
    </div>
  )
}
