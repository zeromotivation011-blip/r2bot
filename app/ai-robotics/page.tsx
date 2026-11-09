import type { Metadata } from 'next'
import Link from 'next/link'
import { AI_TOPICS } from '@/lib/ai-robotics'
import SenseThinkAct from './SenseThinkAct'
import WhichAi from './WhichAi'
import { jsonldScript } from '@/lib/seo/jsonld'
import { HREFLANG_AI_HUB } from '@/lib/hreflang'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'AI and Robotics: Plain-English Guides',
  description: 'How AI works inside robots, explained simply. Vision, learning, SLAM, planning and language models, each with real examples, free.',
  alternates: { canonical: `${BASE}/ai-robotics`, languages: HREFLANG_AI_HUB },
}

const card = { padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const

export default function AiRoboticsHub() {
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'AI and Robotics guides',
    itemListElement: AI_TOPICS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}/ai-robotics/${t.slug}`, name: t.title })),
  }
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>AI and Robotics, in plain English</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 18, lineHeight: 1.6, maxWidth: 720, margin: '0 0 28px' }}>
        A robot senses, thinks and acts. AI is one way to do the thinking. Each guide below says what an idea is, what you can build with it, and what goes wrong without it. Free, no jargon.
      </p>

      <section style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: '0 0 12px' }}>Try it: where does AI fit in a robot?</h2>
        <SenseThinkAct />
      </section>

      <section style={{ ...card, marginBottom: 28 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: '0 0 12px' }}>Try it: which AI idea does my robot need?</h2>
        <WhichAi />
      </section>

      <h2 style={{ color: '#fff', fontSize: 24, margin: '0 0 14px' }}>All guides</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
        {AI_TOPICS.map((t) => (
          <Link key={t.slug} href={`/ai-robotics/${t.slug}`} style={{ ...card, textDecoration: 'none', display: 'block' }}>
            <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800 }}>{t.level.toUpperCase()} · {t.minutes} MIN</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: '6px 0' }}>{t.title}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{t.short}</div>
          </Link>
        ))}
      </div>

      <p style={{ color: 'var(--text-2)', marginTop: 28 }}>
        Stuck on a word? <Link href="/ai-robotics/glossary" style={{ color: '#FC6818', fontWeight: 700 }}>Open the glossary</Link>. Want videos and quizzes? <Link href="/courses" style={{ color: '#FC6818', fontWeight: 700 }}>Start the free course path</Link>.
      </p>
    </main>
  )
}
