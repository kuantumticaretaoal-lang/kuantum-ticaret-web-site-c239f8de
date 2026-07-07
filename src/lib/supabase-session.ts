import { supabase } from "@/integrations/supabase/client";

/**
 * Attach caller-owned identifiers as request headers so RLS policies
 * can verify anonymous ownership of cart / live-support rows.
 * Runs once at app bootstrap; safe to call repeatedly.
 */
export const installSupabaseSessionHeaders = () => {
  try {
    let sessionId = localStorage.getItem("cart_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("cart_session_id", sessionId);
    }
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id", deviceId);
    }
    const rest: any = (supabase as any).rest;
    if (rest && rest.headers) {
      rest.headers["x-session-id"] = sessionId;
      rest.headers["x-device-id"] = deviceId;
    }
  } catch {
    /* no-op */
  }
};
