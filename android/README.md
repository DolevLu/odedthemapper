# Native Android app (Capacitor)

This wraps the live site (`travi.odedthemapper.com`) in a real Android app shell —
not a bundled offline copy. The app uses Next.js Server Actions, Prisma, and
NextAuth throughout, none of which can run inside a static WebView bundle, so
`capacitor.config.ts` points the WebView straight at production. This is the
same architecture most "wrapped web app" native apps use.

## What this gets you

- A real home-screen icon and app name, no browser chrome
- Native geolocation permission dialog (configured in `MainActivity.java` +
  `AndroidManifest.xml`) instead of the browser's, needed for the map's
  always-on location tracking
- An installable `.apk` you can side-load onto your own phone today, no
  Play Store review needed

## What you still need on your machine

This repo doesn't include a JDK or the Android SDK — building an actual
`.apk` needs **Android Studio** (free), which bundles both.

1. Install [Android Studio](https://developer.android.com/studio)
2. Run `npm run cap:android` from the project root — opens this `android/`
   folder in Android Studio
3. Let Gradle sync (first time takes a few minutes)
4. Plug in your phone (USB debugging enabled) or use an emulator, then hit
   the ▶ Run button — installs the app directly, no store needed
5. To share an installable file: **Build → Generate Signed Bundle / APK**

## Keeping it in sync

Whenever `capacitor.config.ts` changes, run:

```bash
npm run cap:sync
```

## iOS

Needs a Mac with Xcode — not something buildable from this Windows machine.
Once you have one: `npx cap add ios`, then `npx cap open ios`, then Run from
Xcode onto your iPhone (free Apple ID works for a 7-day local install; a paid
Apple Developer account — $99/year, required either way for the App Store —
makes it permanent and adds TestFlight for sharing with others before public
release).

## Publishing to the app stores later

Not something I can do on your behalf — both require accounts under your own
identity:

- **Google Play**: $25 one-time, Play Console account. New accounts must run
  a closed testing track before going to full public release.
- **Apple App Store**: $99/year, Apple Developer Program (identity
  verification can take a few days for new accounts), then App Store Review
  after submission.
