-- Fix visitor analytics RLS policy to prevent unauthorized updates
DROP POLICY IF EXISTS "Anyone can update their own analytics" ON visitor_analytics;

-- Create a more secure policy that only allows users to update their own recent records
CREATE POLICY "Users can update their own analytics"
ON visitor_analytics
FOR UPDATE
USING (
  (user_id IS NOT NULL AND user_id = auth.uid()) OR
  (user_id IS NULL AND visited_at >= NOW() - INTERVAL '1 hour')
);