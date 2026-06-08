import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const getDeviceId = () => {
  try {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("device_id", id);
    }
    return id;
  } catch {
    return null;
  }
};

let queue: any[] = [];
let timer: any = null;
const flush = async () => {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await (supabase as any).from("filter_events").insert(batch);
  } catch (e) {
    logger.error("filter_events flush failed", e);
  }
};

export const trackFilterEvent = async (
  event_type: string,
  filter_key: string,
  filter_value?: string | number | null,
  result_count?: number,
) => {
  try {
    const { data: sess } = await supabase.auth.getSession();
    queue.push({
      event_type,
      filter_key,
      filter_value: filter_value == null ? null : String(filter_value),
      result_count: result_count ?? null,
      user_id: sess.session?.user?.id ?? null,
      device_id: getDeviceId(),
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
    });
    clearTimeout(timer);
    timer = setTimeout(flush, 800);
  } catch (e) {
    logger.error("trackFilterEvent error", e);
  }
};
