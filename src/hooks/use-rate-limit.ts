import { supabase } from "@/integrations/supabase/client";

const DAILY_LIMIT = 3;

export const useRateLimit = () => {
  const checkDailyLimit = async (
    tableName: "product_reviews" | "product_questions"
  ): Promise<{ allowed: boolean; remaining: number }> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { allowed: false, remaining: 0 };
    }

    const { data, error } = await supabase.rpc("get_daily_submission_count", {
      p_user_id: user.id,
      p_table_name: tableName,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true, remaining: DAILY_LIMIT };
    }

    const currentCount = data || 0;
    const remaining = Math.max(0, DAILY_LIMIT - currentCount);
    
    return {
      allowed: currentCount < DAILY_LIMIT,
      remaining,
    };
  };

  return { checkDailyLimit, DAILY_LIMIT };
};
