import { request } from "../api/request";
import { getInstallInfo } from "./fake_user";
import { getGMurls, SELF_SERVICE_COLLECT_URL } from "./const";
import { version } from "../../package.json";

export interface EventInterface {
  name: string;
  params?: Record<string, string | number>;
}

export async function report(key: string, events: EventInterface[]) {
  try {
    const { fakeUserId } = await getInstallInfo();
    const urls = getGMurls();

    const formattedEvents = await formatEvents({
      events,
    });

    urls.forEach(async (url) => {
      await request({
        responseType: "text",
        url: url,
        method: "POST",
        fullFillOnError: true,
        body: JSON.stringify({
          client_id: fakeUserId,
          user_id: fakeUserId,
          events: formattedEvents,
        }),
      });
    });

    reportToSelfService(fakeUserId, formattedEvents);
  } catch (e) {
    ztoolkit.log(`report error`, e);
  }
}

function reportToSelfService(fakeUserId: string, events: EventInterface[]) {
  try {
    events.forEach((event) => {
      const params: Record<string, string | number> = {
        ...event.params,
        event_name: event.name,
        device_id: fakeUserId,
      };
      const nonce = Date.now() + (Math.random() * 100).toFixed(0);

      request({
        url: SELF_SERVICE_COLLECT_URL,
        method: "POST",
        responseType: "text",
        fullFillOnError: true,
        body: JSON.stringify({
          nonce: nonce,
          subject: "user_behaviour",
          logs: [JSON.stringify(params)],
        }),
      });
    });
  } catch (error) {
    ztoolkit.log(`report self service error`, error);
  }
}

async function formatEvents(options: { events: EventInterface[] }) {
  const { events } = options;
  const systemInfo = await Zotero.getSystemInfo();
  const os_version = (await Zotero.getOSVersion()).split(" ");
  const formattedEvents = events.map((event) => {
    const currentParam: Record<string, string | number> = event.params || {};
    currentParam.os_name = os_version[0] || "unknown";
    currentParam.os_version = os_version[1] || "unknown";
    if (version) {
      currentParam.version = version;
    }
    return {
      ...event,
      params: currentParam,
    } as EventInterface;
  });

  return formattedEvents;
}
