import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// Create or regenerate backup code for user using secure hashed storage
export const createBackupCode = async (userId: string): Promise<{ code: string | null; error: any }> => {
  try {
    // Call the secure database function to generate and store hashed backup code
    const { data, error } = await supabase.rpc('generate_hashed_backup_code', {
      user_id_param: userId
    });
    
    if (error) {
      logger.error("Backup code generation error:", error);
      return { code: null, error };
    }
    
    if (!data) {
      logger.error("No backup code returned from function");
      return { code: null, error: "No code generated" };
    }
    
    // Return the plain code (only time it will be visible)
    return { code: data as string, error: null };
  } catch (error) {
    logger.error("Backup code creation exception:", error);
    return { code: null, error };
  }
};

// Verify backup code using secure database function
export const verifyBackupCode = async (userId: string, code: string): Promise<{ valid: boolean; error: any }> => {
  try {
    // Call the secure database function to verify the hashed code
    const { data, error } = await supabase.rpc('verify_backup_code', {
      user_id_param: userId,
      plain_code: code.toUpperCase().trim()
    });
    
    if (error) {
      return { valid: false, error };
    }
    
    if (data === true) {
      // Mark the code as used by updating the backup_codes table
      // We need to hash the code first to find it
      const { data: hashData } = await supabase.rpc('hash_backup_code', {
        plain_code: code.toUpperCase().trim()
      });
      
      if (hashData) {
        await supabase
          .from("backup_codes")
          .update({ used: true, used_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("code", hashData);
      }
    }
    
    return { valid: data === true, error: null };
  } catch (error) {
    return { valid: false, error };
  }
};
