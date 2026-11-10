import { App, Modal, PluginSettingTab, Setting } from "obsidian";
import type PinupPlugin from "./main";
import type { PinMap, PinMode, PinState } from "./pin-state";

export interface PinupSettings {
  pins: PinMap;
  showInlinePinButtons: boolean;
  showPinUpShelf: boolean;
  hideOriginalsForPinUp: boolean;
}

export const DEFAULT_SETTINGS: PinupSettings = {
  pins: {},
  showInlinePinButtons: true,
  showPinUpShelf: true,
  hideOriginalsForPinUp: false
};

interface DestructiveButtonBridge {
  buttonEl: HTMLButtonElement;
  setDestructive?: () => unknown;
}

function markDestructive(button: DestructiveButtonBridge): void {
  if (button.setDestructive) {
    button.setDestructive();
    return;
  }
  button.buttonEl.addClass("mod-warning");
}

function isMode(value: unknown): value is PinMode {
  return value === "normal" || value === "pin-up";
}

function sanitizePins(value: unknown): PinMap {
  if (!value || typeof value !== "object") return {};
  const result: PinMap = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    if (!candidate || typeof candidate !== "object") continue;
    const pin = candidate as Partial<PinState>;
    if (typeof pin.path !== "string" || pin.path !== key || !isMode(pin.mode)) continue;
    result[key] = {
      path: key,
      mode: pin.mode,
      createdAt: Number.isFinite(pin.createdAt) ? Number(pin.createdAt) : 0,
      order: Number.isFinite(pin.order) ? Number(pin.order) : 0
    };
  }
  return result;
}

export function loadSettings(value: unknown): PinupSettings {
  const raw = value && typeof value === "object" ? value as Partial<PinupSettings> : {};
  return {
    pins: sanitizePins(raw.pins),
    showInlinePinButtons: typeof raw.showInlinePinButtons === "boolean"
      ? raw.showInlinePinButtons
      : DEFAULT_SETTINGS.showInlinePinButtons,
    showPinUpShelf: typeof raw.showPinUpShelf === "boolean"
      ? raw.showPinUpShelf
      : DEFAULT_SETTINGS.showPinUpShelf,
    hideOriginalsForPinUp: typeof raw.hideOriginalsForPinUp === "boolean"
      ? raw.hideOriginalsForPinUp
      : DEFAULT_SETTINGS.hideOriginalsForPinUp
  };
}

class ConfirmClearPinsModal extends Modal {
  constructor(app: App, private readonly confirm: () => void) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Clear all pins?");
    this.contentEl.createEl("p", {
      text: "This removes every normal pin and pin-up entry. Your files are not changed."
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => {
        markDestructive(button);
        button
          .setCta()
          .setButtonText("Clear all pins")
          .onClick(() => {
            this.close();
            this.confirm();
          });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function confirmClearPins(app: App, confirm: () => void): void {
  new ConfirmClearPinsModal(app, confirm).open();
}

export class PinupSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: PinupPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName("Show inline pin buttons")
      .setDesc("Show a pin control only on files and folders that are already pinned.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showInlinePinButtons)
        .onChange(async (value) => {
          this.plugin.settings.showInlinePinButtons = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(this.containerEl)
      .setName("Show pin-up shelf")
      .setDesc("Show pin-up items at the top of the scrollable File Explorer list.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showPinUpShelf)
        .onChange(async (value) => {
          this.plugin.settings.showPinUpShelf = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(this.containerEl)
      .setName("Hide original pin-up entries")
      .setDesc("Hide a pin-up item's original File Explorer row while it remains in the shelf.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.hideOriginalsForPinUp)
        .onChange(async (value) => {
          this.plugin.settings.hideOriginalsForPinUp = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(this.containerEl)
      .setName("Clear all pins")
      .setDesc("Remove Pinup's saved state without changing any vault files.")
      .addButton((button) => {
        markDestructive(button);
        button
          .setButtonText("Clear all pins")
          .onClick(() => confirmClearPins(this.app, () => {
            void this.plugin.clearPins();
          }));
      });
  }
}
