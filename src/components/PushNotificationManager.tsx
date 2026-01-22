import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PushNotificationManager = () => {
  useEffect(() => {
    requestNotificationPermission();
    setupRealtimeNotifications();
  }, []);

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
    if (Notification.permission === "granted") {
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

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
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
