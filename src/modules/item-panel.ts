import { getLocaleID } from "../utils/locale";

export function registerItemPaneCustomInfoRow() {
  Zotero.ItemPaneManager.registerInfoRow({
    rowID: "babeldoc-info",
    pluginID: addon.data.config.addonID,
    editable: true,
    label: {
      l10nID: getLocaleID("item-info-status"),
    },
    position: "start",
    onGetData: ({ item }) => {
      const status =
        ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_status") || "";
      const stage =
        ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_stage") || "";
      return status + " " + stage;
    },
  });
}

export function registerItemPaneSection() {
  Zotero.ItemPaneManager.registerSection({
    paneID: "babeldoc-section",
    pluginID: addon.data.config.addonID,
    header: {
      l10nID: getLocaleID("item-section-babeldoc-info"),
      icon: "chrome://zotero/skin/16/universal/book.svg",
    },
    sidenav: {
      l10nID: getLocaleID("item-section-babeldoc-info-tooltip"),
      icon: "chrome://zotero/skin/20/universal/save.svg",
    },
    onRender: ({ body, item }) => {
      body.textContent = JSON.stringify({
        id: item?.id,
        pdfId: ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_pdfId"),
        status: ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_status"),
        stage: ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_stage"),
      });
    },
  });
}
