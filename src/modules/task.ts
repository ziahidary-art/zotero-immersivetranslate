import { isWindowAlive } from "../utils/window";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
/**
 * 显示翻译任务列表的弹窗
 */
export async function showTaskManager() {
  // 创建表格数据
  const tableData = prepareTableData();

  // 准备表格数据
  function prepareTableData() {
    return addon.data.task.translationTaskList.map((task, index) => {
      // 处理任务的显示状态
      const status = getStatusText(task.status);
      // 将数据转换为表格需要的格式
      return {
        index: (index + 1).toString(),
        status,
        progress: task.progress ? `${task.progress}%` : "-",
        parentItemTitle: task.parentItemTitle,
        attachmentFilename: task.attachmentFilename,
        stage: task.stage || "-",
        // 保存原始数据，用于显示详情或进行操作
        _task: task,
      };
    });
  }

  // 获取状态文本
  function getStatusText(status?: string): string {
    if (!status) return "未知";

    switch (status) {
      case "queued":
        return "排队中";
      case "uploading":
        return "上传中";
      case "translating":
        return "翻译中";
      case "success":
        return "已完成";
      case "failed":
        return "失败";
      default:
        return status;
    }
  }

  // 创建表格列配置
  const columns = [
    {
      dataKey: "index",
      label: "序号",
      width: 50,
    },
    {
      dataKey: "status",
      label: "状态",
      width: 80,
    },
    {
      dataKey: "progress",
      label: "进度",
      width: 80,
    },
    {
      dataKey: "parentItemTitle",
      label: "条目",
      flex: 2,
    },
    {
      dataKey: "attachmentFilename",
      label: "附件",
      flex: 2,
    },
    {
      dataKey: "stage",
      label: "阶段",
      flex: 1,
    },
  ];

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
        multiSelect: true,
        staticColumns: false,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => addon.data.task.translationTaskList.length)
      .setProp("getRowData", (index) => {
        const task = addon.data.task.translationTaskList[index];
        return {
          status: task.status || "",
          progress: `${task.progress || "0"}%` || "0%",
          parentItemTitle: task.parentItemTitle || "",
          attachmentFilename: task.attachmentFilename || "",
          stage: task.stage || "",
          pdfId: task.pdfId || "",
          error: task.error || "",
        };
      })
      .setProp("onSelectionChange", (selection) => {
        // updateButtons();
        return true;
      })
      .setProp("onKeyDown", (event: KeyboardEvent) => {
        if (
          event.key == "Delete" ||
          (Zotero.isMac && event.key == "Backspace")
        ) {
          refresh();
          return false;
        }
        return true;
      })
      .setProp("onActivate", (ev) => {
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
    refreshButton.addEventListener("click", (ev) => {
      refresh();
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
