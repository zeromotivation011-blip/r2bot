import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import ProfileWrapper from './ProfileWrapper'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'My Profile — R2BOT',
  description: 'Your robotics learning profile — Atlas progress, kids stars, achievements.',
  robots: { index: false, follow: false },
}

export default function ProfilePage() {
  return (
    <CopilotProvider>
      <Nav />
      <ProfileWrapper />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
