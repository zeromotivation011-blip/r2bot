// lib/kids/activities/logic-registry.ts
// TemplateId -> pure template logic (validate + check). No React, no DOM: safe
// in Node (lib/kids/activities/verify.ts) and on the server. The browser never
// needs this file — the player gets check() from the one template chunk it
// downloads (components/kids/activities/registry.ts).
//
// Also the TYPE map from a template id to its Params and Answer, so content
// files get full type-checking per template (see KidsActivity).

import type { Activity, ConceptId, TemplateId, TemplateLogic } from './types'

import { logic as binaryEncoderLogic, type Params as BinaryEncoderParams, type Answer as BinaryEncoderAnswer } from '@/components/kids/activities/templates/binary-encoder/logic'
import { logic as centreOfMassLogic, type Params as CentreOfMassParams, type Answer as CentreOfMassAnswer } from '@/components/kids/activities/templates/centre-of-mass/logic'
import { logic as circuitSnapLogic, type Params as CircuitSnapParams, type Answer as CircuitSnapAnswer } from '@/components/kids/activities/templates/circuit-snap/logic'
import { logic as classifySortLogic, type Params as ClassifySortParams, type Answer as ClassifySortAnswer } from '@/components/kids/activities/templates/classify-sort/logic'
import { logic as controlTunerLogic, type Params as ControlTunerParams, type Answer as ControlTunerAnswer } from '@/components/kids/activities/templates/control-tuner/logic'
import { logic as debugProgramLogic, type Params as DebugProgramParams, type Answer as DebugProgramAnswer } from '@/components/kids/activities/templates/debug-program/logic'
import { logic as estimateLogic, type Params as EstimateParams, type Answer as EstimateAnswer } from '@/components/kids/activities/templates/estimate/logic'
import { logic as ethicsDilemmaLogic, type Params as EthicsDilemmaParams, type Answer as EthicsDilemmaAnswer } from '@/components/kids/activities/templates/ethics-dilemma/logic'
import { logic as flowchartBuilderLogic, type Params as FlowchartBuilderParams, type Answer as FlowchartBuilderAnswer } from '@/components/kids/activities/templates/flowchart-builder/logic'
import { logic as gearTrainLogic, type Params as GearTrainParams, type Answer as GearTrainAnswer } from '@/components/kids/activities/templates/gear-train/logic'
import { logic as leverBalanceLogic, type Params as LeverBalanceParams, type Answer as LeverBalanceAnswer } from '@/components/kids/activities/templates/lever-balance/logic'
import { logic as logicGatesLogic, type Params as LogicGatesParams, type Answer as LogicGatesAnswer } from '@/components/kids/activities/templates/logic-gates/logic'
import { logic as numberBoxLogic, type Params as NumberBoxParams, type Answer as NumberBoxAnswer } from '@/components/kids/activities/templates/number-box/logic'
import { logic as motorMathLogic, type Params as MotorMathParams, type Answer as MotorMathAnswer } from '@/components/kids/activities/templates/motor-math/logic'
import { logic as ohmsLawLogic, type Params as OhmsLawParams, type Answer as OhmsLawAnswer } from '@/components/kids/activities/templates/ohms-law/logic'
import { logic as pathPlannerLogic, type Params as PathPlannerParams, type Answer as PathPlannerAnswer } from '@/components/kids/activities/templates/path-planner/logic'
import { logic as predictOutputLogic, type Params as PredictOutputParams, type Answer as PredictOutputAnswer } from '@/components/kids/activities/templates/predict-output/logic'
import { logic as robotDesignerLogic, type Params as RobotDesignerParams, type Answer as RobotDesignerAnswer } from '@/components/kids/activities/templates/robot-designer/logic'
import { logic as robotMatchLogic, type Params as RobotMatchParams, type Answer as RobotMatchAnswer } from '@/components/kids/activities/templates/robot-match/logic'
import { logic as sensorChoiceLogic, type Params as SensorChoiceParams, type Answer as SensorChoiceAnswer } from '@/components/kids/activities/templates/sensor-choice/logic'
import { logic as sequencePathLogic, type Params as SequencePathParams, type Answer as SequencePathAnswer } from '@/components/kids/activities/templates/sequence-path/logic'
import { logic as signalGraphLogic, type Params as SignalGraphParams, type Answer as SignalGraphAnswer } from '@/components/kids/activities/templates/signal-graph/logic'
import { logic as simpleMachinesLogic, type Params as SimpleMachinesParams, type Answer as SimpleMachinesAnswer } from '@/components/kids/activities/templates/simple-machines/logic'
import { logic as spotInSceneLogic, type Params as SpotInSceneParams, type Answer as SpotInSceneAnswer } from '@/components/kids/activities/templates/spot-in-scene/logic'
import { logic as thresholdTunerLogic, type Params as ThresholdTunerParams, type Answer as ThresholdTunerAnswer } from '@/components/kids/activities/templates/threshold-tuner/logic'
import { logic as trainMiniLogic, type Params as TrainMiniParams, type Answer as TrainMiniAnswer } from '@/components/kids/activities/templates/train-mini/logic'
import { logic as wheelTerrainLogic, type Params as WheelTerrainParams, type Answer as WheelTerrainAnswer } from '@/components/kids/activities/templates/wheel-terrain/logic'

/** Params and Answer types of every template. */
export interface TemplateTypes {
  'binary-encoder': { params: BinaryEncoderParams; answer: BinaryEncoderAnswer }
  'centre-of-mass': { params: CentreOfMassParams; answer: CentreOfMassAnswer }
  'circuit-snap': { params: CircuitSnapParams; answer: CircuitSnapAnswer }
  'classify-sort': { params: ClassifySortParams; answer: ClassifySortAnswer }
  'control-tuner': { params: ControlTunerParams; answer: ControlTunerAnswer }
  'debug-program': { params: DebugProgramParams; answer: DebugProgramAnswer }
  'estimate': { params: EstimateParams; answer: EstimateAnswer }
  'ethics-dilemma': { params: EthicsDilemmaParams; answer: EthicsDilemmaAnswer }
  'flowchart-builder': { params: FlowchartBuilderParams; answer: FlowchartBuilderAnswer }
  'gear-train': { params: GearTrainParams; answer: GearTrainAnswer }
  'lever-balance': { params: LeverBalanceParams; answer: LeverBalanceAnswer }
  'logic-gates': { params: LogicGatesParams; answer: LogicGatesAnswer }
  'motor-math': { params: MotorMathParams; answer: MotorMathAnswer }
  'number-box': { params: NumberBoxParams; answer: NumberBoxAnswer }
  'ohms-law': { params: OhmsLawParams; answer: OhmsLawAnswer }
  'path-planner': { params: PathPlannerParams; answer: PathPlannerAnswer }
  'predict-output': { params: PredictOutputParams; answer: PredictOutputAnswer }
  'robot-designer': { params: RobotDesignerParams; answer: RobotDesignerAnswer }
  'robot-match': { params: RobotMatchParams; answer: RobotMatchAnswer }
  'sensor-choice': { params: SensorChoiceParams; answer: SensorChoiceAnswer }
  'sequence-path': { params: SequencePathParams; answer: SequencePathAnswer }
  'signal-graph': { params: SignalGraphParams; answer: SignalGraphAnswer }
  'simple-machines': { params: SimpleMachinesParams; answer: SimpleMachinesAnswer }
  'spot-in-scene': { params: SpotInSceneParams; answer: SpotInSceneAnswer }
  'threshold-tuner': { params: ThresholdTunerParams; answer: ThresholdTunerAnswer }
  'train-mini': { params: TrainMiniParams; answer: TrainMiniAnswer }
  'wheel-terrain': { params: WheelTerrainParams; answer: WheelTerrainAnswer }
}

export type ParamsOf<T extends TemplateId> = TemplateTypes[T]['params']
export type AnswerOf<T extends TemplateId> = TemplateTypes[T]['answer']

/** An activity typed by its template: `params` and `solution` are checked against that template. */
export type ActivityFor<T extends TemplateId> = Activity<ParamsOf<T>, AnswerOf<T>> & { template: T }

/** A live (authored) activity must name its concepts: mastery and Recharge missions depend on them. */
export type LiveActivityFor<T extends TemplateId> = ActivityFor<T> & { concepts: ConceptId[] }

/**
 * Any activity, as a union discriminated by `template`. Content files declare
 * `export const motion: KidsActivity[] = [ … ]` and TypeScript checks each
 * object literal against the Params/Answer of the template it names.
 */
export type KidsActivity = { [T in TemplateId]: LiveActivityFor<T> }[TemplateId]

type AnyLogic = TemplateLogic<unknown, unknown>

// Each logic is typed by its own Params/Answer; the registry is keyed by id, so
// callers pass params that came with an activity of the same template.
function erase<P, A>(l: TemplateLogic<P, A>): AnyLogic {
  return l as unknown as AnyLogic
}

export const TEMPLATE_LOGIC: Record<TemplateId, AnyLogic> = {
  'binary-encoder': erase(binaryEncoderLogic),
  'centre-of-mass': erase(centreOfMassLogic),
  'circuit-snap': erase(circuitSnapLogic),
  'classify-sort': erase(classifySortLogic),
  'control-tuner': erase(controlTunerLogic),
  'debug-program': erase(debugProgramLogic),
  'estimate': erase(estimateLogic),
  'ethics-dilemma': erase(ethicsDilemmaLogic),
  'flowchart-builder': erase(flowchartBuilderLogic),
  'gear-train': erase(gearTrainLogic),
  'lever-balance': erase(leverBalanceLogic),
  'logic-gates': erase(logicGatesLogic),
  'motor-math': erase(motorMathLogic),
  'number-box': erase(numberBoxLogic),
  'ohms-law': erase(ohmsLawLogic),
  'path-planner': erase(pathPlannerLogic),
  'predict-output': erase(predictOutputLogic),
  'robot-designer': erase(robotDesignerLogic),
  'robot-match': erase(robotMatchLogic),
  'sensor-choice': erase(sensorChoiceLogic),
  'sequence-path': erase(sequencePathLogic),
  'signal-graph': erase(signalGraphLogic),
  'simple-machines': erase(simpleMachinesLogic),
  'spot-in-scene': erase(spotInSceneLogic),
  'threshold-tuner': erase(thresholdTunerLogic),
  'train-mini': erase(trainMiniLogic),
  'wheel-terrain': erase(wheelTerrainLogic),
}

export const TEMPLATE_IDS = Object.keys(TEMPLATE_LOGIC) as TemplateId[]

export function getLogic(id: TemplateId): AnyLogic | undefined {
  return TEMPLATE_LOGIC[id]
}
