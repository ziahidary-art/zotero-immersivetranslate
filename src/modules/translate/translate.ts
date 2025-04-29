import type { TranslationTaskData } from "../../types";
import { updateTaskInList } from "./task-manager";
const ATTR_TAG = "BabelDOC_translated";

export async function translatePDF(
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
  const uploadInfo = await uploadAttachmentFile(
    taskData.attachmentPath,
    taskData.attachmentFilename,
  ); // Wait for upload
  if (!uploadInfo) {
    throw new Error(`Upload failed for ${taskData.attachmentFilename}`);
  }
  ztoolkit.log(`Upload successful for: ${taskData.attachmentFilename}`);

  // --- Create Task ---
  const pdfId = await addon.api.createTranslateTask({
    objectKey: uploadInfo.result.objectKey,
    pdfOptions: { conversion_formats: { html: true } },
    fileName: taskData.attachmentFilename,
    targetLanguage: taskData.targetLanguage,
    requestModel: taskData.translateModel,
    enhance_compatibility: taskData.enhanceCompatibility,
    turnstileResponse: "",
  });

  ztoolkit.log(
    `Translation task created for ${taskData.attachmentFilename}. PDF ID: ${pdfId}`,
  );
  // Update taskData with pdfId for the monitoring task
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
export async function monitorTranslationTask(
  pdfId: string,
  taskData: TranslationTaskData,
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
    const translateMode = taskData.translateMode;

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
    const targetLanguage = taskData.targetLanguage;
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
