// app/kids/settings/page.tsx — R2BOT Kids settings (server shell, noindex).
// Sound, voice, motion, reading size, Lite graphics and the progress backup code. Everything is stored on
// this device only (lib/kids/settings.ts).
import type { Metadata } from 'next'
import SettingsClient from '@/components/kids/settings/SettingsClient'
import { BackupCodeClient } from '@/components/kids/hangar/BackupCodeClient'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Settings — R2BOT Kids',
  description: 'Sound, Spark’s voice, motion, reading size and Lite graphics for R2BOT Kids. Saved on this device only.',
  alternates: { canonical: `${BASE}/kids/settings` },
  // A control panel, not content: nothing here should rank.
  robots: { index: false, follow: true },
}

export default function KidsSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8 sm:pt-12">
      <h1 className="font-display text-3xl font-bold text-[#EEF2F8] sm:text-4xl">Settings</h1>
      <p className="mt-2 text-[#A7B0C0]">Make R2BOT Kids sound, move and look the way you like.</p>
      <SettingsClient />
      {/* The progress backup code (also in the Hangar): no accounts, so this is how progress moves devices. */}
      <div id="backup" className="mt-6 scroll-mt-24">
        <BackupCodeClient />
      </div>
    </div>
  )
}
