// components/kids/story/StoryPlayerSkeleton.tsx
// Same footprint as the player (see frame.ts): no layout shift when it loads.

import { FRAME } from './frame'

export function StoryPlayerSkeleton({ title }: { title: string }) {
  return (
    <div className={FRAME.root} aria-busy="true" aria-label={`Loading the story player for ${title}`}>
      <div className={FRAME.stage}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#111C32] to-[#0A1120]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-20 w-20 rounded-full bg-orange-500/70 sm:h-24 sm:w-24" />
          <p className="px-4 text-center text-sm font-bold text-white/80 sm:text-base">{title}</p>
        </div>
      </div>
      <div className={FRAME.controls}>
        <div className="h-11 w-11 rounded-xl bg-white/10" />
        <div className="h-11 w-11 rounded-xl bg-white/10" />
        <div className="h-11 w-11 rounded-xl bg-white/10" />
        <div className="ml-auto h-11 w-24 rounded-xl bg-white/10" />
      </div>
      <div className={FRAME.progress}>
        <div className="h-2 w-full rounded-full bg-white/10" />
      </div>
      <div className={FRAME.panel}>
        <div className="h-4 w-1/3 rounded bg-white/10" />
        <div className="mt-3 h-4 w-5/6 rounded bg-white/10" />
      </div>
    </div>
  )
}
