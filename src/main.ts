import {
  Menu,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
  type MenuItem
} from "obsidian";
import { FileExplorerAdapter } from "./file-explorer";
import {
  clearPins,
  removeMissingPins,
  removePin,
  removePinnedPath,
  renamePinnedPath,
  setPin,
  togglePin,
  type PinMode
} from "./pin-state";
import {
  confirmClearPins,
  DEFAULT_SETTINGS,
  loadSettings,
  PinupSettingTab,
  type PinupSettings
} from "./settings";

export default class PinupPlugin extends Plugin {
  settings: PinupSettings = { ...DEFAULT_SETTINGS, pins: {} };
  private explorer: FileExplorerAdapter | null = null;

  async onload(): Promise<void> {
    this.settings = loadSettings(await this.loadData());

    this.explorer = new FileExplorerAdapter(
      this.app,
      () => this.settings,
      (path, requestPinUp) => void this.activateInlinePin(path, requestPinUp)
    );

    this.addCommands();
    this.addSettingTab(new PinupSettingTab(this.app, this));

    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      this.addFileMenuItems(menu, file);
    }));

    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      const next = renamePinnedPath(this.settings.pins, oldPath, file.path);
      if (next !== this.settings.pins) void this.replacePins(next);
    }));

    this.registerEvent(this.app.vault.on("delete", (file) => {
      const next = removePinnedPath(this.settings.pins, file.path);
      if (next !== this.settings.pins) void this.replacePins(next);
    }));

    this.registerEvent(this.app.vault.on("create", () => this.explorer?.refreshAll()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.explorer?.refreshAll()));
    this.app.workspace.onLayoutReady(() => {
      void this.cleanMissingPins().then(() => this.explorer?.refreshAll());
    });
  }

  onunload(): void {
    this.explorer?.unload();
    this.explorer = null;
  }

  async saveSettingsAndRefresh(): Promise<void> {
    await this.saveData(this.settings);
    this.explorer?.refreshAll();
  }

  async clearPins(): Promise<void> {
    if (Object.keys(this.settings.pins).length === 0) return;
    await this.replacePins(clearPins(this.settings.pins));
    new Notice("Pinup: cleared all pins.");
  }

  private addCommands(): void {
    this.addActiveFileCommand("pin-current-file", "Pin current file", (path) => this.pin(path, "normal"));
    this.addActiveFileCommand("pin-up-current-file", "Pin up current file", (path) => this.pin(path, "pin-up"));
    this.addActiveFileCommand("unpin-current-file", "Unpin current file", (path) => this.unpin(path));
    this.addActiveFileCommand("toggle-normal-pin-current-file", "Toggle normal pin for current file", (path) => this.toggle(path, "normal"));
    this.addActiveFileCommand("toggle-pin-up-current-file", "Toggle pin-up for current file", (path) => this.toggle(path, "pin-up"));

    this.addCommand({
      id: "clear-all-pins",
      name: "Clear all pins",
      checkCallback: (checking) => {
        if (Object.keys(this.settings.pins).length === 0) return false;
        if (!checking) confirmClearPins(this.app, () => void this.clearPins());
        return true;
      }
    });
  }

  private addActiveFileCommand(
    id: string,
    name: string,
    action: (path: string) => Promise<void>
  ): void {
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void action(file.path);
        return true;
      }
    });
  }

  private addFileMenuItems(menu: Menu, file: TAbstractFile): void {
    const current = this.settings.pins[file.path];
    menu.addSeparator();
    menu.addItem((item) => this.configureMenuItem(
      item,
      "Pin",
      current?.mode === "normal",
      () => void this.pin(file.path, "normal")
    ));
    menu.addItem((item) => this.configureMenuItem(
      item,
      "Pin up",
      current?.mode === "pin-up",
      () => void this.pin(file.path, "pin-up")
    ));
    if (current) {
      menu.addItem((item) => item
        .setTitle(current.mode === "pin-up" ? "Remove from pin-up" : "Unpin")
        .setIcon("pin-off")
        .onClick(() => void this.unpin(file.path)));
    }
  }

  private configureMenuItem(
    item: MenuItem,
    title: string,
    disabled: boolean,
    action: () => void
  ): void {
    item.setTitle(title).setIcon("pin").setDisabled(disabled).onClick(action);
  }

  private async pin(path: string, mode: PinMode): Promise<void> {
    if (!this.app.vault.getAbstractFileByPath(path)) return;
    await this.replacePins(setPin(this.settings.pins, path, mode));
  }

  private async toggle(path: string, mode: PinMode): Promise<void> {
    if (!this.app.vault.getAbstractFileByPath(path)) return;
    await this.replacePins(togglePin(this.settings.pins, path, mode));
  }

  private async activateInlinePin(path: string, requestPinUp: boolean): Promise<void> {
    if (requestPinUp) {
      await this.pin(path, "pin-up");
      return;
    }
    if (this.settings.pins[path]?.mode === "pin-up") {
      await this.unpin(path);
      return;
    }
    await this.toggle(path, "normal");
  }

  private async unpin(path: string): Promise<void> {
    await this.replacePins(removePin(this.settings.pins, path));
  }

  private async replacePins(pins: PinupSettings["pins"]): Promise<void> {
    if (pins === this.settings.pins) return;
    this.settings.pins = pins;
    await this.saveSettingsAndRefresh();
  }

  private async cleanMissingPins(): Promise<void> {
    const next = removeMissingPins(
      this.settings.pins,
      (path) => this.app.vault.getAbstractFileByPath(path) !== null
    );
    if (next !== this.settings.pins) await this.replacePins(next);
  }
}
