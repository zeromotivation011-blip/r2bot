#!/usr/bin/env bash
# Build the R2BOT Kids APK from the bundled web export in ../www.
#
#   android/build-apk.sh            debug APK, signed with the Android debug key (sideload testing)
#   android/build-apk.sh release    release APK + AAB, signed with android/keystore.properties
#
# Needs: ../www produced by the export step (www/kids/index.html must exist), JDK 21,
# the Android SDK (ANDROID_HOME, or sdk.dir in android/local.properties).
# Never commits or creates a keystore: release signing reads android/keystore.properties
# (gitignored) and refuses to run without it.
set -euo pipefail

MODE="${1:-debug}"
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$HERE/.." && pwd)"

if [ ! -f "$APP/www/kids/index.html" ]; then
  echo "No bundled export at $APP/www (www/kids/index.html missing)." >&2
  echo "Build the static export of /kids into apps/kids-mobile/www first (see README.md)." >&2
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && ! grep -qs '^sdk.dir=' "$HERE/local.properties"; then
  if [ -d /opt/android-sdk ]; then
    export ANDROID_HOME=/opt/android-sdk
  else
    echo "Set ANDROID_HOME (or sdk.dir in android/local.properties) to your Android SDK." >&2
    exit 1
  fi
fi

GRADLE="./gradlew"
if [ -n "${GRADLE_BIN:-}" ]; then GRADLE="$GRADLE_BIN"; fi

cd "$APP"
npx cap sync android

cd "$HERE"
case "$MODE" in
  debug)
    "$GRADLE" --no-daemon testDebugUnitTest assembleDebug
    APK="$HERE/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  release)
    if [ ! -f "$HERE/keystore.properties" ]; then
      echo "Release builds need android/keystore.properties (see README.md, 'Release signing')." >&2
      exit 1
    fi
    "$GRADLE" --no-daemon testReleaseUnitTest assembleRelease bundleRelease
    APK="$HERE/app/build/outputs/apk/release/app-release.apk"
    echo "AAB: $HERE/app/build/outputs/bundle/release/app-release.aab"
    ;;
  *)
    echo "Usage: android/build-apk.sh [debug|release]" >&2
    exit 2
    ;;
esac

ls -l "$APK"
echo "APK: $APK"
