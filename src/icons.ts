import { setIcon, type App } from "obsidian";

export function pushPinIconContext(_app: App): "native" {
  return "native";
}

export function renderPushPinIcon(_app: App, container: HTMLElement): "native" {
  container.empty();
  setIcon(container, "pin");
  if (!container.querySelector("svg")) {
    container.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14 4 6 6-3 1-4 4-1 5-3-3-3-3 5-1 4-4 1-3Z"/></svg>';
  }
  return "native";
}

export function ensurePushPinIcon(app: App, container: HTMLElement): "native" {
  if (container.dataset.pinupIconContext === "native" && container.querySelector("svg")) {
    return "native";
  }

  renderPushPinIcon(app, container);
  container.dataset.pinupIconContext = "native";
  container.dataset.pinupIconSource = "native";
  return "native";
}
