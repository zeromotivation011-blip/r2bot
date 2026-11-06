import type { Metadata } from 'next'

// Classroom app screen: useful to signed-in students and teachers, not a search landing page.
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
