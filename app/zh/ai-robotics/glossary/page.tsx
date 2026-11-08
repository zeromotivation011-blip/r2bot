import type { Metadata } from 'next'
import Link from 'next/link'
import { ZH_GLOSSARY } from '@/lib/ai-robotics-zh'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'AI 与机器人词汇表：通俗释义',
  description: '用一句话讲清机器人和人工智能的常用词：SLAM、激光雷达、强化学习、传感器融合等，附英文原词。',
  alternates: { canonical: `${BASE}/zh/ai-robotics/glossary`, languages: { en: `${BASE}/ai-robotics/glossary`, 'zh-CN': `${BASE}/zh/ai-robotics/glossary` } },
}
export default function ZhGlossary() {
  const ld = { '@context': 'https://schema.org', '@type': 'DefinedTermSet', inLanguage: 'zh-CN', name: 'AI 与机器人词汇表',
    hasDefinedTerm: ZH_GLOSSARY.map((t) => ({ '@type': 'DefinedTerm', name: `${t.term} (${t.en})`, description: t.plain })) }
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/zh/ai-robotics" style={{ color: 'var(--text-2)', fontSize: 13 }}>← AI 与机器人</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,38px)', fontWeight: 900, color: '#fff', margin: '8px 0 18px' }}>AI 与机器人词汇表</h1>
      <dl style={{ margin: 0 }}>
        {ZH_GLOSSARY.map((t) => (
          <div key={t.en} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <dt style={{ color: '#fff', fontWeight: 800 }}>{t.term} <span style={{ color: 'var(--text-2)', fontWeight: 400, fontSize: 14 }}>{t.en}</span></dt>
            <dd style={{ color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.8 }}>{t.plain}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
