# Pinup

Pinup adds two focused pinning modes to Obsidian's File Explorer without changing files, folders, note content, or frontmatter.

- **Pin** moves an item above its unpinned siblings inside the same folder. Multiple pins keep a deterministic order.
- **Pin up** adds an item to a compact shelf directly below the File Explorer toolbar while leaving its original tree entry in place by default.

## Installation

Once Pinup is accepted into the Obsidian Community Plugins directory, install it from **Settings → Community plugins → Browse**. Until then, install the latest GitHub release with BRAT or copy `main.js`, `manifest.json`, and `styles.css` from the release into `<vault>/.obsidian/plugins/pinup/`, then enable **Pinup** in Obsidian.

## Use

Right-click any file or folder in the File Explorer and choose **Pin**, **Pin up**, or **Unpin**. On desktop, a small pin control is shown only for items that are already pinned; unpinned rows never show a hover control. Command-click a normal pin on macOS, or Control-click it on Windows/Linux, to switch it to pin-up. Plain-clicking a normal pin unpins it, and plain-clicking a pin-up removes it from pin-up.

On mobile, pinned files and folders show a touch-sized pin control. Tap the file or folder row to open or reveal it normally; only tapping the pin control unpins it. Use the long-press context menu to pin or pin up an unpinned item. Long-pressing a pin-up shelf item opens a compact menu that can remove it from pin-up; the same menu is available by right-clicking on desktop.

For the active file, the command palette includes:

- Pin current file
- Pin up current file
- Unpin current file
- Toggle normal pin for current file
- Toggle pin-up for current file
- Clear all pins

Settings can hide inline controls, hide the shelf, hide original tree rows for pin-up items, or clear all saved pin state.

## Icons

For the best-looking pin icon, install [Nicons](https://github.com/pilafdob/Nicons) by [pilafdob](https://github.com/pilafdob). When Nicons is enabled, Pinup uses its Phosphor push-pin shape through an isolated SVG copy. Pinup removes Nicons-owned classes and styling from that copy so it cannot interfere with Nicons' own icons or colour settings.

Nicons is optional. If it is not installed or unavailable, Pinup automatically uses Obsidian's native Lucide pin icon instead.

## Privacy and data

Pinup makes no network requests and includes no telemetry, analytics, advertising, or accounts. It stores only its settings and the vault-relative paths, pin modes, and ordering of pinned items in Obsidian's plugin data. It does not modify notes, frontmatter, file contents, filenames, or folder names.

## Credits

- [Nicons](https://github.com/pilafdob/Nicons) — optional enhanced pin icon, created by [pilafdob](https://github.com/pilafdob).

This Plugin was developed by Filip, @pilafdob.

## Known compatibility boundary

Obsidian does not expose File Explorer row ordering or inline shelf placement through stable public APIs. Those DOM interactions are isolated in `src/file-explorer.ts` and `src/pin-up-shelf.ts`; if the expected toolbar/tree structure changes, only that visual enhancement stops and the plugin's saved state, commands, and context menus remain available.

## Development

```sh
npm install
npm test
npm run build
```

The production runtime files are `main.js`, `manifest.json`, and `styles.css`.
