import { isWindowAlive } from "../../utils/window";
import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { saveTranslationData } from "./persistence";
import { TranslationTaskData } from "../../types";
/**
 * 显示翻译任务列表的弹窗
 */
export async function showTaskManager() {
  // 创建对话框
  if (isWindowAlive(addon.data.task.window)) {
    addon.data.task.window?.focus();
    refresh();
  } else {
    const windowArgs = {
      _initPromise: Zotero.Promise.defer(),
    };
    const win = Zotero.getMainWindow().openDialog(
      `chrome://${config.addonRef}/content/taskManager.xhtml`,
      `${config.addonRef}-taskManager`,
      `chrome,centerscreen,resizable,status,dialog=no`,
      windowArgs,
    )!;
    await windowArgs._initPromise.promise;
    addon.data.task.window = win;
    addon.data.task.tableHelper = new ztoolkit.VirtualizedTable(win!)
      .setContainerId("table-container")
      .setProp({
        id: "manager-table",
        // Do not use setLocale, as it modifies the Zotero.Intl.strings
        // Set locales directly to columns
        columns: [
          {
            dataKey: "parentItemTitle",
            label: "条目",
            fixedWidth: false,
          },
          {
            dataKey: "attachmentFilename",
            label: "附件",
            fixedWidth: false,
          },
          {
            dataKey: "targetLanguage",
            label: "目标语言",
            fixedWidth: false,
          },
          {
            dataKey: "translateModel",
            label: "翻译模型",
            fixedWidth: false,
          },
          {
            dataKey: "translateMode",
            label: "翻译模式",
            fixedWidth: false,
          },
          {
            dataKey: "pdfId",
            label: "pdfId",
            fixedWidth: false,
          },
          {
            dataKey: "status",
            label: "状态",
            fixedWidth: false,
          },
          {
            dataKey: "stage",
            label: "阶段",
            fixedWidth: false,
          },
          {
            dataKey: "progress",
            label: "进度",
            fixedWidth: false,
          },
          {
            dataKey: "error",
            label: "错误",
            fixedWidth: false,
          },
          {
            dataKey: "resultAttachmentId",
            label: "结果附件ID",
            fixedWidth: false,
          },
        ].map((column) =>
          Object.assign(column, {
            // label: getString(column.label) || column.label,
            label: column.label,
          }),
        ),
        showHeader: true,
        multiSelect: false,
        staticColumns: false,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => addon.data.task.translationTaskList.length)
      .setProp("getRowData", (index) => {
        const task = addon.data.task.translationTaskList[index];
        return {
          status: task.status || "",
          progress: `${task.progress || "0"}%`,
          parentItemTitle: task.parentItemTitle || "",
          attachmentFilename: task.attachmentFilename || "",
          targetLanguage: task.targetLanguage || "",
          translateModel: task.translateModel || "",
          translateMode: task.translateMode || "",
          stage: task.stage || "",
          pdfId: task.pdfId || "",
          error: task.error || "",
          resultAttachmentId: task.resultAttachmentId?.toString() || "",
        };
      })
      .setProp("onActivate", () => {
        const tasks = getSelectedTasks();
        if (tasks.length > 0) {
          const task = tasks[0];
          if (task.pdfId) {
            new ztoolkit.Clipboard().addText(task.pdfId, "text/unicode").copy();
            ztoolkit.getGlobal("alert")("PDF ID Copied!");
          }
        }
        return true;
      })
      .setProp(
        "getRowString",
        (index) =>
          addon.data.task.translationTaskList[index].parentItemTitle || "",
      )
      .render();
    const refreshButton = win.document.querySelector(
      "#refresh",
    ) as HTMLButtonElement;
    const copyPdfIdButton = win.document.querySelector(
      "#copy-pdf-id",
    ) as HTMLButtonElement;
    const cancelButton = win.document.querySelector(
      "#cancel",
    ) as HTMLButtonElement;
    const viewPdfButton = win.document.querySelector(
      "#view-pdf",
    ) as HTMLButtonElement;
    viewPdfButton.addEventListener("click", (ev) => {
      const tasks = getSelectedTasks();
      if (tasks.length > 0) {
        const task = tasks[0];
        if (task.resultAttachmentId) {
          const resultAttachment = Zotero.Items.get(task.resultAttachmentId);
          if (resultAttachment) {
            Zotero.Reader.open(resultAttachment.id);
          }
        } else {
          ztoolkit.getGlobal("alert")("任务未完成");
        }
      } else {
        ztoolkit.getGlobal("alert")("请选择一个任务");
      }
    });

    refreshButton.addEventListener("click", (ev) => {
      refresh();
    });
    copyPdfIdButton.addEventListener("click", (ev) => {
      const tasks = getSelectedTasks();
      if (tasks.length > 0) {
        const task = tasks[0];
        if (task.pdfId) {
          new ztoolkit.Clipboard().addText(task.pdfId, "text/unicode").copy();
          ztoolkit.getGlobal("alert")("PDF ID Copied!");
        }
      } else {
        ztoolkit.getGlobal("alert")("请选择一个任务");
      }
    });
    cancelButton.addEventListener("click", (ev) => {
      const tasks = getSelectedTasks();
      if (tasks.length > 0) {
        const task = tasks[0];
        if (task.status === "queued") {
          cancelTask(task);
          refresh();
          ztoolkit.getGlobal("alert")("取消任务成功");
        } else {
          ztoolkit.getGlobal("alert")("只能取消未开始的任务");
        }
      } else {
        ztoolkit.getGlobal("alert")("请选择一个任务");
      }
    });
    setInterval(() => {
      refresh();
    }, 2000);
  }
}

async function updateTable() {
  return new Promise<void>((resolve) => {
    addon.data.task.tableHelper?.render(undefined, (_: any) => {
      resolve();
    });
  });
}

async function refresh() {
  await updateTable();
}

// Helper function to update a task in the translationTaskList
export function updateTaskInList(
  attachmentId: number,
  updates: {
    status?: string;
    stage?: string;
    pdfId?: string;
    progress?: number;
    resultAttachmentId?: number;
    error?: string;
  },
) {
  if (!addon.data.task.translationTaskList) return;

  const taskIndex = addon.data.task.translationTaskList.findIndex(
    (task) => task.attachmentId === attachmentId,
  );

  if (taskIndex !== -1) {
    addon.data.task.translationTaskList[taskIndex] = {
      ...addon.data.task.translationTaskList[taskIndex],
      ...updates,
    };
  }

  // Call saveTranslationData after updating the task list
  saveTranslationData();
}

function getSelectedTasks() {
  const keys =
    addon.data.task.tableHelper?.treeInstance.selection.selected?.keys() || [];
  const datas = [];
  for (const key of keys) {
    const data = addon.data.task.translationTaskList[key];
    datas.push(data);
  }
  return datas;
}

function cancelTask(task: TranslationTaskData) {
  updateTaskInList(task.attachmentId, {
    status: "canceled",
  });
  addon.data.task.translationGlobalQueue.splice(
    addon.data.task.translationGlobalQueue.findIndex(
      (t) => t.attachmentId === task.attachmentId,
    ),
    1,
  );
  saveTranslationData();
}
