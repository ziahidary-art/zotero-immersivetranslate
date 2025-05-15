const concatKey = Zotero.isMac ? "Meta" : "Control";

export function registerShortcuts() {
  ztoolkit.Keyboard.register((ev, data) => {
    if (ev.shiftKey && ev.key === "A") {
      addon.hooks.onShortcuts("translate");
    }
    if (ev.shiftKey && ev.key === "T") {
      addon.hooks.onShortcuts("showTaskManager");
    }
  });
}
