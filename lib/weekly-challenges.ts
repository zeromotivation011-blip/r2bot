// lib/weekly-challenges.ts
// The three rotating weekly challenges. ISO-week deterministic.

export type WeeklyChallenge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  bonusXp: number;
  cta: { label: string; href: string };
};

/** Returns the ISO-week string for "today", e.g., 2026-W21. */
export function currentISOWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const ALL_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'atlas_3_terms',
    emoji: '📚',
    title: 'Read 3 Atlas terms this week',
    description: 'Pick any 3 entries from the Atlas and read them end-to-end.',
    bonusXp: 50,
    cta: { label: 'Open the Atlas →', href: '/atlas' },
  },
  {
    id: 'academy_one_lesson',
    emoji: '🎓',
    title: 'Finish one Academy lesson',
    description: 'Complete any lesson across Spark / Wire / Forge / Edge.',
    bonusXp: 75,
    cta: { label: 'Browse Academy →', href: '/academy' },
  },
  {
    id: 'copilot_try',
    emoji: '🤖',
    title: 'Ask R2 Co-pilot anything',
    description: 'Open the /copilot page and ask one robotics question.',
    bonusXp: 25,
    cta: { label: 'Open R2 Co-pilot →', href: '/copilot' },
  },
  {
    id: 'world_map_visit',
    emoji: '🌍',
    title: 'Visit the World Robotics Map',
    description: "See India's robot density compared with global peers.",
    bonusXp: 25,
    cta: { label: 'Open World Map →', href: '/atlas' },
  },
  {
    id: 'famous_robot_vote',
    emoji: '🤖',
    title: 'Vote on a famous robot',
    description: 'Pick "Coolest" or "Creepiest" on any /robots/[slug] page.',
    bonusXp: 25,
    cta: { label: 'Open Famous Robots →', href: '/robots' },
  },
  {
    id: 'history_modal',
    emoji: '📅',
    title: 'Read a history milestone story',
    description: 'Open any milestone in the History timeline.',
    bonusXp: 25,
    cta: { label: 'Open History →', href: '/history' },
  },
];

/** Deterministic 3-challenge rotation for the current ISO week. */
export function currentChallenges(date = new Date()): WeeklyChallenge[] {
  const week = currentISOWeek(date);
  // Hash the ISO week to a stable offset.
  let h = 0;
  for (const ch of week) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const offset = Math.abs(h) % ALL_CHALLENGES.length;
  return [0, 1, 2].map((i) => ALL_CHALLENGES[(offset + i) % ALL_CHALLENGES.length]);
}
