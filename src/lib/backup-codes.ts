import { supabase } from "@/integrations/supabase/client";

// Create or regenerate backup code for user using secure hashed storage
export const createBackupCode = async (userId: string): Promise<{ code: string | null; error: any }> => {
  try {
    // Call the secure database function to generate and store hashed backup code
    const { data, error } = await supabase.rpc('generate_hashed_backup_code', {
      user_id_param: userId
    });
    
    if (error) {
      return { code: null, error };
    }
    
    // Return the plain code (only time it will be visible)
    return { code: data, error: null };
  } catch (error) {
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
