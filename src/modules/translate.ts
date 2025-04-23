type TranslationTaskData = {
  parentItemId: number;
  parentItemTitle: string;
  attachmentId: number;
  attachmentFilename: string;
  attachmentPath: string;
};

// clear the queue if needed
export function clearTranslationQueue() {
  if (addon.data.isQueueProcessing) {
    ztoolkit.log(
      "Queue processing is active. Clearing only removes pending items.",
    );
  }
  addon.data.translationGlobalQueue = [];
  ztoolkit.log("Pending translation queue cleared.");
}

export async function translatePDF() {
  const tasksToQueue = await getTranslationTasks();
  if (tasksToQueue.length === 0) {
    ztoolkit.log("No valid PDF attachments found to add to the queue.");
    return;
  }
  ztoolkit.log(`Adding ${tasksToQueue.length} translation tasks to the queue.`);
  addon.data.translationGlobalQueue.push(...tasksToQueue); // Add new tasks
  startQueueProcessing();
}

// get translation tasks from selected items
async function getTranslationTasks(): Promise<TranslationTaskData[]> {
  const selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
  const tasks: TranslationTaskData[] = [];

  // --- Deduplication Step 1: Get IDs of tasks already in the global queue ---
  const existingTaskAttachmentIds = new Set(
    addon.data.translationGlobalQueue.map((task) => task.attachmentId),
  );
  ztoolkit.log(
    "Existing attachment IDs in global queue:",
    existingTaskAttachmentIds,
  );

  // --- Deduplication Step 2: Keep track of IDs added in *this* run ---
  const addedAttachmentIdsThisRun = new Set<number>();

  for (const item of selectedItems) {
    let parentItem: Zotero.Item | null = null;
    const attachmentsToProcess: Zotero.Item[] = [];

    if (item.isRegularItem()) {
      parentItem = item;
      const attachmentIds = item.getAttachments(false);
      for (const id of attachmentIds) {
        attachmentsToProcess.push(Zotero.Items.get(id));
      }
    } else if (item.isPDFAttachment()) {
      const parentItemId = item.parentItemID;
      if (!parentItemId) {
        ztoolkit.log(
          `Attachment ${item.id} has no valid parent item ID, skipping.`,
        );
        continue; // Skip if no valid parent item ID
      }
      const potentialParent = Zotero.Items.get(parentItemId);
      if (potentialParent && potentialParent.isRegularItem()) {
        parentItem = potentialParent;
        attachmentsToProcess.push(item); // Only process the selected attachment
      } else {
        ztoolkit.log(
          `Attachment ${item.id} has no valid parent item, skipping.`,
        );
      }
    }

    if (!parentItem) {
      ztoolkit.log(
        `Item ${item.id} is not a regular item or a valid attachment, skipping.`,
      );
      continue; // Skip if no valid parent item context
    }

    const parentItemTitle = parentItem.getField("title") || "Untitled Item";
    // --- Get parent item status ONCE for all its attachments ---
    const parentStatus =
      ztoolkit.ExtraField.getExtraField(parentItem, "imt_BabelDOC_status") ||
      ""; // Default to empty string if null/undefined

    for (const attachment of attachmentsToProcess) {
      const attachmentId = attachment.id;
      const attachmentFilename =
        attachment.attachmentFilename || `Attachment ${attachmentId}`; // Fallback filename for logging

      // --- Refined Deduplication Checks ---
      // Check 1: Already added in this run?
      if (addedAttachmentIdsThisRun.has(attachmentId)) {
        ztoolkit.log(
          `Attachment ${attachmentId} (${attachmentFilename}) was already added in this selection, skipping duplicate.`,
        );
        continue;
      }
      // Check 2: Already in the live queue?
      if (existingTaskAttachmentIds.has(attachmentId)) {
        ztoolkit.log(
          `Attachment ${attachmentId} (${attachmentFilename}) is already in the global queue, skipping.`,
        );
        continue;
      }
      // Check 3: Parent item status indicates busy/success? (Skip if status is NOT empty AND is queued or translating)
      if (
        parentStatus &&
        (parentStatus === "queued" || parentStatus === "translating")
      ) {
        ztoolkit.log(
          `Parent item ${parentItem.id} status is '${parentStatus}' (queued or translating), skipping attachment ${attachmentId} (${attachmentFilename}).`,
        );
        continue;
      }
      // --- End Deduplication Checks ---

      // Proceed only if not deduplicated
      const exists = await attachment.fileExists();
      if (exists) {
        const filePath = await attachment.getFilePathAsync();
        if (filePath && attachmentFilename) {
          tasks.push({
            parentItemId: parentItem.id,
            parentItemTitle: parentItemTitle,
            attachmentId: attachmentId,
            attachmentFilename: attachmentFilename,
            attachmentPath: filePath,
          });
          // Mark as added in this run
          addedAttachmentIdsThisRun.add(attachmentId);
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

async function startQueueProcessing() {
  if (
    addon.data.isQueueProcessing ||
    addon.data.translationGlobalQueue.length === 0
  ) {
    return; // Already running or queue empty
  }
  addon.data.isQueueProcessing = true;
  ztoolkit.log("Starting queue processing loop.");
  // Use Zotero.Promise.delay(0).then() to avoid deep recursion and yield
  Zotero.Promise.delay(0).then(processNextItem);
}

async function processNextItem() {
  if (addon.data.translationGlobalQueue.length === 0) {
    addon.data.isQueueProcessing = false;
    ztoolkit.log("Translation queue empty. Stopping processing loop.");
    return;
  }

  // Rename queueItem to taskData for clarity
  const taskData = addon.data.translationGlobalQueue.shift();

  if (!taskData) {
    Zotero.Promise.delay(0).then(processNextItem);
    return;
  }

  // Get the parent item using parentItemId from taskData
  const parentItem = Zotero.Items.get(taskData.parentItemId);
  if (!parentItem) {
    // Log error using details from taskData
    ztoolkit.log(
      `ERROR: Parent Item ${taskData.parentItemId} for attachment ${taskData.attachmentFilename} not found, skipping task.`,
    );
    Zotero.Promise.delay(0).then(processNextItem);
    return;
  }

  ztoolkit.log(
    `Processing task for attachment: ${taskData.attachmentFilename} (Parent: ${taskData.parentItemTitle}, ID: ${taskData.parentItemId})`,
  );
  try {
    // Pass taskData and the parentItem
    await handleSingleItemTranslation(taskData, parentItem);
    ztoolkit.log(
      `Initiated processing for: ${taskData.attachmentFilename}. Moving to next queue item.`,
    );
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Failed to initiate translation for ${taskData.attachmentFilename}:`,
      error.message || error,
    );
    if (parentItem) {
      // Update status on the parent item
      ztoolkit.ExtraField.setExtraField(
        parentItem,
        "imt_BabelDOC_status",
        `failed`,
      );
      ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", "");
    }
  } finally {
    Zotero.Promise.delay(0).then(processNextItem);
  }
}

// Renamed from consumeQueueData, now only handles INITIATION
// Accepts TranslationTaskData and the parent Zotero.Item
async function handleSingleItemTranslation(
  taskData: TranslationTaskData,
  parentItem: Zotero.Item,
): Promise<void> {
  // Clear status specific to this task/parent (maybe prefix fields?)
  // For now, we still clear general fields on the parent item. Consider if multi-attachment status needs refinement.
  clearStatus(parentItem);
  ztoolkit.ExtraField.setExtraField(
    parentItem,
    "imt_BabelDOC_status",
    `uploading`,
  );

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

  // --- Create Task ---
  const pdfId = await addon.api.createTranslateTask({
    objectKey: uploadInfo.result.objectKey, // Use the objectKey from the single upload
    pdfOptions: { conversion_formats: { html: true } },
    fileName: taskData.attachmentFilename, // Use the specific attachment filename
    targetLanguage: "zh-CN", // TODO: Make configurable
    requestModel: "glm-4-flash", // TODO: Make configurable
    enhance_compatibility: false,
    turnstileResponse: "", // TODO: Handle CAPTCHA if needed
  });

  ztoolkit.log(
    `Translation task created for ${taskData.attachmentFilename}. PDF ID: ${pdfId}`,
  );
  // Store pdfId maybe prefixed or in a way that relates to the attachment if needed later
  ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_pdfId", pdfId); // Overwriting for now
  ztoolkit.ExtraField.setExtraField(
    parentItem,
    "imt_BabelDOC_status",
    `translating`,
  );
  ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", `queued`);

  // --- Launch Background Monitoring ---
  // Pass taskData instead of queueItem
  monitorTranslationTask(pdfId, parentItem, taskData).catch((error: any) => {
    ztoolkit.log(
      `ERROR: Background monitoring task failed unexpectedly for PDF ID ${pdfId} (${taskData.attachmentFilename}):`,
      error.message || error,
    );
    try {
      ztoolkit.ExtraField.setExtraField(
        parentItem,
        "imt_BabelDOC_status",
        `failed`,
      );
      ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", "");
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
  parentItem: Zotero.Item,
  taskData: TranslationTaskData, // Accepts TranslationTaskData
): Promise<void> {
  try {
    ztoolkit.log(
      `Background monitor: Starting polling for ${pdfId} (${taskData.attachmentFilename})`,
    );
    // Pass parentItem to pollTranslationProgress
    await pollTranslationProgress(
      pdfId,
      parentItem,
      taskData.attachmentFilename,
    ); // Pass filename for logging/status

    ztoolkit.log(
      `Background monitor: Polling successful for ${pdfId}. Starting download.`,
    );
    // Pass taskData to downloadTranslateResult
    await downloadTranslateResult({ pdfId, taskData, item: parentItem });

    ztoolkit.log(
      `Background monitor: Successfully completed task for ${pdfId} (${taskData.attachmentFilename})`,
    );
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Background monitor failed for PDF ID ${pdfId} (${taskData.attachmentFilename}):`,
      error.message || error,
    );
    if (parentItem) {
      ztoolkit.ExtraField.setExtraField(
        parentItem,
        "imt_BabelDOC_status",
        `failed`,
      );
      ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", "");
    }
  }
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
    // ztoolkit.log("Upload Info:", uploadInfo); // Optional: Keep for debugging
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
  parentItem: Zotero.Item,
  attachmentFilename: string, // Added for context
): Promise<void> {
  const POLLING_INTERVAL_MS = 3000; // Keep the interval between checks
  // Removed MAX_POLLING_ATTEMPTS and attempts counter

  ztoolkit.log(
    `Polling progress indefinitely for PDF ID: ${pdfId} (${attachmentFilename})`,
  );

  // Loop indefinitely until success or error
  while (true) {
    try {
      const processStatus = await addon.api.getTranslateStatus({ pdfId });
      ztoolkit.log(
        `Polling: Status for ${pdfId} (${attachmentFilename}):`,
        processStatus,
      );

      // Update status and stage on parent item
      const currentStage = `${processStatus.currentStageName || "queued"} (${processStatus.overall_progress || 0}%)`;
      ztoolkit.ExtraField.setExtraField(
        parentItem,
        "imt_BabelDOC_status",
        "translating",
      );
      ztoolkit.ExtraField.setExtraField(
        parentItem,
        "imt_BabelDOC_stage",
        `${currentStage}`,
      );

      // --- Check for Success ---
      if (
        processStatus.status === "ok" &&
        processStatus.overall_progress === 100
      ) {
        ztoolkit.log(
          `Translation completed for PDF ID: ${pdfId} (${attachmentFilename})`,
        );
        return; // Success - exit polling loop
      }

      // --- Check for Failure ---
      if (
        processStatus.status === "error" ||
        processStatus.status === "failed"
      ) {
        const errorMsg = `Translation failed with status: ${processStatus.status}`;
        ztoolkit.log(
          `ERROR: ${errorMsg} for PDF ID: ${pdfId} (${attachmentFilename}).`,
        );
        ztoolkit.ExtraField.setExtraField(
          parentItem,
          "imt_BabelDOC_status",
          `failed`,
        );
        ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", "");
        throw new Error(errorMsg); // Failure - exit loop by throwing
      }

      // --- Wait before the next poll ---
      await Zotero.Promise.delay(POLLING_INTERVAL_MS);
    } catch (error: any) {
      // Handle API call errors or status errors thrown above
      ztoolkit.log(
        `ERROR: During polling check for PDF ID ${pdfId} (${attachmentFilename}):`,
        error.message || error,
      );

      // If it's a translation failure error re-thrown from the checks above, propagate it
      if (error.message?.startsWith("Translation failed")) {
        throw error; // Exit loop by re-throwing
      }

      // For other errors (network issues, etc.), log, set a temporary status, and wait before retrying
      ztoolkit.ExtraField.setExtraField(
        parentItem,
        "imt_BabelDOC_status",
        `failed`,
      );
      ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", "");
      // Still wait longer after a connection error before the next attempt
      await Zotero.Promise.delay(POLLING_INTERVAL_MS * 2);
      // The loop will continue and retry the getTranslateStatus call
    }
  }
  // Removed the timeout logic - the loop only exits via return (success) or throw (failure)
}

// Modified signature to use taskData
async function downloadTranslateResult({
  pdfId,
  taskData, // Use TranslationTaskData
  item: parentItem, // Rename item to parentItem for clarity
}: {
  pdfId: string;
  taskData: TranslationTaskData;
  item: Zotero.Item;
}) {
  try {
    const result = await addon.api.getTranslatePdfResult({ pdfId });
    ztoolkit.log(
      `Download Result Info for ${taskData.attachmentFilename}:`,
      result,
    );

    const fileUrl = result.translationDualPdfOssUrl;
    if (!fileUrl) {
      throw new Error(
        `No download URL found for ${taskData.attachmentFilename}.`,
      );
    }

    ztoolkit.ExtraField.setExtraField(
      parentItem,
      "imt_BabelDOC_stage",
      `Downloading result`, // Update stage on parent
    );
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
    const targetLang = "zh_CN"; // TODO: Get from config
    const suffix = "_translated"; // TODO: Make configurable
    const fileName = `${baseName}${suffix}_${targetLang}.pdf`;

    const tempDir = PathUtils.tempDir || Zotero.getTempDirectory().path;
    const tempPath = PathUtils.join(tempDir, fileName);
    ztoolkit.log(`Writing downloaded file to temp path: ${tempPath}`);

    await IOUtils.write(tempPath, new Uint8Array(fileBuffer));

    ztoolkit.log(`Importing attachment to item: ${taskData.parentItemId}`);
    const attachment = await Zotero.Attachments.importFromFile({
      file: tempPath,
      parentItemID: taskData.parentItemId, // Use parentItemId from taskData
      libraryID: parentItem.libraryID,
      title: fileName,
      contentType: "application/pdf",
    });

    ztoolkit.log(
      `Attachment created (ID: ${attachment.id}) for ${taskData.attachmentFilename}`,
    );

    // Set final success status on the parent item
    // Consider how to represent multiple successes if applicable
    ztoolkit.ExtraField.setExtraField(
      parentItem,
      "imt_BabelDOC_status",
      "success",
    );
    ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", "");

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
    ztoolkit.ExtraField.setExtraField(
      parentItem,
      "imt_BabelDOC_status",
      `failed`,
    );
    ztoolkit.ExtraField.setExtraField(parentItem, "imt_BabelDOC_stage", "");
    throw error;
  }
}

async function clearStatus(item: Zotero.Item) {
  // Note: This clears general fields. If tracking multiple attachments on one parent,
  // you might need a more targeted clear based on attachment ID or prefix.
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_status", "");
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_stage", "");
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_pdfId", "");
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_objectKey", ""); // Consider prefixing/removing if needed
}
