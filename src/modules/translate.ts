import { saveTranslationData } from "./persistence";
import { showTaskManager } from "./task";
import type { TranslationTaskData } from "../types";
import { getPref } from "../utils/prefs";
import { getLanguageOptions } from "./language";
import { translateModes, translateModels } from "../config";

const ATTR_TAG = "BabelDOC_translated";

async function showConfirmationDialog(): Promise<{
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

export async function translatePDF() {
  const tasksToQueue = await getTranslationTasks();

  if (tasksToQueue.length === 0) {
    ztoolkit.log("No valid PDF attachments found to add to the queue.");
    ztoolkit.getGlobal("alert")("没有找到可以翻译的 PDF");
    return;
  }
  const translateMode = getPref("translateMode");
  const translateModel = getPref("translateModel");
  const targetLanguage = getPref("targetLanguage");
  const enhanceCompatibility = getPref("enhanceCompatibility");
  const confirmResult = await showConfirmationDialog();
  ztoolkit.log("===========", confirmResult);
  if (confirmResult.action === "cancel") {
    return;
  }

  tasksToQueue.forEach((task) => {
    task.translateMode = confirmResult.data?.translateMode || translateMode;
    task.translateModel = confirmResult.data?.translateModel || translateModel;
    task.targetLanguage = confirmResult.data?.targetLanguage || targetLanguage;
    task.enhanceCompatibility =
      confirmResult.data?.enhanceCompatibility || enhanceCompatibility;
  });
  ztoolkit.log(`Adding ${tasksToQueue.length} translation tasks to the queue.`);
  addon.data.task.translationGlobalQueue.push(...tasksToQueue); // Add new tasks

  // Deep clone the tasks to translationTaskList for tracking
  if (!addon.data.task.translationTaskList) {
    addon.data.task.translationTaskList = [];
  }
  const clonedTasks = tasksToQueue.map((task) =>
    JSON.parse(JSON.stringify(task)),
  );
  addon.data.task.translationTaskList.push(...clonedTasks);

  // Save the updated queues
  saveTranslationData();

  startQueueProcessing();
}

// get translation tasks from selected items
async function getTranslationTasks(): Promise<TranslationTaskData[]> {
  const selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
  const tasks: TranslationTaskData[] = [];

  for (const item of selectedItems) {
    let parentItem: Zotero.Item | null = null;
    const attachmentsToProcess: Zotero.Item[] = [];

    if (item.isRegularItem()) {
      parentItem = item;
      const attachmentIds = item.getAttachments(false);
      // 只处理PDF附件
      for (const id of attachmentIds) {
        const attachment = Zotero.Items.get(id);
        const hasTranslatedTag = attachment
          .getTags()
          .find((tagItem) => tagItem.tag === ATTR_TAG);
        if (hasTranslatedTag) {
          ztoolkit.log(
            `Attachment ${id} is already a translation result, skipping.`,
          );
          continue;
        }
        if (attachment && attachment.isPDFAttachment()) {
          attachmentsToProcess.push(attachment);
        }
      }
    } else if (item.isPDFAttachment()) {
      const hasTranslatedTag = item
        .getTags()
        .find((tagItem) => tagItem.tag === ATTR_TAG);
      if (hasTranslatedTag) {
        ztoolkit.log(
          `Attachment ${item.id} is already a translation result, skipping.`,
        );
        continue;
      }
      const parentItemId = item.parentItemID;

      if (parentItemId) {
        const potentialParent = Zotero.Items.get(parentItemId);
        if (potentialParent && potentialParent.isRegularItem()) {
          parentItem = potentialParent;
          attachmentsToProcess.push(item); // Only process the selected attachment
        } else {
          ztoolkit.log(
            `Attachment ${item.id} has no valid parent item, skipping.`,
          );
          continue;
        }
      } else {
        ztoolkit.log(`顶级附件 =======`);
        attachmentsToProcess.push(item);
      }
    }

    for (const attachment of attachmentsToProcess) {
      const attachmentId = attachment.id;
      const attachmentFilename =
        attachment.attachmentFilename || `Attachment ${attachmentId}`;

      // Check attachment is already in the translation task list?
      const isInTaskList = addon.data.task.translationTaskList.find(
        (task) =>
          task.attachmentId === attachmentId &&
          task.status !== "success" &&
          task.status !== "failed",
      );
      // TODO 检查是否是已成功的翻译任务，给予提示
      // 1. 在 tasklist 中，并且状态是成功
      // 2. 有同名称的带 babeldoc tag 的翻译结果附件
      if (isInTaskList) {
        ztoolkit.log(
          `Attachment ${attachmentId} (${attachmentFilename}) is already in the translation task list, skipping.`,
        );
        continue;
      }
      // --- End Deduplication Checks ---

      // Proceed only if not deduplicated
      const exists = await attachment.fileExists();
      if (exists) {
        const filePath = await attachment.getFilePathAsync();
        const translateMode = getPref("translateMode");
        const translateModel = getPref("translateModel");
        const targetLanguage = getPref("targetLanguage");
        const enhanceCompatibility = getPref("enhanceCompatibility");
        if (filePath && attachmentFilename) {
          tasks.push({
            parentItemId: parentItem?.id,
            parentItemTitle: parentItem?.getField("title"),
            attachmentId: attachmentId,
            attachmentFilename: attachmentFilename,
            attachmentPath: filePath,
            status: "queued",
            targetLanguage: targetLanguage,
            translateModel: translateModel,
            translateMode: translateMode,
            enhanceCompatibility: enhanceCompatibility,
          });
        } else {
          ztoolkit.log(
            `Could not get path or valid filename for attachment ${attachmentId}, skipping.`,
          );
        }
      } else {
        ztoolkit.log(
          `Attachment file does not exist for ${attachmentId}, skipping.`,
        );
      }
    }
  }

  ztoolkit.log("Found tasks (after refined deduplication):", tasks);
  return tasks;
}

export async function startQueueProcessing() {
  if (
    addon.data.task.isQueueProcessing ||
    addon.data.task.translationGlobalQueue.length === 0
  ) {
    return; // Already running or queue empty
  }
  showTaskManager();
  addon.data.task.isQueueProcessing = true;
  ztoolkit.log("Starting queue processing loop.");
  // Use Zotero.Promise.delay(0).then() to avoid deep recursion and yield
  Zotero.Promise.delay(0).then(processNextItem);
}

async function processNextItem() {
  if (addon.data.task.translationGlobalQueue.length === 0) {
    addon.data.task.isQueueProcessing = false;
    ztoolkit.log("Translation queue empty. Stopping processing loop.");
    saveTranslationData(); // Save the empty queue state
    return;
  }

  // Rename queueItem to taskData for clarity
  const taskData = addon.data.task.translationGlobalQueue.shift();

  // Save queue state after removing an item
  saveTranslationData();

  if (!taskData) {
    Zotero.Promise.delay(0).then(processNextItem);
    return;
  }

  // Get the parent item using parentItemId from taskData
  const parentItem = taskData.parentItemId
    ? Zotero.Items.get(taskData.parentItemId)
    : undefined;

  ztoolkit.log(
    `Processing task for attachment: ${taskData.attachmentFilename} (Parent: ${taskData.parentItemTitle}, ID: ${taskData.parentItemId})`,
  );

  try {
    // 如果任务已经有pdfId，说明是程序重启后恢复的任务，并且已经创建了翻译任务
    if (taskData.pdfId) {
      ztoolkit.log(
        `恢复已有pdfId(${taskData.pdfId})的任务: ${taskData.attachmentFilename}，直接进入监控阶段`,
      );
      // 直接启动监控任务
      monitorTranslationTask(taskData.pdfId, taskData, parentItem).catch(
        (error: any) => {
          ztoolkit.log(
            `ERROR: Background monitoring task failed unexpectedly for PDF ID ${taskData.pdfId} (${taskData.attachmentFilename}):`,
            error.message || error,
          );
          try {
            updateTaskInList(taskData.attachmentId, {
              status: "failed",
              error: error.message || error,
            });
          } catch (updateError: any) {
            ztoolkit.log(
              `ERROR: Failed to update parent item status after monitoring error for ${taskData.pdfId}: ${updateError.message || updateError}`,
            );
          }
        },
      );
    } else {
      // 常规流程 - 从上传开始
      await handleSingleItemTranslation(taskData, parentItem);
      ztoolkit.log(
        `Initiated processing for: ${taskData.attachmentFilename}. Moving to next queue item.`,
      );
    }
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Failed to initiate translation for ${taskData.attachmentFilename}:`,
      error.message || error,
    );
    updateTaskInList(taskData.attachmentId, {
      status: "failed",
    });
  } finally {
    Zotero.Promise.delay(0).then(processNextItem);
  }
}

// Renamed from consumeQueueData, now only handles INITIATION
// Accepts TranslationTaskData and the parent Zotero.Item
async function handleSingleItemTranslation(
  taskData: TranslationTaskData,
  parentItem?: Zotero.Item,
): Promise<void> {
  // Update task status in taskList
  updateTaskInList(taskData.attachmentId, {
    status: "uploading",
    stage: "Uploading PDF",
    progress: 0,
  });

  // --- Upload ---
  // Call the renamed uploadAttachmentFile function, passing path and filename
  const uploadInfo = await uploadAttachmentFile(
    taskData.attachmentPath,
    taskData.attachmentFilename,
  ); // Wait for upload
  // uploadInfo is now a single object, not an array
  if (!uploadInfo) {
    // Should not happen if uploadAttachmentFile throws on error, but check anyway
    throw new Error(`Upload failed for ${taskData.attachmentFilename}`);
  }
  ztoolkit.log(`Upload successful for: ${taskData.attachmentFilename}`);

  const translateModel = getPref("translateModel");
  const targetLanguage = getPref("targetLanguage");
  const enhanceCompatibility = getPref("enhanceCompatibility");
  // --- Create Task ---
  const pdfId = await addon.api.createTranslateTask({
    objectKey: uploadInfo.result.objectKey, // Use the objectKey from the single upload
    pdfOptions: { conversion_formats: { html: true } },
    fileName: taskData.attachmentFilename, // Use the specific attachment filename
    targetLanguage: targetLanguage, // TODO: Make configurable
    requestModel: translateModel, // TODO: Make configurable
    enhance_compatibility: enhanceCompatibility,
    turnstileResponse: "",
  });

  ztoolkit.log(
    `Translation task created for ${taskData.attachmentFilename}. PDF ID: ${pdfId}`,
  );
  // Update taskData with pdfId for the monitoring task
  taskData.pdfId = pdfId;
  updateTaskInList(taskData.attachmentId, {
    status: "translating",
    stage: "queued",
    progress: 0,
    pdfId: pdfId,
  });

  // --- Launch Background Monitoring ---
  // Pass taskData instead of queueItem
  monitorTranslationTask(pdfId, taskData, parentItem).catch((error: any) => {
    ztoolkit.log(
      `ERROR: Background monitoring task failed unexpectedly for PDF ID ${pdfId} (${taskData.attachmentFilename}):`,
      error.message || error,
    );
    try {
      updateTaskInList(taskData.attachmentId, {
        status: "failed",
      });
    } catch (updateError: any) {
      ztoolkit.log(
        `ERROR: Failed to update parent item status after monitoring error for ${pdfId}: ${updateError.message || updateError}`,
      );
    }
  });

  ztoolkit.log(
    `Background monitoring started for ${pdfId} (${taskData.attachmentFilename}).`,
  );
}

// --- Background Task ---
// This function runs independently for each translation task
async function monitorTranslationTask(
  pdfId: string,
  taskData: TranslationTaskData, // Accepts TranslationTaskData
  parentItem?: Zotero.Item,
): Promise<void> {
  try {
    ztoolkit.log(
      `Background monitor: Starting polling for ${pdfId} (${taskData.attachmentFilename})`,
    );
    // Pass parentItem to pollTranslationProgress
    await pollTranslationProgress(pdfId, taskData, parentItem); // Pass filename for logging/status

    ztoolkit.log(
      `Background monitor: Polling successful for ${pdfId}. Starting download.`,
    );
    // Pass taskData to downloadTranslateResult
    await downloadTranslateResult({ pdfId, taskData, parentItem });

    ztoolkit.log(
      `Background monitor: Successfully completed task for ${pdfId} (${taskData.attachmentFilename})`,
    );
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Background monitor failed for PDF ID ${pdfId} (${taskData.attachmentFilename}):`,
      error.message || error,
    );
    // Update task status in taskList
    updateTaskInList(taskData.attachmentId, {
      status: "failed",
      error: error.message || error,
    });
  }
}

// Helper function to update a task in the translationTaskList
function updateTaskInList(
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

// Renamed and refactored to upload a single file
async function uploadAttachmentFile(
  attachmentPath: string,
  attachmentFilename: string,
): Promise<any> {
  // Returns single upload info or throws error
  ztoolkit.log(`Uploading attachment: ${attachmentFilename}`);

  try {
    const uploadInfo = await addon.api.getPdfUploadUrl();
    if (!attachmentPath)
      throw new Error(
        `File path is missing for attachment ${attachmentFilename}`,
      );
    const fileContents = await IOUtils.read(attachmentPath); // Read the specific path
    if (!fileContents)
      throw new Error(`Failed to read file contents for ${attachmentFilename}`);

    if (typeof File === "undefined") {
      throw new Error("File constructor not available in this environment.");
    }
    const file = new File([fileContents], attachmentFilename, {
      type: "application/pdf",
    });

    await addon.api.uploadPdf({
      uploadUrl: uploadInfo.result.preSignedURL,
      file,
    });
    ztoolkit.log(`Successfully uploaded ${attachmentFilename}`);
    return uploadInfo; // Return the info for the uploaded file
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Upload failed for ${attachmentFilename}:`,
      error.message || error,
    );
    throw error; // Re-throw to be caught by handleSingleItemTranslation -> processNextItem
  }
}

// Modified to accept attachmentFilename for context and poll indefinitely
async function pollTranslationProgress(
  pdfId: string,
  taskData: TranslationTaskData, // Added for taskList updates
  parentItem?: Zotero.Item,
): Promise<void> {
  const POLLING_INTERVAL_MS = 3000; // Keep the interval between checks
  // Removed MAX_POLLING_ATTEMPTS and attempts counter

  ztoolkit.log(
    `Polling progress indefinitely for PDF ID: ${pdfId} (${taskData.attachmentFilename})`,
  );

  const attachmentId = taskData.attachmentId;
  const attachmentFilename = taskData.attachmentFilename;

  // Loop indefinitely until success or error
  while (true) {
    try {
      const processStatus = await addon.api.getTranslateStatus({ pdfId });
      ztoolkit.log(
        `Polling: Status for ${pdfId} (${attachmentFilename}):`,
        processStatus,
      );

      // Update status and stage on parent item
      const currentStage = `${processStatus.currentStageName || "queued"}`;

      updateTaskInList(attachmentId, {
        status: "translating",
        stage: currentStage,
        progress: processStatus.overall_progress || 0,
      });

      // --- Check for Success ---
      if (
        processStatus.status === "ok" &&
        processStatus.overall_progress === 100
      ) {
        ztoolkit.log(
          `Translation completed for PDF ID: ${pdfId} (${attachmentFilename})`,
        );
        updateTaskInList(attachmentId, {
          status: "translating",
          stage: "Downloading",
          progress: 100,
        });
        return; // Success - exit polling loop
      }

      // --- Check for Failure ---
      if (
        processStatus.status &&
        processStatus.status !== "" &&
        processStatus.status !== "ok"
      ) {
        const errorMsg = `Translation failed with status: ${processStatus.status}`;
        ztoolkit.log(
          `ERROR: ${errorMsg} for PDF ID: ${pdfId} (${attachmentFilename}).`,
        );
        updateTaskInList(attachmentId, {
          status: "failed",
          error: processStatus.message,
        });
        throw new Error(processStatus.message || errorMsg); // Failure - exit loop by throwing
      }

      // --- Wait before the next poll ---
      await Zotero.Promise.delay(POLLING_INTERVAL_MS);
    } catch (error: any) {
      // Handle API call errors or status errors thrown above
      ztoolkit.log(
        `ERROR: During polling check for PDF ID ${pdfId} (${attachmentFilename}):`,
        error.message || error,
      );

      throw error; // Exit loop by re-throwing
    }
  }
}

// Modified signature to use taskData
async function downloadTranslateResult({
  pdfId,
  taskData, // Use TranslationTaskData
  parentItem: parentItem, // Rename item to parentItem for clarity
}: {
  pdfId: string;
  taskData: TranslationTaskData;
  parentItem?: Zotero.Item;
}) {
  try {
    const result = await addon.api.getTranslatePdfResult({ pdfId });
    ztoolkit.log(
      `Download Result Info for ${taskData.attachmentFilename}:`,
      result,
    );
    const translateMode = getPref("translateMode");

    const fileUrl =
      translateMode === "dual"
        ? result.translationDualPdfOssUrl
        : result.translationOnlyPdfOssUrl;
    if (!fileUrl) {
      throw new Error(
        `No download URL found for ${taskData.attachmentFilename}.`,
      );
    }
    // Update the task in translationTaskList
    updateTaskInList(taskData.attachmentId, {
      status: "translating",
      stage: "Downloading result",
      progress: 100,
    });

    ztoolkit.log(`File URL for ${taskData.attachmentFilename}:`, fileUrl);

    const fileBuffer = await addon.api.downloadPdf(fileUrl);
    ztoolkit.log(
      `File downloaded for ${taskData.attachmentFilename} (Size: ${fileBuffer.byteLength})`,
    );
    if (fileBuffer.byteLength === 0) {
      throw new Error(
        `Downloaded file is empty for ${taskData.attachmentFilename}.`,
      );
    }

    // Use taskData.attachmentFilename for renaming
    const originalFilename = taskData.attachmentFilename;
    const baseName = originalFilename.replace(/\.pdf$/i, "");
    const targetLanguage = getPref("targetLanguage");
    const fileName = `${baseName}_${targetLanguage}_${translateMode}.pdf`;

    const tempDir = PathUtils.tempDir || Zotero.getTempDirectory().path;
    const tempPath = PathUtils.join(tempDir, fileName);
    ztoolkit.log(`Writing downloaded file to temp path: ${tempPath}`);

    await IOUtils.write(tempPath, new Uint8Array(fileBuffer));

    ztoolkit.log(`Importing attachment to item: ${taskData.parentItemId}`);

    const attachment = await Zotero.Attachments.importFromFile({
      file: tempPath,
      parentItemID: taskData.parentItemId || 0,
      libraryID: parentItem?.libraryID,
      title: fileName,
      contentType: "application/pdf",
    });

    attachment.setTags([ATTR_TAG]);

    ztoolkit.log(
      `Attachment created (ID: ${attachment.id}) for ${taskData.attachmentFilename}`,
    );

    // Update final status in taskList
    updateTaskInList(taskData.attachmentId, {
      status: "success",
      stage: "completed",
      progress: 100,
      resultAttachmentId: attachment.id,
    });
    await attachment.saveTx();

    try {
      await IOUtils.remove(tempPath);
      ztoolkit.log(`Removed temporary file: ${tempPath}`);
    } catch (removeError: any) {
      ztoolkit.log(
        `WARNING: Failed to remove temporary file ${tempPath}:`,
        removeError.message || removeError,
      );
    }
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Failed download/process for PDF ID ${pdfId} (${taskData.attachmentFilename}):`,
      error.message || error,
    );
    throw error;
  }
}
