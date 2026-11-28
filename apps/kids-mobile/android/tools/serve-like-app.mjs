// Serves apps/kids-mobile/www the way the Android app does, for browser tests
// (headless Chromium / Playwright at 390x844) on machines without an emulator.
//
//   node android/tools/serve-like-app.mjs [wwwDir] [port]     (defaults: ../../www, 4610)
//
// Mirrors KidsRoutes.java + KidsWebViewClient.java + Capacitor's WebViewLocalServer:
//  - "/"                          -> www/index.html (Capacitor's own root page)
//  - extensionless "/a/b" or "/a/b/" -> www/a/b/index.html if it exists, else the bundled
//                                    not-found page (offline.html, 404.html, 404/index.html) with 404
//  - a path with an extension     -> that file, or an empty 404
//  - a top-level NAVIGATION (Sec-Fetch-Mode: navigate) to a local path outside
//    /, /kids/**, /_next/** and root files is what the app hands to the system
//    browser: here it answers 200 with header X-Kids-App-External: <site URL> and a
//    marker page, so a test can assert "this link leaves the app".
// Plain Node, no dependencies. Not used by the app itself.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, resolve, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(process.argv[2] ?? join(here, '..', '..', 'www'))
const port = Number(process.argv[3] ?? 4610)
const SITE = 'https://www.r2bot.in'
const NOT_FOUND = ['offline.html', '404.html', '404/index.html']

// Java's URLConnection.guessContentTypeFromName where it knows the type; Capacitor adds js/mjs/wasm.
const MIME = {
  '.html': 'text/html', '.htm': 'text/html', '.txt': 'text/plain', '.js': 'application/javascript',
  '.mjs': 'application/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/x-wav', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.glb': 'model/gltf-binary',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
}

/** KidsRoutes.pageAssetFor */
export function pageAssetFor(path) {
  if (!path || path === '/' || !path.startsWith('/')) return null
  if (path.startsWith('/_capacitor_') || path.includes('\\') || path.includes('\0')) return null
  if (path.split('/').some((s) => s === '..' || s === '.')) return null
  let t = path
  while (t.endsWith('/') && t.length > 1) t = t.slice(0, -1)
  if (t.includes('//')) return null
  const last = t.slice(t.lastIndexOf('/') + 1)
  if (!last || last.includes('.')) return null
  return t.slice(1) + '/index.html'
}

/** KidsRoutes.staysInApp */
export function staysInApp(path) {
  if (!path || path === '/') return true
  if (path === '/kids' || path.startsWith('/kids/')) return true
  if (path.startsWith('/_next/')) return true
  const rest = path.slice(1)
  return !rest.includes('/') && rest.includes('.')
}

async function file(rel) {
  const p = resolve(root, rel)
  if (!p.startsWith(root)) return null
  try {
    if (!(await stat(p)).isFile()) return null
    return await readFile(p)
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'https://localhost')
  let path
  try { path = decodeURIComponent(url.pathname) } catch { path = url.pathname }
  const send = (status, type, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...headers })
    res.end(req.method === 'HEAD' ? undefined : body)
  }

  if (req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document' && !staysInApp(path)) {
    const target = SITE + url.pathname + url.search + url.hash
    return send(200, 'text/html', `<!doctype html><title>external</title><p id="external">${target}</p>`, { 'X-Kids-App-External': target })
  }
  if (path === '/') {
    const body = await file('index.html')
    return body ? send(200, 'text/html', body) : send(404, 'text/plain', '')
  }
  const page = pageAssetFor(path)
  if (page) {
    const body = await file(page)
    if (body) return send(200, 'text/html', body)
    for (const nf of NOT_FOUND) {
      const b = await file(nf)
      if (b) return send(404, 'text/html', b)
    }
    return send(404, 'text/plain', '')
  }
  const ext = extname(path)
  if (!ext) {
    // Capacitor html5 mode: any other extensionless path gets the root page.
    const body = await file('index.html')
    return body ? send(200, 'text/html', body) : send(404, 'text/plain', '')
  }
  const body = await file(path.slice(1))
  return body ? send(200, MIME[ext.toLowerCase()] ?? 'application/octet-stream', body) : send(404, MIME[ext.toLowerCase()] ?? 'text/plain', '')
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} like the app at http://localhost:${port}/`)
})
