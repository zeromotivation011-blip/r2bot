import type { Metadata } from 'next'
import InviteClient from './InviteClient'

export const metadata: Metadata = {
  title: 'Invite a friend to learn robotics',
  description: 'Share your personal R2BOT link with friends, classmates or students. Free robotics learning for everyone.',
  alternates: { canonical: 'https://www.r2bot.in/invite' },
}
export default function InvitePage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '110px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>Invite a friend</h1>
      <p style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 1.8 }}>R2BOT is free. If it helped you, share it with a friend, a classmate or your students. Your link is private to you and holds no personal data.</p>
      <InviteClient />
    </main>
  )
}
