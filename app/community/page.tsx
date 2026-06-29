import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { CommunityGalleryClient, type CommunityBuild } from './CommunityGalleryClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://robot-tan.vercel.app'

export const runtime = 'nodejs'
export const revalidate = 300 // 5 minutes — fresh enough for new submissions

export const metadata: Metadata = {
  title: 'Community Builds | R2BOT',
  description:
    'Real robots built by R2BOT learners. Browse, like, and submit your own project — the proof that learning here turns into things that move.',
  alternates: { canonical: `${BASE_URL}/community` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/community`,
    siteName: 'R2BOT',
    title: 'Community Builds — R2BOT',
    description: 'Browse robots built by R2BOT learners.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
  },
}

async function loadBuilds(): Promise<CommunityBuild[]> {
  try {
    // Admin client to bypass RLS at build time — the public SELECT policy
    // would also work for `status='published'` rows, but admin avoids any
    // session/cookie state at ISR generation.
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('community_builds')
      .select(
        'id, user_id, title, description, image_url, track, project_slug, github_url, video_url, tags, likes, created_at',
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(60)
    if (error || !data) return []
    return data.map((row) => ({
      id: row.id as string,
      title: (row.title as string) ?? 'Untitled build',
      description: (row.description as string) ?? '',
      image_url: (row.image_url as string | null) ?? null,
      track: (row.track as string | null) ?? null,
      project_slug: (row.project_slug as string | null) ?? null,
      github_url: (row.github_url as string | null) ?? null,
      video_url: (row.video_url as string | null) ?? null,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      likes: typeof row.likes === 'number' ? row.likes : 0,
      created_at: (row.created_at as string) ?? new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

export default async function CommunityPage() {
  const builds = await loadBuilds()
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', paddingTop: 110, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <header style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 10px' }}>
              Community
            </p>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 12px' }}>
              Real robots, built by real learners.
            </h1>
            <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
              Browse builds shared by the R2BOT community. Like the ones that wow you. When you finish a Robot Project, share yours here.
            </p>
          </header>

          <CommunityGalleryClient initialBuilds={builds} />
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
