import { setIcon, type App } from "obsidian";

interface PluginRegistry {
  getPlugin?: (id: string) => unknown;
}

interface AppWithPlugins extends App {
  plugins?: PluginRegistry;
}

interface NiconsRuntime {
  renderPackIcon?: (container: HTMLElement, iconId: string, color: string | null) => boolean;
}

export type PinupIconSource = "nicons" | "native";

function renderIsolatedNiconsIcon(app: App, container: HTMLElement): boolean {
  const plugin = (app as AppWithPlugins).plugins?.getPlugin?.("nicons");
  if (!plugin || typeof plugin !== "object") return false;

  const staging = container.ownerDocument.createElement("span");
  try {
    if (!(plugin as NiconsRuntime).renderPackIcon?.(staging, "nicons:push-pin", null)) return false;
  } catch {
    return false;
  }

  const rendered = staging.querySelector("svg");
  if (!rendered) return false;
  const icon = rendered.cloneNode(true) as SVGElement;
  icon.removeAttribute("style");
  icon.classList.remove("nicons-pack-icon");
  icon.classList.add("pinup-icon");
  container.appendChild(icon);
  return true;
}

export function pushPinIconContext(app: App): PinupIconSource {
  return (app as AppWithPlugins).plugins?.getPlugin?.("nicons") ? "nicons" : "native";
}

export function renderPushPinIcon(app: App, container: HTMLElement): PinupIconSource {
  container.empty();
  if (renderIsolatedNiconsIcon(app, container)) return "nicons";

  setIcon(container, "pin");
  if (!container.querySelector("svg")) {
    container.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14 4 6 6-3 1-4 4-1 5-3-3-3-3 5-1 4-4 1-3Z"/></svg>';
  }
  return "native";
}

export function ensurePushPinIcon(app: App, container: HTMLElement): PinupIconSource {
  const context = pushPinIconContext(app);
  if (container.dataset.pinupIconContext === context && container.querySelector("svg")) {
    return container.dataset.pinupIconSource === "nicons" ? "nicons" : "native";
  }

  const source = renderPushPinIcon(app, container);
  container.dataset.pinupIconContext = context;
  container.dataset.pinupIconSource = source;
  return source;
}
