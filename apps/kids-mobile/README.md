# R2BOT Kids — the standalone Android app (Capacitor 8)

**One app, everything inside it.** The APK carries every R2BOT Kids page, script, style,
sound, 3D model and the Blockly editor. It does not load www.r2bot.in, needs no account and
works with no network at all, from the first launch. There is no robot or hardware
integration. This is the build to install on a phone and test.

| | |
|---|---|
| App ID | `in.r2bot.kids` · name **R2BOT Kids** · version 1.0.0-test (versionCode 1) |
| Content | `www/` = the Next.js static export of `/kids` (`output: 'export'`, `trailingSlash: true`), copied into the APK by `cap sync` and served inside the app at `https://localhost/` |
| Network | Not needed. No `server.url`. Nothing from another host ever loads inside the app |
| Links out | A link to a non-kids page (e.g. `/privacy`) opens `https://www.r2bot.in/…` in the **system browser**; other sites, `mailto:` and `tel:` open in their own apps; other schemes are dropped. The kids pages put the parental gate in front of these links |
| Permissions | `INTERNET` (normal, install time; nothing in the app needs it) and `CAMERA` (Workshop AR "magic window", asked at runtime, frames never leave the phone). Nothing else |
| Backup | `allowBackup="false"`: no Google cloud backup, no adb backup. Progress stays on the phone; the in-app backup code (Garage / Settings) is how a family moves it |
| SDKs | Capacitor core + splash screen only. No ads, analytics, Firebase or push |
| User agent | WebView UA + `R2BOTKidsApp/1.0`, so the pages know they run in the app |
| Screen | Portrait and landscape (games use landscape). No pinch zoom |

## What is in the app, and what is not

Everything that runs on the device is in the app: Home and the five tabs, Worlds, Games,
Story Theatre (voiced), Workshop (3D builder + camera AR), Code Lab (Blockly), Spark Trail,
the labs, Robot Maths, Robodex, Makers, Make at Home, Settings, Profiles, the Garage,
progress/stars/badges (on the device), the backup code, **Ask Spark** (the offline FAQ answers)
and **Talk to your robot** (the on-device parser).

Saving a file, printing, the share sheet and reading aloud work on the phone through the app's
small native plugin (see "How the app serves the pages"). There is no microphone in the app
(typing only), and Ask Spark says plainly that questions stay on the device.

Not in the app, because they need the R2BOT server: joining a class, the teacher's class pages,
the Robot Passport server copy, class progress sync (`/api/kids/*`), and the AI modes of Ask Spark
and Talk. Those screens show a calm "this part needs a grown-up on r2bot.in" note instead of an
error. Nothing breaks without them.

## Build the APK (one command)

Needs JDK 21, the Android SDK (Platform 36, Build-Tools 35 or 36; `ANDROID_HOME`, or `sdk.dir`
in `android/local.properties`, which is gitignored) and Node 22.

1. Produce the bundled export in `apps/kids-mobile/www`: `npm run kids:app:export` at the repo
   root (or `npm run export:www` here). It must leave `www/kids/index.html`, `www/_next/static/**`
   and `www/404.html`. `npm run build:apk` here does export + sync + assembleDebug in one go.
2. Then, from `apps/kids-mobile` (after `npm ci` once):

```bash
android/build-apk.sh
# = npx cap sync android && cd android && ./gradlew testDebugUnitTest assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk   (signed with the Android debug key)
```

Hand testers a copy named for what it is, e.g. `dist/r2bot-kids-test.apk` (`dist/` is gitignored).

If the Gradle wrapper cannot download Gradle, run it with a local Gradle 8.14:
`GRADLE_BIN=/opt/gradle/bin/gradle android/build-apk.sh`.

A release build later: create `android/keystore.properties` (see "Signing" below; never commit it
or a keystore), then `android/build-apk.sh release` → `app-release.apk` + `app-release.aab`.
The script refuses to run a release build without the keystore file.

## Install it on a phone

- **Copy the file:** send `app-debug.apk` to the phone (USB, Drive, a chat to yourself), tap it,
  and allow "Install unknown apps" for the app you opened it from when Android asks.
- **USB debugging:** Settings → About phone → tap *Build number* 7 times → Developer options →
  *USB debugging* on. Then `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
  A new build with the same debug key installs over the old one and keeps the progress.

## How to test

- **On the phone:** switch on airplane mode before the first launch: everything must still work.
  Also try the native parts: Garage → backup code → "Download .txt" (a file appears in
  Downloads › R2BOT Kids), Garage "Share robot card" (share sheet), Make at Home "Print this build"
  (print dialog), and Settings → "Read everything to me" then Ask Spark (it speaks).
  Try Home, each tab, a game in landscape, a story with voice, Workshop (the camera prompt
  appears only when you open AR), Code Lab, a reload deep inside (pull the app from recents and
  reopen), the system Back button (it steps back; on Home it leaves the app), and a grown-up link
  (it opens the browser, never inside the app).
- **Watch what it does:** with USB debugging, open `chrome://inspect` on a computer: the debug
  build's WebView is listed and you get the full DevTools (console, network, storage).
- **Without a phone** (CI / no emulator): `node android/tools/serve-like-app.mjs www 4610` serves
  `www/` with exactly the app's path rules (below) on `http://localhost:4610`; drive it with
  Playwright at 390×844 touch. Navigations the app would hand to the browser come back with an
  `X-Kids-App-External` header.
- **The native rules** have device-free JUnit tests: `cd android && ./gradlew testDebugUnitTest`
  (`app/src/test/java/in_/r2bot/kids/KidsRoutesTest.java`; also run by `build-apk.sh`).

## How the app serves the pages (native code)

Capacitor's local server answers every path without a file extension with the ROOT `index.html`
(right for a single-page app, wrong for a multi-page export: reloading `/kids/hangar/` would show
the root). `android/app/src/main/java/in_/r2bot/kids/`:

- `KidsRoutes.java`: the rules, plain Java (unit-tested).
- `KidsWebViewClient.java` extends Capacitor's `BridgeWebViewClient` (the bridge keeps working):
  - **page mapping:** a request to `https://localhost/<path>` whose last segment has no `.` is
    answered with `<path>/index.html` from the APK's web assets (`/kids/hangar` and `/kids/hangar/`
    → `kids/hangar/index.html`) when it exists, else with the bundled not-found page
    (the kids `404.html`, "This robot got lost") and status 404. `/`, files with an extension (JS, CSS, RSC
    `index.txt`, audio, models) and Capacitor's proxy routes go to Capacitor unchanged. `..` is refused;
  - **navigation:** only `/`, `/kids/**`, `/_next/**` and root files load in the WebView. Any other
    local path opens `https://www.r2bot.in<path>` in the system browser (ACTION_VIEW); other hosts
    and `mailto:`/`tel:` likewise; other schemes are dropped; frames from other hosts are blocked.
- `MainActivity.java`: installs the client, uses the same mapping for service-worker fetches, and
  handles Back (WebView history; leaves the app on Home).
- `KidsNativePlugin.java` (Capacitor plugin `KidsNative`, registered in `MainActivity`): what an
  Android WebView silently drops. The pages reach it only through `lib/kids/native-app.ts`:
  - **saving files** (backup code `.txt`, robot card and AR photo `.png`, certificate and teacher
    PDFs): written to **Downloads › R2BOT Kids** through MediaStore on Android 10+ (no storage
    permission) with a "Saved in Downloads" toast; on Android 7–9 the share sheet opens instead.
    The page only says "saved" when the plugin says it was;
  - **share** (`navigator.share`/`canShare`, e.g. Garage "Share robot card"): the Android share sheet
    through the app's (unexported) FileProvider;
  - **print** (`window.print()`: Make at Home, Portfolio, Parents, teacher guides, Trust Pack…):
    the system print dialog via `WebView.createPrintDocumentAdapter` (it also offers Save as PDF);
  - **speech** (`speechSynthesis`: Ask Spark's voice, "Read everything to me", the story fallback
    voice): the phone's own text-to-speech engine, on the device (a `<queries>` entry lets
    Android 11+ find it). Speech stops when the app goes to the background.
  `installKidsNativeShims()` (called once from `app/kids/KidsShell.tsx`, standalone build only)
  points `window.print`, `navigator.share` and `speechSynthesis` at the plugin, so page code is
  unchanged. In a desktop browser (the Playwright tests) there is no plugin and nothing is replaced.
- `KidsChromeClient.java` extends `BridgeWebChromeClient`, which already asks for the Android
  `CAMERA` permission when a page calls `getUserMedia({ video })` and grants the web request only
  after it is allowed. The subclass narrows it to the camera only (no microphone/MIDI/media IDs),
  from the app's own pages only, and always refuses location.

## Layout

```
capacitor.config.ts   app config (no server.url; no imports, so the repo-root tsc stays green)
config.check.mts      type-checks the config against Capacitor's real type (npm run type-check)
www/                  the bundled static export (generated, gitignored, never committed)
resources/            icon + splash PNGs; resources/src/*.svg are the sources (from public/kids-icon.svg)
android/              native Android project (committed; build output, local.properties, keystores ignored)
android/build-apk.sh  the one build command (debug / release)
android/tools/serve-like-app.mjs   static server with the app's path rules, for browser tests
ios/                  native iOS project, kept in step (Swift Package Manager); not part of the test build
```

To change the icon or splash, edit `resources/src/*.svg`, render them to PNG
(any SVG renderer works, at 1024² for icons and 2732² for the splash), then run
`npm run assets`. After that, set `values/ic_launcher_background.xml` back to
`#0A1120`, because the generator resets it to white.

## Store notes (for later; the test APK does not need any of this)

> The store notes below were written for the earlier **remote-site model** (the app loaded
> `https://www.r2bot.in/kids`, with a one-file offline page and the website's service worker).
> **That model is retired** (28 Nov 2026): the app is bundled. Where a note mentions the
> website's service worker, `www/index.html` as the offline page, `WKAppBoundDomains = www.r2bot.in`
> or "web content updates live", read it as history. In the bundled app every content change is a
> new build (bump `versionCode`), and the store data-safety answers shrink, because the app
> sends nothing to a server.

### Android: Google Play

#### Toolchain
JDK 21 and the Android SDK (Platform 36, Build-Tools 36). The easiest way to get
both is Android Studio. Settings: compile/target SDK **36** (Android 16) and min SDK 24,
both in `android/variables.gradle`. Google Play requires apps to target an API level
within about a year of the newest Android release, and the deadline moves every August. API 36
meets the 2026 requirement. Re-check each summer under *Play Console → Policy status → Target API level*.

#### Debug APK
See "Build the APK" at the top (`android/build-apk.sh`). Debug builds turn on WebView
remote debugging (`chrome://inspect`); release builds never do (Capacitor's default when
`android.webContentsDebuggingEnabled` is unset).

#### Signing (one time)
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

#### Release bundle
1. Bump `versionCode` (+1 on every upload) and `versionName` in `android/app/build.gradle`.
2. `npm run android:release` produces `android/app/build/outputs/bundle/release/app-release.aab`
3. In Play Console, create the app, then go to *Testing → Internal testing*, upload the `.aab`, and test on a phone.
   Then promote it to Closed testing and on to Production. A new **personal** developer account
   must run a closed test with at least 12 testers for 14 days before Production unlocks.

#### Families policy / "Designed for Families"
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

#### Data safety form (Play Console → App content → Data safety)
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

### iOS: App Store

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
     permissions beyond the core experience. The bundled pages implement one
     (`requireGrownUp()` / `<GrownUpLink>`) before every link that leaves the app.
   - Privacy "nutrition label": the same answers as Play's data-safety form. Declare, each as
     **not linked to the user's identity** and **not used for tracking**, purpose *App Functionality*:
     - *Contact Info → Name*: the class nickname (optional, an alias, not a real name).
     - *Usage Data → Product Interaction*: the progress snapshot a joined child syncs to the teacher's
       class (stars, levels, episodes, missions, sessions, activities, games, minutes, "stuck" counts, age band).
     - *User Content → Other User Content*: the Workshop robot design and the robot name the child types.
     Nothing else. A child who never joins a class sends none of these.
   - The camera usage string is in `ios/App/App/Info.plist` (`NSCameraUsageDescription`).
6. **App-bound domains** are on (`WKAppBoundDomains = localhost`, and
   `limitsNavigationsToAppBoundDomains: true`), so script only runs on the bundled pages.
7. iOS has no system Back button. The website's own Back controls must be visible on every
   `/kids` screen (they are today). If wanted later, swipe-back can be enabled with a small
   `CAPBridgeViewController` subclass that sets `webView.allowsBackForwardNavigationGestures = true`.
8. Guideline 4.2 (minimum functionality): Apple rejects "just a website". The arguments for this
   app are that every screen is bundled and works with no network, camera AR, no browser chrome, and
   the parental gate. Put those in the review notes.


## Retired: the remote-site model (until 28 Nov 2026)

The first shell loaded `https://www.r2bot.in/kids?source=app` (`server.url`), allowed navigation to
`www.r2bot.in`, and bundled only an offline page (`server.errorPath`); offline use depended on the
website's service worker (`public/kids-sw.js`). It is gone from `capacitor.config.ts`. The website
itself still works the same for browsers and the PWA; nothing in this folder affects www.r2bot.in.
