'use client'

// components/kids/worlds/guardians/PrintHarmCheckClient.tsx
// "Print the card" — prints ONLY the Harm Check card: while printing, a class on
// <html> hides everything else (the rule below applies only with that class).

import { HARM_CARD_ID } from './HarmCheckCard'

const CSS = `@media print {
  html.print-harm-card body * { visibility: hidden !important; }
  html.print-harm-card #${HARM_CARD_ID}, html.print-harm-card #${HARM_CARD_ID} * { visibility: visible !important; }
  html.print-harm-card #${HARM_CARD_ID} { position: absolute; left: 0; top: 0; width: 100%; }
}`

export default function PrintHarmCheckClient() {
  const print = () => {
    const root = document.documentElement
    root.classList.add('print-harm-card')
    const done = () => {
      root.classList.remove('print-harm-card')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }
  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        onClick={print}
        className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 font-display font-bold text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97] print:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="7" rx="1" />
        </svg>
        Print the Harm Check card
      </button>
    </>
  )
}
