# Sketch Boat v1.0

Play: https://mohammaddhameri-blip.github.io/smartboardgames/sketch-boat/

## How to play
1. Choose Quick Race, Challenge, Sailing or Test.
2. Draw a boat on the sketch pad or use Capture / upload.
3. Rotate, clean and erase stray marks as needed. In powerboat mode the bow points right.
4. Type the pupil's name and register the drawing. Repeat for more racers.
5. Start the automatic race; pupils do not steer.
6. Results and drawings are saved locally to this browser. Export race results as CSV.

## Available modes
- Quick Race: Up to 20 registered powerboats race together on a top-down course with automatic navigation, collisions and obstacles.
- Challenge: 10 harder powerboat courses with the same design locked throughout each run. A failed run requires a new drawing under the same racer name to restart at Level 1. Best Overall prioritizes 10-level finishers and ranks them by cumulative time.
- Sailing: Separate 10-course side-view wind-powered race. A detectable hull, mast and sail are needed for useful propulsion. Sailing has separate rankings.
- Test: A solo physics test showing simulated top speed, hull dimensions, drag, contacts and high-yaw time.

## Physics and current limitations
Sketch Boat v1.0 uses a simplified educational 2D simulation, **not** engineering-grade naval hydrodynamics or CFD. Drawing geometry informs hull dimensions, mass, resistance and turning authority. The powered boats share an engine and automatic navigation logic; motion is integrated in fixed 60 Hz steps. The sailing mode estimates usable sail area and mast support, and uses relative airflow for propulsion.

These are **not yet implemented**: full aerodynamic lift/drag polars, 3D heeling and capsizing, keel leeway, realistic wave/hull fluid simulation, and remotely paired camera capture from a second device. Photo cleanup is approximate; correct it manually with the eraser.

Drawings and results persist only in this browser's local storage. They are not synchronized to another phone or smartboard.

## Install and Android
The game is a browser PWA. On Chrome select Install or Add to Home screen. It uses network-first caching, with basic offline access after assets have been cached.

A thin Android WebView shell in the android directory opens the same hosted game and offers a camera / gallery chooser. Browser updates appear in the APK without rebuilding the shell.

APK workflow: https://github.com/mohammaddhameri-blip/smartboardgames/actions/workflows/sketch-boat-android.yml

The workflow builds a debug-signed APK and attempts to publish it as a testing release. The build result has not been independently verified. Debug signing keys are not stable across runners, so a previously installed debug APK may need removal before a later testing APK can install. Use persistent secure signing for a production APK.

## Privacy
Names and drawings are stored on the device, unless the teacher explicitly exports results. Do not use personal data in the drawings.

## Maintenance
Files: index.html, style.css, app.js, manifest.webmanifest, sw.js, icon.svg and android/. The smartboard game library registers this folder in ../games.json. Run node --check app.js to test syntax.