// app/kids/teach/layout.tsx — R2BOT Kids for teachers: lesson guides and training.
//
// Adds the print stylesheet for every /kids/teach page: the kids chrome
// (nav, tab bar, footer, toasts) disappears and the guide prints black on
// white, ink-friendly, A4 or Letter.

const PRINT_CSS = `
@media print {
  @page { margin: 14mm 14mm 16mm; }
  html, body { background: #fff !important; color: #111 !important; }
  .kids-nav, .kids-footer, .kids-tabbar, .kids-voice-toggle, [data-reward-toast], .teach-no-print { display: none !important; }
  body * { background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
  .min-h-screen { min-height: 0 !important; }
  .kids-main { padding: 0 !important; margin: 0 !important; }
  .teach-doc, .teach-doc * { color: #111 !important; border-color: #c8cdd6 !important; }
  .teach-doc a { text-decoration: underline; }
  .teach-doc .teach-accent { color: #b4410a !important; }
  .teach-doc section, .teach-doc li, .teach-doc tr { break-inside: avoid; }
  .teach-doc h1, .teach-doc h2, .teach-doc h3 { break-after: avoid; }
  .teach-doc { font-size: 11pt; line-height: 1.45; }
}
`

export default function TeachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{PRINT_CSS}</style>
      {children}
    </>
  )
}
