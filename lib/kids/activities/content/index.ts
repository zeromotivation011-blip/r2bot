// lib/kids/activities/content/index.ts
// THE list of Skill Galaxy activities: every track file in this folder plus,
// as a starter set, the reference samples shipped with each template.
//
// ── Authoring guide (short version; the full one is in docs) ────────────────
// 1. Open content/<track>.ts and add an object to the array:
//
//      import type { KidsActivity } from '../logic-registry'
//      export const mechanics: KidsActivity[] = [
//        {
//          id: 'mech-gears-<slug>',   // kebab-case, unique, never renamed
//          title: '…', track: 'mechanics', band: 'builders',
//          template: 'gear-train',     // picks the Params/Answer types below
//          difficulty: 2,              // 1–5 within the band
//          intro: '≤ 40 words', takeaway: '≤ 30 words', realWorld: '≤ 30 words',
//          params: { … },              // checked against gear-train's Params
//          solution: { gears: [10, 40] },
//          after: ['mech-gears-slow-the-wheel'], // same track only
//          badges: ['gear-head'],
//        },
//      ]
// 2. Run `npx tsx lib/kids/activities/verify.ts` — it must print no ✗.
// 3. A content activity with the same id as a template sample replaces it.
//
// Pages read ALL_ACTIVITIES on the server and pass light summaries to the
// browser (see summarize() in ../progress.ts); never import this file from a
// client component — it carries every activity's params.

import type { BandId } from '../../bands'
import type { Activity, TrackId } from '../types'
import { dailyMissions, localDay, nextActivities, orderActivities, summarize, type ActivitiesDone, type ActivitySummary } from '../progress'

import { motion } from './motion'
import { sensors } from './sensors'
import { code } from './code'
import { electronics } from './electronics'
import { mechanics } from './mechanics'
import { control } from './control'
import { ai } from './ai'
import { design } from './design'
import { space } from './space'
import { world } from './world'

import { samples as binaryEncoderSamples } from '@/components/kids/activities/templates/binary-encoder/samples'
import { samples as centreOfMassSamples } from '@/components/kids/activities/templates/centre-of-mass/samples'
import { samples as circuitSnapSamples } from '@/components/kids/activities/templates/circuit-snap/samples'
import { samples as classifySortSamples } from '@/components/kids/activities/templates/classify-sort/samples'
import { samples as controlTunerSamples } from '@/components/kids/activities/templates/control-tuner/samples'
import { samples as debugProgramSamples } from '@/components/kids/activities/templates/debug-program/samples'
import { samples as estimateSamples } from '@/components/kids/activities/templates/estimate/samples'
import { samples as ethicsDilemmaSamples } from '@/components/kids/activities/templates/ethics-dilemma/samples'
import { samples as flowchartBuilderSamples } from '@/components/kids/activities/templates/flowchart-builder/samples'
import { samples as gearTrainSamples } from '@/components/kids/activities/templates/gear-train/samples'
import { samples as leverBalanceSamples } from '@/components/kids/activities/templates/lever-balance/samples'
import { samples as logicGatesSamples } from '@/components/kids/activities/templates/logic-gates/samples'
import { samples as motorMathSamples } from '@/components/kids/activities/templates/motor-math/samples'
import { samples as ohmsLawSamples } from '@/components/kids/activities/templates/ohms-law/samples'
import { samples as pathPlannerSamples } from '@/components/kids/activities/templates/path-planner/samples'
import { samples as predictOutputSamples } from '@/components/kids/activities/templates/predict-output/samples'
import { samples as robotDesignerSamples } from '@/components/kids/activities/templates/robot-designer/samples'
import { samples as robotMatchSamples } from '@/components/kids/activities/templates/robot-match/samples'
import { samples as sensorChoiceSamples } from '@/components/kids/activities/templates/sensor-choice/samples'
import { samples as sequencePathSamples } from '@/components/kids/activities/templates/sequence-path/samples'
import { samples as signalGraphSamples } from '@/components/kids/activities/templates/signal-graph/samples'
import { samples as simpleMachinesSamples } from '@/components/kids/activities/templates/simple-machines/samples'
import { samples as spotInSceneSamples } from '@/components/kids/activities/templates/spot-in-scene/samples'
import { samples as thresholdTunerSamples } from '@/components/kids/activities/templates/threshold-tuner/samples'
import { samples as trainMiniSamples } from '@/components/kids/activities/templates/train-mini/samples'
import { samples as wheelTerrainSamples } from '@/components/kids/activities/templates/wheel-terrain/samples'

/** Erase the per-template types: the union is checked where it is written. */
function asActivities(list: readonly unknown[]): Activity[] {
  return list as Activity[]
}

/** Activities written by content authors, per track file. */
export const CONTENT_BY_FILE: Record<TrackId, Activity[]> = {
  motion: asActivities(motion),
  sensors: asActivities(sensors),
  code: asActivities(code),
  electronics: asActivities(electronics),
  mechanics: asActivities(mechanics),
  control: asActivities(control),
  ai: asActivities(ai),
  design: asActivities(design),
  space: asActivities(space),
  world: asActivities(world),
}

/** The reference samples of every template (the starter set). */
export const SAMPLE_ACTIVITIES: Activity[] = asActivities([
  ...binaryEncoderSamples,
  ...centreOfMassSamples,
  ...circuitSnapSamples,
  ...classifySortSamples,
  ...controlTunerSamples,
  ...debugProgramSamples,
  ...estimateSamples,
  ...ethicsDilemmaSamples,
  ...flowchartBuilderSamples,
  ...gearTrainSamples,
  ...leverBalanceSamples,
  ...logicGatesSamples,
  ...motorMathSamples,
  ...ohmsLawSamples,
  ...pathPlannerSamples,
  ...predictOutputSamples,
  ...robotDesignerSamples,
  ...robotMatchSamples,
  ...sensorChoiceSamples,
  ...sequencePathSamples,
  ...signalGraphSamples,
  ...simpleMachinesSamples,
  ...spotInSceneSamples,
  ...thresholdTunerSamples,
  ...trainMiniSamples,
  ...wheelTerrainSamples,
])

export const CONTENT_ACTIVITIES: Activity[] = Object.values(CONTENT_BY_FILE).flat()

const contentIds = new Set(CONTENT_ACTIVITIES.map((a) => a.id))

/** Every activity: authored content first, then any sample it does not replace. */
export const ALL_ACTIVITIES: Activity[] = [...CONTENT_ACTIVITIES, ...SAMPLE_ACTIVITIES.filter((a) => !contentIds.has(a.id))]

const BY_ID = new Map(ALL_ACTIVITIES.map((a) => [a.id, a]))

export function getActivity(id: string): Activity | undefined {
  return BY_ID.get(id)
}

/** A track's activities in galaxy order (band, then difficulty, prerequisites first). */
export function byTrack(track: TrackId): Activity[] {
  return orderActivities(ALL_ACTIVITIES.filter((a) => a.track === track))
}

export function byBand(band: BandId): Activity[] {
  return orderActivities(ALL_ACTIVITIES.filter((a) => a.band === band))
}

/** Light summaries for the browser (no params). */
export function allSummaries(): ActivitySummary[] {
  return ALL_ACTIVITIES.map(summarize)
}

/** Suggestions for a child, given their finished activities. */
export function suggestNext(done: ActivitiesDone, band: BandId, opts: { track?: TrackId; exclude?: string; limit?: number } = {}): Activity[] {
  const picked = nextActivities(allSummaries(), done, band, opts)
  return picked.map((s) => BY_ID.get(s.id)).filter((a): a is Activity => !!a)
}

/** Today's three missions for a band. */
export function todaysMissions(band: BandId, day: string = localDay()): Activity[] {
  return dailyMissions(allSummaries(), band, day).map((s) => BY_ID.get(s.id)).filter((a): a is Activity => !!a)
}

export { nextActivities }
