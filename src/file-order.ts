import { comparePins, type PinMap, type PinState } from "./pin-state";

interface FileExplorerItem {
  path?: string;
  file?: { path: string };
}

interface RankedItem<T extends FileExplorerItem> {
  item: T;
  index: number;
  pin: PinState | null;
}

export function orderFileExplorerItems<T extends FileExplorerItem>(items: T[], pins: PinMap): T[] {
  const ranked: RankedItem<T>[] = items.map((item, index) => ({
    item,
    index,
    pin: (() => {
      const path = item.file?.path ?? item.path;
      return path && pins[path]?.mode === "normal" ? pins[path] : null;
    })()
  }));
  if (!ranked.some(({ pin }) => pin !== null)) return items;

  return ranked
    .sort((a, b) => {
      if (a.pin && b.pin) return comparePins(a.pin, b.pin);
      if (a.pin) return -1;
      if (b.pin) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
