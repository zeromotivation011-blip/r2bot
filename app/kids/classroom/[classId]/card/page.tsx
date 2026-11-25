// app/kids/classroom/[classId]/card/page.tsx — printable join card for the classroom wall.
import type { Metadata } from 'next'
import JoinCardClient from './JoinCardClient'

export const metadata: Metadata = {
  title: 'Join card — R2BOT Kids Classroom',
  robots: { index: false, follow: false },
}

// Print only the card: hide the kids shell (nav, stars, Spark, voice button).
const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #r2-join-card, #r2-join-card * { visibility: visible !important; }
  #r2-join-card { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
}
`

export default async function JoinCardPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8">
      <style>{PRINT_CSS}</style>
      <JoinCardClient classId={classId} />
    </div>
  )
}
