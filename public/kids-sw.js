// public/kids-sw.js — service worker for the R2BOT Kids app, registered with scope '/kids'
// (app/kids/KidsShell.tsx, production only). The Capacitor store app loads the same site,
// so this worker is what makes BOTH the PWA and the store app work offline.
//
// Strategy
//   - Kids pages (navigations under /kids): network first. A slow network (school Wi-Fi)
//     falls back to the saved copy after NAV_TIMEOUT_MS; no network at all serves the
//     saved copy, and a page never opened before gets the branded offline page below.
//     Pages are saved by PATH (query dropped), so /kids?source=app and /kids?source=pwa
//     share one copy. Cap: PAGES_MAX (precached pages are never evicted).
//   - /_next/static/* (content-hashed, immutable) and same-origin images/fonts/styles/
//     scripts: cache first, saved on first use. Cap: STATIC_MAX entries.
//   - Episode audio (/kids/audio/**): saved the first time an episode plays (cache on
//     play), served from the cache after that; episode.json is stale-while-revalidate.
//     Both players (episode engine voices.ts, Story Theatre story-voice.ts) FETCH each
//     clip and play a blob URL: an <audio src> load sends a Range request, and its 206
//     answer is not cached here (cacheFirst keeps only 200s).
//     Kept across version bumps (its own cache name). Cap: AUDIO_MAX entries (~20–30 KB
//     a clip, so roughly 40–60 MB at the cap).
//   - /api/*, RSC/prefetch payloads, non-GET, other origins: never touched, never cached.
//     (Offline, a failed client-side navigation makes Next fall back to a full page load,
//     which lands in the navigation handler above.)
//
// On install: precache the shell pages in PRECACHE_PAGES and the JS/CSS each one's HTML
// references (we cannot read the build manifest from here, so we read the HTML).
// Bump VERSION to drop old page/static caches; activate deletes every r2bot-kids-* cache
// that is not current.
//
// Keep-list: trimming STATIC evicts oldest first, and the precached pages' chunks are the
// oldest entries. So the static URLs each precached page needs (its HTML's chunks, plus the
// dynamic chunks found at install) are recorded in a small JSON entry in the PAGES cache
// (KEEP_KEY) and never trimmed. A precached page's entry is refreshed whenever its HTML is
// saved again, so after a deploy the list follows the new chunks.

const VERSION = 'r2bot-kids-v3'
const PAGES = `${VERSION}-pages`
const STATIC = `${VERSION}-static`
// Audio survives a VERSION bump on purpose: clip files only change when an episode is
// re-voiced, and re-downloading ~19 MB for every web deploy would punish offline users.
const AUDIO = 'r2bot-kids-audio-1'
const CURRENT = [PAGES, STATIC, AUDIO]

const PAGES_MAX = 40
const STATIC_MAX = 200 // hashed chunks + icons; every deploy adds new ones, oldest go first
const AUDIO_MAX = 2000
const NAV_TIMEOUT_MS = 4000
const KEEP_KEY = new URL('/kids/__sw-keep.json', self.location.origin).href

// The shell: home, Hangar, Settings, Galaxy, course, worlds, games hub and the flagship games.
const PRECACHE_PAGES = [
  '/kids',
  '/kids/hangar',
  '/kids/settings',
  '/kids/galaxy',
  '/kids/course',
  '/kids/worlds',
  '/kids/play',
  '/kids/play/sumo-arena',
  '/kids/play/drone-hover',
  '/kids/play/maze-mapper',
]
const PRECACHE_ASSETS = ['/kids-icon.svg', '/kids-icon-192.png', '/kids/manifest.webmanifest']

// Pages that only make sense online (teacher/class tools) are never saved.
const NEVER_SAVE = [/^\/kids\/classroom(\/|$)/, /^\/kids\/join(\/|$)/]

self.addEventListener('install', (event) => {
  event.waitUntil(precache().finally(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('r2bot-kids-') && !CURRENT.includes(k)).map((k) => caches.delete(k)))
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => undefined)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    if (url.pathname === '/kids' || url.pathname.startsWith('/kids/')) event.respondWith(page(event, url))
    return
  }
  // React Server Component payloads (client-side navigation, prefetch) depend on the
  // router state they were asked from, so a saved one could render the wrong tree.
  if (req.headers.get('RSC') || url.searchParams.has('_rsc')) return

  if (url.pathname.startsWith('/kids/audio/')) {
    event.respondWith(url.pathname.endsWith('.json') ? staleWhileRevalidate(req, AUDIO, AUDIO_MAX) : cacheFirst(req, AUDIO, AUDIO_MAX))
    return
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, STATIC, STATIC_MAX))
    return
  }
  if (['image', 'font', 'style', 'script', 'manifest'].includes(req.destination) && !url.pathname.startsWith('/_next/')) {
    event.respondWith(staleWhileRevalidate(req, STATIC, STATIC_MAX))
  }
})

// ---------------------------------------------------------------- pages

function pageKey(url) {
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname
  return new URL(path, self.location.origin).href
}

function saveable(url, res) {
  if (!res || !res.ok || res.redirected || res.type !== 'basic') return false
  if (NEVER_SAVE.some((re) => re.test(url.pathname))) return false
  if (/no-store/i.test(res.headers.get('Cache-Control') || '')) return false
  return (res.headers.get('Content-Type') || '').includes('text/html')
}

async function page(event, url) {
  const key = pageKey(url)
  const cache = await caches.open(PAGES)
  const network = (async () => {
    const preloaded = await event.preloadResponse
    const res = preloaded || (await fetch(event.request))
    if (saveable(url, res)) {
      const copy = res.clone()
      const path = new URL(key).pathname
      const scan = PRECACHE_PAGES.includes(path) ? res.clone() : null
      event.waitUntil(
        cache
          .put(key, copy)
          .then(() => trim(cache, PAGES_MAX, [...PRECACHE_PAGES.map(abs), KEEP_KEY]))
          .then(async () => {
            if (!scan) return
            const html = await scan.text()
            const keep = await readKeep()
            await writeKeep({ ...keep, [path]: assetsIn(html) })
          })
          .catch(() => undefined),
      )
    }
    return res
  })()
  network.catch(() => undefined)

  const saved = await cache.match(key)
  if (saved) {
    // Slow network: show the saved page rather than a blank screen; the fetch keeps
    // going and refreshes the copy for next time.
    const timeout = new Promise((resolve) => setTimeout(() => resolve(saved), NAV_TIMEOUT_MS))
    // A server error is no better than offline: show the saved copy instead.
    const answer = network.then((res) => (res.status >= 500 ? saved : res)).catch(() => saved)
    return Promise.race([answer, timeout])
  }
  try {
    return await network
  } catch {
    return offlinePage(cache)
  }
}

// ---------------------------------------------------------------- assets

async function cacheFirst(req, name, max) {
  const cache = await caches.open(name)
  const hit = await cache.match(req, { ignoreVary: true })
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok && res.type === 'basic' && res.status === 200) {
    const copy = res.clone()
    cache.put(req, copy).then(() => trimFor(cache, name, max)).catch(() => undefined)
  }
  return res
}

async function staleWhileRevalidate(req, name, max) {
  const cache = await caches.open(name)
  const hit = await cache.match(req, { ignoreVary: true })
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok && res.type === 'basic' && res.status === 200) {
        const copy = res.clone()
        cache.put(req, copy).then(() => trimFor(cache, name, max)).catch(() => undefined)
      }
      return res
    })
  if (hit) {
    refresh.catch(() => undefined)
    return hit
  }
  return refresh
}

// Cache keys come back in insertion order, so dropping from the front evicts the oldest.
async function trim(cache, max, keep = []) {
  const keys = await cache.keys()
  const extra = keys.length - max
  if (extra <= 0) return
  const victims = keys.filter((k) => !keep.includes(k.url)).slice(0, extra)
  await Promise.all(victims.map((k) => cache.delete(k)))
}

// STATIC is trimmed around the keep-list (the precached pages' chunks); other caches plainly.
async function trimFor(cache, name, max) {
  if (name !== STATIC) return trim(cache, max)
  const keep = await readKeep()
  return trim(cache, max, [...new Set(Object.values(keep).flat())])
}

// { [page path or '*']: absolute static URLs } — '*' holds the dynamic chunks found at install.
let keepMemo = null
async function readKeep() {
  if (keepMemo) return keepMemo
  try {
    const res = await (await caches.open(PAGES)).match(KEEP_KEY)
    const obj = res ? await res.json() : {}
    keepMemo = obj && typeof obj === 'object' ? obj : {}
  } catch {
    keepMemo = {}
  }
  return keepMemo
}

async function writeKeep(map) {
  keepMemo = map
  const cache = await caches.open(PAGES)
  await cache.put(KEEP_KEY, new Response(JSON.stringify(map), { headers: { 'Content-Type': 'application/json' } }))
}

function assetsIn(html) {
  const out = new Set()
  for (const m of html.matchAll(ASSET_RE)) out.add(abs('/_next/' + m[0].slice(m[0].indexOf('static/')).replace(/&amp;/g, '&')))
  return [...out]
}

function abs(path) {
  return new URL(path, self.location.origin).href
}

// ---------------------------------------------------------------- precache

// Script/link tags carry '/_next/static/…'; the inline RSC payload lists the same chunks as
// 'static/chunks/…'. Both are normalised to '/_next/static/…'.
const ASSET_RE = /(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\s<>()\\]+?\.(?:js|css|woff2)/g

async function precache() {
  const pages = await caches.open(PAGES)
  const statics = await caches.open(STATIC)
  const assets = new Set(PRECACHE_ASSETS)
  const perPage = {}
  await Promise.all(
    PRECACHE_PAGES.map(async (path) => {
      try {
        const res = await fetch(path, { credentials: 'same-origin', cache: 'no-cache' })
        if (!saveable(new URL(path, self.location.origin), res)) return
        const html = await res.clone().text()
        await pages.put(abs(path), res)
        perPage[path] = assetsIn(html)
        for (const u of perPage[path]) assets.add(u)
      } catch {
        // Offline during install: the page is saved on its first online visit instead.
      }
    }),
  )
  // Pass 1: the chunks the HTML names. Pass 2 and 3: the chunks those load later with
  // dynamic import (next/dynamic 3D scenes, game engines), which the HTML never lists:
  // read their webpack ids from the code and turn them into file names with the
  // webpack runtime's own map. If the build format ever changes, the passes find
  // nothing and those chunks are simply cached on first use instead.
  const texts = await fetchAll(statics, [...assets])
  await writeKeep({ ...perPage, '*': PRECACHE_ASSETS.map(abs) }).catch(() => undefined)
  const runtime = [...texts.entries()].find(([u]) => /\/static\/chunks\/webpack-[^/]+\.js$/.test(u))
  const resolve = runtime ? chunkResolver(runtime[1]) : null
  if (!resolve) return
  const seen = new Set(texts.keys())
  let sources = [...texts.values()]
  for (let pass = 0; pass < 2 && sources.length; pass++) {
    const next = new Set()
    for (const code of sources) {
      for (const m of code.matchAll(/\.e\((\d+)\)/g)) for (const u of resolve(Number(m[1]))) if (!seen.has(u)) next.add(u)
    }
    next.forEach((u) => seen.add(u))
    sources = [...(await fetchAll(statics, [...next])).values()]
  }
  await writeKeep({ ...perPage, '*': [...seen].map(abs) }).catch(() => undefined)
}

// Saves each URL in the static cache (a few at a time: a phone on school Wi-Fi should not
// open a hundred sockets at once) and returns the text of every JS file, for the scan above.
async function fetchAll(cache, urls) {
  const texts = new Map()
  const queue = [...urls]
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift()
      try {
        let res = await cache.match(u)
        if (!res) {
          const fresh = await fetch(u, { credentials: 'same-origin' })
          if (!fresh.ok || fresh.status !== 200) continue
          await cache.put(u, fresh.clone())
          res = fresh
        }
        if (u.endsWith('.js')) texts.set(u, await res.text())
      } catch {
        // Skipped; cached on first use instead.
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return texts
}

// webpack's runtime maps a chunk id to its file: a few explicit `ID===e?"static/chunks/…"`
// cases, then "static/chunks/" + (names[id] || id) + "." + hashes[id] + ".js"; CSS the same
// way through miniCssF. Returns id -> [URLs], or null if the runtime is not in that shape.
function chunkResolver(code) {
  const toMap = (src) => {
    const map = new Map()
    for (const m of (src || '').matchAll(/(\d+):"([^"]+)"/g)) map.set(Number(m[1]), m[2])
    return map
  }
  const explicit = new Map()
  for (const m of code.matchAll(/(\d+)===e\?"(static\/chunks\/[^"]+\.js)"/g)) explicit.set(Number(m[1]), m[2])
  const generic = code.match(/"static\/chunks\/"\+\(\((\{[^}]*\})\)\[e\]\|\|e\)\+"\."\+\((\{[^}]*\})\)\[e\]\+"\.js"/)
  if (!generic && !explicit.size) return null
  const names = toMap(generic && generic[1])
  const hashes = toMap(generic && generic[2])
  const css = toMap((code.match(/miniCssF=e=>"static\/css\/"\+\((\{[^}]*\})\)\[e\]\+"\.css"/) || [])[1])
  return (id) => {
    const out = []
    if (explicit.has(id)) out.push('/_next/' + explicit.get(id))
    else if (hashes.has(id)) out.push(`/_next/static/chunks/${names.get(id) || id}.${hashes.get(id)}.js`)
    if (css.has(id)) out.push(`/_next/static/css/${css.get(id)}.css`)
    return out
  }
}

// ---------------------------------------------------------------- offline page

const OFFLINE_LINKS = [
  ['/kids', 'Home', '🏠'],
  ['/kids/hangar', 'My Hangar', '🚀'],
  ['/kids/galaxy', 'Skill Galaxy', '🌌'],
  ['/kids/course', 'Course', '📚'],
  ['/kids/play', 'Games', '🎮'],
  ['/kids/worlds', 'Worlds', '🌍'],
  ['/kids/settings', 'Settings', '⚙️'],
]

async function offlinePage(cache) {
  const available = []
  for (const [path, label, icon] of OFFLINE_LINKS) {
    if (await cache.match(abs(path))) available.push([path, label, icon])
  }
  const links = available.length
    ? `<p>These still work without the internet:</p><nav aria-label="Saved pages">${available
        .map(([p, l, i]) => `<a class="tile" href="${p}"><span aria-hidden="true">${i}</span>${l}</a>`)
        .join('')}</nav>`
    : `<p>Open R2BOT Kids once with the internet on, and the main screens will work offline after that.</p>`
  return new Response(offlineHtml(links), {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function offlineHtml(links) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark"><meta name="theme-color" content="#0A1120"><meta name="robots" content="noindex">
<title>R2BOT Kids — offline</title>
<style>
:root{--void:#0A1120;--s1:#111C32;--s2:#19263F;--orange:#FC6818;--orange-300:#FFA878;--ink:#1A1103;--t1:#EEF2F8;--t2:#A7B0C0;--cyan:#38BDF8}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--void);color:var(--t1)}
body{font-family:"Space Grotesk",ui-rounded,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;
padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}
main{width:100%;max-width:480px;text-align:center}
.card{background:linear-gradient(to bottom,rgba(255,255,255,.06),rgba(255,255,255,.02)),var(--s1);border:1px solid rgba(255,255,255,.08);border-radius:28px;box-shadow:0 8px 24px rgba(0,0,0,.45);padding:32px 22px 26px}
.robot{width:112px;height:112px;display:block;margin:0 auto 18px}
@media (prefers-reduced-motion:no-preference){.robot{animation:bob 2.6s ease-in-out infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}}
h1{font-size:26px;line-height:1.2;margin:0 0 10px;font-weight:700}
p{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:17px;line-height:1.5;color:var(--t2);margin:0 0 16px}
nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:0 0 22px}
.tile{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 10px;border-radius:16px;background:var(--s2);border:1px solid rgba(255,255,255,.1);color:var(--t1);font-weight:700;font-size:16px;white-space:nowrap;text-decoration:none}
.tile:hover{border-color:var(--cyan)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;min-width:200px;padding:0 28px;border:0;border-radius:20px;background:var(--orange);color:var(--ink);font:inherit;font-size:19px;font-weight:700;cursor:pointer}
.btn:active{transform:scale(.97)}
.btn:focus-visible,.tile:focus-visible{outline:4px solid rgba(255,138,76,.6);outline-offset:3px}
.status{min-height:24px;margin:14px 0 0;font-size:15px;color:var(--orange-300)}
</style></head>
<body><main><div class="card">
<svg class="robot" viewBox="0 0 512 512" role="img" aria-label="R2BOT Kids robot"><rect width="512" height="512" rx="112" fill="#0F172A"/><line x1="256" y1="118" x2="256" y2="84" stroke="#CBD5E1" stroke-width="14" stroke-linecap="round"/><circle cx="256" cy="74" r="20" fill="#38BDF8"/><rect x="136" y="118" width="240" height="160" rx="64" fill="#E2E8F0"/><rect x="162" y="146" width="188" height="104" rx="44" fill="#0F172A"/><ellipse cx="214" cy="198" rx="22" ry="26" fill="#38BDF8"/><ellipse cx="298" cy="198" rx="22" ry="26" fill="#38BDF8"/><rect x="156" y="292" width="200" height="120" rx="40" fill="#F97316"/><circle cx="216" cy="352" r="12" fill="#34D399"/><circle cx="256" cy="352" r="12" fill="#FBBF24"/><circle cx="296" cy="352" r="12" fill="#F472B6"/><circle cx="186" cy="424" r="26" fill="#1E293B"/><circle cx="326" cy="424" r="26" fill="#1E293B"/></svg>
<h1>You're offline, and this page isn't saved yet</h1>
${links}
<button class="btn" id="retry" type="button">Try again</button>
<p class="status" id="status" role="status" aria-live="polite"></p>
</div></main>
<script>
(function(){var b=document.getElementById('retry'),s=document.getElementById('status');
function go(){if(navigator.onLine===false){s.textContent='Still offline. Ask a grown-up to check the Wi-Fi.';return}s.textContent='Looking for the internet…';location.reload()}
b.addEventListener('click',go);window.addEventListener('online',go)})();
</script></body></html>`
}
