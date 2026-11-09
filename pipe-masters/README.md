# Pipe Masters — Team Challenge v0.5

Pipe Masters is a collaborative classroom pipeline puzzle for Android smartboards. Each pupil holds one brightly coloured paper strip and arranges their position and orientation to match one individually coloured missing pipe dash.

## Full-screen landscape layout (v0.5)

The display follows a Microsoft Pinball-inspired **playfield + right sidebar** arrangement:

- **Left:** The large main pipeline puzzle, with one independently coloured dash per pupil (neighbouring dashes differ), minimal level heading and unobtrusive progress indicator
- **Right, top:** Selfie-camera preview with detection overlays
- **Right, bottom:** Countdown timer, total team score, number of pupils, best time, live formation status, Pause, Retry, Settings, Camera/Demo, Previous/Next and Fullscreen

The countdown defaults to **2 minutes per level**, configurable to 60, 90, 120, 180 seconds or no time limit. Pausing freezes both the countdown and camera evaluation. Completing a level awards 100 points plus remaining seconds (no points for replaying a level already scored). There are five levels, and the number of pupils/dashes can be set to 12, 15, 18, 21 (default), 24, 27, 29, or 30. Every dash is an individual target; colours repeat across nonadjacent targets. These are current prototype rules, subject to classroom testing.

## Using the game

- **Demo:** Select Demo and drag each coloured strip in the camera preview; tap a strip to rotate. Hold the correct formation for 3 seconds.
- **Camera:** Use the Android phone or tablet's built-in front-facing (selfie) camera to view pupils holding solid-colour A4 paper strips. No external webcam is needed. Grant the camera permission, adjust mirroring or detection tolerance in Settings, and let the team form the missing route.
- Choose Retry to reset the current round. Next/Previous allow teacher navigation; only completed levels score.
- The camera analyses images locally via colour filtering and connected-region estimation. It retains multiple separate strips of the same colour and attempts to match each detected paper to one target dash. No video recordings or uploads.

## Shared updates

This GitHub file `pipe-masters/index.html` is the single source of gameplay updates. GitHub Pages loads it for browser play, and the Android APK checks for a newer copy on launch and stores the game for offline use. **Changing the browser game's HTML also updates the Android game's gameplay and layout; users do not need to reinstall the APK.** Native Android wrapper updates still require an APK rebuild.

Browser game: https://mohammaddhameri-blip.github.io/smartboardgames/pipe-masters/

Android APK: https://github.com/mohammaddhameri-blip/smartboardgames/raw/refs/heads/main/pipe-masters/downloads/PipeMasters.apk

## Classroom limitations

Camera recognition on real Android smartboard hardware remains unverified. Lighting, colour similarity (particularly grey), pupil occlusion and camera drivers affect accuracy. Test at the classroom location before using for graded competition. The native Android app is currently a WebView shell running the same HTML game rather than a native camera engine.

## Individual pupil dashes (v0.5)

A long section of missing pipe is no longer a single target. The game divides it into the chosen number of individual dashes, distributed proportionally along the pipe. Neighbouring dashes receive different colours and each pupil should hold one paper to represent one dash. The Android selfie camera remains the default. Practical reliability with 21–30 participants requires classroom testing; individual paper visibility, lighting, distance, and overlapping pupils may limit detection.
