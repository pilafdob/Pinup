import { Platform, type App } from "obsidian";
import { ensurePushPinIcon } from "./icons";
import type { PinupSettings } from "./settings";
import { comparePins, type PinState } from "./pin-state";
import { PinUpShelf } from "./pin-up-shelf";

interface ViewState {
  observer: MutationObserver;
  shelf: PinUpShelf;
  frame: number | null;
}

const ROW_SELECTOR = ".nav-file-title[data-path], .nav-folder-title[data-path]";
const DIRECT_ROW_SELECTOR = ":scope > .nav-file-title[data-path], :scope > .nav-folder-title[data-path]";
const CONTAINER_SELECTOR = ".nav-files-container, .nav-files-container > div, .nav-folder-children";
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
    : wrapper.querySelector<HTMLElement>(DIRECT_ROW_SELECTOR);
  return row ? wrapper : null;
}

function pathForWrapper(wrapper: HTMLElement): string | null {
  const row = wrapper.matches(ROW_SELECTOR)
    ? wrapper
    : wrapper.querySelector<HTMLElement>(DIRECT_ROW_SELECTOR);
  return row?.dataset.path ?? null;
}

export class FileExplorerAdapter {
  private readonly views = new Map<HTMLElement, ViewState>();

  constructor(
    private readonly app: App,
    private readonly getSettings: () => PinupSettings,
    private readonly activatePin: (path: string, requestPinUp: boolean) => void,
    private readonly removePinUp: (path: string) => void
  ) {}

  refreshAll(): void {
    this.syncViews();
    for (const viewEl of this.views.keys()) this.refreshView(viewEl);
  }

  unload(): void {
    for (const [viewEl, state] of this.views) {
      if (state.frame !== null) viewEl.ownerDocument.defaultView?.cancelAnimationFrame(state.frame);
      state.observer.disconnect();
      state.shelf.remove();
      this.clearVisualOrder(viewEl);
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
        shelf: new PinUpShelf(this.app, this.removePinUp),
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
      this.decorateRows(viewEl);
      this.sortNormalPins(viewEl);
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
    const mobile = Platform.isMobile || viewEl.ownerDocument.body.hasClass("is-mobile");
    for (const row of viewEl.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
      const path = row.dataset.path;
      if (!path) continue;
      const pin = settings.pins[path];
      const showInlineButton = settings.showInlinePinButtons && pin !== undefined;

      row.toggleClass("pinup-row", !mobile || showInlineButton);
      row.toggleClass(
        "is-pinup-hidden",
        settings.hideOriginalsForPinUp && pin?.mode === "pin-up"
      );

      const existing = row.querySelector<HTMLElement>(".pinup-inline-button");
      if (!showInlineButton) {
        existing?.remove();
        continue;
      }

      const button = existing ?? row.ownerDocument.createElement("button");
      if (!existing) {
        button.className = "pinup-inline-button clickable-icon";
        button.setAttribute("type", "button");
        const stopRowActivation = (event: Event): void => event.stopPropagation();
        for (const eventName of [
          "pointerdown",
          "pointerup",
          "touchstart",
          "touchend",
          "mousedown"
        ]) {
          button.addEventListener(eventName, stopRowActivation);
        }
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const target = event.currentTarget as HTMLButtonElement;
          const currentPath = target.dataset.path;
          target.blur();
          if (currentPath) this.activatePin(currentPath, event.metaKey || event.ctrlKey);
        });
        row.appendChild(button);
      }

      button.dataset.path = path;
      button.toggleClass("is-pinup-active", pin !== undefined);
      button.toggleClass("is-pin-up", pin?.mode === "pin-up");
      button.setAttribute("aria-pressed", String(pin !== undefined));
      const label = pin?.mode === "pin-up"
        ? "Remove from pin-up"
        : pin?.mode === "normal" ? "Remove pin" : "Pin";
      button.setAttribute("aria-label", `${label}: ${path}`);
      button.setAttribute(
        "title",
        pin?.mode === "pin-up"
          ? "Pinned up (click to remove from pin-up)"
          : `${label} (Command/Control-click to pin up)`
      );
      ensurePushPinIcon(this.app, button);
    }
  }

  private clearVisualOrder(viewEl: HTMLElement): void {
    for (const container of viewEl.querySelectorAll<HTMLElement>(".pinup-order-container")) {
      container.removeClass("pinup-order-container");
      for (const child of Array.from(container.children)) {
        (child as HTMLElement).style.removeProperty("order");
      }
    }
  }

  private sortNormalPins(viewEl: HTMLElement): void {
    this.clearVisualOrder(viewEl);
    const normal = Object.values(this.getSettings().pins)
      .filter((pin): pin is PinState => pin.mode === "normal");
    if (normal.length === 0) return;
    const pinByPath = new Map(normal.map((pin) => [pin.path, pin]));

    for (const container of viewEl.querySelectorAll<HTMLElement>(CONTAINER_SELECTOR)) {
      const wrappers = Array.from(container.children)
        .map((child) => directItem(container, child))
        .filter((child): child is HTMLElement => child !== null);
      if (wrappers.length === 0) continue;

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

      container.addClass("pinup-order-container");
      pinned.forEach(({ wrapper }, index) => {
        wrapper.style.order = String(index - pinned.length);
      });
    }
  }
}
