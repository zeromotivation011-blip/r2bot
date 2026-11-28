'use client'

// components/kids/activities/registry.ts
// TemplateId -> the playable template, each loaded with next/dynamic so a page
// downloads ONLY the template its activity uses. The loaded component is bound
// to that template's own check(), so the player never imports every logic.
//
//   const Play = PLAYABLE[activity.template]
//   <Play params={activity.params} band={band} onChecked={…} onDone={…} />

import dynamic from 'next/dynamic'
import { createElement, useCallback, type ComponentType } from 'react'
import type { BandId } from '@/lib/kids/bands'
import type { CheckResult, TemplateDef, TemplateId } from '@/lib/kids/activities/types'

export interface PlayableProps {
  params: unknown
  band: BandId
  /** Every graded submission, after the template's check() ran. */
  onChecked: (result: CheckResult) => void
  onDone: (result: { correct: boolean; attempts: number; score: number }) => void
}

/** Wrap a template so the answer is checked by its own logic, inside its own chunk. */
function bind<P, A>(def: TemplateDef<P, A>): ComponentType<PlayableProps> {
  function Bound({ params, band, onChecked, onDone }: PlayableProps) {
    // Params come with an activity of this template (verified by verify.ts).
    const p = params as P
    const onSubmit = useCallback(
      (answer: A): CheckResult => {
        const r = def.check(p, answer)
        onChecked(r)
        return r
      },
      [p, onChecked],
    )
    return createElement(def.Component, { params: p, band, onSubmit, onDone })
  }
  Bound.displayName = `Playable(${def.id})`
  return Bound
}

function TemplateSkeleton() {
  return createElement(
    'div',
    { className: 'flex min-h-[420px] w-full items-center justify-center rounded-[20px] border border-white/[0.08] bg-[#111C32]', role: 'status', 'aria-label': 'Loading the activity' },
    createElement('div', { className: 'h-3 w-40 rounded-full bg-white/10 motion-safe:animate-pulse' }),
  )
}


export const PLAYABLE: Record<TemplateId, ComponentType<PlayableProps>> = {
  'binary-encoder': dynamic(() => import('./templates/binary-encoder').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'centre-of-mass': dynamic(() => import('./templates/centre-of-mass').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'circuit-snap': dynamic(() => import('./templates/circuit-snap').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'classify-sort': dynamic(() => import('./templates/classify-sort').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'control-tuner': dynamic(() => import('./templates/control-tuner').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'debug-program': dynamic(() => import('./templates/debug-program').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'estimate': dynamic(() => import('./templates/estimate').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'ethics-dilemma': dynamic(() => import('./templates/ethics-dilemma').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'flowchart-builder': dynamic(() => import('./templates/flowchart-builder').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'gear-train': dynamic(() => import('./templates/gear-train').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'lever-balance': dynamic(() => import('./templates/lever-balance').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'logic-gates': dynamic(() => import('./templates/logic-gates').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'motor-math': dynamic(() => import('./templates/motor-math').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'number-box': dynamic(() => import('./templates/number-box').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'ohms-law': dynamic(() => import('./templates/ohms-law').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'path-planner': dynamic(() => import('./templates/path-planner').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'predict-output': dynamic(() => import('./templates/predict-output').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'robot-designer': dynamic(() => import('./templates/robot-designer').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'robot-match': dynamic(() => import('./templates/robot-match').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'sensor-choice': dynamic(() => import('./templates/sensor-choice').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'sequence-path': dynamic(() => import('./templates/sequence-path').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'signal-graph': dynamic(() => import('./templates/signal-graph').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'simple-machines': dynamic(() => import('./templates/simple-machines').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'spot-in-scene': dynamic(() => import('./templates/spot-in-scene').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'threshold-tuner': dynamic(() => import('./templates/threshold-tuner').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'train-mini': dynamic(() => import('./templates/train-mini').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
  'wheel-terrain': dynamic(() => import('./templates/wheel-terrain').then((m) => bind(m.template)), { ssr: false, loading: TemplateSkeleton }),
}

/** The full TemplateDef (logic + component), loaded on demand. */
export const TEMPLATE_LOADERS: Record<TemplateId, () => Promise<TemplateDef<unknown, unknown>>> = {
  'binary-encoder': () => import('./templates/binary-encoder').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'centre-of-mass': () => import('./templates/centre-of-mass').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'circuit-snap': () => import('./templates/circuit-snap').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'classify-sort': () => import('./templates/classify-sort').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'control-tuner': () => import('./templates/control-tuner').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'debug-program': () => import('./templates/debug-program').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'estimate': () => import('./templates/estimate').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'ethics-dilemma': () => import('./templates/ethics-dilemma').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'flowchart-builder': () => import('./templates/flowchart-builder').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'gear-train': () => import('./templates/gear-train').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'lever-balance': () => import('./templates/lever-balance').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'logic-gates': () => import('./templates/logic-gates').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'motor-math': () => import('./templates/motor-math').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'number-box': () => import('./templates/number-box').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'ohms-law': () => import('./templates/ohms-law').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'path-planner': () => import('./templates/path-planner').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'predict-output': () => import('./templates/predict-output').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'robot-designer': () => import('./templates/robot-designer').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'robot-match': () => import('./templates/robot-match').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'sensor-choice': () => import('./templates/sensor-choice').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'sequence-path': () => import('./templates/sequence-path').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'signal-graph': () => import('./templates/signal-graph').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'simple-machines': () => import('./templates/simple-machines').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'spot-in-scene': () => import('./templates/spot-in-scene').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'threshold-tuner': () => import('./templates/threshold-tuner').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'train-mini': () => import('./templates/train-mini').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
  'wheel-terrain': () => import('./templates/wheel-terrain').then((m) => m.template as unknown as TemplateDef<unknown, unknown>),
}
