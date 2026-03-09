import { supabase } from "@/integrations/supabase/client";

export const logAdminActivity = async (
  actionType: string,
  actionDescription: string,
  targetTable?: string,
  targetId?: string,
  metadata?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from("admin_activity_logs").insert({
      admin_id: user.id,
      action_type: actionType,
      action_description: actionDescription,
      target_table: targetTable || null,
      target_id: targetId || null,
      metadata: metadata || null,
    });
  } catch (e) {
    console.error("Failed to log admin activity:", e);
  }
};
