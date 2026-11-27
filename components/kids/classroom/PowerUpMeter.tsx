// components/kids/classroom/PowerUpMeter.tsx
//
// The ONE class meter of the Class Power-Up (roadmap #40), shared by the
// teacher's panel, the projector and the child's home card. Presentational
// only (no hooks), so it renders on the server or in any client component.
// Milestones change the class cosmetic: a glowing edge at 25%, the banner
// trim at 50%, a rocket trail at 75%, the class flag at 100%. Motion sits
// behind motion-safe: and the kids "less motion" setting.

import { GOAL_THEMES, MILESTONES, cosmeticLevel, type ClassGoal } from '@/lib/kids/classroom-goal'

export interface PowerUpMeterProps {
  goal: ClassGoal
  done: number
  size?: 'card' | 'projector'
  /** Optional heading id for aria-labelledby. */
  labelId?: string
}

export function PowerUpMeter({ goal, done, size = 'card', labelId }: PowerUpMeterProps) {
  const theme = GOAL_THEMES[goal.theme]
  const pct = Math.min(100, Math.round((done / goal.target) * 100))
  const level = cosmeticLevel(done, goal.target)
  const big = size === 'projector'
  const trim = level >= 2 ? 'border-amber-300/80 shadow-[0_0_0_3px_rgba(252,104,24,.25)]' : 'border-white/15'
  return (
    <div className={big ? 'space-y-4' : 'space-y-2'}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal.target}
        aria-valuenow={Math.min(done, goal.target)}
        aria-valuetext={`${done} of ${goal.target} ${theme.unit}, ${pct}%`}
        aria-labelledby={labelId}
        className={`relative overflow-hidden rounded-full border-2 bg-[#0A1120] ${trim} ${big ? 'h-16 sm:h-20' : 'h-7'}`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${theme.fill} transition-[width] duration-700 ease-out motion-reduce:transition-none ${level >= 1 ? 'shadow-[0_0_18px_rgba(255,168,120,.55)]' : ''}`}
          style={{ width: `${Math.max(pct, done > 0 ? 3 : 0)}%` }}
        />
        {level >= 3 && (
          <span aria-hidden className={`absolute top-1/2 -translate-y-1/2 ${big ? 'text-4xl' : 'text-lg'}`} style={{ left: `calc(${Math.max(pct, 6)}% - ${big ? 44 : 22}px)` }}>
            🚀
          </span>
        )}
        <span className={`absolute inset-0 flex items-center justify-center font-display font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.8)] ${big ? 'text-3xl sm:text-4xl' : 'text-sm'}`}>
          {done} / {goal.target} {theme.unit}
        </span>
      </div>
      <ol className={`grid grid-cols-4 gap-2 ${big ? 'text-base sm:text-lg' : 'text-xs'}`} aria-label="Milestones">
        {MILESTONES.map((m) => {
          const got = pct >= m.pct
          return (
            <li
              key={m.pct}
              className={`rounded-2xl border px-2 py-1.5 text-center ${got ? 'border-amber-400/60 bg-amber-500/15 text-amber-100' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}
            >
              <span aria-hidden className={big ? 'text-2xl' : 'text-base'}>{got ? m.icon : '🔒'}</span>
              <span className="block font-bold">{m.pct}%</span>
              <span className={`block ${big ? '' : 'sr-only sm:not-sr-only'}`}>{got ? m.name : m.reward}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default PowerUpMeter
