import type { Metadata } from 'next'
import Link from 'next/link'
import { HI_GLOSSARY } from '@/lib/ai-robotics-hi'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'AI और रोबोटिक्स शब्दावली: आसान परिभाषाएँ',
  description: 'रोबोट और AI के आम शब्द एक वाक्य में: SLAM, लिडार, रीइन्फ़ोर्समेंट लर्निंग, सेंसर फ़्यूज़न और बहुत कुछ, अंग्रेज़ी नाम के साथ।',
  alternates: { canonical: `${BASE}/hi/ai-robotics/glossary`, languages: { en: `${BASE}/ai-robotics/glossary`, 'zh-CN': `${BASE}/zh/ai-robotics/glossary`, hi: `${BASE}/hi/ai-robotics/glossary` } },
}
export default function HiGlossary() {
  const ld = { '@context': 'https://schema.org', '@type': 'DefinedTermSet', inLanguage: 'hi', name: 'AI और रोबोटिक्स शब्दावली',
    hasDefinedTerm: HI_GLOSSARY.map((t) => ({ '@type': 'DefinedTerm', name: `${t.term} (${t.en})`, description: t.plain })) }
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/hi/ai-robotics" style={{ color: '#94a3b8', fontSize: 13 }}>← AI और रोबोटिक्स</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,38px)', fontWeight: 900, color: '#fff', margin: '8px 0 18px' }}>AI और रोबोटिक्स शब्दावली</h1>
      <dl style={{ margin: 0 }}>
        {HI_GLOSSARY.map((t) => (
          <div key={t.en} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <dt style={{ color: '#fff', fontWeight: 800 }}>{t.term} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14 }}>{t.en}</span></dt>
            <dd style={{ color: '#cbd5e1', margin: '4px 0 0', lineHeight: 1.9 }}>{t.plain}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
