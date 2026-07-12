import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundled = await build({
  entryPoints: ["src/file-order.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false
});
const source = bundled.outputFiles[0].text;
const ordering = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("moves normal pins before unpinned siblings without disturbing their hierarchy", () => {
  const items = [
    { file: { path: "Attachments" } },
    { file: { path: "Brainstorming" } },
    { file: { path: "Inbox" } },
    { file: { path: "Learning" } }
  ];
  const pins = {
    Inbox: { path: "Inbox", mode: "normal", createdAt: 1, order: 0 },
    Attachments: { path: "Attachments", mode: "normal", createdAt: 2, order: 1 }
  };

  assert.deepEqual(
    ordering.orderFileExplorerItems(items, pins).map((item) => item.file.path),
    ["Inbox", "Attachments", "Brainstorming", "Learning"]
  );
  assert.deepEqual(items.map((item) => item.file.path), ["Attachments", "Brainstorming", "Inbox", "Learning"]);
});

test("leaves pin-up and unrelated paths out of native folder ordering", () => {
  const items = [{ file: { path: "A" } }, { file: { path: "B" } }];
  const pins = {
    B: { path: "B", mode: "pin-up", createdAt: 1, order: 0 },
    "Other/C": { path: "Other/C", mode: "normal", createdAt: 2, order: 1 }
  };

  assert.equal(ordering.orderFileExplorerItems(items, pins), items);
});
