import type { Metadata } from 'next'
import Link from 'next/link'
import CompareClient from './CompareClient'

export const metadata: Metadata = {
  title: 'Compare Robots Side by Side',
  description: 'Pick any two robots from the R2BOT directory and compare maker, country, year and type side by side. Free.',
  alternates: { canonical: 'https://www.r2bot.in/robots/compare' },
}
export default function ComparePage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '110px 20px 80px' }}>
      <Link href="/robots/directory" style={{ color: '#94a3b8', fontSize: 13 }}>← Robot directory</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, color: '#fff', margin: '8px 0 8px' }}>Compare two robots</h1>
      <p style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 1.7, margin: '0 0 20px' }}>Choose any two robots to see who built them, when, and what each is for.</p>
      <CompareClient />
    </main>
  )
}
