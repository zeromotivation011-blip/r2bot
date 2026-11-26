'use client'

// debug-program — watch a robot's program fail, find the bug, fix it with the fewest changes.

import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { editDistance } from '../sequence-path/engine'
import { GridMission } from '../sequence-path/GridMissionClient'
import { Btn } from '../sequence-path/KitClient'
import { type Answer, type Params, paletteFor } from './logic'

export default function DebugProgramClient({ params, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  return (
    <GridMission<Params>
      worlds={[params.world, ...(params.extraWorlds ?? [])]}
      theme={params.theme ?? 'warehouse'}
      palette={paletteFor(params)}
      maxDepth={params.maxDepth}
      python={params.python ?? 'off'}
      initialProgram={params.buggy}
      onSubmit={onSubmit}
      onDone={onDone}
      runLabel="Run my fix"
      preview={{ label: '🐞 Watch the bug', program: params.buggy }}
      editorHeader={(program) => {
        const edits = editDistance(params.buggy, program)
        const over = edits > params.maxEdits
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
              <span aria-hidden className="text-[22px] leading-none">🐞</span>
              <div>
                <p className="font-display text-[15px] font-bold text-red-200">Bug report</p>
                <p className="text-[15px] leading-snug text-[#EEF2F8]">{params.bugReport ?? 'This program does not get the robot to its goal. Watch it run, then fix it.'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#A7B0C0]" aria-live="polite">
              <span>Changes made:</span>
              <span className="flex gap-1" aria-label={`${edits} of ${params.maxEdits} changes`}>
                {Array.from({ length: Math.max(params.maxEdits, edits) }, (_, i) => (
                  <span
                    key={i}
                    className={`h-3.5 w-3.5 rounded-full border-2 ${i < edits ? (over ? 'border-red-400 bg-red-400' : 'border-amber-400 bg-amber-400') : 'border-white/25'}`}
                  />
                ))}
              </span>
              <span className={over ? 'text-red-300' : ''}>{edits} / {params.maxEdits}</span>
            </div>
          </div>
        )
      }}
      extraActions={(setProgram) => (
        <Btn tone="ghost" onClick={() => { playSound('click'); setProgram(params.buggy) }}>↺ Reset to original</Btn>
      )}
    />
  )
}
