// lib/kids/app-context.ts — "are we inside the R2BOT Kids store app?"
//
// The Capacitor shell (apps/kids-mobile/capacitor.config.ts) appends
// `R2BOTKidsApp/<version>` to the WebView's User-Agent and launches
// `/kids?source=app`. Inside the app the website must behave as a children's
// app (Google Play Families, App Store Kids category):
//   - no Google Analytics (components/GoogleAnalyticsClient.tsx),
//   - every link that leaves /kids sits behind a parental gate
//     (components/kids/app/KidsAppLinkGuardClient.tsx),
//   - the adult site's footer is hidden (html.kids-app in kids-shell.css).
//
// Detection is client-side only: kids pages are static, so the server cannot
// vary them per User-Agent. `KIDS_APP_BOOT_SCRIPT` runs before first paint
// (app/kids/layout.tsx) and sets `html.kids-app`, so nothing adult-facing flashes.

/**
 * True only in the STANDALONE app build (scripts/kids-app/build-export.mjs sets
 * NEXT_PUBLIC_KIDS_APP=1): every /kids page is a static file inside the APK, so
 * there is no server, no /api and no service worker. Inlined at build time, so
 * the website build (where it is never set) is unaffected and dead-code-strips it.
 */
export const KIDS_STANDALONE = process.env.NEXT_PUBLIC_KIDS_APP === '1'

/** The public website, for links that leave /kids inside the standalone app. */
export const KIDS_WEB_ORIGIN = 'https://www.r2bot.in'

/**
 * Where a link that leaves /kids really goes. On the website: unchanged. In the
 * standalone app the bundle holds only /kids, so a same-origin path outside it
 * (/privacy, /shorts/…) becomes the absolute www.r2bot.in URL, which the native
 * shell opens in the system browser. Callers keep the parental gate in front.
 */
export function outboundHref(href: string): string {
  if (!KIDS_STANDALONE || typeof window === 'undefined') return href
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) return href // mailto:, tel:
  try {
    const u = new URL(href, window.location.href)
    if (u.origin !== window.location.origin) return u.href
    if (u.pathname === '/kids' || u.pathname.startsWith('/kids/')) return u.href
    return KIDS_WEB_ORIGIN + u.pathname + u.search + u.hash
  } catch {
    return href
  }
}

/** The token the native shell appends to the User-Agent. Keep in step with APP_USER_AGENT_TOKEN. */
export const KIDS_APP_UA_TOKEN = 'R2BOTKidsApp/'

/** sessionStorage key that remembers `?source=app` for the rest of the session. */
export const KIDS_APP_SESSION_KEY = 'r2kids-app'

/** Class set on <html> while inside the app. */
export const KIDS_APP_CLASS = 'kids-app'

export function isKidsAppUserAgent(ua: string | null | undefined): boolean {
  return typeof ua === 'string' && ua.includes(KIDS_APP_UA_TOKEN)
}

/** Client only. True inside the store app (User-Agent, or launched with ?source=app this session). */
export function detectKidsApp(): boolean {
  if (typeof window === 'undefined') return false
  if (KIDS_STANDALONE) return true
  try {
    if (isKidsAppUserAgent(window.navigator.userAgent)) return true
    if (new URLSearchParams(window.location.search).get('source') === 'app') {
      window.sessionStorage.setItem(KIDS_APP_SESSION_KEY, '1')
      return true
    }
    return window.sessionStorage.getItem(KIDS_APP_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** Inline, render-blocking: marks <html> before first paint. Same rules as detectKidsApp(). */
export const KIDS_APP_BOOT_SCRIPT = KIDS_STANDALONE
  ? `document.documentElement.classList.add('${KIDS_APP_CLASS}')`
  : `try{var u=navigator.userAgent||'',s=new URLSearchParams(location.search).get('source')==='app';` +
  `if(s)sessionStorage.setItem('${KIDS_APP_SESSION_KEY}','1');` +
  `if(u.indexOf('${KIDS_APP_UA_TOKEN}')>=0||s||sessionStorage.getItem('${KIDS_APP_SESSION_KEY}')==='1')` +
  `document.documentElement.classList.add('${KIDS_APP_CLASS}')}catch(e){}`

/** Is this href inside the kids product (same origin, path /kids or below)? */
export function isInsideKids(href: string, origin: string): boolean {
  try {
    const u = new URL(href, origin)
    if (u.origin !== origin) return false
    return u.pathname === '/kids' || u.pathname.startsWith('/kids/') || u.pathname === '/kids-icon.svg'
  } catch {
    return false
  }
}
