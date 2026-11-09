# Pipe Masters — Team Challenge v0.4

Pipe Masters is a collaborative classroom pipeline puzzle for Android smartboards. Pupils hold brightly coloured paper strips and arrange their positions and orientations to match the coloured missing pipe sections.

## Full-screen landscape layout (v0.4)

The display follows a Microsoft Pinball-inspired **playfield + right sidebar** arrangement:

- **Left:** The large main pipeline puzzle, with coloured dashed guides, minimal level heading and unobtrusive progress indicator
- **Right, top:** Selfie-camera preview with detection overlays
- **Right, bottom:** Countdown timer, total team score, number of players, best time, live formation status, Pause, Retry, Settings, Camera/Demo, Previous/Next and Fullscreen

The countdown defaults to **2 minutes per level**, configurable to 60, 90, 120, 180 seconds or no time limit. Pausing freezes both the countdown and camera evaluation. Completing a level awards 100 points plus remaining seconds (no points for replaying a level already scored). There are five levels for 3–6 players. These are current prototype rules, subject to classroom testing.

## Using the game

- **Demo:** Select Demo and drag each coloured strip in the camera preview; tap a strip to rotate. Hold the correct formation for 3 seconds.
- **Camera:** Use the Android phone or tablet's built-in front-facing (selfie) camera to view pupils holding solid-colour A4 paper strips. No external webcam is needed. Grant the camera permission, adjust mirroring or detection tolerance in Settings, and let the team form the missing route.
- Choose Retry to reset the current round. Next/Previous allow teacher navigation; only completed levels score.
- The camera analyses images locally via colour filtering and connected-region estimation; no video recordings or uploads.

## Shared updates

This GitHub file `pipe-masters/index.html` is the single source of gameplay updates. GitHub Pages loads it for browser play, and the Android APK checks for a newer copy on launch and stores the game for offline use. **Changing the browser game's HTML also updates the Android game's gameplay and layout; users do not need to reinstall the APK.** Native Android wrapper updates still require an APK rebuild.

Browser game: https://mohammaddhameri-blip.github.io/smartboardgames/pipe-masters/

Android APK: https://github.com/mohammaddhameri-blip/smartboardgames/raw/refs/heads/main/pipe-masters/downloads/PipeMasters.apk

## Classroom limitations

Camera recognition on real Android smartboard hardware remains unverified. Lighting, colour similarity (particularly grey), pupil occlusion and camera drivers affect accuracy. Test at the classroom location before using for graded competition. The native Android app is currently a WebView shell running the same HTML game rather than a native camera engine.
