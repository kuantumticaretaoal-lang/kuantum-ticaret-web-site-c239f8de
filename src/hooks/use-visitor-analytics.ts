import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useVisitorAnalytics() {
  const location = useLocation();
  const visitIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    const finalizePrevious = async () => {
      if (!visitIdRef.current) return;
      const duration = Math.max(0, Math.round((Date.now() - startRef.current) / 1000));
      try {
        await (supabase as any)
          .from("visitor_analytics")
          .update({ left_at: new Date().toISOString(), duration })
          .eq("id", visitIdRef.current);
      } catch (e) {
        // ignore
      } finally {
        visitIdRef.current = null;
      }
    };

    const startNew = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      startRef.current = Date.now();
      const { data } = await (supabase as any)
        .from("visitor_analytics")
        .insert({
          page_path: location.pathname,
          user_id: user?.id || null,
        })
        .select("id")
        .single();
      if (!cancelled && data?.id) {
        visitIdRef.current = data.id as string;
      }
    };

    // Finish old visit then start a new one
    finalizePrevious().finally(startNew);

    const handleBeforeUnload = () => {
      // Best-effort finalize; may not always complete
      if (!visitIdRef.current) return;
      const duration = Math.max(0, Math.round((Date.now() - startRef.current) / 1000));
      (supabase as any)
        .from("visitor_analytics")
        .update({ left_at: new Date().toISOString(), duration })
        .eq("id", visitIdRef.current);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      finalizePrevious();
    };
  }, [location.pathname]);
}
