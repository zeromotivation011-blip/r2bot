// lib/kids/episodes/story-lines.ts
// Every line the Story Theatre player reads aloud, one entry per unique
// speaker + text: scene lines and narration, choice prompts, the lines inside
// each choice option, and the quiz read-outs (storyQuizReadout). Shared by the
// exporter (scripts/kids-voices/export-stories.ts) and story-voice.verify.ts.
// Pure: no browser APIs.

import type { Beat, Episode } from '../stories/types'
import { storyQuizReadout, storyVoiceKey, storyVoiceText } from './story-voice-key'

export interface StoryVoiceLine {
  key: string
  who: string
  text: string
  slugs: string[]
}

export function storyVoiceLines(episodes: readonly Episode[]): StoryVoiceLine[] {
  const lines = new Map<string, StoryVoiceLine>()
  const add = (slug: string, who: string, raw: string) => {
    const text = storyVoiceText(raw)
    if (!text) return
    const key = storyVoiceKey(who, text)
    const cur = lines.get(key)
    if (cur) {
      if (!cur.slugs.includes(slug)) cur.slugs.push(slug)
      return
    }
    lines.set(key, { key, who, text, slugs: [slug] })
  }
  const walk = (slug: string, beats: Beat[]) => {
    for (const b of beats) {
      if (b.kind === 'say') add(slug, b.who, b.text)
      else if (b.kind === 'narrate') add(slug, 'narrator', b.text)
      else if (b.kind === 'choice') {
        add(slug, b.who, b.prompt)
        for (const o of b.options) walk(slug, o.beats)
      }
    }
  }
  for (const ep of episodes) {
    for (const sc of ep.scenes) walk(ep.slug, sc.beats)
    for (const q of ep.quiz) add(ep.slug, 'narrator', storyQuizReadout(q.q, q.options))
  }
  return [...lines.values()]
}
