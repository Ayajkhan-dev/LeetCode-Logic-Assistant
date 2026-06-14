Place these font files in this `fonts/` folder for fully bundled offline typography:

- `JetBrainsMono-Regular.woff2`
- `JetBrainsMono-SemiBold.woff2`
- `FiraCode-Regular.woff2`
- `FiraCode-SemiBold.woff2`

After adding files:

1. Open `chrome://extensions`
2. Click `Reload` on this extension
3. Reopen the side panel

Notes:

- `panel.css` is already configured with `@font-face` to use these local files.
- If files are missing, the UI automatically falls back to system monospace fonts.
