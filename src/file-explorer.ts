import type { App } from "obsidian";
import { ensurePushPinIcon } from "./icons";
import type { PinupSettings } from "./settings";
import { comparePins, type PinState } from "./pin-state";
import { PinUpShelf } from "./pin-up-shelf";

interface ViewState {
  observer: MutationObserver;
  shelf: PinUpShelf;
  originalOrders: Map<HTMLElement, HTMLElement[]>;
  frame: number | null;
}

const ROW_SELECTOR = ".nav-file-title[data-path], .nav-folder-title[data-path]";
const CONTAINER_SELECTOR = ".nav-files-container, .nav-folder-children";
function mutationChangesExplorerStructure(records: MutationRecord[]): boolean {
  for (const record of records) {
    const target = record.target instanceof Element ? record.target : null;
    if (target?.closest(".pinup-shelf, .pinup-inline-button")) continue;

    const targetRow = target?.closest<HTMLElement>(ROW_SELECTOR);
    if (targetRow?.dataset.path && !targetRow.hasClass("pinup-row")) return true;

    for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      const element = node as Element;
      if (element.matches(".nav-files-container, .nav-header")) return true;

      const rows = element.matches(ROW_SELECTOR)
        ? [element as HTMLElement]
        : Array.from(element.querySelectorAll<HTMLElement>(ROW_SELECTOR));
      if (rows.some((row) => row.dataset.path && !row.hasClass("pinup-row"))) return true;
    }
  }
  return false;
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

function directItem(container: HTMLElement, child: Element): HTMLElement | null {
  const wrapper = child as HTMLElement;
  const row = wrapper.matches(ROW_SELECTOR)
    ? wrapper
    : wrapper.querySelector<HTMLElement>(`:scope > ${ROW_SELECTOR}`);
  return row ? wrapper : null;
}

function pathForWrapper(wrapper: HTMLElement): string | null {
  const row = wrapper.matches(ROW_SELECTOR)
    ? wrapper
    : wrapper.querySelector<HTMLElement>(`:scope > ${ROW_SELECTOR}`);
  return row?.dataset.path ?? null;
}

export class FileExplorerAdapter {
  private readonly views = new Map<HTMLElement, ViewState>();

  constructor(
    private readonly app: App,
    private readonly getSettings: () => PinupSettings,
    private readonly toggleNormal: (path: string) => void
  ) {}

  refreshAll(): void {
    this.syncViews();
    for (const viewEl of this.views.keys()) this.refreshView(viewEl);
  }

  unload(): void {
    for (const [viewEl, state] of this.views) {
      if (state.frame !== null) viewEl.ownerDocument.defaultView?.cancelAnimationFrame(state.frame);
      state.observer.disconnect();
      this.restoreNativeOrder(state);
      state.shelf.remove();
      this.cleanRows(viewEl);
    }
    this.views.clear();
  }

  private syncViews(): void {
    const live = new Set<HTMLElement>();
    for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) {
      const viewEl = leaf.view.containerEl;
      live.add(viewEl);
      if (this.views.has(viewEl)) continue;

      const state: ViewState = {
        observer: new MutationObserver((records) => {
          if (mutationChangesExplorerStructure(records)) this.schedule(viewEl);
        }),
        shelf: new PinUpShelf(this.app),
        originalOrders: new Map(),
        frame: null
      };
      this.views.set(viewEl, state);
      state.observer.observe(viewEl, {
        attributes: true,
        attributeFilter: ["data-path"],
        childList: true,
        subtree: true
      });
    }

    for (const [viewEl, state] of this.views) {
      if (live.has(viewEl) && viewEl.isConnected) continue;
      state.observer.disconnect();
      state.shelf.remove();
      this.views.delete(viewEl);
    }
  }

  private schedule(viewEl: HTMLElement): void {
    const state = this.views.get(viewEl);
    const win = viewEl.ownerDocument.defaultView;
    if (!state || !win || state.frame !== null) return;
    state.frame = win.requestAnimationFrame(() => {
      state.frame = null;
      this.refreshView(viewEl);
    });
  }

  private refreshView(viewEl: HTMLElement): void {
    const state = this.views.get(viewEl);
    if (!state) return;
    state.observer.disconnect();
    try {
      this.restoreNativeOrder(state);
      this.decorateRows(viewEl);
      this.sortNormalPins(viewEl, state);
      const settings = this.getSettings();
      state.shelf.render(viewEl, settings.pins, settings.showPinUpShelf);
    } finally {
      state.observer.observe(viewEl, {
        attributes: true,
        attributeFilter: ["data-path"],
        childList: true,
        subtree: true
      });
    }
  }

  private cleanRows(viewEl: HTMLElement): void {
    for (const row of viewEl.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
      row.removeClass("pinup-row", "is-pinup-hidden");
      row.querySelector(".pinup-inline-button")?.remove();
    }
  }

  private decorateRows(viewEl: HTMLElement): void {
    const settings = this.getSettings();
    for (const row of viewEl.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
      const path = row.dataset.path;
      if (!path) continue;
      const pin = settings.pins[path];

      row.addClass("pinup-row");
      row.toggleClass(
        "is-pinup-hidden",
        settings.hideOriginalsForPinUp && pin?.mode === "pin-up"
      );

      const existing = row.querySelector<HTMLElement>(".pinup-inline-button");
      if (!settings.showInlinePinButtons) {
        existing?.remove();
        continue;
      }

      const button = existing ?? row.ownerDocument.createElement("button");
      if (!existing) {
        button.className = "pinup-inline-button clickable-icon";
        button.setAttribute("type", "button");
        button.addEventListener("mousedown", (event) => event.stopPropagation());
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const currentPath = (event.currentTarget as HTMLElement).dataset.path;
          if (currentPath) this.toggleNormal(currentPath);
        });
        row.appendChild(button);
      }

      button.dataset.path = path;
      button.toggleClass("is-active", pin !== undefined);
      button.toggleClass("is-pin-up", pin?.mode === "pin-up");
      const label = pin?.mode === "normal" ? "Remove pin" : "Pin";
      button.setAttribute("aria-label", `${label}: ${path}`);
      button.setAttribute("title", pin?.mode === "pin-up" ? "Pinned up (click to pin normally)" : label);
      ensurePushPinIcon(this.app, button);
    }
  }

  private restoreNativeOrder(state: ViewState): void {
    for (const [container, order] of state.originalOrders) {
      if (!container.isConnected) {
        state.originalOrders.delete(container);
        continue;
      }
      const current = Array.from(container.children)
        .map((child) => directItem(container, child))
        .filter((child): child is HTMLElement => child !== null);
      if (current.length !== order.length || current.some((node) => !order.includes(node))) {
        state.originalOrders.delete(container);
        continue;
      }
      for (const node of order) container.appendChild(node);
    }
  }

  private sortNormalPins(viewEl: HTMLElement, state: ViewState): void {
    const normal = Object.values(this.getSettings().pins)
      .filter((pin): pin is PinState => pin.mode === "normal");
    if (normal.length === 0) return;
    const pinByPath = new Map(normal.map((pin) => [pin.path, pin]));

    for (const container of viewEl.querySelectorAll<HTMLElement>(CONTAINER_SELECTOR)) {
      const wrappers = Array.from(container.children)
        .map((child) => directItem(container, child))
        .filter((child): child is HTMLElement => child !== null);
      if (wrappers.length === 0) continue;
      if (!state.originalOrders.has(container)) state.originalOrders.set(container, [...wrappers]);

      const paths = wrappers.map((wrapper) => pathForWrapper(wrapper));
      const folder = paths.find((path): path is string => path !== null);
      if (folder === undefined) continue;
      const expectedParent = parentPath(folder);

      const pinned = wrappers
        .map((wrapper) => ({ wrapper, path: pathForWrapper(wrapper) }))
        .filter((entry): entry is { wrapper: HTMLElement; path: string } =>
          entry.path !== null && parentPath(entry.path) === expectedParent && pinByPath.has(entry.path)
        )
        .sort((a, b) => comparePins(pinByPath.get(a.path)!, pinByPath.get(b.path)!));
      if (pinned.length === 0) continue;

      const pinnedNodes = new Set(pinned.map((entry) => entry.wrapper));
      const firstUnpinned = wrappers.find((wrapper) => !pinnedNodes.has(wrapper)) ?? null;
      for (const { wrapper } of pinned) container.insertBefore(wrapper, firstUnpinned);
    }
  }
}
