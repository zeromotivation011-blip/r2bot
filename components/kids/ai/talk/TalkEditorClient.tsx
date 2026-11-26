'use client'

// components/kids/ai/talk/TalkEditorClient.tsx
// The shared Blockly editor (components/kids/sim/BlocklyEditorClient) with the
// full Talk toolbox. Loaded only through next/dynamic({ ssr: false }) from
// TalkClient, so Blockly never reaches the first load. It hands its handle up
// through onReady instead of a ref, because refs do not pass through dynamic().

import { useEffect, useRef } from 'react'
import type { Capability } from '@/lib/kids/robot-design'
import type { Program } from '@/lib/kids/sim/program'
import { TALK_TOOLBOX } from '@/lib/kids/ai/talk/missions'
import BlocklyEditor, { type BlocklyEditorHandle } from '@/components/kids/sim/BlocklyEditorClient'

interface Props {
  caps: Set<Capability>
  initial: Program
  resetKey: string
  onReady: (h: BlocklyEditorHandle) => void
}

export default function TalkEditorClient({ caps, initial, resetKey, onReady }: Props) {
  const ref = useRef<BlocklyEditorHandle>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => {
    if (ref.current) readyRef.current(ref.current)
  }, [])
  return <BlocklyEditor ref={ref} toolbox={TALK_TOOLBOX} caps={caps} initial={initial} resetKey={resetKey} />
}
