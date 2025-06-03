import { getString } from "./locale";

export function showDialog({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  new ztoolkit.Dialog(3, 4)
    .addCell(0, 0, {
      tag: "h2",
      properties: {
        innerHTML: title,
      },
      styles: {
        width: "300px",
      },
    })
    .addCell(1, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: message,
      },
      styles: {
        width: "300px",
      },
    })
    .addButton(getString("confirm-yes"), "confirm")
    .open(title);
}

export async function showFreeUserDialog({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  const dialogData: { [key: string | number]: any } = {};
  new ztoolkit.Dialog(3, 4)
    .addCell(0, 0, {
      tag: "h2",
      properties: {
        innerHTML: title,
      },
      styles: {
        width: "300px",
      },
    })
    .addCell(1, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: message,
      },
      styles: {
        width: "300px",
      },
    })
    .addButton(getString("to-pro"), "to-pro")
    .addButton(getString("confirm-cancel"), "cancel")
    .setDialogData(dialogData)
    .open(title);

  await dialogData.unloadLock.promise;
  if (dialogData._lastButtonId === "to-pro") {
    const locale = Zotero.locale === "zh-CN" ? "zh-Hans" : "en";
    Zotero.launchURL(`https://immersivetranslate.com/${locale}/pricing`);
  }
}
