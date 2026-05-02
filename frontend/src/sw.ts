/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; data?: Record<string, unknown> } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Shift App", body: event.data?.text() ?? "" };
  }
  const title = data.title ?? "Shift App";
  const body = data.body ?? "";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data.data ?? {},
      tag: "shift-app",
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const target = all.find((c) => c.url.includes(self.location.origin));
      if (target) {
        await target.focus();
      } else {
        await self.clients.openWindow("/");
      }
    })()
  );
});
