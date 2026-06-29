import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import SettingsWrapper from './SettingsWrapper'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Settings — R2BOT',
  description: 'Manage your R2BOT profile, password, and preferences.',
  robots: { index: false, follow: false },
}

export default function SettingsPage() {
  return (
    <CopilotProvider>
      <Nav />
      <SettingsWrapper />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
