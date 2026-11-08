import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'R2BOT: aprende robótica gratis y en lenguaje sencillo',
  description: 'R2BOT explica los robots y la IA en español sencillo. Guías gratis, glosario y cinco cursos para empezar.',
  alternates: { canonical: `${BASE}/es`, languages: { en: `${BASE}/`, 'zh-CN': `${BASE}/zh`, hi: `${BASE}/hi`, es: `${BASE}/es` } },
}

export default function EsHome() {
  return (
    <main className="r2-wrap r2-wrap--narrow" style={{ paddingTop: 110, paddingBottom: 80 }}>
      <h1 className="r2-display">Aprende robótica gratis, en lenguaje sencillo</h1>
      <p className="r2-lede">R2BOT hace fácil la robótica y la IA. Cada tema explica qué es, qué puedes hacer con ello y qué puede salir mal sin ello. Todo es gratis.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14, margin: '28px 0' }}>
        <Link href="/es/shorts" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>Lecciones rápidas</div><div className="r2-h3" style={{ margin: '6px 0' }}>47 lecciones de un minuto</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>Vídeo, demos animadas y una pregunta corta.</div></Link>
        <Link href="/es/ai-robotics" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>IA y robótica</div><div className="r2-h3" style={{ margin: '6px 0' }}>12 guías sencillas</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>Visión, aprendizaje, SLAM, planificación, modelos de lenguaje y seguridad.</div></Link>
        <Link href="/es/ai-robotics/glossary" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>Glosario</div><div className="r2-h3" style={{ margin: '6px 0' }}>30 términos comunes</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>Cada término en una frase, con su nombre en inglés.</div></Link>
        <Link href="/india" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>India</div><div className="r2-h3" style={{ margin: '6px 0' }}>Robótica en India</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>Empresas, programas y problemas (en inglés).</div></Link>
        <Link href="/courses" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>Cursos</div><div className="r2-h3" style={{ margin: '6px 0' }}>Cinco cursos gratis</div><div className="r2-meta" style={{ lineHeight: 1.8 }}>De los fundamentos a la inteligencia del robot. Los vídeos están en inglés.</div></Link>
      </div>
      <p className="r2-body" style={{ lineHeight: 1.9 }}>Nota: las demos interactivas, los simuladores y los vídeos de los cursos están por ahora en inglés. Iremos ampliando el contenido en español. <Link href="/" className="r2-link">Ver el sitio completo en inglés →</Link></p>
    </main>
  )
}
