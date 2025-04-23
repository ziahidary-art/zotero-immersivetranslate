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

    // 加载翻译队列
    const savedQueue = getPref("translationGlobalQueue");
    if (savedQueue && typeof savedQueue === "string") {
      addon.data.translationGlobalQueue = JSON.parse(savedQueue);
      ztoolkit.log("已加载保存的翻译队列", addon.data.translationGlobalQueue);
    }
  } catch (error) {
    ztoolkit.log("加载保存的翻译数据时出错", error);
    // 如果出错，使用空数组初始化
    addon.data.translationTaskList = [];
    addon.data.translationGlobalQueue = [];
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

    // 保存翻译队列
    if (
      addon.data.translationGlobalQueue &&
      addon.data.translationGlobalQueue.length > 0
    ) {
      setPref(
        "translationGlobalQueue",
        JSON.stringify(addon.data.translationGlobalQueue),
      );
    } else {
      setPref("translationGlobalQueue", "[]");
    }
  } catch (error) {
    ztoolkit.log("保存翻译数据时出错", error);
  }
}
