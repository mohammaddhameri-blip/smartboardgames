# Sketch Rally Online — V0.8.1 (shared-road ghosts)

- All cars now race on the same road, using their actual recorded coordinates, without vertical lane offsets or separate ghost track lines.
- Ghosts are translucent and pass through the player's car and other ghosts without collisions. Only overlapping nameplates are repositioned for legibility.
- Same race physics, replay format, saved records, leaderboard, roster login and top-three selection. PWA cache updated.

# Sketch Rally Online — V0.8 (top-three ghost races)

- Drag and Challenge automatically fetch up to three highest-ranked other racers on the selected school leaderboard that have compatible replays, excluding the signed-in racer's ID. Test Track remains solo.
- Ghosts replay time-stamped positions and the original side-view artwork from actual recorded automatic races. They start alongside the player, are non-colliding, and appear in separate translucent visual lanes. Live standings and racer nameplates identify the cars; final standings compare actual saved finish times/distances as soon as the player's run ends.
- V0.8 records exact starting and ending poses and 8 samples per second. A new best recorded performance syncs through the existing signed school session. Ghosts remain unverified client-submitted practice performances, not anti-cheat-verified results.
- Historical leaderboard scores remain unchanged. Racers without a compatible recording are skipped, and an older overall personal best can remain better than that racer's best available replay. New V0.8 runs supply ghosts even if they do not beat a legacy result. If fewer than three opponents have uploaded a replay, the game uses the available number; an empty or unavailable ghost list falls back to solo racing.
- Replay data is stored server-side in the private `sro_simple_replays` table. Only the existing school Edge Function can submit or retrieve it. The query returns display names, artwork, timings and trajectory samples, never pupil codes or roster IDs. No changes to the school roster, login process, automatic race physics or existing leaderboard scoring.
- Backend migration applied: `backend/migrations/20261128105148_sketch_rally_top_three_ghost_replays.sql`. The existing `sketch-rally-school` Edge Function uses the matching `backend/index.ts`. PWA cache updated.

# Sketch Rally Online — V0.7 (simplified interface)

- One shared Cars, Tracks and Race navigation, with a single Menu button; Play opens Cars and saved designs.
- Short, action-focused labels; removed decorative slogans, duplicate navigation and redundant descriptions.
- Full-width Tracks, Race and Results screens. The existing Car Studio retains its drawing canvas and tools; polygon options and photo cleanup appear only when relevant.
- Start, Pause/Resume, Restart and Race Again appear only in the appropriate race states. Results are accessible from Cars and the race screen. Optional Tips and essential errors/status feedback remain.
- Roster login, tester codes, saved cars, automatic physics, practice times and leaderboards remain unchanged. PWA cache updated.

# Sketch Rally Online — V0.6 (school roster login)

- Log in with the existing school pupil code; no name-only registration or separate school-link key.
- Reuses the UPDLP Assessment Platform `students` roster (Year 2 class-based codes, Year 5/6 codes, and registered TST/TEST tester codes, with optional hyphen for numbered codes).
- Roster names and classes are resolved on the server. No pupil roster or service credentials are shipped to the browser.
- The school endpoint issues a temporary signed session. Every garage and leaderboard request checks it; expired sessions require a new login. Invalid login attempts are throttled.
- A stable roster-linked racer identity allows the same saved online car designs and best results across devices; local drafts and full practice history remain device-specific. Legacy name-only saves remain untouched and are not automatically assigned to a pupil.
- Login needs internet. Once signed in, local drawing/racing can continue offline; sync resumes when the connection returns. Log out before sharing a device.
- The original V0.5 Car Studio, automatic physics, tracks and leaderboard formats are unchanged. Rankings are still client-submitted/unverified practice results, not official anti-cheat-verified competition results.

Backend source: `backend/index.ts` (deployed as Supabase Edge Function `sketch-rally-school`, in the existing project). It uses the existing school-room/racer/car/best/limit tables, no roster writes or new roster accounts.

## Previous versions (historical)

# Sketch Rally Online — V0.5

Reuses the original Sketch Rally v1.9 760×350 Car Studio, pen/shape routines, colour palette, brush sizing, undo, eraser and pointer-coordinate logic, plus crop/thickening/wheel detection routines. Original side-view automatic solver and vehicle rendering are reused; online track distances and terrain are mapped to its world coordinates. Main menu, name-only entry, Cars/Tracks/Race, private school link, cloud cars and local personal ghost remain. Automatic rankings are separate from preserved manual results. Existing designs can be opened and edited; older images are fitted to the original studio dimensions. Original solver does not implement progressive component damage. Browser and device tests remain pending. Synthetic checks: drag completed in 14.43 s, Test Track in 24.55 s, Challenge stopped at 16.48 km. Automatic opponents from other pupils and live multiplayer are not yet implemented. APK not rebuilt.

---

# Sketch Rally Online — V0.4

Main menu with name-only Play, My Cars and Online Leaderboard. No pupil password, PIN, year, class or individual invitation. The teacher distributes one private school link with a bearer access key in the URL fragment; it is not committed to the repository. The public URL permits local play, not access to pupils' names or school rankings. Names are stored exactly as entered and associated with an automatically generated device credential. New garages can sync with the school backend on the same device; name-only cross-device recovery is intentionally not supported because identity cannot be verified. Earlier private V0.2 accounts remain stored separately, not exposed or migrated into the new flow. A shared device can select saved local names, so it is not a private account system. Leaderboards store best unverified practice results per device racer, with completed drag times and Challenge finishers first. No official anti-cheat or live multiplayer. School link must remain private and can be disabled by the project administrator. SQL tests passed ranking and room isolation; browser and device integration remain unverified. Only top 100 results are returned per mode at present. No APK built.

---

# Sketch Rally Online — V0.3

Primary Year 2–6 revamp: Cars, Tracks and Race are the only main tabs. Cars includes drawing, photo import, saving and selecting previous revisions; optional tips replace the car list in the left panel. Tracks offers 1 km Drag, 20 km Challenge and Test Track. Race retains manual controls. Account is a separate header utility; private history is accessible within the game. All advanced tuning sliders and drivetrain/tyre selection removed from the pupil UI. Wheels are estimated from circular ink outlines or fitted automatically from body bounds; balanced AWD, all-terrain tyres, fixed gearing and suspension are applied internally. Previous saved revisions and cloud account records are preserved. New runs use V0.3 setups; previous-version ghosts are not used in new races. Automatic wheel estimation is approximate and does not yet reliably handle arbitrary drawings or notebook backgrounds. Syntax, DOM ID and synthetic wheel detection tests passed; actual browser/device and competitive physics calibration pending. No live competition or APK added in this release.

---

# Sketch Rally Online — V0.2

## Cloud garage release
Invitation-gated registration, name/PIN recovery, hashed PINs and expiring hashed session tokens, account-specific local cache, automatic and manual cloud sync of saved car revisions and private practice history. Guest designs can be imported explicitly. Six new sro_ tables, default-deny RLS and service-only grants. The deployed edge function performs custom session authentication. Existing assessment tables are not modified. No client service key. Race results are unverified and not published. Database smoke tests passed for registration, recovery, wrong PIN, invite reuse, throttling and direct access restrictions. Browser-to-edge end-to-end and Android tests remain pending. School access depends on keeping invitations private. Local storage is quota-limited; sync and sign out on shared devices.

## Teacher invitations
Run this in the existing Supabase project's SQL Editor as project administrator. Change 1 to the desired number of one-time invitations. Share each code privately with one pupil; do not commit codes to GitHub or publish them. Codes expire after 30 days.

```sql
with new_codes as materialized (
  select encode(extensions.gen_random_bytes(16),'hex') as code
  from generate_series(1,1)
), inserted as (
  insert into public.sro_invites(code_hash)
  select encode(extensions.digest(code,'sha256'),'hex') from new_codes
  returning code_hash
)
select n.code from new_codes n
join inserted i on i.code_hash=encode(extensions.digest(n.code,'sha256'),'hex');
```

## Remaining
Secure teacher dashboard, verified official race results, class/overall leaderboards, opponent ghosts, live competition and capacity tests, geometry and physics calibration, Android APK. Private run sync is not an anti-cheat mechanism. Do not treat this build as ready for school-wide competitive use.

---

## V0.1 baseline and design specification (historical)
# Sketch Rally Online — 0.1
Independent game; original Sketch Rally is unchanged.

## Current prototype
Local drawing and photo import, optional pale background cleanup, eraser and undo, grid, wheel and suspension adjustments, four common tyre types, FWD/RWD/AWD, gearing, local saved revisions, manual touch and keyboard controls, fixed-step simplified rigid-body physics, test sections, 1 km drag, compressed 20 km Challenge, damage indicators, local race history and personal best ghost. PWA shell and offline caching. No real pupil accounts or shared results.

## Provisional engineering choices
Convex hull of dark drawing pixels is an approximate chassis; decorative ink and drawn wheels are not yet segmented. Wheel grip, suspension, body collision and gearing are simplified; no full rotating wheel dynamics or verified realism. The Challenge is 2 km simulated geometry displayed as 20 km. Duration needs tuning to 5–10 minutes. 10-second stuck/upside-down detection, 900-second prototype safety limit. No mid-race repairs. Local browser storage is quota-limited. Do not use this prototype for official rankings.
A synthetic physics smoke test with a standard 700 kg hull completed the drag in ~30.63 seconds; continuous full throttle caused the test-track car to overturn and the Challenge car to get stuck. These are not full browser/device tests.

## Accepted design direction (recommended final answers treated as defaults)
Empty canvas, right-facing side-view drawings, balanced default tuning, editable previous drawings, optional tips, no mid-race repairs, 10-second recovery threshold, preview and section practice, replay/slow-motion and revision comparison, separate manual and automatic rankings, offline drafting/testing with official competition online only. Exact physics and scale subject to calibration.

## Required before classroom-wide deployment
- Detect body separately from drawn tyres and decoration; retain original, improve photo perspective/line removal and editing transforms.
- Calibrate suspension and collision response, tune terrain and timing, add more practice conditions, track profile, detailed telemetry and replay comparison. Implement validated automatic driving separately.
- School-restricted accounts: own name without father's name, year/class, private recovery PIN and unique internal ID; exact registered name retained on school-only leaderboard. Secure recovery, rate limiting and authorization; never expose PINs or pupil data publicly.
- Persistent multi-car garage and design revisions, cross-device recovery, cloud-backed replays, validated race results, school/class leaderboards, unlimited retries and both personal-best and selected opponent ghosts.
- Live multiplayer, non-colliding lanes/cars, synchronized ready-up, no arbitrary 30-pupil cap (load testing required), teacher competition control, phone remote and smartboard spectating, exports and reset controls.
- Browser/PWA/Android APK from shared codebase; test updates, offline operation and mobile controls on actual devices. APK not built in this phase.
