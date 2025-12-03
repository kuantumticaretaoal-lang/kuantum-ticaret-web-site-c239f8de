-- Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate hash_backup_code function
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN encode(pgcrypto.digest(plain_code::bytea, 'sha256'), 'hex');
END;
$$;

-- Recreate generate_hashed_backup_code function
CREATE OR REPLACE FUNCTION public.generate_hashed_backup_code(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plain_code TEXT;
  hashed_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a unique code in format XX0XX-0XX-000
    plain_code := 
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      FLOOR(RANDOM() * 10)::TEXT ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      '-' ||
      FLOOR(RANDOM() * 10)::TEXT ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      '-' ||
      FLOOR(RANDOM() * 10)::TEXT ||
      FLOOR(RANDOM() * 10)::TEXT ||
      FLOOR(RANDOM() * 10)::TEXT;
    
    -- Hash the code
    hashed_code := encode(pgcrypto.digest(plain_code::bytea, 'sha256'), 'hex');
    
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

-- Recreate verify_backup_code function
CREATE OR REPLACE FUNCTION public.verify_backup_code(user_id_param uuid, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hashed_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Hash the provided code
  hashed_code := encode(pgcrypto.digest(plain_code::bytea, 'sha256'), 'hex');
  
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

-- Add UPDATE policy for contact_messages (from security review)
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));