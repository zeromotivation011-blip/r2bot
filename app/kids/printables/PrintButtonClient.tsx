'use client'

// app/kids/printables/PrintButtonClient.tsx — opens the browser's print dialog
// (print or "Save as PDF"). The page's PrintStyles decide what prints.

export default function PrintButtonClient({ label = 'Print' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 font-display font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
    >
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V3h12v6" />
        <rect x="3" y="9" width="18" height="8" rx="2" />
        <path d="M7 14h10v7H7z" />
      </svg>
      {label}
    </button>
  )
}
