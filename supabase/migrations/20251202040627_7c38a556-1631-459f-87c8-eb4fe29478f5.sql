-- Fix the backup code functions to use proper type casting for digest
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use pgcrypto extension for secure hashing with explicit text casting
  RETURN encode(digest(plain_code, 'sha256'::text), 'hex');
END;
$$;

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
    
    -- Hash the code with explicit text casting
    hashed_code := encode(digest(plain_code, 'sha256'::text), 'hex');
    
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
  -- Hash the provided code with explicit text casting
  hashed_code := encode(digest(plain_code, 'sha256'::text), 'hex');
  
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