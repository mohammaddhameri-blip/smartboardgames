# Sketch Battle — Classroom Edition v0.4

Sketch Battle is an automatic 1v1 battlebot game in the `smartboardgames` collection. Pupils draw or scan their chassis, move four standardized wheels, mount one drill/hammer/slasher weapon, and launch their robots into a concave bowl arena.

## What is implemented

### Workshop and garage (retained from v0.1)
- Freehand and point-by-point body drawing, editable vertices, photo import with rough outline tracing.
- Four movable standardized wheels, weapon placement and orientation, basic mounting checks.
- Local browser battlebot library, JSON import/export, design PNG export.

### Turbo Bowl v0.2 (retained)
- Faster, momentum-driven automatic combat inside a simulated bowl with inward acceleration and wall rebounds.
- **Independent pre-match launch controls** for Robot A and Robot B: directions from 0–355° and powers from 0–100%. Two fixed opposing gates. Initial arrows show directions/power.
- **Three-second countdown and simultaneous launch**. Launch direction influences the initial trajectory before AI steering takes over.
- Faster fixed-step physics (up to 180 Hz substeps) to reduce missed high-speed collisions.
- Impact-energy-based damage from bot collisions, rock impacts and high-speed wall hits; weapon hits remain smaller bonuses.
- **Arena choices**: Classic (no obstacles), Rocks, Ramps, Mixed, or Custom.
- **Interactive custom arena editor**: add rocks and ramps, select and drag them, rotate a selected ramp, remove or clear obstacles, copy the last preset, and persist your custom layout on this browser.
- Rocks rebound robots and may damage parts. Ramps accelerate robots in the indicated downhill direction and can briefly lift them with simplified landing damage.
- Separate wheels, weapon and chassis health; visual dents and falling debris for disabled components.

### Weapon animation update v0.3
- Replaced the two large launch-setting arrow cards with compact, collapsible direction/power controls. Initial launch arrows remain drawn on the bowl.
- Drill barrel bands visibly rotate; close sustained contact produces sparks and incremental damage.
- Slasher teeth rotate continuously during combat; close oriented passes add strike damage and sparks with a brief cooldown.
- Hammer swings through a visible wind-up, fast strike and recovery cycle. The blow can miss if the opponent escapes during wind-up.
- Component weapon health affects animation speed/availability; disabled weapons stop rendering.
- Weapon damage occurs during the corresponding animation/contact window instead of granting arbitrary bonuses on every body collision.
- Rigid-body impacts remain the primary source of damage. Weapon timing and contact are approximate.

## Classroom Edition v0.4

**Phone host.** Open phone.html on a teacher's Android phone, connect using the 8-character code shown on the smartboard, photograph or upload the pupil's chassis drawing, crop/rotate the photo, and send it to the smartboard. The mobile host is an installable web app (PWA), **not a native APK**.

**More freedom in drawing.** trace.js uses a contour-first detector to preserve many irregular and inward-pointing chassis edges. If tracing is unclear, the legacy convex hull fallback or manual point editing remains available. The smartboard workshop is where the teacher confirms and corrects the bot geometry.

**Precise equipment.** Select any of the four standardized wheels or the weapon and set X/Y coordinates or nudge by 1, 5 or 10 editor pixels. Weapon type (drill, hammer, slasher) and orientation remain editable. Auto-place proposes wheel and weapon positions; all mounts must pass the existing validation before saving.

**30-pupil competition.** The garage can hold more saved designs, but each single-elimination classroom competition accepts 2–30 participants. Battles remain 1v1, with two robots fighting at once. Knockout matches, evenly spread first-round byes, winner progression, rematches for draws, bracket persistence and CSV results are included. This is **not** a 30-robot simultaneous free-for-all.

**Storage and connection.** Bot geometry and tournament data persist locally in the smartboard browser. Photos are backed up in IndexedDB when available to avoid filling localStorage with 30 camera scans. Pairing uses a short-lived room code and Supabase Realtime; internet is required on both devices. Photos are transmitted through the pairing service and are not stored in an online gallery by this app. Use only pupil sketches that the school permits you to photograph. Export backups before clearing browser data.

### How to try the classroom flow

1. Open index.html on the smartboard. In Workshop, connect the phone host and note the pairing code.
2. Open phone.html on Android and enter the same code. Optional: use Chrome's Add to Home screen / Install app to install the PWA.
3. Enter a pupil's name, capture one chassis sketch, crop it, and send it to the smartboard.
4. On the smartboard, review/edit the outline, choose a weapon, fine-tune four wheels and the weapon mount, and Save battlebot.
5. Repeat for the class, open Test Arena, select up to 30 pupils, and create the class tournament.
6. Launch each duel, let the physics resolve the winner, and continue to the next match. A draw requires replay.
7. Export roster JSON and tournament CSV results for backup.

## How to test
1. Open the Workshop tab. Save at least two unique battlebots, or use the two provided example robots.
2. Open **Test Arena**. Choose Robot A and Robot B.
3. Select Classic, Rock, Ramp, Mixed or Custom.
4. Set each robot's **direction and launch power**. A direction of 0° means right, 90° down, 180° left, and 270° up. Arrows show each selection.
5. Choose **Launch both battlebots** and observe the countdown and automatic fight.
6. To design your own arena, select **Custom**, add obstacles, then tap/drag them on the bowl. Select a ramp to rotate it. Save the custom layout.
7. Equip the example bots with different weapons in the Workshop, then watch each drill spin, hammer swing and slasher rotate in the Test Arena.

## Important limitations
- This is a **prototype with approximate 2.5D physics**, not a validated 3D rigid-body simulation. The visible bowl slope is represented by an inward acceleration. Ramps use directional acceleration and short simulated hops, not full geometric height and ballistic flight.
- Robot and rock collisions approximate shapes as circles. High-frequency stepping reduces, but does not eliminate, all tunneling and collision edge cases.
- Full rigid-body deformation, accurate 3D overturning, shape-specific wheel traction, physical weapon pivot constraints and fully independent detachable rigid parts remain future work.
- Photo tracing now uses a contour-first heuristic, falling back to the earlier convex hull; noisy or difficult sketches still need teacher correction.
- Battlebot geometry, arena and tournament data are local to the smartboard browser. Scanned reference photos use IndexedDB when available. The phone host is an installable PWA, not a native APK.
- The v0.4 integration has been syntax-checked, but mobile pairing, tracing fidelity and full tournament flow still need testing on the actual phone and school smartboard.

## Run
Host index.html via HTTPS (for example GitHub Pages). Workshop and battles can run locally, but phone pairing requires the Supabase JavaScript library and an internet connection.
