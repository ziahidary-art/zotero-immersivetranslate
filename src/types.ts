export type Status =
  | "uploading"
  | "queued"
  | "translating"
  | "success"
  | "failed"
  | "canceled";

export type Stage = "queued" | "processing" | "success" | "failed";

export type TranslationTaskData = {
  parentItemId?: number;
  parentItemTitle?: string;
  attachmentId: number;
  attachmentFilename: string;
  attachmentPath: string;
  targetLanguage: string;
  translateModel: string;
  translateMode: string;
  enhanceCompatibility: boolean;
  pdfId?: string;
  status?: string;
  stage?: string;
  progress?: number;
  error?: string;
  resultAttachmentId?: number;
};
