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
