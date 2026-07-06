import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SkipToContent } from '@/components/SkipToContent';
import { LeadCaptureModal } from '@/components/LeadCaptureModal';
import { LowDataMode } from '@/components/LowDataMode';
import { PWAPrompt } from '@/components/PWAPrompt';
import { ToastProvider } from '@/components/Toast';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ProgressBanner } from '@/components/ProgressBanner';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AuthModal } from '@/components/auth/AuthModal';
import { organizationJsonLD } from '@/lib/seo/jsonld';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app';
// Google Analytics 4 — set NEXT_PUBLIC_GA_ID (e.g. "G-XXXXXXX") in Vercel to turn on.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  title: {
    default: 'R2BOT — Learn Robotics | ROS2, AI, and Real Robots, Explained',
    template: '%s | R2BOT',
  },
  description:
    'The clearest place on the internet to learn robotics — from zero to job-ready. Learn ROS2, PID control, SLAM, computer vision, and edge AI with an AI mentor, real simulators, and hands-on projects. Free to explore.',
  keywords: [
    'learn robotics',
    'ROS2 tutorial',
    'robotics for beginners',
    'robot programming',
    'SLAM explained',
    'ROS2 course free',
    'how robots work',
    'robotics engineer',
    'humanoid robots',
    'robotics encyclopedia',
  ],
  authors: [{ name: 'R2BOT' }],
  creator: 'R2BOT',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT — Learn Robotics, from Zero to Job-Ready',
    description: 'From zero to robotics engineer — with an AI mentor, real simulators, and hands-on projects. The clearest robotics knowledge on the internet.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'R2BOT — Learn Robotics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'R2BOT — Learn Robotics, from Zero to Job-Ready',
    description: 'From zero to robotics engineer — AI mentor, real simulators, hands-on projects. Free to explore.',
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <head>
        {/* Perf: resolve font and Supabase DNS early. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://bxgtocghjypbomszwvfr.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//bxgtocghjypbomszwvfr.supabase.co" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="R2BOT News — daily robotics, decoded"
          href="/news/rss.xml"
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLD()) }}
        />
      </head>
      <body>
        <SkipToContent />
        <AuthProvider>
          <ToastProvider>
            <ProgressBanner />
            {children}
            <AuthModal />
          </ToastProvider>
        </AuthProvider>
        <OnboardingModal />
        <LeadCaptureModal />
        <LowDataMode />
        <PWAPrompt />
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
