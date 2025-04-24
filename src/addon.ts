import { config } from "../package.json";
import { DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import api from "./api";

type TranslationTaskData = {
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

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
    };
    dialog?: DialogHelper;
    translationGlobalQueue: TranslationTaskData[];
    translationTaskList: TranslationTaskData[];
    isQueueProcessing: boolean;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: typeof api;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      ztoolkit: createZToolkit(),
      translationGlobalQueue: [],
      translationTaskList: [],
      isQueueProcessing: false,
    };
    this.hooks = hooks;
    this.api = api;
  }
}

export default Addon;
