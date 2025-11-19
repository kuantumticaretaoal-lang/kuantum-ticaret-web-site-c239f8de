import { supabase } from "@/integrations/supabase/client";

// Generate a random backup code in format: AB12-CD3-456E
export const generateBackupCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding ambiguous characters
  const segments = [4, 3, 4]; // Length of each segment
  
  const code = segments.map(length => {
    let segment = "";
    for (let i = 0; i < length; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return segment;
  }).join("-");
  
  return code;
};

// Create or regenerate backup code for user
export const createBackupCode = async (userId: string): Promise<{ code: string | null; error: any }> => {
  // Generate unique code
  let code = generateBackupCode();
  let attempts = 0;
  
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("backup_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    
    if (!existing) break;
    code = generateBackupCode();
    attempts++;
  }
  
  if (attempts >= 10) {
    return { code: null, error: new Error("Failed to generate unique code") };
  }
  
  // Mark all previous codes as used
  await supabase
    .from("backup_codes")
    .update({ used: true })
    .eq("user_id", userId);
  
  // Insert new code
  const { error } = await supabase
    .from("backup_codes")
    .insert({ user_id: userId, code });
  
  if (error) {
    return { code: null, error };
  }
  
  return { code, error: null };
};

// Get active backup code for user
export const getActiveBackupCode = async (userId: string): Promise<string | null> => {
  const { data } = await supabase
    .from("backup_codes")
    .select("code")
    .eq("user_id", userId)
    .eq("used", false)
    .maybeSingle();
  
  return data?.code || null;
};

// Verify and use backup code
export const verifyBackupCode = async (code: string): Promise<{ userId: string | null; error: any }> => {
  const { data, error } = await supabase
    .from("backup_codes")
    .select("user_id, used")
    .eq("code", code.toUpperCase())
    .eq("used", false)
    .maybeSingle();
  
  if (error || !data) {
    return { userId: null, error: error || new Error("Invalid code") };
  }
  
  // Mark as used
  await supabase
    .from("backup_codes")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("code", code.toUpperCase());
  
  return { userId: data.user_id, error: null };
};
