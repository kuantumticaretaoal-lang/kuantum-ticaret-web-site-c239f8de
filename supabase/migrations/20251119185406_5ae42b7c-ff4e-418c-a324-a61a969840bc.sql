-- Allow anyone to verify backup codes (needed for login recovery)
-- This is safe because codes are single-use and random
CREATE POLICY "Anyone can verify backup codes"
ON backup_codes FOR SELECT
USING (used = false);

-- Remove the restrictive user-only SELECT policy
DROP POLICY IF EXISTS "Users can view their own backup code" ON backup_codes;