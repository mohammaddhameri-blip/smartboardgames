# Smartboard Games 🎮

A central classroom game library and home for independently playable smartboard games.

## Repository layout

- \`index.html\`: main game library website.
- \`games.json\`: catalogue of game titles, descriptions, and publishing status.
- \`game-name/index.html\`: each game's own playable webpage, with any required assets in its folder.

Initially, game entries are marked **Coming soon** because their playable files have **not** yet been copied to this repository. Existing game repositories are unchanged.

## Publishing on GitHub Pages

Open **Settings → Pages** in this repository. Under **Build and deployment**, choose **Deploy from a branch**, select **main**, select **/(root)**, then click **Save**.

Once Pages is enabled and deployed, the main library will be:

https://mohammaddhameri-blip.github.io/smartboardgames/

For example, after you publish BoatBeats at \`boatbeats/index.html\`, its independent URL will be:

https://mohammaddhameri-blip.github.io/smartboardgames/boatbeats/

## Adding or updating a game

1. Create or update the game's own folder, such as \`boatbeats/\`. Include its \`index.html\` and any required assets.
2. Add or edit the corresponding entry in \`games.json\`.
3. Set \`published\` to \`true\` **only after** the game files are present and functional.
4. Commit. The main library will now show a Play button that opens the individual game URL.

Games can be updated independently. A game using a database, multiplayer, or a secure server may also need an external backend.

## Notes

- Each game is a separate folder within the **same** repository.
- The homepage and individual game URLs are both supported.
- Changes to existing, separate repositories are not required.
