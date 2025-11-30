-- Enable RLS on backup_codes table if not already enabled
ALTER TABLE public.backup_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can only view their own backup codes" ON public.backup_codes;
DROP POLICY IF EXISTS "Users can only insert their own backup codes" ON public.backup_codes;
DROP POLICY IF EXISTS "Users can only update their own backup codes" ON public.backup_codes;
DROP POLICY IF EXISTS "Service role can manage all backup codes" ON public.backup_codes;

-- Create strict RLS policies for backup_codes
-- Users can only see their own codes
CREATE POLICY "Users can only view their own backup codes"
ON public.backup_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own codes
CREATE POLICY "Users can only insert their own backup codes"
ON public.backup_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own codes (for marking as used)
CREATE POLICY "Users can only update their own backup codes"
ON public.backup_codes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Prevent deletion of backup codes entirely
-- No delete policy means no one can delete

-- Create a secure function to hash backup codes
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use pgcrypto extension for secure hashing
  RETURN encode(digest(plain_code, 'sha256'), 'hex');
END;
$$;

-- Create a function to verify backup codes
CREATE OR REPLACE FUNCTION public.verify_backup_code(user_id_param UUID, plain_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Hash the provided code
  hashed_code := encode(digest(plain_code, 'sha256'), 'hex');
  
  -- Check if the hashed code exists for the user and is not used
  SELECT EXISTS(
    SELECT 1 
    FROM public.backup_codes 
    WHERE user_id = user_id_param 
    AND code = hashed_code 
    AND used = false
  ) INTO code_exists;
  
  RETURN code_exists;
END;
$$;

-- Create a function to generate and store hashed backup codes
CREATE OR REPLACE FUNCTION public.generate_hashed_backup_code(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plain_code TEXT;
  hashed_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a unique code in format XX0XX-0XX-000
    plain_code := 
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||  -- Random letter A-Z
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||  -- Random letter A-Z
      FLOOR(RANDOM() * 10)::TEXT ||            -- Random digit 0-9
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||  -- Random letter A-Z
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||  -- Random letter A-Z
      '-' ||
      FLOOR(RANDOM() * 10)::TEXT ||            -- Random digit 0-9
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||  -- Random letter A-Z
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||  -- Random letter A-Z
      '-' ||
      FLOOR(RANDOM() * 10)::TEXT ||            -- Random digit 0-9
      FLOOR(RANDOM() * 10)::TEXT ||            -- Random digit 0-9
      FLOOR(RANDOM() * 10)::TEXT;              -- Random digit 0-9
    
    -- Hash the code
    hashed_code := encode(digest(plain_code, 'sha256'), 'hex');
    
    -- Check if this hashed code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.backup_codes WHERE code = hashed_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Delete old backup codes for this user
  DELETE FROM public.backup_codes WHERE user_id = user_id_param;
  
  -- Store the hashed code
  INSERT INTO public.backup_codes (user_id, code, used)
  VALUES (user_id_param, hashed_code, false);
  
  -- Return the plain code (only time it's visible)
  RETURN plain_code;
END;
$$;

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing notification policies if any
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Create strict RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can insert notifications for any user
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);