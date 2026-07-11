import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [main, explorer, icons, styles, manifest] = await Promise.all([
  readFile("src/main.ts", "utf8"),
  readFile("src/file-explorer.ts", "utf8"),
  readFile("src/icons.ts", "utf8"),
  readFile("styles.css", "utf8"),
  readFile("manifest.json", "utf8").then(JSON.parse)
]);

test("registers every required command", () => {
  for (const id of [
    "pin-current-file",
    "pin-up-current-file",
    "unpin-current-file",
    "toggle-normal-pin-current-file",
    "toggle-pin-up-current-file",
    "clear-all-pins"
  ]) assert.match(main, new RegExp(`\\"${id}\\"`));
});

test("does not call vault content, rename, or move writers", () => {
  assert.doesNotMatch(main, /vault\.(?:modify|process|rename|trash|delete|create|createBinary)\s*\(/);
});

test("keeps all custom CSS scoped and theme-variable based", () => {
  const selectors = styles.match(/(?:^|\n)([^@\n][^{]+)\{/g) ?? [];
  for (const selector of selectors) assert.match(selector, /\.pinup-/);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b|rgba?\s*\(/i);
  for (const variable of [
    "--background-primary",
    "--background-secondary",
    "--background-modifier-border",
    "--background-modifier-hover",
    "--text-muted",
    "--text-normal",
    "--interactive-accent",
    "--radius-s",
    "--radius-m"
  ]) assert.match(styles, new RegExp(variable));
});

test("manifest remains mobile-capable and uses the expected plugin id", () => {
  assert.equal(manifest.id, "pinup");
  assert.equal(manifest.isDesktopOnly, false);
});

test("refreshes rows restored after startup while ignoring Pinup's own DOM", () => {
  assert.match(explorer, /target\?\.closest\("\.pinup-shelf, \.pinup-inline-button"\)/);
  assert.match(explorer, /!targetRow\.hasClass\("pinup-row"\)/);
  assert.match(explorer, /rows\.some\(\(row\) => row\.dataset\.path && !row\.hasClass\("pinup-row"\)\)/);
  assert.match(explorer, /attributeFilter: \["data-path"\]/);
});

test("renders pin-up indicators with a visibly heavier pin stroke", () => {
  assert.match(styles, /\.pinup-shelf-item-icon svg,\s*\.pinup-inline-button\.is-pin-up > svg/);
  assert.match(styles, /stroke-width:\s*2\.75px/);
  assert.match(styles, /\.pinup-row \.pinup-inline-button\.is-active > svg\s*\{\s*opacity:\s*1 !important;/);
  assert.equal((styles.match(/opacity:\s*1;/g) ?? []).length >= 2, true);
});

test("keeps Pinup icons isolated from Nicons", () => {
  assert.match(icons, /setIcon\(container, "pin"\)/);
  assert.doesNotMatch(icons, /nicons|plugins\?\.|getPlugin|renderPackIcon/i);
  assert.doesNotMatch(styles, /nicons/i);
});
