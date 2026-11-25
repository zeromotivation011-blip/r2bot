// public/kids-sw.js — service worker for the R2BOT Kids app, registered with scope '/kids'.
//
// Deliberately small:
//   - Pages (navigations): network first, so a child online always gets the
//     current page; the last good copy is served when the network is gone.
//   - /_next/static/* (content-hashed, immutable): cache first.
//   - Everything else (APIs, analytics, video): untouched.
// Bump VERSION to drop old caches.

const VERSION = 'r2bot-kids-v1'
const PAGES = `${VERSION}-pages`
const STATIC = `${VERSION}-static`
const PRECACHE = ['/kids', '/kids/workshop', '/kids/code-lab', '/kids/stories', '/kids/world']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('r2bot-kids-') && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate' && url.pathname.startsWith('/kids')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(PAGES).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/kids'))),
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
