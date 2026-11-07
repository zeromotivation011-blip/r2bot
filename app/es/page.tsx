import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'R2BOT: aprende robótica gratis y en lenguaje sencillo',
  description: 'R2BOT explica los robots y la IA en español sencillo. Guías gratis, glosario y cinco cursos para empezar.',
  alternates: { canonical: `${BASE}/es`, languages: { en: `${BASE}/`, 'zh-CN': `${BASE}/zh`, hi: `${BASE}/hi`, es: `${BASE}/es` } },
}
const card = { display: 'block', padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' } as const

export default function EsHome() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '110px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>Aprende robótica gratis, en lenguaje sencillo</h1>
      <p style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.9, maxWidth: 720 }}>R2BOT hace fácil la robótica y la IA. Cada tema explica qué es, qué puedes hacer con ello y qué puede salir mal sin ello. Todo es gratis.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14, margin: '28px 0' }}>
        <Link href="/es/shorts" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>Lecciones rápidas</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>19 lecciones de un minuto</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>Vídeo, demos animadas y una pregunta corta.</div></Link>
        <Link href="/es/ai-robotics" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>IA y robótica</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>12 guías sencillas</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>Visión, aprendizaje, SLAM, planificación, modelos de lenguaje y seguridad.</div></Link>
        <Link href="/es/ai-robotics/glossary" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>Glosario</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>30 términos comunes</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>Cada término en una frase, con su nombre en inglés.</div></Link>
        <Link href="/india" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>India</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>Robótica en India</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>Empresas, programas y problemas (en inglés).</div></Link>
        <Link href="/courses" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>Cursos</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>Cinco cursos gratis</div><div style={{ color: '#94a3b8', lineHeight: 1.8 }}>De los fundamentos a la inteligencia del robot. Los vídeos están en inglés.</div></Link>
      </div>
      <p style={{ color: '#94a3b8', lineHeight: 1.9 }}>Nota: las demos interactivas, los simuladores y los vídeos de los cursos están por ahora en inglés. Iremos ampliando el contenido en español. <Link href="/" style={{ color: '#FC6818' }}>Ver el sitio completo en inglés →</Link></p>
    </main>
  )
}
