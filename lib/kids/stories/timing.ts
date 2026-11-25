// lib/kids/stories/timing.ts
// How long a spoken line takes. A leaf module on purpose: the player imports
// it, and it must not pull the episode catalogue (index.ts) into the player's
// bundle — the player is handed the one episode it plays as a prop.
//
// Speech runs at roughly 2.4 words a second at the rates we use. The player
// uses lineMs() when there is no voice, so the running-time estimate in
// index.ts and the silent playback agree.

export function lineMs(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1600, Math.round(words * 420 + 700))
}
