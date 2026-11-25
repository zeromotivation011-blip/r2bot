// app/kids/manifest.webmanifest/route.ts
// Web app manifest for R2BOT Kids as its own installable app, scoped to /kids.
// The main site keeps app/manifest.ts; app/kids/layout.tsx points kids pages here.

export const dynamic = 'force-static'

export function GET() {
  const manifest = {
    id: '/kids',
    name: 'R2BOT Kids — Build, Code & Explore Robots',
    short_name: 'R2BOT Kids',
    description: 'Build your own robot in 3D, see it in AR, code it through missions and watch animated robot stories. Ages 5–17.',
    start_url: '/kids?source=app',
    scope: '/kids',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0A1120',
    theme_color: '#0A1120',
    categories: ['education', 'kids', 'games'],
    icons: [
      { src: '/kids-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/kids-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/kids-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/kids-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Robot Workshop', short_name: 'Workshop', url: '/kids/workshop', icons: [{ src: '/kids-icon-192.png', sizes: '192x192' }] },
      { name: 'Code Lab', short_name: 'Code', url: '/kids/code-lab', icons: [{ src: '/kids-icon-192.png', sizes: '192x192' }] },
      { name: 'Story Theatre', short_name: 'Stories', url: '/kids/stories', icons: [{ src: '/kids-icon-192.png', sizes: '192x192' }] },
    ],
  }
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  })
}
