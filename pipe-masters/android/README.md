# Pipe Masters — Android APK source

## Shared HTML across web and Android

Both versions use the same game file: `pipe-masters/index.html`.

- On Android launch, the application checks that public GitHub file over HTTPS, caches it in app-private storage and displays the latest available copy.
- If the smartboard is offline, Android launches the last saved game or its bundled copy. Camera recognition runs inside a secure WebViewAssetLoader origin.
- Browser players load the same HTML via GitHub Pages. Gameplay and UI updates therefore reach both without replacing the APK.
- The **Settings → Check for latest version** action forces an Android sync. It reloads only when a new game file is found.

**Limit:** Native Android wrapper updates (permissions, package metadata, camera integration) still need a rebuilt and properly signed APK. The auto-sync only changes trusted game HTML served from your public repository.

## Building

Open `pipe-masters/android` in Android Studio and run **Build → Build APK(s)**. A GitHub Actions workflow builds a **debug APK for classroom testing**. Debug APKs are not suitable as Play Store releases; future native upgrades must be signed with a durable private release key. Do not commit signing keys.

The app needs Android 7.0+ (API 24), uses camera permission only when requested by gameplay, and uploads no camera footage. External USB webcam compatibility depends on Android's camera drivers, so test on the actual smartboard.
