import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Free robotics learning — everything on R2BOT is free',
  description:
    'The Atlas, Academy lessons, simulators, robot builds and the AI mentor are all free to use. No card, no trial, no paywall.',
  alternates: { canonical: `${BASE_URL}/pricing` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/pricing`,
    siteName: 'R2BOT',
    title: 'Everything on R2BOT is free',
    description: 'Robotics, made simple — free for everyone, everywhere.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT is free' }],
  },
}

const items = [
  { t: 'The Atlas', d: '480+ robotics concepts, robots, companies and people in plain English, with sources.', href: '/atlas' },
  { t: 'Academy', d: 'Structured lessons from your first robot to ROS2, navigation and SLAM.', href: '/academy' },
  { t: 'Simulators', d: 'Try PID control, kinematics and more in your browser. Nothing to install.', href: '/visualizer' },
  { t: 'Robot builds', d: 'Guided projects from a line follower to a ROS2 navigation robot.', href: '/build' },
  { t: 'R2 Co-pilot', d: 'An AI mentor for robotics questions. Free, with a fair daily limit so it stays free for everyone.', href: '/copilot' },
  { t: 'News and Lens', d: 'Daily robotics news with context, and the best robotics videos explained.', href: '/news' },
]

export default function PricingPage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" style={{ paddingTop: 130, paddingBottom: 100, minHeight: '100vh' }}>
        <div className="container" style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>
          <p style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800, color: '#FC6818' }}>Pricing</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1, margin: '8px 0 14px' }}>
            Everything is free.
          </h1>
          <p style={{ fontSize: 18, color: '#b0b8c5', lineHeight: 1.6, maxWidth: 680 }}>
            R2BOT exists to make robotics interesting and understandable for everyone. There is no card to enter, no trial that expires, and no locked lesson. Create a free account to save your progress, streak and certificates.
          </p>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', marginTop: 36 }}>
            {items.map((i) => (
              <Link key={i.t} href={i.href} style={{ display: 'block', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', textDecoration: 'none', color: 'inherit' }}>
                <strong style={{ fontSize: 17 }}>{i.t}</strong>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#9ca3af', lineHeight: 1.55 }}>{i.d}</p>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-primary">Create a free account</Link>
            <Link href="/diagnostic" className="btn btn-ghost">Find my level</Link>
          </div>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
