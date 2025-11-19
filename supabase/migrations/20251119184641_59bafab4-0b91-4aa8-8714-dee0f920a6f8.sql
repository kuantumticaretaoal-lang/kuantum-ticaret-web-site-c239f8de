-- Fix critical security issues

-- 1. Add UNIQUE constraint to backup_codes to guarantee code uniqueness
ALTER TABLE backup_codes ADD CONSTRAINT unique_backup_code UNIQUE (code);

-- 2. Drop the insecure "System can insert backup codes" policy and replace with user-scoped policy
DROP POLICY IF EXISTS "System can insert backup codes" ON backup_codes;

CREATE POLICY "Users can insert their own backup codes"
ON backup_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Prevent removal of main admin
CREATE POLICY "Prevent main admin removal"
ON user_roles FOR DELETE
USING (NOT is_main_admin);

-- 4. Add constraint for notification message length
ALTER TABLE notifications ADD CONSTRAINT message_length_check CHECK (length(message) BETWEEN 1 AND 500);

-- 5. Add constraint for product questions length (adjusted for short Turkish questions)
ALTER TABLE product_questions ADD CONSTRAINT question_length_check CHECK (length(question) BETWEEN 3 AND 1000);

-- 6. Add constraint for product reviews comment length (allow NULL)
ALTER TABLE product_reviews ADD CONSTRAINT comment_length_check CHECK (comment IS NULL OR length(comment) BETWEEN 1 AND 500);