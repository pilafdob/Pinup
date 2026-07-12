# Pinup release checklist

This checklist records the release and Community Plugin readiness gates for Pinup.

## Before making the repository public

- Review the complete staged diff and run a final secrets/path scan.
- Confirm the public repository name and that the `pinup` plugin ID is available in the Community directory.
- Run `npm test` and `npm run build` from a clean checkout.
- Manually test the built plugin in a disposable vault on the supported desktop and mobile targets.
- Confirm that the File Explorer DOM behavior still works on the target Obsidian version; it is intentionally isolated because it depends on unstable UI structure.

## Publish a version

1. Make the GitHub repository public only after the public-surface review passes.
2. Use the exact plain semantic version from `manifest.json` as the release tag.
3. Push the plain semantic-version tag. The release workflow runs tests, validates metadata, builds `main.js`, attests `main.js` and `styles.css`, and publishes `main.js`, `manifest.json`, and `styles.css` as release assets. Do not commit `main.js`.
4. Verify that the release is published, that its tag exactly matches `manifest.json`, and that `gh attestation verify` succeeds for the downloaded `main.js` and `styles.css` assets.
5. Submit the public repository URL at https://community.obsidian.md and address any automated review feedback with a new patch release.

## Verified locally on 2026-07-11

- `npm test`: 19 passing tests.
- `npm run build`: TypeScript check and production bundle completed.
- `manifest.json`, `package.json`, and `versions.json` agree on version `1.0.0` and minimum app version `1.4.16`.
- The tracked repository and built runtime were scanned for local paths, credentials, tokens, private keys, and source maps.
- The release assets are `main.js`, `manifest.json`, and `styles.css`; `main.js` remains excluded from source control.
