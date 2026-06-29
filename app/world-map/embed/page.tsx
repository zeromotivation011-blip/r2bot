// app/world-map/embed/page.tsx
// Stripped embed view — no nav, no header, no footer.
import type { Metadata } from 'next'
import EmbedClient from './EmbedClient'

export const metadata: Metadata = {
  title: 'World Robotics Map — embed',
  robots: { index: false, follow: false },
}

export default function WorldMapEmbedPage() {
  return <EmbedClient />
}
