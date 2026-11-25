'use client'

// components/kids/story/StoryPlayerLoaderClient.tsx
// The player is browser-only (speech, audio, animation frames), so it loads
// after the page with ssr: false, behind a skeleton of exactly the same size.

import dynamic from 'next/dynamic'
import type { Episode } from '@/lib/kids/stories/types'
import { StoryPlayerSkeleton } from './StoryPlayerSkeleton'

interface Props {
  episode: Episode
  next: { slug: string; title: string }
}

const Player = dynamic(() => import('./StoryPlayerClient'), {
  ssr: false,
  loading: () => <StoryPlayerSkeleton title="Loading the story…" />,
})

export default function StoryPlayerLoaderClient({ episode, next }: Props) {
  return <Player episode={episode} next={next} />
}
