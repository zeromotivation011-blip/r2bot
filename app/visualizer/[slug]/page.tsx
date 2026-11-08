import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { SimulatorShare } from '@/components/visualizer/SimulatorShare'
import {
  SIMULATORS,
  getSimulator,
  resolveSimulatorId,
  type SimulatorId,
} from '@/lib/simulators'

// NEXT_PUBLIC_SITE_URL is set to the *.vercel.app deployment URL in some
// environments. Emitting that as the canonical tells Google the content lives
// on the preview domain, which is worse than having no canonical at all. Every
// other file in this repo guards the same way — keep this consistent.
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://www.r2bot.in'

// Each simulator is a heavy client component (Three.js, Monaco, canvas loops).
// They are dynamically imported so a visitor landing on the PID page never
// downloads the 3D viewer — this page exists to be linked to from Reddit and
// Hacker News, so first paint matters more here than anywhere else on the site.
const COMPONENTS: Record<SimulatorId, React.ComponentType> = {
  pid: dynamic(() => import('@/components/visuals/PIDSimulator').then((m) => m.PIDSimulator)),
  astar: dynamic(() => import('@/components/visuals/AStarVisual').then((m) => m.AStarVisual)),
  slam: dynamic(() => import('@/components/visuals/SLAMVisual').then((m) => m.SLAMVisual)),
  ik: dynamic(() =>
    import('@/components/visuals/InverseKinematicsVisual').then((m) => m.InverseKinematicsVisual),
  ),
  fusion: dynamic(() =>
    import('@/components/visuals/SensorFusionVisual').then((m) => m.SensorFusionVisual),
  ),
  motor: dynamic(() =>
    import('@/components/visuals/MotorControlVisual').then((m) => m.MotorControlVisual),
  ),
  playground: dynamic(() =>
    import('@/components/visuals/RobotPlayground').then((m) => m.RobotPlayground),
  ),
  robots: dynamic(() =>
    import('@/components/visuals/URDFViewerWrapper').then((m) => m.URDFViewerWrapper),
  ),
  'sense-think-act': dynamic(() =>
    import('@/components/visuals/SenseThinkActVisual').then((m) => m.SenseThinkActVisual),
  ),
  'robot-types': dynamic(() =>
    import('@/components/visuals/RobotTypesVisual').then((m) => m.RobotTypesVisual),
  ),
}

export const revalidate = 86400

// Anything not returned by generateStaticParams 404s properly instead of being
// rendered on demand. Without this an unknown slug returned HTTP 200 with a
// "not found" body — a soft 404, which Google will index as a real page.
// Legacy aliases are handled as 308 redirects in next.config.mjs, so they never
// reach this route.
export const dynamicParams = false

export function generateStaticParams() {
  return SIMULATORS.map((s) => ({ slug: s.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const id = resolveSimulatorId(slug)
  const sim = id ? getSimulator(id) : undefined
  if (!sim) return { title: 'Simulator not found · R2BOT' }

  const url = `${SITE}/visualizer/${sim.id}`
  return {
    title: `${sim.heading} — Free & Interactive | R2BOT`,
    description: sim.description,
    keywords: sim.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: sim.heading,
      description: sim.description,
      url,
      siteName: 'R2BOT',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: sim.heading,
      description: sim.description,
    },
  }
}

export default async function SimulatorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // With dynamicParams = false only canonical ids reach this point; aliases are
  // 308-redirected by next.config.mjs before routing. resolveSimulatorId still
  // runs as a safety net.
  const id = resolveSimulatorId(slug)
  if (!id) notFound()

  const sim = getSimulator(id)
  if (!sim) notFound()

  const Component = COMPONENTS[id]
  const url = `${SITE}/visualizer/${sim.id}`

  // SoftwareApplication is the right type for a free interactive tool, and is
  // what makes this eligible for app-style treatment in search results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: sim.heading,
    url,
    description: sim.description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (web browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: 'R2BOT', url: SITE },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Simulators', item: `${SITE}/visualizer` },
      { '@type': 'ListItem', position: 2, name: sim.title, item: url },
    ],
  }

  const others = SIMULATORS.filter((s) => s.id !== sim.id).slice(0, 6)

  return (
    <CopilotProvider>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <main id="main-content" style={{ paddingTop: 120, paddingBottom: 90 }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: '#6E7886', marginBottom: 14 }}>
            <Link href="/visualizer" style={{ color: '#6E7886' }}>
              Simulators
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span style={{ color: '#B0B8C5' }}>{sim.title}</span>
          </nav>

          <h1
            className="display"
            style={{ fontSize: 'clamp(30px, 4.2vw, 46px)', margin: '0 0 12px', color: '#E8ECF1' }}
          >
            {sim.heading}
          </h1>
          <p style={{ fontSize: 18, color: '#B0B8C5', margin: '0 0 6px', maxWidth: 680 }}>
            {sim.blurb}
          </p>
          <p style={{ fontSize: 14, color: '#6E7886', margin: '0 0 18px' }}>
            Free · runs in your browser · no signup, no install
          </p>

          <SimulatorShare id={sim.id} title={sim.heading} url={url} />

          {/* The tool itself sits as high on the page as possible — someone
              arriving from a shared link wants to play with it, not read. */}
          <div style={{ marginTop: 26 }}>
            <Component />
          </div>

          <section style={{ marginTop: 46 }}>
            <h2 className="display" style={{ fontSize: 24, color: '#E8ECF1', margin: '0 0 14px' }}>
              What you can do here
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#B0B8C5', fontSize: 15, lineHeight: 1.9 }}>
              {sim.whatYouCanDo.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          {sim.lesson && (
            <section style={{ marginTop: 36 }}>
              <h2 className="display" style={{ fontSize: 24, color: '#E8ECF1', margin: '0 0 12px' }}>
                Go deeper
              </h2>
              <Link
                href={sim.lesson.href}
                style={{
                  display: 'inline-block', padding: '12px 20px', borderRadius: 12,
                  border: `1px solid ${sim.accent}55`, background: `${sim.accent}14`,
                  color: sim.accent, fontWeight: 700, fontSize: 15,
                }}
              >
                {sim.lesson.title} →
              </Link>
            </section>
          )}

          <section style={{ marginTop: 36 }}>
            <h2 className="display" style={{ fontSize: 24, color: '#E8ECF1', margin: '0 0 12px' }}>
              Related concepts
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {sim.related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  style={{
                    padding: '8px 14px', borderRadius: 999, fontSize: 14,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.03)', color: '#C8D0DC',
                  }}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 46 }}>
            <h2 className="display" style={{ fontSize: 24, color: '#E8ECF1', margin: '0 0 14px' }}>
              More simulators
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              {others.map((s) => (
                <Link
                  key={s.id}
                  href={`/visualizer/${s.id}`}
                  className="r2-lift"
                  style={{
                    display: 'block', padding: 16, borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ color: '#E8ECF1', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    {s.title}
                  </div>
                  <div style={{ color: '#6E7886', fontSize: 13, lineHeight: 1.5 }}>{s.blurb}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
