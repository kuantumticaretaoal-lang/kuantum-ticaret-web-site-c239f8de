import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useOnlinePresence = () => {
  useEffect(() => {
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Kullanıcı bilgilerini al
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      presenceChannel = supabase.channel("online-users", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      presenceChannel
        .on("presence", { event: "sync" }, () => {
          // Presence durumu güncellendi
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel?.track({
              userId: user.id,
              email: profile?.email || user.email || "",
              firstName: profile?.first_name || "",
              lastName: profile?.last_name || "",
              timestamp: Date.now(),
            });
          }
        });
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, []);
};