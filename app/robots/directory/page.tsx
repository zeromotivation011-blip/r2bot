import type { Metadata } from 'next'
import Link from 'next/link'
import { DIRECTORY } from '@/lib/robots-directory'
import DirectoryClient from './DirectoryClient'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'Robot Directory: Famous Robots by Type, Country and Year',
  description: 'Browse landmark robots from the first factory arm to Mars rovers and modern humanoids. Filter by type and country, with the maker and year.',
  alternates: { canonical: `${BASE}/robots/directory` },
}

export default function DirectoryPage() {
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Robot directory',
    itemListElement: DIRECTORY.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: `${r.name} (${r.maker}, ${r.year})` })) }
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/robots" style={{ color: '#94a3b8', fontSize: 13 }}>← Famous robots</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, color: '#fff', margin: '8px 0 8px' }}>Robot directory</h1>
      <p style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 1.6, maxWidth: 720, margin: '0 0 22px' }}>
        {DIRECTORY.length} landmark robots, from the first factory arm in 1961 to modern humanoids. Filter by type or country. For full profiles with specs and videos, see <Link href="/robots" style={{ color: '#FC6818' }}>Famous robots</Link>. Want to put two side by side? Try the <Link href="/robots/compare" style={{ color: '#FC6818' }}>compare tool</Link>.
      </p>
      <DirectoryClient />
    </main>
  )
}
