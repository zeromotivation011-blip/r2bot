import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { READING_PATHS } from '@/lib/atlas-reading-paths'

export const metadata: Metadata = {
  title: 'Reading Paths · R2BOT Atlas',
  description: 'Curated journeys through the Atlas. Each path is a sequence of concepts that builds toward a goal.',
}

export default function PathsIndexPage() {
  return (
    <CopilotProvider>
      <Nav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '110px 18px 80px', color: '#f4f4f5' }}>
        <header style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: 3, color: '#fbbf24', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            Atlas · Reading Paths
          </p>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 900, color: '#fff', margin: '8px 0 12px', lineHeight: 1.05 }}>
            Not sure where to start? Follow a path.
          </h1>
          <p style={{ color: '#c4b5fd', maxWidth: 720, fontSize: 17, lineHeight: 1.55 }}>
            Each reading path is a curated sequence of Atlas concepts that builds toward a real-world goal.
            Mastered concepts unlock the next step. Finish a path, earn a certificate.
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          }}
        >
          {READING_PATHS.map(p => (
            <Link
              key={p.id}
              href={`/atlas/paths/${p.id}`}
              style={{
                display: 'block',
                padding: 24,
                background: 'rgba(15, 18, 32, 0.6)',
                border: `2px solid ${p.color}`,
                borderRadius: 18,
                textDecoration: 'none',
                color: '#f4f4f5',
                transition: 'transform .15s, box-shadow .15s',
              }}
            >
              <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 10 }}>{p.emoji}</div>
              <span
                style={{
                  display: 'inline-block',
                  marginBottom: 6,
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: 900,
                  color: '#0a0a16',
                  background: p.color,
                  padding: '2px 10px',
                  borderRadius: 999,
                }}
              >
                {p.level}
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '6px 0 8px' }}>{p.title}</h2>
              <p style={{ color: '#c4b5fd', fontSize: 14, margin: '0 0 12px', lineHeight: 1.5 }}>
                {p.description}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                <span>📚 {p.concepts.length} concepts</span>
                <span>⏱ ~{p.estimatedMinutes} min</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </CopilotProvider>
  )
}
