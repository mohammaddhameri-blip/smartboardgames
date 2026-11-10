# Pipe Masters — Team Challenge v0.6

Pipe Masters is a collaborative coloured-paper pipe puzzle for school smartboards, hosted at https://mohammaddhameri-blip.github.io/smartboardgames/pipe-masters/.

## Layout and gameplay
The Microsoft Pinball-style layout is retained: the left playfield contains the coloured pipe dashes; the upper-right camera panel shows local video or remote paper detections; the lower-right control panel includes countdown, scores, players, Pause, Retry, Settings and navigation. The existing 5 levels, pupil counts (12–30), 3-second successful formation hold, time settings and scoring remain.

## Camera access and recovery (v0.6)
- **Auto (built-in/front):** first tries the front-facing camera, then falls back to a generic camera. On the IMAGO AIOS, cameras may not advertise a front-facing identity.
- **Select a camera:** Settings → Camera source → available cameras. Standard USB webcams and Android phones in USB webcam mode appear when exposed through the smartboard's browser/WebView.
- **Native Android camera (updated APK):** selecting Native Android camera or a failed WebView request can attempt Camera2 video capture through a Java bridge. Frames are compressed and analysed locally by the existing HTML colour detector. This is an experimental hardware-specific fallback, not a bypass for administrator restrictions.
- **Recovery:** when camera access fails or the stream ends/stalls, the timer pauses. Retry, Select Camera, Pair Phone and Download Bug Report are offered. Reconnection preserves the current level and remaining time.
- **Bug report:** records errors, permission status, camera labels, browser details and (on the new APK) native Camera2 inventory. No pupil photos or video are added. On Android, the system document picker saves the JSON file.

## Wireless phone tracking (online)
Tap **Pair phone** on the smartboard. Scan its QR code or open https://mohammaddhameri-blip.github.io/smartboardgames/pipe-masters/phone.html on the phone and enter the 8-character code. Press **Start selfie camera**. The phone detects coloured paper shapes locally, and sends only paper colours, positions, boxes and orientations over a temporary Supabase Realtime channel (using the same existing backend as Sketch Rally). No continuous live video is sent. The upper-right smartboard panel therefore displays a schematic detection view rather than video in phone mode.

Both devices require internet for this pairing method, whether connected over school Wi-Fi or a hotspot. **Offline-only Wi-Fi / hotspot pairing is not yet implemented.** That will require a separate local signalling service or Android companion app, plus device testing.

## APK builds and updates
The Android project lives at `pipe-masters/android/`. On pushes to Android source, GitHub Actions workflow `.github/workflows/build-pipe-masters-apk.yml` builds a debug APK and, when successful, publishes `pipe-masters/downloads/PipeMasters.apk`. Web gameplay updates are checked by the existing APK, but **native camera code requires installing a new APK**. Debug signing may change between GitHub build runners; if Android reports an incompatible signature, the older debug APK must be uninstalled before installing this test build.

Camera and USB compatibility on the IMAGO AIOS remain **unverified** until tested on the physical smartboard. The existing app cannot forcibly disable or override other apps' overlays, permissions or firmware camera access policies.
