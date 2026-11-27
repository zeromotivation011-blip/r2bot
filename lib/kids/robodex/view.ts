// lib/kids/robodex/view.ts — SERVER-side: turns the Robodex catalogue into the
// small, plain objects the client islands need (with "how to find it" hints and
// maker names resolved), so the client bundle never loads the activity
// catalogue or the story scripts.

import { ALL_ACTIVITIES } from '../activities/content'
import { EPISODES } from '../stories'
import { CONCEPT_INFO } from '../universe/mastery'
import { TIER_NAMES } from '../universe/tiers'
import { GAMES, WORLDS } from '../universe/worlds'
import { getMaker } from '../makers/makers'
import { ROBODEX_CARDS, ROBODEX_WORLD_ORDER } from './cards'
import { AUTONOMY_LABEL, type RobodexCard, type RobodexTrigger } from './types'

export interface RobodexHint {
  text: string
  href: string
}

export interface RobodexCardView {
  id: string
  world: string
  name: string
  emoji: string
  type: string
  front: string
  story: string
  facts: readonly string[]
  howItWorks: string
  specs: { dof: string; sensors: readonly string[]; autonomy: string; autonomyLong: string; power: string }
  realExamples: string
  robotSlug: string | null
  builders: string
  makers: { id: string; name: string; role: string }[]
  hints: RobodexHint[]
}

export interface RobodexWorldView {
  id: string
  name: string
  emoji: string
  gradient: string
}

const worldName = (id: string) => WORLDS.find((w) => w.id === id)?.name ?? id

export function triggerHint(t: RobodexTrigger): RobodexHint | null {
  switch (t.kind) {
    case 'activity': {
      const a = ALL_ACTIVITIES.find((x) => x.id === t.ids[0])
      if (!a) return null
      return { text: `Finish the mission “${a.title}”${t.ids.length > 1 ? ' (or a similar one)' : ''}`, href: `/kids/galaxy/${a.track}/${a.id}` }
    }
    case 'world':
      return { text: `Finish ${t.count} mission${t.count === 1 ? '' : 's'} in ${worldName(t.world)}`, href: `/kids/worlds/${t.world}` }
    case 'game': {
      const g = GAMES.find((x) => x.id === t.game)
      if (!g) return null
      const tier = t.tier ?? 0
      return { text: tier > 0 ? `Finish ${g.name} at ${TIER_NAMES[tier]} level` : `Play a round of ${g.name}`, href: `/kids/play/${g.id}` }
    }
    case 'story': {
      const e = EPISODES.find((x) => x.slug === t.slug)
      return e ? { text: `Watch the story “${e.title}”`, href: `/kids/stories/${e.slug}` } : null
    }
    case 'concept':
      return { text: `Make “${CONCEPT_INFO[t.concept].name}” secure in the Skill Galaxy`, href: '/kids/galaxy/concepts' }
  }
}

export function cardView(c: RobodexCard): RobodexCardView {
  return {
    id: c.id,
    world: c.world,
    name: c.name,
    emoji: c.emoji,
    type: c.type,
    front: c.front,
    story: c.story,
    facts: c.facts,
    howItWorks: c.howItWorks,
    specs: { dof: c.specs.dof, sensors: c.specs.sensors, autonomy: AUTONOMY_LABEL[c.specs.autonomy].short, autonomyLong: AUTONOMY_LABEL[c.specs.autonomy].long, power: c.specs.power },
    realExamples: c.realExamples,
    robotSlug: c.robotSlug ?? null,
    builders: c.builders,
    makers: (c.makers ?? []).flatMap((id) => {
      const m = getMaker(id)
      return m ? [{ id: m.id, name: m.name, role: m.role }] : []
    }),
    hints: c.find.map(triggerHint).filter((h): h is RobodexHint => h !== null).slice(0, 3),
  }
}

export function robodexViews(): { cards: RobodexCardView[]; worlds: RobodexWorldView[] } {
  const worlds = ROBODEX_WORLD_ORDER.flatMap((id) => {
    const w = WORLDS.find((x) => x.id === id)
    return w ? [{ id: w.id, name: w.name, emoji: w.emoji, gradient: w.gradient }] : []
  })
  const order = new Map(ROBODEX_WORLD_ORDER.map((w, i) => [w, i]))
  const cards = [...ROBODEX_CARDS].sort((a, b) => (order.get(a.world) ?? 0) - (order.get(b.world) ?? 0) || a.n - b.n).map(cardView)
  return { cards, worlds }
}
