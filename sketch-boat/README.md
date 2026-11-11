# Sketch Boat v1.1 — by MrDhameri

**Smartboard game:** https://mohammaddhameri-blip.github.io/smartboardgames/sketch-boat/

**Phone host app:** https://mohammaddhameri-blip.github.io/smartboardgames/sketch-boat/host.html

Sketch Boat now follows **Sketch Rally's main menu and three-tab structure: GARAGE → TRACK → RACE**. Pupils draw boats on paper. The teacher can capture each drawing with a paired phone, register it under a name, design a course and start the automatic race.

## Using the phone host
1. Open the **smartboard game** and select Quick Race, Challenge, Sailing or Test.
2. Enter **GARAGE**, tap **Pair phone**, and wait until the 8-character code appears.
3. On the phone, open the **host app** through the QR link or URL, or enter that code and tap Connect. The pairing relies on Supabase Realtime and requires internet on both devices; they do **not** have to share the same Wi-Fi.
4. Tap Start camera, photograph a pupil's boat (or upload a photo), then rotate, crop and remove faint paper lines as necessary.
5. After reviewing the image, enter the **pupil's name** and tap Register. The smartboard decodes the image, applies background cleanup, checks the outline and registers the boat.
6. Repeat. The phone sees the live roster, can Rescan or Remove boats, switch game modes, and start the race remotely. The smartboard also supports manual drawing and registration.
7. On the smartboard open **TRACK** to design the course, then **RACE** to compete automatically.

If the phone cannot connect, confirm the smartboard still shows the same pairing code, the library scripts have loaded, and that both devices have internet. Reopening the smartboard creates a new session; use a new code.

### Host app installation
On Android Chrome, open the host URL and choose **Install app** or **Add to Home screen**. It is a separately installable PWA, using the phone's camera via browser permission. A separate Android host APK project also exists in android-host/.

**Host APK build workflow:** https://github.com/mohammaddhameri-blip/smartboardgames/actions/workflows/sketch-boat-host-android.yml

**Smartboard/game APK build workflow:** https://github.com/mohammaddhameri-blip/smartboardgames/actions/workflows/sketch-boat-android.yml

The Android projects load the published GitHub Pages web apps, so web game updates are shared with the APK wrappers. Native changes still require rebuilding APKs. Builds have not been independently verified yet. Debug APK signing differs between CI runner instances; use persistent signing for releases.

## Design Track
The **TRACK** tab applies to **Quick Race and Test**. It has four initial patterns (Open Water, Winding River, Island Pass, Sharp S-Curves). In the smartboard stage, choose Draw Route and drag to shape the watercourse. Choose Add Rocks and tap to add obstacles, or Erase Rocks to remove. Change waterway width and race distance (1, 2, 3 or 5 km equivalents). Track presets, user-drawn geometry, obstacle positions and width are saved locally and affect the actual navigation, collision and speed calculations.

Challenge Mode has ten predefined courses for fair leaderboards. The ten Sailing courses are also predefined in this first version.

## Racing rules
- The engine and automatic controller are shared across all powerboat designs. No manual steering.
- Boat size, width, drag, estimated mass, turning and momentum affect results.
- A sketch with an unusable sail cannot gain useful sailing propulsion.
- A Challenge run uses one locked boat drawing across all ten courses. A failure requires registering a new drawing for that racer and restarting at Level 1. Best Overall ranks all ten finishers first, then incomplete attempts by best progress, then cumulative time.
- Each device stores boat data and its custom track in its browser storage. Phone-to-smartboard messages are transmitted live, but not persisted on the phone.

## Privacy and limitations
Pairing uses a random eight-character temporary code and **public Supabase Realtime broadcast** channels on the same service used by Sketch Rally. This is classroom convenience pairing, not strong identity verification. Anyone who discovers an active room code can potentially join and issue controls, so never display the code publicly beyond the intended classroom and create a new room for each session. Avoid capturing pupils' full names or personal details on the photo paper.

This is simplified educational 2D water physics, not CFD or a full hydrodynamic sail simulator. Image cleanup (including faint ruled paper line removal) is heuristic; use Crop / Retake when necessary. The host app requires live internet to communicate. The mobile PWA and Android APK host camera require permission and may behave differently across Android devices.

## Source layout
- index.html — Sketch Rally-inspired smartboard layout.
- style.css and rally-ui.css — game and main menu styles.
- app.js — drawing, boat analysis, automatic simulation and race data.
- pairing-and-track.js — Supabase pairing, phone roster actions, track editor, custom course saving.
- host.html and host.js — phone camera, crop, rotation, registration and race remote.
- host.webmanifest / manifest.webmanifest / sw.js — installable phone and smartboard PWAs.
- android/ — main Sketch Boat WebView APK.
- android-host/ — separate camera-enabled Sketch Boat Host WebView APK.

Static JavaScript syntax and HTML control-ID checks have passed. **End-to-end pairing, camera behaviour, actual Android APK builds, and GitHub Pages propagation have not been confirmed on physical devices.**
