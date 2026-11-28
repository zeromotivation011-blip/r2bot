// scripts/kids-app/overrides/app/layout.tsx — the ROOT layout of the standalone
// R2BOT Kids app (copied over app/layout.tsx in the scratch build only; see
// scripts/kids-app/build-export.mjs). The website's root layout is untouched.
//
// Kept: the three self-hosted fonts (next/font: the files ship inside the app),
// globals.css, the `js` class before first paint, and the same <html>/<body>
// shape the kids pages are styled against.
// Dropped: Google Analytics, the Supabase preconnect, the auth provider + modal,
// the PWA prompt, the site footer, the view counter, ref capture, the progress
// banner, low-data mode and the organisation JSON-LD. None of them belongs in a
// children's app, and every one of them would reach for a server.

import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.r2bot.in'),
  title: { default: 'R2BOT Kids', template: '%s' },
  description: 'R2BOT Kids: robotics stories, games, block coding and your own robot, ages 5 to 17.',
  icons: { icon: [{ url: '/kids-icon.svg', type: 'image/svg+xml' }] },
  // An app, not a website: nothing here is for search engines.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0A1120',
  width: 'device-width',
  initialScale: 1,
}

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("js")' }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
