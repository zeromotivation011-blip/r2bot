'use client'

// components/kids/sim/BlocklyEditorClient.tsx
// The block editor for the physics sim. Owns one Blockly workspace: toolbox per
// challenge (locked blocks greyed out when the robot lacks the part), program
// JSON in and out, and the "running block" highlight. Disposed on unmount.

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as Blockly from 'blockly/core'
import * as En from 'blockly/msg/en'
import type { Capability } from '@/lib/kids/robot-design'
import { blocklyToProgram, programToBlockly, type BWorkspace } from '@/lib/kids/sim/blockly-json'
import { blockNeeds, lockMessage, type Program } from '@/lib/kids/sim/program'
import { buildToolbox, defineBlocks, kidsTheme } from './blockly-blocks'

export interface BlocklyEditorHandle {
  getProgram(): Program
  setProgram(p: Program): void
  highlight(id: string | null): void
  /** Plain words for a block ("drive 50 % for 2 s"), for the "now running" line over the 3D view. */
  describe(id: string): string
}

interface Props {
  toolbox: string[]
  caps: Set<Capability>
  initial: Program
  /** Changes whenever the arena changes, so the workspace is reloaded. */
  resetKey: string
  onChange?: () => void
}

/** Put the "when Run is pressed" block near the top-left, where a program starts reading. */
function scrollToStart(w: Blockly.WorkspaceSvg): void {
  w.scroll(8, 8)
}

const BlocklyEditorClient = forwardRef<BlocklyEditorHandle, Props>(function BlocklyEditorClient({ toolbox, caps, initial, resetKey, onChange }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const ws = useRef<Blockly.WorkspaceSvg | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const initialRef = useRef(initial)
  initialRef.current = initial

  // Create the workspace once.
  useEffect(() => {
    if (!host.current) return
    defineBlocks()
    Blockly.setLocale(En as unknown as Record<string, string>)
    const { toolbox: tb } = buildToolbox(toolbox, caps)
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    const w = Blockly.inject(host.current, {
      toolbox: tb,
      theme: kidsTheme(),
      renderer: 'zelos',
      media: '/kids/lab/blockly-media/',
      sounds: false,
      trashcan: false,
      // Wheel/trackpad scrolling scrolls the PAGE (no scroll trap); zoom with pinch or the +/− buttons.
      zoom: { controls: true, wheel: false, pinch: true, startScale: coarse ? 0.9 : 0.8, maxScale: 1.6, minScale: 0.4 },
      move: { scrollbars: true, drag: true, wheel: false },
      grid: { spacing: 24, length: 2, colour: '#1E2A44', snap: true },
    })
    ws.current = w
    w.addChangeListener(Blockly.Events.disableOrphans)
    const listener = (e: Blockly.Events.Abstract) => {
      if (e.isUiEvent) return
      onChangeRef.current?.()
    }
    w.addChangeListener(listener)
    const ro = new ResizeObserver(() => Blockly.svgResize(w))
    ro.observe(host.current)
    return () => {
      ro.disconnect()
      w.dispose()
      ws.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; toolbox/caps updates are handled below
  }, [])

  // Toolbox follows the challenge and the robot's parts; blocks already placed get a warning if now locked.
  useEffect(() => {
    const w = ws.current
    if (!w) return
    const { toolbox: tb } = buildToolbox(toolbox, caps)
    w.updateToolbox(tb)
    for (const b of w.getAllBlocks(false)) {
      const need = blockNeeds(b.type)
      b.setWarningText(need && !caps.has(need) ? lockMessage(b.type, need) : null)
    }
  }, [toolbox, caps])

  // New arena: load its starting program.
  useEffect(() => {
    const w = ws.current
    if (!w) return
    Blockly.Events.disable()
    try {
      w.clear()
      Blockly.serialization.workspaces.load(programToBlockly(initialRef.current), w)
    } finally {
      Blockly.Events.enable()
    }
    scrollToStart(w)
    onChangeRef.current?.()
  }, [resetKey])

  useImperativeHandle(
    ref,
    () => ({
      getProgram() {
        const w = ws.current
        if (!w) return { body: [] }
        return blocklyToProgram(Blockly.serialization.workspaces.save(w) as BWorkspace)
      },
      setProgram(p) {
        const w = ws.current
        if (!w) return
        w.clear()
        Blockly.serialization.workspaces.load(programToBlockly(p), w)
        scrollToStart(w)
      },
      highlight(id) {
        ws.current?.highlightBlock(id)
      },
      describe(id) {
        const b = ws.current?.getBlockById(id)
        return b ? b.toString(60).replace(/\s+/g, ' ').trim() : ''
      },
    }),
    [],
  )

  // Category rows are the main navigation for a 5-year-old on a touch screen: 44 px tall, bigger text.
  return (
    <div
      ref={host}
      className="h-full w-full [&_.blocklyToolboxCategory]:flex [&_.blocklyToolboxCategory]:h-11 [&_.blocklyToolboxCategory]:items-center [&_.blocklyToolboxCategory]:leading-[44px] [&_.blocklyToolboxCategoryLabel]:pr-2 [&_.blocklyToolboxCategoryLabel]:text-[15px]"
      aria-label="Block editor: drag blocks under “when Run is pressed”"
    />
  )
})

export default BlocklyEditorClient
