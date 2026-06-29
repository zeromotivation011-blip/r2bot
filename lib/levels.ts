// lib/levels.ts
// XP → level mapping used across leaderboard and dashboard.

export type LevelInfo = {
  name: string;
  emoji: string;
  color: string;
  /** Inclusive minimum XP. */
  minXp: number;
  /** Exclusive maximum XP (or Infinity). */
  maxXp: number;
};

export const LEVELS: LevelInfo[] = [
  { name: 'Rookie', emoji: '🌱', color: '#94a3b8', minXp: 0, maxXp: 200 },
  { name: 'Apprentice', emoji: '🔧', color: '#22d3ee', minXp: 200, maxXp: 500 },
  { name: 'Engineer', emoji: '🦾', color: '#f59e0b', minXp: 500, maxXp: 1000 },
  { name: 'Expert', emoji: '🤖', color: '#a78bfa', minXp: 1000, maxXp: 2500 },
  { name: 'Master Builder', emoji: '👑', color: '#facc15', minXp: 2500, maxXp: Infinity },
];

export function getLevel(totalXp: number): LevelInfo {
  for (const l of LEVELS) {
    if (totalXp >= l.minXp && totalXp < l.maxXp) return l;
  }
  return LEVELS[LEVELS.length - 1];
}

export function progressToNext(totalXp: number): { pct: number; nextLevel: LevelInfo | null; xpToNext: number } {
  const current = getLevel(totalXp);
  const next = LEVELS.find((l) => l.minXp > current.minXp) ?? null;
  if (!next) return { pct: 100, nextLevel: null, xpToNext: 0 };
  const span = next.minXp - current.minXp;
  const into = totalXp - current.minXp;
  const pct = Math.max(0, Math.min(100, Math.round((into / span) * 100)));
  return { pct, nextLevel: next, xpToNext: Math.max(0, next.minXp - totalXp) };
}
