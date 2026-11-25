// components/kids/universe/avatars.tsx
// The explorer avatars of the R2BOT Universe: six original characters every
// child can pick, plus the avatar unlocks from lib/kids/universe/rewards.ts
// (earned by levelling up, never bought). Pure SVG, no state — safe on the
// server and in client islands.

import { UNLOCKS } from '@/lib/kids/universe/rewards'

export interface AvatarDef {
  id: string
  name: string
  /** Unlock id from UNLOCKS that grants it; undefined = available to everyone. */
  unlock?: string
}

export const AVATARS: AvatarDef[] = [
  { id: 'astro', name: 'Astronaut' },
  { id: 'bot', name: 'Bolt-bot' },
  { id: 'rover', name: 'Rover' },
  { id: 'drone', name: 'Drone pal' },
  { id: 'owl', name: 'Robo-owl' },
  { id: 'comet', name: 'Comet pilot' },
  { id: 'robo-cat', name: 'Robo-Cat', unlock: 'avatar-robo-cat' },
  { id: 'astro-gold', name: 'Gold astronaut', unlock: 'avatar-astronaut-gold' },
]

export interface ColourDef {
  id: string
  name: string
  value: string
  /** Paint unlock id that grants it; undefined = available to everyone. */
  unlock?: string
}

const BASE_COLOURS: ColourDef[] = [
  { id: 'orange', name: 'R2BOT orange', value: '#FC6818' },
  { id: 'cyan', name: 'Sensor cyan', value: '#00B8D4' },
  { id: 'green', name: 'Go green', value: '#22C55E' },
  { id: 'blue', name: 'Sky blue', value: '#3B82F6' },
  { id: 'pink', name: 'Bubblegum', value: '#EC4899' },
  { id: 'yellow', name: 'Sunny', value: '#FACC15' },
]

/** Six colours for everyone + the paints a child earns (same unlocks as their robot). */
export const AVATAR_COLOURS: ColourDef[] = [
  ...BASE_COLOURS,
  ...UNLOCKS.filter((u) => u.kind === 'paint' && u.value).map((u) => ({ id: u.id, name: u.name, value: u.value as string, unlock: u.id })),
]

/** How a locked avatar or colour is earned, said in a child's words. */
export function unlockHint(unlockId: string | undefined): string {
  const u = UNLOCKS.find((x) => x.id === unlockId)
  if (!u) return ''
  if (u.atLevel) return `Reach level ${u.atLevel}`
  if (u.byBadge) return 'Earn a badge'
  return 'Keep exploring'
}

export function isOwned(unlockId: string | undefined, unlocks: string[]): boolean {
  return !unlockId || unlocks.includes(unlockId)
}

/** Darken/lighten a hex colour by `amt` (-1..1). */
function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt),
  )
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** One avatar, drawn at any size. `title` makes it an image for assistive tech; omit for decoration. */
export function Avatar({ id, color, size = 64, title }: { id: string; color: string; size?: number; title?: string }) {
  const c = color
  const dark = shade(color, -0.45)
  const light = shade(color, 0.45)
  const gid = `av-${id}-${color.replace('#', '')}`
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="block"
    >
      <defs>
        <radialGradient id={`${gid}-bg`} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor={light} stopOpacity=".55" />
          <stop offset="1" stopColor={dark} stopOpacity=".9" />
        </radialGradient>
        <linearGradient id={`${gid}-visor`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#67E8F9" />
          <stop offset="1" stopColor="#0E7490" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${gid}-bg)`} />
      <circle cx="32" cy="32" r="30.5" fill="none" stroke="#fff" strokeOpacity=".18" />
      {renderFace(id, c, dark, light, gid)}
    </svg>
  )
}

function renderFace(id: string, c: string, dark: string, light: string, gid: string) {
  switch (id) {
    case 'bot':
      return (
        <g>
          <line x1="32" y1="9" x2="32" y2="17" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="8" r="3.5" fill="#FF8A4C" />
          <rect x="13" y="17" width="38" height="32" rx="12" fill={c} />
          <rect x="13" y="17" width="38" height="10" rx="6" fill="#fff" opacity=".18" />
          <rect x="18" y="24" width="28" height="17" rx="8" fill="#0A1120" />
          <circle cx="26" cy="32.5" r="4" fill="#67E8F9" />
          <circle cx="38" cy="32.5" r="4" fill="#67E8F9" />
          <circle cx="27.3" cy="31.2" r="1.3" fill="#fff" />
          <circle cx="39.3" cy="31.2" r="1.3" fill="#fff" />
          <rect x="9" y="28" width="5" height="10" rx="2.5" fill={dark} />
          <rect x="50" y="28" width="5" height="10" rx="2.5" fill={dark} />
          <path d="M26 45 q6 3 12 0" stroke="#0A1120" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="22" y="51" width="20" height="8" rx="3" fill={dark} />
        </g>
      )
    case 'rover':
      return (
        <g>
          <path d="M44 10 a10 10 0 0 1 10 10" stroke="#CBD5E1" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="44" cy="19" r="3" fill="#CBD5E1" />
          <line x1="44" y1="19" x2="40" y2="23" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="12" y="22" width="40" height="24" rx="7" fill={c} />
          <rect x="16" y="27" width="32" height="10" rx="5" fill="#0A1120" />
          <rect x="19" y="29.5" width="26" height="5" rx="2.5" fill={`url(#${gid}-visor)`} />
          <rect x="20" y="40" width="4" height="3" rx="1" fill={light} />
          <rect x="27" y="40" width="4" height="3" rx="1" fill={light} />
          <rect x="34" y="40" width="4" height="3" rx="1" fill={light} />
          <circle cx="20" cy="52" r="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          <circle cx="44" cy="52" r="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          <circle cx="32" cy="52" r="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
        </g>
      )
    case 'drone':
      return (
        <g>
          <rect x="8" y="14" width="18" height="3" rx="1.5" fill="#CBD5E1" />
          <rect x="38" y="14" width="18" height="3" rx="1.5" fill="#CBD5E1" />
          <rect x="15.5" y="15" width="3" height="10" fill="#94A3B8" />
          <rect x="45.5" y="15" width="3" height="10" fill="#94A3B8" />
          <ellipse cx="32" cy="36" rx="19" ry="15" fill={c} />
          <ellipse cx="32" cy="30" rx="13" ry="5" fill="#fff" opacity=".2" />
          <circle cx="32" cy="37" r="8" fill="#0A1120" />
          <circle cx="32" cy="37" r="5" fill={`url(#${gid}-visor)`} />
          <circle cx="33.8" cy="35.2" r="1.6" fill="#fff" />
          <line x1="24" y1="50" x2="21" y2="56" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="50" x2="43" y2="56" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="17" cy="24" r="2" fill="#22C55E" />
          <circle cx="47" cy="24" r="2" fill="#EF4444" />
        </g>
      )
    case 'owl':
      return (
        <g>
          <path d="M14 18 L20 26 L12 28 Z" fill={dark} />
          <path d="M50 18 L44 26 L52 28 Z" fill={dark} />
          <rect x="12" y="20" width="40" height="36" rx="18" fill={c} />
          <path d="M20 50 q12 8 24 0 v4 q-12 6 -24 0 z" fill={light} opacity=".5" />
          <circle cx="24" cy="34" r="8.5" fill="#E2E8F0" />
          <circle cx="40" cy="34" r="8.5" fill="#E2E8F0" />
          <circle cx="24" cy="34" r="5.5" fill="#0A1120" />
          <circle cx="40" cy="34" r="5.5" fill="#0A1120" />
          <circle cx="24" cy="34" r="3" fill="#FACC15" />
          <circle cx="40" cy="34" r="3" fill="#FACC15" />
          <circle cx="25" cy="32.6" r="1.1" fill="#fff" />
          <circle cx="41" cy="32.6" r="1.1" fill="#fff" />
          <path d="M29 42 L35 42 L32 47 Z" fill="#FF8A4C" />
        </g>
      )
    case 'comet':
      return (
        <g>
          <path d="M32 4 L38 16 L26 16 Z" fill="#FF8A4C" />
          <circle cx="32" cy="34" r="21" fill={c} />
          <path d="M14 30 a18 18 0 0 1 36 0" fill="#fff" opacity=".16" />
          <path d="M16 33 q16 -10 32 0 v6 q-16 8 -32 0 z" fill="#0A1120" />
          <path d="M19 34 q13 -7 26 0 v3 q-13 6 -26 0 z" fill={`url(#${gid}-visor)`} />
          <path d="M22 33 l6 -2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
          <rect x="9" y="30" width="5" height="12" rx="2.5" fill={dark} />
          <rect x="50" y="30" width="5" height="12" rx="2.5" fill={dark} />
          <path d="M27 49 q5 3 10 0" stroke="#0A1120" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'robo-cat':
      return (
        <g>
          <path d="M14 26 L18 8 L28 20 Z" fill={c} />
          <path d="M50 26 L46 8 L36 20 Z" fill={c} />
          <path d="M17 22 L19 13 L24 19 Z" fill="#FDA4AF" />
          <path d="M47 22 L45 13 L40 19 Z" fill="#FDA4AF" />
          <circle cx="32" cy="36" r="20" fill={c} />
          <rect x="17" y="28" width="30" height="16" rx="8" fill="#0A1120" />
          <ellipse cx="25" cy="36" rx="3.6" ry="4.6" fill="#A3E635" />
          <ellipse cx="39" cy="36" rx="3.6" ry="4.6" fill="#A3E635" />
          <rect x="24.2" y="32" width="1.6" height="8" rx=".8" fill="#0A1120" />
          <rect x="38.2" y="32" width="1.6" height="8" rx=".8" fill="#0A1120" />
          <path d="M30 47 L34 47 L32 49.5 Z" fill="#FDA4AF" />
          <path d="M10 46 h10 M10 50 h10 M44 46 h10 M44 50 h10" stroke="#E2E8F0" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )
    case 'astro-gold':
      return (
        <g>
          <circle cx="32" cy="32" r="22" fill="#FDE68A" />
          <circle cx="32" cy="32" r="22" fill="none" stroke="#CA8A04" strokeWidth="2.5" />
          <rect x="15" y="21" width="34" height="23" rx="11.5" fill="#0A1120" />
          <rect x="17" y="23" width="30" height="19" rx="9.5" fill={`url(#${gid}-gold)`} />
          <defs>
            <linearGradient id={`${gid}-gold`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#FDE047" />
              <stop offset=".5" stopColor="#EAB308" />
              <stop offset="1" stopColor="#713F12" />
            </linearGradient>
          </defs>
          <path d="M21 27 q4 -3 9 -2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".9" />
          <circle cx="32" cy="11" r="3" fill={c} />
          <rect x="22" y="52" width="20" height="6" rx="3" fill="#CA8A04" />
          <circle cx="32" cy="55" r="2" fill={c} />
        </g>
      )
    case 'astro':
    default:
      return (
        <g>
          <circle cx="32" cy="32" r="22" fill="#F1F5F9" />
          <circle cx="32" cy="32" r="22" fill="none" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="15" y="21" width="34" height="23" rx="11.5" fill="#0A1120" />
          <rect x="17" y="23" width="30" height="19" rx="9.5" fill={`url(#${gid}-visor)`} />
          <path d="M21 27 q4 -3 9 -2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".9" />
          <rect x="8" y="27" width="5" height="12" rx="2.5" fill={c} />
          <rect x="51" y="27" width="5" height="12" rx="2.5" fill={c} />
          <rect x="22" y="52" width="20" height="6" rx="3" fill={c} />
          <circle cx="32" cy="55" r="1.8" fill="#fff" />
        </g>
      )
  }
}
