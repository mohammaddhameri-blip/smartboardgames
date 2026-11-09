# Smartboard Games 🎮

A central game-selection website **and** a collection of individually playable smartboard games.

## Play and browse

The GitHub Pages site (once publishing is enabled):

**https://mohammaddhameri-blip.github.io/smartboardgames/**

Games imported from the user's original repositories:

| Game | Individual library link | Original repository |
|---|---|---|
| BoatBeats | [Play](https://mohammaddhameri-blip.github.io/smartboardgames/boatbeats/) | [Source](https://github.com/mohammaddhameri-blip/boatbeats) |
| Sketch Rally | [Play](https://mohammaddhameri-blip.github.io/smartboardgames/sketch-rally/) | [Source](https://github.com/mohammaddhameri-blip/sketch-rally) |
| Melody Trail | [Play](https://mohammaddhameri-blip.github.io/smartboardgames/melody-trail/) | [Source](https://github.com/mohammaddhameri-blip/melody-trail) |
| STEM Battleship | [Play](https://mohammaddhameri-blip.github.io/smartboardgames/stem-battleship/) | [Source](https://github.com/mohammaddhameri-blip/stem-battleship) |

**Coming soon:** Motion Quest and Boxing Game. These catalogue entries are placeholders only; their playable game files have not yet been published here.

## File structure

- `index.html` — the library website.
- `games.json` — game metadata and visibility.
- `boatbeats/` — playable BoatBeats.
- `sketch-rally/` — Sketch Rally smartboard game and `phone.html` controller page.
- `melody-trail/` — playable Melody Trail browser game.
- `stem-battleship/` — playable STEM Battleship browser files.
- Each game folder contains its own `index.html` and any supporting static files.

## Enable GitHub Pages

In **Settings → Pages**, set **Build and deployment → Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**, and click **Save**. The site then builds at the URL above.

## Add a game

1. Create a folder such as `new-game/`.
2. Upload its playable HTML, JavaScript, CSS and assets, including a `new-game/index.html` entry point.
3. Add an entry to `games.json` with a relative path of `new-game/` and `published: true` only after the game is ready.
4. Commit the changes; the homepage will then show a Play link.
5. Update only the relevant game's folder when releasing a new version.

## Important maintenance notes

- The original repositories remain unchanged. The versions here are **copies**, not automatically synchronized with their originals. When updating one copy, update the other separately if you want them both current.
- Android APKs and build workflows remain managed in the games' **original** repositories, not this browser library.
- STEM Battleship's page uses its original repository's public `ocean-loop.gif` and PNG icon files through raw GitHub URLs. Those images require network access; the rest of the imported browser game files are hosted in this library.
- Sketch Rally's phone-pairing function uses its existing Supabase service, which may need its own configuration.
- This repository provides a static site. Database, cloud synchronization, and multiplayer features depend on their respective backends.
