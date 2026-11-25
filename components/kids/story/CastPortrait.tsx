// components/kids/story/CastPortrait.tsx
// A still of one puppet for cast lists. Server-renderable (no hooks); idle
// animation runs if story.css is on the page.

import type { CharacterId, Emotion } from '@/lib/kids/stories/types'
import { PUPPETS, PUPPET_HEIGHT } from './characters'

export function CastPortrait({ who, emotion = 'happy', className }: { who: CharacterId; emotion?: Emotion; className?: string }) {
  const Puppet = PUPPETS[who]
  const h = PUPPET_HEIGHT[who] + 40
  const w = Math.max(240, h * 0.8)
  return (
    <svg viewBox={`${-w / 2} ${-h} ${w} ${h + 10}`} className={className} aria-hidden="true" focusable="false">
      <ellipse cx={0} cy={2} rx={70} ry={10} fill="#000" opacity={0.25} />
      <Puppet emotion={emotion} talking={false} />
    </svg>
  )
}
