// components/kids/makers/MakerAvatar.tsx — a Maker's portrait, drawn in SVG
// from lib/kids/makers/makers.ts MakerLook (skin, hair, headscarf, glasses,
// hearing aids, a wheelchair, a bionic hand). Server-safe (no hooks), so it
// renders in the server HTML. Decorative unless `label` is given.

import type { MakerLook } from '@/lib/kids/makers/makers'

export interface MakerAvatarProps {
  look: MakerLook
  size?: number
  /** Accessible name; omit when the name is printed next to it. */
  label?: string
  className?: string
}

function Hair({ look }: { look: MakerLook }) {
  const c = look.hairColor
  switch (look.hair) {
    case 'short':
      return <path d="M37 50c0-15 10-24 23-24s23 9 23 24c-4-7-11-11-23-11s-19 4-23 11z" fill={c} />
    case 'curly':
      return (
        <g fill={c}>
          {[[40, 40], [48, 32], [58, 28], [68, 30], [77, 36], [82, 46], [38, 49]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="8" />
          ))}
        </g>
      )
    case 'long':
      return (
        <g fill={c}>
          <path d="M36 52c0-17 10-26 24-26s24 9 24 26v30c-5 2-9 2-12 0V50c-4-6-8-9-12-9s-8 3-12 9v32c-3 2-7 2-12 0z" />
        </g>
      )
    case 'bun':
      return (
        <g fill={c}>
          <circle cx="60" cy="23" r="9" />
          <path d="M37 50c0-15 10-24 23-24s23 9 23 24c-4-7-11-11-23-11s-19 4-23 11z" />
        </g>
      )
    case 'braids':
      return (
        <g fill={c}>
          <path d="M37 50c0-15 10-24 23-24s23 9 23 24c-4-7-11-11-23-11s-19 4-23 11z" />
          <rect x="35" y="48" width="6" height="34" rx="3" />
          <rect x="79" y="48" width="6" height="34" rx="3" />
        </g>
      )
    case 'afro':
      return <circle cx="60" cy="44" r="31" fill={c} />
    case 'ponytail':
      return (
        <g fill={c}>
          <ellipse cx="85" cy="52" rx="7" ry="15" />
          <path d="M37 50c0-15 10-24 23-24s23 9 23 24c-4-7-11-11-23-11s-19 4-23 11z" />
        </g>
      )
    default:
      return null
  }
}

/** A short, stable id per look, so several portraits on one page never share a clipPath id. */
function lookId(look: MakerLook): string {
  const s = JSON.stringify(look)
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return `maker-clip-${(h >>> 0).toString(36)}`
}

export function MakerAvatar({ look, size = 96, label, className }: MakerAvatarProps) {
  const clip = lookId(look)
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} {...a11y}>
      <circle cx="60" cy="60" r="58" fill="#19263F" stroke={look.outfit} strokeWidth="3" />
      <clipPath id={clip}>
        <circle cx="60" cy="60" r="56" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {look.hair === 'afro' && <Hair look={look} />}
        {look.headscarf && <path d="M30 120V84c0-30 12-58 30-58s30 28 30 58v36z" fill={look.headscarf} />}
        {/* body */}
        <path d="M22 120c2-22 18-34 38-34s36 12 38 34z" fill={look.outfit} />
        <rect x="53" y="70" width="14" height="16" rx="5" fill={look.skin} />
        {/* head */}
        <circle cx="60" cy="54" r="21" fill={look.skin} />
        {!look.headscarf && look.hair !== 'afro' && <Hair look={look} />}
        {look.headscarf && <path d="M37 54c0-16 10-27 23-27s23 11 23 27c-3-10-11-17-23-17s-20 7-23 17z" fill={look.headscarf} />}
        {/* face */}
        <circle cx="52" cy="55" r="2.6" fill="#1A1103" />
        <circle cx="68" cy="55" r="2.6" fill="#1A1103" />
        <path d="M52 64c4 4 12 4 16 0" fill="none" stroke="#1A1103" strokeWidth="2.4" strokeLinecap="round" />
        {look.glasses && (
          <g fill="none" stroke="#EEF2F8" strokeWidth="2">
            <circle cx="52" cy="55" r="6.5" />
            <circle cx="68" cy="55" r="6.5" />
            <path d="M58.5 55h3" />
          </g>
        )}
        {look.hearingAid && <path d="M37 50c-4 1-5 7-1 9" fill="none" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" />}
        {look.bionicHand && (
          <g>
            <rect x="12" y="78" width="16" height="20" rx="6" fill="#94A3B8" />
            <rect x="12" y="70" width="4" height="10" rx="2" fill="#CBD5E1" />
            <rect x="17" y="68" width="4" height="12" rx="2" fill="#CBD5E1" />
            <rect x="22" y="70" width="4" height="10" rx="2" fill="#CBD5E1" />
            <circle cx="20" cy="88" r="2.5" fill="#00E5FF" />
          </g>
        )}
        {look.wheelchair && (
          <g fill="none" stroke="#EEF2F8" strokeWidth="3">
            <circle cx="92" cy="100" r="16" />
            <path d="M92 84v32M76 100h32" strokeWidth="1.5" />
          </g>
        )}
      </g>
    </svg>
  )
}

export default MakerAvatar
