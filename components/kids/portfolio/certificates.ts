// components/kids/portfolio/certificates.ts
// Certificates for everything (roadmap #45): one per course level, one per
// World ("Ocean Lab Specialist"), and milestones (Rank, home builds, Robodex,
// secured concepts, a complete badge track). Each lists the skills it shows.
// Pure: decides what is earned from `CertEvidence`, which the portfolio reads
// from the existing stores on the device. Never ranks or compares children:
// every child who does the work earns the same certificate.

import { UNIVERSE_BADGES, type BadgeTrack } from '@/lib/kids/universe/rewards'

export type CertGroup = 'level' | 'world' | 'milestone'

export interface WorldInfo {
  id: string
  name: string
  emoji: string
  /** Activity ids in this world (from the server: byWorld). */
  activityIds: string[]
  game: string
}

/** What the device knows. Built by the portfolio from the stores; pure data here. */
export interface CertEvidence {
  /** Course sessions finished per level (1–4). */
  sessions: Record<1 | 2 | 3 | 4, number>
  /** World id → Skill Galaxy activities finished there, and whether its flagship game has a finished round. */
  worlds: Record<string, { done: number; game: boolean }>
  rank: number
  /** Home builds checked in, with their Skill Galaxy track names. */
  builds: number
  buildTracks: string[]
  totalBuilds: number
  robodex: number
  totalRobodex: number
  conceptsSecured: number
  /** Badge id → day earned. */
  badges: Record<string, string>
}

export interface CertificateDef {
  id: string
  group: CertGroup
  title: string
  icon: string
  /** The line under the title: what was done. */
  earnedFor: string
  /** Skills shown (static), printed on the certificate. */
  skills: string[]
  /** For course levels: the level, so the curriculum's own wording is used. */
  level?: 1 | 2 | 3 | 4
  progress: (e: CertEvidence) => { have: number; need: number }
  /** Skills worked out from the child's own record (milestones). */
  liveSkills?: (e: CertEvidence) => string[]
}

export const SESSIONS_PER_LEVEL = 24
/** Activities in one World needed for its certificate: one band's set (each World has six per band). */
export const WORLD_ACTIVITIES_NEEDED = 6

const LEVEL_CERTS: { level: 1 | 2 | 3 | 4; title: string; icon: string; skills: string[] }[] = [
  { level: 1, title: 'Explorer', icon: '🌱', skills: ['Gives a robot step-by-step instructions', 'Repeats them with a loop', 'Finds and fixes bugs', 'Uses a sensor to keep people safe'] },
  { level: 2, title: 'Builder', icon: '🔧', skills: ['Measures and steers precisely', 'Follows lines with if / else', 'Chooses parts from a fair test', 'Tests a program until it is reliable', 'Designs for the people who use it'] },
  { level: 3, title: 'Inventor', icon: '💡', skills: ['Uses variables and maths in programs', 'Calibrates sensors', 'Tunes a proportional controller', 'Structures behaviour as states', 'Logs and summarises data'] },
  { level: 4, title: 'Engineer', icon: '🚀', skills: ['Measures and models a robot', 'Tunes P, I and D control', 'Builds maps and plans paths', 'Tests systematically and detects faults', 'Argues for safety and ethics with evidence'] },
]

/** Three skills each World's certificate names (what its activities and flagship game practise). */
export const WORLD_SKILLS: Record<string, string[]> = {
  guardians: ['Spots physical hazards around robots', 'Checks data, fairness and human control', 'Weighs a robot’s effect on people and the planet'],
  ocean: ['Explains buoyancy and pressure', 'Uses sonar and echoes to measure distance', 'Compares tethered and autonomous robots'],
  zoo: ['Copies tricks from nature (biomimicry)', 'Reasons about balance and gait', 'Compares legs, wheels and soft bodies'],
  hospital: ['Scales and steadies precise motion', 'Explains muscle-controlled prosthetic hands', 'Puts safety limits on medical robots'],
  farm: ['Decides with soil and colour sensors', 'Plans drone coverage paths', 'Trades off yield, water and energy'],
  city: ['Applies right-of-way and stopping rules', 'Times traffic signals', 'Coordinates many robots safely'],
  station: ['Explains motion without friction', 'Plans slow, precise robot-arm approaches', 'Works with signal delay and teleoperation'],
}

const TRACK_NAMES: Record<BadgeTrack, string> = {
  motion: 'Motion', sensing: 'Sensing', logic: 'Logic and code', control: 'Control', mechanics: 'Mechanics', electronics: 'Electronics',
  ai: 'AI and maps', design: 'Design', explorer: 'Exploring', grit: 'Grit', careers: 'Robotics careers',
}

/** Skill-track names shown by the child's badges, in a fixed order (never ranked). */
export function badgeTrackSkills(badges: Record<string, string>): string[] {
  const tracks = new Set(UNIVERSE_BADGES.filter((b) => badges[b.id]).map((b) => b.track))
  return (Object.keys(TRACK_NAMES) as BadgeTrack[]).filter((t) => tracks.has(t)).map((t) => TRACK_NAMES[t])
}

const RANKS = [5, 10, 20, 30, 40, 50, 60]
const BUILD_STEPS = [1, 5, 10, 20]
const ROBODEX_STEPS = [10, 30]
const CONCEPT_STEPS = [5, 15]

export function certificateCatalogue(worlds: readonly WorldInfo[]): CertificateDef[] {
  const out: CertificateDef[] = []
  for (const l of LEVEL_CERTS) {
    out.push({
      id: `level-${l.level}`, group: 'level', level: l.level, title: `Level ${l.level} ${l.title}`, icon: l.icon,
      earnedFor: `finished all ${SESSIONS_PER_LEVEL} sessions of Level ${l.level}`, skills: l.skills,
      progress: (e) => ({ have: Math.min(e.sessions[l.level], SESSIONS_PER_LEVEL), need: SESSIONS_PER_LEVEL }),
    })
  }
  for (const w of worlds) {
    const need = Math.min(WORLD_ACTIVITIES_NEEDED, w.activityIds.length) + 1
    out.push({
      id: `world-${w.id}`, group: 'world', title: `${w.name} Specialist`, icon: w.emoji,
      earnedFor: `finished ${need - 1} ${w.name} missions and played its flagship game`, skills: WORLD_SKILLS[w.id] ?? [],
      progress: (e) => {
        const p = e.worlds[w.id] ?? { done: 0, game: false }
        return { have: Math.min(p.done, need - 1) + (p.game ? 1 : 0), need }
      },
    })
  }
  for (const r of RANKS) {
    out.push({
      id: `rank-${r}`, group: 'milestone', title: `Rank ${r}`, icon: '⭐', earnedFor: `reached Rank ${r} by learning and making`, skills: [],
      progress: (e) => ({ have: Math.min(e.rank, r), need: r }), liveSkills: (e) => badgeTrackSkills(e.badges),
    })
  }
  for (const n of BUILD_STEPS) {
    out.push({
      id: `builds-${n}`, group: 'milestone', title: n === 1 ? 'First Home Build' : `${n} Home Builds`, icon: '🛠️',
      earnedFor: n === 1 ? 'built a real robotics idea at home and explained it' : `built ${n} robotics ideas at home and explained each one`,
      skills: ['Follows build steps safely with a grown-up', 'Runs a fair test: changes one thing'],
      progress: (e) => ({ have: Math.min(e.builds, n), need: n }), liveSkills: (e) => e.buildTracks,
    })
  }
  out.push({
    id: 'builds-all', group: 'milestone', title: 'Master Maker', icon: '🏆', earnedFor: 'built every Make It at Home project',
    skills: ['Follows build steps safely with a grown-up', 'Runs a fair test: changes one thing'],
    progress: (e) => ({ have: Math.min(e.builds, e.totalBuilds), need: Math.max(1, e.totalBuilds) }), liveSkills: (e) => e.buildTracks,
  })
  for (const n of ROBODEX_STEPS) {
    out.push({
      id: `robodex-${n}`, group: 'milestone', title: `Robodex: ${n} Real Robots`, icon: '📇', earnedFor: `discovered ${n} real robots by playing`,
      skills: ['Explains what real robots do and how they sense', 'Connects robots to the jobs people do with them'],
      progress: (e) => ({ have: Math.min(e.robodex, n), need: n }),
    })
  }
  out.push({
    id: 'robodex-all', group: 'milestone', title: 'Complete Robodex', icon: '🗂️', earnedFor: 'discovered every real robot in the Robodex',
    skills: ['Explains what real robots do and how they sense', 'Connects robots to the jobs people do with them'],
    progress: (e) => ({ have: Math.min(e.robodex, e.totalRobodex), need: Math.max(1, e.totalRobodex) }),
  })
  for (const n of CONCEPT_STEPS) {
    out.push({
      id: `concepts-${n}`, group: 'milestone', title: `${n} Secure Ideas`, icon: '✨', earnedFor: `made ${n} big robotics ideas secure (first try, on different missions)`,
      skills: ['Remembers ideas over weeks, not just today', 'Uses each idea in different kinds of missions'],
      progress: (e) => ({ have: Math.min(e.conceptsSecured, n), need: n }),
    })
  }
  const byTrack = new Map<BadgeTrack, string[]>()
  for (const b of UNIVERSE_BADGES) byTrack.set(b.track, [...(byTrack.get(b.track) ?? []), b.id])
  for (const [track, ids] of byTrack) {
    if (ids.length < 2) continue
    out.push({
      id: `track-${track}`, group: 'milestone', title: `${TRACK_NAMES[track]}: Every Badge`, icon: '🏅',
      earnedFor: `earned every ${TRACK_NAMES[track].toLowerCase()} badge`,
      skills: UNIVERSE_BADGES.filter((b) => b.track === track).map((b) => b.name),
      progress: (e) => ({ have: ids.filter((id) => e.badges[id]).length, need: ids.length }),
    })
  }
  return out
}

export function isEarned(c: CertificateDef, e: CertEvidence): boolean {
  const p = c.progress(e)
  return p.have >= p.need
}

export function skillsFor(c: CertificateDef, e: CertEvidence | null): string[] {
  const live = e && c.liveSkills ? c.liveSkills(e) : []
  return [...c.skills, ...live].slice(0, 8)
}
