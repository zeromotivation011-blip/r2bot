// app/build/page.tsx — Build hub (server component)
import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { loadAllProjects } from '@/lib/build/loader'
import type { ProjectMeta, RobotLevel } from '@/lib/build/types'

export const runtime = 'nodejs'

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Build Real Robots — Adaptive, Step-by-Step | R2BOT',
  description:
    'Build 10 real robots from line follower to AI sorting arm. Every step is a question, not a tutorial. Adaptive hints, embedded simulator, end-to-end.',
  keywords: [
    'build a robot',
    'arduino robot project',
    'line follower robot',
    'ros2 navigation tutorial',
    'robot project tutorial',
    'r2bot build',
  ],
  alternates: { canonical: `${BASE_URL}/build` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/build`,
    siteName: 'R2BOT',
    title: 'Build Real Robots — Step by Step',
    description:
      'Adaptive question-first robot builds. No tutorials. No watching. Just doing.',
    images: [
      { url: '/og-default.svg', width: 1200, height: 630, alt: 'R2BOT Build' },
    ],
  },
}

const PILLARS: { icon: string; title: string; body: string }[] = [
  {
    icon: '❓',
    title: 'Question-first',
    body: 'Every step asks before it tells. You think. Then we reveal.',
  },
  {
    icon: '🎯',
    title: 'Adaptive hints',
    body: 'Wrong once? A nudge. Wrong twice? A clearer explanation — then you continue.',
  },
  {
    icon: '🧪',
    title: 'Simulation included',
    body: 'Run every robot in our browser simulator. No hardware? Still finish.',
  },
  {
    icon: '🔁',
    title: 'End-to-end',
    body: 'From the first wire to the last line of code. Real circuits, real algorithms.',
  },
]

const LEVEL_ORDER: RobotLevel[] = ['beginner', 'intermediate', 'advanced']
const LEVEL_LABEL: Record<RobotLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}
const LEVEL_SUB: Record<RobotLevel, string> = {
  beginner: 'Your first robots — sensor in, motor out.',
  intermediate: 'Wireless, kinematics, PID — real control.',
  advanced: 'Vision, ROS2, AI — production-grade stacks.',
}
const LEVEL_TONE: Record<RobotLevel, string> = {
  beginner: '#22d3ee',
  intermediate: '#a78bfa',
  advanced: '#f472b6',
}

function levelBadge(level: RobotLevel): { bg: string; fg: string } {
  if (level === 'beginner') return { bg: 'rgba(34,211,238,0.15)', fg: '#22d3ee' }
  if (level === 'intermediate') return { bg: 'rgba(167,139,250,0.15)', fg: '#a78bfa' }
  return { bg: 'rgba(244,114,182,0.15)', fg: '#f472b6' }
}

function RobotCard({ p }: { p: ProjectMeta }) {
  const badge = levelBadge(p.level)
  return (
    <Link
      href={`/build/${p.slug}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${p.color}40`,
        borderRadius: 18,
        padding: 22,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${p.color}, transparent)`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <div
          style={{
            fontSize: 38,
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `${p.color}1a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {p.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.25,
            }}
          >
            {p.title}
          </h3>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 999,
                background: badge.bg,
                color: badge.fg,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {LEVEL_LABEL[p.level]}
            </span>
            {p.simulation_only && (
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#9ca3af',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Sim only
              </span>
            )}
          </div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: '#9ca3af', lineHeight: 1.55 }}>
        {p.tagline}
      </p>
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#9ca3af',
        }}
      >
        <span>⏱️ {p.duration_hours}h · ⚡ {p.total_xp.toLocaleString()} XP</span>
        <span style={{ color: p.color, fontWeight: 600 }}>Start building →</span>
      </div>
    </Link>
  )
}

function LevelSection({ level, projects }: { level: RobotLevel; projects: ProjectMeta[] }) {
  if (projects.length === 0) return null
  const tone = LEVEL_TONE[level]
  return (
    <section style={{ marginTop: 56 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: -0.3,
          }}
        >
          {LEVEL_LABEL[level]}
        </h2>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 999,
            background: tone,
          }}
        />
      </div>
      <p style={{ margin: '0 0 22px', color: '#9ca3af', fontSize: 14 }}>{LEVEL_SUB[level]}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}
      >
        {projects.map((p) => (
          <RobotCard key={p.slug} p={p} />
        ))}
      </div>
    </section>
  )
}

export default function BuildHubPage() {
  const projects = loadAllProjects()
  const byLevel: Record<RobotLevel, ProjectMeta[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
  }
  for (const p of projects) byLevel[p.level].push(p)
  for (const level of LEVEL_ORDER) {
    byLevel[level].sort((a, b) => a.duration_hours - b.duration_hours)
  }

  return (
    <CopilotProvider>
      <Nav />
      <CopilotBubble />
      <CopilotDrawer />
      <main
        style={{
          background: '#07070f',
          minHeight: '100vh',
          color: '#e5e7eb',
          paddingTop: 72,
        }}
      >
        <section
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '48px 24px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.3)',
              color: '#22d3ee',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 22,
            }}
          >
            <span>🛠️</span>
            <span>The Build Section</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: -1.2,
              lineHeight: 1.05,
            }}
          >
            Build Real Robots.
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Step by Step.
            </span>
          </h1>
          <p
            style={{
              maxWidth: 720,
              margin: '22px auto 0',
              fontSize: 17,
              color: '#9ca3af',
              lineHeight: 1.65,
            }}
          >
            10 hands-on robot builds, from line follower to AI sorting arm. Every step is
            a question first — answer it, you advance; miss it, we hint. No tutorials. No
            scrolling through walls of text. Just adaptive, end-to-end building.
          </p>
        </section>

        <section
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '24px 24px 0',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              padding: '20px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {PILLARS.map((p) => (
              <div key={p.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    fontSize: 22,
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {p.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                    {p.title}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#9ca3af', lineHeight: 1.55 }}>
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px 80px',
          }}
        >
          {LEVEL_ORDER.map((level) => (
            <LevelSection key={level} level={level} projects={byLevel[level]} />
          ))}
        </section>
      </main>
    </CopilotProvider>
  )
}
