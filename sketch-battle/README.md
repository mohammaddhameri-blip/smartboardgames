# Sketch Battle — Prototype v0.1

A standalone, mobile-friendly HTML5 Sketch Battle prototype for the smartboardgames collection.

## What works

- Draw a pupil-designed chassis with a freehand stroke or a series of polygon points.
- Import a camera photo or existing image. The auto-trace attempts a **rough convex outline** from dark pixels; clean paper and manual vertex correction are often needed.
- Drag four identical wheels to positions around the chassis.
- Select drill, hammer, or slasher, drag its mounting position, and rotate the attachment.
- Validate basic mounting geometry. A wheel or weapon must stay near the body edge and avoid other mounts.
- Name, colour, save, reopen, delete, export and import battlebots locally.
- Export a workshop PNG.
- Try a simple automatic 1v1 combat **preview** with basic navigation, impacts, weapon-specific hits, component health and 90-second timer.

## Known limitations

This is **not the finished physical combat engine**. The duel preview approximates movement, mounting effects, collisions, and damage. Detailed 3D flipping, fracture mechanics, detached rigid-body debris, validated material mechanics and precise weapon contact must be developed and tested later.

Chassis photo outlining uses a basic dark-pixel convex hull, so concave sections and ruled notebook lines are not reliably recovered. Correct the polygon manually. The original photo is only used as a light reference layer.

Workshop images and registered battlebots are stored in the **current browser's localStorage**, not synchronized between devices. The phone's file/camera picker works on the device running the page; **live phone-to-smartboard pairing is not implemented** in this prototype. Use the JSON export for backups.

## Run

Open `index.html` in a modern browser or serve the folder from GitHub Pages.

The game has no external JavaScript, CSS or backend dependencies.

### Next development phase

Improve scanning and contour detection, reliable silhouette data for concave shapes, true wheel-contact forces, actual collision shapes, detachable-part physics, persistence/phone-host pairing, combat AI and browser/Android shared packaging.
