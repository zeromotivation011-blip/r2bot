// lib/kids/episodes/story-voice-key.ts
//
// One key per spoken Story Theatre line, shared by the exporter
// (scripts/kids-voices/export-stories.ts), the Piper generator
// (generate-stories.py writes <key>.ogg) and the player helper
// (lib/kids/episodes/story-voice.ts). Keyed by speaker + exact text, so a line
// that is reused (a choice prompt, a repeated "Try again!") is voiced once,
// and an edited line simply has no file until it is re-voiced: the player then
// falls back to the browser voice. Pure: safe on the server and in the browser.

/** The texts the Story Theatre reads aloud are normalised the same way everywhere. */
export function storyVoiceText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** FNV-1a 32-bit over UTF-8 of `who \u0000 text`, as 8 hex digits. */
export function storyVoiceKey(who: string, text: string): string {
  const bytes = new TextEncoder().encode(`${who}\u0000${storyVoiceText(text)}`)
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** What the Story Theatre player reads for a quiz question (StoryPlayerClient). Keep in step. */
export function storyQuizReadout(q: string, options: readonly string[]): string {
  return `${q} ${options.slice(0, -1).join(', ')}, or ${options[options.length - 1]}?`
}
