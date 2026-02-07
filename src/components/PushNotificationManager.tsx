import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PushNotificationManager = () => {
  const showNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === "granted") {
      // Try to use service worker notification for better mobile support
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          body,
        });
      } else {
        // Fallback to regular notification
        try {
          const notification = new Notification(title, {
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `notification-${Date.now()}`,
            requireInteraction: false,
            silent: false,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          setTimeout(() => notification.close(), 5000);
        } catch (error) {
          console.warn("Notification creation failed:", error);
        }
      }
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("Bu tarayıcı bildirimleri desteklemiyor");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "default") {
      try {
        const permission = await Notification.requestPermission();
        console.log("Bildirim izni:", permission);
        return permission === "granted";
      } catch (error) {
        console.warn("Notification permission request failed:", error);
        return false;
      }
    }

    return false;
  }, []);

  const setupRealtimeNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

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

    return channel;
  }, [showNotification]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      await requestNotificationPermission();
      channel = await setupRealtimeNotifications();
    };

    init();

    // Re-setup when user changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      
      if (session?.user) {
        channel = await setupRealtimeNotifications();
      }
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      subscription.unsubscribe();
    };
  }, [requestNotificationPermission, setupRealtimeNotifications]);

  return null;
};
