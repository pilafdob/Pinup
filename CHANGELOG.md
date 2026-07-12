# Changelog

All notable changes to Pinup are documented in this file.

## 1.0.1 - 2026-07-12

- Show inline pin controls beside pinned files and folders on mobile.
- Keep native file-row taps intact by isolating touch, pointer, mouse, and click events to the pin control, so only the control unpins the item.
- Refine the mobile pin-up shelf into a roomier, touch-friendly island using theme-native spacing, rounding, and pressed-state feedback.

## 1.0.0 - 2026-07-11

First stable public release.

- Pin files and folders above their unpinned siblings while preserving their native folder hierarchy.
- Add files or folders to a compact pin-up shelf without moving their original File Explorer entries.
- Keep normal pins above pin-up and unpinned siblings with deterministic ordering across restarts.
- Provide File Explorer context-menu actions, active-file commands, settings, persistence, and cleanup for renamed or deleted items.
- Show desktop inline controls only for items that are already pinned; pin-up controls remove the item instead of converting it to a normal pin.
- Support Command-click on macOS and Control-click on Windows/Linux to convert a normal pin to pin-up.
- Preserve native one-tap File Explorer behavior on mobile by omitting inline controls and using long-press menus.
- Allow pin-up shelf items to be removed directly from their desktop or mobile context menu.
- Use Nicons' Phosphor push-pin when available, with an isolated Obsidian Lucide fallback that does not override Nicons styling.
- Store only plugin settings and vault-relative pin state; make no network requests and do not modify vault content or frontmatter.

## 0.1.0 - 2026-07-11

Initial community-release candidate.

- Pin files and folders within their existing File Explorer folder.
- Add a compact File Explorer pin-up shelf.
- Provide context-menu actions, commands, settings, persistence, and safe cleanup for renamed or deleted items.
- Keep all vault content, filenames, paths, and frontmatter unchanged.
