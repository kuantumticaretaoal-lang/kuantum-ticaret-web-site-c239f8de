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

      // Check if user is admin before tracking presence with details
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin' as const,
      });

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
            // Only broadcast PII for admin users; regular users send minimal data
            if (isAdmin) {
              await presenceChannel?.track({
                userId: user.id,
                email: profile?.email || user.email || "",
                firstName: profile?.first_name || "",
                lastName: profile?.last_name || "",
                timestamp: Date.now(),
              });
            } else {
              await presenceChannel?.track({
                userId: user.id,
                timestamp: Date.now(),
              });
            }
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