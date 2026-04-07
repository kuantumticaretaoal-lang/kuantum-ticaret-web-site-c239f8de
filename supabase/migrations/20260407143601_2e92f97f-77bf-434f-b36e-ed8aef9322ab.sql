
-- 1. Fix backup_codes: drop the overly-permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can verify backup codes" ON backup_codes;

-- 2. Fix user_roles: combine both checks into one admin-only DELETE policy
DROP POLICY IF EXISTS "Prevent main admin removal" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete non-main roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND NOT is_main_admin);

-- 3. Fix live_support_messages: restrict role
DROP POLICY IF EXISTS "Anyone can create live support messages" ON live_support_messages;

CREATE POLICY "Users can create live support messages"
  ON live_support_messages FOR INSERT
  TO public
  WITH CHECK (
    thread_id IS NOT NULL
    AND role = 'user'
  );

CREATE POLICY "Admins can insert live support messages"
  ON live_support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

ALTER TABLE live_support_messages
  ADD CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'));

-- 4. Fix live_support_threads: fix tautology policy
DROP POLICY IF EXISTS "Users can view their own threads" ON live_support_threads;
CREATE POLICY "Authenticated users can view their own threads"
  ON live_support_threads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
