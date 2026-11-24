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
