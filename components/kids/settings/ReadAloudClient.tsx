'use client'

// components/kids/settings/ReadAloudClient.tsx — a "hear it" speaker for any
// block of kids text (roadmap #25). Use it where a non-reader must be able to
// hear an instruction, an option or a story line even when "Read everything to
// me" is off. It honours the voice switch (silent, and hidden, when voice is off).
//
//   <ReadAloud text="Tap the motor that turns the wheel.">
//     <p>Tap the motor that turns the wheel.</p>
//   </ReadAloud>
//
//   <ReadAloudButton text={option.label} label={`Hear “${option.label}”`} />
//
// The wrapper also carries data-read-aloud, so in read-aloud mode a tap anywhere
// on the block reads it (convention: lib/kids/read-aloud.ts).

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { readAloud } from '@/lib/kids/read-aloud'
import { useKidsSettings } from '@/lib/kids/settings'

interface ReadAloudButtonProps {
  /** What is read. */
  text: string
  /** Accessible name; default "Read this to me". */
  label?: string
  /** Size: 'md' is 48px (default), 'sm' is 44px (the floor). */
  size?: 'sm' | 'md'
  className?: string
}

/** A 44–48px speaker button that reads `text` (press again to stop). */
export function ReadAloudButton({ text, label = 'Read this to me', size = 'md', className = '' }: ReadAloudButtonProps) {
  const { voice } = useKidsSettings()
  const [speaking, setSpeaking] = useState(false)
  const stop = useRef<() => void>(() => undefined)
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    setSupported('speechSynthesis' in window)
    return () => stop.current()
  }, [])
  if (!supported || !voice) return null
  const dim = size === 'sm' ? 'h-11 w-11 text-lg' : 'h-12 w-12 text-xl'
  return (
    <button
      type="button"
      aria-label={speaking ? 'Stop reading' : label}
      aria-pressed={speaking}
      data-read-aloud="off"
      onClick={(e) => {
        e.stopPropagation()
        if (speaking) {
          stop.current()
          setSpeaking(false)
          return
        }
        setSpeaking(true)
        stop.current = readAloud(text, { onEnd: () => setSpeaking(false) })
      }}
      className={`inline-grid shrink-0 place-items-center rounded-full border border-white/[0.16] bg-[#19263F] ${dim} text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${speaking ? 'border-[#00E5FF] ring-2 ring-[#00E5FF]/60' : ''} ${className}`}
    >
      <span aria-hidden>{speaking ? '■' : '🔊'}</span>
    </button>
  )
}

interface ReadAloudProps {
  /** What is read; defaults to the children's text when they are a plain string. */
  text?: string
  children: ReactNode
  /** Wrapper element (default div). */
  as?: ElementType
  className?: string
  /** Button position: before or after the content (default after). */
  button?: 'before' | 'after' | 'none'
  label?: string
}

/** Wraps a block of text with a speaker button and the data-read-aloud marker. */
export function ReadAloud({ text, children, as: Tag = 'div', className = '', button = 'after', label }: ReadAloudProps) {
  const spoken = text ?? (typeof children === 'string' ? children : '')
  const btn = button !== 'none' && spoken ? <ReadAloudButton text={spoken} label={label} /> : null
  return (
    <Tag data-read-aloud={text ?? ''} className={`flex items-start gap-3 ${className}`}>
      {button === 'before' && btn}
      <div className="min-w-0 flex-1">{children}</div>
      {button === 'after' && btn}
    </Tag>
  )
}

export default ReadAloud
