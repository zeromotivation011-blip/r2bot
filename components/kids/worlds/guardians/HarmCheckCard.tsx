// components/kids/worlds/guardians/HarmCheckCard.tsx
// The six-question Robot Harm Check as a visual, printable card. Server
// component (no hooks). PrintHarmCheckClient prints only this card.

import { HARM_CHECK } from '@/components/kids/games/safety-inspector/harm'

export const HARM_CARD_ID = 'harm-check-card'

export function HarmCheckCard() {
  return (
    <section
      id={HARM_CARD_ID}
      aria-labelledby="harm-check-title"
      className="rounded-[28px] border-2 border-emerald-300/40 bg-gradient-to-b from-[#111C32] to-[#0A1120] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-7 print:border-black print:bg-white print:text-black print:shadow-none"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300 print:text-black">R2BOT Kids · Robot Guardians</p>
          <h2 id="harm-check-title" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl print:text-black">
            The Robot Harm Check
          </h2>
        </div>
        <p className="text-[15px] text-[#A7B0C0] print:text-black">Ask all six about any robot.</p>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        {HARM_CHECK.map((q) => (
          <li key={q.id} className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[#19263F] p-4 print:border-black print:bg-white">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: q.color }} />
            <p className="flex items-center gap-2 font-display text-lg font-bold text-[#EEF2F8] print:text-black">
              <span aria-hidden className="text-2xl">{q.icon}</span>
              <span>
                {q.n}. {q.name}
              </span>
            </p>
            <p className="mt-1 text-[17px] font-semibold leading-snug text-[#EEF2F8] print:text-black">{q.question}</p>
            <ul className="mt-2 space-y-0.5 text-[14px] leading-snug text-[#A7B0C0] print:text-black">
              {q.lookFor.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[14px] text-[#A7B0C0] print:text-black">
        Found a problem? Rate it: <b className="text-[#EEF2F8] print:text-black">risk = how likely × how bad</b>. Fix the biggest first — and check your fix does not cause a new problem.
      </p>
    </section>
  )
}
