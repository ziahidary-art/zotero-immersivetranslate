import { translateModels, translateModes } from "../../config";
import { getPref } from "../../utils/prefs";
import { getLanguageOptions } from "../language";

export async function showConfirmationDialog(): Promise<{
  action: "confirm" | "cancel";
  data?: {
    targetLanguage: string;
    translateMode: string;
    translateModel: string;
    enhanceCompatibility: boolean;
  };
}> {
  const dialogData: { [key: string | number]: any } = {
    targetLanguage: getPref("targetLanguage"),
    translateMode: getPref("translateMode"),
    translateModel: getPref("translateModel"),
    enhanceCompatibility: getPref("enhanceCompatibility"),
  };
  const dialogHelper = new ztoolkit.Dialog(8, 4)
    .addCell(0, 0, {
      tag: "h2",
      properties: {
        innerHTML: "选项",
      },
      styles: {
        width: "300px",
      },
    })
    .addCell(1, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: "目标语言",
      },
    })
    .addCell(
      2,
      0,
      {
        tag: "select",
        id: "targetLanguage",
        attributes: {
          "data-bind": "targetLanguage",
          "data-prop": "value",
        },
        children: getLanguageOptions().map(
          (lang: { value: string; label: string }) => ({
            tag: "option",
            properties: {
              value: lang.value,
              innerHTML: lang.label,
            },
          }),
        ),
        styles: {
          width: "200px",
          height: "30px",
          margin: "3px 0",
        },
      },
      false,
    )
    .addCell(3, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: "翻译模式",
      },
    })
    .addCell(
      4,
      0,
      {
        tag: "select",
        id: "translateMode",
        attributes: {
          "data-bind": "translateMode",
          "data-prop": "value",
        },
        children: translateModes.map(
          (mode: { value: string; label: string }) => ({
            tag: "option",
            properties: {
              value: mode.value,
              innerHTML: mode.label,
            },
          }),
        ),
        styles: {
          width: "200px",
          height: "30px",
          margin: "3px 0",
        },
      },
      false,
    )
    .addCell(5, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: "翻译模型",
      },
    })
    .addCell(
      6,
      0,
      {
        tag: "select",
        id: "translateModel",
        attributes: {
          "data-bind": "translateModel",
          "data-prop": "value",
        },
        children: translateModels.map(
          (model: { value: string; label: string }) => ({
            tag: "option",
            properties: {
              value: model.value,
              innerHTML: model.label,
            },
          }),
        ),
        styles: {
          width: "200px",
          height: "30px",
          margin: "3px 0",
        },
      },
      false,
    )
    .addCell(
      7,
      0,
      {
        tag: "input",
        namespace: "html",
        id: "enhanceCompatibility",
        attributes: {
          "data-bind": "enhanceCompatibility",
          "data-prop": "checked",
          type: "checkbox",
        },
        properties: { label: "启用兼容性模式" },
      },
      false,
    )
    .addCell(7, 1, {
      tag: "label",
      namespace: "html",
      attributes: {
        for: "enhanceCompatibility",
      },
      properties: { innerHTML: "启用兼容性模式" },
    })
    .addButton("确认", "confirm")
    .addButton("取消", "cancel")
    .setDialogData(dialogData)
    .open("BabelDOC 翻译确认");
  addon.data.dialog = dialogHelper;
  await dialogData.unloadLock.promise;
  addon.data.dialog = undefined;
  if (addon.data.alive) {
    if (dialogData._lastButtonId === "confirm") {
      return {
        action: "confirm",
        data: dialogData as {
          targetLanguage: string;
          translateMode: string;
          translateModel: string;
          enhanceCompatibility: boolean;
        },
      };
    } else {
      return {
        action: "cancel",
      };
    }
  }
  return {
    action: "cancel",
  };
}
