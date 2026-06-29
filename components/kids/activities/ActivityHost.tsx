'use client'

// components/kids/activities/ActivityHost.tsx
// Dispatches an Activity to the right rebuilt component.

import type {
  Activity,
  DragSortContent,
  FillBlankContent,
  MatchPairsContent,
  MiniSimulateContent,
  SequenceBuilderContent,
  SpotTheRobotContent,
  TapToRevealContent,
} from '@/lib/kids-world-data'

import { TapToReveal } from './TapToReveal'
import { DragSort } from './DragSort'
import { SpotTheRobot } from './SpotTheRobot'
import { SequenceBuilder } from './SequenceBuilder'
import { MiniSimulate } from './MiniSimulate'
import { MatchPairs } from './MatchPairs'
import { FillBlank } from './FillBlank'

export interface ActivityHostProps {
  activity: Activity
  onWin: () => void
  onFail: () => void
  showHint?: boolean
}

export function ActivityHost({ activity, onWin, onFail, showHint = false }: ActivityHostProps) {
  switch (activity.type) {
    case 'tap-to-reveal':
      return <TapToReveal content={activity.content as TapToRevealContent} onWin={onWin} />
    case 'drag-sort':
      return <DragSort content={activity.content as DragSortContent} onWin={onWin} onFail={onFail} showHint={showHint} />
    case 'spot-the-robot':
      return <SpotTheRobot content={activity.content as SpotTheRobotContent} onWin={onWin} onFail={onFail} showHint={showHint} />
    case 'sequence-builder':
      return <SequenceBuilder content={activity.content as SequenceBuilderContent} onWin={onWin} onFail={onFail} />
    case 'mini-simulate':
      return <MiniSimulate content={activity.content as MiniSimulateContent} onWin={onWin} onFail={onFail} showHint={showHint} />
    case 'match-pairs':
      return <MatchPairs content={activity.content as MatchPairsContent} onWin={onWin} onFail={onFail} />
    case 'fill-blank':
      return <FillBlank content={activity.content as FillBlankContent} onWin={onWin} onFail={onFail} />
    default:
      return <p style={{ color: '#fde047' }}>Activity type not supported yet.</p>
  }
}
