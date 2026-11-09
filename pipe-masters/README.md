# Pipe Masters — Team Challenge v0.1

Webcam-based collaborative puzzle for an Android smartboard. Pupils hold coloured A4 papers in front of the camera and coordinate the colour order, position, and horizontal/vertical orientation to complete the missing pipeline.

## Play

- **Demo mode** requires no camera: drag the coloured strips in the preview and tap to rotate. Match the dashed guides.
- **Camera mode** requires HTTPS/localhost and permission to use a compatible built-in or external webcam. Use solid-colour papers, bright even lighting, and a plain background. Pupils must match the shape and orientation of the missing pipe sections relative to one another, then hold the correct formation for 3 seconds.
- Five progressive levels from 3 to 6 participants. Use **Settings** for camera selection, mirror preview, and scoring precision.
- Camera analysis is performed in-browser using HSV colour segmentation, connected components, and approximate relative-position checks. No video recordings or uploads.

## Important limitations

This is an untested classroom hardware prototype. Physical webcam detection may give false positives or miss colours, particularly grey, and will need calibration with your exact papers, camera, background and lighting. Android-based smartboards vary in whether a USB webcam is exposed to the browser. Try Demo first and verify camera access on the actual board.

Hosted GitHub Pages URL, when enabled: https://mohammaddhameri-blip.github.io/smartboardgames/pipe-masters/
