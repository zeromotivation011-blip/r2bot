// components/kids/teach/ShareToClassroom.tsx
//
// "Share to Google Classroom" — the official share link
// (https://classroom.google.com/share?url=…), so no API key, no script and no
// tracking: it is a plain link that opens Classroom in a new tab, where the
// teacher picks the class and posts it as an assignment or material.
// Works in server and client components (no hooks, no 'use client').
//
//   <ShareToClassroom path="/kids/galaxy/motion/motion-spin-turn" title="Spin turn" />

const SITE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://www.r2bot.in'

export function googleClassroomShareUrl(path: string, title?: string): string {
  const url = /^https?:\/\//.test(path) ? path : `${SITE}${path.startsWith('/') ? path : `/${path}`}`
  const q = new URLSearchParams({ url })
  if (title) q.set('title', title.slice(0, 120))
  return `https://classroom.google.com/share?${q.toString()}`
}

export interface ShareToClassroomProps {
  /** Site path ("/kids/teach/1/5") or a full URL. */
  path: string
  /** Suggested post title. */
  title?: string
  /** 'button' (default) or a compact 'chip' for lists. */
  variant?: 'button' | 'chip'
  className?: string
}

function ClassroomIcon({ size }: { size: number }) {
  // Simplified Classroom mark: a board with a person (not the trademark artwork).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="2" y="4" width="20" height="15" rx="2" fill="#1E8E3E" />
      <rect x="4" y="6" width="16" height="11" rx="1" fill="#34A853" />
      <circle cx="12" cy="10" r="2.2" fill="#fff" />
      <path d="M8 15.5c.6-2 2.1-3 4-3s3.4 1 4 3" fill="#fff" />
      <rect x="14" y="19" width="6" height="1.6" rx=".8" fill="#FBBC04" />
    </svg>
  )
}

export function ShareToClassroom({ path, title, variant = 'button', className = '' }: ShareToClassroomProps) {
  const href = googleClassroomShareUrl(path, title)
  const base = variant === 'chip'
    ? 'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-semibold text-slate-100 hover:border-emerald-400/50 hover:bg-emerald-500/10'
    : 'inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 font-bold text-white hover:border-emerald-400/60 hover:bg-emerald-500/10'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 print:hidden ${className}`}
      aria-label={`Share${title ? ` “${title}”` : ''} to Google Classroom (opens in a new tab)`}
    >
      <ClassroomIcon size={variant === 'chip' ? 18 : 20} />
      <span>{variant === 'chip' ? 'Classroom' : 'Share to Google Classroom'}</span>
    </a>
  )
}

export default ShareToClassroom
