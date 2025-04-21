import { getPref } from "../utils/prefs";

const BASE_URL_TEST = "https://test-api2.immersivetranslate.com/zotero";
const BASE_URL = "https://api2.immersivetranslate.com/zotero";

const URL = BASE_URL_TEST;

export async function request({
  url,
  method = "GET",
  body = null,
  params = {},
  headers = {},
  responseType = "json",
}: {
  url: string;
  method?: string;
  body?: any;
  params?: any;
  headers?: any;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
}) {
  try {
    const queryParams = new URLSearchParams(params);
    const urlWithParams = `${URL}${url}?${queryParams.toString()}`;
    const _url = url.startsWith("http") ? url : urlWithParams;
    const res = await Zotero.HTTP.request(method, _url, {
      headers: {
        Authorization: `Bearer ${getPref("authkey")}`,
        ...headers,
      },
      body,
      responseType,
    });
    if (res.response.code === 0) {
      ztoolkit.log(res.response.data);
      return res.response.data;
    } else {
      handleError(res.response.data);
    }
  } catch (error: any) {
    ztoolkit.log(error);
    handleError(error);
  }
}

export function handleError(error: any) {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text: `${error}`,
      type: "error",
    })
    .show();
}
