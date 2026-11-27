// lib/kids/universe/unlocks.ts
// Everything a child can unlock in the R2BOT Universe: an unlock at EVERY level
// from 1 to 60 (roadmap #10), plus the looks earned by badges. Earned by doing
// things, never bought. lib/kids/universe/rewards.ts grants them;
// rewards.verify.ts fails if any level 1..MAX_LEVEL has no unlock.
//
// Kinds and where they show:
//   paint  — the robot's colour (Hangar, Workshop, AR) and the avatar colour
//   decal / trail / skin — Hangar looks (art in components/kids/hangar/looks.ts)
//   avatar — explorer avatars (art in components/kids/universe/avatars.tsx)
//   sound  — a sound pack
//   title  — an explorer title the child can wear beside their name
// New decals, trails, skins and avatars need art first, so the level ladder
// past 25 is paints and titles: both work everywhere without new art.

export interface Unlock {
  id: string
  kind: 'paint' | 'decal' | 'trail' | 'skin' | 'avatar' | 'sound' | 'title'
  name: string
  /** Earned at this player level… */
  atLevel?: number
  /** …or by this badge. */
  byBadge?: string
  /** For paints: the colour. */
  value?: string
}

const paint = (atLevel: number, id: string, name: string, value: string): Unlock => ({ id: `paint-${id}`, kind: 'paint', name, atLevel, value })
const title = (atLevel: number, id: string, name: string): Unlock => ({ id: `title-${id}`, kind: 'title', name, atLevel })

export const UNLOCKS: Unlock[] = [
  // ── The first 25 levels (ids kept from Nov 2026: children already own them) ──
  title(1, 'explorer', 'Universe Explorer'),
  { id: 'paint-neon-lime', kind: 'paint', name: 'Neon Lime', atLevel: 2, value: '#A3E635' },
  { id: 'paint-ocean', kind: 'paint', name: 'Deep Ocean', atLevel: 3, value: '#0EA5E9' },
  { id: 'trail-sparkle', kind: 'trail', name: 'Sparkle Trail', atLevel: 4 },
  { id: 'paint-galaxy', kind: 'paint', name: 'Galaxy Purple', atLevel: 5, value: '#7C3AED' },
  { id: 'avatar-robo-cat', kind: 'avatar', name: 'Robo-Cat helmet', atLevel: 6 },
  paint(7, 'mint', 'Mint Circuit', '#34D399'),
  { id: 'paint-lava', kind: 'paint', name: 'Lava Red', atLevel: 8, value: '#DC2626' },
  title(9, 'gear-spinner', 'Gear Spinner'),
  { id: 'sound-retro', kind: 'sound', name: 'Retro beeps', atLevel: 10 },
  paint(11, 'coral', 'Sunrise Coral', '#FB7185'),
  { id: 'trail-rainbow', kind: 'trail', name: 'Rainbow Trail', atLevel: 12 },
  title(13, 'wire-wizard', 'Wire Wizard'),
  paint(14, 'arctic', 'Arctic Ice', '#A5F3FC'),
  { id: 'paint-gold', kind: 'paint', name: 'Champion Gold', atLevel: 15, value: '#EAB308' },
  title(16, 'sensor-sleuth', 'Sensor Sleuth'),
  paint(17, 'jungle', 'Jungle Green', '#15803D'),
  title(18, 'loop-runner', 'Loop Runner'),
  paint(19, 'midnight', 'Midnight Blue', '#1E3A8A'),
  { id: 'avatar-astronaut-gold', kind: 'avatar', name: 'Gold astronaut suit', atLevel: 20 },
  title(21, 'bug-squasher', 'Bug Squasher'),
  paint(22, 'tangerine', 'Tangerine', '#FB923C'),
  title(23, 'motor-maestro', 'Motor Maestro'),
  paint(24, 'lavender', 'Lavender Bot', '#C4B5FD'),
  { id: 'paint-chrome', kind: 'paint', name: 'Chrome', atLevel: 25, value: '#CBD5E1' },
  // ── Levels 26–60: teen-credible paints and titles ──
  title(26, 'path-finder', 'Path Finder'),
  paint(27, 'ruby', 'Ruby', '#E11D48'),
  title(28, 'gripper-pro', 'Gripper Pro'),
  paint(29, 'reef', 'Teal Reef', '#0D9488'),
  title(30, 'feedback-fixer', 'Feedback Fixer'),
  paint(31, 'copper', 'Copper', '#B45309'),
  title(32, 'signal-reader', 'Signal Reader'),
  paint(33, 'glacier', 'Glacier White', '#F1F5F9'),
  title(34, 'joint-planner', 'Joint Planner'),
  paint(35, 'carbon', 'Carbon Black', '#1F2937'),
  title(36, 'swarm-strategist', 'Swarm Strategist'),
  paint(37, 'electric', 'Electric Blue', '#2563EB'),
  title(38, 'vision-trainer', 'Vision Trainer'),
  paint(39, 'rose-gold', 'Rose Gold', '#E7A79A'),
  title(40, 'control-engineer', 'Control Engineer'),
  paint(41, 'stealth', 'Stealth Grey', '#4B5563'),
  title(42, 'pid-whisperer', 'PID Whisperer'),
  paint(43, 'magenta', 'Magenta Pulse', '#DB2777'),
  title(44, 'sensor-fusion', 'Sensor Fusion Pro'),
  paint(45, 'titanium', 'Titanium', '#94A3B8'),
  title(46, 'path-planner', 'Path Planner'),
  paint(47, 'deep-space', 'Deep Space', '#0F172A'),
  title(48, 'robot-architect', 'Robot Architect'),
  paint(49, 'martian-rust', 'Martian Rust', '#9A3412'),
  title(50, 'systems-thinker', 'Systems Thinker'),
  paint(51, 'nebula', 'Nebula Pink', '#F472B6'),
  title(52, 'autonomy-ace', 'Autonomy Ace'),
  paint(53, 'moonstone', 'Moonstone', '#A8A29E'),
  title(54, 'field-roboticist', 'Field Roboticist'),
  paint(55, 'platinum', 'Platinum', '#E5E7EB'),
  title(56, 'mission-engineer', 'Mission Engineer'),
  paint(57, 'supernova', 'Supernova', '#FDE047'),
  title(58, 'research-pioneer', 'Research Pioneer'),
  paint(59, 'quantum', 'Quantum Cyan', '#22D3EE'),
  title(60, 'r2bot-legend', 'R2BOT Legend'),
  // ── Earned by badges ──
  { id: 'decal-lightning', kind: 'decal', name: 'Lightning Bolt', byBadge: 'first-drive' },
  { id: 'decal-eye', kind: 'decal', name: 'Sensor Eye', byBadge: 'wall-whisperer' },
  { id: 'decal-wave', kind: 'decal', name: 'Line Wave', byBadge: 'line-rider' },
  { id: 'decal-gear', kind: 'decal', name: 'Golden Gear', byBadge: 'gear-head' },
  { id: 'trail-plasma', kind: 'trail', name: 'Plasma Trail', byBadge: 'pid-tuner' },
  { id: 'skin-mars', kind: 'skin', name: 'Mars Dust Skin', byBadge: 'mars-planner' },
  { id: 'skin-circuit', kind: 'skin', name: 'Circuit Board Skin', byBadge: 'circuit-closer' },
]

/** The unlocks granted by reaching exactly this level. */
export function unlocksAtLevel(level: number): Unlock[] {
  return UNLOCKS.filter((u) => u.atLevel === level)
}

/** A short "what you can do with it" line for the level-up ceremony and toasts. */
export function unlockUse(u: Unlock): string {
  switch (u.kind) {
    case 'paint':
      return 'A new paint for your robot.'
    case 'decal':
      return 'A new decal for your robot.'
    case 'trail':
      return 'A new trail for your robot.'
    case 'skin':
      return 'A new skin for your robot.'
    case 'avatar':
      return 'A new explorer avatar.'
    case 'sound':
      return 'A new sound pack.'
    case 'title':
      return 'A new explorer title you can wear.'
  }
}

/** The best (highest-level) title the child owns, or null. */
export function bestTitle(unlockIds: readonly string[]): Unlock | null {
  const owned = new Set(unlockIds)
  let best: Unlock | null = null
  for (const u of UNLOCKS) if (u.kind === 'title' && owned.has(u.id) && (!best || (u.atLevel ?? 0) > (best.atLevel ?? 0))) best = u
  return best
}
