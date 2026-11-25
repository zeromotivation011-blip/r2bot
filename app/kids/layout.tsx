import type { Metadata, Viewport } from 'next'
import KidsShell from './KidsShell'

export const runtime = 'nodejs'

// R2BOT Kids installs as its own app (scope /kids), separate from the main site's manifest.
export const metadata: Metadata = {
  manifest: '/kids/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'R2BOT Kids', statusBarStyle: 'black-translucent' },
  icons: { apple: '/kids-icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#0A1120',
  viewportFit: 'cover',
}

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  return <KidsShell>{children}</KidsShell>
}
