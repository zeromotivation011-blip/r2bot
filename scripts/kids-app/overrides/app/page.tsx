// scripts/kids-app/overrides/app/page.tsx — the app's start file (www/index.html).
// Capacitor opens "/" first; R2BOT Kids lives at /kids/, so go there at once.

import { AppRedirect } from '@/components/kids/app/AppRedirectClient'

export default function AppStart() {
  return (
    <div className="min-h-screen bg-[#0A1120] text-white">
      <AppRedirect to="/kids/" label="R2BOT Kids" />
    </div>
  )
}
