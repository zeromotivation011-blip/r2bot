import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { RobotsIndexClient } from './RobotsIndexClient';
import { ROBOTS } from '@/lib/robots-data';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');
const PAGE_URL = `${BASE_URL}/robots`;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Famous Robots | Encyclopedia of Real Robots',
  description:
    "Explore 20+ famous real robots — ASIMO, Boston Dynamics Atlas, NASA Curiosity, da Vinci Surgical System and more. Detailed specs, videos, and fun facts.",
  keywords: [
    'famous robots',
    'real robots',
    'ASIMO robot',
    'Boston Dynamics Atlas robot',
    'Spot robot dog',
    'Curiosity Mars rover',
    'da Vinci surgical robot',
    'Tesla Optimus',
    'Figure 02',
    'Vyommitra',
    'GreyOrange Butler',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Famous Robots — Encyclopedia of Real Robots',
    description:
      "20+ profiles of real robots — humanoid, industrial, space, medical, India. Specs, fun facts, video.",
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'Famous Robots — R2BOT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Famous Robots',
    description: '20+ real-robot profiles with specs, videos, and fun facts.',
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Famous Robots — Encyclopedia of Real Robots',
  description:
    "20+ profiles of famous real robots including humanoids, space rovers, surgical, industrial, and Indian robots.",
  url: PAGE_URL,
  isPartOf: {
    '@type': 'WebSite',
    name: 'R2BOT',
    url: BASE_URL,
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: ROBOTS.length,
    itemListElement: ROBOTS.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/robots/${r.slug}`,
      name: `${r.name} — ${r.maker}`,
    })),
  },
};

export default function RobotsIndexPage() {
  return (
    <CopilotProvider>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <Nav />
      <main id="main-content">
        <RobotsIndexClient />
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
