import { getLocaleID } from "../utils/locale";

export function registerItemPaneCustomInfoRow() {
  Zotero.ItemPaneManager.registerInfoRow({
    rowID: "example",
    pluginID: addon.data.config.addonID,
    editable: true,
    label: {
      l10nID: getLocaleID("item-info-row-example-label"),
    },
    position: "afterCreators",
    onGetData: ({ item }) => {
      return item.getField("title");
    },
    onSetData: ({ item, value }) => {
      item.setField("title", value);
    },
  });
}

export function registerItemPaneSection() {
  Zotero.ItemPaneManager.registerSection({
    paneID: "example",
    pluginID: addon.data.config.addonID,
    header: {
      l10nID: getLocaleID("item-section-example1-head-text"),
      icon: "chrome://zotero/skin/16/universal/book.svg",
    },
    sidenav: {
      l10nID: getLocaleID("item-section-example1-sidenav-tooltip"),
      icon: "chrome://zotero/skin/20/universal/save.svg",
    },
    onRender: ({ body, item, editable, tabType }) => {
      body.textContent = JSON.stringify({
        id: item?.id,
        editable,
        tabType,
      });
    },
  });
}
