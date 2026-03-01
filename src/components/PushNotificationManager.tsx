import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PushNotificationManager = () => {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    registerServiceWorker();
    requestNotificationPermission();
    setupRealtimeNotifications();
  }, []);

  const registerServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register("/sw-notifications.js", {
        scope: "/",
      });
      console.log("Service Worker registered:", registration.scope);
    } catch (error) {
      console.warn("Service Worker registration failed:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.log("Bu tarayıcı bildirimleri desteklemiyor");
      return;
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      console.log("Bildirim izni:", permission);
    }
  };

  const showNotification = (title: string, body: string) => {
    if (Notification.permission !== "granted") return;

    // Try service worker notification first (works in background on mobile)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        body,
      });

      // Also try via service worker registration
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `notification-${Date.now()}`,
          requireInteraction: false,
        });
      }).catch(() => {
        // Fallback to regular notification
        showFallbackNotification(title, body);
      });
    } else {
      showFallbackNotification(title, body);
    }
  };

  const showFallbackNotification = (title: string, body: string) => {
    if (Notification.permission !== "granted") return;

    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `notification-${Date.now()}`,
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 5000);
  };

  const setupRealtimeNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel("push-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as { message: string };
          showNotification("Kuantum Ticaret", notification.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return null;
};
