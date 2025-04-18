import { getPref } from "../utils/prefs";

export async function request({
  url,
  method = "GET",
  body = null,
  responseType = "json",
}: {
  url: string;
  method?: string;
  body?: any;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
}) {
  try {
    const res = await Zotero.HTTP.request(method, url, {
      headers: {
        Authorization: `Bearer ${getPref("authkey")}`,
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
