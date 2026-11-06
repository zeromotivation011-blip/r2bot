import type { Metadata } from 'next'
import Link from 'next/link'
import { GLOSSARY } from '@/lib/ai-robotics'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'AI and Robotics Glossary: Plain-English Definitions',
  description: 'Short, plain definitions of the words you meet in AI and robotics: SLAM, lidar, reinforcement learning, sensor fusion and more.',
  alternates: { canonical: `${BASE}/ai-robotics/glossary`, languages: { en: `${BASE}/ai-robotics/glossary`, 'zh-CN': `${BASE}/zh/ai-robotics/glossary`, hi: `${BASE}/hi/ai-robotics/glossary`, es: `${BASE}/es/ai-robotics/glossary` } },
}

export default function Glossary() {
  const terms = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term))
  const ld = { '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: 'AI and Robotics Glossary',
    hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.term, description: t.plain })) }
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/ai-robotics" style={{ color: '#94a3b8', fontSize: 13 }}>← AI and Robotics</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,38px)', fontWeight: 900, color: '#fff', margin: '8px 0 18px' }}>AI and robotics glossary</h1>
      <dl style={{ margin: 0 }}>
        {terms.map((t) => (
          <div key={t.term} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <dt style={{ color: '#fff', fontWeight: 800 }}>{t.term}</dt>
            <dd style={{ color: '#cbd5e1', margin: '4px 0 0', lineHeight: 1.6 }}>{t.plain}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
