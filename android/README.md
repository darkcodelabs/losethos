# LoseThos Android app

Package `org.darkcodelabs.losethos` opens `https://losethos.org/boot.html` through Android Browser Helper's Trusted Web Activity. The launcher uses the same LT icon as the PWA. There is no native guest storage. The browser supplies the emulator session; discarding that session follows the website's existing rules.

The signed release is `site/downloads/losethos-android.apk`. Its SHA-256 checksum is alongside it. Publish `site/.well-known/assetlinks.json` at `https://losethos.org/.well-known/assetlinks.json` with HTTP 200 and JSON content type, without authentication or redirects, to verify the app/site association. Until browser verification succeeds, the browser may show its Custom Tab toolbar. Android installation and device runtime have not been tested.

## Build

Requires JDK 17, Gradle 8.14.5, Android SDK platform 36 and build-tools 36.0.0. Android Gradle Plugin 8.13.2 and Android Browser Helper 2.7.3 are pinned. Existing installed tools and cached dependencies were reused.

Set `JAVA_HOME`, add its `bin` directory to `PATH`, set `ANDROID_HOME` to the SDK, and set `GRADLE` to the Gradle executable if it is not on `PATH`. Run:

```sh
./android/build-release.sh
```

Signing material lives outside the repository at `$HOME/.local/state/losethos/android/`: `release.jks`, alias `losethos`, and `signing-password`. Directory permissions are 0700 and both files are 0600. `LOSETHOS_SIGNING_DIR` overrides this directory. Preserve these private files for future app updates. The build script signs with the existing key, verifies the APK signature, and regenerates the public Digital Asset Links fingerprint and APK checksum. It never creates or replaces a signing identity.

The release key was generated for Cory Kennedy / DarkCode Labs. Its public certificate fingerprint is recorded in `site/.well-known/assetlinks.json`; this is an actual APK certificate, not an example value. This is a direct APK download, not a Play Store release.

[Android Browser Helper integration guide](https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide) describes the launcher and Digital Asset Links relationship.
