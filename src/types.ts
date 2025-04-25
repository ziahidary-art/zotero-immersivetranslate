export type Status =
  | "uploading"
  | "queued"
  | "translating"
  | "success"
  | "failed";
export type Stage = "queued" | "processing" | "success" | "failed";

export type TranslationTaskData = {
  parentItemId: number;
  parentItemTitle: string;
  attachmentId: number;
  attachmentFilename: string;
  attachmentPath: string;
  pdfId?: string;
  status?: string;
  stage?: string;
  progress?: number;
  error?: string;
  resultAttachmentId?: number;
};
