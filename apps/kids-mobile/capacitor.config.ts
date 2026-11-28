// apps/kids-mobile/capacitor.config.ts
// R2BOT Kids, the standalone app (Android APK; iOS project kept in step).
//
// Everything is BUNDLED: `www/` is the Next.js static export of /kids (every
// page, the JS/CSS, audio, 3D models, Blockly), copied into the APK by
// `cap sync` and served from https://localhost inside the app. There is no
// server.url: the app never loads www.r2bot.in and works with no network.
// Server-only features (class join, teacher dashboards, passport copy, AI
// modes) are not in the app; the on-device paths are. See README.md.
//
// Native path mapping (/kids/hangar/ -> kids/hangar/index.html) and the
// outbound-link rules live in android/app/src/main/java/in_/r2bot/kids/.
//
// No imports on purpose: the repo-root `tsc` (CI + Vercel build) type-checks
// every *.ts file but never installs this folder's node_modules, so importing
// `@capacitor/cli` here would break the web build. The object is checked
// against Capacitor's real `CapacitorConfig` type by `config.check.mts`
// (`npm run type-check` inside apps/kids-mobile).

/** Appended to the WebView user agent so the bundled pages can tell they run
 *  inside the app (navigator.userAgent), e.g. to hide server-only features. */
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
    // No `url`: the app serves the bundled www/ only. `localhost` over https gives
    // the pages a secure context (camera, service worker, crypto.subtle).
    hostname: 'localhost',
    androidScheme: 'https',
    iosScheme: 'capacitor',
    cleartext: false,
    // Nothing is allowed to load inside the app from another host; links out open
    // in the system browser (MainActivity / KidsWebViewClient).
    allowNavigation: [],
  },
  android: {
    allowMixedContent: false,
    captureInput: false,
    // webContentsDebuggingEnabled is deliberately left unset: Capacitor then enables
    // WebView remote debugging for debuggable (debug) builds only, never in release
    // (CapConfig: default = FLAG_DEBUGGABLE).
  },
  ios: {
    contentInset: 'never' as const,
    // The iOS project is kept in step but not part of the test build (Android APK).
    // App-bound domains: WKWebView runs script only on the bundled pages.
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile' as const,
  },
  plugins: {
    SplashScreen: {
      // Covers the first paint of the bundled home screen; hides itself.
      launchShowDuration: 800,
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
