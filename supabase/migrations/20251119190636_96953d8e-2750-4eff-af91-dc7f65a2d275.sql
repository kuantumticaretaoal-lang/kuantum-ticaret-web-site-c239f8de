-- Update the trigger function to include email from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, province, district, address)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,  -- Email'i auth.users'dan al
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'province',
    NEW.raw_user_meta_data->>'district',
    NEW.raw_user_meta_data->>'address'
  );
  RETURN NEW;
END;
$$;