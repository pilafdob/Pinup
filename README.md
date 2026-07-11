# Pinup

Pinup adds two focused pinning modes to Obsidian's File Explorer without changing files, folders, note content, or frontmatter.

- **Pin** moves an item above its unpinned siblings inside the same folder. Multiple pins keep a deterministic order.
- **Pin up** adds an item to a compact shelf directly below the File Explorer toolbar while leaving its original tree entry in place by default.

## Use

Right-click any file or folder in the File Explorer and choose **Pin**, **Pin up**, or **Unpin**. A small pin control at the right edge of each tree row toggles normal pinning.

For the active file, the command palette includes:

- Pin current file
- Pin up current file
- Unpin current file
- Toggle normal pin for current file
- Toggle pin-up for current file
- Clear all pins

Settings can hide inline controls, hide the shelf, hide original tree rows for pin-up items, or clear all saved pin state.

## Icons

Pinup uses Obsidian's native Lucide pin icon and does not access, style, or depend on Nicons. Nicons keeps full control of its own icons and colour settings.

## Known compatibility boundary

Obsidian does not expose File Explorer row ordering or inline shelf placement through stable public APIs. Those DOM interactions are isolated in `src/file-explorer.ts` and `src/pin-up-shelf.ts`; if the expected toolbar/tree structure changes, only that visual enhancement stops and the plugin's saved state, commands, and context menus remain available.

## Development

```sh
npm install
npm test
npm run build
```

The production runtime files are `main.js`, `manifest.json`, and `styles.css`.
