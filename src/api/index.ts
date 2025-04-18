import { request } from "./request";

export function getPdfUploadUrl() {
  return request({
    url: "https://test-api2.immersivetranslate.com/zotero/pdf-upload-url",
  });
}

export default {
  getPdfUploadUrl,
};
