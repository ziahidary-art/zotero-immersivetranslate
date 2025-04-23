import { getPref, setPref } from "../utils/prefs";

/**
 * 加载已保存的翻译任务数据
 */
export function loadSavedTranslationData() {
  try {
    // 加载翻译任务列表
    const savedTaskList = getPref("translationTaskList");
    if (savedTaskList && typeof savedTaskList === "string") {
      addon.data.translationTaskList = JSON.parse(savedTaskList);
      ztoolkit.log("已加载保存的翻译任务列表", addon.data.translationTaskList);
    }
  } catch (error) {
    ztoolkit.log("加载保存的翻译数据时出错", error);
    // 如果出错，使用空数组初始化
    addon.data.translationTaskList = [];
  }
}

/**
 * 恢复未完成的翻译任务
 * 从translationTaskList中找出未完成的任务恢复到队列中
 * @returns 恢复的任务数量
 */
export function restoreUnfinishedTasks(): number {
  try {
    // 清空当前队列，避免重复
    addon.data.translationGlobalQueue = [];

    // 找出状态不是success或failed的任务
    const unfinishedTasks = addon.data.translationTaskList.filter((task) => {
      const status = task.status || "";
      return status !== "success" && status !== "failed";
    });

    if (unfinishedTasks.length === 0) {
      ztoolkit.log("没有未完成的翻译任务需要恢复");
      return 0;
    }

    ztoolkit.log(`找到${unfinishedTasks.length}个未完成的翻译任务，准备恢复`);

    // 将这些任务恢复到队列中
    addon.data.translationGlobalQueue = unfinishedTasks;

    // 保存更新后的队列
    saveTranslationData();

    ztoolkit.log(`已将${unfinishedTasks.length}个未完成任务恢复到队列中`);
    return unfinishedTasks.length;
  } catch (error) {
    ztoolkit.log("恢复未完成任务时出错", error);
    return 0;
  }
}

/**
 * 保存当前的翻译任务数据
 */
export function saveTranslationData() {
  try {
    // 保存翻译任务列表
    if (
      addon.data.translationTaskList &&
      addon.data.translationTaskList.length > 0
    ) {
      setPref(
        "translationTaskList",
        JSON.stringify(addon.data.translationTaskList),
      );
    } else {
      setPref("translationTaskList", "[]");
    }
  } catch (error) {
    ztoolkit.log("保存翻译数据时出错", error);
  }
}
