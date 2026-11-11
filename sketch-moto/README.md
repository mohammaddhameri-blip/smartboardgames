# Sketch Moto — by MrDhameri

Draw a complete dirt bike on paper, scan it, then let the game ride it automatically.

## Browser
https://mohammaddhameri-blip.github.io/smartboardgames/sketch-moto/

## Android APK
The GitHub workflow \`.github/workflows/sketch-moto-apk.yml\` builds a debug-signed Android APK when the Sketch Moto files change on main, and uploads it to the \`sketch-moto-latest\` prerelease.

https://github.com/mohammaddhameri-blip/smartboardgames/releases/download/sketch-moto-latest/SketchMoto-latest.apk

## Game features
- Use phone camera/gallery or the in-game drawing canvas
- Adjust paper cleanup and restore the original
- Tap/drag front/rear wheel centres and suspension anchor points
- Correct estimated front/rear suspension thickness
- Standardized dirt-bike tyres, animated rider and frame-weight effects
- Fully automatic physics-based 2D motocross driving
- Challenge: ten generated courses, same design must finish all; failure locks the design for a new attempt
- Freestyle: stunts score only after a successful landing; ride until crash
- Local on-device leaderboard and registered racers

## Architecture
Single-file canvas HTML/JavaScript for the browser, packaged inside an Android WebView shell with a bundled offline fallback. The APK always tries the GitHub Pages game URL first so web and Android receive the same gameplay changes without app reinstall.

## Notes
This is a first playable prototype. The mechanical simulation is an educational approximation and should be tested on actual submitted drawings. Automatic photo cleanup is heuristic, so the teacher can manually restore/reposition critical geometry. Phone-to-smartboard photo transfer uses an eight-character temporary Supabase Realtime pairing room. It depends on an internet connection and has not yet been device-tested. Race scores remain local to the device. Records are stored separately per device.
