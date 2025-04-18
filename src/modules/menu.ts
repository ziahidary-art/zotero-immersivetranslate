import { getString } from "../utils/locale";

export function registerMenu() {
  const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/favicon@0.5x.png`;
  // item menuitem with icon
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero-itemmenu-babeldoc-translate",
    label: getString("menuitem-translate"),
    commandListener: () => addon.hooks.onTranslate(),
    icon: menuIcon,
  });
}
