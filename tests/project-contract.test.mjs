import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [main, explorer, shelf, icons, styles, manifest] = await Promise.all([
  readFile("src/main.ts", "utf8"),
  readFile("src/file-explorer.ts", "utf8"),
  readFile("src/pin-up-shelf.ts", "utf8"),
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

test("orders pinned rows without moving native File Explorer nodes", () => {
  assert.match(explorer, /\.nav-files-container > div/);
  assert.match(styles, /\.pinup-order-container\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s);
  assert.match(explorer, /wrapper\.style\.order = String\(index - pinned\.length\)/);
  assert.doesNotMatch(explorer, /container\.(?:appendChild|insertBefore)\(/);
  assert.match(explorer, /pin\.mode === "normal"/);
});

test("uses modifier-click for pin-up and plain-click to remove an existing pin-up", () => {
  assert.match(explorer, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(main, /requestPinUp[\s\S]*this\.pin\(path, "pin-up"\)/);
  assert.match(main, /this\.settings\.pins\[path\]\?\.mode === "pin-up"[\s\S]*this\.unpin\(path\)/);
});

test("creates isolated inline controls for saved pins on desktop and mobile", () => {
  assert.match(explorer, /Platform\.isMobile/);
  assert.match(explorer, /body\.hasClass\("is-mobile"\)/);
  assert.match(explorer, /showInlineButton = settings\.showInlinePinButtons && pin !== undefined/);
  assert.match(explorer, /row\.toggleClass\("pinup-row", !mobile \|\| showInlineButton\)/);
  assert.match(explorer, /if \(!showInlineButton\)/);
  for (const eventName of ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown"]) {
    assert.match(explorer, new RegExp(`\\"${eventName}\\"`));
  }
  assert.match(explorer, /const stopRowActivation = \(event: Event\): void => event\.stopPropagation\(\)/);
  assert.match(explorer, /addEventListener\("click", \(event\) => \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  assert.match(explorer, /target\.blur\(\)/);
  assert.match(explorer, /is-pinup-active/);
  assert.doesNotMatch(explorer, /\|\| mobile \|\| !pin/);
  assert.doesNotMatch(explorer, /toggleClass\("is-active"/);
  assert.doesNotMatch(styles, /\.pinup-row:hover > \.pinup-inline-button/);
  assert.doesNotMatch(styles, /\.pinup-inline-button\.is-active/);
});

test("reserves a mobile-sized touch target only on decorated rows", () => {
  assert.match(styles, /\.is-mobile \.pinup-row\s*\{\s*padding-inline-end:\s*50px;/);
  assert.match(styles, /\.is-mobile \.pinup-inline-button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
});

test("offers shelf removal through a context menu", () => {
  assert.match(shelf, /addEventListener\("contextmenu"/);
  assert.match(shelf, /setTitle\("Remove from pin-up"\)/);
  assert.match(shelf, /this\.removePinUp\(file\.path\)/);
});

test("styles the mobile shelf as a touch-friendly island", () => {
  assert.match(styles, /Mobile pin-up island: keep this block self-contained for easy rollback/);
  assert.match(styles, /\.is-mobile \.pinup-shelf\s*\{[^}]*margin:\s*12px 10px 10px;[^}]*padding:\s*6px;[^}]*border-radius:\s*var\(--radius-l\);[^}]*box-shadow:\s*var\(--shadow-s\);/s);
  assert.match(styles, /\.is-mobile \.pinup-shelf-item\s*\{[^}]*min-height:\s*44px;[^}]*gap:\s*8px;[^}]*padding:\s*8px 10px;/s);
  assert.match(styles, /\.is-mobile \.pinup-shelf-item:active\s*\{[^}]*transform:\s*scale\(0\.985\);/s);
  assert.match(styles, /\.is-mobile \.pinup-shelf-item-icon\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;/s);
});

test("renders pin-up indicators with a visibly heavier pin stroke", () => {
  assert.match(styles, /\.pinup-shelf-item-icon svg,\s*\.pinup-inline-button\.is-pin-up > svg/);
  assert.match(styles, /stroke-width:\s*2\.75px/);
  assert.match(styles, /\.pinup-row \.pinup-inline-button > svg\s*\{\s*opacity:\s*1 !important;/);
  assert.equal((styles.match(/opacity:\s*1;/g) ?? []).length >= 2, true);
});

test("prefers an isolated Nicons icon with a native Lucide fallback", () => {
  assert.match(icons, /renderPackIcon\?\.\(staging, "nicons:push-pin", null\)/);
  assert.match(icons, /cloneNode\(true\)/);
  assert.match(icons, /classList\.remove\("nicons-pack-icon"\)/);
  assert.match(icons, /setIcon\(container, "pin"\)/);
  assert.doesNotMatch(styles, /\.nicons-pack-icon/);
});
