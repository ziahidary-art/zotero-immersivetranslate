import { getPref } from "../utils/prefs";
import { BASE_URL_TEST, BASE_URL } from "../utils/const";

export async function request({
  url,
  method = "GET",
  body = null,
  params = {},
  headers = {},
  responseType = "json",
  fullFillOnError = false,
}: {
  url: string;
  method?: string;
  body?: any;
  params?: any;
  headers?: any;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
  fullFillOnError?: boolean | number[];
}) {
  try {
    const URL = addon.data.env === "development" ? BASE_URL_TEST : BASE_URL;
    const isCustomUrl = url.startsWith("http");
    const queryParams = new URLSearchParams(params);

    // For GET requests, always append params to URL. For other methods, only if not custom URL
    let _url;
    if (method === "GET" || !isCustomUrl) {
      _url = isCustomUrl
        ? `${url}${params && Object.keys(params).length > 0 ? `?${queryParams.toString()}` : ""}`
        : `${URL}${url}?${queryParams.toString()}`;
    } else {
      _url = isCustomUrl ? url : `${URL}${url}`;
    }

    const requestOptions = {
      method,
      headers: {
        ...(isCustomUrl
          ? {}
          : {
              Authorization: `Bearer ${getPref("authkey")}`,
              "Content-Type": "application/json",
            }),
        ...headers,
      },
      ...(method !== "GET" &&
        method !== "HEAD" && {
          body: isCustomUrl ? body : JSON.stringify(body, null, 2),
        }),
    };

    const response = await fetch(_url, requestOptions);
    let data;

    if (responseType === "json") {
      data = await response.json();
    } else if (responseType === "text") {
      data = await response.text();
    } else if (responseType === "blob") {
      data = await response.blob();
    } else if (responseType === "arraybuffer") {
      data = await response.arrayBuffer();
      return data;
    }

    if (data && typeof data === "object") {
      if ("code" in data && data.code === 0) {
        return "data" in data ? data.data : data;
      } else {
        if (fullFillOnError) {
          return data;
        }
        const errorMessage =
          "message" in data
            ? String(data.message)
            : "error" in data
              ? String(data.error)
              : "Unknown error";
        handleError(new Error(errorMessage));
      }
    }
    return data;
  } catch (error: any) {
    if (fullFillOnError) {
      return error;
    }
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
  throw error;
}
