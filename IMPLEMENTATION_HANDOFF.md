# Pinup implementation handoff

Status: **Implemented and release-prepared.**

## Product boundary

Build only the two File Explorer pinning modes specified in the source plan:

1. **Normal pin**: elevate a file or folder above unpinned siblings in its existing folder.
2. **Pin-up**: show the item in an inline shelf between the File Explorer toolbar row and the first tree item.

Do not rename, move, edit, or add frontmatter to user files. Do not add favorites, tags, drag sorting, sync, or any unrelated feature.

This document records the implementation boundary and maintenance constraints for future contributors.

## Source layout

The implementation is organized as follows:

```text
src/
  main.ts             lifecycle, commands, event wiring
  settings.ts         settings interface, defaults, settings tab
  pin-state.ts        persisted state and path/order operations
  file-explorer.ts    narrow DOM/internal adapter for rows and sorting
  pin-up-shelf.ts     shelf discovery, rendering, cleanup, activation
  icons.ts            optional Nicons bridge plus Obsidian fallback
```

Keep `styles.css` scoped to a `pinup-` prefix. The source plan's suggested `pin-plugin-*` names should be renamed consistently to avoid another plugin claiming the generic namespace.

## State contract

Use vault-relative paths. Preserve a deterministic ordering field so pinned siblings do not reorder unpredictably.

```ts
type PinMode = "normal" | "pin-up";

interface PinState {
  path: string;
  mode: PinMode;
  createdAt: number;
  order: number;
}

interface PinupSettings {
  pins: Record<string, PinState>;
  showInlinePinButtons: boolean;
  showPinUpShelf: boolean;
  hideOriginalsForPinUp: boolean;
}
```

Defaults:

```ts
{
  pins: {},
  showInlinePinButtons: true,
  showPinUpShelf: true,
  hideOriginalsForPinUp: false
}
```

Persist state through Obsidian plugin data APIs. On a vault rename, replace the stored old path; on delete, remove the matching entry. Treat any unresolved path as a safe, non-throwing cleanup case.

## File Explorer adapter: highest-risk area

The placement and in-tree sorting requested by this plugin are not fully covered by stable public APIs. Keep every DOM query or internal reference in `file-explorer.ts` / `pin-up-shelf.ts`; do not let those types leak into state, commands, or settings.

- Discover the File Explorer lazily after layout is ready and again when workspace layout changes.
- Insert the shelf only after positively identifying the toolbar and tree container. It belongs *after* the toolbar and *before* the first file/folder row.
- If the expected DOM is absent or changes, remove stale injected elements and disable only the affected enhancement. The plugin must still load and its commands/context menu must remain usable.
- Prefer DOM reordering and narrow observers over monkey-patching. If a sorting patch is unavoidable, retain the original method, wrap one isolated call site, restore it on unload, and document the fragile contract inline.
- Do not rely on a selector remaining correct without manual verification against the target Obsidian desktop version.

Normal-pinned children should come first within a folder; sort them by `order`, then `createdAt`, then path. Leave every unpinned item in Obsidian's native order.

## Interactions and accessibility

- Context-menu actions for both `TFile` and `TFolder`: Pin, Pin up, Unpin / mode-specific removal.
- Commands apply to the active file where appropriate.
- Inline controls are optional and must have `aria-label` plus an explanatory tooltip.
- Reserve row-end space before adding a right-aligned inline control; never let the name overlap it.
- Files in the shelf open normally. Folders should reveal/navigate if a supported route is available; otherwise fail quietly.
- An empty shelf must not leave a visual gap.

## Icons

Nicons is an optional enhancement only. Inspect its public/observable runtime shape defensively at runtime; do not import it or make it a dependency. Attempt to resolve Phosphor `push-pin` only when Nicons is present. Any unavailable or changed bridge must fall back to Obsidian's supported icon utility or a bundled SVG without blocking startup. Avoid production console noise.

## Styling contract

Use only Obsidian variables where possible: `--background-primary`, `--background-secondary`, `--background-modifier-border`, `--background-modifier-hover`, `--text-muted`, `--text-normal`, `--interactive-accent`, `--radius-s`, and `--radius-m`.

The shelf should be compact, rounded, and unobtrusive in both light and dark themes. Icons should be muted until hover or active state. Avoid broad selectors and hard-coded theme colors.

## Verification required before release

- Install dependencies and run the configured typecheck/bundle command.
- Test in a disposable vault; enable, disable, reload, and restart the plugin.
- Verify files and folders for normal pinning, several pinned siblings, unpin restoration, and native unpinned ordering.
- Verify shelf placement directly below toolbar icons, empty-shelf disappearance, long-name truncation, and both themes.
- Verify context menus, every command, accessible labels, and settings persistence.
- Rename/move and delete pinned files and folders; confirm state updates or cleans safely.
- Verify no modification to note content, frontmatter, names, or paths.
- Test with Nicons absent. If optional Nicons support is implemented, separately test the expected Phosphor fallback path.
- Record the Obsidian version, selectors/internal assumptions inspected, screenshots, and known limitations.

## Build conventions

`package.json`, `tsconfig.json`, and `esbuild.config.mjs` use a TypeScript/esbuild production build. The release bundle is deliberately not committed: generate it with `npm run build` and upload it as a GitHub Release asset.
