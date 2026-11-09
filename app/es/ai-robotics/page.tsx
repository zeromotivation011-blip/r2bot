import type { Metadata } from 'next'
import Link from 'next/link'
import InlineSignup from '@/components/InlineSignup'
import { ES_TOPICS } from '@/lib/ai-robotics-es'
import { HREFLANG_AI_HUB } from '@/lib/hreflang'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'IA y robótica: guías en español sencillo',
  description: 'Cómo funciona la IA en los robots, en español sencillo: visión, aprendizaje, SLAM, planificación de rutas, modelos de lenguaje y seguridad, con ejemplos reales. Gratis.',
  alternates: { canonical: `${BASE}/es/ai-robotics`, languages: HREFLANG_AI_HUB },
}
const card = { display: 'block', padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' } as const

export default function EsAiHub() {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 80px' }}>
      <Link href="/es" style={{ color: 'var(--text-2)', fontSize: 13 }}>← Inicio</Link>
      <h1 style={{ fontSize: 'clamp(30px,5vw,42px)', fontWeight: 900, color: '#fff', margin: '8px 0 10px' }}>IA y robótica, en lenguaje sencillo</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 18, lineHeight: 1.9, maxWidth: 740 }}>Un robot debe percibir, pensar y actuar. La IA es una forma de pensar. Cada guía explica tres cosas: qué es, qué puedes hacer con ello y qué puede salir mal sin ello.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14, margin: '24px 0' }}>
        {ES_TOPICS.map((t) => (
          <Link key={t.slug} href={`/es/ai-robotics/${t.slug}`} style={card}>
            <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800 }}>{t.level} · {t.minutes} min</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: '6px 0' }}>{t.title}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.8 }}>{t.short}</div>
          </Link>
        ))}
      </div>
      <InlineSignup lang="es" />
      <p style={{ color: 'var(--text-2)', lineHeight: 1.9 }}>¿Hay una palabra que no entiendes? <Link href="/es/ai-robotics/glossary" style={{ color: '#FC6818', fontWeight: 700 }}>Mira el glosario</Link>. ¿Quieres probar las demos? <Link href="/ai-robotics" style={{ color: '#FC6818', fontWeight: 700 }}>La página en inglés tiene 10 demos interactivas</Link>.</p>
    </main>
  )
}
