import type { Metadata } from 'next'
import Link from 'next/link'
import { SHORTS, SHORT_COURSES, shortsInCourse } from '@/lib/shorts'
import { SHORTS_ES } from '@/lib/shorts-es'
import { ProgressBar, Tick } from '@/components/shorts/ShortsClient'
import InlineSignup from '@/components/InlineSignup'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export const metadata: Metadata = {
  title: 'Robótica en un minuto: lecciones rápidas',
  description: 'Lecciones gratis de robótica de un minuto: vídeo, demos animadas y una pregunta corta. Sensores, motores, control, manos y robots en el trabajo, en español sencillo.',
  alternates: { canonical: `${BASE}/es/shorts`, languages: { en: `${BASE}/shorts`, 'zh-CN': `${BASE}/zh/shorts`, hi: `${BASE}/hi/shorts`, es: `${BASE}/es/shorts` } },
}
const ZH_COURSE: Record<string, { t: string; b: string }> = {
  senses: { t: 'Cómo sienten los robots', b: 'Sonido, visión, oído y sentido del equilibrio.' },
  motion: { t: 'Motores y mecánica', b: 'Engranajes, servos, brazos robóticos y repetición precisa.' },
  control: { t: 'Control y equilibrio', b: 'Realimentación, mantenerse en pie y seguir una línea.' },
  hands: { t: 'Manos y tacto', b: 'Agarre suave, manos protésicas y robots quirúrgicos.' },
  work: { t: 'Robots en el trabajo', b: 'Aspiradoras, almacenes y el problema de las escaleras.' },
}

export default function EsShortsHub() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '110px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: 0 }}>Robótica en un minuto: lecciones rápidas</h1>
      <p style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.7, maxWidth: 720 }}>Mira un vídeo de un minuto, juega con la demo en vivo y responde una pregunta. Cinco minicursos, {SHORTS.length} lecciones en total, todo gratis.</p>
      <ProgressBar slugs={SHORTS.map((s) => s.slug)} lang="es" />
      {SHORT_COURSES.map((c) => (
        <section key={c.slug} style={{ margin: '32px 0' }}>
          <h2 style={{ color: '#fff', fontSize: 24, margin: 0 }}>{c.icon} {ZH_COURSE[c.slug].t}</h2>
          <p style={{ color: '#94a3b8', margin: '4px 0 14px' }}>{ZH_COURSE[c.slug].b}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {shortsInCourse(c.slug).map((s) => (
              <Link key={s.slug} href={`/es/shorts/${s.slug}`} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${s.ids[0]}/mqdefault.jpg`} alt="" width={64} height={114} loading="lazy" style={{ borderRadius: 8, objectFit: 'cover', width: 64, height: 114 }} />
                <span><span style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{SHORTS_ES[s.slug].title.split(':')[0]} <Tick slug={s.slug} /></span><br /><span style={{ color: '#94a3b8', fontSize: 13 }}>{SHORTS_ES[s.slug].summary.slice(0, 70)}…</span></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <div style={{ marginTop: 40 }}><InlineSignup lang="es" /></div>
      <p style={{ marginTop: 24 }}><Link href="/es/ai-robotics" style={{ color: '#FC6818' }}>Sigue leyendo: IA y robótica →</Link></p>
    </main>
  )
}
