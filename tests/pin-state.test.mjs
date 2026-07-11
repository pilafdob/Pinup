import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundled = await build({
  entryPoints: ["src/pin-state.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false
});
const source = bundled.outputFiles[0].text;
const state = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("adds and switches pin modes without losing deterministic order", () => {
  let pins = state.setPin({}, "Folder/B.md", "normal", 100);
  pins = state.setPin(pins, "Folder/A.md", "normal", 200);
  pins = state.setPin(pins, "Folder/B.md", "pin-up", 300);

  assert.deepEqual(pins["Folder/B.md"], {
    path: "Folder/B.md",
    mode: "pin-up",
    createdAt: 100,
    order: 0
  });
  assert.equal(pins["Folder/A.md"].order, 1);
});

test("orders by order, createdAt, then path", () => {
  const pins = {
    z: { path: "z", mode: "normal", order: 1, createdAt: 5 },
    b: { path: "b", mode: "normal", order: 0, createdAt: 10 },
    a: { path: "a", mode: "normal", order: 0, createdAt: 10 },
    c: { path: "c", mode: "pin-up", order: 0, createdAt: 1 }
  };
  assert.deepEqual(state.orderedPins(pins, "normal").map((pin) => pin.path), ["a", "b", "z"]);
});

test("toggle removes the current mode and switches a different mode", () => {
  const normal = state.setPin({}, "Note.md", "normal", 1);
  assert.deepEqual(state.togglePin(normal, "Note.md", "normal"), {});
  assert.equal(state.togglePin(normal, "Note.md", "pin-up")["Note.md"].mode, "pin-up");
});

test("folder rename updates the folder and every pinned descendant", () => {
  const pins = {
    Folder: { path: "Folder", mode: "normal", createdAt: 1, order: 0 },
    "Folder/A.md": { path: "Folder/A.md", mode: "pin-up", createdAt: 2, order: 1 },
    "Other.md": { path: "Other.md", mode: "normal", createdAt: 3, order: 2 }
  };
  const renamed = state.renamePinnedPath(pins, "Folder", "Renamed");
  assert.equal(renamed.Folder, undefined);
  assert.equal(renamed["Renamed"].path, "Renamed");
  assert.equal(renamed["Renamed/A.md"].path, "Renamed/A.md");
  assert.equal(renamed["Other.md"], pins["Other.md"]);
});

test("folder deletion removes the folder and every pinned descendant", () => {
  const pins = {
    Folder: { path: "Folder", mode: "normal", createdAt: 1, order: 0 },
    "Folder/A.md": { path: "Folder/A.md", mode: "pin-up", createdAt: 2, order: 1 },
    "Other.md": { path: "Other.md", mode: "normal", createdAt: 3, order: 2 }
  };
  assert.deepEqual(Object.keys(state.removePinnedPath(pins, "Folder")), ["Other.md"]);
});

test("cleans unresolved entries without touching resolved pins", () => {
  const pins = {
    "Exists.md": { path: "Exists.md", mode: "normal", createdAt: 1, order: 0 },
    "Missing.md": { path: "Missing.md", mode: "pin-up", createdAt: 2, order: 1 }
  };
  const clean = state.removeMissingPins(pins, (path) => path === "Exists.md");
  assert.deepEqual(Object.keys(clean), ["Exists.md"]);
});

test("clears every pin without mutating the input", () => {
  const pins = {
    "A.md": { path: "A.md", mode: "normal", createdAt: 1, order: 0 },
    "B.md": { path: "B.md", mode: "pin-up", createdAt: 2, order: 1 }
  };
  assert.deepEqual(state.clearPins(pins), {});
  assert.equal(Object.keys(pins).length, 2);
});
