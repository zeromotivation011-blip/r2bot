import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DEMOS } from '@/app/ai-robotics/demos'
import { getTopic } from '@/lib/ai-robotics'

export const metadata: Metadata = { robots: { index: false, follow: true } }
export function generateStaticParams() { return Object.keys(DEMOS).map((slug) => ({ slug })) }

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const Demo = DEMOS[slug]
  const t = getTopic(slug)
  if (!Demo || !t) notFound()
  return (
    <main style={{ padding: 14, maxWidth: 760, margin: '0 auto' }}>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t.title}</div>
      <Demo />
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>
        Free demo by <a href={`https://www.r2bot.in/ai-robotics/${slug}`} target="_blank" rel="noopener" style={{ color: '#FC6818', fontWeight: 700 }}>R2BOT</a>. Read the full guide.
      </p>
    </main>
  )
}
