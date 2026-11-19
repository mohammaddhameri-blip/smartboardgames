# Sketch Battle — Turbo Bowl Prototype v0.2

Sketch Battle is an automatic 1v1 battlebot game in the `smartboardgames` collection. Pupils draw or scan their chassis, move four standardized wheels, mount one drill/hammer/slasher weapon, and launch their robots into a concave bowl arena.

## What is implemented

### Workshop and garage (retained from v0.1)
- Freehand and point-by-point body drawing, editable vertices, photo import with rough outline tracing.
- Four movable standardized wheels, weapon placement and orientation, basic mounting checks.
- Local browser battlebot library, JSON import/export, design PNG export.

### Turbo Bowl v0.2
- Faster, momentum-driven automatic combat inside a simulated bowl with inward acceleration and wall rebounds.
- **Independent pre-match launch controls** for Robot A and Robot B: directions from 0–355° and powers from 0–100%. Two fixed opposing gates. Initial arrows show directions/power.
- **Three-second countdown and simultaneous launch**. Launch direction influences the initial trajectory before AI steering takes over.
- Faster fixed-step physics (up to 180 Hz substeps) to reduce missed high-speed collisions.
- Impact-energy-based damage from bot collisions, rock impacts and high-speed wall hits; weapon hits remain smaller bonuses.
- **Arena choices**: Classic (no obstacles), Rocks, Ramps, Mixed, or Custom.
- **Interactive custom arena editor**: add rocks and ramps, select and drag them, rotate a selected ramp, remove or clear obstacles, copy the last preset, and persist your custom layout on this browser.
- Rocks rebound robots and may damage parts. Ramps accelerate robots in the indicated downhill direction and can briefly lift them with simplified landing damage.
- Separate wheels, weapon and chassis health; visual dents and falling debris for disabled components.

## How to test
1. Open the Workshop tab. Save at least two unique battlebots, or use the two provided example robots.
2. Open **Test Arena**. Choose Robot A and Robot B.
3. Select Classic, Rock, Ramp, Mixed or Custom.
4. Set each robot's **direction and launch power**. A direction of 0° means right, 90° down, 180° left, and 270° up. Arrows show each selection.
5. Choose **Launch both battlebots** and observe the countdown and automatic fight.
6. To design your own arena, select **Custom**, add obstacles, then tap/drag them on the bowl. Select a ramp to rotate it. Save the custom layout.

## Important limitations
- This is a **prototype with approximate 2.5D physics**, not a validated 3D rigid-body simulation. The visible bowl slope is represented by an inward acceleration. Ramps use directional acceleration and short simulated hops, not full geometric height and ballistic flight.
- Robot and rock collisions approximate shapes as circles. High-frequency stepping reduces, but does not eliminate, all tunneling and collision edge cases.
- Full rigid-body deformation, accurate 3D overturning, shape-specific wheel traction, physical weapon pivot constraints and fully independent detachable rigid parts remain future work.
- Photo tracing uses a simple dark-pixel convex hull. Concave shapes and ruled backgrounds can need manual correction.
- Battlebots and custom arenas live in **localStorage on the same device**. Export the roster before clearing browser data. Phone-to-smartboard live pairing and Android packaging are **not yet implemented**.
- This update has been checked for JavaScript syntax and mock runtime startup/duel flow, but gameplay is not yet device-tested.

## Run
Host `index.html` via GitHub Pages or serve it locally. It has no external library or backend dependencies.
