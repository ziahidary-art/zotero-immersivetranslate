const concatKey = Zotero.isMac ? "Meta" : "Control";

export function registerShortcuts() {
  ztoolkit.Keyboard.register((ev, data) => {
    if (data.type === "keydown") {
      if (ev.key === concatKey) {
        ztoolkit.log("keydown", ev.key);
      }
    }
    if (data.type === "keyup") {
      if (ev.key === concatKey) {
        ztoolkit.log("keyup", ev.key);
      }
    }
  });
}
