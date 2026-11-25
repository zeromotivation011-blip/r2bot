// components/kids/story/frame.ts
// One set of box sizes shared by the player and its loading skeleton, so the
// page does not shift when the player arrives. The stage is 16:9 and never
// taller than the viewport allows (letterboxed on phones held sideways).

export const FRAME = {
  root: 'mx-auto w-full max-w-[calc((100svh_-_9rem)*16/9)] min-w-[17rem]',
  stage: 'relative aspect-video w-full overflow-hidden rounded-2xl bg-[#140b33] shadow-2xl shadow-black/50 ring-1 ring-white/10',
  controls: 'mt-2 flex h-12 items-center gap-1.5',
  progress: 'mt-1 flex h-11 items-center gap-1',
  panel: 'mt-2 min-h-[7.5rem] rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 sm:p-4',
} as const
