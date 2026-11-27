# R2BOT Kids — Android + iOS app (Capacitor 8)

The store app is a thin, kid-safe native shell around **https://www.r2bot.in/kids**.
The website is the product: every Vercel deploy reaches the app instantly. The
native shell only needs a new store release when something in this folder changes.

| | |
|---|---|
| App ID / bundle ID | `in.r2bot.kids` |
| Name | R2BOT Kids |
| Loads | `https://www.r2bot.in/kids?source=app` (the PWA uses `?source=pwa`) |
| Allowed in-app hosts | `www.r2bot.in` only. Every other link opens in the system browser |
| Offline | The site's service worker (`public/kids-sw.js`) keeps the main screens working with no network after one online launch (see "What works offline"). `www/index.html` is the bundled fallback for a first launch with no network: navy and orange, a retry button and a parental gate |
| Permissions | Internet, and the Camera (Workshop AR only, asked at runtime). Nothing else |
| SDKs | None besides Capacitor core and splash-screen. No ads, no analytics, no Firebase, no push |
| User-Agent | The normal WebView UA plus `R2BOTKidsApp/1.0`, so the site can tell when it runs in the app |

> **Not ready to submit yet.** The app lets the child reach any page on www.r2bot.in, not only
> `/kids`: `allowNavigation` is per host, and the site's own links (client-side navigation included)
> can lead to the adult site, where the email lead forms, Co-pilot, sign-in and GA all load. Neither
> Play Families nor the App Store Kids category will pass review until the website changes in
> "What the website must do" are live: GA off inside the app, outbound links gated, navigation kept
> inside `/kids`, and a children's section in the privacy policy. Nothing in this native shell
> can enforce that by itself.

This folder has its own `package.json`. It is **not** part of the web app's
dependencies, and Vercel never builds it.

## What works offline

The app and the PWA share one service worker, `public/kids-sw.js` on the website (scope `/kids`).
It installs on the first online launch and works in both WebViews: Android WebView supports service
workers for remote pages, and iOS WKWebView does because the app uses App-Bound Domains
(`WKAppBoundDomains = www.r2bot.in`).

| Works offline | How |
|---|---|
| Home, Hangar, Settings, Skill Galaxy, Course map, Worlds, Games hub, and the Sumo Arena, Drone Hover and Maze Mapper games | Saved when the worker installs (the page plus the JS/CSS its HTML references) |
| Any other `/kids` page the child has already opened | Saved on each online visit, network first; the newest 40 are kept |
| Story episodes the child has already played | Voice clips are saved the first time an episode plays (up to about 2,000 clips, roughly 40–60 MB) and survive website updates |
| Progress, stars, badges, the robot design, settings | Always on the device (`localStorage`), so nothing is lost offline |
| Slow school Wi-Fi | If a saved page exists and the network takes longer than 4 s, the saved page is shown and refreshed in the background |

| Needs the internet | Why |
|---|---|
| A page never opened before | Shows a branded offline page (built into the worker) with links to the saved screens and a retry button |
| Joining a class, teacher pages, syncing progress to a class | Server calls (`/api/*` is never cached; `/kids/classroom` and `/kids/join` are never saved) |
| Ask Spark with AI on, Talk to your robot with AI on | Server calls. The offline FAQ answers still work |
| Episodes never played, 3D parts loaded on demand for screens never opened | Not downloaded yet |
| First launch with no network at all | The worker is not installed yet, so Capacitor shows `www/index.html` |

Updating the worker is a website deploy, not a store release. Bump `VERSION` in `public/kids-sw.js`
when its caching rules change; old page and code caches are deleted on activate (audio is kept).
To test: open the app online once, switch on airplane mode, relaunch, and check Home and the Hangar
load, then open a page you have never visited and check the offline page appears.

## Layout

```
capacitor.config.ts   app config (no imports, so the repo-root tsc stays green)
config.check.mts      type-checks the config against Capacitor's real type (npm run type-check)
www/index.html        bundled offline fallback (server.errorPath)
resources/            icon + splash PNGs; resources/src/*.svg are the sources (from public/kids-icon.svg)
android/              native Android project (committed)
ios/                  native iOS project, Swift Package Manager, no CocoaPods (committed)
```

## Run it on a device

```bash
cd apps/kids-mobile
npm ci
npx cap sync            # copies www/ + config into android/ and ios/
npx cap open android    # Android Studio
npx cap open ios        # Xcode (macOS)
```

To change the icon or splash, edit `resources/src/*.svg`, render them to PNG
(any SVG renderer works, at 1024² for icons and 2732² for the splash), then run
`npm run assets`. After that, set `values/ic_launcher_background.xml` back to
`#0A1120`, because the generator resets it to white.

## Android: build and publish on Google Play

### Toolchain
JDK 21 and the Android SDK (Platform 36, Build-Tools 36). The easiest way to get
both is Android Studio. Settings: compile/target SDK **36** (Android 16) and min SDK 24,
both in `android/variables.gradle`. Google Play requires apps to target an API level
within about a year of the newest Android release, and the deadline moves every August. API 36
meets the 2026 requirement. Re-check each summer under *Play Console → Policy status → Target API level*.

### Debug APK
```bash
npm run android:debug
# → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
Debug builds turn on WebView remote debugging (`chrome://inspect`). Release builds
never do (`MainActivity.java`).

### Signing (one time)
```bash
keytool -genkeypair -v -keystore ~/r2bot-kids-upload.jks -alias upload \
  -keyalg RSA -keysize 4096 -validity 10000
```
Create `android/keystore.properties`. Both it and `*.jks` are gitignored, so never commit them:
```
storeFile=/Users/<you>/r2bot-kids-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```
In Play Console, turn on **Play App Signing**. Google keeps the app-signing key, and
your `.jks` is only the *upload* key. Keep a backup of it and its passwords in a password manager.

### Release bundle
1. Bump `versionCode` (+1 on every upload) and `versionName` in `android/app/build.gradle`.
2. `npm run android:release` produces `android/app/build/outputs/bundle/release/app-release.aab`
3. In Play Console, create the app, then go to *Testing → Internal testing*, upload the `.aab`, and test on a phone.
   Then promote it to Closed testing and on to Production. A new **personal** developer account
   must run a closed test with at least 12 testers for 14 days before Production unlocks.

### Families policy / "Designed for Families"
The target audience includes children under 13, so the app is in the **Families** program.
The Families policy is mandatory for it:
- *App content → Target audience and content*: tick the age groups **5 and under, 6–8, 9–12,
  13–15, 16–17**. Tick "Appeals to children": Yes.
- **Ads:** answer "No, my app does not contain ads". This is true, because no ads SDK is present and the
  manifest strips `AD_ID`.
- Only Families-self-certified SDKs are allowed. Capacitor ships no data-collecting SDKs. Keep it that way:
  **do not add Firebase/Analytics/Crashlytics/AdMob plugins**.
- No precise location, no `AD_ID`, and no collection of device identifiers from children. The manifest
  removes location, contacts, microphone and phone-state permissions explicitly.
- The camera: the store listing and the in-app permission prompt say it's used only for AR and that
  frames never leave the device.
- **Teacher Approved** (optional): apply after launch. Reviewers look for a parental gate on
  outbound links and purchases (see "What the website must do").
- Content rating questionnaire (IARC): education, no violence, no user-to-user chat, no
  purchases, and no sharing of location. Answer "users can interact" **No**. The class nickname is
  shown only to the child's teacher, and children cannot message each other.

### Data safety form (Play Console → App content → Data safety)
Answer for the *app*. That includes the website it loads, because Google counts the WebView's
traffic as the app's.

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes, collected (not shared), and only when a child joins a class** with a teacher's code: (1) the class nickname, (2) a progress snapshot for the teacher, (3) the Workshop robot's name. Rows below |
| Data type (1) | *Personal info → Name* (the nickname: a free-text alias, not a real name; the UI says so) |
| Collected / shared | Collected: yes. Shared with third parties: **no** |
| Processed ephemerally? | No (stored so the teacher sees the class) |
| Required or optional? | **Optional.** The app works fully without joining a class |
| Purpose | App functionality |
| Encrypted in transit | Yes (HTTPS only, cleartext disabled) |
| Can users request deletion? | Yes. A teacher can remove a member, or you can delete on request. Give a contact email and the deletion URL |
| Data type (2) | *App activity → App interactions*: **only for a child who has joined a class.** The page then syncs a progress snapshot to the teacher's class (`app/api/kids/sync`, stored in `kids_class_members.snapshot`): star totals, levels/zones finished, story episodes, Code Lab missions, course sessions, activities done, games played, minutes played, which levels the child keeps retrying ("stuck"), the age band, and the Workshop robot design |
| Data type (3) | *App activity → Other user-generated content*: the **robot name** the child types in the Workshop, which travels inside that robot design (filtered like the nickname) |
| For types (2) and (3) | Collected: yes. Shared: **no**. Ephemeral: no. **Optional** (only after joining a class). Purpose: **App functionality** (the teacher's class view). Deletion: removing the member deletes the row and its snapshot |
| Everything else (location, contacts, photos, audio, device IDs, diagnostics, financial info) | **Not collected.** A child who has *not* joined a class keeps all progress (stars, badges, robot design) **on the device only** (`localStorage`); nothing is sent. Camera frames never leave the device |

Children never give an email, password, phone number or birthday. A classroom identity is a random
token whose SHA-256 hash is stored on the server. If the website ever adds analytics *on /kids pages
shown inside the app*, this form must change first. Today the GA tag must stay **off** on `/kids` when
the UA contains `R2BOTKidsApp` (see below). **Today `app/layout.tsx` loads GA on every page,
including `/kids`, so this must be fixed on the website before submitting.**

Privacy policy URL: `https://www.r2bot.in/privacy`. Before submitting, make sure it has a
children's section that covers COPPA and GDPR-K: the class nickname, the progress snapshot and robot
name a joined child shares with their teacher, on-device progress otherwise, no ads, and how to
request deletion.

**Keep this form in step with `ClassSnapshot` in `lib/kids/classroom.ts`.** Any new field added to the
snapshot is new collected data and may need a new row here and on Apple's label before the next
release.

## iOS: build and publish on the App Store

`npx cap add ios` worked on Linux, because Capacitor 8 uses Swift Package Manager and needs
no CocoaPods. **Building, signing and uploading need a Mac with Xcode 16 or later.**

1. Get an Apple Developer Program account ($99/yr; an *Organization* account is recommended for a kids app).
2. In App Store Connect, go to *Apps → +*. Bundle ID `in.r2bot.kids`, name "R2BOT Kids", primary category
   **Education**, plus the **Kids category** with ONE age band (5 and under, 6–8 or 9–11).
   Pick 6–8 or 9–11, whichever band most of the content is designed for.
3. On the Mac:
   ```bash
   cd apps/kids-mobile && npm ci && npx cap sync ios && npx cap open ios
   ```
   In Xcode, under *App target → Signing & Capabilities*, choose your Team and leave "Automatically manage
   signing" on. Under *General*, set Version (`MARKETING_VERSION`, e.g. 1.0.0) and Build
   (`CURRENT_PROJECT_VERSION`, +1 per upload).
4. *Product → Archive*, then *Distribute App → App Store Connect → Upload*. Test through TestFlight.
5. Requirements for the Kids category (App Review Guideline 1.3 and 5.1.4):
   - **No third-party analytics or advertising.** None are in the app. The website must not run
     GA/gtag on `/kids` inside the app (see below).
   - **Parental gate** before any link that leaves the app, any purchase, or any request for
     permissions beyond the core experience. The offline page implements one: a multiplication
     question with a typed answer, in `www/index.html`. The website must do the same.
   - Privacy "nutrition label": the same answers as Play's data-safety form. Declare, each as
     **not linked to the user's identity** and **not used for tracking**, purpose *App Functionality*:
     - *Contact Info → Name*: the class nickname (optional, an alias, not a real name).
     - *Usage Data → Product Interaction*: the progress snapshot a joined child syncs to the teacher's
       class (stars, levels, episodes, missions, sessions, activities, games, minutes, "stuck" counts, age band).
     - *User Content → Other User Content*: the Workshop robot design and the robot name the child types.
     Nothing else. A child who never joins a class sends none of these.
   - The camera usage string is in `ios/App/App/Info.plist` (`NSCameraUsageDescription`).
6. **App-bound domains** are on (`WKAppBoundDomains = www.r2bot.in`, and
   `limitsNavigationsToAppBoundDomains: true`), so script only runs on our own site.
7. iOS has no system Back button. The website's own Back controls must be visible on every
   `/kids` screen (they are today). If wanted later, swipe-back can be enabled with a small
   `CAPBridgeViewController` subclass that sets `webView.allowsBackForwardNavigationGestures = true`.
8. Guideline 4.2 (minimum functionality): Apple rejects "just a website". The arguments for this
   app are camera AR, an offline screen, no browser chrome, a kid-safe locked domain, and the parental gate.
   Put those in the review notes, with a demo class code for the reviewer, and mention that the main screens and saved episodes work offline (see "What works offline").

## What the website must do (r2bot.in, not this folder)

The app identifies itself with `R2BOTKidsApp/` in the User-Agent and `?source=app` on launch.
Inside the app, `/kids` pages must:
1. **Gate every outbound link** with a parental gate (any host other than www.r2bot.in, plus mailto:
   and store links), using the same math-question pattern as `www/index.html`. On Android and iOS
   those links leave the app for the system browser.
2. **Not load GA/gtag or any third-party script** when the UA contains `R2BOTKidsApp`. This is
   the safest choice for every `/kids` page, since R2BOT Kids is a children's product.
3. **Keep navigation inside `/kids`.** Links to the adult site (Atlas, Co-pilot, sign-in) should
   be hidden in the app or sit behind the gate.
4. **Never ask for** an email, password, phone number or birthday (already the rule).
5. Keep a visible Back button on every screen (iOS has no system Back).

## How updates work

- **Web content** (lessons, games, stories, fixes): deploy the website as usual and the app shows it on
  the next launch. No store review is needed.
- **Native shell** (this folder): a change to `capacitor.config.ts`, `www/index.html`, icons,
  permissions, a Capacitor upgrade, or the target SDK needs `npx cap sync`, a `versionCode`/Build bump,
  and a store upload with review. Expect about one release a year for the yearly target-SDK bump.
- Don't use the app to ship features the store reviewer never saw that change the app's core purpose.
  Store rules allow web content updates, not a different app.

## Build status from the generating environment (26 Nov 2026)

- Generated with `npx cap add android` / `npx cap add ios` (Capacitor 8.6.3, on Linux).
- **No APK was built there.** The sandbox's network proxy blocks `dl.google.com`, which serves the
  Android SDK (platforms, build-tools), the command-line tools and Google's Maven repo
  (`com.android.tools.build:gradle`). JDK 21 and Gradle 8.14 were present, but without the SDK and
  AGP Gradle cannot configure the project. Run `npm run android:debug` on any machine with Android
  Studio installed.
- Before the first release, verify on a real device: the camera prompt in Workshop AR, offline use after one online launch (airplane
  mode: Home, Hangar and an already-played episode must load), the bundled offline page (first launch in airplane
  mode, then retry; and Back from the offline page must step back past the failed page or leave the app, never loop), Back walking through history, that `https://r2bot.in/…` (apex, used by the
  gate) redirects to www, and the adaptive icon on a Pixel launcher.
