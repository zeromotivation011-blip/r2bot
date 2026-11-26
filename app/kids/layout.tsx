import type { Metadata, Viewport } from 'next'
import KidsShell from './KidsShell'
import { KIDS_APP_BOOT_SCRIPT } from '@/lib/kids/app-context'

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
  return (
    <>
      {/* Marks <html class="kids-app"> before first paint inside the store app (lib/kids/app-context.ts). */}
      <script dangerouslySetInnerHTML={{ __html: KIDS_APP_BOOT_SCRIPT }} />
      <KidsShell>{children}</KidsShell>
    </>
  )
}
