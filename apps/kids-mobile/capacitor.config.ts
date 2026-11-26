// apps/kids-mobile/capacitor.config.ts
// Native shell for R2BOT Kids (Google Play + App Store).
//
// The app is a thin, kid-safe wrapper around https://www.r2bot.in/kids: the
// website is the product, so every web deploy reaches the app at once and the
// native shell only changes when this folder changes. The bundled `www/` holds
// ONE file — the offline page — shown whenever the site cannot load.
//
// No imports on purpose: the repo-root `tsc` (CI + Vercel build) type-checks
// every *.ts file but never installs this folder's node_modules, so importing
// `@capacitor/cli` here would break the web build. The object is checked
// against Capacitor's real `CapacitorConfig` type by `config.check.mts`
// (`npm run type-check` inside apps/kids-mobile).

/** Sent with every request so r2bot.in can tell the app apart from a browser
 *  (keep navigation inside /kids, gate outbound links — see README). */
export const APP_USER_AGENT_TOKEN = 'R2BOTKidsApp/1.0'

const NAVY = '#0A1120'

const config = {
  appId: 'in.r2bot.kids',
  appName: 'R2BOT Kids',
  webDir: 'www',
  backgroundColor: NAVY,
  appendUserAgent: APP_USER_AGENT_TOKEN,
  // Pinch-zoom off: the kids UI is built for touch at 1x and zoom breaks drag games.
  zoomEnabled: false,
  loggingBehavior: 'none' as const,
  server: {
    url: 'https://www.r2bot.in/kids?source=app',
    // Only our own site may load inside the app; everything else opens in the
    // system browser (and the website puts a parental gate in front of that).
    allowNavigation: ['www.r2bot.in'],
    androidScheme: 'https',
    cleartext: false,
    // Bundled offline page (www/index.html), shown when the site cannot load.
    errorPath: 'index.html',
  },
  android: {
    allowMixedContent: false,
    captureInput: false,
    // Debug builds only; release builds never expose the WebView to DevTools.
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'never' as const,
    // App-bound domains: WKWebView will only run script on www.r2bot.in and
    // the bundled page (WKAppBoundDomains in ios/App/App/Info.plist).
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile' as const,
  },
  plugins: {
    SplashScreen: {
      // Covers the first network round-trip to r2bot.in; hides itself.
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: NAVY,
      androidScaleType: 'CENTER_CROP' as const,
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
}

export default config
