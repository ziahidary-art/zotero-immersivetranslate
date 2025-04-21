type TranslateItem = {
  id: number;
  title: string;
  abstract: string;
  attachments: {
    id: number;
    title: string;
    filename: string;
    path: string;
  }[];
};

export async function translateItem() {
  // Get selected items
  const selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
  const itemsData = [];

  // Process each selected item
  for (const item of selectedItems) {
    if (!item.isRegularItem()) continue;

    // Get basic metadata
    const itemData: TranslateItem = {
      id: item.id,
      title: item.getField("title"),
      abstract: item.getField("abstract"),
      attachments: [],
    };

    // Get all attachments
    const attachmentIds = item.getAttachments();
    for (const attachmentId of attachmentIds) {
      const attachment = Zotero.Items.get(attachmentId);
      const isPDF = attachment.attachmentContentType === "application/pdf";
      // Only include file attachments (not URL attachments)
      const exists = await attachment.fileExists();
      ztoolkit.log("Attachment exists:", exists);
      if (
        attachment.isFileAttachment() &&
        isPDF &&
        !attachment.isTopLevelItem() &&
        (await attachment.fileExists())
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
  }

  ztoolkit.log("Selected items with attachments:", itemsData);
  const uploadInfo = await addon.api.getPdfUploadUrl();
  ztoolkit.log("Upload Info:", uploadInfo);
  // TODO
  const filePath = itemsData[0].attachments[0].path;
  const fileContents = await Zotero.File.getBinaryContentsAsync(filePath);
  const file = new File([fileContents], itemsData[0].attachments[0].filename);
  ztoolkit.log("File:", file);
  await addon.api.uploadPdf({
    uploadUrl: uploadInfo.result.preSignedURL,
    file,
  });
  const taskId = await addon.api.createTranslateTask({
    objectKey: uploadInfo.result.objectKey,
    pdfOptions: {
      conversion_formats: {
        html: true,
      },
    },
    fileName: itemsData[0].title,
    targetLanguage: "zh-CN",
    requestModel: "glm-2.0-flash",
    enhance_compatibility: false,
    turnstileResponse: "",
  });
  ztoolkit.log("Task ID:", taskId);
  // 轮询
  const interval = setInterval(async () => {
    const processStatus = await addon.api.getTranslateStatus({
      taskId,
    });
    ztoolkit.log("processStatus:", processStatus);
    if (
      processStatus.status === "ok" &&
      processStatus.overall_progress === 100
    ) {
      clearInterval(interval);
      const result = await addon.api.getTranslatePdfResult({
        taskId,
      });
      ztoolkit.log("Result:", result);
    }
  }, 1000);
  return itemsData;
}
