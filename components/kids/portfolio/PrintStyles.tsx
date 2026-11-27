// components/kids/portfolio/PrintStyles.tsx
// Print rules for Make It at Home pages, the portfolio and certificates lists:
// only the `.print-sheet` element prints, in black on white, without the kids
// shell (header, tab bar, Ask Spark, footer) or anything marked `.no-print`.
// A server component: a plain <style> tag, no JavaScript.

const CSS = `@media print {
  @page { margin: 14mm; }
  html, body, .kids-main { background: #fff !important; }
  body * { visibility: hidden !important; }
  .print-sheet, .print-sheet * { visibility: visible !important; }
  .print-sheet { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
  .print-sheet .no-print { display: none !important; }
  .print-sheet, .print-sheet * { color: #111 !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; border-color: #bbb !important; }
  .print-sheet a { text-decoration: none !important; }
  .print-sheet li, .print-sheet section { break-inside: avoid; }
  .print-sheet .print-break { break-before: page; }
}`

export default function PrintStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />
}
