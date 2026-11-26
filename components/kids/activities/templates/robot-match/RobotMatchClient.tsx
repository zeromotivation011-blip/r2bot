'use client'

// components/kids/activities/templates/robot-match/RobotMatchClient.tsx
// Tap a robot card, then tap the job it was built for (or "Not needed here").
// Each robot card shows its design clues; when names are hidden it is a
// mystery card until the match is checked. Matched pairs are colour-linked.
// After checking, wrong cards wobble and stay editable; when everything is
// right, every card flips to show its real name and fact.

import { useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import type { Answer, Params } from './logic'
import { FeedbackPanel, TemplateCard, btnPrimary, useAttempts } from '../gear-train/TemplateFrameClient'
import { IconBox } from '../spot-in-scene/glyphs'

const LINK = ['#FC6818', '#00B8D4', '#22C55E', '#FFD166', '#F472B6', '#60A5FA']
const NONE = '__none'

export default function RobotMatchClient({ params: p, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const [matches, setMatches] = useState<Record<string, string | null>>({})
  const [sel, setSel] = useState<string | null>(p.robots[0]?.id ?? null)
  const [checked, setChecked] = useState(false)
  const solved = !!att.result?.correct
  const hasDecoy = p.robots.some((r) => r.job === null)
  const jobColour = (id: string | null) => (id === null ? '#6E7888' : LINK[p.jobs.findIndex((j) => j.id === id) % LINK.length])
  const allSet = p.robots.every((r) => r.id in matches)
  // The facts (and real names) are the payoff: show them when solved AND when
  // the child finishes without solving, so nobody leaves without them.
  const revealAll = solved || att.done
  const young = band === 'explorers'

  const pickRobot = (id: string) => {
    if (solved || att.done) return
    playSound('click')
    setSel((s) => (s === id ? null : id))
  }
  const pickJob = (jobId: string | null) => {
    if (!sel || solved || att.done) return
    if (att.result) att.clear()
    playSound('click')
    setChecked(false)
    setMatches((m) => ({ ...m, [sel]: jobId }))
    // Move on to the next unmatched robot — fewer taps for small hands.
    const next = p.robots.find((r) => r.id !== sel && !(r.id in matches))
    setSel(next?.id ?? null)
  }

  const submit = () => {
    playSound('click')
    setChecked(true)
    att.submit({ matches })
  }

  const jobTargets: { id: string | null; label: string; icon: string }[] = [...p.jobs, ...(hasDecoy ? [{ id: null, label: 'Not needed here', icon: '🚫' }] : [])]

  return (
    <TemplateCard label="Robot match">
      <p className="font-display text-lg font-bold text-[#EEF2F8]">{p.task}</p>
      <p className="mt-1 text-[15px] text-[#A7B0C0]">Tap a robot, then tap where it belongs.</p>
      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Robots: choose one, then choose its job">
          {p.robots.map((r) => {
            const m = r.id in matches ? matches[r.id] : undefined
            const reveal = revealAll || !p.hideNames
            const wrong = checked && !!att.result && !att.result.correct && m !== r.job
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={sel === r.id}
                onClick={() => pickRobot(r.id)}
                className={`relative flex min-h-[48px] flex-col rounded-2xl border-2 p-3 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.98] ${
                  sel === r.id ? 'border-amber-400 bg-amber-500/15 motion-safe:-translate-y-0.5' : 'border-white/10 bg-[#19263F]'
                } ${wrong ? 'motion-safe:animate-[pulse_.8s_ease-in-out_2]' : ''}`}
                style={m !== undefined && sel !== r.id ? { borderColor: jobColour(m) } : undefined}
              >
                <span className="flex items-center gap-2">
                  <span className={reveal ? '' : 'blur-[1px] grayscale'}>
                    <IconBox icon={reveal ? r.icon : '❔'} px={34} />
                  </span>
                  <span className="font-display text-[16px] font-bold leading-tight text-[#EEF2F8]">{reveal ? r.name : `Mystery robot ${p.robots.indexOf(r) + 1}`}</span>
                </span>
                <ul className={`mt-1.5 list-disc pl-5 leading-snug text-[#A7B0C0] ${young ? 'text-[16px]' : 'text-[14px]'}`}>
                  {r.clues.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                {m !== undefined && (
                  <span className="mt-2 inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[13px] font-bold text-[#0A1120]" style={{ background: jobColour(m) }}>
                    → {jobTargets.find((j) => j.id === m)?.label}
                  </span>
                )}
                {revealAll && (
                  <span className="mt-2 rounded-xl bg-[#22C55E]/10 p-2 text-[14px] leading-snug text-[#EEF2F8] motion-safe:animate-[fadeUp_.35s_ease-out]">
                    {!solved && (
                      <b className="block text-[#22C55E]">Belongs: {r.job === null ? 'not needed here' : p.jobs.find((j) => j.id === r.job)?.label}</b>
                    )}
                    💡 {r.fact}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2" role="group" aria-label="Jobs">
          {jobTargets.map((j) => {
            const here = p.robots.filter((r) => r.id in matches && matches[r.id] === j.id)
            return (
              <button
                key={j.id ?? NONE}
                type="button"
                onClick={() => pickJob(j.id)}
                disabled={!sel || solved || att.done}
                aria-label={`${j.label}${sel ? ' — match the selected robot here' : ''}`}
                className={`flex min-h-[56px] items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 enabled:active:scale-[.98] ${
                  sel ? 'border-dashed' : ''
                } disabled:cursor-default`}
                style={{ borderColor: `${jobColour(j.id)}${sel ? 'DD' : '66'}`, background: `${jobColour(j.id)}14` }}
              >
                <span className="text-2xl" aria-hidden>
                  {j.icon}
                </span>
                <span className="flex-1 font-display text-[15px] font-bold leading-tight text-[#EEF2F8]">{j.label}</span>
                <span className="flex gap-0.5" aria-hidden>
                  {here.map((r) => (
                    <IconBox key={r.id} icon={revealAll || !p.hideNames ? r.icon : '❔'} px={22} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={submit} disabled={!allSet}>
            {allSet ? 'Check my matches' : `${p.robots.filter((r) => !(r.id in matches)).length} robot${p.robots.filter((r) => !(r.id in matches)).length === 1 ? '' : 's'} to place`}
          </button>
        </div>
      )}
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}
