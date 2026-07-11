# Pinup release checklist

This repository is prepared for an Obsidian Community Plugin release, but no public release or submission has been made.

## Before making the repository public

- Review the complete staged diff and run a final secrets/path scan.
- Confirm the public repository name and that the `pinup` plugin ID is available in the Community directory.
- Run `npm test` and `npm run build` from a clean checkout.
- Manually test the built plugin in a disposable vault on the supported desktop and mobile targets.
- Confirm that the File Explorer DOM behavior still works on the target Obsidian version; it is intentionally isolated because it depends on unstable UI structure.

## Publish version 0.1.0

1. Make the GitHub repository public only after the public-surface review passes.
2. Create a non-draft GitHub Release with the exact tag `0.1.0`.
3. Attach the production-built `main.js`, `manifest.json`, and `styles.css` files as release assets. Do not commit `main.js`.
4. Verify that the release is published and that its tag exactly matches `manifest.json`.
5. Submit the public repository URL at https://community.obsidian.md and address any automated review feedback with a new patch release.

## Verified locally on 2026-07-11

- `npm test`: 14 passing tests.
- `npm run build`: TypeScript check and production bundle completed.
- `manifest.json`, `package.json`, and `versions.json` agree on version `0.1.0` and minimum app version `1.4.16`.
