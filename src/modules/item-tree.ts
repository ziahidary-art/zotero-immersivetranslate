import { getString } from "../utils/locale";

export async function registerExtraColumn() {
  const field = "imt_BabelDOC_status";
  await Zotero.ItemTreeManager.registerColumn({
    pluginID: addon.data.config.addonID,
    dataKey: field,
    label: getString("item-filed-status"),
    dataProvider: (item: Zotero.Item, dataKey: string) => {
      const status =
        ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_status") || "";
      const stage =
        ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_stage") || "";
      return status + " " + stage;
    },
  });

  await Zotero.ItemTreeManager.registerColumn({
    pluginID: addon.data.config.addonID,
    dataKey: "objectKey",
    label: "objectKey",
    dataProvider: (item: Zotero.Item, dataKey: string) => {
      const objectKey =
        ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_objectKey") || "";
      return objectKey;
    },
  });

  await Zotero.ItemTreeManager.registerColumn({
    pluginID: addon.data.config.addonID,
    dataKey: "pdfId",
    label: "pdfId",
    dataProvider: (item: Zotero.Item, dataKey: string) => {
      const pdfId =
        ztoolkit.ExtraField.getExtraField(item, "imt_BabelDOC_pdfId") || "";
      return pdfId;
    },
  });
}

// export async function registerExtraColumnWithCustomCell() {
//   const field = "test2";
//   await Zotero.ItemTreeManager.registerColumn({
//     pluginID: addon.data.config.addonID,
//     dataKey: field,
//     label: "custom column",
//     dataProvider: (item: Zotero.Item, dataKey: string) => {
//       return field + String(item.id);
//     },
//     renderCell(index, data, column, isFirstColumn, doc) {
//       ztoolkit.log("Custom column cell is rendered!");
//       const span = doc.createElement("span");
//       span.className = `cell ${column.className}`;
//       span.style.background = "#0dd068";
//       span.innerText = "⭐" + data;
//       return span;
//     },
//   });
// }
