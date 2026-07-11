export type PinMode = "normal" | "pin-up";

export interface PinState {
  path: string;
  mode: PinMode;
  createdAt: number;
  order: number;
}

export type PinMap = Record<string, PinState>;

export function comparePins(a: PinState, b: PinState): number {
  return a.order - b.order || a.createdAt - b.createdAt || a.path.localeCompare(b.path);
}

export function orderedPins(pins: PinMap, mode?: PinMode): PinState[] {
  return Object.values(pins)
    .filter((pin) => mode === undefined || pin.mode === mode)
    .sort(comparePins);
}

export function setPin(
  pins: PinMap,
  path: string,
  mode: PinMode,
  now = Date.now()
): PinMap {
  const current = pins[path];
  if (current?.mode === mode) return pins;

  const nextOrder = Object.values(pins).reduce(
    (highest, pin) => Math.max(highest, Number.isFinite(pin.order) ? pin.order : -1),
    -1
  ) + 1;

  return {
    ...pins,
    [path]: {
      path,
      mode,
      createdAt: current?.createdAt ?? now,
      order: current?.order ?? nextOrder
    }
  };
}

export function removePin(pins: PinMap, path: string): PinMap {
  if (!(path in pins)) return pins;
  const next = { ...pins };
  delete next[path];
  return next;
}

export function clearPins(pins: PinMap): PinMap {
  return Object.keys(pins).length === 0 ? pins : {};
}

export function togglePin(pins: PinMap, path: string, mode: PinMode, now = Date.now()): PinMap {
  return pins[path]?.mode === mode ? removePin(pins, path) : setPin(pins, path, mode, now);
}

export function renamePinnedPath(pins: PinMap, oldPath: string, newPath: string): PinMap {
  const oldPrefix = `${oldPath}/`;
  const matches = Object.values(pins).filter(
    (pin) => pin.path === oldPath || pin.path.startsWith(oldPrefix)
  );
  if (matches.length === 0) return pins;

  const next = { ...pins };
  for (const pin of matches) {
    delete next[pin.path];
    const suffix = pin.path.slice(oldPath.length);
    const path = `${newPath}${suffix}`;
    next[path] = { ...pin, path };
  }
  return next;
}

export function removePinnedPath(pins: PinMap, deletedPath: string): PinMap {
  const prefix = `${deletedPath}/`;
  const doomed = Object.keys(pins).filter(
    (path) => path === deletedPath || path.startsWith(prefix)
  );
  if (doomed.length === 0) return pins;

  const next = { ...pins };
  for (const path of doomed) delete next[path];
  return next;
}

export function removeMissingPins(pins: PinMap, exists: (path: string) => boolean): PinMap {
  const missing = Object.keys(pins).filter((path) => !exists(path));
  if (missing.length === 0) return pins;
  const next = { ...pins };
  for (const path of missing) delete next[path];
  return next;
}
