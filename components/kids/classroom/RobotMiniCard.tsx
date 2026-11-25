// components/kids/classroom/RobotMiniCard.tsx
// A tiny card for the robot a child built in the Workshop, from its design
// code. No hooks — usable anywhere.

import { robotSummary } from '@/lib/kids/classroom'

export function RobotMiniCard({ code }: { code: string | null }) {
  const r = robotSummary(code)
  if (!r) return <span className="text-sm text-slate-500">Not built yet</span>
  const label = `${r.name}: ${r.parts.map((p) => p.name).join(', ')}`
  return (
    <div className="flex min-w-[10rem] items-center gap-2" title={label}>
      {/* Colours are the child's own choice, so they are runtime values. */}
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 text-base"
        style={{ background: r.primary, borderColor: r.accent }}
        aria-hidden
      >
        🤖
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white">{r.name}</span>
        <span className="block text-sm leading-tight" aria-label={label}>
          {r.parts.map((p) => (
            <span key={p.slot} aria-hidden>{p.emoji}</span>
          ))}
        </span>
      </span>
    </div>
  )
}
