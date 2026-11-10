import { Menu, TFile, TFolder, type App, type TAbstractFile } from "obsidian";
import { ensurePushPinIcon, pushPinIconContext } from "./icons";
import { orderedPins, type PinMap } from "./pin-state";

interface FileExplorerViewLike {
  revealInFolder?: (file: TAbstractFile) => Promise<void> | void;
}

export class PinUpShelf {
  private shelfEl: HTMLElement | null = null;
  private renderSignature = "";

  constructor(
    private readonly app: App,
    private readonly removePinUp: (path: string) => void
  ) {}

  render(viewEl: HTMLElement, pins: PinMap, enabled: boolean): void {
    const tree = viewEl.querySelector<HTMLElement>(".nav-files-container");
    if (!enabled || !tree) {
      this.remove();
      return;
    }

    const resolved = orderedPins(pins, "pin-up")
      .map((pin) => ({ pin, file: this.app.vault.getAbstractFileByPath(pin.path) }))
      .filter((entry): entry is { pin: typeof entry.pin; file: TAbstractFile } => entry.file !== null);
    if (resolved.length === 0) {
      this.remove();
      return;
    }

    if (!this.shelfEl || this.shelfEl.ownerDocument !== viewEl.ownerDocument) {
      this.remove();
      this.shelfEl = viewEl.ownerDocument.createElement("div");
      this.shelfEl.className = "pinup-shelf";
      this.shelfEl.setAttribute("role", "navigation");
      this.shelfEl.setAttribute("aria-label", "Pinned up files and folders");
    }
    // Share the native scroller without inserting into the virtualized rows.
    if (tree.firstElementChild !== this.shelfEl) {
      tree.prepend(this.shelfEl);
    }

    const signature = `${pushPinIconContext(this.app)}\n${resolved
      .map(({ file }) => `${file.path}\0${file.name}\0${file instanceof TFolder ? "folder" : "file"}`)
      .join("\n")}`;
    if (this.renderSignature === signature && this.shelfEl.childElementCount === resolved.length) {
      return;
    }

    this.shelfEl.empty();
    for (const { file } of resolved) {
      const item = this.shelfEl.createEl("button", {
        cls: "pinup-shelf-item",
        attr: {
          type: "button",
          "aria-label": `${file instanceof TFolder ? "Reveal folder" : "Open file"}: ${file.name}`,
          title: file.path
        }
      });
      const icon = item.createSpan({ cls: "pinup-shelf-item-icon" });
      ensurePushPinIcon(this.app, icon);
      item.createSpan({ cls: "pinup-shelf-item-title", text: file.name });
      item.addEventListener("click", () => void this.activate(file, viewEl));
      item.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const menu = new Menu();
        menu.addItem((menuItem) => menuItem
          .setTitle("Remove from pin-up")
          .setIcon("pin-off")
          .onClick(() => this.removePinUp(file.path)));
        menu.showAtMouseEvent(event);
      });
    }
    this.renderSignature = signature;
  }

  remove(): void {
    this.shelfEl?.remove();
    this.shelfEl = null;
    this.renderSignature = "";
  }

  private async activate(file: TAbstractFile, viewEl: HTMLElement): Promise<void> {
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
      return;
    }
    if (!(file instanceof TFolder)) return;

    const leaf = this.app.workspace.getLeavesOfType("file-explorer")
      .find((candidate) => candidate.view.containerEl.contains(viewEl));
    const explorer = leaf?.view as unknown as FileExplorerViewLike | undefined;
    if (typeof explorer?.revealInFolder === "function") {
      try {
        await explorer.revealInFolder(file);
        return;
      } catch {
        // Fall through to the DOM-only reveal route when this internal helper changes.
      }
    }

    const escaped = CSS.escape(file.path);
    const row = viewEl.querySelector<HTMLElement>(`.nav-folder-title[data-path="${escaped}"]`);
    row?.scrollIntoView({ block: "nearest" });
    row?.focus();
  }
}
