'use client'

// app/kids/teach/unplugged/PrintButtonClient.tsx — "Print" for the unplugged
// lessons and their cut-out sheets. The page's print stylesheet
// (app/kids/teach/layout.tsx) hides the kids chrome and keeps card colours.

export default function PrintButtonClient({ label = 'Print this lesson' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z" /></svg>
      {label}
    </button>
  )
}
