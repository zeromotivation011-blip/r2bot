# R2BOT Kids standalone app: the static export

`build-export.mjs` turns every `/kids` page into static files inside the app
(`apps/kids-mobile/www`, Capacitor's `webDir`). The app then runs with no network
and never loads www.r2bot.in. The website build is not touched: all changes happen
in a scratch copy of the repo (`/tmp/kids-app-build`, or `KIDS_APP_BUILD_DIR`).

```bash
npm run kids:app:export          # repo root: export into apps/kids-mobile/www (about a minute with a warm cache)
npm run kids:app:verify          # open every exported page in headless Chromium (needs Playwright)
cd apps/kids-mobile && npm run build:apk   # export + cap sync android + gradlew assembleDebug
```

## What the build does to the copy
- Deletes `app/api`, `middleware.ts` and every `app/*` route that is not `/kids`.
- Copies `overrides/` over it: the app's root layout (fonts + globals.css, no GA,
  Supabase, auth, PWA prompt or site footer), `/` forwarding to `/kids/`, a kids 404,
  static redirect pages for `/kids/my-robot`, `/kids/world/**` and `/kids/activities`
  (a static export cannot run `redirects()`), `generateStaticParams` for the Spark
  Trail zones/levels and boss challenges, and a calm "needs a grown-up on r2bot.in"
  page for the server-only grown-up screens (`/kids/classroom`, `/kids/classroom/school`,
  `/kids/join`, `/kids/present`).
- Removes what a static export cannot hold: the per-class teacher dashboards
  (`/kids/classroom/[classId]/**`), the share image and the PWA manifest route; and the
  internal activity-template test benches (`/kids/lab/templates/*`), which 404 in production.
- Builds with `output: 'export'`, `trailingSlash: true` and `NEXT_PUBLIC_KIDS_APP=1`.

`NEXT_PUBLIC_KIDS_APP=1` switches on `KIDS_STANDALONE` (`lib/kids/app-context.ts`):
no service worker or install prompt, no `/api` calls (Ask Spark answers from its
offline FAQ, Talk to your robot uses the on-device parser, the Passport points at
the backup code, the class sync is off), and gated links that leave `/kids` open on
`https://www.r2bot.in/<path>` in the system browser. The website never sets it.

## Layout of `www/`
```
index.html           forwards to /kids/
404.html             "This robot got lost" (kids page)
app-build.json       { builtFrom (git sha), dirty, pages, kidsPages, removed[] }
kids/**/index.html   every page; kids/**/index.txt is its RSC payload
kids/audio/**        story voices;  kids/lab/blockly-media/*  Blockly's images
_next/static/**      JS, CSS, fonts
```

## Path rule the native layer must follow
- a path with no file extension → `<path>/index.html` (`/kids/hangar` and `/kids/hangar/` → `kids/hangar/index.html`)
- anything else → that file (`/_next/static/…`, `/kids/hangar/index.txt`)
- missing → `404.html` (the kids "This robot got lost" page, status 404)

`verify-export.mjs` serves `www/` with exactly this rule.
