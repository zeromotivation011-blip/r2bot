import type { Metadata } from 'next'
import Link from 'next/link'
import { ES_GLOSSARY } from '@/lib/ai-robotics-es'
import { jsonldScript } from '@/lib/seo/jsonld'
import { HREFLANG_AI_GLOSSARY } from '@/lib/hreflang'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'Glosario de IA y robótica: definiciones sencillas',
  description: 'Términos comunes de robótica e IA en una frase: SLAM, lidar, aprendizaje por refuerzo, fusión de sensores y más, con el nombre en inglés.',
  alternates: { canonical: `${BASE}/es/ai-robotics/glossary`, languages: HREFLANG_AI_GLOSSARY },
}
export default function EsGlossary() {
  const ld = { '@context': 'https://schema.org', '@type': 'DefinedTermSet', inLanguage: 'es', name: 'Glosario de IA y robótica',
    hasDefinedTerm: ES_GLOSSARY.map((t) => ({ '@type': 'DefinedTerm', name: `${t.term} (${t.en})`, description: t.plain })) }
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <Link href="/es/ai-robotics" style={{ color: 'var(--text-2)', fontSize: 13 }}>← IA y robótica</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,38px)', fontWeight: 900, color: '#fff', margin: '8px 0 18px' }}>Glosario de IA y robótica</h1>
      <dl style={{ margin: 0 }}>
        {ES_GLOSSARY.map((t) => (
          <div key={t.en} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <dt style={{ color: '#fff', fontWeight: 800 }}>{t.term} <span style={{ color: 'var(--text-2)', fontWeight: 400, fontSize: 14 }}>{t.en}</span></dt>
            <dd style={{ color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.9 }}>{t.plain}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
