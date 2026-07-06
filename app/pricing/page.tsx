import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { PricingClient } from './PricingClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in'

export const runtime = 'nodejs'
export const revalidate = false

export const metadata: Metadata = {
  title: 'R2BOT Pro — Unlock Your Full Robotics Journey',
  description:
    'Get unlimited AI mentoring, full course access, and certificates. ₹799/month or ₹5,999/year.',
  alternates: { canonical: `${BASE_URL}/pricing` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/pricing`,
    siteName: 'R2BOT',
    title: 'R2BOT Pro — Unlock Your Full Robotics Journey',
    description:
      'Get unlimited AI mentoring, full course access, and certificates. ₹799/month or ₹5,999/year.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'R2BOT Pro' }],
  },
}

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'R2BOT Pro',
  description:
    'Full Academy access, unlimited R2 Co-pilot, project reviews, certificates, and offline downloads.',
  brand: { '@type': 'Brand', name: 'R2BOT' },
  offers: [
    {
      '@type': 'Offer',
      name: 'Monthly',
      price: 799,
      priceCurrency: 'INR',
      url: `${BASE_URL}/pricing`,
      availability: 'https://schema.org/InStock',
    },
    {
      '@type': 'Offer',
      name: 'Yearly',
      price: 5999,
      priceCurrency: 'INR',
      url: `${BASE_URL}/pricing`,
      availability: 'https://schema.org/InStock',
    },
  ],
}

export default function PricingPage() {
  return (
    <CopilotProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Nav />
      <main id="main-content" style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
          <header style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 48px' }}>
            <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 14px' }}>
              R2BOT Pro
            </p>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.08, margin: '0 0 14px' }}>
              Unlock your full robotics journey.
            </h1>
            <p style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              Start free. Upgrade when you&apos;re ready to go from learner to engineer.
            </p>
          </header>

          <PricingClient />

          <section style={{ maxWidth: 720, margin: '60px auto 0', textAlign: 'center', padding: '24px 20px', borderTop: '1px solid #1f1f2a' }}>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Secure payments via Razorpay. Cancel anytime. Questions? Email{' '}
              <a href="mailto:hello@r2bot.in" style={{ color: '#fbbf24', textDecoration: 'underline' }}>hello@r2bot.in</a>.
            </p>
          </section>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
