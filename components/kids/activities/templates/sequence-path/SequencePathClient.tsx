'use client'

// sequence-path — the child builds a block program and drives the robot to the goal.

import type { TemplateProps } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'
import { GridMission } from './GridMissionClient'

export default function SequencePathClient({ params, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  return (
    <GridMission<Params>
      worlds={[params.world, ...(params.extraWorlds ?? [])]}
      theme={params.theme ?? 'warehouse'}
      palette={params.palette}
      maxBlocks={params.maxBlocks}
      maxDepth={params.maxDepth}
      python={params.python ?? 'off'}
      initialProgram={[]}
      showHintPath={params.showHintPath}
      onSubmit={onSubmit}
      onDone={onDone}
    />
  )
}
