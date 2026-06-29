'use client'

// components/academy/blocks/BlockRegistry.tsx
// Dispatches a ContentBlock to its renderer. Each block component is responsible
// for calling onComplete(score?) when its required interaction finishes.

import type { ContentBlock } from '@/lib/academy'
import { VideoBlock } from './VideoBlock'
import { TextBlock } from './TextBlock'
import { QuizBlock } from './QuizBlock'
import { FlashcardBlock } from './FlashcardBlock'
import { MatchPairsBlock } from './MatchPairsBlock'
import { FillBlankBlock } from './FillBlankBlock'
import { CodeBlock } from './CodeBlock'
import { SimulationBlock } from './SimulationBlock'
import { HandsOnBlock } from './HandsOnBlock'
import { DiscussionBlock } from './DiscussionBlock'
import { ScormBlock } from './ScormBlock'

export interface BlockRenderProps {
  block: ContentBlock
  isCompleted: boolean
  isActive: boolean
  onComplete: (result: { score?: number; responseData?: unknown }) => void
  onProgress?: (frac: number) => void
}

export function BlockRenderer(props: BlockRenderProps) {
  const { block } = props
  switch (block.type) {
    case 'video':          return <VideoBlock {...props} block={block} />
    case 'text':           return <TextBlock {...props} block={block} />
    case 'quiz-mcq':       return <QuizBlock {...props} block={block} />
    case 'flashcard':      return <FlashcardBlock {...props} block={block} />
    case 'match-pairs':    return <MatchPairsBlock {...props} block={block} />
    case 'fill-blank':     return <FillBlankBlock {...props} block={block} />
    case 'code-challenge': return <CodeBlock {...props} block={block} />
    case 'simulation':     return <SimulationBlock {...props} block={block} />
    case 'hands-on':       return <HandsOnBlock {...props} block={block} />
    case 'discussion':     return <DiscussionBlock {...props} block={block} />
    case 'scorm':          return <ScormBlock {...props} block={block} />
    default:
      return null
  }
}
