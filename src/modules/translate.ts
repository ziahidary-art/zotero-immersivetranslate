type TranslateQueueData = {
  id: number;
  title: string;
  attachments: {
    id: number;
    title: string;
    filename: string;
    path: string;
  }[];
};

export async function translatePDF() {
  // Get selected items
  const translateQueue = await getTranslateQueue();
  if (translateQueue.length === 0) {
    ztoolkit.log("No items selected");
    return;
  }
  translateQueue.forEach(async (queueItem) => {
    consumeQueueData({
      queueItem: queueItem,
    });
  });
}

async function getTranslateQueue(): Promise<TranslateQueueData[]> {
  // Get selected items
  const selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
  const itemsData = [];

  // Process each selected item
  for (const item of selectedItems) {
    if (item.isRegularItem()) {
      // Get basic metadata
      const itemData: TranslateQueueData = {
        id: item.id,
        title: item.getField("title"),
        attachments: [],
      };

      // Get all attachments
      const attachmentIds = item.getAttachments();
      for (const attachmentId of attachmentIds) {
        const attachment = Zotero.Items.get(attachmentId);
        const isPDF = attachment.attachmentContentType === "application/pdf";
        const exists = await attachment.fileExists();
        if (
          attachment.isFileAttachment() &&
          isPDF &&
          !attachment.isTopLevelItem() &&
          exists
        ) {
          const filePath = await attachment.getFilePathAsync();
          if (filePath) {
            itemData.attachments.push({
              id: attachment.id,
              title: attachment.getField("title"),
              filename: attachment.attachmentFilename,
              path: filePath,
            });
          }
        }
      }

      itemsData.push(itemData);
    } else {
      ztoolkit.log("Selected item is not a regular item:", item.id);
      const isPDF = item.attachmentContentType === "application/pdf";
      const exists = await item.fileExists();
      if (item.isAttachment() && isPDF && exists) {
        ztoolkit.log("Selected item is a PDF attachment:", item.id);
        ztoolkit.log("Selected item:", item);
        const parentItemID = item.parentItemID;
        if (parentItemID) {
          const parentItem = Zotero.Items.get(parentItemID);

          const filePath = await item.getFilePathAsync();
          if (filePath) {
            const itemData: TranslateQueueData = {
              id: parentItemID,
              title: parentItem.getField("title"),
              attachments: [
                {
                  id: item.id,
                  title: item.getField("title"),
                  filename: item.attachmentFilename,
                  path: filePath,
                },
              ],
            };
            itemsData.push(itemData);
          }
        }
      }
    }
  }

  ztoolkit.log("Selected items with attachments:", itemsData);
  return itemsData;
}

async function consumeQueueData({
  queueItem,
}: {
  queueItem: TranslateQueueData;
}) {
  const item = Zotero.Items.get(queueItem.id);
  clearStatus(item);
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_status", "uploading");

  const uploadInfos = await uploadAttachmentsFile(queueItem);
  ztoolkit.log("Upload Infos:", uploadInfos);
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_status", "queued");
  uploadInfos.forEach(async (uploadInfo) => {
    const pdfId = await addon.api.createTranslateTask({
      objectKey: uploadInfo.result.objectKey,
      pdfOptions: {
        conversion_formats: {
          html: true,
        },
      },
      fileName: queueItem.title,
      targetLanguage: "zh-CN",
      requestModel: "glm-4-flash",
      enhance_compatibility: false,
      turnstileResponse: "",
    });
    ztoolkit.log("PDF ID:", pdfId);
    ztoolkit.ExtraField.setExtraField(
      item,
      "imt_BabelDOC_status",
      "translating",
    );
    ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_stage", "queued");
    ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_pdfId", pdfId);
    getTranslateProgress({
      pdfId,
      queueItem,
      item,
    });
  });
}

async function uploadAttachmentsFile(queueItem: TranslateQueueData) {
  const uploadPromises = queueItem.attachments.map(async (attachment) => {
    const uploadInfo = await addon.api.getPdfUploadUrl();
    ztoolkit.log("Upload Info:", uploadInfo);
    const filePath = attachment.path;
    const fileContents = await IOUtils.read(filePath);
    const file = new File([fileContents], attachment.filename);

    try {
      await addon.api.uploadPdf({
        uploadUrl: uploadInfo.result.preSignedURL,
        file,
      });
      return uploadInfo;
    } catch (error) {
      // TODO
      ztoolkit.log("Upload Error:", error);
      throw error;
    }
  });

  return Promise.all(uploadPromises);
}

async function getTranslateProgress({
  pdfId,
  queueItem,
  item,
}: {
  pdfId: string;
  queueItem: TranslateQueueData;
  item: Zotero.Item;
}) {
  // 轮询
  const interval = setInterval(async () => {
    const processStatus = await addon.api.getTranslateStatus({
      pdfId: pdfId,
    });
    ztoolkit.ExtraField.setExtraField(
      item,
      "imt_BabelDOC_status",
      processStatus.status,
    );
    ztoolkit.ExtraField.setExtraField(
      item,
      "imt_BabelDOC_stage",
      `${processStatus.currentStageName}(${processStatus.overall_progress}%)`,
    );
    ztoolkit.log("processStatus:", processStatus);
    if (
      processStatus.status === "ok" &&
      processStatus.overall_progress === 100
    ) {
      clearInterval(interval);
      downloadTranslateResult({
        pdfId,
        queueItem,
        item,
      });
    }
  }, 3000);
}

async function downloadTranslateResult({
  pdfId,
  queueItem,
  item,
}: {
  pdfId: string;
  queueItem: TranslateQueueData;
  item: Zotero.Item;
}) {
  const result = await addon.api.getTranslatePdfResult({
    pdfId,
  });
  ztoolkit.log("Result:", result);
  // TODO 双语 or 仅译文
  const fileUrl = result.translationDualPdfOssUrl;
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_status", "success");
  ztoolkit.log("File URL:", fileUrl);
  const file = await addon.api.downloadPdf(fileUrl);
  ztoolkit.log("File:", file);
  // TODO rename
  const fileName = `${queueItem.title}_zh_CN.pdf`;
  const tempPath = PathUtils.join(PathUtils.tempDir, fileName);
  await IOUtils.write(tempPath, new Uint8Array(file));
  ztoolkit.log("Temp Path:", tempPath);
  const attachment = await Zotero.Attachments.importFromFile({
    file: tempPath,
    parentItemID: item.id,
    libraryID: item.libraryID,
    title: fileName,
  });
  Zotero.Reader.open(attachment.id);
  await IOUtils.remove(tempPath);
}

async function clearStatus(item: Zotero.Item) {
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_status", "");
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_stage", "");
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_pdfId", "");
  ztoolkit.ExtraField.setExtraField(item, "imt_BabelDOC_objectKey", "");
}
