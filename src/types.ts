export type Status =
  | "uploading"
  | "queued"
  | "translating"
  | "success"
  | "failed";
export type Stage = "queued" | "processing" | "success" | "failed";
