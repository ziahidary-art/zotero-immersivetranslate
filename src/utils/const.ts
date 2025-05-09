export const HOST_NAME = "immersivetranslate.com";

const Old_GA_MEASUREMENT_ID = process.env.Old_GA_MEASUREMENT_ID || "";
const Old_GA_API_SECRET = process.env.Old_GA_API_SECRET || "";
const New_GA_MEASUREMENT_ID = process.env.New_GA_MEASUREMENT_ID || "";
const New_GA_API_SECRET = process.env.New_GA_API_SECRET || "";

export const BASE_URL_TEST = `https://test-api2.${HOST_NAME}/zotero`;
export const BASE_URL = `https://api2.${HOST_NAME}/zotero`;

export const SELF_SERVICE_COLLECT_URL = `https://analytics.${HOST_NAME}/collect`;

export function getGMurls() {
  if (addon.data.env === "development") {
    return [
      `https://www.google-analytics.com/debug/mp/collect?measurement_id=${Old_GA_MEASUREMENT_ID}&api_secret=${Old_GA_API_SECRET}`,
      `https://www.google-analytics.com/debug/mp/collect?measurement_id=${New_GA_MEASUREMENT_ID}&api_secret=${New_GA_API_SECRET}`,
    ];
  }
  if (!New_GA_MEASUREMENT_ID) {
    ztoolkit.log("Warning: env not inject success!");
    return [];
  }
  return [
    `https://www.google-analytics.com/mp/collect?measurement_id=${Old_GA_MEASUREMENT_ID}&api_secret=${Old_GA_API_SECRET}`,
    `https://www.google-analytics.com/mp/collect?measurement_id=${New_GA_MEASUREMENT_ID}&api_secret=${New_GA_API_SECRET}`,
  ];
}
