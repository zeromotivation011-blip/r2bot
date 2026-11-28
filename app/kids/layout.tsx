import type { Metadata, Viewport } from 'next'
import KidsShell from './KidsShell'
import { KIDS_APP_BOOT_SCRIPT, KIDS_STANDALONE } from '@/lib/kids/app-context'
import { KIDS_SETTINGS_BOOT_SCRIPT } from '@/lib/kids/settings-boot'
import { KIDS_LOOK_BOOT_SCRIPT } from '@/lib/kids/teen-boot'
import KidsLookSyncClient from '@/components/kids/teen/KidsLookSyncClient'
// The teen "R2BOT Lab" look (roadmap #83): html[data-kids-look="lab"]. In the first paint.
import './kids-teen.css'

export const runtime = 'nodejs'

// R2BOT Kids installs as its own app (scope /kids), separate from the main site's manifest.
// The standalone app (KIDS_STANDALONE) is already installed and does not carry the manifest route.
export const metadata: Metadata = {
  ...(KIDS_STANDALONE ? {} : { manifest: '/kids/manifest.webmanifest' }),
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
      {/* Settings classes (larger text, less motion, Lite 3D) before first paint (lib/kids/settings.ts). */}
      <script dangerouslySetInnerHTML={{ __html: KIDS_SETTINGS_BOOT_SCRIPT }} />
      {/* Band + look (<html data-kids-band / data-kids-look>) before first paint: Engineers see R2BOT Lab (lib/kids/teen.ts). */}
      <script dangerouslySetInnerHTML={{ __html: KIDS_LOOK_BOOT_SCRIPT }} />
      <KidsLookSyncClient />
      <KidsShell>{children}</KidsShell>
    </>
  )
}
