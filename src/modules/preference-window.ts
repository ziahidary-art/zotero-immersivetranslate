import { config } from "../../package.json";
import { getPdfUploadUrl } from "../api";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";

export function registerPrefs() {
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
  });
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  bindPrefEvents();
}

function bindPrefEvents() {
  addon.data
    .prefs!.window.document?.querySelector(
      `#zotero-prefpane-${config.addonRef}-enable`,
    )
    ?.addEventListener("command", (e: Event) => {
      ztoolkit.log(e);
      const checked = (e.target as XUL.Checkbox).checked;
      addon.data.prefs!.window.alert(checked ? "插件已启用" : "插件已禁用");
    });

  addon.data
    .prefs!.window.document?.querySelector(
      `#zotero-prefpane-${config.addonRef}-authkey`,
    )
    ?.addEventListener("change", (e: Event) => {
      ztoolkit.log(e);
      setPref("authkey", (e.target as HTMLInputElement).value);
    });

  addon.data
    .prefs!.window.document?.querySelector(
      `#zotero-prefpane-${config.addonRef}-button`,
    )
    ?.addEventListener("command", async (e: Event) => {
      ztoolkit.log(e);
      ztoolkit.log(getPref("authkey"));
      const response = await getPdfUploadUrl();
      ztoolkit.log("222", response);
    });
}
