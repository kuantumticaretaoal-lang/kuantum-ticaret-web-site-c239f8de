// Service Worker for push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Kuantum Ticaret";
  const options = {
    body: data.body || data.message || "Yeni bildiriminiz var",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: `notification-${Date.now()}`,
    requireInteraction: false,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});

// Keep the service worker alive for background sync
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
